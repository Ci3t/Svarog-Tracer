// ADAPTIVE: Learns which patterns work best THIS SESSION and reorders priority
// Strategy: Start with default order, track hits/misses, promote winners

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 4;

// ðŸ”¥ NEW: Session-level mode performance tracking
const MODE_STATS = {
  "opposite-pair": { hits: 0, attempts: 0 },
  "cyclic-enhanced": { hits: 0, attempts: 0 },
  "smart-transition": { hits: 0, attempts: 0 },
  wave: { hits: 0, attempts: 0 },
  "markov-3state": { hits: 0, attempts: 0 },
  "phase-memory": { hits: 0, attempts: 0 },
};

// ðŸ”¥ NEW: Store last prediction to update stats when next roll comes
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

/* ðŸ”¥ NEW: Update mode stats based on last prediction */
function updateModeStats(rolls) {
  if (!LAST_PREDICTION || rolls.length < 2) return;

  const actual = rolls[rolls.length - 1]; // Most recent roll
  const { mode, prediction, alt } = LAST_PREDICTION;

  // Check if it was a hit (pred or alt)
  const isHit = actual === prediction || actual === alt;

  if (MODE_STATS[mode]) {
    if (isHit) MODE_STATS[mode].hits++;
    MODE_STATS[mode].attempts++;
  }
}

/* ðŸ”¥ NEW: Get adaptive mode priority based on session performance */
function getAdaptivePriority() {
  // Calculate success rates (only for modes with 3+ attempts)
  const modePerformance = Object.entries(MODE_STATS)
    .filter(([mode, stats]) => stats.attempts >= 3)
    .map(([mode, stats]) => ({
      mode,
      successRate: stats.hits / stats.attempts,
      attempts: stats.attempts,
    }))
    .sort((a, b) => b.successRate - a.successRate);

  // If we have enough data, return adaptive order
  if (modePerformance.length >= 3) {
    return modePerformance.map((m) => m.mode);
  }

  // Default priority (fallback for early session)
  return [
    "opposite-pair",
    "cyclic-enhanced",
    "smart-transition",
    "markov-3state",
    "wave",
    "phase-memory",
  ];
}

/* ðŸ”¥ NEW: Reset stats for new session (call this when starting fresh) */
export function resetSessionStats() {
  Object.keys(MODE_STATS).forEach((mode) => {
    MODE_STATS[mode].hits = 0;
    MODE_STATS[mode].attempts = 0;
  });
  LAST_PREDICTION = null;
  PHASE_CACHE.length = 0;
}

/* ðŸ”¥ NEW: Get current session stats (for debugging/UI) */
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
/* 🔍 NEW: Get per-mode predictions for the current context (sandbox use only) */
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
  };

  for (const [modeName, detector] of Object.entries(modeDetectors)) {
    const detection = detector();
    if (!detection) continue;

    if (modeName === "phase-memory") {
      const main = detection.next;
      breakdown[modeName] = {
        prediction: main,
        confidence: 0.56, // same default as in predictNext()
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

/* ðŸŽ¯ Smart transition (ORIGINAL) */
function smartTransition(rolls, freqSorted) {
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
  const topConf = sorted[0][1] / total;
  const secondConf = sorted[1][1] / total;
  const confidenceGap = topConf - secondConf;

  if (topConf >= 0.4) {
    let mainConf = topConf;

    if (confidenceGap < 0.2) {
      mainConf = topConf * 0.9;
    } else {
      mainConf = topConf * 1.05;
    }

    return {
      pred: sorted[0][0],
      conf: clampConf(mainConf, 0.45, 0.7),
      alt: sorted[1][0],
      altConf: secondConf,
    };
  }

  return null;
}

/* ðŸŽ¯ Opposite-pair (ORIGINAL) */
function detectOppositePair(rolls, freqSorted) {
  if (rolls.length < 6) return null;

  const last = rolls[rolls.length - 1];
  const recent4 = rolls.slice(-4);

  const opposites = { 41: "44", 44: "41", 42: "43", 43: "42" };
  const opposite = opposites[last];

  if (!opposite) return null;

  const oppCount = recent4.filter((v) => v === opposite).length;
  const lastCount = recent4.filter((v) => v === last).length;

  if (lastCount >= 2 && oppCount <= 1) {
    return { pred: opposite, conf: 0.62 };
  }

  const top2 = freqSorted.slice(0, 2).map((c) => c.value);
  if (top2.includes(opposite) && top2.includes(last)) {
    return { pred: opposite, conf: 0.58 };
  }

  return null;
}

/* ðŸŽ¯ Wave (ORIGINAL) */
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

/* ðŸŽ¯ Mono (ORIGINAL) */
function detectMono(seq, n = 4) {
  if (seq.length < n) return null;
  const tail = seq.slice(-n);
  const monoVal = tail[0];

  const last2 = tail.slice(-2);
  if (last2[0] !== last2[1]) return null;

  if (tail.every((v) => v === monoVal)) {
    return monoVal;
  }
  return null;
}

/* ðŸŽ¯ Cyclic (ORIGINAL) */
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
      if (tail.length - lastPos <= size + 2) {
        return {
          pred: lastChunk[0],
          conf: clampConf(0.62 + (count - 2) * 0.04, 0.68),
        };
      }
    }
  }

  return null;
}

/* ðŸŽ¯ Markov-3 (ORIGINAL) */
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

/* ðŸŽ¯ Frequency (ORIGINAL) */
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

/* ===================== MAIN PREDICTOR (ADAPTIVE) ===================== */
export function predictNext(rawRolls) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  // ðŸ”¥ NEW: Update stats based on last prediction
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

  // ðŸ”¥ NEW: Get adaptive priority order
  const adaptivePriority = getAdaptivePriority();

  // 1) Mono (ALWAYS first - absolute priority)
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

  // 2-7) ðŸ”¥ ADAPTIVE: Try modes in learned priority order
  const modeDetectors = {
    "opposite-pair": () => detectOppositePair(rolls, freqSorted),
    "cyclic-enhanced": () => detectCyclic(rolls),
    "smart-transition": () => smartTransition(rolls, freqSorted),
    wave: () => detectWave(rolls, freqSorted),
    "markov-3state": () => enhancedMarkov3(rolls),
    "phase-memory": () => matchCachedPhase(rolls),
  };

  // Try each mode in adaptive order
  for (const modeName of adaptivePriority) {
    const detector = modeDetectors[modeName];
    if (!detector) continue;

    const detection = detector();

    // Apply mode-specific thresholds
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

  // Fallback: try weaker transition
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

  // Frequency fallback
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

  // Absolute fallback
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

/* ===================== 3-STR / 4-STR (unchanged) ===================== */

function stripZeros(str = "") {
  return str.replace(/0+$/, "");
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

/* ===== HELPERS (unchanged) ===== */

function weightedFrequency(rolls) {
  const counts = {};
  const decay = 0.9;
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

function matchCachedPhase(seq) {
  if (!PHASE_CACHE.length) return null;

  const tail = seq.slice(-6);
  const uniqTail = Array.from(new Set(tail)).sort();

  for (const phase of PHASE_CACHE) {
    if (
      phase.values.length === uniqTail.length &&
      phase.values.every((v, i) => v === uniqTail[i])
    ) {
      const counts = {};
      tail.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return {
        next: sorted[0][0],
        alt: sorted[1]?.[0] || null,
      };
    }
  }

  return null;
}
