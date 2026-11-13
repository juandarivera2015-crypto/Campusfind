'use strict';
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Signs a short-lived JWT access token (RFC 9068-style claims). */
function signAccessToken(user, scope, clientId) {
  return jwt.sign(
    { scope, client_id: clientId, name: user.name, email: user.email },
    config.jwt.secret,
    {
      algorithm: 'HS256',
      subject: String(user.id),
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: config.jwt.accessTtl,
      jwtid: crypto.randomUUID(),
      header: { typ: 'at+jwt' },
    },
  );
}

/** Verifies signature, algorithm, issuer, audience and expiry. Throws on failure. */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'], // never accept "none" or a different alg
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

module.exports = { sha256, randomToken, signAccessToken, verifyAccessToken };
