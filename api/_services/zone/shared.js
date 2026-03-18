import charactersData from '../../../src/data/characters.json' with { type: 'json' };

const env = globalThis.process?.env || {};

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  env.SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

export const ZONE_EPOCH_TABLE = env.SUPABASE_ZONE_EPOCH_TABLE || 'zone_epochs';
export const ZONE_RUNS_TABLE = env.SUPABASE_ZONE_RUNS_TABLE || 'zone_runs';
export const ZONE_FLAGS_TABLE = env.SUPABASE_ZONE_FLAGS_TABLE || 'zone_epoch_flags';

export const VALID_OUTCOMES = new Set([
  'spd-double-crit',
  'double-crit',
  'spd-one-crit',
  'one-crit',
  'effect-junk',
  'flat-junk',
  'mixed',
]);

export const CRIT_OUTCOMES = new Set([
  'spd-double-crit',
  'double-crit',
  'spd-one-crit',
  'one-crit',
]);

export const JUNK_OUTCOMES = new Set(['effect-junk', 'flat-junk']);

const CHARACTER_NAME_MAP = new Map(
  (Array.isArray(charactersData) ? charactersData : []).map((entry) => [Number(entry.numId), entry.name])
);

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma'
  );
}

export function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'Supabase is not configured for Zone Tracker.');
  }
}

function ensureSupabaseAuthConfig() {
  if (!SUPABASE_URL || !(SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)) {
    throw new HttpError(500, 'Supabase auth config missing for Zone Tracker.');
  }
}

function parseJsonMaybe(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === 'object') return rawValue;
  if (typeof rawValue !== 'string') return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function readRequestBody(req) {
  const parsed = parseJsonMaybe(req.body);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function parseBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function requireAuthenticatedUser(req) {
  const token = parseBearerToken(req);
  if (!token) {
    throw new HttpError(401, 'Missing bearer token.');
  }

  ensureSupabaseAuthConfig();

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const apiKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(401, 'Invalid or expired auth token.', errorText);
  }

  const user = await response.json();
  if (!user?.id) {
    throw new HttpError(401, 'Token did not resolve to a user.');
  }

  return { token, user };
}

export async function supabaseAdminRequest(
  path,
  { method = 'GET', body, prefer = 'return=representation' } = {}
) {
  ensureSupabaseConfig();

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: prefer,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const rawError = await response.text();
    const details = parseJsonMaybe(rawError) || rawError || null;
    throw new HttpError(response.status, 'Supabase request failed.', details);
  }

  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();
  if (!raw) return null;
  return JSON.parse(raw);
}

function isUniqueViolationError(error) {
  return Boolean(error?.details && typeof error.details === 'object' && error.details.code === '23505');
}

export function buildTablePath(table, { select = '*', filters = {} } = {}) {
  const params = new URLSearchParams();
  if (select) {
    params.set('select', select);
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  return `${table}?${params.toString()}`;
}

export function normalizeSlotOrder(slotOrder) {
  if (!Array.isArray(slotOrder) || slotOrder.length !== 4) {
    throw new HttpError(400, 'slot_order must be an array of exactly 4 character IDs.');
  }

  const normalized = slotOrder.map((value) => Number(value));
  if (normalized.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new HttpError(400, 'slot_order contains invalid character IDs.');
  }

  return normalized;
}

export function normalizeOutcome(outcome) {
  const normalized = String(outcome || '').trim();
  if (!VALID_OUTCOMES.has(normalized)) {
    throw new HttpError(400, 'Invalid outcome.');
  }
  return normalized;
}

export function normalizeOptionalText(value, { field, maxLength = 200 } = {}) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} exceeds max length (${maxLength}).`);
  }
  return normalized;
}

export function resolveCharacterNames(slotOrder) {
  return slotOrder.map((charId) => CHARACTER_NAME_MAP.get(Number(charId)) || `Character ${charId}`);
}

export function toPgIntArrayLiteral(arr) {
  return `{${arr.map((value) => Number(value)).join(',')}}`;
}

export function computeHash(slotOrder) {
  const [a, b, c, d] = slotOrder;
  const charSum = a + b + c + d;
  const charXor = a ^ b ^ c ^ d;
  const charSlot = (d * 3 + a + b + c) % 10000;
  const xorSlotKey = `${charXor}_${charSlot}`;

  return {
    charSum,
    charXor,
    charSlot,
    xorSlotKey,
  };
}

function formatIsoWeek(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function fetchCurrentEpoch() {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        is_current: 'eq.true',
        order: 'created_at.desc',
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function fetchEpochById(epochId) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        id: `eq.${epochId}`,
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function ensureCurrentEpoch() {
  const existing = await fetchCurrentEpoch();
  if (existing) return existing;

  try {
    const rows = await supabaseAdminRequest(ZONE_EPOCH_TABLE, {
      method: 'POST',
      body: {
        calendar_week: formatIsoWeek(),
        created_by_flag: false,
        previous_epoch_id: null,
        is_current: true,
      },
    });

    const created = Array.isArray(rows) ? rows[0] : rows;
    if (!created?.id) {
      throw new HttpError(500, 'Failed to initialize current zone epoch.');
    }

    return created;
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const fallbackCurrent = await fetchCurrentEpoch();
    if (fallbackCurrent) return fallbackCurrent;
    throw new HttpError(500, 'Failed to initialize current zone epoch after retry.');
  }
}

export async function fetchPreviousEpoch(currentEpoch) {
  if (!currentEpoch) return null;

  if (currentEpoch.previous_epoch_id) {
    const previous = await fetchEpochById(currentEpoch.previous_epoch_id);
    if (previous) return previous;
  }

  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        is_current: 'eq.false',
        order: 'created_at.desc',
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function countDistinctRecentFlags(epochId, sinceIso) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_FLAGS_TABLE, {
      select: 'user_id',
      filters: {
        epoch_id: `eq.${epochId}`,
        created_at: `gte.${sinceIso}`,
      },
    })
  );

  const uniqueUsers = new Set((Array.isArray(rows) ? rows : []).map((row) => row.user_id).filter(Boolean));
  return uniqueUsers.size;
}

export async function rotateEpochFromFlag(currentEpoch) {
  if (!currentEpoch?.id) {
    throw new HttpError(500, 'Cannot rotate epoch without a valid current epoch.');
  }

  await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      select: false,
      filters: {
        id: `eq.${currentEpoch.id}`,
      },
    }),
    {
      method: 'PATCH',
      body: { is_current: false },
      prefer: 'return=minimal',
    }
  );

  try {
    const rows = await supabaseAdminRequest(ZONE_EPOCH_TABLE, {
      method: 'POST',
      body: {
        calendar_week: formatIsoWeek(),
        created_by_flag: true,
        previous_epoch_id: currentEpoch.id,
        is_current: true,
      },
    });

    const created = Array.isArray(rows) ? rows[0] : rows;
    if (!created?.id) {
      throw new HttpError(500, 'Failed to rotate zone epoch.');
    }

    return created;
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const fallbackCurrent = await fetchCurrentEpoch();
    if (fallbackCurrent?.id) return fallbackCurrent;
    throw new HttpError(500, 'Failed to rotate zone epoch after retry.');
  }
}

export function computeConfidenceLabel(runs) {
  if (runs >= 6) return 'HIGH';
  if (runs >= 3) return 'MEDIUM';
  return 'LOW';
}

export function buildZoneMapFromRuns(runs) {
  const groups = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    const key = run.xor_slot_key || `${run.char_xor}_${run.char_slot}`;
    if (!groups.has(key)) {
      groups.set(key, {
        xor_slot_key: key,
        char_xor: Number(run.char_xor),
        char_slot: Number(run.char_slot),
        char_sum: Number(run.char_sum),
        runs: 0,
        crit_count: 0,
        junk_count: 0,
        mixed_count: 0,
        sample_slot_order: run.slot_order || [],
        sample_char_names: run.char_names || [],
        last_submitted_at: run.submitted_at || null,
      });
    }

    const group = groups.get(key);
    group.runs += 1;
    if (run.submitted_at && (!group.last_submitted_at || run.submitted_at > group.last_submitted_at)) {
      group.last_submitted_at = run.submitted_at;
    }

    if (CRIT_OUTCOMES.has(run.outcome)) {
      group.crit_count += 1;
    } else if (JUNK_OUTCOMES.has(run.outcome)) {
      group.junk_count += 1;
    } else {
      group.mixed_count += 1;
    }
  }

  const zones = Array.from(groups.values()).map((group) => {
    const denominator = group.crit_count + group.junk_count;
    const critRate = denominator > 0 ? group.crit_count / denominator : null;
    const confidence = computeConfidenceLabel(group.runs);
    const sampleWeight = Math.min(group.runs, 10) / 10;
    const rateWeight = critRate === null ? 0 : critRate;
    const weightedConfidence = Number((rateWeight * 0.7 + sampleWeight * 0.3).toFixed(4));

    return {
      ...group,
      crit_rate: critRate === null ? null : Number(critRate.toFixed(4)),
      weighted_confidence: weightedConfidence,
      confidence,
    };
  });

  zones.sort((a, b) => {
    const aRate = a.crit_rate;
    const bRate = b.crit_rate;
    if (aRate === null && bRate !== null) return 1;
    if (bRate === null && aRate !== null) return -1;
    if (aRate !== bRate) return (bRate || 0) - (aRate || 0);
    if (a.weighted_confidence !== b.weighted_confidence) {
      return b.weighted_confidence - a.weighted_confidence;
    }
    return b.runs - a.runs;
  });

  return zones;
}

export function handleApiError(res, error) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      details: error.details || undefined,
    });
  }

  console.error('[Zone API] Unexpected error:', error);
  return res.status(500).json({ error: 'Unexpected zone API error.' });
}
