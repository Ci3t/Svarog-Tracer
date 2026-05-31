export function normalizeBannerType(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'weapon') return 'weapon';
  if (normalized === 'light_cone' || normalized === 'light-cone' || normalized === 'lightcone') return 'light_cone';
  if (normalized === 'character') return 'character';
  return normalized || 'character';
}

export function inferWarpBannerType({ game = 'hsr', bannerId = '', bannerType = '', dataType = '' } = {}) {
  const gameKey = String(game || '').trim().toLowerCase();
  const id = String(bannerId || '').trim();
  const explicitType = normalizeBannerType(bannerType || dataType);

  if (explicitType === 'weapon' || explicitType === 'light_cone' || explicitType === 'character') {
    return explicitType;
  }

  if (gameKey === 'genshin') return id.startsWith('400') ? 'weapon' : 'character';
  if (gameKey === 'wuwa') return id.startsWith('2') || id.startsWith('101') ? 'weapon' : 'character';
  if (gameKey === 'hsr') return id.startsWith('3') || id.startsWith('6') ? 'light_cone' : 'character';

  return 'character';
}

export function getWarpPityWindow({ game = 'hsr', bannerId = '', bannerType = '', dataType = '' } = {}) {
  const gameKey = String(game || '').trim().toLowerCase();
  const type = inferWarpBannerType({ game: gameKey, bannerId, bannerType, dataType });

  if (gameKey === 'wuwa') {
    return {
      bannerType: type,
      softPityStart: type === 'weapon' ? 63 : 70,
      softPityEnd: 80,
      hardPity: 80,
    };
  }

  if (gameKey === 'genshin') {
    return {
      bannerType: type,
      softPityStart: type === 'weapon' ? 63 : 75,
      softPityEnd: type === 'weapon' ? 80 : 90,
      hardPity: type === 'weapon' ? 80 : 90,
    };
  }

  return {
    bannerType: type,
    softPityStart: type === 'light_cone' ? 65 : 75,
    softPityEnd: type === 'light_cone' ? 80 : 90,
    hardPity: type === 'light_cone' ? 80 : 90,
  };
}

export function getPrePityEnd(pityWindow) {
  return Math.max(1, Number(pityWindow?.softPityStart || 1) - 1);
}
