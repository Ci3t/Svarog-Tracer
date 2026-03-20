const isDevHost = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

export const API_BASE_URL = isDevHost() ? '' : 'https://svarog-tracer.vercel.app';

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
