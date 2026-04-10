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

function formatClearTime(secondsValue) {
  const seconds = Number(secondsValue);
  if (!Number.isFinite(seconds) || seconds <= 0) return 'n/a';
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function summarizeRelics(relicData) {
  const relics = safeArray(relicData?.relics);
  if (relics.length === 0) return ['  none'];

  return relics.map((relic, index) => {
    const piece = String(relic?.piece || `Relic ${index + 1}`).trim();
    const main = String(relic?.mainStat || relic?.main_stat || 'unknown').trim();
    const subs = safeArray(relic?.substats).map((value) => String(value || '').trim()).filter(Boolean);
    const subLine = subs.length > 0 ? subs.join(', ') : 'none';
    return `  ${index + 1}. ${piece} | main: ${main} | subs: ${subLine}`;
  });
}

function buildDivider(char = '=') {
  return char.repeat(72);
}

function normalizeScope(value) {
  return String(value || '').trim().toLowerCase() === 'all' ? 'all' : 'self';
}

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
    'user_id',
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

function buildExportText({ viewerId, exportScope, runs, generatedAtIso }) {
  const lines = [];

  lines.push('SVAROG ZONE TRACKER DEBUG EXPORT');
  lines.push(buildDivider());
  lines.push(`Generated UTC : ${generatedAtIso}`);
  lines.push(`Viewer User   : ${viewerId}`);
  lines.push(`Export Scope  : ${exportScope}`);
  lines.push(`Total Runs    : ${runs.length}`);
  lines.push('Format        : zone-export-v3');
  lines.push('');
  lines.push('Legend');
  lines.push('- Zone = char_xor');
  lines.push('- Slot = char_slot');
  lines.push('- Team = char_sum');
  lines.push('- xor_slot_key = combined zone/slot key');
  lines.push('');

  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index] || {};
    const relicData = run.relic_data || null;

    lines.push(buildDivider());
    lines.push(`RUN #${index + 1}`);
    lines.push(buildDivider('-'));
    lines.push(`Team         : ${formatCharNames(run.char_names) || 'n/a'}`);
    lines.push(`Slot Order   : ${formatSlotOrder(run.slot_order) || 'n/a'}`);
    lines.push(`Zone / Slot / Team : ${run.char_xor ?? 'n/a'} / ${run.char_slot ?? 'n/a'} / ${run.char_sum ?? 'n/a'}`);
    lines.push(`Key          : ${run.xor_slot_key || 'n/a'}`);
    lines.push('');
    lines.push(`Run ID       : ${run.id || 'n/a'}`);
    lines.push(`User ID      : ${run.user_id || 'n/a'}`);
    lines.push(`Submitted    : ${run.submitted_at || 'n/a'}`);
    lines.push(`Epoch        : ${run.epoch_id || 'n/a'}`);
    lines.push(`Region       : ${run.server_region || 'n/a'}`);
    lines.push(`Cavern       : ${run.cavern || 'n/a'}`);
    lines.push(`Outcome      : ${run.outcome || 'n/a'}`);
    lines.push(`Clear Time   : ${formatClearTime(run.clear_time_seconds)}`);
    lines.push(`Notes        : ${run.notes || '-'}`);
    lines.push('');
    lines.push('Relic Summary');
    lines.push(...summarizeRelics(relicData));
    lines.push('');
    lines.push('Raw Relic JSON');
    lines.push(JSON.stringify(relicData, null, 2));
    lines.push('');
  }

  lines.push(buildDivider());
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
        clear_time_seconds: run.clear_time_seconds ?? null,
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

    let clearTimeColumnMissing = false;
    let runRows = [];
    let lastError = null;

    for (const attempt of [{ includeClearTime: true }, { includeClearTime: false }]) {
      try {
        runRows = await supabaseAdminRequest(
          buildTablePath(ZONE_RUNS_TABLE, {
            select: buildSelectFields(attempt),
            filters,
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
