/**
 * Genshin Stats API Endpoint
 * Fetches Genshin Impact statistics from paimon.moe
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Banner ID is required' });
  }

  // Handle Shared Banner Data (Ineffa 300093 shares with Columbina 300094)
  let fetchId = id;
  if (id === '300093') {
    console.log('[Genshin API] Shared data detected: 300093 -> 300094');
    fetchId = '300094';
  }
  
  try {
    const apiUrl = `https://api.paimon.moe/wish?banner=${fetchId}`;
    console.log('[Genshin API] Fetching:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to unified format
    const pityArray = data.pityCount?.legendary || [];
    const by_rollnum_pulls_5 = {};
    const by_rollnum_chance_5 = {};
    
    // pityCount.legendary is 0-indexed: index 0 = pity 0 (always 0), index 3 = pity 3.
    // So roll N maps to index N directly (NOT index N-1).
    let totalPulls = 0;
    pityArray.forEach((count, index) => {
      const roll = index; // Pity 0 = index 0, Pity 3 = index 3
      if (roll === 0) return; // Skip pity-0 (always 0, impossible to get 5* at pity 0)
      by_rollnum_pulls_5[roll] = count;
      totalPulls += count;
    });
    
    // Use totalPulls (array sum) — same denominator Paimon.moe uses for its own % display
    if (totalPulls > 0) {
      for (const [roll, count] of Object.entries(by_rollnum_pulls_5)) {
        by_rollnum_chance_5[roll] = count / totalPulls;
      }
    }
    
    const result = {
      stats: {
        // Use summed totalPulls (not data.total.legendary) so it matches the array denominator
        total_pulls_5: totalPulls || data.total?.legendary || 0,
        by_rollnum_pulls_5,
        by_rollnum_chance_5,
        count_win_5: 0,
        count_lose_5: 0,
        users: data.total?.users || 0
      },
      raw: data
    };
    
    console.log('[Genshin API] Data received, total 5★ pulls:', result.stats.total_pulls_5);
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Genshin API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Genshin stats',
      message: error.message 
    });
  }
}
