import {
  HttpError,
  ZONE_RUNS_TABLE,
  buildTablePath,
  buildZoneMapFromRuns,
  ensureCurrentEpoch,
  fetchPreviousEpoch,
  handleApiError,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

function hasMissingColumn(error, columnName) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  return String(raw).toLowerCase().includes(String(columnName || '').toLowerCase());
}

function buildSelectFields({ includeClearTime = true } = {}) {
  const fields = [
    'id',
    'submitted_at',
    'epoch_id',
    'slot_order',
    'char_names',
    'cavern',
    'outcome',
    'char_sum',
    'char_xor',
    'char_slot',
    'xor_slot_key',
    'notes',
    'server_region',
    'relic_data',
  ];

  if (includeClearTime) fields.push('clear_time_seconds');

  return fields.join(',');
}

function normalizeEpochQuery(epochValue) {
  return String(epochValue || 'current').toLowerCase() === 'previous' ? 'previous' : 'current';
}

function normalizeIntegerQuery(value, { field, min, max, fallback = null }) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) {
    throw new HttpError(400, `${field} must be an integer.`);
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(400, `${field} must be an integer.`);
  }

  if (parsed < min || parsed > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

async function fetchNearbyRunRows({ epochId, minXor, maxXor }) {
  let clearTimeColumnMissing = false;
  let runRows = [];
  let lastError = null;

  for (const attempt of [{ includeClearTime: true }, { includeClearTime: false }]) {
    try {
      runRows = await supabaseAdminRequest(
        buildTablePath(ZONE_RUNS_TABLE, {
          select: buildSelectFields(attempt),
          filters: {
            epoch_id: `eq.${epochId}`,
            and: `(char_xor.gte.${minXor},char_xor.lte.${maxXor})`,
            limit: '10000',
            order: 'submitted_at.desc',
          },
        })
      );
      if (!attempt.includeClearTime) clearTimeColumnMissing = true;
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const missingClearTime = hasMissingColumn(error, 'clear_time_seconds');
      if (!missingClearTime) {
        break;
      }
      clearTimeColumnMissing = true;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return {
    clearTimeColumnMissing,
    safeRows: (Array.isArray(runRows) ? runRows : []).filter((run) => {
      const xor = Number(run?.char_xor);
      return Number.isInteger(xor) && xor >= minXor && xor <= maxXor;
    }),
  };
}

function buildNearbyZones({ rows, targetXor, targetSum = null, enforceSum = false, limit = 20 }) {
  return buildZoneMapFromRuns(rows)
    .filter((zone) => !enforceSum || Number(zone?.char_sum) === Number(targetSum))
    .map((zone) => ({
      ...zone,
      xor_diff: Math.abs(Number(zone?.char_xor ?? 0) - targetXor),
      unique_teams_seen: Array.isArray(zone?.seen_char_names) ? zone.seen_char_names.length : 0,
    }))
    .sort((a, b) => {
      if (a.xor_diff !== b.xor_diff) return a.xor_diff - b.xor_diff;
      if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0);
      if ((b.crit_rate ?? -1) !== (a.crit_rate ?? -1)) return (b.crit_rate ?? -1) - (a.crit_rate ?? -1);
      return (a.char_slot ?? 0) - (b.char_slot ?? 0);
    })
    .slice(0, limit);
}

export async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await requireAuthenticatedUser(req);

    const targetXor = normalizeIntegerQuery(req.query?.xor, {
      field: 'xor',
      min: 0,
      max: 99999,
      fallback: null,
    });

    if (targetXor === null) {
      throw new HttpError(400, 'xor query param is required.');
    }

    const radius = normalizeIntegerQuery(req.query?.radius, {
      field: 'radius',
      min: 1,
      max: 500,
      fallback: 100,
    });

    const limit = normalizeIntegerQuery(req.query?.limit, {
      field: 'limit',
      min: 1,
      max: 50,
      fallback: 20,
    });
    const targetSum = normalizeIntegerQuery(req.query?.sum, {
      field: 'sum',
      min: 0,
      max: 99999,
      fallback: null,
    });
    const enforceSum = String(req.query?.enforce_sum || '').trim().toLowerCase() === 'true';

    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch = requestedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    if (!targetEpoch?.id) {
      return res.status(200).json({
        success: true,
        requested_epoch: requestedEpoch,
        target_xor: targetXor,
        radius,
        target_sum: targetSum,
        enforce_sum: enforceSum,
        epoch: null,
        zones: [],
      });
    }

    const minXor = Math.max(0, targetXor - radius);
    const maxXor = Math.min(99999, targetXor + radius);
    const primaryRows = await fetchNearbyRunRows({
      epochId: targetEpoch.id,
      minXor,
      maxXor,
    });

    let resolvedEpoch = targetEpoch;
    let resolvedEpochSource = requestedEpoch;
    let clearTimeColumnMissing = primaryRows.clearTimeColumnMissing;
    let zones = buildNearbyZones({
      rows: primaryRows.safeRows,
      targetXor,
      targetSum,
      enforceSum,
      limit,
    });

    if (zones.length === 0 && requestedEpoch === 'current') {
      const previousEpoch = await fetchPreviousEpoch(currentEpoch);
      if (previousEpoch?.id && previousEpoch.id !== targetEpoch.id) {
        const fallbackRows = await fetchNearbyRunRows({
          epochId: previousEpoch.id,
          minXor,
          maxXor,
        });
        clearTimeColumnMissing = clearTimeColumnMissing || fallbackRows.clearTimeColumnMissing;
        const fallbackZones = buildNearbyZones({
          rows: fallbackRows.safeRows,
          targetXor,
          targetSum,
          enforceSum,
          limit,
        });
        if (fallbackZones.length > 0) {
          zones = fallbackZones;
          resolvedEpoch = previousEpoch;
          resolvedEpochSource = 'previous_fallback';
        }
      }
    }

    return res.status(200).json({
      success: true,
      requested_epoch: requestedEpoch,
      resolved_epoch_source: resolvedEpochSource,
      epoch: resolvedEpoch,
      target_xor: targetXor,
      radius,
      target_sum: targetSum,
      enforce_sum: enforceSum,
      clear_time_available: !clearTimeColumnMissing,
      total_found: zones.length,
      zones,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
