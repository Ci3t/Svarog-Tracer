/**
 * Banners API Endpoint (Vercel Backend)
 * GET: Returns live banner data for HSR, Genshin, and WuWa
 * This is the SINGLE SOURCE OF TRUTH for all banner data
 */

// =========================================================================
// CONFIGURATION - Easy to adjust these values
// =========================================================================
const CONFIG = {
  // How long to cache banner data (in hours) - reduced for fresher data!
  CACHE_HOURS: 0.25,  // 15 minutes (was 1 hour)
  
  // API timeout settings (in milliseconds)
  TIMEOUT_MS: 8000,      // Default timeout for all requests
  TIMEOUT_GENSHIN: 3000, // Faster timeout for Genshin checks
  TIMEOUT_WUWA: 5000,    // WuWa scraping timeout
  
  // ========== GENSHIN MANUAL OVERRIDE (easy to edit!) ==========
  // Set these to empty arrays to use auto-discovery
  // OR manually specify banner IDs and names:
  GENSHIN_MANUAL: {
    characters: [
      { 
        bannerId: "300094", 
        name: "Columbina / Ineffa",
        image: "https://paimon.moe/images/characters/columbina.png"
      }
    ],
    weapons: [
      { 
        bannerId: "400093", 
        name: "Nocturne's Curtain Call / Fractured Halo",
        image: "https://paimon.moe/images/weapons/nocturnes_curtain_call.png"
      }
    ]
  },
  
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

// Known 5-star characters - ADD NEW ONES WHEN THEY RELEASE!
const GENSHIN_5STAR_CHARS = [
  'albedo', 'alhaitham', 'aloy', 'arataki_itto', 'arlecchino', 'ayaka', 'ayato',
  'baizhu', 'chasca', 'chiori', 'clorinde', 'columbina', 'cyno', 'dehya', 'diluc',
  'eula', 'emilie', 'furina', 'ganyu', 'hu_tao', 'iansan', 'ineffa', 'jean',
  'kaedehara_kazuha', 'kamisato_ayaka', 'kamisato_ayato', 'keqing', 'klee',
  'kokomi', 'lyney', 'mavuika', 'mona', 'mualani', 'nahida', 'navia', 'neuvillette',
  'nilou', 'qiqi', 'raiden_shogun', 'sangonomiya_kokomi', 'shenhe', 'sigewinne',
  'tartaglia', 'tighnari', 'traveler', 'venti', 'wanderer', 'wriothesley',
  'xiao', 'xianyun', 'yae_miko', 'yelan', 'yoimiya', 'zhongli'
];

// Known 5-star weapons - ADD NEW ONES WHEN THEY RELEASE!
const GENSHIN_5STAR_WEAPONS = [
  'a_thousand_floating_dreams', 'absolution', 'aqua_simulacra', 'amos_bow',
  'beacon_of_the_reed_sea', 'calamity_queller', 'cashflow_supervision',
  'cranes_echoing_call', 'crimson_moons_semblance', 'elegy_for_the_end',
  'engulfing_lightning', 'everlasting_moonglow', 'finale_of_the_deep',
  'fang_of_the_mountain_king', 'forbidden_curse', 'fractured_halo',
  'freedom_sworn', 'haran_geppaku_futsu', 'hunters_path',
  'kaguras_verity', 'key_of_khaj_nisut', 'light_of_foliar_incision',
  'lost_prayer', 'lumidouce_elegy', 'memory_of_dust', 'mistsplitter_reforged',
  'nocturnes_curtain_call', 'polar_star', 'primordial_jade_cutter',
  'primordial_jade_winged_spear', 'redhorn_stonethresher',
  'skyward_atlas', 'skyward_blade', 'skyward_harp', 'skyward_pride', 'skyward_spine',
  'song_of_stillness', 'splendor_of_tranquil_waters', 'staff_of_homa',
  'summit_shaper', 'the_first_great_magic', 'thundering_pulse',
  'tome_of_the_eternal_flow', 'tulaytullahs_remembrance', 'uraku_misugiri',
  'vortex_vanquisher', 'wolfs_gravestone'
  // REMOVED: 'waveriding_whirl' - this is 4-star!
];

// Helper: Extract banner name from pull history
function extractGenshinBannerName(pullList) {
  if (!pullList || pullList.length === 0) return 'Unknown Banner';
  
  // Double filter: whitelist + pull count (5-stars typically have <100K pulls)
  const fiveStarChars = pullList
    .filter(p => 
      p.type === 'character' && 
      GENSHIN_5STAR_CHARS.includes(p.name.toLowerCase()) &&
      p.count < 100000  // 5-stars have lower counts than 4-stars!
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
  
  if (fiveStarChars.length === 0) return 'Character Event Wish';
  
  // Capitalize names
  const formatted = fiveStarChars.map(name => 
    name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );
  
  return formatted.join(' / ');
}

// Helper: Extract weapon banner names
function extractGenshinWeaponNames(pullList) {
  if (!pullList || pullList.length === 0) return null;
  
  // Double filter: whitelist + pull count
  const fiveStarWeapons = pullList
    .filter(p => 
      p.type === 'weapon' && 
      GENSHIN_5STAR_WEAPONS.includes(p.name.toLowerCase()) &&
      p.count < 100000  // 5-stars have lower counts!
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
  
  if (fiveStarWeapons.length === 0) return 'Epitome Invocation';
  
  // Capitalize names
  const formatted = fiveStarWeapons.map(name => 
    name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );
  
  return formatted.join(' / ');
}

async function fetchActiveGenshinBanners() {
  // Try auto-discovery first, fall back to manual config if needed
  console.log('[Genshin] Attempting auto-discovery...');
  
  const findBanners = async (startId, prefix, type) => {
    const banners = [];
    
    // Search recent banner IDs (check last 10 IDs)
    for (let i = startId; i >= startId - 10 && i >= 0; i--) {
      const bannerId = `${prefix}${String(i).padStart(3, '0')}`;
      
      try {
        const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
        if (res.ok) {
          const data = await res.json();
          
          // Check if banner has enough data (at least 10,000 legendary pulls)
          if (data.total && data.total.legendary > 10000) {
            let name;
            if (type === 'weapon') {
              name = extractGenshinWeaponNames(data.list);
            } else {
              name = extractGenshinBannerName(data.list);
            }
            
            // Generate image URL (use first character/weapon name)
            const firstName = name.split(' / ')[0].toLowerCase().replace(/ /g, '_');
            const imageUrl = type === 'weapon'
              ? `https://paimon.moe/images/weapons/${firstName}.png`
              : `https://paimon.moe/images/characters/${firstName}.png`;
            
            banners.push({
              id: bannerId,
              name,
              type,
              image: imageUrl,
              game: 'genshin'
            });
            
            // Only return the MOST RECENT banner (highest ID with data)
            break;
          }
        }
      } catch (e) {
        console.error(`[Genshin] Error checking ${bannerId}:`, e.message);
      }
    }
    
    return banners;
  };
  
  // Search for current banners (start from high IDs and search backwards)
  const [chars, weapons] = await Promise.all([
    findBanners(100, '300', 'character'), // Start from 300100 and search back
    findBanners(100, '400', 'weapon')     // Start from 400100 and search back
  ]);
  
  const discovered = [...chars, ...weapons];
  
  // If auto-discovery found banners, use them
  if (discovered.length > 0) {
    console.log('[Genshin] Auto-discovered', discovered.length, 'banners');
    return discovered;
  }
  
  // Fallback to manual config
  console.log('[Genshin] Auto-discovery failed, using manual config fallback');
  const fallback = [];
  
  CONFIG.GENSHIN_MANUAL.characters.forEach(char => {
    fallback.push({
      id: char.bannerId,
      name: char.name,
      type: 'character',
      image: char.image,
      game: 'genshin'
    });
  });
  
  CONFIG.GENSHIN_MANUAL.weapons.forEach(weapon => {
    fallback.push({
      id: weapon.bannerId,
      name: weapon.name,
      type: 'weapon',
      image: weapon.image,
      game: 'genshin'
    });
  });
  
  return fallback;
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
