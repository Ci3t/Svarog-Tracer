import { handler as bannersHandler } from '../_services/wuwa/banners.js';

export default async function handler(req, res) {
  // Hardcoded CORS - Universal Wildcard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return bannersHandler(req, res);
}
