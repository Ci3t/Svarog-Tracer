import charactersData from '../../../src/data/characters.json' with { type: 'json' };
import {
  HttpError,
  ZONE_RUNS_TABLE,
  buildTablePath,
  ensureCurrentEpoch,
  fetchPreviousEpoch,
  handleApiError,
  requireAuthenticatedUser,
  resolveCharacterNames,
  supabaseAdminRequest,
} from './shared.js';

const ZONE_ROSTERS_TABLE = (globalThis.process?.env?.SUPABASE_ZONE_ROSTERS_TABLE || 'zone_user_rosters');

function normalizeEpochQuery(epochValue) {
  return String(epochValue || 'current').toLowerCase() === 'previous' ? 'previous' : 'current';
}

function parseBooleanParam(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = String(value).toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
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

function getAllCharacterIds() {
  return Array.from(
    new Set(
      (Array.isArray(charactersData) ? charactersData : [])
        .map((entry) => Number(entry?.numId))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  ).sort((a, b) => a - b);
}

function parsePgArrayMaybe(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [];
  }

  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }

  return body.split(',').map((token) => Number(String(token).trim()));
}

function normalizeOwnedCharacterIds(values) {
  const allIds = new Set(getAllCharacterIds());
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && allIds.has(value))
    )
  ).sort((a, b) => a - b);
}

async function readOwnedCharacterIds(userId) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_ROSTERS_TABLE, {
      select: 'owned_char_ids',
      filters: {
        user_id: `eq.${userId}`,
        limit: '1',
      },
    })
  );

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return [];

  const ownedRaw = Array.isArray(row.owned_char_ids) ? row.owned_char_ids : parsePgArrayMaybe(row.owned_char_ids);
  return normalizeOwnedCharacterIds(ownedRaw);
}

function summarizeObservedTeams(runs) {
  const map = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    const order = Array.isArray(run.slot_order) ? run.slot_order.map(Number) : [];
    if (order.length !== 4 || order.some((value) => !Number.isInteger(value) || value <= 0)) {
      continue;
    }

    const key = order.join('-');
    if (!map.has(key)) {
      map.set(key, {
        slot_order: order,
        char_names: Array.isArray(run.char_names) ? run.char_names : resolveCharacterNames(order),
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

function isMissingRosterTableError(error) {
  if (!(error instanceof HttpError)) return false;

  const details = error.details;
  if (!details) return false;

  if (typeof details === 'object') {
    if (String(details.code || '') === '42P01') return true;
    const message = String(details.message || '').toLowerCase();
    if (message.includes('zone_user_rosters') || message.includes('does not exist')) {
      return true;
    }
    return false;
  }

  const raw = String(details).toLowerCase();
  return raw.includes('zone_user_rosters') || raw.includes('does not exist') || raw.includes('42p01');
}

function generateVariants({
  targetXor,
  targetSlot,
  targetSum,
  enforceSum,
  ownedSet,
  minOwned,
  universeIds,
  observedTeams,
  limit,
}) {
  const variants = [];
  const variantKeys = new Set();

  const allIds = Array.isArray(universeIds) ? universeIds : [];
  const allIdSet = new Set(allIds);

  for (let i = 0; i < allIds.length; i += 1) {
    const a = allIds[i];

    for (let j = i + 1; j < allIds.length; j += 1) {
      const b = allIds[j];

      for (let k = j + 1; k < allIds.length; k += 1) {
        const c = allIds[k];

        const d = targetXor ^ a ^ b ^ c;

        if (!allIdSet.has(d)) continue;
        if (d === a || d === b || d === c) continue;

        const slot = (d * 3 + a + b + c) % 10000;
        if (slot !== targetSlot) continue;

        const sum = a + b + c + d;
        if (enforceSum && sum !== targetSum) continue;

        const slotOrder = [a, b, c, d];
        const variantKey = slotOrder.join('-');
        if (variantKeys.has(variantKey)) continue;

        const ownedCount = slotOrder.filter((charId) => ownedSet.has(charId)).length;
        if (minOwned > 0 && ownedCount < minOwned) continue;

        variantKeys.add(variantKey);

        const observed = observedTeams.get(variantKey) || null;

        variants.push({
          slot_order: slotOrder,
          char_names: observed?.char_names || resolveCharacterNames(slotOrder),
          char_xor: targetXor,
          char_slot: targetSlot,
          char_sum: sum,
          owned_count: ownedCount,
          observed_runs: observed?.runs || 0,
          observed_crit_rate: observed?.crit_rate ?? null,
        });
      }
    }
  }

  variants.sort((a, b) => {
    if (a.observed_runs !== b.observed_runs) return b.observed_runs - a.observed_runs;
    if ((a.observed_crit_rate ?? -1) !== (b.observed_crit_rate ?? -1)) {
      return (b.observed_crit_rate ?? -1) - (a.observed_crit_rate ?? -1);
    }
    if (a.owned_count !== b.owned_count) return b.owned_count - a.owned_count;
    return a.char_sum - b.char_sum;
  });

  return variants.slice(0, limit);
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
    const targetSlot = normalizeIntegerQuery(req.query?.slot, {
      field: 'slot',
      min: 0,
      max: 9999,
      fallback: null,
    });

    if (targetXor === null || targetSlot === null) {
      throw new HttpError(400, 'xor and slot query params are required.');
    }

    const targetSum = normalizeIntegerQuery(req.query?.sum, {
      field: 'sum',
      min: 0,
      max: 99999,
      fallback: null,
    });

    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const enforceSum = parseBooleanParam(req.query?.enforce_sum, false) && targetSum !== null;
    const limit = normalizeIntegerQuery(req.query?.limit, {
      field: 'limit',
      min: 1,
      max: 40,
      fallback: 12,
    });

    const minOwnedRaw = normalizeIntegerQuery(req.query?.min_owned, {
      field: 'min_owned',
      min: 0,
      max: 4,
      fallback: 3,
    });

    const useOwned = parseBooleanParam(req.query?.use_owned, true);

    let ownedCharIds = [];
    let ownershipWarning = null;
    if (useOwned) {
      try {
        ownedCharIds = await readOwnedCharacterIds(user.id);
      } catch (error) {
        if (isMissingRosterTableError(error)) {
          ownershipWarning = 'owned_roster_table_missing';
          ownedCharIds = [];
        } else {
          throw error;
        }
      }
    }

    const ownedSet = new Set(ownedCharIds);
    const minOwned = useOwned ? minOwnedRaw : 0;

    if (useOwned && ownedSet.size === 0) {
      ownershipWarning = ownershipWarning || 'owned_roster_empty';
    }

    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch =
      requestedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    const runRows = targetEpoch?.id
      ? await supabaseAdminRequest(
          buildTablePath(ZONE_RUNS_TABLE, {
            select: 'slot_order,char_names,outcome',
            filters: {
              epoch_id: `eq.${targetEpoch.id}`,
              char_xor: `eq.${targetXor}`,
              char_slot: `eq.${targetSlot}`,
              limit: '4000',
            },
          })
        )
      : [];

    const observedTeams = summarizeObservedTeams(runRows);
    const universeIds = getAllCharacterIds();

    const variants = generateVariants({
      targetXor,
      targetSlot,
      targetSum,
      enforceSum,
      ownedSet,
      minOwned,
      universeIds,
      observedTeams,
      limit,
    });

    return res.status(200).json({
      success: true,
      requested_epoch: requestedEpoch,
      epoch: targetEpoch || null,
      target: {
        xor: targetXor,
        slot: targetSlot,
        sum: targetSum,
        enforce_sum: enforceSum,
      },
      ownership: {
        use_owned: useOwned,
        owned_count: ownedCharIds.length,
        min_owned: minOwned,
        warning: ownershipWarning,
      },
      observed_team_count: observedTeams.size,
      variants,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
