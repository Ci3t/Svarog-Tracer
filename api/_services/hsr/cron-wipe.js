import { getCavernData, saveCavernData, normalizeKey } from './cavern-clears.js';

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
    
    // 2. Fetch all current blobs to delete them
    const { allBlobs } = await getCavernData();
    
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
