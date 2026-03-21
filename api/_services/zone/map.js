import {
  ZONE_RUNS_TABLE,
  ZONE_LIKES_TABLE,
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
const SUBSTAT_CANONICAL_MAP = new Map([
  ['flat hp', 'Flat HP'],
  ['hp flat', 'Flat HP'],
  ['flat atk', 'Flat ATK'],
  ['atk flat', 'Flat ATK'],
  ['flat def', 'Flat DEF'],
  ['def flat', 'Flat DEF'],
  ['hp%', 'HP%'],
  ['hp pct', 'HP%'],
  ['hp percent', 'HP%'],
  ['atk%', 'ATK%'],
  ['atk pct', 'ATK%'],
  ['atk percent', 'ATK%'],
  ['def%', 'DEF%'],
  ['def pct', 'DEF%'],
  ['def percent', 'DEF%'],
  ['spd', 'SPD'],
  ['speed', 'SPD'],
  ['crit rate', 'CRIT Rate'],
  ['crit_rate', 'CRIT Rate'],
  ['critrate', 'CRIT Rate'],
  ['crit dmg', 'CRIT DMG'],
  ['crit damage', 'CRIT DMG'],
  ['crit_dmg', 'CRIT DMG'],
  ['critdmg', 'CRIT DMG'],
  ['effect hit rate', 'Effect Hit Rate'],
  ['effect hit', 'Effect Hit Rate'],
  ['ehr', 'Effect Hit Rate'],
  ['effect res', 'Effect RES'],
  ['effect resist', 'Effect RES'],
  ['effect resistance', 'Effect RES'],
  ['break effect', 'Break Effect'],
  ['break', 'Break Effect'],
]);
const TARGET_PRESETS = Object.freeze({
  crit_potential: { label: 'Crit Potential', active: false, stats: [], matchMode: 'any' },
  crit_substats: { label: 'Crit Stats', active: true, stats: ['CRIT Rate', 'CRIT DMG'], matchMode: 'any' },
  spd: { label: 'SPD', active: true, stats: ['SPD'], matchMode: 'any' },
  hp_pct: { label: 'HP%', active: true, stats: ['HP%'], matchMode: 'any' },
  break_effect: { label: 'Break', active: true, stats: ['Break Effect'], matchMode: 'any' },
  spd_crit: { label: 'SPD + Crit', active: true, stats: ['SPD', 'CRIT Rate', 'CRIT DMG'], matchMode: 'any' },
  custom: { label: 'Custom', active: true, stats: [], matchMode: 'any' },
});

function normalizeTargetPreset(value) {
  const normalized = String(value || 'crit_potential').trim().toLowerCase();
  return TARGET_PRESETS[normalized] ? normalized : 'crit_potential';
}

function normalizeMatchMode(value) {
  return String(value || 'any').trim().toLowerCase() === 'all' ? 'all' : 'any';
}

function extractSubstatValue(value) {
  if (value && typeof value === 'object') {
    const candidate = value.name || value.stat || value.key || value.label || value.substat || '';
    return String(candidate || '').trim();
  }
  return String(value || '').trim();
}

function normalizeSubstatLabel(value) {
  const raw = extractSubstatValue(value);
  if (!raw) return '';

  const lowered = raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return SUBSTAT_CANONICAL_MAP.get(lowered) || raw;
}

function normalizeStatsQuery(value) {
  const entries = String(value || '')
    .split(',')
    .map((entry) => normalizeSubstatLabel(entry))
    .filter(Boolean);

  return Array.from(new Set(entries)).slice(0, 4);
}

function buildTargetFilterConfig(query) {
  const preset = normalizeTargetPreset(query?.target);
  const presetConfig = TARGET_PRESETS[preset];
  const matchMode = preset === 'custom' ? normalizeMatchMode(query?.match_mode) : presetConfig.matchMode;
  const stats = preset === 'custom' ? normalizeStatsQuery(query?.stats) : presetConfig.stats;
  const active = Boolean(presetConfig.active && stats.length > 0);

  return {
    preset,
    label: presetConfig.label,
    stats,
    match_mode: matchMode,
    active,
  };
}

function collectZoneSubstats(zone) {
  const substats = [];

  // Merge aggregated_substats (from relic_substats column) with relic_data fallback.
  // Some zones are built from mixed sources, and the card UI can reflect relic_data
  // while imported rows contribute via relic_substats. We need one combined pool.
  if (Array.isArray(zone?.aggregated_substats)) {
    for (const entry of zone.aggregated_substats) {
      const normalized = normalizeSubstatLabel(entry);
      if (normalized) substats.push(normalized);
    }
  }

  const relics = Array.isArray(zone?.sample_relic_data?.relics) ? zone.sample_relic_data.relics : [];
  for (const relic of relics) {
    const entries = Array.isArray(relic?.substats) ? relic.substats : [];
    for (const entry of entries) {
      const normalized = normalizeSubstatLabel(entry);
      if (normalized) substats.push(normalized);
    }
  }
  return substats;
}

function applyTargetFilter(zones, targetFilter) {
  if (!targetFilter?.active) {
    return Array.isArray(zones) ? zones : [];
  }

  const targetStats = Array.isArray(targetFilter.stats) ? targetFilter.stats : [];
  const matchMode = targetFilter.match_mode === 'all' ? 'all' : 'any';

  return (Array.isArray(zones) ? zones : [])
    .map((zone) => {
      const substats = collectZoneSubstats(zone);
      const totalEntries = substats.length;
      const countMap = new Map();
      for (const stat of substats) {
        countMap.set(stat, (countMap.get(stat) || 0) + 1);
      }

      const matchedStats = targetStats.filter((stat) => (countMap.get(stat) || 0) > 0);
      const totalMatches = targetStats.reduce((sum, stat) => sum + (countMap.get(stat) || 0), 0);
      const passes = matchMode === 'all'
        ? matchedStats.length === targetStats.length
        : matchedStats.length > 0;

      const targetRate = totalEntries > 0 ? Number((totalMatches / totalEntries).toFixed(4)) : null;

      return {
        ...zone,
        target_rate: targetRate,
        target_match_count: totalMatches,
        target_matched_stats: matchedStats,
        target_passes: passes,
      };
    })
    .filter((zone) => zone.target_passes)
    .sort((a, b) => {
      if ((b.target_rate ?? -1) !== (a.target_rate ?? -1)) return (b.target_rate ?? -1) - (a.target_rate ?? -1);
      if ((b.target_match_count ?? 0) !== (a.target_match_count ?? 0)) return (b.target_match_count ?? 0) - (a.target_match_count ?? 0);
      if ((b.crit_rate ?? -1) !== (a.crit_rate ?? -1)) return (b.crit_rate ?? -1) - (a.crit_rate ?? -1);
      return (b.runs ?? 0) - (a.runs ?? 0);
    });
}

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

function isMissingLikesTable(error) {
  const raw = typeof error?.details === 'string'
    ? error.details
    : `${error?.details?.message || ''} ${error?.details?.details || ''} ${error?.details?.hint || ''}`;
  const normalized = String(raw || '').toLowerCase();
  return normalized.includes('zone_likes') || normalized.includes('does not exist') || normalized.includes('42p01');
}

function sortZones(zones) {
  return [...(Array.isArray(zones) ? zones : [])].sort((a, b) => {
    if ((b.like_count ?? 0) !== (a.like_count ?? 0)) return (b.like_count ?? 0) - (a.like_count ?? 0);
    if ((b.target_rate ?? -1) !== (a.target_rate ?? -1)) return (b.target_rate ?? -1) - (a.target_rate ?? -1);
    if ((b.target_match_count ?? 0) !== (a.target_match_count ?? 0)) return (b.target_match_count ?? 0) - (a.target_match_count ?? 0);
    const aRate = a.crit_rate;
    const bRate = b.crit_rate;
    if (aRate === null && bRate !== null) return 1;
    if (bRate === null && aRate !== null) return -1;
    if (aRate !== bRate) return (bRate || 0) - (aRate || 0);
    if ((b.weighted_confidence ?? 0) !== (a.weighted_confidence ?? 0)) {
      return (b.weighted_confidence ?? 0) - (a.weighted_confidence ?? 0);
    }
    return (b.runs ?? 0) - (a.runs ?? 0);
  });
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
    'relic_data',
    'relic_substats',
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
    const { user } = await requireAuthenticatedUser(req);

    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const requestedRegion = normalizeRegionQuery(req.query?.region);
    const targetFilter = buildTargetFilterConfig(req.query);
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
        target_filter: targetFilter,
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
    const baseZones = buildZoneMapFromRuns(safeRows);
    let zones = applyTargetFilter(baseZones, targetFilter);
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

    try {
      const likeRows = await supabaseAdminRequest(
        buildTablePath(ZONE_LIKES_TABLE, {
          select: 'xor_slot_key,user_id',
          filters: {
            epoch_id: `eq.${targetEpoch.id}`,
            limit: '5000',
          },
        })
      );

      const likeMap = new Map();
      for (const row of Array.isArray(likeRows) ? likeRows : []) {
        const key = String(row?.xor_slot_key || '').trim();
        if (!key) continue;
        const current = likeMap.get(key) || { like_count: 0, viewer_liked: false };
        current.like_count += 1;
        if (String(row?.user_id || '') === String(user?.id || '')) {
          current.viewer_liked = true;
        }
        likeMap.set(key, current);
      }

      zones = zones.map((zone) => {
        const likes = likeMap.get(String(zone?.xor_slot_key || '').trim()) || { like_count: 0, viewer_liked: false };
        return {
          ...zone,
          like_count: likes.like_count,
          viewer_liked: likes.viewer_liked,
        };
      });
    } catch (error) {
      if (!isMissingLikesTable(error)) {
        throw error;
      }
      zones = zones.map((zone) => ({ ...zone, like_count: 0, viewer_liked: false }));
    }

    zones = sortZones(zones);

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
      target_filter: targetFilter,
      zones,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
