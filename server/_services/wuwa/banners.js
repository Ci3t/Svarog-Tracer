/**
 * WuWa Banners API Endpoint — FULLY DYNAMIC
 * Fetches live WuWa banners from WuWa Tracker automatically.
 * No hardcoded banner IDs — discovers current banners from HTML.
 * Images: Our Cloudinary assets primary, wuwatracker fallback.
 */

import { resolveWuWaCharacterImage, resolveWuWaWeaponImage } from '../../utils/gameAssetResolver.js';

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

  try {
    console.log('[WuWa Banners API] Fetching live banners dynamically...');

    const response = await fetchWithTimeout(`https://wuwatracker.com/tracker/stats?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const banners = [];
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

      banners.push({
        id: `${bannerId}_${type}`,
        bannerId,
        name: resolvedName,
        type,
        image,
        fallbackImage,
        game: 'wuwa'
      });
    }

    console.log(`[WuWa Banners API] Discovered ${banners.length} banner(s)`);
    banners.forEach(b => console.log(`  - ${b.bannerId}: ${b.name} (${b.type})`));

    if (banners.length === 0) {
      throw new Error('No banners found in HTML');
    }

    // Select current banners dynamically (highest IDs = newest)
    const currentBanners = selectCurrentBanners(banners);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.status(200).json(currentBanners);
  } catch (error) {
    console.error('[WuWa Banners API] Error:', error);
    // Ultimate fallback: use presets from client-side map
    return res.status(200).json([]);
  }
}
