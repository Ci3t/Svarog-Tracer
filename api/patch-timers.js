/**
 * Game Patch Timer API
 * Returns current patch info for all games with auto-advance logic.
 */

import { createClient } from '@libsql/client';

const DB_URL = process.env.TURSO_DB_URL;
const DB_AUTH = process.env.TURSO_AUTH_TOKEN;
const FORCE_PATCH_FALLBACK = process.env.PATCH_TIMERS_FORCE_FALLBACK === 'true';

const FALLBACK_PATCHES = Object.freeze({
  hsr: { current_patch: '4.2', patch_start_date: '2026-04-22', patch_duration_days: 40, auto_advance: false },
  genshin: { current_patch: '6.5', patch_start_date: '2026-04-16', patch_duration_days: 42, auto_advance: false },
  wuwa: { current_patch: '3.3', patch_start_date: '2026-04-25', patch_duration_days: 42, auto_advance: false },
  zzz: { current_patch: '2.4', patch_start_date: '2026-04-23', patch_duration_days: 42, auto_advance: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function getDb() {
  if (!DB_URL || !DB_AUTH) return null;
  return createClient({ url: DB_URL, authToken: DB_AUTH });
}

function parsePatchVersion(version) {
  const parts = String(version).split('.');
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  return { major, minor, raw: version };
}

function incrementPatch(version) {
  const { major, minor } = parsePatchVersion(version);
  // Increment minor; if minor reaches a threshold (e.g., 10), bump major
  // Genshin/WuWa typically go up to .7 or .8 before major bump
  const newMinor = minor + 1;
  return `${major}.${newMinor}`;
}

function getPatchDurationDays(row) {
  const game = String(row?.game || '').toLowerCase();
  const patch = String(row?.current_patch || '').trim();
  if (game === 'hsr' && patch === '4.2') {
    return 40;
  }
  return row.patch_duration_days || 42;
}

function calculatePatchInfo(row) {
  const startDate = new Date(row.patch_start_date + 'T00:00:00Z');
  const durationDays = getPatchDurationDays(row);
  const endDate = new Date(startDate.getTime() + durationDays * DAY_MS);
  const now = new Date();

  const totalMs = endDate.getTime() - startDate.getTime();
  const remainingMs = endDate.getTime() - now.getTime();
  const elapsedMs = Math.max(0, now.getTime() - startDate.getTime());

  const safeRemainingMs = Math.max(0, remainingMs);
  const daysLeft = Math.floor(safeRemainingMs / DAY_MS);
  const hoursLeft = Math.floor((safeRemainingMs % DAY_MS) / HOUR_MS);
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  // Determine phase (split patch into 2 phases of equal duration)
  const halfDuration = durationDays / 2;
  const daysElapsed = Math.floor(elapsedMs / DAY_MS);
  const phase = daysElapsed < halfDuration ? 1 : 2;
  const phaseOneEndDate = new Date(startDate.getTime() + halfDuration * DAY_MS);
  const phaseDaysLeft = phase === 1
    ? Math.max(0, Math.floor((phaseOneEndDate.getTime() - now.getTime()) / DAY_MS))
    : Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / DAY_MS));

  return {
    patch: row.current_patch,
    startDate: row.patch_start_date,
    endDate: endDate.toISOString().split('T')[0],
    daysLeft,
    hoursLeft,
    totalDays: durationDays,
    progressPercent: Math.round(progressPercent),
    phase,
    phaseDaysLeft,
    autoAdvance: Boolean(row.auto_advance),
  };
}

function buildFallbackResponse(game) {
  if (game) {
    const row = FALLBACK_PATCHES[game] || FALLBACK_PATCHES.hsr;
    return calculatePatchInfo(row);
  }

  return Object.fromEntries(
    Object.entries(FALLBACK_PATCHES).map(([key, row]) => [key, calculatePatchInfo(row)])
  );
}

async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Discord-Id');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (FORCE_PATCH_FALLBACK) {
    const { game } = req.query || {};
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(buildFallbackResponse(game));
  }

  const db = getDb();
  if (!db) {
    const { game } = req.query || {};
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(buildFallbackResponse(game));
  }

  // POST: Update patch data (admin only)
  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-store');
    const { game, patch, startDate, durationDays } = req.body || {};
    if (!game || !patch || !startDate) {
      return res.status(400).json({ error: 'Missing required fields: game, patch, startDate' });
    }

    try {
      await db.execute({
        sql: `INSERT INTO game_patch_timers (game, current_patch, patch_start_date, patch_duration_days, updated_at)
              VALUES (?, ?, ?, ?, datetime('now'))
              ON CONFLICT (game) DO UPDATE SET
                current_patch = excluded.current_patch,
                patch_start_date = excluded.patch_start_date,
                patch_duration_days = excluded.patch_duration_days,
                updated_at = excluded.updated_at`,
        args: [game, patch, startDate, durationDays || 42]
      });

      return res.status(200).json({ success: true, game, patch, startDate });
    } catch (err) {
      console.error('[PatchTimerAPI] Update error:', err.message);
      return res.status(500).json({ error: 'Database error', detail: err.message });
    }
  }

  // GET: Fetch patch data with auto-advance
  const { game } = req.query || {};
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');

  try {
    let rows;
    if (game) {
      const result = await db.execute({
        sql: `SELECT * FROM game_patch_timers WHERE game = ?`,
        args: [game]
      });
      rows = result.rows;
    } else {
      const result = await db.execute(`SELECT * FROM game_patch_timers ORDER BY game`);
      rows = result.rows;
    }

    const now = new Date();
    const response = {};

    for (const row of rows) {
      let patchVersion = row.current_patch;
      let startDate = row.patch_start_date;
      const durationDays = row.patch_duration_days || 42;
      let wasAdvanced = false;

      // Auto-advance logic: if patch has expired and auto_advance is enabled
      if (row.auto_advance) {
        const endDate = new Date(startDate + 'T00:00:00Z');
        endDate.setDate(endDate.getDate() + durationDays);

        // Keep advancing while we're past the end date
        while (now > endDate) {
          patchVersion = incrementPatch(patchVersion);
          startDate = endDate.toISOString().split('T')[0];
          endDate.setDate(endDate.getDate() + durationDays);
          wasAdvanced = true;
        }

        // Save back to DB if advanced
        if (wasAdvanced) {
          await db.execute({
            sql: `UPDATE game_patch_timers
                  SET current_patch = ?, patch_start_date = ?, updated_at = datetime('now')
                  WHERE game = ?`,
            args: [patchVersion, startDate, row.game]
          });
        }
      }

      // Recalculate with potentially updated values
      const info = calculatePatchInfo({
        ...row,
        current_patch: patchVersion,
        patch_start_date: startDate,
      });

      response[row.game] = {
        ...info,
        wasAdvanced,
      };
    }

    return res.status(200).json(game ? response[game] : response);
  } catch (err) {
    console.error('[PatchTimerAPI] Fetch error:', err.message);
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(buildFallbackResponse(game));
    }
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}

export { handler };
export default handler;
