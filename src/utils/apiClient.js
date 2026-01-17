/**
 * API Client for Backend
 * Handles all API calls to Vercel backend
 */

// API Base URL - always use deployed Vercel API
// (We don't run a local backend, so dev mode uses production API too)
const getApiBaseUrl = () => {
  return 'https://svarog-tracer.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
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
