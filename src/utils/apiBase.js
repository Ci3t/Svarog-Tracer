const isDevHost = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

const isGithubPagesHost = () => {
  if (typeof window === 'undefined') return false;
  return String(window.location.hostname || '').toLowerCase().endsWith('github.io');
};

function normalizeConfiguredApiBase(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.replace(/\/+$/, '');
}

const configuredApiBase = normalizeConfiguredApiBase(import.meta.env.VITE_API_BASE_URL);
const forceRemoteApi = String(import.meta.env.VITE_FORCE_REMOTE_API || '').trim().toLowerCase() === 'true';

function resolveApiBaseUrl() {
  if (isDevHost() && !forceRemoteApi) {
    return '';
  }

  if (configuredApiBase) {
    return configuredApiBase;
  }

  if (typeof window !== 'undefined' && !isGithubPagesHost()) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'https://svarog-tracer.vercel.app';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
