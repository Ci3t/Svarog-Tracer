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
    
    // 3. Calculate total using 2x featured character pulls
    // WuWa has 50/50 mechanic, so featured char ≈ 50% of total 5-stars
    let total_pulls_5;
    
    if (characterData) {
      // Find featured character (highest count)
      const characters = Object.entries(characterData).map(([name, count]) => ({
        name,
        count: parseInt(count, 10)
      }));
      
      characters.sort((a, b) => b.count - a.count);
      const featured = characters[0];
      
      total_pulls_5 = featured.count * 2;
      console.log(`[WuWa Parser] Using 2x featured character (${featured.name}: ${featured.count}) = ${total_pulls_5} total`);
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
