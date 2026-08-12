import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as genshinStatsHandler } from '../server/_services/genshin/stats.js';
import { handler as hoyoCodesHandler } from '../server/_services/hoyo-codes.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';
import { handler as wuwaStatsHandler } from '../server/_services/wuwa/stats.js';

const GENSHIN_CURRENT_CHARACTER_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Odette_Splash.webp?v=300104-odette-20260812';
const GENSHIN_CURRENT_WEAPON_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Odette_weapon_Splash.webp?v=400103-odette-weapon-20260812';

const GENSHIN_STATS_SOURCE_CANDIDATES = {
  '400103': ['400103'],
};

function isHoyoCodesRoute(req) {
  const route = Array.isArray(req.query?.route) ? req.query.route[0] : req.query?.route;
  return route === 'hoyo-codes' || String(req.url || '').includes('/api/hoyo-codes');
}

function resolveGameFromUrl(req) {
  const url = req.url || '';
  if (url.includes('/api/genshin')) return 'genshin';
  if (url.includes('/api/wuwa')) return 'wuwa';
  return null;
}

function resolvePathPart(req) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (slug) return slug.split('/')[0];

  const candidates = [
    req.url,
    req.headers?.['x-forwarded-uri'],
    req.headers?.['x-invoke-path'],
    req.headers?.['x-matched-path'],
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const match = candidate.match(/\/(?:api\/)?(?:genshin|wuwa)\/([^/?#]+)/i);
    if (match?.[1]) return match[1];
  }

  return '';
}

function getGenshinStatsCandidates(id) {
  return Array.from(new Set(GENSHIN_STATS_SOURCE_CANDIDATES[String(id)] || [String(id)]));
}

function hasUsableGenshinStats(data, sourceId) {
  const pityArray = data?.pityCount?.legendary || [];
  const nonZeroRolls = pityArray.filter((count, index) => index > 0 && Number(count) > 0).length;
  const totalPulls = pityArray.reduce((sum, count, index) => index > 0 ? sum + Number(count || 0) : sum, 0);
  return nonZeroRolls > 0 && totalPulls > 0;
}

function transformGenshinStats(data, displayId, sourceBannerId) {
  const pityArray = data.pityCount?.legendary || [];
  const countEachPity = data.countEachPity || [];
  const by_rollnum_pulls_5 = {};
  const by_rollnum_chance_5 = {};
  let totalPulls = 0;
  const isWeaponBanner = String(displayId).startsWith('400');

  pityArray.forEach((count, index) => {
    const roll = isWeaponBanner ? index + 1 : index;
    if (!isWeaponBanner && roll === 0) return;
    by_rollnum_pulls_5[roll] = count;
    totalPulls += count;
  });

  pityArray.forEach((count, index) => {
    const roll = isWeaponBanner ? index + 1 : index;
    if (!isWeaponBanner && roll === 0) return;
    const playersAtThisPity = countEachPity[isWeaponBanner ? index : index - 1];
    if (playersAtThisPity && playersAtThisPity > 0) {
      by_rollnum_chance_5[roll] = count / playersAtThisPity;
    } else if (totalPulls > 0) {
      by_rollnum_chance_5[roll] = count / totalPulls;
    }
  });

  return {
    stats: {
      total_pulls_5: totalPulls || data.total?.legendary || 0,
      by_rollnum_pulls_5,
      by_rollnum_chance_5,
      count_win_5: 0,
      count_lose_5: 0,
      users: data.total?.users || 0,
      _genshin_raw: data,
    },
    raw: data,
    bannerId: displayId,
    sourceBannerId,
  };
}

async function sendCurrentGenshinStats(req, res) {
  let displayId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (!displayId) return res.status(400).json({ error: 'Banner ID is required' });
  if (displayId === '300093') displayId = '300094';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };
  let lastError = null;

  for (const sourceId of getGenshinStatsCandidates(displayId)) {
    try {
      const response = await fetch(`https://api.paimon.moe/wish?banner=${sourceId}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!hasUsableGenshinStats(data, sourceId)) {
        throw new Error(`Sparse Genshin stats for ${sourceId}`);
      }

      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(transformGenshinStats(data, displayId, sourceId));
    } catch (error) {
      lastError = error;
      console.warn(`[Game Proxy] Genshin stats candidate ${sourceId} failed:`, error.message);
    }
  }

  console.warn('[Game Proxy] Falling back to service Genshin stats:', lastError?.message);
  return await genshinStatsHandler(req, res);
}

function sendCurrentGenshinBanners(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  return res.status(200).json([
    {
      id: '300104_character',
      bannerId: '300104',
      name: 'Odette / Arlecchino',
      type: 'character',
      image: GENSHIN_CURRENT_CHARACTER_IMAGE,
      fallbackImage: GENSHIN_CURRENT_CHARACTER_IMAGE,
      characterId: 'odette',
      game: 'genshin',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
    {
      id: '400103_weapon',
      bannerId: '400103',
      name: "Whitelake Frostfeather / Crimson Moon's Semblance",
      type: 'weapon',
      image: GENSHIN_CURRENT_WEAPON_IMAGE,
      fallbackImage: GENSHIN_CURRENT_WEAPON_IMAGE,
      characterId: 'weapon_banner',
      game: 'genshin',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
  ]);
}

function sendCurrentWuwaBanners(res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=900');
  return res.status(200).json([
    {
      id: '100040_character',
      bannerId: '100040',
      name: 'Suisui / Aemeath',
      type: 'character',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Suisui.webp?v=100040-suisui-20260730',
      portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Suisui.webp?v=100040-suisui-20260730',
      fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Suisui.webp?v=100040-suisui-20260730',
      characterId: 'suisui',
      game: 'wuwa',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
    {
      id: '200040_weapon',
      bannerId: '200040',
      name: "Firstlight's Herald / Everbright Polestar",
      type: 'weapon',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Firstlights_Herald.webp?v=200040-firstlights-herald-20260730',
      portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Firstlights_Herald.webp?v=200040-firstlights-herald-20260730',
      fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Weapon_Firstlights_Herald.webp?v=200040-firstlights-herald-20260730',
      characterId: 'firstlights-herald',
      game: 'wuwa',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
  ]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (isHoyoCodesRoute(req)) {
    return await hoyoCodesHandler(req, res);
  }

  const game = resolveGameFromUrl(req);
  const pathPart = resolvePathPart(req);

  console.log(`[Game Proxy] Routing game: "${game}", pathPart: "${pathPart}" from URL: "${req.url}"`);

  if (!game) {
    return res.status(404).json({ error: 'Game Proxy: Unable to determine game', url: req.url });
  }

  if (game === 'genshin') {
    if (pathPart === 'banners') return sendCurrentGenshinBanners(res);
    if (pathPart === 'stats') return await sendCurrentGenshinStats(req, res);
  } else if (game === 'wuwa') {
    // URL format: /api/wuwa/banners
    if (pathPart === 'banners') return sendCurrentWuwaBanners(res);
    if (pathPart === 'stats') return await wuwaStatsHandler(req, res);
    return res.status(404).json({ error: 'WuWa Endpoint Not Found', pathPart, url: req.url });
  }

  return res.status(404).json({ error: 'Game Proxy: Unknown game', game, url: req.url });
}
