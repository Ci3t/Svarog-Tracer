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
  CACHE_VERSION: 33,  // Bumped: add full HSR rerun banner set
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
  const isStarRailStationUrl = (url) => /^https?:\/\/(?:cdn\.)?starrailstation\.com\//i.test(String(url || ''));
  const srsFallback = (fetched) =>
    fetched?.starRailStationImage ||
    fetched?.starRailStationPortrait ||
    (isStarRailStationUrl(fetched?.fallbackImage) ? fetched.fallbackImage : null) ||
    (isStarRailStationUrl(fetched?.portrait) ? fetched.portrait : null) ||
    (isStarRailStationUrl(fetched?.image) ? fetched.image : null);
  const controlled = [
    {
      bannerId: '2128',
      name: 'Himeko - Nova',
      characterId: '1510',
      temporaryFallbackImage: 'http://cdn.starrailstation.com/assets/5ff941361b9b4c6db4bd75e0e538fe335fc82b37e1ba15a96a76ba8e8b510791.webp',
    },
    {
      bannerId: '2129',
      name: 'Sparxie',
      characterId: '1501',
      image: `${base}/image/character_portrait/1501.png`,
      portrait: `${raw}/image/character_portrait/1501.png`,
    },
    {
      bannerId: '2130',
      name: 'Dan Heng • Permansor Terrae',
      characterId: '1414',
      image: `${base}/image/character_portrait/1414.png`,
      portrait: `${raw}/image/character_portrait/1414.png`,
    },
    { bannerId: '2131', name: 'Evernight', characterId: '1413' },
  ];
  const controlledLightCones = [
    {
      bannerId: '3128',
      name: 'A Star That Lights the Night',
      characterId: '23060',
      temporaryFallbackImage: 'https://cdn.starrailstation.com/assets/822086d219d3678e6d25398ab76cd8933282c29f605773a63734874bdbb7b6a7.webp',
    },
    {
      bannerId: '3129',
      name: 'Dazzled by a Flowery World',
      characterId: '23053',
      image: `${base}/image/light_cone_preview/23053.png`,
      portrait: `${base}/image/light_cone_preview/23053.png`,
    },
    {
      bannerId: '3130',
      name: 'Though Worlds Apart',
      characterId: '23051',
      image: `${base}/image/light_cone_preview/23051.png`,
      portrait: `${base}/image/light_cone_preview/23051.png`,
    },
    { bannerId: '3131', name: "To Evernight's Stars", characterId: '23049' },
  ];
  const currentCharacters = controlled.map((banner) => {
    const fetched = list.find((item) => String(item.bannerId || item.id) === banner.bannerId);
    const characterId = banner.characterId;
    return {
      ...fetched,
      id: `${banner.bannerId}_character`,
      bannerId: banner.bannerId,
      name: banner.name,
      type: 'character',
      characterId,
      image: banner.image || fetched?.image || (characterId ? `${base}/icon/character/${characterId}.png` : null),
      fallbackImage: srsFallback(fetched) || banner.temporaryFallbackImage || (characterId ? `${base}/icon/character/${characterId}.png` : null),
      starRailStationImage: srsFallback(fetched) || null,
      temporaryFallbackImage: banner.temporaryFallbackImage || null,
      portrait: banner.portrait || fetched?.portrait || (characterId ? `${raw}/image/character_portrait/${characterId}.png` : null),
      altPortrait: fetched?.altPortrait || (characterId ? `${base}/image/character_portrait/${characterId}.png` : null),
      preview: fetched?.preview || (characterId ? `${base}/image/character_preview/${characterId}.png` : null),
      rarity: 5,
      game: 'hsr',
      source: fetched?.source || 'api-controlled-current',
    };
  });
  const currentLightCones = controlledLightCones.map((banner) => {
    const fetched = list.find((item) => String(item.bannerId || item.id) === banner.bannerId);
    const characterId = banner.characterId;
    const preview = characterId ? `${base}/image/light_cone_preview/${characterId}.png` : null;
    return {
      ...fetched,
      id: `${banner.bannerId}_light_cone`,
      bannerId: banner.bannerId,
      name: banner.name,
      type: 'light_cone',
      characterId,
      image: banner.image || fetched?.image || (characterId ? `${base}/icon/light_cone/${characterId}.png` : null),
      fallbackImage: srsFallback(fetched) || banner.temporaryFallbackImage || (characterId ? `${base}/icon/light_cone/${characterId}.png` : null),
      starRailStationImage: srsFallback(fetched) || null,
      temporaryFallbackImage: banner.temporaryFallbackImage || null,
      portrait: banner.portrait || fetched?.portrait || preview,
      lcPreview: fetched?.lcPreview || preview,
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

function applyCurrentWuwaBannerFloor(banners) {
  const list = Array.isArray(banners) ? banners : [];
  const characterBanner = {
    id: '100039_character',
    bannerId: '100039',
    name: 'Yangyang: Xuanling / Luuk Herssen / Lynae',
    type: 'character',
    image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
    portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
    fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
    characterId: 'yangyang-xuanling',
    game: 'wuwa',
    source: 'api-controlled-current',
    assetLocked: true,
    imageLocked: true,
  };
  const weaponBanner = {
    id: '200039_weapon',
    bannerId: '200039',
    name: "Azure Oath / Daybreaker's Spine / Spectrum Blaster",
    type: 'weapon',
    image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
    portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
    fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
    characterId: 'azure-oath',
    game: 'wuwa',
    source: 'api-controlled-current',
    assetLocked: true,
    imageLocked: true,
  };
  const findById = (bannerId) => list.find((banner) => String(banner?.bannerId || banner?.id || '') === bannerId);
  const collabBanners = list.filter((banner) => ['1000001', '1100001'].includes(String(banner?.bannerId || banner?.id || '')));
  return [
    { ...findById('100039'), ...characterBanner },
    { ...findById('200039'), ...weaponBanner },
    ...collabBanners,
  ];
}

function findStarRailStationImageUrl(value, seen = new Set()) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^https?:\/\/(?:cdn\.)?starrailstation\.com\/.+\.(?:webp|png|jpe?g)(?:\?.*)?$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }
  if (typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const nested of Object.values(value)) {
    const found = findStarRailStationImageUrl(nested, seen);
    if (found) return found;
  }
  return null;
}

async function fetchHsrStarRailStationFallbacks() {
  try {
    const response = await fetch(`https://starrailstation.com/api/v1/warp_config?_t=${Date.now()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const banners = data?.config?.banners || {};
    return ['2128', '2131', '3128', '3131'].map((bannerId) => {
      const starRailStationImage = findStarRailStationImageUrl(banners[bannerId]);
      return starRailStationImage ? { bannerId, starRailStationImage } : null;
    }).filter(Boolean);
  } catch (error) {
    console.warn('[Banners API] SRS image fallback unavailable:', error?.message || error);
    return [];
  }
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
    if (requestedGame === 'all' || requestedGame === 'hsr') {
      resultMap.hsr = [
        ...resultMap.hsr,
        ...await fetchHsrStarRailStationFallbacks(),
      ];
    }
    resultMap.hsr = applyCurrentHsrBannerFloor(resultMap.hsr);
    resultMap.genshin = applyCurrentGenshinBannerFloor(resultMap.genshin);
    resultMap.wuwa = applyCurrentWuwaBannerFloor(resultMap.wuwa);

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
