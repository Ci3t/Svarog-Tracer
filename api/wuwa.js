import { handler as bannersHandler } from './_services/wuwa/banners.js';
import { handler as statsHandler } from './_services/wuwa/stats.js';

export default async function wuwaRouter(req, res) {

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  
  if (slug === 'banners') return bannersHandler(req, res);
  if (slug === 'stats') return statsHandler(req, res);
  
  return res.status(404).json({ error: 'WuWa API endpoint not found' });
}
