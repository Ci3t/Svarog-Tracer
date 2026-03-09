import { handler as bannersHandler } from './_services/hsr/banners.js';
import { handler as statsHandler } from './_services/hsr/stats.js';
import { handler as cavernHandler } from './_services/hsr/cavern-clears.js';
import { handler as cronHandler } from './_services/hsr/cron-wipe.js';

export default async function handler(req, res) {
  // Hardcoded CORS - Universal Wildcard (Brute Force)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Basic Routing Logic (Internal)
  // Vercel Rewrites will route /api/hsr/xyz to this file.
  // We can check the URL or req.query.slug if we used :slug*
  const url = req.url || '';
  
  if (url.includes('/cavern-clears')) return cavernHandler(req, res);
  if (url.includes('/banners')) return bannersHandler(req, res);
  if (url.includes('/stats')) return statsHandler(req, res);
  if (url.includes('/cron-wipe')) return cronHandler(req, res);

  return res.status(404).json({ error: 'HSR Endpoint Not Found', url });
}
