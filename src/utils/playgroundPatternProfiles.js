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

const PROFILE_LIBRARY = {
  stableBalanced4243: {
    id: 'stableBalanced4243',
    family: 'balanced',
    mood: 'stable',
    commons: ['42', '43'],
    noise: ['41'],
    starterSequence: ['43', '42', '44', '44'],
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
    starterSequence: ['42', '41', '44', '42'],
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
    starterSequence: ['43', '42', '44', '44'],
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
    starterSequence: ['43', '41', '43', '42'],
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
    starterSequence: ['44', '42', '44', '41'],
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
    starterSequence: ['43', '41', '44', '43'],
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

function createWeights(profile, history) {
  const last = history[history.length - 1] || null;
  const previous = history[history.length - 2] || null;
  const weights = { 41: 1, 42: 1, 43: 1, 44: 1 };

  for (const common of profile.commons) {
    weights[common] += profile.mood === 'stable' ? 3.4 : profile.mood === 'mixed' ? 2.8 : 2.2;
  }
  for (const noise of profile.noise) {
    weights[noise] += profile.noiseChance * 3.5;
  }

  if (profile.family === 'sticky' && last) {
    weights[last] += 2.6;
  }

  if (profile.family === 'dominance') {
    weights[profile.commons[0]] += 3.2;
    weights[profile.commons[1]] += 1.4;
  }

  if (profile.family === 'balanced' && last && profile.commons.includes(last)) {
    const other = profile.commons.find((value) => value !== last);
    if (other) weights[other] += 1.8;
  }

  if (profile.family === 'wave' && last && previous) {
    if (last === previous) {
      const alt = profile.commons.find((value) => value !== last) || profile.noise[0] || last;
      weights[alt] += 2.1;
    } else if (profile.commons.includes(last)) {
      weights[last] += 0.8;
    }
  }

  if (profile.family === 'transition-based' && last) {
    if (profile.noise.includes(last)) {
      for (const common of profile.commons) weights[common] += 1.6;
    } else {
      for (const noise of profile.noise) weights[noise] += 0.8;
    }
  }

  if (profile.family === 'noise-recovery' && last && profile.noise.includes(last)) {
    for (const common of profile.commons) weights[common] += 2.4;
  }

  if (last) weights[last] += profile.repeatBias;

  return weights;
}

export function createPatternProfile(mood = 'mixed') {
  const seed = Math.floor(Math.random() * 1000000);
  const generator = createGenerator(seed);
  const profileIds = MOOD_PROFILE_IDS[mood] || MOOD_PROFILE_IDS.mixed;
  const chosenId = pickRandom(profileIds, generator);
  const template = PROFILE_LIBRARY[chosenId];
  return {
    ...template,
    seed,
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

export function createBucketPatternProfile(mood = 'mixed', bucketKey = getFiveMinuteBucketKey()) {
  const seed = hashString(`${mood}:${bucketKey}`);
  const generator = createGenerator(seed);
  const profileIds = MOOD_PROFILE_IDS[mood] || MOOD_PROFILE_IDS.mixed;
  const chosenId = pickRandom(profileIds, generator);
  const template = PROFILE_LIBRARY[chosenId];
  return {
    ...template,
    seed,
    bucketKey,
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
  return `${patternProfile.family} profile: commons ${patternProfile.commons.join(' / ')}, noise ${patternProfile.noise.join(' / ')}. Starter motif ${motif}. ${patternProfile.note}`;
}

export function getPatternLibrary() {
  return PROFILE_LIBRARY;
}
