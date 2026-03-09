import { handler as bannersHandler } from './_services/hsr/banners.js';
import { handler as statsHandler } from './_services/hsr/stats.js';
import { handler as cavernHandler } from './_services/hsr/cavern-clears.js';
import { handler as cronHandler } from './_services/hsr/cron-wipe.js';

export default async function hsrRouter(req, res) {

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;
  
  if (slug === 'banners') return bannersHandler(req, res);
  if (slug === 'stats') return statsHandler(req, res);
  if (slug === 'cavern-clears') return cavernHandler(req, res);
  if (slug === 'cron-wipe') return cronHandler(req, res);
  
  return res.status(404).json({ error: 'HSR API endpoint not found' });
}
