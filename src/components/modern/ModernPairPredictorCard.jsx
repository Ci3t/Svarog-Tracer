/**
 * ModernPairPredictorCard - Experimental Pair Transition Predictor
 * 
 * A/B testing card that shows predictions based on pair transitions,
 * wave detection, and trend tracking instead of just frequency.
 */
import React, { useMemo } from 'react';
import { predictWithPairs, formatTrendsForExport } from '../../utils/pairTransitionPredictor';

const VALUES = ['41', '42', '43', '44'];

export default function ModernPairPredictorCard({ entries = [] }) {
  // Extract 2-str rolls from entries
  const rolls = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    return entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
  }, [entries]);

  // Get prediction data
  const data = useMemo(() => predictWithPairs(rolls), [rolls]);

  if (!data.prediction) {
    return (
      <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/90 rounded-2xl p-4 border border-amber-500/30 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            🧪 Experimental
          </span>
          <span className="text-xs text-slate-500">Pair Predictor</span>
        </div>
        <div className="text-center text-slate-500 py-6">
          Need at least 6 rolls
        </div>
      </div>
    );
  }

  const {
    prediction,
    alt,
    confidence,
    method,
    pairMatrix,
    lastRoll,
    waveSignals,
    trends,
    commons,
    noise,
    distribution,
    freqPrediction,
    pairPrediction
  } = data;

  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/90 rounded-2xl p-4 border border-amber-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            🧪 Experimental
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
          ${method === 'pair-wave' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' :
            method === 'trend-tiebreaker' ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' :
            'bg-slate-700/50 text-slate-400 border border-slate-600/50'}
        `}>
          {method}
        </span>
      </div>

      {/* Main Prediction Display */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="flex flex-col items-center">
          <div className="text-5xl font-bold text-amber-400">
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

      {/* Method Comparison */}
      {freqPrediction && pairPrediction && freqPrediction !== pairPrediction && (
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px]">
          <span className="text-slate-500">Freq: {freqPrediction}</span>
          <span className="text-slate-600">vs</span>
          <span className="text-purple-400">Pair: {pairPrediction}</span>
        </div>
      )}

      {/* Wave/Overdue Warning */}
      {(waveSignals?.isWaveWarning || (data.mostOverdue && data.lastSeen?.[data.mostOverdue] >= 5)) && (
        <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg px-3 py-2 mb-4 text-center">
          <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">
            ⚠️ Wave Flip Warning ({waveSignals?.waveFlipProbability || 0}%)
            {data.mostOverdue && data.lastSeen?.[data.mostOverdue] >= 5 && (
              <span className="ml-2 text-amber-300">
                | {data.mostOverdue} overdue ({data.lastSeen[data.mostOverdue]} rolls)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Wave Signals */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Run Len</div>
          <div className={`text-lg font-bold ${waveSignals?.lastCommonRunLength >= 4 ? 'text-orange-400' : 'text-slate-300'}`}>
            {waveSignals?.lastCommonRunLength || 0}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Noise Hits</div>
          <div className={`text-lg font-bold ${waveSignals?.noiseAppearanceCount >= 2 ? 'text-orange-400' : 'text-slate-300'}`}>
            {waveSignals?.noiseAppearanceCount || 0}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-slate-500 uppercase">Flip Prob</div>
          <div className={`text-lg font-bold ${waveSignals?.waveFlipProbability >= 50 ? 'text-red-400' : 'text-slate-300'}`}>
            {waveSignals?.waveFlipProbability || 0}%
          </div>
        </div>
      </div>

      {/* Trend Indicators */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Trends</div>
        <div className="flex justify-between gap-1">
          {VALUES.map(v => {
            const t = trends?.[v] || { direction: 'stable', current: 0 };
            const arrow = t.direction === 'rising' ? '↑' : t.direction === 'falling' ? '↓' : '→';
            const color = t.direction === 'rising' ? 'text-emerald-400' : 
                         t.direction === 'falling' ? 'text-red-400' : 'text-slate-400';
            return (
              <div key={v} className={`flex-1 text-center py-1 rounded-md bg-slate-800/50 ${v === prediction ? 'border border-amber-500/50' : ''}`}>
                <div className="text-sm font-bold text-slate-300">{v}</div>
                <div className={`text-lg font-bold ${color}`}>{arrow}</div>
                <div className="text-[10px] text-slate-500">{t.current}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pair Matrix (compact) */}
      {pairMatrix && lastRoll && (
        <div className="mb-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            After {lastRoll} → ?
          </div>
          <div className="flex gap-1">
            {VALUES.map(v => {
              const matrixData = pairMatrix[lastRoll]?.[v] || { pct: 0, samples: 0, reliable: false };
              const pct = typeof matrixData === 'object' ? matrixData.pct : matrixData;
              const samples = typeof matrixData === 'object' ? matrixData.samples : 0;
              const reliable = typeof matrixData === 'object' ? matrixData.reliable : false;
              
              // Get "last seen" data (how many rolls ago this value appeared)
              const rollsAgo = data.lastSeen?.[v] ?? -1;
              const isOverdue = data.overdueValues?.includes(v);
              
              // Find highest percentage
              const allPcts = VALUES.map(other => {
                const d = pairMatrix[lastRoll]?.[other];
                return typeof d === 'object' ? d.pct : (d || 0);
              });
              const isHighest = pct === Math.max(...allPcts) && pct > 0;
              
              // Show "↻N" (N rolls ago) instead of 0% when no samples
              const displayValue = pct > 0 
                ? `${pct}%` 
                : rollsAgo >= 0 
                  ? `↻${rollsAgo}` 
                  : 'N/A';
              
              // Get momentum score for this value
              const momentum = data.momentumScores?.[v] ?? 0;
              
              return (
                <div key={v} className={`flex-1 text-center py-2 rounded-md
                  ${isHighest ? 'bg-purple-500/30 border border-purple-500/50' : 
                    isOverdue ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-slate-800/50'}
                  ${!reliable && pct > 0 ? 'opacity-60' : ''}
                `}>
                  <div className="text-xs font-bold text-slate-300">{v}</div>
                  <div className={`text-sm font-bold ${
                    isHighest ? 'text-purple-300' : 
                    isOverdue ? 'text-orange-400' : 
                    pct === 0 ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {displayValue}
                  </div>
                  <div className={`text-xs font-semibold ${
                    momentum >= 1.0 ? 'text-amber-400' : 
                    momentum >= 0.5 ? 'text-yellow-500' :
                    momentum >= 0.2 ? 'text-cyan-400' : 'text-slate-500'
                  }`}>
                    ({momentum})
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commons vs Noise */}
      <div className="flex justify-between gap-2 text-[10px]">
        <div>
          <span className="text-slate-500 uppercase">Commons: </span>
          <span className="text-emerald-400 font-bold">{commons?.join(', ') || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 uppercase">Noise: </span>
          <span className="text-red-400 font-bold">{noise?.join(', ') || '—'}</span>
        </div>
      </div>
    </div>
  );
}
