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
    if (pair.every(value => (trends[value]?.direction || 'stable') === 'rising')) score += 6;
    if (pair.every(value => (trends[value]?.direction || 'stable') === 'falling')) score -= 10;

    return { pair, pairKey, score };
  }).sort((a, b) => b.score - a.score);

  let trustedPair = pairScores[0]?.pair || commons;
  let noisePair = VALUES.filter(value => !trustedPair.includes(value));
  let runnerUpPair = pairScores[1]?.pair || noisePair;
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
    return { value, score, recent2Hits, recent4Hits, rollsAgo, direction };
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
  if (
    outsiderCanPivot &&
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
  const staleCommons = commons.filter((value) => {
    const direction = trends?.[value]?.direction || 'stable';
    const arrowWeight = trends?.[value]?.arrowWeight ?? 1.0;
    const trust = trends?.[value]?.trustScore ?? 0.6;
    return direction === 'falling' || arrowWeight <= 0.4 || trust <= 0.4;
  }).length;
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
    const latentPressure = trends?.[value]?.latentPressure ?? 18;
    const latentTier = trends?.[value]?.latentTier ?? 'low';
    const noisePriorityScore = trends?.[value]?.noisePriorityScore ?? 18;
    const noisePriorityTier = trends?.[value]?.noisePriorityTier ?? 'quiet';
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
    const timingBonus = noise?.includes(value)
      ? (
          noiseTiming === 'due'
            ? Math.max(0, Math.round((overdueVsGap - 0.7) * 10))
            : noiseTiming === 'approaching'
              ? Math.max(0, Math.round((overdueVsGap - 0.4) * 6))
              : -6
        )
      : 0;
    const pressureBonus = noise?.includes(value)
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
      pair2Signal * 0.12 +
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
    if (pair2Reliable) score += Math.min(pair2Signal * 0.08, 8);
    score += latentNoiseBonus;
    score += (effectivePressure - 40) * 0.24;
    score += timingBonus;
    score += pressureBonus;

    if (direction === 'rising') score += effectivePressure >= 55 ? 7 : effectivePressure >= 42 ? 3 : -5;
    else if (direction === 'stable') score += 2;
    else score -= 6;
    if (noise?.includes(value) && recent6 < 25 && effectivePressure < 30) score -= 8;
    else if (noise?.includes(value) && recent6 < 25 && effectivePressure < 42) score -= 4;

    return {
      value,
      score: Math.round(score * 100) / 100,
      pair1,
      pair1Reliable,
      pair2,
      pair2Reliable,
      freqSignal,
      recentSignal,
      momentumSignal,
      absenceSignal,
      seenAgo,
      recent2Hits,
      recent4Hits,
      isSelfTransition,
      direction,
      supportScore,
      supportTier,
      latentPressure,
      latentTier,
      noisePriorityScore,
      noisePriorityTier,
      totalCount,
      effectivePressure,
    };
  }).sort((a, b) => b.score - a.score);

  const bestCommon = scored.find(entry => commons.includes(entry.value)) || null;
  const secondCommon = scored.find(entry => commons.includes(entry.value) && entry.value !== bestCommon?.value) || null;
  const noiseEntries = scored
    .filter(entry => noise.includes(entry.value))
    .map((entry) => {
      const rawGap = entry.seenAgo < 0 ? commonsSinceNoise + 2 : entry.seenAgo;
      const overdueNorm = avgNoiseGap ? rawGap / Math.max(avgNoiseGap, 1) : rawGap / 4;
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
      return {
        ...entry,
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
  const analyzerTop1 = analyzerRanked[0] || null;
  let analyzerTop2 = analyzerRanked.find((entry) => entry.value !== analyzerTop1?.value) || null;
  const strongestBackedCommon = analyzerRanked.find((entry) =>
    commons.includes(entry.value) &&
    (
      (entry.supportScore ?? 0) >= 48 ||
      (entry.freqSignal ?? 0) >= 60 ||
      (entry.pair1 ?? 0) >= 40
    )
  ) || null;
  const topPairValues = [analyzerTop1?.value, analyzerTop2?.value].filter(Boolean);
  if (
    strongestBackedCommon &&
    !topPairValues.includes(strongestBackedCommon.value) &&
    analyzerTop2 &&
    strongestBackedCommon.exactScore >= (analyzerTop2.exactScore - 8)
  ) {
    analyzerTop2 = strongestBackedCommon;
  }
  const topNoiseCount = [analyzerTop1, analyzerTop2].filter((entry) => entry && noise.includes(entry.value)).length;
  let analyzerMode = 'pair';
  if (normalizedNoiseTiming !== 'not_due') {
    if (topNoiseCount === 2 || (analyzerTop1 && noise.includes(analyzerTop1.value))) analyzerMode = 'break';
    else if (topNoiseCount === 1) analyzerMode = 'break-watch';
  }

  // Narrow exact-pick helper for first-break moments after x3/x4 runs.
  // We keep the balanced base scorer intact, then let the best non-runner
  // challenger compete when the current run is stretched enough to be fragile.
  if (currentRunLen >= 3 && scored.length >= 2) {
    const exhaustionRatio = currentRunLen / Math.max(avgObservedRunLen || 2.5, 1);
    const selfEntry = scored.find(entry => entry.isSelfTransition);
    const challengerPool = scored
      .filter(entry => !entry.isSelfTransition)
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
          scored.find(entry => entry.value !== promotedMain && entry.value !== lastRoll)?.value ||
          scored.find(entry => entry.value !== promotedMain)?.value ||
          null;
        return {
          prediction: promotedMain,
          alt: promotedAlt,
          scores: scored,
          noiseScores: noiseEntries,
          mode: 'pair',
          noiseTiming,
          noiseDueRatio,
        };
      }

      const currentMain = scored[0]?.value || null;
      const currentAlt = scored.find(entry => entry.value !== currentMain)?.value || null;
      if (bestChallenger.value !== currentMain && bestChallenger.breakTotal >= (scored.find(entry => entry.value === currentAlt)?.score ?? -999) + 2) {
        return {
          prediction: currentMain,
          alt: bestChallenger.value,
          scores: scored,
          noiseScores: noiseEntries,
          mode: 'pair',
          noiseTiming,
          noiseDueRatio,
        };
      }
    }
  }

  return {
    prediction: analyzerTop1?.value || scored[0]?.value || null,
    alt: analyzerTop2?.value || scored.find(entry => entry.value !== (analyzerTop1?.value || scored[0]?.value))?.value || null,
    scores: scored,
    noiseScores: noiseEntries,
    mode: analyzerMode,
    noiseTiming: normalizedNoiseTiming,
    noiseDueRatio,
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
        latentPressure: 18,
        latentTier: 'low',
        noisePriorityScore: 22,
        noisePriorityTier: 'quiet',
        recentCount: 0,
        olderCount: 0,
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
    const olderPct    = olderRolls.length > 0 ? (olderCount / olderRolls.length) * 100 : recentPct;
    const delta       = Math.round(recentPct - olderPct);
    const direction   = currentDir[v];

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

    // trustScore: how much to trust this value as a candidate
    // rising = confident pick, stable = neutral, falling = soft noise flag
    // Applied as a multiplier — not a hard gate (Codex: "treat as modifier, not belief system")
    const trustScore = direction === 'rising' ? 1.0
                     : direction === 'stable'  ? 0.6
                     : 0.25; // falling = likely cooling off, don't let it flip reads
    const trustPct = trustScore * 100;
    const freshnessPct = arrowWeight * 100;
    const state = arrowAge === 0 ? 'fresh' : arrowAge === 1 ? 'held' : 'stale';
    const totalCount = rolls.filter(r => r === v).length;
    const lastIndex = rolls.lastIndexOf(v);
    const lastSeenGap = lastIndex >= 0 ? (rolls.length - 1 - lastIndex) : rolls.length;
    const absencePct = Math.max(0, Math.min(100, Math.round((lastSeenGap / Math.max(rolls.length, 1)) * 100)));
    const supportScore = Math.max(0, Math.min(100, Math.round(
      recentPct * 0.55 +
      olderPct * 0.15 +
      trustPct * 0.20 +
      freshnessPct * 0.10 +
      (direction === 'rising' ? 4 : direction === 'falling' ? -6 : 0)
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
      (recentPct === 0 ? 14 : recentPct <= 20 ? 5 : 0) +
      (olderCount > 0 && recentCount === 0 ? 8 : 0) +
      (totalCount <= 1 ? 10 : totalCount === 2 ? 4 : 0) +
      (totalCount === 0 ? 10 : 0) +
      (direction === 'rising' ? 6 : direction === 'stable' ? 3 : -8)
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
      latentPressure,
      latentTier,
      noisePriorityScore,
      noisePriorityTier,
      recentCount,
      olderCount,
      totalCount,
    };
  });

  return trends;
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

  const windowSizes = [4, 8, 12].map(w => Math.min(w, n));
  const windowVotes = {};
  VALUES.forEach(v => { windowVotes[v] = 0; });

  let primaryDistribution = fullDistribution;
  windowSizes.forEach((wSize, i) => {
    const wRolls = rolls.slice(-wSize);
    const wDist = getDistribution(wRolls);
    if (i === 1) primaryDistribution = wDist; // 8-roll window as display dist
    const wSorted = VALUES.map(v => ({ value: v, pct: wDist[v] })).sort((a, b) => b.pct - a.pct);
    wSorted.slice(0, 2).forEach(({ value }) => { windowVotes[value]++; });
  });

  // Rank by votes, tie-break by full-session frequency
  const ranked = VALUES
    .map(v => ({ value: v, votes: windowVotes[v], fullPct: fullDistribution[v] }))
    .sort((a, b) => b.votes - a.votes || b.fullPct - a.fullPct);

  let commons = ranked.slice(0, 2).map(x => x.value);
  let noise   = ranked.slice(2).map(x => x.value);
  const distribution = primaryDistribution;

  // =========================================================================
  // NOISE RISING DETECTION
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
  // 🔥 BEAST MODE 4.0: PAIR MOMENTUM & MIRROR-STEP
  // =========================================================================

  // Decide prediction method
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
      prediction = topCommonByBlend.value;
      alt = blendedCommons[1]?.value || commons.find(c => c !== prediction) || freqSorted.find(f => commons.includes(f.value) && f.value !== prediction)?.value || commons[1];
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
  // Note: does NOT override alt — expose as separate ui strip data

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
    analyzerPrediction: analyzer.prediction,
    analyzerAlt: analyzer.alt,
    analyzerScores: analyzer.scores,
    analyzerNoiseScores: analyzer.noiseScores || [],
    analyzerMode: analyzer.mode || 'pair',
    analyzerNoiseTiming: analyzer.noiseTiming || 'unknown',
    analyzerNoiseDueRatio: analyzer.noiseDueRatio || 0,
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
