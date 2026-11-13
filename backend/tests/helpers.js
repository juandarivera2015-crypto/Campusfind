const request = require('supertest');
const crypto = require('crypto');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/models');

const CLIENT_ID = 'campusfind-web';
const REDIRECT_URI = 'http://localhost:5173/callback';

async function resetDb() {
  await sequelize.sync({ force: true });
}

function pkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function register(app, { name = 'Alice', email = 'alice@uni.edu', password = 'Sup3rSecret!' } = {}) {
  return request(app).post('/api/v1/users').send({ name, email, password, confirm_password: password });
}

/** Runs the full OAuth 2.1 authorization-code + PKCE flow and returns the agent + access token. */
async function login(app, { email = 'alice@uni.edu', password = 'Sup3rSecret!' } = {}) {
  const agent = request.agent(app);
  const { verifier, challenge } = pkcePair();
  const state = crypto.randomBytes(16).toString('hex');
  const auth = await agent.post('/oauth/authorize').set('Accept', 'application/json').send({
    response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
    code_challenge: challenge, code_challenge_method: 'S256', state, email, password,
  });
  if (auth.status !== 200) return { auth };
  const token = await agent.post('/oauth/token').type('form').send({
    grant_type: 'authorization_code', code: auth.body.code, code_verifier: verifier,
    client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
  });
  return { agent, auth, token, accessToken: token.body.access_token };
}

function csrfFrom(res) {
  const cookies = res.headers['set-cookie'] || [];
  const c = cookies.find((x) => x.startsWith('cf_csrf='));
  return c ? c.split(';')[0].split('=')[1] : null;
}

module.exports = { createApp, sequelize, resetDb, register, login, pkcePair, csrfFrom, CLIENT_ID, REDIRECT_URI };
