// src/components/AccuracyPanel.jsx
import React, { useMemo } from "react";

export default function AccuracyPanel({ debugLogs }) {
  const accuracy = useMemo(() => {
    if (!debugLogs || debugLogs.length === 0) {
      return {
        total: 0,
        mainHits: 0,
        altHits: 0,
        misses: 0,
        mainPct: 0,
        altPct: 0,
        top2Pct: 0,
      };
    }

    let mainHits = 0;
    let altHits = 0;
    let misses = 0;

    debugLogs.forEach((log) => {
      const isMainHit =
        log.actual &&
        log.prediction &&
        String(log.actual) === String(log.prediction);

      const isAltHit =
        !isMainHit && log.alt && String(log.actual) === String(log.alt);

      if (isMainHit) mainHits++;
      else if (isAltHit) altHits++;
      else misses++;
    });

    const total = debugLogs.length;
    const mainPct = total > 0 ? Math.round((mainHits / total) * 100) : 0;
    const altPct = total > 0 ? Math.round((altHits / total) * 100) : 0;
    const top2Pct =
      total > 0 ? Math.round(((mainHits + altHits) / total) * 100) : 0;

    return { total, mainHits, altHits, misses, mainPct, altPct, top2Pct };
  }, [debugLogs]);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Session Accuracy
        </h3>
        <span className="text-xs text-slate-400">{accuracy.total} rolls</span>
      </div>

      {/* Top-2 Accuracy - MAIN DISPLAY */}
      <div className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 rounded-xl p-4 border border-violet-500/40 mb-4">
        <div className="text-xs text-violet-300 font-semibold uppercase tracking-wider mb-2">
          Top-2 Accuracy
        </div>
        <div className="flex items-end gap-3 mb-3">
          <div className="text-5xl font-black text-violet-300">
            {accuracy.top2Pct}%
          </div>
          <div className="text-sm text-slate-400 pb-1">
            {accuracy.mainHits + accuracy.altHits} / {accuracy.total} hits
          </div>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${accuracy.top2Pct}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-950/40 rounded-lg p-3 border border-emerald-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1 uppercase">Main</div>
          <div className="text-2xl font-bold text-emerald-400">
            {accuracy.mainPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {accuracy.mainHits} hits
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-lg p-3 border border-amber-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1 uppercase">Alt</div>
          <div className="text-2xl font-bold text-amber-400">
            {accuracy.altPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {accuracy.altHits} hits
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-lg p-3 border border-red-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1 uppercase">Miss</div>
          <div className="text-2xl font-bold text-red-400">
            {accuracy.total > 0
              ? Math.round((accuracy.misses / accuracy.total) * 100)
              : 0}
            %
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {accuracy.misses} miss
          </div>
        </div>
      </div>
    </div>
  );
}
