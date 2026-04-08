import {
  HttpError,
  ZONE_RUNS_TABLE,
  buildEpochSummaryFromRuns,
  buildZoneMapFromRuns,
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
  supabaseAdminRequest,
} from './shared.js';

const MAX_BULK_RUNS = 200;

const RELIC_PIECE_ALIASES = new Map([
  ['head', 'Head'],
  ['hands', 'Hands'],
  ['body', 'Body'],
  ['chest', 'Body'],
  ['chests', 'Body'],
  ['feet', 'Feet'],
  ['boots', 'Feet'],
  ['planar sphere', 'Planar Sphere'],
  ['sphere', 'Planar Sphere'],
  ['orb', 'Planar Sphere'],
  ['link rope', 'Link Rope'],
  ['rope', 'Link Rope'],
]);

const MAIN_STATS_BY_PIECE = Object.freeze({
  Head: Object.freeze(['Flat HP']),
  Hands: Object.freeze(['Flat ATK']),
  Body: Object.freeze(['CRIT Rate', 'CRIT DMG', 'Outgoing Healing Boost', 'Effect Hit Rate', 'ATK%', 'DEF%', 'HP%']),
  Feet: Object.freeze(['SPD', 'ATK%', 'DEF%', 'HP%', 'Break Effect']),
  'Planar Sphere': Object.freeze([
    'Physical DMG',
    'Fire DMG',
    'Ice DMG',
    'Wind DMG',
    'Lightning DMG',
    'Quantum DMG',
    'Imaginary DMG',
    'ATK%',
    'DEF%',
    'HP%',
  ]),
  'Link Rope': Object.freeze(['Energy Regeneration Rate', 'Break Effect', 'ATK%', 'DEF%', 'HP%']),
});

const FIXED_MAIN_BY_PIECE = Object.freeze({
  Head: 'Flat HP',
  Hands: 'Flat ATK',
});

const SUBSTAT_POOL = new Set([
  'Flat HP',
  'Flat ATK',
  'Flat DEF',
  'HP%',
  'ATK%',
  'DEF%',
  'SPD',
  'CRIT Rate',
  'CRIT DMG',
  'Effect Hit Rate',
  'Effect RES',
  'Break Effect',
]);

function parseSlotOrderInput(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }

  const values = trimmed
    .split(/[,\s/|]+/g)
    .map((token) => Number(token))
    .filter((value) => Number.isInteger(value) && value > 0);

  return values.length > 0 ? values : null;
}

function resolveRawSlotOrder(rawRun) {
  return (
    parseSlotOrderInput(rawRun.slot_order) ||
    parseSlotOrderInput(rawRun.slotOrder) ||
    parseSlotOrderInput(rawRun.team) ||
    parseSlotOrderInput(rawRun.char_ids)
  );
}

function normalizeOptionalIsoTimestamp(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${field} must be a valid ISO timestamp.`);
  }

  return parsed.toISOString();
}

function normalizeRelicPiece(value, { field = 'relic_drop.piece', required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return null;
  }

  const canonical = RELIC_PIECE_ALIASES.get(String(value).trim().toLowerCase());
  if (!canonical) {
    throw new HttpError(400, `${field} is invalid.`);
  }

  return canonical;
}

function normalizeRelicDrop(rawRelic, index) {
  if (!rawRelic || typeof rawRelic !== 'object') {
    throw new HttpError(400, `runs[${index}].relic_drop must be an object.`);
  }

  const piece = normalizeRelicPiece(rawRelic.piece || rawRelic.relic_piece || rawRelic.slot, {
    field: `runs[${index}].relic_drop.piece`,
    required: true,
  });

  let mainStat = normalizeOptionalText(rawRelic.main_stat || rawRelic.mainStat || rawRelic.relic_main_stat, {
    field: `runs[${index}].relic_drop.main_stat`,
    maxLength: 80,
  });

  const fixedMain = FIXED_MAIN_BY_PIECE[piece] || null;
  if (fixedMain) {
    mainStat = fixedMain;
  }

  if (mainStat) {
    const allowedMainStats = MAIN_STATS_BY_PIECE[piece] || [];
    if (!allowedMainStats.includes(mainStat)) {
      throw new HttpError(400, `runs[${index}].relic_drop.main_stat is invalid for piece ${piece}.`);
    }
  }

  const rawSubstats = Array.isArray(rawRelic.substats)
    ? rawRelic.substats
    : Array.isArray(rawRelic.relic_substats)
      ? rawRelic.relic_substats
      : null;

  if (!Array.isArray(rawSubstats) || rawSubstats.length !== 4) {
    throw new HttpError(400, `runs[${index}].relic_drop.substats must contain exactly 4 values.`);
  }

  const normalizedSubstats = rawSubstats.map((value) => String(value || '').trim()).filter(Boolean);
  if (normalizedSubstats.length !== 4) {
    throw new HttpError(400, `runs[${index}].relic_drop.substats must contain exactly 4 non-empty values.`);
  }

  const uniqueSubstats = [...new Set(normalizedSubstats)];
  if (uniqueSubstats.length !== 4) {
    throw new HttpError(400, `runs[${index}].relic_drop.substats must be 4 unique stats.`);
  }

  const unknownSubstats = uniqueSubstats.filter((substat) => !SUBSTAT_POOL.has(substat));
  if (unknownSubstats.length > 0) {
    throw new HttpError(400, `runs[${index}].relic_drop.substats contains invalid values.`, {
      invalid_substats: unknownSubstats,
    });
  }

  if (mainStat && uniqueSubstats.includes(mainStat)) {
    throw new HttpError(400, `runs[${index}].relic_drop.substats cannot include main stat ${mainStat}.`);
  }

  return {
    piece,
    main_stat: mainStat,
    substats: uniqueSubstats,
  };
}

function getRelicDropInput(rawRun) {
  if (rawRun.relic_drop && typeof rawRun.relic_drop === 'object') {
    return rawRun.relic_drop;
  }

  if (rawRun.relic_piece || rawRun.piece || rawRun.main_stat || Array.isArray(rawRun.substats) || Array.isArray(rawRun.relic_substats)) {
    return {
      piece: rawRun.relic_piece || rawRun.piece,
      main_stat: rawRun.main_stat || rawRun.relic_main_stat,
      substats: rawRun.substats || rawRun.relic_substats,
    };
  }

  return null;
}

function hasMissingRelicColumns(error) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  const normalized = raw.toLowerCase();
  return (
    normalized.includes('relic_piece') ||
    normalized.includes('relic_main_stat') ||
    normalized.includes('relic_substats')
  );
}

function hasMissingReporterColumn(error) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  return String(raw).toLowerCase().includes('reporter_name');
}

function hasMissingClearTimeColumn(error) {
  const details = error?.details;
  if (!details) return false;

  const raw = typeof details === 'string'
    ? details
    : `${details.message || ''} ${details.details || ''} ${details.hint || ''}`;

  return String(raw).toLowerCase().includes('clear_time_seconds');
}

function stripRelicColumns(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const rest = { ...(row || {}) };
    delete rest.relic_piece;
    delete rest.relic_main_stat;
    delete rest.relic_substats;
    return rest;
  });
}

function stripReporterColumn(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const rest = { ...(row || {}) };
    delete rest.reporter_name;
    return rest;
  });
}

function stripClearTimeColumn(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const rest = { ...(row || {}) };
    delete rest.clear_time_seconds;
    return rest;
  });
}

function normalizeRunItem(rawRun, index) {
  if (!rawRun || typeof rawRun !== 'object') {
    throw new HttpError(400, `runs[${index}] is not an object.`);
  }

  const slotOrderRaw = resolveRawSlotOrder(rawRun);
  if (!slotOrderRaw) {
    throw new HttpError(400, `runs[${index}].slot_order is required.`);
  }

  const slotOrder = normalizeSlotOrder(slotOrderRaw);
  const outcome = normalizeOutcome(rawRun.outcome || rawRun.run_outcome || rawRun.result);
  const cavern = normalizeOptionalText(rawRun.cavern || rawRun.cavern_id || rawRun.domain, {
    field: `runs[${index}].cavern`,
    maxLength: 120,
  });
  const notes = normalizeOptionalText(rawRun.notes || rawRun.note, { field: `runs[${index}].notes`, maxLength: 200 });
  const clearTimeSeconds = normalizeClearTimeSeconds(
    rawRun.clear_time_seconds ?? rawRun.clear_time ?? rawRun.clearTime ?? rawRun.time_seconds ?? rawRun.time,
    { field: `runs[${index}].clear_time`, required: false }
  );
  const submittedAt = normalizeOptionalIsoTimestamp(
    rawRun.submitted_at || rawRun.submittedAt || rawRun.timestamp || rawRun.created_at,
    `runs[${index}].submitted_at`
  );

  const relicDropInput = getRelicDropInput(rawRun);
  const relicDrop = relicDropInput ? normalizeRelicDrop(relicDropInput, index) : null;

  return {
    slotOrder,
    outcome,
    cavern,
    notes,
    clearTimeSeconds,
    submittedAt,
    relicDrop,
  };
}

export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = readRequestBody(req);

    const rawRuns = Array.isArray(body.runs) ? body.runs : [];
    if (rawRuns.length === 0) {
      return res.status(400).json({ error: 'runs[] is required.' });
    }

    if (rawRuns.length > MAX_BULK_RUNS) {
      return res.status(400).json({ error: `runs[] exceeds max size (${MAX_BULK_RUNS}).` });
    }

    const currentEpoch = await ensureCurrentEpoch();
    const reporterName = extractDiscordDisplayName(user);

    const rowsToInsert = rawRuns.map((rawRun, index) => {
      const normalized = normalizeRunItem(rawRun, index);
      const hash = computeHash(normalized.slotOrder);

      return {
        epoch_id: currentEpoch.id,
        user_id: user.id,
        slot_order: normalized.slotOrder,
        char_names: resolveCharacterNames(normalized.slotOrder),
        cavern: normalized.cavern,
        outcome: normalized.outcome,
        char_sum: hash.charSum,
        char_xor: hash.charXor,
        char_slot: hash.charSlot,
        xor_slot_key: hash.xorSlotKey,
        notes: normalized.notes,
        ...(normalized.clearTimeSeconds !== null ? { clear_time_seconds: normalized.clearTimeSeconds } : {}),
        ...(reporterName ? { reporter_name: reporterName } : {}),
        ...(normalized.submittedAt ? { submitted_at: normalized.submittedAt } : {}),
        ...(normalized.relicDrop
          ? {
              relic_piece: normalized.relicDrop.piece,
              relic_main_stat: normalized.relicDrop.main_stat,
              relic_substats: normalized.relicDrop.substats,
            }
          : {}),
      };
    });

    const includesRelicColumns = rowsToInsert.some(
      (row) => row.relic_piece || row.relic_main_stat || Array.isArray(row.relic_substats)
    );
    const includesReporterColumn = Boolean(reporterName);
    const includesClearTimeColumn = rowsToInsert.some((row) => row.clear_time_seconds !== undefined);

    let relicColumnsMissing = false;
    let reporterColumnMissing = false;
    let clearTimeColumnMissing = false;
    let insertedRows;

    let candidateRows = rowsToInsert;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        insertedRows = await supabaseAdminRequest(ZONE_RUNS_TABLE, {
          method: 'POST',
          body: candidateRows,
          prefer: 'return=representation',
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;

        let nextRows = candidateRows;
        let changed = false;

        if (!reporterColumnMissing && includesReporterColumn && hasMissingReporterColumn(error)) {
          reporterColumnMissing = true;
          nextRows = stripReporterColumn(nextRows);
          changed = true;
        }

        if (!clearTimeColumnMissing && includesClearTimeColumn && hasMissingClearTimeColumn(error)) {
          clearTimeColumnMissing = true;
          nextRows = stripClearTimeColumn(nextRows);
          changed = true;
        }

        if (!relicColumnsMissing && includesRelicColumns && hasMissingRelicColumns(error)) {
          relicColumnsMissing = true;
          nextRows = stripRelicColumns(nextRows);
          changed = true;
        }

        if (!changed) {
          break;
        }

        candidateRows = nextRows.map((row, index) => {
          const sourceRow = rowsToInsert[index] || {};
          return {
            ...row,
            notes: embedZoneNoteMeta(row.notes, {
              reporterName: reporterColumnMissing ? reporterName : null,
              clearTimeSeconds: clearTimeColumnMissing ? sourceRow.clear_time_seconds : null,
              maxLength: 200,
            }),
          };
        });
      }
    }

    if (lastError) {
      throw lastError;
    }

    const safeRows = Array.isArray(insertedRows) ? insertedRows : [];
    const summary = buildEpochSummaryFromRuns(safeRows);
    const zoneSummary = buildZoneMapFromRuns(safeRows);

    return res.status(201).json({
      success: true,
      epoch_id: currentEpoch.id,
      inserted_count: safeRows.length,
      summary,
      zone_count: zoneSummary.length,
      top_zones: zoneSummary.slice(0, 8),
      warning: clearTimeColumnMissing
        ? 'clear_time_seconds_column_missing_in_zone_runs_table'
        : relicColumnsMissing
          ? 'relic_columns_missing_in_zone_runs_table'
          : reporterColumnMissing
            ? 'reporter_name_column_missing_in_zone_runs_table'
            : null,
      warnings: [
        ...(clearTimeColumnMissing ? ['clear_time_seconds_column_missing_in_zone_runs_table'] : []),
        ...(relicColumnsMissing ? ['relic_columns_missing_in_zone_runs_table'] : []),
        ...(reporterColumnMissing ? ['reporter_name_column_missing_in_zone_runs_table'] : []),
      ],
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
