// Modern Circular Accuracy Gauge Component
import React from 'react';

export default function ModernAccuracyCard({ debugLogs }) {
  // Calculate accuracy from debug logs
  // Use ALL logs for session stats (cumulative), so numbers don't fluctuate/reduce when window shifts
  // FILTER to only 2-str logs to avoid double-counting (2-str, 3-str, 4-str all log for same roll)
  const recentLogs = debugLogs.filter(log => log.kind === '2');
  const accuracy = recentLogs.length > 0
    ? Math.round(
        (recentLogs.filter((log) => {
          const pred = String(log.prediction);
          const actual = String(log.actual);
          return pred === actual || pred === actual.slice(0, pred.length);
        }).length /
          recentLogs.length) *
          100
      )
    : 0;

  // Calculate stroke dash for circular gauge
  // Radius 60 + 4px stroke (half of 8) = 64px extent from center
  // Diameter = 128px total visual size, fits comfortably in 140px box
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  // Color based on accuracy
  const getColor = (acc) => {
    if (acc >= 80) return { from: '#10b981', to: '#34d399' }; // Green
    if (acc >= 60) return { from: '#f59e0b', to: '#fbbf24' }; // Yellow
    return { from: '#ef4444', to: '#f87171' }; // Red
  };

  const colors = getColor(accuracy);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 text-center">
        Session Accuracy
      </h3>

      {/* Circular Gauge - Smaller */}
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center" style={{ width: '140px', height: '140px' }}>
          {/* Background Circle */}
          <svg 
            className="transform -rotate-90" 
            width="140" 
            height="140" 
            viewBox="0 0 140 140"
            style={{ display: 'block' }}
          >
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-800"
            />
            {/* Progress Circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="url(#accuracyGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.from} />
                <stop offset="100%" stopColor={colors.to} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-white">
              {accuracy}%
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs text-slate-500 mt-2">
          Last {recentLogs.length} Rolls
        </p>

        {/* Stats - Main, Alt, Miss */}
        <div className="mt-4 w-full pt-4 border-t border-slate-700/50">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">
                {recentLogs.filter((log) => {
                  const pred = String(log.prediction || '');
                  const actual = String(log.actual || '');
                  return actual && pred && (pred === actual || pred === actual.slice(0, pred.length));
                }).length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                Main
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-cyan-400">
                {recentLogs.filter((log) => {
                  const pred = String(log.prediction || '');
                  const alt = String(log.alt || '');
                  const actual = String(log.actual || '');
                  
                  const hitMain = actual && pred && (pred === actual || pred === actual.slice(0, pred.length));
                  const hitAlt = actual && alt && (alt === actual || alt === actual.slice(0, alt.length));
                  
                  // Only count as Alt hit if Main didn't hit
                  return !hitMain && hitAlt;
                }).length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                Alt
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">
                {recentLogs.filter((log) => {
                  const pred = String(log.prediction || '');
                  const alt = String(log.alt || '');
                  const actual = String(log.actual || '');
                  
                  const hitMain = actual && pred && (pred === actual || pred === actual.slice(0, pred.length));
                  const hitAlt = actual && alt && (alt === actual || alt === actual.slice(0, alt.length));
                  
                  // Miss is when neither hit
                  return actual && !hitMain && !hitAlt;
                }).length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                Miss
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
