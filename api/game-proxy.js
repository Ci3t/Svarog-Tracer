import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as genshinStatsHandler } from '../server/_services/genshin/stats.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';
import { handler as wuwaStatsHandler } from '../server/_services/wuwa/stats.js';

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const game = resolveGameFromUrl(req);
  const pathPart = resolvePathPart(req);

  console.log(`[Game Proxy] Routing game: "${game}", pathPart: "${pathPart}" from URL: "${req.url}"`);

  if (!game) {
    return res.status(404).json({ error: 'Game Proxy: Unable to determine game', url: req.url });
  }

  if (game === 'genshin') {
    if (pathPart === 'banners') return await genshinBannersHandler(req, res);
    if (pathPart === 'stats') return await genshinStatsHandler(req, res);
  } else if (game === 'wuwa') {
    // URL format: /api/wuwa/banners
    if (pathPart === 'banners') return await wuwaBannersHandler(req, res);
    if (pathPart === 'stats') return await wuwaStatsHandler(req, res);
    return res.status(404).json({ error: 'WuWa Endpoint Not Found', pathPart, url: req.url });
  }

  return res.status(404).json({ error: 'Game Proxy: Unknown game', game, url: req.url });
}
