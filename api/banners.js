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
  standard: ['tighnari', 'dehya', 'diluc', 'jean', 'keqing', 'mona', 'qiqi', 'ororon', 'lanyan']
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
          image: `${CONFIG.STARRAIL_RES}/icon/light_cone/${b.charId}.png`,
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
  try {
    const res = await fetchWithTimeout(`${CONFIG.WUWA_TRACKER}`, 5000);
    if (!res.ok) throw new Error('Failed to fetch WuWa tracker');
    const html = await res.text();
    
    // 1. Identify all 100xxx and 200xxx IDs first
    const idPattern = /[\\"]+bannerId[\\"]+:\s*(\d{6})/g;
    const banners = [];
    const seen = new Set();
    let match;
    
    while ((match = idPattern.exec(html)) !== null) {
      const id = match[1];
      if (seen.has(id)) continue;
      seen.add(id);
      
      const isCharacter = id.startsWith('100');
      const isWeapon = id.startsWith('101') || id.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      
      const pos = match.index;
      const context = html.substring(pos, pos + 5000);
      
      // Extraction Strategy:
      // A) Find "5stars": [...] block
      // B) Inside that, find "name":"The Real Name"
      const rateUpBlock = context.match(/[\\"]+5stars[\\"]+:\s*\[([\s\S]*?)\]/);
      let name = null;
      if (rateUpBlock) {
        const nameMatch = rateUpBlock[1].match(/[\\"]+name[\\"]+:\s*[\\"]+([^\\"]+)[\\"]+/);
        if (nameMatch) name = nameMatch[1];
      }
      
      // Fallback to top-level name if 5-stars lookup fails or is generic
      if (!name || name.includes("Featured") || name.includes("Convene")) {
        const topNameMatch = context.match(/[\\"]+name[\\"]+:\s*[\\"]+([^\\"]+)[\\"]+/);
        name = topNameMatch ? topNameMatch[1] : `Banner ${id}`;
      }

      if (name.toLowerCase().includes('standard')) continue;
      
      const type = isCharacter ? 'character' : 'weapon';
      const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ext = 'png'; // Use PNG for improved compatibility with newer units
      const imgPath = isCharacter ? 'character-portraits' : 'weapon-portraits';
      const fileName = isCharacter ? `${nameSlug}-portrait.${ext}` : `${nameSlug}.${ext}`;
      
      banners.push({
        id,
        name,
        type,
        image: `https://wuwatracker.com/_next/image?url=%2Fapi%2F${imgPath}%2Ffile%2F${fileName}&w=828&q=75`,
        game: 'wuwa'
      });
    }

    // 2. ULTRA-ROBUST EMERGENCY FALLBACK (For Aemeath/Patch transitions)
    // If we only found historical banners, check if the SEO description mentions the new one
    if (!banners.some(b => b.id === '100032') && html.includes('Aemeath')) {
       banners.push({
         id: '100032',
         name: 'Aemeath',
         type: 'character',
         image: `https://wuwatracker.com/_next/image?url=%2Fapi%2Fcharacter-portraits%2Ffile%2Faemeath-portrait.png&w=828&q=75`,
         game: 'wuwa'
       });
    }
    if (!banners.some(b => b.id === '200032') && html.includes('Everbright Polestar')) {
       banners.push({
         id: '200032',
         name: 'Everbright Polestar',
         type: 'weapon',
         image: `https://wuwatracker.com/_next/image?url=%2Fapi%2Fweapon-portraits%2Ffile%2Feverbright-polestar.png&w=828&q=75`,
         game: 'wuwa'
       });
    }
    
    // Sort to get latest of each type
    const latestChar = banners.filter(b => b.type === 'character').sort((a,b) => b.id.localeCompare(a.id))[0];
    const latestWeapon = banners.filter(b => b.type === 'weapon').sort((a,b) => b.id.localeCompare(a.id))[0];
    
    const results = [];
    if (latestChar) results.push(latestChar);
    if (latestWeapon) results.push(latestWeapon);
    
    console.log(`[WuWa] Scraped: ${results.map(r => r.name).join(', ')}`);
    return results;
  } catch (error) {
    console.error('[WuWa Discovery] Error:', error);
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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[Banners API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch banner data',
      message: error.message 
    });
  }
}
