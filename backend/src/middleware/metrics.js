'use strict';
/**
 * Prometheus instrumentation (RED metrics: Rate, Errors, Duration) + business metrics.
 */
const client = require('prom-client');

const register = new client.Registry();
register.setDefaultLabels({ service: 'campusfind-api' });
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const business = {
  loginAttempts: new client.Counter({
    name: 'campusfind_login_attempts_total', help: 'OAuth authorization (login) attempts',
    labelNames: ['result'], registers: [register],
  }),
  objectsCreated: new client.Counter({
    name: 'campusfind_objects_created_total', help: 'Lost/found objects reported',
    labelNames: ['status', 'category'], registers: [register],
  }),
  messagesSent: new client.Counter({
    name: 'campusfind_messages_sent_total', help: 'Contact messages sent', registers: [register],
  }),
  usersRegistered: new client.Counter({
    name: 'campusfind_users_registered_total', help: 'New user registrations', registers: [register],
  }),
  refreshReuse: new client.Counter({
    name: 'campusfind_refresh_token_reuse_total', help: 'Detected refresh token replay attempts', registers: [register],
  }),
};

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    // Use the matched route template (e.g. /api/v1/objects/:id) to keep label cardinality low
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    end(labels);
    httpRequests.inc(labels);
  });
  return next();
}

async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = { register, metricsMiddleware, metricsHandler, business };
