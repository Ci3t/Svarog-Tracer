/**
 * WuWa Banners API Endpoint
 * Fetches live WuWa banners from WuWa Tracker
 */

const WUWA_KNOWN_BANNERS = Object.freeze({
  '100036': {
    name: 'Hiyuki',
    type: 'character',
  },
  '200036': {
    name: 'Frostburn',
    type: 'weapon',
  },
  '101036': {
    name: 'Frostburn',
    type: 'weapon',
  },
  '100035': {
    name: 'Lynae',
    type: 'character',
  },
  '100030': {
    name: 'Lynae',
    type: 'character',
  },
  '200035': {
    name: 'Spectrum Blaster',
    type: 'weapon',
  },
  '200030': {
    name: 'Spectrum Blaster',
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

const WUWA_FEATURED_WEAPON_BY_CHARACTER = Object.freeze({
  hiyuki: 'Frostburn',
  lynae: 'Spectrum Blaster',
});

const WUWA_CURRENT_FEATURED_IDS = Object.freeze({
  character: '100036',
  weapon: '200036',
});

const WUWA_FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = WUWA_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function compareWuWaBannerIdsDesc(a, b) {
  return Number.parseInt(String(b?.bannerId || b?.id || '0'), 10) - Number.parseInt(String(a?.bannerId || a?.id || '0'), 10);
}

function pickHighestWuWaBanner(banners) {
  return [...(Array.isArray(banners) ? banners : [])].sort(compareWuWaBannerIdsDesc)[0] || null;
}

function findWuWaBannerById(banners, bannerId) {
  const normalizedId = String(bannerId || '').trim();
  if (!normalizedId) return null;
  return (Array.isArray(banners) ? banners : []).find(
    (banner) => String(banner?.bannerId || banner?.id || '').trim() === normalizedId
  ) || null;
}

function extractWuWaCurrentTitle(html) {
  const match = String(html || '').match(/<title>\s*([^<|]+?)\s*\|\s*Global Statistics/i);
  return match?.[1] ? String(match[1]).trim() : '';
}

function findBannerByTitleMatch(banners, title) {
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (!normalizedTitle) return null;
  return pickHighestWuWaBanner(
    banners.filter((banner) => normalizedTitle.includes(String(banner.name || '').trim().toLowerCase()))
  );
}

function findBannerByExactName(banners, name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;
  return pickHighestWuWaBanner(
    banners.filter((banner) => String(banner.name || '').trim().toLowerCase() === normalizedName)
  );
}

function findBannerByFirstOccurrence(banners, html) {
  const source = String(html || '').toLowerCase();
  let winner = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const banner of banners) {
    const name = String(banner.name || '').trim().toLowerCase();
    if (!name) continue;
    const index = source.indexOf(name);
    if (
      index >= 0 && (
        index < bestIndex ||
        (index === bestIndex && compareWuWaBannerIdsDesc(banner, winner) < 0)
      )
    ) {
      bestIndex = index;
      winner = banner;
    }
  }

  return winner;
}

function selectWuWaVisibleBanners(banners, html) {
  try {
    const characterBanners = banners.filter((banner) => banner.type === 'character');
    const weaponBanners = banners.filter((banner) => banner.type === 'weapon');
    const currentTitle = extractWuWaCurrentTitle(html);

    const forcedCurrentCharacter = findWuWaBannerById(characterBanners, WUWA_CURRENT_FEATURED_IDS.character);
    const forcedCurrentWeapon = findWuWaBannerById(weaponBanners, WUWA_CURRENT_FEATURED_IDS.weapon);

    if (forcedCurrentCharacter || forcedCurrentWeapon) {
      const pairedWeaponName = forcedCurrentCharacter
        ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(forcedCurrentCharacter.name || '').trim().toLowerCase()]
        : '';
      const selectedWeapon =
        forcedCurrentWeapon ||
        findBannerByExactName(weaponBanners, pairedWeaponName) ||
        pickHighestWuWaBanner(weaponBanners) ||
        findBannerByFirstOccurrence(weaponBanners, html) ||
        null;

      return [forcedCurrentCharacter, selectedWeapon].filter(Boolean);
    }

    // Strategy 1: Match from HTML Title (most accurate if on a specific page)
    // Strategy 2: Pick highest ID (most accurate if on a list page)
    // Strategy 3: First occurrence in HTML (fallback)
    const selectedCharacter =
      findBannerByTitleMatch(characterBanners, currentTitle) ||
      pickHighestWuWaBanner(characterBanners) ||
      findBannerByFirstOccurrence(characterBanners, html) ||
      null;

    const pairedWeaponName = selectedCharacter
      ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(selectedCharacter.name || '').trim().toLowerCase()]
      : '';

    let selectedWeapon =
      findBannerByExactName(weaponBanners, pairedWeaponName) ||
      pickHighestWuWaBanner(weaponBanners) ||
      findBannerByFirstOccurrence(weaponBanners, html) ||
      null;

    // CRITICAL FIX: If Hiyuki is the character, the weapon MUST be Frostburn.
    // This prevents older banners like "Ages of Harvest" from taking over.
    if (selectedCharacter?.name === 'Hiyuki' && selectedWeapon?.name !== 'Frostburn') {
      console.log(`[WuWa Banners API] OVERRIDING weapon ${selectedWeapon?.name} with Frostburn for Hiyuki`);
      const forcedFrostburn = weaponBanners.find(b => b.name === 'Frostburn' || b.bannerId === '200036');
      if (forcedFrostburn) {
        selectedWeapon = forcedFrostburn;
      }
    }

    console.log(`[WuWa Banners API] Final Selected Character: ${selectedCharacter?.name} (${selectedCharacter?.bannerId})`);
    console.log(`[WuWa Banners API] Final Selected Weapon: ${selectedWeapon?.name} (${selectedWeapon?.bannerId})`);

    return [selectedCharacter, selectedWeapon].filter(Boolean);
  } catch (error) {
    console.error(`[WuWa Banners API] Error in selection:`, error);
    return banners.slice(0, 2); 
  }
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
    
    // Add cache buster to prevent stale Vercel/Tracker responses
    const response = await fetchWithTimeout(`https://wuwatracker.com/tracker/stats?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const banners = [];

    // 1. HARD-PRIORITIZE CURRENT BANNERS (Hiyuki & Frostburn)
    banners.push({
      id: '100036_character',
      bannerId: '100036',
      name: 'Hiyuki',
      type: 'character',
      image: buildWuWaImageUrl('character-portraits', 'hiyuki-portrait.webp'),
      game: 'wuwa'
    });

    banners.push({
      id: '200036_weapon',
      bannerId: '200036',
      name: 'Frostburn',
      type: 'weapon',
      image: buildWuWaImageUrl('weapon-portraits', 'frostburn-portrait.png'),
      game: 'wuwa'
    });

    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const seenIds = new Set(['100036', '200036']);
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
    
    // All other banners were processed above and added to the banners array
    
    const recentBanners = selectWuWaVisibleBanners(banners, html);
    
    // Explicitly return ONLY the two most relevant banners to keep UI clean
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json(recentBanners);
  } catch (error) {
    console.error('[WuWa Banners API] Error:', error);
    // Ultimate fallback if everything fails
    const fallback = [
      {
        id: '100036_character',
        bannerId: '100036',
        name: 'Hiyuki',
        type: 'character',
        image: buildWuWaImageUrl('character-portraits', 'hiyuki-portrait.webp'),
        game: 'wuwa'
      },
      {
        id: '200036_weapon',
        bannerId: '200036',
        name: 'Frostburn',
        type: 'weapon',
        image: buildWuWaImageUrl('weapon-portraits', 'frostburn-portrait.png'),
        game: 'wuwa'
      }
    ];
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(fallback);
  }
}
