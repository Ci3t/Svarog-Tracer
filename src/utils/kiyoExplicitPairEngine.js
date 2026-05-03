const PREFIXES = ['41', '42', '43', '44'];
const Z_DIGITS = ['1', '2', '3', '4'];

export const KIYO_XY_COLUMNS = [
  { key: 'xy-12-34', name: 'COL 1', left: ['41', '42'], right: ['43', '44'], leftLabel: '41/42', rightLabel: '43/44' },
  { key: 'xy-13-24', name: 'COL 2', left: ['41', '43'], right: ['42', '44'], leftLabel: '41/43', rightLabel: '42/44' },
  { key: 'xy-14-23', name: 'COL 3', left: ['41', '44'], right: ['42', '43'], leftLabel: '41/44', rightLabel: '42/43' },
];

export const KIYO_EXACT_ROLLS = PREFIXES.flatMap((prefix) => Z_DIGITS.map((z) => `${prefix}${z}`));

const DEFAULT_PREVIEW_WEIGHTS = {
  xySupport: 0.11592515196721606,
  exactFreq: 0.11903609621336633,
  localZFreqSmall: 0.07076671987414053,
  localZFreqLarge: 0.15123435126884932,
  localZRaritySmall: 0.22795282639642986,
  localZRarityLarge: 0.14590433340570685,
  prefixFreq: 0.05180449398503914,
  zFreq: 0.07875692668880244,
  exactDue: 0.0480424406950038,
  prefixDue: 0.01867184602499969,
  zDue: 0.01323360690470421,
  transition: 0.010241632992674927,
  prefixTransition: 0.19952885295564582,
  currentLane: 0.014737506035271561,
  previewBoost: 0.2178408868926101,
  targetBoost: 0.03370010262035389,
  liveDataBoost: 0.047718572695194035,
  liveExactHit: 0,
  activeZeroHitPenalty: 0.05,
};

const DEFAULT_GLOBAL_WEIGHTS = {
  xySupport: 0.84,
  exactFreq: 0.22,
  localZFreq: 0.08,
  localZRarity: 0.02,
  prefixFreq: 0.11,
  zFreq: 0.12,
  exactDue: 0.04,
  prefixDue: 0.02,
  zDue: 0.03,
  transition: 0.12,
  prefixTransition: 0.03,
  currentLane: 0.04,
  targetBoost: 0.06,
  liveDataBoost: 0.05,
  liveExactHit: 0,
  activeZeroHitPenalty: 0.02,
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function validRolls(rolls) {
  return (rolls || []).map((roll) => String(roll || '').trim()).filter((roll) => /^[1-4]{3}$/.test(roll));
}

function validPrefix(prefix) {
  return PREFIXES.includes(String(prefix || '')) ? String(prefix) : null;
}

function sideForPrefix(prefix, column) {
  if (column.left.includes(prefix)) return 'left';
  if (column.right.includes(prefix)) return 'right';
  return null;
}

function labelForSide(column, side) {
  return side === 'left' ? column.leftLabel : column.rightLabel;
}

function prefixesForSide(column, side) {
  return side === 'left' ? column.left : column.right;
}

function runInfo(values) {
  if (!values.length) return { value: null, length: 0 };
  const value = values[values.length - 1];
  let length = 1;
  for (let i = values.length - 2; i >= 0; i -= 1) {
    if (values[i] !== value) break;
    length += 1;
  }
  return { value, length };
}

function oppositeSide(side) {
  return side === 'left' ? 'right' : 'left';
}

function analyzeColumnPattern(states, column) {
  const recent = states.slice(-10);
  if (recent.length < 4) {
    const run = runInfo(recent);
    return {
      type: 'building',
      targetSide: run.value || 'left',
      targetLabel: labelForSide(column, run.value || 'left'),
      targetPrefixes: prefixesForSide(column, run.value || 'left'),
      confidence: 0.32,
      note: 'Need more rows',
    };
  }

  const run = runInfo(recent);
  const leftCount = recent.filter((side) => side === 'left').length;
  const rightCount = recent.length - leftCount;
  const dominantSide = leftCount >= rightCount ? 'left' : 'right';
  const dominantCount = Math.max(leftCount, rightCount);
  const dominantPct = dominantCount / recent.length;
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  const beforePrev = recent[recent.length - 3];
  const lastFour = recent.slice(-4);
  const alternates = lastFour.length === 4 && lastFour.every((side, idx) => idx === 0 || side !== lastFour[idx - 1]);
  const oneBreakReturned = beforePrev === last && prev !== last;
  const dominantWithOneBreak = dominantPct >= 0.7 && last === dominantSide && recent.slice(-6).filter((side) => side !== dominantSide).length <= 2;
  const singleBreakAgainstDominant = dominantPct >= 0.65 && last !== dominantSide && run.length === 1;

  if (oneBreakReturned) {
    return {
      type: 'return',
      targetSide: last,
      targetLabel: labelForSide(column, last),
      targetPrefixes: prefixesForSide(column, last),
      confidence: clamp(0.62 + dominantPct * 0.22),
      note: 'Broke once, returned',
    };
  }

  if (singleBreakAgainstDominant) {
    return {
      type: 'snapback',
      targetSide: dominantSide,
      targetLabel: labelForSide(column, dominantSide),
      targetPrefixes: prefixesForSide(column, dominantSide),
      confidence: clamp(0.58 + dominantPct * 0.22),
      note: 'Single break against trend',
    };
  }

  if (dominantWithOneBreak) {
    return {
      type: 'trend',
      targetSide: dominantSide,
      targetLabel: labelForSide(column, dominantSide),
      targetPrefixes: prefixesForSide(column, dominantSide),
      confidence: clamp(0.55 + dominantPct * 0.24),
      note: 'Pattern side still holding',
    };
  }

  if (alternates) {
    const targetSide = oppositeSide(last);
    return {
      type: 'alternate',
      targetSide,
      targetLabel: labelForSide(column, targetSide),
      targetPrefixes: prefixesForSide(column, targetSide),
      confidence: 0.63,
      note: 'Alternating row pattern',
    };
  }

  return {
    type: run.length >= 2 ? 'run' : 'mixed',
    targetSide: run.length >= 2 ? last : dominantSide,
    targetLabel: labelForSide(column, run.length >= 2 ? last : dominantSide),
    targetPrefixes: prefixesForSide(column, run.length >= 2 ? last : dominantSide),
    confidence: clamp(0.42 + Math.max(run.length / 6, dominantPct) * 0.24),
    note: run.length >= 2 ? 'Short run holding' : 'Mixed table',
  };
}

function scoreXyColumn(rolls, column) {
  const prefixes = rolls.map((roll) => roll.slice(0, 2));
  const states = prefixes.map((prefix) => sideForPrefix(prefix, column)).filter(Boolean);
  const recent = states.slice(-8);
  const run = runInfo(recent);
  const leftCount = recent.filter((side) => side === 'left').length;
  const rightCount = recent.filter((side) => side === 'right').length;
  const total = Math.max(1, recent.length);
  const currentShare = run.value === 'right' ? rightCount / total : leftCount / total;
  const oppositeShare = run.value === 'right' ? leftCount / total : rightCount / total;
  const balance = 1 - Math.abs(leftCount - rightCount) / total;
  const switchReady = run.length >= 2 && recent.length >= 4 && balance >= 0.258;
  const baseTargetSide = switchReady ? (run.value === 'left' ? 'right' : 'left') : run.value || (leftCount >= rightCount ? 'left' : 'right');
  const pattern = analyzeColumnPattern(states, column);
  const targetSide = baseTargetSide;
  const targetPrefixes = prefixesForSide(column, targetSide);
  const baseScore = clamp(
    currentShare * 0.204 +
    oppositeShare * 0.289 +
    balance * 0.010 +
    Math.min(run.length / 4, 1) * 0.046 +
    Math.min(recent.length / 8, 1) * 0.165 +
    (switchReady ? 0.0004 : 0.070)
  );
  const patternAlignment = pattern.targetSide === targetSide;
  const score = clamp(
    baseScore
  );

  return {
    ...column,
    side: targetSide,
    baseSide: baseTargetSide,
    targetLabel: labelForSide(column, targetSide),
    targetPrefixes,
    currentSide: run.value,
    currentLabel: run.value ? labelForSide(column, run.value) : null,
    breakLabel: run.value ? labelForSide(column, run.value === 'left' ? 'right' : 'left') : null,
    action: switchReady ? 'SWITCH' : 'HOLD',
    score,
    baseScore,
    pattern,
    patternAlignment,
    runLength: run.length,
    leftCount,
    rightCount,
    states: recent,
  };
}

function transitionScore(rolls, candidate) {
  if (rolls.length < 2) return { exact: 0, prefix: 0, z: 0, score: 0 };
  const last = rolls[rolls.length - 1];
  const candidatePrefix = candidate.slice(0, 2);
  const candidateZ = candidate[2];
  let exactTotal = 0;
  let exactHits = 0;
  let prefixTotal = 0;
  let prefixHits = 0;
  let zTotal = 0;
  let zHits = 0;

  for (let i = 1; i < rolls.length; i += 1) {
    const prev = rolls[i - 1];
    const next = rolls[i];
    if (prev === last) {
      exactTotal += 1;
      if (next === candidate) exactHits += 1;
    }
    if (prev.slice(0, 2) === last.slice(0, 2)) {
      prefixTotal += 1;
      if (next.slice(0, 2) === candidatePrefix) prefixHits += 1;
    }
    if (prev[2] === last[2]) {
      zTotal += 1;
      if (next[2] === candidateZ) zHits += 1;
    }
  }

  const exact = exactTotal ? exactHits / exactTotal : 0;
  const prefix = prefixTotal ? prefixHits / prefixTotal : 0;
  const z = zTotal ? zHits / zTotal : 0;
  return {
    exact,
    prefix,
    z,
    score: clamp(exact * 0.42 + prefix * 0.34 + z * 0.18 + Math.min((exactTotal + prefixTotal + zTotal) / 12, 1) * 0.06),
  };
}

function prefixTransitionScore(rolls, prefix, z) {
  const lane = rolls.filter((roll) => roll.slice(0, 2) === prefix).map((roll) => roll[2]);
  if (lane.length < 2) return { score: 0, hits: 0, total: 0, lastZ: lane[lane.length - 1] || null };
  const lastZ = lane[lane.length - 1];
  let hits = 0;
  let total = 0;
  for (let i = 1; i < lane.length; i += 1) {
    if (lane[i - 1] !== lastZ) continue;
    total += 1;
    if (lane[i] === z) hits += 1;
  }
  return {
    lastZ,
    hits,
    total,
    score: total ? hits / total : 0,
  };
}

function ageOf(rolls, value) {
  for (let i = rolls.length - 1; i >= 0; i -= 1) {
    if (rolls[i] === value) return rolls.length - 1 - i;
  }
  return rolls.length + 2;
}

function prefixAgeOf(rolls, prefix) {
  for (let i = rolls.length - 1; i >= 0; i -= 1) {
    if (rolls[i].slice(0, 2) === prefix) return rolls.length - 1 - i;
  }
  return rolls.length + 2;
}

function zAgeInPrefix(rolls, prefix, z) {
  for (let i = rolls.length - 1; i >= 0; i -= 1) {
    if (rolls[i].slice(0, 2) === prefix && rolls[i][2] === z) return rolls.length - 1 - i;
  }
  return rolls.length + 2;
}

export function analyzeKiyoExplicitPairs(inputRolls, options = {}) {
  const liveRolls = validRolls(inputRolls);
  const seedRolls = validRolls(options.seedRolls);
  const previewPrefix = validPrefix(options.previewPrefix);
  const previewWeights = { ...DEFAULT_PREVIEW_WEIGHTS, ...(options.previewWeights || {}) };
  const globalWeights = { ...DEFAULT_GLOBAL_WEIGHTS, ...(options.globalWeights || {}) };
  const minLiveForStandalone = Number(options.minLiveForStandalone ?? 5);
  const seedTake = Math.max(0, Number(options.seedTake ?? 12));
  const seedWeight = liveRolls.length >= minLiveForStandalone ? 0 : liveRolls.length >= 3 ? 0.08 : 0.16;
  const scoringRolls = seedWeight > 0 ? [...seedRolls.slice(-seedTake), ...liveRolls] : liveRolls;
  const rolls = scoringRolls;
  const recent = rolls.slice(-20);
  const liveRecent = liveRolls.slice(-20);
  const exactCounts = Object.fromEntries(KIYO_EXACT_ROLLS.map((roll) => [roll, 0]));
  const liveExactCounts = Object.fromEntries(KIYO_EXACT_ROLLS.map((roll) => [roll, 0]));
  const prefixCounts = Object.fromEntries(PREFIXES.map((prefix) => [prefix, 0]));
  const zCounts = Object.fromEntries(Z_DIGITS.map((z) => [z, 0]));

  for (const roll of recent) {
    exactCounts[roll] = (exactCounts[roll] || 0) + 1;
    prefixCounts[roll.slice(0, 2)] = (prefixCounts[roll.slice(0, 2)] || 0) + 1;
    zCounts[roll[2]] = (zCounts[roll[2]] || 0) + 1;
  }

  for (const roll of liveRecent) {
    liveExactCounts[roll] = (liveExactCounts[roll] || 0) + 1;
  }

  const xyRows = KIYO_XY_COLUMNS.map((column) => scoreXyColumn(rolls, column)).sort((a, b) => b.score - a.score);
  const targetPrefixes = new Set(xyRows.slice(0, 2).flatMap((row) => row.targetPrefixes));
  const maxExact = Math.max(1, ...Object.values(exactCounts));
  const maxPrefix = Math.max(1, ...Object.values(prefixCounts));
  const maxZ = Math.max(1, ...Object.values(zCounts));
  const prefixZMax = Object.fromEntries(PREFIXES.map((prefix) => {
    const counts = Z_DIGITS.map((z) => exactCounts[`${prefix}${z}`] || 0);
    return [prefix, Math.max(1, ...counts)];
  }));
  const prefixZTotal = Object.fromEntries(PREFIXES.map((prefix) => [
    prefix,
    Z_DIGITS.reduce((sum, z) => sum + (exactCounts[`${prefix}${z}`] || 0), 0),
  ]));
  const livePrefixZTotal = Object.fromEntries(PREFIXES.map((prefix) => [
    prefix,
    Z_DIGITS.reduce((sum, z) => sum + (liveExactCounts[`${prefix}${z}`] || 0), 0),
  ]));
  const lastPrefix = liveRolls[liveRolls.length - 1]?.slice(0, 2) || rolls[rolls.length - 1]?.slice(0, 2) || null;

  const candidates = KIYO_EXACT_ROLLS.map((roll) => {
    const prefix = roll.slice(0, 2);
    const z = roll[2];
    const xySupport = xyRows.reduce((sum, row, idx) => {
      if (!row.targetPrefixes.includes(prefix)) return sum;
      return sum + row.score * (idx === 0 ? 0.28 : idx === 1 ? 0.18 : 0.08);
    }, 0);
    const exactFreq = exactCounts[roll] / maxExact;
    const localZFreq = ((exactCounts[roll] || 0) + 1) / (prefixZTotal[prefix] + Z_DIGITS.length);
    const localZRarity = prefixZTotal[prefix]
      ? 1 - ((exactCounts[roll] || 0) / prefixZMax[prefix])
      : 0.5;
    const localSampleSmall = prefixZTotal[prefix] < 3;
    const liveExactCount = liveExactCounts[roll] || 0;
    const livePrefixTotal = livePrefixZTotal[prefix] || 0;
    const liveExactPresence = livePrefixTotal ? liveExactCount / livePrefixTotal : 0;
    const activeZeroHitPenalty = previewPrefix && prefix === previewPrefix && livePrefixTotal > 0 && liveExactCount === 0
      ? previewWeights.activeZeroHitPenalty
      : 0;
    const prefixFreq = prefixCounts[prefix] / maxPrefix;
    const zFreq = zCounts[z] / maxZ;
    const exactDue = clamp(ageOf(rolls, roll) / 10);
    const prefixDue = clamp(prefixAgeOf(rolls, prefix) / 8);
    const zDue = clamp(zAgeInPrefix(rolls, prefix, z) / 8);
    const transition = transitionScore(rolls, roll);
    const prefixTransition = prefixTransitionScore(rolls, prefix, z);
    const currentLaneBoost = prefix === lastPrefix ? (previewPrefix ? previewWeights.currentLane : globalWeights.currentLane) : 0;
    const previewBoost = prefix === previewPrefix ? previewWeights.previewBoost : 0;
    const targetBoost = targetPrefixes.has(prefix) ? (previewPrefix ? previewWeights.targetBoost : globalWeights.targetBoost) : 0;
    const liveDataBoost = liveRolls.length >= minLiveForStandalone ? (previewPrefix ? previewWeights.liveDataBoost : globalWeights.liveDataBoost) : 0;
    const rankScore =
      xySupport * (previewPrefix ? previewWeights.xySupport : globalWeights.xySupport) +
      exactFreq * (previewPrefix ? previewWeights.exactFreq : globalWeights.exactFreq) +
      localZFreq * (previewPrefix ? (localSampleSmall ? previewWeights.localZFreqSmall : previewWeights.localZFreqLarge) : globalWeights.localZFreq) +
      localZRarity * (previewPrefix ? (localSampleSmall ? previewWeights.localZRaritySmall : previewWeights.localZRarityLarge) : globalWeights.localZRarity) +
      prefixFreq * (previewPrefix ? previewWeights.prefixFreq : globalWeights.prefixFreq) +
      zFreq * (previewPrefix ? previewWeights.zFreq : globalWeights.zFreq) +
      exactDue * (previewPrefix ? previewWeights.exactDue : globalWeights.exactDue) +
      prefixDue * (previewPrefix ? previewWeights.prefixDue : globalWeights.prefixDue) +
      zDue * (previewPrefix ? previewWeights.zDue : globalWeights.zDue) +
      transition.score * (previewPrefix ? previewWeights.transition : globalWeights.transition) +
      prefixTransition.score * (previewPrefix ? previewWeights.prefixTransition : globalWeights.prefixTransition) +
      currentLaneBoost +
      previewBoost +
      targetBoost +
      liveDataBoost +
      liveExactPresence * (previewPrefix ? previewWeights.liveExactHit : globalWeights.liveExactHit) -
      activeZeroHitPenalty;
    const score = clamp(rankScore);
    return {
      roll,
      prefix,
      z,
      score,
      rankScore,
      exactCount: exactCounts[roll] || 0,
      liveExactCount,
      localZFreq,
      localZRarity,
      prefixCount: prefixCounts[prefix] || 0,
      zCount: zCounts[z] || 0,
      age: ageOf(rolls, roll),
      prefixAge: prefixAgeOf(rolls, prefix),
      zAge: zAgeInPrefix(rolls, prefix, z),
      xySupport,
      transition,
      prefixTransition,
      target: targetPrefixes.has(prefix),
    };
  }).sort((a, b) => b.rankScore - a.rankScore || b.exactCount - a.exactCount || a.roll.localeCompare(b.roll));

  const activeCandidates = previewPrefix
    ? candidates.filter((candidate) => candidate.prefix === previewPrefix)
    : candidates;

  const prefixSummary = PREFIXES.map((prefix) => {
    const exacts = Z_DIGITS.map((z) => `${prefix}${z}`).map((roll) => ({
      roll,
      count: exactCounts[roll] || 0,
      candidate: candidates.find((candidate) => candidate.roll === roll),
    })).sort((a, b) => b.count - a.count || b.candidate.score - a.candidate.score);
    return {
      prefix,
      count: prefixCounts[prefix] || 0,
      age: prefixAgeOf(rolls, prefix),
      top: exacts.slice(0, 2),
    };
  }).sort((a, b) => b.count - a.count || a.age - b.age || a.prefix.localeCompare(b.prefix));

  return {
    valid: rolls.length >= 3,
    rollCount: rolls.length,
    recent,
    xyRows,
    targetPrefixes: [...targetPrefixes],
    candidates,
    activeCandidates,
    prediction: activeCandidates[0]?.roll || null,
    alt: activeCandidates[1]?.roll || null,
    watch: activeCandidates[2]?.roll || null,
    exactCounts,
    prefixCounts,
    zCounts,
    prefixSummary,
    liveRollCount: liveRolls.length,
    seedRollCount: seedRolls.length,
    seedWeight,
    previewPrefix,
    warmup: liveRolls.length < minLiveForStandalone,
  };
}


