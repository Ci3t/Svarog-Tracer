import charactersData from '../../../src/data/characters.json' with { type: 'json' };
import {
  HttpError,
  ZONE_RUNS_TABLE,
  buildTablePath,
  buildZoneMapFromRuns,
  computeHash,
  ensureCurrentEpoch,
  fetchPreviousEpoch,
  handleApiError,
  readOwnedCharacterIds,
  requireAuthenticatedUser,
  resolveCharacterNames,
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

function normalizeScanMode(value) {
  return String(value || 'generated').toLowerCase() === 'logged' ? 'logged' : 'generated';
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

function parseBooleanParam(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = String(value).toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function parseSourceSlotOrder(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = String(value)
    .split(',')
    .map((entry) => Number(String(entry).trim()))
    .filter((entry) => Number.isInteger(entry) && entry > 0);

  if (parsed.length !== 4) {
    throw new HttpError(400, 'source_slot_order must contain exactly 4 character IDs.');
  }

  if (new Set(parsed).size !== 4) {
    throw new HttpError(400, 'source_slot_order must contain 4 unique character IDs.');
  }

  return parsed;
}

function getAllCharacterIds() {
  return Array.from(
    new Set(
      (Array.isArray(charactersData) ? charactersData : [])
        .map((entry) => Number(entry?.numId))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  ).sort((a, b) => a - b);
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

function buildObservedOrderMap(runs) {
  const map = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    const slotOrder = Array.isArray(run?.slot_order)
      ? run.slot_order.map(Number).filter((value) => Number.isInteger(value) && value > 0)
      : [];

    if (slotOrder.length !== 4) continue;

    const key = slotOrder.join(',');
    if (!map.has(key)) {
      map.set(key, {
        slot_order: slotOrder,
        char_names: Array.isArray(run?.char_names) ? run.char_names : resolveCharacterNames(slotOrder),
        runs: 0,
        crit: 0,
        junk: 0,
      });
    }

    const item = map.get(key);
    item.runs += 1;

    if (['spd-double-crit', 'double-crit', 'spd-one-crit', 'one-crit'].includes(run.outcome)) {
      item.crit += 1;
    } else if (['effect-junk', 'flat-junk'].includes(run.outcome)) {
      item.junk += 1;
    }
  }

  for (const item of map.values()) {
    const denom = item.crit + item.junk;
    item.crit_rate = denom > 0 ? Number((item.crit / denom).toFixed(4)) : null;
  }

  return map;
}

function buildLoggedNearbyZones({ rows, targetXor, targetSlot = null, targetSum = null, enforceSum = false, limit = 20 }) {
  return buildZoneMapFromRuns(rows)
    .filter((zone) => !enforceSum || Number(zone?.char_sum) === Number(targetSum))
    .map((zone) => ({
      ...zone,
      xor_diff: Math.abs(Number(zone?.char_xor ?? 0) - targetXor),
      slot_diff: Number.isInteger(targetSlot) ? Math.abs(Number(zone?.char_slot ?? 0) - targetSlot) : null,
      sum_diff: Number.isInteger(targetSum) ? Math.abs(Number(zone?.char_sum ?? 0) - targetSum) : null,
      unique_teams_seen: Array.isArray(zone?.seen_char_names) ? zone.seen_char_names.length : 0,
    }))
    .sort((a, b) => {
      if (a.xor_diff !== b.xor_diff) return a.xor_diff - b.xor_diff;
      if ((a.slot_diff ?? Number.MAX_SAFE_INTEGER) !== (b.slot_diff ?? Number.MAX_SAFE_INTEGER)) {
        return (a.slot_diff ?? Number.MAX_SAFE_INTEGER) - (b.slot_diff ?? Number.MAX_SAFE_INTEGER);
      }
      if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0);
      if ((b.crit_rate ?? -1) !== (a.crit_rate ?? -1)) return (b.crit_rate ?? -1) - (a.crit_rate ?? -1);
      return (a.char_sum ?? 0) - (b.char_sum ?? 0);
    })
    .slice(0, limit);
}

function getComparisonStats(slotOrder, sourceSlotOrder, targetXor, targetSlot, targetSum) {
  const candidateIds = (Array.isArray(slotOrder) ? slotOrder : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 4);

  const sourceIds = Array.isArray(sourceSlotOrder) ? sourceSlotOrder : [];
  const sourceSet = new Set(sourceIds);
  const sharedChars = candidateIds.filter((charId) => sourceSet.has(charId)).length;
  const sameSlots = candidateIds.reduce(
    (total, charId, index) => total + (sourceIds[index] === charId ? 1 : 0),
    0
  );
  const hash = computeHash(candidateIds);

  return {
    sharedChars,
    sameSlots,
    char_xor: hash.charXor,
    char_slot: hash.charSlot,
    char_sum: hash.charSum,
    xor_diff: Math.abs(hash.charXor - targetXor),
    slot_diff: Number.isInteger(targetSlot) ? Math.abs(hash.charSlot - targetSlot) : null,
    sum_diff: Number.isInteger(targetSum) ? Math.abs(hash.charSum - targetSum) : null,
  };
}

function pushGeneratedCandidate({
  nextSlotOrder,
  sourceSlotOrder,
  sourceKey,
  targetXor,
  targetSlot,
  targetSum,
  radius,
  enforceSum,
  ownedSet,
  minOwned,
  observedMap,
  mutationSteps,
  candidateMap,
}) {
  const candidateKey = nextSlotOrder.join(',');
  if (candidateMap.has(candidateKey) || candidateKey === sourceKey) return;

  const ownedCount = nextSlotOrder.filter((charId) => ownedSet.has(charId)).length;
  if (minOwned > 0 && ownedCount < minOwned) return;

  const comparison = getComparisonStats(nextSlotOrder, sourceSlotOrder, targetXor, targetSlot, targetSum);
  if (comparison.xor_diff > radius) return;
  if (enforceSum && comparison.char_sum !== targetSum) return;

  const observed = observedMap.get(candidateKey) || null;

  candidateMap.set(candidateKey, {
    sample_slot_order: nextSlotOrder,
    sample_char_names: observed?.char_names || resolveCharacterNames(nextSlotOrder),
    char_xor: comparison.char_xor,
    char_slot: comparison.char_slot,
    char_sum: comparison.char_sum,
    xor_slot_key: `${comparison.char_xor}_${comparison.char_slot}`,
    xor_diff: comparison.xor_diff,
    slot_diff: comparison.slot_diff,
    sum_diff: comparison.sum_diff,
    same_slots: comparison.sameSlots,
    shared_chars: comparison.sharedChars,
    owned_count: ownedCount,
    mutation_steps: mutationSteps,
    runs: observed?.runs || 0,
    crit_rate: observed?.crit_rate ?? null,
  });
}

function buildGeneratedNearbyZones({
  sourceSlotOrder,
  targetXor,
  targetSlot,
  targetSum,
  radius,
  enforceSum,
  ownedSet,
  minOwned,
  observedMap,
  limit,
}) {
  if (!Array.isArray(sourceSlotOrder) || sourceSlotOrder.length !== 4) {
    throw new HttpError(400, 'Generated nearby scan needs 4 selected team slots.');
  }

  const sourceKey = sourceSlotOrder.join(',');
  const currentSet = new Set(sourceSlotOrder);
  const universeIds = getAllCharacterIds();
  const replacementPool = universeIds.filter((charId) => !currentSet.has(charId));
  const candidateMap = new Map();

  for (let slotIndex = 0; slotIndex < sourceSlotOrder.length; slotIndex += 1) {
    for (const replacementId of replacementPool) {
      const nextSlotOrder = [...sourceSlotOrder];
      nextSlotOrder[slotIndex] = replacementId;
      pushGeneratedCandidate({
        nextSlotOrder,
        sourceSlotOrder,
        sourceKey,
        targetXor,
        targetSlot,
        targetSum,
        radius,
        enforceSum,
        ownedSet,
        minOwned,
        observedMap,
        mutationSteps: 1,
        candidateMap,
      });
    }
  }

  for (let firstIndex = 0; firstIndex < sourceSlotOrder.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < sourceSlotOrder.length; secondIndex += 1) {
      for (let i = 0; i < replacementPool.length; i += 1) {
        for (let j = i + 1; j < replacementPool.length; j += 1) {
          const nextSlotOrder = [...sourceSlotOrder];
          nextSlotOrder[firstIndex] = replacementPool[i];
          nextSlotOrder[secondIndex] = replacementPool[j];
          pushGeneratedCandidate({
            nextSlotOrder,
            sourceSlotOrder,
            sourceKey,
            targetXor,
            targetSlot,
            targetSum,
            radius,
            enforceSum,
            ownedSet,
            minOwned,
            observedMap,
            mutationSteps: 2,
            candidateMap,
          });
        }
      }
    }
  }

  return Array.from(candidateMap.values())
    .sort((a, b) => {
      if (a.xor_diff !== b.xor_diff) return a.xor_diff - b.xor_diff;
      if (a.same_slots !== b.same_slots) return b.same_slots - a.same_slots;
      if ((a.slot_diff ?? Number.MAX_SAFE_INTEGER) !== (b.slot_diff ?? Number.MAX_SAFE_INTEGER)) {
        return (a.slot_diff ?? Number.MAX_SAFE_INTEGER) - (b.slot_diff ?? Number.MAX_SAFE_INTEGER);
      }
      if (a.shared_chars !== b.shared_chars) return b.shared_chars - a.shared_chars;
      if ((a.sum_diff ?? Number.MAX_SAFE_INTEGER) !== (b.sum_diff ?? Number.MAX_SAFE_INTEGER)) {
        return (a.sum_diff ?? Number.MAX_SAFE_INTEGER) - (b.sum_diff ?? Number.MAX_SAFE_INTEGER);
      }
      if (a.mutation_steps !== b.mutation_steps) return a.mutation_steps - b.mutation_steps;
      if ((b.runs ?? 0) !== (a.runs ?? 0)) return (b.runs ?? 0) - (a.runs ?? 0);
      return (b.crit_rate ?? -1) - (a.crit_rate ?? -1);
    })
    .slice(0, limit);
}

export async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);

    const targetXor = normalizeIntegerQuery(req.query?.xor, {
      field: 'xor',
      min: 0,
      max: 99999,
      fallback: null,
    });

    if (targetXor === null) {
      throw new HttpError(400, 'xor query param is required.');
    }

    const targetSlot = normalizeIntegerQuery(req.query?.slot, {
      field: 'slot',
      min: 0,
      max: 9999,
      fallback: null,
    });

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
    const enforceSum = parseBooleanParam(req.query?.enforce_sum, false) && targetSum !== null;
    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const scanMode = normalizeScanMode(req.query?.scan_mode);
    const sourceSlotOrder = parseSourceSlotOrder(req.query?.source_slot_order);
    const minOwnedRaw = normalizeIntegerQuery(req.query?.min_owned, {
      field: 'min_owned',
      min: 0,
      max: 4,
      fallback: 3,
    });
    const useOwned = parseBooleanParam(req.query?.use_owned, false);

    const ownedCharIds = useOwned ? await readOwnedCharacterIds(user.id) : [];
    const ownedSet = new Set(ownedCharIds);
    const minOwned = useOwned ? minOwnedRaw : 0;

    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch = requestedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    if (!targetEpoch?.id) {
      return res.status(200).json({
        success: true,
        requested_epoch: requestedEpoch,
        resolved_epoch_source: requestedEpoch,
        epoch: null,
        scan_mode: scanMode,
        target_xor: targetXor,
        target_slot: targetSlot,
        radius,
        target_sum: targetSum,
        enforce_sum: enforceSum,
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
    let rows = primaryRows.safeRows;

    let zones =
      scanMode === 'logged'
        ? buildLoggedNearbyZones({
            rows,
            targetXor,
            targetSlot,
            targetSum,
            enforceSum,
            limit,
          })
        : buildGeneratedNearbyZones({
            sourceSlotOrder,
            targetXor,
            targetSlot,
            targetSum,
            radius,
            enforceSum,
            ownedSet,
            minOwned,
            observedMap: buildObservedOrderMap(rows),
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
        const fallbackZones =
          scanMode === 'logged'
            ? buildLoggedNearbyZones({
                rows: fallbackRows.safeRows,
                targetXor,
                targetSlot,
                targetSum,
                enforceSum,
                limit,
              })
            : buildGeneratedNearbyZones({
                sourceSlotOrder,
                targetXor,
                targetSlot,
                targetSum,
                radius,
                enforceSum,
                ownedSet,
                minOwned,
                observedMap: buildObservedOrderMap(fallbackRows.safeRows),
                limit,
              });
        if (fallbackZones.length > 0) {
          zones = fallbackZones;
          rows = fallbackRows.safeRows;
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
      scan_mode: scanMode,
      target_xor: targetXor,
      target_slot: targetSlot,
      radius,
      target_sum: targetSum,
      enforce_sum: enforceSum,
      clear_time_available: !clearTimeColumnMissing,
      total_found: zones.length,
      observed_run_count: rows.length,
      ownership: {
        use_owned: useOwned,
        owned_count: ownedCharIds.length,
        min_owned: minOwned,
      },
      zones,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
