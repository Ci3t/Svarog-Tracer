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
      acc[v] = { direction: 'stable', delta: 0, current: 0 };
      return acc;
    }, {});
  }

  // Compare distribution from 5 rolls ago vs now
  const recentRolls = rolls.slice(-5);
  const olderRolls = rolls.slice(-10, -5);
  
  const trends = {};
  
  VALUES.forEach(v => {
    const recentCount = recentRolls.filter(r => r === v).length;
    const olderCount = olderRolls.length > 0 
      ? olderRolls.filter(r => r === v).length 
      : 0;
    
    const recentPct = (recentCount / recentRolls.length) * 100;
    const olderPct = olderRolls.length > 0 
      ? (olderCount / olderRolls.length) * 100 
      : recentPct;
    
    const delta = Math.round(recentPct - olderPct);
    
    let direction = 'stable';
    if (delta >= 10) direction = 'rising';
    else if (delta <= -10) direction = 'falling';
    
    trends[v] = {
      direction,
      delta,
      current: Math.round(recentPct)
    };
  });
  
  return trends;
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
export function identifyCommonsNoise(rolls) {
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
  const noiseRising = [];
  noise.forEach(noiseVal => {
    const countInLast6 = last6.filter(r => r === noiseVal).length;
    if (countInLast6 >= 3) noiseRising.push(noiseVal);
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
export function predictWithPairs(rolls) {
  if (!rolls || rolls.length < 6) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      method: 'insufficient-data',
      pairMatrix: null,
      waveSignals: null,
      trends: null,
      commons: [],
      noise: [],
      distribution: {}
    };
  }

  // Build all the data (ENHANCED with new features)
  const commonsData = identifyCommonsNoise(rolls);
  const { commons, noise, distribution, noiseRising, currentRunLength, runBreakLikely } = commonsData;
  const { matrix, matrix2gram, lastRoll, last2Rolls } = buildPairMatrix(rolls);
  const waveSignals = calculateWaveSignals(rolls, commons);
  const trends = calculateTrends(rolls);

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
  const isFlat = (maxDist - minDist) < 15;
  
  // Chaos = high noise rate OR flat distribution
  const isChaotic = noiseRate >= 0.40 || isFlat;

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
    momentumScores[v] = Math.round(score * 100) / 100;
  });
  
  // Determine "hot" values (highest momentum) - these are the real commons NOW
  const sortedByMomentum = VALUES
    .map(v => ({ value: v, momentum: momentumScores[v] }))
    .sort((a, b) => b.momentum - a.momentum);
  
  const hotValues = sortedByMomentum.slice(0, 2).map(x => x.value);
  const coldValues = sortedByMomentum.slice(2).map(x => x.value);
  
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

  // ── FREQ/PAIR BLEND based on sample count ─────────────────────────────────
  // How many times has lastRoll appeared? That's how many pair samples we have.
  const pairSamplesForLastRoll = rolls.filter(r => r === lastRoll).length;
  // Weight schedule:
  //   < 3 samples → freq dominates (pair data too noisy)
  //   3–5 samples → equal blend
  //   6+ samples  → pair dominates
  const pairWeight = pairSamplesForLastRoll < 3 ? 0.20
    : pairSamplesForLastRoll < 6 ? 0.50
    : 0.80;
  const freqWeight = 1 - pairWeight;

  // Compute a blended score for each value (used instead of raw pair % when sparse)
  const blendedScores = VALUES.map(v => ({
    value: v,
    blended: freqWeight * (distribution[v] || 0) + pairWeight * (matrix[lastRoll]?.[v]?.pct || 0)
  })).sort((a, b) => b.blended - a.blended);

  // Blended pair prediction (commons-filtered for main use)
  const blendedCommons = blendedScores.filter(x => commons.includes(x.value));
  const blendedPairPrediction = blendedCommons[0]?.value || pairPrediction;
  const blendedPairAlt        = blendedCommons[1]?.value || pairAlt;
  // Use blended confidence (scale down when freq-heavy since freq is weaker)
  const blendedPairConfidence = pairSamplesForLastRoll < 3
    ? Math.min((blendedCommons[0]?.blended || 0), 40)   // Freq-heavy: cap low
    : pairSamplesForLastRoll < 6
    ? Math.min((blendedCommons[0]?.blended || 0), 60)   // Blend: medium cap
    : (blendedCommons[0]?.blended || pairConfidence);   // Pair-heavy: full trust
  
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
  else if (mostOverdueCommon && lastSeen[mostOverdueCommon] >= OVERDUE_THRESHOLD) {
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
      // Only predict overdue if it has DECENT momentum (> 0.20) OR it's the only overdue option
      else if (overdueMomentum >= 0.20 || isOnlyOverdue) {
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
      prediction = otherCommon;   // Break target = the other common
      alt = lastRoll;             // Alt = run might continue one more time
      method = 'run-break';
      // Higher confidence for longer runs (more likely to break)
      confidence = currentRunLen >= 4 ? 0.75 : currentRunLen >= 3 ? 0.65 : 0.55;
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

  // 🔧 FINAL SAFETY: Ensure confidence is never 0%
  confidence = Math.max(confidence, 0.25);

  // =========================================================================
  // 🆕 TOPIC 2+3: LABEL, REASON LINE, NOISE WATCH
  // Compute the user-friendly label badge and one-line reason.
  // Both main and alt are always commons. Noise only appears in noiseWatch.
  // =========================================================================

  // Commons guardian: last safety net — if somehow prediction is noise, swap to top common
  if (noise.includes(prediction)) {
    prediction = commons[0] || freqSorted.find(f => commons.includes(f.value))?.value || prediction;
  }
  if (noise.includes(alt) || alt === prediction) {
    alt = commons.find(c => c !== prediction) || freqSorted.find(f => commons.includes(f.value) && f.value !== prediction)?.value || alt;
  }

  // Noise watch: is a noise value likely to appear soon? (for ⚡ Watch indicator)
  const noiseWatchValue = _chaosNoiseWatch ||
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
  const overdueNoise = noise.filter(v =>
    lastSeen[v] !== -1 &&          // has appeared at least once this session
    lastSeen[v] >= noiseOverdueThreshold   // absent long enough
  ).sort((a, b) => (lastSeen[b] || 0) - (lastSeen[a] || 0)); // most overdue first

  // Label badge and reason line lookup
  const baseMethod = method.replace(/\+.*/, ''); // strip modifiers for lookup
  const currentRun = waveSignals?.lastCommonRunLength || currentRunLen || 0;
  const altCommon = alt || commons.find(c => c !== prediction);
  const pairPct = Math.round((matrix[lastRoll]?.[prediction]?.pct || 0));
  const overdueRolls = method.includes('overdue-wave') && lastSeen[prediction] >= 0
    ? lastSeen[prediction]
    : -1;
  const postNoiseCount2 = commonPostNoise[0]?.count || 0;

  const labelMap = {
    'hot-run':             { label: '🔥 Running',    reason: `${prediction} × ${currentRun} streak — riding it` },
    'hot-run+run-break':   { label: '🔥 Running',    reason: `${lastRoll} × ${currentRun} — break expected, predict ${prediction}` },
    'alternating':         { label: '🔄 Alternating', reason: `${alternatingPair?.[0]} ↔ ${alternatingPair?.[1]} ping-pong — next: ${prediction}` },
    'pattern-shift':       { label: '🔀 Shifted',     reason: (() => {
      const sv = shiftedToValue || prediction;
      const svCount = rolls.filter(r => r === sv).length;
      const svPct = distribution[sv] || 0;
      // 25% = baseline in a 4-value game — not "taking over"
      // Needs 4+ appearances AND 30%+ distribution to say "taking over"
      if (svCount <= 3 || svPct < 30) return `${sv} emerging — watch it`;
      return `New signal: ${sv} taking over`;
    })() },
    '2-gram':              { label: '🔁 Sequence',    reason: `${prediction} follows ${last2Rolls} pattern${gram2Confidence > 0 ? ` (${Math.round(gram2Confidence)}%)` : ''}` },
    'pair-matrix':         { label: '🎯 Pair',        reason: `${prediction} most likely after ${lastRoll}${pairPct > 0 ? ` (${pairPct}%)` : ''}` },
    'overdue-wave':        { label: '🔔 Overdue',     reason: `${prediction} not seen in ${overdueRolls} rolls — due` },
    'overdue-wave+pair':   { label: '🔔 Overdue',     reason: `${prediction} overdue + pair edge — due` },
    'post-noise-recovery': { label: '🌀 Recovery',    reason: `After noise, ${prediction} returns (${postNoiseCount2}×)` },
    'chaos-pair':          { label: '⚠️ Chaotic',    reason: `Edge: ${lastRoll}→${prediction} strongest link` },
    'chaos-freq':          { label: '⚠️ Chaotic',    reason: 'No clear pattern — most frequent' },
    'insufficient-data':   { label: '⏳ Warming Up',  reason: 'Need more rolls — building picture' },
  };
  // Try exact method first, then base method
  const labelEntry = labelMap[method] || labelMap[baseMethod] || { label: '🎯 Pair', reason: `${prediction} most likely after ${lastRoll}` };

  return {
    prediction,
    alt,
    confidence,
    method,
    // 🆕 User-facing display fields
    label: labelEntry.label,
    reasonLine: labelEntry.reason,
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
    isFlat
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
  return VALUES.map(v => `${v}:${row[v]}%`).join(', ');
}
