/**
 * Kiyo Wave Analysis Utility
 * Core logic for column-based wave predictions
 */

export const WAVE_SCHEMES = {
  col1: {
    name: "Column 1",
    label: "Odds/Evens",
    pairA: ["1", "3"],
    pairB: ["2", "4"],
    pairALabel: "Odd",
    pairBLabel: "Even",
  },
  col2: {
    name: "Column 2",
    label: "Outer/Inner",
    pairA: ["1", "4"],
    pairB: ["2", "3"],
    pairALabel: "Outer",
    pairBLabel: "Inner",
  },
  col3: {
    name: "Column 3",
    label: "Low/High",
    pairA: ["1", "2"],
    pairB: ["3", "4"],
    pairALabel: "Low",
    pairBLabel: "High",
  },
};

export function analyzeColumnWave(rolls, scheme, digitPosition, windowContext = null) {
  if (!rolls || rolls.length < 4) {
    return {
      valid: false,
      currentSide: null,
      currentLabel: "—",
      runLength: 0,
      dominance: 0,
      dominantSide: null,
      swapRate: 0,
      action: "SKIP",
      confidence: 0.3,
      reliability: "NONE",
      betAdvice: "SKIP",
      message: "Need 4+ rolls",
      flipTarget: [],
      flipLabel: "—",
    };
  }

  const states = rolls
    .map((r) => {
      const digit = String(r)[digitPosition];
      if (scheme.pairA.includes(digit)) return "A";
      if (scheme.pairB.includes(digit)) return "B";
      return null;
    })
    .filter(Boolean);

  if (states.length < 4) {
    return {
      valid: false,
      currentSide: null,
      currentLabel: "—",
      runLength: 0,
      dominance: 0,
      dominantSide: null,
      swapRate: 0,
      action: "SKIP",
      confidence: 0.3,
      reliability: "NONE",
      betAdvice: "SKIP",
      message: "Insufficient data",
      flipTarget: [],
      flipLabel: "—",
    };
  }

  // Current run
  const currentSide = states[states.length - 1];
  let runLength = 1;
  for (let i = states.length - 2; i >= 0; i--) {
    if (states[i] === currentSide) runLength++;
    else break;
  }

  // Dominance (last 12)
  const window = states.slice(-12);
  const aCount = window.filter((s) => s === "A").length;
  const bCount = window.length - aCount;
  const dominantSide = aCount >= bCount ? "A" : "B";
  const dominance = Math.max(aCount, bCount) / window.length;

  // Swap rate
  let swaps = 0;
  for (let i = 1; i < window.length; i++) {
    if (window[i] !== window[i - 1]) swaps++;
  }
  const swapRate = swaps / (window.length - 1);

  const currentLabel =
    currentSide === "A" ? scheme.pairALabel : scheme.pairBLabel;
  // const oppositeLabel = currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;
  // const dominantLabel = dominantSide === "A" ? scheme.pairALabel : scheme.pairBLabel;

  // Pattern detection logic
  let patternWindow;
  if (windowContext?.windowStates) {
    const currentStates = windowContext.windowStates;
    const previousStates = windowContext.previousStates || [];
    patternWindow = [...previousStates, ...currentStates];
  } else {
    patternWindow = states.slice(-Math.min(8, states.length));
  }
  
  const isNewWindow = windowContext?.isNewWindow || false;
  const windowRollCount = windowContext?.rollCount || 0;
  
  if (isNewWindow && patternWindow.length < 4) {
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "WAIT",
      confidence: 0.35,
      reliability: "BUILDING",
      betAdvice: "WAIT FOR PATTERN",
      message: `🔄 New window - building (${windowRollCount}/4)`,
      flipTarget: null,
      flipLabel: "Wait",
      urgency: "low",
      icon: "⏳",
      patternStatus: { type: 'building', confidence: 0, runLength: null }
    };
  }

  // Detect pattern
  let detectedPattern = null;
  let patternConfidence = 0;
  
  if (patternWindow.length >= 6) {
    const aCountP = patternWindow.filter(s => s === 'A').length;
    const dominanceRate = Math.max(aCountP, patternWindow.length - aCountP) / patternWindow.length;
    
    if (dominanceRate >= 0.70) {
      detectedPattern = {
        type: 'dominance',
        dominantSide: aCountP >= (patternWindow.length - aCountP) ? 'A' : 'B',
        dominanceRate: dominanceRate,
        confidence: dominanceRate
      };
      patternConfidence = dominanceRate;
    } else {
      const runs = [];
      let cVal = patternWindow[0], cLen = 1;
      for (let i = 1; i < patternWindow.length; i++) {
        if (patternWindow[i] === cVal) cLen++;
        else { runs.push(cLen); cVal = patternWindow[i]; cLen = 1; }
      }
      runs.push(cLen);
      
      const counts = {};
      runs.forEach(l => counts[l] = (counts[l] || 0) + 1);
      const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
      
      if (sorted.length > 0) {
        const freq = sorted[0][1] / runs.length;
        if (freq >= 0.5) {
          detectedPattern = { type: parseInt(sorted[0][0]) === 1 ? 'alternating' : `${sorted[0][0]}x-run`, runLength: parseInt(sorted[0][0]), confidence: freq };
          patternConfidence = freq;
        }
      }
    }
  }

  if (!detectedPattern || patternConfidence < 0.5) {
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "SKIP",
      confidence: patternConfidence || 0.35,
      message: `⚠️ Chaotic (${Math.round(swapRate * 100)}% swap)`,
      flipTarget: null,
      icon: "⚠️",
      patternStatus: { type: 'chaotic', confidence: patternConfidence || 0, runLength: null }
    };
  }

  // Final prediction
  const expectedRunLength = detectedPattern.runLength;
  if (detectedPattern.type === 'dominance') {
    return {
      valid: true, currentSide, currentLabel, runLength, dominance, dominantSide, swapRate,
      action: "CONTINUE", confidence: 0.85, reliability: "HIGH",
      message: `🔥 ${currentLabel} dominance`,
      flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: currentLabel,
      icon: "🔥", patternDetected: detectedPattern
    };
  }

  if (runLength >= expectedRunLength) {
    const fTarget = currentSide === "A" ? scheme.pairB : scheme.pairA;
    const fLabel = currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;
    return {
      valid: true, currentSide, currentLabel, runLength, dominance, dominantSide, swapRate,
      action: "FLIP", confidence: 0.75, reliability: "HIGH",
      message: `🎯 ${detectedPattern.type} → ${fLabel}`,
      flipTarget: fTarget, flipLabel: fLabel,
      icon: "🎯", patternDetected: detectedPattern
    };
  } else {
    return {
      valid: true, currentSide, currentLabel, runLength, dominance, dominantSide, swapRate,
      action: "CONTINUE", confidence: 0.65, reliability: "MODERATE",
      message: `📊 ${detectedPattern.type} → ${currentLabel}`,
      flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: currentLabel,
      icon: "📊", patternDetected: detectedPattern
    };
  }
}

export function getExpectedLabel(flipTarget, scheme) {
  if (!flipTarget || flipTarget.length === 0) return "—";
  return scheme.pairA.some(d => flipTarget.includes(d)) ? scheme.pairALabel : scheme.pairBLabel;
}
