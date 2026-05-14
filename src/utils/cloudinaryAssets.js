/**
 * Cloudinary asset URL builders for game content
 * All URLs use the pre-uploaded assets in the svarog-tracer Cloudinary account
 */

import { shouldUseCloudinaryAssets } from './cloudinaryPolicy.js';
import { resolveAssetCdnUrl } from './assetCdn.js';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}`;

/**
 * Get HSR character portrait URL from Cloudinary
 * @param {string|number} numId - Character numeric ID (e.g., 1001)
 * @param {Object} options - Transform options
 * @param {number} options.width - Resize width
 * @returns {string|null} Cloudinary URL or null if not configured
 */
export function getHsrPortraitUrl(numId, options = {}) {
  const cdnUrl = resolveAssetCdnUrl(`game/hsr/character_portrait/${numId}.png`, options);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets() || !CLOUD_NAME || !numId) return null;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  transforms.push('f_auto', 'q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `${BASE_URL}/image/upload/${transformStr}svarog-tracer/game/hsr/character_portrait/${numId}`;
}

/**
 * Get HSR character icon URL from Cloudinary
 * @param {string|number} numId - Character numeric ID
 * @param {Object} options - Transform options
 * @returns {string|null} Cloudinary URL or null
 */
export function getHsrIconUrl(numId, options = {}) {
  const cdnUrl = resolveAssetCdnUrl(`game/hsr/character_icon/${numId}.png`, options);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets() || !CLOUD_NAME || !numId) return null;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  transforms.push('f_auto', 'q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `${BASE_URL}/image/upload/${transformStr}svarog-tracer/game/hsr/character_icon/${numId}`;
}

/**
 * Get HSR light cone preview URL from Cloudinary
 * @param {string|number} lcId - Light cone numeric ID
 * @param {Object} options - Transform options
 * @returns {string|null} Cloudinary URL or null
 */
export function getHsrLightConeUrl(lcId, options = {}) {
  const cdnUrl = resolveAssetCdnUrl(`game/hsr/lightcone_preview/${lcId}.png`, options);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets() || !CLOUD_NAME || !lcId) return null;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  transforms.push('f_auto', 'q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `${BASE_URL}/image/upload/${transformStr}svarog-tracer/game/hsr/lightcone_preview/${lcId}`;
}

/**
 * Get HSR element icon URL from Cloudinary
 * @param {string} element - Element name (e.g., 'fire', 'ice', 'quantum')
 * @param {Object} options - Transform options
 * @returns {string|null} Cloudinary URL or null
 */
export function getHsrElementUrl(element, options = {}) {
  const normalized = element ? element.charAt(0).toUpperCase() + element.slice(1).toLowerCase() : '';
  const cdnUrl = resolveAssetCdnUrl(`game/hsr/element_icon/${normalized}.png`, options);
  if (cdnUrl) return cdnUrl;
  if (!shouldUseCloudinaryAssets() || !CLOUD_NAME || !element) return null;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  transforms.push('f_auto', 'q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `${BASE_URL}/image/upload/${transformStr}svarog-tracer/game/hsr/element_icon/${normalized}`;
}

/**
 * Get local site asset URL from Cloudinary
 * @param {string} path - Local path like 'svarog.png' or 'companions/Clara/...'
 * @param {Object} options - Transform options
 * @returns {string|null} Cloudinary URL or null
 */
export function getSiteAssetUrl(path, options = {}) {
  if (!shouldUseCloudinaryAssets() || !CLOUD_NAME || !path) return null;

  const normalized = path.replace(/^\//, '').replace(/\\/g, '/');

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.format !== false) transforms.push('f_auto');
  if (options.quality !== false) transforms.push('q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `${BASE_URL}/image/upload/${transformStr}svarog-tracer/site/${normalized}`;
}
