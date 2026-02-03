// =========================================================================
// 🎮 GENSHIN CONTROL CENTER - Edit this for new characters!
// =========================================================================
const GENSHIN_CONFIG = {
  // 1. Current Active Banner IDs (Check Paimon.moe/wish/tally)
  active: {
    charBannerId: "300095",
    weaponBannerId: "400094",
    // If you want to FORCE a specific name/image, set these. Otherwise leave null.
    forceName: "Zibai / Neuvillette", 
    forceWeaponName: "Lightbearing Moonshard / Tome of the Eternal Flow",
    forceImage: "https://paimon.moe/images/characters/zibai.png",
  },

  // 2. Character Whitelist (Add new 5-stars here - LOWERCASE ONLY)
  characters: [
    'albedo', 'alhaitham', 'arataki_itto', 'arlecchino', 'ayaka', 'ayato',
    'baizhu', 'chasca', 'chiori', 'clorinde', 'columbina', 'cyno', 'emilie', 
    'furina', 'ganyu', 'hu_tao', 'iansan', 'ineffa', 'kazuha', 'klee',
    'kokomi', 'lyney', 'mavuika', 'mualani', 'nahida', 'navia', 'neuvillette',
    'nilou', 'raiden_shogun', 'shenhe', 'sigewinne', 'tartaglia', 'traveler', 
    'venti', 'wanderer', 'wriothesley', 'xiao', 'xianyun', 'yae_miko', 'yelan', 
    'yoimiya', 'zhongli', 'zibai'
  ],

  // 3. Weapon Whitelist (Add new 5-star weapons here - LOWERCASE ONLY)
  weapons: [
    'absolution', 'aqua_simulacra', 'amos_bow', 'beacon_of_the_reed_sea', 
    'calamity_queller', 'cashflow_supervision', 'cranes_echoing_call', 
    'crimson_moons_semblance', 'elegy_for_the_end', 'engulfing_lightning', 
    'everlasting_moonglow', 'fang_of_the_mountain_king', 'fractured_halo',
    'freedom_sworn', 'haran_geppaku_futsu', 'hunters_path', 'kaguras_verity', 
    'light_of_foliar_incision', 'lost_prayer', 'lumidouce_elegy', 
    'mistsplitter_reforged', 'nocturnes_curtain_call', 'polar_star', 
    'primordial_jade_cutter', 'primordial_jade_winged_spear', 'redhorn_stonethresher',
    'splendor_of_tranquil_waters', 'staff_of_homa', 'thundering_pulse',
    'tome_of_the_eternal_flow', 'tulaytullahs_remembrance', 'uraku_misugiri',
    'vortex_vanquisher', 'wolfs_gravestone', 'lightbearing_moonshard'
  ],

  // Standard characters that should NEVER be the banner name
  standard: ['tighnari', 'dehya', 'diluc', 'jean', 'keqing', 'mona', 'qiqi']
};

const CONFIG = {
  CACHE_HOURS: 0.016, // ~1 minute cache
  TIMEOUT_MS: 8000,
  TIMEOUT_GENSHIN: 3000,
  TIMEOUT_WUWA: 5000,
  
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
  
  // NEW: Exclude standard pool characters from being the "Banner Name"
  const candidates = pullList.filter(p => 
    p.type === 'character' && 
    GENSHIN_CONFIG.characters.includes(p.name.toLowerCase()) &&
    !GENSHIN_CONFIG.standard.includes(p.name.toLowerCase())
  );
  
  if (candidates.length === 0) return 'Character Event Wish';
  
  // Featured 5-stars have HIGHEST counts
  const fiveStarChars = candidates
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
  
  // Capitalize names
  const formatted = fiveStarChars.map(name => 
    name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );
  
  return formatted.join(' / ');
}

// Helper: Extract weapon banner names
function extractGenshinWeaponNames(pullList) {
  if (!pullList || pullList.length === 0) return null;
  
  const candidates = pullList.filter(p => 
    p.type === 'weapon' && 
    GENSHIN_CONFIG.weapons.includes(p.name.toLowerCase())
  );
  
  if (candidates.length === 0) return 'Epitome Invocation';
  
  const fiveStarWeapons = candidates
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(p => p.name);
  
  const formatted = fiveStarWeapons.map(name => 
    name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );
  
  return formatted.join(' / ');
}

async function fetchActiveGenshinBanners() {
  const manualBanners = [];
  
  // PRIORITY 1: Force names from config
  if (GENSHIN_CONFIG.active.forceName || GENSHIN_CONFIG.active.forceWeaponName) {
     if (GENSHIN_CONFIG.active.charBannerId) {
       manualBanners.push({
         id: GENSHIN_CONFIG.active.charBannerId,
         name: GENSHIN_CONFIG.active.forceName || "Character Event Wish",
         type: 'character',
         image: GENSHIN_CONFIG.active.forceImage || `https://paimon.moe/images/characters/${(GENSHIN_CONFIG.active.forceName || "").split(' / ')[0].toLowerCase().replace(/ /g, '_')}.png`,
         game: 'genshin'
       });
     }
     if (GENSHIN_CONFIG.active.weaponBannerId) {
       manualBanners.push({
         id: GENSHIN_CONFIG.active.weaponBannerId,
         name: GENSHIN_CONFIG.active.forceWeaponName || "Epitome Invocation",
         type: 'weapon',
         image: `https://paimon.moe/images/banners/Epitome%20Invocation%20${GENSHIN_CONFIG.active.weaponBannerId.slice(-2)}.png`,
         game: 'genshin'
       });
     }
     return manualBanners;
  }

  // PRIORITY 2: Auto-Discovery with Whitelist
  console.log('[Genshin] Attempting auto-discovery...');
  
  const findBanners = async (startId, prefix, type) => {
    const banners = [];
    for (let i = startId; i >= startId - 10 && i >= 0; i--) {
      const bannerId = `${prefix}${String(i).padStart(3, '0')}`;
      try {
        const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, CONFIG.TIMEOUT_GENSHIN);
        if (res.ok) {
          const data = await res.json();
          if (data.total && data.total.legendary > 5000) { // Lowered threshold for new banners
            let name = (type === 'weapon') ? extractGenshinWeaponNames(data.list) : extractGenshinBannerName(data.list);
            const firstName = (name || "").split(' / ')[0].toLowerCase().replace(/ /g, '_');
            const imageUrl = type === 'weapon'
              ? `https://paimon.moe/images/banners/Epitome%20Invocation%20${bannerId.slice(-2)}.png`
              : `https://paimon.moe/images/characters/${firstName}.png`;
            
            banners.push({ id: bannerId, name, type, image: imageUrl, game: 'genshin' });
            break; 
          }
        }
      } catch (e) {}
    }
    return banners;
  };

  const [chars, weapons] = await Promise.all([
    findBanners(110, '300', 'character'),
    findBanners(110, '400', 'weapon')
  ]);
  
  return [...chars, ...weapons];
}

// =========================================================================
// WUWA BANNER FETCHING (HTML Scraping)
// =========================================================================
async function fetchWuWaLiveBanners() {
  // 1. Base Configuration (Manual Fallback)
  // Update these IDs when new WuWa patch releases if auto-discovery fails
  let currentBanners = [
    { 
      id: '100031',  // Mornye
      name: 'Mornye', 
      type: 'character',
      image: 'https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Fmornye-portrait.webp&w=828&q=75',
      game: 'wuwa'
    },
    { 
      id: '200031',  // Starfield Calibrator
      name: 'Starfield Calibrator',
      type: 'weapon',
      image: 'https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Fstarfield-calibrator-portrait.png&w=828&q=75',
      game: 'wuwa'
    }
  ];

  // 2. Auto-Discovery: Probe for next ID (Future Proofing)
  // Logic: Check ID+1. If 200 OK, parse Name/Image and replace Manual Config.
  const discoveredBanners = await Promise.all(currentBanners.map(async (banner) => {
    try {
      const nextId = (parseInt(banner.id) + 1).toString();
      const probeUrl = `https://wuwatracker.com/tracker/stats/${nextId}`;
      
      // Fast check with short timeout
      const res = await fetchWithTimeout(probeUrl, 3000); // 3s timeout for probe
      
      if (res.status === 200) {
        const html = await res.text();
        const titleMatch = html.match(/<title>(.*?) ·/);
        
        if (titleMatch && titleMatch[1]) {
          const newName = titleMatch[1].trim();
          console.log(`[WuWa Auto-Discovery] FOUND NEW BANNER! ${banner.name} (${banner.id}) -> ${newName} (${nextId})`);
          
          // Generate new Image URL (slugify name)
          const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const ext = banner.type === 'character' ? 'webp' : 'png';
          const imgType = banner.type === 'character' ? 'character-portraits' : 'weapon-portraits';
          
          return {
            ...banner,
            id: nextId,
            name: newName,
            image: `https://wuwatracker.com/_next/image?url=%2Fapi%2F${imgType}%2Ffile%2F${slug}-portrait.${ext}&w=828&q=75`
          };
        }
      }
    } catch (e) {
      // Probe failed (likely 404 Not Found), stick to manual
      // console.log(`[WuWa Probe] No new banner for ${banner.name} (${e.message})`);
    }
    return banner; // Return original if probe fails
  }));

  return discoveredBanners;
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
