'use strict';
/**
 * PKCE (RFC 7636) helpers. OAuth 2.1 makes PKCE mandatory for the
 * authorization code grant and only S256 is accepted here ("plain" is rejected).
 */
const crypto = require('crypto');

const VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;
const CHALLENGE_RE = /^[A-Za-z0-9\-_]{43}$/;

function isValidVerifier(v) { return typeof v === 'string' && VERIFIER_RE.test(v); }
function isValidChallenge(c) { return typeof c === 'string' && CHALLENGE_RE.test(c); }

function challengeFromVerifier(verifier) {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

function verifyPkce(verifier, challenge) {
  if (!isValidVerifier(verifier) || !isValidChallenge(challenge)) return false;
  const a = Buffer.from(challengeFromVerifier(verifier));
  const b = Buffer.from(challenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function generateVerifier() { return crypto.randomBytes(48).toString('base64url'); }

module.exports = { isValidVerifier, isValidChallenge, challengeFromVerifier, verifyPkce, generateVerifier };
