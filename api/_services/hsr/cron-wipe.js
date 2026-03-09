import { getCavernData, saveCavernData, normalizeKey } from './cavern-clears.js';

export async function handler(req, res) {
  // 1. Verify Authentication
  // Vercel Cron sends a CRON_SECRET, but we'll also allow our ADMIN_API_KEY
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] || req.query.key;
  
  const targetSuper = normalizeKey(process.env.ADMIN_API_KEY);
  const receivedKey = normalizeKey(apiKey);

  const isVercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isAuthorized = isVercelCron || (targetSuper !== '' && receivedKey === targetSuper);

  if (!isAuthorized) {
    console.warn('[Cron Wipe] Unauthorized access attempt.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron Wipe] Executing weekly record reset...');
    
    // 2. Fetch all current blobs to delete them
    const { allBlobs } = await getCavernData();
    
    // 3. Save empty array (Nuke everything)
    await saveCavernData([], allBlobs);
    
    console.log('[Cron Wipe] Database purged successfully.');
    return res.status(200).json({ 
      success: true, 
      message: 'Weekly reset complete. All records purged.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron Wipe] Critical error during reset:', error);
    return res.status(500).json({ error: 'Internal Server Error during wipe.' });
  }
}
