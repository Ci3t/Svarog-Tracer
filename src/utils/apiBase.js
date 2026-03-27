const isDevHost = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

function normalizeConfiguredApiBase(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.replace(/\/+$/, '');
}

const configuredApiBase = normalizeConfiguredApiBase(import.meta.env.VITE_API_BASE_URL);

export const API_BASE_URL = configuredApiBase || (isDevHost() ? '' : 'https://svarog-tracer.vercel.app');

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
