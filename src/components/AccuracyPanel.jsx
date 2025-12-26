import React, { useMemo } from "react";
import { getModeBreakdown } from "../utils/predictNext.js";

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

    let total = 0;
    let mainHits = 0;
    let altHits = 0;
    let misses = 0;
    const rawTotal = debugLogs.length;

    debugLogs.forEach((log) => {
      if (!log || !log.actual || log.prediction == null) return;

      // 🔥 FIXED: Only count 2-str predictions for Session Accuracy
      if (log.kind !== "2") return;

      // 🔥 REMOVED: No longer skip Kiyo Mode logs - BBP predictions come through here
      // if (log.source === "kiyo") return;

      const actualStr = String(log.actual);
      const predStr = String(log.prediction);
      const altStr =
        log.alt !== undefined && log.alt !== null ? String(log.alt) : null;

      // skip non-real predictions
      if (
        !predStr ||
        predStr === "—" ||
        predStr.toLowerCase().startsWith("insufficient")
      ) {
        return;
      }

      total += 1;

      if (actualStr === predStr) {
        mainHits += 1;
      } else if (altStr && actualStr === altStr) {
        altHits += 1;
      } else {
        misses += 1;
      }
    });

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
      rawTotal,
    };
  }, [debugLogs]);

  const liveModeBreakdown = useMemo(() => {
    if (!debugLogs?.length) return null;

    // Take only 2-str logs from live input (ignore longString, backtest, etc.)
    const seq = debugLogs
      .filter(
        (log) =>
          log.kind === "2" &&
          log.actual &&
          (!log.source || log.source === "live")
      )
      .sort((a, b) => a.ts - b.ts) // oldest -> newest
      .map((log) => String(log.actual).slice(0, 2))
      .filter((v) => v.length === 2);

    if (seq.length < 6) return null; // not enough history to say anything

    return getModeBreakdown(seq);
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

        <div className="mt-1 text-[10px] text-slate-400">
          {accuracy.mainHits + accuracy.altHits} hits out of {accuracy.total}{" "}
          predictions
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

    </div>
  );
}
