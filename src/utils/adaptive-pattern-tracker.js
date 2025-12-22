// src/utils/adaptive-pattern-tracker.js
// Real-time pattern performance tracking for adaptive confidence

class AdaptivePatternTracker {
  constructor() {
    this.sessionStats = {
      'dominance': { hits: 0, misses: 0, totalConfidence: 0 },
      'alternating': { hits: 0, misses: 0, totalConfidence: 0 },
      'noise-recovery': { hits: 0, misses: 0, totalConfidence: 0 },
      'noise-run': { hits: 0, misses: 0, totalConfidence: 0 },
      'sticky': { hits: 0, misses: 0, totalConfidence: 0 },
      'balanced': { hits: 0, misses: 0, totalConfidence: 0 },
      'transition-based': { hits: 0, misses: 0, totalConfidence: 0 },
      'run-flip': { hits: 0, misses: 0, totalConfidence: 0 },
      'run-continue': { hits: 0, misses: 0, totalConfidence: 0 },
      'single-dominant': { hits: 0, misses: 0, totalConfidence: 0 },
    };
    
    this.recentPredictions = [];
    this.maxHistory = 50;
  }

  /**
   * Record a prediction result
   */
  recordPrediction(pattern, predicted, actual, confidence) {
    if (!this.sessionStats[pattern]) {
      this.sessionStats[pattern] = { hits: 0, misses: 0, totalConfidence: 0 };
    }

    const isHit = predicted === actual;
    
    if (isHit) {
      this.sessionStats[pattern].hits++;
    } else {
      this.sessionStats[pattern].misses++;
    }
    
    this.sessionStats[pattern].totalConfidence += confidence;

    // Track recent predictions
    this.recentPredictions.push({
      pattern,
      predicted,
      actual,
      confidence,
      isHit,
      timestamp: Date.now(),
    });

    // Keep only recent history
    if (this.recentPredictions.length > this.maxHistory) {
      this.recentPredictions.shift();
    }
  }

  /**
   * Get accuracy for a specific pattern
   */
  getPatternAccuracy(pattern) {
    const stats = this.sessionStats[pattern];
    if (!stats || (stats.hits + stats.misses) === 0) return 0;
    
    return stats.hits / (stats.hits + stats.misses);
  }

  /**
   * Get adaptive confidence boost for a pattern
   * Returns a multiplier (0.8 - 1.2) based on recent performance
   */
  getConfidenceBoost(pattern) {
    const accuracy = this.getPatternAccuracy(pattern);
    const stats = this.sessionStats[pattern];
    const attempts = stats.hits + stats.misses;

    // Need at least 3 attempts to adjust confidence
    if (attempts < 3) return 1.0;

    // Boost confidence for patterns that are hitting
    if (accuracy >= 0.75) return 1.15; // +15% boost
    if (accuracy >= 0.60) return 1.08; // +8% boost
    if (accuracy >= 0.50) return 1.0;  // No change
    if (accuracy >= 0.30) return 0.92; // -8% penalty
    return 0.85; // -15% penalty for poor patterns
  }

  /**
   * Get the best performing pattern in this session
   */
  getBestPattern() {
    let bestPattern = null;
    let bestAccuracy = 0;

    for (const [pattern, stats] of Object.entries(this.sessionStats)) {
      const attempts = stats.hits + stats.misses;
      if (attempts < 3) continue; // Need minimum attempts

      const accuracy = stats.hits / attempts;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestPattern = pattern;
      }
    }

    return { pattern: bestPattern, accuracy: bestAccuracy };
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const totalAttempts = Object.values(this.sessionStats).reduce(
      (sum, stats) => sum + stats.hits + stats.misses, 0
    );
    
    const totalHits = Object.values(this.sessionStats).reduce(
      (sum, stats) => sum + stats.hits, 0
    );

    const overallAccuracy = totalAttempts > 0 ? totalHits / totalAttempts : 0;

    const patternBreakdown = Object.entries(this.sessionStats)
      .filter(([_, stats]) => (stats.hits + stats.misses) > 0)
      .map(([pattern, stats]) => ({
        pattern,
        hits: stats.hits,
        misses: stats.misses,
        accuracy: stats.hits / (stats.hits + stats.misses),
        avgConfidence: stats.totalConfidence / (stats.hits + stats.misses),
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    return {
      totalAttempts,
      totalHits,
      overallAccuracy,
      patternBreakdown,
      bestPattern: this.getBestPattern(),
    };
  }

  /**
   * Reset session stats (call when starting new 5-min window)
   */
  resetSession() {
    for (const pattern in this.sessionStats) {
      this.sessionStats[pattern] = { hits: 0, misses: 0, totalConfidence: 0 };
    }
    this.recentPredictions = [];
  }

  /**
   * Get recent prediction history
   */
  getRecentHistory(count = 10) {
    return this.recentPredictions.slice(-count);
  }
}

// Singleton instance for the current session
let trackerInstance = null;

export function getPatternTracker() {
  if (!trackerInstance) {
    trackerInstance = new AdaptivePatternTracker();
  }
  return trackerInstance;
}

export function resetPatternTracker() {
  if (trackerInstance) {
    trackerInstance.resetSession();
  }
}

export default AdaptivePatternTracker;
