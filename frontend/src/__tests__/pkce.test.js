import { base64url, challengeFromVerifier, createPkcePair } from '../auth/pkce';

describe('PKCE', () => {
  it('base64url has no padding or unsafe chars', () => {
    expect(base64url(new Uint8Array([251, 255, 254]))).toBe('-__-');
  });

  it('creates a verifier of valid length and a 43-char S256 challenge', async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]{43,128}$/);
    expect(challenge).toHaveLength(43);
    expect(await challengeFromVerifier(verifier)).toBe(challenge);
  });
});
