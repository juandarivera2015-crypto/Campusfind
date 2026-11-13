'use strict';
require('dotenv').config();
const path = require('path');
const { readSecret } = require('./secrets');

const env = process.env.NODE_ENV || 'development';
const list = (v, d = '') => (v || d).split(',').map((s) => s.trim()).filter(Boolean);

const jwtSecret = readSecret('JWT_SECRET');
if (env === 'production' && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET (or JWT_SECRET_FILE) must be set to at least 32 characters in production');
}

const config = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: parseInt(process.env.PORT || '3000', 10),
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  corsOrigins: list(process.env.CORS_ORIGINS, 'http://localhost:5173,http://localhost:8080'),
  jwt: {
    secret: jwtSecret || 'dev-only-insecure-secret-change-me-please-0000',
    issuer: process.env.JWT_ISSUER || 'campusfind-auth',
    audience: process.env.JWT_AUDIENCE || 'campusfind-api',
    accessTtl: parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS || '900', 10),
    refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  },
  oauth: {
    clients: {
      [process.env.OAUTH_CLIENT_ID || 'campusfind-web']: {
        public: true,
        redirectUris: list(process.env.OAUTH_REDIRECT_URIS,
          'http://localhost:5173/callback,http://localhost:8080/callback'),
        scopes: ['objects:read', 'objects:write', 'messages:read', 'messages:write', 'profile'],
      },
    },
    codeTtlSeconds: 60,
  },
  uploads: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')),
    maxBytes: parseInt(process.env.MAX_UPLOAD_MB || '5', 10) * 1024 * 1024,
  },
};

module.exports = config;
