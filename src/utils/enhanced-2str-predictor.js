// src/utils/enhanced-2str-predictor.js
// Kiyo-style smart predictor for 2-STR

import { get2StrHistoricalRolls } from "./twoStrHistoricalData";
import { predictNext2BBPMode } from "./bbp-mode-2str";

/** Clean raw rolls into 2-digit strings in [1–4], e.g. "44", "41" */
function cleanRolls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).replace(/[^1-4]/g, ""))
    .filter((r) => r.length === 2);
}

/**
 * Build transition stats: given a dataset and a PREFIX (last 2-str),
 * look at all occurrences of prefix and collect what came NEXT.
 * Uses a recency decay so newer transitions matter more.
 */
function computeTransitionStats(dataset, prefix, decay = 0.93) {
  const rolls = cleanRolls(dataset);

  if (!prefix || prefix.length !== 2 || rolls.length < 3) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      matchCount: 0,
      candidates: [],
    };
  }

  const nextFreq = {};
  let matchCount = 0;
  const n = rolls.length;

  // oldest → newest, but weight newer more
  for (let i = 0; i < n - 1; i++) {
    if (rolls[i] !== prefix) continue;

    matchCount += 1;
    const next = rolls[i + 1];
    const stepsFromEnd = n - 2 - i; // 0 = newest pair
    const weight = Math.pow(decay, stepsFromEnd);

    nextFreq[next] = (nextFreq[next] || 0) + weight;
  }

  const entries = Object.entries(nextFreq);
  if (!entries.length) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      matchCount: 0,
      candidates: [],
    };
  }

  const totalWeight = entries.reduce((s, [, w]) => s + w, 0) || 1;

  const candidates = entries
    .map(([value, w]) => ({
      value,
      weight: w,
      pct: (w / totalWeight) * 100,
    }))
    .sort((a, b) => b.weight - a.weight);

  const top = candidates[0];
  const alt = candidates[1] || null;

  return {
    prediction: top.value,
    alt: alt ? alt.value : null,
    confidence: top.weight / totalWeight, // 0–1
    matchCount,
    candidates,
  };
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

/** Build prob distribution from candidates (for similarity calc) */
function buildProbFromCandidates(stats) {
  const prob = {};
  if (!stats || !Array.isArray(stats.candidates)) return prob;

  const total =
    stats.candidates.reduce((s, c) => s + (c.weight ?? c.pct ?? 0), 0) || 1;

  stats.candidates.forEach((c) => {
    const w = c.weight ?? c.pct ?? 0;
    prob[c.value] = w / total;
  });
  return prob;
}

/** Cosine similarity between two prob maps */
function cosineSimilarity(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of keys) {
    const x = a[k] || 0;
    const y = b[k] || 0;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (!magA || !magB) return 0;
  return dot / Math.sqrt(magA * magB);
}

/**
 * 🎯 Main smart predictor for 2-STR.
 * 
 * 🦁 BBP Mode (Primary): Pattern-based prediction using "Virtual 2-Column" logic
 *    - Identifies 2 dominant values (commons) per session
 *    - Detects patterns: dominance, alternating, runs, noise recovery
 *    - Confidence-based approach
 * 
 * 🔄 FALLBACK (Secondary): Original Kiyo-style transition predictor
 *    - Uses last live roll as prefix
 *    - Builds transition distributions from live + sheet data
 *    - Used when BBP Mode has low confidence or insufficient data
 */
export function predictNext2Smart(rawRolls = [], { region = "ALL" } = {}) {
  // 🦁 Try BBP Mode first
  const beastResult = predictNext2BBPMode(rawRolls, { region });
  
  // If BBP Mode has good confidence (>0.5), use it
  if (beastResult.confidence >= 0.5) {
    return {
      ...beastResult,
      // Add legacy fields for compatibility
      liveMatchCount: rawRolls.length,
      sheetMatchCount: 0,
      liveShare: 1,
      sheetShare: 0,
      regionMatch: null,
    };
  }
  
  // 🔄 Fallback to original Kiyo-style predictor
  return predictNext2SmartLegacy(rawRolls, { region });
}

/**
 * 🔄 Legacy Kiyo-style transition predictor (fallback)
 */
function predictNext2SmartLegacy(rawRolls = [], { region = "ALL" } = {}) {
  const liveRolls = cleanRolls(rawRolls);
  const liveCount = liveRolls.length;

  if (liveCount < 2) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      mode: "insufficient-live",
      candidates: [],
      liveMatchCount: 0,
      sheetMatchCount: 0,
      liveShare: 0,
      sheetShare: 1,
      regionMatch: null,
    };
  }

  const prefix = liveRolls[liveRolls.length - 1];

  // 📜 Sheet transitions for selected region (recent patches only)
  const sheetDataset = get2StrHistoricalRolls(region, true) || [];
  const sheetStats = computeTransitionStats(sheetDataset, prefix, 0.97);

  // 🧠 Live transitions (only if we have enough rolls)
  const liveStats =
    liveCount >= 4 ? computeTransitionStats(liveRolls, prefix, 0.93) : null;

  let liveWeight = 0;
  let sheetWeight = 1;
  let mode = "kiyo-2str-sheet-only";

  if (liveStats && liveStats.matchCount >= 5) {
    // strong live evidence
    liveWeight = 0.75;
    sheetWeight = 0.25;
    mode = "kiyo-2str-strong-live";
  } else if (liveStats && liveStats.matchCount >= 3) {
    // moderate live evidence
    liveWeight = 0.6;
    sheetWeight = 0.4;
    mode = "kiyo-2str-moderate-live";
  } else if (liveStats && liveStats.matchCount >= 1) {
    // weak live evidence
    liveWeight = 0.3;
    sheetWeight = 0.7;
    mode = "kiyo-2str-weak-live";
  }

  // 🧩 Merge candidate lists: live + sheet
  const scoreMap = {};

  const addSource = (stats, weight) => {
    if (!stats || !Array.isArray(stats.candidates) || !weight) return;
    stats.candidates.forEach((c) => {
      scoreMap[c.value] = (scoreMap[c.value] || 0) + c.pct * weight;
    });
  };

  addSource(sheetStats, sheetWeight);
  addSource(liveStats, liveWeight);

  const merged = Object.entries(scoreMap).map(([value, score]) => ({
    value,
    score,
  }));

  if (!merged.length) {
    return {
      prediction: null,
      alt: null,
      confidence: 0,
      mode: "no-candidates",
      candidates: [],
      liveMatchCount: liveStats?.matchCount || 0,
      sheetMatchCount: sheetStats.matchCount || 0,
      liveShare: liveWeight,
      sheetShare: sheetWeight,
      regionMatch: null,
    };
  }

  merged.sort((a, b) => b.score - a.score);
  const totalScore = merged.reduce((s, x) => s + x.score, 0) || 1;

  const candidates = merged.map((c) => ({
    value: c.value,
    pct: Math.round((c.score / totalScore) * 100),
    raw: c.score,
  }));

  const main = candidates[0];
  const alt = candidates[1] || null;

  // Confidence = top share + small boost (0–1)
  let conf = main.raw / totalScore;
  conf = clamp(conf + 0.08, 0.35, 0.92);

  // 🌍 Region similarity for heatmap (live vs sheet transition distributions)
  let regionMatch = null;
  if (liveStats && liveStats.matchCount > 0 && sheetStats.matchCount > 0) {
    const liveProb = buildProbFromCandidates(liveStats);
    const sheetProb = buildProbFromCandidates(sheetStats);
    const sim = cosineSimilarity(liveProb, sheetProb);
    regionMatch = {
      region,
      similarity: sim, // 0–1
      sampleSize: liveStats.matchCount,
    };
  }

  return {
    prediction: main.value,
    alt: alt ? alt.value : null,
    confidence: conf, // 0–1
    mode,
    candidates,
    liveMatchCount: liveStats?.matchCount || 0,
    sheetMatchCount: sheetStats.matchCount || 0,
    liveShare: liveWeight,
    sheetShare: sheetWeight,
    regionMatch,
  };
}

export default predictNext2Smart;
