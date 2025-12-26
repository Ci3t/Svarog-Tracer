import React from "react";

export default function CompactStatsHeader({
  kiyoAccuracy,
  waveAccuracy,
  combinedDataset,
  importedRolls,
  testRolls,
  live3Rolls,
  patchInfo,
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700 flex items-center justify-between">
      {/* Left: Accuracies */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Main:</span>
          <span className="font-bold text-cyan-300">
            {kiyoAccuracy.mainPct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Alt:</span>
          <span className="font-bold text-emerald-300">
            {kiyoAccuracy.altPct}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Wave:</span>
          <span className="font-bold text-blue-300">
            {waveAccuracy.combined.pct}%
          </span>
        </div>
      </div>

      {/* Center: Dataset Info */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div>
          <span className="font-semibold text-white">
            {combinedDataset.total}
          </span>{" "}
          samples
        </div>
        <div className="text-slate-500">|</div>
        <div>
          Patches:{" "}
          <span className="text-cyan-300">
            {Array.isArray(patchInfo) && patchInfo.length > 0
              ? patchInfo
                  .map((p) => `${p.region || "EU"} v${p.patch}`)
                  .join(" + ")
              : "N/A"}
          </span>
        </div>
      </div>

      {/* Right: Source Breakdown */}
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        {importedRolls.length > 0 && (
          <div>
            📁 <span className="text-blue-300">{importedRolls.length}</span>
          </div>
        )}
        {testRolls.length > 0 && (
          <div>
            ⚗️ <span className="text-purple-300">{testRolls.length}</span>
          </div>
        )}
        {live3Rolls.length > 0 && (
          <div>
            🔴 <span className="text-red-300">{live3Rolls.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
