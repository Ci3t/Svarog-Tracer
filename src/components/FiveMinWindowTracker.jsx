import React from "react";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatMMSS(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

export default function FiveMinWindowTracker({
  windowInfo,
  analyzeWavePatterns,
}) {
  if (!windowInfo) return null;

  const totalWindowSeconds = 300;

  const secondsRemaining = Math.max(
    0,
    Math.floor(windowInfo.secondsRemaining ?? 0)
  );
  const secondsInto = Math.max(0, totalWindowSeconds - secondsRemaining);
  const progressPct = Math.max(
    0,
    Math.min(100, (secondsInto / totalWindowSeconds) * 100)
  );

  const warmupRemaining = Math.max(
    0,
    Math.floor(windowInfo.warmupRemaining ?? 0)
  );
  const rollsInWindow = Math.max(0, Math.floor(windowInfo.rollsInWindow ?? 0));

  const isNearTransition = secondsRemaining <= 20;
  const isWarmup = warmupRemaining > 0;

  // IMPORTANT: analyzeWavePatterns confidence is 0..1, not 0..100
  const c2Conf = analyzeWavePatterns?.columns?.[0]?.confidence ?? 0;
  const c3Conf = analyzeWavePatterns?.columns?.[1]?.confidence ?? 0;

  const c2Pct = Math.round(c2Conf * 100);
  const c3Pct = Math.round(c3Conf * 100);

  const quality = (() => {
    if (isWarmup) return "WARM-UP";

    // Heuristic (tune later if you want):
    // GOLDEN: both strong
    if (c2Conf >= 0.5 && c3Conf >= 0.5) return "GOLDEN";
    // MIXED: one strong
    if (c2Conf >= 0.5 || c3Conf >= 0.5) return "MIXED";
    // MIXED: one decent (avoid calling everything chaotic)
    if (c2Conf >= 0.65 || c3Conf >= 0.65) return "MIXED";

    return "CHAOTIC";
  })();

  const qualityColor =
    quality === "GOLDEN"
      ? "text-emerald-200"
      : quality === "MIXED"
      ? "text-yellow-200"
      : quality === "WARM-UP"
      ? "text-cyan-200"
      : "text-rose-200";

  return (
    <div className="sticky top-4 z-10 mb-3 rounded-2xl border border-cyan-500/30 bg-slate-950/95 backdrop-blur-sm p-3 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-cyan-200">
          🕐 5-Minute Window
          <div className="text-xs font-normal text-slate-300">
            Rolls in window:{" "}
            <span className="font-semibold">{rollsInWindow}</span>
            {isWarmup ? (
              <>
                {" "}
                • Warm-up remaining:{" "}
                <span className="font-semibold text-yellow-200">
                  {warmupRemaining}
                </span>
              </>
            ) : (
              <>
                {" "}
                • Warm-up:{" "}
                <span className="font-semibold text-emerald-200">OK</span>
              </>
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
          <div
            className={
              "text-lg font-black " +
              (isNearTransition ? "text-rose-300" : "text-cyan-200")
            }
          >
            {formatMMSS(secondsRemaining)}
          </div>
        </div>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={
            "h-full rounded-full " +
            (isNearTransition ? "bg-rose-400/80" : "bg-cyan-400/70")
          }
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {isNearTransition && (
        <div className="mt-2 text-xs text-rose-200">
          ⚠️ Window transition soon — patterns may shift.
        </div>
      )}

      {isWarmup && (
        <div className="mt-2 text-xs text-yellow-100">
          Warm-up: do {warmupRemaining} more roll(s) inside this window to
          stabilize the model (recommended 5 if no clear pattern).
        </div>
      )}
    </div>
  );
}
