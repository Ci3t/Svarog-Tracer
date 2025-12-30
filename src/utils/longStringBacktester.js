// Long String Backtest Utility
// Imports raw digit strings, decodes to 4xxx format, runs BBP predictor
import { decodeLongString } from './stringHelpers.js';
import { predictNext2BBPMode } from './bbp-mode-2str.js';

/**
 * Run backtest on a long string
 * @param {string} longString - Raw digit string (e.g., "1233212332123")
 * @returns {Object} Backtest results with accuracy metrics
 */
export function runLongStringBacktest(longString) {
  if (!longString || longString.length < 2) {
    return {
      error: 'String too short',
      results: [],
    };
  }

  // Step 1: Decode the long string to get pairs and rolls
  const decoded = decodeLongString(longString);
  
  if (decoded.rolls.length < 2) {
    return {
      error: 'Need at least 2 decoded rolls for prediction',
      pairs: decoded.pairs,
      rolls: decoded.rolls,
      results: [],
    };
  }

  // Step 2: Run predictor on each roll (starting from roll 1 with at least 1 previous roll)
  const results = [];
  
  for (let i = 1; i < decoded.rolls.length; i++) {
    // Get context (all previous rolls in reversed order for BBP)
    const context = decoded.rolls.slice(0, i).reverse();
    const actual = decoded.rolls[i];
    const originalPair = decoded.pairs[i];
    
    // Run BBP predictor
    const prediction = predictNext2BBPMode(context);
    
    // Handle null predictions or chaotic patterns
    const predValue = prediction.prediction || '—';
    const altValue = prediction.alt || null;
    
    // Check if prediction matches
    const mainHit = predValue !== '—' && predValue === actual;
    const altHit = !mainHit && altValue && altValue === actual;
    const hit = mainHit || altHit;
    
    results.push({
      rollIndex: i,
      originalPair,
      decodedRoll: actual,
      context: context.slice(0, 8).reverse(), // Show last 8 in chronological order
      prediction: predValue,
      alt: altValue,
      confidence: prediction.confidence || 0,
      mode: prediction.mode || 'insufficient',
      pattern: prediction.pattern || 'none',
      mainHit,
      altHit,
      hit,
      isChaotic: prediction.isChaotic || false,
    });
  }

  // Step 3: Calculate overall accuracy
  const totalPredictions = results.length;
  const mainHits = results.filter(r => r.mainHit).length;
  const altHits = results.filter(r => r.altHit).length;
  const totalHits = mainHits + altHits;
  const misses = totalPredictions - totalHits;
  
  const mainAccuracy = totalPredictions > 0 ? Math.round((mainHits / totalPredictions) * 100) : 0;
  const combinedAccuracy = totalPredictions > 0 ? Math.round((totalHits / totalPredictions) * 100) : 0;

  return {
    originalString: longString,
    pairs: decoded.pairs,
    rolls: decoded.rolls,
    results,
    summary: {
      totalPredictions,
      mainHits,
      altHits,
      misses,
      mainAccuracy,
      combinedAccuracy,
    },
  };
}
