import React from 'react';

export default function RecommendationPanel({ recommendation, dataSource }) {
  if (!recommendation || !recommendation.valid) {
    return null;
  }

  const { primary, alternative, reasoning, swapRate } = recommendation;

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/40 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <h3 className="text-sm font-bold text-purple-200">SMART RECOMMENDATION</h3>
      </div>

      {/* Primary Recommendation */}
      <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">
            PRIMARY: {primary.type === 'wave' ? 'WAVE FLIP' : 'SMART PREFIX'}
          </span>
          <span className={`text-xs font-bold ${primary.color}`}>
            {primary.emoji} {primary.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-mono font-bold text-white">
            {primary.prediction}
          </span>
          {primary.alt && (
            <>
              <span className="text-slate-500">,</span>
              <span className="text-base font-mono text-slate-300">
                {primary.alt}
              </span>
            </>
          )}
        </div>
        
        <div className="text-xs text-slate-400">
          Confidence: {(primary.confidence * 100).toFixed(0)}%
        </div>
        
        <div className="text-xs text-cyan-300 mt-2">
          {reasoning}
        </div>
      </div>

      {/* Alternative Recommendation */}
      {alternative && (
        <div className="bg-slate-900/30 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              ALTERNATIVE: {alternative.type === 'wave' ? 'WAVE FLIP' : 'SMART PREFIX'}
            </span>
            <span className={`text-xs font-bold ${alternative.color}`}>
              {alternative.emoji} {alternative.label}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-mono font-bold text-slate-300">
              {alternative.prediction}
            </span>
            {alternative.alt && (
              <>
                <span className="text-slate-600">,</span>
                <span className="text-sm font-mono text-slate-400">
                  {alternative.alt}
                </span>
              </>
            )}
          </div>
          
          <div className="text-xs text-slate-500">
            Confidence: {(alternative.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}

      {/* Data Source Info */}
      <div className="border-t border-slate-700/50 pt-3">
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Data Source:</span>
            <span className="font-semibold text-slate-300">
              {dataSource === 'live' && '✓ Live Rolls (Priority 1)'}
              {dataSource === 'import' && '✓ Import Data (Priority 2)'}
              {dataSource === 'sheet' && '⚠️ Sheet Data (Fallback)'}
              {dataSource === 'unknown' && 'Mixed Sources'}
            </span>
          </div>
          {swapRate !== undefined && (
            <div className="flex items-center justify-between">
              <span>Swap Rate:</span>
              <span className="font-semibold text-slate-300">
                {(swapRate * 100).toFixed(0)}% 
                {swapRate < 0.4 && ' (Stable)'}
                {swapRate >= 0.4 && swapRate <= 0.7 && ' (Mixed)'}
                {swapRate > 0.7 && ' (Alternating)'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
