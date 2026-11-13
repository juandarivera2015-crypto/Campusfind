export const CATEGORIES = ['Electronics', 'Clothing', 'Documents', 'Keys', 'Bags & Backpacks',
  'Books', 'Glasses', 'Jewelry', 'Sports', 'Other'];

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const truncate = (str, n) => (str && str.length > n ? `${str.substring(0, n)}…` : str || '');

/** Only allow images served by our own API (blocks javascript:/data: URLs injected via the API). */
export const safeImageSrc = (path) => (typeof path === 'string' && /^uploads\/[\w.-]+$/.test(path) ? `/${path}` : null);
