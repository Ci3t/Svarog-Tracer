import {
  CRIT_OUTCOMES,
  HttpError,
  JUNK_OUTCOMES,
  ZONE_RUNS_TABLE,
  buildTablePath,
  computeHash,
  embedZoneNoteMeta,
  ensureCurrentEpoch,
  extractDiscordDisplayName,
  handleApiError,
  normalizeClearTimeSeconds,
  normalizeOptionalText,
  normalizeOutcome,
  normalizeSlotOrder,
  readRequestBody,
  requireAuthenticatedUser,
  resolveCharacterNames,
  startOfUtcDay,
  supabaseAdminRequest,
  toPgIntArrayLiteral,
} from './shared.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_DAY = 20;
const VALID_SERVER_REGIONS = new Set(['asia', 'europe', 'america']);

function normalizeCavern(value) {
  return normalizeOptionalText(value, { field: 'cavern', maxLength: 120 });
}

function normalizeServerRegion(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;

  if (!VALID_SERVER_REGIONS.has(normalized)) {
    throw new HttpError(400, 'server_region must be asia, europe, or america.');
  }

  return normalized;
}

function hasMissingColumn(error, columnName) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  return String(raw).toLowerCase().includes(String(columnName || '').toLowerCase());
}

function buildSubmittedZonePayload({ hash, slotOrder, charNames, outcome, cavern, serverRegion, reporterName, clearTimeSeconds }) {
  const critRate = CRIT_OUTCOMES.has(outcome)
    ? 1
    : JUNK_OUTCOMES.has(outcome)
      ? 0
      : null;

  return {
    xor_slot_key: hash.xorSlotKey,
    char_xor: hash.charXor,
    char_slot: hash.charSlot,
    char_sum: hash.charSum,
    runs: 1,
    crit_count: CRIT_OUTCOMES.has(outcome) ? 1 : 0,
    junk_count: JUNK_OUTCOMES.has(outcome) ? 1 : 0,
    mixed_count: !CRIT_OUTCOMES.has(outcome) && !JUNK_OUTCOMES.has(outcome) ? 1 : 0,
    sample_slot_order: slotOrder,
    sample_char_names: charNames,
    seen_char_ids: slotOrder,
    seen_char_names: charNames,
    caverns: [String(cavern || 'unknown')],
    dominant_cavern: cavern || 'unknown',
    cavern_counts: { [String(cavern || 'unknown')]: 1 },
    regions: [String(serverRegion || 'unknown')],
    dominant_region: serverRegion || 'unknown',
    region_counts: { [String(serverRegion || 'unknown')]: 1 },
    latest_reporter_name: reporterName || null,
    top_reporter_name: reporterName || null,
    reporter_names: reporterName ? [reporterName] : [],
    reporter_counts: reporterName ? { [reporterName]: 1 } : {},
    latest_clear_time_seconds: clearTimeSeconds,
    avg_clear_time_seconds: clearTimeSeconds,
    clear_time_samples: clearTimeSeconds === null ? 0 : 1,
    crit_rate: critRate,
    weighted_confidence: critRate === null ? 0.1 : Number((critRate * 0.7 + 0.03).toFixed(4)),
    confidence: 'LOW',
  };
}

export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = readRequestBody(req);

    const slotOrder = normalizeSlotOrder(body.slot_order);
    const outcome = normalizeOutcome(body.outcome);
    const cavern = normalizeCavern(body.cavern);
    const notes = normalizeOptionalText(body.notes, { field: 'notes', maxLength: 200 });
    const serverRegion = normalizeServerRegion(body.server_region || body.region);
    const clearTimeSeconds = normalizeClearTimeSeconds(
      body.clear_time_seconds ?? body.clear_time ?? body.clearTime,
      { field: 'clear_time', required: true }
    );

    const rawRelicData = body.relic_data && typeof body.relic_data === 'object' ? body.relic_data : null;

    const currentEpoch = await ensureCurrentEpoch();

    const oneHourAgoIso = new Date(Date.now() - ONE_HOUR_MS).toISOString();
    const slotOrderLiteral = toPgIntArrayLiteral(slotOrder);

    const duplicateRows = await supabaseAdminRequest(
      buildTablePath(ZONE_RUNS_TABLE, {
        select: 'id,submitted_at',
        filters: {
          user_id: `eq.${user.id}`,
          epoch_id: `eq.${currentEpoch.id}`,
          outcome: `eq.${outcome}`,
          slot_order: `eq.${slotOrderLiteral}`,
          submitted_at: `gte.${oneHourAgoIso}`,
          order: 'submitted_at.desc',
          limit: '1',
        },
      })
    );

    if (Array.isArray(duplicateRows) && duplicateRows.length > 0) {
      return res.status(409).json({
        error: 'Duplicate submission blocked (same team + outcome in the last hour).',
      });
    }

    const dayStartIso = startOfUtcDay().toISOString();
    const todayRows = await supabaseAdminRequest(
      buildTablePath(ZONE_RUNS_TABLE, {
        select: 'id',
        filters: {
          user_id: `eq.${user.id}`,
          submitted_at: `gte.${dayStartIso}`,
          limit: String(MAX_SUBMISSIONS_PER_DAY + 1),
        },
      })
    );

    if (Array.isArray(todayRows) && todayRows.length >= MAX_SUBMISSIONS_PER_DAY) {
      return res.status(429).json({
        error: `Daily limit reached (${MAX_SUBMISSIONS_PER_DAY} submissions UTC day).`,
      });
    }

    const hash = computeHash(slotOrder);
    const charNames = resolveCharacterNames(slotOrder);
    const reporterName = extractDiscordDisplayName(user);

    const insertPayload = {
      epoch_id: currentEpoch.id,
      user_id: user.id,
      slot_order: slotOrder,
      char_names: charNames,
      cavern,
      outcome,
      char_sum: hash.charSum,
      char_xor: hash.charXor,
      char_slot: hash.charSlot,
      xor_slot_key: hash.xorSlotKey,
      notes,
      server_region: serverRegion,
      clear_time_seconds: clearTimeSeconds,
      ...(reporterName ? { reporter_name: reporterName } : {}),
      ...(rawRelicData ? { relic_data: rawRelicData } : {}),
    };

    let reporterColumnMissing = false;
    let clearTimeColumnMissing = false;

    let insertRows = null;
    let attemptPayload = { ...insertPayload };
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        insertRows = await supabaseAdminRequest(ZONE_RUNS_TABLE, {
          method: 'POST',
          body: attemptPayload,
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;

        let changed = false;

        if (!reporterColumnMissing && reporterName && hasMissingColumn(error, 'reporter_name')) {
          reporterColumnMissing = true;
          delete attemptPayload.reporter_name;
          changed = true;
        }

        if (!clearTimeColumnMissing && hasMissingColumn(error, 'clear_time_seconds')) {
          clearTimeColumnMissing = true;
          delete attemptPayload.clear_time_seconds;
          changed = true;
        }

        if (!changed) {
          break;
        }

        attemptPayload.notes = embedZoneNoteMeta(attemptPayload.notes, {
          reporterName: reporterColumnMissing ? reporterName : null,
          clearTimeSeconds: clearTimeColumnMissing ? clearTimeSeconds : null,
          maxLength: 200,
        });
      }
    }

    if (lastError) {
      throw lastError;
    }

    const createdRun = Array.isArray(insertRows) ? insertRows[0] : insertRows;

    const submittedZone = buildSubmittedZonePayload({
      hash,
      slotOrder,
      charNames,
      outcome,
      cavern,
      serverRegion,
      reporterName,
      clearTimeSeconds,
    });

    return res.status(201).json({
      success: true,
      epoch_id: currentEpoch.id,
      run: createdRun,
      submitted_zone: submittedZone,
      refresh_token: `${currentEpoch.id}:${Date.now()}`,
      warning: clearTimeColumnMissing
        ? 'clear_time_seconds_column_missing_in_zone_runs_table'
        : reporterColumnMissing
          ? 'reporter_name_column_missing_in_zone_runs_table'
          : null,
      warnings: [
        ...(clearTimeColumnMissing ? ['clear_time_seconds_column_missing_in_zone_runs_table'] : []),
        ...(reporterColumnMissing ? ['reporter_name_column_missing_in_zone_runs_table'] : []),
      ],
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
