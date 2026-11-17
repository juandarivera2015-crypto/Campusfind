/**
 * PKCE helpers (RFC 7636) using the Web Crypto API.
 * Requires a secure context (https:// or http://localhost).
 */
export function base64url(bytes) {
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(byteLength = 48) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function challengeFromVerifier(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export async function createPkcePair() {
  const verifier = randomString(48); // 64 chars, within the 43..128 range
  return { verifier, challenge: await challengeFromVerifier(verifier) };
}
