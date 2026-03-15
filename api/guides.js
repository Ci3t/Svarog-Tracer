import staticGuides from '../src/data/guides.json' with { type: 'json' };

const STATIC_GUIDES = staticGuides;

function getAdminSecret() {
  const rawPass = process.env.HSR_ADMIN_PASS || process.env.ADMIN_API_KEY || '';
  return String(rawPass).replace(/['"]/g, '').trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const normalizedPass = getAdminSecret();

  if (req.method === 'GET') {
    const verify = (req.query?.verify || '').trim();

    if (verify !== '') {
      return res.status(200).json({ valid: verify === normalizedPass });
    }

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(STATIC_GUIDES);
  }

  if (req.method === 'POST' && req.body?.verify !== undefined) {
    const providedPass = String(req.body.verify || '').trim();
    return res.status(200).json({ valid: providedPass === normalizedPass });
  }

  return res.status(405).json({
    error: 'Guides are now static.',
    message: 'Update src/data/guides.json and redeploy to change guide links.',
  });
}
