/**
 * kiyoSessionPredictor.js — v2 (Commons-based)
 *
 * Uses session commons (most frequent YZ pairs) as the foundation:
 *  1. Classify session (ALTERNATING / BLOCK / CHAOTIC / BUILDING)
 *  2. Find session YZ commons from current window
 *  3. Predict next YZ from live transition table
 *  4. Predict z digit via Caesar decode of commons from current y
 *  5. Combine YZ transition + Caesar z + Col3 wave into one output
 */

import {
  getSessionCommons,
  getYZCommons,
  predictIndependent3str,
  predict3strFromY,
  getYDigitForPrediction,
  buildCommonsSummary,
} from './kiyoCommons';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SESSION CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export function classifySession(yzPairs) {
  if (!yzPairs || yzPairs.length < 4) {
    return { type: 'BUILDING', swapRate: 0, label: '⏳ Building' };
  }

  let swaps = 0;
  for (let i = 1; i < yzPairs.length; i++) {
    if (yzPairs[i] !== yzPairs[i - 1]) swaps++;
  }
  const swapRate = swaps / (yzPairs.length - 1);

  if (swapRate >= 0.65) return { type: 'ALTERNATING', swapRate, label: '🔀 Alternating' };
  if (swapRate >= 0.25) return { type: 'BLOCK', swapRate, label: '🧱 Block runs' };
  return { type: 'CHAOTIC', swapRate, label: '⚠️ Chaotic' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. YZ PAIR TRANSITION TABLE (session-local, 1+ occurrence threshold)
// ─────────────────────────────────────────────────────────────────────────────

export function buildYZTransitionTable(rolls) {
  const table = {};
  for (let i = 0; i < rolls.length - 1; i++) {
    const curr = String(rolls[i]).slice(1, 3);
    const next = String(rolls[i + 1]).slice(1, 3);
    if (curr.length !== 2 || next.length !== 2) continue;
    if (!table[curr]) table[curr] = {};
    table[curr][next] = (table[curr][next] || 0) + 1;
  }
  return table;
}

/**
 * Predict next YZ given the "current" yz prefix (from input or last roll).
 * Threshold: 1+ occurrence (was 2 before — now lower for short sessions).
 */
export function predictNextYZ(currentYZPrefix, table) {
  if (!currentYZPrefix || currentYZPrefix.length < 2) return null;
  const yz = currentYZPrefix.slice(0, 2);
  const transitions = table[yz];

  if (!transitions) return null;

  const entries = Object.entries(transitions)
    .filter(([, count]) => count >= 1) // lowered from 2 to 1
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, c]) => s + c, 0);

  return {
    fromYZ: yz,
    prediction: entries[0][0],
    alt: entries[1]?.[0] ?? null,
    confidence: entries[0][1] / total,
    matchCount: total,
    allOptions: entries.map(([p, c]) => ({ yz: p, count: c, pct: c / total })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COL3 SIGNAL
// ─────────────────────────────────────────────────────────────────────────────

// Generic wave signal extractor — works for both col2 (y) and col3 (z)
function getWaveSignal(analysis) {
  if (
    !analysis ||
    !analysis.valid ||
    analysis.action === 'SKIP' ||
    analysis.action === 'WAIT' ||
    !analysis.flipTarget ||
    analysis.flipTarget.length === 0
  ) return null;

  return {
    targetDigits: analysis.flipTarget,
    targetGroup: analysis.flipLabel || analysis.label || '—',
    confidence: analysis.confidence,
    action: analysis.action,
    message: analysis.message,
  };
}

export function getCol3Signal(col3Analysis) { return getWaveSignal(col3Analysis); }
export function getCol2Signal(col2Analysis) { return getWaveSignal(col2Analysis); }

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMBINE: YZ transition + Caesar 3str + Col3 wave
// ─────────────────────────────────────────────────────────────────────────────

function buildCombined(independentResult, yzPrediction, caesarResult, col3Signal, sessionType, lastYZ) {
  const x = '4';

  if (sessionType.type === 'BUILDING') {
    return { prediction: null, alt: null, confidence: 0, action: 'WAIT', message: '⏳ Building...', source: 'classifier' };
  }
  if (sessionType.type === 'CHAOTIC') {
    return { prediction: null, alt: null, confidence: 0, action: 'SKIP', message: '⚠️ Chaotic — skip', source: 'classifier' };
  }

  // PRIMARY: Independent y+z prediction
  if (independentResult) {
    const pred = independentResult.prediction;
    const predZ = independentResult.zDigit;

    // Check col3 agreement on z digit
    const col3Agrees = col3Signal ? col3Signal.targetDigits.includes(predZ) : null;
    const caesarMatchesZ = caesarResult ? caesarResult.prediction === predZ : null;

    // Strong: Independent + Col3 agree on z
    if (col3Signal && col3Agrees) {
      const conf = Math.min((independentResult.confidence + col3Signal.confidence) / 2 * 1.15, 0.90);
      return {
        prediction: pred, alt: independentResult.alt, confidence: conf,
        action: 'PREDICT',
        message: `🎯 ${pred} — Indep+Col3 agree`,
        source: 'indep+col3', col3Agrees: true,
      };
    }

    // Independent + Caesar agree on z (correlation confirms)
    if (col3Signal && !col3Agrees && caesarMatchesZ) {
      return {
        prediction: pred, alt: independentResult.alt,
        confidence: independentResult.confidence * 0.92,
        action: 'PREDICT',
        message: `📊 ${pred} — Indep+Caesar agree (col3 disagrees)`,
        source: 'indep+caesar', col3Agrees: false,
      };
    }

    // Independent only (or col3 conflict — trust independent)
    return {
      prediction: pred, alt: independentResult.alt,
      confidence: independentResult.confidence,
      action: 'PREDICT',
      message: `📊 ${pred} — y:${independentResult.yConf}% z:${independentResult.zConf}%`,
      source: independentResult.yLocked ? 'indep-ylocked' : 'indep',
    };
  }

  // Fallback: YZ pair transition
  if (yzPrediction) {
    const pred = x + yzPrediction.prediction;
    const alt = yzPrediction.alt ? x + yzPrediction.alt : null;

    // Check col3 for z agreement
    const predZ = yzPrediction.prediction[1];
    if (col3Signal && col3Signal.targetDigits.includes(predZ)) {
      const conf = Math.min((yzPrediction.confidence + col3Signal.confidence) / 2 * 1.1, 0.88);
      return {
        prediction: pred, alt, confidence: conf,
        action: 'PREDICT',
        message: `🎯 ${pred} — YZ+Col3 agree`,
        source: 'yz+col3',
        col3Agrees: true,
      };
    }

    return {
      prediction: pred, alt,
      confidence: yzPrediction.confidence,
      action: 'PREDICT',
      message: `📊 ${pred} — YZ transition`,
      source: 'yz-only',
    };
  }

  // Col3 only (use last y as placeholder)
  if (col3Signal && lastYZ) {
    const lastY = lastYZ[0];
    const z = col3Signal.targetDigits[0];
    return {
      prediction: `${x}${lastY}${z}`,
      alt: null,
      confidence: col3Signal.confidence * 0.60,
      action: 'PREDICT',
      message: `📊 ${x}${lastY}${z} — Col3 only`,
      source: 'col3-only',
    };
  }

  return { prediction: null, alt: null, confidence: 0, action: 'SKIP', message: '⚠️ No signal', source: 'none' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full session predictor.
 *
 * @param {string[]} sessionRolls   Translated 3-digit rolls
 * @param {object}   col3Analysis   analyzeColumnWave result for Col3 (z-axis wave)
 * @param {string}   testInput      Current typed input (e.g. "41")
 * @param {object}   col2Analysis   analyzeColumnWave result for Col2 (y-axis wave)
 */
export function runSessionPredictor(sessionRolls, col3Analysis, testInput = '', col2Analysis = null) {
  if (!sessionRolls || sessionRolls.length < 2) {
    return {
      sessionType: { type: 'BUILDING', swapRate: 0, label: '⏳ Building' },
      prediction: null, alt: null, confidence: 0,
      action: 'WAIT', message: '⏳ Need 2+ rolls',
    };
  }

  const validRolls = sessionRolls.filter(r => String(r).length >= 3);
  const yzPairs = validRolls.map(r => String(r).slice(1, 3));

  // 1. Classify session
  const sessionType = classifySession(yzPairs);

  // 2. Get YZ commons from session
  const { commons: yzCommons, freq: yzFreq } = getYZCommons(validRolls, 2);

  // 3. Build YZ transition table
  const table = buildYZTransitionTable(validRolls);

  // 4. Determine current YZ prefix for transition lookup
  //    Priority: testInput if 2+ chars → last roll's yz
  let currentYZPrefix = null;
  if (testInput && testInput.length >= 2) {
    currentYZPrefix = String(testInput).slice(1, 3); // "41x" → "1x", no: we need digits [1] and [2]
    // Actually testInput might be "41" (2 digits without x=4) or "412" (full 3 digits)
    // Extract yz from testInput: if length=3, take [1][2]; if length=2, take the 2 chars as yz
    if (testInput.length >= 3) {
      currentYZPrefix = testInput.slice(1, 3);
    } else {
      // "41" typed → xy of the 3str, y=testInput[1]
      currentYZPrefix = testInput[1] ? testInput[1] + '?' : null; // incomplete
      currentYZPrefix = null; // can't use for table lookup yet
    }
  }
  if (!currentYZPrefix && validRolls.length > 0) {
    currentYZPrefix = String(validRolls[validRolls.length - 1]).slice(1, 3);
  }

  const yzPrediction = currentYZPrefix ? predictNextYZ(currentYZPrefix, table) : null;

  // 5. Independent 3str (primary) — y and z tracked separately
  const yDigit = getYDigitForPrediction(testInput, validRolls);
  let independentResult = predictIndependent3str(validRolls, yDigit);

  // 6. Wave signals for y (col2) and z (col3)
  const col3Signal = getCol3Signal(col3Analysis);
  const col2Signal = getCol2Signal(col2Analysis);

  // 6b. Tiebreaker: if z or y is flat (≤35% conf), use wave signal to filter candidates
  if (independentResult) {
    let { yDigit: bestY, zDigit: bestZ, zConf, yConf } = independentResult;

    // Z tiebreaker — use col3 wave when z is ambiguous
    if (zConf <= 35 && col3Signal) {
      const zOptions = [bestZ, ...independentResult.zNoise];
      const col3Z = zOptions.find(z => col3Signal.targetDigits.includes(z));
      if (col3Z && col3Z !== bestZ) {
        // Rebuild result with col3-guided z
        independentResult = {
          ...independentResult,
          zDigit: col3Z,
          prediction: `4${bestY}${col3Z}`,
          alt: `4${bestY}${bestZ}`, // old answer becomes alt
          zTiebreakerUsed: true,
          zConf: Math.round(col3Signal.confidence * 60), // partial credit
        };
      }
    }

    // Y tiebreaker — use col2 wave when y is ambiguous
    if (yConf <= 26 && !yDigit && col2Signal) {
      const yOptions = [independentResult.yDigit, ...independentResult.yNoise];
      const col2Y = yOptions.find(y => col2Signal.targetDigits.includes(y));
      if (col2Y && col2Y !== independentResult.yDigit) {
        independentResult = {
          ...independentResult,
          yDigit: col2Y,
          prediction: `4${col2Y}${independentResult.zDigit}`,
          alt: `4${independentResult.yDigit}${independentResult.zDigit}`,
          yTiebreakerUsed: true,
          yConf: Math.round(col2Signal.confidence * 55),
        };
      }
    }
  }
  // 7. Caesar 3str (secondary correlation) — from YZ commons
  const caesarResult = (yDigit && yzCommons.length > 0)
    ? predict3strFromY(
        yzCommons.map(yz => '4' + yz[0]),
        yDigit,
        Object.fromEntries(yzCommons.map(yz => ['4' + yz[0], yzFreq[yz] || 1]))
      )
    : null;

  // 8. Combine — Independent is now primary
  const lastYZ = currentYZPrefix;
  const combined = buildCombined(independentResult, yzPrediction, caesarResult, col3Signal, sessionType, lastYZ);

  // 8. Commons summaries for UI
  const commonsSummary = buildCommonsSummary(validRolls, true);  // YZ pairs

  // 9. 2str commons (first 2 digits — e.g. "41", "42")
  const { commons: str2Commons, noise: str2Noise, freq: str2Freq, total: str2Total }
    = getSessionCommons(validRolls, 2);
  const str2CommonsSummary = str2Total >= 2 ? {
    commons: str2Commons.map(p => ({ pair: p, count: str2Freq[p] || 0, pct: Math.round(((str2Freq[p] || 0) / str2Total) * 100) })),
    noise:   str2Noise.map(p =>   ({ pair: p, count: str2Freq[p] || 0, pct: Math.round(((str2Freq[p] || 0) / str2Total) * 100) })),
    total: str2Total,
  } : null;

  return {
    sessionType,
    yzCommons,
    commonsSummary,
    str2CommonsSummary,
    independentResult,
    caesarResult,
    yzTransitionTable: table,
    yzPrediction,
    col2Signal,     // y-axis wave (for UI)
    col3Signal,     // z-axis wave (for UI)
    lastYZ,
    yDigit,
    ...combined,
  };
}
