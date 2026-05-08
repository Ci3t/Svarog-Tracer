const DEFAULT_MANIFEST_URL = 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/manifest.json';
const MANIFEST_URL = import.meta.env.VITE_BANNER_ASSET_MANIFEST_URL || DEFAULT_MANIFEST_URL;
const MANIFEST_TTL_MS = 5 * 60 * 1000;

let cachedManifest = null;
let cachedAt = 0;
let inFlightManifest = null;

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveManifestUrl(path, manifestUrl) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  try {
    return new URL(path, manifestUrl).toString();
  } catch {
    return path;
  }
}

function normalizeEntry(entry, manifestUrl) {
  if (!entry) return null;
  if (typeof entry === 'string') return { image: resolveManifestUrl(entry, manifestUrl) };
  if (typeof entry !== 'object') return null;

  return {
    ...entry,
    image: resolveManifestUrl(entry.image || entry.url || entry.src, manifestUrl),
    portrait: resolveManifestUrl(entry.portrait, manifestUrl),
  };
}

function entryMatchesBanner(entry, banner) {
  if (!entry) return false;
  const matchers = [
    entry.id,
    entry.bannerId,
    entry.characterId,
    entry.name,
    ...(Array.isArray(entry.match) ? entry.match : []),
    ...(Array.isArray(entry.matches) ? entry.matches : []),
  ].filter(Boolean).map(normalizeKey);

  if (matchers.length === 0) return true;

  const bannerKeys = [
    banner.id,
    banner.bannerId,
    banner.characterId,
    banner.name,
  ].filter(Boolean).map(normalizeKey);

  return matchers.some((matcher) =>
    bannerKeys.some((key) => key === matcher || key.includes(matcher) || matcher.includes(key))
  );
}

function pickEntryForBanner(gameManifest, banner, manifestUrl) {
  const type = banner?.type || 'character';
  const candidates = [
    gameManifest?.[type],
    gameManifest?.[`${type}s`],
    ...(Array.isArray(gameManifest?.banners) ? gameManifest.banners : []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const found = candidate
        .map((entry) => normalizeEntry(entry, manifestUrl))
        .find((entry) => entryMatchesBanner(entry, banner));
      if (found?.image) return found;
      continue;
    }

    const entry = normalizeEntry(candidate, manifestUrl);
    if (entry?.image && entryMatchesBanner(entry, banner)) return entry;
    if (entry?.image && !Array.isArray(candidate)) return entry;
  }

  // Fallback for flat manifests like { "lauma": "genshin/lauma.webp", "lauma-weapon": "..." }
  if (gameManifest && typeof gameManifest === 'object') {
    const flatEntries = Object.entries(gameManifest)
      .filter(([key, value]) => !key.startsWith('_') && (typeof value === 'string' || (typeof value === 'object' && value && !Array.isArray(value))))
      .map(([key, value]) => normalizeEntry(
        typeof value === 'string' ? { name: key, image: value } : { name: key, ...value },
        manifestUrl
      ));

    // 1. Try exact match first
    const matched = flatEntries.find((entry) => entryMatchesBanner(entry, banner));
    if (matched?.image) return matched;

    // 2. If only one flat entry exists, use it as a catch-all
    if (flatEntries.length === 1 && flatEntries[0]?.image) {
      return flatEntries[0];
    }

    // 3. Type-aware heuristic: for weapon banners prefer keys containing "weapon", otherwise avoid them
    const isWeaponBanner = type === 'weapon' || /weapon/i.test(String(banner?.name || banner?.characterId || ''));
    const hinted = flatEntries.find((entry) => {
      const key = String(entry?.name || '').toLowerCase();
      if (isWeaponBanner) return key.includes('weapon');
      return !key.includes('weapon');
    });
    if (hinted?.image) return hinted;

    // 4. Last resort: return the first flat entry only if there's nothing else
    if (flatEntries.length > 0 && flatEntries[0]?.image) {
      return flatEntries[0];
    }
  }

  return null;
}

export async function loadBannerAssetManifest() {
  if (!MANIFEST_URL) return null;
  if (cachedManifest && Date.now() - cachedAt < MANIFEST_TTL_MS) return cachedManifest;
  if (inFlightManifest) return inFlightManifest;

  inFlightManifest = fetch(`${MANIFEST_URL}${MANIFEST_URL.includes('?') ? '&' : '?'}v=${Date.now()}`, {
    cache: 'no-store',
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      cachedManifest = manifest;
      cachedAt = Date.now();
      return manifest;
    })
    .catch((error) => {
      console.warn('[BannerAssets] Manifest unavailable:', error.message);
      return null;
    })
    .finally(() => {
      inFlightManifest = null;
    });

  return inFlightManifest;
}

export async function applyBannerAssetManifest(banners) {
  const manifest = await loadBannerAssetManifest();
  if (!manifest || !Array.isArray(banners)) return banners;

  return banners.map((banner) => {
    const game = String(banner?.game || '').toLowerCase();
    if (game !== 'genshin' && game !== 'wuwa') return banner;

    const entry = pickEntryForBanner(manifest[game], banner, MANIFEST_URL);
    if (!entry?.image) return banner;

    return {
      ...banner,
      image: entry.image,
      portrait: entry.portrait || entry.image,
      fallbackImage: banner.fallbackImage || banner.image,
      assetSource: 'banner-manifest',
    };
  });
}
