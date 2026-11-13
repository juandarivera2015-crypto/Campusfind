/**
 * Minimal API client.
 * - The JWT access token lives only in memory (never localStorage -> not stealable by XSS persistence).
 * - The refresh token is an HttpOnly cookie managed by the browser; refresh calls send the
 *   double-submit CSRF header read from the non-HttpOnly `cf_csrf` cookie.
 */
let accessToken = null;
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

export function readCookie(name) {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

async function parse(res) {
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = body?.errors?.map((e) => e.message).join(' ')
      || body?.detail || body?.error_description || body?.title || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

/** Exchanges the refresh cookie for a new access token (de-duplicated across concurrent callers). */
export function refreshAccessToken() {
  if (!refreshPromise) {
    const csrf = readCookie('cf_csrf');
    refreshPromise = (csrf
      ? fetch('/oauth/token', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrf },
        body: new URLSearchParams({ grant_type: 'refresh_token' }),
      }).then(parse).then((t) => { setAccessToken(t.access_token); return t; })
      : Promise.reject(new ApiError('No session', 401)))
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api(path, { method = 'GET', body, query, retry = true } = {}) {
  const url = query ? `${path}?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null))}` : path;
  const headers = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' });
  if (res.status === 401 && retry && accessToken) {
    try {
      await refreshAccessToken();
      return api(path, { method, body, query, retry: false });
    } catch {
      setAccessToken(null);
    }
  }
  return parse(res);
}

export const postForm = (url, data, extraHeaders = {}) => fetch(url, {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', ...extraHeaders },
  body: new URLSearchParams(data),
}).then(parse);
