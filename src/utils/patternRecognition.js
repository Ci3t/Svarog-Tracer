/**
 * 🎯 ADAPTIVE PATTERN RECOGNITION SYSTEM
 * Based on expert wave theory approach
 * 
 * Key Features:
 * - Historical flip frequency tracking
 * - Probability limits detection
 * - Pattern memory and descriptions
 * - Noise tolerance (1-2 outliers acceptable)
 * 
 * Examples:
 * - L L H H L L H H → Pattern: flip every 2
 * - L H L H L H → Pattern: flip every 1 (alternating)
 * - L L L H H H L L L → Pattern: flip every 3
 * - L L H H L L H L L L → Pattern: flip every 2 (1 noise tolerated)
 */

/**
 * Calculate historical flip frequency for a column
 * @param {Array} states - Historical states array
 * @param {Number} lookback - How far back to analyze (default: 20)
 * @returns {Object} Historical analysis
 */
function calculateHistoricalFlipFrequency(states, lookback = 20) {
  if (states.length < 6) {
    return { avgFlipFrequency: null, valid: false };
  }

  const window = states.slice(-Math.min(lookback, states.length));
  const runs = [];
  let currentRun = { value: window[0], length: 1 };
  
  for (let i = 1; i < window.length; i++) {
    if (window[i] === currentRun.value) {
      currentRun.length++;
    } else {
      runs.push(currentRun);
      currentRun = { value: window[i], length: 1 };
    }
  }
  runs.push(currentRun);

  const avgFlipFrequency = runs.length > 0 
    ? runs.reduce((sum, r) => sum + r.length, 0) / runs.length
    : null;

  return {
    avgFlipFrequency: avgFlipFrequency ? Math.round(avgFlipFrequency * 10) / 10 : null,
    valid: runs.length >= 3,
    totalRuns: runs.length,
    description: avgFlipFrequency 
      ? `Flips every ${Math.round(avgFlipFrequency)} roll(s) on average`
      : 'Insufficient data'
  };
}

/**
 * Detect run-based patterns (e.g., L L H H L L H H)
 * @param {Array} states - Array of 'A' or 'B' states
 * @param {Object} historical - Historical flip frequency data
 * @returns {Object} Pattern analysis
 */
function detectRunPattern(states, historical = null) {
  if (states.length < 6) {
    return { valid: false, pattern: null, confidence: 0 };
  }

  // Find all runs (consecutive same values)
  const runs = [];
  let currentRun = { value: states[0], length: 1 };
  
  for (let i = 1; i < states.length; i++) {
    if (states[i] === currentRun.value) {
      currentRun.length++;
    } else {
      runs.push(currentRun);
      currentRun = { value: states[i], length: 1 };
    }
  }
  runs.push(currentRun);

  // Analyze run lengths
  const runLengths = runs.map(r => r.length);
  const avgRunLength = runLengths.reduce((a, b) => a + b, 0) / runLengths.length;
  
  // Check for consistent pattern (with noise tolerance)
  const mostCommonRunLength = getMostCommon(runLengths);
  const consistencyRate = runLengths.filter(l => 
    Math.abs(l - mostCommonRunLength) <= 1 // Allow ±1 noise
  ).length / runLengths.length;

  // Pattern is valid if 70%+ of runs match the pattern (tolerates noise)
  const isValid = consistencyRate >= 0.70;
  
  return {
    valid: isValid,
    pattern: mostCommonRunLength, // e.g., 2 means "flip every 2"
    confidence: consistencyRate,
    avgRunLength,
    historical: historical || null,
    currentRunLength: currentRun.length,
    runsAnalyzed: runs.length,
    noise: 1 - consistencyRate, // How much noise in the pattern
  };
}

/**
 * Calculate pattern noise level
 * @param {Array} states - Array of states
 * @param {Number} expectedPattern - Expected run length
 * @returns {Object} Noise analysis
 */
function calculateNoise(states, expectedPattern) {
  const runs = [];
  let currentRun = { value: states[0], length: 1 };
  
  for (let i = 1; i < states.length; i++) {
    if (states[i] === currentRun.value) {
      currentRun.length++;
    } else {
      runs.push(currentRun);
      currentRun = { value: states[i], length: 1 };
    }
  }
  runs.push(currentRun);

  // Count deviations from expected pattern
  const deviations = runs.filter(r => 
    Math.abs(r.length - expectedPattern) > 1
  ).length;

  const noiseRate = deviations / runs.length;
  
  return {
    noiseRate,
    quality: noiseRate < 0.15 ? 'clean' :
             noiseRate < 0.30 ? 'acceptable' :
             noiseRate < 0.50 ? 'noisy' : 'chaotic',
    deviations,
    totalRuns: runs.length
  };
}

/**
 * Predict next flip based on pattern with probability limits
 * @param {Object} patternAnalysis - Pattern detection result
 * @param {Number} currentRunLength - Current consecutive run
 * @returns {Object} Flip prediction
 */
function predictFlip(patternAnalysis, currentRunLength) {
  if (!patternAnalysis.valid) {
    return {
      shouldFlip: false,
      confidence: 0,
      reasoning: 'No clear pattern detected'
    };
  }

  const { pattern, confidence, historical } = patternAnalysis;
  
  // Calculate probability limits
  // If current run exceeds historical average by 50%, it's "hitting limits"
  const historicalAvg = historical?.avgFlipFrequency || pattern;
  const probabilityLimit = historicalAvg * 1.5;
  const isOverdue = currentRunLength >= probabilityLimit;
  
  // Boost confidence if hitting probability limits
  let adjustedConfidence = confidence;
  if (isOverdue) {
    adjustedConfidence = Math.min(confidence * 1.2, 0.95);
  }
  
  // How close are we to the expected flip point?
  const proximity = currentRunLength / pattern;
  
  if (currentRunLength >= pattern) {
    // We've reached or exceeded the pattern length
    return {
      shouldFlip: true,
      confidence: adjustedConfidence * 0.9,
      reasoning: isOverdue 
        ? `⚠️ Hitting probability limits (${currentRunLength} vs avg ${historicalAvg})`
        : `Pattern suggests flip after ${pattern} (current: ${currentRunLength})`,
      urgency: isOverdue ? 'overdue' : 'due',
      probabilityLimit: isOverdue
    };
  } else if (currentRunLength === pattern - 1) {
    // One away from flip
    return {
      shouldFlip: false,
      confidence: confidence * 0.7,
      reasoning: `Next roll likely to flip (${currentRunLength}/${pattern})`,
      urgency: 'next'
    };
  } else {
    // Still building the run
    return {
      shouldFlip: false,
      confidence: confidence * 0.5,
      reasoning: `Continue current side (${currentRunLength}/${pattern})`,
      urgency: 'building'
    };
  }
}

/**
 * Compare two columns to find which has cleaner pattern
 * @param {Array} col1States - Column 1 states
 * @param {Array} col2States - Column 2 states
 * @returns {Object} Comparison result
 */
function compareColumns(col1States, col2States) {
  const col1Pattern = detectRunPattern(col1States);
  const col2Pattern = detectRunPattern(col2States);

  if (!col1Pattern.valid && !col2Pattern.valid) {
    return {
      recommendation: 'none',
      reason: 'Both columns too noisy'
    };
  }

  if (!col1Pattern.valid) {
    return {
      recommendation: 'col2',
      reason: `Column 2 has clear pattern (${col2Pattern.pattern}x runs)`,
      pattern: col2Pattern
    };
  }

  if (!col2Pattern.valid) {
    return {
      recommendation: 'col1',
      reason: `Column 1 has clear pattern (${col1Pattern.pattern}x runs)`,
      pattern: col1Pattern
    };
  }

  // Both valid - choose cleaner one
  const col1Noise = col1Pattern.noise;
  const col2Noise = col2Pattern.noise;

  if (col1Noise < col2Noise * 0.8) { // Col1 significantly cleaner
    return {
      recommendation: 'col1',
      reason: `Column 1 cleaner (${(col1Noise * 100).toFixed(0)}% noise vs ${(col2Noise * 100).toFixed(0)}%)`,
      pattern: col1Pattern
    };
  } else if (col2Noise < col1Noise * 0.8) { // Col2 significantly cleaner
    return {
      recommendation: 'col2',
      reason: `Column 2 cleaner (${(col2Noise * 100).toFixed(0)}% noise vs ${(col1Noise * 100).toFixed(0)}%)`,
      pattern: col2Pattern
    };
  } else {
    // Similar noise - choose higher confidence
    return {
      recommendation: col1Pattern.confidence > col2Pattern.confidence ? 'col1' : 'col2',
      reason: 'Both similar, using higher confidence',
      pattern: col1Pattern.confidence > col2Pattern.confidence ? col1Pattern : col2Pattern
    };
  }
}

/**
 * Helper: Get most common value in array
 */
function getMostCommon(arr) {
  const freq = {};
  arr.forEach(val => freq[val] = (freq[val] || 0) + 1);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Main pattern analysis function with historical tracking
 * @param {Array} states - Array of 'A' or 'B' states
 * @param {String} currentSide - Current side ('A' or 'B')
 * @param {Number} currentRunLength - Current run length
 * @param {Object} options - Additional options
 * @returns {Object} Complete pattern analysis
 */
export function analyzePattern(states, currentSide, currentRunLength, options = {}) {
  const { lookback = 20 } = options;
  
  // Calculate historical flip frequency
  const historical = calculateHistoricalFlipFrequency(states, lookback);
  
  // Detect pattern with historical context
  const pattern = detectRunPattern(states, historical);
  
  if (!pattern.valid) {
    return {
      valid: false,
      message: 'No clear pattern - too much noise',
      recommendation: 'Check other column or wait for more data',
      historical: historical.valid ? historical : null
    };
  }

  // Calculate noise
  const noise = calculateNoise(states, pattern.pattern);
  
  // Predict flip with probability limits
  const flipPrediction = predictFlip(pattern, currentRunLength);
  
  // Generate pattern description
  const patternDescription = generatePatternDescription(pattern, historical, states);
  
  return {
    valid: true,
    pattern: {
      type: pattern.pattern === 1 ? 'alternating' :
            pattern.pattern === 2 ? 'double-run' :
            pattern.pattern === 3 ? 'triple-run' :
            `${pattern.pattern}x-run`,
      runLength: pattern.pattern,
      confidence: pattern.confidence,
      description: patternDescription,
      historical: historical.valid ? historical : null
    },
    noise: {
      level: noise.quality,
      rate: noise.noiseRate,
      message: noise.quality === 'clean' ? '✅ Clean pattern' :
               noise.quality === 'acceptable' ? '⚠️ Some noise but usable' :
               noise.quality === 'noisy' ? '⚠️ Noisy - use cautiously' :
               '❌ Too chaotic'
    },
    prediction: {
      shouldFlip: flipPrediction.shouldFlip,
      confidence: flipPrediction.confidence,
      reasoning: flipPrediction.reasoning,
      urgency: flipPrediction.urgency,
      currentProgress: `${currentRunLength}/${pattern.pattern}`,
      probabilityLimit: flipPrediction.probabilityLimit || false
    },
    recommendation: flipPrediction.shouldFlip ? 
      `Predict flip to opposite side (${flipPrediction.urgency})` :
      `Continue current side (${currentRunLength}/${pattern.pattern})`
  };
}

/**
 * Generate human-readable pattern description
 * @param {Object} pattern - Pattern analysis
 * @param {Object} historical - Historical data
 * @param {Array} states - Recent states
 * @returns {String} Pattern description
 */
function generatePatternDescription(pattern, historical, states) {
  const recent = states.slice(-6);
  const recentStr = recent.join(' ');
  
  if (pattern.pattern === 1) {
    return `Alternating pattern (${recentStr})`;
  } else if (pattern.pattern === 2) {
    return `Double-run pattern (flips every 2)`;
  } else if (pattern.pattern === 3) {
    return `Triple-run pattern (flips every 3)`;
  }
  
  if (historical?.valid) {
    return `Flips every ${pattern.pattern} rolls (historical avg: ${historical.avgFlipFrequency})`;
  }
  
  return `${pattern.pattern}x-run pattern detected`;
}

/**
 * Detect if pattern broke (expected flip didn't happen)
 * @param {Object} pattern - Pattern analysis
 * @param {Number} currentRunLength - Current run length
 * @returns {Object} Pattern break detection
 */
function detectPatternBreak(pattern, currentRunLength) {
  if (!pattern.valid) return { broke: false };
  
  const expectedFlip = pattern.pattern;
  const tolerance = 1; // Allow 1 extra roll beyond expected
  
  // If run exceeds expected by more than tolerance
  if (currentRunLength > expectedFlip + tolerance) {
    return {
      broke: true,
      expected: expectedFlip,
      actual: currentRunLength,
      message: `⚠️ Pattern broke (expected flip at ${expectedFlip}, now at ${currentRunLength})`,
      recommendation: 'Re-analyze pattern or use Smart Prefix'
    };
  }
  
  return { broke: false };
}

/**
 * Window-aware pattern analysis (5-minute window isolation)
 * @param {Array} allStates - All historical states
 * @param {String} currentSide - Current side ('A' or 'B')
 * @param {Number} currentRunLength - Current run length
 * @param {Object} windowInfo - 5-minute window context
 * @returns {Object} Window-aware pattern analysis
 */
export function analyzePatternWithWindow(
  allStates,
  currentSide,
  currentRunLength,
  windowInfo = {}
) {
  const {
    isNewWindow = false,
    rollCount = 0,
    windowStates = null,
    windowStartTime = null
  } = windowInfo;
  
  // CRITICAL: Only use current window's rolls
  const currentWindowStates = windowStates || allStates.slice(-Math.min(12, allStates.length));
  
  // If new window with < 4 rolls, don't trust pattern yet
  if (isNewWindow && rollCount < 4) {
    return {
      valid: false,
      message: '🔄 New 5-min window - waiting for pattern',
      recommendation: 'Need 4+ rolls in this window to detect pattern',
      windowBoundary: true,
      windowInfo: {
        isNewWindow: true,
        rollCount,
        status: 'insufficient_data'
      }
    };
  }
  
  // If window has < 6 rolls, use shorter lookback
  const lookback = rollCount > 0 && rollCount < 10 ? rollCount : 20;
  
  // Analyze pattern with window context
  const analysis = analyzePattern(
    currentWindowStates,
    currentSide,
    currentRunLength,
    { lookback }
  );
  
  // Check if pattern broke
  if (analysis.valid) {
    const patternBreak = detectPatternBreak(analysis.pattern, currentRunLength);
    
    if (patternBreak.broke) {
      return {
        valid: false,
        message: patternBreak.message,
        recommendation: patternBreak.recommendation,
        patternBroke: true,
        expected: patternBreak.expected,
        actual: patternBreak.actual,
        windowInfo: {
          isNewWindow,
          rollCount,
          status: 'pattern_broke'
        }
      };
    }
  }
  
  // Add window context to result
  return {
    ...analysis,
    windowInfo: {
      isNewWindow,
      rollCount,
      windowBoundary: isNewWindow,
      status: analysis.valid ? 'pattern_detected' : 'no_pattern'
    }
  };
}

