import { handler as bannersHandler } from './_services/wuwa/banners.js';
import { handler as statsHandler } from './_services/wuwa/stats.js';

export default async function handler(req, res) {
  // Hardcoded CORS - Universal Wildcard (Brute Force)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  
  if (url.includes('/banners')) return bannersHandler(req, res);
  if (url.includes('/stats')) return statsHandler(req, res);

  return res.status(404).json({ error: 'WuWa Endpoint Not Found', url });
}
