import { handler as statsHandler } from '../../server/_services/hsr/stats.js';
import { setCorsHeaders } from '../../server/_services/zone/shared.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return statsHandler(req, res);
}
