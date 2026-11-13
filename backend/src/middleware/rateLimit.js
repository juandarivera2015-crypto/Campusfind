'use strict';
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

const problem = (detail) => (_req, res) => res.status(429).type('application/problem+json')
  .json({ type: 'about:blank', title: 'Too Many Requests', status: 429, detail });

const skip = () => config.isTest;

/** General API limit — mitigates OWASP API4:2023 (Unrestricted Resource Consumption). */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, skip,
  handler: problem('Too many requests, slow down.'),
});

/** Strict limit for credential endpoints — mitigates brute force / credential stuffing (API2:2023). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, skip,
  handler: problem('Too many authentication attempts. Try again in 15 minutes.'),
});

module.exports = { apiLimiter, authLimiter };
