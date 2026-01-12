/**
 * ADAPTIVE WUWA PARSER - Self-Healing Multi-Strategy System
 * 
 * Auto-heals when WuWa Tracker changes their HTML structure by trying multiple parsing strategies.
 * Caches the working strategy in localStorage for performance.
 * 
 * Usage: Import and use parseWuWa

HTML() as normal - it will automatically adapt.
 */

// Cache key for storing the working strategy
const WUWA_STRATEGY_CACHE_KEY = 'wuwa_parser_working_strategy';

/**
 * Validates WuWa data to ensure it's sensible before returning
 */
function validateWuWaData(data) {
  if (!data || !data.stats) {
    console.warn('[WuWa Validator] Missing data or stats object');
    return false;
  }
  
  const { stats } = data;
  
  // Check total pulls is realistic (5k - 500k range)
  if (!stats.total_pulls_5 || stats.total_pulls_5 < 5000 || stats.total_pulls_5 > 500000) {
    console.warn('[WuWa Validator] Total pulls out of realistic range:', stats.total_pulls_5);
    return false;
  }
  
  // Check we have enough histogram data
  const histogramSize = Object.keys(stats.by_rollnum_pulls_5 || {}).length;
  if (histogramSize < 50) {
    console.warn('[WuWa Validator] Histogram too small:', histogramSize, 'rolls');
    return false;
  }
  
  // Check that percentages sum to approximately 1.0
  // NOTE: WuWa total is ESTIMATED (2x featured or 1.3x weapon), so allow wider range
  const totalChance = Object.values(stats.by_rollnum_chance_5 || {}).reduce((sum, c) => sum + c, 0);
  if (totalChance < 0.75 || totalChance > 1.4) {
    console.warn('[WuWa Validator] Total chance sum out of range:', totalChance);
    console.warn('[WuWa Validator] This suggests total_pulls_5 calculation may be off');
    return false;
  }
  
  if (totalChance > 1.05 || totalChance < 0.95) {
    console.warn('[WuWa Validator] ⚠️ Total chance sum not ideal:', totalChance, '(expected ~1.0)');
    console.warn('[WuWa Validator] This is acceptable for WuWa since total is estimated');
    // Don't fail - just warn
  }
  
  console.log('[WuWa Validator] ✓ Data validated successfully');
  return true;
}

/**
 * Strategy 1: Current v4.0 regex patterns
 */
function parseStrategy_v1(html) {
  console.log('[WuWa Strategy 1] Trying current patterns...');
  
  const labelPatterns = [
    /\\"label\\":\\"5✦ Pulls per Pity\\"/,
    /\\"label\\":\\"5★ Pulls per Pity\\"/,
    /"label":"5✦ Pulls per Pity"/,
  ];
  
  let labelFound = labelPatterns.some(p => html.match(p));
  if (!labelFound) {
    console.warn('[WuWa Strategy 1] ❌ No label pattern matched');
    return null;
  }
  
  const histPatterns = [
    /\{\\"histogram\\":\{([^}]+)\}[^}]*\\"label\\":\\"5✦ Pulls per Pity\\"/,
    /\{\\"histogram\\":\{([^}]+)\}[^}]*\\"label\\":\\"5★ Pulls per Pity\\"/,
    /\\"histogram\\":\{([^}]+)\}/
  ];
  
  let histogramData = null;
  for (let i = 0; i < histPatterns.length; i++) {
    const pattern = histPatterns[i];
    const match = html.match(pattern);
    if (match) {
      try {
        let content = match[1].replace(/\\"/g, '"');
        histogramData = JSON.parse(`{${content}}`);
        console.log(`[WuWa Strategy 1] ✓ Histogram extracted (pattern ${i+1}) with`, Object.keys(histogramData).length, 'pity values');
        break;
      } catch (e) {
        console.warn(`[WuWa Strategy 1] Pattern ${i+1} matched but parse failed:`, e.message);
      }
    }
  }
  
  if (!histogramData) return null;
  
  let characterData = null;
  const charPatterns = [
    /\\"itemNameHistogram\\":\{([^}]+)\}/,
    /"itemNameHistogram":\{([^}]+)\}/
  ];
  
  for (let i = 0; i < charPatterns.length; i++) {
    const pattern = charPatterns[i];
    const match = html.match(pattern);
    if (match) {
      try {
        let content = match[1].replace(/\\"/g, '"');
        characterData = JSON.parse(`{${content}}`);
        console.log(`[WuWa Strategy 1] ✓ Character data extracted (pattern ${i+1}):`, Object.keys(characterData));
        break;
      } catch (e) {
        console.warn(`[WuWa Strategy 1] Char pattern ${i+1} matched but parse failed:`, e.message);
      }
    }
  }
  
  return buildWuWaStats(histogramData, characterData);
}

/**
 * Strategy 2: Next.js __NEXT_DATA__ structure
 */
function parseStrategy_v2(html) {
  console.log('[WuWa Strategy 2] Trying __NEXT_DATA__...');
  
  try {
    const pattern = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s;
    const match = html.match(pattern);
    
    if (match) {
      const data = JSON.parse(match[1]);
      const pageProps = data?.props?.pageProps;
      
      if (pageProps) {
        const stats = pageProps.stats || pageProps.bannerStats || pageProps.data;
        const histogramData = stats?.histogram || stats?.pityDistribution;
        const characterData = stats?.characters || stats?.items;
        
        if (histogramData) {
          return buildWuWaStats(histogramData, characterData);
        }
      }
    }
  } catch (e) {}
  
  return null;
}

/**
 * Strategy 3: Heuristic pattern search
 */
function parseStrategy_v3(html) {
  console.log('[WuWa Strategy 3] Trying heuristic search...');
  
  try {
    const pattern = /\{[^{}]*"1":\d+[^{}]*"2":\d+[^{}]*"70":\d+[^{}]*\}/g;
    const matches = html.match(pattern);
    
    if (matches) {
      for (const m of matches) {
        try {
          const data = JSON.parse(m.replace(/\\"/g, '"'));
          const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
          
          if (keys.length >= 60 && keys[0] === 1 && keys[keys.length - 1] >= 70) {
            return buildWuWaStats(data, null);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  
  return null;
}

/**
 * Helper: Build stats from histogram + character data
 */
function buildWuWaStats(histogramData, characterData) {
  // Calculate histogram sum first (ground truth)
  const histogramSum = Object.values(histogramData)
    .reduce((sum, count) => sum + parseInt(count, 10), 0);
  
  let total_pulls_5;
  let calculation_method;
  
  if (characterData) {
    const items = Object.entries(characterData).map(([name, count]) => ({
      name,
      count: parseInt(count, 10)
    })).sort((a, b) => b.count - a.count);
    
    const featured = items[0];
    const isWeaponBanner = items.length <= 4;
    
    // Calculate estimated total using multiplier
    const multiplier = isWeaponBanner ? 1.3 : 2.0;
    const estimatedTotal = isWeaponBanner 
      ? Math.floor(featured.count * multiplier)
      : featured.count * multiplier;
    
    // SANITY CHECK: If multiplier estimate is WAY off from histogram sum, use histogram sum
    const ratio = estimatedTotal / histogramSum;
    
    if (ratio < 0.7 || ratio > 1.4) {
      // Multiplier is way off - use histogram sum instead
      console.warn(`[WuWa Builder] Multiplier estimate (${estimatedTotal}) differs significantly from histogram sum (${histogramSum})`);
      console.warn(`[WuWa Builder] Using histogram sum instead`);
      total_pulls_5 = histogramSum;
      calculation_method = 'histogram_sum_fallback';
    } else {
      // Multiplier seems reasonable
      total_pulls_5 = estimatedTotal;
      calculation_method = isWeaponBanner ? 'weapon_1.3x' : 'character_2x';
      console.log(`[WuWa Builder] Using ${multiplier}x multiplier: ${featured.name} × ${multiplier} = ${total_pulls_5}`);
    }
  } else {
    // No character data - use histogram sum
    total_pulls_5 = histogramSum;
    calculation_method = 'histogram_sum_only';
    console.log('[WuWa Builder] No character data, using histogram sum:', total_pulls_5);
  }
  
  const by_rollnum_pulls_5 = {};
  const by_rollnum_chance_5 = {};
  
  for (const [pity, count] of Object.entries(histogramData)) {
    const roll = parseInt(pity, 10);
    const pullCount = parseInt(count, 10);
    
    by_rollnum_pulls_5[roll] = pullCount;
    by_rollnum_chance_5[roll] = total_pulls_5 > 0 ? pullCount / total_pulls_5 : 0;
  }
  
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
}

/**
 * MAIN ADAPTIVE PARSER
 * Automatically tries multiple strategies and caches the working one
 */
export function parseWuWaHTML_Adaptive(html) {
  console.log('[WuWa Adaptive] Starting parse, HTML length:', html.length);
  
  const strategies = [
    { name: 'v1_current', fn: parseStrategy_v1 },
    { name: 'v2_nextdata', fn: parseStrategy_v2 },
    { name: 'v3_heuristic', fn: parseStrategy_v3 }
  ];
  
  // Try cached strategy first
  const cached = localStorage.getItem(WUWA_STRATEGY_CACHE_KEY);
  if (cached) {
    const strategy = strategies.find(s => s.name === cached);
    if (strategy) {
      console.log(`[WuWa Adaptive] Trying cached: ${cached}`);
      const result = strategy.fn(html);
      if (result && validateWuWaData(result)) {
        console.log(`[WuWa Adaptive] ✓ Cached strategy worked!`);
        return result;
      }
      localStorage.removeItem(WUWA_STRATEGY_CACHE_KEY);
    }
  }
  
  // Try all strategies
  for (const strategy of strategies) {
    console.log(`[WuWa Adaptive] Trying: ${strategy.name}`);
    
    try {
      const result = strategy.fn(html);
      if (result && validateWuWaData(result)) {
        console.log(`[WuWa Adaptive] ✓ SUCCESS with ${strategy.name}`);
        localStorage.setItem(WUWA_STRATEGY_CACHE_KEY, strategy.name);
        return result;
      }
    } catch (error) {
      console.warn(`[WuWa Adaptive] ${strategy.name} error:`, error);
    }
  }
  
  console.error('[WuWa Adaptive] ❌ ALL STRATEGIES FAILED');
  console.error('[WuWa Adaptive] Please report this - WuWa Tracker may have changed significantly');
  return null;
}
