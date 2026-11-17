'use strict';
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

const problem = (detail) => (_req, res) => res.status(429).type('application/problem+json')
  .json({ type: 'about:blank', title: 'Too Many Requests', status: 429, detail });

const skip = () => config.isTest;

/** General API limit — mitigates OWASP API4:2023 (Unrestricted Resource Consumption). */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, limit: parseInt(process.env.API_RATE_LIMIT || '300', 10), standardHeaders: 'draft-7', legacyHeaders: false, skip,
  validate: { trustProxy: false }, // TRUST_PROXY=true is intended on Vercel (it overwrites X-Forwarded-For)
  handler: problem('Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'),
});

/** Strict limit for credential endpoints — mitigates brute force / credential stuffing (API2:2023). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: parseInt(process.env.AUTH_RATE_LIMIT || '20', 10), standardHeaders: 'draft-7', legacyHeaders: false, skip,
  validate: { trustProxy: false }, // TRUST_PROXY=true is intended on Vercel (it overwrites X-Forwarded-For)
  handler: problem('Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.'),
});

module.exports = { apiLimiter, authLimiter };
