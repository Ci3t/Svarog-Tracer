import {
  ZONE_RUNS_TABLE,
  buildTablePath,
  computeHash,
  ensureCurrentEpoch,
  handleApiError,
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

function normalizeCavern(value) {
  return normalizeOptionalText(value, { field: 'cavern', maxLength: 120 });
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

    const insertRows = await supabaseAdminRequest(ZONE_RUNS_TABLE, {
      method: 'POST',
      body: {
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
      },
    });

    const createdRun = Array.isArray(insertRows) ? insertRows[0] : insertRows;

    return res.status(201).json({
      success: true,
      epoch_id: currentEpoch.id,
      run: createdRun,
      refresh_token: `${currentEpoch.id}:${Date.now()}`,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
