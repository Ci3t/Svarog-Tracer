/**
 * Svarog Noise Oracle — Standalone noise prediction module
 *
 * Answers two questions:
 * 1. Is noise likely on the next roll? (hazard probability)
 * 2. If noise appears, which value is most likely?
 *
 * Per-session calibration: resets every 5-minute window.
 * Uses gap distribution modeling + value ranking.
 */

const VALUES = ['41', '42', '43', '44'];

/**
 * Fit a session's noise gap distribution and compute hazard probability
 *
 * @param {Object} params
 * @param {string[]} params.rolls - all rolls in current session
 * @param {string[]} params.commons - current commons
 * @param {string[]} params.noise - current noise values
 * @param {string} params.lastRoll - most recent roll
 * @param {Object} params.matrix - pair transition matrix
 * @param {Object} params.trends - trend data per value
 * @param {Object} params.momentumScores - momentum per value
 * @param {Object} params.lastSeen - rolls since last seen per value
 * @param {number|null} params.avgNoiseGap - average gap (from predictor)
 * @param {number[]} params.noiseGapLengths - array of commons-between-noise gaps
 * @param {number} params.commonsSinceNoise - commons since last noise
 */
export function predictNoise({
  rolls,
  commons,
  noise,
  lastRoll,
  matrix,
  trends,
  momentumScores,
  lastSeen,
  avgNoiseGap,
  noiseGapLengths,
  commonsSinceNoise,
}) {
  // ── A. Session Gap Model ────────────────────────────────────────────
  let gapMean = avgNoiseGap ?? 2.5;
  let gapVariance = 1.0;
  let regularityScore = 0.5;
  let regime = 'insufficient-data';

  if (noiseGapLengths.length >= 2) {
    const n = noiseGapLengths.length;
    gapMean = noiseGapLengths.reduce((s, g) => s + g, 0) / n;
    gapVariance = noiseGapLengths.reduce((s, g) => s + Math.pow(g - gapMean, 2), 0) / n;
    regularityScore = 1 / (1 + gapVariance); // high = consistent gaps
    regime = regularityScore >= 0.4 ? 'regular' : 'irregular';
  } else if (noiseGapLengths.length === 1) {
    gapMean = noiseGapLengths[0];
    gapVariance = 0.5;
    regularityScore = 0.3;
    regime = 'irregular';
  }

  // ── B. Hazard Probability (any noise next roll?) ────────────────────
  let noiseLikelihoodNextRoll = 0.30; // neutral default

  if (regime === 'regular') {
    // Sigmoid around gapMean: likelihood rises as commonsSinceNoise exceeds mean
    const diff = commonsSinceNoise - gapMean;
    // Scale factor: more regular = sharper transition
    const steepness = 2.0 + regularityScore * 2.5;
    noiseLikelihoodNextRoll = 1 / (1 + Math.exp(-steepness * diff));
    // Cap at 0.95 — allow high confidence when data is regular
    noiseLikelihoodNextRoll = Math.min(noiseLikelihoodNextRoll, 0.95);
  } else if (regime === 'irregular') {
    // Moderate ramp — less conservative than before
    noiseLikelihoodNextRoll = Math.min(0.70, commonsSinceNoise / (gapMean * 1.8));
  }

  // If we have zero noise gaps (no noise seen yet this session), use a mild linear ramp
  // instead of locking to a very low number. Many sessions start with no noise.
  if (noiseGapLengths.length === 0) {
    noiseLikelihoodNextRoll = Math.min(0.50, commonsSinceNoise / 3.5);
  }

  // ── C. Noise Identity (which noise value?) ──────────────────────────
  const noiseCandidates = noise.map((value) => {
    const pairLinkPct = matrix?.[lastRoll]?.[value]?.pct || 0;
    const trend = trends?.[value] || {};
    const direction = trend.direction || 'stable';
    const trust = trend.trustScore ?? 0.5;
    const momentum = momentumScores?.[value] || 0;
    const seenAgo = lastSeen?.[value] ?? -1;

    // Trend bonus
    let trendBonus = 0;
    if (direction === 'rising') trendBonus = 15;
    else if (direction === 'stable') trendBonus = 5;
    else trendBonus = -10;

    // Absence bonus: how overdue is this noise value relative to session avg?
    // If seenAgo < 0 (never seen), use commonsSinceNoise as proxy
    const effectiveAbsence = seenAgo < 0 ? commonsSinceNoise + 2 : seenAgo;
    const absenceRatio = effectiveAbsence / Math.max(gapMean, 1);
    let absenceBonus = 0;
    if (absenceRatio >= 1.5) absenceBonus = 18;
    else if (absenceRatio >= 1.0) absenceBonus = 12;
    else if (absenceRatio >= 0.7) absenceBonus = 6;
    else absenceBonus = -4; // Recently seen = less likely

    // Momentum bonus (scaled 0-100)
    const momentumBonus = Math.min(momentum * 20, 15);

    // Pair link bonus (most important signal)
    const pairBonus = pairLinkPct * 0.35;

    const totalScore = pairBonus + trendBonus + absenceBonus + momentumBonus;

    return {
      value,
      score: totalScore,
      pairLinkPct,
      trendBonus,
      absenceBonus,
      momentumBonus,
      direction,
      trust,
      seenAgo: effectiveAbsence,
    };
  });

  noiseCandidates.sort((a, b) => b.score - a.score);

  const predictedNoiseValue = noiseCandidates[0]?.value || null;
  const altNoiseValue = noiseCandidates[1]?.value || null;

  // Confidence = how much the top candidate dominates
  const topScore = noiseCandidates[0]?.score || 0;
  const secondScore = noiseCandidates[1]?.score || 0;
  const scoreGap = topScore - secondScore;
  const confidence = Math.min(0.95, 0.35 + Math.min(scoreGap / 30, 0.6));

  // Build a readable reason string
  const reasonParts = [];
  reasonParts.push(`gapMean=${gapMean.toFixed(1)}`);
  reasonParts.push(`commonsSince=${commonsSinceNoise}`);
  reasonParts.push(`likelihood=${(noiseLikelihoodNextRoll * 100).toFixed(0)}%`);
  if (predictedNoiseValue) {
    const top = noiseCandidates[0];
    reasonParts.push(`pick=${predictedNoiseValue}(pair=${top.pairLinkPct}%,trend=${top.direction})`);
  }

  return {
    noiseLikelihoodNextRoll: Math.round(noiseLikelihoodNextRoll * 100) / 100,
    predictedNoiseValue,
    altNoiseValue,
    confidence: Math.round(confidence * 100) / 100,
    sessionRegime: regime,
    gapMean: Math.round(gapMean * 100) / 100,
    gapVariance: Math.round(gapVariance * 100) / 100,
    regularityScore: Math.round(regularityScore * 100) / 100,
    noiseCandidates: noiseCandidates.map((c) => ({
      value: c.value,
      score: Math.round(c.score * 100) / 100,
      pairLinkPct: c.pairLinkPct,
      trendBonus: c.trendBonus,
      absenceBonus: c.absenceBonus,
      momentumBonus: c.momentumBonus,
    })),
    reason: reasonParts.join(' | '),
  };
}

export default predictNoise;
