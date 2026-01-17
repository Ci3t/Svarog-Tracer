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
 * Strategy 4: Next.js Streaming Format (self.__next_f.push)
 * WuWa Tracker uses React Server Components with streaming
 */
function parseStrategy_v4(html) {
  console.log('[WuWa Strategy 4] Trying Next.js streaming format...');
  
  try {
    // The actual pattern in WuWa HTML:
    // {\"1\":256,\"2\":281,...\"78\":14},\"barColor\":...,\"lineColor\":...,\"label\":\"5✦ Pulls per Pity\"
    // Find the label first, then extract backwards to get the pity distribution
    
    // Try multiple label patterns (characters use 5✦, weapons might vary)
    const labelPatterns = [
      /\\"label\\":\\"5✦ Pulls per Pity\\"/,  // Character banners
      /\\"label\\":\\"[^"]+Pulls per Pity\\"/,  // Any rarity
      /Pulls per Pity/  // Fallback - just find the text
    ];
    
    let labelPos = -1;
    for (const pattern of labelPatterns) {
      const match = html.match(pattern);
      if (match) {
        labelPos = match.index;
        console.log(`[WuWa Strategy 4] ✓ Found label at position ${labelPos}`);
        break;
      }
    }
    
    if (labelPos === -1) {
      console.warn('[WuWa Strategy 4] ❌ Label not found');
      return null;
    }
    
    // Now search backwards from the label to find the pity distribution object
    const before = html.substring(Math.max(0, labelPos - 10000), labelPos);
    
    // Find the last occurrence of {\"1\": (start of pity dist) before the label
    // Pattern: find {} object with keys like \"1\":, \"2\":, etc. up to \"78\":
    const pityPattern = /\{(\\"1\\":\d+[^}]{500,})\}/g;
    let allMatches = [];
    let match;
    while ((match = pityPattern.exec(before)) !== null) {
      allMatches.push({ content: match[1], index: match.index });
    }
    
    if (allMatches.length === 0) {
      console.warn('[WuWa Strategy 4] ❌ No pity distribution found');
      return null;
    }
    
    // Get the closest match to the label
    const closestMatch = allMatches[allMatches.length - 1];
    
    let histogramData = null;
    try {
      // Unescape the quotes
      let content = closestMatch.content.replace(/\\"/g, '"');
      histogramData = JSON.parse(`{${content}}`);
      console.log(`[WuWa Strategy 4] ✓ Histogram extracted with`, Object.keys(histogramData).length, 'pity values');
    } catch (e) {
      console.warn(`[WuWa Strategy 4] Histogram parse failed:`, e.message);
      return null;
    }
    
    // Try to find character/item data
    // Pattern: \"itemNameHistogram\":{\"Mornye\":14346,...}
    let characterData = null;
    const charPattern = /\\"itemNameHistogram\\":\{([^}]+)\}/;
    const charMatch = html.match(charPattern);
    
    if (charMatch) {
      try {
        let content = charMatch[1].replace(/\\"/g, '"');
        characterData = JSON.parse(`{${content}}`);
        console.log(`[WuWa Strategy 4] ✓ Character data extracted:`, Object.keys(characterData).join(', '));
      } catch (e) {
        console.warn(`[WuWa Strategy 4] Character data parse failed:`, e.message);
      }
    }
    
    // Extract banner image URL
    // Pattern: \\"src\\":\\"/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Fmornye-portrait.webp&w=828&q=75\\"
    // or: \\"src\\":\\"/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Fstarfield-calibrator-portrait.png&w=828&q=75\\"
    let imageUrl = null;
    const imagePatterns = [
      /\\\\\"src\\\\\":\\\\\"(\/_next\/image\\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^\\\\]+\.(?:webp|png)[^\\\\]*)\\\\\"/,
      /src=\\"(\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"]+\.(?:webp|png)[^"]*)\\"/,
      /src:"(\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"]+\.(?:webp|png)[^"]*)"/,
    ];
    
    for (const pattern of imagePatterns) {
      const imgMatch = html.match(pattern);
      if (imgMatch) {
        // Construct full URL (add domain if needed)
        const rawUrl = imgMatch[1].replace(/\\\\/g, '');
        imageUrl = rawUrl.startsWith('http') ? rawUrl : `https://wuwatracker.com${rawUrl}`;
        console.log(`[WuWa Strategy 4] ✓ Image extracted:`, imageUrl);
        break;
      }
    }
    
    if (!imageUrl) {
      console.warn('[WuWa Strategy 4] ⚠️ Image not found in HTML');
    }
    
    return buildWuWaStats(histogramData, characterData, imageUrl);
  } catch (e) {
    console.warn('[WuWa Strategy 4] Error:', e);
    return null;
  }
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
 * Helper: Build stats from histogram + character data + image
 */
function buildWuWaStats(histogramData, characterData, imageUrl = null) {
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
    image: imageUrl,
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
    { name: 'v4_streaming', fn: parseStrategy_v4 },  // NEW: Try streaming format first
    { name: 'v1_current', fn: parseStrategy_v1 },
    { name: 'v2_nextdata', fn: parseStrategy_v2 },
    { name: 'v3_heuristic', fn: parseStrategy_v3 }
  ];
  
  console.log('[WuWa Adaptive] Registered strategies:', strategies.map(s => s.name).join(', '));
  console.log('[WuWa Adaptive] v4 function exists?', typeof parseStrategy_v4 === 'function');
  
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
