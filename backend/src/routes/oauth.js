'use strict';
/**
 * OAuth 2.1 Authorization Server (draft-ietf-oauth-v2-1).
 *
 * Supported:   authorization_code + PKCE (S256 only), refresh_token (with rotation + reuse detection)
 * NOT supported (removed in OAuth 2.1): implicit grant, resource owner password credentials grant,
 *                                       PKCE "plain", bearer tokens in query strings.
 *
 * Browser flow for the first-party React SPA (public client):
 *   1. SPA creates code_verifier + code_challenge(S256) + state.
 *   2. POST /oauth/authorize  (user credentials + PKCE params) -> { code, state } (JSON)
 *      or a 302 redirect to redirect_uri?code=...&state=... for classic form posts.
 *   3. POST /oauth/token grant_type=authorization_code + code_verifier
 *      -> JWT access token (body) + refresh token (HttpOnly cookie) + CSRF cookie.
 *   4. POST /oauth/token grant_type=refresh_token (cookie + X-CSRF-Token header) -> rotated tokens.
 *   5. POST /oauth/revoke -> logout.
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Op } = require('sequelize');
const config = require('../config');
const { User, AuthorizationCode, RefreshToken, sequelize } = require('../models');
const { isValidChallenge, verifyPkce } = require('../utils/pkce');
const { sha256, randomToken, signAccessToken } = require('../utils/tokens');
const { issueCsrfToken, verifyCsrf, CSRF_COOKIE } = require('../middleware/csrf');
const { authLimiter } = require('../middleware/rateLimit');
const { business } = require('../middleware/metrics');

const router = express.Router();
const REFRESH_COOKIE = 'cf_rt';
// Pre-computed hash used to keep response time constant when the e-mail does not exist (prevents user enumeration).
const DUMMY_HASH = bcrypt.hashSync('campusfind-dummy-password', 10);

const oauthError = (res, status, error, description) =>
  res.status(status).set('Cache-Control', 'no-store').json({ error, error_description: description });

const cookieOpts = (maxAgeMs) => ({
  httpOnly: true, secure: config.isProd, sameSite: 'strict', path: '/oauth', maxAge: maxAgeMs,
});

// ── Authorization Server Metadata (RFC 8414) ──
router.get('/.well-known/oauth-authorization-server', (_req, res) => {
  const base = config.publicUrl;
  res.json({
    issuer: config.jwt.issuer,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    revocation_endpoint: `${base}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: Object.values(config.oauth.clients)[0].scopes,
  });
});

// ── Authorization endpoint ──
const authorizeSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1).max(100),
  redirect_uri: z.string().url().max(500),
  code_challenge: z.string(),
  code_challenge_method: z.literal('S256'),
  state: z.string().min(8).max(500),
  scope: z.string().max(500).optional(),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(1).max(128),
});

router.post('/oauth/authorize', authLimiter, async (req, res, next) => {
  try {
    const wantsJson = req.is('application/json') || (req.get('accept') || '').includes('application/json');
    const client = config.oauth.clients[req.body?.client_id];
    // Validate client + exact redirect_uri match BEFORE any redirect (prevents open redirects).
    if (!client) return oauthError(res, 400, 'invalid_client', 'Unknown client_id');
    if (!client.redirectUris.includes(req.body.redirect_uri)) {
      return oauthError(res, 400, 'invalid_request', 'redirect_uri is not registered for this client');
    }

    const redirectWith = (params) => {
      if (wantsJson) return null;
      const url = new URL(req.body.redirect_uri);
      Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
      return res.redirect(302, url.toString());
    };

    const parsed = authorizeSchema.safeParse(req.body);
    if (!parsed.success || !isValidChallenge(req.body.code_challenge)) {
      const desc = parsed.success ? 'code_challenge must be a base64url SHA-256 (S256) value'
        : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return redirectWith({ error: 'invalid_request', error_description: desc, state: req.body.state })
        || oauthError(res, 400, 'invalid_request', desc);
    }
    const p = parsed.data;

    const requested = p.scope ? p.scope.split(' ').filter(Boolean) : client.scopes;
    if (requested.some((s) => !client.scopes.includes(s))) {
      return redirectWith({ error: 'invalid_scope', state: p.state }) || oauthError(res, 400, 'invalid_scope', 'Unsupported scope requested');
    }

    // Authenticate the resource owner
    const user = await User.scope('withPassword').findOne({ where: { email: p.email } });
    // PHP's password_hash() produces $2y$ hashes — identical algorithm to $2b$.
    const hash = user ? user.password.replace(/^\$2y\$/, '$2b$') : DUMMY_HASH;
    const ok = await bcrypt.compare(p.password, hash);
    if (!user || !ok) {
      business.loginAttempts.inc({ result: 'failure' });
      return redirectWith({ error: 'access_denied', error_description: 'Invalid email or password', state: p.state })
        || oauthError(res, 401, 'access_denied', 'Invalid email or password.');
    }
    business.loginAttempts.inc({ result: 'success' });

    const code = randomToken(32);
    await AuthorizationCode.create({
      code_hash: sha256(code),
      user_id: user.id,
      client_id: p.client_id,
      redirect_uri: p.redirect_uri,
      code_challenge: p.code_challenge,
      scope: requested.join(' '),
      expires_at: new Date(Date.now() + config.oauth.codeTtlSeconds * 1000),
    });

    res.set('Cache-Control', 'no-store');
    return redirectWith({ code, state: p.state }) || res.json({ code, state: p.state, redirect_uri: p.redirect_uri });
  } catch (err) { return next(err); }
});

// ── Token endpoint ──
async function issueTokens(res, user, clientId, scope, familyId, t) {
  const refresh = randomToken(48);
  const ttlMs = config.jwt.refreshTtlDays * 24 * 3600 * 1000;
  const row = await RefreshToken.create({
    token_hash: sha256(refresh),
    family_id: familyId || crypto.randomUUID(),
    user_id: user.id,
    client_id: clientId,
    scope,
    expires_at: new Date(Date.now() + ttlMs),
  }, { transaction: t });

  res.cookie(REFRESH_COOKIE, refresh, cookieOpts(ttlMs));
  if (!res.req.cookies?.[CSRF_COOKIE]) issueCsrfToken(res, { secure: config.isProd });
  return {
    row,
    body: {
      access_token: signAccessToken(user, scope, clientId),
      token_type: 'Bearer',
      expires_in: config.jwt.accessTtl,
      scope,
    },
  };
}

router.post('/oauth/token', authLimiter, async (req, res, next) => {
  res.set('Cache-Control', 'no-store').set('Pragma', 'no-cache');
  const grant = req.body?.grant_type;
  try {
    if (grant === 'authorization_code') {
      const { code, code_verifier: verifier, client_id: clientId, redirect_uri: redirectUri } = req.body;
      if (!code || !verifier || !clientId || !redirectUri) {
        return oauthError(res, 400, 'invalid_request', 'code, code_verifier, client_id and redirect_uri are required');
      }
      const result = await sequelize.transaction(async (t) => {
        const ac = await AuthorizationCode.findOne({ where: { code_hash: sha256(String(code)) }, transaction: t });
        if (!ac) return { error: 'Invalid authorization code' };
        // Atomically mark as used: a code can be redeemed exactly once.
        const [used] = await AuthorizationCode.update(
          { used_at: new Date() }, { where: { id: ac.id, used_at: null }, transaction: t },
        );
        if (used !== 1) return { error: 'Authorization code already used' };
        if (ac.expires_at < new Date()) return { error: 'Authorization code expired' };
        if (ac.client_id !== clientId || ac.redirect_uri !== redirectUri) return { error: 'client_id or redirect_uri mismatch' };
        if (!verifyPkce(String(verifier), ac.code_challenge)) return { error: 'PKCE verification failed' };
        const user = await User.findByPk(ac.user_id, { transaction: t });
        if (!user) return { error: 'User no longer exists' };
        return issueTokens(res, user, clientId, ac.scope, null, t);
      });
      if (result.error) return oauthError(res, 400, 'invalid_grant', result.error);
      return res.json(result.body);
    }

    if (grant === 'refresh_token') {
      // Cookie-authenticated request -> CSRF protection required.
      return verifyCsrf(req, res, async (csrfErr) => {
        if (csrfErr) return oauthError(res, 403, 'invalid_request', csrfErr.detail);
        try {
          const presented = req.cookies?.[REFRESH_COOKIE];
          if (!presented) return oauthError(res, 400, 'invalid_grant', 'Missing refresh token');
          const result = await sequelize.transaction(async (t) => {
            const rt = await RefreshToken.findOne({ where: { token_hash: sha256(presented) }, transaction: t });
            if (!rt) return { error: 'Invalid refresh token' };
            if (rt.revoked_at) {
              // Replay of a rotated token => token theft. Revoke the whole family.
              business.refreshReuse.inc();
              await RefreshToken.update({ revoked_at: new Date() },
                { where: { family_id: rt.family_id, revoked_at: null }, transaction: t });
              return { error: 'Refresh token reuse detected; session revoked' };
            }
            if (rt.expires_at < new Date()) return { error: 'Refresh token expired' };
            const user = await User.findByPk(rt.user_id, { transaction: t });
            if (!user) return { error: 'User no longer exists' };
            const issued = await issueTokens(res, user, rt.client_id, rt.scope, rt.family_id, t);
            await rt.update({ revoked_at: new Date(), replaced_by: issued.row.id }, { transaction: t });
            return issued;
          });
          if (result.error) {
            res.clearCookie(REFRESH_COOKIE, { path: '/oauth' });
            return oauthError(res, 400, 'invalid_grant', result.error);
          }
          return res.json(result.body);
        } catch (err) { return next(err); }
      });
    }

    return oauthError(res, 400, 'unsupported_grant_type',
      'Only authorization_code (with PKCE) and refresh_token grants are supported (OAuth 2.1)');
  } catch (err) { return next(err); }
});

// ── Revocation (RFC 7009) — used for logout ──
router.post('/oauth/revoke', verifyCsrf, async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (presented) {
      const rt = await RefreshToken.findOne({ where: { token_hash: sha256(presented) } });
      if (rt) {
        await RefreshToken.update({ revoked_at: new Date() },
          { where: { family_id: rt.family_id, revoked_at: { [Op.is]: null } } });
      }
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/oauth' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    return res.status(200).json({ revoked: true });
  } catch (err) { return next(err); }
});

module.exports = router;
