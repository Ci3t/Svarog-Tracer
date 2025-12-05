// ADAPTIVE: Learns which patterns work best THIS SESSION and reorders priority
// Strategy: Start with default order, track hits/misses, promote winners

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 4;

// 🔥 NEW: Session-level mode performance tracking
const MODE_STATS = {
  "opposite-pair": { hits: 0, attempts: 0 },
  "cyclic-enhanced": { hits: 0, attempts: 0 },
  "smart-transition": { hits: 0, attempts: 0 },
  wave: { hits: 0, attempts: 0 },
  "markov-3state": { hits: 0, attempts: 0 },
  "phase-memory": { hits: 0, attempts: 0 },
  "wave-theory-3str": { hits: 0, attempts: 0 },
  "anti-repeat": { hits: 0, attempts: 0 },
};

let LAST_PREDICTION = null;

const VALS = ["41", "42", "43", "44"];
const valToIdx = (v) => VALS.indexOf(v);
const idxToVal = (i) => VALS[((i % 4) + 4) % 4];

function translateTo4(str = "") {
  if (!str) return "";
  const digits = str.split("").map((d) => Number(d));
  if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) return "";
  const shift = (4 - digits[0] + 4) % 4;
  return digits
    .map((d) => {
      const z = d - 1;
      const s = (z + shift) % 4;
      return (s + 1).toString();
    })
    .join("");
}

function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}

function clampConf(conf, min = 0.42, max = 0.75) {
  return Math.max(min, Math.min(conf, max));
}

function buildCandidates(prediction, confPct, freqSorted) {
  if (!prediction) return [];
  const mainCand = { value: prediction, pct: Math.round(confPct * 100) };
  const alts = freqSorted.filter((c) => c.value !== prediction).slice(0, 2);
  return [mainCand, ...alts];
}

function getAlt(prediction, freqSorted) {
  return freqSorted.find((c) => c.value !== prediction)?.value || null;
}

function updateModeStats(rolls) {
  if (!LAST_PREDICTION || rolls.length < 2) return;
  const actual = rolls[rolls.length - 1];
  const { mode, prediction, alt } = LAST_PREDICTION;
  const isHit = actual === prediction || actual === alt;
  if (MODE_STATS[mode]) {
    if (isHit) MODE_STATS[mode].hits++;
    MODE_STATS[mode].attempts++;
  }
}

function getAdaptivePriority() {
  const modePerformance = Object.entries(MODE_STATS)
    .filter(([mode, stats]) => stats.attempts >= 3)
    .map(([mode, stats]) => ({
      mode,
      successRate: stats.hits / stats.attempts,
      attempts: stats.attempts,
    }))
    .sort((a, b) => b.successRate - a.successRate);

  if (modePerformance.length >= 3) {
    return modePerformance.map((m) => m.mode);
  }

  return [
    "anti-repeat",
    "opposite-pair",
    "cyclic-enhanced",
    "smart-transition",
    "markov-3state",
    "wave",
    "phase-memory",
  ];
}

export function resetSessionStats() {
  Object.keys(MODE_STATS).forEach((mode) => {
    MODE_STATS[mode].hits = 0;
    MODE_STATS[mode].attempts = 0;
  });
  LAST_PREDICTION = null;
  PHASE_CACHE.length = 0;
}

export function getSessionStats() {
  return {
    modes: { ...MODE_STATS },
    adaptivePriority: getAdaptivePriority(),
    totalAttempts: Object.values(MODE_STATS).reduce(
      (sum, s) => sum + s.attempts,
      0
    ),
  };
}

export function getModeBreakdown(rawRolls = []) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  if (rolls.length < 6) return {};

  const { sorted: freqSorted } = weightedFrequency(rolls);
  const breakdown = {};

  const modeDetectors = {
    "opposite-pair": () => detectOppositePair(rolls, freqSorted),
    "cyclic-enhanced": () => detectCyclic(rolls),
    "smart-transition": () => smartTransition(rolls, freqSorted),
    wave: () => detectWave(rolls, freqSorted),
    "markov-3state": () => enhancedMarkov3(rolls),
    "phase-memory": () => matchCachedPhase(rolls),
    "anti-repeat": () => detectAntiRepeat(rolls),
  };

  for (const [modeName, detector] of Object.entries(modeDetectors)) {
    const detection = detector();
    if (!detection) continue;

    if (modeName === "phase-memory") {
      const main = detection.next;
      breakdown[modeName] = {
        prediction: main,
        confidence: 0.56,
        alt: detection.alt || getAlt(main, freqSorted),
      };
    } else {
      const main = detection.pred;
      breakdown[modeName] = {
        prediction: main,
        confidence: detection.conf,
        alt: detection.alt || getAlt(main, freqSorted),
      };
    }
  }

  return breakdown;
}

/* ========================================================================
   🌊 WAVE THEORY - EU SERVER 3-STRING PREDICTOR
   ======================================================================== */

function analyzeWaveColumn(recentRolls, pairScheme) {
  const LOOKBACK = Math.min(6, recentRolls.length);
  const recent = recentRolls.slice(-LOOKBACK);

  // 🔥 FIX 2: Increased decay from 0.9 to 0.85 for more recency bias
  const weights = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
  let weightedA = 0,
    weightedB = 0,
    totalWeight = 0;
  let aCount = 0,
    bCount = 0;

  recent.forEach((roll, idx) => {
    const lastDigit = roll[2];
    const weight = weights[idx];

    if (pairScheme.pairA.includes(lastDigit)) {
      aCount++;
      weightedA += weight;
    } else if (pairScheme.pairB.includes(lastDigit)) {
      bCount++;
      weightedB += weight;
    }
    totalWeight += weight;
  });

  // 🔥 Consecutive streak detection
  const dominantPair = aCount > bCount ? pairScheme.pairA : pairScheme.pairB;
  let consecutiveCount = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const digit = recent[i][2];
    if (dominantPair.includes(digit)) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  const isConsecutive = consecutiveCount >= 3;

  // Build runs for analysis
  let runs = [];
  let currentPair = null;
  let currentRunLength = 0;

  recent.forEach((roll) => {
    const lastDigit = roll[2];
    const isPairA = pairScheme.pairA.includes(lastDigit);
    const thisPair = isPairA ? "A" : "B";

    if (thisPair === currentPair) {
      currentRunLength++;
    } else {
      if (currentPair !== null) {
        runs.push({ pair: currentPair, length: currentRunLength });
      }
      currentPair = thisPair;
      currentRunLength = 1;
    }
  });

  if (currentPair !== null) {
    runs.push({ pair: currentPair, length: currentRunLength });
  }

  if (runs.length === 0) {
    return {
      prediction: "A",
      confidence: 0.5,
      runs: [],
      avgRunLength: 0,
      consecutiveCount: 0,
      isConsecutive: false,
    };
  }

  const lastRun = runs[runs.length - 1];
  const avgRunLength = runs.reduce((sum, r) => sum + r.length, 0) / runs.length;

  const weightedDominance =
    totalWeight > 0 ? Math.max(weightedA, weightedB) / totalWeight : 0;
  const maxDominance = Math.max(aCount, bCount) / LOOKBACK;

  let prediction;
  let confidence;

  // 🔥 FIX 1: Adjusted thresholds - 83%+ always triggers, 75%+ with consecutive
  if (maxDominance >= 0.83) {
    // 5/6 or 6/6 always triggers, regardless of consecutive
    prediction = lastRun.pair === "A" ? "B" : "A";
    confidence = weightedDominance;
  } else if (maxDominance >= 0.75 && isConsecutive) {
    // 4.5/6 (75%) requires consecutive
    prediction = lastRun.pair === "A" ? "B" : "A";
    confidence = weightedDominance * 0.9;
  } else if (maxDominance >= 0.67 && isConsecutive) {
    // 4/6 (67%) requires consecutive
    prediction = lastRun.pair === "A" ? "B" : "A";
    confidence = weightedDominance * 0.85;
  } else if (lastRun.length >= Math.ceil(avgRunLength * 1.2)) {
    prediction = lastRun.pair === "A" ? "B" : "A";
    confidence = 0.62;
  } else if (lastRun.length >= avgRunLength) {
    prediction = lastRun.pair === "A" ? "B" : "A";
    confidence = 0.54;
  } else {
    prediction = lastRun.pair;
    confidence = 0.52;
  }

  // 🔥 Calculate swap rate for this column
  const swapRate = calculateSwapRate(recent, pairScheme);

  return {
    prediction,
    confidence,
    lastRun,
    avgRunLength: avgRunLength.toFixed(1),
    runs,
    consecutiveCount,
    isConsecutive,
    swapRate, // 🔥 NEW: Swap rate for compound confidence
  };
}

function calculateFlipProbability(run, avgRunLength) {
  if (run < avgRunLength) {
    return 0.3;
  }

  if (run === Math.round(avgRunLength)) {
    return 0.5;
  }

  if (run < avgRunLength * 1.2) {
    return 0.65;
  }

  if (run >= avgRunLength * 1.2) {
    return 0.8;
  }
}

export function detectWaveTheory3(rolls3str) {
  if (rolls3str.length < 6) return null;

  const WINDOW = Math.min(12, rolls3str.length);
  const recent = rolls3str.slice(-WINDOW);
  const lastRoll = recent[recent.length - 1];
  const lastPrefix = lastRoll.slice(0, 2);

  const schemes = [
    {
      name: "Column 1",
      pairA: ["1", "3"],
      pairB: ["2", "4"],
      label: "Odds vs Evens",
    },
    {
      name: "Column 2",
      pairA: ["1", "4"],
      pairB: ["2", "3"],
      label: "Outer vs Inner",
    },
    {
      name: "Column 3",
      pairA: ["1", "2"],
      pairB: ["3", "4"],
      label: "Low vs High",
    },
  ];

  const columnResults = [];
  let totalConfidence = 0;
  let totalSwapRate = 0;

  schemes.forEach((scheme, idx) => {
    const analysis = analyzeWaveColumn(recent, scheme);
    const predictedPair =
      analysis.prediction === "A" ? scheme.pairA : scheme.pairB;

    columnResults.push({
      column: idx + 1,
      name: scheme.name,
      predictedPair: analysis.prediction,
      predictedDigits: predictedPair,
      confidence: analysis.confidence,
      lastRunPair: analysis.lastRun?.pair || "?",
      lastRunLength: analysis.lastRun?.length || 0,
      avgRunLength: analysis.avgRunLength,
      consecutiveCount: analysis.consecutiveCount,
      isConsecutive: analysis.isConsecutive,
      swapRate: analysis.swapRate, // 🔥 NEW
    });

    totalConfidence += analysis.confidence;
    totalSwapRate += analysis.swapRate;
  });

  const avgSwapRate = totalSwapRate / schemes.length;

  // 🔥 NEW: Detect columns that want to flip (high run length or consecutive)
  const flipColumns = columnResults.filter(
    (col) => col.lastRunLength >= 3 || col.isConsecutive
  );

  // 🔥 NEW: Detect sticky columns (low swap rate = reliable constraint)
  const stickyColumns = columnResults.filter((col) => col.swapRate < 0.4);

  const digitVotes = { 1: 0, 2: 0, 3: 0, 4: 0 };

  columnResults.forEach((col) => {
    // 🔥 Weight votes by swap rate (high swap = more predictable)
    const swapWeight = col.swapRate > 0.6 ? 1.3 : 1.0;
    col.predictedDigits.forEach((digit) => {
      digitVotes[digit] += col.confidence * swapWeight;
    });
  });

  // 🔥 Multi-column agreement detection (enhanced)
  const targetDigitCounts = {};
  const highConfidenceCols = columnResults.filter(
    (col) => col.confidence >= 0.67
  );

  highConfidenceCols.forEach((col) => {
    col.predictedDigits.forEach((digit) => {
      targetDigitCounts[digit] = (targetDigitCounts[digit] || 0) + 1;
    });
  });

  const maxAgreement = Math.max(...Object.values(targetDigitCounts), 0);
  const multiColumnAgreement = maxAgreement >= 2;

  // 🔥 Find the agreed-upon digit if it exists
  let agreedDigit = null;
  if (multiColumnAgreement) {
    for (const [digit, count] of Object.entries(targetDigitCounts)) {
      if (count === maxAgreement) {
        agreedDigit = digit;
        break;
      }
    }
  }

  const sorted = Object.entries(digitVotes)
    .sort((a, b) => b[1] - a[1])
    .map(([digit, score]) => ({ digit, score: score.toFixed(2) }));

  const winner = sorted[0];
  const runnerUp = sorted[1];

  const totalVotes = sorted.reduce((sum, d) => sum + parseFloat(d.score), 0);
  const voteStrength = parseFloat(winner.score) / totalVotes;

  let overallConfidence;

  // 🔥 Base confidence calculation
  if (voteStrength >= 0.7) {
    overallConfidence = 0.72;
  } else if (voteStrength >= 0.6) {
    overallConfidence = 0.62;
  } else if (voteStrength >= 0.5) {
    overallConfidence = 0.54;
  } else {
    overallConfidence = 0.48;
  }

  // 🔥 COMPOUND CONFIDENCE BOOST - Multi-column agreement
  if (multiColumnAgreement && flipColumns.length >= 2) {
    // Multiple columns agree on flip direction = exponential confidence
    const compoundBoost = Math.min(flipColumns.length * 0.08, 0.2);
    overallConfidence = Math.min(
      overallConfidence * 1.15 + compoundBoost,
      0.92
    );
  } else if (multiColumnAgreement) {
    // Standard multi-column agreement
    overallConfidence = Math.min(overallConfidence * 1.1, 0.8);
  }

  // 🔥 High swap rate boost (alternating patterns are very predictable)
  if (avgSwapRate >= 0.7) {
    overallConfidence = Math.min(overallConfidence * 1.12, 0.95);
  }

  // 🔥 Sticky column constraint boost (low swap = reliable direction)
  if (stickyColumns.length >= 2 && agreedDigit) {
    overallConfidence = Math.min(overallConfidence * 1.08, 0.95);
  }

  if (overallConfidence < 0.45) return null;

  return {
    pred: lastPrefix + winner.digit,
    conf: overallConfidence,
    alt: lastPrefix + runnerUp.digit,
    mode: "wave-theory-3str",
    multiColumnAgreement,
    flipColumns: flipColumns.length, // 🔥 NEW
    avgSwapRate: avgSwapRate.toFixed(2), // 🔥 NEW
    stickyColumns: stickyColumns.length, // 🔥 NEW
    agreedDigit, // 🔥 NEW
    debug: {
      columnResults,
      digitVotes: sorted,
      voteStrength: voteStrength.toFixed(2),
      recentRolls: recent.slice(-6),
      multiColumnAgreement,
      flipColumns: flipColumns.map((c) => ({
        col: c.column,
        runLength: c.lastRunLength,
        swapRate: c.swapRate.toFixed(2),
      })),
      stickyColumns: stickyColumns.map((c) => ({
        col: c.column,
        swapRate: c.swapRate.toFixed(2),
      })),
      avgSwapRate: avgSwapRate.toFixed(2),
      agreedDigit,
    },
  };
}

function predictPrefix(rolls3str) {
  if (rolls3str.length < 6) return null;

  const last12 = rolls3str.slice(-12);
  const prefixes = last12.map((r) => r.slice(0, 2));
  const last = prefixes[prefixes.length - 1];
  const transitions = {};

  for (let i = 0; i < prefixes.length - 1; i++) {
    if (prefixes[i] === last) {
      const next = prefixes[i + 1];
      transitions[next] = (transitions[next] || 0) + 1;
    }
  }

  if (Object.keys(transitions).length === 0) return null;

  const sorted = Object.entries(transitions).sort((a, b) => b[1] - a[1]);
  const nextPrefix = sorted[0][0];
  const confidence =
    sorted[0][1] / Object.values(transitions).reduce((a, b) => a + b, 0);

  return {
    prefix: nextPrefix,
    confidence,
    alternatives: sorted.slice(1, 3).map((s) => s[0]),
  };
}

/* ========================================================================
   END WAVE THEORY SECTION
   ======================================================================== */

// 🔥 IMPROVED: smartTransition with better confidence scaling and sample validation
function smartTransition(rolls, freqSorted) {
  if (rolls.length < 4) return null;

  const last = rolls[rolls.length - 1];
  const succCounts = {};
  const decay = 0.85;

  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      const nxt = rolls[i + 1];
      const dist = rolls.length - 1 - i;
      const w = Math.pow(decay, dist);
      succCounts[nxt] = (succCounts[nxt] || 0) + w;
    }
  }

  if (Object.keys(succCounts).length < 2) return null;

  const sorted = Object.entries(succCounts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(succCounts).reduce((a, v) => a + v, 0);
  const topConf = sorted[0][1] / total;
  const secondConf = sorted[1][1] / total;
  const confidenceGap = topConf - secondConf;

  // 🔥 NEW: Require minimum sample count
  const sampleCount = Object.values(succCounts).reduce(
    (a, v) => a + Math.round(v),
    0
  );

  if (topConf >= 0.4 && sampleCount >= 3) {
    let mainConf = topConf;

    // 🔥 IMPROVED: Better gap threshold logic
    if (confidenceGap >= 0.25) {
      // Strong dominance - boost confidence
      mainConf = topConf * 1.1;
    } else if (confidenceGap >= 0.15) {
      // Moderate dominance - keep as is
      mainConf = topConf;
    } else {
      // Weak dominance - penalize heavily
      mainConf = topConf * 0.75;
    }

    return {
      pred: sorted[0][0],
      conf: clampConf(mainConf, 0.42, 0.7),
      alt: sorted[1][0],
      altConf: secondConf,
    };
  }

  return null;
}

// 🔥 IMPROVED: detectOppositePair with volatility check and historical validation
function detectOppositePair(rolls, freqSorted) {
  if (rolls.length < 6) return null;

  const last = rolls[rolls.length - 1];
  const recent6 = rolls.slice(-6);
  const recent4 = rolls.slice(-4);

  const opposites = { 41: "44", 44: "41", 42: "43", 43: "42" };
  const opposite = opposites[last];

  if (!opposite) return null;

  const oppCount = recent4.filter((v) => v === opposite).length;
  const lastCount = recent4.filter((v) => v === last).length;

  // 🔥 NEW: Calculate volatility (how often values change)
  let changes = 0;
  for (let i = 1; i < recent6.length; i++) {
    if (recent6[i] !== recent6[i - 1]) changes++;
  }
  const volatility = changes / (recent6.length - 1);

  // 🔥 NEW: Verify opposite-pair pattern actually exists in history
  let oppPairCount = 0;
  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last && rolls[i + 1] === opposite) oppPairCount++;
  }
  const hasOppPattern = oppPairCount >= 2;

  if (lastCount >= 3 && oppCount === 0 && hasOppPattern) {
    // Reduce confidence if volatile
    const baseConf = 0.68;
    const conf = volatility > 0.6 ? baseConf * 0.85 : baseConf;
    return { pred: opposite, conf };
  }

  if (lastCount >= 2 && oppCount <= 1 && hasOppPattern) {
    const last2 = rolls.slice(-2);
    if (last2.filter((v) => v === last).length >= 1) {
      const baseConf = 0.58;
      const conf = volatility > 0.6 ? baseConf * 0.85 : baseConf;
      return { pred: opposite, conf };
    }
  }

  return null;
}

function detectWave(rolls, freqSorted) {
  if (rolls.length < 6 || freqSorted.length < 2) return null;

  const top2 = freqSorted.slice(0, 2);
  const dominant = top2[0].value;
  const secondary = top2[1].value;

  const recent5 = rolls.slice(-5);
  const recent4 = rolls.slice(-4);

  const domInRecent5 = recent5.filter((v) => v === dominant).length;
  const domInRecent4 = recent4.filter((v) => v === dominant).length;

  if (domInRecent5 <= 1 || domInRecent4 === 0) {
    return { pred: dominant, conf: 0.65, alt: secondary };
  }

  return null;
}

function detectAntiRepeat(rolls) {
  if (rolls.length < 6) return null;

  const last = rolls[rolls.length - 1];
  const recent3 = rolls.slice(-3);
  const lastCount = recent3.filter((v) => v === last).length;

  if (lastCount >= 2) {
    const freq = { 41: 0, 42: 0, 43: 0, 44: 0 };
    const recent6 = rolls.slice(-6);

    recent6.forEach((v) => freq[v]++);

    const sorted = Object.entries(freq)
      .filter(([val]) => val !== last)
      .sort((a, b) => a[1] - b[1]);

    if (sorted.length > 0) {
      return {
        pred: sorted[0][0],
        conf: 0.58,
        alt: sorted[1]?.[0] || null,
      };
    }
  }

  return null;
}

// 🔥 IMPROVED: detectCyclic with spacing regularity validation
function detectCyclic(rolls) {
  if (rolls.length < 8) return null;

  const tail = rolls.slice(-10);

  for (let size = 2; size <= 4; size++) {
    if (tail.length <= size) break;

    const lastChunk = tail.slice(-size);
    const pattern = lastChunk.join("|");

    let count = 0;
    let positions = [];

    for (let i = 0; i <= tail.length - size; i++) {
      if (tail.slice(i, i + size).join("|") === pattern) {
        count++;
        positions.push(i);
      }
    }

    if (count >= 2) {
      const lastPos = positions[positions.length - 1];
      const proximity = tail.length - lastPos;

      // 🔥 NEW: Check if last occurrence was recent AND regular
      if (proximity <= size + 2) {
        // Calculate spacing regularity
        let spacings = [];
        for (let i = 1; i < positions.length; i++) {
          spacings.push(positions[i] - positions[i - 1]);
        }
        const avgSpacing =
          spacings.reduce((a, b) => a + b, 0) / spacings.length;
        const spacingVariance =
          spacings.reduce((sum, s) => sum + Math.abs(s - avgSpacing), 0) /
          spacings.length;

        // Only fire if spacing is regular (low variance)
        if (spacingVariance <= size * 0.5) {
          return {
            pred: lastChunk[0],
            conf: clampConf(0.55 + (count - 2) * 0.05, 0.65),
          };
        }
      }
    }
  }

  return null;
}
function enhancedMarkov3(seq) {
  if (seq.length < 6) return null;

  const table = {};
  const decay = 0.9;

  for (let i = 3; i < seq.length; i++) {
    const key = seq.slice(i - 3, i).join("|");
    const nxt = seq[i];
    const dist = seq.length - 1 - i;
    const w = Math.pow(decay, dist);
    table[key] = table[key] || {};
    table[key][nxt] = (table[key][nxt] || 0) + w;
  }

  const lastKey = seq.slice(-3).join("|");
  const opts = table[lastKey];
  if (!opts) return null;

  const sorted = Object.entries(opts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(opts).reduce((a, v) => a + v, 0);
  const conf = sorted[0][1] / total;

  const sampleCount = Object.values(opts).reduce(
    (a, v) => a + Math.round(v),
    0
  );

  if (sampleCount >= 2 && conf >= 0.48) {
    const scaledConf = Math.min(conf * (0.88 + sampleCount * 0.06), 0.76);
    return {
      pred: sorted[0][0],
      conf: scaledConf,
      alt: sorted[1]?.[0] || null,
    };
  }

  return null;
}

function frequencyPredictor(freqSorted) {
  if (!freqSorted || freqSorted.length === 0) return null;

  const top = freqSorted[0];
  const second = freqSorted[1];

  if (top.pct >= 35) {
    return {
      pred: top.value,
      conf: clampConf(top.pct / 100 + 0.08, 0.42, 0.66),
      alt: second?.value || null,
    };
  }

  if (second && Math.abs(top.pct - second.pct) <= 5) {
    return {
      pred: second.value,
      conf: 0.48,
      alt: top.value,
    };
  }

  return {
    pred: top.value,
    conf: 0.45,
    alt: second?.value || null,
  };
}

export function predictNext(rawRolls) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  updateModeStats(rolls);

  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data",
      candidates: [],
    };
  }

  const { sorted: freqSorted } = weightedFrequency(rolls);
  const adaptivePriority = getAdaptivePriority();

  const mono = detectMono(rolls, 4);
  if (mono) {
    maybeStorePhase(rolls);
    const result = {
      prediction: mono,
      confidence: 0.85,
      alt: getAlt(mono, freqSorted),
      mode: "mono",
      candidates: [{ value: mono, pct: 100 }],
    };
    LAST_PREDICTION = result;
    return result;
  }

  const modeDetectors = {
    "opposite-pair": () => detectOppositePair(rolls, freqSorted),
    "cyclic-enhanced": () => detectCyclic(rolls),
    "smart-transition": () => smartTransition(rolls, freqSorted),
    wave: () => detectWave(rolls, freqSorted),
    "markov-3state": () => enhancedMarkov3(rolls),
    "phase-memory": () => matchCachedPhase(rolls),
    "anti-repeat": () => detectAntiRepeat(rolls),
  };

  for (const modeName of adaptivePriority) {
    const detector = modeDetectors[modeName];
    if (!detector) continue;

    const detection = detector();

    let shouldFire = false;
    if (modeName === "smart-transition" && detection?.conf >= 0.5)
      shouldFire = true;
    else if (modeName === "markov-3state" && detection?.conf >= 0.52)
      shouldFire = true;
    else if (modeName === "phase-memory" && detection) shouldFire = true;
    else if (detection) shouldFire = true;

    if (shouldFire && detection) {
      maybeStorePhase(rolls);

      let result;
      if (modeName === "phase-memory") {
        result = {
          prediction: detection.next,
          confidence: 0.56,
          alt: detection.alt || getAlt(detection.next, freqSorted),
          mode: modeName,
          candidates: buildCandidates(detection.next, 0.56, freqSorted),
        };
      } else {
        result = {
          prediction: detection.pred,
          confidence: detection.conf,
          alt: detection.alt || getAlt(detection.pred, freqSorted),
          mode: modeName,
          candidates: buildCandidates(
            detection.pred,
            detection.conf,
            freqSorted
          ),
        };
      }

      LAST_PREDICTION = result;
      return result;
    }
  }

  const trans = smartTransition(rolls, freqSorted);
  if (trans) {
    maybeStorePhase(rolls);
    const result = {
      prediction: trans.pred,
      confidence: trans.conf,
      alt: trans.alt,
      mode: "transition-fallback",
      candidates: buildCandidates(trans.pred, trans.conf, freqSorted),
    };
    LAST_PREDICTION = result;
    return result;
  }

  const freq = frequencyPredictor(freqSorted);
  maybeStorePhase(rolls);

  if (freq) {
    const result = {
      prediction: freq.pred,
      confidence: freq.conf,
      alt: freq.alt,
      mode: "frequency-fallback",
      candidates: buildCandidates(freq.pred, freq.conf, freqSorted),
    };
    LAST_PREDICTION = result;
    return result;
  }

  const result = {
    prediction: freqSorted[0].value,
    confidence: 0.42,
    alt: freqSorted[1]?.value || null,
    mode: "dominant-fallback",
    candidates: freqSorted.slice(0, 3),
  };
  LAST_PREDICTION = result;
  return result;
}

export function predictNext3EU(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-3str-eu",
      candidates: [],
    };
  }

  const mono = detectMono3(rolls, 4);
  if (mono) {
    const p = translateTo4(mono);
    return {
      prediction: p,
      confidence: 0.85,
      alt: null,
      mode: "mono-3str-eu",
      candidates: [{ value: p, pct: 100 }],
    };
  }

  const freq = {};
  const decay = 0.85; // 🔥 FIX 2: Changed from 0.9 to 0.85
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + w;
  });
  const freqSorted = Object.entries(freq)
    .map(([value, w]) => ({ value, pct: Math.round((w / n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const wave = detectWaveTheory3(rolls);
  // 🔥 FIX 3: Lowered threshold from 0.48 to 0.45
  if (wave && wave.conf >= 0.45) {
    const transSorted = freqSorted.map((c) => ({
      ...c,
      value: translateTo4(c.value),
    }));

    const mainPred = wave.pred;
    const altOption = transSorted.find((c) => c.value !== mainPred);

    return {
      prediction: mainPred,
      confidence: wave.conf,
      alt: altOption?.value || wave.alt,
      mode: wave.mode,
      candidates: buildCandidates(mainPred, wave.conf, transSorted),
      debug: wave.debug,
      multiColumnAgreement: wave.multiColumnAgreement, // 🔥 NEW
    };
  }

  const top = freqSorted[0];
  const second = freqSorted[1];
  const main = top ? translateTo4(top.value) : null;

  if (!main) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "no-data-3str-eu",
      candidates: [],
    };
  }

  const conf = clampConf(top.pct / 100 + 0.08, 0.45, 0.68);
  const transSorted = freqSorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));

  return {
    prediction: main,
    confidence: conf,
    alt: second ? translateTo4(second.value) : null,
    mode: "frequency-3str-eu",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

export function predictNext3(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-3str",
      candidates: [],
    };
  }

  if (rolls.length >= 4) {
    const tail = rolls.slice(-4);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: 0.85,
        alt: null,
        mode: "mono-3str",
        candidates: [{ value: p, pct: 100 }],
      };
    }
  }

  const freq = {};
  const decay = 0.85;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + w;
  });
  const sorted = Object.entries(freq)
    .map(([value, w]) => ({ value, pct: Math.round((w / n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const succ = mostCommonSuccessor(rolls);
  if (succ && succ.conf >= 0.45) {
    const main = translateTo4(succ.value);
    const altRaw = succ.alt;
    return {
      prediction: main,
      confidence: clampConf(succ.conf + 0.08, 0.45, 0.72),
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "transition-3str",
      candidates: buildCandidates(
        main,
        clampConf(succ.conf + 0.08, 0.45, 0.72),
        sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
      ),
    };
  }

  const top = sorted[0];
  const main = top ? translateTo4(top.value) : null;
  if (!main)
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "stable-3str",
      candidates: [],
    };

  const conf = clampConf(top.pct / 100 + 0.08, 0.45, 0.68);
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);

  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "frequency-3str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

export function predictNext4(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 4))
    .filter((r) => r.length === 4);

  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-4str",
      candidates: [],
    };
  }

  if (rolls.length >= 4) {
    const tail = rolls.slice(-4);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: 0.85,
        alt: null,
        mode: "mono-4str",
        candidates: [{ value: p, pct: 100 }],
      };
    }
  }

  const freq = {};
  const decay = 0.9;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + w;
  });
  const sorted = Object.entries(freq)
    .map(([value, w]) => ({ value, pct: Math.round((w / n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  const succ = mostCommonSuccessor(rolls);
  if (succ && succ.conf >= 0.45) {
    const main = translateTo4(succ.value);
    const altRaw = succ.alt;
    return {
      prediction: main,
      confidence: clampConf(succ.conf + 0.08, 0.45, 0.72),
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "transition-4str",
      candidates: buildCandidates(
        main,
        clampConf(succ.conf + 0.08, 0.45, 0.72),
        sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
      ),
    };
  }

  const top = sorted[0];
  const main = top ? translateTo4(top.value) : null;
  if (!main)
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "stable-4str",
      candidates: [],
    };

  const conf = clampConf(top.pct / 100 + 0.08, 0.45, 0.68);
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);

  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "frequency-4str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

function weightedFrequency(rolls) {
  const counts = {};
  const decay = 0.85; // 🔥 FIX 2: Changed from 0.9 to 0.85
  const n = rolls.length;

  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    counts[val] = (counts[val] || 0) + w;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(counts)
    .map(([value, w]) => ({
      value,
      pct: Math.round((w / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  return { sorted };
}

function mostCommonSuccessor(rolls) {
  if (rolls.length < 4) return null;

  const last = rolls[rolls.length - 1];
  const succCounts = {};
  const decay = 0.92;

  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      const nxt = rolls[i + 1];
      const dist = rolls.length - 1 - i;
      const w = Math.pow(decay, dist);
      succCounts[nxt] = (succCounts[nxt] || 0) + w;
    }
  }

  if (Object.keys(succCounts).length < 2) return null;

  const sorted = Object.entries(succCounts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(succCounts).reduce((a, v) => a + v, 0);

  return {
    value: sorted[0][0],
    conf: sorted[0][1] / total,
    alt: sorted[1]?.[0] || null,
  };
}

function maybeStorePhase(seq) {
  const tail = seq.slice(-8);
  if (tail.length < 5) return;

  const uniq = Array.from(new Set(tail)).sort();
  if (uniq.length >= 2 && uniq.length <= 3) {
    const phase = { values: uniq, last: tail[tail.length - 1] };
    PHASE_CACHE.unshift(phase);
    if (PHASE_CACHE.length > PHASE_CACHE_LIMIT) PHASE_CACHE.pop();
  }
}

// 🔥 IMPROVED: matchCachedPhase with pattern frequency validation
function matchCachedPhase(seq) {
  if (seq.length < 5 || PHASE_CACHE.length === 0) return null;

  const tail = seq.slice(-6);
  const uniqTail = Array.from(new Set(tail)).sort();

  for (const phase of PHASE_CACHE) {
    if (
      phase.values.length === uniqTail.length &&
      phase.values.every((v, i) => v === uniqTail[i])
    ) {
      // 🔥 NEW: Verify pattern appears multiple times
      let patternCount = 0;
      const tailPattern = tail.join("|");

      for (let i = 0; i <= seq.length - 6; i++) {
        const testPattern = seq.slice(i, i + 6).join("|");
        const testUniq = Array.from(new Set(seq.slice(i, i + 6))).sort();

        if (
          testUniq.length === uniqTail.length &&
          testUniq.every((v, idx) => v === uniqTail[idx])
        ) {
          patternCount++;
        }
      }

      // Only fire if pattern is established (appears 2+ times)
      if (patternCount >= 2) {
        const counts = {};
        tail.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
          next: sorted[0][0],
          alt: sorted[1]?.[0] || null,
        };
      }
    }
  }

  return null;
}

function detectMono(seq, n = 4) {
  if (seq.length < n) return null;

  const tail = seq.slice(-n);
  const monoVal = tail[0];

  if (!tail.every((v) => v === monoVal)) return null;

  const lastValue = seq[seq.length - 1];
  if (lastValue !== monoVal) return null;

  const last4 = seq.slice(-4);
  const monoCount = last4.filter((v) => v === monoVal).length;
  if (monoCount < 3) return null;

  return monoVal;
}

function detectMono3(seq, n = 4) {
  if (seq.length < n) return null;

  const tail = seq.slice(-n);
  const monoVal = tail[0];

  if (!tail.every((v) => v === monoVal)) return null;

  const lastValue = seq[seq.length - 1];
  if (lastValue !== monoVal) return null;

  return monoVal;
}

/**
 * 🎯 PREFIX-CONSTRAINED PREDICTION
 * Given a 2-digit prefix (e.g., "41"), predict the best 3rd digit
 * based on historical patterns in the dataset.
 */
export function predictWithPrefix(rolls3str, prefix) {
  if (!prefix || prefix.length !== 2) {
    return {
      prediction: null,
      confidence: 0,
      candidates: [],
      mode: "invalid-prefix",
    };
  }

  // Filter rolls that start with this prefix
  const matchingRolls = rolls3str.filter((r) => r.startsWith(prefix));

  if (matchingRolls.length < 3) {
    return {
      prediction: null,
      confidence: 0,
      candidates: [],
      mode: "insufficient-prefix-data",
      message: `Only ${matchingRolls.length} rolls found with prefix ${prefix}`,
    };
  }

  // Extract 3rd digits with weighted frequency
  const decay = 0.85;
  const freq = {};

  matchingRolls.forEach((roll, idx) => {
    const thirdDigit = roll[2];
    const dist = matchingRolls.length - 1 - idx;
    const weight = Math.pow(decay, dist);
    freq[thirdDigit] = (freq[thirdDigit] || 0) + weight;
  });

  const totalWeight = Object.values(freq).reduce((a, b) => a + b, 0);

  const candidates = Object.entries(freq)
    .map(([digit, weight]) => ({
      value: prefix + digit,
      pct: Math.round((weight / totalWeight) * 100),
      weight,
    }))
    .sort((a, b) => b.pct - a.pct);

  if (candidates.length === 0) {
    return {
      prediction: null,
      confidence: 0,
      candidates: [],
      mode: "no-candidates",
    };
  }

  const top = candidates[0];
  const confidence = clampConf(top.pct / 100, 0.45, 0.75);

  // Check for successor patterns (what came after this roll before?)
  let successorBoost = 0;
  const allRolls = rolls3str;
  for (let i = 0; i < allRolls.length - 1; i++) {
    if (allRolls[i] === top.value) {
      successorBoost += 0.02;
    }
  }

  const adjustedConfidence = Math.min(confidence + successorBoost, 0.78);

  return {
    prediction: top.value,
    confidence: adjustedConfidence,
    alt: candidates[1]?.value || null,
    candidates: candidates.slice(0, 4),
    mode: "prefix-constrained",
    matchCount: matchingRolls.length,
    prefix,
  };
}

// Calculate how well live data matches training patterns for a prefix
export function calculatePrefixConfidenceBoost(
  trainingRolls,
  liveRolls,
  prefix
) {
  // Filter both datasets by prefix
  const trainingMatches = trainingRolls.filter((r) => r.startsWith(prefix));
  const liveMatches = liveRolls.filter((r) => r.startsWith(prefix));

  if (trainingMatches.length < 3 || liveMatches.length < 3) {
    return 0; // No boost if insufficient data
  }

  // Calculate frequency distributions
  const trainingFreq = {};
  const liveFreq = {};

  trainingMatches.forEach((roll) => {
    const digit = roll[2];
    trainingFreq[digit] = (trainingFreq[digit] || 0) + 1;
  });

  liveMatches.forEach((roll) => {
    const digit = roll[2];
    liveFreq[digit] = (liveFreq[digit] || 0) + 1;
  });

  // Normalize to percentages
  const trainingTotal = trainingMatches.length;
  const liveTotal = liveMatches.length;

  const trainingPct = {};
  const livePct = {};

  Object.keys(trainingFreq).forEach((digit) => {
    trainingPct[digit] = trainingFreq[digit] / trainingTotal;
  });

  Object.keys(liveFreq).forEach((digit) => {
    livePct[digit] = liveFreq[digit] / liveTotal;
  });

  // Calculate similarity (inverse of sum of squared differences)
  let similarity = 0;
  const allDigits = ["1", "2", "3", "4"];

  allDigits.forEach((digit) => {
    const tPct = trainingPct[digit] || 0;
    const lPct = livePct[digit] || 0;
    const diff = Math.abs(tPct - lPct);
    similarity += 1 - diff; // Higher when distributions match
  });

  similarity = similarity / 4; // Average across 4 digits

  // Convert to confidence boost: 0 to +0.15
  const boost = (similarity - 0.5) * 0.3; // Range: -0.15 to +0.15

  return Math.max(-0.1, Math.min(boost, 0.15)); // Clamp
}

// 🔥 NEW: Calculate swap rate (frequency of column changes)
function calculateSwapRate(recentRolls, pairScheme) {
  if (recentRolls.length < 2) return 0;

  let swaps = 0;
  let lastPair = null;

  recentRolls.forEach((roll) => {
    const lastDigit = roll[2];
    const isPairA = pairScheme.pairA.includes(lastDigit);
    const thisPair = isPairA ? "A" : "B";

    if (lastPair !== null && thisPair !== lastPair) {
      swaps++;
    }
    lastPair = thisPair;
  });

  return swaps / (recentRolls.length - 1); // Returns 0.0 to 1.0
}
