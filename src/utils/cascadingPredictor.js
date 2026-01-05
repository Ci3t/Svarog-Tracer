/**
 * 🎯 SMART PREDICTOR - CASCADING PRIORITY SYSTEM
 * 
 * Priority Order:
 * 1. Live Rolls (current session) - Highest priority
 * 2. Import Data (recent history) - Medium priority
 * 3. Sheet Data (historical) - Fallback only
 * 
 * Agreement Boosts:
 * - Live + Import agree: +10% confidence
 * - All three agree: +15% confidence
 */

import { translateTo4 } from './stringHelpers';
import { predictWithPairs } from './pairTransitionPredictor';

// Helper to strip trailing zeros
function stripZeros(str = "") {
  return str.replace(/0+$/, "");
}


/**
 * Analyze a dataset with weighted frequency
 * @param {Array} rolls - Roll data
 * @param {Number} decay - Recency decay factor (0.85-0.92)
 * @param {Number} lookback - How many rolls to look back
 */
function analyzeDataset(rolls, decay = 0.85, lookback = null) {
  if (!rolls || rolls.length === 0) {
    return {
      valid: false,
      prediction: null,
      alt: null,
      confidence: 0,
      rollCount: 0,
      candidates: []
    };
  }

  const data = lookback ? rolls.slice(-lookback) : rolls;
  const n = data.length;
  
  if (n < 2) {
    return {
      valid: false,
      prediction: null,
      alt: null,
      confidence: 0,
      rollCount: n,
      candidates: []
    };
  }

  // Weighted frequency with recency bias
  const freq = {};
  data.forEach((val, idx) => {
    const dist = n - 1 - idx;
    const weight = Math.pow(decay, dist);
    freq[val] = (freq[val] || 0) + weight;
  });

  const total = Object.values(freq).reduce((sum, w) => sum + w, 0);
  const sorted = Object.entries(freq)
    .map(([value, weight]) => ({
      value,
      weight,
      pct: Math.round((weight / total) * 100)
    }))
    .sort((a, b) => b.weight - a.weight);

  if (sorted.length === 0) {
    return {
      valid: false,
      prediction: null,
      alt: null,
      confidence: 0,
      rollCount: n,
      candidates: []
    };
  }

  const main = sorted[0];
  // Ensure alt is different from main
  let alt = null;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].value !== main.value) {
      alt = sorted[i];
      break;
    }
  }
  
  // Confidence based on dominance
  const dominance = main.pct / 100;
  const confidence = Math.min(0.4 + dominance * 0.4, 0.85);

  return {
    valid: true,
    prediction: main.value,
    alt: alt?.value || null,
    confidence,
    rollCount: n,
    candidates: sorted.slice(0, 3),
    dominance
  };
}

/**
 * Cascading priority prediction with live/import/sheet data
 * @param {Array} liveRolls - Current session rolls
 * @param {Array} importRolls - Imported historical rolls
 * @param {Array} sheetRolls - Sheet data (2-str or 3-str based on mode)
 * @param {String} activePrefix - Real-time prefix from user input (e.g., "43" from typing)
 * @param {String} mode - '2str' or '3str' prediction mode
 * @returns {Object} Prediction with source info
 */
export function predictWithCascadingPriority(
  liveRolls = [],
  importRolls = [],
  sheetRolls = [],
  activePrefix = null,
  mode = '3str'
) {
  const is2str = mode === '2str';
  const sliceLength = is2str ? 2 : 3;

  // Translate all rolls to 4-space and slice to correct length
  const translateRolls = (rolls) => rolls
    .map(r => {
      const translated = translateTo4(stripZeros(String(r)));
      return translated.slice(0, sliceLength);
    })
    .filter(r => r && r.length === sliceLength);

  const live = translateRolls(liveRolls);
  const imports = translateRolls(importRolls);
  
  // Sheet data is already in correct format (2-str or 3-str)
  const sheet = Array.isArray(sheetRolls) ? sheetRolls : [];

  // Determine prefix to use
  let prefix = activePrefix;
  
  // If no active prefix provided, use last roll's prefix
  if (!prefix && live.length > 0) {
    const lastRoll = live[live.length - 1];
    prefix = is2str ? lastRoll[0] : lastRoll.slice(0, 2);
  }

  // For 2-str: filter by first digit
  // For 3-str: filter by first 2 digits (prefix)
  const filterByPrefix = (rolls, pfx) => {
    if (!pfx) return [];
    const result = [];
    
    if (is2str) {
      // 2-str mode: return all rolls starting with this digit
      for (let i = 0; i < rolls.length; i++) {
        if (rolls[i][0] === pfx) {
          result.push(rolls[i]);
        }
      }
    } else {
      // 3-str mode: return all rolls starting with this 2-digit prefix
      for (let i = 0; i < rolls.length; i++) {
        if (rolls[i].slice(0, 2) === pfx) {
          result.push(rolls[i]);
        }
      }
    }
    return result;
  };

  const liveFiltered = filterByPrefix(live, prefix);
  const importFiltered = filterByPrefix(imports, prefix);
  const sheetFiltered = filterByPrefix(sheet, prefix);

  // 🔥 FIX: For 2-str mode, extract second digit for analysis
  const extract2ndDigit = (rolls) => {
    if (!is2str) return rolls;
    return rolls.map(r => r[1]).filter(d => d);
  };

  const liveForAnalysis = extract2ndDigit(liveFiltered);
  const importForAnalysis = extract2ndDigit(importFiltered);
  const sheetForAnalysis = extract2ndDigit(sheetFiltered);

  // Analyze each source
  let liveAnalysis;
  if (is2str && live.length >= 4) {
    const suggest = predictWithPairs(live);
    liveAnalysis = {
      valid: !!suggest.prediction,
      prediction: suggest.prediction ? suggest.prediction.slice(-1) : null, // Extract 2nd digit
      alt: suggest.alt ? suggest.alt.slice(-1) : null,
      confidence: suggest.confidence,
      rollCount: live.length,
      candidates: Array.isArray(suggest.pairMatrix?.[live[live.length-1]] ) ? [] : [], // Placeholder for candidates
      dominance: suggest.confidence // Approximate
    };
  } else {
    liveAnalysis = analyzeDataset(liveForAnalysis, 0.85, 12);
  }
  
  const importAnalysis = analyzeDataset(importForAnalysis, 0.90, 50);
  const sheetAnalysis = analyzeDataset(sheetForAnalysis, 0.92, null);

  // 🔥 FIX: For 2-str, convert predictions back to full format (prefix + digit)
  const formatPrediction = (digit) => {
    if (!is2str || !digit) return digit;
    return prefix + digit;
  };

  // Update predictions to include prefix for 2-str
  if (liveAnalysis.valid) {
    liveAnalysis.prediction = formatPrediction(liveAnalysis.prediction);
    liveAnalysis.alt = liveAnalysis.alt ? formatPrediction(liveAnalysis.alt) : null;
  }
  if (importAnalysis.valid) {
    importAnalysis.prediction = formatPrediction(importAnalysis.prediction);
    importAnalysis.alt = importAnalysis.alt ? formatPrediction(importAnalysis.alt) : null;
  }
  if (sheetAnalysis.valid) {
    sheetAnalysis.prediction = formatPrediction(sheetAnalysis.prediction);
    sheetAnalysis.alt = sheetAnalysis.alt ? formatPrediction(sheetAnalysis.alt) : null;
  }

  // CASCADING PRIORITY LOGIC
  let source = 'none';
  let prediction = null;
  let alt = null;
  let confidence = 0;
  let reasoning = '';
  let agreement = {
    liveImport: false,
    allThree: false
  };

  // Check agreement
  if (liveAnalysis.valid && importAnalysis.valid) {
    agreement.liveImport = liveAnalysis.prediction === importAnalysis.prediction;
    
    if (agreement.liveImport && sheetAnalysis.valid) {
      agreement.allThree = liveAnalysis.prediction === sheetAnalysis.prediction;
    }
  }

  // PRIORITY 1: Live Rolls (lowered thresholds to prioritize live data)
  if (liveAnalysis.valid && liveAnalysis.rollCount >= 3 && liveAnalysis.confidence >= 0.50) {
    source = 'live';
    prediction = liveAnalysis.prediction;
    alt = liveAnalysis.alt;
    confidence = liveAnalysis.confidence;
    reasoning = `Live data (${liveAnalysis.rollCount} rolls)`;
    
    // Agreement boost
    if (agreement.allThree) {
      confidence = Math.min(confidence * 1.15, 0.90);
      reasoning += ' + Triple agreement 🔥';
    } else if (agreement.liveImport) {
      confidence = Math.min(confidence * 1.10, 0.85);
      reasoning += ' + Import agrees ✓';
    }
    
    // Low confidence warning
    if (liveAnalysis.rollCount < 6) {
      reasoning += ' (small sample)';
    }
  }
  // PRIORITY 1b: Live with very few rolls but strong pattern
  else if (liveAnalysis.valid && liveAnalysis.rollCount >= 2 && liveAnalysis.confidence >= 0.60) {
    source = 'live';
    prediction = liveAnalysis.prediction;
    alt = liveAnalysis.alt;
    confidence = liveAnalysis.confidence;
    reasoning = `Live data (${liveAnalysis.rollCount} rolls, strong pattern)`;
    
    if (agreement.liveImport) {
      confidence = Math.min(confidence * 1.10, 0.85);
      reasoning += ' + Import agrees ✓';
    }
  }
  // PRIORITY 2: Import Data
  else if (importAnalysis.valid && importAnalysis.rollCount >= 10 && importAnalysis.confidence >= 0.65) {
    source = 'import';
    prediction = importAnalysis.prediction;
    alt = importAnalysis.alt;
    confidence = importAnalysis.confidence;
    reasoning = `Import data (${importAnalysis.rollCount} rolls)`;
    
    if (sheetAnalysis.valid && importAnalysis.prediction === sheetAnalysis.prediction) {
      confidence = Math.min(confidence * 1.08, 0.82);
      reasoning += ' + Sheet agrees';
    }
  }
  // PRIORITY 3: Sheet Data (Historical patterns - still valuable!)
  else if (sheetAnalysis.valid) {
    source = 'sheet';
    prediction = sheetAnalysis.prediction;
    alt = sheetAnalysis.alt;
    // 🔥 BOOSTED: Increased from 0.70 to 0.75 (sheet data is still good!)
    confidence = Math.min(sheetAnalysis.confidence * 0.95, 0.75);
    reasoning = `Sheet data (${sheetAnalysis.rollCount} historical rolls)`;
  }

  return {
    prediction,
    alt,
    confidence,
    source,
    reasoning,
    agreement,
    prefix, // Return the prefix that was used
    mode, // Return the mode (2str or 3str)
    sources: {
      live: {
        valid: liveAnalysis.valid,
        rolls: liveAnalysis.rollCount,
        prediction: liveAnalysis.prediction,
        confidence: liveAnalysis.confidence
      },
      import: {
        valid: importAnalysis.valid,
        rolls: importAnalysis.rollCount,
        prediction: importAnalysis.prediction,
        confidence: importAnalysis.confidence
      },
      sheet: {
        valid: sheetAnalysis.valid,
        rolls: sheetAnalysis.rollCount,
        prediction: sheetAnalysis.prediction,
        confidence: sheetAnalysis.confidence
      }
    },
    candidates: source === 'live' ? liveAnalysis.candidates :
                source === 'import' ? importAnalysis.candidates :
                sheetAnalysis.candidates
  };
}
