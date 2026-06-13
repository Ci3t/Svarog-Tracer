/**
 * WuWa Banners API Endpoint — FULLY DYNAMIC
 * Fetches live WuWa banners from WuWa Tracker automatically.
 * No hardcoded banner IDs — discovers current banners from HTML.
 * Images: Our Cloudinary assets primary, wuwatracker fallback.
 */

import { resolveWuWaCharacterImage, resolveWuWaWeaponImage } from '../../utils/gameAssetResolver.js';
import { applyBannerAssetManifest } from '../../utils/bannerAssetManifest.js';

// Optional name overrides (used if HTML extraction fails or gives bad names)
const WUWA_NAME_OVERRIDES = Object.freeze({
  // Add entries here only when HTML gives wrong names
});

// Image URL overrides for wuwatracker (extension/portrait inconsistencies)
const WUWA_IMAGE_OVERRIDES = Object.freeze({
  hiyuki: { folder: 'character-portraits', file: 'hiyuki-portrait.png' },
  lynae: { folder: 'character-portraits', file: 'lynae-portrait.webp' },
  sigrika: { folder: 'character-portraits', file: 'sigrika-portrait.webp' },
  frostburn: { folder: 'weapon-portraits', file: 'frostburn-portrait.png' },
  'spectrum-blaster': { folder: 'weapon-portraits', file: 'spectrum-blaster.png' },
  'solsworn-ciphers': { folder: 'weapon-portraits', file: 'solsworn-ciphers-portrait.png' },
});

const WUWA_LUCILLA_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Lucilla.webp?v=100038-lucilla-20260613';
const WUWA_LUCILLA_FALLBACK_IMAGE = 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Lucilla.webp?v=100038-lucilla-20260613';
const WUWA_FREEZE_FRAME_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Freeze_Frame.webp?v=200038-freeze-frame-20260613';
const WUWA_FREEZE_FRAME_FALLBACK_IMAGE = 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Freeze_Frame.webp?v=200038-freeze-frame-20260613';
const WUWA_LUCY_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Lucy.webp?v=1000001-lucy-20260608';
const WUWA_LUCY_FALLBACK_IMAGE = 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Lucy.webp?v=1000001-lucy-20260608';
const WUWA_SPECTRAL_TRIGGER_IMAGE = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/wuwa/Spectral_trigger.webp?v=1100001-spectral-trigger-20260608';
const WUWA_SPECTRAL_TRIGGER_FALLBACK_IMAGE = 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Spectral_trigger.webp?v=1100001-spectral-trigger-20260608';
const WUWA_COLLAB_NAME = 'Cyberpunk: Edgerunners';

const WUWA_BANNER_ASSETS = Object.freeze({
  '100038': {
    id: '100038_character',
    bannerId: '100038',
    name: 'Lucilla / Cartethyia',
    type: 'character',
    image: WUWA_LUCILLA_IMAGE,
    portrait: WUWA_LUCILLA_IMAGE,
    fallbackImage: WUWA_LUCILLA_FALLBACK_IMAGE,
    characterId: 'lucilla',
  },
  '200038': {
    id: '200038_weapon',
    bannerId: '200038',
    name: "Freeze Frame / Defier's Thorn",
    type: 'weapon',
    image: WUWA_FREEZE_FRAME_IMAGE,
    portrait: WUWA_FREEZE_FRAME_IMAGE,
    fallbackImage: WUWA_FREEZE_FRAME_FALLBACK_IMAGE,
    characterId: 'freeze-frame',
  },
  '1000001': {
    id: '1000001_character',
    bannerId: '1000001',
    name: 'Lucy / Rebecca',
    type: 'character',
    image: WUWA_LUCY_IMAGE,
    portrait: WUWA_LUCY_IMAGE,
    fallbackImage: WUWA_LUCY_FALLBACK_IMAGE,
    characterId: 'lucy',
    separator: true,
    collaboration: WUWA_COLLAB_NAME,
  },
  '1100001': {
    id: '1100001_weapon',
    bannerId: '1100001',
    name: 'Spectral Trigger / Skull Thrasher',
    type: 'weapon',
    image: WUWA_SPECTRAL_TRIGGER_IMAGE,
    portrait: WUWA_SPECTRAL_TRIGGER_IMAGE,
    fallbackImage: WUWA_SPECTRAL_TRIGGER_FALLBACK_IMAGE,
    characterId: 'spectral-trigger',
    separator: true,
    collaboration: WUWA_COLLAB_NAME,
  },
  '100037': {
    id: '1000001_character',
    bannerId: '1000001',
    name: 'Lucy / Rebecca',
    type: 'character',
    image: WUWA_LUCY_IMAGE,
    portrait: WUWA_LUCY_IMAGE,
    fallbackImage: WUWA_LUCY_FALLBACK_IMAGE,
    characterId: 'lucy',
    separator: true,
    collaboration: WUWA_COLLAB_NAME,
  },
  '200037': {
    id: '1100001_weapon',
    bannerId: '1100001',
    name: 'Spectral Trigger / Skull Thrasher',
    type: 'weapon',
    image: WUWA_SPECTRAL_TRIGGER_IMAGE,
    portrait: WUWA_SPECTRAL_TRIGGER_IMAGE,
    fallbackImage: WUWA_SPECTRAL_TRIGGER_FALLBACK_IMAGE,
    characterId: 'spectral-trigger',
    separator: true,
    collaboration: WUWA_COLLAB_NAME,
  },
});

const WUWA_FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const WUWA_BANNER_CACHE_CONTROL = 'public, max-age=300, s-maxage=900, stale-while-revalidate=900';
const FORCE_BANNER_FALLBACK = process.env.BANNER_FORCE_FALLBACK === 'true';

let bannerCache = {
  data: null,
  timestamp: 0,
};

async function fetchWithTimeout(url, options = {}, timeoutMs = WUWA_FETCH_TIMEOUT_MS) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function compareWuWaBannerIdsDesc(a, b) {
  return Number.parseInt(String(b?.bannerId || b?.id || '0'), 10) - Number.parseInt(String(a?.bannerId || a?.id || '0'), 10);
}

function slugifyBannerName(value) {
  const firstName = String(value || '').split('&')[0].trim();
  return firstName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildWuWaImageUrl(folder, fileName) {
  return `https://wuwatracker.com/_next/image?url=${encodeURIComponent(`/api/${folder}/file/${fileName}`)}&w=828&q=75`;
}

function applyCurrentWuWaBannerAsset(banner) {
  const override = WUWA_BANNER_ASSETS[String(banner?.bannerId || banner?.id || '')];
  if (!override) return banner;

  return {
    ...banner,
    ...override,
    fallbackImage: override.fallbackImage || override.image,
    game: 'wuwa',
    assetLocked: true,
    imageLocked: true,
  };
}

function buildWuWaFallbackBanners() {
  return [
    applyCurrentWuWaBannerAsset({ bannerId: '100038', source: 'controlled-fallback' }),
    applyCurrentWuWaBannerAsset({ bannerId: '200038', source: 'controlled-fallback' }),
    applyCurrentWuWaBannerAsset({ bannerId: '1000001', source: 'controlled-collab' }),
    applyCurrentWuWaBannerAsset({ bannerId: '1100001', source: 'controlled-collab' }),
  ];
}

/**
 * Select the current banners dynamically:
 * 1. Group by type (character / weapon)
 * 2. Sort by bannerId descending (newest first)
 * 3. Pick the highest-ID character and highest-ID weapon
 * 4. Pair them by matching last 2 digits if possible
 */
function selectCurrentBanners(banners) {
  const currentPool = banners.filter(b => !b.collaboration);
  const chars = currentPool.filter(b => b.type === 'character').sort(compareWuWaBannerIdsDesc);
  const weapons = currentPool.filter(b => b.type === 'weapon').sort(compareWuWaBannerIdsDesc);

  if (chars.length === 0 && weapons.length === 0) return [];

  const selectedChar = chars[0] || null;
  let selectedWeapon = weapons[0] || null;

  // Try to pair by matching last 2 digits of bannerId
  // (e.g., 100036 char pairs with 200036 weapon)
  if (selectedChar && weapons.length > 1) {
    const charSuffix = String(selectedChar.bannerId).slice(-2);
    const matchedWeapon = weapons.find(w => String(w.bannerId).slice(-2) === charSuffix);
    if (matchedWeapon) {
      selectedWeapon = matchedWeapon;
    }
  }

  console.log(`[WuWa Dynamic] Character: ${selectedChar?.name} (${selectedChar?.bannerId})`);
  console.log(`[WuWa Dynamic] Weapon: ${selectedWeapon?.name} (${selectedWeapon?.bannerId})`);

  return [selectedChar, selectedWeapon].filter(Boolean);
}

function appendWuWaCollabBanners(banners) {
  const list = Array.isArray(banners) ? [...banners] : [];
  const existing = new Set(list.map((banner) => String(banner?.bannerId || banner?.id || '')));
  for (const bannerId of ['1000001', '1100001']) {
    if (!existing.has(bannerId)) {
      list.push(applyCurrentWuWaBannerAsset({ bannerId, source: 'controlled-collab' }));
    }
  }
  return list.filter(Boolean);
}

export async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (FORCE_BANNER_FALLBACK) {
    res.setHeader('Cache-Control', WUWA_BANNER_CACHE_CONTROL);
    return res.status(200).json(await applyBannerAssetManifest(buildWuWaFallbackBanners()));
  }

  try {
    const cacheValid = bannerCache.data && Date.now() - bannerCache.timestamp < CACHE_TTL_MS;
    if (cacheValid) {
      res.setHeader('Cache-Control', WUWA_BANNER_CACHE_CONTROL);
      return res.status(200).json(await applyBannerAssetManifest(bannerCache.data));
    }

    console.log('[WuWa Banners API] Fetching live banners dynamically...');

    const response = await fetchWithTimeout(`https://wuwatracker.com/tracker/stats?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const allBanners = [];
    const seenIds = new Set();

    // Extract all banner IDs from HTML dynamically
    const idPattern = /\\"bannerId\\":\s*(\d{6,7})/g;
    let idMatch;

    while ((idMatch = idPattern.exec(html)) !== null) {
      const bannerId = idMatch[1];
      const isCharacter = bannerId.startsWith('100');
      const isWeapon = bannerId.startsWith('101') || bannerId.startsWith('110') || bannerId.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);

      const pos = idMatch.index;
      const forward = html.substring(pos, pos + 3000);

      // Extract type from HTML
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';

      // Extract name from HTML (dynamic!)
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const rawName = nameMatch ? nameMatch[1] : 'Unknown Banner';
      const resolvedName = WUWA_NAME_OVERRIDES[bannerId] || rawName;

      if (rawName.toLowerCase().includes('standard')) continue;

      const type = poolType.includes('character') ? 'character' :
                   (poolType.includes('weapon') ? 'weapon' :
                   (isCharacter ? 'character' : 'weapon'));

      // Build image: Cloudinary primary, wuwatracker fallback
      const slug = slugifyBannerName(resolvedName);
      const override = WUWA_IMAGE_OVERRIDES[slug];
      const folder = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const ext = type === 'character' ? 'webp' : 'png';
      const fallbackImage = override
        ? buildWuWaImageUrl(override.folder, override.file)
        : buildWuWaImageUrl(folder, `${slug}-portrait.${ext}`);
      const image = type === 'character'
        ? resolveWuWaCharacterImage(resolvedName, fallbackImage)
        : resolveWuWaWeaponImage(resolvedName, fallbackImage);

      allBanners.push(applyCurrentWuWaBannerAsset({
        id: `${bannerId}_${type}`,
        bannerId,
        name: resolvedName,
        type,
        image,
        fallbackImage,
        game: 'wuwa'
      }));
    }

    if (allBanners.length === 0) {
      throw new Error('No banners found in HTML');
    }

    // Only keep the 5 most recent banners per type (discard old ones)
    const chars = allBanners.filter(b => b.type === 'character').sort(compareWuWaBannerIdsDesc).slice(0, 5);
    const weapons = allBanners.filter(b => b.type === 'weapon').sort(compareWuWaBannerIdsDesc).slice(0, 5);
    const banners = [...chars, ...weapons];

    console.log(`[WuWa Banners API] Discovered ${allBanners.length} total, using ${banners.length} recent`);
    banners.forEach(b => console.log(`  - ${b.bannerId}: ${b.name} (${b.type})`));

    // Select current banners dynamically (highest IDs = newest)
    const currentBanners = selectCurrentBanners(banners);
    const safeBanners = currentBanners.length > 0 ? appendWuWaCollabBanners(currentBanners) : buildWuWaFallbackBanners();
    bannerCache = {
      data: safeBanners,
      timestamp: Date.now(),
    };

    res.setHeader('Cache-Control', WUWA_BANNER_CACHE_CONTROL);
    return res.status(200).json(await applyBannerAssetManifest(safeBanners));
  } catch (error) {
    console.error('[WuWa Banners API] Error:', error);
    const fallbackBanners = buildWuWaFallbackBanners();
    bannerCache = {
      data: fallbackBanners,
      timestamp: Date.now(),
    };
    return res.status(200).json(await applyBannerAssetManifest(fallbackBanners));
  }
}
