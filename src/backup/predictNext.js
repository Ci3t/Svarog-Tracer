// src/utils/predictNext.js

// very small in-memory cache for phases we already saw this session
// it will reset on refresh, which is fine for your use-case
const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 5;

export function predictNext(rolls) {
  // rolls = array of strings like ["41","44","42", ...]
  // oldest -> newest
  if (!rolls || rolls.length === 0) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "none",
      candidates: [],
    };
  }

  // 0) try to match a cached phase first
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

  // 1) mono check
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

  // 2) recency-weighted frequency
  const { sorted: freqSorted, rawCounts } = weightedFrequency(rolls);
  const dominant = freqSorted[0].value;
  const dominantPct = freqSorted[0].pct / 100;
  const last = rolls[rolls.length - 1];

  // 3) branch: stream is mostly X, but last was a rare value
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

  // 4) stable
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

  // 5) alternating
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

  // 6) rotation
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

  // 7) small recent cyclic
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

  // 8) fallback: recency-weighted markov-2
  const markov = weightedMarkov2(rolls, dominant);
  maybeStorePhase(rolls);
  return {
    prediction: markov.pred,
    confidence: markov.conf,
    alt: dominant,
    mode: "transition",
    candidates: freqSorted.slice(0, 3),
  };
}

/* ------------------ helpers ------------------ */

// recency-weighted frequency
function weightedFrequency(rolls) {
  const counts = {};
  const rawCounts = {};
  const decay = 0.85;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const distFromEnd = n - 1 - idx;
    const w = Math.pow(decay, distFromEnd);
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

// detects small recent loop in the last 6
function detectPhase(seq) {
  const tail = seq.slice(-6);
  // try pattern sizes 2..4
  for (let size = 2; size <= 4; size++) {
    if (tail.length <= size) break;
    const lastChunk = tail.slice(-size).join("|");
    const before = tail.slice(0, -1).join("|");
    if (before.includes(lastChunk)) {
      // continue the chunk
      const next = tail[tail.length - size];
      return next;
    }
  }
  return null;
}

// save phase if it's "stable-ish"
function maybeStorePhase(seq) {
  // look at last 8
  const tail = seq.slice(-8);
  if (tail.length < 5) return;
  const uniq = Array.from(new Set(tail));
  if (uniq.length <= 3) {
    // store it
    const phase = {
      values: uniq.sort(), // normalized
      last: tail[tail.length - 1],
    };
    PHASE_CACHE.unshift(phase);
    if (PHASE_CACHE.length > PHASE_CACHE_LIMIT) {
      PHASE_CACHE.pop();
    }
  }
}

// try to match current tail to a cached phase
function matchCachedPhase(seq) {
  if (PHASE_CACHE.length === 0) return null;
  const tail = seq.slice(-5);
  const uniqTail = Array.from(new Set(tail)).sort();
  for (const phase of PHASE_CACHE) {
    // same value set?
    if (arrayEq(phase.values, uniqTail)) {
      // predict “what usually comes after the last seen”
      const last = seq[seq.length - 1];
      // simple rule: if last is in phase, pick the most frequent in tail
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
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// recency-weighted Markov(2)
function weightedMarkov2(seq, fallback) {
  const table = {};
  const decay = 0.85;
  for (let i = 2; i < seq.length; i++) {
    const key = seq[i - 2] + "|" + seq[i - 1];
    const nxt = seq[i];
    const distFromEnd = seq.length - 1 - i;
    const w = Math.pow(decay, distFromEnd);
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
