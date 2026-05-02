/**
 * Warp Data Service
 * Handles fetching global warp statistics from Star Rail Station API
 * and analyzing the data for "lucky roll" peaks.
 */

const SRS_API_BASE = "https://starrailstation.com/api/v1/warp_fetch/";
const PAIMON_API_BASE = "https://api.paimon.moe/wish";
const ZZZ_API_BASE = "https://zzz.rng.moe/api/v1/gacha/global/";

// Import adaptive WuWa parser (self-healing)
import { parseWuWaHTML_Adaptive } from './wuwaAdaptiveParser.js';

// Import Backend API Client
import { hsrApi, genshinApi, wuwaApi, zzzApi } from './apiClient.js';
import { buildApiUrl } from './apiBase';
import bannerHistory from '../data/bannerHistory.json';

// Import Banner Display Configuration
import { BANNER_DISPLAY_CONFIG } from '../config/bannerConfig.js';

const HSR_LV999_NAME = 'Silver Wolf LV.999';
const HSR_LV999_IMAGE = 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp';
const HSR_LV999_LC_NAME = 'Silver Wolf LV.999 Light Cone';
const HSR_LV999_LC_IMAGE = 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp';
const HSR_LV999_LC_ID = '3116';
const HSR_LV999_LC_CHARACTER_ID = '23006';

// Multiple CORS proxies for regional fallback (priority order based on reliability)
const CORS_PROXIES = [
  // Primary: Most reliable globally
  { name: "corsproxy.io", format: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  // Fallback 1: Good in Asia
  { name: "cors-anywhere-alt", format: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  // Fallback 2: Alternative
  { name: "allorigins", format: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  // Fallback 3: Another option
  { name: "thingproxy", format: (url) => `https://thingproxy.freeboard.io/fetch/${url}` },
  // Fallback 4: Last resort
  { name: "corsproxy.org", format: (url) => `https://corsproxy.org/?${encodeURIComponent(url)}` },
];

// Custom proxy storage key
const CUSTOM_PROXY_KEY = 'svarog_custom_proxy';

// Get/Set custom proxy from localStorage
export function getCustomProxy() {
  return localStorage.getItem(CUSTOM_PROXY_KEY) || '';
}

export function setCustomProxy(proxyUrl) {
  if (proxyUrl) {
    localStorage.setItem(CUSTOM_PROXY_KEY, proxyUrl);
  } else {
    localStorage.removeItem(CUSTOM_PROXY_KEY);
  }
}

// Helper: Fetch with timeout
async function fetchWithTimeout(url, timeoutMs = 8000) {
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

// Helper: Try fetch with direct first, then proxy fallbacks
async function fetchWithProxyFallback(targetUrl) {
  let lastError;
  const errors = [];
  
  // 1. Try DIRECT fetch first (some APIs allow CORS now)
  try {
    console.log(`[CORS] Trying direct fetch...`);
    const response = await fetchWithTimeout(targetUrl, 5000);
    if (response.ok) {
      console.log(`[CORS] ✓ Direct fetch succeeded!`);
      return response;
    }
  } catch (error) {
    // CORS blocked or network error - expected, continue to proxies
    console.log(`[CORS] Direct fetch blocked, trying proxies...`);
  }
  
  // 2. Try CUSTOM PROXY if set by user
  const customProxy = getCustomProxy();
  if (customProxy) {
    try {
      const customUrl = customProxy.includes('?') 
        ? `${customProxy}${encodeURIComponent(targetUrl)}`
        : `${customProxy}?url=${encodeURIComponent(targetUrl)}`;
      console.log(`[CORS] Trying custom proxy...`);
      const response = await fetchWithTimeout(customUrl, 8000);
      if (response.ok) {
        console.log(`[CORS] ✓ Custom proxy succeeded!`);
        return response;
      }
      errors.push(`custom: HTTP ${response.status}`);
    } catch (error) {
      errors.push(`custom: ${error.message}`);
      console.warn(`[CORS] Custom proxy failed:`, error.message);
    }
  }
  
  // 3. Try each built-in proxy with timeout
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.format(targetUrl);
      console.log(`[CORS] Trying ${proxy.name}...`);
      const response = await fetchWithTimeout(proxyUrl, 8000);
      
      if (response.ok) {
        console.log(`[CORS] ✓ Success with ${proxy.name}`);
        return response;
      }
      
      // 403/429/5xx = blocked/rate-limited/server error, try next proxy
      if (response.status === 403 || response.status === 429 || response.status >= 500) {
        const err = `${proxy.name}: HTTP ${response.status}`;
        errors.push(err);
        console.warn(`[CORS] ${err}, trying next...`);
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      // 404 = probably API endpoint issue, not proxy
      if (response.status === 404) {
        throw new Error(`HTTP 404: Resource not found`);
      }
      
      // Other errors
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      const errMsg = error.name === 'AbortError' ? `${proxy.name}: Timeout` : `${proxy.name}: ${error.message}`;
      errors.push(errMsg);
      lastError = error;
      console.warn(`[CORS] ${errMsg}`);
    }
  }
  
  // All proxies failed - provide detailed error
  console.error(`[CORS] All proxies failed:`, errors.join(', '));
  const finalError = new Error(`All CORS proxies failed. Tried: ${errors.join(', ')}`);
  finalError.proxyErrors = errors;
  finalError.needsCustomProxy = true; // Flag for UI to show custom proxy input
  throw finalError;
}

// Genshin Character Image Base (Ambr.top has good icons)
const GENSHIN_IMG_BASE = "https://gi.yatta.moe/assets/UI/UI_AvatarIcon_";

// Banner API endpoint - always follow the current deployed origin / configured API base
const BANNER_API_URL = buildApiUrl('/api/banners');

// Fetch ALL game banners from centralized API (HSR, Genshin, WuWa)
export async function fetchCentralizedBanners(game = 'all') {
  try {
    if (game === 'genshin') {
      const genshinBanners = await genshinApi.getBanners();
      return Array.isArray(genshinBanners)
        ? genshinBanners.map((b) => ({
          id: b.id,
          bannerId: b.bannerId,
          name: b.name,
          image: b.image,
          type: b.type,
          characterId: b.characterId,
          game: 'genshin',
        }))
        : [];
    }

    if (game === 'wuwa') {
      const wuwaBanners = await wuwaApi.getBanners();
      return Array.isArray(wuwaBanners)
        ? wuwaBanners.map((b) => ({
          id: b.id,
          bannerId: b.bannerId || extractBannerId(b.id) || b.id,
          name: b.name,
          image: b.image,
          type: b.type,
          characterId: b.characterId,
          game: 'wuwa',
        }))
        : [];
    }

    const params = new URLSearchParams();
    if (game && game !== 'all') params.set('game', game);
    const response = await fetch(params.toString() ? `${BANNER_API_URL}?${params.toString()}` : BANNER_API_URL);
    if (!response.ok) return [];
    const data = await response.json();
    
    // Convert API format to website format (preserve 'game' property!)
    const allBanners = [
      ...(data.hsr || []).map(b => ({
        id: b.id,
        name: b.name,
        image: b.image,
        portrait: b.portrait,
        lcPreview: b.lcPreview,
        type: b.type,
        characterId: b.characterId,
        rarity: b.rarity,
        element: b.element,
        collaboration: b.collaboration,
        game: 'hsr'  // IMPORTANT: Keep this for filtering!
      })),
      ...(data.genshin || []).map(b => ({
        id: b.id,
        name: b.name,
        image: b.image,
        type: b.type,
        game: 'genshin'  // IMPORTANT: Keep this for filtering!
      })),
      ...(data.wuwa || []).map(b => ({
        id: b.id,
        name: b.name,
        image: b.image,
        type: b.type,
        game: 'wuwa'  // IMPORTANT: Keep this for filtering!
      }))
    ];
    
    // HSR Banner Processing:
    // Sort by ID (newest first) and apply configurable limits
    const hsrBanners = allBanners.filter(b => b.game === 'hsr');
    const otherBanners = allBanners.filter(b => b.game !== 'hsr');
    
    if (hsrBanners.length > 0) {
       let hsrChars = hsrBanners.filter(b => b.type === 'character')
         .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Newest first
       
       let hsrLCs = hsrBanners.filter(b => b.type === 'light_cone')
         .sort((a, b) => parseInt(b.id) - parseInt(a.id));
       
       // Apply limits from config (if set)
       if (BANNER_DISPLAY_CONFIG.hsr.maxCharacterBanners !== null) {
         hsrChars = hsrChars.slice(0, BANNER_DISPLAY_CONFIG.hsr.maxCharacterBanners);
       }
       if (BANNER_DISPLAY_CONFIG.hsr.maxLightConeBanners !== null) {
         hsrLCs = hsrLCs.slice(0, BANNER_DISPLAY_CONFIG.hsr.maxLightConeBanners);
       }
         
       // Re-merge filtered HSR with others
       const filteredBanners = [...otherBanners, ...hsrChars, ...hsrLCs];
       
       // Run standard deduplication (just in case)
       const cleanBanners = deduplicateBanners(applyHsrTemporaryMetadataFallbacks(filteredBanners));
       
       console.log('[WarpDataService] Fetched', cleanBanners.length, 'banners from API (filtered overlap)');
       return cleanBanners;
    }
    
    // Deduplicate the combined results to handle reruns/duplicates from API
    const cleanBanners = deduplicateBanners(applyHsrTemporaryMetadataFallbacks(allBanners));
    
    console.log('[WarpDataService] Fetched', cleanBanners.length, 'banners from API (deduplicated)');
    return cleanBanners;
  } catch (error) {
    console.error('[WarpDataService] Banner fetch error:', error);
    return [];
  }
}

// Fallback banners (used if API fails)
export const PRESET_BANNERS = [];

// === FATE/STAY NIGHT COLLABORATION ===
// Separate export for Fate characters to merge with live banners
export const FATE_CHARACTERS = [
  {
    id: "5001",
    name: "Saber",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1014.png",
    portrait: "https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/character_portrait/1014",
    type: "character",
    characterId: "1014",
    rarity: 5,
    element: "wind",
    separator: true,
    collaboration: "Fate/Stay Night"
  },
  {
    id: "5002",
    name: "Archer",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1015.png",
    portrait: "https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/character_portrait/1015",
    type: "character",
    characterId: "1015",
    rarity: 5,
    element: "quantum",
    collaboration: "Fate/Stay Night"
  }
];

// Fate/Stay Night collaboration Light Cones
export const FATE_LIGHT_CONES = [
  {
    id: "6001",
    name: "A Thankless Coronation",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/light_cone/23045.png",
    portrait: "https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/lightcone_preview/23045",
    lcPreview: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_preview/23045.png",
    type: "light_cone",
    rarity: 5,
    separator: true,
    collaboration: "Fate/Stay Night"
  },
  {
    id: "6002",
    name: "The Hell Where Ideals Burn",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/light_cone/23046.png",
    portrait: "https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/lightcone_preview/23046",
    lcPreview: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_preview/23046.png",
    type: "light_cone",
    rarity: 5,
    collaboration: "Fate/Stay Night"
  }
];

// OVERRIDE: Fix incorrect image for Scent Alone Stays True if needed
// This is handled by main data fetch, but we can verify constants.
// ID 3102 -> 23032


/**
 * Extracts banner ID from a Star Rail Station URL or banner identifier
 * Supported formats:
 * - https://starrailstation.com/en/warp#global (Default to latest or specific ID)
 * - https://starrailstation.com/en/warp#2099
 * - 2099 (Direct ID)
 * - 100031_character (WuWa ID with suffix)
 */
export function extractBannerId(input = "") {
  if (!input) return null;
  
  // Case 1: Direct numeric ID
  if (/^\d+$/.test(input.trim())) {
    return input.trim();
  }
  
  // Case 2: WuWa ID with suffix (e.g., "100031_character")
  const wuwaMatch = input.match(/^(\d+)_(character|weapon)$/);
  if (wuwaMatch) {
    return wuwaMatch[1]; // Return just the numeric part
  }
  
  // Case 3: URL with hash (e.g., #2099 or #global)
  const hashMatch = input.match(/#(\w+)/);
  if (hashMatch) {
    const hash = hashMatch[1];
    if (/^\d+$/.test(hash)) return hash;
    if (hash === "global") return "2099"; // Fallback to current banner ID found in research
  }
  
  // Case 4: If it looks like a valid ID (starts with digits), return it as-is
  // This handles cases like "100031" that might have been processed
  if (/^\d/.test(input)) {
    return input;
  }
  
  return null; // Don't default to 2099 for unknown inputs
}

/**
 * Fetches warp statistics from SRS API with automatic retry
 * @param {string} bannerId - Banner ID to fetch
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchWarpStats(bannerId, maxRetries = 3) {
  // 1. Try Backend API first
  try {
    console.log('[HSR] Trying backend API...');
    const data = await hsrApi.getStats(bannerId);
    if (data && data.stats) {
      console.log('[HSR] ✓ Backend API succeeded');
      return data;
    }
  } catch (backendError) {
    console.warn('[HSR] Backend API failed, falling back to SRS:', backendError.message);
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const nowTs = Date.now();
      const targetUrl = `${SRS_API_BASE}${bannerId}?compare_id=0&_t=${nowTs}`;
      const response = await fetchWithProxyFallback(targetUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`[Attempt ${attempt}/${maxRetries}] Warp fetch error:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error("All retry attempts failed for warp fetch");
  throw lastError;
}

/**
 * Helper: Deduplicate banners by character ID
 * If a character has multiple banners (e.g., original + rerun), keep only the most recent (highest ID)
 */
function deduplicateBanners(banners) {
  const seenCharacters = new Map(); // charId -> banner object
  const deduplicatedBanners = [];
  
  for (const banner of banners) {
    const charId = banner.characterId;
    
    // If no character ID, it's likely a standard/weapon banner - don't deduplicate
    if (!charId) {
      deduplicatedBanners.push(banner);
      continue;
    }
    
    const existingBanner = seenCharacters.get(charId);
    
    if (!existingBanner) {
      // First time seeing this character
      seenCharacters.set(charId, banner);
      deduplicatedBanners.push(banner);
    } else {
      // Character already exists - keep the one with higher banner ID (more recent)
      const existingId = parseInt(existingBanner.id);
      const currentId = parseInt(banner.id);
      
      if (currentId > existingId) {
        // Replace with more recent banner
        const indexToReplace = deduplicatedBanners.findIndex(b => b.characterId === charId);
        if (indexToReplace !== -1) {
          deduplicatedBanners[indexToReplace] = banner;
          seenCharacters.set(charId, banner);
        }
      }
      // If current ID is lower, ignore it (keep existing)
    }
  }
  
  return deduplicatedBanners;
}

function applyHsrTemporaryMetadataFallbacks(banners) {
  const list = Array.isArray(banners) ? [...banners] : [];
  const knownCharacterNames = new Set(
    list
      .filter((banner) => banner?.game === 'hsr' && banner?.type === 'character')
      .map((banner) => String(banner.name || '').trim())
  );

  const hasBannerId = (banner, targetId) =>
    banner?.game === 'hsr' && (
      String(banner?.id || '') === String(targetId) ||
      String(banner?.bannerId || '') === String(targetId)
    );

  const exactLv999Index = list.findIndex((banner) => hasBannerId(banner, '2116'));
  if (exactLv999Index !== -1) {
    list[exactLv999Index] = {
      ...list[exactLv999Index],
      name: HSR_LV999_NAME,
      image: HSR_LV999_IMAGE,
      type: 'character',
    };
  } else if (
    knownCharacterNames.has('Firefly') &&
    knownCharacterNames.has('Castorice') &&
    knownCharacterNames.has('Dahlia')
  ) {
    const unknownIndex = list.findIndex((banner) => banner?.game === 'hsr' && banner?.type === 'unknown');
    if (unknownIndex !== -1) {
      list[unknownIndex] = {
        ...list[unknownIndex],
        name: HSR_LV999_NAME,
        image: HSR_LV999_IMAGE,
        type: 'character',
      };
    }
  }

  const exactLv999LcIndex = list.findIndex((banner) => hasBannerId(banner, '3116'));
  if (exactLv999LcIndex !== -1) {
    list[exactLv999LcIndex] = {
      ...list[exactLv999LcIndex],
      name: HSR_LV999_LC_NAME,
      image: HSR_LV999_LC_IMAGE,
      type: 'light_cone',
    };
  } else if (exactLv999Index !== -1) {
    list.push({
      id: HSR_LV999_LC_ID,
      bannerId: HSR_LV999_LC_ID,
      name: HSR_LV999_LC_NAME,
      image: HSR_LV999_LC_IMAGE,
      type: 'light_cone',
      characterId: HSR_LV999_LC_CHARACTER_ID,
      game: 'hsr',
    });
  }

  return list;
}

function extractHSRFeaturedIds(bannerData, charMap = {}, lcMap = {}) {
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
}

/**
 * Fetches latest banners from SRS + StarRailRes with Caching
 * Returns { status: 'uptodate' | 'updated' | 'error', data: [] }
 */
export async function fetchLiveBanners(ignoreThrottle = false) {
  try {
    // 1. Spam Protection
    const LAST_CHECK_KEY = 'banner_last_check_time';
    // const CACHE_ID_KEY = 'cached_banner_ids' - defined later
    
    if (!ignoreThrottle) {
        const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
        const nowTs = Date.now();
        
        // Allow check only every 10 seconds to prevent button spamming
        if (nowTs - lastCheck < 10000) {
          const cached = JSON.parse(localStorage.getItem('cached_banner_data') || '[]');
          
          // INTEGRITY CHECK: Ensure we actually have data
          if (cached.length > 0) {
            // Apply deduplication even to cached data to fix existing bad state
            const cleanCached = deduplicateBanners(cached);
            return { status: 'uptodate', data: cleanCached };
          }
        }
    } else {
        // If ignoring throttle, we still assume 'uptodate' if smart check passes later
    }

    const nowTs = Date.now(); // Update timestamp reference
    // we use a random query param to prevent browser caching of the config itself
    const configUrl = `https://starrailstation.com/api/v1/warp_config?_t=${nowTs}`;
    const response = await fetchWithProxyFallback(configUrl);
    if (!response.ok) throw new Error("Failed to fetch warp config");
    
    const data = await response.json();
    const gachaList = data.config?.banners || {};
    
    // 3. Filter Active Banners
    const currentSeconds = nowTs / 1000;
    const activeBanners = [];
    
    // SRS Character Ids are usually < 8000 (Lightcones are higher? or distinct). 
    // We'll rely on StarRailRes to filter valid chars later.
    for (const [bid, bdata] of Object.entries(gachaList)) {
      if (!(bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time)) continue;

      const featuredIds = extractHSRFeaturedIds(bdata, {}, {});
      for (const featuredId of featuredIds) {
        activeBanners.push({
          bannerId: bid,
          charId: String(featuredId)
        });
      }
    }

    if (activeBanners.length === 0) {
        // Weird fallback: if no active banners found, keep using what we have (or presets)
        return { status: 'error', message: 'No active banners found' };
    }

    // 4. Smart Check: Compare IDs with Cache
    const CACHE_ID_KEY = 'cached_banner_ids';
    const cachedIds = JSON.parse(localStorage.getItem(CACHE_ID_KEY) || '[]');
    const newIds = [...new Set(activeBanners.map(b => b.bannerId))].sort();
    
    const isSame = JSON.stringify(newIds) === JSON.stringify(cachedIds.sort());
    
    if (isSame) {
        // Update timestamp even if same, to allow spam throttle
        localStorage.setItem(LAST_CHECK_KEY, nowTs.toString());
        const cachedData = JSON.parse(localStorage.getItem('cached_banner_data') || '[]');
        if (cachedData.length > 0) {
            return { status: 'uptodate', data: cachedData };
        }
        // If IDs same but no data (edge case), proceed to fetch
    }

    // 5. Fetch Metadata (Characters + Light Cones)
    const charMetaUrl = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json";
    const lcMetaUrl = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json";
    
    // Fetch both in parallel
    const [charRes, lcRes] = await Promise.all([
        fetch(charMetaUrl),
        fetch(lcMetaUrl)
    ]);
    
    if (!charRes.ok || !lcRes.ok) throw new Error("Failed to fetch metadata");
    
    const charMap = await charRes.json();
    const lcMap = await lcRes.json();
    const IMG_BASE = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/";

    
    // 6. Construct Final Banner List
    const finalBanners = [];
    const resolvedActiveBanners = [];
    for (const [bid, bdata] of Object.entries(gachaList)) {
      if (!(bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time)) continue;

      const featuredIds = extractHSRFeaturedIds(bdata, charMap, lcMap);
      for (const featuredId of featuredIds) {
        resolvedActiveBanners.push({
          bannerId: bid,
          charId: String(featuredId)
        });
      }
    }

    for (const b of resolvedActiveBanners.filter((candidate, index, array) =>
      array.findIndex(item => item.bannerId === candidate.bannerId && item.charId === candidate.charId) === index
    )) {
        let type = 'unknown';
        let info = null;
        
        // Check Character Map first
        if (charMap[b.charId]) {
            type = 'character';
            info = charMap[b.charId];
        } 
        // Check Light Cone Map
        else if (lcMap[b.charId]) {
            type = 'light_cone';
            info = lcMap[b.charId];
        }
        
        if (info) {
             finalBanners.push({
                 id: b.bannerId,
                 name: info.name,
                 image: info.icon ? `${IMG_BASE}${info.icon}` : "",
                 portrait: `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/${type === 'light_cone' ? 'lightcone_preview' : 'character_portrait'}/${b.charId}`,
                 type: type,
                 characterId: b.charId,
                 game: 'hsr'
             });
        }
    }

    // 6.5. DEDUPLICATE: If a character has multiple active banners (e.g., original + rerun),
    // keep only the one with the highest banner ID (most recent)
    const cleanBanners = deduplicateBanners(applyHsrTemporaryMetadataFallbacks(finalBanners));

    // 7. Update Cache
    if (cleanBanners.length > 0) {
        localStorage.setItem('cached_banner_data', JSON.stringify(cleanBanners));
        localStorage.setItem(CACHE_ID_KEY, JSON.stringify(newIds));
        localStorage.setItem(LAST_CHECK_KEY, nowTs.toString());
        return { status: 'updated', data: cleanBanners };
    } else {
        return { status: 'error', message: 'No valid characters mappings found' };
    }

  } catch (error) {
    console.error("Auto-Update Error:", error);
    // On error, return preset fallback logic handling in UI
    return { status: 'error', error };
  }
}

/**
 * OPTIMIZED LUCKY STRING ALGORITHM
 * 
 * This algorithm identifies the best roll numbers to pull on based on real global data.
 * 
 * Approach:
 * 1. Separate into Pre-Soft Pity (1-73) and Soft Pity (74-90) zones
 * 2. Use Chance% (not raw count) for accuracy
 * 3. Calculate Z-scores to find statistically exceptional rolls
 * 4. Apply local maxima detection for "peak" identification
 * 5. Rank by a composite score: Z-score + Local Peak bonus
 */
export function detectLuckyPeaks(pullsData, chanceData, options = {}) {
  const {
    preSoftPityEnd = 73,
    softPityStart = 74,
    softPityEnd = 90,
    topN = 3,            // Number of peaks per segment
    topNPreSoftPity = 8, // Top N lucky rolls in pre-soft pity zone
    topNSoftPity = 3,    // Top N in soft pity zone
    minZScore = 0.5      // Minimum z-score to be considered "lucky"
  } = options;

  if (!chanceData || Object.keys(chanceData).length === 0) {
    // Fallback to old method if no chance data
    return fallbackPeakDetection(pullsData);
  }

  // === HELPER: Calculate Z-scores ===
  const calculateZScores = (data, start, end) => {
    const values = [];
    for (let i = start; i <= end; i++) {
      values.push(data[i] || 0);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    
    const zScores = {};
    for (let i = start; i <= end; i++) {
      const value = data[i] || 0;
      zScores[i] = stdDev > 0 ? (value - mean) / stdDev : 0;
    }
    return { zScores, mean, stdDev };
  };

  // === HELPER: Detect local maxima ===
  const isLocalMax = (data, roll) => {
    const prev = data[roll - 1] || 0;
    const curr = data[roll] || 0;
    const next = data[roll + 1] || 0;
    return curr > prev && curr > next;
  };

  // === HELPER: Analyze a segment and return top N peaks ===
  const analyzeSegment = (start, end, topN, zoneName) => {
    const segmentAnalysis = calculateZScores(chanceData, start, end);
    const rolls = [];
    
    for (let roll = start; roll <= end; roll++) {
      const chance = chanceData[roll] || 0;
      const count = pullsData[roll] || 0;
      const zScore = segmentAnalysis.zScores[roll] || 0;
      const isPeak = isLocalMax(chanceData, roll);
      
      // Gentle sample-size bonus (max +0.3 for 200+ samples)
      const sampleBonus = Math.min(count / 200, 0.3);
      const compositeScore = zScore + (isPeak ? 0.5 : 0) + sampleBonus;
      
      if (zScore >= minZScore || isPeak) {
        rolls.push({
          roll,
          chance,
          count,
          zScore: zScore.toFixed(2),
          isPeak,
          compositeScore,
          zone: zoneName
        });
      }
    }
    
    rolls.sort((a, b) => b.compositeScore - a.compositeScore);
    return rolls.slice(0, topN);
  };

  // === ANALYZE PRE-SOFT PITY ZONE IN SEGMENTS ===
  // Divide 1-73 into 3 segments to ensure full coverage
  const segment1 = analyzeSegment(1, 24, topN, "pre-soft");     // Early (1-24)
  const segment2 = analyzeSegment(25, 48, topN, "pre-soft");    // Mid (25-48)
  const segment3 = analyzeSegment(49, 73, topN, "pre-soft");    // Late (49-73)
  
  const topPreSoftPity = [...segment1, ...segment2, ...segment3];

  // === ANALYZE SOFT PITY ZONE (74-90) ===
  const softPityAnalysis = calculateZScores(chanceData, softPityStart, softPityEnd);
  const softPityRolls = [];
  
  for (let roll = softPityStart; roll <= softPityEnd; roll++) {
    const chance = chanceData[roll] || 0;
    const zScore = softPityAnalysis.zScores[roll] || 0;
    const isPeak = isLocalMax(chanceData, roll);
    
    softPityRolls.push({
      roll,
      chance,
      zScore: zScore.toFixed(2),
      isPeak,
      zone: "soft-pity"
    });
  }
  
  // For soft pity, prioritize the highest chance% (earliest big spike is usually best)
  softPityRolls.sort((a, b) => b.chance - a.chance);
  const topSoftPity = softPityRolls.slice(0, topNSoftPity);

  // === CONSOLIDATE PEAKS ===
  // Merge peaks within 10 of each other (for sweep-aligned strings)
  const consolidatedPeaks = consolidatePeaks([...topPreSoftPity, ...topSoftPity], 10);
  
  // Sort by roll number for readability
  return consolidatedPeaks.sort((a, b) => a.roll - b.roll);
}

/**
 * Consolidate nearby peaks for sweep-aligned string generation.
 * Peaks within `minDistance` of each other are merged, keeping the best one.
 * @param {Array} peaks - Array of peak objects with roll, chance, zScore
 * @param {number} minDistance - Minimum distance between peaks (default: 10)
 * @returns {Array} Consolidated peaks
 */
export function consolidatePeaks(peaks, minDistance = 10) {
  if (!peaks || peaks.length === 0) return [];
  
  // Sort by roll number first
  const sorted = [...peaks].sort((a, b) => a.roll - b.roll);
  const consolidated = [];
  
  for (const peak of sorted) {
    // Check if this peak is within minDistance of the last consolidated peak
    const lastPeak = consolidated[consolidated.length - 1];
    
    if (!lastPeak || (peak.roll - lastPeak.roll) >= minDistance) {
      // Far enough apart, add as new peak
      consolidated.push(peak);
    } else {
      // Too close, keep the one with higher chance
      if (peak.chance > lastPeak.chance) {
        consolidated[consolidated.length - 1] = peak;
      }
    }
  }
  
  return consolidated;
}

// Fallback for when chance data isn't available
function fallbackPeakDetection(pullsData) {
  if (!pullsData || Object.keys(pullsData).length === 0) return [];
  
  const rollNums = Object.keys(pullsData).map(Number).sort((a, b) => a - b);
  const counts = rollNums.map(roll => pullsData[roll] || 0);
  const maxCount = Math.max(...counts);
  
  const peaks = [];
  for (let i = 1; i < counts.length - 1; i++) {
    if (counts[i] > counts[i - 1] && counts[i] > counts[i + 1]) {
      if (counts[i] >= maxCount * 0.05) {
        peaks.push({ roll: rollNums[i], chance: 0, zone: "unknown" });
      }
    }
  }
  return peaks;
}

/**
 * Calculates additional metrics from the stats
 */
export function calculateWarpMetrics(stats) {
  if (!stats) return null;
  
  const total5Stars = stats.total_pulls_5 || 0;
  const totalUsers = stats.users || 0;
  const pulls5 = stats.by_rollnum_pulls_5 || {};
  
  // Median Calculation
  let cumulative = 0;
  let medianRoll = 0;
  const sortedRolls = Object.keys(pulls5).map(Number).sort((a, b) => a - b);
  for (const roll of sortedRolls) {
    cumulative += pulls5[roll];
    if (cumulative >= total5Stars / 2) {
      medianRoll = roll;
      break;
    }
  }
  
  // Soft Pity Efficiency (Rolls 75-80)
  let softPityPulls = 0;
  for (let i = 75; i <= 80; i++) {
    softPityPulls += pulls5[i] || 0;
  }
  const softPityRate = total5Stars > 0 ? (softPityPulls / total5Stars) * 100 : 0;
  
  return {
    total5Stars,
    totalUsers,
    medianRoll,
    softPityRate: softPityRate.toFixed(2)
  };
}

/**
 * Estimates a "Wins Only" distribution by applying the 50/50 win rate.
 * Uses the StarRailStation API's count_win_5 and count_lose_5 fields
 * for the accurate 50/50 win rate calculation.
 * 
 * Note: This is still an approximation because we don't have per-roll
 * win/loss data - we're applying the global win rate uniformly.
 * 
 * @param {Object} stats - Raw stats from fetchWarpStats
 * @param {string} featuredCharId - Character ID of the featured 5★ (for reference)
 * @returns {Object} { winsOnlyPulls5, winsOnlyChance5, winRatio, winRatioPct, ... }
 */
export function estimateWinsOnlyDistribution(stats, featuredCharId) {
  if (!stats) return null;
  
  // Use the actual 50/50 win rate from the API
  const countWin = stats.count_win_5 || 0;
  const countLose = stats.count_lose_5 || 0;
  const total5050 = countWin + countLose;
  const winRatio = total5050 > 0 ? countWin / total5050 : 0.5;
  
  const totalPulls = stats.total_pulls_5 || 1;
  const scaleFactor = countWin / totalPulls;
  
  const winsOnlyPulls5 = {};
  const winsOnlyChance5 = {};
  const originalDist = stats.by_rollnum_pulls_5 || {};
  const originalChance = stats.by_rollnum_chance_5 || {};
  
  // === CORE INSIGHT: Wins tend to cluster at different spots than overall pulls ===
  // We simulate this by: 
  // 1. Boosting early rolls (1-35) where lucky wins concentrate
  // 2. Suppressing mid-pity (36-65) where losses accumulate
  // 3. Keeping soft-pity similar but slightly favoring earliest soft-pity hits
  
  for (const [rollStr, count] of Object.entries(originalDist)) {
    const roll = parseInt(rollStr);
    const chance = originalChance[roll] || 0;
    
    // Early luck boost (rolls 1-35): Winners tend to hit here
    let modifier = 1.0;
    if (roll <= 15) {
      modifier = 2.5; // Strong boost for super early wins
    } else if (roll <= 35) {
      modifier = 1.8; // Moderate boost for early wins
    } else if (roll <= 55) {
      modifier = 0.4; // Suppress mid-pity (loss zone)
    } else if (roll <= 73) {
      modifier = 0.7; // Slight suppression for late pre-pity
    } else if (roll <= 78) {
      modifier = 1.3; // Boost early soft-pity
    } else {
      modifier = 0.9; // Late soft-pity slight reduction
    }
    
    const scaledCount = count * scaleFactor * modifier;
    winsOnlyPulls5[roll] = Math.max(1, Math.round(scaledCount));
  }
  
  // Apply same modifiers to chance data for consistent peak detection
  for (const [rollStr, chance] of Object.entries(originalChance)) {
    const roll = parseInt(rollStr);
    
    let modifier = 1.0;
    if (roll <= 15) {
      modifier = 2.5;
    } else if (roll <= 35) {
      modifier = 1.8;
    } else if (roll <= 55) {
      modifier = 0.4;
    } else if (roll <= 73) {
      modifier = 0.7;
    } else if (roll <= 78) {
      modifier = 1.3;
    } else {
      modifier = 0.9;
    }
    
    winsOnlyChance5[roll] = chance * modifier;
  }
  
  return { 
    winsOnlyPulls5, 
    winsOnlyChance5, 
    winRatio,                              
    winRatioPct: Math.round(winRatio * 100), 
    scaleFactor,                           
    scaleFactorPct: Math.round(scaleFactor * 100),
    countWin,
    countLose,
    totalPulls
  };
}

// ============================================================
// GENSHIN IMPACT SUPPORT (Paimon.moe API)
// ============================================================

/**
 * Genshin banner type prefixes
 * 300xxx = Character Event Wish
 * 400xxx = Weapon Event Wish
 * 200xxx = Standard Wish
 * 500xxx = Chronicled Wish
 */

// Genshin preset banners - 5★ only, will be updated dynamically
// IDs are formatted as {bannerId}_{characterId} for uniqueness
export const GENSHIN_PRESET_BANNERS = [
  { id: "300099_character", bannerId: "300099", name: "Character Event Wish", type: "character", image: null, characterId: "character_banner", game: "genshin" },
  { id: "400098_weapon", bannerId: "400098", name: "Epitome Invocation", type: "weapon", image: "https://paimon.moe/images/banners/Epitome%20Invocation%2098.png", characterId: "weapon_banner", game: "genshin" },
];


/**
 * Fetches Genshin wish statistics from Paimon.moe API with automatic retry
 * Transforms the data to match HSR format for unified UI
 * @param {string} bannerId - Banner ID to fetch
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchGenshinWishStats(bannerId, maxRetries = 3) {
  // 1. Try Backend API first
  try {
    console.log('[Genshin] Trying backend API...');
    const data = await genshinApi.getStats(bannerId);
    if (data && data.stats) {
      console.log('[Genshin] ✓ Backend API succeeded');
      return data;
    }
  } catch (backendError) {
    console.warn('[Genshin] Backend API failed, falling back to Paimon.moe:', backendError.message);
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add cache-buster to force fresh data
      const cacheBuster = Date.now();
      const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}&_t=${cacheBuster}`;
      const response = await fetchWithProxyFallback(targetUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform Paimon.moe format to our unified format
      return transformGenshinData(data, bannerId);
    } catch (error) {
      lastError = error;
      console.warn(`[Genshin Attempt ${attempt}/${maxRetries}] Wish fetch error:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying Genshin fetch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error("All retry attempts failed for Genshin wish fetch");
  throw lastError;
}

/**
 * Transforms Paimon.moe data to match HSR format
 */
function transformGenshinData(data, bannerId) {
  // Transform pity array to object format
  // pityCount.legendary is 0-indexed: index 0 = pity 0 (always 0), index 3 = pity 3.
  // So roll N maps to index N directly — NOT index + 1.
  const pityArray = data.pityCount?.legendary || [];
  const countEachPity = data.countEachPity || []; // players who pulled at each pity depth
  const by_rollnum_pulls_5 = {};
  const by_rollnum_chance_5 = {};
  
  let totalPulls = 0;
  pityArray.forEach((count, index) => {
    const roll = index; // pity 3 = index 3
    if (roll === 0) return; // Skip pity-0 (impossible, always 0)
    by_rollnum_pulls_5[roll] = count;
    totalPulls += count;
  });
  
  // Calculate chance percentages.
  // Paimon.moe uses CONDITIONAL probability: pityCount[N] / countEachPity[N-1]
  // = "of all players who were at pity N when they pulled, what % got a 5★?"
  // This matches the Chance% shown on paimon.moe exactly.
  // Fallback: divide by totalPulls if countEachPity is missing.
  pityArray.forEach((count, index) => {
    const roll = index;
    if (roll === 0) return;
    const playersAtThisPity = countEachPity[index - 1]; // index-1 because countEachPity[0] = pity 1
    if (playersAtThisPity && playersAtThisPity > 0) {
      by_rollnum_chance_5[roll] = count / playersAtThisPity;
    } else if (totalPulls > 0) {
      by_rollnum_chance_5[roll] = count / totalPulls; // fallback
    }
  });
  
  // Calculate 50/50 win rate from list data
  // Featured 5★ characters have "guaranteed" field = how many got via guarantee (lost 50/50 before)
  const { countWin, countLose } = calculateGenshinWinLoss(data.list, bannerId);
  
  return {
    stats: {
      total_pulls_5: totalPulls || data.total?.legendary || 0,
      by_rollnum_pulls_5,
      by_rollnum_chance_5,
      count_win_5: countWin,
      count_lose_5: countLose,
      users: data.total?.users || 0,
      // Store original data for reference
      _genshin_raw: data
    },
    raw: data
  };
}

// ============================================================
// HISTORY TRACKER UTILS
// ============================================================

export function getBannerHistory() {
  return bannerHistory;
}

/**
 * Fetches character metadata to map Names to Images
 * Returns a map: { "Seele": "url...", "Jing Yuan": "url...", ... }
 */
export async function fetchCharacterMetadataMap() {
  const CACHE_KEY = 'char_metadata_map_v2'; // Bump version to force refresh
  const cached = localStorage.getItem(CACHE_KEY);
  let nameToImage = {};

  if (cached) {
    try {
      nameToImage = JSON.parse(cached);
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // If cache is empty or too small, fetch from Network
  if (Object.keys(nameToImage).length < 20) {
    try {
      const url = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json";
      const response = await fetchWithProxyFallback(url); 
      if (response.ok) {
        const data = await response.json();
        const IMG_BASE = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/";
        Object.values(data).forEach(char => {
          if (char.name && char.icon) {
            nameToImage[char.name] = `${IMG_BASE}${char.icon}`;
          }
        });
      }
    } catch (err) {
      console.error("Error fetching char metadata:", err);
    }
  }

  // ALWAYS Apply Overrides (Cache or Fresh)
  if (nameToImage["Topaz & Numby"]) nameToImage["Topaz"] = nameToImage["Topaz & Numby"];
  
  // Manual override for Dan Heng variants
  nameToImage["Imbibitor Lunae"] = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1213.png";
  nameToImage["Dan Heng PT"] = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1414.png";

  // Fate Collab Manual Overrides
  nameToImage["Saber"] = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1014.png";
  nameToImage["Archer"] = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1015.png";

  // Update Cache with overrides
  if (Object.keys(nameToImage).length > 0) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(nameToImage));
  }
  
  return nameToImage;
}


/**
 * Calculate 50/50 win/loss from Genshin featured character data
 * In Paimon.moe API:
 * - Each character has "count" (total pulled) and "guaranteed" (got via guarantee after loss)
 * - Featured 5★ = characters with high counts on the banner
 * - Wins = count - guaranteed
 * - Losses = standard 5★ characters (not featured)
 */
function calculateGenshinWinLoss(list, bannerId) {
  if (!list || list.length === 0) return { countWin: 0, countLose: 0 };
  
  // Standard pool 5★ characters
  const standardChars = ['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya'];
  // Standard pool 5★ weapons
  const standardWeapons = [
    'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
    'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
    'skyward_blade', 'aquila_favonia'
  ];
  
  const standardPool = [...standardChars, ...standardWeapons];
  
  // Find featured items (high count, not standard)
  const featuredItems = list.filter(item => 
    (item.type === 'character' || item.type === 'weapon') && 
    !standardPool.includes(item.name) &&
    item.count > 500 // Lowered threshold to catch weapon banners
  );
  
  const standardItems = list.filter(item => 
    (item.type === 'character' || item.type === 'weapon') && 
    standardPool.includes(item.name)
  );
  
  // Count wins: Featured pulls that weren't guaranteed
  let totalWins = 0;
  
  for (const item of featuredItems) {
    const wins = (item.count || 0) - (item.guaranteed || 0);
    totalWins += wins;
  }
  
  // Count losses: Standard 5★ pulls
  let totalLosses = 0;
  for (const item of standardItems) {
    totalLosses += item.count || 0;
  }
  
  return { 
    countWin: totalWins,
    countLose: totalLosses
  };
}

// Genshin Banner Overrides (for specific banner IDs that need manual naming)
const GENSHIN_BANNER_OVERRIDES = {
  "300094": { name: "Columbina", type: "character" },
  "300093": { name: "Ineffa", type: "character" },
  "400093": { name: "Nocturne's Curtain Call / Fractured Halo", type: "weapon" },
  "400092": { name: "Nocturne's Curtain Call / Fractured Halo", type: "weapon" }
};

const CURRENT_GENSHIN_CHARACTER_BANNER_ID = '300099';
const CURRENT_GENSHIN_WEAPON_BANNER_ID = '400098';

/**
 * Fetches live Genshin banners from Paimon.moe
 * OPTIMIZED: Uses cache-first approach and parallel fetching
 */
export async function fetchGenshinLiveBanners(ignoreThrottle = false) {
  // 1. Try Backend API first
  try {
    console.log('[Genshin Banners] Trying backend API...');
    const banners = await genshinApi.getBanners();
    if (banners && Array.isArray(banners) && banners.length > 0) {
      console.log('[Genshin Banners] ✓ Backend API succeeded');
      return { status: 'updated', data: banners };
    }
  } catch (backendError) {
    console.warn('[Genshin Banners] Backend API failed, falling back to Discovery:', backendError.message);
  }

  const LAST_CHECK_KEY = 'genshin_banner_last_check';
  const CACHE_KEY = 'genshin_cached_banners';
  const LAST_KNOWN_ID_KEY = 'genshin_last_known_id';
  const CACHE_VERSION_KEY = 'genshin_cache_version';
  const CURRENT_CACHE_VERSION = '1.3'; // Increment this when banner overrides or active pairings change
  
  // Check cache version and invalidate if outdated
  const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  if (cachedVersion !== CURRENT_CACHE_VERSION) {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
  }
  
  // 1. ALWAYS return cached data first for instant UI
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  
  if (!ignoreThrottle) {
    const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
    const nowTs = Date.now();
    
    // If checked recently (5s), return cache immediately
    if (nowTs - lastCheck < 5000 && cached.length > 0) {
      return { status: 'uptodate', data: cached };
    }
  }
  
  // 2. Try to fetch new data (but return cached if available)
  try {
    const nowTs = Date.now();
    const banners = [];
    
    // Start from last known ID and search BOTH directions to catch double banners
    // Double banners can be at consecutive IDs (e.g., 300093 + 300094)
    const lastKnownId = parseInt(localStorage.getItem(LAST_KNOWN_ID_KEY) || '93');
    const searchRange = 8; // Search ±8 IDs from last known
    
    // Collect all valid banners in the search range
    const candidateBanners = [];
    
    for (let offset = -5; offset <= searchRange; offset++) {
      const i = lastKnownId + offset;
      if (i < 85 || i > 120) continue; // Stay within reasonable bounds
      
      const bannerId = `300${i.toString().padStart(3, '0')}`;
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const response = await fetchWithProxyFallback(targetUrl);
        if (response.ok) {
          const data = await response.json();
          // Lower threshold to 400 to catch newer/smaller sample size banners
          if (data.total && data.total.legendary > 400) {
            candidateBanners.push({ bannerId, data, bannerId_num: i });
          }
        }
      } catch (e) {
        // Silently skip non-existent banners
      }
    }
    
    // Sort by banner ID descending (newest first), take ONLY the newest banner
    candidateBanners.sort((a, b) => b.bannerId_num - a.bannerId_num);
    const activeBanners = candidateBanners.slice(0, 1);  // Only current banner, not old ones
    
    // Update last known ID to the highest found
    if (activeBanners.length > 0) {
      localStorage.setItem(LAST_KNOWN_ID_KEY, activeBanners[0].bannerId_num.toString());
    }
    
    // Process each active banner
    for (const { bannerId, data } of activeBanners) {
      // Filter for featured 5★ characters only (exclude standard pool and 4★)
      // NOTE: Paimon.moe API doesn't provide rarity field, so we rely on count range
      // Featured 5-stars: 1,000-30,000 pulls (very low min to catch day-1 banners)
      // 4-star rate-ups: 40,000-90,000 pulls (5% drop rate) 
      // Standard 5-stars: Usually 1,000-2,000 pulls (filtered via name list)
      const featured5Star = data.list?.filter(item => {
        const isCharacter = item.type === 'character';
        const isStandard = ['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya'].includes(item.name);
        const inFeatured5StarRange = item.count > 1000 && item.count < 30000;  // Conservative threshold for new banners
        
        // Featured 5-stars have counts between 5k-30k (excludes 4-star rate-ups and standard pool)
        return isCharacter && !isStandard && inFeatured5StarRange;
      }).sort((a, b) => b.count - a.count)  // Sort by count descending
       .slice(0, 2) || [];  // Take top 2 featured characters per banner
      
      for (const char of featured5Star) {
        const formattedName = char.name.split('_').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        const charIconName = char.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        
        banners.push({
          id: `${bannerId}_${char.name}`,
          bannerId: bannerId,
          name: formattedName,
          type: 'character',
          image: `${GENSHIN_IMG_BASE}${charIconName}.png`,
          characterId: char.name,
          game: 'genshin'
        });
      }
    }
    
    // Weapon banners - search from the highest character banner ID found
    if (activeBanners.length > 0) {
      const weaponSearchStart = activeBanners[0].bannerId_num;
      for (let i = weaponSearchStart + 2; i >= weaponSearchStart - 5 && i >= 85; i--) {
      const bannerId = `400${i.toString().padStart(3, '0')}`;
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const response = await fetchWithProxyFallback(targetUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.total && data.total.legendary > 500) {
            const bannerNumber = bannerId.slice(-2);
            // Check for manual override first, then extract weapons
            const override = GENSHIN_BANNER_OVERRIDES[bannerId];
            const weaponName = override ? override.name : (extractGenshinWeaponNames(data.list) || `Epitome Invocation`);
            banners.push({
              id: `${bannerId}_weapon`,
              bannerId: bannerId,
              name: weaponName,
              type: 'weapon',
              image: `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerNumber}.png`,
              characterId: 'weapon_banner',
              game: 'genshin'
            });
            break;
          }
        }
      } catch (e) {
        // Silently skip
      }
      }
    }

    if (banners.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(banners));
      localStorage.setItem(LAST_CHECK_KEY, nowTs.toString());
      return { status: 'updated', data: banners };
    }
    
    // Fallback to cached if fetch failed
    if (cached.length > 0) {
      return { status: 'fallback', data: cached };
    }
    
    return { status: 'fallback', data: GENSHIN_PRESET_BANNERS };
    
  } catch (error) {
    console.error("[GENSHIN DEBUG] ❌ FATAL ERROR:", error);
    // Return cached or presets on error
    if (cached.length > 0) {
      return { status: 'error', data: cached, error };
    }
    return { status: 'error', data: GENSHIN_PRESET_BANNERS, error };
  }
}

/**
 * Extracts 5-star weapon names from Paimon.moe wish list
 */
function extractGenshinWeaponNames(list) {
  if (!list || list.length === 0) return null;
  
  const standardWeapons = [
    'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
    'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
    'skyward_blade', 'aquila_favonia'
  ].map(n => n.toLowerCase());

  const candidates = list.filter(item => {
    if (item.type !== 'weapon') return false;
    const nameLower = item.name.toLowerCase();
    if (standardWeapons.includes(nameLower)) return false;
    // Featured 5-stars are usually in 500-30k range
    return item.count > 500 && item.count < 35000;
  });

  candidates.sort((a, b) => b.count - a.count);
  
  if (candidates.length > 0) {
    return candidates.slice(0, 2).map(c => 
      c.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    ).join(' / ');
  }
  return null;
}

// ============================================================
// WUTHERING WAVES SUPPORT (WuWa Tracker)
// ============================================================

// WuWa preset banners (fallback if auto-discovery fails)
export const WUWA_PRESET_BANNERS = [
  // Current featured banners
  { 
    id: "100036", 
    name: "Hiyuki", 
    type: "character", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Fhiyuki-portrait.png&w=640&q=75", 
    characterId: "hiyuki", 
    game: "wuwa" 
  },
  { 
    id: "200036", 
    name: "Frostburn", 
    type: "weapon", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Ffrostburn-portrait.png&w=828&q=75", 
    characterId: "frostburn", 
    game: "wuwa" 
  },
  // Previous banners
  { 
    id: "100035", 
    name: "Lynae", 
    type: "character", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Flynae-portrait.webp&w=828&q=75", 
    characterId: "lynae", 
    game: "wuwa" 
  },
  { 
    id: "200035", 
    name: "Spectrum Blaster", 
    type: "weapon", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Fspectrum-blaster.png&w=828&q=75", 
    characterId: "spectrum_blaster", 
    game: "wuwa" 
  },
];

const WUWA_IMAGE_OVERRIDES = Object.freeze({
  hiyuki: { base: 'character-portraits', file: 'hiyuki-portrait.png' },
  lynae: { base: 'character-portraits', file: 'lynae-portrait.webp' },
  sigrika: { base: 'character-portraits', file: 'sigrika-portrait.webp' },
  frostburn: { base: 'weapon-portraits', file: 'frostburn-portrait.png' },
  'spectrum-blaster': { base: 'weapon-portraits', file: 'spectrum-blaster.png' },
  'solsworn-ciphers': { base: 'weapon-portraits', file: 'solsworn-ciphers-portrait.png' },
});

const WUWA_FEATURED_WEAPON_BY_CHARACTER = Object.freeze({
  hiyuki: 'Frostburn',
  lynae: 'Spectrum Blaster',
});

const WUWA_CURRENT_FEATURED_IDS = Object.freeze({
  character: '100036',
  weapon: '200036',
});

function compareWuWaBannerIdsDesc_Client(a, b) {
  return Number.parseInt(String(b?.bannerId || b?.id || '0'), 10) - Number.parseInt(String(a?.bannerId || a?.id || '0'), 10);
}

function pickHighestWuWaBanner_Client(banners) {
  return [...(Array.isArray(banners) ? banners : [])].sort(compareWuWaBannerIdsDesc_Client)[0] || null;
}

function findWuWaBannerById_Client(banners, bannerId) {
  const normalizedId = String(bannerId || '').trim();
  if (!normalizedId) return null;
  return (Array.isArray(banners) ? banners : []).find(
    (banner) => String(banner?.bannerId || banner?.id || '').trim() === normalizedId
  ) || null;
}

function extractWuWaCurrentTitle_Client(html) {
  const match = String(html || '').match(/<title>\s*([^<|]+?)\s*\|\s*Global Statistics/i);
  return match?.[1] ? String(match[1]).trim() : '';
}

function findWuWaBannerByTitle_Client(banners, title) {
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (!normalizedTitle) return null;
  return pickHighestWuWaBanner_Client(
    banners.filter((banner) => normalizedTitle.includes(String(banner.name || '').trim().toLowerCase()))
  );
}

function findWuWaBannerByExactName_Client(banners, name) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return null;
  return pickHighestWuWaBanner_Client(
    banners.filter((banner) => String(banner.name || '').trim().toLowerCase() === normalizedName)
  );
}

function findWuWaBannerByOccurrence_Client(banners, html) {
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
        (index === bestIndex && compareWuWaBannerIdsDesc_Client(banner, winner) < 0)
      )
    ) {
      bestIndex = index;
      winner = banner;
    }
  }

  return winner;
}

function selectWuWaVisibleBanners_Client(banners, html) {
  const characterBanners = (Array.isArray(banners) ? banners : []).filter((banner) => banner.type === 'character');
  const weaponBanners = (Array.isArray(banners) ? banners : []).filter((banner) => banner.type === 'weapon');
  const currentTitle = extractWuWaCurrentTitle_Client(html);

  const forcedCurrentCharacter = findWuWaBannerById_Client(characterBanners, WUWA_CURRENT_FEATURED_IDS.character);
  const forcedCurrentWeapon = findWuWaBannerById_Client(weaponBanners, WUWA_CURRENT_FEATURED_IDS.weapon);

  if (forcedCurrentCharacter || forcedCurrentWeapon) {
    const pairedWeaponName = forcedCurrentCharacter
      ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(forcedCurrentCharacter.name || '').trim().toLowerCase()]
      : '';
    const selectedWeapon =
      forcedCurrentWeapon ||
      findWuWaBannerByExactName_Client(weaponBanners, pairedWeaponName) ||
      pickHighestWuWaBanner_Client(weaponBanners) ||
      findWuWaBannerByOccurrence_Client(weaponBanners, html) ||
      null;

    return [forcedCurrentCharacter, selectedWeapon].filter(Boolean);
  }

  const selectedCharacter =
    findWuWaBannerByTitle_Client(characterBanners, currentTitle) ||
    pickHighestWuWaBanner_Client(characterBanners) ||
    findWuWaBannerByOccurrence_Client(characterBanners, html) ||
    characterBanners[0] ||
    null;
  const pairedWeaponName = selectedCharacter
    ? WUWA_FEATURED_WEAPON_BY_CHARACTER[String(selectedCharacter.name || '').trim().toLowerCase()]
    : '';
  const selectedWeapon =
    findWuWaBannerByExactName_Client(weaponBanners, pairedWeaponName) ||
    pickHighestWuWaBanner_Client(weaponBanners) ||
    findWuWaBannerByOccurrence_Client(weaponBanners, html) ||
    weaponBanners[0] ||
    null;

  return [selectedCharacter, selectedWeapon].filter(Boolean);
}

function buildWuWaBannerIdCandidates_Client(id) {
  const normalized = String(id || '').trim();
  if (!/^\d{6}$/.test(normalized)) return [normalized];
  const suffix = normalized.slice(3);
  const candidates = [normalized];
  if (normalized.startsWith('200')) candidates.push(`101${suffix}`);
  if (normalized.startsWith('101')) candidates.push(`200${suffix}`);
  return Array.from(new Set(candidates));
}


/**
 * Fetches WuWa statistics from WuWa Tracker website
 * Uses HTML scraping with CORS proxy (no backend needed)
 * @param {string} bannerId - Banner ID to fetch (e.g., "100030" for Lynae)
 * @param {boolean} debugMode - Enable debug logging
 */
export async function fetchWuWaStats(bannerId, debugMode = true) {
  try {
    // 1. Try Backend API first
    try {
      console.log('[WuWa] Trying backend API...');
      const data = await wuwaApi.getStats(bannerId);
      const backendHistogramSize = Object.keys(data?.stats?.by_rollnum_pulls_5 || {}).length;
      const backendTotalPulls = Number(data?.stats?.total_pulls_5 || 0);
      if (data && data.stats && !data.fallback && backendHistogramSize > 0 && backendTotalPulls > 0) {
        console.log('[WuWa] ✓ Backend API succeeded');
        return data;
      }
      console.warn('[WuWa] Backend API returned fallback or empty stats, continuing to direct scrape');
    } catch (backendError) {
      console.warn('[WuWa] Backend API failed, falling back to Scraping:', backendError.message);
    }

    let lastScrapeError = null;
    for (const candidateId of buildWuWaBannerIdCandidates_Client(bannerId)) {
      try {
        const statsUrl = `https://wuwatracker.com/tracker/stats/${candidateId}`;
        console.log('[WuWa] Fetching:', statsUrl);
        const response = await fetchWithProxyFallback(statsUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        console.log('[WuWa] HTML length:', html.length);

        const stats = parseWuWaHTML_Adaptive(html);
        if (!stats) {
          throw new Error(`Failed to parse WuWa statistics from HTML for ${candidateId}`);
        }

        return stats;
      } catch (candidateError) {
        lastScrapeError = candidateError;
        console.warn(`[WuWa] Candidate ${candidateId} failed:`, candidateError.message);
      }
    }

    throw lastScrapeError || new Error('Failed to fetch WuWa statistics');
  } catch (error) {
    console.error('[WuWa] Fetch error:', error);
    throw new Error(`FETCH FAILED: ${error.message}`);
  }
}

/**
 * Parses WuWa Tracker HTML to extract pity distribution data using JavaScript
 * Extracts histogram counts and character data, calculates total as 2x featured character
 */
function parseWuWaHTML(html) {
  try {
    console.log('[WuWa Parser] Starting parse, HTML length:', html.length);
    
    // 1. Extract histogram data (pity distribution counts)
    const labelPattern = /\\"label\\":\\"5✦ Pulls per Pity\\"/;
    if (!html.match(labelPattern)) {
      console.warn('[WuWa Parser] Label pattern not found');
      return null;
    }
    
    console.log('[WuWa Parser] Found pity label');
    
    // Extract histogram: {\"histogram\":{\"1\":1340,\"2\":1345,...},\"barColor\":...,\"label\":\"5✦ Pulls per Pity\"}
    const histPattern = /\{\\"histogram\\":\{([^}]+)\}[^}]*\\"label\\":\\"5✦ Pulls per Pity\\"/;
    const histMatch = html.match(histPattern);
    
    if (!histMatch) {
      console.warn('[WuWa Parser] Could not extract histogram');
      return null;
    }
    
    // Unescape and parse histogram
    let histogramContent = histMatch[1].replace(/\\"/g, '"');
    const histogramJson = `{${histogramContent}}`;
    const histogramData = JSON.parse(histogramJson);
    
    console.log('[WuWa Parser] Extracted histogram with', Object.keys(histogramData).length, 'pity values');
    
    // 2. Extract character data (itemNameHistogram)
    const charPattern = /\\"itemNameHistogram\\":\{([^}]+)\}/;
    const charMatch = html.match(charPattern);
    
    let characterData = null;
    if (charMatch) {
      let charContent = charMatch[1].replace(/\\"/g, '"');
      const charJson = `{${charContent}}`;
      characterData = JSON.parse(charJson);
      console.log('[WuWa Parser] Extracted character data:', Object.keys(characterData));
    }
    
    // 3. Calculate total using appropriate method
    // WuWa has different mechanics for character vs weapon banners:
    // - Character banners: 50/50 mechanic (can lose to standard pool) → Total ≈ 2x Featured Character
    // - Weapon banners: No 50/50 loss → Total = Sum of all banner weapons
    let total_pulls_5;
    
    if (characterData) {
      const items = Object.entries(characterData).map(([name, count]) => ({
        name,
        count: parseInt(count, 10)
      }));
      
      items.sort((a, b) => b.count - a.count);
      const featured = items[0];
      
      // Detect if this is a weapon or character banner
      // Weapon banners typically have 3 items, character banners have 8+
      const isWeaponBanner = items.length <= 4;
      
      if (isWeaponBanner) {
        // Weapon banner: Featured weapon × 1.3 multiplier
        // This matches WuWa Tracker's calculation methodology
        total_pulls_5 = Math.floor(featured.count * 1.3);
        console.log(`[WuWa Parser] Weapon banner detected. Total = ${featured.name} × 1.3 = ${total_pulls_5}`);
      } else {
        // Character banner: 2x featured character (accounts for 50/50)
        total_pulls_5 = featured.count * 2;
        console.log(`[WuWa Parser] Character banner detected. Using 2x featured character (${featured.name}: ${featured.count}) = ${total_pulls_5} total`);
      }
    } else {
      // Fallback: sum histogram
      total_pulls_5 = Object.values(histogramData).reduce((sum, count) => sum + parseInt(count, 10), 0);
      console.log('[WuWa Parser] Using histogram sum:', total_pulls_5);
    }
    
    // 4. Transform to our format
    const by_rollnum_pulls_5 = {};
    const by_rollnum_chance_5 = {};
    
    for (const [pity, count] of Object.entries(histogramData)) {
      const roll = parseInt(pity, 10);
      const pullCount = parseInt(count, 10);
      
      by_rollnum_pulls_5[roll] = pullCount;
      by_rollnum_chance_5[roll] = total_pulls_5 > 0 ? pullCount / total_pulls_5 : 0;
    }
    
    // Verification
    const roll22Count = by_rollnum_pulls_5[22] || 0;
    const roll22Chance = by_rollnum_chance_5[22] || 0;
    console.log('[WuWa Parser] Roll #22: Count =', roll22Count, ', Chance =', (roll22Chance * 100).toFixed(2) + '%');
    
    return {
      stats: {
        by_rollnum_pulls_5,
        by_rollnum_chance_5,
        total_pulls_5,
        count_win_5: 0,
        count_lose_5: 0
      },
      list: []
    };
  } catch (error) {
    console.error('[WuWa Parser] Parse error:', error);
    return null;
  }
}





/**
 * Fetches live WuWa banners by scraping WuWa Tracker
 * Automatically discovers new banners when they release
 */
export async function fetchWuWaLiveBanners(ignoreThrottle = false) {
  // 1. Try Backend API first
  try {
    console.log('[WuWa Banners] Trying backend API...');
    const banners = await wuwaApi.getBanners();
    if (banners && Array.isArray(banners) && banners.length > 0) {
      console.log('[WuWa Banners] ✓ Backend API succeeded');
      return { status: 'updated', data: banners };
    }
  } catch (backendError) {
    console.warn('[WuWa Banners] Backend API failed, falling back to Scraping:', backendError.message);
  }

  const CACHE_KEY = 'wuwa_live_banners_cache_v4'; // bumped: Hiyuki/Frostburn override
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache
  
  // Check cache first (unless ignoreThrottle is true)
  if (!ignoreThrottle) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          console.log('[WuWa Banners] Using cached data, age:', Math.floor(age / 1000), 'seconds');
          return { status: 'cached', data };
        }
      }
    } catch (e) {
      console.warn('[WuWa Banners] Cache read error:', e);
    }
  }
  
  try {
    console.log('[WuWa Banners] Fetching live banner list from WuWa Tracker...');
    
    // Fetch the main stats page which lists all available banners
    const response = await fetchWithProxyFallback('https://wuwatracker.com/tracker/stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // NEW: Use robust escaped JSON parsing (matching Discord bot)
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const banners = [];
    const seenIds = new Set();
    let idMatch;
    
    while ((idMatch = idPattern.exec(html)) !== null) {
      const bannerId = idMatch[1];
      
      // Strictly filter for WuWa ID ranges
      // 100xxx: Resonators, 101xxx/200xxx: Weapons
      const isCharacter = bannerId.startsWith('100');
      const isWeapon = bannerId.startsWith('101') || bannerId.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      
      // Skip duplicates
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);
      
      const pos = idMatch.index;
      
      // Search forward for the name and type field
      const forward = html.substring(pos, pos + 3000);
      
      // Extract Pool Type (e.g. Featured Character, Featured Weapon)
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';
      
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const rawBannerName = nameMatch ? nameMatch[1] : 'Unknown Banner';
      
      // Apply known-banner name overrides (same as server-side WUWA_KNOWN_BANNERS)
      const WUWA_CLIENT_KNOWN_NAMES = {
        '100036': 'Hiyuki', '200036': 'Frostburn', '101036': 'Frostburn',
        '100035': 'Lynae', '200035': 'Spectrum Blaster', '101035': 'Spectrum Blaster',
        '100034': 'Sigrika', '200034': 'Solsworn Ciphers', '101034': 'Solsworn Ciphers',
      };
      const bannerName = WUWA_CLIENT_KNOWN_NAMES[bannerId] || rawBannerName;
      
      // Skip standard banner
      if (bannerName.toLowerCase().includes('standard')) continue;
      
      // Categorize by pool type or ID prefix fallback
      const type = poolType.includes('character') ? 'character' : 
                   (poolType.includes('weapon') ? 'weapon' : 
                   (isCharacter ? 'character' : 'weapon'));
      
      // Generate image URL (WuWa Tracker pattern)
      // For composite names like "Sigrika & Qiuyuan", use only the first name for the slug
      const firstName = bannerName.split('&')[0].trim();
      const slug = firstName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const override = WUWA_IMAGE_OVERRIDES[slug];
      const imageBase = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const imageExt = type === 'character' ? 'webp' : 'png';
      // Both characters and weapons use the -portrait suffix in the latest WuWa Tracker API
      const image = override
        ? `https://wuwatracker.com/_next/image?url=%2Fapi%2F${override.base}%2Ffile%2F${override.file}&w=828&q=75`
        : `https://wuwatracker.com/_next/image?url=%2Fapi%2F${imageBase}%2Ffile%2F${slug}-portrait.${imageExt}&w=828&q=75`;
      
      // OPTIMIZATION: Remove individual stat fetches during discovery to fix slowness.
      // Images are now predictably derived from the slug.
      
      banners.push({
        id: `${bannerId}_${type}`,
        bannerId,
        name: bannerName,
        type,
        image,
        game: 'wuwa'
      });
    }
    
    // If we found no banners via scraping, fall back to presets
    if (banners.length === 0) {
      console.warn('[WuWa Banners] No banners found via scraping, using presets');
      return {
        status: 'preset',
        data: WUWA_PRESET_BANNERS
      };
    }
    
    console.log('[WuWa Banners] Found', banners.length, 'banners:', banners.map(b => b.name));
    
    const recentBanners = selectWuWaVisibleBanners_Client(banners, html);
    
    console.log('[WuWa Banners] Filtered to', recentBanners.length, 'recent banners:', recentBanners.map(b => `${b.name} (${b.bannerId})`));
    
    // Cache the results
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: recentBanners,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[WuWa Banners] Cache write error:', e);
    }
    
    return {
      status: 'updated',
      data: recentBanners
    };
  } catch (error) {
    console.error('[WuWa Banners] Fetch error:', error);
    
    // On error, return preset banners as fallback
    console.warn('[WuWa Banners] Falling back to preset banners due to error');
    return {
      status: 'error',
      data: WUWA_PRESET_BANNERS,
      error: error.message
    };
  }
}

// ============================================================
// ZENLESS ZONE ZERO SUPPORT (zzz.rng.moe API)
// ============================================================

// ZZZ preset banners (Signal types) - Current banners only
export const ZZZ_PRESET_BANNERS = [
  // Latest Exclusive Channel (Character) - Ye Shuanguang
  { 
    id: "2001015", 
    name: "Ye Shuanguang", 
    type: "character", 
    image: "https://zzz.rng.moe/images/characters/1381.webp", 
    characterId: "ye_shuanguang", 
    game: "zzz" 
  },
  // Zhao (second concurrent character banner)
  { 
    id: "2001016", 
    name: "Zhao", 
    type: "character", 
    image: "https://zzz.rng.moe/images/characters/1391.webp", 
    characterId: "zhao", 
    game: "zzz" 
  },
  // Latest W-Engine Channel (Weapon)
  { 
    id: "3001043", 
    name: "Dissonant Sonata (W-Engine)", 
    type: "weapon", 
    image: "https://zzz.rng.moe/images/weapons/14127.webp", 
    characterId: "weapon_dissonant", 
    game: "zzz" 
  },
];

/**
 * Fetches ZZZ statistics from zzz.rng.moe API
 * Clean JSON API - no scraping needed (same format as HSR)
 * @param {string} bannerId - Banner ID to fetch (e.g., "2001015" for Ye Shuanguang)
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchZZZStats(bannerId, maxRetries = 3) {
  try {
    const data = await zzzApi.getStats(bannerId);
    if (data.error) {
       throw new Error(data.error);
    }
    return transformZZZData(data);
  } catch (e) {
    console.warn('[ZZZ] Tracking is currently disabled or unavailable:', e.message);
    throw new Error('ZZZ Tracking is temporarily unavailable. The source data site is having issues.');
  }
}

/**
 * Transforms ZZZ data to match our unified format
 * The zzz.rng.moe API is already very similar to HSR format
 */
function transformZZZData(data) {
  const stats = data.stats;
  
  return {
    stats: {
      total_pulls_5: stats.total_pulls_5 || 0,
      by_rollnum_pulls_5: stats.by_rollnum_pulls_5 || {},
      by_rollnum_chance_5: stats.by_rollnum_chance_5 || {},
      count_win_5: stats.count_win_5 || 0,
      count_lose_5: stats.count_lose_5 || 0
    },
    list: []
  };
}
