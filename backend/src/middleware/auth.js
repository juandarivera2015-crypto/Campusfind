'use strict';
const { verifyAccessToken } = require('../utils/tokens');
const { unauthorized, forbidden } = require('../utils/problem');

function extractBearer(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Requires a valid JWT access token in the Authorization header.
 * Bearer tokens are not sent automatically by browsers, so endpoints protected
 * this way are not exposed to CSRF.
 */
function requireAuth(...requiredScopes) {
  return (req, res, next) => {
    const token = extractBearer(req);
    if (!token) {
      res.set('WWW-Authenticate', 'Bearer realm="campusfind"');
      return next(unauthorized());
    }
    try {
      const claims = verifyAccessToken(token);
      const granted = String(claims.scope || '').split(' ');
      const missing = requiredScopes.filter((s) => !granted.includes(s));
      if (missing.length) {
        res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${requiredScopes.join(' ')}"`);
        return next(forbidden(`Missing scope(s): ${missing.join(', ')}`));
      }
      req.user = { id: parseInt(claims.sub, 10), name: claims.name, email: claims.email, scope: granted };
      return next();
    } catch (_err) {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return next(unauthorized('Invalid or expired access token'));
    }
  };
}

module.exports = { requireAuth, extractBearer };
