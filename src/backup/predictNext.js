// src/utils/predictNext.js

// tiny phase cache
const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 5;

// helper: shift to 4x
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

// simple helper to keep Markov / transition confidence realistic
function clampTransitionConf(conf, min = 0.5, max = 0.75) {
  if (conf < min) return min;
  if (conf > max) return max;
  return conf;
}

/* ===================== 2-STR (main predictor) ===================== */
export function predictNext(rawRolls) {
  // normalize EVERYTHING to 2-digit 4x strings (BBP-style)
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  if (!rolls.length) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "none",
      candidates: [],
    };
  }

  // 1) try cached phase memory (short repeating set like {41,42,43})
  const cached = matchCachedPhase(rolls);
  if (cached) {
    return {
      prediction: cached.next,
      confidence: 0.82,
      alt: cached.alt || null,
      mode: "phase-memory",
      candidates: [
        { value: cached.next, pct: 82 },
        ...(cached.alt ? [{ value: cached.alt, pct: 40 }] : []),
      ],
    };
  }

  // 2) hard mono (e.g. 44 44 44 44)
  const mono = detectMono(rolls, 4);
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

  // 3) recency-weighted frequency
  const { sorted: freqSorted, rawCounts } = weightedFrequency(rolls);
  const dominant = freqSorted[0].value;
  const dominantPct = freqSorted[0].pct / 100;
  const last = rolls[rolls.length - 1];

  // 3.5) “wave” detection: recent tail avoids top2 → suggest snapping back
  const wave = detectWave(rolls, freqSorted);
  if (wave) {
    maybeStorePhase(rolls);
    return {
      prediction: wave.primary,
      confidence: 0.55,
      alt: wave.alt || null,
      mode: "wave",
      candidates: [
        { value: wave.primary, pct: 55 },
        ...(wave.alt ? [{ value: wave.alt, pct: 35 }] : []),
      ],
    };
  }

  // 4) branch: last is rare, but dominant is strong → see what usually follows last
  if (dominantPct >= 0.5 && last !== dominant && rawCounts[last] === 1) {
    const succ = findMostCommonSuccessor(rolls, last);
    if (succ) {
      maybeStorePhase(rolls);
      return {
        prediction: succ,
        confidence: 0.65,
        alt: dominant,
        mode: "branch",
        candidates: [{ value: succ, pct: 65 }, ...freqSorted.slice(0, 2)],
      };
    }
  }

  // 5) stable: 1 value clearly dominates
  if (dominantPct >= 0.6) {
    maybeStorePhase(rolls);
    return {
      prediction: dominant,
      confidence: dominantPct, // can be high (even 1) when literally everything is that value
      alt: freqSorted[1]?.value || null,
      mode: "stable",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 6) alternating pattern between 2 symbols
  if (
    Object.keys(rawCounts).length === 2 &&
    rolls.length >= 4 &&
    isAlternating(rolls.slice(-4))
  ) {
    const other = Object.keys(rawCounts).find((v) => v !== last);
    maybeStorePhase(rolls);
    return {
      prediction: other || dominant,
      confidence: 0.65,
      alt: last,
      mode: "alternate",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 7) rotation pattern ABCABC → next is next in cycle
  if (detectRotation(rolls)) {
    const next = getRotationNext(rolls);
    maybeStorePhase(rolls);
    return {
      prediction: next,
      confidence: 0.7,
      alt: dominant,
      mode: "rotation",
      candidates: [{ value: next, pct: 70 }, ...freqSorted.slice(0, 2)],
    };
  }

  // 8) short cyclic phase inside the tail
  const phaseNext = detectPhase(rolls);
  if (phaseNext) {
    maybeStorePhase(rolls);
    return {
      prediction: phaseNext,
      confidence: 0.7,
      alt: dominant,
      mode: "cyclic",
      candidates: [{ value: phaseNext, pct: 70 }, ...freqSorted.slice(0, 2)],
    };
  }

  // 9) fallback Markov-2 (transition mode) with SAFE confidence caps
  const markov = weightedMarkov2(rolls, dominant);
  const markovConf = clampTransitionConf(markov.conf, 0.5, 0.75);

  maybeStorePhase(rolls);
  return {
    prediction: markov.pred,
    confidence: markovConf,
    alt: dominant,
    mode: "transition",
    candidates: freqSorted.slice(0, 3),
  };
}

/* ===================== 3-STR ===================== */

// strip trailing 0s coming from padded session table
function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}

export function predictNext3(rawRolls = []) {
  // keep only real 3-digit rolls (e.g. 412, 444, 432)
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  if (!rolls.length) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "none-3str",
      candidates: [],
    };
  }

  // mono on last 3 (e.g. 444 444 444)
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

  // recency-weighted frequency
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
  const top = sorted[0];

  // optional “wave” for 3-str, same logic: tail avoids top2 → snap back to core
  const wave3 = detectWaveGeneric(rolls, sorted);
  if (wave3) {
    const main = translateTo4(wave3.primary);
    const alt = wave3.alt ? translateTo4(wave3.alt) : null;
    return {
      prediction: main,
      confidence: 0.55,
      alt,
      mode: "wave-3str",
      candidates: [
        { value: main, pct: 55 },
        ...(alt ? [{ value: alt, pct: 35 }] : []),
      ],
    };
  }

  // tiny successor Markov table
  const succ = mostCommonSuccessor3(rolls);
  if (succ) {
    const baseConf = succ.conf; // 0–1
    const safeConf = clampTransitionConf(baseConf, 0.45, 0.7);

    const main = translateTo4(succ.value);
    const alt = top ? translateTo4(top.value) : null;
    return {
      prediction: main,
      confidence: safeConf,
      alt,
      mode: "markov-3str",
      candidates: [
        { value: main, pct: Math.round(safeConf * 100) },
        ...(alt ? [{ value: alt, pct: 40 }] : []),
      ],
    };
  }

  // fallback: stable-3str (just the most frequent 3-str)
  const main = top ? translateTo4(top.value) : null;
  const alt = sorted[1] ? translateTo4(sorted[1].value) : null;
  return {
    prediction: main,
    confidence: 0.6,
    alt,
    mode: "stable-3str",
    candidates: [
      ...(main ? [{ value: main, pct: 60 }] : []),
      ...(alt ? [{ value: alt, pct: 30 }] : []),
    ],
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
  return {
    value: arr[0][0],
    conf: arr[0][1] / total,
  };
}

/* ===================== 4-STR ===================== */

export function predictNext4(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 4))
    .filter((r) => r.length === 4);

  if (!rolls.length) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "none-4str",
      candidates: [],
    };
  }

  // mono on last 3 4-str entries
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

  // 4-str recency frequency
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
  const top = sorted[0];

  // “wave” for 4-str too
  const wave4 = detectWaveGeneric(rolls, sorted);
  if (wave4) {
    const main = translateTo4(wave4.primary);
    const alt = wave4.alt ? translateTo4(wave4.alt) : null;
    return {
      prediction: main,
      confidence: 0.55,
      alt,
      mode: "wave-4str",
      candidates: [
        { value: main, pct: 55 },
        ...(alt ? [{ value: alt, pct: 35 }] : []),
      ],
    };
  }

  // Markov-style successor
  const succ = mostCommonSuccessor4(rolls);
  if (succ) {
    const baseConf = succ.conf;
    const safeConf = clampTransitionConf(baseConf, 0.45, 0.7);

    const main = translateTo4(succ.value);
    const alt = top ? translateTo4(top.value) : null;
    return {
      prediction: main,
      confidence: safeConf,
      alt,
      mode: "transition-4str",
      candidates: [
        { value: main, pct: Math.round(safeConf * 100) },
        ...(alt ? [{ value: alt, pct: 40 }] : []),
      ],
    };
  }

  // fallback: stable-4str
  const main = top ? translateTo4(top.value) : null;
  const alt = sorted[1] ? translateTo4(sorted[1].value) : null;
  return {
    prediction: main,
    confidence: 0.6,
    alt,
    mode: "stable-4str",
    candidates: [
      ...(main ? [{ value: main, pct: 60 }] : []),
      ...(alt ? [{ value: alt, pct: 30 }] : []),
    ],
  };
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
  return {
    value: arr[0][0],
    conf: arr[0][1] / total,
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

// original 2-str wave
function detectWave(rolls, freqSorted) {
  if (rolls.length < 4) return null;
  const top2 = freqSorted.slice(0, 2).map((x) => x.value);
  const tail = rolls.slice(-3);
  const misses = tail.filter((v) => !top2.includes(v));
  if (misses.length >= 2) {
    return {
      primary: top2[0],
      alt: top2[1] || null,
    };
  }
  return null;
}

// generic wave for 3-str / 4-str
function detectWaveGeneric(rolls, freqSorted) {
  if (rolls.length < 4) return null;
  const top2 = freqSorted.slice(0, 2).map((x) => x.value);
  const tail = rolls.slice(-3);
  const misses = tail.filter((v) => !top2.includes(v));
  if (misses.length >= 2) {
    return {
      primary: top2[0],
      alt: top2[1] || null,
    };
  }
  return null;
}

function detectMono(seq, n) {
  if (seq.length < n) return null;
  const tail = seq.slice(-n);
  const first = tail[0];
  return tail.every((v) => v === first) ? first : null;
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
    const before = tail.slice(0, -1).join("|");
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
      const next = sorted[0][0];
      const alt = sorted[1]?.[0];
      return { next, alt };
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
    return { pred: fallback, conf: 0.5 };
  }
  const sorted = Object.entries(options).sort((a, b) => b[1] - a[1]);
  const total = Object.values(options).reduce((a, v) => a + v, 0);
  return {
    pred: sorted[0][0],
    conf: sorted[0][1] / total,
  };
}
