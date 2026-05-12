const env = globalThis.process?.env || {};
const RAW_ASSET_CDN_BASE_URL = env.ASSET_CDN_BASE_URL || env.VITE_ASSET_CDN_BASE_URL || '';
const RAW_ASSET_CDN_FORMAT = env.ASSET_CDN_FORMAT || env.VITE_ASSET_CDN_FORMAT || '';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function normalizeAssetKey(assetKey) {
  return String(assetKey || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^game\//, '');
}

function isGameAssetPath(path) {
  return /^(hsr|genshin|wuwa)\//i.test(path);
}

function replaceExtension(path, extension) {
  const cleanExtension = String(extension || '').trim().replace(/^\./, '');
  if (!cleanExtension) return path;
  return path.replace(/\.[a-z0-9]+$/i, `.${cleanExtension}`);
}

export function getAssetCdnBaseUrl() {
  return normalizeBaseUrl(RAW_ASSET_CDN_BASE_URL);
}

export function shouldUseAssetCdn() {
  return Boolean(getAssetCdnBaseUrl());
}

export function resolveAssetCdnUrl(assetKey, options = {}) {
  const baseUrl = getAssetCdnBaseUrl();
  const normalized = normalizeAssetKey(assetKey);
  if (!baseUrl || !normalized) return null;
  if (!options.allowAnyPath && !isGameAssetPath(normalized)) return null;

  const format = options.format || RAW_ASSET_CDN_FORMAT;
  return `${baseUrl}/${replaceExtension(normalized, format)}`;
}
