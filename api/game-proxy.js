import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as genshinStatsHandler } from '../server/_services/genshin/stats.js';
import { handler as hoyoCodesHandler } from '../server/_services/hoyo-codes.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';
import { handler as wuwaStatsHandler } from '../server/_services/wuwa/stats.js';

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

function sendCurrentGenshinBanners(res) {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=900');
  return res.status(200).json([
    {
      id: '300102_character',
      bannerId: '300102',
      name: 'Sandrone / Citlali',
      type: 'character',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_Splash.webp?v=300102-sandrone-splash-20260701',
      fallbackImage: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_Splash.webp?v=300102-sandrone-splash-20260701',
      characterId: 'sandrone',
      game: 'genshin',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
    {
      id: '400101_weapon',
      bannerId: '400101',
      name: "A Teaspoon of Transcendence / Starcaller's Watch",
      type: 'weapon',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_weapon_Splash.webp?v=400101-sandrone-weapon-splash-20260701',
      fallbackImage: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Sandrone_weapon_Splash.webp?v=400101-sandrone-weapon-splash-20260701',
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
      id: '100039_character',
      bannerId: '100039',
      name: 'Yangyang: Xuanling / Luuk Herssen / Lynae',
      type: 'character',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
      portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
      fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Yangyang_Xuanling.webp?v=100039-yangyang-xuanling-20260711',
      characterId: 'yangyang-xuanling',
      game: 'wuwa',
      source: 'proxy-controlled-current',
      assetLocked: true,
      imageLocked: true,
    },
    {
      id: '200039_weapon',
      bannerId: '200039',
      name: "Azure Oath / Daybreaker's Spine / Spectrum Blaster",
      type: 'weapon',
      image: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
      portrait: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
      fallbackImage: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Weapon_Azure_Oath.webp?v=200039-azure-oath-20260711',
      characterId: 'azure-oath',
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
    if (pathPart === 'stats') return await genshinStatsHandler(req, res);
  } else if (game === 'wuwa') {
    // URL format: /api/wuwa/banners
    if (pathPart === 'banners') return sendCurrentWuwaBanners(res);
    if (pathPart === 'stats') return await wuwaStatsHandler(req, res);
    return res.status(404).json({ error: 'WuWa Endpoint Not Found', pathPart, url: req.url });
  }

  return res.status(404).json({ error: 'Game Proxy: Unknown game', game, url: req.url });
}
