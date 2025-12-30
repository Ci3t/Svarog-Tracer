// Long String Backtest Results Display Component
function LongStringBacktestResults({ results }) {
  if (!results || !results.results) {
    return <div className="text-xs text-slate-400">No results available.</div>;
  }

  const { summary, results: rollResults } = results;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
            <div className="text-green-400 font-bold text-xl">{summary.mainHits}</div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Main Hits</div>
            <div className="text-green-300 text-xs">{summary.mainAccuracy}%</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
            <div className="text-blue-400 font-bold text-xl">{summary.altHits}</div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Alt Hits</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <div className="text-red-400 font-bold text-xl">{summary.misses}</div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Misses</div>
          </div>
          <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-lg p-2 text-center">
            <div className="text-2xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {summary.combinedAccuracy}%
            </div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Combined</div>
            <div className="text-xs text-slate-500">({summary.mainHits + summary.altHits}/{summary.totalPredictions})</div>
          </div>
        </div>
      </div>

      {/* Roll-by-Roll Table */}
      <div className="border-t border-slate-700/50 pt-4">
        <div className="text-sm text-slate-200 font-semibold mb-3">
          📊 Roll-by-Roll Analysis
        </div>
        
        <div className="bg-slate-900/40 rounded-lg overflow-hidden border border-slate-700/30">
          {/* Table Header */}
          <div className="bg-slate-800/60 border-b border-slate-700/50">
            <div className="grid grid-cols-8 gap-2 px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="text-center">#</div>
              <div className="text-center">Pair</div>
              <div className="text-center">Actual</div>
              <div className="text-center">Predicted</div>
              <div className="text-center">Alt</div>
              <div className="text-center">Mode</div>
              <div className="text-center">Conf%</div>
              <div className="text-center">Result</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="max-h-96 overflow-y-auto">
            {rollResults.map((result, idx) => {
              const statusColor = result.hit 
                ? (result.mainHit ? 'bg-green-500/5' : 'bg-blue-500/5')
                : 'bg-red-500/5';
              const statusIcon = result.hit 
                ? (result.mainHit ? '✅' : '🔵')
                : '❌';
              
              return (
                <div 
                  key={idx}
                  className={`grid grid-cols-8 gap-2 px-3 py-2 text-xs border-b border-slate-700/20 hover:bg-slate-800/40 transition-colors ${statusColor}`}
                >
                  {/* Roll Number */}
                  <div className="text-center text-slate-400 font-mono">
                    {result.rollIndex + 1}
                  </div>
                  
                  {/* Original Pair */}
                  <div className="text-center font-mono text-purple-300">
                    {result.originalPair}
                  </div>
                  
                  {/* Actual */}
                  <div className="text-center font-mono text-cyan-300 font-bold">
                    {result.decodedRoll}
                  </div>
                  
                  {/* Prediction */}
                  <div className={`text-center font-mono font-bold ${
                    result.mainHit ? 'text-green-400' : 
                    result.altHit ? 'text-blue-400' : 
                    'text-red-400'
                  }`}>
                    {result.prediction}
                  </div>
                  
                  {/* Alt */}
                  <div className="text-center font-mono text-slate-500 text-[10px]">
                    {result.alt || '—'}
                  </div>
                  
                  {/* Mode */}
                  <div className="text-center text-slate-300 text-[10px] truncate">
                    {result.mode}
                  </div>
                  
                  {/* Confidence */}
                  <div className="text-center text-slate-400 font-mono text-[10px]">
                    {Math.round(result.confidence * 100)}%
                  </div>
                  
                  {/* Result Icon */}
                  <div className="text-center">
                    {statusIcon}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { LongStringBacktestResults };
