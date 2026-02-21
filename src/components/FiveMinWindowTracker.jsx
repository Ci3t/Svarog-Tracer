import React from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatMMSS(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

function useWindowDerived(windowInfo, analyzeWavePatterns) {
  const totalWindowSeconds = 300;
  const secondsRemaining = Math.max(0, Math.floor(windowInfo?.secondsRemaining ?? 0));
  const secondsInto = Math.max(0, totalWindowSeconds - secondsRemaining);
  const progressPct = Math.min(100, (secondsInto / totalWindowSeconds) * 100);
  const warmupRemaining = Math.max(0, Math.floor(windowInfo?.warmupRemaining ?? 0));
  const rollsInWindow = Math.max(0, Math.floor(windowInfo?.rollsInWindow ?? 0));
  const isNearTransition = secondsRemaining <= 20;
  const isWarmup = warmupRemaining > 0;

  const c2Conf = analyzeWavePatterns?.columns?.[0]?.confidence ?? 0;
  const c3Conf = analyzeWavePatterns?.columns?.[1]?.confidence ?? 0;
  const c2Pct = Math.round(c2Conf * 100);
  const c3Pct = Math.round(c3Conf * 100);

  const quality = (() => {
    if (isWarmup) return "WARM-UP";
    if (c2Conf >= 0.5 && c3Conf >= 0.5) return "GOLDEN";
    if (c2Conf >= 0.5 || c3Conf >= 0.5) return "MIXED";
    return "CHAOTIC";
  })();

  const qualityColor =
    quality === "GOLDEN" ? "text-emerald-400"
    : quality === "MIXED" ? "text-yellow-400"
    : quality === "WARM-UP" ? "text-cyan-400"
    : "text-rose-400";

  const barColor = isNearTransition ? "bg-rose-400" : quality === "GOLDEN" ? "bg-emerald-400" : "bg-cyan-400";

  return { secondsRemaining, progressPct, rollsInWindow, warmupRemaining, isNearTransition, isWarmup, quality, qualityColor, barColor, c2Pct, c3Pct };
}

/**
 * Slim top progress bar — goes ABOVE all sticky cards.
 * Shows: [████░░░░░░] 04:12 • GOLDEN  (or flashing red if near transition)
 */
export function FiveMinProgressBar({ windowInfo, analyzeWavePatterns }) {
  if (!windowInfo) return null;
  const { secondsRemaining, progressPct, isNearTransition, quality, qualityColor, barColor } = useWindowDerived(windowInfo, analyzeWavePatterns);

  return (
    <div className="mb-2">
      {/* Bar row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className={`text-xs font-mono font-bold shrink-0 ${isNearTransition ? "text-rose-300 animate-pulse" : "text-slate-300"}`}>
          {formatMMSS(secondsRemaining)}
        </span>
        <span className={`text-[10px] font-semibold shrink-0 ${qualityColor}`}>
          {quality}
        </span>
        {isNearTransition && (
          <span className="text-[9px] text-rose-300 font-semibold animate-pulse">⚠ SHIFT SOON</span>
        )}
      </div>
    </div>
  );
}

/**
 * Mini stats line — goes UNDER the roll input.
 * e.g.: "Rolls: 5 • Warm-up: OK • C2: 35% C3: 35%"
 */
export function WindowStatsMini({ windowInfo, analyzeWavePatterns }) {
  if (!windowInfo) return null;
  const { rollsInWindow, warmupRemaining, isWarmup, quality, qualityColor, c2Pct, c3Pct } = useWindowDerived(windowInfo, analyzeWavePatterns);

  return (
    <div className="flex items-center gap-1.5 mt-1.5 px-1 flex-wrap">
      <span className="text-[9px] text-slate-500">Rolls: <span className="text-slate-300 font-semibold">{rollsInWindow}</span></span>
      <span className="text-[9px] text-slate-600">•</span>
      {isWarmup ? (
        <span className="text-[9px] text-yellow-400">Warm-up: {warmupRemaining} left</span>
      ) : (
        <span className="text-[9px] text-emerald-400">Warm-up: OK</span>
      )}
      <span className="text-[9px] text-slate-600">•</span>
      <span className={`text-[9px] font-semibold ${qualityColor}`}>
        {quality} (C2:{c2Pct}% C3:{c3Pct}%)
      </span>
    </div>
  );
}

/**
 * Original full-size component — kept for backward compat but no longer used in sticky.
 */
export default function FiveMinWindowTracker({ windowInfo, analyzeWavePatterns }) {
  if (!windowInfo) return null;
  const { secondsRemaining, progressPct, rollsInWindow, warmupRemaining, isNearTransition, isWarmup, quality, qualityColor, barColor, c2Pct, c3Pct } = useWindowDerived(windowInfo, analyzeWavePatterns);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/95 backdrop-blur-sm p-3 shadow-lg h-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-cyan-200">
          🕐 5-Minute Window
          <div className="text-xs font-normal text-slate-300">
            Rolls in window: <span className="font-semibold">{rollsInWindow}</span>
            {isWarmup ? (
              <> • Warm-up remaining: <span className="font-semibold text-yellow-200">{warmupRemaining}</span></>
            ) : (
              <> • Warm-up: <span className="font-semibold text-emerald-200">OK</span></>
            )}
            <div className="text-xs font-normal text-slate-300">
              Quality:{" "}
              <span className={`font-semibold ${qualityColor}`}>
                {quality} (C2: {c2Pct}%, C3: {c3Pct}%)
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-300">Next boundary in</div>
          <div className={"text-lg font-black " + (isNearTransition ? "text-rose-300" : "text-cyan-200")}>
            {formatMMSS(secondsRemaining)}
          </div>
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progressPct}%` }} />
      </div>
      {isNearTransition && <div className="mt-2 text-xs text-rose-200">⚠️ Window transition soon — patterns may shift.</div>}
      {isWarmup && <div className="mt-2 text-xs text-yellow-100">Warm-up: do {warmupRemaining} more roll(s) to stabilize.</div>}
    </div>
  );
}
