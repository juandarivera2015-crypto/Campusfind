export const CATEGORIES = ['Electronics', 'Clothing', 'Documents', 'Keys', 'Bags & Backpacks',
  'Books', 'Glasses', 'Jewelry', 'Sports', 'Other'];

/** Display labels (values stay in English: they are the API/database enum values). */
export const CATEGORY_LABELS = {
  Electronics: 'Electrónica',
  Clothing: 'Ropa',
  Documents: 'Documentos',
  Keys: 'Llaves',
  'Bags & Backpacks': 'Bolsos y morrales',
  Books: 'Libros',
  Glasses: 'Gafas',
  Jewelry: 'Joyas',
  Sports: 'Deportes',
  Other: 'Otros',
};
export const categoryLabel = (c) => CATEGORY_LABELS[c] || c;
export const STATUS_LABELS = { lost: 'Perdido', found: 'Encontrado' };

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
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
