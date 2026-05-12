/**
 * HSR Banners API Endpoint
 * Discovers live HSR banners from starrailstation.com
 * Images: Our Cloudinary assets primary, StarRailRes fallback
 */

import { resolveHsrCharacterImage, resolveHsrLightConeImage } from '../../utils/gameAssetResolver.js';

const HSR_FETCH_TIMEOUT_MS = 10000;
const env = globalThis.process?.env || {};
const FORCE_BANNER_FALLBACK = env.BANNER_FORCE_FALLBACK === 'true';
const HSR_ASSET_CDN_BASE = 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master';
const HSR_ASSET_RAW_BASE = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';
const MAX_HSR_CHARACTER_BANNERS = 4;
const MAX_HSR_LIGHT_CONE_BANNERS = 4;

function limitHsrBannersForResponse(banners) {
  const score = (banner) => Number.parseInt(String(banner?.bannerId || banner?.id || '0'), 10) || 0;
  const byNewest = (a, b) => score(b) - score(a);
  const characters = banners
    .filter((banner) => banner.type === 'character')
    .sort(byNewest)
    .slice(0, MAX_HSR_CHARACTER_BANNERS);
  const lightCones = banners
    .filter((banner) => banner.type === 'light_cone')
    .sort(byNewest)
    .slice(0, MAX_HSR_LIGHT_CONE_BANNERS);
  return [...characters, ...lightCones];
}

function buildHsrFallbackBanners() {
  const characterIcon = (id) =>
    `${HSR_ASSET_CDN_BASE}/icon/character/${id}.png`;
  const characterPortrait = (id) =>
    resolveHsrCharacterImage(id, `${HSR_ASSET_RAW_BASE}/image/character_portrait/${id}.png`);
  const characterAltPortrait = (id) =>
    `${HSR_ASSET_CDN_BASE}/image/character_portrait/${id}.png`;
  const characterPreview = (id) =>
    `${HSR_ASSET_CDN_BASE}/image/character_preview/${id}.png`;
  const lightConePortrait = (id) =>
    resolveHsrLightConeImage(id, `${HSR_ASSET_CDN_BASE}/image/light_cone_preview/${id}.png`);

  return limitHsrBannersForResponse([
    {
      id: '2116_character',
      bannerId: '2116',
      name: 'Silver Wolf LV.999',
      image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
      portrait: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
      type: 'character',
      characterId: '1006',
      rarity: 5,
      element: 'quantum',
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '2117_character',
      bannerId: '2117',
      name: 'The Dahlia',
      image: characterIcon('1321'),
      portrait: characterPortrait('1321'),
      altPortrait: characterAltPortrait('1321'),
      preview: characterPreview('1321'),
      type: 'character',
      characterId: '1321',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '2118_character',
      bannerId: '2118',
      name: 'Firefly',
      image: characterIcon('1310'),
      portrait: characterPortrait('1310'),
      altPortrait: characterAltPortrait('1310'),
      preview: characterPreview('1310'),
      type: 'character',
      characterId: '1310',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '2119_character',
      bannerId: '2119',
      name: 'Castorice',
      image: characterIcon('1407'),
      portrait: characterPortrait('1407'),
      altPortrait: characterAltPortrait('1407'),
      preview: characterPreview('1407'),
      type: 'character',
      characterId: '1407',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '3116_light_cone',
      bannerId: '3116',
      name: 'Silver Wolf LV.999 Light Cone',
      image: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp',
      portrait: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp',
      type: 'light_cone',
      characterId: '23006',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '3117_light_cone',
      bannerId: '3117',
      name: 'Never Forget Her Flame',
      image: lightConePortrait('23050'),
      portrait: lightConePortrait('23050'),
      lcPreview: lightConePortrait('23050'),
      type: 'light_cone',
      characterId: '23050',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '3118_light_cone',
      bannerId: '3118',
      name: 'Whereabouts Should Dreams Rest',
      image: lightConePortrait('23025'),
      portrait: lightConePortrait('23025'),
      lcPreview: lightConePortrait('23025'),
      type: 'light_cone',
      characterId: '23025',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
    {
      id: '3119_light_cone',
      bannerId: '3119',
      name: 'Make Farewells More Beautiful',
      image: lightConePortrait('23040'),
      portrait: lightConePortrait('23040'),
      lcPreview: lightConePortrait('23040'),
      type: 'light_cone',
      characterId: '23040',
      rarity: 5,
      game: 'hsr',
      source: 'controlled-fallback',
    },
  ]);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = HSR_FETCH_TIMEOUT_MS) {
  try {
    const response = await fetch(url, { 
      ...options, 
      signal: AbortSignal.timeout(timeoutMs) 
    });
    return response;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw error;
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

  if (FORCE_BANNER_FALLBACK) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(buildHsrFallbackBanners());
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
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
      return res.status(200).json(buildHsrFallbackBanners());
    }

    console.log(`[HSR Banners API] Found ${dedupedCandidates.length} active banner candidate(s)`);
    
    const HSR_TEMP_CHARACTER_FALLBACK = {
      name: 'Silver Wolf LV.999',
      image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
      portrait: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp',
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
        const fallbackImage = `${HSR_ASSET_CDN_BASE}/${char.icon}`;
        const fallbackPortrait = `${HSR_ASSET_RAW_BASE}/image/character_portrait/${charId}.png`;
        const fallbackAltPortrait = `${HSR_ASSET_CDN_BASE}/image/character_portrait/${charId}.png`;
        const fallbackPreview = `${HSR_ASSET_CDN_BASE}/image/character_preview/${charId}.png`;
        return {
          id: `${banner.bannerId}_character`,
          bannerId: banner.bannerId,
          name: char.name,
          type: 'character',
          image: fallbackImage,
          fallbackImage,
          portrait: resolveHsrCharacterImage(charId, fallbackPortrait),
          altPortrait: fallbackAltPortrait,
          preview: fallbackPreview,
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
        const fallbackImage = `${HSR_ASSET_CDN_BASE}/${lc.icon}`;
        const fallbackPortrait = `${HSR_ASSET_CDN_BASE}/image/light_cone_preview/${charId}.png`;
        return {
          id: `${banner.bannerId}_light_cone`,
          bannerId: banner.bannerId,
          name: lc.name,
          type: 'light_cone',
          image: resolveHsrLightConeImage(charId, fallbackPortrait),
          fallbackImage,
          portrait: resolveHsrLightConeImage(charId, fallbackPortrait),
          lcPreview: `${HSR_ASSET_CDN_BASE}/image/light_cone_preview/${charId}.png`,
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
        portrait: HSR_TEMP_CHARACTER_FALLBACK.portrait,
        type: HSR_TEMP_CHARACTER_FALLBACK.type,
      };
    } else if (
      knownCharacterNames.has('Firefly') &&
      knownCharacterNames.has('Castorice') &&
      (knownCharacterNames.has('The Dahlia') || knownCharacterNames.has('Dahlia'))
    ) {
      const unknownIndex = banners.findIndex((banner) => banner.type === 'unknown');
      if (unknownIndex !== -1) {
        banners[unknownIndex] = {
          ...banners[unknownIndex],
          name: HSR_TEMP_CHARACTER_FALLBACK.name,
          image: HSR_TEMP_CHARACTER_FALLBACK.image,
          portrait: HSR_TEMP_CHARACTER_FALLBACK.portrait,
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
    
    const responseBanners = limitHsrBannersForResponse(banners);

    console.log('[HSR Banners API] Returning banners:', responseBanners.map(b => b.name).join(', '));
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
    
    return res.status(200).json(responseBanners);
  } catch (error) {
    console.error('[HSR Banners API] Error:', error);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json(buildHsrFallbackBanners());
  }
}
