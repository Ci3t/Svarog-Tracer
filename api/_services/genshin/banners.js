/**
 * Genshin Banners API Endpoint
 * Discovers live Genshin banners from paimon.moe
 */

import { GENSHIN_BANNER_CONTROL } from './bannerControl.js';

const PAIMON_API = 'https://api.paimon.moe/wish';
const GENSHIN_CHAR_IMG_BASE = 'https://paimon.moe/images/characters/';
const GENSHIN_WEAPON_IMG_BASE = 'https://paimon.moe/images/weapons/';
const GENSHIN_BANNER_IMG_BASE = 'https://paimon.moe/images/banners/';

const MINOR_WORDS = new Set(['of', 'the', 'and', 'in', 'a', 'an']);

function toTitleCaseFromSlug(slug) {
  return slug
    .split('_')
    .map((word, idx) =>
      (idx > 0 && MINOR_WORDS.has(word.toLowerCase()))
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function toPaimonSlug(name) {
  return (name || '')
    .toLowerCase()
    .split(' / ')[0]
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function extractFeaturedCharacterSlugs(list) {
  if (!list || list.length === 0) return [];

  const standard = ['diluc', 'jean', 'keqing', 'mona', 'qiqi', 'tighnari', 'dehya', 'ororon', 'lan_yan'];
  const fourStarBlocklist = [
    'fischl', 'bennett', 'xiangling', 'xingqiu', 'barbara', 'noelle', 'sucrose', 'diona', 'chongyun', 'razor',
    'beidou', 'ningguang', 'yanfei', 'rosaria', 'xinyan', 'sayu', 'kujou_sara', 'thoma', 'gorou', 'yun_jin',
    'kuki_shinobu', 'heizou', 'collei', 'dori', 'candace', 'layla', 'faruzan', 'yaoyao', 'mika', 'kaveh',
    'kirara', 'lynette', 'freminet', 'charlotte', 'gaming', 'chevreuse', 'sethos', 'kachina', 'aino'
  ];

  return list
    .filter(item => {
      if (item.type !== 'character') return false;
      const name = item.name.toLowerCase();
      if (standard.includes(name)) return false;
      if (fourStarBlocklist.includes(name)) return false;
      return item.count >= 300 && item.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);
}

function extractFeaturedWeaponSlugs(list) {
  if (!list || list.length === 0) return [];

  const standardWeapons = [
    'amos_bow', 'skyward_harp', 'skyward_atlas', 'lost_prayer_to_the_sacred_winds',
    'primordial_jade_winged_spear', 'skyward_spine', 'wolfs_gravestone', 'skyward_pride',
    'skyward_blade', 'aquila_favonia'
  ];

  const weapon4StarBlocklist = [
    'mitternachts_waltz', 'mountain-bracing_bolt', 'winters_vigil', 'lithic_blade',
    'lithic_spear', 'wavebreakers_fin', 'akuoumaru', 'mounns_moon', 'rust',
    'favonius_warbow', 'eye_of_perception', 'the_flute', 'the_bell'
  ];

  return list
    .filter(item => {
      if (item.type !== 'weapon') return false;
      const name = item.name.toLowerCase();
      if (standardWeapons.includes(name)) return false;
      if (weapon4StarBlocklist.includes(name)) return false;
      return item.count > 200 && item.count < 35000;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map(item => item.name);
}

function buildCharacterBannerPayload(bannerId, slugs, legendaryCount, source = 'auto') {
  if (!slugs.length) return null;

  return {
    id: `${bannerId}_character`,
    bannerId,
    name: slugs.map(toTitleCaseFromSlug).join(' / '),
    type: 'character',
    image: `${GENSHIN_CHAR_IMG_BASE}${slugs[0]}.png`,
    characterId: slugs[0],
    game: 'genshin',
    source,
    pullCount: legendaryCount
  };
}

function buildWeaponBannerPayload(bannerId, slugs, legendaryCount, source = 'auto') {
  const name = slugs.length ? slugs.map(toTitleCaseFromSlug).join(' / ') : 'Epitome Invocation';
  const image = slugs.length
    ? `${GENSHIN_WEAPON_IMG_BASE}${slugs[0]}.png`
    : `${GENSHIN_BANNER_IMG_BASE}Epitome%20Invocation%20${bannerId.slice(-2)}.png`;

  return {
    id: `${bannerId}_weapon`,
    bannerId,
    name,
    type: 'weapon',
    image,
    characterId: 'weapon_banner',
    game: 'genshin',
    source,
    pullCount: legendaryCount
  };
}

function applyManualOverride(banner, type) {
  if (type === 'character' && GENSHIN_BANNER_CONTROL.overrideCharacterName) {
    const forcedSlug = toPaimonSlug(GENSHIN_BANNER_CONTROL.overrideCharacterName);
    return {
      ...(banner || {
        id: `${GENSHIN_BANNER_CONTROL.characterBannerId}_character`,
        bannerId: GENSHIN_BANNER_CONTROL.characterBannerId,
        type: 'character',
        game: 'genshin',
        characterId: 'manual_character',
        source: 'manual-override'
      }),
      name: GENSHIN_BANNER_CONTROL.overrideCharacterName,
      image: GENSHIN_BANNER_CONTROL.overrideCharacterImage ||
        (forcedSlug ? `${GENSHIN_CHAR_IMG_BASE}${forcedSlug}.png` : banner?.image || null),
      source: 'manual-override'
    };
  }

  if (type === 'weapon' && GENSHIN_BANNER_CONTROL.overrideWeaponName) {
    const forcedSlug = toPaimonSlug(GENSHIN_BANNER_CONTROL.overrideWeaponName);
    return {
      ...(banner || {
        id: `${GENSHIN_BANNER_CONTROL.weaponBannerId}_weapon`,
        bannerId: GENSHIN_BANNER_CONTROL.weaponBannerId,
        type: 'weapon',
        game: 'genshin',
        characterId: 'manual_weapon',
        source: 'manual-override'
      }),
      name: GENSHIN_BANNER_CONTROL.overrideWeaponName,
      image: GENSHIN_BANNER_CONTROL.overrideWeaponImage ||
        (forcedSlug
          ? `${GENSHIN_WEAPON_IMG_BASE}${forcedSlug}.png`
          : banner?.image || `${GENSHIN_BANNER_IMG_BASE}Epitome%20Invocation%20${GENSHIN_BANNER_CONTROL.weaponBannerId.slice(-2)}.png`),
      source: 'manual-override'
    };
  }

  return banner;
}

async function discoverBannerNear(baseId, prefix, type) {
  const scanIds = [];
  for (let i = baseId + 2; i >= baseId - 8 && i >= 0; i--) {
    scanIds.push(`${prefix}${String(i).padStart(3, '0')}`);
  }

  for (const bannerId of scanIds) {
    try {
      const response = await fetch(`${PAIMON_API}?banner=${bannerId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0)'
        },
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) continue;

      const data = await response.json();
      const legendaryCount = data?.total?.legendary || 0;
      if (legendaryCount <= 1000) continue;

      if (type === 'character') {
        const slugs = extractFeaturedCharacterSlugs(data.list);
        const payload = buildCharacterBannerPayload(bannerId, slugs, legendaryCount, 'auto');
        if (payload) return payload;
      } else {
        const slugs = extractFeaturedWeaponSlugs(data.list);
        return buildWeaponBannerPayload(bannerId, slugs, legendaryCount, 'auto');
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchBannerByExactId(bannerId, type) {
  if (!bannerId) return null;

  try {
    const response = await fetch(`${PAIMON_API}?banner=${bannerId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0)'
      },
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) return null;

    const data = await response.json();
    const legendaryCount = data?.total?.legendary || 0;
    if (legendaryCount < 200) return null;

    if (type === 'character') {
      const slugs = extractFeaturedCharacterSlugs(data.list);
      return buildCharacterBannerPayload(bannerId, slugs, legendaryCount, 'manual-id');
    }

    const slugs = extractFeaturedWeaponSlugs(data.list);
    return buildWeaponBannerPayload(bannerId, slugs, legendaryCount, 'manual-id');
  } catch {
    return null;
  }
}

export async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    console.log('[Genshin Banners API] Auto-discovering current banners...');

    const currentCharBase = parseInt(GENSHIN_BANNER_CONTROL.characterBannerId.slice(-3), 10);
    const currentWeaponBase = parseInt(GENSHIN_BANNER_CONTROL.weaponBannerId.slice(-3), 10);

    let [characterBanner, weaponBanner] = await Promise.all([
      discoverBannerNear(currentCharBase, '300', 'character'),
      discoverBannerNear(currentWeaponBase, '400', 'weapon')
    ]);

    if (!characterBanner) {
      characterBanner = await fetchBannerByExactId(GENSHIN_BANNER_CONTROL.characterBannerId, 'character');
    }
    if (!weaponBanner) {
      weaponBanner = await fetchBannerByExactId(GENSHIN_BANNER_CONTROL.weaponBannerId, 'weapon');
    }

    characterBanner = applyManualOverride(characterBanner, 'character');
    weaponBanner = applyManualOverride(weaponBanner, 'weapon');

    const allBanners = [characterBanner, weaponBanner].filter(Boolean);
    allBanners.sort((a, b) => parseInt(b.bannerId, 10) - parseInt(a.bannerId, 10));

    console.log(
      '[Genshin Banners API] Discovered',
      allBanners.length,
      'active banner(s):',
      allBanners.map(b => `${b.name} (${b.bannerId})`).join(', ')
    );

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(allBanners);
  } catch (error) {
    console.error('[Genshin Banners API] Fatal Error:', error);
    return res.status(500).json({ error: 'Failed to discover Genshin banners', message: error.message });
  }
}
