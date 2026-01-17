/**
 * Banners API Endpoint (Vercel Backend)
 * GET: Returns live banner data for HSR, Genshin, and WuWa
 * This is the SINGLE SOURCE OF TRUTH for all banner data
 */

// =========================================================================
// CONFIGURATION - Easy to adjust these values
// =========================================================================
const CONFIG = {
  // How long to cache banner data (in hours)
  CACHE_HOURS: 1,
  
  // API timeout settings (in milliseconds)
  TIMEOUT_MS: 8000,      // Default timeout for all requests
  TIMEOUT_GENSHIN: 3000, // Faster timeout for Genshin checks
  TIMEOUT_WUWA: 5000,    // WuWa scraping timeout
  
  // Genshin banner discovery settings
  GENSHIN_CHAR_BASE: 93,    // Current character banner patch number
  GENSHIN_WEAPON_BASE: 92,  // Current weapon banner patch number
  GENSHIN_SEARCH_RANGE: 6,  // How many banner IDs ahead to check
  
  // API endpoints
  STARRAIL_API: 'https://starrailstation.com/api/v1',
  PAIMON_API: 'https://api.paimon.moe/wish',
  WUWA_TRACKER: 'https://wuwatracker.com/tracker/stats',
  STARRAIL_RES: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master'
};

const CACHE_DURATION = CONFIG.CACHE_HOURS * 60 * 60 * 1000;

// =========================================================================
// CACHE - Stores banner data temporarily to reduce API calls
// =========================================================================
let BANNER_CACHE = {
  data: null,
  timestamp: 0
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

// Fetch with automatic timeout (prevents requests from hanging forever)
async function fetchWithTimeout(url, timeoutMs = CONFIG.TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// =========================================================================
// HSR BANNER FETCHING
// =========================================================================
async function fetchHSRActiveBanners() {
  try {
    const nowTs = Date.now();
    // 1. Fetch HSR banner config from StarRailStation
    const configRes = await fetchWithTimeout(`${CONFIG.STARRAIL_API}/warp_config?_t=${nowTs}`);
    if (!configRes.ok) return [];
    const configData = await configRes.json();
    
    // 2. Filter Active Banners
    const currentSeconds = nowTs / 1000;
    const gachaList = configData.config?.banners || {};
    const activeCandidates = [];
    
    for (const [bid, bdata] of Object.entries(gachaList)) {
      if (bdata.start_time <= currentSeconds && currentSeconds <= bdata.end_time) {
        if (bdata.rateup) { 
          activeCandidates.push({ id: bid, charId: String(bdata.rateup) });
        }
      }
    }
    
    if (activeCandidates.length === 0) return [];
    
    // 3. Fetch metadata (character/weapon names and images)
    const [charRes, lcRes] = await Promise.all([
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/characters.json`),
      fetchWithTimeout(`${CONFIG.STARRAIL_RES}/index_new/en/light_cones.json`)
    ]);
    
    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};
    
    // 4. Map IDs to Names and Images
    const liveBanners = activeCandidates.map(b => {
      const charData = charMap[b.charId];
      const lcData = lcMap[b.charId];
      
      if (charData) {
        return {
          id: b.id,
          name: charData.name,
          type: "character",
          characterId: b.charId,
          image: `${CONFIG.STARRAIL_RES}/icon/character/${b.charId}.png`,
          game: 'hsr'
        };
      } else if (lcData) {
        return {
          id: b.id,
          name: lcData.name,
          type: "light_cone",
          characterId: b.charId,
          image: `${CONFIG.STARRAIL_RES}/image/light_cone_portrait/${b.charId}.png`,
          game: 'hsr'
        };
      } else {
        return {
          id: b.id,
          name: `Unknown (${b.charId})`,
          type: "unknown",
          characterId: b.charId,
          image: null,
          game: 'hsr'
        };
      }
    });
    
    console.log('[HSR] Found', liveBanners.length, 'active banners');
    return liveBanners;
  } catch (error) {
    console.error('[HSR] Fetch error:', error);
    return [];
  }
}

// =========================================================================
// GENSHIN BANNER FETCHING
// =========================================================================

// Helper: Extract banner name from pull history
function extractGenshinBannerName(pullList) {
  if (!pullList || pullList.length === 0) return 'Unknown Banner';
  
  const legendaries = pullList.filter(p => p.rarity === 5);
  if (legendaries.length === 0) return 'Unknown Banner';
  
  const names = [...new Set(legendaries.map(p => p.name))].filter(n => n && n !== 'Unknown');
  return names.length > 0 ? names.join(' / ') : 'Character Event Wish';
}

// Helper: Extract weapon banner names
function extractGenshinWeaponNames(pullList) {
  if (!pullList || pullList.length === 0) return null;
  
  const legendaryWeapons = pullList.filter(p => p.rarity === 5 && p.type && p.type !== 'Character');
  if (legendaryWeapons.length === 0) return null;
  
  const weaponNames = [...new Set(legendaryWeapons.map(p => p.name))].filter(n => n && n !== 'Unknown');
  return weaponNames.length > 0 ? weaponNames.join(' / ') : null;
}

async function fetchActiveGenshinBanners() {
  const banners = [];
  
  // Use config values for banner discovery
  const charBase = CONFIG.GENSHIN_CHAR_BASE;
  const weaponBase = CONFIG.GENSHIN_WEAPON_BASE;
  
  const findBanners = async (base, prefix, type) => {
    const checks = [];
    // Check current and future IDs
    for (let i = base; i < base + CONFIG.GENSHIN_SEARCH_RANGE; i++) {
      const bannerId = `${prefix}${i.toString().padStart(3, '0')}`;
      
      // Skip 300093 (Ineffa) - shares data with 300094 (Columbina/Ineffa dual banner)
      if (bannerId === '300093') continue;
      
      checks.push((async () => {
        try {
          const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
          if (res.ok) {
            const data = await res.json();
            // Filter by pull count to ensure it's a "known" banner
            if (data.total && data.total.legendary > 300) {
              let name;
              if (type === 'weapon') {
                name = extractGenshinWeaponNames(data.list) || "Epitome Invocation";
              } else {
                name = extractGenshinBannerName(data.list);
              }
              
              // Generate image URL (Paimon.moe pattern)
              const imageName = name.toLowerCase().replace(/ /g, '_').replace(/\//g, '_');
              const imageUrl = type === 'weapon' 
                ? `https://paimon.moe/images/weapons/${imageName}.png`
                : `https://paimon.moe/images/characters/${imageName}.png`;
              
              return { 
                id: bannerId, 
                name: name || 'Unknown', 
                type: type,
                image: imageUrl,
                game: 'genshin'
              };
            }
          }
        } catch (e) {
          console.error(`[Genshin] Error checking ${bannerId}:`, e.message);
        }
        return null;
      })());
    }
    const results = (await Promise.all(checks)).filter(b => b !== null);
    // For weapons, only keep THE LATEST one (highest ID) to avoid duplicates
    if (type === 'weapon' && results.length > 1) {
      return [results.sort((a,b) => parseInt(b.id) - parseInt(a.id))[0]];
    }
    return results;
  };
  
  const [chars, weapons] = await Promise.all([
    findBanners(charBase, '300', 'character'),
    findBanners(weaponBase, '400', 'weapon')
  ]);
  
  const all = [...chars, ...weapons];
  all.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  
  console.log('[Genshin] Found', all.length, 'active banners');
  return all;
}

// =========================================================================
// WUWA BANNER FETCHING (HTML Scraping)
// =========================================================================
async function fetchWuWaLiveBanners() {
  try {
    const res = await fetchWithTimeout(CONFIG.WUWA_TRACKER, CONFIG.TIMEOUT_WUWA);
    if (!res.ok) return [];
    const html = await res.text();
    
    // Regex to scrape banner names and IDs from escaped JSON in script tags
    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    const banners = [];
    let idMatch;
    const seen = new Set();
    
    while ((idMatch = idPattern.exec(html)) !== null) {
      const id = idMatch[1];
      
      // Strictly filter for WuWa ID ranges
      // 100xxx: Resonators, 101xxx/200xxx: Weapons
      const isCharacter = id.startsWith('100');
      const isWeapon = id.startsWith('101') || id.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      
      const pos = idMatch.index;
      
      // Search forward for the name and type field
      const forward = html.substring(pos, pos + 3000);
      
      // Extract Pool Type (e.g. Featured Character, Featured Weapon)
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';
      
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      let name = nameMatch ? nameMatch[1] : 'Unknown Banner';
      
      if (seen.has(id)) continue;
      seen.add(id);
      
      // Skip standard banner
      if (name.toLowerCase().includes('standard')) continue;
      
      // Categorize by pool type or ID prefix fallback
      const finalType = poolType.includes('character') ? 'character' : 
                       (poolType.includes('weapon') ? 'weapon' : 
                       (id.startsWith('100') ? 'character' : 'weapon'));
      
      // Generate image URL based on WuWa Tracker pattern
      const nameSlug = name.toLowerCase().replace(/ /g, '-');
      const imageUrl = finalType === 'character'
        ? `https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2F${nameSlug}-portrait.webp&w=828&q=75`
        : `https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2F${nameSlug}-portrait.png&w=828&q=75`;
      
      banners.push({ 
        id, 
        name, 
        type: finalType,
        image: imageUrl,
        game: 'wuwa'
      });
    }
    
    console.log('[WuWa] Total scraped:', banners.length);
    
    // Return ONLY the most recent banner of each type (1 character + 1 weapon)
    const charBanners = banners.filter(b => b.type === 'character')
      .sort((a,b) => parseInt(b.id) - parseInt(a.id))
      .slice(0, 1);
    
    const weaponBanners = banners.filter(b => b.type === 'weapon')
      .sort((a,b) => parseInt(b.id) - parseInt(a.id))
      .slice(0, 1);
    
    const result = [...charBanners, ...weaponBanners];
    console.log('[WuWa] Returning', result.length, 'active banners');
    return result;
  } catch (error) {
    console.error('[WuWa] Fetch error:', error);
    return [];
  }
}

// =========================================================================
// MAIN HANDLER
// =========================================================================
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check cache
    if (BANNER_CACHE.data && (Date.now() - BANNER_CACHE.timestamp < CACHE_DURATION)) {
      console.log('[Banners API] Returning cached data');
      res.setHeader('X-Cache-Status', 'HIT');
      return res.status(200).json(BANNER_CACHE.data);
    }
    
    console.log('[Banners API] Fetching fresh data from all sources...');
    
    // Fetch all banner data in parallel
    const [hsr, genshin, wuwa] = await Promise.all([
      fetchHSRActiveBanners(),
      fetchActiveGenshinBanners(),
      fetchWuWaLiveBanners()
    ]);
    
    const response = {
      hsr,
      genshin,
      wuwa,
      lastUpdate: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + CACHE_DURATION).toISOString()
    };
    
    // Update cache
    BANNER_CACHE = {
      data: response,
      timestamp: Date.now()
    };
    
    console.log(`[Banners API] Success! HSR:${hsr.length} Genshin:${genshin.length} WuWa:${wuwa.length}`);
    
    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[Banners API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch banner data',
      message: error.message 
    });
  }
}
