import {
  ZONE_RUNS_TABLE,
  buildTablePath,
  buildZoneMapFromRuns,
  countDistinctRecentFlags,
  ensureCurrentEpoch,
  fetchPreviousEpoch,
  handleApiError,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

const FLAG_WINDOW_HOURS = 48;

function normalizeEpochQuery(epochValue) {
  return String(epochValue || 'current').toLowerCase() === 'previous' ? 'previous' : 'current';
}

export async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await requireAuthenticatedUser(req);

    const requestedEpoch = normalizeEpochQuery(req.query?.epoch);
    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch =
      requestedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    if (!targetEpoch?.id) {
      return res.status(200).json({
        success: true,
        requested_epoch: requestedEpoch,
        current_epoch: currentEpoch,
        epoch: null,
        pending_flag_count: 0,
        total_runs: 0,
        zones: [],
        generated_at: new Date().toISOString(),
      });
    }

    const runRows = await supabaseAdminRequest(
      buildTablePath(ZONE_RUNS_TABLE, {
        select:
          'id,submitted_at,epoch_id,slot_order,char_names,cavern,outcome,char_sum,char_xor,char_slot,xor_slot_key,notes',
        filters: {
          epoch_id: `eq.${targetEpoch.id}`,
          order: 'submitted_at.desc',
          limit: '5000',
        },
      })
    );

    const zones = buildZoneMapFromRuns(Array.isArray(runRows) ? runRows : []);

    const recentFlagCutoff = new Date(Date.now() - FLAG_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const pendingFlagCount = await countDistinctRecentFlags(currentEpoch.id, recentFlagCutoff);

    return res.status(200).json({
      success: true,
      requested_epoch: requestedEpoch,
      current_epoch: currentEpoch,
      epoch: targetEpoch,
      pending_flag_count: pendingFlagCount,
      total_runs: Array.isArray(runRows) ? runRows.length : 0,
      zones,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
