/**
 * Warp Data Service
 * Handles fetching global warp statistics from Star Rail Station API
 * and analyzing the data for "lucky roll" peaks.
 */

const SRS_API_BASE = "https://starrailstation.com/api/v1/warp_fetch/";
const CORS_PROXY = "https://corsproxy.io/?";

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
 * Fetches warp statistics from SRS API
 */
export async function fetchWarpStats(bannerId) {
  try {
    const targetUrl = `${SRS_API_BASE}${bannerId}?compare_id=0`;
    const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch warp data");
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Warp fetch error:", error);
    throw error;
  }
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
  const segment1 = analyzeSegment(1, 24, 3, "pre-soft");     // Early (1-24)
  const segment2 = analyzeSegment(25, 48, 3, "pre-soft");    // Mid (25-48)
  const segment3 = analyzeSegment(49, 73, 3, "pre-soft");    // Late (49-73)
  
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

  // === COMBINE AND RETURN ===
  // Sort the final string by roll number for readability
  const allPeaks = [...topPreSoftPity, ...topSoftPity].sort((a, b) => a.roll - b.roll);
  
  return allPeaks;
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
