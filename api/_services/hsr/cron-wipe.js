import {
  archiveCurrentWeekSnapshot,
  getCavernData,
  saveCavernData,
  normalizeKey,
  writeCavernAuditEvent,
} from './cavern-clears.js';

function getUtcWindowState(now = new Date()) {
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const inScheduledWindow = utcDay === 1 && utcHour === 6;
  return {
    utcDay,
    utcHour,
    utcMinute,
    inScheduledWindow,
    iso: now.toISOString(),
  };
}

export async function handler(req, res) {
  // 1. Verify Authentication
  // Vercel Cron sends a CRON_SECRET, but we'll also allow our ADMIN_API_KEY
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] || req.query.key;
  
  const targetSuper = normalizeKey(process.env.ADMIN_API_KEY);
  const receivedKey = normalizeKey(apiKey);

  const isVercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isAuthorized = isVercelCron || (targetSuper !== '' && receivedKey === targetSuper);
  const force = String(req.query.force || '').trim().toLowerCase() === 'true';
  const timeState = getUtcWindowState(new Date());

  if (!isAuthorized) {
    console.warn('[Cron Wipe] Unauthorized access attempt.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!timeState.inScheduledWindow && !force) {
    console.warn('[Cron Wipe] Refused outside scheduled Monday 06:00 UTC window.', timeState);
    await writeCavernAuditEvent({
      event_type: 'weekly_reset_blocked',
      route: '/api/hsr/cron-wipe',
      method: req.method,
      actor_type: isVercelCron ? 'cron' : 'admin',
      week_key: timeState.iso.slice(0, 10),
      details: {
        forced: force,
        now_utc: timeState.iso,
        reason: 'outside_scheduled_window',
      },
    });
    return res.status(409).json({
      error: 'Refused outside scheduled weekly wipe window.',
      scheduled_window: 'Monday 06:00-06:59 UTC',
      now_utc: timeState.iso,
    });
  }

  try {
    console.log('[Cron Wipe] Executing weekly record reset...', {
      nowUtc: timeState.iso,
      forced: force,
      viaCronSecret: Boolean(isVercelCron),
    });
    
    // 2. Snapshot outgoing week before clearing the live table
    const { data, allBlobs } = await getCavernData();
    await archiveCurrentWeekSnapshot(data, undefined, force ? 'manual_forced_reset' : 'weekly_reset');
    await writeCavernAuditEvent({
      event_type: force ? 'weekly_reset_forced' : 'weekly_reset',
      route: '/api/hsr/cron-wipe',
      method: req.method,
      actor_type: isVercelCron ? 'cron' : 'admin',
      week_key: timeState.iso.slice(0, 10),
      rows_before: Array.isArray(data) ? data.length : 0,
      rows_after: 0,
      details: {
        forced: force,
        via_cron_secret: Boolean(isVercelCron),
        now_utc: timeState.iso,
      },
    });
    
    // 3. Save empty array (Nuke everything)
    await saveCavernData([], allBlobs);
    
    console.log('[Cron Wipe] Database purged successfully.');
    return res.status(200).json({ 
      success: true, 
      message: 'Weekly reset complete. All records purged.',
      timestamp: new Date().toISOString(),
      forced: force,
    });
  } catch (error) {
    console.error('[Cron Wipe] Critical error during reset:', error);
    return res.status(500).json({ error: 'Internal Server Error during wipe.' });
  }
}
