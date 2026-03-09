import { handler as bannersHandler } from './_services/wuwa/banners.js';
import { handler as statsHandler } from './_services/wuwa/stats.js';

export default async function handler(req, res) {
  // Hardcoded CORS - Universal Wildcard (Brute Force)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Robust Routing Logic (Internal)
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const pathPart = slug || req.url?.split('/').pop()?.split('?')[0] || '';

  console.log(`[WuWa Hub] Routing pathPart: "${pathPart}" from URL: "${req.url}"`);
  
  if (pathPart === 'banners') return bannersHandler(req, res);
  if (pathPart === 'stats') return statsHandler(req, res);

  return res.status(404).json({ error: 'WuWa Endpoint Not Found', pathPart, url: req.url });
}
