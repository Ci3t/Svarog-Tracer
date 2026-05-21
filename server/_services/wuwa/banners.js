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

const WUWA_CURRENT_BANNER_ASSETS = Object.freeze({
  '100037': {
    id: '100037_character',
    bannerId: '100037',
    name: 'Denia / Chisa / Phrolova',
    type: 'character',
    image: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Denia_Character_Sheet.webp?v=100037-denia-20260521',
    characterId: 'denia',
  },
  '200037': {
    id: '200037_weapon',
    bannerId: '200037',
    name: 'Forged Dwarf Star / Kumokiri / Lethean Elegy',
    type: 'weapon',
    image: 'https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/forged-dwarf-star.webp?v=200037-forged-dwarf-star-20260521',
    characterId: 'forged-dwarf-star',
  },
});

const WUWA_FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 5 * 60 * 1000;
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
  const override = WUWA_CURRENT_BANNER_ASSETS[String(banner?.bannerId || banner?.id || '')];
  if (!override) return banner;

  return {
    ...banner,
    ...override,
    fallbackImage: override.image,
    game: 'wuwa',
    assetLocked: true,
    imageLocked: true,
  };
}

function buildWuWaFallbackBanners() {
  return [
    applyCurrentWuWaBannerAsset({ bannerId: '100037', source: 'controlled-fallback' }),
    applyCurrentWuWaBannerAsset({ bannerId: '200037', source: 'controlled-fallback' }),
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
  const chars = banners.filter(b => b.type === 'character').sort(compareWuWaBannerIdsDesc);
  const weapons = banners.filter(b => b.type === 'weapon').sort(compareWuWaBannerIdsDesc);

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

export async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (FORCE_BANNER_FALLBACK) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(await applyBannerAssetManifest(buildWuWaFallbackBanners()));
  }

  try {
    const cacheValid = bannerCache.data && Date.now() - bannerCache.timestamp < CACHE_TTL_MS;
    if (cacheValid) {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
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
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
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
    const safeBanners = currentBanners.length > 0 ? currentBanners : buildWuWaFallbackBanners();
    bannerCache = {
      data: safeBanners,
      timestamp: Date.now(),
    };

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
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
