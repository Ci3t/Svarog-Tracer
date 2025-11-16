// src/utils/predictNext.js — Unity-aware predictor + enhanced modes

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 5;

// Map 41–44 <-> 0–3 space for LCG math
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

function clampTransitionConf(conf, min = 0.4, max = 0.7) {
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

/* 🔥 Enhanced phase detection: deeper lookback, 2–6 chunk size */
function detectPhaseEnhanced(seq) {
  const tail = seq.slice(-12); // look further back

  for (let size = 2; size <= 6; size++) {
    if (tail.length <= size) break;

    const lastChunk = tail.slice(-size);
    const pattern = lastChunk.join("|");

    let count = 0;
    for (let i = 0; i <= tail.length - size; i++) {
      if (tail.slice(i, i + size).join("|") === pattern) count++;
    }

    if (count >= 2) {
      return {
        next: lastChunk[0],
        confidence: 0.78,
        size,
      };
    }
  }
  return null;
}

/* 🔥 LCG-style pattern detection, fixed for 41–44 space */
function detectLCGPattern(seq) {
  if (seq.length < 8) return null;

  // Map 41–44 -> 0..3
  const idxs = seq.map((v) => valToIdx(v)).filter((i) => i >= 0);
  if (idxs.length !== seq.length) return null; // if any value not in 41–44

  const diffs = [];
  for (let i = 1; i < idxs.length; i++) {
    const d = (idxs[i] - idxs[i - 1] + 4) % 4;
    diffs.push(d);
  }

  // try pattern lengths 2..4 on last 2*len steps
  for (let len = 2; len <= 4; len++) {
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
    const nextDiff = lastDiffs[lastDiffs.length - 1];
    const nextIdx = (lastIdx + nextDiff) % 4;
    const predVal = idxToVal(nextIdx);
    const conf = 0.68 + (len - 2) * 0.02; // 0.68–0.72

    return { pred: predVal, conf };
  }

  return null;
}

/* 🔥 3-state Markov: loosened thresholds so it actually fires */
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
  const rawTotal = Object.values(opts).reduce((a, v) => a + Math.round(v), 0);

  // Relaxed: allow single occurrence if confidence is ok
  if (rawTotal >= 1 && conf >= 0.5) {
    return { pred: sorted[0][0], conf };
  }
  return null;
}

/* 🔥 Mono detection tuned for Unity’s “break after 3–4” behaviour */
function detectMono(seq, n = 5) {
  if (seq.length < n) return null;
  const tail = seq.slice(-n);
  const monoVal = tail[0];

  // if last 2 differ, Unity has already “broken” the mono
  const last2 = tail.slice(-2);
  if (last2[0] !== last2[1]) return null;

  return tail.every((v) => v === monoVal) ? monoVal : null;
}

/* ===================== 2-STR ===================== */
export function predictNext(rawRolls) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  // 🔥 lowered requirement: we start guessing after 3 rolls
  if (rolls.length < 3) {
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

  // 1) 🔥 enhanced phase FIRST (strongest signal when it triggers)
  const enhancedPhase = detectPhaseEnhanced(rolls);
  if (enhancedPhase) {
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

  // 2) cached phase-memory (softer confidence now)
  const cached = matchCachedPhase(rolls);
  if (cached) {
    const pred = cached.next;
    const conf = 0.76; // was 0.82
    return {
      prediction: pred,
      confidence: conf,
      alt: cached.alt || getAlt(pred, freqSorted),
      mode: "phase-memory",
      candidates: [
        { value: pred, pct: Math.round(conf * 100) },
        ...(cached.alt && cached.alt !== pred
          ? [{ value: cached.alt, pct: 40 }]
          : []),
      ],
    };
  }

  // 3) mono (rare but very strong)
  const mono = detectMono(rolls, 5);
  if (mono) {
    maybeStorePhase(rolls);
    return {
      prediction: mono,
      confidence: 0.9,
      alt: null,
      mode: "mono",
      candidates: [{ value: mono, pct: 100 }],
    };
  }

  // 4) LCG cycle (Unity-style step loops)
  const lcg = detectLCGPattern(rolls);
  if (lcg && VALS.includes(lcg.pred)) {
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

  // 5) Alternate pattern (41/44 bouncing etc.)
  if (Object.keys(rawCounts).length === 2 && rolls.length >= 4) {
    const last4 = rolls.slice(-4);
    if (isAlternating(last4)) {
      const other = Object.keys(rawCounts).find((v) => v !== last);
      const pred = other || dominant;
      maybeStorePhase(rolls);
      const conf = 0.75;
      return {
        prediction: pred,
        confidence: conf,
        alt: getAlt(pred, freqSorted),
        mode: "alternate",
        candidates: buildCandidates(pred, conf, freqSorted),
      };
    }
  }

  // 6) Stable (one value dominates window)
  if (dominantPct >= 0.6) {
    maybeStorePhase(rolls);
    return {
      prediction: dominant,
      confidence: dominantPct,
      alt: freqSorted[1]?.value || null,
      mode: "stable",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 7) Wave (top commons missing from recent streak)
  const wave = detectWave(rolls, freqSorted);
  if (wave) {
    maybeStorePhase(rolls);
    const conf = 0.58;
    const pred = wave.primary;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "wave",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 8) Branch (rare one-off that usually goes somewhere)
  if (dominantPct >= 0.5 && last !== dominant && rawCounts[last] === 1) {
    const succ = findMostCommonSuccessor(rolls, last);
    if (succ) {
      maybeStorePhase(rolls);
      const conf = 0.65;
      const pred = succ;
      return {
        prediction: pred,
        confidence: conf,
        alt: getAlt(pred, freqSorted),
        mode: "branch",
        candidates: buildCandidates(pred, conf, freqSorted),
      };
    }
  }

  // 9) Rotation loop
  if (detectRotation(rolls)) {
    const next = getRotationNext(rolls);
    maybeStorePhase(rolls);
    const conf = 0.7;
    return {
      prediction: next,
      confidence: conf,
      alt: getAlt(next, freqSorted),
      mode: "rotation",
      candidates: buildCandidates(next, conf, freqSorted),
    };
  }

  // 10) Original short cyclic backup
  const phaseNext = detectPhase(rolls);
  if (phaseNext) {
    maybeStorePhase(rolls);
    const conf = 0.7;
    const pred = phaseNext;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "cyclic",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 11) 3-state Markov before final fallback
  const markov3 = enhancedMarkov3(rolls);
  if (markov3) {
    maybeStorePhase(rolls);
    const pred = markov3.pred;
    const conf = markov3.conf;
    return {
      prediction: pred,
      confidence: conf,
      alt: getAlt(pred, freqSorted),
      mode: "markov-3state",
      candidates: buildCandidates(pred, conf, freqSorted),
    };
  }

  // 12) Weak pair-Markov fallback
  const markov = weightedMarkov2(rolls, dominant);
  const markovConf = clampTransitionConf(markov.conf, 0.4, 0.7);
  maybeStorePhase(rolls);
  return {
    prediction: markov.pred,
    confidence: markovConf,
    alt: getAlt(markov.pred, freqSorted),
    mode: "transition",
    candidates: buildCandidates(markov.pred, markovConf, freqSorted),
  };
}

/* ===================== 3-STR / 4-STR (unchanged behaviour, minor tweaks) ===================== */

function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}

export function predictNext3(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  if (rolls.length < 3) {
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

  const wave3 = detectWaveGeneric(rolls, sorted);
  if (wave3) {
    const main = translateTo4(wave3.primary);
    const conf = 0.58;
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
    const safeConf = clampTransitionConf(succ.conf, 0.4, 0.7);
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
  const conf = 0.6;
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

  if (rolls.length < 3) {
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
        confidence: 0.85,
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
    const conf = 0.58;
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
    const safeConf = clampTransitionConf(succ.conf, 0.4, 0.7);
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
  const conf = 0.6;
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

/* ===== shared helpers ===== */

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
    return { pred: fallback, conf: 0.4 };
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
