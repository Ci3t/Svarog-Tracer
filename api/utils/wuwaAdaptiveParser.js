/**
 * ADAPTIVE WUWA PARSER - Self-Healing Multi-Strategy System
 * Backend version (no localStorage)
 * 
 * Auto-heals when WuWa Tracker changes their HTML structure by trying multiple parsing strategies.
 */

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
  const totalChance = Object.values(stats.by_rollnum_chance_5 || {}).reduce((sum, c) => sum + c, 0);
  if (totalChance < 0.75 || totalChance > 1.4) {
    console.warn('[WuWa Validator] Total chance sum out of range:', totalChance);
    return false;
  }
  
  console.log('[WuWa Validator] ✓ Data validated successfully');
  return true;
}

/**
 * Strategy 4: Next.js Streaming Format (self.__next_f.push)
 */
function parseStrategy_v4(html) {
  console.log('[WuWa Strategy 4] Trying Next.js streaming format...');
  
  try {
    const labelPatterns = [
      /\\"label\\":\\"5✦ Pulls per Pity\\"/,
      /\\"label\\":\\"[^\\"]+Pulls per Pity\\"/,
      /Pulls per Pity/
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
    
    const before = html.substring(Math.max(0, labelPos - 10000), labelPos);
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
    
    const closestMatch = allMatches[allMatches.length - 1];
    
    let histogramData = null;
    try {
      let content = closestMatch.content.replace(/\\"/g, '"');
      histogramData = JSON.parse(`{${content}}`);
      console.log(`[WuWa Strategy 4] ✓ Histogram extracted with`, Object.keys(histogramData).length, 'pity values');
    } catch (e) {
      console.warn(`[WuWa Strategy 4] Histogram parse failed:`, e.message);
      return null;
    }
    
    // Extract character/item data
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
    let imageUrl = null;
    const imagePatterns = [
      /\\\\"src\\\\":\\\\"(\/_next\/image\\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^\\\\]+\.(?:webp|png)[^\\\\]*)\\\\"/, 
      /src=\\"(\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"]+\.(?:webp|png)[^"]*)\\"/,
      /src:"(\/_next\/image\?url=%2Fapi%2F(?:character|weapon)-portraits%2Ffile%2F[^"]+\.(?:webp|png)[^"]*)"/,
    ];
    
    for (const pattern of imagePatterns) {
      const imgMatch = html.match(pattern);
      if (imgMatch) {
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
 * Helper: Build stats from histogram + character data + image
 */
function buildWuWaStats(histogramData, characterData, imageUrl = null) {
  const histogramSum = Object.values(histogramData)
    .reduce((sum, count) => sum + parseInt(count, 10), 0);
  
  let total_pulls_5;
  
  if (characterData) {
    const items = Object.entries(characterData).map(([name, count]) => ({
      name,
      count: parseInt(count, 10)
    })).sort((a, b) => b.count - a.count);
    
    const featured = items[0];
    const isWeaponBanner = items.length <= 4;
    const multiplier = isWeaponBanner ? 1.3 : 2.0;
    const estimatedTotal = isWeaponBanner 
      ? Math.floor(featured.count * multiplier)
      : featured.count * multiplier;
    
    const ratio = estimatedTotal / histogramSum;
    
    if (ratio < 0.7 || ratio > 1.4) {
      total_pulls_5 = histogramSum;
    } else {
      total_pulls_5 = estimatedTotal;
    }
  } else {
    total_pulls_5 = histogramSum;
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
 * MAIN ADAPTIVE PARSER (Backend version - no localStorage)
 */
export function parseWuWaHTML_Adaptive(html) {
  console.log('[WuWa Adaptive] Starting parse, HTML length:', html.length);
  
  // Try strategy v4 (currently working)
  const result = parseStrategy_v4(html);
  if (result && validateWuWaData(result)) {
    console.log(`[WuWa Adaptive] ✓ SUCCESS with v4`);
    return result;
  }
  
  console.error('[WuWa Adaptive] ❌ Parsing failed');
  return null;
}
