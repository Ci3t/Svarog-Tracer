import { setCorsHeaders } from '../zone/shared.js';
import {
  getTursoClient,
  isTursoConfigured,
  validateRoll3str,
  validatePatch,
  validateRegion,
  validateSource,
  validateUserId,
  validateSessionId,
  hashIp,
  getAnonymousUserId,
} from './kiyoClient.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_CALLS = 60; // per minute per IP
const MAX_ROLLS_PER_SESSION = 200;
const STATS_RATE_LIMIT_MAX = 120; // per minute per IP

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isTursoConfigured()) {
    return res.status(503).json({ error: 'Kiyo DB not configured', detail: 'TURSO_DB_URL or TURSO_AUTH_TOKEN missing' });
  }

  const db = getTursoClient();
  if (!db) {
    return res.status(503).json({ error: 'Kiyo DB unavailable' });
  }

  const pathPart = resolveKiyoPath(req);

  try {
    if (pathPart === 'session' && req.method === 'POST') {
      return await handleSessionSave(req, res, db);
    }

    if (pathPart === 'stats' && req.method === 'GET') {
      return await handleStatsQuery(req, res, db);
    }

    if (pathPart === 'health' && req.method === 'GET') {
      return res.status(200).json({ status: 'ok', db: 'connected' });
    }

    // Legacy roll endpoint — redirect to session for backwards compat
    if (pathPart === 'roll' && req.method === 'POST') {
      return res.status(410).json({ error: 'Deprecated', detail: 'Use POST /session instead' });
    }

    return res.status(404).json({ error: 'Unknown Kiyo endpoint', path: pathPart });
  } catch (err) {
    console.error('[Kiyo] Handler error:', err);
    return res.status(500).json({ error: 'Internal Kiyo error', detail: err.message });
  }
}

function resolveKiyoPath(req) {
  const raw = req.url || '';
  const segments = raw.split('/').filter(Boolean);
  const kiyoIdx = segments.indexOf('kiyo');
  if (kiyoIdx === -1) return '';
  return segments[kiyoIdx + 1] || '';
}

/*
  POST /api/hsr/kiyo/session
  Body: {
    session_id: string (UUID),
    user_id: string (Supabase UUID | Discord ID | anon_<hash>),
    region: 'EU' | 'NA' | 'ASIA' | 'CN' | 'GL',
    patch: string (e.g. '4.3'),
    source: 'live_manual' | 'import_paste' | 'sheet_seed' | 'caesar_helper' | 'debug_replay',
    rolls: [
      { roll_3str: '432', roll_index: 0, ts: 1714591200000 }
    ]
  }
*/
async function handleSessionSave(req, res, db) {
  const body = typeof req.body === 'object' ? req.body : {};
  const { session_id, user_id, region, patch, source, rolls } = body;

  // Validation
  if (!validateSessionId(session_id)) {
    return res.status(400).json({ error: 'Missing or invalid session_id', format: 'UUID v4' });
  }
  if (!validateUserId(user_id)) {
    return res.status(400).json({ error: 'Missing or invalid user_id' });
  }
  if (!validateRegion(region)) {
    return res.status(400).json({ error: 'Missing or invalid region', valid: ['EU', 'NA', 'ASIA', 'CN', 'GL'] });
  }
  if (!validatePatch(patch)) {
    return res.status(400).json({ error: 'Missing or invalid patch', format: 'e.g. "4.3"' });
  }

  const normalizedSource = source || 'live_manual';
  if (!validateSource(normalizedSource)) {
    return res.status(400).json({ error: 'Invalid source', valid: Array.from(['live_manual', 'import_paste', 'sheet_seed', 'caesar_helper', 'debug_replay']) });
  }

  if (!Array.isArray(rolls) || rolls.length === 0) {
    return res.status(400).json({ error: 'Missing or empty rolls array' });
  }
  if (rolls.length > MAX_ROLLS_PER_SESSION) {
    return res.status(400).json({ error: 'Too many rolls', max: MAX_ROLLS_PER_SESSION, received: rolls.length });
  }

  // Validate each roll
  for (let i = 0; i < rolls.length; i++) {
    const r = rolls[i];
    if (!r || typeof r !== 'object') {
      return res.status(400).json({ error: `Invalid roll at index ${i}` });
    }
    if (!validateRoll3str(r.roll_3str)) {
      return res.status(400).json({ error: `Invalid roll_3str at index ${i}`, format: '3 digits 1-4' });
    }
    if (!Number.isInteger(r.roll_index) || r.roll_index < 0 || r.roll_index > 999) {
      return res.status(400).json({ error: `Invalid roll_index at index ${i}`, format: 'integer 0-999' });
    }
    if (!Number.isInteger(r.ts) || r.ts <= 0) {
      return res.status(400).json({ error: `Invalid ts at index ${i}`, format: 'positive integer timestamp' });
    }
  }

  // Rate limit by IP
  const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const ipHash = hashIp(ip);
  try {
    await checkRateLimit(db, ipHash, 'session');
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded', detail: 'Max 60 session submissions per minute' });
  }

  const now = new Date().toISOString();
  const regionUpper = region.toUpperCase();
  const isLive = normalizedSource === 'live_manual';
  const countColumn = isLive ? 'count_live' : 'count_imported';

  try {
    // Start batch transaction
    const batchStatements = [];

    // 1. Insert session (upsert)
    const sessionStart = new Date(rolls[0].ts).toISOString();
    const sessionEnd = new Date(rolls[rolls.length - 1].ts).toISOString();
    batchStatements.push({
      sql: `INSERT INTO kiyo_sessions (anonymous_user_id, user_id, region, patch, started_at, ended_at, source, roll_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
              ended_at = excluded.ended_at,
              roll_count = excluded.roll_count,
              source = excluded.source`,
      args: [user_id, user_id, regionUpper, patch, sessionStart, sessionEnd, normalizedSource, rolls.length, now],
    });

    // 2. Insert roll events (with dedupe via ON CONFLICT)
    for (const r of rolls) {
      const rollCreatedAt = new Date(r.ts).toISOString();
      batchStatements.push({
        sql: `INSERT INTO kiyo_roll_events (anonymous_user_id, user_id, session_id, region, patch, roll_3str, roll_index, source, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (session_id, roll_index) DO NOTHING`,
        args: [user_id, user_id, session_id, regionUpper, patch, r.roll_3str, r.roll_index, normalizedSource, rollCreatedAt],
      });

      // 3. Upsert kiyo_patch_stats (community aggregate)
      const prefix = r.roll_3str.slice(0, 2);
      batchStatements.push({
        sql: `INSERT INTO kiyo_patch_stats (patch, region, prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (patch, region, exact_roll) DO UPDATE SET
                ${countColumn} = ${countColumn} + 1,
                transition_count_live = transition_count_live + CASE WHEN ? = 'live_manual' THEN 1 ELSE 0 END,
                last_live_at = CASE WHEN ? = 'live_manual' THEN ? ELSE last_live_at END,
                last_updated = ?`,
        args: [
          patch, regionUpper, prefix, r.roll_3str,
          isLive ? 1 : 0, isLive ? 0 : 1, isLive ? 1 : 0, 1, 1,
          isLive ? rollCreatedAt : null, now,
          normalizedSource, normalizedSource, rollCreatedAt, now
        ],
      });

      // 4. Upsert kiyo_user_stats (per-user aggregate)
      batchStatements.push({
        sql: `INSERT INTO kiyo_user_stats (user_id, patch, region, prefix, exact_roll, count_live, count_imported, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (user_id, patch, region, exact_roll) DO UPDATE SET
                ${countColumn} = ${countColumn} + 1,
                last_updated = ?`,
        args: [user_id, patch, regionUpper, prefix, r.roll_3str, isLive ? 1 : 0, isLive ? 0 : 1, now, now],
      });
    }

    await db.batch(batchStatements);

    return res.status(201).json({
      status: 'saved',
      session_id,
      user_id,
      patch,
      region: regionUpper,
      rolls_saved: rolls.length,
      source: normalizedSource,
      saved_at: now,
    });
  } catch (dbErr) {
    console.error('[Kiyo] DB batch error:', dbErr);
    return res.status(500).json({ error: 'Failed to save session', detail: dbErr.message });
  }
}

/*
  GET /api/hsr/kiyo/stats?patch=4.3&region=EU&user_id=...
  Returns: { user, region, global, fallback_needed, sheet_weight }
*/
async function handleStatsQuery(req, res, db) {
  const { patch, region, user_id } = req.query;

  if (!validatePatch(patch)) {
    return res.status(400).json({ error: 'Missing or invalid patch parameter', format: 'e.g. "4.3"' });
  }
  if (!validateRegion(region)) {
    return res.status(400).json({ error: 'Missing or invalid region parameter', valid: ['EU', 'NA', 'ASIA', 'CN', 'GL'] });
  }

  // Rate limit stats queries
  const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const ipHash = hashIp(ip);
  try {
    await checkRateLimit(db, ipHash, 'stats');
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded', detail: 'Max 120 stats queries per minute' });
  }

  const regionUpper = region.toUpperCase();
  const now = Date.now();

  try {
    // 1. User layer (if user_id provided)
    let userLayer = null;
    if (user_id && validateUserId(user_id)) {
      const userResult = await db.execute({
        sql: `SELECT prefix, exact_roll, count_live, count_imported, last_updated
              FROM kiyo_user_stats
              WHERE user_id = ? AND patch = ? AND region = ?`,
        args: [user_id, patch, regionUpper],
      });
      userLayer = buildLayer(userResult.rows, patch, regionUpper, 'user', now);
    }

    // 2. Region layer
    const regionResult = await db.execute({
      sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
            FROM kiyo_patch_stats
            WHERE patch = ? AND region = ?`,
      args: [patch, regionUpper],
    });
    const regionLayer = buildLayer(regionResult.rows, patch, regionUpper, 'region', now);

    // 3. Global layer
    const globalResult = await db.execute({
      sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
            FROM kiyo_patch_stats
            WHERE patch = ? AND region = 'GL'`,
      args: [patch],
    });
    const globalLayer = buildLayer(globalResult.rows, patch, 'GL', 'global', now);

    // Determine fallback
    const bestLayer = regionLayer.confidence !== 'insufficient'
      ? regionLayer
      : globalLayer.confidence !== 'insufficient'
        ? globalLayer
        : null;

    const fallback_needed = !bestLayer || bestLayer.confidence === 'insufficient';
    const sheet_weight = fallback_needed ? 1.0 : 0.0;

    return res.status(200).json({
      user: userLayer,
      region: regionLayer,
      global: globalLayer,
      fallback_needed,
      sheet_weight,
      queried_at: new Date().toISOString(),
    });
  } catch (dbErr) {
    console.error('[Kiyo] DB query error:', dbErr);
    return res.status(500).json({ error: 'Failed to query stats', detail: dbErr.message });
  }
}

function buildLayer(rows, patch, region, layerName, nowMs) {
  const prefixData = {};
  let totalEvents = 0;
  let totalDistinctSessions = 0;
  let totalDistinctUsers = 0;

  for (const r of rows) {
    const prefix = r.prefix || r.exact_roll?.slice(0, 2);
    const exact = r.exact_roll;
    const count = Number(r.count_live || 0) + Number(r.count_imported || 0);

    if (!prefixData[prefix]) {
      prefixData[prefix] = { counts: {}, total: 0, distinct_sessions: Number(r.distinct_sessions || 0) };
    }

    // Apply exponential decay: weight = 1.0 * 0.5^(days/7)
    const lastUpdated = r.last_updated || r.last_live_at;
    let weight = 1.0;
    if (lastUpdated) {
      const daysOld = (nowMs - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      weight = Math.pow(0.5, daysOld / 7);
    }

    const decayedCount = count * weight;
    prefixData[prefix].counts[exact] = (prefixData[prefix].counts[exact] || 0) + decayedCount;
    prefixData[prefix].total += decayedCount;
    totalEvents += decayedCount;

    if (layerName !== 'user') {
      totalDistinctSessions = Math.max(totalDistinctSessions, Number(r.distinct_sessions || 0));
      totalDistinctUsers = Math.max(totalDistinctUsers, Number(r.distinct_users || 0));
    }
  }

  // Round counts for cleaner JSON
  for (const prefix of Object.keys(prefixData)) {
    prefixData[prefix].total = Math.round(prefixData[prefix].total);
    for (const exact of Object.keys(prefixData[prefix].counts)) {
      prefixData[prefix].counts[exact] = Math.round(prefixData[prefix].counts[exact]);
    }
  }
  totalEvents = Math.round(totalEvents);

  // Confidence
  let confidence = 'insufficient';
  if (totalEvents >= 1000 && totalDistinctUsers >= 5) {
    confidence = 'high';
  } else if (totalEvents >= 500 && totalDistinctUsers >= 3) {
    confidence = 'moderate';
  } else if (totalEvents >= 100) {
    confidence = 'low';
  }

  // For user layer, lower thresholds
  if (layerName === 'user' && totalEvents >= 20) {
    confidence = totalEvents >= 100 ? 'moderate' : 'low';
  }

  return {
    patch,
    region,
    prefix_data: prefixData,
    total_events: totalEvents,
    distinct_sessions: totalDistinctSessions,
    distinct_users: totalDistinctUsers,
    confidence,
    layer: layerName,
  };
}

async function checkRateLimit(db, ipHash, type = 'session') {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
  const maxCalls = type === 'stats' ? STATS_RATE_LIMIT_MAX : RATE_LIMIT_MAX_CALLS;

  const existing = await db.execute({
    sql: `SELECT call_count FROM kiyo_rate_limits WHERE ip_hash = ? AND window_start = ?`,
    args: [ipHash, windowStart],
  });

  if (existing.rows.length > 0 && Number(existing.rows[0].call_count) >= maxCalls) {
    throw new Error('Rate limit exceeded');
  }

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE kiyo_rate_limits SET call_count = call_count + 1 WHERE ip_hash = ? AND window_start = ?`,
      args: [ipHash, windowStart],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO kiyo_rate_limits (ip_hash, window_start, call_count) VALUES (?, ?, 1)
            ON CONFLICT (ip_hash, window_start) DO UPDATE SET call_count = call_count + 1`,
      args: [ipHash, windowStart],
    });
  }
}