'use strict';
const crypto = require('crypto');
const { forbidden } = require('../utils/problem');

const CSRF_COOKIE = 'cf_csrf';
const CSRF_HEADER = 'x-csrf-token';

/**
 * Double-submit cookie CSRF protection, applied ONLY to endpoints that
 * authenticate through cookies (refresh token rotation and revocation).
 * The attacker's site can make the browser send the cookie, but cannot read it
 * to copy it into the X-CSRF-Token header (Same-Origin Policy).
 */
function issueCsrfToken(res, { secure }) {
  const token = crypto.randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'strict', secure, path: '/' });
  return token;
}

function verifyCsrf(req, _res, next) {
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header) return next(forbidden('Missing CSRF token'));
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(forbidden('Invalid CSRF token'));
  return next();
}

module.exports = { issueCsrfToken, verifyCsrf, CSRF_COOKIE, CSRF_HEADER };
