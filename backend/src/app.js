'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const { loadSpec } = require('./docs/openapi');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx / ingress: use X-Forwarded-For for rate limiting

  // ── Security headers (OWASP API8:2023 Security Misconfiguration) ──
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));

  // ── CORS: explicit allow-list, credentials only for known origins ──
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Location', 'RateLimit', 'RateLimit-Policy'],
    maxAge: 600,
  }));

  app.use(metricsMiddleware);
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  // ── Observability & health (not rate limited) ──
  app.get('/metrics', metricsHandler);
  app.use('/health', require('./routes/health'));

  // ── API documentation (OpenAPI 3.0 + Swagger UI) ──
  const spec = loadSpec();
  app.get('/api/openapi.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'CampusFind API', swaggerOptions: { persistAuthorization: true },
  }));

  // ── Uploaded images: served as inert static files ──
  app.use('/uploads', express.static(config.uploads.dir, {
    dotfiles: 'deny', index: false, fallthrough: false, maxAge: '7d',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    },
  }));

  // ── OAuth 2.1 authorization server ──
  app.use(require('./routes/oauth'));

  // ── REST API v1 ──
  const api = express.Router();
  api.use(apiLimiter);
  api.use('/users', require('./routes/users'));
  api.use('/objects', require('./routes/objects'));
  api.use('/messages', require('./routes/messages'));
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
