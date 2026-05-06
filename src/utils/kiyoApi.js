import { buildApiUrl } from './apiBase';

const KIYO_API_BASE = '/api/hsr/kiyo';
const PATCH_CACHE_KEY = 'hsr-current-patch-cache-v1';
const STATS_CACHE_PREFIX = 'hsr-kiyo-stats-cache-v1:';
const PATCH_CACHE_TTL_MS = 60 * 60 * 1000;
const STATS_CACHE_TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map();

function readTimedCache(key, ttlMs) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && Date.now() - memoryEntry.savedAt < ttlMs) {
    return memoryEntry.data;
  }

  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (!parsed?.data || Date.now() - Number(parsed.savedAt || 0) >= ttlMs) {
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function writeTimedCache(key, data) {
  const entry = { data, savedAt: Date.now() };
  memoryCache.set(key, entry);
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore storage failures; in-memory cache still helps this tab
  }
}

async function kiyoFetch(path, options = {}) {
  const url = buildApiUrl(`${KIYO_API_BASE}${path}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Save a batch of rolls (a session) to the Kiyo DB.
 * @param {Object} payload
 * @param {string} payload.session_id
 * @param {string} payload.user_id
 * @param {string} payload.region
 * @param {string} payload.patch
 * @param {string} payload.source
 * @param {Array<{roll_3str: string, roll_index: number, ts: number}>} payload.rolls
 */
export async function saveSession(payload) {
  return kiyoFetch('/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Query patch stats. Returns { user, region, global, fallback_needed, sheet_weight }.
 * @param {Object} params
 * @param {string} params.patch
 * @param {string} params.region
 * @param {string} [params.user_id]
 */
export async function getStats({ patch, region, user_id }) {
  const query = new URLSearchParams({ patch, region });
  if (user_id) query.set('user_id', user_id);
  const cacheKey = `${STATS_CACHE_PREFIX}${query.toString()}`;
  const cached = readTimedCache(cacheKey, user_id ? 60 * 1000 : STATS_CACHE_TTL_MS);
  if (cached) return cached;

  const data = await kiyoFetch(`/stats?${query.toString()}`);
  writeTimedCache(cacheKey, data);
  return data;
}

/**
 * Get current patch config.
 */
export async function getPatch() {
  const cached = readTimedCache(PATCH_CACHE_KEY, PATCH_CACHE_TTL_MS);
  if (cached) return cached;

  const data = await kiyoFetch('/patch');
  writeTimedCache(PATCH_CACHE_KEY, data);
  return data;
}

/**
 * Health check.
 */
export async function getHealth() {
  return kiyoFetch('/health');
}
