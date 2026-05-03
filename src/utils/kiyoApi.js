import { buildApiUrl } from './apiBase';

const KIYO_API_BASE = '/api/hsr/kiyo';

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
  return kiyoFetch(`/stats?${query.toString()}`);
}

/**
 * Get current patch config.
 */
export async function getPatch() {
  return kiyoFetch('/patch');
}

/**
 * Health check.
 */
export async function getHealth() {
  return kiyoFetch('/health');
}
