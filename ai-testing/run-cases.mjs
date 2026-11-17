#!/usr/bin/env node
/**
 * Executes declarative API test cases (hand-written baseline + AI-generated) against a running stack.
 *   node ai-testing/run-cases.mjs --base-url http://localhost:8080 --cases ai-testing/cases [--junit report.xml]
 * No npm dependencies.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import crypto from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
const BASE = (args['base-url'] || 'http://localhost:8080').replace(/\/$/, '');
const CASES = args.cases || 'ai-testing/cases';
const CLIENT_ID = 'campusfind-web';
const REDIRECT_URI = `${BASE}/callback`;

const b64url = (buf) => buf.toString('base64url');

/** Registers a throw-away user and runs the OAuth 2.1 + PKCE flow to obtain a JWT. */
async function newUser(label) {
  const email = `${label}.${Date.now()}.${crypto.randomInt(1e6)}@ai-tests.local`;
  const password = `Ai#${crypto.randomBytes(9).toString('base64url')}`;
  let r = await fetch(`${BASE}/api/v1/users`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `AI ${label}`, email, password }),
  });
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${await r.text()}`);
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(12));
  r = await fetch(`${BASE}/oauth/authorize`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
      code_challenge: challenge, code_challenge_method: 'S256', state, email, password }),
  });
  const { code } = await r.json();
  r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI }),
  });
  const tok = await r.json();
  if (!tok.access_token) throw new Error(`token failed: ${JSON.stringify(tok)}`);
  return tok.access_token;
}

async function createObject(token, name) {
  const fd = new FormData();
  Object.entries({ name, description: 'fixture', location: 'Lab 1', date: '2026-11-01', status: 'lost' }).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(`${BASE}/api/v1/objects`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd });
  return (await r.json()).data.id;
}

async function loadCases(target) {
  const files = (await stat(target)).isDirectory()
    ? (await readdir(target)).filter((f) => f.endsWith('.json')).map((f) => join(target, f)) : [target];
  const out = [];
  for (const f of files) {
    const parsed = JSON.parse(await readFile(f, 'utf8'));
    (Array.isArray(parsed) ? parsed : parsed.cases).forEach((c) => out.push({ ...c, file: f }));
  }
  return out;
}

const subst = (v, ctx) => JSON.parse(JSON.stringify(v ?? null).replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? ''));

async function run() {
  const cases = await loadCases(CASES);
  const victim = await newUser('victim');
  const attacker = await newUser('attacker');
  const ctx = { objectId: await createObject(victim, 'victim object'), ownObjectId: await createObject(attacker, 'own object') };

  const results = [];
  for (const c of cases) {
    const t0 = Date.now();
    const failures = [];
    try {
      const path = subst(c.path, ctx);
      const url = new URL(BASE + path);
      Object.entries(subst(c.query, ctx) || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      const headers = { accept: 'application/json', ...(subst(c.headers, ctx) || {}) };
      if (c.auth === 'user' && !Object.keys(headers).some((h) => h.toLowerCase() === 'authorization')) headers.authorization = `Bearer ${attacker}`;
      let body;
      if (c.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(subst(c.json, ctx)); }
      else if (c.form) { headers['content-type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(subst(c.form, ctx)); }
      else if (c.multipart) { body = new FormData(); Object.entries(subst(c.multipart, ctx)).forEach(([k, v]) => body.append(k, String(v))); }

      const res = await fetch(url, { method: c.method, headers, body, redirect: 'manual' });
      const text = await res.text();
      if (!c.expect.status.includes(res.status)) failures.push(`status ${res.status} not in [${c.expect.status}]`);
      if (res.status >= 500) failures.push('server error (5xx) — inputs must never crash the API');
      (c.expect.bodyNotContains || []).forEach((s) => text.includes(s) && failures.push(`body contains "${s}"`));
      Object.entries(c.expect.headers || {}).forEach(([h, v]) => {
        if (!(res.headers.get(h) || '').includes(v)) failures.push(`header ${h} missing "${v}"`);
      });
    } catch (err) {
      failures.push(`error: ${err.message}`);
    }
    results.push({ ...c, ms: Date.now() - t0, failures });
    console.log(`${failures.length ? '✗' : '✓'} [${c.category}] ${c.name}${failures.length ? `\n    ${failures.join('\n    ')}` : ''}`);
  }

  const failed = results.filter((r) => r.failures.length);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);

  if (args.junit) {
    const esc = (s) => String(s).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="ai-and-baseline-cases" tests="${results.length}" failures="${failed.length}">\n${
      results.map((r) => `  <testcase classname="${esc(r.category)}" name="${esc(r.name)}" time="${r.ms / 1000}">${
        r.failures.length ? `<failure message="${esc(r.failures.join('; '))}"/>` : ''}</testcase>`).join('\n')}\n</testsuite>\n`;
    await writeFile(args.junit, xml);
  }
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
