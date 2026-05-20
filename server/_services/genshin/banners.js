/**
 * Genshin Banners API Endpoint
 * Discovers live Genshin banners from paimon.moe
 * Images: Our Cloudinary assets primary, paimon.moe fallback
 */

import { GENSHIN_BANNER_CONTROL } from './bannerControl.js';
import { resolveGenshinCharacterImage, resolveGenshinWeaponImage } from '../../utils/gameAssetResolver.js';
import { applyBannerAssetManifest } from '../../utils/bannerAssetManifest.js';

const PAIMON_API = 'https://api.paimon.moe/wish';
const GENSHIN_CHAR_IMG_BASE = 'https://paimon.moe/images/characters/';
const GENSHIN_WEAPON_IMG_BASE = 'https://paimon.moe/images/weapons/';
const GENSHIN_BANNER_IMG_BASE = 'https://paimon.moe/images/banners/';
const CACHE_TTL_MS = 5 * 60 * 1000;
const EXACT_FETCH_TIMEOUT_MS = 1800;
const DISCOVERY_FETCH_TIMEOUT_MS = 900;
const DISCOVERY_WINDOW = 8;
const FORCE_BANNER_FALLBACK = process.env.BANNER_FORCE_FALLBACK === 'true';

let bannerCache = {
  data: null,
  timestamp: 0,
};

let inFlightRequest = null;

const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'a', 'an']);
const GENSHIN_FEATURED_CHAR_WHITELIST = new Set([
  'albedo', 'alhaitham', 'arataki_itto', 'arlecchino', 'ayaka', 'ayato',
  'baizhu', 'chasca', 'chiori', 'citlali', 'clorinde', 'columbina', 'cyno',
  'emilie', 'escoffier', 'furina', 'ganyu', 'hu_tao', 'iansan', 'ineffa',
  'kazuha', 'klee', 'kokomi', 'lauma', 'linnea', 'lyney',
  'mavuika', 'mualani', 'nahida', 'navia', 'nefer', 'neuvillette', 'nilou',
  'nicole', 'raiden_shogun', 'shenhe', 'sigewinne', 'skirk', 'tartaglia', 'traveler',
  'venti', 'wanderer', 'wriothesley', 'xianyun', 'xiao', 'yae_miko', 'yelan',
  'yoimiya', 'zhongli', 'zibai'
]);
const GENSHIN_FEATURED_WEAPON_WHITELIST = new Set([
  'absolution', 'aqua_simulacra', 'amos_bow', 'astral_vultures_crimson_plumage',
  'azurelight', 'beacon_of_the_reed_sea', 'bloodsoaked_ruins',
  'calamity_queller', 'cashflow_supervision', 'cranes_echoing_call',
  'crimson_moons_semblance', 'elegy_for_the_end', 'engulfing_lightning',
  'everlasting_moonglow', 'fang_of_the_mountain_king', 'flower_wreathed_feathers',
  'fractured_halo', 'freedom_sworn', 'gest_of_the_mighty_wolf',
  'golden_frostbound_oath', 'haran_geppaku_futsu', 'hunters_path',
  'kaguras_verity', 'light_of_foliar_incision', 'lightbearing_moonshard',
  'lost_prayer', 'lumidouce_elegy', 'mistsplitter_reforged',
  'angelos_heptades', 'athame_artis', 'nightweavers_looking_glass', 'nocturnes_curtain_call', 'polar_star',
  'primordial_jade_cutter', 'primordial_jade_winged_spear', 'redhorn_stonethresher',
  'reliquary_of_truth', 'splendor_of_tranquil_waters', 'staff_of_homa',
  'symphonist_of_scents', 'thundering_pulse', 'tome_of_the_eternal_flow',
  'tulaytullahs_remembrance', 'uraku_misugiri', 'vortex_vanquisher',
  'wolfs_gravestone'
]);

function toTitleCaseFromSlug(slug) {
  return slug
    .split('_')
    .map((word, idx) =>
      (idx > 0 && MINOR_WORDS.has(word.toLowerCase()))
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function toPaimonSlug(name) {
  return (name || '')
    .toLowerCase()
    .split(' / ')[0]
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function fetchWithTimeout(url, options = {}, timeoutMs = EXACT_FETCH_TIMEOUT_MS) {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  }).catch(error => {
    if (error.name === 'TimeoutError') {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw error;
  });
}

function buildControlledFallbackBanners() {
  const characterId = GENSHIN_BANNER_CONTROL.characterBannerId;
  const weaponId = GENSHIN_BANNER_CONTROL.weaponBannerId;
  const characterName = GENSHIN_BANNER_CONTROL.overrideCharacterName || 'Current Character Banner';
  const weaponName = GENSHIN_BANNER_CONTROL.overrideWeaponName || 'Current Weapon Banner';
  const characterSlug = toPaimonSlug(characterName);
  const weaponSlug = toPaimonSlug(weaponName);
  const characterFallback = GENSHIN_BANNER_CONTROL.overrideCharacterImage || `${GENSHIN_CHAR_IMG_BASE}${characterSlug}.png`;
  const weaponFallback = GENSHIN_BANNER_CONTROL.overrideWeaponImage || `${GENSHIN_WEAPON_IMG_BASE}${weaponSlug}.png`;

  return [
    {
      id: `${characterId}_character`,
      bannerId: characterId,
      name: characterName,
      type: 'character',
      image: GENSHIN_BANNER_CONTROL.overrideCharacterImage || resolveGenshinCharacterImage(characterSlug, characterFallback),
      fallbackImage: characterFallback,
      characterId: characterSlug,
      game: 'genshin',
      source: 'controlled-fallback',
      assetLocked: Boolean(GENSHIN_BANNER_CONTROL.overrideCharacterImage),
    },
    {
      id: `${weaponId}_weapon`,
      bannerId: weaponId,
      name: weaponName,
      type: 'weapon',
      image: GENSHIN_BANNER_CONTROL.overrideWeaponImage || resolveGenshinWeaponImage(weaponSlug, weaponFallback),
      fallbackImage: weaponFallback,
      characterId: 'weapon_banner',
      game: 'genshin',
      source: 'controlled-fallback',
      assetLocked: Boolean(GENSHIN_BANNER_CONTROL.overrideWeaponImage),
    },
  ];
}



function extractFeaturedCharacterSlugs(list) {
  if (!list || list.length === 0) return [];

  const standard = ['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya', 'ororon', 'lan_yan'];
  const fourStarBlocklist = [
    'fischl', 'bennett', 'xiangling', 'xingqiu', 'barbara', 'noelle', 'sucrose', 'diona', 'chongyun', 'razor',
    'beidou', 'ningguang', 'yanfei', 'rosaria', 'xinyan', 'sayu', 'kujou_sara', 'thoma', 'gorou', 'yun_jin',
    'kuki_shinobu', 'heizou', 'collei', 'dori', 'candace', 'layla', 'faruzan', 'yaoyao', 'mika', 'kaveh',
    'kirara', 'lynette', 'freminet', 'charlotte', 'gaming', 'chevreuse', 'sethos', 'kachina', 'aino',
    'ifa', 'illuga', 'dahlia', 'shikanoin_heizou', 'lan_yan', 'jahoda'
  ];

  // Strategy 1: Try whitelist first (for known characters)
  const curated = list
    .filter(item => item.type === 'character' && GENSHIN_FEATURED_CHAR_WHITELIST.has(item.name.toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);

  if (curated.length > 0) return curated;

  // Strategy 2: Legacy heuristic fallback
  return list
    .filter(item => {
      if (item.type !== 'character') return false;
      const name = item.name.toLowerCase();
      if (standard.includes(name)) return false;
      if (fourStarBlocklist.includes(name)) return false;
      return item.count >= 300 && item.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);
}

function extractFeaturedWeaponSlugs(list) {
  if (!list || list.length === 0) return [];

  const standardWeapons = [
    'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
    'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
    'skyward_blade', 'aquila_favonia'
  ];

  const weapon4StarBlocklist = [
    'mitternachts_waltz', 'mountain-bracing_bolt', 'winters_vigil', 'lithic_blade',
    'lithic_spear', 'wavebreakers_fin', 'akuoumaru', 'mounns_moon', 'rust',
    'favonius_warbow', 'eye_of_perception', 'the_flute', 'the_bell',
    'sacrificial_sword', 'sacrificial_greatsword', 'sacrificial_bow', 'sacrificial_fragments',
    'favonius_sword', 'favonius_greatsword', 'favonius_lance', 'favonius_codex',
    'dragons_bane', 'the_widsith', 'rainslasher', 'lions_roar', 'the_stringless',
    'the_dockhands_assistant', 'portable_power_saw', 'range_gauge', 'waveriding_whirl'
  ];

  const curated = list
    .filter(item => item.type === 'weapon' && GENSHIN_FEATURED_WEAPON_WHITELIST.has(item.name.toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);

  if (curated.length > 0) return curated;

  return list
    .filter(item => {
      if (item.type !== 'weapon') return false;
      const name = item.name.toLowerCase();
      if (standardWeapons.includes(name)) return false;
      if (weapon4StarBlocklist.includes(name)) return false;
      return item.count > 200 && item.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);
}

function buildCharacterBannerPayload(bannerId, slugs, legendaryCount, source = 'auto') {
  if (!slugs.length) return null;

  const slug = slugs[0];
  const fallbackImage = `${GENSHIN_CHAR_IMG_BASE}${slug}.png`;
  return {
    id: `${bannerId}_character`,
    bannerId,
    name: slugs.map(toTitleCaseFromSlug).join(' / '),
    type: 'character',
    image: resolveGenshinCharacterImage(slug, fallbackImage),
    fallbackImage,
    characterId: slug,
    game: 'genshin',
    source,
    pullCount: legendaryCount
  };
}

function buildWeaponBannerPayload(bannerId, slugs, legendaryCount, source = 'auto') {
  const name = slugs.length ? slugs.map(toTitleCaseFromSlug).join(' / ') : 'Epitome Invocation';
  const fallbackImage = `${GENSHIN_BANNER_IMG_BASE}Epitome%20Invocation%20${bannerId.slice(-2)}.png`;
  const primaryImage = slugs.length
    ? resolveGenshinWeaponImage(slugs[0], fallbackImage)
    : fallbackImage;

  return {
    id: `${bannerId}_weapon`,
    bannerId,
    name,
    type: 'weapon',
    image: primaryImage,
    fallbackImage,
    characterId: 'weapon_banner',
    game: 'genshin',
    source,
    pullCount: legendaryCount
  };
}

function applyControlledOverride(banner) {
  if (!banner) return null;

  if (banner.type === 'character' && String(banner.bannerId) === GENSHIN_BANNER_CONTROL.characterBannerId) {
    const fallbackImage = GENSHIN_BANNER_CONTROL.overrideCharacterImage || banner.fallbackImage || banner.image;
    const name = GENSHIN_BANNER_CONTROL.overrideCharacterName || banner.name;
    const characterId = toPaimonSlug(name);
    return {
      ...banner,
      name,
      characterId,
      image: GENSHIN_BANNER_CONTROL.overrideCharacterImage || resolveGenshinCharacterImage(characterId, fallbackImage),
      fallbackImage,
      assetLocked: Boolean(GENSHIN_BANNER_CONTROL.overrideCharacterImage),
    };
  }

  if (banner.type === 'weapon' && String(banner.bannerId) === GENSHIN_BANNER_CONTROL.weaponBannerId) {
    const fallbackImage = GENSHIN_BANNER_CONTROL.overrideWeaponImage || banner.fallbackImage || banner.image;
    const name = GENSHIN_BANNER_CONTROL.overrideWeaponName || banner.name;
    return {
      ...banner,
      name,
      image: GENSHIN_BANNER_CONTROL.overrideWeaponImage || resolveGenshinWeaponImage(toPaimonSlug(name), fallbackImage),
      fallbackImage,
      assetLocked: Boolean(GENSHIN_BANNER_CONTROL.overrideWeaponImage),
    };
  }

  return banner;
}

function pickNewestBanner(...banners) {
  return banners
    .filter(Boolean)
    .sort((a, b) => Number.parseInt(String(b.bannerId || '0'), 10) - Number.parseInt(String(a.bannerId || '0'), 10))[0] || null;
}

/**
 * Auto-discover the current banner by scanning from a high predicted ID downward.
 * No hardcoded IDs needed — automatically adapts to new patches.
 */
async function discoverBannerAuto(prefix, type) {
  const controlledId = type === 'character'
    ? GENSHIN_BANNER_CONTROL.characterBannerId
    : GENSHIN_BANNER_CONTROL.weaponBannerId;
  const controlledNumber = Number.parseInt(String(controlledId || '').slice(3), 10);
  const MAX_ID = Number.isFinite(controlledNumber) ? controlledNumber + 2 : 120;
  const MIN_ID = Math.max(70, MAX_ID - DISCOVERY_WINDOW);

  for (let i = MAX_ID; i >= MIN_ID; i--) {
    const bannerId = `${prefix}${String(i).padStart(3, '0')}`;
    try {
      const response = await fetchWithTimeout(`${PAIMON_API}?banner=${bannerId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0)'
        },
      }, DISCOVERY_FETCH_TIMEOUT_MS);

      if (!response.ok) continue;

      const data = await response.json();
      const legendaryCount = data?.total?.legendary || 0;
      if (legendaryCount <= 1000) continue;

      if (type === 'character') {
        const slugs = extractFeaturedCharacterSlugs(data.list);
        const payload = buildCharacterBannerPayload(bannerId, slugs, legendaryCount, 'auto');
        if (payload) {
          console.log(`[Genshin Auto] Found character banner ${bannerId}: ${payload.name}`);
          return payload;
        }
      } else {
        const slugs = extractFeaturedWeaponSlugs(data.list);
        const payload = buildWeaponBannerPayload(bannerId, slugs, legendaryCount, 'auto');
        if (payload) {
          console.log(`[Genshin Auto] Found weapon banner ${bannerId}: ${payload.name}`);
          return payload;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchBannerByExactId(bannerId, type) {
  if (!bannerId) return null;

  try {
    const response = await fetchWithTimeout(`${PAIMON_API}?banner=${bannerId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0)'
      },
    }, EXACT_FETCH_TIMEOUT_MS);

    if (!response.ok) return null;

    const data = await response.json();
    const legendaryCount = data?.total?.legendary || 0;
    if (legendaryCount < 200) return null;

    if (type === 'character') {
      const slugs = extractFeaturedCharacterSlugs(data.list);
      return buildCharacterBannerPayload(bannerId, slugs, legendaryCount, 'manual-id');
    }

    const slugs = extractFeaturedWeaponSlugs(data.list);
    return buildWeaponBannerPayload(bannerId, slugs, legendaryCount, 'manual-id');
  } catch {
    return null;
  }
}

async function loadGenshinBanners() {
  const cacheValid = bannerCache.data && Date.now() - bannerCache.timestamp < CACHE_TTL_MS;
  if (cacheValid) {
    return bannerCache.data;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    const fallbackBanners = buildControlledFallbackBanners();
    const [exactCharacter, exactWeapon, autoCharacter, autoWeapon] = await Promise.all([
      fetchBannerByExactId(GENSHIN_BANNER_CONTROL.characterBannerId, 'character'),
      fetchBannerByExactId(GENSHIN_BANNER_CONTROL.weaponBannerId, 'weapon'),
      discoverBannerAuto('300', 'character'),
      discoverBannerAuto('400', 'weapon'),
    ]);

    let allBanners = [
      pickNewestBanner(exactCharacter, autoCharacter) || fallbackBanners.find((banner) => banner.type === 'character'),
      pickNewestBanner(exactWeapon, autoWeapon) || fallbackBanners.find((banner) => banner.type === 'weapon'),
    ].filter(Boolean).map(applyControlledOverride);

    if (allBanners.length === 0) {
      allBanners = fallbackBanners;
    }

    allBanners.sort((a, b) => parseInt(b.bannerId, 10) - parseInt(a.bannerId, 10));
    bannerCache = {
      data: allBanners,
      timestamp: Date.now(),
    };
    return allBanners;
  })().finally(() => {
    inFlightRequest = null;
  });

  return inFlightRequest;
}

export async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (FORCE_BANNER_FALLBACK) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(await applyBannerAssetManifest(buildControlledFallbackBanners()));
  }

  try {
    console.log('[Genshin Banners API] Loading current banners...');
    const allBanners = await loadGenshinBanners();

    console.log(
      '[Genshin Banners API] Discovered',
      allBanners.length,
      'active banner(s):',
      allBanners.map(b => `${b.name} (${b.bannerId})`).join(', ')
    );

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(await applyBannerAssetManifest(allBanners));
  } catch (error) {
    console.error('[Genshin Banners API] Error, returning controlled fallback:', error);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json(await applyBannerAssetManifest(buildControlledFallbackBanners()));
  }

  /*
  try {
    console.log('[Genshin Banners API] Auto-discovering current banners...');

    // Fully dynamic discovery — no hardcoded IDs
    const [characterBanner, weaponBanner] = await Promise.all([
      discoverBannerAuto('300', 'character'),
      discoverBannerAuto('400', 'weapon')
    ]);

    const allBanners = [characterBanner, weaponBanner].filter(Boolean);
    allBanners.sort((a, b) => parseInt(b.bannerId, 10) - parseInt(a.bannerId, 10));

    console.log(
      '[Genshin Banners API] Discovered',
      allBanners.length,
      'active banner(s):',
      allBanners.map(b => `${b.name} (${b.bannerId})`).join(', ')
    );

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(allBanners);
  } catch (error) {
    console.error('[Genshin Banners API] Fatal Error:', error);
    return res.status(500).json({ error: 'Failed to discover Genshin banners', message: error.message });
  }
  */
}
