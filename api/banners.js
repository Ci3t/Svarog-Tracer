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
  CACHE_VERSION: 24,  // Bumped: update Genshin current banners to 300102/400101
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

function applyCurrentHsrBannerFloor(banners) {
  const list = Array.isArray(banners) ? banners : [];
  const base = 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master';
  const raw = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';
  const controlled = [
    { bannerId: '2127', name: 'Phainon', characterId: '1408' },
    { bannerId: '2126', name: 'Cyrene', characterId: '1415' },
  ];
  const controlledLightCones = [
    { bannerId: '3127', name: 'Thus Burns the Dawn', characterId: '23044' },
    { bannerId: '3126', name: 'This Love, Forever', characterId: '23052' },
  ];
  const currentCharacters = controlled.map((banner) => {
    const fetched = list.find((item) => String(item.bannerId || item.id) === banner.bannerId);
    return {
      ...fetched,
      id: `${banner.bannerId}_character`,
      bannerId: banner.bannerId,
      name: banner.name,
      type: 'character',
      characterId: banner.characterId,
      image: fetched?.image || `${base}/icon/character/${banner.characterId}.png`,
      fallbackImage: fetched?.fallbackImage || `${base}/icon/character/${banner.characterId}.png`,
      portrait: fetched?.portrait || `${raw}/image/character_portrait/${banner.characterId}.png`,
      altPortrait: fetched?.altPortrait || `${base}/image/character_portrait/${banner.characterId}.png`,
      preview: fetched?.preview || `${base}/image/character_preview/${banner.characterId}.png`,
      rarity: 5,
      game: 'hsr',
      source: fetched?.source || 'api-controlled-current',
    };
  });
  const currentLightCones = controlledLightCones.map((banner) => {
    const fetched = list.find((item) => String(item.bannerId || item.id) === banner.bannerId);
    const preview = `${base}/image/light_cone_preview/${banner.characterId}.png`;
    return {
      ...fetched,
      id: `${banner.bannerId}_light_cone`,
      bannerId: banner.bannerId,
      name: banner.name,
      type: 'light_cone',
      characterId: banner.characterId,
      image: `${base}/icon/light_cone/${banner.characterId}.png`,
      fallbackImage: `${base}/icon/light_cone/${banner.characterId}.png`,
      portrait: preview,
      lcPreview: preview,
      rarity: 5,
      game: 'hsr',
      source: fetched?.source || 'api-controlled-current',
    };
  });
  return [...currentCharacters, ...currentLightCones];
}

function applyCurrentGenshinBannerFloor(banners) {
  const list = Array.isArray(banners) ? banners : [];
  const characterBanner = {
    id: '300102_character',
    bannerId: '300102',
    name: 'Sandrone / Citlali',
    type: 'character',
    image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_Splash.webp?v=300102-sandrone-splash-20260701',
    fallbackImage: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_Splash.webp?v=300102-sandrone-splash-20260701',
    characterId: 'sandrone',
    game: 'genshin',
    source: 'api-controlled-current',
  };
  const weaponBanner = {
    id: '400101_weapon',
    bannerId: '400101',
    name: "A Teaspoon of Transcendence / Starcaller's Watch",
    type: 'weapon',
    image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_weapon_Splash.webp?v=400101-sandrone-weapon-splash-20260701',
    fallbackImage: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_weapon_Splash.webp?v=400101-sandrone-weapon-splash-20260701',
    characterId: 'weapon_banner',
    game: 'genshin',
    source: 'api-controlled-current',
  };
  const findById = (bannerId) => list.find((banner) => String(banner?.bannerId || banner?.id || '') === bannerId);
  return [
    { ...findById('300102'), ...characterBanner },
    { ...findById('400101'), ...weaponBanner },
  ];
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
    resultMap.hsr = applyCurrentHsrBannerFloor(resultMap.hsr);
    resultMap.genshin = applyCurrentGenshinBannerFloor(resultMap.genshin);

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
