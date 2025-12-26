/**
 * WindowPerformanceTracker - Tracks accuracy of each predictor per 5-minute window
 * Enables adaptive selection of best-performing predictor in real-time
 */

export class WindowPerformanceTracker {
  constructor() {
    this.currentWindow = null;
    this.windowHistory = [];
    this.maxHistory = 10; // Keep last 10 windows for analysis
  }

  /**
   * Start a new 5-minute window
   */
  startNewWindow(timestamp) {
    // Save current window to history
    if (this.currentWindow && this.currentWindow.predictors.c3.total > 0) {
      this.windowHistory.push(this.currentWindow);
      if (this.windowHistory.length > this.maxHistory) {
        this.windowHistory.shift();
      }
    }

    // Initialize new window
    this.currentWindow = {
      startTime: timestamp,
      windowKey: Math.floor(timestamp / 300000) * 300000,
      rolls: [],
      predictors: {
        c2: { predictions: [], hits: 0, total: 0, accuracy: 0 },
        c3: { predictions: [], hits: 0, total: 0, accuracy: 0 },
        prefix: { predictions: [], hits: 0, total: 0, accuracy: 0 },
      },
      bestPredictor: null,
      patternType: null,
    };
  }

  /**
   * Record a prediction and its result
   */
  recordPrediction(predictor, predicted, actual) {
    if (!this.currentWindow) {
      this.startNewWindow(Date.now());
    }

    const p = this.currentWindow.predictors[predictor];
    
    // Handle different prediction formats
    let isHit = false;
    if (predictor === 'prefix') {
      // Prefix predicts full 3-digit roll
      const predictedDigit = predicted?.slice(2, 3);
      const actualDigit = actual?.slice(2, 3);
      isHit = predictedDigit === actualDigit;
    } else {
      // Wave columns predict digit pairs (e.g., [1,2] or [3,4])
      const actualDigit = actual?.slice(2, 3);
      isHit = Array.isArray(predicted) && predicted.includes(actualDigit);
    }

    p.predictions.push({ predicted, actual, hit: isHit });
    p.total++;
    if (isHit) p.hits++;
    p.accuracy = p.total > 0 ? p.hits / p.total : 0;

    // Update best predictor
    this.updateBestPredictor();
  }

  /**
   * Determine which predictor is performing best in current window
   */
  updateBestPredictor() {
    const predictors = this.currentWindow.predictors;
    
    // Need at least 3 predictions to determine best
    const eligible = Object.entries(predictors)
      .filter(([_, p]) => p.total >= 3)
      .sort((a, b) => b[1].accuracy - a[1].accuracy);

    if (eligible.length > 0) {
      this.currentWindow.bestPredictor = eligible[0][0];
    } else {
      // Default to C3 if not enough data
      this.currentWindow.bestPredictor = 'c3';
    }
  }

  /**
   * Get the best predictor with confidence level
   */
  getBestPredictor() {
    // If current window has enough data, use it
    if (this.currentWindow?.bestPredictor && this.currentWindow.predictors[this.currentWindow.bestPredictor].total >= 3) {
      return {
        predictor: this.currentWindow.bestPredictor,
        accuracy: this.currentWindow.predictors[this.currentWindow.bestPredictor].accuracy,
        confidence: 'HIGH',
        sampleSize: this.currentWindow.predictors[this.currentWindow.bestPredictor].total,
      };
    }

    // Otherwise, use historical data from recent windows
    if (this.windowHistory.length > 0) {
      const recentWindows = this.windowHistory.slice(-3);
      const avgAccuracy = {};

      for (const pred of ['c2', 'c3', 'prefix']) {
        const accs = recentWindows
          .map((w) => w.predictors[pred].accuracy)
          .filter((a) => a > 0);
        avgAccuracy[pred] = accs.length > 0 ? accs.reduce((sum, a) => sum + a, 0) / accs.length : 0;
      }

      const best = Object.entries(avgAccuracy).sort((a, b) => b[1] - a[1])[0];
      return {
        predictor: best[0],
        accuracy: best[1],
        confidence: 'MEDIUM',
        sampleSize: recentWindows.length,
      };
    }

    // Default to C3 (historically best)
    return { predictor: 'c3', accuracy: 0.5, confidence: 'LOW', sampleSize: 0 };
  }

  /**
   * Get adaptive weights for combining predictions
   */
  getWeights() {
    const best = this.getBestPredictor();

    // Default weights (C3 primary, others secondary)
    const weights = { c2: 0.2, c3: 0.5, prefix: 0.3 };

    if (best.confidence === 'HIGH' && best.accuracy > 0.7) {
      // Strong preference for best predictor when it's performing well
      weights[best.predictor] = 0.7;
      const remaining = 0.3;
      const others = ['c2', 'c3', 'prefix'].filter((p) => p !== best.predictor);
      others.forEach((p) => (weights[p] = remaining / others.length));
    } else if (best.confidence === 'MEDIUM' && best.accuracy > 0.6) {
      // Moderate preference
      weights[best.predictor] = 0.55;
      const remaining = 0.45;
      const others = ['c2', 'c3', 'prefix'].filter((p) => p !== best.predictor);
      others.forEach((p) => (weights[p] = remaining / others.length));
    }

    return weights;
  }

  /**
   * Get current window statistics
   */
  getCurrentWindowStats() {
    if (!this.currentWindow) {
      return {
        accuracy: 0.5,
        rolls: [],
        bestPredictor: 'c3',
        predictors: {},
      };
    }

    return {
      accuracy: this.calculateOverallAccuracy(),
      rolls: this.currentWindow.rolls,
      bestPredictor: this.currentWindow.bestPredictor || 'c3',
      predictors: this.currentWindow.predictors,
      rollCount: this.currentWindow.rolls.length,
    };
  }

  /**
   * Calculate overall accuracy across all predictors in current window
   */
  calculateOverallAccuracy() {
    if (!this.currentWindow) return 0.5;

    const predictors = this.currentWindow.predictors;
    const totalHits = Object.values(predictors).reduce((sum, p) => sum + p.hits, 0);
    const totalPredictions = Object.values(predictors).reduce((sum, p) => sum + p.total, 0);

    return totalPredictions > 0 ? totalHits / totalPredictions : 0.5;
  }

  /**
   * Add a roll to current window
   */
  addRoll(roll, timestamp) {
    if (!this.currentWindow) {
      this.startNewWindow(timestamp);
    }

    // Check if we need to start a new window (5-minute boundary)
    const currentWindowKey = Math.floor(timestamp / 300000) * 300000;
    if (currentWindowKey !== this.currentWindow.windowKey) {
      this.startNewWindow(timestamp);
    }

    this.currentWindow.rolls.push(roll);
  }

  /**
   * Get performance summary for debugging
   */
  getPerformanceSummary() {
    const current = this.getCurrentWindowStats();
    const best = this.getBestPredictor();
    const weights = this.getWeights();

    return {
      currentWindow: {
        accuracy: (current.accuracy * 100).toFixed(1) + '%',
        rollCount: current.rollCount,
        bestPredictor: current.bestPredictor,
        predictorStats: Object.entries(current.predictors).map(([name, stats]) => ({
          name,
          accuracy: (stats.accuracy * 100).toFixed(1) + '%',
          hits: stats.hits,
          total: stats.total,
        })),
      },
      bestPredictor: {
        name: best.predictor,
        accuracy: (best.accuracy * 100).toFixed(1) + '%',
        confidence: best.confidence,
        sampleSize: best.sampleSize,
      },
      weights: {
        c2: (weights.c2 * 100).toFixed(0) + '%',
        c3: (weights.c3 * 100).toFixed(0) + '%',
        prefix: (weights.prefix * 100).toFixed(0) + '%',
      },
      windowHistory: this.windowHistory.length,
    };
  }
}

// Singleton instance
let trackerInstance = null;

export function getWindowTracker() {
  if (!trackerInstance) {
    trackerInstance = new WindowPerformanceTracker();
  }
  return trackerInstance;
}

export function resetWindowTracker() {
  trackerInstance = new WindowPerformanceTracker();
  return trackerInstance;
}
