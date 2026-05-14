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
  /^\/api\/hsr\/kiyo\/patch(?:\?|$)/,
  /^\/api\/hoyo-codes(?:\?|$)/,
];

export function shouldUseCloudflareApi(path) {
  const normalizedPath = String(path || '');
  return CLOUDFLARE_ROUTE_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function resolveApiBaseForPath(path) {
  // Runtime routing guard: if Cloudflare is disabled, use fallback base for all paths
  if (shouldBypassCloudflareRuntime()) {
    return getRuntimeRoutingBase();
  }
  if (!configuredApiBase) return API_BASE_URL;
  return shouldUseCloudflareApi(path) ? API_BASE_URL : FALLBACK_API_BASE_URL;
}

export function buildApiUrl(path) {
  return `${resolveApiBaseForPath(path)}${path}`;
}

export function buildFallbackApiUrl(path) {
  return `${FALLBACK_API_BASE_URL}${path}`;
}

/**
 * Always builds a URL pointing directly to Vercel.
 * Use this for POST / admin / write routes that must never go through the Worker.
 */
export function buildVercelApiUrl(path) {
  return `${FALLBACK_API_BASE_URL}${path}`;
}

// =========================================================================
// RUNTIME API ROUTING GUARD
// Fetches public/api-routing.json to allow emergency bypass of Cloudflare
// =========================================================================
let runtimeRouting = null;
let runtimeRoutingLoadedAt = 0;
const RUNTIME_ROUTING_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function refreshRuntimeApiRouting() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (runtimeRouting && now - runtimeRoutingLoadedAt < RUNTIME_ROUTING_MAX_AGE_MS) {
    return;
  }

  try {
    const res = await fetch('/api-routing.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.mode === 'string') {
      runtimeRouting = data;
      runtimeRoutingLoadedAt = now;
    }
  } catch {
    // Silent fail; keep previous or null
  }
}

export function shouldBypassCloudflareRuntime() {
  if (!runtimeRouting) return false;

  // If mode is explicitly vercel, bypass Cloudflare
  if (runtimeRouting.mode === 'vercel') return true;

  // If disabledUntil is set and in the future, bypass Cloudflare
  if (runtimeRouting.cloudflareDisabledUntilUtc) {
    const disabledUntil = new Date(runtimeRouting.cloudflareDisabledUntilUtc);
    if (!isNaN(disabledUntil.getTime()) && disabledUntil > new Date()) {
      return true;
    }
  }

  return false;
}

export function getRuntimeRoutingBase() {
  if (!runtimeRouting) return FALLBACK_API_BASE_URL;
  return normalizeConfiguredApiBase(runtimeRouting.fallbackBase) || FALLBACK_API_BASE_URL;
}
