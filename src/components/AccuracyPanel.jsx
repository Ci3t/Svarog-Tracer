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
        rawTotal: 0,
      };
    }

    // ✅ ONLY count real 2-str predictions from TXT
    const validRows = debugLogs.filter(
      (l) => l.kind === "2" && l.prediction && l.prediction !== "—" && l.actual
    );

    let mainHits = 0;
    let altHits = 0;
    let misses = 0;

    validRows.forEach((row) => {
      const pred = String(row.prediction);
      const alt = row.alt ? String(row.alt) : null;
      const actual = String(row.actual);

      if (actual === pred) mainHits += 1;
      else if (alt && actual === alt) altHits += 1;
      else misses += 1;
    });

    const total = validRows.length;
    const mainPct = total ? Math.round((mainHits / total) * 100) : 0;
    const altPct = total ? Math.round((altHits / total) * 100) : 0;
    const top2Pct = total
      ? Math.round(((mainHits + altHits) / total) * 100)
      : 0;

    return {
      total,
      mainHits,
      altHits,
      misses,
      mainPct,
      altPct,
      top2Pct,
      rawTotal: debugLogs.length,
    };
  }, [debugLogs]);

  // 📊 Top modes by accuracy
  const topModes = useMemo(() => {
    if (!debugLogs?.length) return [];

    const modeStats = {};

    debugLogs.forEach((log) => {
      if (!log.mode || !log.actual || !log.prediction) return;

      const mode = log.mode;
      if (!modeStats[mode]) {
        modeStats[mode] = { hits: 0, total: 0 };
      }

      modeStats[mode].total += 1;

      const hit =
        String(log.actual) === String(log.prediction) ||
        (log.alt && String(log.actual) === String(log.alt));

      if (hit) modeStats[mode].hits += 1;
    });

    const rows = Object.entries(modeStats).map(([mode, s]) => ({
      mode,
      hits: s.hits,
      total: s.total,
      pct: s.total ? Math.round((s.hits / s.total) * 100) : 0,
    }));

    // Sort by hits (descending), then by percentage
    rows.sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return b.pct - a.pct;
    });

    // Return top 4 modes
    return rows.slice(0, 4);
  }, [debugLogs]);

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Session Accuracy
        </h3>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <span>{accuracy.total} valid</span>
          <span className="text-slate-500">
            ({accuracy.rawTotal} total logs)
          </span>
        </div>
      </div>

      {/* TOP-2 */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">
            TOP-2 ACCURACY (TXT TRUTH)
          </div>
          <div className="text-[10px] text-slate-400">
            {accuracy.mainHits + accuracy.altHits} / {accuracy.total} hits
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="text-4xl font-black text-fuchsia-400">
            {accuracy.top2Pct}%
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500"
            style={{ width: `${accuracy.top2Pct}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
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

        <div className="bg-slate-950/40 rounded-lg p-3 border border-rose-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1 uppercase">Miss</div>
          <div className="text-2xl font-bold text-rose-400">
            {accuracy.total
              ? Math.round((accuracy.misses / accuracy.total) * 100)
              : 0}
            %
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {accuracy.misses} misses
          </div>
        </div>
      </div>

      {/* Top Modes */}
      {topModes.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-700/30">
          <div className="text-[10px] font-semibold text-slate-400 uppercase">
            Top Modes by Hits
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topModes.map((mode, idx) => (
              <div
                key={mode.mode}
                className="bg-slate-950/60 rounded-lg p-2 border border-violet-500/30"
              >
                <div className="text-[10px] font-semibold text-violet-300 truncate">
                  {mode.mode}
                </div>
                <div className="text-lg font-bold text-slate-100 mt-1">
                  {mode.pct}%
                </div>
                <div className="text-[9px] text-slate-400">
                  {mode.hits}/{mode.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
