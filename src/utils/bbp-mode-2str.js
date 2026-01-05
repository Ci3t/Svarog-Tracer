// 🎯 Step 1: Identify the 2 Commons (Virtual Column A) and Noise (Virtual Column B)
import { predictWithPairs } from './pairTransitionPredictor';

/**
 * Clean raw rolls into 2-digit strings in [41-44]
 */
function cleanRolls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).replace(/[^1-4]/g, ""))
    .filter((r) => r.length === 2 && r[0] === "4"); // Must be 4x format
}

/**
 * 🎯 Step 1: Identify the 2 Commons (Virtual Column A) and Noise (Virtual Column B)
 * 
 * @param {Array} rolls - Array of 2-str rolls ["41", "42", "41", "42", "44", ...]
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

  // 📉 Pattern 1: WAVE DETECTION (noise values alternating) - NEW!
  const isNoise = !commons.includes(lastRoll);
  if (isNoise) {
    // 🔥 NEW: Check if noise is forming an alternating wave pattern
    const last5 = recentWindow.slice(-5);
    const noiseValues = last5.filter(r => !commons.includes(r));
    
    // 🔥 IMPORTANT: Waves are SHORT (1-3 flips). If 4+, it's a transition!
    if (noiseValues.length >= 4) {
      // Too many noise flips - this is a transition, not a wave
      // Skip prediction and let commons re-detection handle it
      return {
        pattern: "transition",
        prediction: null,
        confidence: 0,
        reasoning: `Too many noise flips (${noiseValues.length}) - pattern transitioning`,
        flipAnalysis,
      };
    }
    
    // If we have 2+ noise values, check if they're alternating
    if (noiseValues.length >= 2) {
      const uniqueNoise = [...new Set(noiseValues)];
      
      // Check if noise alternates between 2 values (e.g., 41 → 44 → 41)
      if (uniqueNoise.length === 2) {
        let isAlternating = true;
        for (let i = 0; i < noiseValues.length - 1; i++) {
          if (noiseValues[i] === noiseValues[i + 1]) {
            isAlternating = false;
            break;
          }
        }
        
        if (isAlternating) {
          // Wave detected! Predict based on flip count
          const otherNoise = uniqueNoise.find(v => v !== lastRoll);
          
          // After 3 flips, expect snap-back to common (wave ending)
          if (noiseValues.length >= 3) {
            // Find most recent common before wave
            const lastCommon = recentWindow
              .slice()
              .reverse()
              .find((r) => commons.includes(r));
            
            return {
              pattern: "wave-ending",
              prediction: lastCommon || commons[0],
              confidence: 0.68,
              reasoning: `Wave (${uniqueNoise.join('↔')}) ending after ${noiseValues.length} flips - snap to ${lastCommon || commons[0]}`,
              flipAnalysis,
            };
          } else {
            // 1-2 flips: Continue the wave
            return {
              pattern: "wave",
              prediction: otherNoise,
              confidence: 0.65,
              reasoning: `Wave detected (${uniqueNoise.join('↔')}) - continuing to ${otherNoise}`,
              flipAnalysis,
            };
          }
        }
      }
    }
    
    // 🔥 Check if noise is forming a run (don't always snap-back)
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
      prediction: lastCommon || commons[0], // Snap-back to common
      confidence: 0.70,
      reasoning: `Last roll (${lastRoll}) was noise - snap-back to ${lastCommon || commons[0]}`,
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

    // 🔥 ADJUSTED: Match Kiyo behavior - dominance runs last 4-8 hits
    if (runLength >= 8) {
      // Very long run (8+) - expect flip to other common
      const otherCommon = lastRoll === common1 ? common2 : common1;
      return {
        pattern: "run-flip",
        prediction: otherCommon, // Always a common
        confidence: 0.75,
        reasoning: `Long run of ${runLength}x ${lastRoll} - flip to ${otherCommon}`,
        flipAnalysis,
      };
    } else if (runLength >= 4) {
      // Dominance run (4-7) - continue predicting same value
      return {
        pattern: "dominance-run",
        prediction: lastRoll, // Always a common
        confidence: 0.72,
        reasoning: `Dominance run of ${runLength}x ${lastRoll} - continuing`,
        flipAnalysis,
      };
    } else if (runLength >= 2) {
      // Short run (2-3) - might continue
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
 * 🔥 ENHANCED: Identify Commons with Weighted Recent Rolls
 * Recent rolls get higher weight for faster adaptation
 * 
 * @param {Array} rolls - Array of rolls
 * @param {Number} windowSize - How many recent rolls to prioritize (default 20)
 * @returns {Object} Enhanced commons data with stability metrics
 */
function identifyCommonsWeighted(rolls, windowSize = 20) {
  if (!rolls || rolls.length < 3) {
    return identifyCommons(rolls);
  }

  // Use sliding window for recent rolls
  const recentRolls = rolls.slice(-windowSize);
  
  // Weight calculation: recent rolls get 2x weight
  const weightedFreq = {};
  
  rolls.forEach((roll, idx) => {
    const isRecent = idx >= rolls.length - 5; // Last 5 rolls
    const weight = isRecent ? 2 : 1;
    weightedFreq[roll] = (weightedFreq[roll] || 0) + weight;
  });

  // Calculate total weight
  const totalWeight = Object.values(weightedFreq).reduce((sum, w) => sum + w, 0);

  // Sort by weighted frequency
  const sorted = Object.entries(weightedFreq)
    .map(([value, weight]) => ({
      value,
      weight,
      pct: (weight / totalWeight) * 100,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Get commons (top 2 with >15% weighted frequency)
  const validCommons = sorted.filter(x => x.pct > 15);
  
  if (validCommons.length < 2) {
    return identifyCommons(rolls); // Fallback to regular
  }

  const commons = validCommons.slice(0, 2).map(x => x.value);
  const noise = sorted.slice(2).map(x => x.value);

  // Calculate commons stability (how consistent are they)
  const commonsInRecent = recentRolls.filter(r => commons.includes(r)).length;
  const stability = commonsInRecent / recentRolls.length;

  return {
    commons,
    noise,
    distribution: Object.fromEntries(sorted.map(x => [x.value, { count: x.weight, pct: x.pct }])),
    totalRolls: rolls.length,
    isChaotic: stability < 0.5,
    commonsConfidence: Math.min(0.95, stability),
    sortedValues: sorted,
    stability, // 0-1 score
    recentWindow: recentRolls,
  };
}

/**
 * 🌊 WAVE FLIP DETECTION
 * Predicts when commons are about to change
 * 
 * @param {Array} rolls - Array of rolls
 * @param {Array} currentCommons - Current commons
 * @param {Array} currentNoise - Current noise
 * @returns {Object|null} Wave flip warning or null
 */
function detectWaveFlip(rolls, currentCommons, currentNoise) {
  if (!rolls || rolls.length < 10 || !currentCommons || currentCommons.length < 2) {
    return null;
  }

  const recent10 = rolls.slice(-10);
  const recent5 = rolls.slice(-5);

  // Count commons vs noise in recent windows
  const commonsIn10 = recent10.filter(r => currentCommons.includes(r)).length;
  const commonsIn5 = recent5.filter(r => currentCommons.includes(r)).length;
  
  const noiseIn10 = recent10.filter(r => currentNoise.includes(r)).length;
  const noiseIn5 = recent5.filter(r => currentNoise.includes(r)).length;

  // Calculate trend
  const commonsTrend = (commonsIn5 / 5) - (commonsIn10 / 10);
  const noiseTrend = (noiseIn5 / 5) - (noiseIn10 / 10);

  // FLIP WARNING: Commons declining AND noise rising
  if (commonsTrend < -0.2 && noiseTrend > 0.2) {
    // Find which noise values are rising
    const noiseFreq = {};
    currentNoise.forEach(n => {
      noiseFreq[n] = recent5.filter(r => r === n).length;
    });

    const risingNoise = Object.entries(noiseFreq)
      .filter(([_, count]) => count >= 2)
      .map(([value]) => value);

    if (risingNoise.length > 0) {
      // Predict new commons will be: 1 current common + 1 rising noise
      const stableCommon = currentCommons.find(c => 
        recent5.filter(r => r === c).length >= 2
      ) || currentCommons[0];

      const newCommons = [stableCommon, risingNoise[0]];

      return {
        warning: true,
        probability: Math.min(0.9, Math.abs(commonsTrend) + noiseTrend),
        rollsUntil: 2, // Estimate 2-3 rolls
        currentCommons,
        predictedNewCommons: newCommons,
        reason: `Commons declining (${(commonsIn5/5*100).toFixed(0)}% in last 5 vs ${(commonsIn10/10*100).toFixed(0)}% in last 10), Noise rising`,
      };
    }
  }

  // STABILITY CHECK: Commons very stable
  if (commonsIn10 >= 7) {
    return {
      warning: false,
      stable: true,
      stability: commonsIn10 / 10,
      reason: `Commons stable (${commonsIn10}/10 recent rolls)`,
    };
  }

  return null;
}

/**
 * 📊 CALCULATE PATTERN STRENGTH
 * How strong/reliable is the detected pattern
 * 
 * @param {String} patternType - ALT, RUN, DOM, etc.
 * @param {Array} rolls - Recent rolls
 * @param {Array} commons - Commons values
 * @returns {Number} Strength 0-100
 */
function calculatePatternStrength(patternType, rolls, commons) {
  if (!rolls || rolls.length < 5 || !commons || commons.length < 2) {
    return 0;
  }

  const recent10 = rolls.slice(-10);
  const commonsRolls = recent10.filter(r => commons.includes(r));

  // Base strength = commons rate
  const commonsRate = commonsRolls.length / recent10.length;
  let strength = commonsRate * 100;

  // Boost for specific patterns
  if (patternType === 'alternating') {
    // Check if actually alternating
    let alternations = 0;
    for (let i = 1; i < commonsRolls.length; i++) {
      if (commonsRolls[i] !== commonsRolls[i-1]) {
        alternations++;
      }
    }
    const altRate = alternations / (commonsRolls.length - 1);
    strength = strength * (0.5 + altRate * 0.5); // Boost if truly alternating
  } else if (patternType === 'run') {
    // Check for run consistency
    let runs = 0;
    let currentRun = 1;
    for (let i = 1; i < commonsRolls.length; i++) {
      if (commonsRolls[i] === commonsRolls[i-1]) {
        currentRun++;
      } else {
        if (currentRun >= 2) runs++;
        currentRun = 1;
      }
    }
    const runRate = runs / (commonsRolls.length / 3);
    strength = strength * (0.5 + runRate * 0.5);
  } else if (patternType === 'dominance') {
    // Already strong if one common dominates
    strength = Math.min(100, strength * 1.2);
  }

  return Math.round(Math.min(100, Math.max(0, strength)));
}

/**
 * 🎯 GET PATTERN SEQUENCE
 * Show last 4 commons in sequence
 * 
 * @param {Array} rolls - All rolls
 * @param {Array} commons - Commons values
 * @returns {String} Sequence like "41→43→41→43"
 */
function getPatternSequence(rolls, commons) {
  if (!rolls || !commons || commons.length < 2) {
    return "";
  }

  const commonsOnly = rolls.filter(r => commons.includes(r)).slice(-4);
  return commonsOnly.join("→");
}


/**
 * 🦁 Main BBP Mode Predictor
 * 🦁 BBP Mode 2-STR PREDICTOR
 * Main prediction function with table analysis integration
 */
export function predictNext2BBPMode(rolls, options = {}) {
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

  // Step 1: Identify commons (using weighted recent rolls for better accuracy)
  const commonsData = identifyCommonsWeighted(cleanedRolls);
  const { commons, noise, distribution, sortedValues, isChaotic, commonsConfidence, stability } = commonsData;

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
  
  // 🔥 NEW: Calculate pattern strength
  const patternStrength = calculatePatternStrength(patternResult.pattern, cleanedRolls, commons);
  
  // 🔥 NEW: Get pattern sequence
  const patternSequence = getPatternSequence(cleanedRolls, commons);
  
  // 🌊 NEW: Detect wave flip
  const waveFlipData = detectWaveFlip(cleanedRolls, commons, noise);

  // 🔥 NEW: Step 3 - Table Analysis Integration (Visual Pattern Detection)
  const tableAnalysis = analyzeTablePattern(cleanedRolls, commons);
  
  let finalPrediction = patternResult.prediction;
  let finalConfidence = patternResult.confidence;
  let finalReasoning = patternResult.reasoning;

  if (tableAnalysis && tableAnalysis.suggestion) {
    // Check if table analysis agrees with BBP Mode
    if (tableAnalysis.suggestion === patternResult.prediction) {
      // 🎯 AGREEMENT: Boost confidence!
      finalConfidence = Math.min(0.95, finalConfidence * 1.1); // +10% boost
      finalReasoning += ` | Table confirms: ${tableAnalysis.pattern}`;
    } else {
      // ⚠️ DISAGREEMENT: Check which is more recent/reliable
      const tableConf = tableAnalysis.confidence / 100;
      
      // If table analysis is significantly more confident AND based on recent data
      if (tableConf > finalConfidence + 0.15) {
        // Switch to table's suggestion
        finalPrediction = tableAnalysis.suggestion;
        finalConfidence = tableConf * 0.9; // Slight penalty for override
        finalReasoning = `Table override: ${tableAnalysis.pattern} (stronger signal)`;
      } else {
        // Keep BBP Mode but lower confidence due to conflict
        finalConfidence = finalConfidence * 0.85; // -15% penalty
        finalReasoning += ` | Table suggests ${tableAnalysis.suggestion} (conflict)`;
      }
    }
  }

  // 🔥 NEW: Step 4 - Trend-Based Adjustment
  // Calculate trend for the predicted value
  const mid = Math.floor(cleanedRolls.length / 2);
  const firstHalf = cleanedRolls.slice(0, mid);
  const secondHalf = cleanedRolls.slice(mid);
  
  const predFirstHalf = firstHalf.filter(r => r === finalPrediction).length;
  const predSecondHalf = secondHalf.filter(r => r === finalPrediction).length;
  
  let trendAdjustment = 0;
  let trendNote = '';
  
  if (predSecondHalf > predFirstHalf * 1.5) {
    // Rising trend - boost confidence
    trendAdjustment = 0.08; // +8%
    trendNote = ` | ${finalPrediction} rising (trend boost)`;
  } else if (predSecondHalf < predFirstHalf * 0.5) {
    // Falling trend - reduce confidence
    trendAdjustment = -0.12; // -12%
    trendNote = ` | ${finalPrediction} falling (trend penalty)`;
  }
  
  if (trendAdjustment !== 0) {
    finalConfidence = Math.max(0.3, Math.min(0.95, finalConfidence + trendAdjustment));
    finalReasoning += trendNote;
  }

  // Boost confidence if commons are strong
  if (commonsConfidence > 0.8) {
    finalConfidence = Math.min(0.95, finalConfidence * 1.05);
  }
  
  // 🔥 FIX: Be more conservative with new patterns (prevent 100% confidence too early)
  const rollCount = cleanedRolls.length;
  if (rollCount < 10) {
    // New session - reduce confidence significantly
    finalConfidence = Math.min(finalConfidence * 0.65, 0.70);
    finalReasoning += ' (new session - low confidence)';
  } else if (rollCount < 15 && commonsConfidence > 0.7) {
    // Pattern emerging but not locked - moderate reduction
    finalConfidence = Math.min(finalConfidence * 0.80, 0.80);
    finalReasoning += ' (emerging pattern)';
  }

  // Choose alternate prediction (must be different from main)
  let altPrediction = commons.find((c) => c !== finalPrediction);
  // If no other common exists, use the highest noise value
  if (!altPrediction || altPrediction === finalPrediction) {
    altPrediction = noise[0] || commons[0];
  }

  // 🎯 MARK MODE: Calculate pattern stability
  const last8Rolls = cleanedRolls.slice(-8);
  const waveIntensity = calculateWaveIntensity(last8Rolls, commons);
  const csi = calculateCSI(last8Rolls, commons, distribution);
  const ntl = calculateNTL(last8Rolls, commons, noise, distribution);
  
  // Detect absent values (values that haven't appeared recently)
  const absences = detectAbsentValues(cleanedRolls);
  
  // Calculate recent accuracy (approximation based on pattern confidence)
  const recentAccuracy = finalConfidence;
  const pc = calculatePC(last8Rolls, patternResult.pattern, recentAccuracy, waveIntensity);
  
  // Determine MARK state
  const markState = determineMARKState(csi, ntl, pc, waveIntensity, absences);
  const markSignals = generateMARKSignals(csi, ntl, pc, waveIntensity, commons, noise, distribution, absences);
  const markRecommendation = getMARKRecommendation(markState, finalPrediction, commons);
  
  // Calculate overall stability score (weighted average of CSI, NTL, PC)
  const stabilityScore = Math.round((csi * 0.4) + ((100 - ntl) * 0.3) + (pc * 0.3));
  
  // Adjust confidence based on MARK state
  const markAdjustedConfidence = adjustConfidenceForMARK(finalConfidence, markState);

  // 🎯 MEAN REVERSION: Add absent values to candidates if they're likely to reappear
  const candidatesList = sortedValues.map((v) => ({
    value: v.value,
    pct: Math.round(v.pct),
  }));
  
  // Check for mean reversion candidates (underrepresented values)
  absences.forEach(absence => {
    // If value is absent and underrepresented, add it to candidates with special flag
    const alreadyInCandidates = candidatesList.find(c => c.value === absence.value);
    if (!alreadyInCandidates) {
      candidatesList.push({
        value: absence.value,
        pct: Math.round(absence.frequency),
        meanReversion: true, // Flag to indicate this is a mean reversion candidate
        rollsSince: absence.rollsSinceAppearance
      });
    } else if (alreadyInCandidates && absence.frequency < 20) {
      // Mark existing candidate as mean reversion if underrepresented
      alreadyInCandidates.meanReversion = true;
      alreadyInCandidates.rollsSince = absence.rollsSinceAppearance;
    }
  });
  

  
  // Sort candidates: commons first, then mean reversion candidates
  candidatesList.sort((a, b) => {
    // If both or neither are mean reversion, sort by percentage
    if (a.meanReversion === b.meanReversion) {
      return b.pct - a.pct;
    }
    // Commons (non-mean-reversion) come first
    return a.meanReversion ? 1 : -1;
  });

  // 🔥 FIX: Use user-friendly mode name based on actual pattern
  let userFriendlyMode = "BBP-mode";
  
  // Map technical patterns to simple user-friendly names
  if (waveIntensity >= 2) {
    userFriendlyMode = "Wave"; // Pattern is unstable/flipping
  } else if (patternResult.pattern === "alternating") {
    userFriendlyMode = "Alternating";
  } else if (patternResult.pattern === "dominance" || patternResult.pattern === "dominance-run") {
    userFriendlyMode = "Dominance";
  } else if (patternResult.pattern === "run-continue") {
    userFriendlyMode = "Run";
  } else if (patternResult.pattern === "noise-recovery") {
    userFriendlyMode = "Noise-Recovery";
  } else if (patternResult.pattern === "balanced") {
    userFriendlyMode = "Balanced";
  }

  // 🔥 KIYO ENHANCEMENT: Use SUGGEST logic for the final prediction
  // This takes the results from suggest logic (80% accuracy) but keeps Kiyo reasoning
  const suggest = predictWithPairs(cleanedRolls);
  finalPrediction = suggest.prediction || patternResult.prediction;
  altPrediction = suggest.alt || patternResult.alt;
  finalConfidence = suggest.confidence || markAdjustedConfidence;

  return {
    prediction: finalPrediction,
    alt: altPrediction,
    confidence: suggest.confidence ? Math.max(suggest.confidence, markAdjustedConfidence) : markAdjustedConfidence, 
    baseConfidence: suggest.confidence || finalConfidence, 
    mode: suggest.method ? `BBP-${suggest.method}` : userFriendlyMode, 
    kiyoMode: userFriendlyMode, // Keep original for reference
    kiyoReasoning: finalReasoning,
    suggestMethod: suggest.method,
    pattern: patternResult.pattern,
    commons,
    noise,
    distribution,
    reasoning: finalReasoning,
    commonsConfidence,
    tableAnalysis, // Include for debugging
    candidates: candidatesList,
    // 🔥 NEW: Enhanced pattern data
    patternStrength, // 0-100 score
    patternSequence, // e.g., "41→43→41→43"
    commonsStability: stability, // 0-1 score from weighted detection
    // 🌊 NEW: Wave flip detection
    waveFlipData, // null or {warning, probability, rollsUntil, predictedNewCommons}
    // 🎯 MARK Mode data
    markData: {
      state: markState,
      stabilityScore,
      csi,
      ntl,
      pc,
      waveIntensity,
      absences, // Values that haven't appeared recently
      signals: markSignals,
      recommendation: markRecommendation,
    },
  };
}

/**
 * 🔥 FIXED: Table Analysis - Visual Pattern Detection
 * Analyzes ALL pair columns, not just 41-based pairs
 */
function analyzeTablePattern(rolls, commons = []) {
  if (rolls.length < 6) return null;
  
  const recent = rolls.slice(-12); // Last 12 rolls
  
  // 🔥 FIX: Analyze ALL possible pairs, not just 41-based
  const allPairs = [
    { name: '41/42', values: ['41', '42'] },
    { name: '41/43', values: ['41', '43'] },
    { name: '41/44', values: ['41', '44'] },
    { name: '42/43', values: ['42', '43'] },
    { name: '42/44', values: ['42', '44'] },
    { name: '43/44', values: ['43', '44'] },
  ];
  
  // Count occurrences for each pair
  const pairStats = allPairs.map(pair => ({
    ...pair,
    count: recent.filter(r => pair.values.includes(r)).length,
    isCommonsPair: commons.length >= 2 && 
                   pair.values.includes(commons[0]) && 
                   pair.values.includes(commons[1])
  }));
  
  // 🔥 FIX: Prioritize commons pair if it exists
  const commonsPair = pairStats.find(p => p.isCommonsPair);
  const sortedPairs = pairStats.sort((a, b) => {
    // Commons pair gets priority boost
    if (a.isCommonsPair && !b.isCommonsPair) return -1;
    if (b.isCommonsPair && !a.isCommonsPair) return 1;
    return b.count - a.count;
  });
  
  const dominant = sortedPairs[0];
  
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
  
  // 🔥 FIX: If suggestion is a noise value but commons exist, prefer commons
  if (suggestion && commons.length >= 2 && !commons.includes(suggestion)) {
    // Suggestion is noise - check if we should override
    const suggestionInPair = dominant.values.includes(suggestion);
    const commonsInPair = dominant.values.filter(v => commons.includes(v));
    
    if (commonsInPair.length > 0) {
      // There's a common in this pair - use it instead of noise
      suggestion = commonsInPair[0];
      pattern += ' (commons-adjusted)';
    }
  }
  
  return {
    suggestion,
    pattern,
    dominantPair: dominant.name,
    isCommonsPair: dominant.isCommonsPair,
    confidence: Math.min(95, 50 + (dominant.count / recent.length) * 50)
  };
}

/**
 * 🎯 MARK MODE: Pattern Stability Detection
 * Inspired by Clara/Svarog's "Mark of Counter" mechanic
 */

/**
 * Calculate Wave Intensity - count flips between commons and noise
 */
function calculateWaveIntensity(rolls, commons) {
  if (!rolls || rolls.length < 2) return 0;
  
  let flips = 0;
  for (let i = 0; i < rolls.length - 1; i++) {
    const currentIsCommon = commons.includes(rolls[i]);
    const nextIsCommon = commons.includes(rolls[i + 1]);
    if (currentIsCommon !== nextIsCommon) {
      flips++;
    }
  }
  return flips;
}

/**
 * Calculate Commons Stability Index (CSI)
 * Measures how stable the current commons are
 */
function calculateCSI(rolls, commons, distribution) {
  if (!commons || commons.length < 2) return 0;
  
  // 1. Common Stability: How long have commons been stable?
  let stabilityRolls = 0;
  const recentCommons = new Set(commons);
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (recentCommons.has(rolls[i])) {
      stabilityRolls++;
    } else {
      break;
    }
  }
  const commonStability = Math.min(100, (stabilityRolls / 8) * 100);
  
  // 2. Common Frequency: How dominant are they?
  const commonsPct = commons.reduce((sum, c) => {
    return sum + (distribution[c]?.pct || 0);
  }, 0);
  const commonFrequency = Math.min(100, commonsPct);
  
  // 3. Common Trend: Are they rising, stable, or falling?
  const recent3 = rolls.slice(-3);
  const prev3 = rolls.slice(-6, -3);
  
  let trendScore = 60; // Default: stable
  commons.forEach(common => {
    const recentCount = recent3.filter(r => r === common).length;
    const prevCount = prev3.filter(r => r === common).length;
    
    if (recentCount > prevCount) trendScore += 10; // Rising
    else if (recentCount < prevCount) trendScore -= 20; // Falling
  });
  const commonTrend = Math.max(0, Math.min(100, trendScore));
  
  // Weighted average - prioritize frequency (how dominant) over stability (how long)
  // If commons are 60%+, CSI should be high even if they just became commons
  return Math.round(
    (commonStability * 0.2) + (commonFrequency * 0.5) + (commonTrend * 0.3)
  );
}

/**
 * Calculate Noise Threat Level (NTL)
 * Measures if noise values are rising and threatening commons
 */
function calculateNTL(rolls, commons, noise, distribution) {
  if (!noise || noise.length === 0) return 0;
  
  const recent3 = rolls.slice(-3);
  const prev3 = rolls.slice(-6, -3);
  
  // 1. Rising Noise Count: How many noise values are rising?
  let risingCount = 0;
  noise.forEach(n => {
    const recentCount = recent3.filter(r => r === n).length;
    const prevCount = prev3.filter(r => r === n).length;
    if (recentCount > prevCount) risingCount++;
  });
  const risingNoiseCount = (risingCount / noise.length) * 100;
  
  // 2. Rising Noise Velocity: How fast are they rising?
  let totalVelocity = 0;
  noise.forEach(n => {
    const recentCount = recent3.filter(r => r === n).length;
    const prevCount = prev3.filter(r => r === n).length;
    totalVelocity += (recentCount - prevCount) / 3;
  });
  const risingNoiseVelocity = Math.min(100, Math.abs(totalVelocity) * 100);
  
  // 3. Noise Frequency Gap: How close are noise values to commons?
  const commonsPct = commons.reduce((sum, c) => sum + (distribution[c]?.pct || 0), 0) / commons.length;
  const noisePct = noise.reduce((sum, n) => sum + (distribution[n]?.pct || 0), 0) / noise.length;
  const gap = commonsPct - noisePct;
  const noiseFrequencyGap = gap < 20 ? 100 : Math.max(0, 100 - gap);
  
  // Weighted average
  return Math.round(
    (risingNoiseCount * 0.5) + (risingNoiseVelocity * 0.3) + (noiseFrequencyGap * 0.2)
  );
}

/**
 * Calculate Pattern Coherence (PC)
 * Measures if there's a clear, predictable pattern
 */
function calculatePC(rolls, patternType, recentAccuracy, waveIntensity) {
  // 1. Pattern Type Score
  const patternScores = {
    'dominant': 90,
    'dominance-run': 85,
    'alternating': 80,
    'run': 75,
    'wave': 60,
    'wave-ending': 55,
    'transition': 30,
    'noise-recovery': 50,
    'default': 40
  };
  const patternTypeScore = patternScores[patternType] || patternScores['default'];
  
  // 2. Pattern Consistency (how many recent rolls follow the pattern)
  // This is approximated by recent accuracy
  const patternConsistency = recentAccuracy * 100;
  
  // 3. Wave penalty (high wave = low coherence)
  const wavePenalty = Math.max(0, 100 - (waveIntensity * 15));
  
  // Weighted average
  return Math.round(
    (patternTypeScore * 0.3) + (patternConsistency * 0.4) + (wavePenalty * 0.3)
  );
}

/**
 * Detect absent values (values that haven't appeared recently and might be due)
 */
function detectAbsentValues(rolls, allValues = ['41', '42', '43', '44']) {
  // Only look at recent rolls (last 12) for absence detection
  const recentWindow = 12;
  const recentRolls = rolls.slice(-recentWindow);
  
  if (recentRolls.length < 8) {
    return []; // Not enough data
  }
  
  const absences = [];
  
  // Count frequency of each value in recent window
  const freq = {};
  recentRolls.forEach(r => {
    freq[r] = (freq[r] || 0) + 1;
  });
  
  
  allValues.forEach(value => {
    const count = freq[value] || 0;
    const pct = (count / recentRolls.length) * 100;
    
    // Find last occurrence
    let lastIndex = -1;
    for (let i = recentRolls.length - 1; i >= 0; i--) {
      if (recentRolls[i] === value) {
        lastIndex = i;
        break;
      }
    }
    
    const rollsSince = lastIndex === -1 ? recentRolls.length : (recentRolls.length - 1 - lastIndex);
    

    
    // Show warnings for underrepresented values (<18%) that haven't appeared in 3+ rolls
    // This catches mean reversion candidates (values below expected 25%)
    if (pct < 18 && rollsSince >= 3) {
      absences.push({ value, rollsSinceAppearance: rollsSince, frequency: pct, severity: 'high' });
    }
  });
  

  
  return absences;
}

/**
 * Determine MARK State based on CSI, NTL, PC
 */
function determineMARKState(csi, ntl, pc, waveIntensity, absences = []) {
  // 🟢 LOCKED: Pattern stable, high confidence
  if (csi >= 70 && ntl <= 30 && pc >= 70) {
    return 'LOCKED';
  }
  
  // 🟡 WATCH: Pattern locked but noise rising (early warning)
  if (csi >= 70 && ntl > 30 && ntl <= 60 && pc >= 50) {
    return 'WATCH';
  }
  
  // 🟡 WATCH: Commons stable, pattern emerging
  if (csi >= 50 && ntl <= 30 && pc >= 50) {
    return 'WATCH';
  }
  
  // 🟡 UNCERTAIN: Multiple patterns competing
  if (csi >= 50 && ntl > 30 && ntl <= 60 && pc >= 50) {
    return 'UNCERTAIN';
  }
  
  // 🟢 RECOVERY CHECK: If commons are strong (CSI >= 60) and noise is low (NTL <= 40),
  // pattern has recovered even if there were recent waves
  if (csi >= 60 && ntl <= 40 && pc >= 50) {
    return 'WATCH'; // Pattern recovering, safe to bet with caution
  }
  
  // 🟠 COUNTER: Pattern shifting (high noise threat or high wave)
  // Increased wave threshold from 4 to 5, and check if commons haven't recovered
  if ((ntl > 60 || waveIntensity >= 5) && csi < 60) {
    return 'COUNTER';
  }
  
  // 🟡 UNCERTAIN: Moderate wave activity but commons still present
  if (waveIntensity >= 4 && csi >= 50) {
    return 'UNCERTAIN';
  }
  
  // 🔴 CHAOS: No clear pattern
  if (csi < 50 && pc < 50) {
    return 'CHAOS';
  }
  
  // Default: UNCERTAIN
  return 'UNCERTAIN';
}

/**
 * Generate MARK signals (warnings/explanations)
 */
function generateMARKSignals(csi, ntl, pc, waveIntensity, commons, noise, distribution, absences = []) {
  const signals = [];
  
  // Absence warnings (HIGHEST PRIORITY - these are actionable!)
  if (absences && absences.length > 0) {
    absences.forEach(absence => {
      if (absence.severity === 'high') {
        signals.push(`${absence.value} very rare (${absence.frequency?.toFixed(0) || '0'}%) - may reappear soon`);
      } else if (absence.severity === 'medium') {
        signals.push(`${absence.value} uncommon (${absence.frequency?.toFixed(0) || '0'}%) - watch for return`);
      }
    });
  }
  
  // 🔥 ENHANCED: Wave flip warnings with clear predictions
  if (waveIntensity >= 4) {
    signals.push('⚠️ PATTERN BREAKING - Too many flips! Wait 2-3 rolls for new pattern');
  } else if (waveIntensity >= 2) {
    // More detailed warning with prediction
    const risingNoise = noise.filter(n => {
      const recent = distribution[n]?.pct || 0;
      return recent > 15;
    });
    
    if (risingNoise.length > 0) {
      // Predict new commons
      const stableCommon = commons[0]; // Most frequent common
      const newCommon = risingNoise[0]; // Rising noise
      signals.push(`⚠️ WAVE FLIP DETECTED - ${waveIntensity} flips! Next commons likely: ${stableCommon}, ${newCommon}`);
    } else {
      signals.push(`⚠️ Pattern unstable - ${waveIntensity} flips detected. Wait for stabilization`);
    }
  }
  
  // 🔥 ENHANCED: Noise rising warnings with clear action
  if (ntl > 60) {
    const risingNoise = noise.filter(n => {
      const recent = distribution[n]?.pct || 0;
      return recent > 15;
    });
    if (risingNoise.length > 0) {
      const currentPct = risingNoise.map(n => `${n}(${distribution[n]?.pct?.toFixed(0) || 0}%)`).join(', ');
      signals.push(`🔄 ${risingNoise.join(', ')} rising to ${currentPct} - Will become new commons in 2-3 rolls`);
    }
  }
  
  // Commons warnings - only show if CSI is very low
  if (csi < 40) {
    signals.push('⚠️ Commons unclear - Pattern changing, skip betting until stable');
  }
  
  // Pattern warnings
  if (pc < 50) {
    signals.push('❌ No clear pattern - Too random, skip this session');
  }
  
  return signals;
}

/**
 * Get MARK recommendation based on state
 */
function getMARKRecommendation(markState, prediction, commons) {
  const commonsStr = commons ? commons.join(' or ') : 'commons';
  
  const recommendations = {
    'LOCKED': `✅ Predict ${prediction} - Pattern is stable and reliable`,
    'WATCH': `⚠️ Predict ${prediction} - Pattern weakening, bet carefully`,
    'UNCERTAIN': `🎲 Predict ${commonsStr} - Use trash relics, multiple patterns active`,
    'COUNTER': `⛔ Skip this roll - Pattern is shifting, too risky`,
    'CHAOS': `🚫 Skip this roll - No clear pattern detected`
  };
  return recommendations[markState] || recommendations['UNCERTAIN'];
}

/**
 * Adjust confidence based on MARK state
 */
function adjustConfidenceForMARK(baseConfidence, markState) {
  const multipliers = {
    'LOCKED': 1.0,
    'WATCH': 0.9,
    'UNCERTAIN': 0.6,
    'COUNTER': 0.5,
    'CHAOS': 0.3
  };
  // 🔥 FIX: Return decimal (0-1), not rounded integer
  return baseConfidence * (multipliers[markState] || 0.6);
}

export default predictNext2BBPMode;
