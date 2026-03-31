// Learned session families from debugpatternfiles.
// This is a seedable Playground engine, not a claim of perfect HSR server replication.
// It replaces the old tiny fixed visibleSequence loop with:
// 1. a starter motif learned from real sessions
// 2. a seeded continuation model per family

function createGenerator(seed = 1) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value = '') {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const EMPIRICAL_TRANSITIONS = {
  '41': { '41': 0.198, '42': 0.428, '43': 0.173, '44': 0.201 },
  '42': { '41': 0.239, '42': 0.131, '43': 0.464, '44': 0.166 },
  '43': { '41': 0.255, '42': 0.204, '43': 0.137, '44': 0.405 },
  '44': { '41': 0.306, '42': 0.229, '43': 0.226, '44': 0.239 },
};

const EMPIRICAL_REPEAT_LIMITS = {
  '41': { soft: 2, hard: 4 },
  '42': { soft: 1, hard: 3 },
  '43': { soft: 1, hard: 3 },
  '44': { soft: 2, hard: 5 },
};

const REGION_VALUE_PRIORS = {
  America: { '41': 24.8, '42': 24.0, '43': 25.9, '44': 25.3 },
  Europe: { '41': 25.7, '42': 24.2, '43': 25.3, '44': 24.8 },
  Asia: { '41': 23.9, '42': 25.7, '43': 24.8, '44': 25.6 },
};

const REGION_TRANSITION_BONUS = {
  America: {
    '41': { '41': 6, '44': 4, '43': 3 },
    '42': { '42': 5, '43': 5, '44': 3 },
    '43': { '44': 6, '42': 4 },
    '44': { '44': 5, '41': 5 },
  },
  Europe: {
    '41': { '41': 6, '42': 4 },
    '42': { '43': 6, '44': 4 },
    '43': { '41': 5, '43': 4, '42': 4 },
    '44': { '43': 5, '44': 4 },
  },
  Asia: {
    '41': { '42': 5, '41': 4 },
    '42': { '41': 5, '44': 4 },
    '43': { '43': 5, '42': 4 },
    '44': { '41': 5, '42': 4, '44': 4 },
  },
};

const PATCH_ERA_PRIORS = {
  legacy: { '41': 25.4, '42': 24.9, '43': 24.9, '44': 24.8 },
  recent: { '41': 24.6, '42': 24.8, '43': 25.7, '44': 24.9 },
};

const PROFILE_LIBRARY = {
  stableBalanced4243: {
    id: 'stableBalanced4243',
    family: 'balanced',
    mood: 'stable',
    commons: ['42', '43'],
    noise: ['41'],
    starterMotifs: [
      ['43', '42', '42', '41'],
      ['43', '42', '43', '43'],
      ['44', '42', '43', '44'],
    ],
    repeatBias: 0.12,
    noiseChance: 0.16,
    note: 'Balanced 42/43 lane with a late upward wrap.',
  },
  stableWave4142: {
    id: 'stableWave4142',
    family: 'wave',
    mood: 'stable',
    commons: ['41', '42'],
    noise: ['44'],
    starterMotifs: [
      ['41', '41', '42', '42'],
      ['41', '42', '43', '41'],
      ['42', '41', '44', '42'],
    ],
    repeatBias: 0.18,
    noiseChance: 0.18,
    note: '41/42 commons that stay readable and recover fast.',
  },
  mixedTransition4342: {
    id: 'mixedTransition4342',
    family: 'transition-based',
    mood: 'mixed',
    commons: ['43', '42'],
    noise: ['41', '44'],
    starterMotifs: [
      ['43', '42', '42', '41'],
      ['43', '42', '41', '44'],
      ['44', '42', '43', '44'],
    ],
    repeatBias: 0.22,
    noiseChance: 0.24,
    note: 'Transition-heavy 43/42 lane with a noisy tail.',
  },
  mixedRecovery4143: {
    id: 'mixedRecovery4143',
    family: 'noise-recovery',
    mood: 'mixed',
    commons: ['41', '43'],
    noise: ['42', '44'],
    starterMotifs: [
      ['43', '41', '42', '43'],
      ['43', '44', '41', '41'],
      ['41', '41', '44', '44'],
    ],
    repeatBias: 0.18,
    noiseChance: 0.22,
    note: 'Noise breaks show up, but the session often comes back to 41/43.',
  },
  chaoticSticky4442: {
    id: 'chaoticSticky4442',
    family: 'sticky',
    mood: 'chaotic',
    commons: ['44', '42'],
    noise: ['41', '43'],
    starterMotifs: [
      ['44', '44', '43', '44'],
      ['44', '44', '41', '44'],
      ['44', '42', '43', '44'],
    ],
    repeatBias: 0.42,
    noiseChance: 0.28,
    note: 'Sticky dominant 44/42 lane with hard outsider pressure.',
  },
  chaoticDominance4341: {
    id: 'chaoticDominance4341',
    family: 'dominance',
    mood: 'chaotic',
    commons: ['43', '41'],
    noise: ['42', '44'],
    starterMotifs: [
      ['43', '41', '42', '43'],
      ['43', '43', '41', '42'],
      ['43', '41', '43', '42'],
    ],
    repeatBias: 0.48,
    noiseChance: 0.26,
    note: 'Dominant 43/41 session where outsiders still threaten to flip the read.',
  },
};

const MOOD_PROFILE_IDS = {
  stable: ['stableBalanced4243', 'stableWave4142'],
  mixed: ['mixedTransition4342', 'mixedRecovery4143'],
  chaotic: ['chaoticSticky4442', 'chaoticDominance4341'],
};

function pickRandom(list, nextRand = Math.random) {
  return list[Math.floor(nextRand() * list.length)];
}

function weightedPick(weightMap, nextRand) {
  const entries = Object.entries(weightMap);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = nextRand() * total;
  for (const [key, value] of entries) {
    cursor -= value;
    if (cursor <= 0) return key;
  }
  return entries[entries.length - 1]?.[0] || '44';
}

function pickStarterMotif(template, generator) {
  const motifs = template.starterMotifs || [template.starterSequence || ['43', '42', '44', '44']];
  return pickRandom(motifs, generator);
}

function normalizeRegion(region = 'America') {
  const value = String(region || '').trim().toLowerCase();
  if (value === 'eu' || value === 'europe') return 'Europe';
  if (value === 'asia' || value === 'asia ') return 'Asia';
  return 'America';
}

function resolvePatchEra(patch = '4.1') {
  const numeric = Number.parseFloat(String(patch || '').replace(/[^0-9.]/g, ''));
  if (Number.isFinite(numeric) && numeric < 3.6) return 'legacy';
  return 'recent';
}

function getTrailingRun(history) {
  if (!history.length) return { value: null, length: 0 };
  const value = history[history.length - 1];
  let length = 1;
  for (let index = history.length - 2; index >= 0; index -= 1) {
    if (history[index] !== value) break;
    length += 1;
  }
  return { value, length };
}

function createWeights(profile, history) {
  const last = history[history.length - 1] || null;
  const previous = history[history.length - 2] || null;
  const trailingRun = getTrailingRun(history);
  const transitionBase = last ? (EMPIRICAL_TRANSITIONS[last] || EMPIRICAL_TRANSITIONS['44']) : null;
  const weights = transitionBase
    ? {
        '41': transitionBase['41'] * 100,
        '42': transitionBase['42'] * 100,
        '43': transitionBase['43'] * 100,
        '44': transitionBase['44'] * 100,
      }
    : { 41: 25, 42: 25, 43: 25, 44: 25 };

  for (const common of profile.commons) {
    weights[common] += profile.mood === 'stable' ? 24 : profile.mood === 'mixed' ? 18 : 12;
  }
  for (const noise of profile.noise) {
    weights[noise] += profile.noiseChance * 12;
  }

  if (profile.family === 'sticky' && last) {
    weights[last] += 16;
  }

  if (profile.family === 'dominance') {
    weights[profile.commons[0]] += 20;
    weights[profile.commons[1]] += 8;
  }

  if (profile.family === 'balanced' && last && profile.commons.includes(last)) {
    const other = profile.commons.find((value) => value !== last);
    if (other) weights[other] += 14;
  }

  if (profile.family === 'wave' && last && previous) {
    if (last === previous) {
      const alt = profile.commons.find((value) => value !== last) || profile.noise[0] || last;
      weights[alt] += 18;
    } else if (profile.commons.includes(last)) {
      weights[last] += 6;
    }
  }

  if (profile.family === 'transition-based' && last) {
    if (profile.noise.includes(last)) {
      for (const common of profile.commons) weights[common] += 15;
    } else {
      for (const noise of profile.noise) weights[noise] += 8;
    }
  }

  if (profile.family === 'noise-recovery' && last && profile.noise.includes(last)) {
    for (const common of profile.commons) weights[common] += 20;
  }

  if (last) {
    weights[last] += profile.repeatBias * 20;
  }

  if (trailingRun.value) {
    const limits = EMPIRICAL_REPEAT_LIMITS[trailingRun.value] || { soft: 1, hard: 3 };
    if (trailingRun.length >= limits.soft) {
      weights[trailingRun.value] *= 0.55;
    }
    if (trailingRun.length >= limits.hard) {
      weights[trailingRun.value] *= 0.18;
    }
  }

  if (profile.family === 'sticky' && trailingRun.value === '44' && trailingRun.length < 3) {
    weights['44'] += 10;
  }

  if (profile.family === 'dominance' && history.length >= 3) {
    const recentWindow = history.slice(-4);
    const dominantHits = recentWindow.filter((value) => value === profile.commons[0]).length;
    if (dominantHits >= 2) {
      weights[profile.commons[0]] += 12;
    }
  }

  const regionPrior = REGION_VALUE_PRIORS[profile.region] || REGION_VALUE_PRIORS.America;
  const patchPrior = PATCH_ERA_PRIORS[profile.patchEra] || PATCH_ERA_PRIORS.recent;
  for (const roll of ['41', '42', '43', '44']) {
    weights[roll] += (regionPrior[roll] || 25) * 0.35;
    weights[roll] += (patchPrior[roll] || 25) * 0.2;
  }

  if (last) {
    const regionTransition = REGION_TRANSITION_BONUS[profile.region]?.[last] || null;
    if (regionTransition) {
      for (const [roll, bonus] of Object.entries(regionTransition)) {
        weights[roll] += bonus;
      }
    }
  }

  return weights;
}

export function createPatternProfile(mood = 'mixed', region = 'America', patch = '4.1') {
  const seed = Math.floor(Math.random() * 1000000);
  const generator = createGenerator(seed);
  const profileIds = MOOD_PROFILE_IDS[mood] || MOOD_PROFILE_IDS.mixed;
  const chosenId = pickRandom(profileIds, generator);
  const template = PROFILE_LIBRARY[chosenId];
  const starterSequence = pickStarterMotif(template, generator);
  const normalizedRegion = normalizeRegion(region);
  const patchEra = resolvePatchEra(patch);
  return {
    ...template,
    seed,
    region: normalizedRegion,
    patch,
    patchEra,
    starterSequence,
    history: [],
  };
}

export function getFiveMinuteBucketKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const bucketMinute = Math.floor(date.getMinutes() / 5) * 5;
  const minutes = String(bucketMinute).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function createBucketPatternProfile(mood = 'mixed', bucketKey = getFiveMinuteBucketKey(), region = 'America', patch = '4.1') {
  const normalizedRegion = normalizeRegion(region);
  const patchEra = resolvePatchEra(patch);
  const seed = hashString(`${mood}:${normalizedRegion}:${patchEra}:${bucketKey}`);
  const generator = createGenerator(seed);
  const profileIds = MOOD_PROFILE_IDS[mood] || MOOD_PROFILE_IDS.mixed;
  const chosenId = pickRandom(profileIds, generator);
  const template = PROFILE_LIBRARY[chosenId];
  const starterSequence = pickStarterMotif(template, generator);
  return {
    ...template,
    seed,
    region: normalizedRegion,
    patch,
    patchEra,
    bucketKey,
    starterSequence,
    history: [],
  };
}

export function getVisibleRollForUpgrade(patternProfile, upgradeIndex) {
  if (!patternProfile) return '44';

  const starter = patternProfile.starterSequence || [];
  if (upgradeIndex < starter.length) {
    return starter[upgradeIndex];
  }

  const history = Array.isArray(patternProfile.history) ? patternProfile.history : [];
  const nextRand = createGenerator((patternProfile.seed || 1) + history.length + upgradeIndex + 1);
  const weights = createWeights(patternProfile, history);
  return weightedPick(weights, nextRand);
}

export function advancePatternProfile(patternProfile, visibleRoll) {
  if (!patternProfile) return patternProfile;
  return {
    ...patternProfile,
    history: [...(patternProfile.history || []), visibleRoll].slice(-24),
  };
}

export function describePatternProfile(patternProfile) {
  if (!patternProfile) return 'No learned pattern loaded yet.';
  const motif = (patternProfile.starterSequence || []).join(' ');
  return `${patternProfile.family} profile (${patternProfile.region} / ${patternProfile.patchEra}): commons ${patternProfile.commons.join(' / ')}, noise ${patternProfile.noise.join(' / ')}. Starter motif ${motif}. ${patternProfile.note}`;
}

export function getPatternLibrary() {
  return PROFILE_LIBRARY;
}
