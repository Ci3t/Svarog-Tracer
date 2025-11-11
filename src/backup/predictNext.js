// src/utils/predictNext.js

// main entry
export function predictNext(rolls) {
  // rolls is an array of strings like ["41","44","42", ...]
  // oldest -> newest (you already sort in App.jsx)
  if (!rolls || rolls.length === 0) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "none",
      candidates: [],
    };
  }

  // 0) MONO check – if last 4 are the same, just stay there
  const mono = detectMono(rolls, 4);
  if (mono) {
    return {
      prediction: mono,
      confidence: 0.9,
      alt: null,
      mode: "mono",
      candidates: [{ value: mono, pct: 100 }],
    };
  }

  // 1) recency-weighted frequency
  const { sorted: freqSorted, rawCounts } = weightedFrequency(rolls);
  const dominant = freqSorted[0].value;
  const dominantPct = freqSorted[0].pct / 100;
  const last = rolls[rolls.length - 1];

  // 2) branch: mostly X, but last was a one-off -> follow that one-off
  if (dominantPct >= 0.5 && last !== dominant && rawCounts[last] === 1) {
    const succ = findMostCommonSuccessor(rolls, last);
    if (succ) {
      return {
        prediction: succ,
        confidence: 0.65,
        alt: dominant,
        mode: "branch",
        candidates: [{ value: succ, pct: 65 }, ...freqSorted.slice(0, 2)],
      };
    }
  }

  // 3) stable
  if (dominantPct >= 0.6) {
    return {
      prediction: dominant,
      confidence: dominantPct,
      alt: freqSorted[1]?.value || null,
      mode: "stable",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 4) alternating 2-liner
  if (
    Object.keys(rawCounts).length === 2 &&
    rolls.length >= 4 &&
    isAlternating(rolls.slice(-4))
  ) {
    const other = Object.keys(rawCounts).find((v) => v !== last);
    return {
      prediction: other || dominant,
      confidence: 0.65,
      alt: last,
      mode: "alternate",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 5) strict rotation (rare)
  if (detectRotation(rolls)) {
    const next = getRotationNext(rolls);
    return {
      prediction: next,
      confidence: 0.7,
      alt: dominant,
      mode: "rotation",
      candidates: [{ value: next, pct: 70 }, ...freqSorted.slice(0, 2)],
    };
  }

  // 6) cyclic / phase – try to continue a small repeating tail
  const phaseNext = detectPhase(rolls);
  if (phaseNext) {
    return {
      prediction: phaseNext,
      confidence: 0.7,
      alt: dominant,
      mode: "cyclic",
      candidates: [{ value: phaseNext, pct: 70 }, ...freqSorted.slice(0, 2)],
    };
  }

  // 7) weighted markov fallback (2-step memory, recency weighted)
  const markov = weightedMarkov2(rolls, dominant);
  return {
    prediction: markov.pred,
    confidence: markov.conf,
    alt: dominant,
    mode: "transition",
    candidates: freqSorted.slice(0, 3),
  };
}

/* ------------------ helpers ------------------ */

// recency-weighted frequency: newer rolls count a bit more
function weightedFrequency(rolls) {
  // rolls is oldest -> newest
  const weights = [];
  const base = 1.0;
  const decay = 0.85; // last roll ~1.0, one before ~0.85, etc.
  for (let i = 0; i < rolls.length; i++) {
    const distFromEnd = rolls.length - 1 - i;
    weights.push(base * Math.pow(decay, distFromEnd));
  }

  const counts = {};
  const rawCounts = {};
  rolls.forEach((val, idx) => {
    counts[val] = (counts[val] || 0) + weights[idx];
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

// small cyclic pattern in last ~6 rolls
function detectPhase(seq) {
  const tailWindow = seq.slice(-6);
  for (let size = 2; size <= 4; size++) {
    if (tailWindow.length <= size) break;
    const tail = tailWindow.slice(-size).join("|");
    const before = tailWindow.slice(0, -1).join("|");
    const idx = before.indexOf(tail);
    if (idx !== -1) {
      const original = tailWindow.slice(0, -1);
      const startIndex = Math.floor(idx / 2);
      const nextIdx = startIndex + size;
      const candidate = original[nextIdx];
      if (candidate) return candidate;
    }
  }
  return null;
}

// recency-weighted Markov(2)
function weightedMarkov2(seq, fallback) {
  // build transitions with recency weights
  const table = {};
  const decay = 0.85;
  for (let i = 2; i < seq.length; i++) {
    const key = seq[i - 2] + "|" + seq[i - 1];
    const nxt = seq[i];
    const distFromEnd = seq.length - 1 - i; // 0 for newest transition
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
