import { GENSHIN_BANNER_CONTROL } from '../server/_services/genshin/bannerControl.js';
// Patch-day banner IDs live in server/_services/genshin/bannerControl.js

// =========================================================================
// GENSHIN CONTROL CENTER - Edit this for new characters!
// =========================================================================
const GENSHIN_CONFIG = {
  // Character Whitelist (Add new 5-stars here - LOWERCASE ONLY)
  characters: [
    'albedo', 'alhaitham', 'arataki_itto', 'arlecchino', 'ayaka', 'ayato',
    'baizhu', 'chasca', 'chiori', 'clorinde', 'columbina', 'cyno', 'emilie',
    'furina', 'ganyu', 'hu_tao', 'iansan', 'ineffa', 'kazuha', 'klee',
    'kokomi', 'lyney', 'mavuika', 'mualani', 'nahida', 'navia', 'neuvillette',
    'nilou', 'raiden_shogun', 'shenhe', 'sigewinne', 'tartaglia', 'traveler',
    'venti', 'wanderer', 'wriothesley', 'xiao', 'xianyun', 'yae_miko', 'yelan',
    'yoimiya', 'zhongli', 'zibai', 'skirk', 'escoffier', 'linnea', 'lauma', 'nefer',
    'jahoda', 'citlali', 'mavuika'
  ],

  // 3. Weapon Whitelist (Add new 5-star weapons here - LOWERCASE ONLY)
  weapons: [
    'absolution', 'aqua_simulacra', 'amos_bow', 'beacon_of_the_reed_sea',
    'calamity_queller', 'cashflow_supervision', 'cranes_echoing_call',
    'crimson_moons_semblance', 'elegy_for_the_end', 'engulfing_lightning',
    'everlasting_moonglow', 'fang_of_the_mountain_king', 'fractured_halo',
    'freedom_sworn', 'haran_geppaku_futsu', 'hunters_path', 'kaguras_verity',
    'light_of_foliar_incision', 'lost_prayer', 'lumidouce_elegy',
    'mistsplitter_reforged', 'nocturnes_curtain_call', 'polar_star',
    'primordial_jade_cutter', 'primordial_jade_winged_spear', 'redhorn_stonethresher',
    'splendor_of_tranquil_waters', 'staff_of_homa', 'thundering_pulse',
    'tome_of_the_eternal_flow', 'tulaytullahs_remembrance', 'uraku_misugiri',
    'vortex_vanquisher', 'wolfs_gravestone', 'lightbearing_moonshard',
    'gest_of_the_mighty_wolf', 'bloodsoaked_ruins', 'azurelight', 'symphonist_of_scents', 'golden_frostbound_oath', 'astral_vultures_crimson_plumage',
    'nightweavers_looking_glass', 'reliquary_of_truth', 'flower_wreathed_feathers', 'astral_vultures_crimson_plumage'
  ],

  // Standard characters that should NEVER be the banner name
  standard: ['tighnari', 'dehya', 'diluc', 'jean', 'keqing', 'mona', 'qiqi', 'ororon', 'lanyan', 'aino', 'ifa', 'illuga', 'dahlia']
};

const CONFIG = {
  CACHE_HOURS: 0.016, // ~1 minute cache
  CACHE_VERSION: 9, // Increment this to force cache refresh after banner discovery updates
  TIMEOUT_MS: 8000,
  TIMEOUT_GENSHIN: 3000,
  TIMEOUT_WUWA: 5000,

  STARRAIL_API: 'https://starrailstation.com/api/v1',
  PAIMON_API: 'https://api.paimon.moe/wish',
  WUWA_TRACKER: 'https://wuwatracker.com/tracker/stats',
  STARRAIL_RES: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master'
};

const CACHE_DURATION = CONFIG.CACHE_HOURS * 60 * 60 * 1000;
const CACHE_KEY = `banner_cache_v${CONFIG.CACHE_VERSION}`;

// =========================================================================
// CACHE - Stores banner data temporarily to reduce API calls
// =========================================================================
let BANNER_CACHE = {
  data: null,
  timestamp: 0,
  version: CONFIG.CACHE_VERSION,
  game: 'all'
};

function normalizeGameQuery(value) {
  const normalized = String(value || 'all').trim().toLowerCase();
  return ['all', 'hsr', 'genshin', 'wuwa'].includes(normalized) ? normalized : 'all';
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

// Fetch with automatic timeout (prevents requests from hanging forever)
async function fetchWithTimeout(url, timeoutMs = CONFIG.TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// =========================================================================
// HSR BANNER FETCHING
// =========================================================================
async function fetchHSRActiveBanners() {
  try {
    const nowTs = Date.now();
    // 1. Fetch HSR banner config from StarRailStation
    const configRes = await fetchWithTimeout(`${CONFIG.STARRAIL_API}/warp_config?_t=${nowTs}`);
    if (!configRes.ok) return [];
    const configData = await configRes.json();

    // 2. Filter Active Banners
    const currentSeconds = nowTs / 1000;
    // 3. Fetch metadata (character/weapon names and images)
    const [charRes, lcRes] = await Promise.all([
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/characters.json`),
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/light_cones.json`)
    ]);

    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};
    const gachaList = configData.config?.banners || {};
    const FEATURED_KEY_RE = /(rate.?up|featured|up_?5|rateup_?5|rarity_?5|five.?star)/i;

    const parseFeaturedIds = (value, collected = []) => {
      if (value == null) return collected;
      if (Array.isArray(value)) {
        value.forEach(item => parseFeaturedIds(item, collected));
        return collected;
      }
      if (typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          if (FEATURED_KEY_RE.test(key) || typeof nested === 'object') {
            parseFeaturedIds(nested, collected);
          }
        }
        return collected;
      }

      const stringValue = String(value).trim();
      if (/^\d+$/.test(stringValue)) {
        collected.push(stringValue);
      }
      return collected;
    };

    const extractFeaturedIds = (bannerData) => {
      const directCandidates = [
        bannerData?.rateup,
        bannerData?.rateup_5,
        bannerData?.rate_up,
        bannerData?.up_5,
        bannerData?.featured,
        bannerData?.featured_5,
        bannerData?.rarity_5,
        bannerData?.five_star,
      ];

      const collected = [];
      directCandidates.forEach(value => parseFeaturedIds(value, collected));

      if (collected.length === 0) {
        for (const [key, value] of Object.entries(bannerData || {})) {
          if (FEATURED_KEY_RE.test(key)) {
            parseFeaturedIds(value, collected);
          }
        }
      }

      const uniqueIds = [...new Set(collected)];
      const mappedFiveStars = uniqueIds.filter((id) => {
        const entry = charMap[id] || lcMap[id];
        return Number(entry?.rarity) === 5;
      });

      return mappedFiveStars.length > 0 ? mappedFiveStars : uniqueIds;
    };

    const activeCandidates = [];
    for (const [bid, bdata] of Object.entries(gachaList)) {
      if (!(bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time)) continue;

      const featuredIds = extractFeaturedIds(bdata);
      for (const featuredId of featuredIds) {
        activeCandidates.push({ id: bid, charId: String(featuredId) });
      }
    }

    const dedupedCandidates = activeCandidates.filter((candidate, index, array) =>
      array.findIndex(item => item.id === candidate.id && item.charId === candidate.charId) === index
    );

    if (dedupedCandidates.length === 0) return [];

    const HSR_TEMP_CHARACTER_FALLBACK = {
      name: 'Silver Wolf LV.999',
      image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
      type: 'character',
    };
    const HSR_TEMP_LIGHT_CONE_FALLBACK = {
      id: '3116',
      name: 'Silver Wolf LV.999 Light Cone',
      image: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp',
      type: 'light_cone',
      characterId: '23006',
      game: 'hsr',
    };

    // 4. Map IDs to Names and Images
    const liveBanners = dedupedCandidates.map(b => {
      const charData = charMap[b.charId];
      const lcData = lcMap[b.charId];

      if (charData) {
        return {
          id: b.id,
          name: charData.name,
          type: "character",
          characterId: b.charId,
          image: `${CONFIG.STARRAIL_RES}/icon/character/${b.charId}.png`,
          portrait: `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/character_portrait/${b.charId}`,
          game: 'hsr'
        };
      } else if (lcData) {
        return {
          id: b.id,
          name: lcData.name,
          type: "light_cone",
          characterId: b.charId,
          image: `${CONFIG.STARRAIL_RES}/icon/light_cone/${b.charId}.png`,
          portrait: `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/lightcone_preview/${b.charId}`,
          game: 'hsr'
        };
      } else {
        return {
          id: b.id,
          name: `Unknown (${b.charId})`,
          type: "unknown",
          characterId: b.charId,
          image: null,
          game: 'hsr'
        };
      }
    });

    // Temporary production fallback:
    // if the current active HSR set clearly matches the Firefly / Castorice / Dahlia patch
    // and one featured unit is still missing from StarRailRes metadata, surface it as
    // Silver Wolf LV.999 instead of dropping it as "unknown".
    const knownCharacterNames = new Set(
      liveBanners.filter((banner) => banner.type === 'character').map((banner) => String(banner.name || '').trim())
    );
    const exactLv999Index = liveBanners.findIndex((banner) => String(banner.id) === '2116');
    if (exactLv999Index !== -1) {
      liveBanners[exactLv999Index] = {
        ...liveBanners[exactLv999Index],
        name: HSR_TEMP_CHARACTER_FALLBACK.name,
        image: HSR_TEMP_CHARACTER_FALLBACK.image,
        type: HSR_TEMP_CHARACTER_FALLBACK.type,
      };
    } else if (
      knownCharacterNames.has('Firefly') &&
      knownCharacterNames.has('Castorice') &&
      knownCharacterNames.has('Dahlia')
    ) {
      const unknownIndex = liveBanners.findIndex((banner) => banner.type === 'unknown');
      if (unknownIndex !== -1) {
        liveBanners[unknownIndex] = {
          ...liveBanners[unknownIndex],
          name: HSR_TEMP_CHARACTER_FALLBACK.name,
          image: HSR_TEMP_CHARACTER_FALLBACK.image,
          type: HSR_TEMP_CHARACTER_FALLBACK.type,
        };
      }
    }

    const exactLv999LcIndex = liveBanners.findIndex((banner) => String(banner.id) === '3116');
    if (exactLv999LcIndex !== -1) {
      liveBanners[exactLv999LcIndex] = {
        ...liveBanners[exactLv999LcIndex],
        name: HSR_TEMP_LIGHT_CONE_FALLBACK.name,
        image: HSR_TEMP_LIGHT_CONE_FALLBACK.image,
        type: HSR_TEMP_LIGHT_CONE_FALLBACK.type,
      };
    } else if (exactLv999Index !== -1) {
      liveBanners.push({
        ...HSR_TEMP_LIGHT_CONE_FALLBACK,
      });
    }

    console.log('[HSR] Found', liveBanners.length, 'active banners');
    return liveBanners;
  } catch (error) {
    console.error('[HSR] Fetch error:', error);
    return [];
  }
}

// =========================================================================
// GENSHIN BANNER FETCHING
// =========================================================================

const GENSHIN_MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'a', 'an']);

function toTitleCaseFromSlug(slug) {
  return slug
    .split('_')
    .map((word, idx) =>
      (idx > 0 && GENSHIN_MINOR_WORDS.has(word.toLowerCase()))
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

const GENSHIN_FOUR_STAR_CHARACTER_BLOCKLIST = new Set([
  'fischl', 'chevreuse', 'bennett', 'xiangling', 'xingqiu', 'barbara',
  'noelle', 'sucrose', 'diona', 'chongyun', 'razor', 'beidou', 'ningguang',
  'yanfei', 'rosaria', 'xinyan', 'sayu', 'kujou_sara', 'thoma', 'gorou',
  'yun_jin', 'kuki_shinobu', 'heizou', 'collei', 'dori', 'candace', 'layla',
  'faruzan', 'yaoyao', 'mika', 'kaveh', 'kirara', 'lynette', 'freminet',
  'charlotte', 'gaming', 'sethos', 'kachina', 'ororon', 'lan_yan', 'lanyan', 'aino',
  'ifa', 'illuga', 'dahlia', 'shikanoin_heizou', 'yaoyao'
]);

const GENSHIN_FOUR_STAR_WEAPON_BLOCKLIST = new Set([
  'mitternachts_waltz', 'mountain-bracing_bolt', 'winters_vigil', 'lithic_blade',
  'lithic_spear', 'wavebreakers_fin', 'akuoumaru', 'mounns_moon', 'rust',
  'favonius_warbow', 'eye_of_perception', 'the_flute', 'the_bell',
  'sacrificial_sword', 'sacrificial_greatsword', 'sacrificial_bow', 'sacrificial_fragments',
  'favonius_sword', 'favonius_greatsword', 'favonius_lance', 'favonius_codex',
  'dragons_bane', 'the_widsith', 'rainslasher', 'lions_roar', 'the_stringless',
  'the_dockhands_assistant', 'portable_power_saw', 'range_gauge', 'waveriding_whirl'
]);

const GENSHIN_STANDARD_WEAPONS = new Set([
  'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
  'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
  'skyward_blade', 'aquila_favonia'
]);

function extractGenshinFeaturedCharacterSlugs(pullList) {
  if (!pullList || pullList.length === 0) return [];

  const normalized = pullList.filter(p =>
    p.type === 'character' &&
    !GENSHIN_CONFIG.standard.includes(p.name.toLowerCase())
  );

  const curated = normalized.filter(p => GENSHIN_CONFIG.characters.includes(p.name.toLowerCase()));
  if (curated.length > 0) {
    return curated
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map(p => p.name);
  }

  return normalized
    .filter(p => {
      const slug = p.name.toLowerCase();
      if (GENSHIN_FOUR_STAR_CHARACTER_BLOCKLIST.has(slug)) return false;
      return p.count > 300 && p.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
}

function extractGenshinFeaturedWeaponSlugs(pullList) {
  if (!pullList || pullList.length === 0) return [];

  const normalized = pullList.filter(p =>
    p.type === 'weapon' &&
    !GENSHIN_STANDARD_WEAPONS.has(p.name.toLowerCase())
  );

  const curated = normalized.filter(p => GENSHIN_CONFIG.weapons.includes(p.name.toLowerCase()));
  if (curated.length > 0) {
    return curated
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map(p => p.name);
  }

  return normalized
    .filter(p => {
      const slug = p.name.toLowerCase();
      if (GENSHIN_FOUR_STAR_WEAPON_BLOCKLIST.has(slug)) return false;
      return p.count > 200 && p.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
}

// Helper: Extract banner name from pull history
function extractGenshinBannerName(pullList) {
  const featured = extractGenshinFeaturedCharacterSlugs(pullList);
  if (featured.length === 0) return 'Character Event Wish';
  return featured.map(toTitleCaseFromSlug).join(' / ');
}

// Helper: Extract weapon banner names
function extractGenshinWeaponNames(pullList) {
  const featured = extractGenshinFeaturedWeaponSlugs(pullList);
  if (featured.length === 0) return 'Epitome Invocation';
  return featured.map(toTitleCaseFromSlug).join(' / ');
}
async function fetchActiveGenshinBanners() {
  // 1. Build normalized banner payload from paimon.moe list data
  const buildBannerPayload = (bannerId, type, list, source) => {
    const featuredSlugs = type === 'weapon'
      ? extractGenshinFeaturedWeaponSlugs(list)
      : extractGenshinFeaturedCharacterSlugs(list);

    if (type === 'character' && featuredSlugs.length === 0) return null;

    const name = type === 'weapon'
      ? (featuredSlugs.length ? featuredSlugs.map(toTitleCaseFromSlug).join(' / ') : 'Epitome Invocation')
      : featuredSlugs.map(toTitleCaseFromSlug).join(' / ');

    const firstSlug = featuredSlugs[0];
    const image = type === 'weapon'
      ? `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerId.slice(-2)}.png`
      : (firstSlug ? `https://paimon.moe/images/characters/${firstSlug}.png` : null);

    return { id: bannerId, name, type, image, game: 'genshin', source };
  };

  // 2. Search nearby IDs (auto-discovery)
  const findBannerNear = async (startId, prefix, type) => {
    const scanRange = [];
    for (let i = startId + 2; i >= startId - 8 && i >= 0; i--) {
      scanRange.push(`${prefix}${String(i).padStart(3, '0')}`);
    }

    for (const bannerId of scanRange) {
      try {
        const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
        if (!res.ok) continue;

        const data = await res.json();
        const legendaryCount = data?.total?.legendary || 0;
        if (legendaryCount <= 1000) continue;

        const payload = buildBannerPayload(bannerId, type, data.list, 'auto');
        if (payload) return payload;
      } catch {
        continue;
      }
    }

    return null;
  };

  // 3. Exact ID fallback (single source-of-truth: GENSHIN_BANNER_CONTROL)
  const fetchBannerByExactId = async (bannerId, type) => {
    if (!bannerId) return null;

    try {
      const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
      if (!res.ok) return null;

      const data = await res.json();
      const legendaryCount = data?.total?.legendary || 0;
      if (legendaryCount < 200) return null;

      return buildBannerPayload(bannerId, type, data.list, 'manual-id');
    } catch {
      return null;
    }
  };

  console.log('[Genshin] Running intelligent auto-discovery...');

  const targetCharId = parseInt(GENSHIN_BANNER_CONTROL.characterBannerId?.slice(-3) || '97', 10);
  const targetWpnId = parseInt(GENSHIN_BANNER_CONTROL.weaponBannerId?.slice(-3) || '95', 10);

  const [charExact, wpnExact] = await Promise.all([
    fetchBannerByExactId(GENSHIN_BANNER_CONTROL.characterBannerId, 'character'),
    fetchBannerByExactId(GENSHIN_BANNER_CONTROL.weaponBannerId, 'weapon')
  ]);

  let characterBanner = charExact;
  let weaponBanner = wpnExact;

  if (!characterBanner) {
    characterBanner = await findBannerNear(targetCharId, '300', 'character');
  }
  if (!weaponBanner) {
    weaponBanner = await findBannerNear(targetWpnId, '400', 'weapon');
  }

  // 4. Optional emergency manual overrides (lowest priority)
  if (GENSHIN_BANNER_CONTROL.overrideCharacterName) {
    const forcedCharSlug = toPaimonSlug(GENSHIN_BANNER_CONTROL.overrideCharacterName);
    characterBanner = {
      id: GENSHIN_BANNER_CONTROL.characterBannerId,
      name: GENSHIN_BANNER_CONTROL.overrideCharacterName,
      type: 'character',
      image: GENSHIN_BANNER_CONTROL.overrideCharacterImage || (forcedCharSlug ? `https://paimon.moe/images/characters/${forcedCharSlug}.png` : characterBanner?.image || null),
      game: 'genshin',
      source: 'manual-override'
    };
  }

  if (GENSHIN_BANNER_CONTROL.overrideWeaponName) {
    const forcedWeaponSlug = toPaimonSlug(GENSHIN_BANNER_CONTROL.overrideWeaponName);
    weaponBanner = {
      id: GENSHIN_BANNER_CONTROL.weaponBannerId,
      name: GENSHIN_BANNER_CONTROL.overrideWeaponName,
      type: 'weapon',
      image: GENSHIN_BANNER_CONTROL.overrideWeaponImage || (forcedWeaponSlug
        ? `https://paimon.moe/images/weapons/${forcedWeaponSlug}.png`
        : (weaponBanner?.image || `https://paimon.moe/images/banners/Epitome%20Invocation%20${GENSHIN_BANNER_CONTROL.weaponBannerId.slice(-2)}.png`)),
      game: 'genshin',
      source: 'manual-override'
    };
  }

  return [characterBanner, weaponBanner].filter(Boolean);
}
// =========================================================================
// WUWA BANNER FETCHING (HTML Scraping)
// =========================================================================
const WUWA_KNOWN_BANNERS = Object.freeze({
  '100036': {
    name: 'Hiyuki',
    type: 'character',
  },
  '200036': {
    name: 'Frostburn',
    type: 'weapon',
  },
  '101036': {
    name: 'Frostburn',
    type: 'weapon',
  },
  '100035': {
    name: 'Lynae',
    type: 'character',
  },
  '100030': {
    name: 'Lynae',
    type: 'character',
  },
  '200035': {
    name: 'Spectrum Blaster',
    type: 'weapon',
  },
  '200030': {
    name: 'Spectrum Blaster',
    type: 'weapon',
  },
  '100034': {
    name: 'Sigrika',
    type: 'character',
  },
  '200034': {
    name: 'Solsworn Ciphers',
    type: 'weapon',
  },
});

const WUWA_FEATURED_WEAPON_BY_CHARACTER = Object.freeze({
  hiyuki: 'Frostburn',
  lynae: 'Spectrum Blaster',
});

const WUWA_CURRENT_FEATURED_IDS = Object.freeze({
  character: '100036',
  weapon: '200036',
});

function compareWuWaBannerIdsDesc(a, b) {
  return Number.parseInt(String(b?.bannerId || b?.id || '0'), 10) - Number.parseInt(String(a?.bannerId || a?.id || '0'), 10);
}

function pickHighestWuWaBanner(banners) {
  return [...(Array.isArray(banners) ? banners : [])].sort(compareWuWaBannerIdsDesc)[0] || null;
}

function findWuWaBannerById(banners, bannerId) {
  const normalizedId = String(bannerId || '').trim();
  if (!normalizedId) return null;
  return (Array.isArray(banners) ? banners : []).find(
    (banner) => String(banner?.bannerId || banner?.id || '').trim() === normalizedId
  ) || null;
}

function extractWuWaCurrentTitle(html) {
  const match = String(html || '').match(/<title>\s*([^<|]+?)\s*\|\s*Global Statistics/i);
  return match?.[1] ? String(match[1]).trim() : '';
}

function findBannerByTitleMatch(banners, title) {
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (!normalizedTitle) return null;
  return pickHighestWuWaBanner(
    banners.filter((banner) => normalizedTitle.includes(String(banner.name || '').trim().toLowerCase()))
  );
}

function findBannerByExactName(banners, name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;
  return pickHighestWuWaBanner(
    banners.filter((banner) => String(banner.name || '').trim().toLowerCase() === normalizedName)
  );
}

function findBannerByFirstOccurrence(banners, html) {
  const source = String(html || '').toLowerCase();
  let winner = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const banner of banners) {
    const name = String(banner.name || '').trim().toLowerCase();
    if (!name) continue;
    const index = source.indexOf(name);
    if (
      index >= 0 && (
        index < bestIndex ||
        (index === bestIndex && compareWuWaBannerIdsDesc(banner, winner) < 0)
      )
    ) {
      bestIndex = index;
      winner = banner;
    }
  }

  return winner;
}

function selectWuWaVisibleBanners(banners, html) {
  try {
    const characterBanners = banners.filter((banner) => banner.type === 'character');
    const weaponBanners = banners.filter((banner) => banner.type === 'weapon');
    const currentTitle = extractWuWaCurrentTitle(html);

    const forcedCurrentCharacter = findWuWaBannerById(characterBanners, WUWA_CURRENT_FEATURED_IDS.character);
    const forcedCurrentWeapon = findWuWaBannerById(weaponBanners, WUWA_CURRENT_FEATURED_IDS.weapon);

    if (forcedCurrentCharacter || forcedCurrentWeapon) {
      const pairedWeaponName = forcedCurrentCharacter
        ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(forcedCurrentCharacter.name || '').trim().toLowerCase()]
        : '';
      const selectedWeapon =
        forcedCurrentWeapon ||
        findBannerByExactName(weaponBanners, pairedWeaponName) ||
        pickHighestWuWaBanner(weaponBanners) ||
        findBannerByFirstOccurrence(weaponBanners, html) ||
        null;

      return [forcedCurrentCharacter, selectedWeapon].filter(Boolean);
    }

    const selectedCharacter =
      findBannerByTitleMatch(characterBanners, currentTitle) ||
      pickHighestWuWaBanner(characterBanners) ||
      findBannerByFirstOccurrence(characterBanners, html) ||
      null;

    const pairedWeaponName = selectedCharacter
      ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(selectedCharacter.name || '').trim().toLowerCase()]
      : '';

    let selectedWeapon =
      findBannerByExactName(weaponBanners, pairedWeaponName) ||
      pickHighestWuWaBanner(weaponBanners) ||
      findBannerByFirstOccurrence(weaponBanners, html) ||
      null;

    if (selectedCharacter?.name === 'Hiyuki' && selectedWeapon?.name !== 'Frostburn') {
      const forcedFrostburn = weaponBanners.find((banner) =>
        banner.name === 'Frostburn' || String(banner.bannerId || banner.id || '') === WUWA_CURRENT_FEATURED_IDS.weapon
      );
      if (forcedFrostburn) {
        selectedWeapon = forcedFrostburn;
      }
    }

    return [selectedCharacter, selectedWeapon].filter(Boolean);
  } catch (error) {
    console.error('[WuWa] Banner selection failed:', error);
    return banners.slice(0, 2);
  }
}

function buildWuWaCurrentBannerFallback() {
  return [
    {
      id: '100036_character',
      bannerId: '100036',
      name: 'Hiyuki',
      type: 'character',
      image: buildWuWaImageUrl('character-portraits', 'hiyuki-portrait.webp'),
      game: 'wuwa'
    },
    {
      id: '200036_weapon',
      bannerId: '200036',
      name: 'Frostburn',
      type: 'weapon',
      image: buildWuWaImageUrl('weapon-portraits', 'frostburn-portrait.png'),
      game: 'wuwa'
    }
  ];
}

function slugifyWuWaName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildWuWaImageUrl(folder, fileName) {
  return `https://wuwatracker.com/_next/image?url=${encodeURIComponent(`/api/${folder}/file/${fileName}`)}&w=828&q=75`;
}

function extractWuWaImageFromHtml(html) {
  const patterns = [
    /\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"'\\\s>]+/gi,
    /\/api\/(?:character|weapon)-portraits\/file\/[^"'\\\s>]+/gi,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[0]) continue;

    // Fix malformed URLs (e.g. &amp; instead of &) and escape sequences
    const raw = match[0]
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/\\/g, '');

    if (raw.startsWith('/_next/image')) {
      return raw.startsWith('http') ? raw : `https://wuwatracker.com${raw}`;
    }
    const cleaned = raw.replace(/^\/+/, '');
    return `https://wuwatracker.com/${cleaned}`;
  }

  return null;
}

async function fetchWuWaStatsImage(bannerId, bannerName, type) {
  try {
    const statsUrl = `https://wuwatracker.com/tracker/stats/${bannerId}`;
    const directRes = await fetchWithTimeout(statsUrl, CONFIG.TIMEOUT_WUWA);
    if (directRes.ok) {
      const html = await directRes.text();
      const extracted = extractWuWaImageFromHtml(html);
      if (extracted) return extracted;
    }
  } catch (e) {
    console.warn(`[WuWa] Stats image fetch failed for ${bannerName || bannerId}: ${e.message}`);
  }

  const known = WUWA_KNOWN_BANNERS[String(bannerId)] || null;
  const resolvedType = known?.type || type;
  const folder = resolvedType === 'character' ? 'character-portraits' : 'weapon-portraits';
  const slug = slugifyWuWaName(known?.name || bannerName);
  const knownCandidates = Array.isArray(known?.candidates) ? known.candidates : [];
  const generatedCandidates = resolvedType === 'character'
    ? [`${slug}-portrait.webp`, `${slug}-portrait.png`, `${slug}.webp`, `${slug}.png`]
    : [`${slug}-portrait.png`, `${slug}.png`, `${slug}-portrait.webp`, `${slug}.webp`];
  const fileName = [...knownCandidates, ...generatedCandidates].find(Boolean);
  return fileName ? buildWuWaImageUrl(folder, fileName) : null;
}

async function fetchWuWaLiveBanners() {
  const statsUrl = `${CONFIG.WUWA_TRACKER}?t=${Date.now()}`;
  let html = null;

  try {
    const directRes = await fetchWithTimeout(statsUrl, CONFIG.TIMEOUT_WUWA);
    if (directRes.ok) html = await directRes.text();
  } catch (e) {
    console.warn(`[WuWa] Direct fetch failed: ${e.message}`);
  }

  if (!html) {
    return buildWuWaCurrentBannerFallback();
  }

  try {
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const banners = buildWuWaCurrentBannerFallback();
    const seen = new Set([
      WUWA_CURRENT_FEATURED_IDS.character,
      WUWA_CURRENT_FEATURED_IDS.weapon,
      '101036'
    ]);
    let match;

    while ((match = idPattern.exec(html)) !== null) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const isCharacter = id.startsWith('100');
      const isWeapon = id.startsWith('101') || id.startsWith('200');
      if (!isCharacter && !isWeapon) continue;

      const pos = match.index;
      const forward = html.substring(pos, pos + 3000);
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';

      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const rawName = nameMatch ? nameMatch[1] : `Banner ${id}`;
      const resolvedName = WUWA_KNOWN_BANNERS[id]?.name || rawName;
      if (resolvedName.toLowerCase().includes('standard')) continue;

      const type = poolType.includes('character')
        ? 'character'
        : (poolType.includes('weapon') ? 'weapon' : (isCharacter ? 'character' : 'weapon'));

      const slug = slugifyWuWaName(resolvedName.split('&')[0].trim());
      const folder = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const ext = type === 'character' ? 'webp' : 'png';
      const image = buildWuWaImageUrl(folder, `${slug}-portrait.${ext}`);

      banners.push({
        id: `${id}_${type}`,
        bannerId: id,
        name: resolvedName,
        type,
        image,
        game: 'wuwa'
      });
    }

    const results = selectWuWaVisibleBanners(banners, html);
    console.log(`[WuWa] Scraped: ${results.map(r => r.name).join(', ')}`);
    return results.length > 0 ? results : buildWuWaCurrentBannerFallback();
  } catch (error) {
    console.error('[WuWa Discovery] Error:', error);
    return buildWuWaCurrentBannerFallback();
  }
}

// =========================================================================
// MAIN HANDLER
// =========================================================================
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedGame = normalizeGameQuery(req.query?.game);
    // Check cache (validate both time AND version)
    const cacheValid = BANNER_CACHE.data &&
      BANNER_CACHE.version === CONFIG.CACHE_VERSION &&
      BANNER_CACHE.game === requestedGame &&
      (Date.now() - BANNER_CACHE.timestamp < CACHE_DURATION);

    if (cacheValid) {
      console.log('[Banners API] Returning cached data (v' + CONFIG.CACHE_VERSION + ')');
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-Version', CONFIG.CACHE_VERSION);
      return res.status(200).json(BANNER_CACHE.data);
    }

    if (BANNER_CACHE.data && BANNER_CACHE.version !== CONFIG.CACHE_VERSION) {
      console.log('[Banners API] Cache version mismatch - invalidating old cache');
    }

    console.log(`[Banners API] Fetching fresh data for ${requestedGame}...`);

    const tasks = [];
    if (requestedGame === 'all' || requestedGame === 'hsr') {
      tasks.push(['hsr', fetchHSRActiveBanners()]);
    }
    if (requestedGame === 'all' || requestedGame === 'genshin') {
      tasks.push(['genshin', fetchActiveGenshinBanners()]);
    }
    if (requestedGame === 'all' || requestedGame === 'wuwa') {
      tasks.push(['wuwa', fetchWuWaLiveBanners()]);
    }

    const settled = await Promise.allSettled(tasks.map(([, promise]) => promise));
    const resultMap = { hsr: [], genshin: [], wuwa: [] };

    settled.forEach((result, index) => {
      const key = tasks[index]?.[0];
      if (!key) return;
      if (result.status === 'fulfilled') {
        resultMap[key] = Array.isArray(result.value) ? result.value : [];
      } else {
        console.warn(`[Banners API] ${key} fetch failed:`, result.reason?.message || result.reason);
      }
    });

    const response = {
      hsr: resultMap.hsr,
      genshin: resultMap.genshin,
      wuwa: resultMap.wuwa,
      lastUpdate: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString()
    };

    // Update cache
    BANNER_CACHE = {
      data: response,
      timestamp: Date.now(),
      version: CONFIG.CACHE_VERSION,
      game: requestedGame
    };

    console.log(`[Banners API] Success! HSR:${response.hsr.length} Genshin:${response.genshin.length} WuWa:${response.wuwa.length}`);

    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(response);

  } catch (error) {
    console.error('[Banners API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch banner data',
      message: error.message
    });
  }
}
