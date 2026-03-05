/**
 * Kiyo Wave Analysis Utility — v2 (N-Run Adaptive Flip Detection)
 *
 * Core change from v1:
 * - Detects the dominant run-length N from current window data only
 * - Predicts FLIP only at currentRun >= N (not 1 roll too early)
 * - Previous window used ONLY to extend run count (continuity), never for direction bias
 */

export const WAVE_SCHEMES = {
  col1: {
    name: "Column 1",
    label: "Odds/Evens",
    pairA: ["1", "3", "5", "7"], // Odd digits
    pairB: ["2", "4", "6", "8"], // Even digits
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

// Helper: build run-length array from a states sequence
function buildRuns(states) {
  if (!states || states.length === 0) return [];
  const runs = [];
  let curVal = states[0], curLen = 1;
  for (let i = 1; i < states.length; i++) {
    if (states[i] === curVal) curLen++;
    else { runs.push({ side: curVal, length: curLen }); curVal = states[i]; curLen = 1; }
  }
  runs.push({ side: curVal, length: curLen }); // last (possibly in-progress) run
  return runs;
}

// Helper: find dominant run-length mode from completed runs
function findDominantN(completedRuns) {
  if (!completedRuns || completedRuns.length === 0) return { n: 1, confidence: 0 };
  const counts = {};
  completedRuns.forEach(r => {
    counts[r.length] = (counts[r.length] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const n = parseInt(sorted[0][0]);
  const confidence = sorted[0][1] / completedRuns.length;
  return { n, confidence };
}

// Shared "not enough data" return shape
function buildInvalidReturn(message = "Need 4+ rolls") {
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
    message,
    flipTarget: [],
    flipLabel: "—",
    patternStatus: { type: "none", confidence: 0, runLength: null },
  };
}

export function analyzeColumnWave(rolls, scheme, digitPosition, windowContext = null) {
  if (!rolls || rolls.length < 4) {
    return buildInvalidReturn("Need 4+ rolls");
  }

  // --- Map rolls to A/B states ---
  const states = rolls
    .map((r) => {
      const digit = String(r)[digitPosition];
      if (scheme.pairA.includes(digit)) return "A";
      if (scheme.pairB.includes(digit)) return "B";
      return null;
    })
    .filter(Boolean);

  if (states.length < 4) return buildInvalidReturn("Insufficient data");

  // --- Current side & run length ---
  const currentSide = states[states.length - 1];
  const currentLabel = currentSide === "A" ? scheme.pairALabel : scheme.pairBLabel;

  let runLength = 1;
  for (let i = states.length - 2; i >= 0; i--) {
    if (states[i] === currentSide) runLength++;
    else break;
  }

  // --- Overall dominance (last 12, for reference only) ---
  const domWindow = states.slice(-12);
  const aCount = domWindow.filter((s) => s === "A").length;
  const bCount = domWindow.length - aCount;
  const dominantSide = aCount >= bCount ? "A" : "B";
  const dominance = Math.max(aCount, bCount) / domWindow.length;

  // --- Swap rate (last 12) ---
  let swaps = 0;
  for (let i = 1; i < domWindow.length; i++) {
    if (domWindow[i] !== domWindow[i - 1]) swaps++;
  }
  const swapRate = swaps / (domWindow.length - 1 || 1);

  // --- Determine pattern window (current window ONLY for direction/N detection) ---
  const hasPreviousWindow = (windowContext?.previousStates?.length ?? 0) > 0;
  const windowRollCount = windowContext?.rollCount || 0;

  let patternWindow;
  if (windowContext?.windowStates && windowContext.windowStates.length > 0) {
    patternWindow = windowContext.windowStates;
  } else {
    patternWindow = states.slice(-8);
  }

  // --- Building phase check ---
  // First window: need ~5 rolls to see 2+ completed runs and reliably detect N
  // Subsequent windows: N is already known from previous session, 3 new rolls is enough
  const minRollsRequired = hasPreviousWindow ? 3 : 5;
  const buildingLabel = hasPreviousWindow
    ? `(${windowRollCount}/3)`
    : `(${windowRollCount}/5)`;

  if (patternWindow.length < minRollsRequired) {
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
      message: `⏳ Building pattern ${buildingLabel}`,
      flipTarget: null,
      flipLabel: "Wait",
      urgency: "low",
      icon: "⏳",
      patternStatus: { type: "building", confidence: 0, runLength: null },
    };
  }

  // --- STEP 1: Detect dominant run-length N from current window only ---
  const allRuns = buildRuns(patternWindow);
  // Completed runs = all except the last (which is still in-progress)
  const completedRuns = allRuns.slice(0, -1);

  let { n: dominantN, confidence: patternConfidence } = findDominantN(completedRuns);

  // --- STEP 2: Previous window continuity (extend run, NOT bias direction) ---
  let effectiveRunLength = runLength;

  if (hasPreviousWindow) {
    const prevStates = windowContext.previousStates;
    const prevLastSide = prevStates[prevStates.length - 1];

    if (prevLastSide === currentSide) {
      // Current run appears to be continuing from previous window
      let prevRunLen = 0;
      for (let i = prevStates.length - 1; i >= 0; i--) {
        if (prevStates[i] === currentSide) prevRunLen++;
        else break;
      }
      effectiveRunLength = runLength + prevRunLen;
    }

    // Bootstrap dominantN from prev window if current window doesn't have enough completed runs
    if (completedRuns.length < 2 && prevStates.length >= 4) {
      const prevAllRuns = buildRuns(prevStates);
      const prevCompleted = prevAllRuns.slice(0, -1);
      if (prevCompleted.length >= 2) {
        const { n: prevN, confidence: prevConf } = findDominantN(prevCompleted);
        // Use previous N but with reduced confidence (it's from the last session)
        dominantN = prevN;
        patternConfidence = prevConf * 0.65; // discount factor
      }
    }
  }

  // --- STEP 3: Dominance shortcut (strong skew = just predict that side) ---
  const pwACount = patternWindow.filter((s) => s === "A").length;
  const pwBCount = patternWindow.length - pwACount;
  const pwDominanceRate = Math.max(pwACount, pwBCount) / patternWindow.length;
  const pwDominantSide = pwACount >= pwBCount ? "A" : "B";

  if (pwDominanceRate >= 0.75 && patternWindow.length >= 5) {
    const domLabel =
      pwDominantSide === "A" ? scheme.pairALabel : scheme.pairBLabel;
    const domTarget =
      pwDominantSide === "A" ? scheme.pairA : scheme.pairB;

    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "CONTINUE",
      confidence: pwDominanceRate,
      reliability: "HIGH",
      message: `🔥 ${domLabel} dominance`,
      flipTarget: domTarget,
      flipLabel: domLabel,
      icon: "🔥",
      patternDetected: {
        type: "dominance",
        dominantSide: pwDominantSide,
        dominanceRate: pwDominanceRate,
        confidence: pwDominanceRate,
      },
      patternStatus: {
        type: "dominance",
        confidence: pwDominanceRate,
        runLength: null,
      },
    };
  }

  // --- STEP 4: No clear pattern — SKIP ---
  if (patternConfidence < 0.40 || completedRuns.length < 1) {
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
      message: `⚠️ No clear pattern (${Math.round(swapRate * 100)}% swap)`,
      flipTarget: null,
      icon: "⚠️",
      patternStatus: {
        type: "chaotic",
        confidence: patternConfidence || 0,
        runLength: null,
      },
    };
  }

  // --- STEP 5: Predict FLIP or CONTINUE based on effectiveRun vs dominantN ---
  // Confidence grows with number of confirmed runs observed
  const baseConfidence = Math.min(
    0.55 +
      completedRuns.length * 0.05 +
      patternConfidence * 0.15,
    0.88
  );

  if (effectiveRunLength >= dominantN) {
    // Check if the run is OVERSHOOTING N and the current side is dominant in the window.
    // If so, this is a dominance pattern masquerading as an N-run — switch to CONTINUE
    // rather than keep wrongly predicting FLIP every roll past N.
    const currentSideCountInWindow = patternWindow.filter((s) => s === currentSide).length;
    const currentSideWindowDominance = currentSideCountInWindow / patternWindow.length;
    const isOvershooting = effectiveRunLength > dominantN;

    if (isOvershooting && currentSideWindowDominance >= 0.65) {
      // Dominant run — treat like dominance, not a flip
      const cTarget = currentSide === "A" ? scheme.pairA : scheme.pairB;
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        effectiveRunLength,
        dominance,
        dominantSide,
        swapRate,
        action: "CONTINUE",
        confidence: currentSideWindowDominance,
        reliability: "HIGH",
        message: `🔥 ${currentLabel} extending (${runLength}/${dominantN})`,
        flipTarget: cTarget,
        flipLabel: currentLabel,
        icon: "🔥",
        patternDetected: {
          type: "dominance",
          dominantSide: currentSide,
          dominanceRate: currentSideWindowDominance,
          confidence: currentSideWindowDominance,
        },
        patternStatus: {
          type: "dominance",
          confidence: currentSideWindowDominance,
          runLength: null,
        },
      };
    }

    // === FLIP PREDICTED (run == N, not overshooting or not yet dominant) ===
    const fTarget = currentSide === "A" ? scheme.pairB : scheme.pairA;
    const fLabel =
      currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;

    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      effectiveRunLength,
      dominance,
      dominantSide,
      swapRate,
      action: "FLIP",
      confidence: Math.min(baseConfidence + 0.05, 0.90),
      reliability: "HIGH",
      message: `🎯 Flip → ${fLabel} (N=${dominantN})`,
      flipTarget: fTarget,
      flipLabel: fLabel,
      icon: "🎯",
      patternDetected: {
        type: `${dominantN}x-run`,
        runLength: dominantN,
        confidence: patternConfidence,
      },
      patternStatus: {
        type: `${dominantN}x-run`,
        confidence: baseConfidence,
        runLength: dominantN,
      },
    };
  } else {
    // === CONTINUE PREDICTED ===
    const cTarget = currentSide === "A" ? scheme.pairA : scheme.pairB;

    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      effectiveRunLength,
      dominance,
      dominantSide,
      swapRate,
      action: "CONTINUE",
      confidence: baseConfidence,
      reliability: "MODERATE",
      message: `📊 Hold ${currentLabel} (${runLength}/${dominantN})`,
      flipTarget: cTarget,
      flipLabel: currentLabel,
      icon: "📊",
      patternDetected: {
        type: `${dominantN}x-run`,
        runLength: dominantN,
        confidence: patternConfidence,
      },
      patternStatus: {
        type: `${dominantN}x-run`,
        confidence: baseConfidence,
        runLength: dominantN,
      },
    };
  }
}

export function getExpectedLabel(flipTarget, scheme) {
  if (!flipTarget || flipTarget.length === 0) return "—";
  return scheme.pairA.some((d) => flipTarget.includes(d))
    ? scheme.pairALabel
    : scheme.pairBLabel;
}
