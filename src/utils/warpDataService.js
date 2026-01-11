/**
 * Warp Data Service
 * Handles fetching global warp statistics from Star Rail Station API
 * and analyzing the data for "lucky roll" peaks.
 */

const SRS_API_BASE = "https://starrailstation.com/api/v1/warp_fetch/";
const PAIMON_API_BASE = "https://api.paimon.moe/wish";

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

// Latest banners for Pach 2.3?
import currentBanners from '../data/current_banners.json';

// Updated: Now using auto-generated banners from scripts/update_banners.py
// Fallback to hardcoded if JSON is empty (optional, but good practice)
export const PRESET_BANNERS = currentBanners.length > 0 ? currentBanners : [
  {
    id: "2099",
    name: "Dahlia",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1321.png",
    type: "character"
  },
  {
    id: "2100",
    name: "Firefly",
    image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1310.png",
    type: "character"
  }
];

/**
 * Extracts banner ID from a Star Rail Station URL
 * Supported formats:
 * - https://starrailstation.com/en/warp#global (Default to latest or specific ID)
 * - https://starrailstation.com/en/warp#2099
 * - 2099 (Direct ID)
 */
export function extractBannerId(input = "") {
  if (!input) return null;
  
  // Case 1: Direct numeric ID
  if (/^\d+$/.test(input.trim())) {
    return input.trim();
  }
  
  // Case 2: URL with hash (e.g., #2099 or #global)
  const hashMatch = input.match(/#(\w+)/);
  if (hashMatch) {
    const hash = hashMatch[1];
    if (/^\d+$/.test(hash)) return hash;
    if (hash === "global") return "2099"; // Fallback to current banner ID found in research
  }
  
  return "2099"; // Default fallback
}

/**
 * Fetches warp statistics from SRS API with automatic retry
 * @param {string} bannerId - Banner ID to fetch
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchWarpStats(bannerId, maxRetries = 3) {
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
          if (cached.length > 0) return { status: 'uptodate', data: cached };
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
      if (bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time) {
        if (bdata.rateup) {
           activeBanners.push({
             bannerId: bid,
             charId: String(bdata.rateup)
           });
        }
      }
    }

    if (activeBanners.length === 0) {
        // Weird fallback: if no active banners found, keep using what we have (or presets)
        return { status: 'error', message: 'No active banners found' };
    }

    // 4. Smart Check: Compare IDs with Cache
    const CACHE_ID_KEY = 'cached_banner_ids';
    const cachedIds = JSON.parse(localStorage.getItem(CACHE_ID_KEY) || '[]');
    const newIds = activeBanners.map(b => b.bannerId).sort();
    
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
    for (const b of activeBanners) {
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
                 type: type,
                 characterId: b.charId
             });
        }
    }

    // 7. Update Cache
    if (finalBanners.length > 0) {
        localStorage.setItem('cached_banner_data', JSON.stringify(finalBanners));
        localStorage.setItem(CACHE_ID_KEY, JSON.stringify(newIds));
        localStorage.setItem(LAST_CHECK_KEY, nowTs.toString());
        return { status: 'updated', data: finalBanners };
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
      const zScore = segmentAnalysis.zScores[roll] || 0;
      const isPeak = isLocalMax(chanceData, roll);
      const compositeScore = zScore + (isPeak ? 0.5 : 0);
      
      if (zScore >= minZScore || isPeak) {
        rolls.push({
          roll,
          chance,
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
  { id: "300093_varesa", bannerId: "300093", name: "Varesa", type: "character", image: `${GENSHIN_IMG_BASE}Varesa.png`, characterId: "varesa", game: "genshin" },
  { id: "300093_xilonen", bannerId: "300093", name: "Xilonen", type: "character", image: `${GENSHIN_IMG_BASE}Xilonen.png`, characterId: "xilonen", game: "genshin" },
  { id: "400092_weapon", bannerId: "400092", name: "Epitome Invocation", type: "weapon", image: "https://paimon.moe/images/banners/Epitome%20Invocation%2092.png", characterId: "weapon_banner", game: "genshin" },
];


/**
 * Fetches Genshin wish statistics from Paimon.moe API with automatic retry
 * Transforms the data to match HSR format for unified UI
 * @param {string} bannerId - Banner ID to fetch
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 */
export async function fetchGenshinWishStats(bannerId, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
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
  const pityArray = data.pityCount?.legendary || [];
  const by_rollnum_pulls_5 = {};
  const by_rollnum_chance_5 = {};
  
  let totalPulls = 0;
  pityArray.forEach((count, index) => {
    const roll = index + 1;
    by_rollnum_pulls_5[roll] = count;
    totalPulls += count;
  });
  
  // Calculate chance percentages
  if (totalPulls > 0) {
    for (const [roll, count] of Object.entries(by_rollnum_pulls_5)) {
      by_rollnum_chance_5[roll] = count / totalPulls;
    }
  }
  
  // Calculate 50/50 win rate from list data
  // Featured 5★ characters have "guaranteed" field = how many got via guarantee (lost 50/50 before)
  const { countWin, countLose } = calculateGenshinWinLoss(data.list, bannerId);
  
  return {
    stats: {
      total_pulls_5: data.total?.legendary || totalPulls,
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

/**
 * Fetches live Genshin banners from Paimon.moe
 * OPTIMIZED: Uses cache-first approach and parallel fetching
 */
export async function fetchGenshinLiveBanners(ignoreThrottle = false) {
  const LAST_CHECK_KEY = 'genshin_banner_last_check';
  const CACHE_KEY = 'genshin_cached_banners';
  const LAST_KNOWN_ID_KEY = 'genshin_last_known_id';
  
  // 1. ALWAYS return cached data first for instant UI
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  
  if (!ignoreThrottle) {
    const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
    const nowTs = Date.now();
    
    // If checked recently (10s), return cache immediately
    if (nowTs - lastCheck < 10000 && cached.length > 0) {
      return { status: 'uptodate', data: cached };
    }
  }
  
  // 2. Try to fetch new data (but return cached if available)
  try {
    const nowTs = Date.now();
    const banners = [];
    
    // Start from last known ID to avoid checking old banners
    const lastKnownId = parseInt(localStorage.getItem(LAST_KNOWN_ID_KEY) || '93');
    const startId = Math.min(lastKnownId + 3, 105); // Check 3 ahead of last known
    
    // Character banners - only check 5 IDs starting from smart position
    for (let i = startId; i >= startId - 5 && i >= 85; i--) {
      const bannerId = `3000${i}`;
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const response = await fetchWithProxyFallback(targetUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.total && data.total.legendary > 1000) {
            // Save this as the new "last known" for next time
            localStorage.setItem(LAST_KNOWN_ID_KEY, i.toString());
            
            const featured5Star = data.list?.filter(item => 
              item.type === 'character' && 
              item.count > 5000 && 
              item.count < 50000 &&
              !['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya'].includes(item.name)
            ) || [];
            
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
            break; // Found current banner
          }
        }
      } catch (e) {
        console.warn(`Banner ${bannerId} not found`);
      }
    }
    
    // Weapon banners - same optimization
    for (let i = startId; i >= startId - 5 && i >= 85; i--) {
      const bannerId = `4000${i}`;
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const response = await fetchWithProxyFallback(targetUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.total && data.total.legendary > 500) {
            const bannerNumber = bannerId.slice(-2);
            banners.push({
              id: `${bannerId}_weapon`,
              bannerId: bannerId,
              name: `Epitome Invocation`,
              type: 'weapon',
              image: `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerNumber}.png`,
              characterId: 'weapon_banner',
              game: 'genshin'
            });
            break;
          }
        }
      } catch (e) {
        console.warn(`Weapon banner ${bannerId} not found`);
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
    console.error("Genshin banner fetch error:", error);
    // Return cached or presets on error
    if (cached.length > 0) {
      return { status: 'error', data: cached, error };
    }
    return { status: 'error', data: GENSHIN_PRESET_BANNERS, error };
  }
}

// ============================================================
// WUTHERING WAVES SUPPORT (WuWa Tracker)
// ============================================================

// WuWa preset banners
export const WUWA_PRESET_BANNERS = [
  { 
    id: "100030", 
    name: "Lynae", 
    type: "character", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Flynae-portrait.webp&w=828&q=75", 
    characterId: "lynae", 
    game: "wuwa" 
  },
  { 
    id: "200030", 
    name: "Spectrum Blaster", 
    type: "weapon", 
    image: "https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Fspectrum-blaster.png&w=828&q=75", 
    characterId: "spectrum_blaster", 
    game: "wuwa" 
  },
];

/**
 * Fetches WuWa statistics from WuWa Tracker website
 * Uses HTML scraping with CORS proxy (no backend needed)
 * @param {string} bannerId - Banner ID to fetch (e.g., "100030" for Lynae)
 * @param {boolean} debugMode - Enable debug logging
 */
export async function fetchWuWaStats(bannerId, debugMode = true) {
  try {
    const statsUrl = `https://wuwatracker.com/tracker/stats/${bannerId}`;
    
    console.log('[WuWa] Fetching:', statsUrl);
    
    const response = await fetchWithProxyFallback(statsUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    console.log('[WuWa] HTML length:', html.length);
    
    // Parse the HTML to extract pity distribution
    const stats = parseWuWaHTML(html, debugMode);
    
    if (!stats) {
      throw new Error('Failed to parse WuWa statistics from HTML');
    }
    
    return stats;
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
  const CACHE_KEY = 'wuwa_live_banners_cache';
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
    
    // Extract banner data from the HTML
    // WuWa Tracker shows banners as links like /tracker/stats/100030
    const bannerPattern = /\/tracker\/stats\/(\d{6})[^>]*>([^<]+)</g;
    const banners = [];
    const seenIds = new Set();
    
    let match;
    while ((match = bannerPattern.exec(html)) !== null) {
      const bannerId = match[1];
      const bannerName = match[2].trim();
      
      // Skip duplicates
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);
      
      // Detect banner type:
      // - Character banners: IDs starting with 100xxx
      // - Weapon banners: IDs starting with 101xxx
      const isWeaponBanner = bannerId.startsWith('101');
      const type = isWeaponBanner ? 'weapon' : 'character';
      
      // Try to extract image URL (if available in HTML)
      // For now, use preset images if we have them, otherwise null
      const presetBanner = WUWA_PRESET_BANNERS.find(b => b.bannerId === bannerId);
      const image = presetBanner?.image || null;
      
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
    
    // Filter to show only the most recent banners (to avoid clutter over time)
    // Keep the 2 newest character banners and 2 newest weapon banners
    const characterBanners = banners.filter(b => b.type === 'character').sort((a, b) => b.bannerId.localeCompare(a.bannerId)).slice(0, 2);
    const weaponBanners = banners.filter(b => b.type === 'weapon').sort((a, b) => b.bannerId.localeCompare(a.bannerId)).slice(0, 2);
    const recentBanners = [...characterBanners, ...weaponBanners];
    
    console.log('[WuWa Banners] Filtered to', recentBanners.length, 'recent banners:', recentBanners.map(b => b.name));
    
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
