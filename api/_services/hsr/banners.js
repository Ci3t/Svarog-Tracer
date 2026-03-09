/**
 * HSR Banners API Endpoint
 * Discovers live HSR banners from starrailstation.com
 */

export async function handler(req, res) {
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
  
  try {
    console.log('[HSR Banners API] Discovering active banners...');
    
    const nowTs = Date.now();
    const currentSeconds = nowTs / 1000;
    
    // 1. Fetch warp config from starrailstation
    const configUrl = `https://starrailstation.com/api/v1/warp_config?_t=${nowTs}`;
    const configRes = await fetch(configUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!configRes.ok) {
      throw new Error(`Config fetch failed: HTTP ${configRes.status}`);
    }
    
    const configData = await configRes.json();
    const gachaList = configData.config?.banners || {};
    
    // 2. Filter for active banners (current timestamp within start/end time)
    const activeCandidates = [];
    for (const [bannerId, bannerData] of Object.entries(gachaList)) {
      if (bannerData.start_time <= currentSeconds && currentSeconds <= bannerData.end_time) {
        if (bannerData.rateup) {
          activeCandidates.push({
            bannerId,
            characterId: String(bannerData.rateup),
            startTime: bannerData.start_time,
            endTime: bannerData.end_time
          });
        }
      }
    }
    
    if (activeCandidates.length === 0) {
      console.log('[HSR Banners API] No active banners found');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json([]);
    }
    
    console.log(`[HSR Banners API] Found ${activeCandidates.length} active banner(s)`);
    
    // 3. Fetch character and light cone metadata from StarRailRes
    const [charRes, lcRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json'),
      fetch('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json')
    ]);
    
    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};
    
    // 4. Map banner IDs to character/LC names and images
    const banners = activeCandidates.map(banner => {
      const charId = banner.characterId;
      
      // Check if it's a character
      if (charMap[charId]) {
        const char = charMap[charId];
        return {
          id: `${banner.bannerId}_character`,
          bannerId: banner.bannerId,
          name: char.name,
          type: 'character',
          image: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${char.icon}`,
          characterId: charId,
          game: 'hsr',
          startTime: banner.startTime,
          endTime: banner.endTime
        };
      }
      
      // Check if it's a light cone
      if (lcMap[charId]) {
        const lc = lcMap[charId];
        return {
          id: `${banner.bannerId}_light_cone`,
          bannerId: banner.bannerId,
          name: lc.name,
          type: 'light_cone',
          image: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${lc.icon}`,
          characterId: charId,
          game: 'hsr',
          startTime: banner.startTime,
          endTime: banner.endTime
        };
      }
      
      // Unknown item
      return {
        id: `${banner.bannerId}_unknown`,
        bannerId: banner.bannerId,
        name: `Unknown (${charId})`,
        type: 'unknown',
        image: null,
        characterId: charId,
        game: 'hsr',
        startTime: banner.startTime,
        endTime: banner.endTime
      };
    });
    
    console.log('[HSR Banners API] Returning banners:', banners.map(b => b.name).join(', '));
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(banners);
  } catch (error) {
    console.error('[HSR Banners API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to discover HSR banners',
      message: error.message 
    });
  }
}
