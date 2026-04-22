import { handler as bannersHandler } from '../server/_services/hsr/banners.js';
import { handler as statsHandler } from '../server/_services/hsr/stats.js';
import { handler as cavernHandler } from '../server/_services/hsr/cavern-clears.js';
import { handler as cronHandler } from '../server/_services/hsr/cron-wipe.js';
import { setCorsHeaders } from '../server/_services/zone/shared.js';

function resolvePathPart(req) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (slug) return slug;

  const candidates = [
    req.url,
    req.headers?.['x-forwarded-uri'],
    req.headers?.['x-invoke-path'],
    req.headers?.['x-matched-path'],
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const match = candidate.match(/\/api\/hsr\/([^/?#]+)/i);
    if (match?.[1]) return match[1];
  }

  const fallback = String(req.url || '').split('/').pop()?.split('?')[0] || '';
  return fallback;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pathPart = resolvePathPart(req);

  console.log(`[HSR Hub] Routing pathPart: "${pathPart}" from URL: "${req.url}"`);
  
  if (pathPart === 'cavern-clears') return cavernHandler(req, res);
  if (pathPart === 'banners') return bannersHandler(req, res);
  if (pathPart === 'stats') return statsHandler(req, res);
  if (pathPart === 'cron-wipe') return cronHandler(req, res);

  return res.status(404).json({ error: 'HSR Endpoint Not Found', pathPart, url: req.url });
}
