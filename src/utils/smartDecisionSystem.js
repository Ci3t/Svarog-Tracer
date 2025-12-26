/**
 * 🎯 SMART DECISION SYSTEM
 * 
 * Determines when to use Wave Flip vs Smart Prefix
 * Based on pattern strength, swap rate, and confidence levels
 */

/**
 * Get confidence level emoji and label
 */
function getConfidenceLevel(confidence) {
  if (confidence >= 0.75) return { emoji: '🔥', label: 'GOLDEN', color: 'text-emerald-200' };
  if (confidence >= 0.65) return { emoji: '⭐', label: 'STRONG', color: 'text-yellow-200' };
  if (confidence >= 0.55) return { emoji: '✅', label: 'GOOD', color: 'text-cyan-200' };
  if (confidence >= 0.45) return { emoji: '⚠️', label: 'MIXED', color: 'text-orange-200' };
  return { emoji: '❌', label: 'SKIP', color: 'text-rose-200' };
}

/**
 * Determine if Wave Flip should be used
 * @param {Object} waveAnalysis - Wave pattern analysis from KiyoMode
 * @returns {Boolean} Should use wave flip
 */
function shouldUseWaveFlip(waveAnalysis) {
  if (!waveAnalysis || !waveAnalysis.columns) return false;

  const columns = waveAnalysis.columns;
  
  // Check for strong wave signals
  const highConfidenceColumns = columns.filter(col => col.confidence >= 0.70);
  const multiColumnAgreement = highConfidenceColumns.length >= 2;
  
  // Check for consecutive runs
  const hasConsecutiveRuns = columns.some(col => 
    col.runLength >= 3 && col.currentSide !== null
  );
  
  // Check swap rate (LOW = stable, good for flip)
  const avgSwapRate = columns.reduce((sum, col) => sum + (col.swapRate || 0), 0) / columns.length;
  const lowSwapRate = avgSwapRate < 0.4;
  
  // Decision criteria
  const strongSignal = highConfidenceColumns.length > 0;
  const veryStrongSignal = multiColumnAgreement && lowSwapRate;
  
  return veryStrongSignal || (strongSignal && hasConsecutiveRuns);
}

/**
 * Determine if Smart Prefix should be used
 * @param {Object} prefixResult - Prefix prediction result
 * @param {Object} waveAnalysis - Wave analysis
 * @returns {Boolean} Should use smart prefix
 */
function shouldUseSmartPrefix(prefixResult, waveAnalysis) {
  if (!prefixResult || !prefixResult.prediction) return false;

  // High prefix confidence
  if (prefixResult.confidence >= 0.65) return true;

  // Wave is weak or mixed
  if (!waveAnalysis || !waveAnalysis.columns) return true;
  
  const avgWaveConf = waveAnalysis.columns.reduce((sum, col) => sum + col.confidence, 0) / waveAnalysis.columns.length;
  if (avgWaveConf < 0.60) return true;

  // High swap rate (alternating pattern, wave unreliable)
  const avgSwapRate = waveAnalysis.columns.reduce((sum, col) => sum + (col.swapRate || 0), 0) / waveAnalysis.columns.length;
  if (avgSwapRate > 0.7) return true;

  return false;
}

/**
 * Generate smart recommendation
 * @param {Object} waveAnalysis - Wave pattern analysis
 * @param {Object} prefixResult - Smart prefix prediction
 * @returns {Object} Recommendation with reasoning
 */
export function getSmartRecommendation(waveAnalysis, prefixResult) {
  const useWave = shouldUseWaveFlip(waveAnalysis);
  const usePrefix = shouldUseSmartPrefix(prefixResult, waveAnalysis);

  // Calculate average swap rate
  let avgSwapRate = 0;
  if (waveAnalysis?.columns) {
    avgSwapRate = waveAnalysis.columns.reduce((sum, col) => sum + (col.swapRate || 0), 0) / waveAnalysis.columns.length;
  }

  // Determine primary and alternative
  let primary = null;
  let alternative = null;
  let reasoning = '';

  if (useWave && !usePrefix) {
    // Wave only
    primary = {
      type: 'wave',
      prediction: waveAnalysis.prediction,
      alt: waveAnalysis.alt,
      confidence: waveAnalysis.confidence,
      ...getConfidenceLevel(waveAnalysis.confidence)
    };
    
    const multiCol = waveAnalysis.columns.filter(c => c.confidence >= 0.70).length >= 2;
    reasoning = avgSwapRate < 0.4 
      ? `Low swap rate (${(avgSwapRate * 100).toFixed(0)}%) - stable pattern${multiCol ? ', multi-column agreement' : ''}`
      : `Strong wave signal${multiCol ? ', multi-column agreement' : ''}`;
      
  } else if (usePrefix && !useWave) {
    // Prefix only
    primary = {
      type: 'prefix',
      prediction: prefixResult.prediction,
      alt: prefixResult.alt,
      confidence: prefixResult.confidence,
      ...getConfidenceLevel(prefixResult.confidence)
    };
    
    reasoning = avgSwapRate > 0.7
      ? `High swap rate (${(avgSwapRate * 100).toFixed(0)}%) - alternating pattern, wave unreliable`
      : prefixResult.reasoning || 'Pattern building phase';
      
  } else if (useWave && usePrefix) {
    // Both valid - choose higher confidence
    const waveConf = waveAnalysis.confidence || 0;
    const prefixConf = prefixResult.confidence || 0;
    
    if (waveConf >= prefixConf) {
      primary = {
        type: 'wave',
        prediction: waveAnalysis.prediction,
        alt: waveAnalysis.alt,
        confidence: waveConf,
        ...getConfidenceLevel(waveConf)
      };
      alternative = {
        type: 'prefix',
        prediction: prefixResult.prediction,
        alt: prefixResult.alt,
        confidence: prefixConf,
        ...getConfidenceLevel(prefixConf)
      };
      reasoning = `Wave has higher confidence (${(waveConf * 100).toFixed(0)}% vs ${(prefixConf * 100).toFixed(0)}%)`;
    } else {
      primary = {
        type: 'prefix',
        prediction: prefixResult.prediction,
        alt: prefixResult.alt,
        confidence: prefixConf,
        ...getConfidenceLevel(prefixConf)
      };
      alternative = {
        type: 'wave',
        prediction: waveAnalysis.prediction,
        alt: waveAnalysis.alt,
        confidence: waveConf,
        ...getConfidenceLevel(waveConf)
      };
      reasoning = `Prefix has higher confidence (${(prefixConf * 100).toFixed(0)}% vs ${(waveConf * 100).toFixed(0)}%)`;
    }
  } else {
    // Neither valid
    return {
      valid: false,
      message: 'Insufficient data for recommendation'
    };
  }

  return {
    valid: true,
    primary,
    alternative,
    reasoning,
    swapRate: avgSwapRate,
    dataSource: prefixResult.source || 'unknown'
  };
}
