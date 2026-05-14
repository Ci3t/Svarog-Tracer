import { shouldUseCloudinaryAssets } from './cloudinaryPolicy.js';
import { resolveAssetCdnUrl } from './assetCdn.js';

const rawAssetBase = import.meta.env.BASE_URL || '/';
const ASSET_BASE_URL = rawAssetBase.endsWith('/') ? rawAssetBase : `${rawAssetBase}/`;

// Lazy-load the Cloudinary map so it doesn't break builds before generation
let cloudinaryMap = null;
let mapPromise = null;

async function loadCloudinaryMap() {
  if (!shouldUseCloudinaryAssets()) return {};
  if (cloudinaryMap) return cloudinaryMap;
  if (mapPromise) return mapPromise;

  mapPromise = import('../generated/cloudinary-map.js')
    .then((mod) => {
      cloudinaryMap = mod.CLOUDINARY_MAP || {};
      return cloudinaryMap;
    })
    .catch(() => {
      cloudinaryMap = {};
      return cloudinaryMap;
    });

  return mapPromise;
}

/**
 * Resolve a local asset path to a URL.
 * If the asset has been uploaded to Cloudinary, returns the Cloudinary URL.
 * Otherwise falls back to the local BASE_URL (GitHub Pages).
 *
 * @param {string} path - Local path like '/clara.jpg' or 'companions/Clara/model/...'
 * @param {Object} options - Transform options
 * @param {number} options.width - Resize width
 * @param {boolean} options.format - Auto format (default true)
 * @param {boolean} options.quality - Auto quality (default true)
 * @returns {string} Resolved URL
 */
export function withBaseUrl(path = '', options = {}) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = String(path).replace(/^\/+/, '');

  const cdnUrl = resolveAssetCdnUrl(normalized);
  if (cdnUrl) return cdnUrl;

  // Check Cloudinary map synchronously (if already loaded)
  if (shouldUseCloudinaryAssets() && cloudinaryMap && cloudinaryMap[normalized]) {
    return applyTransforms(cloudinaryMap[normalized], options);
  }

  // Fallback to local
  return `${ASSET_BASE_URL}${normalized}`;
}

/**
 * Async version that ensures the Cloudinary map is loaded first.
 * Use this when you need guaranteed Cloudinary resolution.
 */
export async function withBaseUrlAsync(path = '', options = {}) {
  await loadCloudinaryMap();
  return withBaseUrl(path, options);
}

function applyTransforms(url, options = {}) {
  if (!url || (!options.width && options.format === false && options.quality === false)) {
    return url;
  }

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.format !== false) transforms.push('f_auto');
  if (options.quality !== false) transforms.push('q_auto');

  if (transforms.length === 0) return url;

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

/**
 * Get a game image URL (character portrait, icon, light cone, etc.).
 * If Cloudinary is configured, wraps the URL through Cloudinary fetch for optimization.
 * Otherwise returns the original URL.
 *
 * @param {string} originalUrl - The original image URL (e.g., GitHub raw)
 * @param {Object} options - Transform options
 * @returns {string} Optimized or original URL
 */
export function getGameImageUrl(originalUrl, options = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!shouldUseCloudinaryAssets() || !cloudName || !originalUrl) return originalUrl;

  const transforms = [];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.format !== false) transforms.push('f_auto');
  if (options.quality !== false) transforms.push('q_auto');

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformStr}${encodeURIComponent(originalUrl)}`;
}

export { ASSET_BASE_URL };
