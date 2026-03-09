import { handler as bannersHandler } from './_services/wuwa/banners.js';
import { handler as statsHandler } from './_services/wuwa/stats.js';

export default async function wuwaRouter(req, res) {
  // CORS Headers
  const origin = req.headers.origin;
  if (origin === 'https://ci3t.github.io' || origin?.startsWith('https://ci3t.github.io') || origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, x-api-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  
  if (slug === 'banners') return bannersHandler(req, res);
  if (slug === 'stats') return statsHandler(req, res);
  
  return res.status(404).json({ error: 'WuWa API endpoint not found' });
}
