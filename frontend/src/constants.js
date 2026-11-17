export const CATEGORIES = ['Electronics', 'Clothing', 'Documents', 'Keys', 'Bags & Backpacks',
  'Books', 'Glasses', 'Jewelry', 'Sports', 'Other'];

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const truncate = (str, n) => (str && str.length > n ? `${str.substring(0, n)}…` : str || '');

const BLOB_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/objects\/[\w.-]+$/i;

/**
 * Only allow images served by our own API (local disk) or our Vercel Blob store
 * (blocks javascript:/data:/third-party URLs injected through the API).
 */
export function safeImageSrc(path) {
  if (typeof path !== 'string') return null;
  if (/^uploads\/[\w.-]+$/.test(path)) return `/${path}`;
  if (BLOB_URL.test(path)) return path;
  return null;
}
