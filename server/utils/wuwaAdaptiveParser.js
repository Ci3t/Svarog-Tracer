/**
 * ADAPTIVE WUWA PARSER - Self-Healing Multi-Strategy System
 * 
 * Auto-heals when WuWa Tracker changes their HTML structure by trying multiple parsing strategies.
 * Caches the working strategy in localStorage for performance.
 * 
 * CONFIRMED HTML STRUCTURE (RSC/Next.js streaming format):
 * 
 * -- 5-STAR HISTOGRAM (before label):
 * {"histogram":{"1":25,"2":34,...},"barColor":"...","label":"5✦ Pulls per Pity"}
 * 
 * -- ITEM NAME HISTOGRAM (after label) in separate object:
 * {"label":"5✦ Pulls","rarity":5,"itemNameHistogram":{"Emerald Sentence":713,"Solsworn Ciphers":2294}}
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
  const pullsByRoll = stats.by_rollnum_pulls_5 || {};
  const chanceByRoll = stats.by_rollnum_chance_5 || {};
  
  // Check we have histogram data
  const histogramSize = Object.keys(pullsByRoll).length;
  if (histogramSize < 50) {
    console.warn('[WuWa Validator] Histogram too small:', histogramSize, 'rolls');
    return false;
  }

  const totalPulls = Number(stats.total_pulls_5 || 0);
  if (!Number.isFinite(totalPulls) || totalPulls <= 0) {
    console.warn('[WuWa Validator] Invalid total pulls:', stats.total_pulls_5);
    return false;
  }

  const histogramSum = Object.values(pullsByRoll).reduce((sum, value) => sum + Number(value || 0), 0);
  if (Math.abs(histogramSum - totalPulls) > 1) {
    console.warn('[WuWa Validator] Histogram sum mismatch:', { histogramSum, totalPulls });
    return false;
  }

  const chanceEntries = Object.entries(chanceByRoll);
  if (chanceEntries.length !== histogramSize) {
    console.warn('[WuWa Validator] Chance/pull key count mismatch:', {
      histogramSize,
      chanceSize: chanceEntries.length,
    });
    return false;
  }

  for (const [roll, chance] of chanceEntries) {
    const numericChance = Number(chance);
    if (!Number.isFinite(numericChance) || numericChance < 0 || numericChance > 1) {
      console.warn('[WuWa Validator] Invalid conditional chance:', { roll, chance });
      return false;
    }
  }

  const pullEntries = Object.entries(pullsByRoll);
  if (pullEntries.some(([roll, count]) => !Number.isFinite(Number(count)) || Number(count) < 0)) {
    console.warn('[WuWa Validator] Invalid pull count detected');
    return false;
  }
  
  return true;
}

/**
 * Strategy v5 (PRIMARY): RSC/Next.js Streaming — finds the actual histogram near the "5✦ Pulls per Pity" label
 * 
 * Confirmed structure:
 * {\"histogram\":{\"1\":N,...,\"80\":N},\"barColor\":...,\"label\":\"5✦ Pulls per Pity\"}
 * ...AFTER the label...
 * {\"label\":\"5✦ Pulls\",\"rarity\":5,\"itemNameHistogram\":{\"Char Name\":N,...}}
 */
function parseStrategy_v5(html) {
  try {
    // Find the object containing the 5-star pity histogram
    // Pattern: "histogram":{"1":N,"2":N...}  ,"label": "5✦ Pulls per Pity"
    const histBlockPattern = /\{\\+"histogram\\":\s*\{((?:\\"?\d+\\"?:\d+,?)+)\}[^}]{0,500}\\"label\\":\s*\\"5[^"\\]*Pulls per Pity\\"/;
    const histBlockMatch = html.match(histBlockPattern);
    
    if (!histBlockMatch) {
      // Fallback: find "5✦ Pulls per Pity" label and search back for histogram
      const labelMatch = html.match(/\\"label\\":\\"5[^"\\]{0,5}Pulls per Pity\\"/);
      if (!labelMatch) return null;
      
      const labelPos = labelMatch.index;
      const searchRegion = html.substring(Math.max(0, labelPos - 5000), labelPos + 100);
      
      // Find the closest "histogram":{ before the label
      const histMatches = [...searchRegion.matchAll(/\\"histogram\\":\{((?:\\"?\d+\\"?:\d+,?)+)\}/g)];
      if (histMatches.length === 0) return null;
      
      // Use the LAST match (closest to the label)
      const lastHist = histMatches[histMatches.length - 1];
      const histContent = lastHist[1];
      const histogramData = parseHistogramContent(histContent);
      if (!histogramData) return null;
      
      // Now find itemNameHistogram AFTER the label
      const afterLabel = html.substring(labelPos, labelPos + 2000);
      const itemHistogram = extractItemHistogram(afterLabel);
      
      return buildWuWaStats(histogramData, itemHistogram);
    }
    
    const histContent = histBlockMatch[1];
    const histogramData = parseHistogramContent(histContent);
    if (!histogramData) return null;
    
    // Find itemNameHistogram after this block
    const blockEnd = histBlockMatch.index + histBlockMatch[0].length;
    const afterBlock = html.substring(blockEnd, blockEnd + 2000);
    const itemHistogram = extractItemHistogram(afterBlock);
    
    return buildWuWaStats(histogramData, itemHistogram);
  } catch (e) {
    console.warn('[WuWa v5] Error:', e.message);
    return null;
  }
}

function parseHistogramContent(content) {
  try {
    // content looks like: \"1\":25,\"2\":34,...
    const cleaned = content.replace(/\\"/g, '"');
    return JSON.parse(`{${cleaned}}`);
  } catch (e) {
    // Maybe already unescaped: "1":25,"2":34,...
    try {
      return JSON.parse(`{${content}}`);
    } catch (e2) {
      return null;
    }
  }
}

function extractItemHistogram(htmlRegion) {
  try {
    // Look for: "itemNameHistogram":{"Name":N,...}
    const pattern = /\\"?itemNameHistogram\\"?:\s*\{([^}]+)\}/;
    const match = htmlRegion.match(pattern);
    if (!match) return null;
    
    const cleaned = match[1].replace(/\\"/g, '"');
    return JSON.parse(`{${cleaned}}`);
  } catch (e) {
    return null;
  }
}

/**
 * Strategy 1: Legacy itemNameHistogram (old format)
 */
function parseStrategy_v1(html) {
  const histPattern = /\{\\"histogram\\":\{([^}]+)\}[^}]*\\"label\\":\\"5✦ Pulls per Pity\\"/;
  const match = html.match(histPattern);
  if (!match) return null;
  
  const histogramData = parseHistogramContent(match[1]);
  if (!histogramData) return null;
  
  let characterData = null;
  const charMatch = html.match(/\\"itemNameHistogram\\":\{([^}]+)\}/);
  if (charMatch) {
    characterData = parseHistogramContent(charMatch[1]);
  }
  
  return buildWuWaStats(histogramData, characterData);
}

/**
 * Strategy 2: Next.js __NEXT_DATA__
 */
function parseStrategy_v2(html) {
  try {
    const pattern = /<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s;
    const match = html.match(pattern);
    if (match) {
      const data = JSON.parse(match[1]);
      const stats = data?.props?.pageProps?.stats || data?.props?.pageProps?.bannerStats;
      if (stats && stats.histogram) {
        return buildWuWaStats(stats.histogram, stats.characters || stats.items);
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Strategy 3: Heuristic - find a large object with numeric keys 1-80
 * This is key-agnostic and works even if by_rollnum_pulls_5 is renamed or removed.
 */
function parseStrategy_v3(html) {
  // Match patterns like {"1":N,"2":N,..."70":N} (unescaped, from RSC payload)
  const patterns = [
    /\{"1":\d+,"2":\d+[^}]{400,},"70":\d+[^}]{0,200}\}/,
    /\{\\"1\\":\d+,\\"2\\":\d+[^}]{400,},\\"70\\":\d+[^}]{0,200}\}/,
    /(\{..1..:\d+,..2..:\d+,..3..:\d+,..4..:\d+,..5..:\d+,[^}]+\})/
  ];
  
  for (const p of patterns) {
    const match = html.match(p);
    if (match) {
      try {
        const cleaned = match[0].replace(/\\"/g, '"').replace(/\.\./g, '"');
        const data = JSON.parse(cleaned);
        // Signature of a 5-star distribution: goes up to at least 70
        if (data['1'] !== undefined && data['70'] !== undefined) {
          return buildWuWaStats(data, null);
        }
      } catch (e) {}
    }
  }
  return null;
}

function buildWuWaStats(histogramData, itemData, imageUrl = null) {
  const histogramEntries = Object.entries(histogramData)
    .map(([pity, count]) => ({ roll: parseInt(pity, 10), count: parseInt(count, 10) }))
    .filter(e => !isNaN(e.roll) && !isNaN(e.count))
    .sort((a, b) => a.roll - b.roll);

  const histogramSum = histogramEntries.reduce((sum, e) => sum + e.count, 0);
  
  const by_rollnum_pulls_5 = {};
  const by_rollnum_chance_5 = {};
  
  // Calculate Conditional Probability (Rate) for each pity step
  // This matches the standard used by Svarog/SRS/WuWa Tracker charts
  let remainingPulls = histogramSum;
  for (const entry of histogramEntries) {
    by_rollnum_pulls_5[entry.roll] = entry.count;
    // P(pull at N | reached N) = Pulls(N) / Sum(Pulls(i) for i >= N)
    by_rollnum_chance_5[entry.roll] = remainingPulls > 0 ? entry.count / remainingPulls : 0;
    
    remainingPulls -= entry.count;
  }
  
  let finalItems = [];
  if (itemData) {
    finalItems = Object.entries(itemData)
      .map(([name, count]) => ({ name, count: parseInt(count, 10) }))
      .filter(item => !isNaN(item.count) && item.count > 0)
      .sort((a, b) => b.count - a.count);
  }
  
  return {
    stats: { 
      by_rollnum_pulls_5, 
      by_rollnum_chance_5, 
      total_pulls_5: histogramSum, 
      count_win_5: 0, 
      count_lose_5: 0 
    },
    image: imageUrl,
    list: finalItems
  };
}

export function parseWuWaHTML_Adaptive(html) {
  const strategies = [
    { name: 'v5_rsc', fn: parseStrategy_v5 },
    { name: 'v3_heuristic', fn: parseStrategy_v3 },
    { name: 'v1_current', fn: parseStrategy_v1 },
    { name: 'v2_nextdata', fn: parseStrategy_v2 },
  ];
  
  // NOTE: In serverless environments, localStorage might not exist.
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(WUWA_STRATEGY_CACHE_KEY);
    if (cached) {
      const strategy = strategies.find(s => s.name === cached);
      if (strategy) {
        const result = strategy.fn(html);
        if (result && validateWuWaData(result)) return result;
        localStorage.removeItem(WUWA_STRATEGY_CACHE_KEY);
      }
    }
  }
  
  for (const strategy of strategies) {
    try {
      console.log('[WuWa Parser] Trying strategy:', strategy.name);
      const result = strategy.fn(html);
      if (result && validateWuWaData(result)) {
        console.log('[WuWa Parser] ✓ Strategy', strategy.name, 'succeeded! total_pulls_5:', result.stats.total_pulls_5);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WUWA_STRATEGY_CACHE_KEY, strategy.name);
        }
        return result;
      }
    } catch (e) {
      console.warn('[WuWa Parser] Strategy', strategy.name, 'threw:', e.message);
    }
  }
  
  console.error('[WuWa Parser] All strategies failed!');
  return null;
}
