import { handler as submitHandler } from './_services/zone/submit.js';
import { handler as mapHandler } from './_services/zone/map.js';
import { handler as flagEpochHandler } from './_services/zone/flag-epoch.js';
import { handler as variantsHandler } from './_services/zone/variants.js';
import { handler as nearbyHandler } from './_services/zone/nearby.js';
import { handler as ownedHandler } from './_services/zone/owned.js';
import { handler as exportHandler } from './_services/zone/export.js';
import { handler as logRunsHandler } from './_services/zone/log-runs.js';
import { handler as adminRunsHandler } from './_services/zone/admin-runs.js';
import { setCorsHeaders } from './_services/zone/shared.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const pathPart = slug || req.url?.split('/').pop()?.split('?')[0] || '';

  if (pathPart === 'submit') return submitHandler(req, res);
  if (pathPart === 'map') return mapHandler(req, res);
  if (pathPart === 'flag-epoch') return flagEpochHandler(req, res);
  if (pathPart === 'variants') return variantsHandler(req, res);
  if (pathPart === 'nearby') return nearbyHandler(req, res);
  if (pathPart === 'owned') return ownedHandler(req, res);
  if (pathPart === 'export') return exportHandler(req, res);
  if (pathPart === 'log-runs') return logRunsHandler(req, res);
  if (pathPart === 'admin-runs') return adminRunsHandler(req, res);

  return res.status(404).json({ error: 'Zone endpoint not found.', pathPart, url: req.url });
}
