import { handler as submitHandler } from './_services/zone/submit.js';
import { handler as mapHandler } from './_services/zone/map.js';
import { handler as flagEpochHandler } from './_services/zone/flag-epoch.js';
import { setCorsHeaders } from './_services/zone/shared.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const pathPart = slug || req.url?.split('/').pop()?.split('?')[0] || '';

  console.log(`[Zone Hub] Routing pathPart: "${pathPart}" from URL: "${req.url}"`);

  if (pathPart === 'submit') return submitHandler(req, res);
  if (pathPart === 'map') return mapHandler(req, res);
  if (pathPart === 'flag-epoch') return flagEpochHandler(req, res);

  return res.status(404).json({ error: 'Zone endpoint not found.', pathPart, url: req.url });
}
