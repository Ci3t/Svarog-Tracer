// src/utils/bbp-mode-3str.js
// 🦁 BBP Mode 3-Str Predictor: Pattern-based prediction using "Virtual 2-Column" logic
// Focus: Identify 2 dominant values (commons) and detect patterns among them

/**
 * Clean raw rolls into 3-digit strings
 */
function cleanRolls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).replace(/[^1-4]/g, ""))
    .filter((r) => r.length === 3); // Must be 4x format
}

/**
 * 🎯 Step 1: Identify the 2 Commons (Virtual Column A) and Noise (Virtual Column B)
 * 
 * @param {Array} rolls - Array of 3-Str rolls ["41", "42", "41", "42", "44", ...]
 * @returns {Object} { commons: ["42", "41"], noise: ["44", "43"], distribution: {...} }
 */
function identifyCommons(rolls) {
  if (!rolls || rolls.length < 3) {
    return {
      commons: [],
      noise: [],
      distribution: {},
      totalRolls: 0,
      isChaotic: false,
      commonsConfidence: 0,
    };
  }

  // Count frequency of each value
  const freq = {};
  rolls.forEach((roll) => {
    freq[roll] = (freq[roll] || 0) + 1;
  });

  // Sort by frequency (descending)
  const sorted = Object.entries(freq)
    .map(([value, count]) => ({
      value,
      count,
      pct: (count / rolls.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // 🔥 CHAOS DETECTION: If all values are within 10% of each other, mark as chaotic
  if (sorted.length >= 4) {
    const maxPct = sorted[0].pct;
    const minPct = sorted[sorted.length - 1].pct;
    if (maxPct - minPct < 10) {
      return {
        commons: [],
        noise: [],
        distribution: Object.fromEntries(sorted.map(x => [x.value, { count: x.count, pct: x.pct }])),
        totalRolls: rolls.length,
        isChaotic: true,
        commonsConfidence: 0,
        sortedValues: sorted,
      };
    }
  }

  // 🔥 MINIMUM THRESHOLD: Commons must have >15% frequency each
  const validCommons = sorted.filter(x => x.pct > 15);
  
  if (validCommons.length < 2) {
    // Not enough valid commons - treat as chaotic
    return {
      commons: [],
      noise: [],
      distribution: Object.fromEntries(sorted.map(x => [x.value, { count: x.count, pct: x.pct }])),
      totalRolls: rolls.length,
      isChaotic: true,
      commonsConfidence: 0,
      sortedValues: sorted,
    };
  }

  // Top 2 valid values = Commons, rest = Noise
  const commons = validCommons.slice(0, 2).map((x) => x.value);
  const noise = sorted.slice(2).map((x) => x.value);

  // Build distribution object
  const distribution = {};
  sorted.forEach((x) => {
    distribution[x.value] = {
      count: x.count,
      pct: x.pct,
    };
  });

  // Calculate commons confidence (how dominant are the top 2)
  const commonsPct = validCommons.slice(0, 2).reduce((sum, x) => sum + x.pct, 0);
  const commonsConfidence = Math.min(0.95, commonsPct / 100);

  return {
    commons,
    noise,
    distribution,
    totalRolls: rolls.length,
    isChaotic: false,
    commonsConfidence,
    sortedValues: sorted,
  };
}

/**
 * 🔄 Build Transition Matrix for Commons
 * Tracks what value follows each common value
 * 
 * @param {Array} rolls - Array of rolls
 * @param {Array} commons - The 2 dominant values
 * @returns {Object} Transition matrix with probabilities
 */
function buildTransitionMatrix(rolls, commons) {
  if (!rolls || rolls.length < 2 || !commons || commons.length < 2) {
    return {};
  }

  const matrix = {};
  commons.forEach(c => {
    matrix[c] = { counts: {}, total: 0, probabilities: {} };
  });

  // Count transitions
  for (let i = 0; i < rolls.length - 1; i++) {
    const current = rolls[i];
    const next = rolls[i + 1];
    
    if (commons.includes(current)) {
      matrix[current].counts[next] = (matrix[current].counts[next] || 0) + 1;
      matrix[current].total++;
    }
  }

  // Convert counts to probabilities
  commons.forEach(c => {
    const total = matrix[c].total;
    if (total > 0) {
      Object.keys(matrix[c].counts).forEach(next => {
        matrix[c].probabilities[next] = matrix[c].counts[next] / total;
      });
    }
  });

  return matrix;
}

/**
 * 📊 Analyze Flip Pattern between Commons
 * Detects if commons are alternating or sticky
 * 
 * @param {Array} rolls - Array of rolls
 * @param {Array} commons - The 2 dominant values
 * @returns {Object} Flip analysis with rate and pattern type
 */
function analyzeFlipPattern(rolls, commons) {
  if (!rolls || rolls.length < 2 || !commons || commons.length < 2) {
    return {
      flipRate: 0,
      flips: 0,
      stays: 0,
      isAlternating: false,
      isSticky: false,
    };
  }

  const [c1, c2] = commons;
  let flips = 0;
  let stays = 0;

  for (let i = 0; i < rolls.length - 1; i++) {
    const current = rolls[i];
    const next = rolls[i + 1];
    
    // Only count transitions between commons
    if (commons.includes(current) && commons.includes(next)) {
      if (current !== next) {
        flips++;
      } else {
        stays++;
      }
    }
  }

  const total = flips + stays;
  const flipRate = total > 0 ? flips / total : 0;

  return {
    flipRate,
    flips,
    stays,
    isAlternating: flipRate > 0.6, // >60% flips = alternating
    isSticky: flipRate < 0.3, // <30% flips = sticky
  };
}


/**
 * 🔍 Step 2: Detect Pattern Type among the Commons
 * 
 * Patterns:
 * 1. DOMINANCE: One common appears >60% of the time
 * 2. ALTERNATING: Commons flip back and forth
 * 3. RUN: Sequences of same value (42,42,42 then 41,41,41)
 * 4. NOISE_RECOVERY: Last roll was noise, expect snap-back
 * 5. CHAOTIC: Distribution too flat (~25% each)
 * 
 * @param {Array} rolls - Recent rolls
 * @param {Array} commons - The 2 dominant values
 * @param {Object} distribution - Frequency distribution
 * @returns {Object} { pattern, prediction, confidence, reasoning }
 */
function detectPattern(rolls, commons, distribution, isChaotic = false) {
  if (!commons || commons.length < 2 || rolls.length < 3) {
    return {
      pattern: "insufficient-data",
      prediction: null,
      confidence: 0,
      reasoning: "Not enough data to detect pattern",
    };
  }

  // 🔥 CRITICAL: If chaotic, skip prediction
  if (isChaotic) {
    return {
      pattern: "chaotic",
      prediction: null,
      confidence: 0,
      reasoning: "Distribution too flat - skipping prediction",
    };
  }

  const [common1, common2] = commons;
  const dist1 = distribution[common1]?.pct || 0;
  const dist2 = distribution[common2]?.pct || 0;

  // 🔥 ADAPTIVE: Increased lookback from 8 to 12 for better pattern detection
  const recentWindow = rolls.slice(-12);
  const lastRoll = rolls[rolls.length - 1];

  // Build transition matrix and flip analysis
  const transitionMatrix = buildTransitionMatrix(recentWindow, commons);
  const flipAnalysis = analyzeFlipPattern(recentWindow, commons);

  // 📉 Pattern 1: NOISE RECOVERY (last roll was noise) - HIGHEST PRIORITY
  const isNoise = !commons.includes(lastRoll);
  if (isNoise) {
    // 🔥 ADAPTIVE: Check if noise is forming a run (don't always snap-back)
    const last3 = recentWindow.slice(-3);
    const noiseRunLength = last3.filter(r => r === lastRoll).length;
    
    if (noiseRunLength >= 2) {
      // Noise is running - might continue
      return {
        pattern: "noise-run",
        prediction: lastRoll, // Predict noise continues
        confidence: 0.60,
        reasoning: `Noise (${lastRoll}) forming run (${noiseRunLength}x) - might continue`,
        flipAnalysis,
      };
    }
    
    // Find the most recent common before the noise
    const lastCommon = recentWindow
      .slice()
      .reverse()
      .find((r) => commons.includes(r));
    
    return {
      pattern: "noise-recovery",
      prediction: lastCommon || common1, // Snap-back to common
      confidence: 0.70,
      reasoning: `Last roll (${lastRoll}) was noise - snap-back to ${lastCommon || common1}`,
      flipAnalysis,
    };
  }

  // 🦁 Pattern 2: DOMINANCE (one common >50%) - 🔥 LOWERED from 60%
  if (dist1 > 50) {
    return {
      pattern: "dominance",
      prediction: common1,
      confidence: Math.min(0.90, 0.70 + (dist1 - 50) / 100),
      reasoning: `${common1} is dominant (${dist1.toFixed(0)}%)`,
      flipAnalysis,
    };
  }

  // 🔄 Pattern 3: ALTERNATING (flip rate >60%)
  if (flipAnalysis.isAlternating && flipAnalysis.flips >= 3) {
    const otherCommon = lastRoll === common1 ? common2 : common1;
    
    // Check transition matrix to confirm
    const lastCommonProbs = transitionMatrix[lastRoll]?.probabilities || {};
    const flipProb = lastCommonProbs[otherCommon] || 0;

    if (flipProb > 0.4) {
      return {
        pattern: "alternating",
        prediction: otherCommon, // Always a common
        confidence: Math.min(0.85, 0.70 + flipProb * 0.15),
        reasoning: `Alternating: ${lastRoll} → ${otherCommon} (flip rate: ${(flipAnalysis.flipRate * 100).toFixed(0)}%)`,
        flipAnalysis,
        transitionProb: flipProb,
      };
    }
  }

  // 🏃 Pattern 4: STICKY (stay rate >70%)
  if (flipAnalysis.isSticky && flipAnalysis.stays >= 3 && commons.includes(lastRoll)) {
    const lastCommonProbs = transitionMatrix[lastRoll]?.probabilities || {};
    const stayProb = lastCommonProbs[lastRoll] || 0;

    if (stayProb > 0.4) {
      return {
        pattern: "sticky",
        prediction: lastRoll, // Always a common
        confidence: Math.min(0.80, 0.65 + stayProb * 0.15),
        reasoning: `Sticky: ${lastRoll} repeats (stay rate: ${((1 - flipAnalysis.flipRate) * 100).toFixed(0)}%)`,
        flipAnalysis,
        transitionProb: stayProb,
      };
    }
  }

  // 🎯 Pattern 5: TRANSITION-BASED (only for commons)
  if (commons.includes(lastRoll)) {
    const lastCommonProbs = transitionMatrix[lastRoll]?.probabilities || {};
    
    // Only consider transitions to OTHER COMMONS
    const commonTransitions = Object.entries(lastCommonProbs)
      .filter(([val]) => commons.includes(val))
      .sort((a, b) => b[1] - a[1]);
    
    if (commonTransitions.length > 0 && commonTransitions[0][1] > 0.35) {
      const [nextValue, prob] = commonTransitions[0];
      return {
        pattern: "transition-based",
        prediction: nextValue, // Always a common
        confidence: Math.min(0.75, 0.60 + prob * 0.15),
        reasoning: `Transition: ${lastRoll} → ${nextValue} (${(prob * 100).toFixed(0)}%)`,
        flipAnalysis,
        transitionProb: prob,
      };
    }
  }

  // 🏃 Pattern 6: RUN-BASED (only for commons)
  if (commons.includes(lastRoll)) {
    let runLength = 1;
    for (let i = recentWindow.length - 2; i >= 0; i--) {
      if (recentWindow[i] === lastRoll) {
        runLength++;
      } else {
        break;
      }
    }

    if (runLength >= 3) {
      // Long run - expect flip to other common
      const otherCommon = lastRoll === common1 ? common2 : common1;
      return {
        pattern: "run-flip",
        prediction: otherCommon, // Always a common
        confidence: 0.68,
        reasoning: `Run of ${runLength}x ${lastRoll} - flip to ${otherCommon}`,
        flipAnalysis,
      };
    } else if (runLength >= 2) {
      // Short run - might continue
      return {
        pattern: "run-continue",
        prediction: lastRoll, // Always a common
        confidence: 0.62,
        reasoning: `Run of ${runLength}x ${lastRoll} - might continue`,
        flipAnalysis,
      };
    }
  }

  // 🎲 Default: Predict most frequent common
  return {
    pattern: "balanced",
    prediction: common1, // Always a common
    confidence: 0.58,
    reasoning: `Balanced - predicting ${common1} (${dist1.toFixed(0)}%)`,
    flipAnalysis,
  };
}

/**
 * 🦁 Main BBP Mode Predictor
 * 🦁 BBP Mode 3-Str PREDICTOR
 * Main prediction function with table analysis integration
 */
export function predictNext3BBPMode(rolls, options = {}) {
  const cleanedRolls = cleanRolls(rolls);

  if (cleanedRolls.length < 6) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      mode: "BBP-insufficient",
      pattern: "insufficient-data",
      reasoning: "Need at least 6 rolls for BBP Mode",
    };
  }

  // Step 1: Identify commons
  const { commons, noise, distribution, sortedValues, isChaotic, commonsConfidence } = identifyCommons(cleanedRolls);

  if (isChaotic) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      mode: "BBP-chaotic",
      pattern: "chaotic",
      commons: [],
      noise: [],
      distribution,
      reasoning: "Distribution too flat - skipping prediction (chaos detected)",
      isChaotic: true,
    };
  }

  // 🔥 ADAPTIVE: Single dominant mode - when only 1 value is very dominant (>60%)
  if (commons.length < 2 && sortedValues.length > 0) {
    const topValue = sortedValues[0];
    if (topValue.pct > 60) {
      return {
        prediction: topValue.value,
        alt: sortedValues[1]?.value || null,
        confidence: Math.min(0.85, 0.70 + (topValue.pct - 60) / 100),
        mode: "BBP-single-dominant",
        pattern: "single-dominant",
        commons: [topValue.value],
        noise: sortedValues.slice(1).map(v => v.value),
        distribution,
        reasoning: `Single dominant value: ${topValue.value} (${topValue.pct.toFixed(0)}%)`,
        commonsConfidence: topValue.pct / 100,
        candidates: sortedValues.map((v) => ({
          value: v.value,
          pct: Math.round(v.pct),
        })),
      };
    }
  }

  if (commons.length < 2) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      mode: "BBP-no-commons",
      pattern: "insufficient-data",
      commons,
      noise,
      distribution,
      reasoning: "Could not identify 2 valid commons",
    };
  }

  // Step 2: Detect pattern using BBP Mode logic
  const patternResult = detectPattern(cleanedRolls, commons, distribution, isChaotic);

  // Boost confidence if commons are strong
  let finalConfidence = patternResult.confidence;
  if (commonsConfidence > 0.8) {
    finalConfidence = Math.min(0.95, finalConfidence * 1.05);
  }

  // Choose alternate prediction (must be from commons)
  const altPrediction = commons.find((c) => c !== patternResult.prediction) || commons[1];

  return {
    prediction: patternResult.prediction,
    alt: altPrediction,
    confidence: finalConfidence,
    mode: "BBP-mode",
    pattern: patternResult.pattern,
    commons,
    noise,
    distribution,
    reasoning: patternResult.reasoning,
    commonsConfidence,
    candidates: sortedValues.map((v) => ({
      value: v.value,
      pct: Math.round(v.pct),
    })),
  };
}


/**
 * 🔥 NEW: Table Analysis - Visual Pattern Detection
 * Analyzes pair columns like the LiveTrackingTable
 */
function analyzeTablePattern(rolls) {
  if (rolls.length < 6) return null;
  
  const recent = rolls.slice(-12); // Last 12 rolls
  
  // Count occurrences in each pair column
  const pair4142 = recent.filter(r => r === '41' || r === '42').length;
  const pair4143 = recent.filter(r => r === '41' || r === '43').length;
  const pair4144 = recent.filter(r => r === '41' || r === '44').length;
  
  // Find dominant pair
  const pairs = [
    { name: '41/42', count: pair4142, values: ['41', '42'] },
    { name: '41/43', count: pair4143, values: ['41', '43'] },
    { name: '41/44', count: pair4144, values: ['41', '44'] }
  ];
  
  pairs.sort((a, b) => b.count - a.count);
  const dominant = pairs[0];
  
  if (dominant.count < 4) return null; // Not enough data
  
  // Analyze pattern within dominant pair
  const pairRolls = recent.filter(r => dominant.values.includes(r));
  const lastInPair = pairRolls[pairRolls.length - 1];
  
  // Check for alternating
  let alternating = true;
  for (let i = 0; i < pairRolls.length - 1; i++) {
    if (pairRolls[i] === pairRolls[i + 1]) {
      alternating = false;
      break;
    }
  }
  
  // Suggest next value
  let suggestion = null;
  let pattern = null;
  
  if (alternating && pairRolls.length >= 3) {
    // Predict opposite in pair
    suggestion = dominant.values.find(v => v !== lastInPair);
    pattern = `Alternating ${dominant.name}`;
  } else {
    // Predict most frequent in pair
    const freq = {};
    pairRolls.forEach(r => freq[r] = (freq[r] || 0) + 1);
    suggestion = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    pattern = `Dominant ${dominant.name}`;
  }
  
  return {
    suggestion,
    pattern,
    dominantPair: dominant.name,
    confidence: Math.min(95, 50 + (dominant.count / recent.length) * 50)
  };
}

export default predictNext3BBPMode;
