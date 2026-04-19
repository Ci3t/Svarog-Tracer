/**
 * WuWa Banners API Endpoint
 * Fetches live WuWa banners from WuWa Tracker
 */

const WUWA_KNOWN_BANNERS = Object.freeze({
  '100030': {
    name: 'Lynae',
    type: 'character',
  },
  '200002': {
    name: 'Stringmaster',
    type: 'weapon',
  },
  '100034': {
    name: 'Sigrika',
    type: 'character',
  },
  '200034': {
    name: 'Solsworn Ciphers',
    type: 'weapon',
  },
});

const CURRENT_WUWA_BANNER_PRIORITY = Object.freeze({
  character: Object.freeze(['100030']),
  weapon: Object.freeze(['200002']),
});

function pickPreferredWuWaBanner(banners, type) {
  const pool = banners.filter((banner) => banner.type === type);
  if (pool.length === 0) return null;

  const priorities = CURRENT_WUWA_BANNER_PRIORITY[type] || [];
  for (const bannerId of priorities) {
    const exact = pool.find((banner) => String(banner.bannerId) === String(bannerId));
    if (exact) return exact;
  }

  return pool.sort((a, b) => String(b.bannerId).localeCompare(String(a.bannerId)))[0] || null;
}

function slugifyBannerName(value) {
  // For composite names like "Sigrika & Qiuyuan", use only the first name for the slug
  const firstName = String(value || '').split('&')[0].trim();
  return firstName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildWuWaImageUrl(folder, fileName) {
  return `https://wuwatracker.com/_next/image?url=${encodeURIComponent(`/api/${folder}/file/${fileName}`)}&w=828&q=75`;
}

function extractWuWaImageFromHtml(html) {
  const patterns = [
    /\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"'\\\s>]+/gi,
    /\/api\/(?:character|weapon)-portraits\/file\/[^"'\\\s>]+/gi,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[0]) continue;
    
    // Fix malformed URLs (e.g. &amp; instead of &) and escape sequences
    const raw = match[0]
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/\\/g, '');
      
    if (raw.startsWith('/_next/image')) {
      return raw.startsWith('http') ? raw : `https://wuwatracker.com${raw}`;
    }
    const cleaned = raw.replace(/^\/+/, '');
    return `https://wuwatracker.com/${cleaned}`;
  }

  return null;
}

export async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('[WuWa Banners API] Fetching live banners...');
    
    const response = await fetch('https://wuwatracker.com/tracker/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const banners = [];
    const seenIds = new Set();
    let idMatch;
    
    while ((idMatch = idPattern.exec(html)) !== null) {
      const bannerId = idMatch[1];
      const isCharacter = bannerId.startsWith('100');
      const isWeapon = bannerId.startsWith('101') || bannerId.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);
      
      const pos = idMatch.index;
      const forward = html.substring(pos, pos + 3000);
      
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';
      
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const bannerName = nameMatch ? nameMatch[1] : 'Unknown Banner';
      const resolvedName = WUWA_KNOWN_BANNERS[bannerId]?.name || bannerName;
      
      if (bannerName.toLowerCase().includes('standard')) continue;
      
      const type = poolType.includes('character') ? 'character' : 
                   (poolType.includes('weapon') ? 'weapon' : 
                   (isCharacter ? 'character' : 'weapon'));
      
      // OPTIMIZATION: Predictable image URLs to avoid per-banner sub-fetches
      const slug = slugifyBannerName(resolvedName);
      const folder = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const ext = type === 'character' ? 'webp' : 'png';
      const image = buildWuWaImageUrl(folder, `${slug}-portrait.${ext}`);
      
      banners.push({
        id: `${bannerId}_${type}`,
        bannerId,
        name: resolvedName,
        type,
        image,
        game: 'wuwa'
      });
    }
    
    // Emergency Fallbacks for current reruns / direct active banners
    if (!banners.some(b => b.id.includes('100030')) && html.includes('Lynae')) {
      banners.push({
        id: '100030_character',
        bannerId: '100030',
        name: 'Lynae',
        type: 'character',
        image: buildWuWaImageUrl('character-portraits', 'lynae-portrait.webp'),
        game: 'wuwa'
      });
    }

    if (!banners.some(b => b.id.includes('200002')) && html.includes('Stringmaster')) {
      banners.push({
        id: '200002_weapon',
        bannerId: '200002',
        name: 'Stringmaster',
        type: 'weapon',
        image: buildWuWaImageUrl('weapon-portraits', 'stringmaster-portrait.png'),
        game: 'wuwa'
      });
    }

    // Legacy emergency fallback
    if (!banners.some(b => b.id.includes('100034')) && html.includes('Sigrika')) {
      banners.push({
        id: '100034_character',
        bannerId: '100034',
        name: 'Sigrika',
        type: 'character',
        image: buildWuWaImageUrl('character-portraits', 'sigrika-portrait.webp'),
        game: 'wuwa'
      });
    }

    if (!banners.some(b => b.id.includes('200034')) && (html.includes('Solsworn Ciphers') || html.includes('Emerald Sentence'))) {
      banners.push({
        id: '200034_weapon',
        bannerId: '200034',
        name: 'Solsworn Ciphers',
        type: 'weapon',
        image: buildWuWaImageUrl('weapon-portraits', 'solsworn-ciphers-portrait.png'),
        game: 'wuwa'
      });
    }
    
    const recentBanners = [
      pickPreferredWuWaBanner(banners, 'character'),
      pickPreferredWuWaBanner(banners, 'weapon'),
    ].filter(Boolean);
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(recentBanners);
  } catch (error) {
    console.error('[WuWa Banners API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch WuWa banners', message: error.message });
  }
}
