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

const BACKEND_GLOBAL_PAIR_MOTIFS = {
  '41 41': 944,
  '43 43': 889,
  '44 44': 882,
  '42 43': 880,
  '41 42': 877,
  '42 44': 870,
  '43 42': 867,
  '44 43': 864,
  '44 41': 860,
  '42 41': 859,
  '41 44': 859,
  '42 42': 859,
};

const BACKEND_GLOBAL_TRI_MOTIFS = {
  '41 41 41': 275,
  '42 42 44': 229,
  '42 44 42': 224,
  '41 41 42': 224,
  '44 43 44': 221,
  '41 44 43': 221,
  '44 42 41': 220,
  '42 43 41': 220,
  '44 44 44': 220,
  '41 42 41': 218,
};

const BACKEND_SERVER_TRI_MOTIFS = {
  America: {
    '41 41 41': 104,
    '41 44 43': 82,
    '43 44 44': 81,
    '42 42 42': 81,
    '44 41 44': 80,
  },
  Asia: {
    '42 44 42': 87,
    '41 43 43': 81,
    '43 42 41': 80,
    '43 43 43': 80,
    '42 44 41': 80,
  },
  Europe: {
    '41 41 41': 98,
    '43 44 43': 86,
    '44 44 43': 86,
    '41 42 41': 83,
    '44 43 44': 83,
  },
};

const BACKEND_PATCH_MOTIFS = {
  legacy: {
    '41 41 41': 86,
    '42 42 42': 57,
    '43 44 43': 55,
    '44 43 44': 54,
    '41 42 44': 51,
  },
  recent: {
    '42 43 42': 33,
    '44 44 44': 28,
    '43 42 41': 26,
    '42 42 44': 25,
    '42 44 44': 24,
  },
};

const BACKEND_RUN_TARGETS = {
  '41': 1.341,
  '42': 1.31,
  '43': 1.324,
  '44': 1.322,
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

function weightedMotifPick(motifs, generator) {
  if (!motifs.length) return ['43', '42', '44', '44'];
  const total = motifs.reduce((sum, motif) => sum + motif.weight, 0);
  let cursor = generator() * total;
  for (const motif of motifs) {
    cursor -= motif.weight;
    if (cursor <= 0) return motif.sequence;
  }
  return motifs[motifs.length - 1]?.sequence || ['43', '42', '44', '44'];
}

function pickHybridStarterMotif(template, generator, region, patchEra) {
  const motifMap = new Map();

  for (const starter of template.starterMotifs || [template.starterSequence || ['43', '42', '44', '44']]) {
    const key = starter.join(' ');
    motifMap.set(key, { sequence: starter, weight: 24 });
  }

  const regionTri = BACKEND_SERVER_TRI_MOTIFS[region] || {};
  for (const [motif, weight] of Object.entries(regionTri)) {
    motifMap.set(motif, {
      sequence: motif.split(' '),
      weight: (motifMap.get(motif)?.weight || 0) + weight * 0.18,
    });
  }

  const patchTri = BACKEND_PATCH_MOTIFS[patchEra] || {};
  for (const [motif, weight] of Object.entries(patchTri)) {
    motifMap.set(motif, {
      sequence: motif.split(' '),
      weight: (motifMap.get(motif)?.weight || 0) + weight * 0.12,
    });
  }

  for (const [motif, weight] of Object.entries(BACKEND_GLOBAL_TRI_MOTIFS)) {
    motifMap.set(motif, {
      sequence: motif.split(' '),
      weight: (motifMap.get(motif)?.weight || 0) + weight * 0.05,
    });
  }

  return weightedMotifPick([...motifMap.values()], generator);
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

function countWindow(window) {
  const counts = { '41': 0, '42': 0, '43': 0, '44': 0 };
  for (const value of window) {
    if (counts[value] !== undefined) counts[value] += 1;
  }
  return counts;
}

function pickTopTwoRolls(window, fallbackCommons = ['42', '43']) {
  const counts = Object.entries(countWindow(window))
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .filter(([, count]) => count > 0)
    .slice(0, 2)
    .map(([roll]) => roll);

  if (counts.length >= 2) return counts;
  return fallbackCommons;
}

function sameRollPair(left = [], right = []) {
  return (left?.[0] || '') === (right?.[0] || '') && (left?.[1] || '') === (right?.[1] || '');
}

function detectAlternatingWindow(window) {
  if (window.length < 4) return false;
  const [a, b, c, d] = window.slice(-4);
  return a === c && b === d && a !== b;
}

function detectWaveWindow(window) {
  if (window.length < 4) return false;
  const [a, b, c, d] = window.slice(-4);
  return a === b && c === d && a !== c;
}

function resolvePhase(historyLength = 0) {
  if (historyLength < 5) return 'opening';
  if (historyLength < 11) return 'mid';
  if (historyLength < 18) return 'late';
  return 'volatile';
}

function deriveDynamicState(profile, nextHistory) {
  const recentWindow = nextHistory.slice(-6);
  const counts = countWindow(recentWindow);
  const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topCount = sortedCounts[0]?.[1] || 0;
  const secondCount = sortedCounts[1]?.[1] || 0;
  const dominantRoll = sortedCounts[0]?.[0] || null;
  const dominantGap = topCount - secondCount;
  const candidateCommons = pickTopTwoRolls(recentWindow, profile.baseCommons || profile.commons);
  const candidateNoise = ['41', '42', '43', '44'].filter((roll) => !candidateCommons.includes(roll));
  const trailingRun = getTrailingRun(nextHistory);
  const last = nextHistory[nextHistory.length - 1] || null;
  const noiseHit = profile.noise?.includes(last);
  let noisePressure = Math.max(0, (profile.noisePressure || 0) + (noiseHit ? 0.55 : -0.25));

  if (trailingRun.length >= 2 && profile.noise?.includes(trailingRun.value)) {
    noisePressure += 0.28;
  }
  if (trailingRun.length >= 3 && candidateCommons.includes(trailingRun.value)) {
    noisePressure += 0.12;
  }

  const phase = resolvePhase(nextHistory.length);
  let candidateFamily = profile.family || profile.baseFamily;

  if (noisePressure >= 2.4) {
    candidateFamily = dominantRoll === '44' ? 'sticky' : 'noise-recovery';
  } else if (dominantGap >= 2 && topCount >= 3) {
    candidateFamily = 'dominance';
  } else if (detectAlternatingWindow(recentWindow)) {
    candidateFamily = 'balanced';
  } else if (detectWaveWindow(recentWindow)) {
    candidateFamily = 'wave';
  } else if (phase === 'volatile') {
    candidateFamily = 'transition-based';
  } else {
    candidateFamily = profile.baseFamily || profile.family;
  }

  const currentSignature = `${profile.family || profile.baseFamily}|${(profile.commons || profile.baseCommons || []).join('/')}`;
  const candidateSignature = `${candidateFamily}|${candidateCommons.join('/')}`;
  const strongShift =
    noisePressure >= 5.25 ||
    (phase === 'volatile' && noisePressure >= 4.2) ||
    (dominantGap >= 3 && topCount >= 5);

  let nextFamily = profile.family || profile.baseFamily;
  let nextCommons = profile.commons || profile.baseCommons || candidateCommons;
  let nextNoise = profile.noise || profile.baseNoise || candidateNoise;
  let pendingShiftSignature = profile.pendingShiftSignature || null;
  let pendingShiftCount = profile.pendingShiftCount || 0;
  let regimeShiftCount = profile.regimeShiftCount || 0;
  let stableTicks = (profile.stableTicks || 0) + 1;

  if (candidateSignature === currentSignature) {
    pendingShiftSignature = null;
    pendingShiftCount = 0;
  } else if (strongShift) {
    nextFamily = candidateFamily;
    nextCommons = candidateCommons;
    nextNoise = candidateNoise;
    pendingShiftSignature = null;
    pendingShiftCount = 0;
    regimeShiftCount += 1;
    stableTicks = 0;
  } else {
    pendingShiftCount = pendingShiftSignature === candidateSignature ? pendingShiftCount + 1 : 1;
    pendingShiftSignature = candidateSignature;
    const minVotes = phase === 'opening' ? 4 : phase === 'mid' ? 3 : 3;
    const canCommit =
      pendingShiftCount >= minVotes &&
      nextHistory.length >= 7 &&
      (profile.stableTicks || 0) >= 3;

    if (canCommit) {
      nextFamily = candidateFamily;
      nextCommons = candidateCommons;
      nextNoise = candidateNoise;
      pendingShiftSignature = null;
      pendingShiftCount = 0;
      regimeShiftCount += 1;
      stableTicks = 0;
    }
  }

  return {
    phase,
    noisePressure: Number(Math.min(noisePressure, 6.5).toFixed(2)),
    family: nextFamily,
    commons: nextCommons,
    noise: nextNoise,
    dominantRoll,
    stableTicks,
    pendingShiftSignature,
    pendingShiftCount,
    regimeShiftCount,
  };
}

function createWeights(profile, history) {
  const last = history[history.length - 1] || null;
  const previous = history[history.length - 2] || null;
  const lastTwo = history.length >= 2 ? `${history[history.length - 2]} ${history[history.length - 1]}` : null;
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

  if (lastTwo && BACKEND_GLOBAL_PAIR_MOTIFS[lastTwo]) {
    const lastWeight = BACKEND_GLOBAL_PAIR_MOTIFS[lastTwo];
    weights[last] += lastWeight * 0.012;
  }

  if (history.length >= 3) {
    const tri = history.slice(-3).join(' ');
    const globalTriWeight = BACKEND_GLOBAL_TRI_MOTIFS[tri] || 0;
    const regionTriWeight = BACKEND_SERVER_TRI_MOTIFS[profile.region]?.[tri] || 0;
    const patchTriWeight = BACKEND_PATCH_MOTIFS[profile.patchEra]?.[tri] || 0;
    if (globalTriWeight || regionTriWeight || patchTriWeight) {
      const motifBias = globalTriWeight * 0.01 + regionTriWeight * 0.03 + patchTriWeight * 0.02;
      weights[last] += motifBias;
    }
  }

  const regionPrior = REGION_VALUE_PRIORS[profile.region] || REGION_VALUE_PRIORS.America;
  const patchPrior = PATCH_ERA_PRIORS[profile.patchEra] || PATCH_ERA_PRIORS.recent;
  for (const roll of ['41', '42', '43', '44']) {
    weights[roll] += (regionPrior[roll] || 25) * 0.35;
    weights[roll] += (patchPrior[roll] || 25) * 0.2;
  }

  if (profile.phase === 'opening') {
    for (const common of profile.commons) weights[common] += 10;
  }
  if (profile.phase === 'late') {
    for (const noise of profile.noise) weights[noise] += 6;
  }
  if (profile.phase === 'volatile') {
    for (const noise of profile.noise) weights[noise] += 10;
    for (const common of profile.commons) weights[common] += 4;
  }
  if ((profile.noisePressure || 0) >= 1.8) {
    for (const noise of profile.noise) weights[noise] += 8;
  }
  if (profile.dominantRoll) {
    weights[profile.dominantRoll] += profile.family === 'dominance' ? 10 : 4;
  }

  if (last) {
    const regionTransition = REGION_TRANSITION_BONUS[profile.region]?.[last] || null;
    if (regionTransition) {
      for (const [roll, bonus] of Object.entries(regionTransition)) {
        weights[roll] += bonus;
      }
    }
  }

  if (trailingRun.value) {
    const targetRun = BACKEND_RUN_TARGETS[trailingRun.value] || 1.32;
    if (trailingRun.length > Math.ceil(targetRun)) {
      weights[trailingRun.value] *= 0.78;
    }
    if (trailingRun.length >= Math.ceil(targetRun) + 2) {
      weights[trailingRun.value] *= 0.55;
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
  const normalizedRegion = normalizeRegion(region);
  const patchEra = resolvePatchEra(patch);
  const starterSequence = pickHybridStarterMotif(template, generator, normalizedRegion, patchEra);
  return {
    ...template,
    baseFamily: template.family,
    baseCommons: [...template.commons],
    baseNoise: [...template.noise],
    seed,
    region: normalizedRegion,
    patch,
    patchEra,
    starterSequence,
    commons: [...template.commons],
    noise: [...template.noise],
    phase: 'opening',
    noisePressure: 0,
    dominantRoll: null,
    regimeShiftCount: 0,
    stableTicks: 0,
    pendingShiftSignature: null,
    pendingShiftCount: 0,
    history: [],
  };
}

export function createPatternProfileFromId(profileId, region = 'America', patch = '4.1', seedOverride = null) {
  const normalizedRegion = normalizeRegion(region);
  const patchEra = resolvePatchEra(patch);
  const template = PROFILE_LIBRARY[profileId] || PROFILE_LIBRARY.mixedRecovery4143;
  const seed = Number.isFinite(seedOverride) ? seedOverride : Math.floor(Math.random() * 1000000);
  const generator = createGenerator(seed);
  const starterSequence = pickHybridStarterMotif(template, generator, normalizedRegion, patchEra);
  return {
    ...template,
    baseFamily: template.family,
    baseCommons: [...template.commons],
    baseNoise: [...template.noise],
    seed,
    region: normalizedRegion,
    patch,
    patchEra,
    starterSequence,
    commons: [...template.commons],
    noise: [...template.noise],
    phase: 'opening',
    noisePressure: 0,
    dominantRoll: null,
    regimeShiftCount: 0,
    stableTicks: 0,
    pendingShiftSignature: null,
    pendingShiftCount: 0,
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
  const starterSequence = pickHybridStarterMotif(template, generator, normalizedRegion, patchEra);
  return {
    ...template,
    baseFamily: template.family,
    baseCommons: [...template.commons],
    baseNoise: [...template.noise],
    seed,
    region: normalizedRegion,
    patch,
    patchEra,
    bucketKey,
    starterSequence,
    commons: [...template.commons],
    noise: [...template.noise],
    phase: 'opening',
    noisePressure: 0,
    dominantRoll: null,
    regimeShiftCount: 0,
    stableTicks: 0,
    pendingShiftSignature: null,
    pendingShiftCount: 0,
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
  const nextHistory = [...(patternProfile.history || []), visibleRoll].slice(-24);
  const dynamicState = deriveDynamicState(patternProfile, nextHistory);
  return {
    ...patternProfile,
    ...dynamicState,
    history: nextHistory,
  };
}

export function describePatternProfile(patternProfile) {
  if (!patternProfile) return 'No learned pattern loaded yet.';
  const motif = (patternProfile.starterSequence || []).join(' ');
  return `${patternProfile.family} profile (${patternProfile.region} / ${patternProfile.patchEra}, ${patternProfile.phase}, noise ${patternProfile.noisePressure || 0}): commons ${patternProfile.commons.join(' / ')}, noise ${patternProfile.noise.join(' / ')}. Starter motif ${motif}. ${patternProfile.note}`;
}

export function getPatternLibrary() {
  return PROFILE_LIBRARY;
}
