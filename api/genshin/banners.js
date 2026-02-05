/**
 * Genshin Banners API Endpoint
 * Discovers live Genshin banners from paimon.moe
 */

const OVERRIDE_MAP = {
  "300095": { name: "Zibai", type: "character", image: "https://paimon.moe/images/characters/zibai.png" },
  "300094": { name: "Neuvillette", type: "character", image: "https://paimon.moe/images/characters/neuvillette.png" },
  "400094": { name: "Lightbearing Moonshard / Tome of the Eternal Flow", type: "weapon", image: "https://paimon.moe/images/banners/Epitome%20Invocation%2094.png" }
};

const GENSHIN_CHAR_IMG_BASE = 'https://paimon.moe/images/characters/';
const GENSHIN_BANNER_IMG_BASE = 'https://paimon.moe/images/banners/';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    console.log('[Genshin Banners API] Auto-discovering current banners...');
    const banners = [];
    
    // DYNAMIC DISCOVERY - Probe recent ID ranges to auto-detect new banners
    // Character banners: 300xxx (probe current ±5)
    // Weapon banners: 400xxx (probe current ±5)
    const currentCharBase = 95; 
    const currentWeaponBase = 94;
    const probeRange = 2; // Look ahead only (avoid old banners)
    
    // Helper function to probe banner IDs
    const probeBanners = async (baseId, prefix, type) => {
      const discovered = [];
      const checks = [];
      
      // Probe range: base-2 to base+5 (to catch new releases)
      for (let i = baseId; i <= baseId + probeRange; i++) {
        const bannerId = `${prefix}${i.toString().padStart(3, '0')}`;
        
        // Skip 300093 (Ineffa) - shares data with 300094 (Columbina/Ineffa dual banner)
        if (bannerId === '300093') continue;
        
        checks.push((async () => {
          try {
            const response = await fetch(`https://api.paimon.moe/wish?banner=${bannerId}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            
            if (response.ok) {
              const data = await response.json();
              
              // Validate: Must have significant pull data (>300 legendary pulls)
              if (data.total && data.total.legendary > 300) {
                const override = OVERRIDE_MAP[bannerId];
                let name;
                let image;
                
                if (override) {
                  name = override.name;
                  image = override.image;
                } else if (type === 'character') {
                  name = extractGenshinBannerName(data.list);
                  image = `${GENSHIN_CHAR_IMG_BASE}${name.toLowerCase().replace(/\s+/g, '')}.png`;
                } else {
                  // Weapon banner
                  name = extractGenshinWeaponNames(data.list) || "Epitome Invocation";
                  const bannerNum = bannerId.slice(-2);
                  image = `${GENSHIN_BANNER_IMG_BASE}Epitome%20Invocation%20${bannerNum}.png`;
                }
                
                return {
                  id: `${bannerId}_${type}`,
                  bannerId,
                  name,
                  type: override?.type || type,
                  image,
                  characterId: type === 'character' ? name.toLowerCase().replace(/\s+/g, '_') : 'weapon_banner',
                  game: 'genshin',
                  pullCount: data.total.legendary // For sorting
                };
              }
            }
          } catch (e) {
            // Timeout or network error - skip this ID
          }
          return null;
        })());
      }
      
      const results = (await Promise.all(checks)).filter(b => b !== null);
      
      // For weapons, only keep the LATEST one (highest ID) to avoid duplicates
      if (type === 'weapon' && results.length > 1) {
        return [results.sort((a, b) => parseInt(b.bannerId) - parseInt(a.bannerId))[0]];
      }
      
      return results;
    };
    
    // Discover character and weapon banners in parallel
    const [characterBanners, weaponBanners] = await Promise.all([
      probeBanners(currentCharBase, '300', 'character'),
      probeBanners(currentWeaponBase, '400', 'weapon')
    ]);
    
    const allBanners = [...characterBanners, ...weaponBanners];
    
    // Sort by banner ID descending (newest first)
    allBanners.sort((a, b) => parseInt(b.bannerId) - parseInt(a.bannerId));
    
    console.log('[Genshin Banners API] Discovered', allBanners.length, 'active banner(s):', 
      allBanners.map(b => `${b.name} (${b.bannerId})`).join(', '));
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(allBanners);
    
  } catch (error) {
    console.error('[Genshin Banners API] Fatal Error:', error);
    return res.status(500).json({ error: 'Failed to discover Genshin banners', message: error.message });
  }
}

function extractGenshinBannerName(list) {
  if (!list || list.length === 0) return "Unknown";
  
  // Standard 5-star characters (permanent banner)
  const standard = ['Diluc', 'Jean', 'Keqing', 'Mona', 'Qiqi', 'Tighnari', 'Dehya'];
  
  // Comprehensive 4-star character blocklist (case-insensitive)
  const fourStarBlocklist = [
    // Original list
    'Fischl', 'Bennett', 'Xiangling', 'Xingqiu', 'Barbara', 'Noelle',
    // Extended list (all 4-stars)
    'Sucrose', 'Diona', 'Chongyun', 'Razor', 'Beidou', 'Ningguang',
    'Yanfei', 'Rosaria', 'Xinyan', 'Sayu', 'Kujou Sara', 'Thoma', 'Gorou',
    'Yun Jin', 'Kuki Shinobu', 'Heizou', 'Collei', 'Dori', 'Candace', 'Layla',
    'Faruzan', 'Yaoyao', 'Mika', 'Kaveh', 'Kirara', 'Lynette', 'Freminet',
    'Charlotte', 'Gaming', 'Chevreuse', 'Sethos', 'Kachina', 'Ororon', 'Lan Yan'
  ].map(n => n.toLowerCase());
  
  const characterCandidates = list.filter(item => {
    if (item.type !== 'character') return false;
    
    const nameLower = item.name.toLowerCase();
    
    // 1. Exclude standard 5-stars
    if (standard.some(s => s.toLowerCase() === nameLower)) return false;
    
    // 2. Exclude all known 4-stars
    if (fourStarBlocklist.includes(nameLower)) return false;
    
    // 3. Count Heuristic: 5-stars typically have 1,000-35,000 pulls
    // 4-stars usually have <1,000 or >35,000 (shared across many banners)
    return item.count >= 1000 && item.count < 35000;
  });
  
  // Sort by count descending (most relevant 5-star)
  characterCandidates.sort((a, b) => b.count - a.count);
  
  if (characterCandidates.length > 0) {
    return characterCandidates[0].name;
  }
  
  return "Featured Banner";
}

function extractGenshinWeaponNames(list) {
  if (!list || list.length === 0) return null;
  
  const standardWeapons = [
    'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
    'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
    'skyward_blade', 'aquila_favonia'
  ].map(n => n.toLowerCase());

  const weaponCandidates = list.filter(item => {
    if (item.type !== 'weapon') return false;
    const nameLower = item.name.toLowerCase();
    if (standardWeapons.includes(nameLower)) return false;
    
    // Exclude common 4-star weapons
    const weapon4StarBlocklist = [
      'mitternachts_waltz', 'mountain-bracing_bolt', 'winters_vigil', 'lithic_blade', 
      'lithic_spear', 'wavebreakers_fin', 'akuoumaru', 'mounns_moon', 'rust',
      'favonius_warbow', 'eye_of_perception', 'the_flute', 'the_bell'
    ];
    if (weapon4StarBlocklist.includes(nameLower)) return false;

    return item.count > 200 && item.count < 35000;
  });

  weaponCandidates.sort((a, b) => b.count - a.count);
  
  if (weaponCandidates.length > 0) {
    // Take top 2 weapons (dual featured)
    return weaponCandidates.slice(0, 2).map(item => 
      item.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    ).join(' / ');
  }
  
  return null;
}
