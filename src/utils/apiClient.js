/**
 * API Client for Backend
 * Tries Cloudflare Worker first, falls back to Vercel on timeout/error
 */
import { API_BASE_URL, FALLBACK_API_BASE_URL } from './apiBase';
import { fetchJsonWithDedupe } from './requestDedupe';

const BACKEND_API_BASE_URL = `${API_BASE_URL || ''}/api`;
const FALLBACK_BACKEND_API_BASE_URL = `${FALLBACK_API_BASE_URL || ''}/api`;
const API_FETCH_TIMEOUT_MS = 12000;
const CLOUDFLARE_TIMEOUT_MS = 6000; // 6s before fallback, per plan
const API_CACHE_PREFIX = 'hsr-api-cache-v2:';
const API_CACHE_TTL_MS = 10 * 60 * 1000;
const STATS_API_CACHE_TTL_MS = 60 * 60 * 1000;
const BANNERS_API_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const apiMemoryCache = new Map();

function getApiCacheTtlMs(key) {
  if (/\/(?:hsr|genshin|wuwa|zzz)\/stats\?/i.test(key)) return STATS_API_CACHE_TTL_MS;
  if (/\/(?:genshin|wuwa)\/banners$/i.test(key) || /\/banners(?:\?|$)/i.test(key)) return BANNERS_API_CACHE_TTL_MS;
  return API_CACHE_TTL_MS;
}

function readApiCache(key) {
  const ttlMs = getApiCacheTtlMs(key);
  const cached = apiMemoryCache.get(key);
  if (cached && Date.now() - cached.savedAt < ttlMs) return cached.data;
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${API_CACHE_PREFIX}${key}`) || 'null');
    if (!parsed?.data || Date.now() - Number(parsed.savedAt || 0) >= ttlMs) return null;
    apiMemoryCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeApiCache(key, data) {
  const entry = { data, savedAt: Date.now() };
  apiMemoryCache.set(key, entry);
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${API_CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // in-memory cache still helps this tab
  }
}

/**
 * Fetch from a single URL
 */
async function fetchSingle(url, options = {}, timeoutMs = API_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    const dedupeKey = options.dedupe !== false ? `api:${url}` : '';
    const { response, data } = await fetchJsonWithDedupe(dedupeKey, url, requestInit);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const error = contentType.includes('application/json') ? data : { message: data?.message || '' };
      const message = error.error || error.message || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Generic fetch wrapper with Cloudflare -> Vercel fallback
 */
export async function apiFetch(endpoint, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const cacheKey = method === 'GET' ? endpoint : '';
  if (cacheKey && options.cacheClient !== false) {
    const cached = readApiCache(cacheKey);
    if (cached) return cached;
  }

  const primaryUrl = `${BACKEND_API_BASE_URL}${endpoint}`;
  const fallbackUrl = `${FALLBACK_BACKEND_API_BASE_URL}${endpoint}`;
  const isFallbackSame = primaryUrl === fallbackUrl || !FALLBACK_BACKEND_API_BASE_URL;

  // Try primary (Cloudflare) first
  try {
    const timeoutMs = Number(options.timeoutMs || CLOUDFLARE_TIMEOUT_MS);
    const data = await fetchSingle(primaryUrl, options, timeoutMs);
    if (cacheKey && options.cacheClient !== false) {
      writeApiCache(cacheKey, data);
    }
    return data;
  } catch (primaryError) {
    // If no fallback configured or same as primary, throw
    if (isFallbackSame) {
      console.error(`[API Client] Primary failed, no fallback: ${endpoint}`, primaryError);
      throw primaryError;
    }

    // Log fallback
    console.warn(`[API Client] Primary failed (${primaryError.message}), trying fallback: ${fallbackUrl}`);

    // Try fallback (Vercel)
    try {
      const fallbackTimeoutMs = Number(options.fallbackTimeoutMs || API_FETCH_TIMEOUT_MS);
      const data = await fetchSingle(fallbackUrl, { ...options, dedupe: false }, fallbackTimeoutMs);
      if (cacheKey && options.cacheClient !== false) {
        writeApiCache(cacheKey, data);
      }
      return data;
    } catch (fallbackError) {
      console.error(`[API Client] Fallback also failed: ${endpoint}`, fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * WuWa API
 */
export const wuwaApi = {
  async getStats(bannerId) {
    return apiFetch(`/wuwa/stats?id=${bannerId}`);
  },
  async getBanners() {
    return apiFetch('/wuwa/banners');
  },
};

/**
 * HSR API
 */
export const hsrApi = {
  async getStats(bannerId) {
    return apiFetch(`/hsr/stats?id=${bannerId}`);
  },
};

/**
 * Genshin API
 */
export const genshinApi = {
  async getStats(bannerId) {
    return apiFetch(`/genshin/stats?id=${bannerId}`);
  },
  async getBanners() {
    return apiFetch('/genshin/banners');
  },
};

/**
 * ZZZ API
 */
export const zzzApi = {
  async getStats(bannerId) {
    return apiFetch(`/zzz/stats?id=${bannerId}`);
  },
};

/**
 * Set custom API base URL (for testing or custom deployments)
 */
export function setApiBaseUrl(url) {
  console.warn(`[API Client] Custom API URL not yet supported: ${url}`);
}

export default {
  wuwa: wuwaApi,
  hsr: hsrApi,
  genshin: genshinApi,
  zzz: zzzApi,
};
