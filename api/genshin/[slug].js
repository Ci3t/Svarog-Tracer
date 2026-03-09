import { handler as bannersHandler } from '../_services/genshin/banners.js';
import { handler as statsHandler } from '../_services/genshin/stats.js';

export default async function genshinRouter(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  
  if (slug === 'banners') return bannersHandler(req, res);
  if (slug === 'stats') return statsHandler(req, res);
  
  return res.status(404).json({ error: 'Genshin API endpoint not found' });
}
