/**
 * kiyoPrefixWave.js
 *
 * The CORRECT Kiyo wave approach (per expert guidance):
 *
 * - Analyze each 3-string prefix (41x, 42x, 43x, 44x) INDEPENDENTLY
 * - For each prefix, figure out which Z-pairing is active this session:
 *     Low/High    {1,2} vs {3,4}
 *     Outer/Inner {1,4} vs {2,3}
 *     Odd/Even    {1,3} vs {2,4}
 * - The pairing for 41x may be completely different from 42x
 * - Within each prefix, detect N (dominant flip threshold) and predict
 *
 * Usage:
 *   import { analyzeAllPrefixWaves, getPrefixWavePrediction } from './kiyoPrefixWave';
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAIRING DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const Z_PAIRINGS = [
  {
    name: 'Low/High',
    pairA: ['1', '2'], pairALabel: 'Low',
    pairB: ['3', '4'], pairBLabel: 'High',
  },
  {
    name: 'Outer/Inner',
    pairA: ['1', '4'], pairALabel: 'Outer',
    pairB: ['2', '3'], pairBLabel: 'Inner',
  },
  {
    name: 'Odd/Even',
    pairA: ['1', '3'], pairALabel: 'Odd',
    pairB: ['2', '4'], pairBLabel: 'Even',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildRuns(states) {
  if (!states.length) return [];
  const runs = [];
  let cur = states[0], len = 1;
  for (let i = 1; i < states.length; i++) {
    if (states[i] === cur) { len++; }
    else { runs.push({ side: cur, length: len }); cur = states[i]; len = 1; }
  }
  runs.push({ side: cur, length: len });
  return runs;
}

/**
 * Score a pairing against a z-value array.
 * Higher score = this pairing produces a more consistent flip pattern.
 */
function scorePairing(zValues, pairing) {
  const states = zValues.map(z => {
    if (pairing.pairA.includes(z)) return 'A';
    if (pairing.pairB.includes(z)) return 'B';
    return null;
  }).filter(Boolean);

  if (states.length < 3) return { score: 0, n: 1, confidence: 0, states, runs: [] };

  const runs = buildRuns(states);
  const completed = runs.slice(0, -1); // exclude in-progress run

  if (completed.length < 2) {
    return { score: 0.2, n: 1, confidence: 0.2, states, runs, currentRun: runs[runs.length - 1] };
  }

  // Find modal run length (N)
  const freq = {};
  for (const r of completed) freq[r.length] = (freq[r.length] || 0) + 1;

  let bestN = 1, bestCount = 0;
  for (const [len, cnt] of Object.entries(freq)) {
    const l = parseInt(len);
    if (cnt > bestCount || (cnt === bestCount && l < bestN)) {
      bestN = l; bestCount = cnt;
    }
  }

  const consistency = bestCount / completed.length; // fraction of runs matching N

  // Penalize if one side dominates >=85% (just noise, not a real flip pattern)
  const aCount = states.filter(s => s === 'A').length;
  const dominance = Math.max(aCount, states.length - aCount) / states.length;
  const dominancePenalty = dominance >= 0.85 ? 0.4 : 1.0;

  // Penalize if there's been only 1 completed run (can't determine N reliably)
  const runCountPenalty = completed.length >= 3 ? 1.0 : completed.length >= 2 ? 0.75 : 0.5;

  const score = consistency * dominancePenalty * runCountPenalty;

  return {
    score,
    n: bestN,
    confidence: consistency,
    states,
    runs,
    completed,
    currentRun: runs[runs.length - 1],
    dominance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PER-PREFIX ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze a single prefix group (e.g. all 41x rolls).
 * @param {string[]} zValues  - Z digits for this prefix e.g. ["1","3","1","2"]
 * @param {string}   prefix   - e.g. "41"
 */
function analyzePrefixGroup(zValues, prefix) {
  const n = zValues.length;

  if (n < 3) {
    return {
      prefix, count: n, hasData: false,
      action: 'WAIT',
      message: `⏳ Need ${3 - n} more ${prefix}x`,
      pairing: null, allPairings: null,
    };
  }

  // Test all 3 pairings
  const scored = Z_PAIRINGS.map(p => ({ pairing: p, ...scorePairing(zValues, p) }));
  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : b.confidence - a.confidence);

  const best = scored[0];
  const isConfident = best.confidence >= 0.5 && n >= 4;
  const isChaotic = best.score < 0.28 && n >= 6;

  // Current run info
  const currentRun = best.currentRun;
  const currentSide = currentRun?.side ?? null;
  const currentLabel = currentSide === 'A' ? best.pairing.pairALabel : best.pairing.pairBLabel;
  const currentDigits = currentSide === 'A' ? best.pairing.pairA : best.pairing.pairB;
  const runLength = currentRun?.length ?? 0;

  // Flip target
  const flipSide = currentSide === 'A' ? 'B' : 'A';
  const flipLabel = flipSide === 'A' ? best.pairing.pairALabel : best.pairing.pairBLabel;
  const flipDigits = flipSide === 'A' ? best.pairing.pairA : best.pairing.pairB;

  // Determine action
  let action, message, confidence;

  if (isChaotic) {
    action = 'SKIP'; confidence = 0.3;
    message = '⚠️ No clear pattern yet';
  } else if (!isConfident) {
    action = 'WAIT'; confidence = 0.4;
    message = `⏳ Building (${n} rolls, ${best.completed?.length ?? 0} runs)`;
  } else if (runLength >= best.n) {
    action = 'FLIP'; confidence = Math.min(best.confidence * 0.9, 0.88);
    message = `🎯 FLIP → ${flipLabel} [${flipDigits.join(',')}]  (run ${runLength}/${best.n})`;
  } else {
    action = 'HOLD'; confidence = best.confidence * 0.8;
    const remaining = best.n - runLength;
    message = `📊 HOLD ${currentLabel}  (${runLength}/${best.n}, ~${remaining} more)`;
  }

  return {
    prefix, count: n,
    hasData: n >= 3,
    isConfident, isChaotic,
    action, message, confidence,
    pairing: best.pairing,
    pairingName: best.pairing.name,
    pairingScore: best.score,
    pairingConfidence: best.confidence,
    allPairings: scored,     // all 3 scored pairings (for debug/UI)
    dominantN: best.n,
    currentSide, currentLabel, currentDigits, runLength,
    flipSide, flipLabel, flipDigits,
    states: best.states,
    runs: best.runs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FULL SESSION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run per-prefix wave analysis for all 4 active prefixes.
 * @param {string[]} sessionRolls - Translated 3-digit rolls e.g. ["412","431","422"]
 */
export function analyzeAllPrefixWaves(sessionRolls) {
  if (!sessionRolls || sessionRolls.length === 0) return null;

  const PREFIXES = ['41', '42', '43', '44'];

  // Split rolls by prefix, collect z-digits
  const byPrefix = { '41': [], '42': [], '43': [], '44': [] };
  const prefixFreq = { '41': 0, '42': 0, '43': 0, '44': 0 };

  for (const roll of sessionRolls) {
    const r = String(roll);
    const prefix = r.slice(0, 2);
    if (PREFIXES.includes(prefix)) {
      const z = r[2];
      if (z) byPrefix[prefix].push(z);
      prefixFreq[prefix]++;
    }
  }

  // Session 2str commons = top 2 prefixes by frequency
  const sortedByFreq = [...PREFIXES].sort((a, b) => prefixFreq[b] - prefixFreq[a]);
  const commonsPrefix = sortedByFreq.slice(0, 2).filter(p => prefixFreq[p] > 0);
  const noisePrefix = sortedByFreq.slice(2);

  // Analyze each prefix
  const analyses = {};
  for (const prefix of PREFIXES) {
    analyses[prefix] = analyzePrefixGroup(byPrefix[prefix], prefix);
    analyses[prefix].isCommons = commonsPrefix.includes(prefix);
    analyses[prefix].freq = prefixFreq[prefix];
    analyses[prefix].freqPct = sessionRolls.length > 0
      ? Math.round((prefixFreq[prefix] / sessionRolls.length) * 100)
      : 0;
  }

  return {
    analyses,
    commonsPrefix,
    noisePrefix,
    prefixFreq,
    totalRolls: sessionRolls.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ACTIVE PREFIX PREDICTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the prediction for the currently active prefix.
 * @param {object} prefixWaveData   - Result of analyzeAllPrefixWaves
 * @param {string} testInput        - What user typed (e.g. "41", "421")
 * @param {string[]} sessionRolls   - For fallback: last roll's prefix
 */
export function getPrefixWavePrediction(prefixWaveData, testInput, sessionRolls) {
  if (!prefixWaveData) return null;

  // Determine active prefix from testInput or last roll
  let activePrefix = null;
  if (testInput && testInput.length >= 2) {
    const p = String(testInput).slice(0, 2);
    if (['41','42','43','44'].includes(p)) activePrefix = p;
  }
  if (!activePrefix && sessionRolls?.length > 0) {
    const lastRoll = String(sessionRolls[sessionRolls.length - 1]);
    const p = lastRoll.slice(0, 2);
    if (['41','42','43','44'].includes(p)) activePrefix = p;
  }

  if (!activePrefix) return null;

  const analysis = prefixWaveData.analyses?.[activePrefix];
  if (!analysis?.hasData || analysis.action === 'WAIT' || analysis.action === 'SKIP') return null;

  const digits = analysis.action === 'FLIP' ? analysis.flipDigits : analysis.currentDigits;
  const pred = activePrefix + digits[0];
  const alt = digits[1] ? activePrefix + digits[1] : null;

  return {
    activePrefix,
    prediction: pred,
    alt,
    digits,
    action: analysis.action,
    confidence: analysis.confidence,
    message: analysis.message,
    pairingName: analysis.pairingName,
    analysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 2-STRING WAVE (lighter entry point — uses Y-digit across ALL rolls)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect which Y-digit pairing is active this session (2str wave).
 * Uses ALL rolls — no prefix splitting needed.
 * Needs only 4-5 total rolls to detect a pattern.
 *
 * 3 possible Y pairings:
 *   Low/High    41/42 vs 43/44  (Y∈{1,2} vs Y∈{3,4})
 *   Outer/Inner 41/44 vs 42/43  (Y∈{1,4} vs Y∈{2,3})
 *   Odd/Even    41/43 vs 42/44  (Y∈{1,3} vs Y∈{2,4})
 *
 * @param {string[]} sessionRolls - Translated 3-digit rolls
 */
/**
 * @param {string[]} sessionRolls - Translated rolls
 * @param {string|null} prevPairingName - Previously committed pairing name (for hysteresis)
 */
export function analyze2strWave(sessionRolls, prevPairingName = null, tablePairingHint = null) {
  if (!sessionRolls || sessionRolls.length < 3) return null;

  const yValues = sessionRolls
    .map(r => String(r)[1])
    .filter(d => ['1','2','3','4'].includes(d));

  if (yValues.length < 3) return null;

  // ─── Recency-blended scoring ──────────────────────────────────────────────
  // Weight recent rolls (last 8) at 70%, full session at 30%
  // This prevents old session data from dragging the ★ to the wrong column
  const RECENT_WINDOW = 8;
  const recentYValues = yValues.slice(-RECENT_WINDOW);
  const hasEnoughRecent = recentYValues.length >= 3;

  const scored = Z_PAIRINGS.map(p => {
    const full = scorePairing(yValues, p);
    const recent = hasEnoughRecent ? scorePairing(recentYValues, p) : null;

    // Blend: recent 70% + full 30% (if we have recent data)
    const blendedScore = recent
      ? recent.score * 0.70 + full.score * 0.30
      : full.score;
    const blendedConfidence = recent
      ? recent.confidence * 0.70 + full.confidence * 0.30
      : full.confidence;

    // Use RECENT run data for currentRun/n (what's happening NOW)
    const activeResult = recent || full;

    return {
      pairing: p,
      ...full,                          // base data (full states for Y-sequence display)
      score: blendedScore,              // blended for ranking
      confidence: blendedConfidence,    // blended for threshold checks
      currentRun: activeResult.currentRun,
      n: activeResult.n,
      completed: activeResult.completed,
    };
  });
  scored.sort((a, b) => b.score !== a.score ? b.score - a.score : b.confidence - a.confidence);

  // ─── TABLE tiebreaker ─────────────────────────────────────────────────────
  // When the top two pairings score within 5% of each other AND the TABLE
  // has a preferred pairing, promote that pairing to #1.
  // This prevents the Z_PAIRINGS array order from arbitrarily picking Low/High
  // in tied situations (e.g. all rolls are 41 & 43 → Low/High and Outer/Inner tie).
  const TABLE_TIEBREAK_MARGIN = 0.05;
  if (tablePairingHint && scored.length >= 2) {
    const diff = Math.abs(scored[0].score - scored[1].score);
    if (diff < TABLE_TIEBREAK_MARGIN) {
      const hintIdx = scored.findIndex(s => s.pairing.name === tablePairingHint);
      if (hintIdx > 0) {
        // promote the TABLE-preferred pairing to the top
        const [promoted] = scored.splice(hintIdx, 1);
        scored.unshift(promoted);
      }
    }
  }

  // ─── Hysteresis lock ─────────────────────────────────────────────────────
  // Require the leading pairing to beat the locked one by ≥12% before switching.
  // This prevents single-roll flips like High→Outer→Even.
  const HYSTERESIS = 0.15;
  if (prevPairingName && scored[0].pairing.name !== prevPairingName) {
    const prevIdx = scored.findIndex(s => s.pairing.name === prevPairingName);
    if (prevIdx > 0) {
      const margin = scored[0].score - scored[prevIdx].score;
      if (margin < HYSTERESIS) {
        // Not enough margin — keep the locked pairing at the top
        const [prev] = scored.splice(prevIdx, 1);
        scored.unshift(prev);
      }
    }
  }

  const best = scored[0];
  const n = yValues.length;
  const isConfident = best.confidence >= 0.5 && n >= 4;
  const isChaotic = best.score < 0.28 && n >= 6;

  // ─── Ambiguity gate ───────────────────────────────────────────────────────
  // Two triggers for ambiguity:
  //  1) Top 2 pairings within 8% AND n < 8 (early session)
  //  2) Top 2 pairings within 3% at ANY roll count (genuinely tied — session-17 case)
  const AMBIGUITY_MARGIN = 0.08;
  const TIGHT_TIE_MARGIN = 0.03;   // ← NEW: catches 77%=77% style ties
  const scoreDiff = scored.length >= 2 ? Math.abs(scored[0].score - scored[1].score) : 1;
  const isAmbiguous = scored.length >= 2
    && (scoreDiff < TIGHT_TIE_MARGIN                          // genuinely tied, any n
    || (scoreDiff < AMBIGUITY_MARGIN && n < 8));              // close + early session

  const currentRun = best.currentRun;
  const currentSide = currentRun?.side ?? null;
  const currentLabel = currentSide === 'A' ? best.pairing.pairALabel : best.pairing.pairBLabel;
  const currentDigits = currentSide === 'A' ? best.pairing.pairA : best.pairing.pairB;
  const currentPrefixes = currentDigits.map(d => `4${d}`);
  const runLength = currentRun?.length ?? 0;

  const flipSide = currentSide === 'A' ? 'B' : 'A';
  const flipLabel = flipSide === 'A' ? best.pairing.pairALabel : best.pairing.pairBLabel;
  const flipDigits = flipSide === 'A' ? best.pairing.pairA : best.pairing.pairB;
  const flipPrefixes = flipDigits.map(d => `4${d}`);

  // ─── Dominance detection ─────────────────────────────────────────────────
  // Count how many of total yValues belong to each side of the BEST pairing
  const aCount = yValues.filter(y => best.pairing.pairA.includes(y)).length;
  const bCount = yValues.filter(y => best.pairing.pairB.includes(y)).length;
  const dominantSide = aCount >= bCount ? 'A' : 'B';
  const dominantPct = Math.round(Math.max(aCount, bCount) / n * 100);
  // FIX 1: Lower DOM threshold 65% → 60% to catch moderate biased sessions
  const isDominant = isConfident && dominantPct >= 60;

  // Dominant side details
  const dominantDigits = dominantSide === 'A' ? best.pairing.pairA : best.pairing.pairB;
  const dominantPrefixes = dominantDigits.map(d => `4${d}`);
  const dominantLabel = dominantSide === 'A' ? best.pairing.pairALabel : best.pairing.pairBLabel;

  // Majority side (even below 60% — used for LEAN)
  const majoritySide = dominantSide; // same variable, just renamed for clarity
  const majorityPct = dominantPct;

  // FLIP requires: N≥2 (no N=1 FLIP — N=1 alternation is too noisy), n≥12, score≥0.65
  const enoughDataForFlip = n >= 12 && best.n >= 2 && best.confidence >= 0.55 && best.score >= 0.65;

  // FLIP requires confidence >60%
  const flipConfident = Math.min(best.confidence * 0.9, 0.88) > 0.60;

  // Preferred bet when not DOM: dominant side if meaningful, else current run
  const preferredHoldBet = dominantPct >= 55 ? dominantPrefixes : currentPrefixes;

  // ─── Action + Message ────────────────────────────────────────────────────
  let action, message, confidence, betRolls;

  if (isChaotic) {
    action = 'SKIP'; confidence = 0.3;
    message = '⚠️ No clear Y pairing detected yet';
    betRolls = null;

  } else if (!isConfident) {
    action = 'WAIT'; confidence = 0.4;
    message = `⏳ Building... (${n} rolls, ${best.completed?.length ?? 0} completed runs)`;
    betRolls = null;

  } else if (isDominant && !isAmbiguous) {
    // 60%+ clear pairing → stay on dominant
    action = 'DOMINANT'; confidence = dominantPct / 100;
    message = `🏆 DOMINANT: ${dominantLabel} [${dominantPrefixes.join(' / ')}] — ${dominantPct}% of rolls. Stay on dominant side.`;
    betRolls = dominantPrefixes;

  } else if (isDominant && isAmbiguous) {
    // Dominant but pairing is ambiguous early — bet the side but flag caution
    action = 'DOMINANT'; confidence = (dominantPct / 100) * 0.75;
    const margin = Math.round(Math.abs(scored[0].score - scored[1].score) * 100);
    message = `⚡ LIKELY ${dominantLabel} [${dominantPrefixes.join(' / ')}] — ${dominantPct}%, pairing uncertain (${scored[0].pairing.name} vs ${scored[1].pairing.name}, margin only ${margin}%). Bet cautiously.`;
    betRolls = dominantPrefixes;

  } else if (runLength >= best.n && enoughDataForFlip && flipConfident) {
    // FLIP only when N≥2, enough data, high score, confident
    action = 'FLIP'; confidence = Math.min(best.confidence * 0.9, 0.88);
    message = `🎯 FLIP → ${flipLabel}  [${flipPrefixes.join(' / ')}]  (run ${runLength}/${best.n})`;
    betRolls = flipPrefixes;

  } else if (runLength >= best.n && (!enoughDataForFlip || !flipConfident)) {
    // Run met N but guards failed — HOLD and bias to dominant
    action = 'HOLD'; confidence = best.confidence * 0.7;
    message = `📊 HOLD ${currentLabel} [→ ${dominantPct >= 55 ? dominantLabel : currentLabel}] — flip signal weak`;
    betRolls = preferredHoldBet;

  } else {
    action = 'HOLD'; confidence = best.confidence * 0.8;
    const remaining = best.n - runLength;
    message = `📊 HOLD ${currentLabel}  [${currentPrefixes.join(' / ')}]  (~${remaining} more)`;
    betRolls = preferredHoldBet;

  }


  // ─── Wave-guided 2-str prediction ────────────────────────────────────────
  // betRolls = the specific 4X rolls the wave says to bet next
  // e.g. ['42', '44'] when Even is dominant/hold

  // ─── Session mode ─────────────────────────────────────────────────────────
  // Human-readable description of what kind of session this is.
  const sessionMode = isChaotic
    ? 'CHAOTIC'
    : !isConfident
      ? 'BUILDING'
      : isAmbiguous
        ? 'AMBIGUOUS'
        : isDominant
          ? 'DOMINANT'
          : best.n === 1
            ? 'ALTERNATING'
            : `RUN-N${best.n}`;

  return {
    count: n,
    action, message, confidence,
    betRolls,
    pairing: best.pairing,
    pairingName: best.pairing.name,
    pairingScore: best.score,
    pairingConfidence: best.confidence,
    allPairings: scored,
    dominantN: best.n,
    isDominant,
    isAmbiguous,
    sessionMode,              // 🆕 DOMINANT | RUN-N3 | ALTERNATING | CHAOTIC | AMBIGUOUS | BUILDING
    dominantSide,
    dominantPct,
    dominantLabel,
    dominantPrefixes,
    currentSide, currentLabel, currentDigits, currentPrefixes, runLength,
    flipSide, flipLabel, flipDigits, flipPrefixes,
    states: best.states,
    runs: best.runs,
    yValues,
  };
}
