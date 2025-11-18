// src/utils/predictNext.js — BEAST MODE: Adaptive, Defensive Unity RNG Predictor
// Built to handle Unity's pattern-breaking chaos

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 5;

// Track pattern reliability (resets each session)
const PATTERN_TRUST = {
  cyclic: { hits: 0, total: 0 },
  phase: { hits: 0, total: 0 },
  lcg: { hits: 0, total: 0 },
};

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

function clampTransitionConf(conf, min = 0.35, max = 0.65) {
  // Further weakened fallback
  if (conf < min) return min;
  if (conf > max) return max;
  return conf;
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

/* 🔥 ADAPTIVE: Adjust confidence based on recent success rate */
function getAdaptiveConfidence(baseConf, patternType) {
  const trust = PATTERN_TRUST[patternType];
  if (!trust || trust.total < 3) return baseConf; // not enough data yet

  const successRate = trust.hits / trust.total;

  // Adjust confidence based on actual performance
  if (successRate < 0.3) return baseConf * 0.7; // pattern failing, lower conf
  if (successRate > 0.6) return Math.min(baseConf * 1.1, 0.85); // pattern working, boost
  return baseConf;
}

/* 🔥 DEFENSIVE: Detect when Unity is actively breaking patterns */
function detectPatternBreak(seq) {
  if (seq.length < 5) return false;

  const recent = seq.slice(-5);

  // Check if same value trying to establish mono
  const last3 = recent.slice(-3);
  if (last3[0] === last3[1] && last3[1] !== last3[2]) {
    return true; // Unity broke a potential mono
  }

  // Check if alternating pattern broke
  if (recent.length >= 4) {
    const alt = [recent[0], recent[1], recent[2], recent[3]];
    if (alt[0] !== alt[1] && alt[1] !== alt[2] && alt[2] === alt[0]) {
      // Was alternating, check if last roll broke it
      if (recent[4] === recent[3]) return true;
    }
  }

  return false;
}

/* 🔥 ENHANCED: Shorter, stricter phase detection with recency bias */
function detectPhaseEnhanced(seq) {
  const tail = seq.slice(-8); // REDUCED from 12 to 8

  for (let size = 2; size <= 4; size++) {
    // REDUCED from 6 to 4
    if (tail.length <= size) break;

    const lastChunk = tail.slice(-size);
    const pattern = lastChunk.join("|");

    let count = 0;
    let recentCount = 0; // NEW: track recent matches

    for (let i = 0; i <= tail.length - size; i++) {
      if (tail.slice(i, i + size).join("|") === pattern) {
        count++;
        // Count as recent if within last 2 pattern-lengths
        if (i >= tail.length - size * 2) {
          recentCount++;
        }
      }
    }

    // STRICTER: need 2+ total AND at least 1 recent
    if (count >= 2 && recentCount >= 1) {
      const baseConf = 0.64; // LOWERED from 0.78
      const adaptiveConf = getAdaptiveConfidence(baseConf, "cyclic");

      return {
        next: lastChunk[0],
        confidence: adaptiveConf,
        size,
      };
    }
  }
  return null;
}

/* 🔥 IMPROVED: LCG with shorter lookback */
function detectLCGPattern(seq) {
  if (seq.length < 7) return null; // LOWERED from 8

  const idxs = seq.map((v) => valToIdx(v)).filter((i) => i >= 0);
  if (idxs.length !== seq.length) return null;

  const diffs = [];
  for (let i = 1; i < idxs.length; i++) {
    const d = (idxs[i] - idxs[i - 1] + 4) % 4;
    diffs.push(d);
  }

  // Only try short patterns (2-3) for more reliability
  for (let len = 2; len <= 3; len++) {
    // REDUCED from 4
    if (diffs.length < 2 * len) continue;

    const lastDiffs = diffs.slice(-len);
    const prevDiffs = diffs.slice(-2 * len, -len);

    let same = true;
    for (let i = 0; i < len; i++) {
      if (lastDiffs[i] !== prevDiffs[i]) {
        same = false;
        break;
      }
    }
    if (!same) continue;

    const lastIdx = idxs[idxs.length - 1];
    const nextDiff = lastDiffs[0]; // Use FIRST diff of pattern, not last
    const nextIdx = (lastIdx + nextDiff) % 4;
    const predVal = idxToVal(nextIdx);

    const baseConf = 0.58 + (len - 2) * 0.04; // LOWERED: 0.58-0.62
    const adaptiveConf = getAdaptiveConfidence(baseConf, "lcg");

    return { pred: predVal, conf: adaptiveConf };
  }

  return null;
}

/* 🔥 SMARTER: 3-state Markov with confidence scaling */
function enhancedMarkov3(seq) {
  if (seq.length < 6) return null;

  const table = {};
  const decay = 0.85;

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

  // More samples = more trust
  const sampleCount = Object.values(opts).reduce(
    (a, v) => a + Math.round(v),
    0
  );

  if (sampleCount >= 2 && conf >= 0.55) {
    // Scale confidence by sample size
    const scaledConf = Math.min(conf * (0.8 + sampleCount * 0.1), 0.75);
    return { pred: sorted[0][0], conf: scaledConf };
  }

  return null;
}

/* 🔥 TUNED: Mono detection with break awareness */
function detectMono(seq, n = 4) {
  // REDUCED from 5 to 4
  if (seq.length < n) return null;
  const tail = seq.slice(-n);
  const monoVal = tail[0];

  // Check if pattern is breaking
  const last2 = tail.slice(-2);
  if (last2[0] !== last2[1]) return null;

  return tail.every((v) => v === monoVal) ? monoVal : null;
}

/* ===================== 2-STR BEAST MODE ===================== */
export function predictNext(rawRolls) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  // 🔧 Your change: require at least 6 rolls before ANY prediction
  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data",
      candidates: [],
    };
  }

  const { sorted: freqSorted, rawCounts } = weightedFrequency(rolls);
  const dominant = freqSorted[0].value;
  const dominantPct = freqSorted[0].pct / 100;
  const last = rolls[rolls.length - 1];

  // 🔥 Check if Unity is breaking patterns
  const isBreaking = detectPatternBreak(rolls);

  // 1) Mono (simplest, most reliable when it happens)
  const mono = detectMono(rolls, 4);
  if (mono && !isBreaking) {
    maybeStorePhase(rolls);
    return {
      prediction: mono,
      confidence: 0.88, // LOWERED from 0.9
      alt: null,
      mode: "mono",
      candidates: [{ value: mono, pct: 100 }],
    };
  }

  // 2) Stable dominance (solid baseline)
  if (dominantPct >= 0.65 && !isBreaking) {
    // INCREASED threshold from 0.6
    maybeStorePhase(rolls);
    return {
      prediction: dominant,
      confidence: Math.min(dominantPct, 0.78), // Cap at 78%
      alt: freqSorted[1]?.value || null,
      mode: "stable",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 3) Enhanced phase (adaptive confidence)
  const enhancedPhase = detectPhaseEnhanced(rolls);
  if (enhancedPhase && !isBreaking) {
    maybeStorePhase(rolls);
    const pred = enhancedPhase.next;
    const conf = enhancedPhase.confidence;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "cyclic-enhanced",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 4) Cached phase-memory (adaptive)
  const cached = matchCachedPhase(rolls);
  if (cached && !isBreaking) {
    const baseConf = 0.62; // LOWERED from 0.76
    const adaptiveConf = getAdaptiveConfidence(baseConf, "phase");
    const pred = cached.next;
    return {
      prediction: pred,
      confidence: adaptiveConf,
      alt: cached.alt || getAlt(pred, freqSorted),
      mode: "phase-memory",
      candidates: [
        { value: pred, pct: Math.round(adaptiveConf * 100) },
        ...(cached.alt && cached.alt !== pred
          ? [{ value: cached.alt, pct: 35 }]
          : []),
      ],
    };
  }

  // 5) LCG cycle (adaptive)
  const lcg = detectLCGPattern(rolls);
  if (lcg && VALS.includes(lcg.pred) && !isBreaking) {
    maybeStorePhase(rolls);
    const pred = lcg.pred;
    const conf = lcg.conf;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "lcg-cycle",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 6) Alternate (simple pattern)
  if (Object.keys(rawCounts).length === 2 && rolls.length >= 4) {
    const last4 = rolls.slice(-4);
    if (isAlternating(last4) && !isBreaking) {
      const other = Object.keys(rawCounts).find((v) => v !== last);
      const pred = other || dominant;
      maybeStorePhase(rolls);
      return {
        prediction: pred,
        confidence: 0.68, // LOWERED from 0.75
        alt: getAlt(pred, freqSorted),
        mode: "alternate",
        candidates: buildCandidates(pred, 0.68, freqSorted),
      };
    }
  }

  // 7) Wave
  const wave = detectWave(rolls, freqSorted);
  if (wave) {
    maybeStorePhase(rolls);
    const conf = 0.52; // LOWERED from 0.58
    const pred = wave.primary;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "wave",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 8) Branch
  if (dominantPct >= 0.5 && last !== dominant && rawCounts[last] === 1) {
    const succ = findMostCommonSuccessor(rolls, last);
    if (succ) {
      maybeStorePhase(rolls);
      const conf = 0.58; // LOWERED from 0.65
      return {
        prediction: succ,
        confidence: conf,
        alt: getAlt(succ, freqSorted),
        mode: "branch",
        candidates: buildCandidates(succ, conf, freqSorted),
      };
    }
  }

  // 9) Rotation
  if (detectRotation(rolls)) {
    const next = getRotationNext(rolls);
    maybeStorePhase(rolls);
    return {
      prediction: next,
      confidence: 0.64, // LOWERED from 0.7
      alt: getAlt(next, freqSorted),
      mode: "rotation",
      candidates: buildCandidates(next, 0.64, freqSorted),
    };
  }

  // 10) Original cyclic
  const phaseNext = detectPhase(rolls);
  if (phaseNext) {
    maybeStorePhase(rolls);
    const conf = 0.62; // LOWERED from 0.7
    return {
      prediction: phaseNext,
      confidence: conf,
      alt: getAlt(phaseNext, freqSorted),
      mode: "cyclic",
      candidates: buildCandidates(phaseNext, conf, freqSorted),
    };
  }

  // 11) 3-state Markov
  const markov3 = enhancedMarkov3(rolls);
  if (markov3) {
    maybeStorePhase(rolls);
    return {
      prediction: markov3.pred,
      confidence: markov3.conf,
      alt: getAlt(markov3.pred, freqSorted),
      mode: "markov-3state",
      candidates: buildCandidates(markov3.pred, markov3.conf, freqSorted),
    };
  }

  // 12) Weak fallback
  const markov = weightedMarkov2(rolls, dominant);
  const markovConf = clampTransitionConf(markov.conf, 0.35, 0.65);
  maybeStorePhase(rolls);
  return {
    prediction: markov.pred,
    confidence: markovConf,
    alt: getAlt(markov.pred, freqSorted),
    mode: "transition",
    candidates: buildCandidates(markov.pred, markovConf, freqSorted),
  };
}

/* ===================== 3-STR / 4-STR (same min-roll idea) ===================== */

function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}

export function predictNext3(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  // 🔧 use >=6 rolls as bare minimum here too
  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-3str",
      candidates: [],
    };
  }

  if (rolls.length >= 3) {
    const tail = rolls.slice(-3);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: 0.82, // LOWERED from 0.85
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

  const wave3 = detectWaveGeneric(rolls, sorted);
  if (wave3) {
    const main = translateTo4(wave3.primary);
    const conf = 0.52;
    const altRaw = getAlt(wave3.primary, sorted);
    return {
      prediction: main,
      confidence: conf,
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "wave-3str",
      candidates: buildCandidates(
        main,
        conf,
        sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
      ),
    };
  }

  const succ = mostCommonSuccessor3(rolls);
  if (succ) {
    const safeConf = clampTransitionConf(succ.conf, 0.35, 0.65);
    const main = translateTo4(succ.value);
    const altRaw = getAlt(succ.value, sorted);
    return {
      prediction: main,
      confidence: safeConf,
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "markov-3str",
      candidates: buildCandidates(
        main,
        safeConf,
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
  const conf = 0.58;
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);
  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "stable-3str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

export function predictNext4(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 4))
    .filter((r) => r.length === 4);

  // 🔧 same idea: need 6+ for any 4-str prediction
  if (rolls.length < 6) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-4str",
      candidates: [],
    };
  }

  if (rolls.length >= 3) {
    const tail = rolls.slice(-3);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: 0.82,
        alt: null,
        mode: "mono-4str",
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

  const wave4 = detectWaveGeneric(rolls, sorted);
  if (wave4) {
    const main = translateTo4(wave4.primary);
    const conf = 0.52;
    const altRaw = getAlt(wave4.primary, sorted);
    return {
      prediction: main,
      confidence: conf,
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "wave-4str",
      candidates: buildCandidates(
        main,
        conf,
        sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
      ),
    };
  }

  const succ = mostCommonSuccessor4(rolls);
  if (succ) {
    const safeConf = clampTransitionConf(succ.conf, 0.35, 0.65);
    const main = translateTo4(succ.value);
    const altRaw = getAlt(succ.value, sorted);
    return {
      prediction: main,
      confidence: safeConf,
      alt: altRaw ? translateTo4(altRaw) : null,
      mode: "transition-4str",
      candidates: buildCandidates(
        main,
        safeConf,
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
  const conf = 0.58;
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);
  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "stable-4str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

/* ===== HELPERS ===== */

function weightedFrequency(rolls) {
  const counts = {};
  const rawCounts = {};
  const decay = 0.85;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    counts[val] = (counts[val] || 0) + w;
    rawCounts[val] = (rawCounts[val] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(counts)
    .map(([value, w]) => ({
      value,
      pct: Math.round((w / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
  return { sorted, rawCounts };
}

function detectWave(rolls, freqSorted) {
  if (rolls.length < 4) return null;
  const top2 = freqSorted.slice(0, 2).map((x) => x.value);
  const tail = rolls.slice(-3);
  const misses = tail.filter((v) => !top2.includes(v));
  if (misses.length >= 2) return { primary: top2[0], alt: top2[1] || null };
  return null;
}

function detectWaveGeneric(rolls, freqSorted) {
  if (rolls.length < 4) return null;
  const top2 = freqSorted.slice(0, 2).map((x) => x.value);
  const tail = rolls.slice(-3);
  const misses = tail.filter((v) => !top2.includes(v));
  if (misses.length >= 2) return { primary: top2[0], alt: top2[1] || null };
  return null;
}

function findMostCommonSuccessor(seq, target) {
  const nextCounts = {};
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i] === target) {
      const nxt = seq[i + 1];
      nextCounts[nxt] = (nextCounts[nxt] || 0) + 1;
    }
  }
  const sorted = Object.entries(nextCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

function isAlternating(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1]) return false;
  }
  return true;
}

function detectRotation(seq) {
  if (seq.length < 6) return false;
  const tail = seq.slice(-6);
  const first = tail.slice(0, 3).join(",");
  const second = tail.slice(3).join(",");
  return first === second;
}

function getRotationNext(seq) {
  const tail = seq.slice(-4);
  const uniq = Array.from(new Set(tail));
  const last = seq[seq.length - 1];
  const idx = uniq.indexOf(last);
  return uniq[(idx + 1) % uniq.length];
}

function detectPhase(seq) {
  const tail = seq.slice(-6);
  for (let size = 2; size <= 4; size++) {
    if (tail.length <= size) break;
    const lastChunk = tail.slice(-size).join("|");
    const before = tail.slice(0, -size).join("|");
    if (before.includes(lastChunk)) {
      return tail[tail.length - size];
    }
  }
  return null;
}

function maybeStorePhase(seq) {
  const tail = seq.slice(-8);
  if (tail.length < 5) return;
  const uniq = Array.from(new Set(tail));
  if (uniq.length <= 3) {
    const phase = { values: uniq.sort(), last: tail[tail.length - 1] };
    PHASE_CACHE.unshift(phase);
    if (PHASE_CACHE.length > PHASE_CACHE_LIMIT) PHASE_CACHE.pop();
  }
}

function matchCachedPhase(seq) {
  if (!PHASE_CACHE.length) return null;
  const tail = seq.slice(-5);
  const uniqTail = Array.from(new Set(tail)).sort();
  for (const phase of PHASE_CACHE) {
    if (arrayEq(phase.values, uniqTail)) {
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

function arrayEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function weightedMarkov2(seq, fallback) {
  const table = {};
  const decay = 0.85;
  for (let i = 2; i < seq.length; i++) {
    const key = seq[i - 2] + "|" + seq[i - 1];
    const nxt = seq[i];
    const dist = seq.length - 1 - i;
    const w = Math.pow(decay, dist);
    table[key] ??= {};
    table[key][nxt] = (table[key][nxt] || 0) + w;
  }
  const lastKey = seq.slice(-2).join("|");
  const options = table[lastKey];
  if (!options) {
    return { pred: fallback, conf: 0.35 };
  }
  const sorted = Object.entries(options).sort((a, b) => b[1] - a[1]);
  const total = Object.values(options).reduce((a, v) => a + v, 0);
  return {
    pred: sorted[0][0],
    conf: sorted[0][1] / total,
  };
}

function mostCommonSuccessor3(seq) {
  if (seq.length < 3) return null;
  const table = {};
  for (let i = 0; i < seq.length - 1; i++) {
    const cur = seq[i];
    const nxt = seq[i + 1];
    table[cur] ??= {};
    table[cur][nxt] = (table[cur][nxt] || 0) + 1;
  }
  const last = seq[seq.length - 1];
  const opts = table[last];
  if (!opts) return null;
  const arr = Object.entries(opts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(opts).reduce((a, v) => a + v, 0);
  return { value: arr[0][0], conf: arr[0][1] / total };
}

function mostCommonSuccessor4(seq) {
  if (seq.length < 3) return null;
  const table = {};
  for (let i = 0; i < seq.length - 1; i++) {
    const cur = seq[i];
    const nxt = seq[i + 1];
    table[cur] ??= {};
    table[cur][nxt] = (table[cur][nxt] || 0) + 1;
  }
  const last = seq[seq.length - 1];
  const opts = table[last];
  if (!opts) return null;
  const arr = Object.entries(opts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(opts).reduce((a, v) => a + v, 0);
  return { value: arr[0][0], conf: arr[0][1] / total };
}
