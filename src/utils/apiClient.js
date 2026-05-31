/**
 * API Client for Backend
 * Tries Cloudflare Worker first, falls back to Vercel on timeout/error
 */
import {
  API_BASE_URL,
  FALLBACK_API_BASE_URL,
  refreshRuntimeApiRouting,
  shouldBypassCloudflareRuntime,
  getRuntimeRoutingBase,
} from './apiBase';
import { fetchJsonWithDedupe } from './requestDedupe';

const BACKEND_API_BASE_URL = `${API_BASE_URL || ''}/api`;
const FALLBACK_BACKEND_API_BASE_URL = `${FALLBACK_API_BASE_URL || ''}/api`;
const API_FETCH_TIMEOUT_MS = 12000;
const CLOUDFLARE_TIMEOUT_MS = 6000; // 6s before fallback, per plan
const API_CACHE_PREFIX = 'hsr-api-cache-v3:';
const API_CACHE_TTL_MS = 10 * 60 * 1000;
const WARP_ANALYZER_FRESHNESS_MS = 15 * 60 * 1000;
const STATS_API_CACHE_TTL_MS = WARP_ANALYZER_FRESHNESS_MS;
const BANNERS_API_CACHE_TTL_MS = WARP_ANALYZER_FRESHNESS_MS;
const HOYO_CODES_API_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const apiMemoryCache = new Map();

function getApiCacheTtlMs(key) {
  if (/\/(?:hsr|genshin|wuwa|zzz)\/stats\?/i.test(key)) return STATS_API_CACHE_TTL_MS;
  if (/\/(?:genshin|wuwa)\/banners$/i.test(key) || /\/banners(?:\?|$)/i.test(key)) return BANNERS_API_CACHE_TTL_MS;
  if (/\/hoyo-codes(?:\?|$)/i.test(key)) return HOYO_CODES_API_CACHE_TTL_MS;
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
  const { cacheClient, ...fetchOptions } = options;

  try {
    const requestInit = {
      ...fetchOptions,
      cache: cacheClient === false ? 'no-store' : fetchOptions.cache,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
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

  // Refresh runtime routing config before deciding which backend to use
  await refreshRuntimeApiRouting();
  const bypassCloudflare = shouldBypassCloudflareRuntime();

  let primaryUrl;
  let fallbackUrl;

  if (bypassCloudflare) {
    // Skip Cloudflare entirely; go straight to Vercel
    const runtimeBase = getRuntimeRoutingBase();
    primaryUrl = `${runtimeBase}/api${endpoint}`;
    fallbackUrl = primaryUrl; // same — no double fallback
  } else {
    primaryUrl = `${BACKEND_API_BASE_URL}${endpoint}`;
    fallbackUrl = `${FALLBACK_BACKEND_API_BASE_URL}${endpoint}`;
  }

  const isFallbackSame = primaryUrl === fallbackUrl || !FALLBACK_BACKEND_API_BASE_URL;

  // Try primary (Cloudflare or direct Vercel if bypassed)
  try {
    const timeoutMs = Number(options.timeoutMs || CLOUDFLARE_TIMEOUT_MS);
    const data = await fetchSingle(primaryUrl, options, timeoutMs);
    if (cacheKey && options.cacheClient !== false) {
      writeApiCache(cacheKey, data);
    }
    return data;
  } catch (primaryError) {
    // If no fallback configured or same as primary, throw
    if (isFallbackSame || bypassCloudflare) {
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
    const response = await apiFetch('/banners?game=wuwa');
    return Array.isArray(response?.wuwa) ? response.wuwa : response;
  },
};

/**
 * HSR API
 */
export const hsrApi = {
  async getStats(bannerId) {
    return apiFetch(`/hsr/stats?id=${bannerId}&compare_id=0`);
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
    const response = await apiFetch('/banners?game=genshin');
    return Array.isArray(response?.genshin) ? response.genshin : response;
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
 * HoYo redeem codes API
 */
export const hoyoCodesApi = {
  async getCodes(game = 'all') {
    return apiFetch(`/hoyo-codes?game=${encodeURIComponent(game)}`);
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
  hoyoCodes: hoyoCodesApi,
};
