// FINAL: Ultra-Simple Beast Mode (Pure Frequency + Chaos Handling)
// Key insight: HSR RNG is CHAOTIC. Stop hunting patterns. Use frequency + smart tiebreaker.

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 3;

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

function clampConf(conf, max = 0.62) {
  return Math.max(0.35, Math.min(conf, max));
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

/* 🔥 SIMPLE: Only detect STRONG mono (4+ same) */
function detectMono(seq, n = 4) {
  if (seq.length < n) return null;
  const tail = seq.slice(-n);
  const monoVal = tail[0];
  if (tail.every((v) => v === monoVal)) {
    return monoVal;
  }
  return null;
}

/* 🔥 SIMPLE: Last-value successor (what comes after X?) */
function getLastValueSuccessor(rolls, freqSorted) {
  if (rolls.length < 4) return null;

  const last = rolls[rolls.length - 1];
  const succCounts = {};

  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      const nxt = rolls[i + 1];
      succCounts[nxt] = (succCounts[nxt] || 0) + 1;
    }
  }

  if (Object.keys(succCounts).length < 2) return null; // need at least 2 options

  const sorted = Object.entries(succCounts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(succCounts).reduce((a, v) => a + v, 0);
  const conf = sorted[0][1] / total;

  if (conf >= 0.45 && total >= 2) {
    return {
      pred: sorted[0][0],
      conf: clampConf(conf, 0.62),
      alt: sorted[1]?.[0],
    };
  }

  return null;
}

/* 🔥 SIMPLE: Dominant value (appears most often) */
function getDominant(freqSorted) {
  const dom = freqSorted[0];
  const alt = freqSorted[1];
  return { pred: dom.value, conf: dom.pct / 100, alt: alt?.value || null };
}

/* 🔥 SIMPLE: Opposite of last (mod4 + 2) */
function getOpposite(last, freqSorted) {
  const idx = valToIdx(last);
  const oppIdx = (idx + 2) % 4;
  const opp = idxToVal(oppIdx);

  // Make sure it's in top 2
  const inTopTwo = freqSorted.slice(0, 2).some((c) => c.value === opp);
  if (!inTopTwo) {
    return { pred: freqSorted[1]?.value || freqSorted[0].value, conf: 0.4 };
  }

  return { pred: opp, conf: 0.45 };
}

/* ===================== 2-STR: ULTRA-SIMPLE ===================== */
export function predictNext(rawRolls) {
  const rolls = (rawRolls || [])
    .map((r) => translateTo4(String(r)).slice(0, 2))
    .filter(Boolean);

  if (rolls.length < 5) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data",
      candidates: [],
    };
  }

  const { sorted: freqSorted } = weightedFrequency(rolls);
  const last = rolls[rolls.length - 1];

  // 1) Mono: 4+ same values
  const mono = detectMono(rolls, 4);
  if (mono) {
    maybeStorePhase(rolls);
    return {
      prediction: mono,
      confidence: clampConf(0.75, 0.8),
      alt: getAlt(mono, freqSorted),
      mode: "mono",
      candidates: [{ value: mono, pct: 100 }],
    };
  }

  // 2) Last-value successor: "what comes after the last value?"
  const succ = getLastValueSuccessor(rolls, freqSorted);
  if (succ) {
    maybeStorePhase(rolls);
    return {
      prediction: succ.pred,
      confidence: succ.conf,
      alt: succ.alt || freqSorted[1]?.value,
      mode: "last-successor",
      candidates: buildCandidates(succ.pred, succ.conf, freqSorted),
    };
  }

  // 3) Dominant: most frequent value
  const dom = getDominant(freqSorted);
  if (dom.conf >= 0.55) {
    maybeStorePhase(rolls);
    return {
      prediction: dom.pred,
      confidence: clampConf(dom.conf + 0.05, 0.68),
      alt: dom.alt,
      mode: "dominant",
      candidates: freqSorted.slice(0, 3),
    };
  }

  // 4) Cached phase
  const cached = matchCachedPhase(rolls);
  if (cached) {
    maybeStorePhase(rolls);
    return {
      prediction: cached.next,
      confidence: clampConf(0.5, 0.6),
      alt: cached.alt || getAlt(cached.next, freqSorted),
      mode: "phase-memory",
      candidates: buildCandidates(cached.next, 0.5, freqSorted),
    };
  }

  // 5) Opposite fallback (mod4 + 2)
  const opp = getOpposite(last, freqSorted);
  maybeStorePhase(rolls);
  return {
    prediction: opp.pred,
    confidence: opp.conf,
    alt: getAlt(opp.pred, freqSorted),
    mode: "opposite-fallback",
    candidates: buildCandidates(opp.pred, opp.conf, freqSorted),
  };
}

/* ===================== 3-STR / 4-STR ===================== */

function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}

export function predictNext3(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 3))
    .filter((r) => r.length === 3);

  if (rolls.length < 5) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-3str",
      candidates: [],
    };
  }

  // Mono
  if (rolls.length >= 4) {
    const tail = rolls.slice(-4);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: clampConf(0.75, 0.8),
        alt: null,
        mode: "mono-3str",
        candidates: [{ value: p, pct: 100 }],
      };
    }
  }

  const freq = {};
  const decay = 0.87;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + w;
  });
  const sorted = Object.entries(freq)
    .map(([value, w]) => ({ value, pct: Math.round((w / n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  // Last-value successor
  const last = rolls[rolls.length - 1];
  const succCounts = {};
  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      succCounts[rolls[i + 1]] = (succCounts[rolls[i + 1]] || 0) + 1;
    }
  }

  if (Object.keys(succCounts).length >= 2) {
    const succSorted = Object.entries(succCounts).sort((a, b) => b[1] - a[1]);
    const total = Object.values(succCounts).reduce((a, v) => a + v, 0);
    const conf = succSorted[0][1] / total;

    if (conf >= 0.45) {
      const main = translateTo4(succSorted[0][0]);
      const altRaw = succSorted[1]?.[0];
      return {
        prediction: main,
        confidence: clampConf(conf, 0.62),
        alt: altRaw ? translateTo4(altRaw) : null,
        mode: "last-successor-3str",
        candidates: buildCandidates(
          main,
          clampConf(conf, 0.62),
          sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
        ),
      };
    }
  }

  // Dominant
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

  const conf = clampConf(top.pct / 100 + 0.05, 0.65);
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);

  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "dominant-3str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

export function predictNext4(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => stripZeros(String(r)).slice(0, 4))
    .filter((r) => r.length === 4);

  if (rolls.length < 5) {
    return {
      prediction: null,
      confidence: 0,
      alt: null,
      mode: "insufficient-data-4str",
      candidates: [],
    };
  }

  // Mono
  if (rolls.length >= 4) {
    const tail = rolls.slice(-4);
    if (tail.every((v) => v === tail[0])) {
      const p = translateTo4(tail[0]);
      return {
        prediction: p,
        confidence: clampConf(0.75, 0.8),
        alt: null,
        mode: "mono-4str",
        candidates: [{ value: p, pct: 100 }],
      };
    }
  }

  const freq = {};
  const decay = 0.87;
  const n = rolls.length;
  rolls.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const w = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + w;
  });
  const sorted = Object.entries(freq)
    .map(([value, w]) => ({ value, pct: Math.round((w / n) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  // Last-value successor
  const last = rolls[rolls.length - 1];
  const succCounts = {};
  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      succCounts[rolls[i + 1]] = (succCounts[rolls[i + 1]] || 0) + 1;
    }
  }

  if (Object.keys(succCounts).length >= 2) {
    const succSorted = Object.entries(succCounts).sort((a, b) => b[1] - a[1]);
    const total = Object.values(succCounts).reduce((a, v) => a + v, 0);
    const conf = succSorted[0][1] / total;

    if (conf >= 0.45) {
      const main = translateTo4(succSorted[0][0]);
      const altRaw = succSorted[1]?.[0];
      return {
        prediction: main,
        confidence: clampConf(conf, 0.62),
        alt: altRaw ? translateTo4(altRaw) : null,
        mode: "last-successor-4str",
        candidates: buildCandidates(
          main,
          clampConf(conf, 0.62),
          sorted.map((c) => ({ ...c, value: translateTo4(c.value) }))
        ),
      };
    }
  }

  // Dominant
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

  const conf = clampConf(top.pct / 100 + 0.05, 0.65);
  const transSorted = sorted.map((c) => ({
    ...c,
    value: translateTo4(c.value),
  }));
  const altRaw = getAlt(top.value, sorted);

  return {
    prediction: main,
    confidence: conf,
    alt: altRaw ? translateTo4(altRaw) : null,
    mode: "dominant-4str",
    candidates: buildCandidates(main, conf, transSorted),
  };
}

/* ===== HELPERS ===== */

function weightedFrequency(rolls) {
  const counts = {};
  const decay = 0.88;
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

function maybeStorePhase(seq) {
  const tail = seq.slice(-8);
  if (tail.length < 4) return;

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
