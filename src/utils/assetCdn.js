/**
 * Asset CDN resolver stub
 * Returns null so Cloudinary assets are used as primary
 */
export function resolveAssetCdnUrl(key) {
  // Stub: no separate CDN configured, falls back to Cloudinary
  return null;
}
