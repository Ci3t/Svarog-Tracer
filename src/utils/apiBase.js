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
const configuredFallbackBase = normalizeConfiguredApiBase(import.meta.env.VITE_API_FALLBACK_BASE_URL);
const forceRemoteApi = String(import.meta.env.VITE_FORCE_REMOTE_API || '').trim().toLowerCase() === 'true';
const REMOTE_API_BASE_URL = 'https://svarog-tracer.vercel.app';

function resolveApiBaseUrl() {
  if (configuredApiBase) {
    return configuredApiBase;
  }

  if (isDevHost()) {
    if (forceRemoteApi) {
      return REMOTE_API_BASE_URL;
    }
    return '';
  }

  if (typeof window !== 'undefined' && !isGithubPagesHost()) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return REMOTE_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const FALLBACK_API_BASE_URL = configuredFallbackBase || REMOTE_API_BASE_URL;

const CLOUDFLARE_ROUTE_PATTERNS = [
  /^\/api\/banners(?:\?|$)/,
  /^\/api\/hsr\/stats(?:\?|$)/,
  /^\/api\/genshin\/stats(?:\?|$)/,
  /^\/api\/wuwa\/stats(?:\?|$)/,
  /^\/api\/patch-timers(?:\?|$)/,
  /^\/api\/presence(?:\?|$)/,
  /^\/api\/hsr\/kiyo\/patch(?:\?|$)/,
];

export function shouldUseCloudflareApi(path) {
  const normalizedPath = String(path || '');
  return CLOUDFLARE_ROUTE_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function resolveApiBaseForPath(path) {
  if (!configuredApiBase) return API_BASE_URL;
  return shouldUseCloudflareApi(path) ? API_BASE_URL : FALLBACK_API_BASE_URL;
}

export function buildApiUrl(path) {
  return `${resolveApiBaseForPath(path)}${path}`;
}

export function buildFallbackApiUrl(path) {
  return `${FALLBACK_API_BASE_URL}${path}`;
}
