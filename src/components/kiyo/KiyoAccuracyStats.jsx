import React from "react";

export default function KiyoAccuracyStats({ kiyoAccuracy }) {
  if (kiyoAccuracy.total === 0) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 rounded-xl p-4 border border-emerald-500/40">
      <div className="text-xs text-emerald-300 mb-3 font-semibold">
        📊 Kiyo Mode Accuracy (This Session)
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
  );
}
