#!/usr/bin/env node
/**
 * AI-assisted test generation.
 * Sends the OpenAPI 3.0 contract to Claude (Anthropic Messages API) and asks for
 * negative / boundary / OWASP API Top 10 (2023) test cases in the JSON format that
 * run-cases.mjs executes. Output must be reviewed by a human before committing it
 * to ai-testing/cases/.
 *
 *   ANTHROPIC_API_KEY=... node ai-testing/generate-cases.mjs --spec backend/src/docs/openapi.yaml --out ai-testing/generated/cases.ai.json
 *
 * No npm dependencies (Node 20+ global fetch).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
  return acc;
}, []));
const SPEC = args.spec || 'backend/src/docs/openapi.yaml';
const OUT = args.out || 'ai-testing/generated/cases.ai.json';
const COUNT = Number(args.count || 25);
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const KEY = process.env.ANTHROPIC_API_KEY;

if (!KEY) {
  console.error('ANTHROPIC_API_KEY is not set — skipping AI generation.');
  process.exit(0);
}

const FORMAT = `Each test case is a JSON object:
{
  "name": string,                       // short, unique
  "category": "injection"|"auth"|"bola"|"mass-assignment"|"resource-consumption"|"validation"|"xss"|"misconfiguration"|"business-logic",
  "owasp": string,                      // e.g. "API1:2023 Broken Object Level Authorization"
  "method": "GET"|"POST"|"PATCH"|"DELETE",
  "path": string,                       // may contain {{objectId}} (an object owned by ANOTHER user) or {{ownObjectId}}
  "auth": "none"|"user",                // "user" = a freshly registered user's Bearer token
  "headers": object (optional),
  "query": object (optional),
  "json": object (optional),            // JSON body
  "form": object (optional),            // urlencoded body (use for /oauth/* endpoints)
  "multipart": object (optional),       // text fields for multipart/form-data
  "expect": {
    "status": number[],                 // acceptable status codes
    "bodyNotContains": string[] (optional),
    "headers": object (optional)        // header name (lowercase) -> expected substring
  }
}`;

const system = 'You are a senior application-security and API test engineer. You design precise, deterministic, '
  + 'non-destructive black-box tests for REST APIs. You only output JSON.';

const prompt = (spec) => `Below is the OpenAPI 3.0 contract of the CampusFind API (Express + OAuth 2.1 with PKCE + JWT, plus a Django stats service).

Design ${COUNT} NEW test cases that a normal happy-path suite would miss: boundary values, malformed input,
type confusion, injection payloads (SQL, NoSQL, header, path traversal), stored-XSS payloads, JWT tampering,
OAuth 2.1 misuse (missing PKCE, plain method, wrong redirect_uri, reused code, unsupported grants),
broken object-level authorization, mass assignment, oversized pagination, and security headers.

Rules:
- Expectations must follow the contract and secure defaults (e.g. 400 for invalid input, 401 without token, 403 for other users' objects, never 500).
- Never target hosts other than the API; never include real credentials.
- Output ONLY a JSON array, no prose, no markdown fences.

${FORMAT}

OpenAPI contract:
${spec}`;

const spec = await readFile(SPEC, 'utf8');
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({ model: MODEL, max_tokens: 16000, system, messages: [{ role: 'user', content: prompt(spec) }] }),
});
if (!res.ok) {
  console.error(`Anthropic API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const text = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);

let cases;
try { cases = JSON.parse(json); } catch (e) {
  console.error('Model did not return valid JSON:', e.message);
  process.exit(1);
}

// Guard-rails: drop anything malformed or unsafe before it can be executed
const METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);
const valid = cases.filter((c) => c && typeof c.name === 'string' && METHODS.has(c.method)
  && typeof c.path === 'string' && c.path.startsWith('/') && !c.path.includes('://')
  && Array.isArray(c.expect?.status) && c.expect.status.every(Number.isInteger));

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ generatedBy: MODEL, generatedAt: new Date().toISOString(), cases: valid }, null, 2));
console.log(`Wrote ${valid.length}/${cases.length} valid AI-generated cases to ${OUT} — review before committing.`);
