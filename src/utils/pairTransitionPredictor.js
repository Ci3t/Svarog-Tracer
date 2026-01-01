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
  for (let i = 0; i < rolls.length - 1; i++) {
    const from = rolls[i];
    const to = rolls[i + 1];
    
    if (!VALUES.includes(from) || !VALUES.includes(to)) continue;
    
    const age = rolls.length - 1 - i;
    let weight = 1;
    if (age < 3) weight = 3;
    else if (age < 6) weight = 2;
    
    // 1-gram tracking
    counts[from][to] += weight;
    sampleCounts[from][to] += 1;
    
    // 2-gram tracking (if we have a previous roll)
    if (i >= 1) {
      const prevRoll = rolls[i - 1];
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

  // Get last 2 rolls for 2-gram lookup
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
  // Use SHORT ROLLING WINDOW for faster adaptation (last 6 rolls - from Gemini)
  const windowSize = Math.min(6, rolls.length);
  const recentRolls = rolls.slice(-windowSize);
  
  // Get distribution from rolling window
  const distribution = getDistribution(recentRolls);
  
  // Also get full session distribution for comparison
  const fullDistribution = getDistribution(rolls);
  
  const sorted = VALUES
    .map(v => ({ value: v, pct: distribution[v] }))
    .sort((a, b) => b.pct - a.pct);
  
  // Top 2 are commons, bottom 2 are noise
  let commons = sorted.slice(0, 2).map(x => x.value);
  let noise = sorted.slice(2).map(x => x.value);
  
  // NOISE RISING DETECTION: Check if noise values are appearing frequently in last 6 rolls
  const last6 = rolls.slice(-6);
  const noiseRising = [];
  
  noise.forEach(n => {
    const countInLast6 = last6.filter(r => r === n).length;
    if (countInLast6 >= 3) {
      // This noise value is appearing frequently - it's becoming a common!
      noiseRising.push(n);
    }
  });
  
  // If noise is rising, swap it with the weaker common
  if (noiseRising.length > 0) {
    const risingNoise = noiseRising[0];
    const weakerCommon = commons[1]; // The less frequent common
    
    // Only swap if the rising noise has more recent appearances
    const risingCount = last6.filter(r => r === risingNoise).length;
    const weakerCount = last6.filter(r => r === weakerCommon).length;
    
    if (risingCount > weakerCount) {
      commons = [commons[0], risingNoise];
      noise = noise.filter(n => n !== risingNoise);
      noise.push(weakerCommon);
    }
  }
  
  // RUN BREAK DETECTION: Check for long runs that might break
  const lastRoll = rolls[rolls.length - 1];
  let currentRunLength = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === lastRoll) {
      currentRunLength++;
    } else {
      break;
    }
  }
  
  return { 
    commons, 
    noise, 
    distribution, 
    fullDistribution,
    noiseRising,
    currentRunLength,
    runBreakLikely: currentRunLength >= 3
  };
}

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
  // 🔥 BEAST MODE: SMART RUN LOGIC (Strategy 1)
  // Context-aware run detection instead of flat anti-repeat
  // =========================================================================
  const prevRoll = rolls.length >= 2 ? rolls[rolls.length - 2] : null;
  const wasChange = prevRoll !== lastRoll;
  
  // Count current run length for lastRoll
  let currentRunLen = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === lastRoll) currentRunLen++;
    else break;
  }
  
  // Smart Run Scores: BOOST after change, PENALIZE after long run
  const smartRunScores = {};
  VALUES.forEach(v => {
    if (v === lastRoll) {
      if (wasChange) {
        // Just changed to this value - BOOST! Expect a pair (run of 2)
        smartRunScores[v] = 1.3;
      } else if (currentRunLen >= 3) {
        // Long run - PENALIZE heavily, expect break
        smartRunScores[v] = 0.4;
      } else if (currentRunLen === 2) {
        // Run of 2 - SLIGHT PENALTY, might break soon
        smartRunScores[v] = 0.8;
      } else {
        // Single repeat - NEUTRAL
        smartRunScores[v] = 1.0;
      }
    } else {
      smartRunScores[v] = 1.0; // Other values unaffected
    }
  });

  // =========================================================================
  // 🔥 BEAST MODE: NOISE DOUBLE-TAP (Strategy 2)
  // Check if noise tends to appear in pairs
  // =========================================================================
  let noiseDoubleTapLikely = false;
  let doubleTapValue = null;
  
  if (noise.includes(lastRoll)) {
    // Last roll was noise - check if this noise usually comes in pairs
    const noiseVal = lastRoll;
    let pairsCount = 0;
    let singlesCount = 0;
    
    for (let i = 0; i < rolls.length - 1; i++) {
      if (rolls[i] === noiseVal) {
        if (rolls[i + 1] === noiseVal) {
          pairsCount++;
          i++; // Skip the pair
        } else {
          singlesCount++;
        }
      }
    }
    
    // If pairs are common (> 30% of appearances), expect double tap
    const totalAppearances = pairsCount * 2 + singlesCount;
    if (totalAppearances >= 2 && (pairsCount * 2) / totalAppearances >= 0.3) {
      noiseDoubleTapLikely = true;
      doubleTapValue = noiseVal;
    }
  }

  // =========================================================================
  // 🔥 CONFIDENCE GATE (from Gemini suggestion)
  // If top prediction is too close to others, mark as uncertain
  // =========================================================================
  const sortedDist = Object.entries(distribution)
    .map(([v, pct]) => ({ value: v, pct }))
    .sort((a, b) => b.pct - a.pct);
  
  const topPct = sortedDist[0]?.pct || 0;
  const secondPct = sortedDist[1]?.pct || 0;
  const confidenceGap = topPct - secondPct;
  const isUncertain = confidenceGap < 10 || topPct < 35;

  // Decide prediction method
  let method = 'frequency';
  let prediction = null;
  let alt = null;
  let confidence = 0;

  // Get frequency-based prediction (highest %)
  const freqSorted = VALUES
    .map(v => ({ value: v, pct: distribution[v] }))
    .sort((a, b) => b.pct - a.pct);
  
  const freqPrediction = freqSorted[0].value;
  const freqAlt = freqSorted[1].value;

  // =========================================================================
  // 🔥 TRY 2-GRAM FIRST (more context = better prediction)
  // =========================================================================
  let gram2Prediction = null;
  let gram2Alt = null;
  let gram2Confidence = 0;
  let has2gramData = false;
  
  if (last2Rolls && matrix2gram[last2Rolls]) {
    const gram2Sorted = VALUES
      .map(v => ({ 
        value: v, 
        pct: matrix2gram[last2Rolls][v]?.pct || 0,
        samples: matrix2gram[last2Rolls][v]?.samples || 0
      }))
      .filter(x => x.pct > 0)
      .sort((a, b) => b.pct - a.pct);
    
    if (gram2Sorted.length > 0 && gram2Sorted[0].pct > 0) {
      gram2Prediction = gram2Sorted[0].value;
      gram2Alt = gram2Sorted[1]?.value || freqAlt;
      gram2Confidence = gram2Sorted[0].pct;
      has2gramData = true;
    }
  }

  // Get 1-gram pair-based prediction (fallback)
  let pairPrediction = null;
  let pairAlt = null;
  let pairConfidence = 0;
  let pairReliable = false;
  if (lastRoll && matrix[lastRoll]) {
    const pairSorted = VALUES
      .map(v => ({ 
        value: v, 
        pct: matrix[lastRoll][v]?.pct || 0,
        samples: matrix[lastRoll][v]?.samples || 0,
        reliable: matrix[lastRoll][v]?.reliable || false
      }))
      .sort((a, b) => b.pct - a.pct);
    pairPrediction = pairSorted[0].value;
    pairAlt = pairSorted[1].value;
    pairConfidence = pairSorted[0].pct;
    pairReliable = pairSorted[0].reliable;
  }

  // =========================================================================
  // 🔥 ENHANCED PREDICTION LOGIC
  // Priority: Alternating > 2-gram > Run Break > Wave-Inverse > Noise-Snapback > 1-gram > Frequency
  // =========================================================================

  // 🔥 NEW: ALTERNATING PATTERN DETECTION (TOP PRIORITY)
  // Check if last 4+ rolls alternate between 2 values (e.g., 44,41,44,41)
  let isAlternating = false;
  let alternatingPair = null;
  
  if (rolls.length >= 4) {
    const last4 = rolls.slice(-4);
    const uniqueVals = [...new Set(last4)];
    
    // Check if exactly 2 unique values AND they alternate
    if (uniqueVals.length === 2) {
      let alternates = true;
      for (let i = 0; i < last4.length - 1; i++) {
        if (last4[i] === last4[i + 1]) {
          alternates = false;
          break;
        }
      }
      if (alternates) {
        isAlternating = true;
        alternatingPair = uniqueVals;
      }
    }
  }

  // ALTERNATING PATTERN - Highest priority
  if (isAlternating && alternatingPair) {
    // Predict the OPPOSITE of lastRoll
    const opposite = alternatingPair.find(v => v !== lastRoll);
    if (opposite) {
      prediction = opposite;
      alt = lastRoll;
      method = 'alternating';
      confidence = 0.75;
    }
  }
  // 🔥 NEW: PATTERN SHIFT - When noise is becoming common, predict it!
  else if (patternShifted && shiftedToValue) {
    prediction = shiftedToValue;
    alt = commons[0]; // Original common as backup
    method = 'pattern-shift';
    confidence = 0.65;
  }
  // Step 0: RUN BREAK - If 3+ consecutive same value, predict a break
  else if (runBreakLikely) {
    // After 3+ of same value, predict the OTHER common
    const otherCommon = commons.find(c => c !== lastRoll);
    if (otherCommon) {
      prediction = otherCommon;
      alt = lastRoll; // Same value as backup
      method = 'run-break';
      confidence = 0.70;
    }
  }
  // Step 1: USE 2-GRAM if available (more context = better)
  else if (has2gramData && gram2Confidence >= 40) {
    prediction = gram2Prediction;
    alt = gram2Alt;
    confidence = gram2Confidence / 100;
    method = '2-gram';
  }
  // Step 2: WAVE-INVERSE - When flip probability is HIGH, swap
  else if (waveSignals.waveFlipProbability >= 50) {
    // Use pair matrix but swap
    prediction = pairAlt || freqAlt;
    alt = pairPrediction || freqPrediction;
    method = 'wave-inverse';
    confidence = Math.min(waveSignals.waveFlipProbability + 10, 85) / 100;
  }
  // Step 3: 🔥 NOISE DOUBLE-TAP - If noise tends to pair, predict repeat!
  else if (noiseDoubleTapLikely && doubleTapValue) {
    // Noise that likes to double - predict it again!
    prediction = doubleTapValue;
    alt = hotValues[0] || commons[0]; // Hot common as backup
    method = 'double-tap';
    confidence = 0.68;
  }
  // Step 3b: NOISE-SNAPBACK - Single spike noise, expect return to common
  else if (waveSignals.noiseAppearanceCount >= 2 && noise.includes(lastRoll) && currentRunLen === 1) {
    // Only snapback if it's a single (not a pair start)
    prediction = hotValues[0] || commons[0] || freqPrediction;
    alt = hotValues[1] || commons[1] || freqAlt;
    method = 'noise-snapback';
    confidence = 0.65;
  }
  // Step 4: NOISE RISING - A noise value is becoming a common
  else if (noiseRising && noiseRising.length > 0) {
    // Predict the rising noise value
    prediction = noiseRising[0];
    alt = hotValues[0] || commons[0];
    method = 'noise-rising';
    confidence = 0.60;
  }
  else if (!pairPrediction || pairConfidence === 0) {
    // No pair data - fall back to frequency with trend adjustment
    prediction = freqPrediction;
    alt = freqAlt;
    method = 'frequency';
    
    // Use trends to potentially swap
    const freqTrend = trends[freqPrediction];
    const altTrend = trends[freqAlt];
    if (altTrend?.direction === 'rising' && freqTrend?.direction === 'falling') {
      const temp = prediction;
      prediction = alt;
      alt = temp;
      method = 'trend-boost';
    }
    confidence = distribution[prediction] / 100;
  }
  // Step 5: Use 1-GRAM pair matrix if available
  else if (pairPrediction && pairConfidence > 0) {
    prediction = pairPrediction;
    alt = pairAlt || freqAlt;
    confidence = pairConfidence / 100;
    method = 'pair-matrix';
  }
  // Step 6: TREND BOOST - If pair matrix agrees but trends disagree, consider swap
  else if (trends[pairAlt]?.direction === 'rising' && trends[pairPrediction]?.direction === 'falling') {
    if (Math.abs(distribution[pairPrediction] - distribution[pairAlt]) < 15) {
      prediction = pairAlt;
      alt = pairPrediction;
      method = 'trend-adjusted';
      confidence = distribution[prediction] / 100;
    }
  }
  // Step 7: FREQUENCY FALLBACK - Use distribution
  else {
    prediction = freqPrediction;
    alt = freqAlt;
    confidence = distribution[prediction] / 100;
    method = 'frequency';
  }
  
  // Final safety: ensure both prediction and alt are valid
  if (!prediction) prediction = freqPrediction;
  if (!alt) alt = freqAlt;
  if (prediction === alt) alt = freqSorted[1]?.value || VALUES.find(v => v !== prediction);

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
  // =========================================================================
  let usedTieBreaker = false;
  if (isUncertain && prediction && alt) {
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
  if (isUncertain && !usedTieBreaker && method !== 'alternating' && method !== '2-gram' && method !== 'pattern-shift' && method !== 'double-tap') {
    confidence = Math.min(confidence, 0.40);
    method = method + ' (uncertain)';
    isUncertainResult = true;
  }

  return {
    prediction,
    alt,
    confidence,
    method,
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
    pairConfidence
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
