import { setCorsHeaders } from '../zone/shared.js';
import {
  getTursoClient,
  isTursoConfigured,
  validateRoll3str,
  validatePatch,
  validateRegion,
  validateSource,
  hashIp,
} from './kiyoClient.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_CALLS = 60;
const MAX_ROLLS_PER_SESSION = 200;

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
    if (pathPart === 'roll' && req.method === 'POST') {
      return await handleRollSubmit(req, res, db);
    }

    if (pathPart === 'stats' && req.method === 'GET') {
      return await handleStatsQuery(req, res, db);
    }

    if (pathPart === 'health' && req.method === 'GET') {
      return res.status(200).json({ status: 'ok', db: 'connected' });
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

async function handleRollSubmit(req, res, db) {
  const body = typeof req.body === 'object' ? req.body : {};

  const { session_id, region, patch, roll_3str, roll_index, source } = body;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid session_id' });
  }
  if (!validateRegion(region)) {
    return res.status(400).json({ error: 'Missing or invalid region', valid: ['EU', 'NA', 'ASIA', 'CN', 'GL'] });
  }
  if (!validatePatch(patch)) {
    return res.status(400).json({ error: 'Missing or invalid patch', format: 'e.g. "4.3"' });
  }
  if (!validateRoll3str(roll_3str)) {
    return res.status(400).json({ error: 'Missing or invalid roll_3str', format: '3 digits, each 1-4, e.g. "432"' });
  }

  const rollIndex = Number(roll_index);
  if (!Number.isInteger(rollIndex) || rollIndex < 0 || rollIndex > 999) {
    return res.status(400).json({ error: 'Missing or invalid roll_index', format: 'integer 0-999' });
  }

  const normalizedSource = source || 'live_manual';
  if (!validateSource(normalizedSource)) {
    return res.status(400).json({ error: 'Invalid source', valid: ['live_manual'] });
  }

  const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const ipHash = hashIp(ip);
  const prefix = roll_3str.slice(0, 2);
  const now = new Date().toISOString();

  try {
    await checkRateLimit(db, ipHash);
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded', detail: 'Max 60 roll submissions per minute' });
  }

  try {
    await db.execute({
      sql: `INSERT INTO kiyo_patch_stats (patch, region, prefix, exact_roll, count_live, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated)
            VALUES (?, ?, ?, ?, 1, 1, 1, 1, ?, ?)
            ON CONFLICT (patch, region, exact_roll) DO UPDATE SET
              count_live = count_live + 1,
              transition_count_live = transition_count_live + 1,
              distinct_sessions = CASE WHEN last_live_at < ? THEN distinct_sessions + 1 ELSE distinct_sessions END,
              last_live_at = ?,
              last_updated = ?`,
      args: [patch, region.toUpperCase(), prefix, roll_3str, now, now, now, now, now],
    });

    return res.status(201).json({
      status: 'recorded',
      patch,
      region: region.toUpperCase(),
      prefix,
      exact_roll: roll_3str,
      source: normalizedSource,
      recorded_at: now,
    });
  } catch (dbErr) {
    console.error('[Kiyo] DB upsert error:', dbErr);
    return res.status(500).json({ error: 'Failed to record roll', detail: dbErr.message });
  }
}

async function handleStatsQuery(req, res, db) {
  const { patch, region } = req.query;

  if (!validatePatch(patch)) {
    return res.status(400).json({ error: 'Missing or invalid patch parameter', format: 'e.g. "4.3"' });
  }

  let query;
  let args;

  if (region && validateRegion(region)) {
    query = `SELECT patch, region, prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
             FROM kiyo_patch_stats
             WHERE patch = ? AND region = ?
             ORDER BY prefix, exact_roll`;
    args = [patch, region.toUpperCase()];
  } else {
    query = `SELECT patch, region, prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
             FROM kiyo_patch_stats
             WHERE patch = ?
             ORDER BY region, prefix, exact_roll`;
    args = [patch];
  }

  try {
    const result = await db.execute({ sql: query, args });

    const totalLive = result.rows.reduce((sum, r) => sum + Number(r.count_live), 0);
    const totalDistinctSessions = result.rows.reduce((sum, r) => sum + Number(r.distinct_sessions), 0);
    const totalDistinctUsers = result.rows.reduce((sum, r) => sum + Number(r.distinct_users), 0);

    return res.status(200).json({
      patch,
      region: region ? region.toUpperCase() : 'ALL',
      total_events: totalLive,
      total_distinct_sessions: totalDistinctSessions,
      total_distinct_users: totalDistinctUsers,
      row_count: result.rows.length,
      stats: result.rows,
    });
  } catch (dbErr) {
    console.error('[Kiyo] DB query error:', dbErr);
    return res.status(500).json({ error: 'Failed to query stats', detail: dbErr.message });
  }
}

async function checkRateLimit(db, ipHash) {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();

  const existing = await db.execute({
    sql: `SELECT call_count FROM kiyo_rate_limits WHERE ip_hash = ? AND window_start = ?`,
    args: [ipHash, windowStart],
  });

  if (existing.rows.length > 0 && Number(existing.rows[0].call_count) >= RATE_LIMIT_MAX_CALLS) {
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