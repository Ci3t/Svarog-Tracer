/**
 * kiyoCommons.js
 *
 * Session commons detector — independent Y + Z digit prediction.
 *
 * KEY INSIGHT: Y digit (which line you hit) and Z digit (sub-value within line)
 * have INDEPENDENT frequency distributions. Predict them separately, combine.
 *
 * Concepts:
 *  - "2str commons" = most frequent first-2-digit pairs (e.g. 41, 42)
 *  - "YZ commons"   = most frequent yz pairs (2nd+3rd digit)
 *  - "y commons"    = most frequent y digit alone (2nd digit)
 *  - "z commons"    = most frequent z digit alone (3rd digit) — INDEPENDENT of y
 *  - "Independent 3str" = 4 + best-y + best-z (no Caesar assumption)
 *  - "Caesar 3str"  = legacy correlation-based prediction (kept as secondary)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. SESSION COMMONS DETECTORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count 2str pair frequency in current session.
 * @param {string[]} rolls   Translated 3-digit rolls e.g. ["412","421","434"]
 * @param {number}   topN    How many pairs to return as "commons" (default 2)
 */
export function getSessionCommons(rolls, topN = 2) {
  const freq = {};
  for (const roll of rolls) {
    const pair = String(roll).slice(0, 2);
    if (pair.length === 2) freq[pair] = (freq[pair] || 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const commons = sorted.slice(0, topN).map(([p]) => p);
  const noise = sorted.slice(topN).map(([p]) => p);
  return { commons, noise, freq, total: rolls.length };
}

/**
 * Get session commons based on just the YZ pair (2nd + 3rd digit of each roll).
 */
export function getYZCommons(rolls, topN = 2) {
  const freq = {};
  for (const roll of rolls) {
    const yz = String(roll).slice(1, 3);
    if (yz.length === 2) freq[yz] = (freq[yz] || 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const commons = sorted.slice(0, topN).map(([p]) => p);
  const noise = sorted.slice(topN).map(([p]) => p);
  return { commons, noise, freq, total: rolls.length };
}

/**
 * Track Y digit frequency independently (2nd digit of 3-str rolls).
 * Just which line (1-4) you hit most — completely separate from Z.
 */
export function getYDigitCommons(rolls, topN = 2) {
  const freq = {};
  for (const roll of rolls) {
    const y = String(roll)[1];
    if (y && ['1','2','3','4'].includes(y)) freq[y] = (freq[y] || 0) + 1;
  }
  const total = Object.values(freq).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const commons = sorted.slice(0, topN).map(([d]) => d);
  const noise = sorted.slice(topN).map(([d]) => d);
  return { commons, noise, freq, total };
}

/**
 * Track Z digit frequency independently (3rd digit of 3-str rolls).
 * Just which sub-value (1-4) appears most — completely separate from Y.
 */
export function getZDigitCommons(rolls, topN = 2) {
  const freq = {};
  for (const roll of rolls) {
    const z = String(roll)[2];
    if (z && ['1','2','3','4'].includes(z)) freq[z] = (freq[z] || 0) + 1;
  }
  const total = Object.values(freq).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const commons = sorted.slice(0, topN).map(([d]) => d);
  const noise = sorted.slice(topN).map(([d]) => d);
  return { commons, noise, freq, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMMONS-BASED COLUMN GROUPING (replaces fixed Low/High, Outer/Inner)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive A/B groups for a column digit from the session commons.
 * @param {string[]} commons     e.g. ["41","42"] (from getSessionCommons)
 * @param {'y'|'z'}  digitPos   Which digit to extract
 * @param {boolean}  isYZPair   true if commons are yz pairs (2 digits)
 */
export function getCommonsGroups(commons, digitPos, isYZPair = false) {
  const posIdx = isYZPair ? (digitPos === 'y' ? 0 : 1)
                          : (digitPos === 'y' ? 1 : 2);

  const commonsDigits = [...new Set(commons.map(p => String(p)[posIdx]).filter(Boolean))];
  const allDigits = ['1', '2', '3', '4'];
  const noiseDigits = allDigits.filter(d => !commonsDigits.includes(d));

  const commonsLabel = commonsDigits.length > 0 ? `C[${commonsDigits.join(',')}]` : 'Commons';
  const noiseLabel = noiseDigits.length > 0 ? `N[${noiseDigits.join(',')}]` : 'Noise';

  return {
    pairA: commonsDigits,
    pairB: noiseDigits,
    pairALabel: commonsLabel,
    pairBLabel: noiseLabel,
    isDynamic: true,
    commons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. INDEPENDENT 3STR PREDICTION  ← PRIMARY
//
// Y and Z are tracked separately — no correlation assumed.
// Prediction: 4 + most-common-y + most-common-z
// If user has typed a y digit, lock that in and only predict z.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary 3str prediction using independent y and z frequencies.
 * @param {string[]} rolls   Session 3-digit rolls
 * @param {string}   yHint   Locked y digit from testInput (e.g. "1" from "41x")
 */
export function predictIndependent3str(rolls, yHint = null) {
  if (!rolls || rolls.length < 3) return null;

  const { commons: yCommons, noise: yNoise, freq: yFreq, total: yTotal } = getYDigitCommons(rolls, 2);
  const { commons: zCommons, noise: zNoise, freq: zFreq, total: zTotal } = getZDigitCommons(rolls, 2);

  if (yTotal === 0 || zTotal === 0) return null;

  const bestY = yHint || yCommons[0];
  const secondY = yHint
    ? (yCommons[0] === yHint ? yCommons[1] : yCommons[0])
    : yCommons[1];

  const bestZ = zCommons[0];
  const secondZ = zCommons[1] || null;

  const yConf = yFreq[bestY] ? yFreq[bestY] / yTotal : 0;
  const zConf = zFreq[bestZ] ? zFreq[bestZ] / zTotal : 0;
  const confidence = (yConf + zConf) / 2;

  return {
    prediction: `4${bestY}${bestZ}`,
    alt: secondZ ? `4${bestY}${secondZ}` : (secondY ? `4${secondY}${bestZ}` : null),
    yDigit: bestY,
    zDigit: bestZ,
    yConf: Math.round(yConf * 100),
    zConf: Math.round(zConf * 100),
    confidence,
    yCommons,
    yNoise,
    zCommons,
    zNoise,
    yFreq,
    zFreq,
    yLocked: !!yHint,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CAESAR 3STR PREDICTION  ← SECONDARY (correlation signal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Secondary: predict z via Caesar shift from 2str commons.
 * Useful when y and z ARE correlated (long-string sequence).
 */
export function predict3strFromY(commons, yDigit, freq = {}) {
  if (!commons || commons.length === 0 || !yDigit) return null;

  const y = parseInt(String(yDigit), 10);
  if (isNaN(y) || y < 1 || y > 4) return null;

  const shift = (8 - y) % 4;
  const candidates = [];
  let totalWeight = 0;

  for (const common of commons) {
    const s = String(common);
    const a = parseInt(s[1], 10);
    if (isNaN(a)) continue;

    const rawZ = ((a - 1 - shift + 8) % 4) + 1;
    const zStr = String(rawZ);
    const weight = freq[common] || 1;
    totalWeight += weight;

    const existing = candidates.find(c => c.z === zStr);
    if (existing) { existing.weight += weight; existing.from += `,${common}`; }
    else candidates.push({ z: zStr, weight, from: common });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.weight - a.weight);

  const best = candidates[0];
  const second = candidates[1] ?? null;
  const confidence = totalWeight > 0 ? best.weight / totalWeight : 0;

  return {
    zCandidates: candidates,
    prediction: best.z,
    alt: second?.z ?? null,
    confidence,
    fullPrediction: `4${y}${best.z}`,
    altPrediction: second ? `4${y}${second.z}` : null,
    y: String(y),
    shift,
    totalWeight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SMART Y DIGIT FROM INPUT
// ─────────────────────────────────────────────────────────────────────────────

export function getYDigitForPrediction(testInput, rolls) {
  if (testInput && testInput.length >= 2) {
    const y = String(testInput)[1];
    if (['1','2','3','4'].includes(y)) return y;
  }
  if (rolls && rolls.length > 0) {
    const lastRoll = String(rolls[rolls.length - 1]);
    const y = lastRoll[1];
    if (['1','2','3','4'].includes(y)) return y;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. COMMONS SUMMARY (for UI display)
// ─────────────────────────────────────────────────────────────────────────────

export function buildCommonsSummary(rolls, yzPairMode = true) {
  const { commons, noise, freq, total } = yzPairMode
    ? getYZCommons(rolls, 2)
    : getSessionCommons(rolls, 2);

  if (total < 4) return null;

  const commonsWithPct = commons.map(c => ({
    pair: c, count: freq[c] || 0,
    pct: Math.round(((freq[c] || 0) / total) * 100),
  }));
  const noiseWithPct = noise.map(c => ({
    pair: c, count: freq[c] || 0,
    pct: Math.round(((freq[c] || 0) / total) * 100),
  }));

  return {
    commons: commonsWithPct,
    noise: noiseWithPct,
    total,
    dominance: commonsWithPct.reduce((sum, c) => sum + c.pct, 0),
  };
}
