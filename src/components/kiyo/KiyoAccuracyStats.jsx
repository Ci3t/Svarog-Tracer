import React from "react";

export default function KiyoAccuracyStats({ kiyoAccuracy, waveAccuracy }) {
  if (kiyoAccuracy.total === 0)
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50">
        <div className="text-center text-slate-400 text-sm">
          ⏳ No predictions verified yet
          <div className="text-xs mt-2">
            Enter actual rolls to track accuracy
          </div>
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Existing Tracer/Full Roll Accuracy */}
      <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-xl p-3 border border-violet-500/30">
        <div className="text-xs font-semibold text-violet-300 mb-2">
          📊 Full Roll Accuracy (Tracer + Prefix)
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-emerald-950/40 rounded-lg p-2 border border-emerald-500/20 text-center">
            <div className="text-[10px] text-slate-400 mb-1">Main</div>
            <div className="text-xl font-black text-emerald-300">
              {kiyoAccuracy.mainPct}%
            </div>
            <div className="text-[9px] text-slate-500">
              {kiyoAccuracy.mainHits} hits
            </div>
          </div>
          <div className="bg-amber-950/40 rounded-lg p-2 border border-amber-500/20 text-center">
            <div className="text-[10px] text-slate-400 mb-1">Alt</div>
            <div className="text-xl font-black text-amber-300">
              {kiyoAccuracy.altPct}%
            </div>
            <div className="text-[9px] text-slate-500">
              {kiyoAccuracy.altHits} hits
            </div>
          </div>
          <div className="bg-rose-950/40 rounded-lg p-2 border border-rose-500/20 text-center">
            <div className="text-[10px] text-slate-400 mb-1">Miss</div>
            <div className="text-xl font-black text-rose-300">
              {kiyoAccuracy.total
                ? Math.round((kiyoAccuracy.misses / kiyoAccuracy.total) * 100)
                : 0}
              %
            </div>
            <div className="text-[9px] text-slate-500">
              {kiyoAccuracy.misses} misses
            </div>
          </div>
          <div className="bg-violet-950/40 rounded-lg p-2 border border-violet-500/20 text-center">
            <div className="text-[10px] text-slate-400 mb-1">Top-2</div>
            <div className="text-xl font-black text-violet-300">
              {kiyoAccuracy.top2Pct}%
            </div>
            <div className="text-[9px] text-slate-500">
              {kiyoAccuracy.mainHits + kiyoAccuracy.altHits} /{" "}
              {kiyoAccuracy.total}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 NEW: Wave Accuracy */}
      {waveAccuracy && waveAccuracy.combined.pct > 0 && (
        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-3 border border-cyan-500/30">
          <div className="text-xs font-semibold text-cyan-300 mb-2">
            🌊 Wave Column Accuracy
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-[10px] text-slate-400">Column 2</div>
              <div className="text-lg font-bold text-cyan-300">
                {waveAccuracy.col2.pct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {waveAccuracy.col2.hits}/{waveAccuracy.col2.total}
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-slate-400">Column 3</div>
              <div className="text-lg font-bold text-emerald-300">
                {waveAccuracy.col3.pct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {waveAccuracy.col3.hits}/{waveAccuracy.col3.total}
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-slate-400">Combined</div>
              <div className="text-lg font-bold text-sky-300">
                {waveAccuracy.combined.pct}%
              </div>
              <div className="text-[9px] text-slate-500">Wave avg</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
