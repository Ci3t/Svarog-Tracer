import {
  HttpError,
  ZONE_RUNS_TABLE,
  buildTablePath,
  ensureCurrentEpoch,
  fetchEpochById,
  fetchPreviousEpoch,
  handleApiError,
  isZoneAdminUser,
  readRequestBody,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

const VALID_SERVER_REGIONS = new Set(['asia', 'europe', 'america']);
const WIPE_ALL_CONFIRM = 'WIPE_ALL_ZONE_RUNS';

function normalizeAction(value) {
  return String(value || '').trim().toLowerCase();
}

function parseOptionalInt(value, { min = 0, max = 999999, field = 'value' } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HttpError(400, `${field} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function normalizeRegion(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return 'all';
  if (!VALID_SERVER_REGIONS.has(normalized)) {
    throw new HttpError(400, 'region must be all, asia, europe, or america.');
  }
  return normalized;
}

async function resolveTargetEpoch(epochInput) {
  const currentEpoch = await ensureCurrentEpoch();
  const normalized = String(epochInput || 'current').trim().toLowerCase();

  if (!normalized || normalized === 'current') {
    return { currentEpoch, targetEpoch: currentEpoch };
  }

  if (normalized === 'previous') {
    const previousEpoch = await fetchPreviousEpoch(currentEpoch);
    if (!previousEpoch?.id) {
      throw new HttpError(404, 'Previous epoch not found.');
    }
    return { currentEpoch, targetEpoch: previousEpoch };
  }

  const asId = parseOptionalInt(normalized, { min: 1, max: 999999, field: 'epoch' });
  if (asId === null) {
    throw new HttpError(400, 'epoch must be current, previous, or numeric epoch id.');
  }

  const explicitEpoch = await fetchEpochById(asId);
  if (!explicitEpoch?.id) {
    throw new HttpError(404, `Epoch ${asId} not found.`);
  }

  return { currentEpoch, targetEpoch: explicitEpoch };
}

function buildZoneFilters({ epochId, region, zoneKey, zoneXor, zoneSlot }) {
  const filters = {
    epoch_id: `eq.${epochId}`,
  };

  if (region && region !== 'all') {
    filters.server_region = `eq.${region}`;
  }

  const normalizedZoneKey = String(zoneKey || '').trim();
  if (normalizedZoneKey) {
    filters.xor_slot_key = `eq.${normalizedZoneKey}`;
    return filters;
  }

  if (zoneXor !== null && zoneSlot !== null) {
    filters.char_xor = `eq.${zoneXor}`;
    filters.char_slot = `eq.${zoneSlot}`;
    return filters;
  }

  throw new HttpError(400, 'Zone selector is required (xor_slot_key or char_xor + char_slot).');
}

async function countMatchingRuns(filters) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_RUNS_TABLE, {
      select: 'id',
      filters: {
        ...filters,
        limit: '5000',
      },
    })
  );

  return Array.isArray(rows) ? rows.length : 0;
}

export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    if (!isZoneAdminUser(user)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const body = readRequestBody(req);
    const action = normalizeAction(body.action);
    if (!action) {
      throw new HttpError(400, 'action is required.');
    }

    if (action === 'wipe_all') {
      if (String(body.confirm || '').trim() !== WIPE_ALL_CONFIRM) {
        throw new HttpError(400, `confirm must equal ${WIPE_ALL_CONFIRM}.`);
      }

      const totalBefore = await countMatchingRuns({});
      await supabaseAdminRequest(ZONE_RUNS_TABLE, {
        method: 'DELETE',
        prefer: 'return=minimal',
      });

      return res.status(200).json({
        success: true,
        action,
        deleted_count: totalBefore,
        scope: 'all_epochs',
      });
    }

    const region = normalizeRegion(body.region || body.server_region || 'all');
    const { targetEpoch } = await resolveTargetEpoch(body.epoch);

    if (action === 'wipe_epoch') {
      const filters = {
        epoch_id: `eq.${targetEpoch.id}`,
      };

      const totalBefore = await countMatchingRuns(filters);
      await supabaseAdminRequest(
        buildTablePath(ZONE_RUNS_TABLE, {
          select: false,
          filters,
        }),
        {
          method: 'DELETE',
          prefer: 'return=minimal',
        }
      );

      return res.status(200).json({
        success: true,
        action,
        epoch_id: targetEpoch.id,
        deleted_count: totalBefore,
      });
    }

    const zoneXor = parseOptionalInt(body.char_xor ?? body.zone_xor, {
      min: 0,
      max: 99999,
      field: 'char_xor',
    });
    const zoneSlot = parseOptionalInt(body.char_slot ?? body.zone_slot, {
      min: 0,
      max: 99999,
      field: 'char_slot',
    });

    const filters = buildZoneFilters({
      epochId: targetEpoch.id,
      region,
      zoneKey: body.xor_slot_key,
      zoneXor,
      zoneSlot,
    });

    if (action === 'delete_zone') {
      const totalBefore = await countMatchingRuns(filters);
      await supabaseAdminRequest(
        buildTablePath(ZONE_RUNS_TABLE, {
          select: false,
          filters,
        }),
        {
          method: 'DELETE',
          prefer: 'return=minimal',
        }
      );

      return res.status(200).json({
        success: true,
        action,
        epoch_id: targetEpoch.id,
        deleted_count: totalBefore,
      });
    }

    if (action === 'edit_zone') {
      const targetXor = parseOptionalInt(body.new_char_xor, { min: 0, max: 99999, field: 'new_char_xor' });
      const targetSlot = parseOptionalInt(body.new_char_slot, { min: 0, max: 99999, field: 'new_char_slot' });
      const targetSum = parseOptionalInt(body.new_char_sum, { min: 0, max: 99999, field: 'new_char_sum' });

      if (targetXor === null || targetSlot === null) {
        throw new HttpError(400, 'new_char_xor and new_char_slot are required for edit_zone.');
      }

      const patchPayload = {
        char_xor: targetXor,
        char_slot: targetSlot,
        xor_slot_key: `${targetXor}_${targetSlot}`,
      };

      if (targetSum !== null) {
        patchPayload.char_sum = targetSum;
      }

      const totalBefore = await countMatchingRuns(filters);
      await supabaseAdminRequest(
        buildTablePath(ZONE_RUNS_TABLE, {
          select: false,
          filters,
        }),
        {
          method: 'PATCH',
          body: patchPayload,
          prefer: 'return=minimal',
        }
      );

      return res.status(200).json({
        success: true,
        action,
        epoch_id: targetEpoch.id,
        updated_count: totalBefore,
        zone: patchPayload,
      });
    }

    throw new HttpError(400, `Unsupported action: ${action}`);
  } catch (error) {
    return handleApiError(res, error);
  }
}
