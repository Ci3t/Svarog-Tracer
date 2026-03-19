import {
  ZONE_RUNS_TABLE,
  buildTablePath,
  buildEpochSummaryFromRuns,
  buildZoneMapFromRuns,
  countDistinctRecentFlags,
  ensureCurrentEpoch,
  fetchPreviousEpoch,
  handleApiError,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

const FLAG_WINDOW_HOURS = 48;
const VALID_SERVER_REGIONS = new Set(['asia', 'europe', 'america']);

function normalizeEpochQuery(epochValue) {
  return String(epochValue || 'current').toLowerCase() === 'previous' ? 'previous' : 'current';
}

function normalizeRegionQuery(regionValue) {
  const normalized = String(regionValue || 'all').trim().toLowerCase();
  return VALID_SERVER_REGIONS.has(normalized) ? normalized : 'all';
}

function hasMissingColumn(error, columnName) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  return String(raw).toLowerCase().includes(String(columnName || '').toLowerCase());
}

function buildSelectFields({ includeReporter = true, includeClearTime = true } = {}) {
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
  ];

  if (includeReporter) fields.push('reporter_name');
  if (includeClearTime) fields.push('clear_time_seconds');

  return fields.join(',');
}

export async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await requireAuthenticatedUser(req);

    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const requestedRegion = normalizeRegionQuery(req.query?.region);
    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch =
      requestedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    if (!targetEpoch?.id) {
      return res.status(200).json({
        success: true,
        requested_epoch: requestedEpoch,
        selected_region: requestedRegion,
        current_epoch: currentEpoch,
        epoch: null,
        pending_flag_count: 0,
        total_runs: 0,
        epoch_summary: buildEpochSummaryFromRuns([]),
        reporter_name_available: false,
        clear_time_available: false,
        zones: [],
        generated_at: new Date().toISOString(),
      });
    }

    const runFilters = {
      epoch_id: `eq.${targetEpoch.id}`,
      order: 'submitted_at.desc',
      limit: '5000',
    };

    if (requestedRegion !== 'all') {
      runFilters.server_region = `eq.${requestedRegion}`;
    }

    let reporterColumnMissing = false;
    let clearTimeColumnMissing = false;
    let runRows = [];

    const selectAttempts = [
      { includeReporter: true, includeClearTime: true },
      { includeReporter: true, includeClearTime: false },
      { includeReporter: false, includeClearTime: true },
      { includeReporter: false, includeClearTime: false },
    ];

    let lastError = null;
    for (const attempt of selectAttempts) {
      try {
        runRows = await supabaseAdminRequest(
          buildTablePath(ZONE_RUNS_TABLE, {
            select: buildSelectFields(attempt),
            filters: runFilters,
          })
        );

        if (!attempt.includeReporter) reporterColumnMissing = true;
        if (!attempt.includeClearTime) clearTimeColumnMissing = true;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const missingReporter = hasMissingColumn(error, 'reporter_name');
        const missingClearTime = hasMissingColumn(error, 'clear_time_seconds');

        if (!missingReporter && !missingClearTime) {
          break;
        }

        reporterColumnMissing = reporterColumnMissing || missingReporter;
        clearTimeColumnMissing = clearTimeColumnMissing || missingClearTime;
      }
    }

    if (lastError) {
      throw lastError;
    }

    const safeRows = Array.isArray(runRows) ? runRows : [];
    const zones = buildZoneMapFromRuns(safeRows);
    const epochSummary = buildEpochSummaryFromRuns(safeRows);

    const visibleRegions = new Set(
      safeRows
        .map((run) => String(run?.server_region || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const mixedRegionWarning =
      requestedRegion === 'all' && visibleRegions.size > 1
        ? 'Mixed server regions in view. Pick a region filter for tighter map accuracy.'
        : null;

    const recentFlagCutoff = new Date(Date.now() - FLAG_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const pendingFlagCount = await countDistinctRecentFlags(currentEpoch.id, recentFlagCutoff);

    return res.status(200).json({
      success: true,
      requested_epoch: requestedEpoch,
      selected_region: requestedRegion,
      mixed_region_warning: mixedRegionWarning,
      current_epoch: currentEpoch,
      epoch: targetEpoch,
      pending_flag_count: pendingFlagCount,
      total_runs: safeRows.length,
      epoch_summary: epochSummary,
      reporter_name_available: !reporterColumnMissing,
      clear_time_available: !clearTimeColumnMissing,
      zones,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
