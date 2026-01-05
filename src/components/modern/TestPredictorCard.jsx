/**
 * TestPredictorCard - Experimental Testing Ground
 * 
 * Features being tested:
 * 1. Time-based patterns (early/mid/late session)
 * 2. Session personality detection (sticky/alternating/chaotic)
 * 3. Anti-pattern detection (curse breaker)
 */
import React, { useMemo } from 'react';
import { predictWithPairs } from '../../utils/pairTransitionPredictor';

const VALUES = ['41', '42', '43', '44'];

// ============================================================================
// NEW FEATURE: Session Personality Detection
// ============================================================================
function detectSessionPersonality(rolls) {
  if (rolls.length < 6) return { type: 'unknown', confidence: 0 };
  
  let repeatCount = 0;    // Same value repeats (sticky)
  let alternateCount = 0; // A-B-A-B pattern
  let randomCount = 0;    // No pattern
  
  for (let i = 1; i < rolls.length; i++) {
    const prev = rolls[i - 1];
    const curr = rolls[i];
    const prevPrev = rolls[i - 2];
    
    if (curr === prev) {
      repeatCount++;
    } else if (i >= 2 && curr === prevPrev && curr !== prev) {
      alternateCount++;
    } else {
      randomCount++;
    }
  }
  
  const total = repeatCount + alternateCount + randomCount;
  const repeatPct = (repeatCount / total) * 100;
  const alternatePct = (alternateCount / total) * 100;
  
  if (repeatPct >= 40) {
    return { type: 'sticky', confidence: repeatPct, description: 'Values tend to repeat' };
  } else if (alternatePct >= 30) {
    return { type: 'alternating', confidence: alternatePct, description: 'A-B-A-B pattern' };
  } else if (randomCount > repeatCount + alternateCount) {
    return { type: 'chaotic', confidence: Math.round((randomCount / total) * 100), description: 'No clear pattern' };
  } else {
    return { type: 'mixed', confidence: 50, description: 'Mixed patterns' };
  }
}

// ============================================================================
// NEW FEATURE: Time-Based Phase Detection
// ============================================================================
function detectSessionPhase(entries) {
  if (entries.length === 0) return { phase: 'unknown', minutesElapsed: 0 };
  
  const firstTime = new Date(entries[0].time).getTime();
  const lastTime = new Date(entries[entries.length - 1].time).getTime();
  const minutesElapsed = Math.floor((lastTime - firstTime) / 60000);
  
  if (minutesElapsed < 2) {
    return { phase: 'early', minutesElapsed, description: 'Session starting' };
  } else if (minutesElapsed < 4) {
    return { phase: 'mid', minutesElapsed, description: 'Mid-session' };
  } else {
    return { phase: 'late', minutesElapsed, description: 'Late session' };
  }
}

// ============================================================================
// NEW FEATURE: Anti-Pattern Detection (Curse Breaker)
// ============================================================================
function detectCurse(predictionHistory) {
  // predictionHistory = [{ pred, alt, actual, wasHit }, ...]
  if (predictionHistory.length < 3) return { isCursed: false, streakLength: 0 };
  
  let missStreak = 0;
  for (let i = predictionHistory.length - 1; i >= 0; i--) {
    if (!predictionHistory[i].wasHit) {
      missStreak++;
    } else {
      break;
    }
  }
  
  return {
    isCursed: missStreak >= 3,
    streakLength: missStreak,
    suggestion: missStreak >= 3 ? 'Consider inverting prediction' : null
  };
}

export default function TestPredictorCard({ entries = [], predictionHistory = [] }) {
  // Extract 2-str rolls from entries
  const rolls = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    return entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
  }, [entries]);

  // Get base prediction from experimental predictor
  const baseData = useMemo(() => predictWithPairs(rolls), [rolls]);

  // NEW: Session personality
  const personality = useMemo(() => detectSessionPersonality(rolls), [rolls]);
  
  // NEW: Session phase
  const sessionPhase = useMemo(() => detectSessionPhase(entries), [entries]);
  
  // NEW: Curse detection
  const curse = useMemo(() => detectCurse(predictionHistory), [predictionHistory]);

  // Adjust prediction based on WEIGHTED ENSEMBLE scoring
  const adjustedPrediction = useMemo(() => {
    if (!baseData.prediction || rolls.length < 6) return null;
    
    let { prediction, alt, confidence, method } = baseData;
    const lastRoll = rolls[rolls.length - 1];
    let adjustments = [];
    
    // =====================================================================
    // WEIGHTED ENSEMBLE SCORING
    // Combine frequency, pair matrix, and momentum with weights
    // =====================================================================
    const VALUES = ['41', '42', '43', '44'];
    
    // Get raw data from baseData
    const distribution = baseData.distribution || {};
    const pairMatrix = baseData.pairMatrix || {};
    const momentumScores = baseData.momentumScores || {};
    const lastRollRow = pairMatrix[lastRoll] || {};
    
    // Define weights based on session phase
    let freqWeight = 0.40;
    let pairWeight = 0.35;
    let momWeight = 0.25;
    
    // Adjust weights based on phase
    if (sessionPhase.phase === 'early') {
      freqWeight = 0.50;
      pairWeight = 0.25;
      momWeight = 0.25;
      adjustments.push('W:early');
    } else if (sessionPhase.phase === 'late') {
      freqWeight = 0.30;
      pairWeight = 0.40;
      momWeight = 0.30;
      adjustments.push('W:late');
    }
    
    // Calculate weighted scores for each value
    const scores = VALUES.map(v => {
      const freqScore = (distribution[v] || 0) / 100;
      const pairScore = (lastRollRow[v]?.pct || 0) / 100;
      const momScore = Math.min((momentumScores[v] || 0) / 2, 1);
      
      const totalScore = (freqScore * freqWeight) + (pairScore * pairWeight) + (momScore * momWeight);
      
      return { value: v, score: totalScore, freqScore, pairScore, momScore };
    }).sort((a, b) => b.score - a.score);
    
    // Pick top 2 by weighted score
    const weightedPred = scores[0]?.value;
    const weightedAlt = scores[1]?.value;
    
    // Use weighted if different from experimental
    if (weightedPred && weightedPred !== baseData.prediction) {
      prediction = weightedPred;
      alt = weightedAlt;
      confidence = Math.min(scores[0].score + 0.3, 0.75);
      method = 'WEIGHTED';
      adjustments.push('OVERRIDE');
    } else if (weightedAlt && weightedAlt !== baseData.alt) {
      alt = weightedAlt;
      adjustments.push('W-ALT');
    }
    
    // Curse breaker
    if (curse.isCursed && curse.streakLength >= 4) {
      adjustments.push('CURSE');
      [prediction, alt] = [alt, prediction];
      confidence = Math.min(confidence, 0.50);
    }
    
    return {
      prediction,
      alt,
      confidence,
      method,
      adjustments,
      scores: scores.slice(0, 4) // Include scores for display
    };
  }, [baseData, sessionPhase, curse, rolls]);

  if (!baseData.prediction) {
    return (
      <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            🔬 Test Predictor
          </span>
        </div>
        <div className="text-center text-slate-500 py-6">
          Need at least 6 rolls
        </div>
      </div>
    );
  }

  const { prediction, alt, confidence, method, adjustments } = adjustedPrediction || baseData;
  const confidencePct = Math.round(confidence * 100);

  const getPersonalityColor = (type) => {
    const colors = {
      sticky: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      alternating: 'bg-green-500/20 text-green-400 border-green-500/30',
      chaotic: 'bg-red-500/20 text-red-400 border-red-500/30',
      mixed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[type] || colors.mixed;
  };

  return (
    <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
            🔬 Test Predictor
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/30 text-cyan-300 border border-cyan-500/50`}>
          {method}
        </span>
      </div>

      {/* Main Prediction Display */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-cyan-400">
            {prediction}
          </div>
          <div className="text-lg font-semibold text-slate-400">
            {confidencePct}%
          </div>
        </div>
        {alt && (
          <div className="flex flex-col items-center opacity-60">
            <div className="text-2xl font-bold text-slate-400">
              {alt}
            </div>
            <div className="text-xs text-slate-500">alt</div>
          </div>
        )}
      </div>

      {/* NEW FEATURES DISPLAY */}
      <div className="space-y-2">
        {/* Session Personality */}
        <div className={`text-[10px] px-2 py-1.5 rounded border ${getPersonalityColor(personality.type)}`}>
          <span className="font-bold uppercase">Session: {personality.type}</span>
          <span className="ml-2 opacity-75">({personality.confidence}%)</span>
          <span className="ml-2 opacity-50">{personality.description}</span>
        </div>

        {/* Session Phase */}
        <div className="text-[10px] px-2 py-1.5 rounded bg-slate-700/30 text-slate-400 border border-slate-600/30">
          <span className="font-bold uppercase">Phase: {sessionPhase.phase}</span>
          <span className="ml-2 opacity-75">({sessionPhase.minutesElapsed}m elapsed)</span>
        </div>

        {/* Curse Detection */}
        {curse.isCursed && (
          <div className="text-[10px] px-2 py-1.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
            <span className="font-bold">⚠️ CURSE DETECTED:</span>
            <span className="ml-2">{curse.streakLength} misses in a row</span>
            {curse.suggestion && <span className="ml-2 opacity-75">| {curse.suggestion}</span>}
          </div>
        )}

        {/* Adjustments Applied */}
        {adjustments && adjustments.length > 0 && (
          <div className="text-[10px] text-slate-500 flex flex-wrap gap-1">
            <span>Adjustments:</span>
            {adjustments.map((adj, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                {adj}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
