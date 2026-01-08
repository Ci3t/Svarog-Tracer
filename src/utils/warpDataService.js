/**
 * Warp Data Service
 * Handles fetching global warp statistics from Star Rail Station API
 * and analyzing the data for "lucky roll" peaks.
 */

const SRS_API_BASE = "https://starrailstation.com/api/v1/warp_fetch/";
const PAIMON_API_BASE = "https://api.paimon.moe/wish";
const CORS_PROXY = "https://corsproxy.io/?";

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
      const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetch(url);
      
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
    const configUrl = `${CORS_PROXY}${encodeURIComponent(`https://starrailstation.com/api/v1/warp_config?_t=${nowTs}`)}`;
    const response = await fetch(configUrl);
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
      const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetch(url);
      
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
 * Auto-detects current event banners
 */
export async function fetchGenshinLiveBanners(ignoreThrottle = false) {
  try {
    const LAST_CHECK_KEY = 'genshin_banner_last_check';
    const CACHE_KEY = 'genshin_cached_banners';
    
    if (!ignoreThrottle) {
      const lastCheck = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0');
      const nowTs = Date.now();
      
      if (nowTs - lastCheck < 10000) {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        if (cached.length > 0) return { status: 'uptodate', data: cached };
      }
    }
    
    // Fetch banner list from Paimon.moe
    // They don't have a direct banner list API, so we'll fetch recent banners by trying known IDs
    const nowTs = Date.now();
    
    // Try to get recent character banners (IDs are sequential: 300093, 300092, etc.)
    // Find the latest by testing a high ID first
    const banners = [];
    
    // Character banners - try recent IDs (expanded range for future-proofing)
    // Each patch has ~2-3 character banners, range covers ~1 year
    for (let i = 99; i >= 85; i--) {
      const bannerId = `3000${i}`;
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.total && data.total.legendary > 1000) {
            // Find featured 5★ characters only using count RANGE
            // Based on actual API data:
            // - 4★ rate-up: ~64,000 counts (too high)
            // - 5★ rate-up: ~12,000-13,000 counts (target)
            // - Standard 5★: ~1,500 counts (too low)
            // Filter: count > 5000 AND count < 50000 = 5★ featured only
            const featured5Star = data.list?.filter(item => 
              item.type === 'character' && 
              item.count > 5000 &&   // Above standard 5★ (~1500)
              item.count < 50000 &&  // Below 4★ rate-ups (~64000)
              !['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya'].includes(item.name)
            ) || [];
            
            for (const char of featured5Star) {
              const formattedName = char.name.split('_').map(w => 
                w.charAt(0).toUpperCase() + w.slice(1)
              ).join(' ');
              
              // Use proper Genshin character icon URL format
              const charIconName = char.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
              
              // Use unique ID = bannerId_characterName to prevent duplicates
              banners.push({
                id: `${bannerId}_${char.name}`,  // Unique per character
                bannerId: bannerId,               // Original API banner ID for fetching
                name: formattedName,
                type: 'character',
                image: `${GENSHIN_IMG_BASE}${charIconName}.png`,
                characterId: char.name,
                game: 'genshin'
              });
            }
            break; // Found current banner, stop searching
          }
        }
      } catch (e) {
        console.warn(`Banner ${bannerId} not found`);
      }
    }
    
    // Weapon banners - expanded range for future-proofing
    for (let i = 99; i >= 85; i--) {
      const bannerId = `4000${i}`;  // Fixed: was 400${i} which gave 40092 instead of 400092
      try {
        const targetUrl = `${PAIMON_API_BASE}?banner=${bannerId}`;
        const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.total && data.total.legendary > 500) {
            // Find the top 5★ weapons - need higher threshold to exclude 4★ weapons
            const weapons = data.list?.filter(item => 
              item.type === 'weapon' && item.count > 3000  // Higher threshold for 5★
            ).sort((a, b) => b.count - a.count).slice(0, 2) || [];
            
            // Extract banner number from ID (400092 -> 92)
            const bannerNumber = bannerId.slice(-2);
            
            // Use unique ID for weapon banner
            banners.push({
              id: `${bannerId}_weapon`,   // Unique weapon banner ID
              bannerId: bannerId,          // Original API banner ID for fetching
              name: `Epitome Invocation`,
              type: 'weapon',
              // Use Paimon.moe's own banner images
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
    
    // Fallback to presets
    return { status: 'fallback', data: GENSHIN_PRESET_BANNERS };
    
  } catch (error) {
    console.error("Genshin banner fetch error:", error);
    return { status: 'error', data: GENSHIN_PRESET_BANNERS, error };
  }
}


