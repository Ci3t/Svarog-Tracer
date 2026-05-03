/**
 * Svarog Noise Predictor — Improved noise timing predictor module
 *
 * Answers three questions:
 * 1. WHEN will noise hit next? (noise likelihood on next roll)
 * 2. WHICH noise value is most likely?
 * 3. At what confidence level?
 *
 * Stateless: no learning across sessions.
 */

const VALUES = ['41', '42', '43', '44'];

// ── Hardcoded transition → noise probabilities (from pattern mining) ──
const TRANSITION_NOISE_PROB = {
  '44,43': 0.76,
  '42,42': 0.62,
  '41,41': 0.60,
  '44,41': 0.56,
  '42,43': 0.46,
  '43,43': 0.41,
  '41,42': 0.40,
  '41,43': 0.40,
  '41,44': 0.40,
  '42,41': 0.40,
  '42,44': 0.40,
  '43,41': 0.40,
  '43,42': 0.40,
  '43,44': 0.40,
  '44,42': 0.40,
  '44,44': 0.40,
};

// ── Transition-to-noise-value rankings (from pair transition mining) ──
// For each transition, maps noise values to relative frequency weights.
const TRANSITION_NOISE_VALUE_WEIGHTS = {
  '44,43': { '44': 8, '42': 6, '41': 2 },
  '42,42': { '41': 7, '43': 5, '44': 4 },
  '41,41': { '43': 7, '44': 5, '42': 3 },
  '44,41': { '42': 7, '43': 5, '44': 3 },
  '42,43': { '41': 6, '44': 5, '42': 4 },
  '43,43': { '44': 6, '41': 5, '42': 4 },
  '41,42': { '43': 5, '44': 4, '41': 3 },
  '41,43': { '42': 5, '44': 4, '41': 3 },
  '41,44': { '42': 5, '43': 4, '41': 3 },
  '42,41': { '43': 5, '44': 4, '42': 3 },
  '42,44': { '41': 5, '43': 4, '42': 3 },
  '43,41': { '42': 5, '44': 4, '43': 3 },
  '43,42': { '41': 5, '44': 4, '43': 3 },
  '43,44': { '41': 5, '42': 4, '43': 3 },
  '44,42': { '41': 5, '43': 4, '44': 3 },
  '44,44': { '41': 5, '42': 4, '43': 3 },
};

const BASE_NOISE_RATE = 0.45;

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function computeRunLength(rolls) {
  if (!rolls || rolls.length < 2) return 1;
  const last = rolls[rolls.length - 1];
  let run = 1;
  for (let i = rolls.length - 2; i >= 0; i--) {
    if (rolls[i] === last) run++;
    else break;
  }
  return run;
}

function computeRecentNoiseRate(rolls, noise, window = 10) {
  if (!rolls || rolls.length === 0) return BASE_NOISE_RATE;
  const recent = rolls.slice(-window);
  const noiseCount = recent.filter((r) => noise.includes(r)).length;
  return noiseCount / recent.length;
}

function computeLastSeenAgo(rolls, value) {
  if (!rolls || rolls.length === 0) return -1;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === value) return rolls.length - 1 - i;
  }
  return -1;
}

/**
 * Predict noise timing and identity for the next roll.
 *
 * @param {Object} input
 * @param {string[]} input.rolls - all rolls in current session
 * @param {string[]} input.commons - current commons (2 values)
 * @param {string[]} input.noise - current noise values (2 values)
 * @param {string} input.lastRoll - most recent roll
 * @param {string} [input.secondLast] - second most recent roll
 * @param {number[]} [input.noiseGapLengths] - historical commons-between-noise gaps
 * @param {number} [input.commonsSinceNoise] - commons since last noise
 * @param {number} [input.avgNoiseGap] - average noise gap (from predictor)
 * @param {number} [input.sessionLength] - total rolls in session
 */
export function predictNoiseTiming(input) {
  const {
    rolls = [],
    commons = [],
    noise = [],
    lastRoll,
    secondLast,
    noiseGapLengths = [],
    commonsSinceNoise = 0,
    avgNoiseGap = 3,
    sessionLength = rolls.length,
  } = input;

  const transitionKey = `${secondLast || ''},${lastRoll || ''}`;
  const transitionProb = TRANSITION_NOISE_PROB[transitionKey] ?? BASE_NOISE_RATE;

  // ── 1. Noise Likelihood Next Roll ──

  // A. Transition probability (most important, weight 0.45)
  const transitionWeight = 0.45;
  let likelihood = transitionProb * transitionWeight;

  // B. commonsSinceNoise / avgNoiseGap ratio via sigmoid (weight 0.25)
  const gapRatio = commonsSinceNoise / Math.max(avgNoiseGap, 1);
  const gapSigmoid = sigmoid((gapRatio - 1.0) * 3.5); // centered at 1.0, steepness 3.5
  likelihood += gapSigmoid * 0.25;

  // C. Recent noise rate in session (weight 0.15)
  const recentNoiseRate = computeRecentNoiseRate(rolls, noise, 12);
  // If recent noise rate is high, likelihood of next noise drops (regression to mean)
  // If recent noise rate is low, likelihood rises
  const rateAdjustment = (BASE_NOISE_RATE - recentNoiseRate) * 0.30 + BASE_NOISE_RATE;
  likelihood += clamp(rateAdjustment, 0.20, 0.70) * 0.15;

  // D. Run length bonus/penalty (weight 0.10)
  const runLen = computeRunLength(rolls);
  let runBonus = 0;
  if (runLen >= 3) {
    // Run of 3+ strongly suggests a break (71% noise rate from mining)
    runBonus = 0.71 * 0.10;
  } else if (runLen === 2) {
    runBonus = 0.52 * 0.10;
  } else {
    runBonus = 0.38 * 0.10;
  }
  likelihood += runBonus;

  // E. Session age factor (weight 0.05)
  // Early sessions (< 15 rolls) have slightly different patterns
  const sessionAgeFactor = sessionLength < 15
    ? 0.42 * 0.05
    : 0.48 * 0.05;
  likelihood += sessionAgeFactor;

  // Clamp final likelihood
  const noiseLikelihoodNextRoll = clamp(Math.round(likelihood * 100) / 100, 0, 1);

  // ── 2. Predicted Noise Value ──

  const transitionWeights = TRANSITION_NOISE_VALUE_WEIGHTS[transitionKey] || {};

  const noiseCandidates = noise.map((value) => {
    const pairLinkPct = transitionWeights[value] || 0;

    // Which noise has been seen longest ago
    const seenAgo = computeLastSeenAgo(rolls, value);
    const effectiveAbsence = seenAgo < 0 ? commonsSinceNoise + 2 : seenAgo;
    const absenceScore = Math.min(effectiveAbsence / Math.max(avgNoiseGap, 1), 3);

    // 🆕 INVERTED WEIGHT PRIORITY FOR DORMANT/UNSEEN VALUES
    // When a noise value has never appeared (seenAgo === -1) and session is
    // 8+ rolls deep, the absence signal should dominate over transition history.
    const isNeverSeen = seenAgo === -1 && rolls.length >= 8;
    const isDormant = seenAgo > 0 && seenAgo >= Math.round(avgNoiseGap * 2);
    const absenceMultiplier = isNeverSeen ? 8.0 : isDormant ? 6.0 : 4.0;

    // Combined score: transition weight + absence + pair-link
    let score = pairLinkPct * 3.5; // pair-link most important
    score += absenceScore * absenceMultiplier; // overdue noise gets boost
    score += (pairLinkPct > 0 ? pairLinkPct * 1.5 : 0); // extra for transition mapping

    return {
      value,
      score: Math.round(score * 100) / 100,
      prob: 0,
      reason: '',
      pairLinkPct,
      seenAgo: effectiveAbsence,
      rawSeenAgo: seenAgo,
    };
  });

  // Normalize scores into probabilities
  const totalScore = noiseCandidates.reduce((s, c) => s + Math.max(c.score, 0.1), 0);
  noiseCandidates.forEach((c) => {
    c.prob = Math.round((Math.max(c.score, 0.1) / totalScore) * 100) / 100;
  });

  // Sort by score descending
  noiseCandidates.sort((a, b) => b.score - a.score);

  // Build reasons
  noiseCandidates.forEach((c, idx) => {
    if (c.pairLinkPct >= 6) {
      c.reason = `transition_${transitionKey}_favorite`;
    } else if (c.seenAgo >= Math.max(avgNoiseGap * 1.5, 4)) {
      c.reason = `overdue_${c.seenAgo}_rolls`;
    } else if (c.pairLinkPct > 0) {
      c.reason = `transition_${transitionKey}_secondary`;
    } else {
      c.reason = `absence_${c.seenAgo}_rolls`;
    }
  });

  const predictedNoiseValue = noiseCandidates[0]?.value || null;

  // ── 3. Confidence ──
  // Based on data quality: transition prob reliability, gap data, and candidate separation
  const topProb = noiseCandidates[0]?.prob || 0;
  const secondProb = noiseCandidates[1]?.prob || 0;
  const probGap = topProb - secondProb;

  let confidence = 'low';
  if (transitionProb >= 0.60 && noiseGapLengths.length >= 3 && probGap >= 0.15) {
    confidence = 'high';
  } else if (transitionProb >= 0.45 && (noiseGapLengths.length >= 2 || probGap >= 0.10)) {
    confidence = 'medium';
  }

  // ── 4. Factors ──
  const factors = [];
  factors.push(`transition_${transitionKey}`);
  factors.push(`gap_ratio_${Math.round(gapRatio * 100) / 100}`);
  factors.push(`session_noise_rate_${Math.round(recentNoiseRate * 100) / 100}`);
  if (runLen >= 3) factors.push(`run_length_${runLen}`);
  if (sessionLength < 15) factors.push(`early_session_${sessionLength}`);

  return {
    noiseLikelihoodNextRoll,
    predictedNoiseValue,
    noiseCandidates: noiseCandidates.map((c) => ({
      value: c.value,
      prob: c.prob,
      reason: c.reason,
      seenAgo: c.seenAgo,
      rawSeenAgo: c.rawSeenAgo,
    })),
    confidence,
    factors,
  };
}

export default predictNoiseTiming;
