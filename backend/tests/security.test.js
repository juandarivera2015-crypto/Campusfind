/**
 * Regression tests for OWASP issues found in the legacy PHP version.
 */
const request = require('supertest');
const { createApp, sequelize, resetDb, register, login } = require('./helpers');
const { loadSpec } = require('../src/docs/openapi');
const { escapeLike } = require('../src/utils/sql');

const app = createApp();
beforeEach(async () => { await resetDb(); await register(app); });
afterAll(() => sequelize.close());

describe('Injection (SQLi)', () => {
  test.each([
    "' OR '1'='1",
    "x'); DROP TABLE users; --",
    '1 UNION SELECT password FROM users',
  ])('search payload %s is treated as data', async (payload) => {
    const res = await request(app).get('/api/v1/objects').query({ keyword: payload });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    // users table still intact
    expect((await login(app)).token.status).toBe(200);
  });

  test('LIKE wildcards are escaped', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  test('non-numeric ids do not reach the database', async () => {
    const res = await request(app).get('/api/v1/objects/1%27%20OR%201%3D1');
    expect(res.status).toBe(404);
  });
});

describe('XSS', () => {
  test('API responds with JSON + nosniff + CSP so stored payloads are never rendered as HTML', async () => {
    const { accessToken } = await login(app);
    const payload = '<img src=x onerror=alert(1)>';
    await request(app).post('/api/v1/objects').set('Authorization', `Bearer ${accessToken}`)
      .field('name', payload).field('description', payload).field('location', 'Lab').field('date', '2026-11-01');
    const res = await request(app).get('/api/v1/objects');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/script-src 'self'/);
    // Data is returned verbatim; the React client renders it as text (auto-escaped)
    expect(res.body.data[0].name).toBe(payload);
  });
});

describe('Security misconfiguration', () => {
  test('no X-Powered-By, CORS only for allowed origins', async () => {
    const ok = await request(app).get('/health/live').set('Origin', 'http://localhost:5173');
    expect(ok.headers['x-powered-by']).toBeUndefined();
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const evil = await request(app).get('/health/live').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('errors do not leak stack traces', async () => {
    const res = await request(app).post('/api/v1/users').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });

  test('registration rejects weak passwords and duplicate e-mails', async () => {
    expect((await register(app, { email: 'x@uni.edu', password: '123' })).status).toBe(400);
    expect((await register(app)).status).toBe(409);
  });
});

describe('Observability & docs', () => {
  test('exposes Prometheus metrics', async () => {
    await request(app).get('/api/v1/objects');
    const res = await request(app).get('/metrics');
    expect(res.text).toMatch(/http_request_duration_seconds_bucket/);
    expect(res.text).toMatch(/route="\/api\/v1\/objects\/"/);
  });

  test('OpenAPI document is valid 3.0 and served', async () => {
    expect(loadSpec().openapi).toMatch(/^3\.0/);
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.paths)).toContain('/oauth/token');
  });
});
