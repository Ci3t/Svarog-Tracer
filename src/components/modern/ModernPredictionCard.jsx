// Modern Circular Prediction Component
import React from 'react';

export default function ModernPredictionCard({ prediction }) {
  if (!prediction || !prediction.prediction) {
    return (
      <div className="astral-next-prediction bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 text-center">
          Next Prediction
        </h3>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Need at least 6 rolls</p>
        </div>
      </div>
    );
  }

  const { prediction: pred, confidence, distribution, commons, pattern, waveFlipData, markData } = prediction;
  
  // Safely convert all values to renderable primitives
  const predStr = String(pred || '—');
  const confidencePercent = Math.round((confidence || 0) * 100);
  
  // Calculate stroke dash for circular progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidencePercent / 100) * circumference;

  // Get alternatives (top 2 after main prediction) - handle distribution structure
  const alternatives = distribution && typeof distribution === 'object'
    ? Object.entries(distribution)
        .map(([val, data]) => {
          // Handle both {pct: number} and direct number formats
          // pct is already a percentage (0-100), not a decimal (0-1)
          const percent = typeof data === 'object' && data !== null 
            ? Math.round(data.pct || 0)
            : Math.round(data || 0);
          return { 
            value: String(val), 
            percent 
          };
        })
        .filter(item => item.value !== predStr && !isNaN(item.percent))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 2)
    : [];

  // Safely get pattern string
  const patternStr = typeof pattern === 'string' 
    ? pattern 
    : (pattern?.pattern || pattern?.name || '');

  // Safely get commons as strings
  const commonsArray = Array.isArray(commons)
    ? commons.map(c => {
        if (typeof c === 'string') return c;
        if (typeof c === 'number') return String(c);
        if (c && typeof c === 'object') {
          return c.pattern || c.value || c.name || String(c);
        }
        return String(c);
      }).filter(Boolean)
    : [];

  return (
    <div className="astral-next-prediction bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Next Prediction
        </h3>
        {patternStr && (
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
            {patternStr}
          </span>
        )}
      </div>

      {/* Circular Progress */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative w-64 h-64">
          {/* Background Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-slate-800"
            />
            {/* Progress Circle */}
            <circle
              cx="128"
              cy="128"
              r={radius}
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="astral-primary-display text-7xl font-bold text-white mb-2">
              {predStr}
            </div>
            <div className="astral-primary-accent text-2xl font-semibold text-purple-400">
              {confidencePercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="flex items-center justify-center gap-4">
          {alternatives.map((alt, idx) => (
            <div
              key={idx}
              className="px-6 py-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
            >
              <span className="text-2xl font-bold text-slate-300 mr-2">
                {alt.value}
              </span>
              <span className="text-sm text-slate-500">
                ({alt.percent}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Commons Display */}
      {commonsArray.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Commons
            </div>
            
            {/* Compact Flip/Wave indicator on same line */}
            {(() => {
              // Only show when there's a guaranteed wave flip (waveFlipData.warning = true)
              const hasWaveFlip = waveFlipData?.warning === true;
              if (!hasWaveFlip) return null;
              
              let nextCommons = null;
              let rollsUntil = null;

              if (waveFlipData?.predictedNewCommons) {
                nextCommons = waveFlipData.predictedNewCommons;
                rollsUntil = waveFlipData.rollsUntil;
              } else if (markData?.signals) {
                const waveSignal = markData.signals.find(s => s.includes('WAVE FLIP') || s.includes('Next commons likely'));
                if (waveSignal) {
                  const match = waveSignal.match(/Next commons likely:\s*([0-9,\s]+)/);
                  if (match) {
                    nextCommons = match[1].split(',').map(s => s.trim());
                  }
                  // Extract rolls until from signal like "2 flips!"
                  const rollsMatch = waveSignal.match(/(\d+)\s+flips?/);
                  if (rollsMatch) {
                    rollsUntil = rollsMatch[1];
                  }
                }
              }
              
              if (!nextCommons || nextCommons.length === 0) return null;
              
              return (
                <div className="flex flex-col items-end">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    Flip/Wave
                  </div>
                  {rollsUntil && (
                    <div className="text-[10px] text-purple-200">
                      Next {rollsUntil} rolls
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {commonsArray.map((c, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium border border-emerald-500/30"
                >
                  {c}
                </span>
              ))}
            </div>

            {/* Flip/Wave values on same line */}
            {(() => {
              // Only show when there's a guaranteed wave flip
              const hasWaveFlip = waveFlipData?.warning === true;
              if (!hasWaveFlip) return null;
              
              let nextCommons = null;
              if (waveFlipData?.predictedNewCommons) {
                nextCommons = waveFlipData.predictedNewCommons;
              } else if (markData?.signals) {
                const waveSignal = markData.signals.find(s => s.includes('WAVE FLIP') || s.includes('Next commons likely'));
                if (waveSignal) {
                  const match = waveSignal.match(/Next commons likely:\s*([0-9,\s]+)/);
                  if (match) {
                    nextCommons = match[1].split(',').map(s => s.trim());
                  }
                }
              }
              
              if (!nextCommons || nextCommons.length === 0) return null;
              
              return (
                <div className="flex gap-2">
                  {nextCommons.map((val, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-bold border border-amber-500/30"
                    >
                      {val}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
