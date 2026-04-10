import {
  ZONE_FLAGS_TABLE,
  countDistinctRecentFlags,
  ensureCurrentEpoch,
  fetchCurrentEpoch,
  handleApiError,
  normalizeOptionalText,
  readRequestBody,
  requireAuthenticatedUser,
  rotateEpochFromFlag,
  supabaseAdminRequest,
} from './shared.js';

const FLAG_WINDOW_HOURS = 48;
const MIN_DISTINCT_FLAGS_TO_ROTATE = 2;

function isUniqueViolation(error) {
  const details = error?.details;
  if (!details || typeof details !== 'object') return false;
  return details.code === '23505';
}

export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = readRequestBody(req);
    const notes = normalizeOptionalText(body.notes, { field: 'notes', maxLength: 200 });

    let currentEpoch = await ensureCurrentEpoch();
    let alreadyFlagged = false;

    try {
      await supabaseAdminRequest(ZONE_FLAGS_TABLE, {
        method: 'POST',
        body: {
          epoch_id: currentEpoch.id,
          user_id: user.id,
          notes,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      alreadyFlagged = true;
    }

    const recentFlagCutoff = new Date(Date.now() - FLAG_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const distinctFlagCount = await countDistinctRecentFlags(currentEpoch.id, recentFlagCutoff);

    let didRotateEpoch = false;

    if (distinctFlagCount >= MIN_DISTINCT_FLAGS_TO_ROTATE) {
      const freshCurrent = await fetchCurrentEpoch();
      if (freshCurrent?.id === currentEpoch.id) {
        currentEpoch = await rotateEpochFromFlag(currentEpoch);
        didRotateEpoch = true;
      } else if (freshCurrent?.id) {
        currentEpoch = freshCurrent;
      }
    }

    return res.status(200).json({
      success: true,
      already_flagged: alreadyFlagged,
      did_rotate_epoch: didRotateEpoch,
      current_epoch: currentEpoch,
      pending_flag_count: didRotateEpoch ? 0 : distinctFlagCount,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
