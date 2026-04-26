/**
 * Pair Transition Predictor - Experimental Mode
 * 
 * This module implements an alternative prediction strategy using:
 * 1. Pair transition matrix (what comes after X?)
 * 2. Wave detection signals (run length, noise bursts, flip probability)
 * 3. Trend tracking (rising/falling/stable for each value)
 * 
 * Designed to be tested alongside the existing BBP predictor for A/B comparison.
 */

const VALUES = ['41', '42', '43', '44'];
const VALUE_PAIRS = [
  ['41', '42'],
  ['41', '43'],
  ['41', '44'],
  ['42', '43'],
  ['42', '44'],
  ['43', '44'],
];

const SVAROG_FITTED_CHOOSER_WEIGHTS = {
  base: 0.2447,
  seq: 0.5819,
  refined: 0.2207,
  exact: -0.0101,
  common: 0.0611,
  noise: 0.1832,
  support: 0.0009,
  carry: 0.1286,
  pair2: 0.1324,
  pair3: 0.3301,
  follow2: 0.1533,
  follow3: 0.2287,
  trust: 0.0040,
  latent: -0.0325,
  share: 0.0358,
  motif: 0.0001,
  isCommon: 4.5768,
  isNoise: 4.7467,
};

const GLOBAL_PAIR2_PRIORS = {
  '41,41': { '41': 9, '42': 0, '43': 55, '44': 36 },
  '41,42': { '41': 0, '42': 33, '43': 50, '44': 17 },
  '41,43': { '41': 30, '42': 35, '43': 13, '44': 22 },
  '41,44': { '41': 29, '42': 29, '43': 21, '44': 21 },
  '42,41': { '41': 36, '42': 21, '43': 29, '44': 14 },
  '42,42': { '41': 20, '42': 35, '43': 10, '44': 35 },
  '42,43': { '41': 29, '42': 0, '43': 35, '44': 35 },
  '42,44': { '41': 17, '42': 28, '43': 22, '44': 33 },
  '43,41': { '41': 7, '42': 33, '43': 40, '44': 20 },
  '43,42': { '41': 40, '42': 7, '43': 27, '44': 27 },
  '43,43': { '41': 17, '42': 17, '43': 25, '44': 42 },
  '43,44': { '41': 24, '42': 43, '43': 19, '44': 14 },
  '44,41': { '41': 21, '42': 21, '43': 37, '44': 21 },
  '44,42': { '41': 18, '42': 36, '43': 23, '44': 23 },
  '44,43': { '41': 8, '42': 42, '43': 8, '44': 42 },
  '44,44': { '41': 54, '42': 31, '43': 8, '44': 8 },
};
const GLOBAL_PAIR3_PRIORS = {
  '41,41,43': { '41': 13, '42': 63, '43': 25, '44': 0 },
  '41,42,43': { '41': 50, '42': 0, '43': 0, '44': 50 },
  '41,43,41': { '41': 0, '42': 75, '43': 25, '44': 0 },
  '41,43,42': { '41': 25, '42': 25, '43': 0, '44': 50 },
  '41,43,43': { '41': 67, '42': 0, '43': 33, '44': 0 },
  '41,44,43': { '41': 0, '42': 50, '43': 0, '44': 50 },
  '42,41,43': { '41': 75, '42': 25, '43': 0, '44': 0 },
  '42,43,42': { '41': 0, '42': 0, '43': 100, '44': 0 },
  '42,43,43': { '41': 0, '42': 0, '43': 100, '44': 0 },
  '42,43,44': { '41': 17, '42': 67, '43': 17, '44': 0 },
  '42,44,43': { '41': 0, '42': 25, '43': 25, '44': 50 },
  '43,41,43': { '41': 50, '42': 25, '43': 25, '44': 0 },
  '43,41,41': { '41': 0, '42': 0, '43': 100, '44': 0 },
  '43,42,41': { '41': 0, '42': 33, '43': 33, '44': 33 },
  '43,42,42': { '41': 25, '42': 50, '43': 0, '44': 25 },
  '43,42,43': { '41': 25, '42': 25, '43': 38, '44': 13 },
  '43,42,44': { '41': 20, '42': 0, '43': 40, '44': 40 },
  '43,43,41': { '41': 0, '42': 0, '43': 50, '44': 50 },
  '43,43,42': { '41': 33, '42': 33, '43': 0, '44': 33 },
  '43,43,43': { '41': 22, '42': 33, '43': 11, '44': 33 },
  '43,43,44': { '41': 0, '42': 43, '43': 0, '44': 57 },
  '43,44,42': { '41': 29, '42': 29, '43': 29, '44': 14 },
  '43,44,43': { '41': 0, '42': 33, '43': 0, '44': 67 },
  '43,44,44': { '41': 50, '42': 50, '43': 0, '44': 0 },
  '44,41,42': { '41': 0, '42': 50, '43': 25, '44': 25 },
  '44,42,41': { '41': 40, '42': 40, '43': 20, '44': 0 },
  '44,43,42': { '41': 60, '42': 20, '43': 20, '44': 0 },
  '44,43,43': { '41': 0, '42': 25, '43': 25, '44': 50 },
  '44,43,44': { '41': 50, '42': 0, '43': 50, '44': 0 },
  '44,44,41': { '41': 40, '42': 40, '43': 20, '44': 0 },
};
const GLOBAL_PAIR1_PRIORS = {
  '41': { '41': 18, '42': 20, '43': 38, '44': 23 },
  '42': { '41': 20, '42': 29, '43': 25, '44': 26 },
  '43': { '41': 23, '42': 23, '43': 20, '44': 33 },
  '44': { '41': 29, '42': 33, '43': 18, '44': 20 },
};

function normalizePredictorRegion(region) {
  const key = String(region || '').trim().toUpperCase();
  if (key === 'EU' || key === 'EUROPE') return 'EU';
  if (key === 'ASIA' || key === 'APAC') return 'ASIA';
  if (key === 'NA' || key === 'AMERICA' || key === 'AMERICAS' || key === 'USA') return 'NA';
  return 'NA';
}

function resolvePredictorRegion(region) {
  if (region) return normalizePredictorRegion(region);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('hsr-rng-session-v6');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.region) return normalizePredictorRegion(parsed.region);
      }
    } catch (error) {
      // Ignore storage parsing issues and fall back to default region.
    }
  }
  return 'NA';
}

function getPredictorProfile(region) {
  const normalizedRegion = resolvePredictorRegion(region);
  if (normalizedRegion === 'EU') {
    return {
      region: normalizedRegion,
      noiseBurstRate: 0.32,
      transitionShift: 0.16,
      chaosNoiseRate: 0.34,
      flatBand: 14,
      noiseRisingCount: 2,
      outsiderPromotion: 11,
      pairGapSafe: 22,
      pairGapCaution: 10,
      noiseRiskBias: 8,
    };
  }
  if (normalizedRegion === 'ASIA') {
    return {
      region: normalizedRegion,
      noiseBurstRate: 0.44,
      transitionShift: 0.22,
      chaosNoiseRate: 0.44,
      flatBand: 16,
      noiseRisingCount: 3,
      outsiderPromotion: 7,
      pairGapSafe: 18,
      pairGapCaution: 8,
      noiseRiskBias: -3,
    };
  }
  return {
    region: normalizedRegion,
    noiseBurstRate: 0.40,
    transitionShift: 0.20,
    chaosNoiseRate: 0.40,
    flatBand: 15,
    noiseRisingCount: 3,
    outsiderPromotion: 8,
    pairGapSafe: 18,
    pairGapCaution: 8,
    noiseRiskBias: 0,
  };
}

function scoreTrustedPairs({
  rolls,
  distribution,
  fullDistribution,
  trends,
  momentumScores,
  matrix,
  lastRoll,
  commons,
  noise,
  noiseRising,
  regime,
  profile,
}) {
  const recent2 = rolls.slice(-2);
  const recent4 = rolls.slice(-4);
  const recent6Dist = getDistribution(rolls.slice(-6));
  const recent10Dist = getDistribution(rolls.slice(-10));
  const maxMomentum = Math.max(...VALUES.map(v => momentumScores[v] || 0), 0.01);

  const pairScores = VALUE_PAIRS.map((pair) => {
    const pairKey = pair.join('/');
    const localRecent = pair.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0);
    const localWindow = pair.reduce((sum, value) => sum + (recent10Dist[value] || 0), 0);
    const sessionPct = pair.reduce((sum, value) => sum + (distribution[value] || 0), 0);
    const fullPct = pair.reduce((sum, value) => sum + (fullDistribution[value] || 0), 0);
    const pairTransition = pair.reduce((sum, value) => sum + (matrix[lastRoll]?.[value]?.pct || 0), 0);
    const trust = pair.reduce((sum, value) => sum + (trends[value]?.trustScore ?? 0.6), 0) / pair.length;
    const freshness = pair.reduce((sum, value) => sum + (trends[value]?.arrowWeight ?? 1), 0) / pair.length;
    const momentum = pair.reduce((sum, value) => sum + ((momentumScores[value] || 0) / maxMomentum) * 100, 0) / pair.length;

    let score =
      localRecent * 0.56 +
      localWindow * 0.18 +
      sessionPct * 0.08 +
      fullPct * 0.03 +
      pairTransition * 0.18;

    score += momentum * 0.18;
    score += trust * 12;
    score += freshness * 7;

    const commonsCount = pair.filter(value => commons.includes(value)).length;
    const noiseCount = pair.filter(value => noise.includes(value)).length;
    const outsiderValues = pair.filter(value => noise.includes(value));
    const outsiderSingletonCount = outsiderValues.filter((value) => rolls.filter((roll) => roll === value).length <= 1).length;
    const outsiderRecentPeak = outsiderValues.reduce((max, value) => Math.max(max, recent6Dist[value] || 0), 0);
    const outsiderRecent4Peak = outsiderValues.reduce((max, value) => {
      const recentHits = recent4.filter(r => r === value).length;
      return Math.max(max, recentHits);
    }, 0);
    if (commonsCount === 2) score += regime === 'stable' ? 8 : 3;
    if (noiseCount > 0 && regime !== 'stable') {
      if (outsiderRecentPeak >= 25 || outsiderRecent4Peak >= 2) score += noiseCount * profile.outsiderPromotion;
      else score += noiseCount * Math.max(2, Math.round(profile.outsiderPromotion * 0.35));
    }
    if (pair.some(value => noiseRising.includes(value))) {
      if (outsiderRecentPeak >= 25 || outsiderRecent4Peak >= 2) score += profile.outsiderPromotion + 4;
      else score += 3;
    }
    if (
      commonsCount === 2 &&
      pair.every(value => (recent6Dist[value] || 0) >= 25)
    ) {
      score += regime === 'stable' ? 9 : 5;
    }
    if (
      rolls.length >= 6 &&
      regime === 'stable' &&
      commonsCount === 1 &&
      noiseCount === 1 &&
      outsiderSingletonCount > 0 &&
      outsiderRecent4Peak <= 1
    ) {
      score -= 10 * outsiderSingletonCount;
    }
    if (pair.every(value => (trends[value]?.direction || 'stable') === 'rising')) score += 6;
    if (pair.every(value => (trends[value]?.direction || 'stable') === 'falling')) score -= 10;

    return { pair, pairKey, score };
  }).sort((a, b) => b.score - a.score);

  let trustedPair = pairScores[0]?.pair || commons;
  let noisePair = VALUES.filter(value => !trustedPair.includes(value));
  let runnerUpPair = pairScores[1]?.pair || noisePair;
  const currentCommonsKey = [...commons].sort().join('/');
  const currentCommonsPairScore = pairScores.find((entry) => entry.pair.join('/') === currentCommonsKey) || null;
  const topPairOverlapWithCommons = trustedPair.filter((value) => commons.includes(value)).length;
  const topPairSingletonNoiseCount = trustedPair.filter(
    (value) => noise.includes(value) && rolls.filter((roll) => roll === value).length <= 1
  ).length;
  const currentCommonsBacked =
    commons.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0) >= 40 ||
    commons.includes(lastRoll);
  const shouldPreserveAdaptiveCommons =
    rolls.length >= 6 &&
    topPairOverlapWithCommons < 2 &&
    currentCommonsBacked &&
    !!currentCommonsPairScore &&
    currentCommonsPairScore.score >= (
      (pairScores[0]?.score || 0) -
      (
        commons.includes(lastRoll) && regime === 'stable'
          ? 30
          : 16
      )
    ) &&
    (
      topPairSingletonNoiseCount > 0 ||
      !trustedPair.includes(lastRoll)
    );
  if (shouldPreserveAdaptiveCommons) {
    trustedPair = [...commons].sort();
    noisePair = VALUES.filter(value => !trustedPair.includes(value));
    runnerUpPair = pairScores.find(entry => entry.pair.join('/') !== trustedPair.join('/'))?.pair || noisePair;
  }
  const scoreGap = (pairScores[0]?.score || 0) - (pairScores[1]?.score || 0);
  let tailRunLength = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === lastRoll) tailRunLength++;
    else break;
  }
  const outsiderSignals = noisePair.map((value) => {
    const recent = recent6Dist[value] || 0;
    const recent2Hits = recent2.filter(r => r === value).length;
    const recent4Hits = recent4.filter(r => r === value).length;
    const rollsAgo = (() => {
      for (let i = rolls.length - 1; i >= 0; i--) {
        if (rolls[i] === value) return rolls.length - 1 - i;
      }
      return -1;
    })();
    const trust = (trends[value]?.trustScore ?? 0.25) * 20;
    const freshness = (trends[value]?.arrowWeight ?? 0.4) * 12;
    const momentum = ((momentumScores[value] || 0) / maxMomentum) * 20;
    const pairPct = matrix[lastRoll]?.[value]?.pct || 0;
    const direction = trends[value]?.direction || 'stable';
    const totalCount = rolls.filter(r => r === value).length;
    const recencyMultiplier =
      rollsAgo < 0 ? 0.04 :
      rollsAgo <= 1 ? 1.0 :
      rollsAgo === 2 ? 0.72 :
      rollsAgo === 3 ? 0.45 :
      0.18;
    const score =
      (recent * 0.8 +
      recent2Hits * 16 +
      recent4Hits * 8 +
      trust +
      freshness +
      momentum +
      pairPct * 0.35 +
      (direction === 'rising' ? 10 : direction === 'stable' ? 3 : 0)) * recencyMultiplier;
    return { value, score, recent2Hits, recent4Hits, rollsAgo, direction, totalCount };
  }).sort((a, b) => b.score - a.score);
  const outsiderPressure = outsiderSignals.reduce((sum, item) => sum + item.score, 0) / Math.max(outsiderSignals.length, 1);
  const freshOutsider = outsiderSignals[0] || null;
  const mixedWindow = new Set(rolls.slice(-6)).size >= 3;

  const buildTrustedSignals = (pairValues) => pairValues.map((value) => {
    const recent = recent6Dist[value] || 0;
    const recent2Hits = recent2.filter(r => r === value).length;
    const recent4Hits = recent4.filter(r => r === value).length;
    const trust = (trends[value]?.trustScore ?? 0.6) * 20;
    const freshness = (trends[value]?.arrowWeight ?? 0.6) * 12;
    const momentum = ((momentumScores[value] || 0) / maxMomentum) * 20;
    const pairPct = matrix[lastRoll]?.[value]?.pct || 0;
    const direction = trends[value]?.direction || 'stable';
    const score =
      recent +
      recent2Hits * 14 +
      recent4Hits * 7 +
      trust +
      freshness +
      momentum +
      pairPct * 0.25 +
      (direction === 'rising' ? 8 : direction === 'stable' ? 3 : -4);
    return { value, score, recent, direction };
  }).sort((a, b) => b.score - a.score);

  let trustedSignals = buildTrustedSignals(trustedPair);

  let weakestTrusted = trustedSignals[trustedSignals.length - 1];
  let strongestTrusted = trustedSignals[0];
  let weakestTrustedRecent = weakestTrusted ? (recent6Dist[weakestTrusted.value] || 0) : 0;
  let weakestTrustedRecent2Hits = weakestTrusted ? recent2.filter(r => r === weakestTrusted.value).length : 0;
  const outsiderRecent = freshOutsider ? (recent6Dist[freshOutsider.value] || 0) : 0;
  const outsiderHasCaughtWeakCommon =
    outsiderRecent >= weakestTrustedRecent ||
    (
      freshOutsider?.recent2Hits >= 2 &&
      weakestTrusted?.direction === 'falling' &&
      weakestTrustedRecent <= 34
    );
  const outsiderCanPivot = !!freshOutsider && !!weakestTrusted && (
    freshOutsider.recent2Hits >= 2 ||
    freshOutsider.recent4Hits >= 2 ||
    (
      freshOutsider.recent2Hits >= 1 &&
      freshOutsider.direction === 'rising' &&
      freshOutsider.rollsAgo <= 1
    )
  );
  const outsiderPivotConfirmed =
    !freshOutsider
      ? false
      : rolls.length < 6
        ? outsiderCanPivot
        : (
            freshOutsider.recent2Hits >= 2 ||
            (
              freshOutsider.recent4Hits >= 2 &&
              (
                freshOutsider.totalCount >= 2 ||
                freshOutsider.direction === 'rising'
              )
            ) ||
            (
              freshOutsider.recent2Hits >= 1 &&
              freshOutsider.direction === 'rising' &&
              freshOutsider.rollsAgo <= 1 &&
              freshOutsider.totalCount >= 2
            )
          );
  if (
    outsiderPivotConfirmed &&
    strongestTrusted &&
    freshOutsider.value !== strongestTrusted.value &&
    freshOutsider.score >= weakestTrusted.score + 18 &&
    outsiderHasCaughtWeakCommon &&
    weakestTrustedRecent <= 34 &&
    weakestTrustedRecent2Hits === 0 &&
    (
      freshOutsider.recent2Hits >= 2 ||
      (freshOutsider.recent4Hits >= 2 && freshOutsider.direction === 'rising')
    ) &&
    (mixedWindow || regime !== 'stable' || scoreGap <= profile.pairGapCaution)
  ) {
    trustedPair = [strongestTrusted.value, freshOutsider.value].sort();
    noisePair = VALUES.filter(value => !trustedPair.includes(value));
    runnerUpPair = pairScores.find(entry => entry.pair.join('/') !== trustedPair.join('/'))?.pair || noisePair;
    trustedSignals = buildTrustedSignals(trustedPair);
    weakestTrusted = trustedSignals[trustedSignals.length - 1];
    strongestTrusted = trustedSignals[0];
    weakestTrustedRecent = weakestTrusted ? (recent6Dist[weakestTrusted.value] || 0) : 0;
    weakestTrustedRecent2Hits = weakestTrusted ? recent2.filter(r => r === weakestTrusted.value).length : 0;
  }

  const recentNoiseShare = noisePair.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0);
  let noiseRisk = Math.round(
    recentNoiseShare * 0.55 +
    outsiderPressure * 0.45 +
    (regime === 'noise-burst' ? 18 : regime === 'transition' ? 10 : 0) +
    profile.noiseRiskBias
  );
  if (mixedWindow) noiseRisk += 10;
  if (freshOutsider?.recent2Hits >= 1) noiseRisk += 12;
  else if (freshOutsider?.recent4Hits >= 1) noiseRisk += 6;
  if (freshOutsider?.recent4Hits >= 2) noiseRisk += 10;
  if (freshOutsider?.direction === 'rising' && freshOutsider?.rollsAgo <= 2) noiseRisk += 8;
  if (regime === 'stable' && tailRunLength >= 3 && (freshOutsider?.rollsAgo ?? 99) > 2) noiseRisk -= 10;
  noiseRisk = Math.max(0, Math.min(100, noiseRisk));

  let pairSafety = 'danger';
  const safeThreshold = mixedWindow ? profile.pairGapSafe + 6 : profile.pairGapSafe;
  const cautionThreshold = mixedWindow ? profile.pairGapCaution + 4 : profile.pairGapCaution;
  const freshOutsiderHot = !!freshOutsider && (
    freshOutsider.recent2Hits >= 1 ||
    freshOutsider.recent4Hits >= 2 ||
    (freshOutsider.recent4Hits >= 1 && freshOutsider.direction === 'rising' && freshOutsider.rollsAgo <= 2)
  );
  if (!freshOutsiderHot && scoreGap >= safeThreshold && noiseRisk <= 28) pairSafety = 'safe';
  else if (scoreGap >= cautionThreshold && noiseRisk <= 56 && !freshOutsiderHot) pairSafety = 'caution';
  else if (scoreGap >= safeThreshold + 4 && noiseRisk <= 44 && freshOutsider?.recent4Hits === 0) pairSafety = 'caution';

  const staleTrustedCount = trustedPair.filter((value) => {
    const direction = trends[value]?.direction || 'stable';
    const arrowWeight = trends[value]?.arrowWeight ?? 1;
    const trust = trends[value]?.trustScore ?? 0.6;
    return direction === 'falling' || arrowWeight <= 0.4 || trust <= 0.4;
  }).length;
  const fallingTrustedCount = trustedPair.filter((value) => (trends[value]?.direction || 'stable') === 'falling').length;
  const top2Share = trustedPair.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0);
  const pairAge = trustedPair.reduce((minCount, value) => {
    const occurrences = rolls.filter((roll) => roll === value).length;
    return Math.min(minCount, occurrences);
  }, Infinity);
  const freshOutsiderLead = freshOutsider && strongestTrusted ? Math.round((freshOutsider.score || 0) - (strongestTrusted.score || 0)) : 0;

  return {
    trustedPair,
    noisePair,
    runnerUpPair,
    scoreGap,
    pairSafety,
    noiseRisk,
    pairScores,
    outsiderPressure,
    mixedWindow,
    freshOutsider,
    staleTrustedCount,
    fallingTrustedCount,
    top2Share,
    pairAge: Number.isFinite(pairAge) ? pairAge : 0,
    freshOutsiderLead,
  };
}

function scoreRunBreakCandidate({
  candidate,
  lastRoll,
  matrix,
  trends,
  distribution,
  momentumScores,
  recent6Dist,
  recent4,
  lastSeen,
  avgObservedRunLen,
  avgNoiseGap,
}) {
  const pairPct = matrix[lastRoll]?.[candidate]?.pct || 0;
  const trust = trends[candidate]?.trustScore ?? 0.45;
  const direction = trends[candidate]?.direction || 'stable';
  const arrowWeight = trends[candidate]?.arrowWeight ?? 0.5;
  const momentum = momentumScores[candidate] || 0;
  const recent = recent6Dist[candidate] || 0;
  const recent4Hits = recent4.filter(r => r === candidate).length;
  const seenAgo = lastSeen[candidate];
  const expectedGap = Math.max(
    2,
    Math.round(
      avgNoiseGap !== null && avgNoiseGap !== undefined
        ? avgNoiseGap
        : avgObservedRunLen * 1.5
    )
  );
  const absenceGap = seenAgo >= 0 ? seenAgo : 0;
  const absenceScore = seenAgo >= 0 ? Math.min(absenceGap, expectedGap * 2) * 2.5 : 0;
  const overdueBoost = seenAgo >= Math.round(expectedGap * 1.5) ? 20 : 0;
  const recencyBoost =
    seenAgo === 0 ? 18 :
    seenAgo === 1 ? 12 :
    seenAgo === 2 ? 7 :
    seenAgo === 3 ? 3 :
    seenAgo >= 0 ? 0 : -12;
  return (
    pairPct * 1.5 +
    absenceScore +
    overdueBoost +
    recent * 0.45 +
    recent4Hits * 10 +
    (distribution[candidate] || 0) * 0.15 +
    trust * 18 +
    arrowWeight * 10 +
    momentum * 18 +
    (direction === 'rising' ? 12 : direction === 'stable' ? 3 : -5) +
    recencyBoost
  );
}

function getBreakRiskPercent(currentRunLen, avgObservedRunLen, regime, freshOutsider = null) {
  const baseAvg = Math.max(avgObservedRunLen || 2.5, 1);
  const exhaustionRatio = currentRunLen / baseAvg;
  let risk =
    exhaustionRatio < 0.8 ? 25 :
    exhaustionRatio < 1.2 ? 42 :
    exhaustionRatio < 1.6 ? 58 :
    exhaustionRatio < 2.0 ? 70 :
    82;

  if (regime === 'transition') risk += 6;
  else if (regime === 'noise-burst') risk += 12;

  if (freshOutsider?.recent2Hits >= 1) risk += 8;
  else if (freshOutsider?.recent4Hits >= 1) risk += 4;
  if (freshOutsider?.direction === 'rising' && (freshOutsider?.rollsAgo ?? 99) <= 2) risk += 6;

  return Math.max(0, Math.min(100, Math.round(risk)));
}

function buildLocalMotifScores(rolls) {
  const scores = Object.fromEntries(VALUES.map((value) => [value, 0]));
  if (!Array.isArray(rolls) || rolls.length < 4) return scores;

  const lengths = [
    { len: 4, weight: 1.7 },
    { len: 3, weight: 1.25 },
    { len: 2, weight: 0.9 },
  ];

  for (const { len, weight } of lengths) {
    if (rolls.length <= len) continue;
    const tail = rolls.slice(-len).join(',');
    for (let i = 0; i <= rolls.length - len - 1; i++) {
      const window = rolls.slice(i, i + len).join(',');
      if (window !== tail) continue;
      const nextValue = rolls[i + len];
      if (!VALUES.includes(nextValue)) continue;
      const recencySteps = (rolls.length - len - 1) - i;
      const recencyBoost =
        recencySteps <= 1 ? 1.35 :
        recencySteps <= 3 ? 1.15 :
        recencySteps <= 6 ? 1.0 :
        0.82;
      scores[nextValue] += weight * recencyBoost;
    }
  }

  const maxScore = Math.max(...Object.values(scores), 0);
  if (maxScore <= 0) return scores;

  return Object.fromEntries(
    Object.entries(scores).map(([value, raw]) => [value, Math.round((raw / maxScore) * 100)])
  );
}

const HIGH_CONFIDENCE_TAIL_PROFILES = {
  '4|43,42,43,42': { target: '43', confidence: 100, total: 4 },
  '4|42,44,43,42': { target: '41', confidence: 100, total: 3 },
  '4|42,43,43,43': { target: '44', confidence: 100, total: 2 },
  '4|43,43,43,44': { target: '42', confidence: 100, total: 2 },
  '4|43,43,44,42': { target: '42', confidence: 100, total: 2 },
  '4|43,44,43,44': { target: '41', confidence: 100, total: 2 },
  '4|43,42,44,43': { target: '42', confidence: 100, total: 2 },
  '4|44,43,42,42': { target: '41', confidence: 100, total: 2 },
  '4|43,42,42,41': { target: '43', confidence: 100, total: 2 },
  '4|42,41,43,43': { target: '44', confidence: 100, total: 2 },
  '4|41,43,43,44': { target: '43', confidence: 100, total: 2 },
  '4|44,43,42,41': { target: '43', confidence: 67, total: 3 },
  '5|42,43,43,43,44': { target: '42', confidence: 100, total: 2 },
  '5|42,43,43,44,43': { target: '42', confidence: 67, total: 3 },
  '5|43,42,44,43,42': { target: '41', confidence: 100, total: 2 },
  '5|43,44,43,44,43': { target: '44', confidence: 100, total: 2 },
  '5|44,43,44,43,44': { target: '41', confidence: 100, total: 2 },
  '5|44,43,42,44,43': { target: '42', confidence: 100, total: 2 },
  '5|44,43,42,42,41': { target: '43', confidence: 100, total: 2 },
  '5|42,44,43,42,41': { target: '43', confidence: 67, total: 3 },
  '5|43,43,44,43,43': { target: '42', confidence: 67, total: 3 },
};

const HIGH_CONFIDENCE_SHAPE_PROFILES = {
  '4|A,B,C,B': { target: 'C', confidence: 100, total: 7 },
  '5|A,B,C,A,C': { target: 'A', confidence: 100, total: 4 },
  '5|A,B,B,B,A': { target: 'A', confidence: 100, total: 3 },
  '5|A,B,C,D,A': { target: 'D', confidence: 100, total: 3 },
  '5|A,B,C,D,C': { target: 'D', confidence: 100, total: 3 },
  '5|A,B,B,A,C': { target: 'B', confidence: 75, total: 4 },
  '5|A,B,B,C,A': { target: 'A', confidence: 67, total: 3 },
  '5|A,A,B,C,A': { target: 'C', confidence: 67, total: 3 },
  '5|A,B,A,A,C': { target: 'A', confidence: 67, total: 3 },
  '6|A,B,A,C,B,D': { target: 'A', confidence: 100, total: 3 },
  '6|A,B,C,A,D,B': { target: 'D', confidence: 100, total: 3 },
  '6|A,B,C,D,A,D': { target: 'A', confidence: 100, total: 3 },
  '6|A,B,B,A,C,B': { target: 'C', confidence: 67, total: 3 },
};

function canonicalizeProfileSequence(seq) {
  const map = new Map();
  const symbols = ['A', 'B', 'C', 'D'];
  let idx = 0;
  const shape = seq.map((value) => {
    if (!map.has(value)) map.set(value, symbols[idx++] || `X${idx}`);
    return map.get(value);
  });
  const reverse = Object.fromEntries([...map.entries()].map(([value, symbol]) => [symbol, value]));
  return { shape, reverse };
}

function getTailProfileMatch(rolls) {
  if (!Array.isArray(rolls) || rolls.length < 4) return null;

  for (const len of [5, 4]) {
    if (rolls.length < len) continue;
    const key = `${len}|${rolls.slice(-len).join(',')}`;
    const match = HIGH_CONFIDENCE_TAIL_PROFILES[key];
    if (!match) continue;
    return {
      len,
      key,
      target: match.target,
      confidence: match.confidence,
      total: match.total,
    };
  }

  return null;
}

function getShapeProfileMatch(rolls) {
  if (!Array.isArray(rolls) || rolls.length < 4) return null;

  for (const len of [6, 5, 4]) {
    if (rolls.length < len) continue;
    const tail = rolls.slice(-len);
    const { shape, reverse } = canonicalizeProfileSequence(tail);
    const key = `${len}|${shape.join(',')}`;
    const match = HIGH_CONFIDENCE_SHAPE_PROFILES[key];
    if (!match) continue;
    const targetValue = reverse[match.target];
    if (!targetValue) continue;
    return {
      len,
      key,
      shape: shape.join(','),
      target: targetValue,
      confidence: match.confidence,
      total: match.total,
    };
  }

  return null;
}

function normalizeLocalScores(rawScores) {
  const maxScore = Math.max(...Object.values(rawScores), 0);
  if (maxScore <= 0) return Object.fromEntries(VALUES.map((value) => [value, 0]));
  return Object.fromEntries(
    VALUES.map((value) => [value, Math.round(((rawScores[value] || 0) / maxScore) * 100)])
  );
}

function buildRecentFollowerScores(rolls, lastRoll, last2Rolls, last3Rolls) {
  const directRaw = Object.fromEntries(VALUES.map((value) => [value, 0]));
  const pairRaw = Object.fromEntries(VALUES.map((value) => [value, 0]));
  const tripletRaw = Object.fromEntries(VALUES.map((value) => [value, 0]));

  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] !== lastRoll) continue;
    const nextValue = rolls[i + 1];
    const recencyWeight = 1 + ((i + 1) / rolls.length);
    directRaw[nextValue] += recencyWeight;
  }

  if (last2Rolls) {
    for (let i = 0; i < rolls.length - 2; i++) {
      if (`${rolls[i]},${rolls[i + 1]}` !== last2Rolls) continue;
      const nextValue = rolls[i + 2];
      const recencyWeight = 1.4 + ((i + 2) / rolls.length);
      pairRaw[nextValue] += recencyWeight;
    }
  }

  if (last3Rolls) {
    for (let i = 0; i < rolls.length - 3; i++) {
      if (`${rolls[i]},${rolls[i + 1]},${rolls[i + 2]}` !== last3Rolls) continue;
      const nextValue = rolls[i + 3];
      const recencyWeight = 1.7 + ((i + 3) / rolls.length);
      tripletRaw[nextValue] += recencyWeight;
    }
  }

  return {
    direct: normalizeLocalScores(directRaw),
    pair: normalizeLocalScores(pairRaw),
    triplet: normalizeLocalScores(tripletRaw),
  };
}

function scoreSvarogAnalyzerPicks({
  rolls,
  lastRoll,
  last2Rolls,
  matrix,
  matrix2gram,
  trends,
  momentumScores,
  commons,
  noise,
  noiseRising,
  distribution,
  shiftedToValue,
  patternShifted,
  alternatingPair,
  isAlternating,
  currentRunLen,
  freshOutsider,
  lastSeen,
  avgObservedRunLen,
  avgNoiseGap,
  commonsSinceNoise,
  regime,
}) {
  const recent6Dist = getDistribution(rolls.slice(-6));
  const recent4 = rolls.slice(-4);
  const recent2 = rolls.slice(-2);
  const recent8 = rolls.slice(-8);
  const recent8Dist = getDistribution(recent8);
  const motifScores = buildLocalMotifScores(rolls);
  const tailProfileMatch = getTailProfileMatch(rolls);
  const shapeProfileMatch = tailProfileMatch ? null : getShapeProfileMatch(rolls);
  const last3Rolls = rolls.length >= 3
    ? `${rolls[rolls.length - 3]},${rolls[rolls.length - 2]},${rolls[rolls.length - 1]}`
    : null;
  const recentFollowerScores = buildRecentFollowerScores(rolls, lastRoll, last2Rolls, last3Rolls);
  const maxMomentum = Math.max(...VALUES.map(v => momentumScores[v] || 0), 0.01);
  const pair2gramRow = last2Rolls ? matrix2gram?.[last2Rolls] : null;
  const expectedGap = Math.max(3, Math.round((avgObservedRunLen || 2.5) * 1.75));
  const commonPairAge = commons.reduce((minCount, value) => {
    const occurrences = rolls.filter((roll) => roll === value).length;
    return Math.min(minCount, occurrences);
  }, Infinity);
  const allowDormantRescue = rolls.length >= 8 && Number.isFinite(commonPairAge) && commonPairAge >= 3;
  const recentTop2Share = commons.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0);
  const noiseDueRatio = avgNoiseGap ? commonsSinceNoise / Math.max(avgNoiseGap, 1) : 0;
  const noiseTiming = !avgNoiseGap
    ? 'unknown'
    : noiseDueRatio >= 0.95
      ? 'due'
      : noiseDueRatio >= 0.55
      ? 'approaching'
        : 'not_due';
  const lastNoiseAgo = (() => {
    for (let i = rolls.length - 1; i >= 0; i -= 1) {
      if (noise.includes(rolls[i])) return rolls.length - 1 - i;
    }
    return -1;
  })();
  const recentNoiseHits4 = recent4.filter((value) => noise.includes(value)).length;
  const recentNoiseHits6 = rolls.slice(-6).filter((value) => noise.includes(value)).length;
  const repeatedRecentNoise = noise.find((value) => recent4.filter((r) => r === value).length >= 2) || null;
  const noiseRuns = [];
  if (rolls.length > 0) {
    let runValue = rolls[0];
    let runLen = 1;
    let runStart = 0;
    for (let i = 1; i <= rolls.length; i++) {
      const current = i < rolls.length ? rolls[i] : null;
      if (current === runValue) {
        runLen += 1;
      } else {
        if (noise.includes(runValue)) {
          noiseRuns.push({
            value: runValue,
            len: runLen,
            startIndex: runStart,
            endIndex: i - 1,
          });
        }
        runValue = current;
        runLen = 1;
        runStart = i;
      }
    }
  }
  const closedNoiseRuns = noiseRuns.filter((run) => run.endIndex < rolls.length - 1);
  const avgNoiseStreakLen = closedNoiseRuns.length
    ? closedNoiseRuns.reduce((sum, run) => sum + run.len, 0) / closedNoiseRuns.length
    : 1;
  const singleNoiseRate = closedNoiseRuns.length
    ? closedNoiseRuns.filter((run) => run.len === 1).length / closedNoiseRuns.length
    : 1;
  const multiNoiseRate = closedNoiseRuns.length
    ? closedNoiseRuns.filter((run) => run.len >= 2).length / closedNoiseRuns.length
    : 0;
  const noiseBeatStyle =
    singleNoiseRate >= 0.68 && avgNoiseStreakLen <= 1.35
      ? 'flash'
      : multiNoiseRate >= 0.4 || avgNoiseStreakLen >= 1.75
        ? 'sticky'
        : 'mixed';
  const flashNoiseSession = noiseBeatStyle === 'flash';
  const stickyNoiseSession = noiseBeatStyle === 'sticky';
  const commonRecoveryActive =
    avgNoiseGap != null &&
    commonsSinceNoise >= 1 &&
    commonsSinceNoise <= Math.max(avgNoiseGap + 3, 5) &&
    recentTop2Share >= 75 &&
    recentNoiseHits4 <= 1 &&
    !repeatedRecentNoise;
  const noiseBurstActive =
    recentNoiseHits4 >= 2 ||
    (!!freshOutsider?.value &&
      freshOutsider.value === lastRoll &&
      (
        (freshOutsider.recent2Hits || 0) >= 1 ||
        (freshOutsider.recent4Hits || 0) >= 2
      ));
  const noiseChargeActive =
    !commonRecoveryActive &&
    !noiseBurstActive &&
    avgNoiseGap != null &&
    noiseDueRatio >= 0.7;
  const siblingCommonValue = commons.includes(lastRoll)
    ? commons.find((value) => value !== lastRoll) || null
    : null;
  const siblingCommonTrend = siblingCommonValue ? (trends?.[siblingCommonValue] || null) : null;
  const siblingCommonSeenAgo = siblingCommonValue ? (lastSeen?.[siblingCommonValue] ?? -1) : -1;
  const siblingCommonShare = siblingCommonValue ? (recent6Dist?.[siblingCommonValue] || 0) : 0;
  const siblingCommonSupport = siblingCommonTrend?.supportScore ?? 0;
  const siblingCommonCarry = siblingCommonTrend?.recentCarryScore ?? 0;
  const siblingCommonPair1 = siblingCommonValue ? (matrix?.[lastRoll]?.[siblingCommonValue]?.pct || 0) : 0;
  const siblingCommonPair2 = siblingCommonValue ? (pair2gramRow?.[siblingCommonValue]?.pct || 0) : 0;
  const noiseAftermath = closedNoiseRuns.reduce((acc, run) => {
    const nextValue = rolls[run.endIndex + 1];
    if (nextValue == null) return acc;
    if (commons.includes(nextValue)) acc.common += 1;
    if (nextValue === siblingCommonValue) acc.sibling += 1;
    if (nextValue === run.value) acc.same += 1;
    return acc;
  }, { common: 0, sibling: 0, same: 0 });
  const postNoiseCommonRate = closedNoiseRuns.length ? noiseAftermath.common / closedNoiseRuns.length : 0;
  const postNoiseSiblingRate = closedNoiseRuns.length ? noiseAftermath.sibling / closedNoiseRuns.length : 0;
  const commonReturnArmed =
    !!siblingCommonValue &&
    currentRunLen >= (flashNoiseSession ? 2 : 3) &&
    recentTop2Share >= 70 &&
    recentNoiseHits4 <= 1 &&
    !repeatedRecentNoise &&
    (freshOutsider?.recent2Hits || 0) === 0 &&
    siblingCommonSeenAgo >= 1 &&
    siblingCommonSeenAgo <= Math.max(5, Math.round((avgNoiseGap || 2) + 3)) &&
    (
      siblingCommonShare >= 20 ||
      siblingCommonSupport >= 28 ||
      siblingCommonCarry >= 34 ||
      siblingCommonPair1 >= 20 ||
      siblingCommonPair2 >= 18
    );
  const commonReturnStrength = commonReturnArmed
    ? (
        12 +
        Math.max(0, Math.round((siblingCommonCarry - 30) * 0.10)) +
        Math.max(0, Math.round((siblingCommonSupport - 24) * 0.08)) +
        Math.max(0, Math.round((siblingCommonPair1 - 15) * 0.06)) +
        Math.max(0, Math.round((siblingCommonPair2 - 12) * 0.05)) +
        Math.max(0, Math.round((siblingCommonShare - 18) * 0.05))
      )
    : 0;
  const commonHoldActive =
    commonRecoveryActive &&
    commons.includes(lastRoll) &&
    currentRunLen >= 2 &&
    recentTop2Share >= 75 &&
    recentNoiseHits4 <= 1 &&
    !repeatedRecentNoise &&
    (freshOutsider?.recent2Hits || 0) === 0;
  const siblingBounceArmed =
    !!siblingCommonValue &&
    commons.includes(lastRoll) &&
    currentRunLen >= 2 &&
    recentTop2Share >= 66 &&
    recentNoiseHits4 <= 1 &&
    !repeatedRecentNoise &&
    (freshOutsider?.recent2Hits || 0) === 0 &&
    siblingCommonSeenAgo >= 1 &&
    siblingCommonSeenAgo <= Math.max(4, Math.round((avgNoiseGap || 2) + 2)) &&
    (
      siblingCommonShare >= 18 ||
      siblingCommonSupport >= 24 ||
      siblingCommonCarry >= 30 ||
      siblingCommonPair1 >= 16 ||
      siblingCommonPair2 >= 16
    );
  const siblingBounceStrength = siblingBounceArmed
    ? (
        8 +
        Math.max(0, Math.round((siblingCommonCarry - 28) * 0.10)) +
        Math.max(0, Math.round((siblingCommonSupport - 22) * 0.08)) +
        Math.max(0, Math.round((siblingCommonShare - 16) * 0.06)) +
        (flashNoiseSession ? 6 : 0) +
        (postNoiseSiblingRate >= 0.4 ? 6 : postNoiseSiblingRate >= 0.2 ? 3 : 0)
      )
    : 0;
  const noisePhase = commonRecoveryActive
    ? 'recovery'
    : noiseBurstActive
      ? 'burst'
      : noiseChargeActive
        ? 'charge'
        : 'idle';
  const commonDominantBoard =
    recentTop2Share >= 70 &&
    recentNoiseHits4 <= 1 &&
    !repeatedRecentNoise &&
    (
      flashNoiseSession ||
      commonRecoveryActive ||
      commonHoldActive ||
      postNoiseCommonRate >= 0.6
    );
  const noiseTriggerConfirmed =
    !!repeatedRecentNoise ||
    (
      !!freshOutsider?.value &&
      (
        (freshOutsider.recent2Hits || 0) >= 2 ||
        (freshOutsider.recent4Hits || 0) >= 2
      ) &&
      (freshOutsider.score || 0) >= 70
    ) ||
    (stickyNoiseSession && recentNoiseHits6 >= 3);
  const developingSession = rolls.length <= 8;
  const earlyCommonsBoard =
    developingSession &&
    recentTop2Share >= 60 &&
    commons.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0) >= 60;
  const earlyNoiseGateOpen =
    !!repeatedRecentNoise ||
    (
      !!freshOutsider?.value &&
      (
        (freshOutsider.recent2Hits || 0) >= 2 ||
        (freshOutsider.recent4Hits || 0) >= 2
      ) &&
      (freshOutsider.score || 0) >= 74
    );
  const effectiveCommonDominantBoard =
    commonDominantBoard ||
    (earlyCommonsBoard && !earlyNoiseGateOpen);
  const noiseProbeOnly =
    !noiseTriggerConfirmed &&
    (
      !!freshOutsider?.value ||
      noiseTiming === 'due' ||
      noiseTiming === 'approaching'
    );
  const staleCommons = commons.filter((value) => {
    const direction = trends?.[value]?.direction || 'stable';
    const arrowWeight = trends?.[value]?.arrowWeight ?? 1.0;
    const trust = trends?.[value]?.trustScore ?? 0.6;
    return direction === 'falling' || arrowWeight <= 0.4 || trust <= 0.4;
  }).length;
  const derivedLoopPair = (() => {
    const ranked = VALUES
      .map((value) => ({ value, pct: recent6Dist[value] || 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 2)
      .map((entry) => entry.value);
    return ranked.length === 2 ? ranked : null;
  })();
  const activeLoopPair = (isAlternating && alternatingPair?.length === 2)
    ? [...alternatingPair]
    : derivedLoopPair;
  const loopPairShare = activeLoopPair
    ? activeLoopPair.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0)
    : 0;
  const loopPairTransitions = activeLoopPair
    ? recent8.slice(1).reduce((sum, value, index) => {
        const prev = recent8[index];
        if (!activeLoopPair.includes(prev) || !activeLoopPair.includes(value)) return sum;
        return prev !== value ? sum + 1 : sum;
      }, 0)
    : 0;
  const localLoopActive =
    !!activeLoopPair &&
    loopPairShare >= 66 &&
    loopPairTransitions >= 2;
  const recent6Ranked = VALUES
    .map((value) => ({ value, pct: recent6Dist[value] || 0 }))
    .sort((a, b) => b.pct - a.pct);
  const recent6Window = rolls.slice(-6);
  const recent8Ranked = VALUES
    .map((value) => ({ value, pct: recent8Dist[value] || 0 }))
    .sort((a, b) => b.pct - a.pct);
  const activeTrio = (() => {
    if (recent8Ranked.length < 4) return null;
    const top3 = recent8Ranked.slice(0, 3);
    const fourth = recent8Ranked[3];
    const top3Share = top3.reduce((sum, entry) => sum + (entry.pct || 0), 0);
    const thirdPct = top3[2]?.pct || 0;
    const fourthPct = fourth?.pct || 0;
    const uniqueRecent8 = new Set(recent8).size;
    const recent8Transitions = recent8.slice(1).reduce((sum, value, index) => {
      const prev = recent8[index];
      if (!top3.some((entry) => entry.value === prev) || !top3.some((entry) => entry.value === value)) return sum;
      return prev !== value ? sum + 1 : sum;
    }, 0);
    if (top3Share >= 80 && thirdPct >= 18 && fourthPct <= 18 && uniqueRecent8 <= 3 && recent8Transitions >= 3) {
      return top3.map((entry) => entry.value);
    }
    return null;
  })();
  const mixedQuadActive = (() => {
    if (recent8Ranked.length < 4) return false;
    const top2Share = (recent8Ranked[0]?.pct || 0) + (recent8Ranked[1]?.pct || 0);
    const firstPct = recent8Ranked[0]?.pct || 0;
    const secondPct = recent8Ranked[1]?.pct || 0;
    const thirdPct = recent8Ranked[2]?.pct || 0;
    const fourthPct = recent8Ranked[3]?.pct || 0;
    return top2Share <= 70 && firstPct <= 38 && secondPct >= 18 && thirdPct >= 15 && fourthPct >= 8;
  })();
  const sequenceBoardActive =
    recent8.length >= 6 &&
    new Set(recent8).size <= 3;
  const tightPairValues = (() => {
    if (recent8Ranked.length < 2) return [];
    const top2Share = (recent8Ranked[0]?.pct || 0) + (recent8Ranked[1]?.pct || 0);
    const thirdPct = recent8Ranked[2]?.pct || 0;
    const uniqueRecent8 = new Set(recent8).size;
    if (top2Share >= 78 && thirdPct <= 20 && uniqueRecent8 <= 3) {
      return [recent8Ranked[0]?.value, recent8Ranked[1]?.value].filter(Boolean);
    }
    return [];
  })();
  const tightPairBoard = tightPairValues.length === 2;
  const mixedCycleBoard =
    !effectiveCommonDominantBoard &&
    !noiseTriggerConfirmed &&
    (
      (!!activeTrio && activeTrio.length === 3) ||
      (sequenceBoardActive && !tightPairBoard && !mixedQuadActive && recentTop2Share <= 75)
    );
  const recentBlocks = [];
  if (recent8.length > 0) {
    let blockValue = recent8[0];
    let blockLen = 1;
    for (let i = 1; i <= recent8.length; i++) {
      const current = i < recent8.length ? recent8[i] : null;
      if (current === blockValue) {
        blockLen++;
      } else {
        recentBlocks.push({ value: blockValue, len: blockLen });
        blockValue = current;
        blockLen = 1;
      }
    }
  }
  const sandwichReturnValue = (() => {
    if (recentBlocks.length < 3) return null;
    const a = recentBlocks[recentBlocks.length - 3];
    const b = recentBlocks[recentBlocks.length - 2];
    const c = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c) return null;
    if (a.len >= 2 && b.len === 1 && c.len >= 2 && a.value !== b.value && b.value !== c.value && a.value !== c.value) {
      return b.value;
    }
    return null;
  })();
  const preBlockReturnValue = (() => {
    if (recentBlocks.length < 3) return null;
    const a = recentBlocks[recentBlocks.length - 3];
    const b = recentBlocks[recentBlocks.length - 2];
    const c = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c) return null;
    if (b.len >= 2 && c.len >= 2 && b.value !== c.value && a.value !== b.value && a.value !== c.value) {
      return a.value;
    }
    return null;
  })();
  const bridgeReturnValue = (() => {
    if (recentBlocks.length < 3) return null;
    const a = recentBlocks[recentBlocks.length - 3];
    const b = recentBlocks[recentBlocks.length - 2];
    const c = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c) return null;
    if (a.len >= 2 && b.len === 1 && c.len >= 2 && a.value !== b.value && b.value !== c.value && a.value !== c.value) {
      return a.value;
    }
    return null;
  })();
  const missingFourthRotationValue = (() => {
    const uniqueRecent8 = [...new Set(recent8)];
    if (uniqueRecent8.length !== 3 || recentBlocks.length < 2) return null;
    const b = recentBlocks[recentBlocks.length - 2];
    const c = recentBlocks[recentBlocks.length - 1];
    if (!b || !c) return null;
    if (b.len < 2 || c.len < 2 || b.value === c.value) return null;
    return VALUES.find((value) => !uniqueRecent8.includes(value)) || null;
  })();
  const quadGapShockValue = (() => {
    const uniqueRecent8 = [...new Set(recent8)];
    if (uniqueRecent8.length !== 3 || recentBlocks.length < 4) return null;
    const a = recentBlocks[recentBlocks.length - 4];
    const b = recentBlocks[recentBlocks.length - 3];
    const c = recentBlocks[recentBlocks.length - 2];
    const d = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c || !d) return null;
    if (
      a.len === 1 &&
      b.len === 1 &&
      c.len >= 2 &&
      d.len >= 2 &&
      a.value !== b.value &&
      c.value !== d.value &&
      new Set([a.value, b.value, c.value, d.value]).size === 3
    ) {
      return VALUES.find((value) => !uniqueRecent8.includes(value)) || null;
    }
    return null;
  })();
  const cycleRestartValue = (() => {
    if (recent6Window.length < 6) return null;
    const uniqueRecent6 = [...new Set(recent6Window)];
    if (uniqueRecent6.length !== 3) return null;
    if (
      recent6Window[0] === recent6Window[4] &&
      recent6Window[1] === recent6Window[5] &&
      recent6Window[2] === recent6Window[3] &&
      recent6Window[0] !== recent6Window[1] &&
      recent6Window[1] !== recent6Window[2]
    ) {
      return recent6Window[0];
    }
    return null;
  })();
  const doubleBridgeEchoValue = (() => {
    if (recentBlocks.length < 5) return null;
    const a = recentBlocks[recentBlocks.length - 5];
    const b = recentBlocks[recentBlocks.length - 4];
    const c = recentBlocks[recentBlocks.length - 3];
    const d = recentBlocks[recentBlocks.length - 2];
    const e = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c || !d || !e) return null;
    if (a.len >= 2 && b.len === 1 && c.len >= 2 && d.len === 1 && e.len === 1 && b.value === d.value && a.value !== c.value) {
      return a.value;
    }
    return null;
  })();
  const doubleBridgeSwapValue = (() => {
    if (recentBlocks.length < 6) return null;
    const a = recentBlocks[recentBlocks.length - 6];
    const b = recentBlocks[recentBlocks.length - 5];
    const c = recentBlocks[recentBlocks.length - 4];
    const d = recentBlocks[recentBlocks.length - 3];
    const e = recentBlocks[recentBlocks.length - 2];
    const f = recentBlocks[recentBlocks.length - 1];
    if (!a || !b || !c || !d || !e || !f) return null;
    if (a.len >= 2 && b.len === 1 && c.len >= 2 && d.len === 1 && e.len === 1 && f.len >= 2 && b.value === d.value && a.value === f.value && a.value !== c.value) {
      return c.value;
    }
    return null;
  })();
  const recentRuns = [];
  if (rolls.length >= 4) {
    let runValue = rolls[0];
    let runStart = 0;
    for (let i = 1; i <= rolls.length; i++) {
      const current = i < rolls.length ? rolls[i] : null;
      if (current !== runValue) {
        recentRuns.push({
          value: runValue,
          len: i - runStart,
          endIndex: i - 1,
        });
        runValue = current;
        runStart = i;
      }
    }
  }
  const lastRecentBlock = recentBlocks[recentBlocks.length - 1] || null;
  const prevRecentBlock = recentBlocks[recentBlocks.length - 2] || null;
  const commonReclaimArmed =
    !!lastRecentBlock &&
    !!prevRecentBlock &&
    commons.includes(lastRecentBlock.value) &&
    commons.includes(prevRecentBlock.value) &&
    lastRecentBlock.value !== prevRecentBlock.value &&
    prevRecentBlock.len >= 3 &&
    lastRecentBlock.len <= 2 &&
    recentNoiseHits4 <= 1 &&
    (freshOutsider?.recent2Hits || 0) === 0;
  const commonReclaimValue = commonReclaimArmed ? lastRecentBlock.value : null;
  const commonReclaimStrength = commonReclaimArmed
    ? (
        16 +
        Math.max(0, Math.round((recent6Dist?.[commonReclaimValue] || 0) * 0.10)) +
        (lastRecentBlock?.len === 2 ? 6 : 0)
      )
    : 0;
  const globalPair1Map = lastRoll ? (GLOBAL_PAIR1_PRIORS[lastRoll] || null) : null;
  const globalPair2Map = last2Rolls ? (GLOBAL_PAIR2_PRIORS[last2Rolls] || null) : null;
  const globalPair3Map = last3Rolls ? (GLOBAL_PAIR3_PRIORS[last3Rolls] || null) : null;
  const globalPair2TopValue = globalPair2Map
    ? Object.entries(globalPair2Map).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    : null;
  const globalPair3TopValue = globalPair3Map
    ? Object.entries(globalPair3Map).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    : null;

  const getPostRunCooldown = (value) => {
    const heavyRecentRun = recentRuns
      .filter(run => run.value === value && run.len >= 3 && run.endIndex < rolls.length - 1)
      .sort((a, b) => b.endIndex - a.endIndex)[0];
    if (!heavyRecentRun) return 0;
    const rollsSinceBreak = (rolls.length - 1) - heavyRecentRun.endIndex;
    if (rollsSinceBreak <= 1) return 16;
    if (rollsSinceBreak === 2) return 10;
    if (rollsSinceBreak === 3) return 6;
    return 0;
  };

  const scored = VALUES.map((value) => {
    const pair1 = matrix?.[lastRoll]?.[value]?.pct || 0;
    const pair1Reliable = !!matrix?.[lastRoll]?.[value]?.reliable;
    const pair2 = pair2gramRow?.[value]?.pct || 0;
    const pair2Reliable = !!pair2gramRow?.[value]?.reliable;
    const weightedPair1 = pair1 * (pair1Reliable ? 1 : pair1 >= 80 ? 0.35 : 0.55);
    const weightedPair2 = pair2 * (pair2Reliable ? 1 : pair2 >= 80 ? 0.45 : 0.65);
    const trust = trends?.[value]?.trustScore ?? 0.5;
    const arrowWeight = trends?.[value]?.arrowWeight ?? 0.6;
    const supportScore = trends?.[value]?.supportScore ?? 35;
    const supportTier = trends?.[value]?.supportTier ?? 'thin';
    const recentCarryScore = trends?.[value]?.recentCarryScore ?? 24;
    const latentPressure = trends?.[value]?.latentPressure ?? 18;
    const latentTier = trends?.[value]?.latentTier ?? 'low';
    const noisePriorityScore = trends?.[value]?.noisePriorityScore ?? 18;
    const noisePriorityTier = trends?.[value]?.noisePriorityTier ?? 'quiet';
    const currentShare = trends?.[value]?.current ?? 0;
    const totalCount = trends?.[value]?.totalCount ?? 0;
    const direction = trends?.[value]?.direction || 'stable';
    const momentum = ((momentumScores?.[value] || 0) / maxMomentum) * 100;
    const recent6 = recent6Dist?.[value] || 0;
    const recent4Hits = recent4.filter(r => r === value).length;
    const recent2Hits = recent2.filter(r => r === value).length;
    const seenAgo = lastSeen?.[value] ?? -1;
    const effectiveGap = seenAgo >= 0 ? seenAgo : rolls.length;
    const postRunCooldown = getPostRunCooldown(value);
    const isSelfTransition = value === lastRoll;
    const runBreakAbsenceBoost =
      currentRunLen >= 3 && !isSelfTransition
        ? (seenAgo < 0 ? 14 : seenAgo >= 5 ? 10 : seenAgo >= 3 ? 6 : 0)
        : 0;
    const distributionWithoutPairPenalty =
      !isSelfTransition &&
      rolls.length >= 8 &&
      seenAgo < 0 &&
      pair1 === 0 &&
      (distribution?.[value] || 0) >= 45
        ? 10
        : 0;
    const absenceCredit =
      seenAgo < 0
        ? Math.min(rolls.length * 12, 100)
        : Math.min((effectiveGap / Math.max(expectedGap, 1)) * 40, 100);
    const pairSignal = Math.min(weightedPair1, 100);
    const pair2Signal = Math.min(weightedPair2, 100);
    const globalPair1Pct = globalPair1Map?.[value] || 0;
    const globalPair2Pct = globalPair2Map?.[value] || 0;
    const globalPair3Pct = globalPair3Map?.[value] || 0;
    const globalPair2Top = globalPair2TopValue === value;
    const globalPair3Top = globalPair3TopValue === value;
    const globalPair1Boost =
      globalPair1Map &&
      (!pair1Reliable || pair1 < 45)
        ? (
            globalPair1Pct * 0.22 +
            (pair1 === 0 ? 4 : 0)
          )
        : 0;
    const motifScore = motifScores[value] || 0;
    const recentFollow1 = recentFollowerScores.direct[value] || 0;
    const recentFollow2 = recentFollowerScores.pair[value] || 0;
    const recentFollow3 = recentFollowerScores.triplet[value] || 0;
    const globalPair2Boost =
      globalPair2Map &&
      ((!pair2Reliable && pair2 < 45) || recentFollow2 < 35)
        ? (
            globalPair2Pct * 0.28 +
            (globalPair2Top ? 8 : 0) +
            (pair2 === 0 ? 4 : 0)
          )
        : 0;
    const globalPair3Boost =
      globalPair3Map &&
      (recentFollow3 < 35 || ((!pair2Reliable && pair2 < 50) && recentFollow2 < 45))
        ? (
            globalPair3Pct * 0.34 +
            (globalPair3Top ? 10 : 0) +
            (recentFollow3 === 0 ? 6 : 0)
          )
        : 0;
    const freqSignal = Math.min(distribution?.[value] || 0, 100);
    const momentumSignal = Math.min(momentum, 100);
    const recentSignal = Math.min(recent6 * 2, 100);
    const absenceSignal = Math.min(absenceCredit, 100);
    const latentNoiseBonus =
      allowDormantRescue &&
      noise?.includes(value) &&
      seenAgo < 0 &&
      recent6 === 0 &&
      pair1 === 0 &&
      pair2 === 0 &&
      direction !== 'falling' &&
      staleCommons >= 1 &&
      latentPressure >= 44 &&
      (regime !== 'stable' || recentTop2Share < 65)
        ? (staleCommons >= 2 ? 12 : 6) + Math.round((trust - 0.5) * 8) + Math.round(arrowWeight * 8) + Math.round((latentPressure - 40) * 0.25)
        : 0;
    const effectivePressure = noise?.includes(value) && recent6 < 25
      ? Math.max(supportScore, latentPressure)
      : supportScore;
    const overdueVsGap = avgNoiseGap
      ? ((seenAgo < 0 ? commonsSinceNoise + 1 : seenAgo) / Math.max(avgNoiseGap, 1))
      : 0;
    // Dead noise: absent 8+ rolls, no recent activity, low trust, not rising
    // These values are likely absent from this session window — stop boosting them
    const isDeadNoise = noise?.includes(value) && seenAgo >= 8 && recent4Hits === 0 &&
      recent2Hits === 0 && trust <= 0.6 && direction !== 'rising';
    const armedNoiseBoost =
      noise?.includes(value) &&
      currentShare === 0 &&
      trust >= 0.6 &&
      arrowWeight >= 0.75 &&
      direction !== 'falling' &&
      latentPressure >= 55 &&
      noisePriorityScore >= 60 &&
      seenAgo >= Math.max(5, Math.round((avgNoiseGap || 4) * 1.5))
        ? 18 +
          Math.max(0, Math.round((noisePriorityScore - 55) * 0.45)) +
          Math.max(0, Math.round((latentPressure - 50) * 0.25)) +
          (totalCount <= 1 ? 6 : totalCount === 2 ? 3 : 0)
        : 0;
    let timingBonus = noise?.includes(value) && !isDeadNoise
      ? (
          noiseTiming === 'due'
            ? Math.min(36, Math.max(0, Math.round((overdueVsGap - 0.7) * 20)))
            : noiseTiming === 'approaching'
              ? Math.min(24, Math.max(0, Math.round((overdueVsGap - 0.4) * 12)))
              : -6
        )
      : noise?.includes(value) ? -8 : 0;  // dead noise gets negative timing
    // Absence multiplier: noise absent 6+ rolls gets 1.5x timing bonus
    if (timingBonus > 0 && seenAgo >= 6) {
      timingBonus = Math.round(timingBonus * 1.5);
    }
    const pressureBonus = noise?.includes(value) && !isDeadNoise
      ? (
          noiseTiming === 'due'
            ? Math.round((latentPressure - 35) * 0.18)
            : noiseTiming === 'approaching'
              ? Math.round((latentPressure - 45) * 0.1)
              : 0
        )
      : 0;

    let score =
      pairSignal * 0.22 +
      globalPair1Boost * 0.16 +
      pair2Signal * 0.12 +
      globalPair2Boost * 0.18 +
      globalPair3Boost * 0.22 +
      freqSignal * 0.2 +
      momentumSignal * 0.2 +
      recentSignal * 0.16 +
      absenceSignal * 0.1;

    if (regime === 'stable' && pair1Reliable) score += Math.min(pairSignal * 0.08, 8);
    if (regime !== 'stable') {
      score += Math.min(absenceSignal * 0.06, 6);
      score += Math.min(momentumSignal * 0.05, 5);
    }

    score -= postRunCooldown;
    score += runBreakAbsenceBoost;
    score -= distributionWithoutPairPenalty;

    if (isSelfTransition) score -= currentRunLen >= 2 ? 18 : 10;

    if (commons?.includes(value)) score += 4;
    if (noise?.includes(value)) score -= 1;
    if (noiseRising?.includes(value)) score += 6;
    if (patternShifted && shiftedToValue === value) score += 12;
    if (freshOutsider?.value === value) score += 8;
    if (isAlternating && alternatingPair?.includes(value)) score += 10;
    if (!pair1Reliable && globalPair1Boost > 0) score += Math.min(globalPair1Boost * 0.14, 9);
    if (pair2Reliable) score += Math.min(pair2Signal * 0.08, 8);
    else if (globalPair2Boost > 0) score += Math.min(globalPair2Boost * 0.16, 10);
    if (recentFollow3 > 0) score += Math.min(recentFollow3 * 0.16, 12);
    if (globalPair3Boost > 0) score += Math.min(globalPair3Boost * 0.18, 12);
    score += latentNoiseBonus;
    score += armedNoiseBoost;
    score += (effectivePressure - 40) * 0.24;
    score += timingBonus;
    score += pressureBonus;
    score += motifScore >= 60 ? 6 : motifScore >= 40 ? 3 : motifScore >= 25 ? 1 : 0;

    if (direction === 'rising') score += effectivePressure >= 55 ? 7 : effectivePressure >= 42 ? 3 : -5;
    else if (direction === 'stable') score += 2;
    else score -= 6;
    if (noise?.includes(value) && recent6 < 25 && effectivePressure < 30) score -= 8;
    else if (noise?.includes(value) && recent6 < 25 && effectivePressure < 42) score -= 4;
    // Dead noise: extra penalty — gap pressure alone cannot resurrect invisible values
    if (isDeadNoise) score -= 12;

    return {
      value,
      score: Math.round(score * 100) / 100,
      pair1,
      pair1Reliable,
      globalPair1Pct,
      globalPair1Boost,
      pair2,
      pair2Reliable,
      globalPair2Pct,
      globalPair2Boost,
      globalPair3Pct,
      globalPair3Boost,
      motifScore,
      recentFollow1,
      recentFollow2,
      recentFollow3,
      freqSignal,
      recentSignal,
      momentumSignal,
      absenceSignal,
      seenAgo,
      recent2Hits,
      recent4Hits,
      isSelfTransition,
      direction,
      trustScore: trust,
      arrowWeight,
      supportScore,
      supportTier,
      recentCarryScore,
      latentPressure,
      latentTier,
      noisePriorityScore,
      noisePriorityTier,
      currentShare,
      totalCount,
      effectivePressure,
      isDeadNoise,
      armedNoiseBoost,
    };
  }).sort((a, b) => b.score - a.score);

  const bestCommon = scored.find(entry => commons.includes(entry.value)) || null;
  const secondCommon = scored.find(entry => commons.includes(entry.value) && entry.value !== bestCommon?.value) || null;
  const noiseEntries = scored
    .filter(entry => noise.includes(entry.value))
    .map((entry) => {
      const rawGap = entry.seenAgo < 0 ? commonsSinceNoise + 2 : entry.seenAgo;
      const overdueNorm = Math.min(avgNoiseGap ? rawGap / Math.max(avgNoiseGap, 1) : rawGap / 4, 3.0);
      const overdueScore = Math.min(40, Math.round(overdueNorm * 18));
      const neverSeenBonus = entry.seenAgo < 0
        ? (noiseTiming === 'due' ? 16 : noiseTiming === 'approaching' ? 12 : 8)
        : 0;
      const scarcityBonus = entry.totalCount <= 1 ? 8 : entry.totalCount === 2 ? 3 : 0;
      const outsiderBonus = freshOutsider?.value === entry.value
        ? (
            entry.direction === 'falling'
              ? 4
              : noiseTiming === 'approaching' ? 18
              : noiseTiming === 'due' ? 12
              : 7
          )
        : 0;
      const activationScore =
        Math.round((((entry.pair1Reliable ? (entry.pair1 || 0) : (entry.pair1 || 0) * ((entry.pair1 || 0) >= 80 ? 0.35 : 0.55)))) * 0.34) +
        Math.round((((entry.pair2Reliable ? (entry.pair2 || 0) : (entry.pair2 || 0) * ((entry.pair2 || 0) >= 80 ? 0.45 : 0.65)))) * 0.22) +
        Math.round((entry.effectivePressure || 0) * 0.12) +
        ((entry.recent2Hits || 0) * 12) +
        ((entry.recent4Hits || 0) * 6) +
        outsiderBonus +
        (entry.direction === 'rising' ? 6 : entry.direction === 'stable' ? 2 : -5);
      const pressureScore =
        Math.round((entry.noisePriorityScore || 0) * 0.58) +
        Math.round(overdueScore * 0.72) +
        neverSeenBonus +
        scarcityBonus +
        (entry.direction === 'falling' ? -4 : 0);
      const pressureWeight = noiseTiming === 'due' ? 0.62 : noiseTiming === 'approaching' ? 0.46 : 0.26;
      const activationWeight = noiseTiming === 'due' ? 0.38 : noiseTiming === 'approaching' ? 0.54 : 0.74;
      const candidateScore = Math.round(
        pressureScore * pressureWeight +
        activationScore * activationWeight
      );
      return {
        ...entry,
        rawGap,
        overdueNorm,
        overdueScore,
        neverSeenBonus,
        scarcityBonus,
        outsiderBonus,
        activationScore,
        pressureScore,
        candidateScore,
      };
    })
    .sort((a, b) => {
      const pressureDiff = (b.pressureScore || 0) - (a.pressureScore || 0);
      const activationDiff = (b.activationScore || 0) - (a.activationScore || 0);
      if (
        noiseTiming === 'approaching' &&
        Math.max(a.activationScore || 0, b.activationScore || 0) < 18 &&
        Math.abs(pressureDiff) >= 4
      ) {
        return pressureDiff;
      }
      const scoreDiff = b.candidateScore - a.candidateScore;
      if (Math.abs(scoreDiff) >= 3) return scoreDiff;
      if (noiseTiming === 'due' && Math.abs(pressureDiff) >= 4) return pressureDiff;
      if (noiseTiming === 'approaching' && Math.abs(activationDiff) >= 4) return activationDiff;
      const overdueDiff = (b.overdueNorm || 0) - (a.overdueNorm || 0);
      if (Math.abs(overdueDiff) >= 0.45) return overdueDiff > 0 ? 1 : -1;
      const unseenDiff = (b.neverSeenBonus || 0) - (a.neverSeenBonus || 0);
      if (Math.abs(unseenDiff) >= 4) return unseenDiff;
      if ((freshOutsider?.value && a.value === freshOutsider.value) || (freshOutsider?.value && b.value === freshOutsider.value)) {
        return (b.activationScore || 0) - (a.activationScore || 0);
      }
      return (b.noisePriorityScore || 0) - (a.noisePriorityScore || 0);
    });
  const bestNoise = noiseEntries[0] || null;
  const noiseEntryMap = new Map(noiseEntries.map((entry) => [entry.value, entry]));
  const normalizedNoiseTiming = noiseTiming === 'unknown' ? 'not_due' : noiseTiming;
  const dormantMissingFourth = (() => {
    if (!activeTrio) return null;
    const missing = VALUES.find((value) => !activeTrio.includes(value));
    if (!missing) return null;
    const seenAgo = lastSeen?.[missing] ?? -1;
    const current = trends?.[missing]?.current ?? 0;
    const latent = trends?.[missing]?.latentPressure ?? 0;
    if (current === 0 && seenAgo < 0 && latent >= 65 && normalizedNoiseTiming !== 'not_due') {
      return missing;
    }
    return null;
  })();
  const analyzerRanked = scored
    .map((entry) => {
      const noiseEntry = noiseEntryMap.get(entry.value);
      let exactScore = entry.score;
      if (noise.includes(entry.value)) {
        if (normalizedNoiseTiming === 'due') {
          exactScore += (noiseEntry?.candidateScore || 0) * 0.62;
        } else if (normalizedNoiseTiming === 'approaching') {
          exactScore += (noiseEntry?.candidateScore || 0) * 0.38;
        } else {
          exactScore -= 6;
        }
      } else {
        if (normalizedNoiseTiming === 'due') {
          const commonSupport = entry.supportScore ?? 40;
          if (commonSupport < 42) exactScore -= 6;
          else if (commonSupport >= 55) exactScore += 3;
        } else if (normalizedNoiseTiming === 'approaching') {
          const commonSupport = entry.supportScore ?? 40;
          if (commonSupport >= 48) exactScore += 2;
        }
      }
      const phantomNoisePenalty =
        (entry.currentShare || 0) === 0 &&
        (entry.recent4Hits || 0) === 0 &&
        (entry.recent2Hits || 0) === 0 &&
        (entry.pair1 || 0) < 20 &&
        (entry.pair2 || 0) < 20 &&
        (!freshOutsider?.value || freshOutsider.value !== entry.value)
          ? (normalizedNoiseTiming === 'due' ? 18 : normalizedNoiseTiming === 'approaching' ? 10 : 6)
          : 0;
      exactScore -= phantomNoisePenalty;
      return {
        ...entry,
        phantomNoisePenalty,
        exactScore: Math.round(exactScore * 100) / 100,
      };
    })
    .sort((a, b) => {
      const diff = (b.exactScore || 0) - (a.exactScore || 0);
      if (Math.abs(diff) >= 2) return diff;
      if (normalizedNoiseTiming === 'due') {
        const bNoise = noiseEntryMap.get(b.value);
        const aNoise = noiseEntryMap.get(a.value);
        if (bNoise || aNoise) {
          const pressureDiff = ((bNoise?.pressureScore || 0) - (aNoise?.pressureScore || 0));
          if (Math.abs(pressureDiff) >= 4) return pressureDiff;
        }
      }
      const pairDiff = (b.pair1 || 0) - (a.pair1 || 0);
      if (Math.abs(pairDiff) >= 8) return pairDiff;
      return (b.score || 0) - (a.score || 0);
    });
  const minExactScore = analyzerRanked.reduce(
    (min, entry) => Math.min(min, entry.exactScore || 0),
    Number.POSITIVE_INFINITY
  );
  const analyzerDecisionScores = analyzerRanked.map((entry, index) => ({
    value: entry.value,
    decisionScore: Math.max(1, Math.round((entry.exactScore || 0) - minExactScore + 12)),
    decisionRank: index + 1,
    exactScore: Math.round((entry.exactScore || 0) * 100) / 100,
  }));
  const normalizePoolScores = (entries, rawKey, scoreKey) => {
    if (!entries.length) return [];
    const minRaw = entries.reduce((min, entry) => Math.min(min, entry[rawKey] || 0), Number.POSITIVE_INFINITY);
    const adjusted = entries.map((entry) => ({
      ...entry,
      [scoreKey]: Math.max(1, Math.round((entry[rawKey] || 0) - minRaw + 12)),
    }));
    const total = adjusted.reduce((sum, entry) => sum + (entry[scoreKey] || 0), 0) || 1;
    return adjusted
      .map((entry, index) => ({
        ...entry,
        [scoreKey]: Math.round(((entry[scoreKey] || 0) / total) * 100),
        rank: index + 1,
        raw: Math.round((entry[rawKey] || 0) * 100) / 100,
      }))
      .sort((a, b) => {
        const scoreDiff = (b[scoreKey] || 0) - (a[scoreKey] || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b[rawKey] || 0) - (a[rawKey] || 0);
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  };
  const commonDecisionRaw = analyzerRanked
    .filter((entry) => commons.includes(entry.value))
    .map((entry) => {
      const trustPct = Math.round((entry.trustScore || 0) * 100);
      const freshnessPct = Math.round((entry.arrowWeight || 0) * 100);
      const recent8 = rolls.slice(-8);
      const recent8Count = recent8.filter((roll) => roll === entry.value).length;
      const recent8Pct = recent8.length ? (recent8Count / recent8.length) * 100 : 0;
      const recentCarrySignal = entry.recentCarryScore || 0;
      const otherCommon = commons.find((value) => value !== entry.value) || null;
      const otherCommonEntry = otherCommon
        ? analyzerRanked.find((candidate) => candidate.value === otherCommon) || null
        : null;
      const otherCommonShare = otherCommon ? (distribution?.[otherCommon] || 0) : 0;
      const exactLeadDelta = (entry.exactScore || 0) - (otherCommonEntry?.exactScore || 0);
      const fallenCommon = (entry.currentShare || 0) < 25;
      const dominantOtherCommon =
        !!otherCommon &&
        (
          otherCommon === lastRoll ||
          otherCommonShare >= 55 ||
          (lastRoll === otherCommon && currentRunLen >= 3)
        );
      const reboundArmed =
        fallenCommon &&
        dominantOtherCommon &&
        (entry.totalCount || 0) >= 2 &&
        (
          (entry.trustScore || 0) >= 0.6 ||
          (entry.arrowWeight || 0) >= 0.75 ||
          (entry.pair1 || 0) >= 35 ||
          (entry.pair2 || 0) >= 45
        );
      const reboundRaw =
        reboundArmed
          ? (
              Math.max(0, 70 - (entry.currentShare || 0)) * 0.32 +
              Math.max(0, otherCommonShare - (entry.currentShare || 0)) * 0.18 +
              (entry.pair1 || 0) * 0.28 +
              (entry.pair2 || 0) * 0.14 +
              trustPct * 0.10 +
              freshnessPct * 0.08 +
              ((entry.totalCount || 0) >= 4 ? 6 : (entry.totalCount || 0) >= 2 ? 3 : 0) +
              (entry.direction === 'rising' ? 7 : entry.direction === 'stable' ? 3 : -3) +
              (lastRoll === otherCommon ? 8 : 0) +
              (currentRunLen >= 4 ? 6 : currentRunLen >= 3 ? 3 : 0)
            )
          : 0;
      const reboundBoost = reboundArmed ? Math.min(18, Math.round(reboundRaw * 0.18)) : 0;
      const recentCommonMemoryRaw =
        recent8Pct * 0.28 +
        recentCarrySignal * 0.26 +
        (entry.currentShare || 0) * 0.08 +
        (entry.pair1 || 0) * 0.16 +
        (entry.pair2 || 0) * 0.08 +
        trustPct * 0.08 +
        freshnessPct * 0.06 +
        (entry.value === lastRoll ? 18 : 0) +
        (recent8Count >= 3 ? 10 : recent8Count === 2 ? 6 : recent8Count === 1 ? 2 : 0) +
        (entry.totalCount >= 4 ? 6 : entry.totalCount >= 2 ? 3 : 0) +
        (entry.direction === 'rising' ? 4 : entry.direction === 'stable' ? 2 : -2);
      const recentCarryBoost =
        reboundArmed || entry.value === lastRoll
          ? Math.min(16, Math.max(0, Math.round(recentCommonMemoryRaw * 0.12)))
          : 0;
      const anchoredCommon =
        (entry.currentShare || 0) >= 35 &&
        (entry.supportScore || 0) >= 44 &&
        trustPct >= 60 &&
        recentCarrySignal >= 40;
      const stableAnchorBoost =
        anchoredCommon
          ? Math.min(
              14,
              Math.max(
                0,
                Math.round(
                  Math.max(0, (entry.currentShare || 0) - 30) * 0.25 +
                  Math.max(0, (entry.supportScore || 0) - 40) * 0.18 +
                  Math.max(0, recentCarrySignal - 35) * 0.12 +
                  Math.max(0, exactLeadDelta) * 0.35
                )
              )
            )
          : 0;
      const exactLeadBonus =
        exactLeadDelta > 0
          ? Math.min(10, Math.round(exactLeadDelta * 0.45))
          : exactLeadDelta < -6
            ? -4
            : 0;
      const sandwichReturnBoost =
        sandwichReturnValue === entry.value
          ? 12 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 3 : 0)
          : 0;
      const bridgeReturnBoost =
        bridgeReturnValue === entry.value
          ? 28 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 6 : 0)
          : 0;
      const preBlockReturnBoost =
        preBlockReturnValue === entry.value
          ? 10 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 2 : 0)
          : 0;
      const missingFourthRotationBoost =
        missingFourthRotationValue === entry.value
          ? (
              12 +
              ((entry.currentShare || 0) === 0 ? 6 : 0) +
              ((entry.latentPressure || 0) >= 45 ? 4 : 0)
            )
          : 0;
      const quadGapShockBoost =
        quadGapShockValue === entry.value
          ? (
              32 +
              ((entry.currentShare || 0) === 0 ? 10 : 0) +
              ((entry.latentPressure || 0) >= 45 ? 8 : 0)
            )
          : 0;
      const cycleRestartBoost =
        cycleRestartValue === entry.value
          ? 28 + ((entry.supportScore || 0) >= 40 ? 6 : 0)
          : 0;
      const doubleBridgeEchoBoost =
        doubleBridgeEchoValue === entry.value
          ? 24 + ((entry.currentShare || 0) === 0 ? 6 : 0)
          : 0;
      const doubleBridgeSwapBoost =
        doubleBridgeSwapValue === entry.value
          ? 28 + ((entry.currentShare || 0) === 0 ? 8 : 0)
          : 0;
      const tightPairBoost =
        tightPairBoard && tightPairValues.includes(entry.value)
          ? 16 + (commons.includes(entry.value) ? 6 : 0)
          : 0;
      const tightPairOutsiderPenalty =
        tightPairBoard &&
        !tightPairValues.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        (entry.recent2Hits || 0) === 0
          ? 24 + ((entry.currentShare || 0) === 0 ? 6 : 0)
          : 0;
      const sequenceEchoBoost =
        !tightPairBoard &&
        !mixedQuadActive &&
        recent8.length >= 8 &&
        (entry.currentShare || 0) === 0 &&
        (entry.pair1 || 0) === 0 &&
        (entry.pair2 || 0) === 0 &&
        (entry.globalPair3Pct || 0) >= 50
          ? 22 + ((entry.latentPressure || 0) >= 50 ? 6 : 0)
          : 0;
      const commonReturnBoost =
        commonReturnArmed && entry.value === siblingCommonValue
          ? Math.min(28, commonReturnStrength + 8)
          : 0;
      const commonHoldBoost =
        commonHoldActive && entry.value === lastRoll
          ? 16 + Math.max(0, Math.round(((entry.currentShare || 0) - 30) * 0.08))
          : commonHoldActive && commons.includes(entry.value)
            ? 4
            : 0;
      const commonReclaimBoost =
        commonReclaimArmed && entry.value === commonReclaimValue
          ? commonReclaimStrength
          : 0;
      const siblingBounceBoost =
        siblingBounceArmed && entry.value === siblingCommonValue
          ? siblingBounceStrength
          : 0;
      const flashNoiseRecoveryBoost =
        flashNoiseSession && commons.includes(entry.value)
          ? (
              (entry.value === lastRoll ? 3 : 0) +
              (entry.value === siblingCommonValue ? 5 : 0) +
              (postNoiseCommonRate >= 0.6 ? 4 : postNoiseCommonRate >= 0.4 ? 2 : 0)
            )
          : 0;
      const overextendedRunPenalty =
        commonReturnArmed && entry.value === lastRoll
          ? Math.min(22, 10 + (currentRunLen >= 4 ? 5 : 0) + Math.max(0, Math.round(((entry.currentShare || 0) - 35) * 0.12)))
          : 0;
      const directionAdjustment =
        entry.direction === 'rising'
          ? 5
          : entry.direction === 'stable'
            ? 2
            : anchoredCommon
              ? -1
              : -6;
      const raw =
        (entry.supportScore || 0) * 0.26 +
        recentCarrySignal * 0.20 +
        (entry.currentShare || 0) * 0.16 +
        trustPct * 0.11 +
        freshnessPct * 0.08 +
        (entry.pair1 || 0) * 0.12 +
        (entry.pair2 || 0) * 0.08 +
        Math.max(entry.exactScore || 0, 0) * 0.14 +
        directionAdjustment +
        reboundBoost +
        recentCarryBoost +
        stableAnchorBoost +
        exactLeadBonus +
        sandwichReturnBoost +
        bridgeReturnBoost +
        preBlockReturnBoost +
        missingFourthRotationBoost +
        quadGapShockBoost +
        cycleRestartBoost +
        doubleBridgeEchoBoost +
        doubleBridgeSwapBoost +
        tightPairBoost +
        sequenceEchoBoost +
        commonReturnBoost +
        commonReclaimBoost +
        siblingBounceBoost +
        flashNoiseRecoveryBoost +
        commonHoldBoost -
        tightPairOutsiderPenalty -
        overextendedRunPenalty;
      return {
        ...entry,
        fallenCommon,
        reboundArmed,
        reboundRaw: Math.round(reboundRaw * 100) / 100,
        reboundBoost,
        recent8Count,
        recent8Pct: Math.round(recent8Pct),
        recentCommonMemoryRaw: Math.round(recentCommonMemoryRaw * 100) / 100,
        recentCarryBoost,
        anchoredCommon,
        stableAnchorBoost,
        exactLeadDelta: Math.round(exactLeadDelta * 100) / 100,
        exactLeadBonus,
        sandwichReturnBoost,
        bridgeReturnBoost,
        preBlockReturnBoost,
        missingFourthRotationBoost,
        quadGapShockBoost,
        cycleRestartBoost,
        doubleBridgeEchoBoost,
        doubleBridgeSwapBoost,
        tightPairBoost,
        sequenceEchoBoost,
        commonReturnBoost,
        commonReclaimBoost,
        siblingBounceBoost,
        flashNoiseRecoveryBoost,
        commonHoldBoost,
        tightPairOutsiderPenalty,
        overextendedRunPenalty,
        commonDecisionRaw: raw,
      };
    })
    .sort((a, b) => (b.commonDecisionRaw || 0) - (a.commonDecisionRaw || 0));
  const noiseDecisionRaw = noiseEntries
    .map((entry) => {
      const trustPct = Math.round((entry.trustScore || 0) * 100);
      const freshnessPct = Math.round((entry.arrowWeight || 0) * 100);
      const timingPoolBonus = normalizedNoiseTiming === 'due' ? 10 : normalizedNoiseTiming === 'approaching' ? 5 : -3;
      const dormantOverdueBonus =
        entry.currentShare === 0 && entry.seenAgo >= Math.max(4, Math.round((avgNoiseGap || 3) * 1.8))
          ? (
              normalizedNoiseTiming === 'due'
                ? 16
                : normalizedNoiseTiming === 'approaching'
                  ? 9
                  : 3
            )
          : 0;
      const recentOutsiderPenalty =
        entry.currentShare > 0 &&
        (entry.pair1 || 0) === 0 &&
        (entry.pair2 || 0) === 0 &&
        entry.seenAgo >= 0 &&
        entry.seenAgo <= Math.max(2, Math.round(avgNoiseGap || 2))
          ? (
              normalizedNoiseTiming === 'due'
                ? -12
                : normalizedNoiseTiming === 'approaching'
                  ? -7
                : -3
            )
          : 0;
      const phantomNoisePenalty =
        (entry.currentShare || 0) === 0 &&
        (entry.recent4Hits || 0) === 0 &&
        (entry.recent2Hits || 0) === 0 &&
        (entry.activationScore || 0) <= 14 &&
        (!freshOutsider?.value || freshOutsider.value !== entry.value)
          ? (
              dormantMissingFourth === entry.value
                ? (normalizedNoiseTiming === 'due' ? -6 : -3)
                : (normalizedNoiseTiming === 'due' ? -22 : normalizedNoiseTiming === 'approaching' ? -14 : -8)
            )
          : 0;
      const dormantFourthBoost =
        dormantMissingFourth === entry.value
          ? (normalizedNoiseTiming === 'due' ? 14 : 8)
          : 0;
      const breakPressureBoost =
        freshOutsider?.value === entry.value
          ? (
              Math.min(14, Math.max(0, Math.round((freshOutsider.score || 0) * 0.14))) +
              ((freshOutsider.recent2Hits || 0) >= 1 ? 4 : 0) +
              ((freshOutsider.recent4Hits || 0) >= 2 ? 3 : 0) +
              (freshOutsider.direction === 'rising' ? 4 : freshOutsider.direction === 'stable' ? 2 : 0)
            )
          : 0;
      const commonReturnSuppression =
        commonReturnArmed &&
        (entry.currentShare || 0) <= 20 &&
        (entry.recent2Hits || 0) === 0 &&
        (entry.recent4Hits || 0) <= 1 &&
        freshOutsider?.value !== entry.value
          ? (normalizedNoiseTiming === 'due' ? 20 : normalizedNoiseTiming === 'approaching' ? 12 : 7)
          : 0;
      const flashNoiseSuppression =
        flashNoiseSession &&
        normalizedNoiseTiming !== 'not_due' &&
        (entry.recent2Hits || 0) === 0 &&
        freshOutsider?.value !== entry.value
          ? (normalizedNoiseTiming === 'due' ? 14 : 8)
          : 0;
      const stickyNoiseBoost =
        stickyNoiseSession &&
        normalizedNoiseTiming !== 'not_due' &&
        (
          (entry.recent2Hits || 0) >= 1 ||
          (entry.recent4Hits || 0) >= 2 ||
          freshOutsider?.value === entry.value
        )
          ? (normalizedNoiseTiming === 'due' ? 8 : 4)
          : 0;
      const singleHitFlashPenalty =
        entry.seenAgo === 0 &&
        (entry.currentShare || 0) <= 20 &&
        (entry.recent2Hits || 0) <= 1 &&
        (entry.recent4Hits || 0) <= 1 &&
        (entry.pair1 || 0) === 0 &&
        (entry.pair2 || 0) === 0
          ? (
              normalizedNoiseTiming === 'due'
                ? 18
                : normalizedNoiseTiming === 'approaching'
                  ? 12
                  : 8
            )
          : 0;
      const raw =
        (entry.noisePriorityScore || 0) * 0.28 +
        (entry.latentPressure || 0) * 0.20 +
        trustPct * 0.10 +
        freshnessPct * 0.08 +
        (entry.pressureScore || 0) * 0.18 +
        (entry.activationScore || 0) * 0.12 +
        (entry.armedNoiseBoost || 0) * 0.18 +
        dormantFourthBoost +
        timingPoolBonus +
        dormantOverdueBonus +
        recentOutsiderPenalty +
        phantomNoisePenalty +
        stickyNoiseBoost +
        breakPressureBoost -
        singleHitFlashPenalty -
        commonReturnSuppression -
        flashNoiseSuppression +
        (entry.direction === 'rising' ? 4 : entry.direction === 'stable' ? 2 : -4);
      return {
        ...entry,
        breakPressureBoost,
        dormantFourthBoost,
        dormantOverdueBonus,
        recentOutsiderPenalty,
        phantomNoisePenalty,
        commonReturnSuppression,
        flashNoiseSuppression,
        stickyNoiseBoost,
        singleHitFlashPenalty,
        noiseDecisionRaw: raw,
      };
    })
    .sort((a, b) => (b.noiseDecisionRaw || 0) - (a.noiseDecisionRaw || 0));
  const commonDecisionScores = normalizePoolScores(commonDecisionRaw, 'commonDecisionRaw', 'commonScore');
  const noiseDecisionScores = normalizePoolScores(noiseDecisionRaw, 'noiseDecisionRaw', 'noiseScore');
  const commonDecisionMap = new Map(commonDecisionScores.map((entry) => [entry.value, entry]));
  const noiseDecisionMap = new Map(noiseDecisionScores.map((entry) => [entry.value, entry]));
  const previewBestCommon = commonDecisionScores[0] || null;
  const previewSecondCommon = commonDecisionScores[1] || null;
  const previewBestNoise = noiseDecisionScores[0] || null;
  const previewTopCommonAvg = ((previewBestCommon?.commonScore || 0) + (previewSecondCommon?.commonScore || 0)) / 2;
  const reentrySignalCount = [
    commonReturnArmed,
    commonReclaimArmed,
    siblingBounceArmed,
  ].filter(Boolean).length;
  const boardStateStrengths = {
    pair: Math.max(0, Math.min(100, Math.round(
      previewTopCommonAvg * 0.60 +
      (effectiveCommonDominantBoard ? 16 : 0) +
      (developingSession ? 6 : 0) +
      (noiseTriggerConfirmed ? -16 : 0) +
      (noiseProbeOnly ? -6 : 0)
    ))),
    probe: Math.max(0, Math.min(100, Math.round(
      (previewBestNoise?.noiseScore || 0) * 0.54 +
      (freshOutsider?.score || 0) * 0.16 +
      (noiseProbeOnly ? 14 : 0) +
      (noiseTriggerConfirmed ? -8 : 0) +
      (effectiveCommonDominantBoard ? -4 : 6)
    ))),
    break: Math.max(0, Math.min(100, Math.round(
      (previewBestNoise?.noiseScore || 0) * 0.64 +
      (freshOutsider?.score || 0) * 0.14 +
      (noiseTriggerConfirmed ? 18 : 0) +
      (normalizedNoiseTiming === 'due' ? 10 : normalizedNoiseTiming === 'approaching' ? 6 : 0) +
      (effectiveCommonDominantBoard ? -10 : 4)
    ))),
    reentry: Math.max(0, Math.min(100, Math.round(
      Math.max(commonReturnStrength || 0, commonReclaimStrength || 0, siblingBounceStrength || 0) * 0.58 +
      (commonRecoveryActive ? 10 : 0) +
      (commonReturnArmed ? 10 : 0) +
      (commonReclaimArmed ? 10 : 0) +
      (siblingBounceArmed ? 8 : 0) +
      ((commonReturnArmed || commonReclaimArmed || siblingBounceArmed) ? (postNoiseCommonRate || 0) * 4 : 0) +
      ((commonReturnArmed || siblingBounceArmed) ? (postNoiseSiblingRate || 0) * 3 : 0) +
      (reentrySignalCount >= 2 ? 8 : reentrySignalCount === 1 ? 2 : -12) +
      ((previewBestNoise?.noiseScore || 0) >= 70 ? -18 : 0) +
      (noiseTriggerConfirmed ? -18 : noiseProbeOnly ? -6 : 0) +
      ((freshOutsider?.score || 0) >= 65 ? -6 : 0)
    ))),
  };
  const sessionStatePreviewKey =
    boardStateStrengths.break >= Math.max(boardStateStrengths.pair + 12, 58) && noiseTriggerConfirmed
      ? 'break'
      : boardStateStrengths.reentry >= Math.max(boardStateStrengths.pair + 6, boardStateStrengths.probe + 10, 52)
        ? 'reentry'
        : boardStateStrengths.probe >= Math.max(boardStateStrengths.pair - 6, 44)
          ? 'probe'
          : 'pair';
  const triadDecisionRaw = activeTrio
    ? analyzerRanked
        .filter((entry) => activeTrio.includes(entry.value))
        .map((entry) => {
          const trustPct = Math.round((entry.trustScore || 0) * 100);
          const freshnessPct = Math.round((entry.arrowWeight || 0) * 100);
          const raw =
            (entry.supportScore || 0) * 0.20 +
            (entry.currentShare || 0) * 0.16 +
            trustPct * 0.10 +
            freshnessPct * 0.06 +
            (entry.pair1 || 0) * 0.12 +
            (entry.pair2 || 0) * 0.16 +
            (entry.recentFollow1 || 0) * 0.12 +
            (entry.recentFollow2 || 0) * 0.16 +
            (entry.recentFollow3 || 0) * 0.22 +
            (entry.motifScore || 0) * 0.06 +
            (entry.recentCarryScore || 0) * 0.10 +
            (entry.value === lastRoll ? 5 : 0) +
            (sandwichReturnValue === entry.value ? 8 : 0) +
            (entry.direction === 'rising' ? 4 : entry.direction === 'stable' ? 2 : -2);
          return {
            ...entry,
            triadDecisionRaw: raw,
          };
        })
        .sort((a, b) => (b.triadDecisionRaw || 0) - (a.triadDecisionRaw || 0))
    : [];
  const triadDecisionScores = normalizePoolScores(triadDecisionRaw, 'triadDecisionRaw', 'triadScore');
  const triadDecisionMap = new Map(triadDecisionScores.map((entry) => [entry.value, entry]));
  const trendOverallScores = buildTrendOverallScores({
    trends,
    commons,
    noise,
    commonDecisionScores,
    noiseDecisionScores,
  });
  const sessionStateScores = buildSessionStateScores({
    scoredEntries: analyzerRanked,
    trends,
    commons,
    noise,
    commonDecisionScores,
    noiseDecisionScores,
    stateKey: sessionStatePreviewKey,
    freshOutsider,
    siblingCommonValue,
    commonReturnArmed,
    commonReclaimArmed,
    commonReclaimValue,
    siblingBounceArmed,
  });
  const sessionStateMap = new Map(sessionStateScores.map((entry) => [entry.value, entry]));
  const refinedAnalyzerRanked = analyzerRanked
    .map((entry) => {
      const commonPool = commonDecisionMap.get(entry.value);
      const noisePool = noiseDecisionMap.get(entry.value);
      const triadPool = triadDecisionMap.get(entry.value);
      const trustPct = Math.round((entry.trustScore || 0) * 100);
      const support = entry.supportScore || 0;
      const carry = entry.recentCarryScore || 0;
      const exactContextWeak =
        !(entry.pair1Reliable || entry.pair2Reliable) &&
        (entry.pair1 || 0) < 20 &&
        (entry.pair2 || 0) < 20;
      const commonPoolWeight = exactContextWeak ? 0.24 : 0.12;
      const noisePoolWeight =
        normalizedNoiseTiming === 'due' ? (exactContextWeak ? 0.20 : 0.18)
        : normalizedNoiseTiming === 'approaching' ? (exactContextWeak ? 0.16 : 0.14)
        : (exactContextWeak ? 0.10 : 0.08);
      const poolBoost = activeTrio?.includes(entry.value)
        ? (((triadPool?.triadScore ?? 50) - 50) * 0.22)
        : commons.includes(entry.value)
          ? (((commonPool?.commonScore ?? 50) - 50) * commonPoolWeight)
          : (((noisePool?.noiseScore ?? 50) - 50) * noisePoolWeight);
      const appearanceRaw = activeTrio?.includes(entry.value)
        ? (
            (triadPool?.triadScore ?? 50) * 0.38 +
            support * 0.18 +
            carry * 0.16 +
            trustPct * 0.14 +
            (entry.currentShare || 0) * 0.08 +
            (entry.recentFollow1 || 0) * 0.08 +
            (entry.recentFollow2 || 0) * 0.10 +
            (entry.recentFollow3 || 0) * 0.12
          )
        : commons.includes(entry.value)
        ? (
            (commonPool?.commonScore ?? 50) * 0.40 +
            support * 0.22 +
            carry * 0.18 +
            trustPct * 0.14 +
            (entry.currentShare || 0) * 0.06
          )
        : (
            (noisePool?.noiseScore ?? 50) * 0.42 +
            Math.max(entry.latentPressure || 0, entry.noisePriorityScore || 0) * 0.22 +
            trustPct * 0.16 +
            support * 0.08 +
            ((entry.currentShare || 0) === 0 ? 8 : 0) +
            ((entry.latentPressure || 0) >= 65 ? 5 : 0)
          );
      const appearanceWeight = commons.includes(entry.value)
        ? (exactContextWeak ? 0.08 : 0.06)
        : normalizedNoiseTiming === 'due'
          ? 0.12
          : normalizedNoiseTiming === 'approaching'
            ? 0.10
            : 0.07;
      const appearanceBoost = (appearanceRaw - 50) * appearanceWeight;
      const armedNoiseConsensusBoost =
        !commons.includes(entry.value) &&
        (entry.currentShare || 0) === 0 &&
        (entry.latentPressure || 0) >= 70 &&
        (noisePool?.noiseScore ?? 0) >= 70 &&
        trustPct >= 50
          ? (normalizedNoiseTiming === 'not_due' ? 4 : normalizedNoiseTiming === 'approaching' ? 6 : 8)
          : 0;
      const exactPoolAgreementBonus = commons.includes(entry.value)
        ? (
            (commonPool?.commonScore ?? 0) >= 60 &&
            support >= 45 &&
            trustPct >= 60
              ? 2
              : 0
          )
        : (
            (noisePool?.noiseScore ?? 0) >= 60 &&
            (entry.latentPressure || 0) >= 45 &&
            trustPct >= 50
              ? 2
              : 0
          );
      const motifBoost =
        (entry.motifScore || 0) >= 65
          ? (exactContextWeak ? 8 : 6)
          : (entry.motifScore || 0) >= 45
            ? (exactContextWeak ? 4 : 3)
            : (entry.motifScore || 0) >= 25
              ? 1
              : 0;
      const recentFollowBoost =
        ((entry.recentFollow1 || 0) * 0.10) +
        ((entry.recentFollow2 || 0) * 0.14) +
        ((entry.recentFollow3 || 0) * 0.20);
      const runBreakSiblingBoost =
        currentRunLen >= 2 &&
        !!activeTrio &&
        activeTrio.includes(entry.value) &&
        entry.value !== lastRoll
          ? (
              Math.max(0, ((entry.supportScore || 0) - 30) * 0.10) +
              Math.max(0, ((entry.recentCarryScore || 0) - 28) * 0.08) +
              (entry.direction === 'rising' ? 5 : entry.direction === 'stable' ? 3 : 0) +
              ((entry.currentShare || 0) >= 20 ? 3 : 0)
            )
          : 0;
      const selfRunPenalty =
        currentRunLen >= 2 &&
        entry.value === lastRoll &&
        !entry.pair1Reliable
          ? (((entry.pair1 || 0) >= 80 ? 10 : 6) + (currentRunLen >= 3 ? 4 : 0))
          : 0;
      const emergingOutsiderBoost =
        !commons.includes(entry.value) &&
        freshOutsider?.value === entry.value &&
        (freshOutsider.recent2Hits || 0) >= 1 &&
        (freshOutsider.score || 0) >= 65 &&
        (freshOutsider.direction === 'rising' || (freshOutsider.recent4Hits || 0) >= 2)
          ? Math.min(16, Math.round((freshOutsider.score || 0) * 0.14))
          : 0;
      const loopCommonBoost =
        commons.includes(entry.value) &&
        localLoopActive &&
        activeLoopPair?.includes(entry.value)
          ? ((entry.currentShare || 0) >= 35 ? 5 : 3)
          : 0;
      const loopNoisePenalty =
        !commons.includes(entry.value) &&
        localLoopActive &&
        activeLoopPair &&
        !activeLoopPair.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        (entry.activationScore || 0) < 40 &&
        (entry.pair1 || 0) < 35 &&
        (entry.pair2 || 0) < 35
          ? 6
          : 0;
      const trioActiveBoost =
        !!activeTrio &&
        activeTrio.includes(entry.value)
          ? ((entry.currentShare || 0) >= 30 ? 8 : 5)
          : 0;
      const sandwichReturnBoost =
        sandwichReturnValue === entry.value
          ? 10 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 2 : 0)
          : 0;
      const dormantFourthBoost =
        dormantMissingFourth === entry.value
          ? (normalizedNoiseTiming === 'due' ? 10 : 5)
          : 0;
      const trioOutsiderPenalty =
        !!activeTrio &&
        !activeTrio.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        (entry.pair1 || 0) < 35 &&
        (entry.pair2 || 0) < 35
          ? 14
          : 0;
      const reboundBoost = commons.includes(entry.value) ? (commonPool?.reboundBoost || 0) : 0;
      return {
        ...entry,
        exactContextWeak,
        appearanceRaw: Math.round(appearanceRaw * 100) / 100,
        appearanceBoost: Math.round(appearanceBoost * 100) / 100,
        motifBoost,
        recentFollowBoost: Math.round(recentFollowBoost * 100) / 100,
        runBreakSiblingBoost: Math.round(runBreakSiblingBoost * 100) / 100,
        selfRunPenalty,
        emergingOutsiderBoost,
        loopCommonBoost,
        loopNoisePenalty,
        trioActiveBoost,
        sandwichReturnBoost,
        dormantFourthBoost,
        trioOutsiderPenalty,
        refinedExactScore: Math.round(((entry.exactScore || 0) + poolBoost + reboundBoost + appearanceBoost + armedNoiseConsensusBoost + exactPoolAgreementBonus + motifBoost + recentFollowBoost + runBreakSiblingBoost + emergingOutsiderBoost + loopCommonBoost + trioActiveBoost + sandwichReturnBoost + dormantFourthBoost - selfRunPenalty - loopNoisePenalty - trioOutsiderPenalty) * 100) / 100,
      };
    })
    .sort((a, b) => {
      const diff = (b.refinedExactScore || 0) - (a.refinedExactScore || 0);
      if (Math.abs(diff) >= 1.25) return diff;
      const bCommon = commonDecisionMap.get(b.value);
      const aCommon = commonDecisionMap.get(a.value);
      if (bCommon || aCommon) {
        const commonDiff = ((bCommon?.commonScore || 0) - (aCommon?.commonScore || 0));
        if (Math.abs(commonDiff) >= 6) return commonDiff;
      }
      const bNoise = noiseDecisionMap.get(b.value);
      const aNoise = noiseDecisionMap.get(a.value);
      if (bNoise || aNoise) {
        const noiseDiff = ((bNoise?.noiseScore || 0) - (aNoise?.noiseScore || 0));
        if (Math.abs(noiseDiff) >= 6) return noiseDiff;
      }
      return (b.exactScore || 0) - (a.exactScore || 0);
    });
  const finalAnalyzerRanked = refinedAnalyzerRanked.length ? refinedAnalyzerRanked : analyzerRanked;
  const lastBlock = recentBlocks[recentBlocks.length - 1] || null;
  const prevBlock = recentBlocks[recentBlocks.length - 2] || null;
  const thirdBlock = recentBlocks[recentBlocks.length - 3] || null;
  const preLoopLikeMixedBoard =
    recent8.length >= 6 &&
    new Set(recent8).size <= 3 &&
    Math.max(...VALUES.map((value) => (recent8Dist?.[value] || 0)), 0) <= 50 &&
    commons.reduce((sum, value) => sum + (recent6Dist[value] || 0), 0) >= 60;
  let analyzerFinalScores = normalizePoolScores(
    finalAnalyzerRanked.map((entry) => {
      const commonPool = commonDecisionMap.get(entry.value);
      const noisePool = noiseDecisionMap.get(entry.value);
      const triadPool = triadDecisionMap.get(entry.value);
      const trustPct = Math.round((entry.trustScore || 0) * 100);
      const support = entry.supportScore || 0;
      const carry = entry.recentCarryScore || 0;
      const appearanceRaw = entry.appearanceRaw || 50;
      const latent = Math.max(entry.latentPressure || 0, entry.noisePriorityScore || 0);
      const poolScore = activeTrio?.includes(entry.value)
        ? (triadPool?.triadScore ?? 50)
        : commons.includes(entry.value)
          ? (commonPool?.commonScore ?? 50)
          : (noisePool?.noiseScore ?? 50);
      const deciderPoolBoost =
        activeTrio?.includes(entry.value)
          ? (poolScore - 50) * 0.20
          : commons.includes(entry.value)
            ? (poolScore - 50) * 0.16
            : (poolScore - 50) * (normalizedNoiseTiming === 'due' ? 0.22 : normalizedNoiseTiming === 'approaching' ? 0.18 : 0.14);
      const deciderTrustBoost = (trustPct - 50) * 0.08;
      const deciderAppearanceBoost = (appearanceRaw - 50) * 0.10;
      const deciderStateBoost = commons.includes(entry.value)
        ? ((support - 40) * 0.06) + ((carry - 35) * 0.04)
        : ((latent - 40) * 0.05) + (((entry.currentShare || 0) === 0 && latent >= 60 && trustPct >= 55) ? 3 : 0);
      const deciderMotifBoost =
        (entry.motifScore || 0) >= 70
          ? 8
          : (entry.motifScore || 0) >= 50
            ? 5
            : (entry.motifScore || 0) >= 30
              ? 2
              : 0;
      const deciderRecentFollowBoost =
        ((entry.recentFollow1 || 0) * 0.05) +
        ((entry.recentFollow2 || 0) * 0.07) +
        ((entry.recentFollow3 || 0) * 0.11);
      const deciderRunBreakSiblingBoost =
        currentRunLen >= 2 &&
        !!activeTrio &&
        activeTrio.includes(entry.value) &&
        entry.value !== lastRoll
          ? (
              Math.max(0, ((entry.supportScore || 0) - 30) * 0.05) +
              Math.max(0, ((entry.recentCarryScore || 0) - 28) * 0.04) +
              (entry.direction === 'rising' ? 3 : entry.direction === 'stable' ? 2 : 0)
            )
          : 0;
      const deciderSelfRunPenalty =
        currentRunLen >= 2 &&
        entry.value === lastRoll &&
        !entry.pair1Reliable
          ? (((entry.pair1 || 0) >= 80 ? 10 : 6) + (currentRunLen >= 3 ? 3 : 0))
          : 0;
      const deciderEmergingOutsiderBoost =
        !commons.includes(entry.value) &&
        freshOutsider?.value === entry.value &&
        (freshOutsider.recent2Hits || 0) >= 1 &&
        (freshOutsider.score || 0) >= 65 &&
        (freshOutsider.direction === 'rising' || (freshOutsider.recent4Hits || 0) >= 2)
          ? Math.min(12, Math.round((freshOutsider.score || 0) * 0.10))
          : 0;
      const deciderLoopBoost =
        commons.includes(entry.value) &&
        localLoopActive &&
        activeLoopPair?.includes(entry.value)
          ? ((entry.currentShare || 0) >= 35 ? 6 : 3)
          : 0;
      const deciderLoopPenalty =
        !commons.includes(entry.value) &&
        localLoopActive &&
        activeLoopPair &&
        !activeLoopPair.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        (entry.activationScore || 0) < 42
          ? 6
          : 0;
      const deciderTrioBoost =
        !!activeTrio && activeTrio.includes(entry.value)
          ? (
              ((entry.currentShare || 0) >= 30 ? 12 : 8) +
              ((entry.recentFollow2 || 0) >= 45 ? 4 : 0) +
              ((entry.pair2 || 0) >= 45 ? 3 : 0)
            )
          : 0;
      const deciderSandwichBoost =
        sandwichReturnValue === entry.value
          ? 8 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 2 : 0)
          : 0;
      const deciderBridgeReturnBoost =
        bridgeReturnValue === entry.value
          ? 38 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 6 : 0)
          : 0;
      const deciderPreBlockBoost =
        preBlockReturnValue === entry.value
          ? 12 + ((entry.direction === 'rising' || entry.direction === 'stable') ? 2 : 0)
          : 0;
      const deciderMissingFourthRotationBoost =
        missingFourthRotationValue === entry.value
          ? (
              14 +
              ((entry.currentShare || 0) === 0 ? 6 : 0) +
              ((entry.latentPressure || 0) >= 45 ? 4 : 0)
            )
          : 0;
      const deciderQuadGapShockBoost =
        quadGapShockValue === entry.value
          ? (
              normalizedNoiseTiming === 'due'
                ? 44 + ((entry.currentShare || 0) === 0 ? 12 : 0) + ((entry.latentPressure || 0) >= 45 ? 10 : 0)
                : 28 + ((entry.currentShare || 0) === 0 ? 8 : 0)
            )
          : 0;
      const deciderCycleRestartBoost =
        cycleRestartValue === entry.value
          ? (
              34 +
              ((entry.supportScore || 0) >= 40 ? 6 : 0) +
              ((entry.currentShare || 0) >= 20 ? 4 : 0)
            )
          : 0;
      const deciderDoubleBridgeEchoBoost =
        doubleBridgeEchoValue === entry.value
          ? (
              normalizedNoiseTiming === 'not_due'
                ? 30 + ((entry.currentShare || 0) === 0 ? 8 : 0)
                : 18 + ((entry.currentShare || 0) === 0 ? 6 : 0)
            )
          : 0;
      const deciderDoubleBridgeSwapBoost =
        doubleBridgeSwapValue === entry.value
          ? (
              normalizedNoiseTiming === 'due'
                ? 36 + ((entry.currentShare || 0) === 0 ? 10 : 0)
                : 24 + ((entry.currentShare || 0) === 0 ? 8 : 0)
            )
          : 0;
      const deciderTightPairBoost =
        tightPairBoard && tightPairValues.includes(entry.value)
          ? 24 + (commons.includes(entry.value) ? 8 : 0)
          : 0;
      const deciderTightPairOutsiderPenalty =
        tightPairBoard &&
        !tightPairValues.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        (entry.recent2Hits || 0) === 0
          ? (
              normalizedNoiseTiming === 'not_due'
                ? 34 + ((entry.currentShare || 0) === 0 ? 8 : 0)
                : 20 + ((entry.currentShare || 0) === 0 ? 6 : 0)
            )
          : 0;
      const deciderSequenceEchoBoost =
        !tightPairBoard &&
        !mixedQuadActive &&
        recent8.length >= 8 &&
        (entry.currentShare || 0) === 0 &&
        (entry.pair1 || 0) === 0 &&
        (entry.pair2 || 0) === 0 &&
        (entry.globalPair3Pct || 0) >= 50
          ? (
              normalizedNoiseTiming === 'not_due'
                ? 28 + ((entry.latentPressure || 0) >= 50 ? 8 : 0)
                : 18 + ((entry.latentPressure || 0) >= 50 ? 6 : 0)
            )
          : 0;
      const deciderDormantFourthBoost =
        dormantMissingFourth === entry.value
          ? (normalizedNoiseTiming === 'due' ? 9 : 4)
          : 0;
      const deciderCommonReturnBoost =
        commonReturnArmed && entry.value === siblingCommonValue
          ? Math.min(34, commonReturnStrength + 16)
          : 0;
      const deciderCommonHoldBoost =
        commonHoldActive && entry.value === lastRoll
          ? 18 + Math.max(0, ((entry.currentShare || 0) - 30) * 0.12)
          : commonHoldActive && commons.includes(entry.value)
            ? 6
            : 0;
      const deciderCommonReclaimBoost =
        commonReclaimArmed && entry.value === commonReclaimValue
          ? Math.min(28, commonReclaimStrength + 8)
          : 0;
      const deciderCommonReturnPenalty =
        commonReturnArmed && entry.value === lastRoll
          ? Math.min(24, 12 + (currentRunLen >= 4 ? 6 : 0))
          : 0;
      const deciderCommonReturnNoisePenalty =
        commonReturnArmed &&
        !commons.includes(entry.value) &&
        (entry.currentShare || 0) <= 20 &&
        freshOutsider?.value !== entry.value
          ? (normalizedNoiseTiming === 'due' ? 26 : normalizedNoiseTiming === 'approaching' ? 16 : 9)
          : 0;
      const deciderTrioPenalty =
        !!activeTrio &&
        !activeTrio.includes(entry.value) &&
        (entry.currentShare || 0) <= 20
          ? (
              18 +
              ((entry.recent4Hits || 0) === 0 ? 6 : 0) +
              ((entry.recent2Hits || 0) === 0 ? 4 : 0) +
              ((entry.pair1 || 0) < 35 ? 4 : 0) +
              ((entry.pair2 || 0) < 35 ? 6 : 0)
            )
          : 0;
      const deciderBreakPressureBoost =
        !commons.includes(entry.value) && freshOutsider?.value === entry.value
          ? (
              Math.min(8, Math.max(0, Math.round((freshOutsider.score || 0) * 0.08))) +
              ((freshOutsider.recent2Hits || 0) >= 1 ? 2 : 0) +
              (freshOutsider.direction === 'rising' ? 2 : 0)
            )
          : 0;
      const deciderPhantomPenalty =
        (entry.currentShare || 0) === 0 &&
        (entry.recent4Hits || 0) === 0 &&
        (entry.recent2Hits || 0) === 0 &&
        (entry.pair1 || 0) < 20 &&
        (entry.pair2 || 0) < 20 &&
        (!freshOutsider?.value || freshOutsider.value !== entry.value)
          ? (
              dormantMissingFourth === entry.value
                ? (normalizedNoiseTiming === 'due' ? 6 : 3)
                : (normalizedNoiseTiming === 'due' ? 18 : normalizedNoiseTiming === 'approaching' ? 10 : 6)
            )
          : 0;
      const thinPairMirage =
        !(entry.pair1Reliable || entry.pair2Reliable) &&
        ((entry.pair1 || 0) >= 80 || (entry.pair2 || 0) >= 80) &&
        (entry.currentShare || 0) <= 25 &&
        support < 42 &&
        carry < 40 &&
        trustPct < 75 &&
        entry.direction !== 'rising';
      const thinPairPenalty = thinPairMirage
        ? (
            commons.includes(entry.value)
              ? (((entry.pair1 || 0) >= 80 ? 5 : 0) + ((entry.pair2 || 0) >= 80 ? 4 : 0))
              : (((entry.pair1 || 0) >= 80 ? 7 : 0) + ((entry.pair2 || 0) >= 80 ? 6 : 0))
          )
        : 0;
      const baseFinalDecisionRaw =
        (entry.refinedExactScore ?? entry.exactScore ?? entry.score ?? 0) +
        deciderPoolBoost +
        deciderTrustBoost +
        deciderAppearanceBoost +
        deciderStateBoost +
        deciderMotifBoost +
        deciderRecentFollowBoost +
        deciderRunBreakSiblingBoost +
        deciderEmergingOutsiderBoost +
        deciderLoopBoost +
        deciderTrioBoost +
        deciderSandwichBoost +
        deciderBridgeReturnBoost +
        deciderPreBlockBoost +
        deciderMissingFourthRotationBoost +
        deciderQuadGapShockBoost +
        deciderCycleRestartBoost +
        deciderDoubleBridgeEchoBoost +
        deciderDoubleBridgeSwapBoost +
        deciderTightPairBoost +
        deciderSequenceEchoBoost +
        deciderDormantFourthBoost +
        deciderCommonReturnBoost +
        deciderCommonReclaimBoost +
        deciderCommonHoldBoost +
        deciderBreakPressureBoost -
        deciderSelfRunPenalty -
        deciderLoopPenalty -
        deciderTrioPenalty -
        deciderTightPairOutsiderPenalty -
        deciderCommonReturnPenalty -
        deciderCommonReturnNoisePenalty -
        deciderPhantomPenalty -
        thinPairPenalty;
      const sequenceDecisionRaw =
        (entry.exactScore || 0) * -0.4119 +
        (entry.pair1 || 0) * 0.1808 +
        (entry.globalPair1Pct || 0) * 0.3200 +
        (entry.pair2 || 0) * 0.8750 +
        (entry.globalPair2Pct || 0) * 0.5200 +
        (entry.globalPair3Pct || 0) * 0.7400 +
        trustPct * 0.0314 +
        support * 0.2051 +
        carry * 0.0821 +
        (noisePool?.noiseScore || 0) * 0.3345 +
        Math.max(entry.latentPressure || 0, 0) * -0.0327 +
        (entry.recentFollow3 || 0) * 0.4200 +
        (lastBlock?.value === entry.value ? -0.1524 : 0) +
        (prevBlock?.value === entry.value ? -10.9597 : 0) +
        (thirdBlock?.value === entry.value ? -14.2926 : 0) +
        ((lastBlock?.value === entry.value ? lastBlock.len : 0) * -9.0859) +
        ((prevBlock?.value === entry.value ? prevBlock.len : 0) * -2.9796) +
        ((thirdBlock?.value === entry.value ? thirdBlock.len : 0) * -0.2541) +
        (sandwichReturnValue === entry.value ? 24.7856 : 0) +
        (dormantMissingFourth === entry.value ? 7.5407 : 0) +
        (activeTrio?.includes(entry.value) ? -8.9227 : 0) +
        (lastBlock?.value === entry.value && (lastBlock?.len || 0) >= 2 ? -16.5408 : 0) +
        (prevBlock?.value === entry.value && (prevBlock?.len || 0) === 1 ? -12.3651 : 0);
      const commonPoolLead =
        commons.includes(entry.value)
          ? Math.max(0, (commonPool?.commonScore || 0) - ((commonDecisionScores[1]?.commonScore || 0)))
          : 0;
      const noisePoolLead =
        noise.includes(entry.value)
          ? Math.max(0, (noisePool?.noiseScore || 0) - ((noiseDecisionScores[1]?.noiseScore || 0)))
          : 0;
      const statePool = sessionStateMap.get(entry.value);
      const breakAligned =
        !commons.includes(entry.value) &&
        freshOutsider?.value === entry.value &&
        (freshOutsider.score || 0) >= 55;
      const sequenceWeight =
        sequenceBoardActive
          ? (normalizedNoiseTiming === 'not_due' ? 0.24 : 0.34)
          : mixedQuadActive
            ? (normalizedNoiseTiming === 'not_due' ? 0.38 : 0.44)
          : preLoopLikeMixedBoard
            ? (normalizedNoiseTiming === 'not_due' ? 0.20 : 0.30)
            : normalizedNoiseTiming === 'due'
              ? 0.36
              : normalizedNoiseTiming === 'approaching'
                ? 0.28
                : 0.18;
      const baseWeight = 1 - sequenceWeight;
      const consensusBoost =
        commons.includes(entry.value)
          ? commonPoolLead * (normalizedNoiseTiming === 'not_due' ? 0.24 : 0.14)
          : noisePoolLead * (normalizedNoiseTiming === 'due' ? 0.24 : normalizedNoiseTiming === 'approaching' ? 0.18 : 0.10);
      const emergingCommonBoost =
        commons.includes(entry.value) &&
        (entry.currentShare || 0) >= 35 &&
        (entry.supportScore || 0) >= 45 &&
        (entry.recentCarryScore || 0) >= 38 &&
        (entry.direction === 'rising' || entry.direction === 'stable')
          ? 8 + Math.max(0, Math.round(((entry.currentShare || 0) - 35) * 0.10))
          : 0;
      const overdueNoiseBoost =
        !commons.includes(entry.value) &&
        normalizedNoiseTiming !== 'not_due' &&
        (entry.latentPressure || 0) >= 55 &&
        (entry.noisePriorityScore || 0) >= 55
          ? 6 + Math.max(0, Math.round(((entry.noisePriorityScore || 0) - 55) * 0.10))
          : 0;
      const breakAlignmentBoost = breakAligned
        ? (normalizedNoiseTiming === 'due' ? 12 : normalizedNoiseTiming === 'approaching' ? 8 : 4)
        : 0;
      const mixedQuadSequenceBoost =
        mixedQuadActive
          ? (
              (entry.globalPair3Pct || 0) * 0.30 +
              (entry.recentFollow3 || 0) * 0.26 +
              (entry.globalPair2Pct || 0) * 0.10 +
              (entry.recentFollow2 || 0) * 0.08 +
              ((entry.currentShare || 0) >= 20 && (entry.currentShare || 0) <= 40 ? 4 : 0)
            )
          : 0;
      const mixedQuadPoolPenalty =
        mixedQuadActive
          ? (
              commons.includes(entry.value)
                ? Math.max(0, Math.abs((commonPool?.commonScore || 50) - 50) - 8) * 0.18
                : Math.max(0, Math.abs((noisePool?.noiseScore || 50) - 50) - 8) * 0.16
            )
          : 0;
      const poolMismatchPenalty =
        commons.includes(entry.value) && normalizedNoiseTiming === 'due' && commonPoolLead <= 0 && (entry.currentShare || 0) <= 20
          ? 6
          : (!commons.includes(entry.value) && normalizedNoiseTiming === 'not_due' && noisePoolLead <= 0 && !breakAligned ? 8 : 0);
      const sessionStateBoost =
        (((statePool?.stateScore || 50) - 50) *
          (sessionStatePreviewKey === 'break'
            ? 0.34
            : sessionStatePreviewKey === 'probe'
              ? 0.26
              : sessionStatePreviewKey === 'reentry'
                ? 0.30
                : 0.28)) +
        (sessionStatePreviewKey === 'pair' && commons.includes(entry.value) ? (statePool?.backboneScore || 0) * 0.05 : 0) +
        (sessionStatePreviewKey === 'probe' && commons.includes(entry.value) ? (statePool?.backboneScore || 0) * 0.04 : 0) +
        (sessionStatePreviewKey === 'break' && noise.includes(entry.value) ? (statePool?.breakScore || 0) * 0.05 : 0) +
        (sessionStatePreviewKey === 'reentry' && commons.includes(entry.value) ? (statePool?.reentryScore || 0) * 0.05 : 0) -
        (sessionStatePreviewKey === 'pair' && noise.includes(entry.value) && !breakAligned ? 8 : 0);
      const noisePhaseBoost =
        noisePhase === 'recovery'
          ? (
              commons.includes(entry.value)
                ? (
                    8 +
                    (entry.value !== lastRoll ? 4 : 0) +
                    Math.max(0, ((commonPool?.commonScore || 50) - 50) * 0.12) +
                    Math.max(0, ((entry.pair2 || 0) - 35) * 0.05)
                  )
                : -(
                    10 +
                    ((entry.currentShare || 0) <= 20 ? 4 : 0) +
                    ((entry.value === freshOutsider?.value && (freshOutsider?.recent2Hits || 0) === 0) ? 4 : 0)
                  )
            )
          : noisePhase === 'burst'
            ? (
                commons.includes(entry.value)
                  ? -2
                  : (
                      4 +
                      (entry.value === freshOutsider?.value ? 3 : 0) +
                      ((entry.recent2Hits || 0) >= 1 ? 2 : 0)
                    )
              )
            : noisePhase === 'charge'
              ? (
                  commons.includes(entry.value)
                    ? -2
                    : (
                        3 +
                        Math.max(0, ((noisePool?.noiseScore || 50) - 50) * 0.08)
                      )
                )
              : 0;
      const matureSession = rolls.length >= 8;
      const matureCommonLead =
        matureSession && commons.includes(entry.value)
          ? Math.max(0, ((commonPool?.commonScore || 50) - 50) * 0.16) +
            Math.max(0, ((entry.supportScore || 0) - 40) * 0.08) +
            Math.max(0, ((entry.recentCarryScore || 0) - 32) * 0.06) +
            ((entry.currentShare || 0) >= 35 ? 4 : 0)
          : 0;
      const matureNoiseBrake =
        matureSession && noise.includes(entry.value) && !mixedQuadActive
          ? (
              (normalizedNoiseTiming === 'not_due' ? 10 : normalizedNoiseTiming === 'approaching' ? 6 : 2) +
              ((entry.currentShare || 0) <= 20 ? 4 : 0) +
              ((entry.recent2Hits || 0) === 0 ? 3 : 0) +
              (!breakAligned ? 4 : 0) +
              (freshOutsider?.value === entry.value && (freshOutsider?.recent2Hits || 0) === 0 ? 3 : 0)
            )
          : 0;
      const pairNotDueDiscipline =
        normalizedNoiseTiming === 'not_due' && !activeTrio && !mixedQuadActive
          ? (
              commons.includes(entry.value)
                ? (
                    7 +
                    Math.max(0, ((commonPool?.commonScore || 50) - 50) * 0.18) +
                    Math.max(0, ((entry.pair2 || 0) - 40) * 0.05) +
                    Math.max(0, ((entry.recentCarryScore || 0) - 35) * 0.05) +
                    (entry.pair2Reliable ? 4 : 0) +
                    (entry.direction === 'stable' ? 2 : 0)
                  )
                : -(
                    7 +
                    Math.max(0, ((noisePool?.noiseScore || 50) - 50) * 0.14) +
                    ((entry.currentShare || 0) <= 20 ? 4 : 0) +
                    ((entry.pair2 || 0) < 35 ? 3 : 0) +
                    ((entry.recent2Hits || 0) === 0 ? 2 : 0) +
                    (!breakAligned ? 3 : 0)
                  )
            )
          : 0;
      const sessionNoiseBeatDiscipline =
        flashNoiseSession
          ? (
              commons.includes(entry.value)
                ? (
                    4 +
                    (entry.value === siblingCommonValue ? 6 : 0) +
                    (postNoiseSiblingRate >= 0.4 ? 4 : postNoiseSiblingRate >= 0.2 ? 2 : 0)
                  )
                : -(
                    (
                      sessionStatePreviewKey === 'probe' &&
                      entry.value === noiseDecisionScores[0]?.value &&
                      (noisePool?.noiseScore || 0) >= 72
                        ? 2
                        : 5
                    ) +
                    ((entry.recent2Hits || 0) === 0 ? (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 1 : 4) : 0) +
                    (freshOutsider?.value === entry.value ? 0 : (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 0 : 2))
                  )
            )
          : stickyNoiseSession
            ? (
                commons.includes(entry.value)
                  ? -2
                  : (
                      ((entry.recent2Hits || 0) >= 1 || freshOutsider?.value === entry.value) ? 5 : 0
                    )
              )
            : 0;
      const breakDueDiscipline =
        normalizedNoiseTiming === 'due' && !activeTrio && !mixedQuadActive
          ? (
              commons.includes(entry.value)
                ? -(
                    ((commonPool?.commonScore || 50) < 45 ? 4 : 0) +
                    ((entry.currentShare || 0) <= 20 ? 5 : 0)
                  )
                : (
                    4 +
                    Math.max(0, ((noisePool?.noiseScore || 50) - 50) * 0.12) +
                    (breakAligned ? 3 : 0) +
                    ((entry.recent2Hits || 0) >= 1 ? 2 : 0)
                  )
            )
          : 0;
      const commonDominantDiscipline =
        effectiveCommonDominantBoard && !noiseTriggerConfirmed
          ? (
              commons.includes(entry.value)
                ? (
                    18 +
                    Math.max(0, ((commonPool?.commonScore || 50) - 50) * 0.18) +
                    Math.max(0, ((entry.supportScore || 0) - 40) * 0.08) +
                    Math.max(0, ((entry.recentCarryScore || 0) - 34) * 0.05) +
                    (entry.value === lastRoll ? 3 : 0)
                  )
                : -(
                    (
                      sessionStatePreviewKey === 'probe' &&
                      entry.value === noiseDecisionScores[0]?.value &&
                      (noisePool?.noiseScore || 0) >= 72
                        ? 7
                        : 16
                    ) +
                    Math.max(0, ((noisePool?.noiseScore || 50) - 50) * (
                      sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 0.06 : 0.14
                    )) +
                    ((entry.currentShare || 0) <= 20 ? (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 1 : 4) : 0) +
                    ((entry.recent2Hits || 0) === 0 ? (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 1 : 3) : 0) +
                    (!breakAligned ? (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 2 : 6) : 0)
                  )
            )
          : 0;
      const noiseProbeBrake =
        noiseProbeOnly && !noiseTriggerConfirmed
          ? (
              commons.includes(entry.value)
                ? 5
                : -(
                    (
                      sessionStatePreviewKey === 'probe' &&
                      entry.value === noiseDecisionScores[0]?.value &&
                      (noisePool?.noiseScore || 0) >= 72
                        ? 1
                        : 5
                    ) +
                    (freshOutsider?.value === entry.value && (freshOutsider?.recent2Hits || 0) === 0
                      ? (sessionStatePreviewKey === 'probe' && entry.value === noiseDecisionScores[0]?.value ? 1 : 4)
                      : 0)
                  )
            )
          : 0;
      const mixedCycleDiscipline =
        mixedCycleBoard
          ? (
              (
                ((entry.globalPair2Pct || 0) * 0.10) +
                ((entry.globalPair3Pct || 0) * 0.16) +
                ((entry.recentFollow2 || 0) * 0.12) +
                ((entry.recentFollow3 || 0) * 0.18) +
                ((entry.pair2 || 0) * 0.06)
              ) -
              (
                commons.includes(entry.value)
                  ? Math.max(0, Math.abs((commonPool?.commonScore || 50) - 50) - 10) * 0.10
                  : Math.max(0, Math.abs((noisePool?.noiseScore || 50) - 50) - 10) * 0.12
              )
            )
          : 0;
      const breakConfirmedBoost =
        noiseTriggerConfirmed && !effectiveCommonDominantBoard
          ? (
              commons.includes(entry.value)
                ? -3
                : (
                    8 +
                    (breakAligned ? 4 : 0) +
                    ((entry.recent2Hits || 0) >= 1 ? 3 : 0)
                  )
            )
          : 0;
      const fittedDecisionRaw =
        baseFinalDecisionRaw * SVAROG_FITTED_CHOOSER_WEIGHTS.base +
        sequenceDecisionRaw * SVAROG_FITTED_CHOOSER_WEIGHTS.seq +
        (entry.refinedExactScore || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.refined +
        (entry.exactScore || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.exact +
        (commonPool?.commonScore || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.common +
        (noisePool?.noiseScore || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.noise +
        support * SVAROG_FITTED_CHOOSER_WEIGHTS.support +
        carry * SVAROG_FITTED_CHOOSER_WEIGHTS.carry +
        (entry.globalPair1Pct || 0) * 0.06 +
        (entry.pair2 || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.pair2 +
        (entry.globalPair3Pct || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.pair3 +
        (entry.globalPair2Pct || 0) * 0.11 +
        (entry.recentFollow2 || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.follow2 +
        (entry.recentFollow3 || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.follow3 +
        trustPct * SVAROG_FITTED_CHOOSER_WEIGHTS.trust +
        latent * SVAROG_FITTED_CHOOSER_WEIGHTS.latent +
        (entry.currentShare || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.share +
        (entry.motifScore || 0) * SVAROG_FITTED_CHOOSER_WEIGHTS.motif +
        consensusBoost +
        emergingCommonBoost +
        overdueNoiseBoost +
        breakAlignmentBoost +
        mixedQuadSequenceBoost -
        mixedQuadPoolPenalty -
        poolMismatchPenalty +
        noisePhaseBoost +
        matureCommonLead -
        matureNoiseBrake +
        pairNotDueDiscipline +
        sessionNoiseBeatDiscipline +
        breakDueDiscipline +
        commonDominantDiscipline +
        noiseProbeBrake +
        mixedCycleDiscipline +
        breakConfirmedBoost +
        sessionStateBoost +
        (commons.includes(entry.value) ? SVAROG_FITTED_CHOOSER_WEIGHTS.isCommon : 0) +
        (noise.includes(entry.value) ? SVAROG_FITTED_CHOOSER_WEIGHTS.isNoise : 0);
      const finalDecisionRaw = fittedDecisionRaw;
      return {
        ...entry,
        thinPairMirage,
        thinPairPenalty,
        sequenceDecisionRaw,
        baseFinalDecisionRaw,
        fittedDecisionRaw,
        consensusBoost,
        emergingCommonBoost,
        overdueNoiseBoost,
        breakAlignmentBoost,
        noisePhaseBoost,
        pairNotDueDiscipline,
        sessionNoiseBeatDiscipline,
        breakDueDiscipline,
        commonDominantDiscipline,
        noiseProbeBrake,
        mixedCycleDiscipline,
        breakConfirmedBoost,
        finalDecisionRaw,
      };
    }),
    'finalDecisionRaw',
    'pickScore'
  );
  // Rising commons floor: a commons value with a rising trend should never be 0% pick.
  // Rising = building momentum. 0% means the normalization completely buried it under noise
  // timing pressure. Enforce a floor of 10% and re-normalize so the total stays at 100.
  const risingCommonsFloor = 10;
  const needsFloor = analyzerFinalScores.some(
    (e) => commons.includes(e.value) && (trends?.[e.value]?.direction === 'rising') && (e.pickScore || 0) < risingCommonsFloor
  );
  if (needsFloor) {
    let adjusted = analyzerFinalScores.map((e) => {
      const isRisingCommon = commons.includes(e.value) && (trends?.[e.value]?.direction === 'rising');
      return isRisingCommon && (e.pickScore || 0) < risingCommonsFloor
        ? { ...e, pickScore: risingCommonsFloor }
        : e;
    });
    const adjustedTotal = adjusted.reduce((s, e) => s + (e.pickScore || 0), 0);
    if (adjustedTotal > 0) {
      const scale = 100 / adjustedTotal;
      analyzerFinalScores = adjusted.map((e) => ({ ...e, pickScore: Math.round((e.pickScore || 0) * scale) }));
      // Clamp any floating-point rounding to ensure total = 100
      const finalTotal = analyzerFinalScores.reduce((s, e) => s + (e.pickScore || 0), 0);
      if (finalTotal !== 100 && analyzerFinalScores.length > 0) {
        analyzerFinalScores[0] = { ...analyzerFinalScores[0], pickScore: (analyzerFinalScores[0].pickScore || 0) + (100 - finalTotal) };
      }
    }
  }
  let analyzerFinalRawRanked = [...analyzerFinalScores].sort(
    (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
  );
  let analyzerTop1 =
    finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
    finalAnalyzerRanked[0] ||
    null;
  let analyzerTop2 =
    finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked.find((entry) => entry.value !== analyzerTop1?.value)?.value) ||
    finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
    null;
  const bestCommonDecision = commonDecisionScores[0] || null;
  const secondCommonDecision = commonDecisionScores[1] || null;
  const bestNoiseDecision = noiseDecisionScores[0] || null;

  const bestCommonRanked = bestCommonDecision
    ? finalAnalyzerRanked.find((entry) => entry.value === bestCommonDecision.value) || null
    : null;
  const secondCommonRanked = secondCommonDecision
    ? finalAnalyzerRanked.find((entry) => entry.value === secondCommonDecision.value) || null
    : null;
  const bestNoiseRanked = bestNoiseDecision
    ? finalAnalyzerRanked.find((entry) => entry.value === bestNoiseDecision.value) || null
    : null;
  const recent8Unique = new Set(recent8).size;
  const maxRecent8Share = Math.max(...VALUES.map((value) => recent8Dist[value] || 0), 0);
  const dormantOutsider = VALUES
    .filter((value) => !activeTrio?.includes(value))
    .map((value) => finalAnalyzerRanked.find((entry) => entry.value === value) || null)
    .find(Boolean) || null;
  const triadModeActive =
    !!activeTrio &&
    !!dormantOutsider &&
    (dormantOutsider.currentShare || 0) === 0 &&
    (dormantOutsider.recent4Hits || 0) === 0 &&
    (dormantOutsider.recent2Hits || 0) === 0;
  const loopLikeMixedBoard =
    preLoopLikeMixedBoard &&
    recent8Unique <= 3 &&
    maxRecent8Share <= 50;

  const secondCommonHoldScore = secondCommonDecision
    ? (
        (secondCommonDecision.commonScore || 0) * 0.46 +
        (secondCommonDecision.supportScore || 0) * 0.18 +
        (secondCommonDecision.pair1 || 0) * 0.14 +
        (secondCommonDecision.pair2 || 0) * 0.08 +
        (secondCommonDecision.freqSignal || 0) * 0.08 +
        (secondCommonDecision.reboundBoost || 0) * 0.90 +
        (secondCommonDecision.recentCarryBoost || 0) * 1.15 +
        (localLoopActive && activeLoopPair?.includes(secondCommonDecision.value) ? 8 : 0) +
        (secondCommonDecision.value === lastRoll ? 12 : 0) +
        (secondCommonDecision.fallenCommon && !(secondCommonDecision.reboundArmed || secondCommonDecision.value === lastRoll) ? -10 : 0) +
        (secondCommonDecision.direction === 'rising' ? 4 : secondCommonDecision.direction === 'stable' ? 2 : -4)
      )
    : -Infinity;
  const weakNoiseLink =
    !!bestNoiseDecision &&
    (bestNoiseDecision.currentShare || 0) <= 20 &&
    (bestNoiseDecision.pair1 || 0) < 35 &&
    (bestNoiseDecision.pair2 || 0) < 35;
  const outsiderMismatchPenalty =
    loopLikeMixedBoard &&
    weakNoiseLink &&
    !!freshOutsider?.value &&
    freshOutsider.value !== bestNoiseDecision?.value
      ? 12
      : 0;
  const bestNoiseChallengeScore = bestNoiseDecision
    ? (
        (bestNoiseDecision.noiseScore || 0) * 0.42 +
        (bestNoiseDecision.pressureScore || 0) * 0.20 +
        (bestNoiseDecision.activationScore || 0) * 0.16 +
        (bestNoiseDecision.latentPressure || 0) * 0.12 +
        (bestNoiseDecision.armedNoiseBoost || 0) * 0.65 +
        (freshOutsider?.value === bestNoiseDecision.value ? Math.min(10, Math.round((freshOutsider.score || 0) * 0.08)) : 0) +
        (localLoopActive && activeLoopPair && !activeLoopPair.includes(bestNoiseDecision.value) && (bestNoiseDecision.currentShare || 0) <= 20 ? -10 : 0) +
        (loopLikeMixedBoard && weakNoiseLink && (bestNoiseDecision.recent2Hits || 0) === 0 ? -8 : 0) +
        (normalizedNoiseTiming === 'due' ? 12 : normalizedNoiseTiming === 'approaching' ? 6 : -4) +
        (bestNoiseDecision.direction === 'rising' ? 4 : bestNoiseDecision.direction === 'stable' ? 2 : -4) -
        outsiderMismatchPenalty
      )
    : -Infinity;
  const hiddenNoiseException =
    !!bestCommonRanked &&
    !!secondCommonRanked &&
    !!bestNoiseRanked &&
    normalizedNoiseTiming === 'not_due' &&
    (bestNoiseDecision?.currentShare || 0) === 0 &&
    (bestNoiseDecision?.latentPressure || 0) >= 65 &&
    (bestNoiseDecision?.noiseScore || 0) >= 68 &&
    (bestNoiseDecision?.trustScore || 0) >= 0.5 &&
    (bestNoiseDecision?.supportScore || 0) <= 22 &&
    bestNoiseChallengeScore >= secondCommonHoldScore + 10 &&
    (bestCommonDecision?.commonScore || 0) >= 60;
  const stableLoopGuard =
    !!activeLoopPair &&
    !!bestNoiseDecision &&
    ((isAlternating && alternatingPair?.length === 2) || localLoopActive) &&
    !activeLoopPair.includes(bestNoiseDecision.value) &&
    (bestNoiseDecision.currentShare || 0) <= 20 &&
    (
      !freshOutsider?.value ||
      freshOutsider.value !== bestNoiseDecision.value ||
      (freshOutsider.recent2Hits || 0) === 0
    );
  const trioOutsiderGuard =
    !!activeTrio &&
    !!bestNoiseDecision &&
    !activeTrio.includes(bestNoiseDecision.value) &&
    (bestNoiseDecision.currentShare || 0) <= 20 &&
    (bestNoiseDecision.pair1 || 0) < 35 &&
    (bestNoiseDecision.pair2 || 0) < 35;
  const commonReturnGuard =
    commonReturnArmed &&
    !!bestNoiseDecision &&
    (bestNoiseDecision.currentShare || 0) <= 20 &&
    (bestNoiseDecision.recent2Hits || 0) === 0 &&
    (bestNoiseDecision.recent4Hits || 0) <= 1 &&
    freshOutsider?.value !== bestNoiseDecision.value;
  const flashNoiseGuard =
    flashNoiseSession &&
    !!bestNoiseDecision &&
    (bestNoiseDecision.recent2Hits || 0) === 0 &&
    (bestNoiseDecision.recent4Hits || 0) <= 1 &&
    freshOutsider?.value !== bestNoiseDecision.value;
  const allowBreakChallenge =
    !!bestCommonRanked &&
    !!secondCommonRanked &&
    !!bestNoiseRanked &&
    (normalizedNoiseTiming !== 'not_due' || hiddenNoiseException) &&
    (bestCommonDecision?.commonScore || 0) >= 52 &&
    !stableLoopGuard &&
    !trioOutsiderGuard &&
    !mixedQuadActive &&
    !commonReturnGuard &&
    !flashNoiseGuard;
  const breakChallengeMargin =
    hiddenNoiseException
      ? 10
      : flashNoiseSession
        ? (normalizedNoiseTiming === 'due' ? 9 : normalizedNoiseTiming === 'approaching' ? 12 : 999)
      : normalizedNoiseTiming === 'due'
      ? 4
      : normalizedNoiseTiming === 'approaching'
        ? 8
        : 999;
  const anchoredCommonMargin =
    secondCommonDecision?.value === lastRoll
      ? 6
      : secondCommonDecision?.reboundArmed
        ? 4
        : 0;
  const loopLikeMargin = loopLikeMixedBoard && weakNoiseLink ? 8 : 0;
  const shouldPromoteNoiseOverSecondCommon =
    allowBreakChallenge &&
    bestNoiseChallengeScore >= secondCommonHoldScore + breakChallengeMargin + anchoredCommonMargin + loopLikeMargin &&
    bestNoiseDecision?.value !== bestCommonDecision?.value;
  const breakChallengeThreshold =
    breakChallengeMargin + anchoredCommonMargin + loopLikeMargin;
  const breakChallengeEdge =
    (bestNoiseChallengeScore || 0) - (secondCommonHoldScore || 0);
  const sessionDeveloped = rolls.length >= 6;
  const sessionMature = rolls.length >= 8;
  const commonAnchorNoiseQuiet =
    !bestNoiseDecision ||
    (
      (bestNoiseDecision.currentShare || 0) <= 20 &&
      (bestNoiseDecision.recent2Hits || 0) === 0 &&
      (bestNoiseDecision.recent4Hits || 0) <= 1
    );
  const pairNotDueCommonsLock =
    !triadModeActive &&
    normalizedNoiseTiming === 'not_due' &&
    !!bestCommonRanked &&
    !!secondCommonRanked;
  const bestNoiseBreakAligned =
    !!bestNoiseDecision &&
    (
      freshOutsider?.value === bestNoiseDecision.value ||
      (bestNoiseDecision.activationScore || 0) >= 28
    );
  const pairNotDueNoiseBreakReady =
    !!bestNoiseDecision &&
    (
      hiddenNoiseException ||
      (
        bestNoiseBreakAligned &&
        (
          (bestNoiseDecision.currentShare || 0) >= 35 ||
          (bestNoiseDecision.recent2Hits || 0) >= 2 ||
          (bestNoiseDecision.recent4Hits || 0) >= 2 ||
          (freshOutsider?.value === bestNoiseDecision.value &&
            (
              (
                (freshOutsider.recent2Hits || 0) >= 1 &&
                (freshOutsider.recent4Hits || 0) >= 2
              ) ||
              (freshOutsider.recent4Hits || 0) >= 2
            ))
        )
      )
    );
  const hardPairHoldTakeover =
    pairNotDueCommonsLock &&
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !pairNotDueNoiseBreakReady &&
    !mixedQuadActive &&
    !triadModeActive &&
    !shouldPromoteNoiseOverSecondCommon &&
    (bestCommonDecision.commonScore || 0) >= 55 &&
    (secondCommonDecision.commonScore || 0) >= 12;
  const developingCommonsAnchorTakeover =
    sessionDeveloped &&
    !sessionMature &&
    !triadModeActive &&
    !mixedQuadActive &&
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    normalizedNoiseTiming === 'not_due' &&
    !pairNotDueNoiseBreakReady &&
    !shouldPromoteNoiseOverSecondCommon &&
    recent8Unique <= 3 &&
    (bestCommonDecision.commonScore || 0) >= 68 &&
    (secondCommonDecision.commonScore || 0) >= 18 &&
    commonAnchorNoiseQuiet;
  const matureCommonsAnchorTakeover =
    sessionMature &&
    !triadModeActive &&
    !mixedQuadActive &&
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !shouldPromoteNoiseOverSecondCommon &&
    recent8Unique <= 3 &&
    (bestCommonDecision.commonScore || 0) >= 58 &&
    (secondCommonDecision.commonScore || 0) >= 14 &&
    (
      normalizedNoiseTiming === 'not_due' ||
      (
        normalizedNoiseTiming === 'approaching' &&
        breakChallengeEdge < Math.max(6, breakChallengeThreshold - 2)
      )
    ) &&
    (postNoiseCommonRate >= 0.55 || commonRecoveryActive || flashNoiseSession) &&
    (
      (bestNoiseDecision?.currentShare || 0) <= 20 ||
      !bestNoiseBreakAligned ||
      (bestNoiseDecision?.recent2Hits || 0) === 0
    );
  const strongestBackedCommon = finalAnalyzerRanked.find((entry) =>
    commons.includes(entry.value) &&
    (
      (entry.supportScore ?? 0) >= 48 ||
      (entry.freqSignal ?? 0) >= 60 ||
      (entry.pair1 ?? 0) >= 40
    )
  ) || null;
  const topPairValues = [analyzerTop1?.value, analyzerTop2?.value].filter(Boolean);
  const topNoiseCount = [analyzerTop1, analyzerTop2].filter((entry) => entry && noise.includes(entry.value)).length;

  if (false && (
    (sessionStatePreviewKey === 'break' || sessionStatePreviewKey === 'probe') &&
    bestCommonDecision?.value &&
    secondCommonDecision?.value &&
    bestNoiseDecision?.value
  )) {
    const strongBreakWin = shouldPromoteNoiseOverSecondCommon;
    const softBreakWin =
      !strongBreakWin &&
      (
        (sessionStatePreviewKey === 'break' &&
          normalizedNoiseTiming !== 'not_due' &&
          breakChallengeEdge >= Math.max(2, breakChallengeThreshold - 4)) ||
        (sessionStatePreviewKey === 'probe' &&
          (bestNoiseDecision.noiseScore || 0) >= 72 &&
          breakChallengeEdge >= -2 &&
          (
            normalizedNoiseTiming !== 'not_due' ||
            (bestNoiseDecision.currentShare || 0) >= 20 ||
            (bestNoiseDecision.recent4Hits || 0) >= 2
          ))
      );

    if (strongBreakWin || softBreakWin) {
      const topCommonValue = bestCommonDecision.value;
      const secondCommonValue = secondCommonDecision.value;
      const topNoiseValue = bestNoiseDecision.value;
      const surplus = Math.max(0, breakChallengeEdge - breakChallengeThreshold);
      const topNoiseBoost = strongBreakWin
        ? 12 + Math.min(8, Math.round(surplus * 0.8))
        : sessionStatePreviewKey === 'probe'
          ? 10
          : 6;
      const topCommonBoost = strongBreakWin ? 4 : sessionStatePreviewKey === 'probe' ? 3 : 2;
      const secondCommonPenalty = strongBreakWin
        ? 10 + Math.min(6, Math.round(surplus * 0.5))
        : sessionStatePreviewKey === 'probe'
          ? 8
          : 4;

      analyzerFinalScores = normalizePoolScores(
        analyzerFinalScores.map((entry) => {
          let breakBlendRaw = 0;
          if (entry.value === topNoiseValue) breakBlendRaw += topNoiseBoost;
          if (entry.value === topCommonValue) breakBlendRaw += topCommonBoost;
          if (entry.value === secondCommonValue) breakBlendRaw -= secondCommonPenalty;
          return {
            ...entry,
            breakBlendRaw,
            finalDecisionRaw: (entry.finalDecisionRaw || 0) + breakBlendRaw,
          };
        }),
        'finalDecisionRaw',
        'pickScore'
      );

      analyzerFinalRawRanked = [...analyzerFinalScores].sort(
        (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
      );
      analyzerTop1 =
        finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
        analyzerTop1;
      analyzerTop2 =
        finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked.find((entry) => entry.value !== analyzerTop1?.value)?.value) ||
        finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
        analyzerTop2;
    }
  }

  if (hardPairHoldTakeover) {
    const takeoverMain = bestCommonDecision.value;
    const takeoverAlt = secondCommonDecision.value;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let pairHoldTakeoverRaw = 0;
        if (entry.value === takeoverMain) pairHoldTakeoverRaw += 38;
        else if (entry.value === takeoverAlt) pairHoldTakeoverRaw += 30;
        else if (noise.includes(entry.value)) pairHoldTakeoverRaw -= 24;
        else pairHoldTakeoverRaw -= 12;
        return {
          ...entry,
          pairHoldTakeoverRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + pairHoldTakeoverRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  if (developingCommonsAnchorTakeover || matureCommonsAnchorTakeover) {
    const takeoverMain = bestCommonDecision.value;
    const takeoverAlt = secondCommonDecision.value;
    const anchorStrength = matureCommonsAnchorTakeover ? 1 : 0;
    const takeoverAltRecoveryBoost =
      takeoverAlt === commonReclaimValue
        ? 10
        : takeoverAlt === siblingCommonValue
          ? 8
          : 0;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let commonsAnchorRaw = 0;
        if (entry.value === takeoverMain) {
          commonsAnchorRaw += anchorStrength ? 32 : 22;
          if (commonRecoveryActive) commonsAnchorRaw += 6;
        } else if (entry.value === takeoverAlt) {
          commonsAnchorRaw += (anchorStrength ? 22 : 14) + takeoverAltRecoveryBoost;
          if (entry.value === lastRoll) commonsAnchorRaw += 4;
        } else if (noise.includes(entry.value)) {
          commonsAnchorRaw -= anchorStrength ? 18 : 12;
          if ((entry.currentShare || 0) <= 20) commonsAnchorRaw -= 4;
          if ((entry.recent2Hits || 0) === 0) commonsAnchorRaw -= 4;
        } else {
          commonsAnchorRaw -= anchorStrength ? 10 : 6;
        }
        return {
          ...entry,
          commonsAnchorRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + commonsAnchorRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  const pairNotDueCommonsPreserveTakeover =
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !shouldPromoteNoiseOverSecondCommon &&
    !triadModeActive &&
    !mixedQuadActive &&
    normalizedNoiseTiming === 'not_due' &&
    (bestCommonDecision.commonScore || 0) >= 56 &&
    (secondCommonDecision.commonScore || 0) >= 12 &&
    !pairNotDueNoiseBreakReady;
  const approachingSecondCommonPreserveTakeover =
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !!bestNoiseDecision &&
    !shouldPromoteNoiseOverSecondCommon &&
    !triadModeActive &&
    !mixedQuadActive &&
    normalizedNoiseTiming === 'approaching' &&
    commons.includes(analyzerFinalRawRanked[0]?.value) &&
    noise.includes(analyzerFinalRawRanked.find((entry) => entry.value !== analyzerFinalRawRanked[0]?.value)?.value) &&
    (bestCommonDecision.commonScore || 0) >= 60 &&
    (secondCommonDecision.commonScore || 0) >= 16 &&
    breakChallengeEdge < Math.max(4, breakChallengeThreshold - 1) &&
    (
      (bestNoiseDecision.currentShare || 0) <= 20 ||
      ((bestNoiseDecision.recent2Hits || 0) === 0 && (bestNoiseDecision.recent4Hits || 0) <= 1)
    );
  const commonDominantPreserveTakeover =
    effectiveCommonDominantBoard &&
    !noiseTriggerConfirmed &&
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !triadModeActive &&
    !mixedQuadActive &&
    (bestCommonDecision.commonScore || 0) >= 54 &&
    (secondCommonDecision.commonScore || 0) >= 10;
  const developingCommonsPairTakeover =
    developingSession &&
    effectiveCommonDominantBoard &&
    !!bestCommonDecision &&
    !!secondCommonDecision &&
    !triadModeActive &&
    !mixedQuadActive;
  const preLastWindow = rolls.slice(-6, -1);
  const preLastCounts = VALUES.reduce((acc, value) => {
    acc[value] = preLastWindow.filter((roll) => roll === value).length;
    return acc;
  }, {});
  const preLastPair = [...VALUES]
    .sort((a, b) => (preLastCounts[b] || 0) - (preLastCounts[a] || 0))
    .slice(0, 2);
  const preLastPairShare =
    preLastWindow.length > 0
      ? ((preLastCounts[preLastPair[0]] || 0) + (preLastCounts[preLastPair[1]] || 0)) / preLastWindow.length
      : 0;
  const postOutsiderSnapbackTakeover =
    preLastWindow.length >= 4 &&
    preLastPair.length === 2 &&
    preLastPairShare >= 0.8 &&
    !preLastPair.includes(lastRoll) &&
    preLastPair.some((value) => commons.includes(value)) &&
    (
      flashNoiseSession ||
      postNoiseCommonRate >= 0.5 ||
      normalizedNoiseTiming === 'not_due' ||
      (
        normalizedNoiseTiming === 'due' &&
        (distribution?.[lastRoll] || 0) <= 20
      )
    ) &&
    (freshOutsider?.value === lastRoll || noise.includes(lastRoll)) &&
    ((freshOutsider?.recent2Hits || 0) <= 1) &&
    !shouldPromoteNoiseOverSecondCommon &&
    !mixedQuadActive &&
    !triadModeActive;

  if (pairNotDueCommonsPreserveTakeover || approachingSecondCommonPreserveTakeover || commonDominantPreserveTakeover || developingCommonsPairTakeover) {
    const takeoverMain = bestCommonDecision.value;
    const takeoverAlt = secondCommonDecision.value;
    const preserveStrength = pairNotDueCommonsPreserveTakeover || commonDominantPreserveTakeover || developingCommonsPairTakeover ? 1 : 0;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let commonsPreserveRaw = 0;
        if (entry.value === takeoverMain) {
          commonsPreserveRaw += preserveStrength ? 34 : 16;
          if (commonDominantPreserveTakeover) commonsPreserveRaw += 8;
          if (developingCommonsPairTakeover) commonsPreserveRaw += 10;
        } else if (entry.value === takeoverAlt) {
          commonsPreserveRaw += preserveStrength ? 28 : 22;
          if (commonDominantPreserveTakeover) commonsPreserveRaw += 6;
          if (developingCommonsPairTakeover) commonsPreserveRaw += 10;
          if (entry.value === lastRoll) commonsPreserveRaw += 4;
        } else if (noise.includes(entry.value)) {
          commonsPreserveRaw -= preserveStrength ? 20 : 12;
          if (commonDominantPreserveTakeover) commonsPreserveRaw -= 6;
          if (developingCommonsPairTakeover) commonsPreserveRaw -= 8;
          if ((entry.currentShare || 0) <= 20) commonsPreserveRaw -= 4;
          if ((entry.recent2Hits || 0) === 0) commonsPreserveRaw -= 4;
        } else {
          commonsPreserveRaw -= preserveStrength ? 12 : 6;
        }
        return {
          ...entry,
          commonsPreserveRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + commonsPreserveRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
      analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  if (postOutsiderSnapbackTakeover) {
    const takeoverMain =
      preLastPair.find((value) => value === lastRoll) ||
      preLastPair.find((value) => commons.includes(value)) ||
      preLastPair[0];
    const takeoverAlt =
      preLastPair.find((value) => value !== takeoverMain) ||
      commons.find((value) => value !== takeoverMain) ||
      takeoverMain;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let snapbackRaw = 0;
        if (entry.value === takeoverMain) snapbackRaw += 28;
        else if (entry.value === takeoverAlt) snapbackRaw += 22;
        else if (entry.value === lastRoll) snapbackRaw -= 18;
        else if (noise.includes(entry.value)) snapbackRaw -= 12;
        else snapbackRaw -= 6;
        return {
          ...entry,
          snapbackRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + snapbackRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  const hardCommonReturnTakeover =
    commonReturnArmed &&
    commonRecoveryActive &&
    !!siblingCommonValue &&
    commons.includes(lastRoll) &&
    (freshOutsider?.recent2Hits || 0) === 0 &&
    (freshOutsider?.recent4Hits || 0) <= 1;
  const hardCommonReclaimTakeover =
    commonReclaimArmed &&
    commonRecoveryActive &&
    !!commonReclaimValue &&
    (freshOutsider?.recent2Hits || 0) === 0 &&
    (freshOutsider?.recent4Hits || 0) <= 1;
  const hardSiblingBounceTakeover =
    siblingBounceArmed &&
    (flashNoiseSession || postNoiseSiblingRate >= 0.6) &&
    !!siblingCommonValue &&
    (freshOutsider?.recent2Hits || 0) === 0 &&
    (freshOutsider?.recent4Hits || 0) <= 1 &&
    postNoiseCommonRate >= 0.5;

  if (false && hardCommonReturnTakeover) {
    const takeoverMain = siblingCommonValue;
    const takeoverAlt = commons.find((value) => value !== takeoverMain) || lastRoll;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let commonReturnTakeoverRaw = 0;
        if (entry.value === takeoverMain) commonReturnTakeoverRaw += 90;
        else if (entry.value === takeoverAlt) commonReturnTakeoverRaw += 20;
        else commonReturnTakeoverRaw -= 40;
        return {
          ...entry,
          commonReturnTakeoverRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + commonReturnTakeoverRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  if (false && hardCommonReclaimTakeover) {
    const takeoverMain = commonReclaimValue;
    const takeoverAlt = commons.find((value) => value !== takeoverMain) || lastRoll;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let commonReclaimTakeoverRaw = 0;
        if (entry.value === takeoverMain) commonReclaimTakeoverRaw += 70;
        else if (entry.value === takeoverAlt) commonReclaimTakeoverRaw += 18;
        else commonReclaimTakeoverRaw -= 34;
        return {
          ...entry,
          commonReclaimTakeoverRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + commonReclaimTakeoverRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  if (false && hardSiblingBounceTakeover) {
    const takeoverMain = siblingCommonValue;
    const takeoverAlt = commons.find((value) => value !== takeoverMain) || lastRoll;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let siblingBounceTakeoverRaw = 0;
        if (entry.value === takeoverMain) siblingBounceTakeoverRaw += 56;
        else if (entry.value === takeoverAlt) siblingBounceTakeoverRaw += 16;
        else siblingBounceTakeoverRaw -= 28;
        return {
          ...entry,
          siblingBounceTakeoverRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + siblingBounceTakeoverRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
    analyzerTop1 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverMain) ||
      finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
      analyzerTop1;
    analyzerTop2 =
      finalAnalyzerRanked.find((entry) => entry.value === takeoverAlt) ||
      finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
      analyzerTop2;
  }

  const profileFallbackActive =
    !!tailProfileMatch &&
    (
      tailProfileMatch.confidence >= 100 ||
      tailProfileMatch.total >= 3 ||
      preLoopLikeMixedBoard ||
      sequenceBoardActive ||
      localLoopActive ||
      mixedQuadActive ||
      !!activeTrio ||
      Math.abs(((analyzerFinalRawRanked[0]?.finalDecisionRaw || 0) - (analyzerFinalRawRanked[1]?.finalDecisionRaw || 0))) <= 12
    );
  if (profileFallbackActive) {
    const profileTarget = tailProfileMatch.target;
    const currentSecondFinal = analyzerFinalRawRanked.find((entry) => entry.value !== analyzerFinalRawRanked[0]?.value) || null;
    const profileTargetIsBestCommon = bestCommonDecision?.value === profileTarget || secondCommonDecision?.value === profileTarget;
    const profileTargetIsBestNoise = bestNoiseDecision?.value === profileTarget;
    const profileSecondIsWeakCommon =
      !!currentSecondFinal &&
      commons.includes(currentSecondFinal.value) &&
      ((commonDecisionMap.get(currentSecondFinal.value)?.commonScore || 0) <= 20);
    const profileSecondIsWrongNoise =
      !!currentSecondFinal &&
      noise.includes(currentSecondFinal.value) &&
      profileTargetIsBestNoise &&
      currentSecondFinal.value !== profileTarget;
    const profileBoost =
      tailProfileMatch.confidence >= 100 ? 30 :
      tailProfileMatch.confidence >= 80 ? 22 :
      16;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let tailProfileRaw = 0;
        if (entry.value === profileTarget) {
          tailProfileRaw += profileBoost;
          if (profileTargetIsBestCommon) tailProfileRaw += 6;
          if (profileTargetIsBestNoise) tailProfileRaw += 6;
          if (profileSecondIsWeakCommon || profileSecondIsWrongNoise) tailProfileRaw += 8;
          if (commons.includes(entry.value)) tailProfileRaw += 2;
          if (noise.includes(entry.value) && normalizedNoiseTiming !== 'not_due') tailProfileRaw += 2;
        } else if (
          currentSecondFinal &&
          entry.value === currentSecondFinal.value &&
          entry.value !== profileTarget &&
          (profileSecondIsWeakCommon || profileSecondIsWrongNoise)
        ) {
          tailProfileRaw -= 12;
        } else if (
          currentRunLen >= 2 &&
          entry.value === lastRoll &&
          entry.value !== profileTarget &&
          noise.includes(entry.value) &&
          !tailProfileMatch.key.endsWith(entry.value)
        ) {
          tailProfileRaw -= 8;
        }
        return {
          ...entry,
          tailProfileRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + tailProfileRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
  }

  const shapeProfileFallbackActive =
    !tailProfileMatch &&
    !!shapeProfileMatch &&
    (
      preLoopLikeMixedBoard ||
      sequenceBoardActive ||
      localLoopActive ||
      mixedQuadActive ||
      !!activeTrio ||
      Math.abs(((analyzerFinalRawRanked[0]?.finalDecisionRaw || 0) - (analyzerFinalRawRanked[1]?.finalDecisionRaw || 0))) <= 14
    );
  if (shapeProfileFallbackActive) {
    const profileTarget = shapeProfileMatch.target;
    const profileBoost =
      shapeProfileMatch.confidence >= 100 ? 18 :
      shapeProfileMatch.confidence >= 80 ? 14 :
      10;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let shapeProfileRaw = 0;
        if (entry.value === profileTarget) {
          shapeProfileRaw += profileBoost;
          if (commons.includes(entry.value)) shapeProfileRaw += 2;
          if (noise.includes(entry.value) && normalizedNoiseTiming !== 'not_due') shapeProfileRaw += 2;
        }
        return {
          ...entry,
          shapeProfileRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + shapeProfileRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
  }

  const activeProfileMatch = tailProfileMatch || shapeProfileMatch;
  const activeProfileTarget = activeProfileMatch?.target || null;
  const activeProfileConfidence = activeProfileMatch?.confidence || 0;
  const profileTargetCommon = activeProfileTarget ? commonDecisionMap.get(activeProfileTarget) : null;
  const profileTargetNoise = activeProfileTarget ? noiseDecisionMap.get(activeProfileTarget) : null;
  const currentFinalMain = analyzerFinalRawRanked[0] || null;
  const currentFinalAlt = analyzerFinalRawRanked.find((entry) => entry.value !== currentFinalMain?.value) || null;
  const currentAltWeakCommon =
    !!currentFinalAlt &&
    commons.includes(currentFinalAlt.value) &&
    ((commonDecisionMap.get(currentFinalAlt.value)?.commonScore || 0) <= 24);
  const currentAltWeakNoise =
    !!currentFinalAlt &&
    noise.includes(currentFinalAlt.value) &&
    ((noiseDecisionMap.get(currentFinalAlt.value)?.noiseScore || 0) <= 28);
  const profileCanReplaceAlt =
    !!activeProfileTarget &&
    !!currentFinalMain &&
    currentFinalAlt?.value !== activeProfileTarget &&
    activeProfileConfidence >= 67 &&
    (
      preLoopLikeMixedBoard ||
      sequenceBoardActive ||
      localLoopActive ||
      mixedQuadActive ||
      !!activeTrio ||
      Math.abs(((currentFinalMain.finalDecisionRaw || 0) - (currentFinalAlt?.finalDecisionRaw || 0))) <= 18
    );
  const profileNoiseAltSwap =
    profileCanReplaceAlt &&
    commons.includes(currentFinalMain.value) &&
    noise.includes(activeProfileTarget) &&
    (
      normalizedNoiseTiming !== 'not_due' ||
      !!tailProfileMatch
    ) &&
    ((profileTargetNoise?.noiseScore || 0) >= 60) &&
    (currentAltWeakCommon || currentAltWeakNoise);
  const profileCommonAltSwap =
    profileCanReplaceAlt &&
    commons.includes(activeProfileTarget) &&
    commons.includes(currentFinalMain.value) &&
    ((profileTargetCommon?.commonScore || 0) >= 16) &&
    (
      noise.includes(currentFinalAlt?.value) ||
      currentAltWeakCommon
    );

  if (profileNoiseAltSwap || profileCommonAltSwap) {
    const takeoverMain = currentFinalMain.value;
    const takeoverAlt = activeProfileTarget;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let profileHandoffRaw = 0;
        if (entry.value === takeoverMain) profileHandoffRaw += 10;
        else if (entry.value === takeoverAlt) profileHandoffRaw += 22;
        else if (entry.value === currentFinalAlt?.value) profileHandoffRaw -= 18;
        else profileHandoffRaw -= 2;
        return {
          ...entry,
          profileHandoffRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + profileHandoffRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
  }

  const topCommonFinalEntry = bestCommonDecision
    ? analyzerFinalScores.find((entry) => entry.value === bestCommonDecision.value) || null
    : null;
  const currentFinalLeader = analyzerFinalRawRanked[0] || null;
  const currentFinalSecond = analyzerFinalRawRanked.find((entry) => entry.value !== currentFinalLeader?.value) || null;
  const pairNotDueTopCommonAnchor =
    normalizedNoiseTiming === 'not_due' &&
    !triadModeActive &&
    !mixedQuadActive &&
    !!bestCommonDecision &&
    !!topCommonFinalEntry &&
    (bestCommonDecision.commonScore || 0) >= 78 &&
    (
      (
        currentFinalLeader?.value !== bestCommonDecision.value &&
        (topCommonFinalEntry.finalDecisionRaw || 0) >= ((currentFinalLeader?.finalDecisionRaw || 0) - 22)
      ) ||
      (
        currentFinalSecond?.value !== bestCommonDecision.value &&
        (topCommonFinalEntry.finalDecisionRaw || 0) >= ((currentFinalSecond?.finalDecisionRaw || 0) - 18)
      )
    );

  if (pairNotDueTopCommonAnchor) {
    const takeoverMain = bestCommonDecision.value;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let topCommonAnchorRaw = 0;
        if (entry.value === takeoverMain) {
          topCommonAnchorRaw += 24;
        } else if (
          entry.value === currentFinalSecond?.value &&
          entry.value !== takeoverMain &&
          (
            noise.includes(entry.value) ||
            (commonDecisionMap.get(entry.value)?.commonScore || 0) <= 30
          )
        ) {
          topCommonAnchorRaw -= 18;
        } else if (
          entry.value === currentFinalLeader?.value &&
          entry.value !== takeoverMain &&
          (commonDecisionMap.get(entry.value)?.commonScore || 0) < (bestCommonDecision.commonScore || 0) - 40
        ) {
          topCommonAnchorRaw -= 8;
        }
        return {
          ...entry,
          topCommonAnchorRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + topCommonAnchorRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
  }

  const refreshedTopCommonEntry = bestCommonDecision
    ? analyzerFinalScores.find((entry) => entry.value === bestCommonDecision.value) || null
    : null;
  const refreshedLeader = analyzerFinalRawRanked[0] || null;
  const refreshedSecond = analyzerFinalRawRanked.find((entry) => entry.value !== refreshedLeader?.value) || null;
  const strongTopCommonAltKeep =
    !!bestCommonDecision &&
    !!refreshedTopCommonEntry &&
    !!refreshedLeader &&
    !!refreshedSecond &&
    refreshedSecond.value !== bestCommonDecision.value &&
    (bestCommonDecision.commonScore || 0) >= 78 &&
    commons.includes(refreshedLeader.value) &&
    noise.includes(refreshedSecond.value) &&
    (refreshedTopCommonEntry.finalDecisionRaw || 0) >= ((refreshedSecond.finalDecisionRaw || 0) - 6);

  if (strongTopCommonAltKeep) {
    const takeoverCommon = bestCommonDecision.value;
    const pushedNoise = refreshedSecond.value;
    analyzerFinalScores = normalizePoolScores(
      analyzerFinalScores.map((entry) => {
        let strongTopCommonKeepRaw = 0;
        if (entry.value === takeoverCommon) strongTopCommonKeepRaw += 14;
        else if (entry.value === pushedNoise) strongTopCommonKeepRaw -= 12;
        return {
          ...entry,
          strongTopCommonKeepRaw,
          finalDecisionRaw: (entry.finalDecisionRaw || 0) + strongTopCommonKeepRaw,
        };
      }),
      'finalDecisionRaw',
      'pickScore'
    );

    analyzerFinalRawRanked = [...analyzerFinalScores].sort(
      (a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0)
    );
  }

  let analyzerMode = 'pair';
  if (triadModeActive || mixedQuadActive || hardCommonReturnTakeover || hardCommonReclaimTakeover || hardSiblingBounceTakeover || developingCommonsAnchorTakeover || matureCommonsAnchorTakeover) analyzerMode = 'pair';
  if (!hardCommonReturnTakeover && !hardCommonReclaimTakeover && !hardSiblingBounceTakeover && normalizedNoiseTiming !== 'not_due') {
    if (topNoiseCount === 2 || (analyzerTop1 && noise.includes(analyzerTop1.value))) analyzerMode = 'break';
    else if (topNoiseCount === 1) analyzerMode = 'break-watch';
  }
  if (effectiveCommonDominantBoard && !noiseTriggerConfirmed) analyzerMode = 'pair';
  if (triadModeActive || mixedQuadActive || hardCommonReturnTakeover || hardCommonReclaimTakeover || hardSiblingBounceTakeover || developingCommonsAnchorTakeover || matureCommonsAnchorTakeover) analyzerMode = 'pair';

  // Legacy run-break promotion was repeatedly overriding the stronger
  // replay-tested chooser on short mixed boards. We keep the computed
  // challenge metadata for debug, but the final Svarog pair now follows
  // the unified decider ranking directly.
  if (false && !sequenceBoardActive && currentRunLen >= 3 && scored.length >= 2) {
    const exhaustionRatio = currentRunLen / Math.max(avgObservedRunLen || 2.5, 1);
    const selfEntry = scored.find(entry => entry.isSelfTransition);
    const challengerPool = scored
      .filter(entry => !entry.isSelfTransition && !entry.isDeadNoise)
      .map((entry) => {
        const unseenBonus = entry.seenAgo < 0 ? 14 : 0;
        const overdueBonus = entry.seenAgo >= 5 ? 10 : entry.seenAgo >= 3 ? 6 : 0;
        const sparsePairBonus = entry.pair1 <= 15 ? 4 : 0;
        const breakSignal =
          entry.pair1 * 0.26 +
          entry.pair2 * 0.14 +
          entry.absenceSignal * 0.18 +
          entry.momentumSignal * 0.08 +
          entry.recentSignal * 0.08 +
          entry.freqSignal * 0.04 +
          unseenBonus +
          overdueBonus +
          sparsePairBonus +
          (entry.direction === 'rising' ? 6 : entry.direction === 'stable' ? 2 : 0);
        return {
          ...entry,
          breakSignal: Math.round(breakSignal * 100) / 100,
          breakTotal: Math.round((entry.score + breakSignal) * 100) / 100,
        };
      })
      .sort((a, b) => b.breakTotal - a.breakTotal);

    const bestChallenger = challengerPool[0];
    if (bestChallenger) {
      const promoteThreshold =
        currentRunLen >= 4 ? 2 :
        exhaustionRatio >= 1.45 ? 4 :
        8;
      const selfScore = selfEntry?.score ?? -999;
      const challengerWinsMain = bestChallenger.breakTotal >= selfScore + promoteThreshold;

      if (challengerWinsMain) {
        const promotedMain = bestChallenger.value;
        const promotedAlt =
          finalAnalyzerRanked.find(entry => entry.value !== promotedMain && entry.value !== lastRoll)?.value ||
          finalAnalyzerRanked.find(entry => entry.value !== promotedMain)?.value ||
          scored.find(entry => entry.value !== promotedMain && entry.value !== lastRoll)?.value ||
          scored.find(entry => entry.value !== promotedMain)?.value ||
          null;
        return {
          prediction: promotedMain,
          alt: promotedAlt,
          scores: scored,
          noiseScores: noiseEntries,
          decisionScores: analyzerDecisionScores,
          finalScores: analyzerFinalScores,
          commonDecisionScores,
          noiseDecisionScores,
          trendOverallScores,
          breakChallenge: {
            allowBreakChallenge,
            secondCommonHoldScore: Math.round(secondCommonHoldScore * 100) / 100,
            bestNoiseChallengeScore: Math.round(bestNoiseChallengeScore * 100) / 100,
            margin: breakChallengeMargin,
            promoted: shouldPromoteNoiseOverSecondCommon,
            topCommon: bestCommonDecision?.value || null,
            secondCommon: secondCommonDecision?.value || null,
            topNoise: bestNoiseDecision?.value || null,
          },
          mode: 'pair',
          noiseTiming,
          noiseDueRatio,
        };
      }

      const currentMain = analyzerTop1?.value || finalAnalyzerRanked[0]?.value || scored[0]?.value || null;
      const currentAlt =
        analyzerTop2?.value ||
        finalAnalyzerRanked.find(entry => entry.value !== currentMain)?.value ||
        scored.find(entry => entry.value !== currentMain)?.value ||
        null;
      if (bestChallenger.value !== currentMain && bestChallenger.breakTotal >= (scored.find(entry => entry.value === currentAlt)?.score ?? -999) + 2) {
        return {
          prediction: currentMain,
          alt: bestChallenger.value,
          scores: scored,
          noiseScores: noiseEntries,
          decisionScores: analyzerDecisionScores,
          finalScores: analyzerFinalScores,
          commonDecisionScores,
          noiseDecisionScores,
          breakChallenge: {
            allowBreakChallenge,
            secondCommonHoldScore: Math.round(secondCommonHoldScore * 100) / 100,
            bestNoiseChallengeScore: Math.round(bestNoiseChallengeScore * 100) / 100,
            margin: breakChallengeMargin,
            promoted: shouldPromoteNoiseOverSecondCommon,
            topCommon: bestCommonDecision?.value || null,
            secondCommon: secondCommonDecision?.value || null,
            topNoise: bestNoiseDecision?.value || null,
          },
          mode: 'pair',
          noiseTiming,
          noiseDueRatio,
        };
      }
    }
  }

  analyzerTop1 =
    finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked[0]?.value) ||
    analyzerTop1;
  analyzerTop2 =
    finalAnalyzerRanked.find((entry) => entry.value === analyzerFinalRawRanked.find((entry) => entry.value !== analyzerTop1?.value)?.value) ||
    finalAnalyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) ||
    analyzerTop2;

  return {
    prediction: analyzerTop1?.value || scored[0]?.value || null,
    alt: analyzerTop2?.value || scored.find(entry => entry.value !== (analyzerTop1?.value || scored[0]?.value))?.value || null,
    scores: scored,
    noiseScores: noiseEntries,
    decisionScores: analyzerDecisionScores,
    finalScores: analyzerFinalScores,
    commonDecisionScores,
    noiseDecisionScores,
    sessionStateScores,
    trendOverallScores,
    breakChallenge: {
      allowBreakChallenge,
      secondCommonHoldScore: Math.round(secondCommonHoldScore * 100) / 100,
      bestNoiseChallengeScore: Math.round(bestNoiseChallengeScore * 100) / 100,
      margin: breakChallengeMargin,
      promoted: shouldPromoteNoiseOverSecondCommon,
      topCommon: bestCommonDecision?.value || null,
      secondCommon: secondCommonDecision?.value || null,
      topNoise: bestNoiseDecision?.value || null,
    },
    mode: analyzerMode,
    noiseTiming: normalizedNoiseTiming,
    noiseDueRatio,
    sessionStateKey: sessionStatePreviewKey,
    boardStateStrengths,
    noisePhase,
    noiseBeatStyle,
    avgNoiseStreakLen,
    tailProfileMatch,
    shapeProfileMatch,
    singleNoiseRate,
    postNoiseCommonRate,
    postNoiseSiblingRate,
    commonReturnArmed,
    siblingCommonValue,
    commonReturnStrength,
    commonRecoveryActive,
    commonDominantBoard: effectiveCommonDominantBoard,
    noiseTriggerConfirmed,
    noiseProbeOnly,
    developingCommonsPairTakeover,
    hardCommonReturnTakeover,
    siblingBounceArmed,
    siblingBounceStrength,
    hardSiblingBounceTakeover,
    commonReclaimArmed,
    commonReclaimValue,
    commonReclaimStrength,
    hardCommonReclaimTakeover,
    mixedQuadActive,
    tightPairBoard,
    tightPairValues,
    bridgeReturnValue,
    preBlockReturnValue,
    missingFourthRotationValue,
    quadGapShockValue,
    cycleRestartValue,
    doubleBridgeEchoValue,
    doubleBridgeSwapValue,
    pairNotDueCommonsPreserveTakeover,
    approachingSecondCommonPreserveTakeover,
    commonDominantPreserveTakeover,
    postOutsiderSnapbackTakeover,
  };
}

// =========================================================================
// 🧠 META-PATTERN: Property Map for Secondary Characteristics
// Used for "Split-Common Breaker" when top 2 candidates are tied
// =========================================================================
const PROPERTIES = {
  '41': { parity: 'odd', position: 'outer' },
  '42': { parity: 'even', position: 'inner' },
  '43': { parity: 'odd', position: 'inner' },
  '44': { parity: 'even', position: 'outer' }
};

const SVAROG_REGIME_DECIDER_WEIGHTS = {
  pairNotDue: {
    exact: 3.9674,
    refined: -8.6958,
    trust: -10.8858,
    support: 2.6777,
    carry: 5.2575,
    latent: 2.9524,
    currentShare: -0.0440,
    pair1: 3.6018,
    pair2: 12.3430,
    pair1Reliable: -6.2290,
    pair2Reliable: 10.2536,
    freq: -5.6898,
    recent: -4.2020,
    momentum: 0.5511,
    absence: 1.0840,
    seenAgo: -4.4130,
    recent2: 5.8359,
    recent4: -0.8135,
    commonScore: 7.1839,
    noiseScore: 5.0087,
    isCommon: -7.8848,
    isNoise: -1.8170,
    directionRising: -5.9573,
    directionStable: 15.3520,
    directionFalling: 6.7626,
    armed: 0.7573,
    phantom: -6.1041,
    loopCommon: -19.9277,
    loopNoisePenalty: 1.0480,
    emerg: 2.3183,
    sandwich: 8.6466,
    dormant4: 4.8083,
    thinPenalty: -14.5644,
  },
  breakDue: {
    exact: 3.7038,
    refined: 1.3396,
    trust: -19.3228,
    support: 4.2974,
    carry: -4.0745,
    latent: -12.6001,
    currentShare: -5.1668,
    pair1: 4.9400,
    pair2: 0.1092,
    pair1Reliable: -0.1311,
    pair2Reliable: -5.9791,
    freq: -1.0764,
    recent: 2.2939,
    momentum: -0.5827,
    absence: 5.3731,
    seenAgo: -4.7697,
    recent2: 4.3700,
    recent4: 0.8256,
    commonScore: -3.0968,
    noiseScore: 4.5145,
    isCommon: 5.1511,
    isNoise: 3.4041,
    directionRising: -2.9185,
    directionStable: 0.5363,
    directionFalling: -5.3687,
    armed: 0.7927,
    phantom: 2.6219,
    loopCommon: 1.6353,
    loopNoisePenalty: 8.9249,
    emerg: -4.2488,
    sandwich: 8.4155,
    dormant4: -0.4792,
    thinPenalty: -4.8457,
  },
};

/**
 * Enhanced Pair Transition Predictor (Beast Mode v3.7 - Stable)
 */

const getParity = (v) => PROPERTIES[v]?.parity || 'unknown';
const getPosition = (v) => PROPERTIES[v]?.position || 'unknown';

/**
 * Enhanced Pair Transition Predictor (Beast Mode v3.7 - Reverted to Clean)
 */
/**
 * Analyze meta-streams (Parity, Position, Range) from recent rolls
 * Returns expectation for next roll based on each stream
 */
function analyzeMetaStreams(rolls) {
  if (!rolls || rolls.length < 3) {
    return { parity: null, position: null, range: null };
  }
  
  const last6 = rolls.slice(-6);
  
  // Count occurrences in each stream
  const parityCount = { odd: 0, even: 0 };
  const positionCount = { inner: 0, outer: 0 };
  const rangeCount = { low: 0, high: 0 };
  
  last6.forEach(val => {
    const props = PROPERTIES[val];
    if (props) {
      parityCount[props.parity]++;
      positionCount[props.position]++;
      rangeCount[props.range]++;
    }
  });
  
  // Determine expectation (inverse of dominance - expect balance)
  const expectParity = parityCount.odd > parityCount.even + 1 ? 'even' : 
                       parityCount.even > parityCount.odd + 1 ? 'odd' : null;
  const expectPosition = positionCount.inner > positionCount.outer + 1 ? 'outer' :
                         positionCount.outer > positionCount.inner + 1 ? 'inner' : null;
  const expectRange = rangeCount.low > rangeCount.high + 1 ? 'high' :
                      rangeCount.high > rangeCount.low + 1 ? 'low' : null;
  
  return {
    parity: expectParity,
    position: expectPosition,
    range: expectRange,
    counts: { parityCount, positionCount, rangeCount }
  };
}

/**
 * Score a candidate value against meta-stream expectations
 * Returns a boost score (0 to 0.3) based on matches
 */
function scoreMetaMatch(value, metaExpect) {
  if (!value || !metaExpect) return 0;
  
  const props = PROPERTIES[value];
  if (!props) return 0;
  
  let score = 0;
  if (metaExpect.parity && props.parity === metaExpect.parity) score += 0.15;
  if (metaExpect.position && props.position === metaExpect.position) score += 0.10;
  if (metaExpect.range && props.range === metaExpect.range) score += 0.05;
  
  return score;
}

/**
 * Build ENHANCED pair transition matrix with 2-gram support
 * 
 * 1-gram: After X → Y (what comes after X?)
 * 2-gram: After [X,Y] → Z (what comes after X then Y?)
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @returns {Object} Matrix with 1-gram and 2-gram data
 */
export function buildPairMatrix(rolls) {
  if (!rolls || rolls.length < 2) {
    return { 
      matrix: {}, 
      matrix2gram: {},
      lastRoll: null, 
      last2Rolls: null,
      counts: {}, 
      sampleCounts: {} 
    };
  }

  // Initialize 1-gram matrix
  const counts = {};
  const sampleCounts = {};
  VALUES.forEach(from => {
    counts[from] = {};
    sampleCounts[from] = {};
    VALUES.forEach(to => {
      counts[from][to] = 0;
      sampleCounts[from][to] = 0;
    });
  });

  // Initialize 2-gram matrix (key = "X,Y" -> {Z: count})
  const counts2gram = {};
  const sampleCounts2gram = {};

  // Count transitions with recency weighting
  // 🆕 SLUGGISHNESS FIX: Only use the last 24 rolls for transition counts
  // This ensures the predictor adapts to server flips within few minutes
  const windowSize = 24;
  const startIdx = Math.max(0, rolls.length - windowSize);
  const matrixRolls = rolls.slice(startIdx);

  for (let i = 0; i < matrixRolls.length - 1; i++) {
    const from = matrixRolls[i];
    const to = matrixRolls[i + 1];
    
    if (!VALUES.includes(from) || !VALUES.includes(to)) continue;
    
    const age = matrixRolls.length - 1 - i;
    let weight = 1;
    if (age < 3) weight = 3;
    else if (age < 6) weight = 2;
    
    // 1-gram tracking
    counts[from][to] += weight;
    sampleCounts[from][to] += 1;
    
    // 2-gram tracking (if we have a previous roll)
    if (i >= 1) {
      const prevRoll = matrixRolls[i - 1];
      if (VALUES.includes(prevRoll)) {
        const key2gram = `${prevRoll},${from}`;
        if (!counts2gram[key2gram]) {
          counts2gram[key2gram] = {};
          sampleCounts2gram[key2gram] = {};
          VALUES.forEach(v => {
            counts2gram[key2gram][v] = 0;
            sampleCounts2gram[key2gram][v] = 0;
          });
        }
        counts2gram[key2gram][to] += weight;
        sampleCounts2gram[key2gram][to] += 1;
      }
    }
  }

  // Convert 1-gram to percentages
  const matrix = {};
  VALUES.forEach(from => {
    matrix[from] = {};
    const total = VALUES.reduce((sum, to) => sum + counts[from][to], 0);
    VALUES.forEach(to => {
      matrix[from][to] = {
        pct: total > 0 ? Math.round((counts[from][to] / total) * 100) : 0,
        samples: sampleCounts[from][to],
        reliable: sampleCounts[from][to] >= 3
      };
    });
  });

  // Convert 2-gram to percentages
  const matrix2gram = {};
  Object.keys(counts2gram).forEach(key => {
    matrix2gram[key] = {};
    const total = VALUES.reduce((sum, to) => sum + counts2gram[key][to], 0);
    VALUES.forEach(to => {
      matrix2gram[key][to] = {
        pct: total > 0 ? Math.round((counts2gram[key][to] / total) * 100) : 0,
        samples: sampleCounts2gram[key][to],
        reliable: sampleCounts2gram[key][to] >= 2 // 2 samples for 2-gram (less common)
      };
    });
  });

  // Get last 2 rolls for 2-gram lookup (from original rolls array, not window)
  const lastRoll = rolls[rolls.length - 1];
  const last2Rolls = rolls.length >= 2 
    ? `${rolls[rolls.length - 2]},${rolls[rolls.length - 1]}`
    : null;

  return {
    matrix,
    matrix2gram,
    lastRoll,
    last2Rolls,
    counts,
    sampleCounts
  };
}

/**
 * Calculate wave detection signals (IMPROVED v2)
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @param {string[]} commons - Current common values (from BBP)
 * @returns {Object} Wave signals
 */
export function calculateWaveSignals(rolls, commons = []) {
  if (!rolls || rolls.length < 4) {
    return {
      lastCommonRunLength: 0,
      noiseAppearanceCount: 0,
      dominantDropRate: 0,
      waveFlipProbability: 0,
      isWaveWarning: false,
      shouldSwitchToAlt: false
    };
  }

  const noise = VALUES.filter(v => !commons.includes(v));
  
  // Calculate last common run length (how many times dominant repeated at end)
  let lastCommonRunLength = 0;
  const dominant = commons[0];
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === dominant) {
      lastCommonRunLength++;
    } else {
      break;
    }
  }

  // Count noise appearances in last 4 rolls
  const last4 = rolls.slice(-4);
  const noiseAppearanceCount = last4.filter(r => noise.includes(r)).length;

  // Calculate dominant drop rate (IMPROVED: compare last 5 vs previous 5)
  let dominantDropRate = 0;
  if (rolls.length >= 10) {
    const recent5 = rolls.slice(-5);
    const previous5 = rolls.slice(-10, -5);
    
    const recentCount = recent5.filter(r => r === dominant).length;
    const previousCount = previous5.filter(r => r === dominant).length;
    
    const recentPct = (recentCount / recent5.length) * 100;
    const previousPct = (previousCount / previous5.length) * 100;
    
    dominantDropRate = Math.round(previousPct - recentPct);
  }

  // Calculate wave flip probability (IMPROVED thresholds)
  let waveFlipProbability = 0;
  
  // Factor 1: IMPROVED - More granular run length detection
  if (lastCommonRunLength >= 4) {
    waveFlipProbability += 25;  // was 20
  } else if (lastCommonRunLength >= 3) {
    waveFlipProbability += 15;  // was 10
  } else if (lastCommonRunLength >= 2) {
    waveFlipProbability += 5;   // NEW
  }
  
  // Factor 2: IMPROVED - Stronger noise burst weighting
  if (noiseAppearanceCount >= 3) {
    waveFlipProbability += 50;  // was 35 - 3+ noise in 4 = definite flip
  } else if (noiseAppearanceCount >= 2) {
    waveFlipProbability += 35;  // was 25
  } else if (noiseAppearanceCount >= 1) {
    waveFlipProbability += 10;
  }
  
  // Factor 3: IMPROVED - Dominant dropping detection
  if (dominantDropRate >= 20) {
    waveFlipProbability += 30;  // was 25 at 15%
  } else if (dominantDropRate >= 15) {
    waveFlipProbability += 20;  // was 15 at 10%
  } else if (dominantDropRate >= 10) {
    waveFlipProbability += 10;  // was 5
  }

  // Factor 4: Distribution becoming balanced (all within 15%)
  const freq = {};
  VALUES.forEach(v => { freq[v] = 0; });
  rolls.forEach(r => { if (VALUES.includes(r)) freq[r]++; });
  const percentages = VALUES.map(v => (freq[v] / rolls.length) * 100);
  const maxPct = Math.max(...percentages);
  const minPct = Math.min(...percentages);
  if (maxPct - minPct < 15) {
    waveFlipProbability += 15;
  }

  // NEW: Should switch to alt? (dominant dropping fast AND alt rising)
  const shouldSwitchToAlt = dominantDropRate >= 10;

  return {
    lastCommonRunLength,
    noiseAppearanceCount,
    dominantDropRate,
    waveFlipProbability: Math.min(waveFlipProbability, 100),
    isWaveWarning: waveFlipProbability >= 40,  // LOWERED from 50
    shouldSwitchToAlt
  };
}

/**
 * Calculate trend for each value
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @returns {Object} Trend data for each value
 */
export function calculateTrends(rolls) {
  if (!rolls || rolls.length < 6) {
    return VALUES.reduce((acc, v) => {
      acc[v] = {
        direction: 'stable',
        delta: 0,
        current: 0,
        arrowAge: 0,
        arrowWeight: 1.0,
        trustScore: 0.6,
        state: 'fresh',
        supportScore: 22,
        supportTier: 'weak',
        recentCarryScore: 24,
        latentPressure: 18,
        latentTier: 'low',
        noisePriorityScore: 22,
        noisePriorityTier: 'quiet',
        recentCount: 0,
        olderCount: 0,
        recent8Count: 0,
        recent8Pct: 0,
        totalCount: 0,
      };
      return acc;
    }, {});
  }

  // Helper: compute direction for a given 5-vs-5 window
  function computeDirection(recent5, older5) {
    const dir = {};
    VALUES.forEach(v => {
      const recentCount = recent5.filter(r => r === v).length;
      const olderCount = older5.length > 0 ? older5.filter(r => r === v).length : 0;
      const recentPct = (recentCount / recent5.length) * 100;
      const olderPct = older5.length > 0 ? (olderCount / older5.length) * 100 : recentPct;
      const delta = Math.round(recentPct - olderPct);
      dir[v] = delta >= 10 ? 'rising' : delta <= -10 ? 'falling' : 'stable';
    });
    return dir;
  }

  // Current window: last 5 vs prev 5
  const recentRolls = rolls.slice(-5);
  const olderRolls  = rolls.slice(-10, -5);
  const currentDir  = computeDirection(recentRolls, olderRolls);

  // Previous window (shifted back 5 rolls): for arrowAge calculation
  const prevRecent  = rolls.slice(-10, -5);
  const prevOlder   = rolls.slice(-15, -10);
  const prevDir     = prevOlder.length >= 5
    ? computeDirection(prevRecent, prevOlder)
    : currentDir; // not enough history — assume same

  // One window before that: for age=2 check
  const prev2Recent = rolls.slice(-15, -10);
  const prev2Older  = rolls.slice(-20, -15);
  const prev2Dir    = prev2Older.length >= 5
    ? computeDirection(prev2Recent, prev2Older)
    : prevDir;

  const trends = {};

  VALUES.forEach(v => {
    const recentCount = recentRolls.filter(r => r === v).length;
    const olderCount  = olderRolls.length > 0 ? olderRolls.filter(r => r === v).length : 0;
    const recentPct   = (recentCount / recentRolls.length) * 100;
    const totalCount = rolls.filter(r => r === v).length;
    const globalPct = (totalCount / Math.max(rolls.length, 1)) * 100;
    const olderPctRaw = olderRolls.length > 0 ? (olderCount / olderRolls.length) * 100 : recentPct;
    const baselineWeight =
      olderRolls.length >= 5 ? 0.8 :
      olderRolls.length >= 3 ? 0.6 :
      olderRolls.length === 2 ? 0.4 :
      olderRolls.length === 1 ? 0.2 :
      0;
    const olderPct = olderPctRaw * baselineWeight + globalPct * (1 - baselineWeight);
    const delta = Math.round(recentPct - olderPct);
    const directionThreshold =
      olderRolls.length >= 5 ? 10 :
      olderRolls.length >= 3 ? 12 :
      olderRolls.length === 2 ? 18 :
      olderRolls.length === 1 ? 24 :
      14;
    const direction = delta >= directionThreshold ? 'rising' : delta <= -directionThreshold ? 'falling' : 'stable';

    // arrowAge: how many consecutive windows has direction been the same?
    // age 0 = just changed this window (fresh)
    // age 1 = same as previous window
    // age 2 = same for 2+ windows (stale)
    let arrowAge = 0;
    if (direction === prevDir[v]) {
      arrowAge = 1;
      if (direction === prev2Dir[v]) {
        arrowAge = 2;
      }
    }

    // arrowWeight: decay multiplier for scoring use
    // Fresh (age 0-1) = full trust, stale (age 2+) = reduced
    const arrowWeight = arrowAge === 0 ? 1.0
                      : arrowAge === 1 ? 0.75
                      : 0.40; // age 2+ = stale

    const lastIndex = rolls.lastIndexOf(v);
    const lastSeenGap = lastIndex >= 0 ? (rolls.length - 1 - lastIndex) : rolls.length;
    const recent8 = rolls.slice(-8);
    const recent8Count = recent8.filter(r => r === v).length;
    const recent8Pct = recent8.length > 0 ? (recent8Count / recent8.length) * 100 : 0;
    const recencyBonus =
      lastSeenGap === 0 ? 18 :
      lastSeenGap === 1 ? 12 :
      lastSeenGap === 2 ? 8 :
      lastSeenGap <= 4 ? 4 :
      0;
    const recentCarryScore = Math.max(0, Math.min(100, Math.round(
      recent8Pct * 0.46 +
      globalPct * 0.20 +
      recencyBonus +
      (recentCount > 0 ? 6 : 0) +
      (totalCount >= 4 ? 8 : totalCount >= 2 ? 4 : 0) +
      (direction === 'rising' ? 4 : direction === 'stable' ? 3 : 0)
    )));
    const deltaStrength = Math.min(1, Math.abs(delta) / 38);
    const memoryGuard =
      recentCarryScore * 0.24 +
      Math.min(globalPct, 40) * 0.22 +
      (lastSeenGap === 0 ? 18 : lastSeenGap === 1 ? 10 : lastSeenGap === 2 ? 5 : 0) +
      (recent8Count >= 3 ? 8 : recent8Count === 2 ? 4 : 0) +
      (olderCount >= 2 ? 6 : olderCount === 1 ? 3 : 0);
    const localPatternCarry =
      (recent8Count >= 3 ? 0.08 : recent8Count === 2 ? 0.04 : 0) +
      (recentCarryScore >= 55 ? 0.07 : recentCarryScore >= 40 ? 0.04 : recentCarryScore >= 28 ? 0.02 : 0) +
      (recentPct >= 35 ? 0.04 : recentPct >= 20 ? 0.02 : 0);
    const trustScore = Math.max(0.28, Math.min(1,
      direction === 'rising'
        ? 0.80 + Math.min(0.12, deltaStrength * 0.12) + Math.min(0.10, memoryGuard / 340) + localPatternCarry * 0.55
        : direction === 'stable'
          ? 0.54 + Math.min(0.15, memoryGuard / 235) + (recentPct >= 40 ? 0.06 : recentPct >= 20 ? 0.03 : 0) + localPatternCarry * 0.70
          : 0.31 +
            Math.min(0.18, memoryGuard / 215) +
            (lastSeenGap === 0 ? 0.14 : lastSeenGap === 1 ? 0.08 : lastSeenGap === 2 ? 0.04 : 0) +
            (recentPct >= 20 ? 0.06 : 0) +
            (olderCount >= 2 ? 0.04 : olderCount === 1 ? 0.02 : 0) -
            deltaStrength * 0.02 +
            localPatternCarry * 0.85
    ));
    const trustPct = trustScore * 100;
    const freshnessPct = arrowWeight * 100;
    const state = arrowAge === 0 ? 'fresh' : arrowAge === 1 ? 'held' : 'stale';
    const absencePct = Math.max(0, Math.min(100, Math.round((lastSeenGap / Math.max(rolls.length, 1)) * 100)));
    const supportScore = Math.max(0, Math.min(100, Math.round(
      recentPct * 0.30 +
      olderPct * 0.10 +
      recentCarryScore * 0.22 +
      trustPct * 0.18 +
      freshnessPct * 0.08 +
      globalPct * 0.07 +
      recent8Pct * 0.05 +
      (direction === 'rising' ? 4 : direction === 'stable' ? 2 : 0)
    )));
    const supportTier =
      supportScore >= 55 ? 'backed'
      : supportScore >= 42 ? 'supported'
      : supportScore >= 30 ? 'thin'
      : 'weak';
    const latentPressure = Math.max(0, Math.min(100, Math.round(
      absencePct * 0.38 +
      trustPct * 0.24 +
      freshnessPct * 0.12 +
      olderPct * 0.14 +
      (recentPct === 0 ? 10 : 0) +
      (totalCount === 0 ? 8 : 0) +
      (direction === 'rising' ? 6 : direction === 'stable' ? 2 : 0)
    )));
    const latentTier =
      latentPressure >= 58 ? 'armed'
      : latentPressure >= 44 ? 'watch'
      : latentPressure >= 30 ? 'low'
      : 'quiet';
    const noisePriorityScore = Math.max(0, Math.min(100, Math.round(
      absencePct * 0.44 +
      trustPct * 0.18 +
      freshnessPct * 0.08 +
      olderPct * 0.16 +
      recentCarryScore * (recentPct > 0 ? 0.08 : 0.02) +
      (recentPct === 0 ? 14 : recentPct <= 20 ? 5 : 0) +
      (olderCount > 0 && recentCount === 0 ? 8 : 0) +
      (totalCount <= 1 ? 10 : totalCount === 2 ? 4 : 0) +
      (totalCount === 0 ? 10 : 0) +
      (direction === 'rising' ? 6 : direction === 'stable' ? 4 : -3)
    )));
    const noisePriorityTier =
      noisePriorityScore >= 62 ? 'primed'
      : noisePriorityScore >= 48 ? 'live'
      : noisePriorityScore >= 34 ? 'watch'
      : 'quiet';

    trends[v] = {
      direction,
      delta,
      current: Math.round(recentPct),
      arrowAge,
      arrowWeight,
      trustScore,
      state,
      supportScore,
      supportTier,
      recentCarryScore,
      latentPressure,
      latentTier,
      noisePriorityScore,
      noisePriorityTier,
      baselinePct: Math.round(olderPct),
      recentCount,
      olderCount,
      recent8Count,
      recent8Pct: Math.round(recent8Pct),
      totalCount,
    };
  });

  return trends;
}

export function buildTrendOverallScores({
  trends = {},
  commons = [],
  noise = [],
  commonDecisionScores = [],
  noiseDecisionScores = [],
}) {
  const commonMap = new Map((commonDecisionScores || []).map((entry) => [entry.value, entry]));
  const noiseMap = new Map((noiseDecisionScores || []).map((entry) => [entry.value, entry]));

  return VALUES.map((value) => {
    const trend = trends?.[value] || {};
    const trustPct = Math.round((trend.trustScore ?? 0) * 100);
    const freshnessPct = Math.round((trend.arrowWeight ?? 0) * 100);
    const sharePct = trend.current ?? 0;
    const supportScore = trend.supportScore ?? 0;
    const recentCarryScore = trend.recentCarryScore ?? 0;
    const latentPressure = trend.latentPressure ?? 0;
    const noisePriorityScore = trend.noisePriorityScore ?? 0;
    const isCommon = commons.includes(value);
    const poolScore = isCommon
      ? (commonMap.get(value)?.commonScore ?? 0)
      : (noiseMap.get(value)?.noiseScore ?? 0);
    const trendAnchor = isCommon
      ? (supportScore * 0.55 + recentCarryScore * 0.45)
      : (Math.max(noisePriorityScore, latentPressure) * 0.60 + supportScore * 0.18 + recentCarryScore * 0.22);
    const overallScore = Math.max(0, Math.min(100, Math.round(
      poolScore * 0.34 +
      trendAnchor * 0.24 +
      recentCarryScore * (isCommon ? 0.14 : 0.10) +
      trustPct * 0.12 +
      freshnessPct * 0.08 +
      sharePct * (isCommon ? 0.08 : 0.05) +
      (!isCommon && sharePct === 0 ? 4 : 0)
    )));

    return {
      value,
      overallScore,
      poolScore: Math.round(poolScore),
      trendAnchor: Math.round(trendAnchor),
      isCommon,
      isNoise: noise.includes(value),
    };
  }).sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
}

export function buildSessionStateScores({
  scoredEntries = [],
  trends = {},
  commons = [],
  noise = [],
  commonDecisionScores = [],
  noiseDecisionScores = [],
  stateKey = 'pair',
  freshOutsider = null,
  siblingCommonValue = null,
  commonReturnArmed = false,
  commonReclaimArmed = false,
  commonReclaimValue = null,
  siblingBounceArmed = false,
}) {
  const commonMap = new Map((commonDecisionScores || []).map((entry) => [entry.value, entry]));
  const noiseMap = new Map((noiseDecisionScores || []).map((entry) => [entry.value, entry]));
  const normalizeStateScores = (entries) => {
    const sorted = [...entries].sort((a, b) => (b.stateDecisionRaw || 0) - (a.stateDecisionRaw || 0));
    const topRaw = sorted[0]?.stateDecisionRaw ?? 0;
    const totalRaw = sorted.reduce((sum, entry) => sum + Math.max(0, entry.stateDecisionRaw || 0), 0);
    return sorted.map((entry, index) => {
      let stateScore = totalRaw > 0
        ? ((Math.max(0, entry.stateDecisionRaw || 0) / totalRaw) * 100)
        : (index === 0 ? 100 : 0);
      if (index === 0 && topRaw > 0 && stateScore < 34) stateScore = 34;
      return {
        ...entry,
        stateScore: Math.round(Math.max(0, Math.min(100, stateScore))),
        rank: index + 1,
      };
    });
  };

  const scored = VALUES.map((value) => {
    const entry = scoredEntries.find((item) => item.value === value) || {};
    const trend = trends?.[value] || {};
    const trustPct = Math.round((trend.trustScore ?? entry.trustScore ?? 0) * 100);
    const freshnessPct = Math.round((trend.arrowWeight ?? entry.arrowWeight ?? 0) * 100);
    const sharePct = trend.current ?? entry.currentShare ?? 0;
    const support = trend.supportScore ?? entry.supportScore ?? 0;
    const carry = trend.recentCarryScore ?? entry.recentCarryScore ?? 0;
    const latent = Math.max(trend.latentPressure ?? entry.latentPressure ?? 0, trend.noisePriorityScore ?? entry.noisePriorityScore ?? 0);
    const commonScore = commonMap.get(value)?.commonScore ?? 0;
    const noiseScore = noiseMap.get(value)?.noiseScore ?? 0;
    const pair2 = entry.pair2 || 0;
    const follow2 = entry.recentFollow2 || 0;
    const follow3 = entry.recentFollow3 || 0;
    const isCommon = commons.includes(value);
    const isNoise = noise.includes(value);
    const freshBreak = freshOutsider?.value === value;

    const backboneRaw = Math.max(0, Math.min(100, Math.round(
      (isCommon ? commonScore * 0.44 : commonScore * 0.14) +
      support * 0.18 +
      carry * 0.16 +
      trustPct * 0.08 +
      sharePct * 0.07 +
      pair2 * 0.05 +
      follow2 * 0.04 +
      follow3 * 0.04 +
      (isCommon ? 8 : 0) +
      (!isCommon && sharePct <= 20 ? -8 : 0)
    )));

    const breakRaw = Math.max(0, Math.min(100, Math.round(
      (isNoise ? noiseScore * 0.46 : noiseScore * 0.16) +
      latent * 0.22 +
      trustPct * 0.08 +
      freshnessPct * 0.06 +
      (entry.pressureScore || 0) * 0.10 +
      (entry.activationScore || 0) * 0.08 +
      (freshBreak ? 10 : 0) +
      (isNoise ? 8 : -4) +
      (sharePct === 0 && isNoise ? 4 : 0)
    )));

    const reentryTarget =
      (commonReturnArmed && siblingCommonValue === value) ||
      (commonReclaimArmed && commonReclaimValue === value) ||
      (siblingBounceArmed && siblingCommonValue === value);
    const reentryRaw = Math.max(0, Math.min(100, Math.round(
      (isCommon ? commonScore * 0.28 : commonScore * 0.10) +
      support * 0.24 +
      carry * 0.22 +
      trustPct * 0.08 +
      pair2 * 0.08 +
      follow2 * 0.06 +
      follow3 * 0.06 +
      (reentryTarget ? 14 : 0) +
      (freshBreak ? -6 : 0)
    )));

    let stateRaw = 0;
    if (stateKey === 'break') {
      stateRaw =
        breakRaw * 0.70 +
        backboneRaw * 0.10 +
        reentryRaw * 0.08 +
        (freshBreak ? 8 : 0) +
        (isNoise ? 6 : -4);
    } else if (stateKey === 'probe') {
      stateRaw =
        backboneRaw * 0.54 +
        breakRaw * 0.28 +
        reentryRaw * 0.10 +
        (isCommon ? 6 : 0) +
        (freshBreak ? 4 : 0);
    } else if (stateKey === 'reentry') {
      stateRaw =
        reentryRaw * 0.62 +
        backboneRaw * 0.24 +
        breakRaw * 0.06 +
        (reentryTarget ? 10 : 0) +
        (freshBreak ? -6 : 0);
    } else {
      stateRaw =
        backboneRaw * 0.68 +
        reentryRaw * 0.16 +
        breakRaw * 0.06 +
        (isCommon ? 6 : -4) +
        (freshBreak ? -4 : 0);
    }

    return {
      value,
      backboneScore: Math.round(backboneRaw),
      breakScore: Math.round(breakRaw),
      reentryScore: Math.round(reentryRaw),
      stateDecisionRaw: stateRaw,
      isCommon,
      isNoise,
    };
  }).sort((a, b) => (b.stateDecisionRaw || 0) - (a.stateDecisionRaw || 0));

  return normalizeStateScores(scored);
}


/**
 * Step 6: Regime Detector
 * Classifies the current session into one of three states:
 *   'stable'      — commons are dominant and consistent, low noise rate
 *   'transition'  — commons are shifting, distribution changing significantly
 *   'noise-burst' — noise rate is spiking (≥40% of recent rolls are noise)
 *
 * @param {string[]} rolls
 * @param {string[]} commons - current identified commons
 * @param {string[]} noise   - current identified noise values
 * @returns {'stable'|'transition'|'noise-burst'}
 */
export function classifyRegime(rolls, commons, noise, options = {}) {
  const profile = getPredictorProfile(options.region);
  if (!rolls || rolls.length < 8) return 'stable'; // not enough data to classify

  // Recent window for noise rate check
  const recentN = Math.min(8, rolls.length);
  const recent  = rolls.slice(-recentN);
  const noiseInRecent = recent.filter(r => noise.includes(r)).length;
  const noiseRate = noiseInRecent / recentN;

  if (noiseRate >= profile.noiseBurstRate) return 'noise-burst';

  // Transition detection: compare commons share in session halves
  const half = Math.floor(rolls.length / 2);
  const firstHalf = rolls.slice(0, half);
  const secondHalf = rolls.slice(half);
  const commonsShareFirst  = firstHalf.filter(r => commons.includes(r)).length / firstHalf.length;
  const commonsShareSecond = secondHalf.filter(r => commons.includes(r)).length / secondHalf.length;
  const shareShift = Math.abs(commonsShareSecond - commonsShareFirst);

  if (shareShift >= profile.transitionShift) return 'transition'; // adaptive shift threshold

  return 'stable';
}

/**
 * Get the distribution percentages for each value
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @returns {Object} Distribution percentages
 */
export function getDistribution(rolls) {
  if (!rolls || rolls.length === 0) {
    return VALUES.reduce((acc, v) => { acc[v] = 0; return acc; }, {});
  }
  
  const freq = {};
  VALUES.forEach(v => { freq[v] = 0; });
  rolls.forEach(r => { if (VALUES.includes(r)) freq[r]++; });
  
  const distribution = {};
  VALUES.forEach(v => {
    distribution[v] = Math.round((freq[v] / rolls.length) * 100);
  });
  
  return distribution;
}

/**
 * ENHANCED: Identify commons and noise using ROLLING WINDOW
 * 
 * Uses last 10 rolls (not entire session) for faster adaptation
 * Also detects when noise values are rising to become new commons
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @returns {Object} Commons, noise, distribution, and rising noise detection
 */
export function identifyCommonsNoise(rolls, options = {}) {
  const profile = getPredictorProfile(options.region);
  const n = rolls.length;

  // =========================================================================
  // 🆕 D: COMMONS CONSENSUS VOTING (3-window system)
  // Run 3 different window sizes and vote on common/noise classification.
  // A value is only NOISE if it's in the bottom 2 in ALL 3 windows.
  // A value is COMMON if it's in the top 2 in 2+ of 3 windows.
  // This prevents the constant flip-flopping in chaotic near-flat sessions.
  // =========================================================================
  const fullDistribution = getDistribution(rolls);
  const recent4 = rolls.slice(-4);
  const recent6 = rolls.slice(-6);
  const recent8 = rolls.slice(-8);
  const prev6 = rolls.slice(-12, -6);
  const recent4Dist = getDistribution(recent4);
  const recent6Dist = getDistribution(recent6);
  const recent8Dist = getDistribution(recent8);
  const prev6Dist = getDistribution(prev6);
  const currentLastRoll = rolls[rolls.length - 1];
  const last2Rolls = rolls.length >= 2
    ? `${rolls[rolls.length - 2]},${rolls[rolls.length - 1]}`
    : null;
  const last3Rolls = rolls.length >= 3
    ? `${rolls[rolls.length - 3]},${rolls[rolls.length - 2]},${rolls[rolls.length - 1]}`
    : null;
  const recentFollowerScores = buildRecentFollowerScores(rolls, currentLastRoll, last2Rolls);
  const globalPair2Map = last2Rolls ? (GLOBAL_PAIR2_PRIORS[last2Rolls] || null) : null;
  const globalPair3Map = last3Rolls ? (GLOBAL_PAIR3_PRIORS[last3Rolls] || null) : null;
  const globalPair2TopValue = globalPair2Map
    ? Object.entries(globalPair2Map).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    : null;
  const globalPair3TopValue = globalPair3Map
    ? Object.entries(globalPair3Map).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    : null;
  const snapbackOutsiderValue = (() => {
    if (recent4.length < 4) return null;
    const [a, b, c, d] = recent4;
    if (a === b && a === d && c !== a) return c;
    return null;
  })();

  const windowSizes = [...new Set([4, 8, 12].map(w => Math.min(w, n)))];
  const windowVotes = {};
  VALUES.forEach(v => { windowVotes[v] = 0; });

  let primaryDistribution = fullDistribution;
  windowSizes.forEach((wSize, i) => {
    const wRolls = rolls.slice(-wSize);
    const wDist = getDistribution(wRolls);
    if (i === 1) primaryDistribution = wDist; // 8-roll window as display dist
    const wSorted = VALUES
      .map(v => ({
        value: v,
        pct: wDist[v],
        totalCount: rolls.filter((roll) => roll === v).length,
        lastRollSingletonPenalty:
          v === currentLastRoll && rolls.filter((roll) => roll === v).length <= 1
            ? 1
            : 0,
      }))
      .sort((a, b) =>
        b.pct - a.pct ||
        b.totalCount - a.totalCount ||
        a.lastRollSingletonPenalty - b.lastRollSingletonPenalty ||
        (recent6Dist[b.value] || 0) - (recent6Dist[a.value] || 0) ||
        (fullDistribution[b.value] || 0) - (fullDistribution[a.value] || 0)
      );
    wSorted.slice(0, 2).forEach(({ value }) => { windowVotes[value]++; });
  });

  // Rank by votes, tie-break by full-session frequency
  const ranked = VALUES
    .map(v => ({ value: v, votes: windowVotes[v], fullPct: fullDistribution[v] }))
    .sort((a, b) => b.votes - a.votes || b.fullPct - a.fullPct);

  const voteCommons = ranked.slice(0, 2).map(x => x.value);
  const voteCommonShare = voteCommons.reduce((sum, value) => sum + (primaryDistribution[value] || 0), 0);
  const commonAffinityRanked = VALUES
    .map((value) => {
      const totalCount = rolls.filter((roll) => roll === value).length;
      const recent2Hits = rolls.slice(-2).filter((roll) => roll === value).length;
      const recent4Hits = recent4.filter((roll) => roll === value).length;
      const directFollow = recentFollowerScores.direct[value] || 0;
      const pairFollow = recentFollowerScores.pair[value] || 0;
      const globalPair2Pct = globalPair2Map?.[value] || 0;
      const globalPair3Pct = globalPair3Map?.[value] || 0;
      const emergence = Math.max(0, (recent6Dist[value] || 0) - (prev6Dist[value] || 0));
      const cooling = Math.max(0, (prev6Dist[value] || 0) - (recent6Dist[value] || 0));
      const earlySequenceBoost =
        n <= 8
          ? (
              globalPair2Pct * 1.45 +
              globalPair3Pct * 1.75 +
              (globalPair2TopValue === value ? 16 : 0) +
              (globalPair3TopValue === value ? 22 : 0)
            )
          : (
              globalPair2Pct * 0.55 +
              globalPair3Pct * 0.75 +
              (globalPair2TopValue === value ? 6 : 0) +
              (globalPair3TopValue === value ? 10 : 0)
            );
      const snapbackPenalty =
        n >= 6 &&
        snapbackOutsiderValue === value
          ? 34
          : 0;
      const singletonOutsiderPenalty =
        n >= 8 &&
        value === currentLastRoll &&
        totalCount <= 1 &&
        !voteCommons.includes(value) &&
        voteCommonShare >= 66
          ? 44
          : 0;
      const affinityRaw =
        windowVotes[value] * 22 +
        (primaryDistribution[value] || 0) * 0.62 +
        (recent6Dist[value] || 0) * 0.74 +
        (recent4Dist[value] || 0) * 0.42 +
        (recent8Dist[value] || 0) * 0.18 +
        (fullDistribution[value] || 0) * 0.20 +
        directFollow * 0.14 +
        pairFollow * 0.22 +
        earlySequenceBoost +
        recent2Hits * 10 +
        recent4Hits * 4 +
        emergence * 0.70 -
        cooling * 0.28 -
        snapbackPenalty -
        singletonOutsiderPenalty +
        (value === currentLastRoll ? 6 : 0);
      return {
        value,
        votes: windowVotes[value],
        affinityRaw,
        directFollow,
        pairFollow,
        emergence,
        totalCount,
        recent2Hits,
        recent4Hits,
      };
    })
    .sort((a, b) => (b.affinityRaw || 0) - (a.affinityRaw || 0))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      raw: entry.affinityRaw || 0,
    }));

  const currentLastTotalCount = rolls.filter((roll) => roll === currentLastRoll).length;
  const affinityGap = (commonAffinityRanked[1]?.affinityRaw || 0) - (commonAffinityRanked[2]?.affinityRaw || 0);
  const adaptiveTop2 = commonAffinityRanked.slice(0, 2).map((entry) => entry.value);
  const singletonAdaptiveOutsiderBlocked =
    n >= 8 &&
    currentLastRoll &&
    adaptiveTop2.includes(currentLastRoll) &&
    !voteCommons.includes(currentLastRoll) &&
    currentLastRoll === rolls[rolls.length - 1] &&
    currentLastTotalCount <= 1 &&
    voteCommonShare >= 66;
  const strongerAdaptiveCandidate =
    commonAffinityRanked[0] &&
    commonAffinityRanked[1] &&
    !singletonAdaptiveOutsiderBlocked &&
    (
      affinityGap >= 8 ||
      (commonAffinityRanked[1].pairFollow || 0) >= 55 ||
      (commonAffinityRanked[1].directFollow || 0) >= 60 ||
      (commonAffinityRanked[1].emergence || 0) >= 18
    );

  let commons = strongerAdaptiveCandidate
    ? commonAffinityRanked.slice(0, 2).map((entry) => entry.value)
    : voteCommons;
  let noise   = VALUES.filter((value) => !commons.includes(value));
  const distribution = primaryDistribution;
  const bestAffinityValue = commonAffinityRanked[0]?.value || commons[0];
  const secondAffinityValue = commonAffinityRanked[1]?.value || commons[1];
  const currentLastAffinity = commonAffinityRanked.find((entry) => entry.value === currentLastRoll) || null;
  const currentSecondCommonAffinity = commonAffinityRanked.find((entry) => entry.value === commons[1]) || null;
  const matureLastRollPromotionBlocked =
    n >= 8 &&
    currentLastRoll &&
    !voteCommons.includes(currentLastRoll) &&
    voteCommonShare >= 60 &&
    currentLastTotalCount <= 2 &&
    (currentLastAffinity?.recent2Hits || 0) < 2 &&
    (currentLastAffinity?.directFollow || 0) < 45 &&
    (currentLastAffinity?.pairFollow || 0) < 40 &&
    (currentLastAffinity?.emergence || 0) < 12;

  if (n >= 6 && snapbackOutsiderValue && commons.includes(snapbackOutsiderValue)) {
    const replacement = commonAffinityRanked.find((entry) =>
      entry.value !== bestAffinityValue &&
      entry.value !== snapbackOutsiderValue
    )?.value;
    if (replacement) {
      commons = [bestAffinityValue, replacement];
      noise = VALUES.filter((value) => !commons.includes(value));
    }
  }

  const singletonLastRollGuard =
    n >= 8 &&
    currentLastRoll &&
    commons.includes(currentLastRoll) &&
    currentLastTotalCount <= 1 &&
    !voteCommons.includes(currentLastRoll) &&
    voteCommonShare >= 66;
  if (singletonLastRollGuard) {
    commons = [...voteCommons];
    noise = VALUES.filter((value) => !commons.includes(value));
  }

  if (
    n >= 6 &&
    currentLastRoll &&
    !commons.includes(currentLastRoll) &&
    currentLastAffinity &&
    !matureLastRollPromotionBlocked &&
    !(
      n >= 8 &&
      currentLastTotalCount <= 1 &&
      !voteCommons.includes(currentLastRoll) &&
      voteCommonShare >= 66
    ) &&
    (recent4Dist[currentLastRoll] || 0) >= 20 &&
    (
      currentLastAffinity.rank <= 3 ||
      (currentLastAffinity.raw || 0) >= ((currentSecondCommonAffinity?.raw || 0) - 28)
    )
  ) {
    commons = [bestAffinityValue, currentLastRoll];
    noise = VALUES.filter((value) => !commons.includes(value));
  }

  // =========================================================================
  // 🔗 SVAROG ALT SYNC: Adopt svarog's best new value as main's alt
  // =========================================================================
  const last6 = rolls.slice(-6);
  const last2 = rolls.slice(-2);
  const noiseRising = [];
  noise.forEach(noiseVal => {
    const countInLast6 = last6.filter(r => r === noiseVal).length;
    if (countInLast6 >= profile.noiseRisingCount) noiseRising.push(noiseVal);
  });
  if (noiseRising.length > 0) {
    const risingNoise = noiseRising[0];
    const weakerCommon = commons[1];
    const risingCount = last6.filter(r => r === risingNoise).length;
    const weakerCount = last6.filter(r => r === weakerCommon).length;
    if (risingCount > weakerCount) {
      commons = [commons[0], risingNoise];
      noise = noise.filter(nv => nv !== risingNoise);
      noise.push(weakerCommon);
    }
  }
  // Fast outsider promotion: if a noise value just hit twice in the last two rolls,
  // treat it as emerging immediately instead of waiting for the wider threshold.
  const doubledNoise = noise.find(noiseVal =>
    last2.length === 2 &&
    last2[0] === noiseVal &&
    last2[1] === noiseVal &&
    last6.filter(r => r === noiseVal).length >= 2
  );
  if (doubledNoise && !commons.includes(doubledNoise)) {
    const weakerCommon = commons[1];
    commons = [commons[0], doubledNoise];
    noise = noise.filter(nv => nv !== doubledNoise);
    noise.push(weakerCommon);
    if (!noiseRising.includes(doubledNoise)) noiseRising.push(doubledNoise);
  }

  // RUN BREAK DETECTION
  const lastRoll = rolls[rolls.length - 1];
  let currentRunLength = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === lastRoll) currentRunLength++;
    else break;
  }
  const isLastRollCommon = commons.includes(lastRoll);
  const runBreakThreshold = isLastRollCommon ? 2 : 3;

  return {
    commons,
    noise,
    distribution,
    fullDistribution,
    commonAffinity: Object.fromEntries(commonAffinityRanked.map((entry, index) => [
      entry.value,
      {
        rank: index + 1,
        raw: Math.round((entry.affinityRaw || 0) * 100) / 100,
      },
    ])),
    noiseRising,
    currentRunLength,
    runBreakLikely: currentRunLength >= runBreakThreshold
  };
}

/**
 * Enhanced Pair Transition Predictor (Beast Mode v3.5)
 */
/**
 * Main prediction function using pair transitions and wave detection
 * 
 * @param {string[]} rolls - Array of 2-digit rolls
 * @returns {Object} Prediction result
 */
export function predictWithPairs(rolls, options = {}) {
  if (!rolls || rolls.length < 6) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      method: 'insufficient-data',
      pairSafety: 'warming',
      noiseRisk: 0,
      pairMatrix: null,
      waveSignals: null,
      trends: null,
      commons: [],
      noise: [],
      distribution: {}
    };
  }

  const profile = getPredictorProfile(options.region);

  // Build all the data (ENHANCED with new features)
  const commonsData = identifyCommonsNoise(rolls, options);
  let { commons, noise, distribution, fullDistribution, noiseRising, currentRunLength, runBreakLikely } = commonsData;
  const { matrix, matrix2gram, lastRoll, last2Rolls } = buildPairMatrix(rolls);
  const trends = calculateTrends(rolls);
  const waveSignals = calculateWaveSignals(rolls, commons);
  // 🆕 Step 6: Regime classification — used by final ranker and exposed in debug
  let regime = classifyRegime(rolls, commons, noise, options);

  // =========================================================================
  // 🔥 CHAOS DETECTION: When session is too noisy, use simpler logic
  // =========================================================================
  const last10 = rolls.slice(-10);
  const noiseInLast10 = last10.filter(r => noise.includes(r)).length;
  const noiseRate = noiseInLast10 / Math.min(10, rolls.length);
  
  // Also check if distribution is too flat (no clear pattern)
  const distValues = Object.values(distribution);
  const maxDist = Math.max(...distValues);
  const minDist = Math.min(...distValues);
  const isFlat = (maxDist - minDist) < profile.flatBand;
  
  // Chaos = high noise rate OR flat distribution
  const isChaotic = noiseRate >= profile.chaosNoiseRate || isFlat;
  
  // =========================================================================
  // 🚨 EMERGENCY BRAKE: Full-flat state = server reset / salt change detected
  // When ALL 4 values are within 6% (i.e. ~25/25/25/25) the session has
  // flipped salts and NO predictor can win here. Return a stand-by warning.
  // =========================================================================
  const isTotallyFlat = (maxDist - minDist) < 6; // Stricter than isFlat (15)
  // Also check recent 6 rolls: if they contain 4 unique values it's chaos onset
  const last6 = rolls.slice(-6);
  const uniqueInLast6 = new Set(last6.filter(r => VALUES.includes(r))).size;
  const isChaoticOnset = uniqueInLast6 >= 4 && isTotallyFlat;
  
  if (isTotallyFlat && rolls.length >= 8) {
    // Don't fire too early — need enough rolls to confirm, not just warmup
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      method: 'session-reset',
      trustedPair: commons,
      runnerUpPair: noise,
      pairSafety: 'danger',
      noiseRisk: 100,
      pairScoreGap: 0,
      label: '🔴 Reset',
      reasonLine: 'All values ~25% — server re-salted. Stand by.',
      isSessionReset: true,
      isChaotic: true,
      noiseWatch: null,
      overdueNoise: [],
      isNoiseTrap: false,
      trapCandidate: null,
      commons,
      noise,
      distribution,
      lastRoll,
      pairMatrix: matrix,
      waveSignals,
      trends,
      noiseRate: Math.round(noiseRate * 100),
      isFlat: true
    };
  }

  // =========================================================================
  // 🆕 IMPROVEMENT 2: SESSION RUN-LENGTH CALIBRATION
  // Track average run length observed so far to calibrate hot-run confidence
  // =========================================================================
  const observedRuns = [];
  let runVal = rolls[0]; let runLen = 1;
  for (let i = 1; i < rolls.length; i++) {
    if (rolls[i] === runVal) {
      runLen++;
    } else {
      if (runLen >= 2 && commons.includes(runVal)) observedRuns.push(runLen);
      runVal = rolls[i]; runLen = 1;
    }
  }
  // Include the current run if it's a common
  if (runLen >= 2 && commons.includes(runVal)) observedRuns.push(runLen);
  const avgObservedRunLen = observedRuns.length > 0
    ? observedRuns.reduce((s, r) => s + r, 0) / observedRuns.length
    : 2.5; // default assumption
  // If session tends to have short runs → lower confidence for continuation
  // If session tends to have long runs → higher confidence for continuation
  const runContinueConfBase = avgObservedRunLen <= 2 ? 0.44 : avgObservedRunLen <= 3 ? 0.52 : 0.58;

  // =========================================================================
  // 🆕 IMPROVEMENT 3: POST-NOISE RECOVERY TRACKING
  // Track which common tends to appear after noise in this session
  // =========================================================================
  const postNoiseCount = {};
  VALUES.forEach(v => { postNoiseCount[v] = 0; });
  for (let i = 0; i < rolls.length - 1; i++) {
    if (noise.includes(rolls[i]) && VALUES.includes(rolls[i + 1])) {
      postNoiseCount[rolls[i + 1]]++;
    }
  }
  // Determine preferred post-noise common (only counts commons, not noise-after-noise)
  const commonPostNoise = commons
    .map(c => ({ value: c, count: postNoiseCount[c] }))
    .sort((a, b) => b.count - a.count);
  const preferredPostNoiseCommon = commonPostNoise[0]?.count > 0 ? commonPostNoise[0].value : null;
  const secondPostNoiseCommon = commonPostNoise[1]?.count > 0 ? commonPostNoise[1].value : null;
  // Only trust the post-noise preference if we've seen it at least twice
  const postNoiseTrustable = commonPostNoise[0]?.count >= 2 &&
    commonPostNoise[0].count > commonPostNoise[1]?.count;

  // =========================================================================
  // 🔄 NOISE GAP TRACKING: Avg commons between noise events (EU server pattern)
  // EU server: noise fires every ~1-3 commons, then recovers within 1-2 noise rolls
  // We track this to know when noise is 'statistically due' and warn accordingly
  // =========================================================================
  const noiseGapLengths = []; // how many commons appeared between each noise event
  let commonsSinceLastNoise = 0;
  let noiseStreakLengths = []; // how many consecutive noise appeared together
  let currentNoiseStreak = 0;
  for (let i = 0; i < rolls.length; i++) {
    if (noise.includes(rolls[i])) {
      if (commons.includes(rolls[Math.max(0, i - 1)])) {
        // Just transitioned from commons to noise
        noiseGapLengths.push(commonsSinceLastNoise);
      }
      currentNoiseStreak++;
      commonsSinceLastNoise = 0;
    } else if (commons.includes(rolls[i])) {
      if (currentNoiseStreak > 0) {
        noiseStreakLengths.push(currentNoiseStreak);
        currentNoiseStreak = 0;
      }
      commonsSinceLastNoise++;
    }
  }
  // If session currently ends on commons, finalize the streak tracking  
  if (currentNoiseStreak > 0) noiseStreakLengths.push(currentNoiseStreak);
  
  const avgNoiseGap = noiseGapLengths.length >= 1
    ? noiseGapLengths.reduce((s, g) => s + g, 0) / noiseGapLengths.length
    : null; // null = no noise gaps observed yet
  const avgNoiseStreakLen = noiseStreakLengths.length >= 1
    ? noiseStreakLengths.reduce((s, g) => s + g, 0) / noiseStreakLengths.length
    : 1; // default: noise is usually single

  // How many commons have appeared since the last noise roll?
  let commonsSinceNoise = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (noise.includes(rolls[i])) break;
    if (commons.includes(rolls[i])) commonsSinceNoise++;
  }
  // 'Noise due' = avg gap known AND we've hit/exceeded that gap without noise
  // Lower confidence when noise is statistically due
  const noiseDue = avgNoiseGap !== null && commonsSinceNoise >= Math.max(avgNoiseGap - 0.5, 1);
  const noiseDueStrong = avgNoiseGap !== null && commonsSinceNoise >= avgNoiseGap + 0.5;

  // =========================================================================
  // 🔥 BEAST MODE: MOMENTUM FLOW (Strategy 3)
  // Calculate momentum score for each value using exponential decay
  // Score = Sum(1 / (Distance + 1)^2) - higher = more recent/frequent
  // =========================================================================
  const momentumScores = {};
  VALUES.forEach(v => {
    let score = 0;
    for (let i = rolls.length - 1; i >= Math.max(0, rolls.length - 12); i--) {
      if (rolls[i] === v) {
        const distance = rolls.length - 1 - i;
        score += 1 / Math.pow(distance + 1, 1.5); // Exponential decay
      }
    }
    // 🆕 ARROW FRESHNESS DECAY: multiply by arrowWeight from trends
    // Stale arrows (same direction 2+ windows) get reduced weight
    const trendWeight = trends[v]?.arrowWeight ?? 1.0;
    momentumScores[v] = Math.round(score * trendWeight * 100) / 100;
  });
  
  // Determine "hot" values (highest momentum) - these are the real commons NOW
  const sortedByMomentum = VALUES
    .map(v => ({ value: v, momentum: momentumScores[v] }))
    .sort((a, b) => b.momentum - a.momentum);
  
  const hotValues = sortedByMomentum.slice(0, 2).map(x => x.value);
  const coldValues = sortedByMomentum.slice(2).map(x => x.value);

  const pairInsights = scoreTrustedPairs({
    rolls,
    distribution,
    fullDistribution,
    trends,
    momentumScores,
    matrix,
    lastRoll,
    commons,
    noise,
    noiseRising,
    regime,
    profile,
  });
  commons = pairInsights.trustedPair;
  noise = pairInsights.noisePair;
  regime = classifyRegime(rolls, commons, noise, options);
  const pairOutlook = scoreTrustedPairs({
    rolls,
    distribution,
    fullDistribution,
    trends,
    momentumScores,
    matrix,
    lastRoll,
    commons,
    noise,
    noiseRising,
    regime,
    profile,
  });
  
  // =========================================================================
  // 🔍 LAST SEEN: Track when each value last appeared (for wave detection)
  // =========================================================================
  const lastSeen = {};
  VALUES.forEach(v => {
    // Find the most recent occurrence of this value
    let rollsAgo = -1; // -1 means never seen
    for (let i = rolls.length - 1; i >= 0; i--) {
      if (rolls[i] === v) {
        rollsAgo = rolls.length - 1 - i;
        break;
      }
    }
    lastSeen[v] = rollsAgo;
  });
  
  // Detect "overdue" values - values that haven't appeared in a while (potential wave flip)
  // 🔧 FIX: Dynamic threshold based on session dominance
  const topPctValue = Math.max(...Object.values(distribution)) || 0;
  const dominancePenalty = topPctValue > 40 ? Math.floor((topPctValue - 40) / 10) : 0;
  const OVERDUE_THRESHOLD = 4 + dominancePenalty; // 4 for balanced, 5-6 for dominant
  
  const overdueValues = VALUES.filter(v => lastSeen[v] >= OVERDUE_THRESHOLD || lastSeen[v] === -1);
  
  // 🆕 SPLIT OVERDUE TRACKING: Separate common vs noise
  const mostOverdueCommon = commons
    .filter(v => lastSeen[v] !== -1)
    .sort((a, b) => lastSeen[b] - lastSeen[a])[0] || null;
    
  const mostOverdue = VALUES
    .filter(v => lastSeen[v] !== -1)
    .sort((a, b) => lastSeen[b] - lastSeen[a])[0] || null;
  
  // =========================================================================
  // 🔄 COMMONS FLIP DETECTION: When noise becomes commons
  // =========================================================================
  let commonsFlipDetected = false;
  let newCommons = null;
  let flipConfidence = 0;
  
  if (rolls.length >= 10) {
    // Get recent window (last 6 rolls)
    const recentWindow = rolls.slice(-6);
    const recentCounts = {};
    VALUES.forEach(v => { recentCounts[v] = 0; });
    recentWindow.forEach(r => { if (VALUES.includes(r)) recentCounts[r]++; });
    
    // Sort by recent frequency
    const recentSorted = VALUES
      .map(v => ({ value: v, count: recentCounts[v], pct: (recentCounts[v] / recentWindow.length) * 100 }))
      .sort((a, b) => b.count - a.count);
    
    const recentCommons = recentSorted.slice(0, 2).map(x => x.value);
    
    // Check if recent commons are different from session commons
    const sessionCommons = commons; // Full session commons
    const isFlipped = recentCommons.some(rc => noise.includes(rc));
    
    if (isFlipped) {
      // Old noise is now appearing more in recent window
      const flippedValues = recentCommons.filter(rc => noise.includes(rc));
      if (flippedValues.length > 0) {
        commonsFlipDetected = true;
        newCommons = recentCommons;
        // Confidence based on how dominant the new commons are in recent window
        const topRecentPct = recentSorted[0].pct;
        flipConfidence = Math.round(Math.min(topRecentPct * 1.5, 100));
      }
    }
  }

  // =========================================================================
  // � COMMONS SWITCH DETECTOR: Track when the dominant pair shifts mid-session
  // Compares full-session commons vs recent-8 window commons using identifyCommonsNoise.
  // Classifies the switch by type and phase (early/mid/late/sustained).
  // =========================================================================
  const commonsSwitch = (() => {
    const n = rolls.length;
    if (n < 10) return { detected: false };

    const recentC = identifyCommonsNoise(rolls.slice(-8)).commons;
    const fullC = commons; // Already computed for full session

    const recentSorted8 = [...recentC].sort();
    const fullSorted = [...fullC].sort();

    if (recentSorted8.join() === fullSorted.join()) {
      return { detected: false, fullCommons: fullC, recentCommons: recentC };
    }

    const switchedIn  = recentC.filter(c => !fullC.includes(c));
    const switchedOut = fullC.filter(c => !recentC.includes(c));

    // Find approximate switch position by scanning backward in steps of 4
    let switchPos = n; // default: very recent
    for (let i = Math.max(8, Math.floor(n * 0.25)); i <= n - 8; i += 4) {
      const earlyC = identifyCommonsNoise(rolls.slice(0, i)).commons;
      const lateC  = identifyCommonsNoise(rolls.slice(i)).commons;
      if ([...earlyC].sort().join() !== [...lateC].sort().join()) {
        switchPos = i;
        break;
      }
    }

    // Phase: where in the session the switch happened
    const switchFrac = switchPos / n;
    const phase = switchFrac < 0.33 ? 'early' : switchFrac < 0.67 ? 'mid' : 'late';

    // Type: partial (1 replaced) vs rebase (both replaced)
    const type = switchedIn.length === 1 ? 'partial' : 'rebase';

    // Is it fresh (only in last 8) or sustained (also present in last 16)?
    let duration = 'fresh';
    if (n >= 16) {
      const midC = identifyCommonsNoise(rolls.slice(-16, -8)).commons;
      const midSorted = [...midC].sort();
      if (midSorted.join() !== fullSorted.join()) duration = 'sustained';
    }

    return {
      detected: true,
      fullCommons: fullC,
      recentCommons: recentC,
      switchedIn,
      switchedOut,
      switchPos,
      phase,
      type,
      duration,
    };
  })();

  // =========================================================================
  // �🔥 BEAST MODE 4.0: PAIR MOMENTUM & MIRROR-STEP
  // =========================================================================

  // Decide prediction method
  // =========================================================================
  // 🔀 COMMONS SWITCH OVERRIDE: When a mid-session rebase is detected and
  // sustained, trust the recent commons pair instead of the full-session
  // commons. Prevents preservation guard locking onto a stale pair.
  // (Addresses Session B: 0% top-2 rate caused by preservation of old pair)
  // =========================================================================
  if (
    commonsSwitch.detected &&
    commonsSwitch.recentCommons?.length === 2 &&
    (commonsSwitch.type === 'rebase' || commonsSwitch.duration === 'sustained')
  ) {
    commons = commonsSwitch.recentCommons;
    noise = VALUES.filter(v => !commons.includes(v));
  }

  let method = 'frequency';
  let prediction = null;
  let alt = null;
  let confidence = 0;
  let _chaosNoiseWatch = null; // Set by chaos mode, shown in UI as ⚡ Watch indicator

  // Get frequency-based prediction (highest %)
  const freqSorted = VALUES
    .map(v => ({ value: v, pct: distribution[v] }))
    .sort((a, b) => b.pct - a.pct);
  
  const freqPrediction = freqSorted[0].value;
  const freqAlt = freqSorted[1].value;

  // PRE-CALCULATE CONTEXT
  const prevRoll = rolls.length >= 2 ? rolls[rolls.length - 2] : null;
  const wasChange = prevRoll !== lastRoll;
  const currentRunLen = currentRunLength; // Alias from identifyCommonsNoise

  // 1. SMART RUN SCORES (Strategy 1)
  const smartRunScores = {};
  VALUES.forEach(v => {
    if (v === lastRoll) {
      if (wasChange) smartRunScores[v] = 1.3;
      else if (currentRunLen >= 3) smartRunScores[v] = 0.4;
      else if (currentRunLen === 2) smartRunScores[v] = 0.8;
      else smartRunScores[v] = 1.0;
    } else smartRunScores[v] = 1.0;
  });

  // 2. NOISE DOUBLE-TAP (Strategy 2)
  let noiseDoubleTapLikely = false;
  let doubleTapValue = null;
  if (noise.includes(lastRoll)) {
    const noiseVal = lastRoll;
    let pairsCount = 0; let singlesCount = 0;
    for (let i = 0; i < rolls.length - 1; i++) {
      if (rolls[i] === noiseVal) {
        if (rolls[i + 1] === noiseVal) { pairsCount++; i++; }
        else singlesCount++;
      }
    }
    const totalAppearances = pairsCount * 2 + singlesCount;
    if (totalAppearances >= 2 && (pairsCount * 2) / totalAppearances >= 0.3) {
      noiseDoubleTapLikely = true;
      doubleTapValue = noiseVal;
    }
  }

  // 3. UNCERTAINTY GATE (Gap Analysis)
  const sortedDist = Object.entries(distribution).map(([v, pct]) => ({ value: v, pct })).sort((a, b) => b.pct - a.pct);
  const topPct = sortedDist[0]?.pct || 0;
  const secondPct = sortedDist[1]?.pct || 0;
  const confidenceGap = topPct - secondPct;
  const isUncertain = confidenceGap < 10 || topPct < 35;

  // 4. 2-GRAM LOGIC (With Sample Penalty Fix)
  let gram2Prediction = null; let gram2Alt = null; let gram2Confidence = 0; let has2gramData = false;
  if (last2Rolls && matrix2gram[last2Rolls]) {
    const gram2Sorted = VALUES.map(v => ({ value: v, pct: matrix2gram[last2Rolls][v]?.pct || 0, samples: matrix2gram[last2Rolls][v]?.samples || 0 }))
      .filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct);
    if (gram2Sorted.length > 0 && gram2Sorted[0].pct > 0) {
      gram2Prediction = gram2Sorted[0].value;
      // RNG BREAKER: Ensure alt is different
      const bestAlt = gram2Sorted[1]?.value || freqSorted.find(f => f.value !== gram2Prediction)?.value || freqAlt;
      gram2Alt = bestAlt;
      
      const samples = gram2Sorted[0].samples;
      let conf = gram2Sorted[0].pct;
      if (samples === 1) conf = Math.min(conf, 45); // Single sample is weak
      else if (samples === 2) conf = Math.min(conf, 65); // Two samples is okay
      
      gram2Confidence = conf;
      has2gramData = true;
    }
  }

  // 5. 1-GRAM MATRIX
  let pairPrediction = null; let pairAlt = null; let pairConfidence = 0;
  if (lastRoll && matrix[lastRoll]) {
    const pairSorted = VALUES.map(v => ({ value: v, pct: matrix[lastRoll][v]?.pct || 0 })).sort((a, b) => b.pct - a.pct);
    pairPrediction = pairSorted[0].value;
    pairAlt = pairSorted[1].value;
    pairConfidence = pairSorted[0].pct;
  }

  // ── FREQ/PAIR BLEND based on RELIABLE EVIDENCE COUNT ────────────────────────
  // How many outgoing transitions from lastRoll have ≥ 3 samples in the matrix?
  // This is stronger than raw sample count — it asks "does the matrix actually know
  // what tends to follow lastRoll?" not just "did lastRoll appear often?"
  //
  //   0 reliable transitions → freq dominates (matrix is blind to this roll)
  //   1 reliable transition  → light pair touch (still learning)
  //   2+ reliable transitions → pair earns more influence
  //   3+ reliable transitions → pair dominates
  const reliableTransitionCount = lastRoll && matrix[lastRoll]
    ? VALUES.filter(v => matrix[lastRoll][v]?.reliable === true).length
    : 0;
  const pairSamplesForLastRoll = rolls.filter(r => r === lastRoll).length; // kept for confidence cap
  const pairWeight = reliableTransitionCount === 0 ? 0.10   // matrix is blind — freq only
    : reliableTransitionCount === 1              ? 0.30   // one reliable edge — light touch
    : reliableTransitionCount === 2              ? 0.55   // two reliable edges — meaningful
    :                                              0.80;  // 3+ reliable edges — pair leads
  const freqWeight = 1 - pairWeight;

  // Compute a blended score for each value (used instead of raw pair % when sparse)
  // 🆕 TRUST SCORE: multiply by direction trust — falling values deprioritized
  const blendedScores = VALUES.map(v => ({
    value: v,
    blended: (freqWeight * (distribution[v] || 0) + pairWeight * (matrix[lastRoll]?.[v]?.pct || 0))
             * (trends[v]?.trustScore ?? 1.0)  // soft modifier, not hard gate
  })).sort((a, b) => b.blended - a.blended);

  // Blended pair prediction (commons-filtered for main use)
  const blendedCommons = blendedScores.filter(x => commons.includes(x.value));
  const blendedPairPrediction = blendedCommons[0]?.value || pairPrediction;
  const blendedPairAlt        = blendedCommons[1]?.value || pairAlt;
  // Use blended confidence (scale down when freq-heavy since freq is weaker)
  const blendedPairConfidence = reliableTransitionCount === 0
    ? Math.min((blendedCommons[0]?.blended || 0), 35)   // matrix blind: cap very low
    : reliableTransitionCount <= 1
    ? Math.min((blendedCommons[0]?.blended || 0), 50)   // light evidence: medium cap
    : (blendedCommons[0]?.blended || pairConfidence);   // solid evidence: full trust

  
  // 6. ALTERNATING PATTERN DETECTION (noise-tolerant, data-driven)
  // Classic: requires strict ABAB in last 4 raw rolls — breaks on any noise insertion
  // NEW: also fires when session alt-to-run ratio >= 0.65 AND last 4 commons-only roll alternate
  // This way: EU high-flip sessions activate sooner; NA/Asia low-flip sessions stay unaffected
  let isAlternating = false;
  let alternatingPair = null;

  // Session-level common transition analysis (alt vs run)
  let sessionAltCount = 0; let sessionRunCount = 0;
  const commonsOnly = rolls.filter(r => commons.includes(r));
  for (let i = 0; i < commonsOnly.length - 1; i++) {
    if (commonsOnly[i] !== commonsOnly[i + 1]) sessionAltCount++;
    else sessionRunCount++;
  }
  const sessionAltRatio = (sessionAltCount + sessionRunCount) > 0
    ? sessionAltCount / (sessionAltCount + sessionRunCount) : 0;
  const highFlipSession = sessionAltRatio >= 0.65 && (sessionAltCount + sessionRunCount) >= 4;

  // Classic strict check: last 4 raw rolls ABAB with only 2 unique values
  if (rolls.length >= 4) {
    const last4 = rolls.slice(-4);
    const uniqueVals = [...new Set(last4)];
    if (uniqueVals.length === 2) {
      let alternates = true;
      for (let i = 0; i < 3; i++) { if (last4[i] === last4[i + 1]) alternates = false; }
      if (alternates) { isAlternating = true; alternatingPair = uniqueVals; }
    }
  }

  // Noise-tolerant check: for high-flip sessions, check last 4 COMMONS-ONLY rolls
  // This recovers alternating mode after a noise insertion breaks the raw window
  if (!isAlternating && highFlipSession && commonsOnly.length >= 4) {
    const last4c = commonsOnly.slice(-4);
    const uniqueC = [...new Set(last4c)];
    if (uniqueC.length === 2) {
      let altC = true;
      for (let i = 0; i < 3; i++) { if (last4c[i] === last4c[i + 1]) altC = false; }
      if (altC) { isAlternating = true; alternatingPair = uniqueC; }
    }
  }
  
  // Detect pattern shift via momentum (noise becoming hot)
  let patternShifted = false;
  let shiftedToValue = null;
  noise.forEach(n => {
    if (hotValues.includes(n)) {
      patternShifted = true;
      shiftedToValue = n;
    }
  });

  // =========================================================================
  // 🔥 ENHANCED PREDICTION LOGIC (Standard v3.7 Priority)
  // =========================================================================

  // 🆕 POST-NOISE RECOVERY: When last roll is noise AND we have learned recovery pattern
  // Fires BEFORE hot-run so we don't ride a noise value by mistake
  // POST-NOISE RECOVERY: When last roll is noise, find which common tends to follow
  // FIX: Uses pair matrix row for the SPECIFIC noise value (e.g. "after 41, 42 = 60%")
  // Falls back to session-level postNoiseCount only if pair data is sparse
  const isLastNoise = noise.includes(lastRoll);
  if (isLastNoise) {
    const pairRowForNoise = matrix[lastRoll];
    const pairSamplesNoise = pairRowForNoise
      ? VALUES.reduce((s, v) => s + (pairRowForNoise[v]?.samples || 0), 0)
      : 0;
    const topCommonFromNoisePair = pairRowForNoise
      ? commons
          .map(c => ({ value: c, pct: pairRowForNoise[c]?.pct || 0, samples: pairRowForNoise[c]?.samples || 0 }))
          .sort((a, b) => b.pct - a.pct)
      : [];
    const pairNoisePref = topCommonFromNoisePair[0]?.pct > 30 && pairSamplesNoise >= 2
      ? topCommonFromNoisePair[0].value : null;
    const pairNoiseAlt  = topCommonFromNoisePair[1]?.value || null;

    const postNoiseMain   = pairNoisePref || preferredPostNoiseCommon || commons[0];
    const postNoiseSecond = (pairNoiseAlt && pairNoiseAlt !== postNoiseMain ? pairNoiseAlt : null)
      || secondPostNoiseCommon || commons.find(c => c !== postNoiseMain);

    const noiseRecoveryTrustable = pairNoisePref !== null || postNoiseTrustable;
    if (noiseRecoveryTrustable && postNoiseMain) {
      prediction = postNoiseMain;
      alt = postNoiseSecond || freqSorted.find(f => commons.includes(f.value) && f.value !== postNoiseMain)?.value || freqAlt;
      method = 'post-noise-recovery';
      const preferRatio = pairNoisePref
        ? (topCommonFromNoisePair[0]?.samples || 1) / Math.max(1, pairSamplesNoise)
        : commonPostNoise[0].count / Math.max(1, commonPostNoise[0].count + (commonPostNoise[1]?.count || 0));
      confidence = Math.min(0.45 + preferRatio * 0.25, 0.70);
    }
  }

  // 🆕 HOT-RUN FAST-LOCK: When last 2+ rolls are the same common, predict it to continue
  // BEFORE any other logic — reduces the 3-roll detection lag seen in debug sessions
  // Only applies when: it's a common (not noise), run length >= 2, and distribution backs it
  const isLastCommon = commons.includes(lastRoll);
  const shortBurstSession = avgObservedRunLen <= 2.2;
  const shortBurstGuard   = shortBurstSession && currentRunLen === 2;
  const isHotRun = isLastCommon && currentRunLen >= 2 && momentumScores[lastRoll] >= 0.8;

  // Noise-run fast-lock: noise value running 3+ in a row AND owns ≥56% of last 8.
  // This is the "44 burst" pattern from Session D — wait no more than needed to flip.
  // Threshold is stricter than hot-run (56% vs 50%) to avoid firing on short noise blips.
  const recent8Dist = (() => {
    const r8 = rolls.slice(-8);
    const d = {}; VALUES.forEach(v => { d[v] = 0; });
    r8.forEach(v => { if (VALUES.includes(v)) d[v]++; });
    const n8 = Math.min(8, rolls.length);
    VALUES.forEach(v => { d[v] = n8 > 0 ? Math.round((d[v] / n8) * 100) : 0; });
    return d;
  })();
  const noiseRunDominant = !isLastCommon &&
    currentRunLen >= 3 &&
    (recent8Dist[lastRoll] || 0) >= 25;

  if (isHotRun && !isChaotic && !shortBurstGuard) {
    // Riding the run — predict the running value to continue
    prediction = lastRoll;
    // Alt is always the OTHER common (the next most likely when the run breaks)
    const otherCommonForRun = commons.find(c => c !== lastRoll) || freqSorted[1]?.value;
    alt = otherCommonForRun;
    method = 'hot-run';
    // 🆕 FIX: Use session-calibrated base confidence instead of fixed 0.50
    // Longer session average runs → higher confidence to keep riding
    confidence = Math.min(runContinueConfBase + (currentRunLen - 2) * 0.07, 0.70);
  } else if (isHotRun && shortBurstGuard) {
    // Short burst session: run of 2 is the typical break point - predict the other common
    prediction = commons.find(c => c !== lastRoll) || freqSorted[1]?.value;
    alt = lastRoll;
    method = 'hot-run-break';
    confidence = Math.min(runContinueConfBase, 0.55);
  } else if (noiseRunDominant && !isChaotic) {
    // Noise value has taken over the recent window — treat it like a hot run.
    // This is the "44 burst" fast-lock: don't wait for commons to rebase,
    // predict the dominant noise value immediately (reduces 2–3 roll detection lag).
    // IMPORTANT: preserve the pair-calibrated return common as alt (from post-noise-recovery).
    // Don't discard postNoiseMain — it's the most likely common to return when the run ends.
    const noiseRunBreakCommon = (prediction && commons.includes(prediction) ? prediction : null) ||
      (alt && commons.includes(alt) ? alt : null) ||
      commons.find(c => c !== lastRoll) ||
      freqSorted.find(f => commons.includes(f.value))?.value;
    prediction = lastRoll;
    alt = noiseRunBreakCommon;
    method = 'noise-run-dominant';
    confidence = Math.min(0.45 + (currentRunLen - 3) * 0.06, 0.65);
  }
  // 🆕 A: CHAOS MODE — Full-session pair matrix + commons-only prediction
  // In chaos, we use ALL session rolls (not just recent window) for the pair matrix
  // because more data = better transition estimates even when distribution is flat.
  // IMPORTANT: Both main AND alt must be commons. Noise goes to noiseWatch only.
  else if (isChaotic) {
    // Build full-session pair matrix (key change: uses all rolls not just recent)
    const fullMatrix = {};
    VALUES.forEach(v => { fullMatrix[v] = {}; VALUES.forEach(v2 => { fullMatrix[v][v2] = 0; }); });
    for (let i = 0; i < rolls.length - 1; i++) {
      const from = rolls[i]; const to = rolls[i + 1];
      if (VALUES.includes(from) && VALUES.includes(to)) fullMatrix[from][to]++;
    }
    // Convert counts to percentages
    VALUES.forEach(v => {
      const total = VALUES.reduce((s, v2) => s + fullMatrix[v][v2], 0);
      VALUES.forEach(v2 => {
        fullMatrix[v][v2] = total > 0 ? Math.round((fullMatrix[v][v2] / total) * 100) : 0;
      });
    });

    // From the full-session matrix, find the strongest transition from last roll
    const fullPairSorted = VALUES
      .map(v => ({ value: v, pct: fullMatrix[lastRoll]?.[v] || 0 }))
      .sort((a, b) => b.pct - a.pct);

    // Identify the strongest-suggested common (may be noise value — we handle below)
    const strongestValue = fullPairSorted[0]?.value;
    const noiseWatchCandidate = noise.includes(strongestValue) ? strongestValue : (
      fullPairSorted.find(x => noise.includes(x.value))?.value || null
    );

    // Main prediction: strongest COMMON using freq/pair blend (respects data sparsity)
    const topCommonByBlend = blendedCommons[0];
    if (topCommonByBlend && topCommonByBlend.blended > 0) {
      // Reorder commons by recent-4 momentum so chaos uses the freshest signal
      // (Full-session frequency lags behind momentum shifts — key Kimi finding)
      const chaosCommonsRanked = [...commons].sort((a, b) =>
        (momentumScores[b] || 0) - (momentumScores[a] || 0)
      );
      prediction = chaosCommonsRanked[0] || topCommonByBlend.value;
      alt = chaosCommonsRanked[1] || blendedCommons[1]?.value || commons.find(c => c !== prediction) || freqSorted.find(f => commons.includes(f.value) && f.value !== prediction)?.value || commons[1];
      method = pairSamplesForLastRoll < 3 ? 'chaos-freq' : 'chaos-pair';
      confidence = Math.min(topCommonByBlend.blended / 100 + 0.05, 0.52);
    } else {
      // Fallback: just use the 2 commons by full-session frequency
      prediction = commons[0] || freqSorted[0].value;
      alt = commons[1] || freqSorted[1]?.value;
      method = 'chaos-freq';
      confidence = 0.33;
    }
    // Store noise watch candidate separately (shown in UI as ⚡ Watch, not a pick)
    _chaosNoiseWatch = noiseWatchCandidate;
  }
  // Standard logic when NOT chaotic
  else if (isAlternating && alternatingPair) {
    // FIX: Use lastRoll to pick the OTHER common directly instead of sorting by momentum.
    // Momentum lags — it stays on the previously-running value and causes main/alt swap.
    // In a true alternating session, after roll X the next is always the other one.
    const isLastRollInPair = alternatingPair.includes(lastRoll);
    if (isLastRollInPair) {
      // Strict: last roll IS one of the alternating pair → predict the other
      prediction = alternatingPair.find(v => v !== lastRoll);
      alt = lastRoll; // alt: might run one more time
    } else {
      // Last roll is noise — fall back to momentum to pick which common returns
      const sortedPair = [...alternatingPair].sort((a, b) =>
        (momentumScores[b] || 0) - (momentumScores[a] || 0)
      );
      prediction = sortedPair[0];
      alt = sortedPair[1];
    }
    method = 'alternating';
    confidence = 0.75;
  }
  
  // Step 2: PATTERN SHIFT - When noise is becoming common
  // Keep it simple - predict the king, alt is the rising value
  else if (patternShifted && shiftedToValue) {
    const kingMomentum = momentumScores[commons[0]] || 0;
    const rebelMomentum = momentumScores[shiftedToValue] || 0;
    const isRebelHot = hotValues.slice(0, 2).includes(shiftedToValue);

    // Guard: 0.7x threshold
    if (rebelMomentum > kingMomentum * 0.7 || isRebelHot) {
      prediction = commons[0];
      alt = shiftedToValue;
      method = 'pattern-shift';
      confidence = 0.65;
    }
  }
  
  // Step 2b: OVERDUE WAVE - Individual wave cycle detection
  // 🔧 FIX: Only predict COMMONS for overdue-wave method. Noise-overdue is shown in Watch strip.
  // 🆕 REGIME GATE: overdue-wave only reliable in stable sessions
  // In transition/noise-burst the "most absent common" is a red herring
  else if (regime === 'stable' && mostOverdueCommon && lastSeen[mostOverdueCommon] >= OVERDUE_THRESHOLD) {
    const overdueMomentum = momentumScores[mostOverdueCommon] || 0;
    const isOnlyOverdue = overdueValues.includes(mostOverdueCommon) && 
      overdueValues.filter(v => commons.includes(v)).length <= 1;
    
    // 🔥 NEW: Check for DOMINANT value - skip overdue if one value is crushing it
    const lastRollRow = matrix[lastRoll] || {};
    const topPairValue = VALUES
      .map(v => ({ value: v, pct: lastRollRow[v]?.pct || 0, momentum: momentumScores[v] || 0 }))
      .sort((a, b) => b.pct - a.pct)[0];
    
    const isDominant = topPairValue && 
      topPairValue.pct >= 80 && // 80%+ pair probability
      topPairValue.momentum >= 1.5 && // Very hot
      commons.includes(topPairValue.value); // It's a common, not noise
    
    // Skip overdue entirely if there's a dominant value crushing the session
    if (isDominant) {
      // Let frequency/pair logic handle this - don't predict a dead overdue value
      // Fall through to next step
    }
    // 🔧 NEW: Check if commons are alternating hot - if so, skip overdue entirely
    else {
      const commonsAreBothHot = commons.length >= 2 && 
        hotValues.includes(commons[0]) && 
        hotValues.includes(commons[1]);
      const lastTwoAreCommons = rolls.length >= 2 && 
        commons.includes(rolls[rolls.length - 1]) && 
        commons.includes(rolls[rolls.length - 2]) &&
        rolls[rolls.length - 1] !== rolls[rolls.length - 2]; // And they alternated
      
      // Skip overdue if commons are hot and alternating
      if (commonsAreBothHot && lastTwoAreCommons) {
        // Let the commons alternating pattern handle this - don't override with dead noise
        // Fall through to next step
      }
      // 🆕 POST-RUN SUPPRESSION: If overdue candidate just had a hot run (3+) before going
      // absent, it exhausted itself — not genuinely overdue.
      // Scan backwards through recent rolls to find the run that ended before the absence.
      let lastRunLen = 0;
      let seenAbsence = false;
      for (let i = rolls.length - 1; i >= Math.max(0, rolls.length - 12); i--) {
        if (rolls[i] !== mostOverdueCommon) {
          seenAbsence = true; // gap/absence confirmed
        } else if (seenAbsence) {
          lastRunLen++; // counting the run just before the absence
        }
        // Stop once we've counted past the prior run
        if (seenAbsence && lastRunLen > 0 && rolls[i] !== mostOverdueCommon) break;
      }
      const justRanHot = lastRunLen >= 3; // ran 3+ just before going absent

      // Only predict overdue if: decent momentum OR only overdue option, AND not post-run exhaustion
      if (justRanHot) {
        // Ran hot then stopped — normal run completion, not a due situation. Fall through.
      } else if (overdueMomentum >= 0.20 || isOnlyOverdue) {
        prediction = mostOverdueCommon;
        // Alt is the next most overdue common, or the hottest value
        const secondOverdueCommon = commons
          .filter(v => v !== mostOverdueCommon && lastSeen[v] >= 0)
          .sort((a, b) => lastSeen[b] - lastSeen[a])[0];
        alt = secondOverdueCommon || hotValues.find(v => v !== prediction) || freqPrediction;
        method = 'overdue-wave';
        confidence = 0.60;
      } else {
        // Multiple overdue with low momentum - use pair matrix % as tiebreaker
        // Get pair matrix percentages for overdue values
        const lastRollMatrix2 = matrix[lastRoll] || {};
        const overdueWithPairPct = overdueValues
          .filter(v => commons.includes(v) && lastSeen[v] >= OVERDUE_THRESHOLD && (momentumScores[v] || 0) >= 0.20)
          .map(v => ({
            value: v,
            pct: lastRollMatrix2[v]?.pct || 0,
            momentum: momentumScores[v] || 0
          }))
          .sort((a, b) => b.pct - a.pct); // Sort by pair probability
        
        if (overdueWithPairPct.length > 0 && overdueWithPairPct[0].pct > 0) {
          // Pick the overdue value with highest pair probability
          prediction = overdueWithPairPct[0].value;
          alt = overdueWithPairPct[1]?.value || hotValues[0] || freqPrediction;
          method = 'overdue-wave+pair';
          confidence = 0.55; // Slightly lower since we're using tiebreaker
        }
      }
    }
  }
  
  // Step 3: WAVE-INVERSE - Overrides if prob > 45%
  if (!prediction && waveSignals.waveFlipProbability >= 45) {
    prediction = pairAlt || freqAlt;
    alt = pairPrediction || freqPrediction;
    method = 'wave-inverse';
    confidence = Math.min(waveSignals.waveFlipProbability + 10, 85) / 100;
  }
  
  // Step 4: RUN BREAK - If run of commons likely to break soon
  // 🆕 FIX: Now fires at ≥2 for commons. Predict the OTHER common, alt is the run value.
  if (!prediction && runBreakLikely) {
    const otherCommon = commons.find(c => c !== lastRoll);
    if (otherCommon) {
      const recent6Dist = getDistribution(rolls.slice(-6));
      const recent4 = rolls.slice(-4);
      const nonRunCandidates = VALUES.filter(v => v !== lastRoll);
      const breakCandidates = nonRunCandidates
        .map(value => ({
          value,
          score: scoreRunBreakCandidate({
            candidate: value,
            lastRoll,
            matrix,
            trends,
            distribution,
            momentumScores,
            recent6Dist,
            recent4,
            lastSeen,
            avgObservedRunLen,
            avgNoiseGap,
          }),
        }))
        .sort((a, b) => b.score - a.score);

      const bestBreak = breakCandidates[0]?.value || otherCommon;
      const secondBreak = breakCandidates.find(entry => entry.value !== bestBreak)?.value || lastRoll;

      prediction = bestBreak;
      alt = secondBreak;
      method = 'run-break';
      // Higher confidence for longer runs (more likely to break)
      confidence = currentRunLen >= 4 ? 0.70 : currentRunLen >= 3 ? 0.62 : 0.55;
    }
  }
  
  // Step 5: 2-GRAM (More context)
  if (!prediction && has2gramData && gram2Confidence >= 40) {
    prediction = gram2Prediction;
    alt = gram2Alt;
    method = '2-gram';
    confidence = gram2Confidence / 100;
  }
  
  // Step 6: NOISE DOUBLE-TAP - If noise tends to pair, predict repeat!
  if (!prediction && noiseDoubleTapLikely && doubleTapValue) {
    prediction = doubleTapValue;
    alt = hotValues[0] || commons[0];
    method = 'double-tap';
    confidence = 0.68;
  }
  
  // Step 7: NOISE-SNAPBACK - Single spike noise, expect return to common
  if (!prediction && waveSignals.noiseAppearanceCount >= 2 && noise.includes(lastRoll) && currentRunLen === 1) {
    prediction = hotValues[0] || commons[0] || freqPrediction;
    alt = hotValues[1] || commons[1] || freqAlt;
    method = 'noise-snapback';
    confidence = 0.65;
  }
  
  // Step 8: NOISE RISING - A noise value is becoming a common
  if (!prediction && noiseRising && noiseRising.length > 0) {
    prediction = noiseRising[0];
    alt = hotValues[0] || commons[0];
    method = 'noise-rising';
    confidence = 0.60;
  }
  
  // Step 9: Use freq/pair BLEND (sample-count-gated) — replaces raw 1-gram pair
  if (!prediction && blendedPairPrediction && blendedPairConfidence > 0) {
    prediction = blendedPairPrediction;
    alt = blendedPairAlt || freqAlt;
    confidence = blendedPairConfidence / 100;
    method = pairSamplesForLastRoll < 3 ? 'freq-blend' : pairSamplesForLastRoll < 6 ? 'freq+pair-blend' : 'pair-matrix';
  }
  
  // Step 9b: WIDE-CANDIDATE MODE (transition / noise-burst only)
  // ═══════════════════════════════════════════════════════════════
  // Problem (Codex): in mixed sessions the predictor over-commits to
  // its current 2-common narrative. When the real answer is the
  // 3rd-most-active value, it gets excluded from candidates entirely.
  //
  // Fix: in transition or noise-burst, open the candidate pool to
  // top-3 momentum values — not just the 2 session commons.
  // We use pair-transition pct as the ranking signal within that pool.
  //
  // Conditions to fire:
  //   - regime is not 'stable' (transition or noise-burst)
  //   - no prediction set yet by earlier steps
  //   - at least 8 rolls of history (enough for momentum to mean something)
  // ═══════════════════════════════════════════════════════════════
  if (!prediction && regime !== 'stable' && rolls.length >= 8) {
    // Pool = top-3 by recent momentum (arrowWeight-adjusted, already computed)
    const widePool = sortedByMomentum.slice(0, 3).map(x => x.value);

    // Score each pool member by pair transition pct from lastRoll
    const wideScores = widePool.map(v => {
      const pairPct   = matrix[lastRoll]?.[v]?.pct || 0;
      const trust     = trends[v]?.trustScore ?? 0.6;
      const score     = (pairPct > 0 ? pairPct : (distribution[v] || 0) * 0.5) * trust;
      return { value: v, score };
    }).sort((a, b) => b.score - a.score);

    if (wideScores.length >= 2) {
      prediction = wideScores[0].value;
      alt        = wideScores[1].value;
      method     = 'wide-candidate';
      confidence = Math.min(0.35 + (wideScores[0].score / 100) * 0.2, 0.55);
    }
  }

  // Step 10: FREQUENCY FALLBACK - Use distribution
  if (!prediction) {
    prediction = freqPrediction;
    alt = freqAlt;
    // 🔧 FIX: Ensure minimum confidence of 30% for frequency predictions
    confidence = Math.max((distribution[prediction] || 30) / 100, 0.30);
    method = 'frequency';
  }
  
  // Final safety: ensure both prediction and alt are valid and DIFFERENT
  if (!prediction) prediction = freqPrediction;
  if (!alt) alt = freqAlt;
  
  // RNG BREAKER: Strict unique check
  if (prediction === alt) {
    // If prediction is the top frequency, take the second. Otherwise take the first.
    alt = (prediction === freqSorted[0].value) 
      ? (freqSorted[1]?.value || VALUES.find(v => v !== prediction))
      : freqSorted[0].value;
  }

  // =========================================================================
  // 🔥 BEAST MODE: SMART RUN FINAL CHECK
  // If prediction has run penalty (run of 3+), consider swap
  // =========================================================================
  const predRunScore = smartRunScores[prediction] || 1;
  const altRunScore = smartRunScores[alt] || 1;
  
  if (!isUncertain && predRunScore < 0.5 && altRunScore > predRunScore) {
    // Prediction is on a long run - break it!
    const temp = prediction;
    prediction = alt;
    alt = temp;
    method = method + '+run-break';
    confidence = Math.min(confidence, 0.60);
  }
  // Also boost confidence if we expect a pair (wasChange = just switched)
  else if (wasChange && prediction === lastRoll && predRunScore >= 1.2) {
    // Expecting a run of 2 - boost confidence slightly
    confidence = Math.min(confidence * 1.1, 0.80);
    method = method + '+pair-expect';
  }
  // =========================================================================
  // 🔥 MOMENTUM TIE-BREAKER (Strategy 4)
  // When uncertain (gap < 10%), use momentum score to pick the winner
  // 🔧 FIX: Skip swap for pattern-shift (analysis showed it's 80% accurate)
  // =========================================================================
  let usedTieBreaker = false;
  const isPatternShift = method.includes('pattern-shift');
  
  if (isUncertain && prediction && alt && !isPatternShift) {
    const predMomentum = momentumScores[prediction] || 0;
    const altMomentum = momentumScores[alt] || 0;
    
    // If alt has significantly higher momentum, SWAP!
    if (altMomentum > predMomentum + 0.2) {
      const temp = prediction;
      prediction = alt;
      alt = temp;
      method = method + '+momentum-tie';
      usedTieBreaker = true;
      // Slight confidence boost since we made an informed decision
      confidence = Math.min(confidence + 0.05, 0.55);
    }
    // If prediction has higher momentum, keep it but boost confidence
    else if (predMomentum > altMomentum + 0.2) {
      method = method + '+momentum-confirm';
      usedTieBreaker = true;
      confidence = Math.min(confidence + 0.05, 0.55);
    }
  }

  // =========================================================================
  // 🔥 UNCERTAINTY HANDLING (from Gemini suggestion)
  // If distribution is too flat, mark as uncertain and reduce confidence
  // =========================================================================
  let isUncertainResult = isUncertain;
  const topFreq = distribution[prediction] || 0;
  
  // RNG BREAKER: Dynamic Confidence scaling
  // If we have a clear leader, trust it more.
  if (confidenceGap > 30) confidence *= 1.1;
  else if (confidenceGap < 15) confidence *= 0.8;
  
  // RNG BREAKER: Lightweight Meta-Tie-Breaker for close calls
  // 🔧 FIX: Skip for pattern-shift (protected from swaps)
  if (isUncertain && !usedTieBreaker && prediction && alt && confidenceGap < 5 && !isPatternShift) {
    const lastParity = getParity(lastRoll);
    const predParity = getParity(prediction);
    const altParity = getParity(alt);
    
    // If prediction matches last parity (expecting run) or alternates (expecting flip)
    // Here we favor the one that matches the property of the recent "hottest" value
    if (predParity !== altParity) {
      if (predParity === lastParity) { 
        confidence += 0.05; 
        method += '+meta-confirm';
      } else {
        // Simple swap if alt looks better for the property pattern
        const temp = prediction;
        prediction = alt;
        alt = temp;
        method += '+meta-swap';
        confidence += 0.05;
      }
    }
  }

  if (isUncertain && method.includes('voting-weak')) {
    confidence = Math.min(confidence, 0.40);
    method = method + ' (uncertain)';
    isUncertainResult = true;
  }

  // =========================================================================
  // 🆕 Step 7: FINAL RANKER
  // After all prediction logic has run, do one final re-ranking of (prediction, alt)
  // using: pair transition probability × arrow trustScore × regime multiplier.
  // If the ranker swaps the pick, it only does so when the gap is significant (>12 pts)
  // to avoid noise-driven flips on weak signals.
  //
  // Regime multipliers:
  //   stable      = 1.0 (trust pair transitions fully)
  //   transition  = 0.8 (slightly discounted — things are changing)
  //   noise-burst = 0.5 (pair signal is polluted — rely more on commons baseline)
  // =========================================================================
  const regimeMult = regime === 'stable' ? 1.0 : regime === 'transition' ? 0.8 : 0.5;

  // Only re-rank commons candidates (never noise). Score = pair pct × trustScore × regimeMult
  const rankableCandidates = [prediction, alt]
    .filter(v => v && commons.includes(v))
    .map(v => {
      const pairPct   = matrix[lastRoll]?.[v]?.pct || 0;
      const trust     = trends[v]?.trustScore ?? 0.6;
      const freqScore = distribution[v] || 0;
      // Pair pct is primary; freq is used as a tie-break when pairPct is low
      const score = (pairPct > 0 ? pairPct : freqScore * 0.4) * trust * regimeMult;
      return { value: v, score };
    })
    .sort((a, b) => b.score - a.score);

  if (rankableCandidates.length >= 2) {
    const winner = rankableCandidates[0];
    const runner = rankableCandidates[1];
    const scoreGap = winner.score - runner.score;
    // Only swap if current prediction disagrees AND gap is meaningful
    if (winner.value !== prediction && scoreGap > 12) {
      alt = prediction; // demote current prediction to alt
      prediction = winner.value;
      method = method + '+ranker';
    }
  }

  // =========================================================================
  // 🆕 RISING VALUE PROMOTION (Codex fix: post-decision alt injection)
  // Problem: patternShifted / commonsFlipDetected are detected but only affect
  // the pick when THEY are the decision method. All other methods (run-break,
  // overdue-wave, hot-run…) pull alt from old commons and completely ignore
  // the shift signal.
  //
  // Fix: after any method sets prediction+alt, if a rising value is confirmed,
  // promote it into alt immediately — unless prediction is already the rising value.
  //
  // Guard conditions:
  //   1. A rising value must be identified (patternShifted OR commonsFlipDetected)
  //   2. Rising value must not already be the prediction
  //   3. Rising value must have real recent momentum (not just noise artifact)
  //   4. Only applies when we're NOT already in the pattern-shift method
  //      (that branch already handles alt correctly)
  // =========================================================================
  const risingValue = shiftedToValue || (commonsFlipDetected && newCommons?.find(v => noise.includes(v))) || null;
  const risingMomentum = risingValue ? (momentumScores[risingValue] || 0) : 0;

  // Path A: explicit rising signal (patternShifted / commonsFlip)
  if (
    risingValue &&
    risingValue !== prediction &&
    risingValue !== alt &&
    risingMomentum > 0.05 &&
    !method.startsWith('pattern-shift') &&
    !method.startsWith('chaos')
  ) {
    alt = risingValue;
    method = method + '+rising-promoted';
  }
  // Path B: regime-aware 3rd-value injection (Codex: break 2-commons lock in noisy sessions)
  // When session is in transition/noise-burst, check if top-3 momentum has a value that's
  // excluded from both prediction and alt — and inject it if it has real recent presence.
  // Only fires when Path A didn't already promote something, and not in chaos/pattern-shift.
  else if (
    regime !== 'stable' &&
    !method.startsWith('pattern-shift') &&
    !method.startsWith('chaos') &&
    !method.startsWith('wide-candidate')  // wide-candidate already opened the pool
  ) {
    // Top-3 momentum values (already computed by sortedByMomentum)
    const thirdCandidate = sortedByMomentum
      .slice(0, 3)
      .map(x => x.value)
      .find(v => v !== prediction && v !== alt && (momentumScores[v] || 0) > 0.08);

    if (thirdCandidate) {
      alt = thirdCandidate;
      method = method + '+wide-alt';
    }
  }

  // Alternating can look too clean in mixed windows. If outsider pressure is live,
  // keep the pair but downgrade confidence and surface the outsider in alt sooner.
  const alternatingOverheat =
    method.startsWith('alternating') &&
    (
      pairOutlook.pairSafety !== 'safe' ||
      pairOutlook.noiseRisk >= 28 ||
      (pairOutlook.freshOutsider?.recent4Hits || 0) >= 1 ||
      pairOutlook.freshOutsider?.direction === 'rising'
    );
  if (alternatingOverheat) {
    confidence = Math.min(confidence, 0.58);
    if (
      pairOutlook.freshOutsider?.value &&
      pairOutlook.freshOutsider.value !== prediction &&
      pairOutlook.freshOutsider.value !== alt
    ) {
      alt = pairOutlook.freshOutsider.value;
      method = method + '+pressure-alt';
    } else {
      method = method + '+pressure';
    }
  }

  let displayPairSafety = pairOutlook.pairSafety;
  let displayNoiseRisk = pairOutlook.noiseRisk;

  if (method.startsWith('run-break')) {
    if (displayPairSafety === 'safe') displayPairSafety = 'caution';
    displayNoiseRisk = Math.max(
      displayNoiseRisk,
      getBreakRiskPercent(currentRunLen, avgObservedRunLen, regime, pairOutlook.freshOutsider)
    );
    if (
      currentRunLen >= 3 &&
      pairOutlook.freshOutsider?.value &&
      pairOutlook.freshOutsider.value !== prediction &&
      pairOutlook.freshOutsider.value !== alt &&
      (
        pairOutlook.freshOutsider.recent2Hits >= 1 ||
        pairOutlook.freshOutsider.recent4Hits >= 1 ||
        pairOutlook.freshOutsider.direction === 'rising'
      )
    ) {
      alt = pairOutlook.freshOutsider.value;
      method = method + '+break-watch';
    }
  }

  if (method.startsWith('alternating') && regime !== 'stable') {
    if (displayPairSafety === 'safe') displayPairSafety = 'caution';
    displayNoiseRisk = Math.max(displayNoiseRisk, 28);
    confidence = Math.min(confidence, 0.58);
  }

  // 🔧 FINAL SAFETY: Ensure confidence is never 0%
  confidence = Math.max(confidence, 0.25);
  if (displayPairSafety === 'danger') {
    confidence = Math.min(confidence, 0.48);
  } else if (displayPairSafety === 'safe' && displayNoiseRisk <= 30) {
    confidence = Math.min(confidence + 0.04, 0.82);
  }

  // =========================================================================
  // 🆕 TOPIC 2+3: LABEL, REASON LINE, NOISE WATCH
  // Compute the user-friendly label badge and one-line reason.
  // Both main and alt are always commons. Noise only appears in noiseWatch.
  // =========================================================================

  // Commons guardian: last safety net — if somehow prediction is noise, swap to top common
  // Exception: wide-candidate can intentionally set prediction to a noise/non-common value
  const predIsWideCandidate = method.startsWith('wide-candidate');
  if (!predIsWideCandidate && noise.includes(prediction)) {
    prediction = commons[0] || freqSorted.find(f => commons.includes(f.value))?.value || prediction;
  }
  // Guard for alt: skip eviction if alt is deliberately promoted (rising-promoted or wide-alt)
  const altIsPromoted = (risingValue && alt === risingValue) || method.includes('+wide-alt');
  if (!altIsPromoted && (noise.includes(alt) || alt === prediction)) {
    alt = commons.find(c => c !== prediction) || freqSorted.find(f => commons.includes(f.value) && f.value !== prediction)?.value || alt;
  }

  // Noise watch: is a noise value likely to appear soon? (for ⚡ Watch indicator)
  const shouldWatchFreshOutsider = pairOutlook.freshOutsider?.value &&
    !commons.includes(pairOutlook.freshOutsider.value) &&
    (
      pairOutlook.freshOutsider.recent2Hits >= 1 ||
      pairOutlook.freshOutsider.recent4Hits >= 1 ||
      pairOutlook.freshOutsider.direction === 'rising'
    );
  const noiseWatchValue = shouldWatchFreshOutsider
    ? pairOutlook.freshOutsider.value
    : _chaosNoiseWatch ||
      (waveSignals?.isWaveWarning && noise[0]) ||
      (noiseRising.length > 0 ? noiseRising[0] : null);

  // Overdue noise: noise values that have been absent unusually long
  // Threshold: avgNoiseGap * 2.5 rolls (if known), else 7 rolls as fallback
  // This catches 'silent noise comeback' — a noise value that hasn't appeared for many rolls
  // Threshold: avgNoiseGap * 1.8 rolls (if known), else 5 rolls as fallback
  // Lowered multiplier from 2.5x to 1.8x to catch noise snaps sooner (e.g. at 5 rolls for 2.5-avg gap)
  const noiseOverdueThreshold = avgNoiseGap !== null
    ? Math.max(Math.round(avgNoiseGap * 1.8), 4)
    : 5;
  const noiseScoreForSort = (v) => {
    const absent     = lastSeen[v] >= 0 ? lastSeen[v] : 0;
    const maxAbs     = Math.max(...noise.map(n => lastSeen[n] >= 0 ? lastSeen[n] : 0), 1);
    // SHORTER absence = HIGHER score: noise still active in the rotation
    // Very long absence may mean the server has deprioritized that value
    const freshnessScore = (1 - absent / (maxAbs + 1)) * 70;  // 70% — freshness primary
    const pairWeight     = ((matrix[lastRoll]?.[v]?.pct || 0) / 100) * 30; // 30% — pair link tiebreaker
    return freshnessScore + pairWeight;
  };
  const overdueNoise = noise.filter(v =>
    lastSeen[v] !== -1 &&          // has appeared at least once this session
    lastSeen[v] >= noiseOverdueThreshold   // absent long enough
  ).sort((a, b) => noiseScoreForSort(b) - noiseScoreForSort(a)); // highest likelihood first

  // =========================================================================
  // 🆕 REFINED NOISE TRAP DETECTION (Consensus + Composite Scoring)
  // Session-stage aware • Pair-chain vetoed • Does NOT pollute Alt box
  // =========================================================================
  // How many distinct noise events have occurred this session?
  const totalNoiseEvents = noiseGapLengths.length; // each gap = one noise event boundary
  
  // Session-stage threshold — only fire when we have enough calibration data
  const trapThreshold = totalNoiseEvents < 2 ? Infinity  // Early: don't fire
    : totalNoiseEvents >= 5 ? 65                         // Late: well-calibrated, more sensitive
    : 75;                                                // Mid: standard threshold
  
  const maxAbsent = Math.max(...noise.map(v => lastSeen[v] >= 0 ? lastSeen[v] : 0), 1);
  
  // Red Zone: are we PAST the session's avg noise gap? (+0.5 buffer to avoid firing at exactly avg)
  // Also veto if main predictor is very confident on a common (>=75%) - trust the pair matrix
  const inRedZone = avgNoiseGap !== null 
    && commonsSinceNoise > avgNoiseGap + 0.5   // need to exceed avg, not just match it
    && confidence < 0.75;                       // don't fire if pair matrix is very confident
  
  // Rank noise candidates by composite score, with pair-chain veto
  const noiseCandidates = noise
    .filter(v => lastSeen[v] !== -1) // must have appeared at least once
    .map(v => {
      const overdueScore = lastSeen[v] >= 0 ? (lastSeen[v] / maxAbsent) * 50 : 0;
      const pairLinkPct  = matrix[lastRoll]?.[v]?.pct || 0;
      const pairScore    = (pairLinkPct / 100) * 30;
      const zoneBonus    = inRedZone ? 20 : 0;
      const pairVetoed   = pairLinkPct < 10 && totalNoiseEvents < 5; // veto low-evidence links early session
      return { value: v, score: overdueScore + pairScore + zoneBonus, pairLinkPct, pairVetoed };
    })
    .filter(c => !c.pairVetoed)         // remove vetoed candidates
    .sort((a, b) => b.score - a.score); // highest score first
  
  const bestNoiseTrapCandidate = noiseCandidates[0];
  const noiseTrapProb  = bestNoiseTrapCandidate?.score ?? 0;
  const trapCandidate  = bestNoiseTrapCandidate?.value ?? null;
  const isNoiseTrap    = noiseTrapProb >= trapThreshold && !!trapCandidate && inRedZone;

  // =========================================================================
  // 🆕 NOISE TRAP INJECTION: When the trap fires with strong pair-link evidence,
  // actually use it in prediction instead of just displaying it in the UI strip.
  // This addresses the core finding that noise was predicted before it appeared
  // in only 1 of ~20 cases — the system knew but never acted.
  // =========================================================================
  if (
    isNoiseTrap &&
    trapCandidate &&
    bestNoiseTrapCandidate?.pairLinkPct >= 20 &&
    trapCandidate !== prediction &&
    trapCandidate !== alt
  ) {
    // If board is degraded and trap has strong link, promote to main via handoff
    if (
      displayPairSafety !== 'safe' &&
      bestNoiseTrapCandidate?.pairLinkPct >= 35 &&
      confidence < 0.65
    ) {
      alt = prediction;
      prediction = trapCandidate;
      method = method + '+noise-trap-main';
      confidence = Math.min(confidence + 0.08, 0.60);
    }
    // Otherwise inject into alt (replaces stale alt or noise-watch)
    else if (
      !alt ||
      noise.includes(alt) ||
      displayPairSafety !== 'safe'
    ) {
      alt = trapCandidate;
      method = method + '+noise-trap-alt';
    }
  }

  const analyzer = scoreSvarogAnalyzerPicks({
    rolls,
    lastRoll,
    last2Rolls,
    matrix,
    matrix2gram,
    trends,
    momentumScores,
    commons,
    noise,
    noiseRising,
    distribution,
    shiftedToValue,
    patternShifted,
    alternatingPair,
    isAlternating,
    currentRunLen,
    freshOutsider: pairOutlook.freshOutsider,
    lastSeen,
    avgObservedRunLen,
    avgNoiseGap,
    commonsSinceNoise,
    regime,
  });

  const mainTrend = trends?.[prediction] || {};
  const mainIsFreshRising = mainTrend.direction === 'rising' && (mainTrend.arrowWeight ?? 0) >= 0.75;
  const minimumDegradedRollsMet = rolls.length >= 8;
  const minimumPairAgeMet = (pairOutlook.pairAge || 0) >= 3;
  const allowDegradedLogic = minimumDegradedRollsMet && minimumPairAgeMet;
  const staleCommonsWeak =
    pairOutlook.staleTrustedCount >= 2 ||
    (pairOutlook.staleTrustedCount >= 1 && pairOutlook.fallingTrustedCount >= 1);
  const noisyBoard =
    (displayNoiseRisk ?? 0) > 40 ||
    pairOutlook.mixedWindow;
  const weakLaneShare = (pairOutlook.top2Share ?? 100) < 65;
  const strongBreakLead = (pairOutlook.freshOutsiderLead ?? 0) > 15;
  const degradedSignals = [
    staleCommonsWeak,
    displayPairSafety !== 'safe',
    noisyBoard,
    weakLaneShare,
    strongBreakLead,
  ].filter(Boolean).length;
  const isDegradedBoard = allowDegradedLogic && degradedSignals >= 3;
  const isDeepDegradedBoard = allowDegradedLogic && degradedSignals >= 4;

  // Mixed and transition boards can get stuck on stale lane memory.
  // Let the analyzer take over only when it clearly beats the current main read.
  const analyzerTop = analyzer.scores?.[0] || null;
  const analyzerRunner = analyzer.scores?.find(entry => entry.value !== analyzerTop?.value) || null;
  const analyzerTopGap = analyzerTop && analyzerRunner ? analyzerTop.score - analyzerRunner.score : 0;
  const analyzerCurrentMain = analyzer.scores?.find(entry => entry.value === prediction) || null;
  const analyzerBeatsMainBy = analyzerTop && analyzerCurrentMain ? analyzerTop.score - analyzerCurrentMain.score : 0;
  const analyzerTrendSupport = trends?.[analyzerTop?.value]?.supportScore ?? 0;
  const analyzerLeadThreshold = Math.max(
    12,
    Math.round(Math.abs(analyzerCurrentMain?.score || analyzerTop?.score || 0) * 0.18)
  );
  const analyzerTopIsTrusted = !!analyzerTop?.value && pairOutlook.trustedPair?.includes(analyzerTop.value);
  const analyzerTopIsOutsider = analyzerTop?.value && pairOutlook.freshOutsider?.value === analyzerTop.value;
  const outsiderStrongEnoughForMain = analyzerTopIsOutsider && (
    isDeepDegradedBoard &&
    !mainIsFreshRising &&
    (
      (pairOutlook.freshOutsider?.recent2Hits || 0) >= 2 ||
    (
      (pairOutlook.freshOutsider?.recent4Hits || 0) >= 2 &&
      pairOutlook.freshOutsider?.direction === 'rising' &&
      displayNoiseRisk >= 62
    )
    )
  );
  const analyzerCanOverrideMain =
    analyzerTop &&
    analyzerTop.value !== prediction &&
    !method.startsWith('pattern-shift') &&
    !method.startsWith('post-noise-recovery') &&
    isDegradedBoard &&
    !mainIsFreshRising &&
    analyzerTopGap >= 6 &&
    analyzerTrendSupport >= 42 &&
    analyzerBeatsMainBy >= (analyzerTopIsOutsider ? Math.max(16, analyzerLeadThreshold + 2) : analyzerLeadThreshold) &&
    (analyzerTopIsTrusted || outsiderStrongEnoughForMain);

  if (analyzerCanOverrideMain) {
    const previousPrediction = prediction;
    prediction = analyzerTop.value;
    alt =
      [previousPrediction, analyzer.alt, alt, freqAlt, ...commons]
        .find(value => value && value !== prediction) || previousPrediction;
    method = method + '+analyzer-handoff';
    confidence = Math.min(
      Math.max(confidence, analyzerTopIsOutsider ? 0.4 : 0.46) + (analyzerTopGap >= 12 ? 0.05 : 0.03),
      0.64
    );
  } else if (
    analyzerTop &&
    analyzerTop.value !== prediction &&
    analyzerTop.value !== alt &&
    isDegradedBoard &&
    (
      analyzerTopIsTrusted ||
      (
        analyzerTopIsOutsider &&
        !mainIsFreshRising &&
        (
          (pairOutlook.freshOutsider?.recent2Hits || 0) >= 1 ||
          (
            (pairOutlook.freshOutsider?.recent4Hits || 0) >= 2 &&
            pairOutlook.freshOutsider?.direction === 'rising'
          )
        )
      )
    )
  ) {
    alt = analyzerTop.value;
    method = method + '+analyzer-alt';
  }

  let svarogPrediction = analyzer.prediction;
  let svarogAlt = analyzer.alt;

  // Narrow Svarog realignment: when the board is in pair/probe mode, no hard break-lead is
  // active, and the analyzer's top weighted pick (finalScores[0]) is a strong noise value
  // that Svarog somehow excluded from its top-2 — reinsert it as the main pick.
  // This corrects drift where Svarog sticks to a stale commons pair despite the decider
  // ranking a clear noise signal at the top.
  {
    const finalTopDecider = analyzer.finalScores?.[0] ?? null;
    const analyzerModeIsPairOrProbe =
      !analyzer.mode || analyzer.mode === 'pair' || analyzer.mode === 'probe';
    const svarogMissedFinalTop =
      finalTopDecider != null &&
      finalTopDecider.value !== svarogPrediction &&
      finalTopDecider.value !== svarogAlt &&
      noise.includes(finalTopDecider.value) &&
      (finalTopDecider.pickScore ?? 0) >= 35;

    if (analyzerModeIsPairOrProbe && !strongBreakLead && svarogMissedFinalTop) {
      svarogAlt = svarogPrediction;
      svarogPrediction = finalTopDecider.value;
    }
  }

  // CHAOS OVERRIDE: When board is clearly chaotic (danger + high noise risk), the Svarog
  // Analyzer consistently outperforms the pair predictor (75% vs 25% top-2 observed on
  // sessions with commons lag / stale pair). Net gain: +11 top-2 hits across 63 entries.
  const isChaosOverride =
    displayPairSafety === 'danger' &&
    (displayNoiseRisk ?? 0) > 60 &&
    svarogPrediction != null;
  if (isChaosOverride) {
    prediction = svarogPrediction;
    alt = svarogAlt || alt;
    method = method + '+chaos-analyzer';
  }

  // =========================================================================
  // 🚨 PREEMPTIVE NOISE ALT: Overdue noise injection
  // When a noise value is session-calibrated-overdue (overdueNoise[0]) AND
  // displayNoiseRisk > 60 AND the main prediction's trend is falling,
  // inject the overdue noise value into alt. This addresses the "only 1 preemptive
  // noise prediction across all sessions" finding in the Kimi analysis.
  // =========================================================================
  const preemptiveNoiseCand = overdueNoise[0] ?? null;
  const mainTrendFalling = prediction && trends?.[prediction]?.direction === 'falling';
  const altTrendFalling  = alt && (trends?.[alt]?.direction === 'falling' || !commons.includes(alt));
  // Require noise value to be significantly overdue (1.5x session threshold), not just at it
  const noiseSignificantlyOverdue = preemptiveNoiseCand != null &&
    lastSeen[preemptiveNoiseCand] >= Math.round(noiseOverdueThreshold * 1.5);

  const shouldInjectNoiseAlt = (
    preemptiveNoiseCand != null &&
    noiseSignificantlyOverdue &&
    preemptiveNoiseCand !== prediction &&
    preemptiveNoiseCand !== alt &&
    displayNoiseRisk > 68 &&
    mainTrendFalling &&
    altTrendFalling &&
    !isChaosOverride &&
    !method.startsWith('post-noise-recovery')
  );

  if (shouldInjectNoiseAlt) {
    alt = preemptiveNoiseCand;
    method = method + '+noise-alt';
  }

  // =========================================================================
  // 🔗 SVAROG ALT SYNC: Adopt svarog's best new value as main's alt
  // The Svarog analyzer consistently picks a better alt in degraded/caution boards.
  // Main's alt often sticks to the stale other-common while svarog correctly
  // picks a rising noise value (e.g., main: 41/43, svarog: 41/42, actual: 42).
  //
  // Priority: svarogAlt first (if it's a new value not already covered).
  // Fallback: svarogPrediction when svarogAlt is already in main's picks —
  //   this covers the flipped case: main: 41/43, svarog: 42/41, actual: 42
  //   where svarogAlt(41)=main.prediction but svarogPrediction(42) is uncovered.
  // =========================================================================
  const svarogAltIsNew = svarogAlt &&
    svarogAlt !== prediction &&
    svarogAlt !== alt;
  const svarogPredictionIsNew = svarogPrediction &&
    svarogPrediction !== prediction &&
    svarogPrediction !== alt;
  const boardNeedsAltHelp = displayPairSafety !== 'safe' && !isChaosOverride;

  if (boardNeedsAltHelp) {
    if (svarogAltIsNew) {
      alt = svarogAlt;
      method = method + '+svarog-alt-sync';
    } else if (svarogPredictionIsNew) {
      // svarogAlt was already covered; try svarog's main pick as our alt
      alt = svarogPrediction;
      method = method + '+svarog-pred-sync';
    }
  }

  // Label badge and reason line lookup
  const baseMethod = method.replace(/\+.*/, '');
  const currentRun = waveSignals?.lastCommonRunLength || currentRunLen || 0;
  const altCommon = alt || commons.find(c => c !== prediction);
  const pairPct = Math.round((matrix[lastRoll]?.[prediction]?.pct || 0));
  const overdueRolls = method.includes('overdue-wave') && lastSeen[prediction] >= 0
    ? lastSeen[prediction]
    : -1;
  const postNoiseCount2 = commonPostNoise[0]?.count || 0;

  const labelMap = {
    'hot-run':             { label: 'Running', reason: prediction + ' x ' + currentRun + ' streak - riding it' },
    'hot-run+run-break':   { label: 'Running', reason: lastRoll + ' x ' + currentRun + ' - break expected, predict ' + prediction },
    'noise-run-dominant':  { label: 'Noise Burst', reason: lastRoll + ' x ' + currentRun + ' consecutive - dominant noise burst' },
    'alternating':         { label: 'Alternating', reason: (alternatingPair?.[0] || '?') + ' / ' + (alternatingPair?.[1] || '?') + ' ping-pong - next: ' + prediction },
    'pattern-shift':       { label: 'Shifted', reason: (() => {
      const sv = shiftedToValue || prediction;
      const svCount = rolls.filter(r => r === sv).length;
      const svPct = distribution[sv] || 0;
      if (svCount <= 3 || svPct < 30) return sv + ' emerging - watch it';
      return 'New signal: ' + sv + ' taking over';
    })() },
    '2-gram':              { label: 'Sequence', reason: prediction + ' follows ' + last2Rolls + ' pattern' + (gram2Confidence > 0 ? ' (' + Math.round(gram2Confidence) + '%)' : '') },
    'pair-matrix':         { label: 'Pair', reason: prediction + ' most likely after ' + lastRoll + (pairPct > 0 ? ' (' + pairPct + '%)' : '') },
    'overdue-wave':        { label: 'Overdue', reason: prediction + ' not seen in ' + overdueRolls + ' rolls - due' },
    'overdue-wave+pair':   { label: 'Overdue', reason: prediction + ' overdue + pair edge - due' },
    'post-noise-recovery': { label: 'Recovery', reason: 'After noise, ' + prediction + ' returns (' + postNoiseCount2 + 'x)' },
    'noise-trap':          { label: 'Trap Due', reason: 'Target ' + altCommon + ' - noise gap exhausted (' + commonsSinceNoise + ' rolls)' },
    'chaos-pair':          { label: 'Chaotic', reason: 'Edge: ' + lastRoll + '->' + prediction + ' strongest link' },
    'chaos-freq':          { label: 'Chaotic', reason: 'No clear pattern - most frequent' },
    'insufficient-data':   { label: 'Warming Up', reason: 'Need more rolls - building picture' },
  };
  const labelEntry = labelMap[method] || labelMap[baseMethod] || { label: 'Pair', reason: prediction + ' most likely after ' + lastRoll };

  const sessionBackbonePair =
    pairOutlook.trustedPair?.length === 2 ? [...pairOutlook.trustedPair] : [...commons];
  const sessionExactPair = [svarogPrediction, svarogAlt]
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .slice(0, 2);
  const sessionBreakFallback = (analyzer.noiseDecisionScores || [])
    .map((entry) => entry?.value)
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .slice(0, 2);
  const sessionStateKey =
    analyzer.sessionStateKey ||
    (analyzer.noiseTriggerConfirmed && !analyzer.commonDominantBoard
      ? 'break'
      : analyzer.noiseProbeOnly || displayPairSafety !== 'safe'
        ? 'probe'
        : 'pair');
  const sessionPlayPair =
    sessionStateKey === 'break' && sessionExactPair.length === 2
      ? [...sessionExactPair]
      : [...sessionBackbonePair];
  const sessionPlayLead =
    sessionPlayPair.includes(prediction) ? prediction : sessionPlayPair[0] || prediction;
  const sessionBreakLead =
    sessionBreakFallback[0] ||
    freshOutsider?.value ||
    overdueNoise?.[0] ||
    null;
  const sessionBreakTrail =
    sessionBreakFallback.find((value) => value !== sessionBreakLead) || null;
  const sessionStateModel = (() => {
    if (sessionStateKey === 'break') {
      return {
        key: 'break',
        label: 'Break Live',
        tone: 'danger',
        summary: 'Noise has enough proof. Use the break order first for the next roll.',
        playPair: sessionPlayPair,
        playLead: sessionPlayLead,
        fallback: sessionBreakFallback,
        backbonePair: sessionBackbonePair,
        exactPair: sessionExactPair,
        displayPair: sessionExactPair.length === 2 ? sessionExactPair : sessionPlayPair,
        strengths: analyzer.boardStateStrengths || null,
        supportLine: sessionBreakLead
          ? `Noise tracker: ${sessionBreakLead}${sessionBreakTrail ? `, then ${sessionBreakTrail}` : ''}.`
          : 'Noise tracker is active.',
      };
    }
    if (sessionStateKey === 'reentry') {
      return {
        key: 'reentry',
        label: 'Back To Pair',
        tone: 'good',
        summary: 'Noise already hit. The board is pulling back into the pair for the next roll.',
        playPair: sessionPlayPair,
        playLead: sessionPlayLead,
        fallback: sessionBreakFallback,
        backbonePair: sessionBackbonePair,
        exactPair: sessionExactPair,
        displayPair: sessionBackbonePair,
        strengths: analyzer.boardStateStrengths || null,
        supportLine: sessionBreakLead
          ? `If noise returns, tracker stays ${sessionBreakLead}${sessionBreakTrail ? `, then ${sessionBreakTrail}` : ''}.`
          : 'Noise tracker is secondary here.',
      };
    }
    if (sessionStateKey === 'probe') {
      return {
        key: 'probe',
        label: 'Noise Watch',
        tone: 'warn',
        summary: 'Pair is still first. Watch the noise tracker and switch only if the same break repeats.',
        playPair: sessionPlayPair,
        playLead: sessionPlayLead,
        fallback: sessionBreakFallback,
        backbonePair: sessionBackbonePair,
        exactPair: sessionExactPair,
        displayPair: sessionBackbonePair,
        strengths: analyzer.boardStateStrengths || null,
        supportLine: sessionBreakLead
          ? `Noise tracker: ${sessionBreakLead}${sessionBreakTrail ? `, then ${sessionBreakTrail}` : ''}.`
          : 'Noise tracker is live.',
      };
    }
    return {
      key: 'pair',
      label: 'Pair First',
      tone: 'lane',
      summary: 'Pair still owns the next roll. Keep noise only as a backup read.',
      playPair: sessionPlayPair,
      playLead: sessionPlayLead,
      fallback: sessionBreakFallback,
      backbonePair: sessionBackbonePair,
      exactPair: sessionExactPair,
      displayPair: sessionBackbonePair,
      strengths: analyzer.boardStateStrengths || null,
      supportLine: sessionBreakLead
        ? `Noise tracker: ${sessionBreakLead}${sessionBreakTrail ? `, then ${sessionBreakTrail}` : ''}.`
        : 'No live noise tracker yet.',
    };
  })();

  return {
    prediction,
    alt,
    confidence,
    method,
    // 🆕 User-facing display fields
    label: labelEntry.label,
    reasonLine: labelEntry.reason,
    trustedPair: pairOutlook.trustedPair,
    runnerUpPair: pairOutlook.runnerUpPair,
    pairSafety: displayPairSafety,
    noiseRisk: displayNoiseRisk,
    pairScoreGap: Math.round(pairOutlook.scoreGap),
    mixedWindow: pairOutlook.mixedWindow,
    degradedSignals,
    isDegradedBoard,
    pairAge: pairOutlook.pairAge,
    top2Share: pairOutlook.top2Share,
    staleTrustedCount: pairOutlook.staleTrustedCount,
    freshOutsiderLead: pairOutlook.freshOutsiderLead,
    freshOutsider: pairOutlook.freshOutsider,
    analyzerPrediction: svarogPrediction,
    analyzerAlt: svarogAlt,
    isChaosOverride,
    boardState: displayPairSafety === 'safe' ? 'stable' : displayPairSafety === 'caution' ? 'caution' : 'chaos',
    analyzerScores: analyzer.scores,
    analyzerNoiseScores: analyzer.noiseScores || [],
    analyzerDecisionScores: analyzer.decisionScores || [],
    analyzerFinalScores: analyzer.finalScores || [],
    analyzerCommonDecisionScores: analyzer.commonDecisionScores || [],
    analyzerNoiseDecisionScores: analyzer.noiseDecisionScores || [],
    analyzerSessionStateScores: analyzer.sessionStateScores || [],
    trendOverallScores: analyzer.trendOverallScores || [],
    analyzerBreakChallenge: analyzer.breakChallenge || null,
    analyzerMode: analyzer.mode || 'pair',
    analyzerNoiseTiming: analyzer.noiseTiming || 'unknown',
    analyzerNoiseDueRatio: analyzer.noiseDueRatio || 0,
    analyzerNoisePhase: analyzer.noisePhase || 'idle',
    analyzerNoiseBeatStyle: analyzer.noiseBeatStyle || 'mixed',
    analyzerAvgNoiseStreakLen: analyzer.avgNoiseStreakLen || 1,
    analyzerSingleNoiseRate: analyzer.singleNoiseRate || 0,
    analyzerPostNoiseCommonRate: analyzer.postNoiseCommonRate || 0,
    analyzerPostNoiseSiblingRate: analyzer.postNoiseSiblingRate || 0,
    tailProfileMatch: analyzer.tailProfileMatch || null,
    shapeProfileMatch: analyzer.shapeProfileMatch || null,
    commonReturnArmed: analyzer.commonReturnArmed || false,
    siblingCommonValue: analyzer.siblingCommonValue || null,
    commonReturnStrength: analyzer.commonReturnStrength || 0,
    commonRecoveryActive: analyzer.commonRecoveryActive || false,
    commonDominantBoard: analyzer.commonDominantBoard || false,
    noiseTriggerConfirmed: analyzer.noiseTriggerConfirmed || false,
    noiseProbeOnly: analyzer.noiseProbeOnly || false,
    developingCommonsPairTakeover: analyzer.developingCommonsPairTakeover || false,
    hardCommonReturnTakeover: analyzer.hardCommonReturnTakeover || false,
    siblingBounceArmed: analyzer.siblingBounceArmed || false,
    siblingBounceStrength: analyzer.siblingBounceStrength || 0,
    hardSiblingBounceTakeover: analyzer.hardSiblingBounceTakeover || false,
    commonReclaimArmed: analyzer.commonReclaimArmed || false,
    commonReclaimValue: analyzer.commonReclaimValue || null,
    commonReclaimStrength: analyzer.commonReclaimStrength || 0,
    hardCommonReclaimTakeover: analyzer.hardCommonReclaimTakeover || false,
    mixedQuadActive: analyzer.mixedQuadActive || false,
    tightPairBoard: analyzer.tightPairBoard || false,
    tightPairValues: analyzer.tightPairValues || [],
    bridgeReturnValue: analyzer.bridgeReturnValue || null,
    preBlockReturnValue: analyzer.preBlockReturnValue || null,
    missingFourthRotationValue: analyzer.missingFourthRotationValue || null,
    quadGapShockValue: analyzer.quadGapShockValue || null,
    cycleRestartValue: analyzer.cycleRestartValue || null,
    doubleBridgeEchoValue: analyzer.doubleBridgeEchoValue || null,
    doubleBridgeSwapValue: analyzer.doubleBridgeSwapValue || null,
    commonDominantPreserveTakeover: analyzer.commonDominantPreserveTakeover || false,
    sessionState: sessionStateModel,
    noiseWatch: noiseWatchValue,
    overdueNoise,         // noise values that have been absent unusually long (comeback watch)
    isChaotic,
    pairMatrix: matrix,
    pairMatrix2gram: matrix2gram,
    lastRoll,
    last2Rolls,
    waveSignals,
    trends,
    commons,
    noise,
    distribution,
    // 🆕 Step 6+7: Regime and evidence quality
    regime,
    reliableTransitionCount,
    // Enhanced data
    noiseRising,
    currentRunLength,
    runBreakLikely,
    has2gramData,
    gram2Prediction,
    gram2Confidence,
    isAlternating,
    alternatingPair,
    patternShifted,
    shiftedToValue,
    // 🔥 BEAST MODE data
    momentumScores,
    hotValues,
    coldValues,
    smartRunScores,
    currentRunLen,
    wasChange,
    noiseDoubleTapLikely,
    doubleTapValue,
    // Uncertainty data
    confidenceGap,
    isUncertain: isUncertainResult,
    // Comparison data
    freqPrediction,
    pairPrediction,
    pairConfidence,
    // 🔍 LAST SEEN data
    lastSeen,
    overdueValues,
    mostOverdue,
    // 🔄 COMMONS FLIP data
    commonsFlipDetected,
    newCommons,
    flipConfidence,
    // 🔀 COMMONS SWITCH data (phase-aware mid-session pair shift detector)
    commonsSwitch,
    // Chaos data
    noiseRate: Math.round(noiseRate * 100),
    isFlat,
    // 🆕 NOISE TRAP data (for dedicated UI strip)
    isNoiseTrap,
    trapCandidate,
    noiseTrapProb: Math.round(noiseTrapProb),
    inRedZone,
    commonsSinceNoise,
    avgNoiseGap
  };
}

/**
 * Format wave signals for debug export
 */
export function formatWaveSignalsForExport(waveSignals) {
  if (!waveSignals) return '';
  return `RunLen:${waveSignals.lastCommonRunLength} NoiseHits:${waveSignals.noiseAppearanceCount} FlipProb:${waveSignals.waveFlipProbability}%`;
}

/**
 * Format trends for debug export
 */
export function formatTrendsForExport(trends) {
  if (!trends) return '';
  return VALUES.map(v => {
    const t = trends[v];
    const arrow = t.direction === 'rising' ? '↑' : t.direction === 'falling' ? '↓' : '→';
    return `${v}${arrow}`;
  }).join(', ');
}

/**
 * Format pair matrix row for debug export
 */
export function formatPairRowForExport(matrix, lastRoll) {
  if (!matrix || !lastRoll || !matrix[lastRoll]) return '';
  const row = matrix[lastRoll];
  return VALUES.map((value) => {
    const entry = row[value];
    const pct = typeof entry === 'object' ? Math.round(entry?.pct || 0) : Math.round(entry || 0);
    return `${value}:${pct}%`;
  }).join(', ');
}
