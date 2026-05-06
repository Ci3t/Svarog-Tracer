/**
 * API Client for Backend
 * Handles all API calls to Vercel backend
 */
import { API_BASE_URL } from './apiBase';

const BACKEND_API_BASE_URL = `${API_BASE_URL || ''}/api`;
const API_FETCH_TIMEOUT_MS = 12000;
const API_CACHE_PREFIX = 'hsr-api-cache-v1:';
const API_CACHE_TTL_MS = 10 * 60 * 1000;
const apiMemoryCache = new Map();

function readApiCache(key) {
  const cached = apiMemoryCache.get(key);
  if (cached && Date.now() - cached.savedAt < API_CACHE_TTL_MS) return cached.data;
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${API_CACHE_PREFIX}${key}`) || 'null');
    if (!parsed?.data || Date.now() - Number(parsed.savedAt || 0) >= API_CACHE_TTL_MS) return null;
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
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const cacheKey = !options.method || String(options.method).toUpperCase() === 'GET' ? endpoint : '';
  if (cacheKey && options.cacheClient !== false) {
    const cached = readApiCache(cacheKey);
    if (cached) return cached;
  }

  const url = `${BACKEND_API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || API_FETCH_TIMEOUT_MS);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const error = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : { message: await response.text().catch(() => '') };
      const message = error.error || error.message || `HTTP ${response.status}`;
      throw new Error(message);
    }
    
    const data = await response.json();
    if (cacheKey && options.cacheClient !== false) {
      writeApiCache(cacheKey, data);
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    console.error(`[API Client] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * WuWa API
 */
export const wuwaApi = {
  /**
   * Fetch WuWa banner statistics
   * @param {string} bannerId - Banner ID (e.g., "100031")
   */
  async getStats(bannerId) {
    return apiFetch(`/wuwa/stats?id=${bannerId}`);
  },
  
  /**
   * Fetch live WuWa banners
   */
  async getBanners() {
    return apiFetch('/wuwa/banners');
  },
};

/**
 * HSR API
 */
export const hsrApi = {
  /**
   * Fetch HSR banner statistics
   * @param {string} bannerId - Banner ID (e.g., "2099")
   */
  async getStats(bannerId) {
    return apiFetch(`/hsr/stats?id=${bannerId}`);
  },
};

/**
 * Genshin API
 */
export const genshinApi = {
  /**
   * Fetch Genshin banner statistics
   * @param {string} bannerId - Banner ID (e.g., "300094")
   */
  async getStats(bannerId) {
    return apiFetch(`/genshin/stats?id=${bannerId}`);
  },
  
  /**
   * Fetch live Genshin banners
   */
  async getBanners() {
    return apiFetch('/genshin/banners');
  },
};

/**
 * ZZZ API
 */
export const zzzApi = {
  /**
   * Fetch ZZZ banner statistics
   * @param {string} bannerId - Banner ID (e.g., "2001015")
   */
  async getStats(bannerId) {
    return apiFetch(`/zzz/stats?id=${bannerId}`);
  },
};

/**
 * Set custom API base URL (for testing or custom deployments)
 */
export function setApiBaseUrl(url) {
  // This would require refactoring to use a mutable variable
  console.warn('[API Client] Custom API URL not yet supported');
}

export default {
  wuwa: wuwaApi,
  hsr: hsrApi,
  genshin: genshinApi,
  zzz: zzzApi,
};
