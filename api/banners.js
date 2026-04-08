import { GENSHIN_BANNER_CONTROL } from './_services/genshin/bannerControl.js';
// Patch-day banner IDs live in api/_services/genshin/bannerControl.js

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
    'yoimiya', 'zhongli', 'zibai', 'skirk', 'escoffier', 'linnea'
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
    'gest_of_the_mighty_wolf', 'bloodsoaked_ruins', 'azurelight', 'symphonist_of_scents', 'golden_frostbound_oath', 'astral_vultures_crimson_plumage'

  ],

  // Standard characters that should NEVER be the banner name
  standard: ['tighnari', 'dehya', 'diluc', 'jean', 'keqing', 'mona', 'qiqi', 'ororon', 'lanyan']
};

const CONFIG = {
  CACHE_HOURS: 0.016, // ~1 minute cache
  CACHE_VERSION: 5, // Increment this to force cache refresh after fallback logic updates
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
          game: 'hsr'
        };
      } else if (lcData) {
        return {
          id: b.id,
          name: lcData.name,
          type: "light_cone",
          characterId: b.charId,
          image: `${CONFIG.STARRAIL_RES}/icon/light_cone/${b.charId}.png`,
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
  'charlotte', 'gaming', 'sethos', 'kachina', 'ororon', 'lan_yan', 'lanyan', 'aino'
]);

const GENSHIN_FOUR_STAR_WEAPON_BLOCKLIST = new Set([
  'mitternachts_waltz', 'mountain-bracing_bolt', 'winters_vigil', 'lithic_blade',
  'lithic_spear', 'wavebreakers_fin', 'akuoumaru', 'mounns_moon', 'rust',
  'favonius_warbow', 'eye_of_perception', 'the_flute', 'the_bell'
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
      ? (firstSlug
        ? `https://paimon.moe/images/weapons/${firstSlug}.png`
        : `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerId.slice(-2)}.png`)
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

  const [charAuto, wpnAuto] = await Promise.all([
    findBannerNear(targetCharId, '300', 'character'),
    findBannerNear(targetWpnId, '400', 'weapon')
  ]);

  let characterBanner = charAuto;
  let weaponBanner = wpnAuto;

  if (!characterBanner) {
    characterBanner = await fetchBannerByExactId(GENSHIN_BANNER_CONTROL.characterBannerId, 'character');
  }
  if (!weaponBanner) {
    weaponBanner = await fetchBannerByExactId(GENSHIN_BANNER_CONTROL.weaponBannerId, 'weapon');
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
  '100034': {
    name: 'Sigrika',
    type: 'character',
  },
  '200034': {
    name: 'Solsworn Ciphers',
    type: 'weapon',
  },
});

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
    const directRes = await fetch(statsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0; +https://ci3t.github.io/Svarog-Tracer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
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
  const statsUrl = `${CONFIG.WUWA_TRACKER}`;
  let html = null;

  // 1. Try Direct Fetch (Server-to-Server)
  try {
    const directRes = await fetch(statsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0; +https://ci3t.github.io/Svarog-Tracer)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (directRes.ok) html = await directRes.text();
  } catch (e) { console.warn(`[WuWa] Direct fetch failed: ${e.message}`); }

  // 2. Proxy Fallbacks
  if (!html) {
    const PROXIES = [
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ];
    for (const proxyFormat of PROXIES) {
      try {
        const res = await fetchWithTimeout(proxyFormat(statsUrl), 5000);
        if (res.ok) {
          html = await res.text();
          if (html.includes('WuWa Tracker')) break;
        }
      } catch (e) { }
    }
  }

  if (!html) return [];

  try {
    const idPattern = /[\\"]+bannerId[\\"]+:\s*(\d{6})/g;
    const banners = [];
    const seen = new Set();
    let match;

    while ((match = idPattern.exec(html)) !== null) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const isCharacter = id.startsWith('100');
      const isWeapon = id.startsWith('101') || id.startsWith('200');
      if (!isCharacter && !isWeapon) continue;

      // Extract Name from Context (Matches Bot Logic)
      const pos = match.index;
      const context = html.substring(pos, pos + 5000);
      const names = [...context.matchAll(/[\\"]+name[\\"]+:\s*[\\\"']+([^\\\"']+)[\\\"']+/g)];
      const validName = names.find(m =>
        m[1].length > 2 &&
        !m[1].includes("Featured") &&
        !m[1].includes("next-size-adjust") &&
        !m[1].includes("Standard") &&
        !m[1].includes("Convene")
      );

      // Fallback
      let name = validName ? validName[1] : `Banner ${id}`;
      if (name.toLowerCase().includes('standard')) continue;

      const type = isCharacter ? 'character' : 'weapon';
      const resolvedName = WUWA_KNOWN_BANNERS[id]?.name || name;

      // OPTIMIZATION: Use slug-based images instead of fetching sub-pages during discovery
      const firstName = resolvedName.split('&')[0].trim();
      const slug = firstName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const folder = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const ext = type === 'character' ? 'webp' : 'png';
      const image = `https://wuwatracker.com/_next/image?url=${encodeURIComponent(`/api/${folder}/file/${slug}-portrait.${ext}`)}&w=828&q=75`;

      banners.push({
        id,
        name: resolvedName,
        type,
        image,
        game: 'wuwa'
      });
    }

    // Emergency Fallback for Sigrika
    if (!banners.some(b => b.id === '100034') && html.includes('Sigrika')) {
      banners.push({
        id: '100034',
        name: 'Sigrika',
        type: 'character',
        image: buildWuWaImageUrl('character-portraits', 'sigrika-portrait.webp'),
        game: 'wuwa'
      });
    }
    // Emergency Fallback for Solsworn Ciphers
    if (!banners.some(b => b.id === '200034') && (html.includes('Solsworn Ciphers') || html.includes('Emerald Sentence'))) {
      banners.push({
        id: '200034',
        name: 'Solsworn Ciphers',
        type: 'weapon',
        image: buildWuWaImageUrl('weapon-portraits', 'solsworn-ciphers-portrait.png'),
        game: 'wuwa'
      });
    }

    // Sort and return latest
    const latestChar = banners.filter(b => b.type === 'character').sort((a, b) => b.id.localeCompare(a.id))[0];
    const latestWeapon = banners.filter(b => b.type === 'weapon').sort((a, b) => b.id.localeCompare(a.id))[0];

    const results = [];
    if (latestChar) results.push(latestChar);
    if (latestWeapon) results.push(latestWeapon);

    console.log(`[WuWa] Scraped: ${results.map(r => r.name).join(', ')}`);
    return results;
  } catch (error) {
    console.error('[WuWa Discovery] Error:', error);
    return [];
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
