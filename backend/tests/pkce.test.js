const { challengeFromVerifier, verifyPkce, generateVerifier, isValidChallenge } = require('../src/utils/pkce');

const crypto = require('crypto');

test('S256 challenge is BASE64URL(SHA256(ASCII(code_verifier))) with no padding', () => {
  const verifier = 'a'.repeat(43);
  const expected = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  expect(challengeFromVerifier(verifier)).toBe(expected);
  expect(expected).toHaveLength(43);
  expect(verifyPkce(verifier, expected)).toBe(true);
});

test('generated verifiers round-trip and wrong verifiers fail', () => {
  const v = generateVerifier();
  const c = challengeFromVerifier(v);
  expect(isValidChallenge(c)).toBe(true);
  expect(verifyPkce(v, c)).toBe(true);
  expect(verifyPkce(generateVerifier(), c)).toBe(false);
  expect(verifyPkce('short', c)).toBe(false);
});
