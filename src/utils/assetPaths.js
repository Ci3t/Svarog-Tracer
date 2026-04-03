const rawAssetBase = import.meta.env.BASE_URL || '/';
const ASSET_BASE_URL = rawAssetBase.endsWith('/') ? rawAssetBase : `${rawAssetBase}/`;

export function withBaseUrl(path = '') {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = String(path).replace(/^\/+/, '');
  return `${ASSET_BASE_URL}${normalized}`;
}

export { ASSET_BASE_URL };
