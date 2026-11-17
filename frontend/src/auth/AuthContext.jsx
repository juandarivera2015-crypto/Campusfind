import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, postForm, readCookie, refreshAccessToken, setAccessToken } from '../api/client';
import { createPkcePair, randomString } from './pkce';

const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || 'campusfind-web';
const SCOPE = 'profile objects:read objects:write messages:read messages:write';
const redirectUri = () => `${window.location.origin}/callback`;

const AuthContext = createContext(null);

/** Exchanges an authorization code (+ PKCE verifier) for tokens. */
export async function exchangeCode(code, verifier) {
  const token = await postForm('/oauth/token', {
    grant_type: 'authorization_code', code, code_verifier: verifier, client_id: CLIENT_ID, redirect_uri: redirectUri(),
  });
  setAccessToken(token.access_token);
  return token;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    const { data } = await api('/api/v1/users/me');
    setUser(data);
    return data;
  }, []);

  // Restore the session after a page reload using the HttpOnly refresh cookie.
  useEffect(() => {
    (async () => {
      try {
        if (readCookie('cf_csrf')) {
          await refreshAccessToken();
          await loadMe();
        }
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    })();
  }, [loadMe]);

  /** OAuth 2.1 authorization code flow with PKCE (S256). */
  const login = useCallback(async (email, password) => {
    const { verifier, challenge } = await createPkcePair();
    const state = randomString(16);
    const res = await fetch('/oauth/authorize', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        response_type: 'code', client_id: CLIENT_ID, redirect_uri: redirectUri(), scope: SCOPE,
        code_challenge: challenge, code_challenge_method: 'S256', state, email, password,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error_description || 'No se pudo iniciar sesión.');
    if (body.state !== state) throw new Error('El estado de OAuth no coincide. Intenta de nuevo.'); // CSRF / mix-up protection
    await exchangeCode(body.code, verifier);
    return loadMe();
  }, [loadMe]);

  const logout = useCallback(async () => {
    const csrf = readCookie('cf_csrf');
    try {
      if (csrf) await postForm('/oauth/revoke', {}, { 'X-CSRF-Token': csrf });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const register = useCallback((form) => api('/api/v1/users', { method: 'POST', body: form }), []);

  const value = useMemo(() => ({ user, ready, login, logout, register, loadMe }), [user, ready, login, logout, register, loadMe]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
