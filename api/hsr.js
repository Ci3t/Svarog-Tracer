import { handler as bannersHandler } from '../server/_services/hsr/banners.js';
import { handler as statsHandler } from '../server/_services/hsr/stats.js';
import { handler as cavernHandler } from '../server/_services/hsr/cavern-clears.js';
import { handler as cronHandler } from '../server/_services/hsr/cron-wipe.js';

export default async function handler(req, res) {
  // Hardcoded CORS - Universal Wildcard (Brute Force)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Robust Routing Logic (Internal)
  // Source: /api/hsr/:slug* -> req.query.slug is an array or string
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const pathPart = slug || req.url?.split('/').pop()?.split('?')[0] || '';

  console.log(`[HSR Hub] Routing pathPart: "${pathPart}" from URL: "${req.url}"`);
  
  if (pathPart === 'cavern-clears') return cavernHandler(req, res);
  if (pathPart === 'banners') return bannersHandler(req, res);
  if (pathPart === 'stats') return statsHandler(req, res);
  if (pathPart === 'cron-wipe') return cronHandler(req, res);

  return res.status(404).json({ error: 'HSR Endpoint Not Found', pathPart, url: req.url });
}
