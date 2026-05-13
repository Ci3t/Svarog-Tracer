/**
 * Client-side game asset resolver
 * Mirrors server/utils/gameAssetResolver.js for client-side use
 * Primary: Our Cloudinary assets
 * Fallback: External API images
 */

import { CLOUDINARY_MAP } from '../generated/cloudinary-map.js';
import { GENSHIN_NORMALIZED_MAP } from '../generated/cloudinary-genshin-map.js';
import { WUWA_ASSET_MAP } from '../generated/cloudinary-wuwa-map.js';
import { WUWA_WEAPON_MAP } from '../generated/cloudinary-wuwa-weapons-map.js';
import { GENSHIN_WEAPON_MAP } from '../generated/cloudinary-genshin-weapons-map.js';
import { resolveAssetCdnUrl } from './assetCdn.js';
import { shouldUseCloudinaryAssets } from './cloudinaryPolicy.js';

// ── HSR ──────────────────────────────────────────────────────────────

export function resolveHsrCharacterImage(charId, fallbackUrl) {
  const key = `game/hsr/character_portrait/${charId}.png`;
  const cdnUrl = resolveAssetCdnUrl(key);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  return CLOUDINARY_MAP[key] || fallbackUrl;
}

export function resolveHsrIconImage(charId, fallbackUrl) {
  const key = `game/hsr/character_icon/${charId}.png`;
  const cdnUrl = resolveAssetCdnUrl(key);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  return CLOUDINARY_MAP[key] || fallbackUrl;
}

export function resolveHsrLightConeImage(lcId, fallbackUrl) {
  const key = `game/hsr/lightcone_preview/${lcId}.png`;
  return resolveAssetCdnUrl(key) || fallbackUrl;
}

// ── Genshin ──────────────────────────────────────────────────────────

export function resolveGenshinCharacterImage(slug, fallbackUrl) {
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const entry = GENSHIN_NORMALIZED_MAP[normalized];
  if (!entry) return fallbackUrl;
  return entry.splash || entry.portrait || entry.icon || fallbackUrl;
}

export function resolveGenshinWeaponImage(name, fallbackUrl) {
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // 1. Try dedicated weapon map first
  for (const [filename, url] of Object.entries(GENSHIN_WEAPON_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized)) {
      return url;
    }
  }
  
  // 2. Fall back to character map
  const entry = GENSHIN_NORMALIZED_MAP[normalized];
  if (entry) {
    return entry.icon || entry.splash || entry.portrait || fallbackUrl;
  }
  
  return fallbackUrl;
}

// ── WuWa ─────────────────────────────────────────────────────────────

export function resolveWuWaCharacterImage(name, fallbackUrl) {
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized) && (filename.includes('splash') || filename.includes('portrait'))) {
      return url;
    }
  }
  
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized) && filename.includes('icon')) {
      return url;
    }
  }
  
  return fallbackUrl;
}

export function resolveWuWaWeaponImage(name, fallbackUrl) {
  if (!shouldUseCloudinaryAssets()) return fallbackUrl;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // 1. Try dedicated weapon map first
  for (const [filename, url] of Object.entries(WUWA_WEAPON_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized)) {
      return url;
    }
  }
  
  // 2. Fall back to character map
  for (const [filename, url] of Object.entries(WUWA_ASSET_MAP)) {
    const fileBase = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (fileBase.includes(normalized)) {
      return url;
    }
  }
  
  return fallbackUrl;
}
