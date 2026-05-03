/**
 * HSR Banners API Endpoint
 * Discovers live HSR banners from starrailstation.com
 * Images: Our Cloudinary assets primary, StarRailRes fallback
 */

import { resolveHsrCharacterImage, resolveHsrLightConeImage } from '../../utils/gameAssetResolver.js';

const HSR_FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}, timeoutMs = HSR_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    const configRes = await fetchWithTimeout(configUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!configRes.ok) {
      throw new Error(`Config fetch failed: HTTP ${configRes.status}`);
    }
    
    const configData = await configRes.json();
    // 3. Fetch character and light cone metadata from StarRailRes
    const [charRes, lcRes] = await Promise.all([
      fetchWithTimeout('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json'),
      fetchWithTimeout('https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json')
    ]);
    
    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};

    const gachaList = configData.config?.banners || {};

    const FEATURED_KEY_RE = /(rate.?up|featured|up_?5|rateup_?5|rarity_?5|five.?star)/i;

    const parseFeaturedIds = (value, collected = []) => {
      if (value == null) return collected;
      if (Array.isArray(value)) {
        value.forEach(item => parseFeaturedIds(item, collected));
        return collected;
      }
      if (typeof value === 'object') {
        for (const [key, nested] of Object.entries(value)) {
          if (FEATURED_KEY_RE.test(key) || typeof nested === 'object') {
            parseFeaturedIds(nested, collected);
          }
        }
        return collected;
      }

      const stringValue = String(value).trim();
      if (/^\d+$/.test(stringValue)) {
        collected.push(stringValue);
      }
      return collected;
    };

    const extractFeaturedIds = (bannerData) => {
      const directCandidates = [
        bannerData?.rateup,
        bannerData?.rateup_5,
        bannerData?.rate_up,
        bannerData?.up_5,
        bannerData?.featured,
        bannerData?.featured_5,
        bannerData?.rarity_5,
        bannerData?.five_star,
      ];

      const collected = [];
      directCandidates.forEach(value => parseFeaturedIds(value, collected));

      if (collected.length === 0) {
        for (const [key, value] of Object.entries(bannerData || {})) {
          if (FEATURED_KEY_RE.test(key)) {
            parseFeaturedIds(value, collected);
          }
        }
      }

      const uniqueIds = [...new Set(collected)];
      const mappedFiveStars = uniqueIds.filter((id) => {
        const entry = charMap[id] || lcMap[id];
        return Number(entry?.rarity) === 5;
      });

      return mappedFiveStars.length > 0 ? mappedFiveStars : uniqueIds;
    };

    // 2. Filter for active banners (current timestamp within start/end time)
    const activeCandidates = [];
    for (const [bannerId, bannerData] of Object.entries(gachaList)) {
      if (!(bannerData.start_time <= currentSeconds && currentSeconds <= bannerData.end_time)) continue;

      const featuredIds = extractFeaturedIds(bannerData);
      for (const featuredId of featuredIds) {
        activeCandidates.push({
          bannerId,
          characterId: String(featuredId),
          startTime: bannerData.start_time,
          endTime: bannerData.end_time
        });
      }
    }

    const dedupedCandidates = activeCandidates.filter((candidate, index, array) =>
      array.findIndex(item => item.bannerId === candidate.bannerId && item.characterId === candidate.characterId) === index
    );

    if (dedupedCandidates.length === 0) {
      console.log('[HSR Banners API] No active banners found');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.status(200).json([]);
    }

    console.log(`[HSR Banners API] Found ${dedupedCandidates.length} active banner candidate(s)`);
    
    const HSR_TEMP_CHARACTER_FALLBACK = {
      name: 'Silver Wolf LV.999',
      image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
      type: 'character',
    };
    const HSR_TEMP_LIGHT_CONE_FALLBACK = {
      id: '3116_light_cone',
      bannerId: '3116',
      name: 'Silver Wolf LV.999 Light Cone',
      image: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp',
      type: 'light_cone',
      characterId: '23006',
      game: 'hsr',
    };

    // 4. Map banner IDs to character/LC names and images
    // Our Cloudinary assets are primary; fetched URLs are fallback
    const banners = dedupedCandidates.map(banner => {
      const charId = banner.characterId;
      
      // Check if it's a character
      if (charMap[charId]) {
        const char = charMap[charId];
        const fallbackImage = `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${char.icon}`;
        const fallbackPortrait = `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/character_portrait/${charId}`;
        return {
          id: `${banner.bannerId}_character`,
          bannerId: banner.bannerId,
          name: char.name,
          type: 'character',
          image: resolveHsrCharacterImage(charId, fallbackPortrait),
          fallbackImage,
          portrait: resolveHsrCharacterImage(charId, fallbackPortrait),
          characterId: charId,
          rarity: char.rarity || 5,
          element: char.element,
          game: 'hsr',
          startTime: banner.startTime,
          endTime: banner.endTime
        };
      }

      // Check if it's a light cone
      if (lcMap[charId]) {
        const lc = lcMap[charId];
        const fallbackImage = `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${lc.icon}`;
        const fallbackPortrait = `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/lightcone_preview/${charId}`;
        return {
          id: `${banner.bannerId}_light_cone`,
          bannerId: banner.bannerId,
          name: lc.name,
          type: 'light_cone',
          image: resolveHsrLightConeImage(charId, fallbackPortrait),
          fallbackImage,
          portrait: resolveHsrLightConeImage(charId, fallbackPortrait),
          lcPreview: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_preview/${charId}.png`,
          characterId: charId,
          rarity: lc.rarity || 5,
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

    const knownCharacterNames = new Set(
      banners.filter((banner) => banner.type === 'character').map((banner) => String(banner.name || '').trim())
    );
    const exactLv999Index = banners.findIndex((banner) => String(banner.bannerId) === '2116');
    if (exactLv999Index !== -1) {
      banners[exactLv999Index] = {
        ...banners[exactLv999Index],
        name: HSR_TEMP_CHARACTER_FALLBACK.name,
        image: HSR_TEMP_CHARACTER_FALLBACK.image,
        type: HSR_TEMP_CHARACTER_FALLBACK.type,
      };
    } else if (
      knownCharacterNames.has('Firefly') &&
      knownCharacterNames.has('Castorice') &&
      knownCharacterNames.has('Dahlia')
    ) {
      const unknownIndex = banners.findIndex((banner) => banner.type === 'unknown');
      if (unknownIndex !== -1) {
        banners[unknownIndex] = {
          ...banners[unknownIndex],
          name: HSR_TEMP_CHARACTER_FALLBACK.name,
          image: HSR_TEMP_CHARACTER_FALLBACK.image,
          type: HSR_TEMP_CHARACTER_FALLBACK.type,
        };
      }
    }

    const exactLv999LcIndex = banners.findIndex((banner) => String(banner.bannerId) === '3116');
    if (exactLv999LcIndex !== -1) {
      banners[exactLv999LcIndex] = {
        ...banners[exactLv999LcIndex],
        name: HSR_TEMP_LIGHT_CONE_FALLBACK.name,
        image: HSR_TEMP_LIGHT_CONE_FALLBACK.image,
        type: HSR_TEMP_LIGHT_CONE_FALLBACK.type,
      };
    } else if (exactLv999Index !== -1) {
      banners.push({
        ...HSR_TEMP_LIGHT_CONE_FALLBACK,
      });
    }
    
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
