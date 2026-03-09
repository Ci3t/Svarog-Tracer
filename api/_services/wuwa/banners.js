/**
 * WuWa Banners API Endpoint
 * Fetches live WuWa banners from WuWa Tracker
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
    console.log('[WuWa Banners API] Fetching live banners...');
    
    const response = await fetch('https://wuwatracker.com/tracker/stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Parse banner IDs from HTML
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const banners = [];
    const seenIds = new Set();
    let idMatch;
    
    while ((idMatch = idPattern.exec(html)) !== null) {
      const bannerId = idMatch[1];
      
      const isCharacter = bannerId.startsWith('100');
      const isWeapon = bannerId.startsWith('101') || bannerId.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);
      
      const pos = idMatch.index;
      const forward = html.substring(pos, pos + 3000);
      
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';
      
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const bannerName = nameMatch ? nameMatch[1] : 'Unknown Banner';
      
      if (bannerName.toLowerCase().includes('standard')) continue;
      
      const type = poolType.includes('character') ? 'character' : 
                   (poolType.includes('weapon') ? 'weapon' : 
                   (isCharacter ? 'character' : 'weapon'));
      
      const slug = bannerName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const imageBase = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const imageExt = type === 'character' ? 'webp' : 'png';
      const image = `https://wuwatracker.com/_next/image?url=%2Fapi%2F${imageBase}%2Ffile%2F${slug}-portrait.${imageExt}&w=828&q=75`;
      
      banners.push({
        id: `${bannerId}_${type}`,
        bannerId,
        name: bannerName,
        type,
        image,
        game: 'wuwa'
      });
    }
    
    // Filter to most recent banners
    const characterBanners = banners.filter(b => b.type === 'character').sort((a, b) => b.bannerId.localeCompare(a.bannerId)).slice(0, 1);
    const weaponBanners = banners.filter(b => b.type === 'weapon').sort((a, b) => b.bannerId.localeCompare(a.bannerId)).slice(0, 1);
    const recentBanners = [...characterBanners, ...weaponBanners];
    
    console.log('[WuWa Banners API] Discovered', recentBanners.length, 'active banner(s):', 
      recentBanners.map(b => `${b.name} (${b.bannerId})`).join(', '));
    
    // Cache for 5 minutes (reduced from 1 hour for faster new banner detection)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(recentBanners);
  } catch (error) {
    console.error('[WuWa Banners API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch WuWa banners',
      message: error.message 
    });
  }
}
