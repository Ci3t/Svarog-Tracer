import { GENSHIN_BANNER_CONTROL } from '../server/_services/genshin/bannerControl.js';
import { handler as hsrBannersHandler } from '../server/_services/hsr/banners.js';
import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';

// Helper: Invoke a service handler and capture its JSON response
async function callServiceHandler(handler) {
  let capturedData = null;
  let statusCode = 200;
  const mockRes = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { capturedData = data; },
        end: () => {},
      };
    },
    setHeader: () => {},
  };
  try {
    await handler({ method: 'GET', query: {} }, mockRes);
  } catch (err) {
    console.error('[Banners API] Service handler error:', err?.message || err);
    return [];
  }
  // If handler returned error status, treat as empty
  if (statusCode >= 400) {
    console.warn(`[Banners API] Service returned HTTP ${statusCode}`);
    return [];
  }
  return capturedData || [];
}

// =========================================================================
// CONFIG
// =========================================================================
const CONFIG = {
  CACHE_MINUTES: 15,
  CACHE_VERSION: 15,  // Bumped: fix Lucy asset casing and image retry loop
  TIMEOUT_MS: 8000,
};

const CACHE_DURATION = CONFIG.CACHE_MINUTES * 60 * 1000;

// =========================================================================
// CACHE
// =========================================================================
let BANNER_CACHE = {
  data: null,
  timestamp: 0,
  version: CONFIG.CACHE_VERSION,
  game: 'all'
};

function normalizeGameQuery(value) {
  if (!value) return 'all';
  const v = String(value).toLowerCase().trim();
  if (['hsr', 'honkai', 'starrail', 'star-rail'].includes(v)) return 'hsr';
  if (['genshin', 'gi', 'genshin-impact'].includes(v)) return 'genshin';
  if (['wuwa', 'wuthering', 'wuthering-waves'].includes(v)) return 'wuwa';
  if (['zzz', 'zenless', 'zenless-zone-zero'].includes(v)) return 'zzz';
  return 'all';
}

// =========================================================================
// MAIN HANDLER - Delegates to individual game services
// Each service now handles its own image resolution:
//   Cloudinary assets (primary) ΓåÆ Fetched API images (fallback)
// =========================================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=900');
  res.setHeader('CDN-Cache-Control', 'public, s-maxage=900, stale-while-revalidate=900');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=900, stale-while-revalidate=900');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedGame = normalizeGameQuery(req.query?.game);

    // Check cache (validate both time AND version)
    const cacheValid = BANNER_CACHE.data &&
      BANNER_CACHE.version === CONFIG.CACHE_VERSION &&
      BANNER_CACHE.game === requestedGame &&
      (Date.now() - BANNER_CACHE.timestamp < CACHE_DURATION);

    if (cacheValid) {
      console.log('[Banners API] Returning cached data (v' + CONFIG.CACHE_VERSION + ')');
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-Version', CONFIG.CACHE_VERSION);
      return res.status(200).json(BANNER_CACHE.data);
    }

    if (BANNER_CACHE.data && BANNER_CACHE.version !== CONFIG.CACHE_VERSION) {
      console.log('[Banners API] Cache version mismatch - invalidating old cache');
    }

    console.log(`[Banners API] Fetching fresh data for ${requestedGame}...`);

    // Delegate to individual game services (each uses Cloudinary primary, fetched fallback)
    const tasks = [];
    if (requestedGame === 'all' || requestedGame === 'hsr') {
      tasks.push(['hsr', callServiceHandler(hsrBannersHandler)]);
    }
    if (requestedGame === 'all' || requestedGame === 'genshin') {
      tasks.push(['genshin', callServiceHandler(genshinBannersHandler)]);
    }
    if (requestedGame === 'all' || requestedGame === 'wuwa') {
      tasks.push(['wuwa', callServiceHandler(wuwaBannersHandler)]);
    }

    const settled = await Promise.allSettled(tasks.map(([, promise]) => promise));
    const resultMap = { hsr: [], genshin: [], wuwa: [] };

    tasks.forEach(([game], index) => {
      const result = settled[index];
      if (result.status === 'fulfilled') {
        resultMap[game] = result.value;
      } else {
        console.error(`[Banners API] ${game} failed:`, result.reason?.message || result.reason);
        resultMap[game] = [];
      }
    });

    const response = {
      ...(requestedGame === 'all' || requestedGame === 'hsr') && { hsr: resultMap.hsr },
      ...(requestedGame === 'all' || requestedGame === 'genshin') && { genshin: resultMap.genshin },
      ...(requestedGame === 'all' || requestedGame === 'wuwa') && { wuwa: resultMap.wuwa },
      lastUpdate: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString()
    };

    // Update cache
    BANNER_CACHE = {
      data: response,
      timestamp: Date.now(),
      version: CONFIG.CACHE_VERSION,
      game: requestedGame
    };

    console.log(`[Banners API] Success! HSR:${response.hsr?.length || 0} Genshin:${response.genshin?.length || 0} WuWa:${response.wuwa?.length || 0}`);

    res.setHeader('X-Cache-Status', 'MISS');
    return res.status(200).json(response);

  } catch (error) {
    console.error('[Banners API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch banner data',
      message: error.message
    });
  }
}
