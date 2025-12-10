import React from "react";

export default function AccuracyHeaderBar({
  kiyoAccuracy,
  waveAccuracy,
  combinedDataset,
  patchInfo = [],
  onResetWaveAccuracy,
  regionLabel = "EU",
}) {
  // ✅ Build dynamic patch label from patchInfo
  const patchLabel =
    patchInfo && patchInfo.length
      ? patchInfo.map((p) => p.patch).join(" + ")
      : "—";
  return (
    <div className="bg-slate-900/60 rounded-lg border border-slate-700/50 px-4 py-2">
      <div className="flex items-center justify-between text-xs">
        {/* Left: Accuracy Stats */}
        <div className="flex items-center gap-4">
          {/* Main (Prefix Main) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Main:</span>
            <span
              className={`font-bold ${
                kiyoAccuracy.mainPct >= 50
                  ? "text-emerald-400"
                  : kiyoAccuracy.mainPct >= 30
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {kiyoAccuracy.mainPct}%
            </span>
          </div>

          {/* Alt (Prefix Alt) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Alt:</span>
            <span
              className={`font-bold ${
                kiyoAccuracy.altPct >= 30
                  ? "text-emerald-400"
                  : kiyoAccuracy.altPct >= 15
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {kiyoAccuracy.altPct}%
            </span>
          </div>

          {/* Wave (Wave Flip Accuracy) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Wave:</span>
            <span
              className={`font-bold ${
                waveAccuracy.combined.pct >= 60
                  ? "text-emerald-400"
                  : waveAccuracy.combined.pct >= 40
                  ? "text-yellow-400"
                  : waveAccuracy.combined.pct > 0
                  ? "text-red-400"
                  : "text-slate-500"
              }`}
            >
              {waveAccuracy.combined.pct}%
            </span>
            {/* Reset button */}
            {onResetWaveAccuracy && waveAccuracy.combined.total > 0 && (
              <button
                onClick={onResetWaveAccuracy}
                className="ml-1 text-[10px] text-red-400 hover:text-red-300 opacity-50 hover:opacity-100 transition"
                title="Reset wave accuracy"
              >
                ↺
              </button>
            )}
          </div>
        </div>

        {/* Center: Sample Count */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold">
            {combinedDataset.total.toLocaleString()}
          </span>
          <span className="text-slate-400">samples</span>
        </div>

        {/* Right: Patches */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Patches:</span>
          {/* ✅ ✅ ✅ THIS IS THE FIXED DYNAMIC PATCH TEXT */}
          <span className="text-cyan-400">
            Patches: {regionLabel} v{patchLabel}
          </span>
        </div>
      </div>

      {/* Detailed breakdown tooltip on hover */}
      <div className="mt-1 pt-1 border-t border-slate-700/30 text-[10px] text-slate-500 flex items-center justify-between">
        <div>
          Main: {kiyoAccuracy.mainHits}/{kiyoAccuracy.total} hits • Alt:{" "}
          {kiyoAccuracy.altHits}/{kiyoAccuracy.total} hits • Wave:{" "}
          {waveAccuracy.col2.hits + waveAccuracy.col3.hits}/
          {waveAccuracy.col2.total + waveAccuracy.col3.total} flips
        </div>
        <div>
          {combinedDataset.liveCount > 0 && (
            <span>🟢 {combinedDataset.liveCount} live rolls</span>
          )}
        </div>
      </div>
    </div>
  );
}
