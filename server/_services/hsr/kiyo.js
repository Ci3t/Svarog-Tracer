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
const MIN_ROLLS_PER_SAVED_SESSION = 6;
const MAX_ROLLS_PER_SESSION = 200;
const STATS_RATE_LIMIT_MAX = 120; // per minute per IP
const KIYO_PATCH_FALLBACK = Object.freeze({
  current_patch: '4.2',
  patch_start_date: '2026-04-21T20:00:00.000Z',
  phase_1_days: 21,
  phase_2_days: 21,
  timer_mode: 'fallback',
  auto_advance: false,
  manual_override_at: null,
  manual_override_by: null,
});
const FORCE_PATCH_FALLBACK = process.env.KIYO_PATCH_FORCE_FALLBACK === 'true';

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pathPart = resolveKiyoPath(req);

  // This route is polled by the UI. On Windows, local vercel dev can crash inside
  // libuv/libsql handle cleanup, so keep this display route DB-free there.
  if (FORCE_PATCH_FALLBACK && pathPart === 'patch' && req.method === 'GET') {
    return handleGetPatchFallback(req, res);
  }

  if (!isTursoConfigured()) {
    return res.status(503).json({ error: 'Kiyo DB not configured', detail: 'TURSO_DB_URL or TURSO_AUTH_TOKEN missing' });
  }

  const db = getTursoClient();
  if (!db) {
    return res.status(503).json({ error: 'Kiyo DB unavailable' });
  }

  try {
    if (pathPart === 'session' && req.method === 'POST') {
      return await handleSessionSave(req, res, db);
    }

    if (pathPart === 'stats' && req.method === 'GET') {
      return await handleStatsQuery(req, res, db);
    }

    if (pathPart === 'patch' && req.method === 'GET') {
      return await handleGetPatch(req, res, db);
    }

    if (pathPart === 'admin' && req.method === 'POST') {
      return await handleAdminAction(req, res, db);
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
  const slug = Array.isArray(req.query?.slug) ? req.query.slug[0] : req.query?.slug;
  if (slug) {
    const slugParts = String(slug).split('/').filter(Boolean);
    const kiyoIdx = slugParts.indexOf('kiyo');
    return kiyoIdx === -1 ? (slugParts[0] || '') : (slugParts[kiyoIdx + 1] || '');
  }

  const raw = req.url || '';
  // Strip query string before splitting
  const pathOnly = raw.split('?')[0];
  const segments = pathOnly.split('/').filter(Boolean);
  const kiyoIdx = segments.indexOf('kiyo');
  if (kiyoIdx === -1) return '';
  return segments[kiyoIdx + 1] || '';
}

function buildKiyoPatchPayload(base = KIYO_PATCH_FALLBACK) {
  const startDate = new Date(base.patch_start_date);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const phase1Days = Number(base.phase_1_days || 21);
  const phase2Days = Number(base.phase_2_days || 21);
  const totalPatchDays = phase1Days + phase2Days;
  const phase1EndMs = startDate.getTime() + phase1Days * msPerDay;
  const patchEndMs = startDate.getTime() + totalPatchDays * msPerDay;
  const nowMs = now.getTime();
  const daysElapsed = Math.max(0, Math.floor((nowMs - startDate.getTime()) / msPerDay));

  let currentPhase = 1;
  let phaseMsRemaining = phase1EndMs - nowMs;
  if (nowMs >= phase1EndMs) {
    currentPhase = 2;
    phaseMsRemaining = Math.max(0, patchEndMs - nowMs);
  }

  const totalMsRemaining = Math.max(0, patchEndMs - nowMs);

  return {
    current_patch: base.current_patch,
    patch_start_date: base.patch_start_date,
    phase_1_days: phase1Days,
    phase_2_days: phase2Days,
    current_phase: currentPhase,
    phase_days_remaining: Math.max(0, Math.floor(phaseMsRemaining / msPerDay)),
    phase_hours_remaining: Math.max(0, Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60))),
    total_days_remaining: Math.max(0, Math.floor(totalMsRemaining / msPerDay)),
    days_elapsed: daysElapsed,
    timer_mode: base.timer_mode,
    auto_advance: Boolean(base.auto_advance),
    manual_override_at: base.manual_override_at,
    manual_override_by: base.manual_override_by,
  };
}

function handleGetPatchFallback(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json(buildKiyoPatchPayload());
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
  // Vercel may not auto-parse JSON body; handle both cases
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { session_id, user_id, region, patch, source, rolls } = body;

  console.log('[Kiyo] Session save body:', JSON.stringify({ session_id, user_id, region, patch, source, rollsCount: rolls?.length }));

  // Validation
  if (!validateSessionId(session_id)) {
    return res.status(400).json({ error: 'Missing or invalid session_id', format: 'UUID v4', received: session_id });
  }
  if (!validateUserId(user_id)) {
    return res.status(400).json({ error: 'Missing or invalid user_id', received: user_id });
  }
  if (!validateRegion(region)) {
    return res.status(400).json({ error: 'Missing or invalid region', valid: ['EU', 'NA', 'ASIA', 'CN', 'GL'], received: region });
  }
  if (!validatePatch(patch)) {
    return res.status(400).json({ error: 'Missing or invalid patch', format: 'e.g. "4.3"', received: patch });
  }

  const normalizedSource = source || 'live_manual';
  if (!validateSource(normalizedSource)) {
    return res.status(400).json({ error: 'Invalid source', valid: Array.from(['live_manual', 'import_paste', 'sheet_seed', 'caesar_helper', 'debug_replay']), received: normalizedSource });
  }

  if (!Array.isArray(rolls) || rolls.length === 0) {
    return res.status(400).json({ error: 'Missing or empty rolls array', received: rolls });
  }
  if (rolls.length < MIN_ROLLS_PER_SAVED_SESSION) {
    return res.status(202).json({
      status: 'skipped',
      reason: 'minimum_rolls_not_met',
      min_rolls: MIN_ROLLS_PER_SAVED_SESSION,
      received: rolls.length,
    });
  }
  if (rolls.length > MAX_ROLLS_PER_SESSION) {
    return res.status(400).json({ error: 'Too many rolls', max: MAX_ROLLS_PER_SESSION, received: rolls.length });
  }

  // Sanitize rolls: ensure each has a valid roll_index and ts
  const sanitizedRolls = rolls.map((r, i) => ({
    roll_3str: r?.roll_3str,
    roll_index: Number.isInteger(r?.roll_index) ? r.roll_index : i,
    ts: Number.isInteger(r?.ts) && r.ts > 0 ? r.ts : Date.now(),
  }));

  // Validate each roll
  for (let i = 0; i < sanitizedRolls.length; i++) {
    const r = sanitizedRolls[i];
    if (!validateRoll3str(r.roll_3str)) {
      return res.status(400).json({ error: `Invalid roll_3str at index ${i}`, format: '3 digits 1-4', received: r.roll_3str });
    }
    if (r.roll_index < 0 || r.roll_index > 999) {
      return res.status(400).json({ error: `Invalid roll_index at index ${i}`, format: 'integer 0-999', received: r.roll_index });
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
    for (const r of sanitizedRolls) {
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

  // Compute previous patch (e.g. 4.3 -> 4.2)
  const patchParts = patch.split('.');
  const prevPatch = `${patchParts[0]}.${Math.max(0, Number(patchParts[1]) - 1)}`;

  try {
    // 1. User layer (if user_id provided) — current + previous patch merged
    let userLayer = null;
    if (user_id && validateUserId(user_id)) {
      const [userCurrent, userPrev] = await Promise.all([
        db.execute({
          sql: `SELECT prefix, exact_roll, count_live, count_imported, last_updated
                FROM kiyo_user_stats
                WHERE user_id = ? AND patch = ? AND region = ?`,
          args: [user_id, patch, regionUpper],
        }),
        db.execute({
          sql: `SELECT prefix, exact_roll, count_live, count_imported, last_updated
                FROM kiyo_user_stats
                WHERE user_id = ? AND patch = ? AND region = ?`,
          args: [user_id, prevPatch, regionUpper],
        }),
      ]);
      userLayer = mergeLayers(
        buildLayer(userCurrent.rows, patch, regionUpper, 'user', now, 1.0),
        buildLayer(userPrev.rows, prevPatch, regionUpper, 'user', now, 0.5)
      );
    }

    // 2. Region layer — current + previous patch merged
    const [regionCurrent, regionPrev] = await Promise.all([
      db.execute({
        sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
              FROM kiyo_patch_stats
              WHERE patch = ? AND region = ?`,
        args: [patch, regionUpper],
      }),
      db.execute({
        sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
              FROM kiyo_patch_stats
              WHERE patch = ? AND region = ?`,
        args: [prevPatch, regionUpper],
      }),
    ]);
    const regionLayer = mergeLayers(
      buildLayer(regionCurrent.rows, patch, regionUpper, 'region', now, 1.0),
      buildLayer(regionPrev.rows, prevPatch, regionUpper, 'region', now, 0.5)
    );

    // 3. Global layer — current + previous patch merged
    const [globalCurrent, globalPrev] = await Promise.all([
      db.execute({
        sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
              FROM kiyo_patch_stats
              WHERE patch = ? AND region = 'GL'`,
        args: [patch],
      }),
      db.execute({
        sql: `SELECT prefix, exact_roll, count_live, count_imported, transition_count_live, distinct_sessions, distinct_users, last_live_at, last_updated
              FROM kiyo_patch_stats
              WHERE patch = ? AND region = 'GL'`,
        args: [prevPatch],
      }),
    ]);
    const globalLayer = mergeLayers(
      buildLayer(globalCurrent.rows, patch, 'GL', 'global', now, 1.0),
      buildLayer(globalPrev.rows, prevPatch, 'GL', 'global', now, 0.5)
    );

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

function buildLayer(rows, patch, region, layerName, nowMs, patchWeight = 1.0) {
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

    // Per-patch weight: current patch = 1.0, previous patch = 0.5
    const weightedCount = count * patchWeight;
    prefixData[prefix].counts[exact] = (prefixData[prefix].counts[exact] || 0) + weightedCount;
    prefixData[prefix].total += weightedCount;
    totalEvents += weightedCount;

    if (layerName !== 'user') {
      totalDistinctSessions = Math.max(totalDistinctSessions, Number(r.distinct_sessions || 0));
      totalDistinctUsers = Math.max(totalDistinctUsers, Number(r.distinct_users || 0));
    }
  }

  return {
    patch,
    region,
    prefix_data: prefixData,
    total_events: totalEvents,
    distinct_sessions: totalDistinctSessions,
    distinct_users: totalDistinctUsers,
    confidence: 'insufficient', // computed after merge
    layer: layerName,
    patch_weight: patchWeight,
  };
}

function mergeLayers(current, previous) {
  if (!current) return previous || null;
  if (!previous) return current;

  const mergedPrefixData = { ...current.prefix_data };

  for (const prefix of Object.keys(previous.prefix_data)) {
    if (!mergedPrefixData[prefix]) {
      mergedPrefixData[prefix] = { counts: {}, total: 0, distinct_sessions: 0 };
    }

    for (const exact of Object.keys(previous.prefix_data[prefix].counts)) {
      mergedPrefixData[prefix].counts[exact] = (mergedPrefixData[prefix].counts[exact] || 0) + previous.prefix_data[prefix].counts[exact];
    }
    mergedPrefixData[prefix].total += previous.prefix_data[prefix].total;
    mergedPrefixData[prefix].distinct_sessions = Math.max(
      mergedPrefixData[prefix].distinct_sessions,
      previous.prefix_data[prefix].distinct_sessions
    );
  }

  // Round counts for cleaner JSON
  let totalEvents = 0;
  for (const prefix of Object.keys(mergedPrefixData)) {
    mergedPrefixData[prefix].total = Math.round(mergedPrefixData[prefix].total);
    for (const exact of Object.keys(mergedPrefixData[prefix].counts)) {
      mergedPrefixData[prefix].counts[exact] = Math.round(mergedPrefixData[prefix].counts[exact]);
    }
    totalEvents += mergedPrefixData[prefix].total;
  }

  const totalDistinctSessions = Math.max(current.distinct_sessions, previous.distinct_sessions);
  const totalDistinctUsers = Math.max(current.distinct_users, previous.distinct_users);

  // Confidence based on merged totals
  let confidence = 'insufficient';
  if (totalEvents >= 1000 && totalDistinctUsers >= 5) {
    confidence = 'high';
  } else if (totalEvents >= 500 && totalDistinctUsers >= 3) {
    confidence = 'moderate';
  } else if (totalEvents >= 100) {
    confidence = 'low';
  }

  // For user layer, lower thresholds
  const layerName = current.layer;
  if (layerName === 'user' && totalEvents >= 20) {
    confidence = totalEvents >= 100 ? 'moderate' : 'low';
  }

  return {
    patch: current.patch,
    region: current.region,
    prefix_data: mergedPrefixData,
    total_events: totalEvents,
    distinct_sessions: totalDistinctSessions,
    distinct_users: totalDistinctUsers,
    confidence,
    layer: layerName,
  };
}

/*
  GET /api/hsr/kiyo/patch
  Returns current patch config from Turso
*/
async function handleGetPatch(req, res, db) {
  try {
    let result;
    let hasPhaseColumns = true;

    try {
      result = await db.execute({
        sql: `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                     manual_override_at, manual_override_by, phase_1_days, phase_2_days
              FROM kiyo_patch_config WHERE id = 1`,
      });
    } catch (colErr) {
      if (colErr.message && colErr.message.includes('no such column')) {
        hasPhaseColumns = false;
        result = await db.execute({
          sql: `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                       manual_override_at, manual_override_by
                FROM kiyo_patch_config WHERE id = 1`,
        });
      } else {
        throw colErr;
      }
    }

    // Auto-create default config if missing
    if (result.rows.length === 0) {
      // 4.2: ~11d 20h left in Phase 1 + 20 days Phase 2 = ~32 days total
      const PHASE_1_DAYS = 21;
      const PHASE_2_DAYS = 21;
      const ADVANCE_DAYS_42 = 32; // remaining from now
      const fallbackStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const insertSql = hasPhaseColumns
        ? `INSERT INTO kiyo_patch_config
             (id, current_patch, patch_start_date, advance_days, timer_mode, auto_advance, phase_1_days, phase_2_days)
           VALUES (1, ?, ?, ?, 'fresh', 1, ?, ?)`
        : `INSERT INTO kiyo_patch_config
             (id, current_patch, patch_start_date, advance_days, timer_mode, auto_advance)
           VALUES (1, ?, ?, ?, 'fresh', 1)`;
      const insertArgs = hasPhaseColumns
        ? ['4.2', fallbackStart.toISOString(), ADVANCE_DAYS_42, PHASE_1_DAYS, PHASE_2_DAYS]
        : ['4.2', fallbackStart.toISOString(), ADVANCE_DAYS_42];
      await db.execute({ sql: insertSql, args: insertArgs });

      result = await db.execute({
        sql: hasPhaseColumns
          ? `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by, phase_1_days, phase_2_days
             FROM kiyo_patch_config WHERE id = 1`
          : `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by
             FROM kiyo_patch_config WHERE id = 1`,
      });
    }

    let row = result.rows[0];
    let startDate = new Date(row.patch_start_date);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    let daysElapsed = Math.floor((now - startDate) / msPerDay);

    // Auto-correct stale patch 4.2 start dates (patch 4.2 started ~April 21, 2026)
    if (row.current_patch === '4.2' && daysElapsed > 21) {
      const correctedStart = new Date('2026-04-21T20:00:00.000Z');
      await db.execute({
        sql: `UPDATE kiyo_patch_config SET patch_start_date = ? WHERE id = 1`,
        args: [correctedStart.toISOString()],
      });
      startDate = correctedStart;
      daysElapsed = Math.floor((now - startDate) / msPerDay);
      // Re-read row so any cached values are fresh
      const refreshed = await db.execute({
        sql: hasPhaseColumns
          ? `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by, phase_1_days, phase_2_days
             FROM kiyo_patch_config WHERE id = 1`
          : `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by
             FROM kiyo_patch_config WHERE id = 1`,
      });
      row = refreshed.rows[0];
    }

    const phase1Days = hasPhaseColumns ? Number(row.phase_1_days || 21) : 21;
    const phase2Days = hasPhaseColumns ? Number(row.phase_2_days || 21) : 21;
    const totalPatchDays = phase1Days + phase2Days;

    // Calculate phase boundaries
    const phase1EndMs = startDate.getTime() + phase1Days * msPerDay;
    const patchEndMs = startDate.getTime() + totalPatchDays * msPerDay;

    let currentPhase = 1;
    let phaseDaysRemaining = 0;
    let totalDaysRemaining = 0;
    let phaseHoursRemaining = 0;

    if (now.getTime() < phase1EndMs) {
      currentPhase = 1;
      const phaseMsRemaining = phase1EndMs - now.getTime();
      phaseDaysRemaining = Math.floor(phaseMsRemaining / msPerDay);
      phaseHoursRemaining = Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60));
    } else if (now.getTime() < patchEndMs) {
      currentPhase = 2;
      const phaseMsRemaining = patchEndMs - now.getTime();
      phaseDaysRemaining = Math.floor(phaseMsRemaining / msPerDay);
      phaseHoursRemaining = Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60));
    } else {
      currentPhase = 2;
      phaseDaysRemaining = 0;
      phaseHoursRemaining = 0;
    }

    const totalMsRemaining = Math.max(0, patchEndMs - now.getTime());
    totalDaysRemaining = Math.floor(totalMsRemaining / msPerDay);

    // ── AUTO-ADVANCE ──
    // When the patch fully expires and auto_advance is ON, roll forward
    // to the next patch and reset to Phase 1.
    if (totalDaysRemaining <= 0 && row.auto_advance) {
      const patchParts = row.current_patch.split('.');
      const major = Number(patchParts[0]);
      const minor = Number(patchParts[1]);
      const nextPatch = `${major}.${minor + 1}`;
      const freshStart = now.toISOString();

      if (hasPhaseColumns) {
        await db.execute({
          sql: `UPDATE kiyo_patch_config
                SET current_patch = ?, patch_start_date = ?, timer_mode = 'fresh',
                    manual_override_at = ?, advance_days = ?
                WHERE id = 1`,
          args: [nextPatch, freshStart, freshStart, phase1Days + phase2Days],
        });
      } else {
        await db.execute({
          sql: `UPDATE kiyo_patch_config
                SET current_patch = ?, patch_start_date = ?, timer_mode = 'fresh',
                    manual_override_at = ?, advance_days = ?
                WHERE id = 1`,
          args: [nextPatch, freshStart, freshStart, phase1Days + phase2Days],
        });
      }

      // Recompute with fresh data
      startDate = now;
      daysElapsed = 0;
      currentPhase = 1;
      phaseDaysRemaining = phase1Days;
      phaseHoursRemaining = 0;
      totalDaysRemaining = phase1Days + phase2Days;
      row.current_patch = nextPatch;
      row.patch_start_date = freshStart;
      row.timer_mode = 'fresh';
    }

    return res.status(200).json({
      current_patch: row.current_patch,
      patch_start_date: row.patch_start_date,
      phase_1_days: phase1Days,
      phase_2_days: phase2Days,
      current_phase: currentPhase,
      phase_days_remaining: phaseDaysRemaining,
      phase_hours_remaining: phaseHoursRemaining,
      total_days_remaining: totalDaysRemaining,
      days_elapsed: daysElapsed,
      timer_mode: row.timer_mode,
      auto_advance: Boolean(row.auto_advance),
      manual_override_at: row.manual_override_at,
      manual_override_by: row.manual_override_by,
    });
  } catch (dbErr) {
    console.error('[Kiyo] Patch config error:', dbErr);
    return res.status(500).json({ error: 'Failed to fetch patch config', detail: dbErr.message });
  }
}

/*
  POST /api/hsr/kiyo/admin
  Body: { action: 'set_patch', patch: '4.3', password: '...' }
        { action: 'override_timer', patch: '4.3', password: '...' }
  Requires admin password from env
*/
async function handleAdminAction(req, res, db) {
  const body = typeof req.body === 'object' ? req.body : {};
  const { action, patch, password, phase_1_days, phase_2_days } = body;

  const adminPassword = process.env.KIYO_ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Invalid or missing admin password' });
  }

  if (!action) {
    return res.status(400).json({ error: 'Missing action' });
  }

  const now = new Date().toISOString();

  try {
    if (action === 'set_patch') {
      if (!validatePatch(patch)) {
        return res.status(400).json({ error: 'Invalid patch', format: 'e.g. "4.3"' });
      }
      const p1 = Number.isInteger(phase_1_days) && phase_1_days > 0 ? phase_1_days : 21;
      const p2 = Number.isInteger(phase_2_days) && phase_2_days > 0 ? phase_2_days : 21;
      const totalDays = p1 + p2;

      // Detect if phase columns exist
      let hasPhases = true;
      try {
        await db.execute({ sql: `SELECT phase_1_days FROM kiyo_patch_config WHERE id = 0`, args: [] });
      } catch (e) {
        if (e.message && e.message.includes('no such column')) hasPhases = false;
      }

      if (hasPhases) {
        await db.execute({
          sql: `INSERT INTO kiyo_patch_config
                  (id, current_patch, patch_start_date, manual_override_at, timer_mode, phase_1_days, phase_2_days, advance_days)
                VALUES (1, ?, ?, ?, 'fresh', ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  current_patch = excluded.current_patch,
                  patch_start_date = excluded.patch_start_date,
                  manual_override_at = excluded.manual_override_at,
                  timer_mode = excluded.timer_mode,
                  phase_1_days = excluded.phase_1_days,
                  phase_2_days = excluded.phase_2_days,
                  advance_days = excluded.advance_days`,
          args: [patch, now, now, p1, p2, totalDays],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO kiyo_patch_config
                  (id, current_patch, patch_start_date, manual_override_at, timer_mode, advance_days)
                VALUES (1, ?, ?, ?, 'fresh', ?)
                ON CONFLICT(id) DO UPDATE SET
                  current_patch = excluded.current_patch,
                  patch_start_date = excluded.patch_start_date,
                  manual_override_at = excluded.manual_override_at,
                  timer_mode = excluded.timer_mode,
                  advance_days = excluded.advance_days`,
          args: [patch, now, now, totalDays],
        });
      }
      return res.status(200).json({ status: 'patch_updated', patch, phase_1_days: p1, phase_2_days: p2, updated_at: now });
    }

    if (action === 'override_timer') {
      if (!validatePatch(patch)) {
        return res.status(400).json({ error: 'Invalid patch', format: 'e.g. "4.3"' });
      }
      await db.execute({
        sql: `INSERT INTO kiyo_patch_config (id, current_patch, manual_override_at, timer_mode)
              VALUES (1, ?, ?, 'rolling')
              ON CONFLICT(id) DO UPDATE SET
                current_patch = excluded.current_patch,
                manual_override_at = excluded.manual_override_at,
                timer_mode = excluded.timer_mode`,
        args: [patch, now],
      });
      return res.status(200).json({ status: 'timer_overridden', patch, overridden_at: now });
    }

    if (action === 'toggle_auto_advance') {
      await db.execute({
        sql: `INSERT INTO kiyo_patch_config (id, auto_advance) VALUES (1, 1)
              ON CONFLICT(id) DO UPDATE SET
                auto_advance = CASE WHEN auto_advance = 1 THEN 0 ELSE 1 END`,
      });
      const current = await db.execute({
        sql: `SELECT auto_advance FROM kiyo_patch_config WHERE id = 1`,
      });
      const newValue = current.rows[0]?.auto_advance === 1;
      return res.status(200).json({ status: 'auto_advance_toggled', auto_advance: newValue });
    }

    return res.status(400).json({ error: 'Unknown action', valid: ['set_patch', 'override_timer', 'toggle_auto_advance'] });
  } catch (dbErr) {
    console.error('[Kiyo] Admin action error:', dbErr);
    return res.status(500).json({ error: 'Admin action failed', detail: dbErr.message });
  }
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
