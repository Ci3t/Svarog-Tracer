import {
  ZONE_RUNS_TABLE,
  buildTablePath,
  getDiscordProviderIds,
  handleApiError,
  isZoneAdminUser,
  normalizeIntegerQuery,
  requireAuthenticatedUser,
  supabaseAdminRequest,
} from './shared.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatSlotOrder(slotOrder) {
  return safeArray(slotOrder).map((value) => Number(value)).join('-');
}

function formatCharNames(charNames) {
  return safeArray(charNames).map((value) => String(value || '').trim()).filter(Boolean).join(' / ');
}

function normalizeScope(value) {
  return String(value || '').trim().toLowerCase() === 'all' ? 'all' : 'self';
}

function buildExportText({ viewerId, exportScope, runs, generatedAtIso }) {
  const lines = [];

  lines.push('SVAROG ZONE TRACKER DEBUG EXPORT');
  lines.push(`generated_at_utc: ${generatedAtIso}`);
  lines.push(`viewer_user_id: ${viewerId}`);
  lines.push(`export_scope: ${exportScope}`);
  lines.push(`total_runs: ${runs.length}`);
  lines.push('format_version: zone-export-v2');
  lines.push('');

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index] || {};

    lines.push(`RUN #${index + 1}`);
    lines.push(`id: ${run.id || ''}`);
    lines.push(`run_user_id: ${run.user_id || ''}`);
    lines.push(`submitted_at: ${run.submitted_at || ''}`);
    lines.push(`epoch_id: ${run.epoch_id || ''}`);
    lines.push(`server_region: ${run.server_region || ''}`);
    lines.push(`outcome: ${run.outcome || ''}`);
    lines.push(`cavern: ${run.cavern || ''}`);
    lines.push(`xor_slot_key: ${run.xor_slot_key || ''}`);
    lines.push(`char_sum: ${run.char_sum ?? ''}`);
    lines.push(`char_xor: ${run.char_xor ?? ''}`);
    lines.push(`char_slot: ${run.char_slot ?? ''}`);
    lines.push(`slot_order: ${formatSlotOrder(run.slot_order)}`);
    lines.push(`char_names: ${formatCharNames(run.char_names)}`);
    lines.push(`notes: ${run.notes || ''}`);
    lines.push(`relic_data_json: ${JSON.stringify(run.relic_data || null)}`);
    lines.push('---');
  }

  lines.push('');
  lines.push('JSONL_MIRROR_BEGIN');

  for (const run of runs) {
    lines.push(
      JSON.stringify({
        id: run.id || null,
        user_id: run.user_id || null,
        submitted_at: run.submitted_at || null,
        epoch_id: run.epoch_id || null,
        server_region: run.server_region || null,
        outcome: run.outcome || null,
        cavern: run.cavern || null,
        xor_slot_key: run.xor_slot_key || null,
        char_sum: run.char_sum ?? null,
        char_xor: run.char_xor ?? null,
        char_slot: run.char_slot ?? null,
        slot_order: safeArray(run.slot_order),
        char_names: safeArray(run.char_names),
        notes: run.notes || null,
        relic_data: run.relic_data || null,
      })
    );
  }

  lines.push('JSONL_MIRROR_END');

  return `${lines.join('\n')}\n`;
}

function buildFilename(generatedAtIso, exportScope) {
  const safe = generatedAtIso.replace(/[:]/g, '-').replace(/\./g, '-');
  return `zone-debug-export-${exportScope}-${safe}.txt`;
}

export async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const isAdmin = isZoneAdminUser(user);

    if (String(req.query?.status || '').trim().toLowerCase() === 'true') {
      return res.status(200).json({
        success: true,
        is_admin: isAdmin,
        discord_provider_ids: getDiscordProviderIds(user),
      });
    }

    const exportScope = normalizeScope(req.query?.scope);
    if (exportScope === 'all' && !isAdmin) {
      return res.status(403).json({ error: 'Admin scope denied.' });
    }

    const limit = normalizeIntegerQuery(req.query?.limit, {
      field: 'limit',
      min: 1,
      max: 5000,
      fallback: 1500,
    });

    const filters = {
      order: 'submitted_at.desc',
      limit: String(limit),
    };

    if (exportScope === 'self') {
      filters.user_id = `eq.${user.id}`;
    }

    const runRows = await supabaseAdminRequest(
      buildTablePath(ZONE_RUNS_TABLE, {
        select:
          'id,user_id,submitted_at,epoch_id,slot_order,char_names,cavern,outcome,char_sum,char_xor,char_slot,xor_slot_key,notes,server_region,relic_data',
        filters,
      })
    );

    const runs = Array.isArray(runRows) ? runRows : [];
    const generatedAtIso = new Date().toISOString();
    const text = buildExportText({
      viewerId: user.id,
      exportScope,
      runs,
      generatedAtIso,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildFilename(generatedAtIso, exportScope)}"`);
    return res.status(200).send(text);
  } catch (error) {
    return handleApiError(res, error);
  }
}
