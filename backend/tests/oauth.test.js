const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createApp, sequelize, resetDb, register, login, pkcePair, csrfFrom, CLIENT_ID, REDIRECT_URI } = require('./helpers');

const app = createApp();
beforeEach(async () => { await resetDb(); await register(app); });
afterAll(() => sequelize.close());

describe('OAuth 2.1 authorization code + PKCE', () => {
  test('issues a JWT access token and an HttpOnly refresh cookie', async () => {
    const { token, accessToken } = await login(app);
    expect(token.status).toBe(200);
    expect(token.headers['cache-control']).toBe('no-store');
    expect(token.body.token_type).toBe('Bearer');
    expect(token.body).not.toHaveProperty('refresh_token');
    const cookies = token.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/cf_rt=.*HttpOnly/);
    const claims = jwt.decode(accessToken, { complete: true });
    expect(claims.header.alg).toBe('HS256');
    expect(claims.payload).toMatchObject({ iss: 'campusfind-auth', aud: 'campusfind-api' });

    const me = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('alice@uni.edu');
    expect(me.body.data).not.toHaveProperty('password');
  });

  test('rejects wrong password without revealing whether the user exists', async () => {
    const a = await login(app, { password: 'wrong-password' });
    const b = await login(app, { email: 'nobody@uni.edu', password: 'whatever' });
    expect(a.auth.status).toBe(401);
    expect(b.auth.status).toBe(401);
    expect(a.auth.body).toEqual(b.auth.body);
  });

  test('rejects an unregistered redirect_uri (no open redirect)', async () => {
    const { challenge } = pkcePair();
    const res = await request(app).post('/oauth/authorize').type('form').send({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: 'https://evil.example/cb',
      code_challenge: challenge, code_challenge_method: 'S256', state: 'abcdefgh', email: 'alice@uni.edu', password: 'Sup3rSecret!',
    });
    expect(res.status).toBe(400);
    expect(res.headers.location).toBeUndefined();
  });

  test('rejects PKCE "plain" method', async () => {
    const res = await request(app).post('/oauth/authorize').set('Accept', 'application/json').send({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      code_challenge: 'x'.repeat(43), code_challenge_method: 'plain', state: 'abcdefgh', email: 'alice@uni.edu', password: 'Sup3rSecret!',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  test('form post without JSON Accept gets a 302 redirect with code and state', async () => {
    const { challenge } = pkcePair();
    const res = await request(app).post('/oauth/authorize').type('form').send({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      code_challenge: challenge, code_challenge_method: 'S256', state: 'state-12345', email: 'alice@uni.edu', password: 'Sup3rSecret!',
    });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.location);
    expect(loc.origin + loc.pathname).toBe(REDIRECT_URI);
    expect(loc.searchParams.get('state')).toBe('state-12345');
    expect(loc.searchParams.get('code')).toBeTruthy();
  });

  test('wrong code_verifier fails and the code cannot be reused', async () => {
    const agent = request.agent(app);
    const { challenge, verifier } = pkcePair();
    const auth = await agent.post('/oauth/authorize').set('Accept', 'application/json').send({
      response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      code_challenge: challenge, code_challenge_method: 'S256', state: 'abcdefgh', email: 'alice@uni.edu', password: 'Sup3rSecret!',
    });
    const bad = await agent.post('/oauth/token').type('form').send({
      grant_type: 'authorization_code', code: auth.body.code, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      code_verifier: crypto.randomBytes(48).toString('base64url'),
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('invalid_grant');
    const retry = await agent.post('/oauth/token').type('form').send({
      grant_type: 'authorization_code', code: auth.body.code, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, code_verifier: verifier,
    });
    expect(retry.status).toBe(400); // single use
  });

  test('password grant is not supported (removed in OAuth 2.1)', async () => {
    const res = await request(app).post('/oauth/token').type('form')
      .send({ grant_type: 'password', username: 'alice@uni.edu', password: 'Sup3rSecret!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unsupported_grant_type');
  });
});

describe('Refresh token rotation + CSRF', () => {
  test('refresh requires the CSRF header', async () => {
    const { agent } = await login(app);
    const res = await agent.post('/oauth/token').type('form').send({ grant_type: 'refresh_token' });
    expect(res.status).toBe(403);
  });

  test('rotates refresh tokens and detects reuse', async () => {
    const { agent, token } = await login(app);
    const csrf = csrfFrom(token);
    const oldRt = token.headers['set-cookie'].find((c) => c.startsWith('cf_rt=')).split(';')[0];

    const r1 = await agent.post('/oauth/token').set('X-CSRF-Token', csrf).type('form').send({ grant_type: 'refresh_token' });
    expect(r1.status).toBe(200);
    expect(r1.body.access_token).toBeTruthy();

    // Replay the OLD refresh token -> reuse detection revokes the family
    const replay = await request(app).post('/oauth/token')
      .set('Cookie', [oldRt, `cf_csrf=${csrf}`]).set('X-CSRF-Token', csrf)
      .type('form').send({ grant_type: 'refresh_token' });
    expect(replay.status).toBe(400);
    expect(replay.body.error_description).toMatch(/reuse/);

    // The legitimately rotated token is now revoked too
    const r2 = await agent.post('/oauth/token').set('X-CSRF-Token', csrf).type('form').send({ grant_type: 'refresh_token' });
    expect(r2.status).toBe(400);
  });

  test('revoke (logout) invalidates the refresh token', async () => {
    const { agent, token } = await login(app);
    const csrf = csrfFrom(token);
    expect((await agent.post('/oauth/revoke').set('X-CSRF-Token', csrf)).status).toBe(200);
    const r = await agent.post('/oauth/token').set('Cookie', `cf_csrf=${csrf}`).set('X-CSRF-Token', csrf)
      .type('form').send({ grant_type: 'refresh_token' });
    expect(r.status).toBe(400);
  });
});

describe('JWT validation', () => {
  test('rejects tokens with alg=none, wrong signature or expired', async () => {
    const none = jwt.sign({ sub: '1', scope: 'profile' }, '', { algorithm: 'none' });
    const forged = jwt.sign({ sub: '1', scope: 'profile' }, 'another-secret', { issuer: 'campusfind-auth', audience: 'campusfind-api' });
    const expired = jwt.sign({ sub: '1', scope: 'profile', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET, { issuer: 'campusfind-auth', audience: 'campusfind-api' });
    for (const t of [none, forged, expired]) {
      const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${t}`);
      expect(res.status).toBe(401);
    }
  });

  test('enforces scopes', async () => {
    const limited = jwt.sign({ scope: 'objects:read' }, process.env.JWT_SECRET,
      { subject: '1', issuer: 'campusfind-auth', audience: 'campusfind-api', expiresIn: 60 });
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${limited}`);
    expect(res.status).toBe(403);
  });
});
