// AGGRESSIVE VERSION — focuses on maximizing TOP-2 even if MAIN accuracy drops
// Designed for noisy RNG like your data (ALT can win more than MAIN)

const PHASE_CACHE = [];
const PHASE_CACHE_LIMIT = 6;

const VALS = ["41", "42", "43", "44"];

function clampConf(conf, min = 0.35, max = 0.85) {
  return Math.max(min, Math.min(conf, max));
}

function weightedFrequency(rolls) {
  const counts = {};
  const decay = 0.92;
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

function buildCandidates(main, conf, freqSorted) {
  const out = [{ value: main, pct: Math.round(conf * 100) }];
  const alts = freqSorted.filter((x) => x.value !== main).slice(0, 2);
  return [...out, ...alts];
}

// Aggressive main/alt shuffler
function aggressiveFinalize(base, freqSorted) {
  const candidates = buildCandidates(
    base.prediction,
    base.confidence,
    freqSorted
  );

  const topFreq = freqSorted[0]?.value;
  const secondFreq = freqSorted[1]?.value;

  let main = base.prediction;
  let alt = base.alt || secondFreq;

  // If frequency disagrees with model — trust frequency more
  if (freqSorted[0] && freqSorted[0].pct >= 30 && topFreq !== main) {
    alt = main;
    main = topFreq;
  }

  return {
    ...base,
    prediction: main,
    alt,
    candidates,
  };
}

function aggressiveTransition(rolls) {
  if (rolls.length < 4) return null;

  const last = rolls.at(-1);
  const succ = {};
  const decay = 0.9;

  for (let i = 0; i < rolls.length - 1; i++) {
    if (rolls[i] === last) {
      const nxt = rolls[i + 1];
      const dist = rolls.length - 1 - i;
      const w = Math.pow(decay, dist);
      succ[nxt] = (succ[nxt] || 0) + w;
    }
  }

  const entries = Object.entries(succ);
  if (entries.length === 0) return null;

  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, v]) => a + v, 0);

  return {
    pred: sorted[0][0],
    conf: clampConf(sorted[0][1] / total + 0.15),
    alt: sorted[1]?.[0] || null,
  };
}

function aggressiveWave(rolls, freqSorted) {
  if (rolls.length < 6 || freqSorted.length < 2) return null;

  const dominant = freqSorted[0].value;
  const recent = rolls.slice(-6);
  const domCount = recent.filter((x) => x === dominant).length;

  if (domCount <= 1) {
    return {
      pred: dominant,
      conf: 0.74,
      alt: freqSorted[1].value,
    };
  }

  return null;
}

function aggressiveMarkov(seq) {
  if (seq.length < 6) return null;

  const table = {};
  const decay = 0.9;

  for (let i = 2; i < seq.length; i++) {
    const key = seq.slice(i - 2, i).join("|");
    const nxt = seq[i];
    const dist = seq.length - 1 - i;
    const w = Math.pow(decay, dist);

    table[key] = table[key] || {};
    table[key][nxt] = (table[key][nxt] || 0) + w;
  }

  const key = seq.slice(-2).join("|");
  const opts = table[key];
  if (!opts) return null;

  const sorted = Object.entries(opts).sort((a, b) => b[1] - a[1]);
  const total = Object.values(opts).reduce((a, b) => a + b, 0);

  return {
    pred: sorted[0][0],
    conf: clampConf(sorted[0][1] / total + 0.1),
    alt: sorted[1]?.[0] || null,
  };
}

function aggressiveFrequency(freqSorted) {
  const top = freqSorted[0];
  const second = freqSorted[1];

  if (!top) return null;

  if (second && Math.abs(top.pct - second.pct) < 8) {
    // Deliberately flip to second if close → very aggressive
    return {
      pred: second.value,
      conf: 0.5,
      alt: top.value,
    };
  }

  return {
    pred: top.value,
    conf: clampConf(top.pct / 100 + 0.15),
    alt: second?.value || null,
  };
}

export function predictNextAggressive(rawRolls = []) {
  const rolls = rawRolls
    .map((r) => String(r).slice(0, 2))
    .filter((x) => x.length === 2);

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

  let pick =
    aggressiveWave(rolls, freqSorted) ||
    aggressiveTransition(rolls) ||
    aggressiveMarkov(rolls) ||
    aggressiveFrequency(freqSorted);

  if (!pick) pick = aggressiveFrequency(freqSorted);

  return aggressiveFinalize(
    {
      prediction: pick.pred,
      confidence: pick.conf,
      alt: pick.alt,
      mode: "aggressive",
    },
    freqSorted
  );
}
