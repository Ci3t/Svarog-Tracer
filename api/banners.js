// =========================================================================
// GENSHIN CONTROL CENTER - Edit this for new characters!
// =========================================================================
const GENSHIN_CONFIG = {
  // 1. Current Active Banner IDs (Check Paimon.moe/wish/tally)
  active: {
    charBannerId: "300097",
    weaponBannerId: "400095",
    // Set to null to enable FULL AUTO. Only use for emergency fixes.
    forceName: null,
    forceWeaponName: null,
    forceImage: null,
  },

  // 2. Character Whitelist (Add new 5-stars here - LOWERCASE ONLY)
  characters: [
    'albedo', 'alhaitham', 'arataki_itto', 'arlecchino', 'ayaka', 'ayato',
    'baizhu', 'chasca', 'chiori', 'clorinde', 'columbina', 'cyno', 'emilie',
    'furina', 'ganyu', 'hu_tao', 'iansan', 'ineffa', 'kazuha', 'klee',
    'kokomi', 'lyney', 'mavuika', 'mualani', 'nahida', 'navia', 'neuvillette',
    'nilou', 'raiden_shogun', 'shenhe', 'sigewinne', 'tartaglia', 'traveler',
    'venti', 'wanderer', 'wriothesley', 'xiao', 'xianyun', 'yae_miko', 'yelan',
    'yoimiya', 'zhongli', 'zibai', 'skirk', 'escoffier'
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
    'gest_of_the_mighty_wolf', 'bloodsoaked_ruins', 'azurelight', 'symphonist_of_scents'
  ],

  // Standard characters that should NEVER be the banner name
  standard: ['tighnari', 'dehya', 'diluc', 'jean', 'keqing', 'mona', 'qiqi', 'ororon', 'lanyan']
};

const CONFIG = {
  CACHE_HOURS: 0.016, // ~1 minute cache
  CACHE_VERSION: 3, // Increment this to force cache refresh (was 1, now 2 for 4-banner support)
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
  version: CONFIG.CACHE_VERSION
};

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
    const gachaList = configData.config?.banners || {};
    const activeCandidates = [];

    for (const [bid, bdata] of Object.entries(gachaList)) {
      if (bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time) {
        if (bdata.rateup) {
          activeCandidates.push({ id: bid, charId: String(bdata.rateup) });
        }
      }
    }

    if (activeCandidates.length === 0) return [];

    // 3. Fetch metadata (character/weapon names and images)
    const [charRes, lcRes] = await Promise.all([
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/characters.json`),
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/light_cones.json`)
    ]);

    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};

    // 4. Map IDs to Names and Images
    const liveBanners = activeCandidates.map(b => {
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

function extractGenshinFeaturedCharacterSlugs(pullList) {
  if (!pullList || pullList.length === 0) return [];

  return pullList
    .filter(p =>
      p.type === 'character' &&
      GENSHIN_CONFIG.characters.includes(p.name.toLowerCase()) &&
      !GENSHIN_CONFIG.standard.includes(p.name.toLowerCase())
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
}

function extractGenshinFeaturedWeaponSlugs(pullList) {
  if (!pullList || pullList.length === 0) return [];

  return pullList
    .filter(p =>
      p.type === 'weapon' &&
      GENSHIN_CONFIG.weapons.includes(p.name.toLowerCase())
    )
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
  const manualBanners = [];

  // 1. Helper: Search for precise banner data near a specific ID
  const findBanners = async (startId, prefix, type) => {
    const scanRange = [];
    for (let i = startId + 2; i >= startId - 8 && i >= 0; i--) {
      scanRange.push(`${prefix}${String(i).padStart(3, '0')}`);
    }

    for (const bannerId of scanRange) {
      try {
        const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
        if (!res.ok) continue;

        const data = await res.json();
        if (!(data.total && data.total.legendary > 1000)) continue;

        const featuredSlugs = type === 'weapon'
          ? extractGenshinFeaturedWeaponSlugs(data.list)
          : extractGenshinFeaturedCharacterSlugs(data.list);

        if (type === 'character' && featuredSlugs.length === 0) continue;

        const name = type === 'weapon'
          ? (featuredSlugs.length ? featuredSlugs.map(toTitleCaseFromSlug).join(' / ') : 'Epitome Invocation')
          : featuredSlugs.map(toTitleCaseFromSlug).join(' / ');

        const firstSlug = featuredSlugs[0];
        const image = type === 'weapon'
          ? (firstSlug
            ? `https://paimon.moe/images/weapons/${firstSlug}.png`
            : `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerId.slice(-2)}.png`)
          : `https://paimon.moe/images/characters/${firstSlug}.png`;

        return { id: bannerId, name, type, image, game: 'genshin', source: 'auto' };
      } catch {
        continue;
      }
    }

    return null;
  };

  // 2. Perform Auto-Discovery
  console.log('[Genshin] Running intelligent auto-discovery...');
  const targetCharId = parseInt(GENSHIN_CONFIG.active.charBannerId?.slice(-3) || '115');
  const targetWpnId = parseInt(GENSHIN_CONFIG.active.weaponBannerId?.slice(-3) || '115');

  const [charAuto, wpnAuto] = await Promise.all([
    findBanners(targetCharId, '300', 'character'),
    findBanners(targetWpnId, '400', 'weapon')
  ]);

  // 3. Build manual fallback entries per missing side (or explicit force)
  const shouldBuildManual = !charAuto || !wpnAuto || GENSHIN_CONFIG.active.forceName || GENSHIN_CONFIG.active.forceWeaponName;
  if (shouldBuildManual) {
    if (GENSHIN_CONFIG.active.charBannerId && (GENSHIN_CONFIG.active.forceName || !charAuto)) {
      const forcedCharSlug = toPaimonSlug(GENSHIN_CONFIG.active.forceName);
      manualBanners.push({
        id: GENSHIN_CONFIG.active.charBannerId,
        name: GENSHIN_CONFIG.active.forceName || 'Character Event Wish',
        type: 'character',
        image: GENSHIN_CONFIG.active.forceImage || (forcedCharSlug ? `https://paimon.moe/images/characters/${forcedCharSlug}.png` : null),
        game: 'genshin',
        source: 'manual'
      });
    }

    if (GENSHIN_CONFIG.active.weaponBannerId && (GENSHIN_CONFIG.active.forceWeaponName || !wpnAuto)) {
      const forcedWeaponSlug = toPaimonSlug(GENSHIN_CONFIG.active.forceWeaponName);
      manualBanners.push({
        id: GENSHIN_CONFIG.active.weaponBannerId,
        name: GENSHIN_CONFIG.active.forceWeaponName || 'Epitome Invocation',
        type: 'weapon',
        image: forcedWeaponSlug
          ? `https://paimon.moe/images/weapons/${forcedWeaponSlug}.png`
          : `https://paimon.moe/images/banners/Epitome%20Invocation%20${GENSHIN_CONFIG.active.weaponBannerId.slice(-2)}.png`,
        game: 'genshin',
        source: 'manual'
      });
    }
  }

  const manualChar = manualBanners.find(b => b.type === 'character');
  const manualWeapon = manualBanners.find(b => b.type === 'weapon');

  const results = [];
  if (charAuto && !GENSHIN_CONFIG.active.forceName) results.push(charAuto);
  else if (manualChar) results.push(manualChar);

  if (wpnAuto && !GENSHIN_CONFIG.active.forceWeaponName) results.push(wpnAuto);
  else if (manualWeapon) results.push(manualWeapon);

  return results;
}
// =========================================================================
// WUWA BANNER FETCHING (HTML Scraping)
// =========================================================================
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
      const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ext = 'png';
      const imgPath = isCharacter ? 'character-portraits' : 'weapon-portraits';
      const fileName = isCharacter ? `${nameSlug}-portrait.${ext}` : `${nameSlug}.${ext}`;

      banners.push({
        id,
        name,
        type,
        image: `https://wuwatracker.com/_next/image?url=%2Fapi%2F${imgPath}%2Ffile%2F${fileName}&w=828&q=75`,
        game: 'wuwa'
      });
    }

    // Emergency Fallback for Aemeath
    if (!banners.some(b => b.id === '100032') && html.includes('Aemeath')) {
      banners.push({
        id: '100032',
        name: 'Aemeath',
        type: 'character',
        image: `https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Faemeath-portrait.png&w=828&q=75`,
        game: 'wuwa'
      });
    }
    // Emergency Fallback for Everbright Polestar
    if (!banners.some(b => b.id === '200032') && html.includes('Everbright Polestar')) {
      banners.push({
        id: '200032',
        name: 'Everbright Polestar',
        type: 'weapon',
        image: `https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Feverbright-polestar.png&w=828&q=75`,
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
    // Check cache (validate both time AND version)
    const cacheValid = BANNER_CACHE.data &&
      BANNER_CACHE.version === CONFIG.CACHE_VERSION &&
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

    console.log('[Banners API] Fetching fresh data from all sources...');

    // Fetch all banner data in parallel
    const [hsr, genshin, wuwa] = await Promise.all([
      fetchHSRActiveBanners(),
      fetchActiveGenshinBanners(),
      fetchWuWaLiveBanners()
    ]);

    const response = {
      hsr,
      genshin,
      wuwa,
      lastUpdate: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString()
    };

    // Update cache
    BANNER_CACHE = {
      data: response,
      timestamp: Date.now(),
      version: CONFIG.CACHE_VERSION
    };

    console.log(`[Banners API] Success! HSR:${hsr.length} Genshin:${genshin.length} WuWa:${wuwa.length}`);

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


