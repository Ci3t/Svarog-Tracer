// Kiyo Backtest Results Display Component
function KiyoBacktestResults({ results }) {
  if (!results || !results.results) {
    return <div className="text-xs text-slate-400 p-4">No results available.</div>;
  }

  const { summary, results: rollResults } = results;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
        <div className="grid grid-cols-6 gap-2">
          {/* Wave Stats */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex flex-col items-center">
            <div className="text-[9px] uppercase tracking-wider text-blue-400 font-semibold mb-1">C2 Wave</div>
            <div className="text-lg font-bold text-slate-100">{summary.col2.accuracy}%</div>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 flex flex-col items-center">
            <div className="text-[9px] uppercase tracking-wider text-purple-400 font-semibold mb-1">C3 Wave</div>
            <div className="text-lg font-bold text-slate-100">{summary.col3.accuracy}%</div>
          </div>

          {/* 2str Stats */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex flex-col items-center">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">2str Main</div>
            <div className="text-lg font-bold text-slate-100">{summary.p2m?.accuracy || 0}%</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex flex-col items-center opacity-70">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-semibold mb-1">2str Alt</div>
            <div className="text-lg font-bold text-slate-100">{summary.p2a?.accuracy || 0}%</div>
          </div>

          {/* 3str Stats */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex flex-col items-center">
            <div className="text-[9px] uppercase tracking-wider text-amber-400 font-semibold mb-1">3str Main</div>
            <div className="text-lg font-bold text-slate-100">{summary.p3m?.accuracy || 0}%</div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex flex-col items-center opacity-70">
            <div className="text-[9px] uppercase tracking-wider text-amber-400/80 font-semibold mb-1">3str Alt</div>
            <div className="text-lg font-bold text-slate-100">{summary.p3a?.accuracy || 0}%</div>
          </div>
        </div>
      </div>

      {/* Roll-by-Roll Table */}
      <div className="border-t border-slate-700/50 pt-4">
        <div className="text-sm text-slate-200 font-semibold mb-3">
          📊 Comprehensive Roll Analysis
        </div>
        
        <div className="bg-slate-900/40 rounded-lg overflow-hidden border border-slate-700/30">
          {/* Table Header */}
          <div className="bg-slate-800/60 border-b border-slate-700/50">
            <div className="grid grid-cols-11 gap-1 px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              <div className="text-center">#</div>
              <div className="text-center">Time</div>
              <div className="text-center">Roll</div>
              <div className="text-center">Wave C2</div>
              <div className="text-center">C2 Sug</div>
              <div className="text-center">Wave C3</div>
              <div className="text-center">C3 Sug</div>
              <div className="text-center">2str-M</div>
              <div className="text-center">2str-A</div>
              <div className="text-center">3str-M</div>
              <div className="text-center">3str-A</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="max-h-[500px] overflow-y-auto">
            {rollResults.map((result, idx) => {
              const rowBg = idx % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent';
              
              return (
                <div 
                  key={idx}
                  className={`grid grid-cols-11 gap-1 px-3 py-2 text-[11px] border-b border-slate-700/10 hover:bg-slate-700/20 transition-colors ${rowBg}`}
                >
                  {/* # */}
                  <div className="text-center text-slate-500 font-mono">{result.rollNum}</div>
                  
                  {/* Time */}
                  <div className="text-center text-slate-500 text-[9px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {result.time}
                  </div>
                  
                  {/* Actual */}
                  <div className="text-center font-mono text-cyan-400 font-bold">{result.actual}</div>
                  
                  {/* Wave C2 */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-mono text-blue-300">
                      {result.waveC2 ? `[${result.waveC2.join('')}]` : '—'}
                    </span>
                    {result.c2Hit && <span className="text-green-500 text-[9px]">✓</span>}
                  </div>
                  
                  {/* C2 Suggest */}
                  <div className={`text-center truncate ${result.c2Hit ? 'text-green-400/80' : 'text-slate-400'}`}>
                    {result.c2Suggest || '—'}
                  </div>
                  
                  {/* Wave C3 */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-mono text-purple-300">
                      {result.waveC3 ? `[${result.waveC3.join('')}]` : '—'}
                    </span>
                    {result.c3Hit && <span className="text-green-500 text-[9px]">✓</span>}
                  </div>
                  
                  {/* C3 Suggest */}
                  <div className={`text-center truncate ${result.c3Hit ? 'text-green-400/80' : 'text-slate-400'}`}>
                    {result.c3Suggest || '—'}
                  </div>
                  
                  {/* 2str Main */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-0.5">
                      <span className={`font-mono text-[10px] ${result.h2m ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                        {result.p2m || '—'}
                      </span>
                      {result.h2m && <span className="text-emerald-500 text-[8px]">✓</span>}
                    </div>
                  </div>

                  {/* 2str Alt */}
                  <div className="flex flex-col items-center justify-center opacity-60">
                    <div className="flex items-center gap-0.5">
                      <span className={`font-mono text-[10px] ${result.h2a ? 'text-emerald-300 font-bold' : 'text-slate-600'}`}>
                        {result.p2a || '—'}
                      </span>
                      {result.h2a && <span className="text-emerald-500 text-[8px]">✓</span>}
                    </div>
                  </div>
                  
                  {/* 3str Main */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-0.5">
                      <span className={`font-mono text-[10px] ${result.h3m ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                        {result.p3m || '—'}
                      </span>
                      {result.h3m && <span className="text-amber-500 text-[8px]">✓</span>}
                    </div>
                  </div>

                  {/* 3str Alt */}
                  <div className="flex flex-col items-center justify-center opacity-60">
                    <div className="flex items-center gap-0.5">
                      <span className={`font-mono text-[10px] ${result.h3a ? 'text-amber-300 font-bold' : 'text-slate-600'}`}>
                        {result.p3a || '—'}
                      </span>
                      {result.h3a && <span className="text-amber-500 text-[8px]">✓</span>}
                    </div>
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

export { KiyoBacktestResults };
