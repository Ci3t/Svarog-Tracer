/**
 * Server-side game asset resolver
 * Primary: Our Cloudinary assets
 * Fallback: External API images
 * 
 * All games still pull fresh data each time — only image resolution changes.
 */

import { CLOUDINARY_MAP } from '../../src/generated/cloudinary-map.js';
import { GENSHIN_NORMALIZED_MAP } from '../../src/generated/cloudinary-genshin-map.js';
import { WUWA_ASSET_MAP } from '../../src/generated/cloudinary-wuwa-map.js';

// ── HSR ──────────────────────────────────────────────────────────────

const HSR_PORTRAIT_KEYS = new Set(
  Object.keys(CLOUDINARY_MAP).filter(k => k.startsWith('game/hsr/character_portrait/'))
);

export function resolveHsrCharacterImage(charId, fallbackUrl) {
  const key = `game/hsr/character_portrait/${charId}.png`;
  return CLOUDINARY_MAP[key] || fallbackUrl;
}

export function resolveHsrIconImage(charId, fallbackUrl) {
  const key = `game/hsr/character_icon/${charId}.png`;
  return CLOUDINARY_MAP[key] || fallbackUrl;
}

export function resolveHsrLightConeImage(lcId, fallbackUrl) {
  // No light cone previews in Cloudinary yet
  return fallbackUrl;
}

// ── Genshin ──────────────────────────────────────────────────────────

export function resolveGenshinCharacterImage(slug, fallbackUrl) {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const entry = GENSHIN_NORMALIZED_MAP[normalized];
  if (!entry) {
    console.log(`[AssetResolver] Genshin character not found: ${slug} (normalized: ${normalized})`);
    return fallbackUrl;
  }
  // Prefer splash/portrait if available, else icon
  const target = entry.splash || entry.portrait || entry.icon;
  return target || fallbackUrl;
}

export function resolveGenshinWeaponImage(name, fallbackUrl) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const entry = GENSHIN_NORMALIZED_MAP[normalized];
  if (!entry) return fallbackUrl;
  const target = entry.icon || entry.splash || entry.portrait;
  return target || fallbackUrl;
}

// ── WuWa ─────────────────────────────────────────────────────────────

export function resolveWuWaCharacterImage(name, fallbackUrl) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Try direct name match first (e.g., "Hiyuki_splash.png")
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized) && (filename.includes('splash') || filename.includes('portrait'))) {
      return url;
    }
  }
  
  // Try icon as fallback
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized) && filename.includes('icon')) {
      return url;
    }
  }
  
  console.log(`[AssetResolver] WuWa character not found: ${name} (normalized: ${normalized})`);
  return fallbackUrl;
}

export function resolveWuWaWeaponImage(name, fallbackUrl) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized)) {
      return url;
    }
  }
  
  return fallbackUrl;
}
