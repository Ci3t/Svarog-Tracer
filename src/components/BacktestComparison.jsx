// Enhanced Backtest Comparison Component
// This shows a detailed comparison between original predictions and current predictor results

import React from 'react';

export default function BacktestComparison({ sessionStats }) {
  if (!sessionStats || !sessionStats.detailRows || sessionStats.detailRows.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-700/50 pt-4">
      <div className="text-sm text-slate-200 font-semibold mb-3 flex items-center gap-2">
        📊 Roll-by-Roll Comparison
        <span className="text-xs text-slate-500 font-normal">
          (Original vs Current Predictor)
        </span>
      </div>
      
      <div className="bg-slate-900/40 rounded-lg p-3 max-h-96 overflow-y-auto">
        <div className="space-y-2">
          {sessionStats.detailRows.slice(0, 50).map((row, idx) => {
            if (row.skip) return null;
            
            const originalPred = row.log?.prediction || '—';
            const originalAlt = row.log?.alt || null;
            const currentPred = row.pred || '—';
            const currentAlt = row.alt || null;
            const actual = row.actual || '—';
            
            // Check if original was correct
            const originalCorrect = originalPred === actual || (originalAlt && originalAlt === actual);
            // Check if current is correct
            const currentCorrect = row.hitMain || row.hitAlt;
            
            // Determine improvement status
            let status = 'same';
            let statusColor = 'text-slate-400';
            let statusIcon = '—';
            
            if (!originalCorrect && currentCorrect) {
              status = 'improved';
              statusColor = 'text-green-400';
              statusIcon = '📈';
            } else if (originalCorrect && !currentCorrect) {
              status = 'regressed';
              statusColor = 'text-red-400';
              statusIcon = '📉';
            } else if (originalCorrect && currentCorrect) {
              status = 'both-correct';
              statusColor = 'text-emerald-400';
              statusIcon = '✅';
            } else {
              status = 'both-wrong';
              statusColor = 'text-slate-500';
              statusIcon = '❌';
            }
            
            return (
              <div 
                key={idx}
                className="grid grid-cols-5 gap-2 text-xs bg-slate-800/40 rounded p-2 border border-slate-700/30"
              >
                <div className="text-slate-400">
                  <div className="font-semibold text-slate-300">Roll #{idx + 1}</div>
                  <div className="text-[10px] mt-0.5">Actual: <span className="text-cyan-300 font-mono">{actual}</span></div>
                </div>
                
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">Original</div>
                  <div className={`font-mono ${originalCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {originalPred}
                  </div>
                  {originalAlt && (
                    <div className="text-[10px] text-slate-500">Alt: {originalAlt}</div>
                  )}
                </div>
                
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">Current</div>
                  <div className={`font-mono ${currentCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {currentPred}
                  </div>
                  {currentAlt && (
                    <div className="text-[10px] text-slate-500">Alt: {currentAlt}</div>
                  )}
                </div>
                
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">Mode</div>
                  <div className="text-slate-300 text-[10px]">{row.mode || '—'}</div>
                  <div className="text-slate-500 text-[10px]">{row.conf}%</div>
                </div>
                
                <div className="text-center">
                  <div className={`text-lg ${statusColor}`}>{statusIcon}</div>
                  <div className={`text-[10px] ${statusColor}`}>
                    {status === 'improved' && 'Better'}
                    {status === 'regressed' && 'Worse'}
                    {status === 'both-correct' && 'Both ✓'}
                    {status === 'both-wrong' && 'Both ✗'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {sessionStats.detailRows.length > 50 && (
          <div className="text-xs text-slate-500 text-center mt-3">
            Showing first 50 of {sessionStats.detailRows.length} rolls
          </div>
        )}
      </div>
    </div>
  );
}
