import React from "react";

export default function CombinedDatasetStats({
  combinedDataset,
  trainingStats,
  importedRolls,
  testRolls,
  live3Rolls,
  patchInfo, // ✅ Add this prop
}) {
  // Get recent patches (last 2)
  const recentPatches = patchInfo?.slice(-2) || [];
  const totalRecentRolls = recentPatches.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-xl p-4 border border-emerald-500/40">
      <div className="text-xs text-emerald-300 mb-3 font-semibold flex items-center gap-2">
        <span>📚 Combined Dataset</span>
        <span className="text-[10px] text-slate-400 font-normal">
          (Training: {trainingStats.total} + Imported: {importedRolls.length} +
          Test: {testRolls.length} + Live: {live3Rolls.length})
        </span>
      </div>

      {/* ✅ NEW: Show active patches */}
      {recentPatches.length > 0 && (
        <div className="mb-3 p-2 bg-blue-950/30 rounded-lg border border-blue-500/30">
          <div className="text-[10px] text-blue-300 font-semibold mb-1">
            🎯 Active Training Patches
          </div>
          <div className="flex gap-2">
            {recentPatches.map((p) => (
              <div
                key={p.patch}
                className="flex items-center gap-1.5 text-[10px] bg-blue-900/40 px-2 py-1 rounded border border-blue-500/30"
              >
                <span className="text-blue-300 font-bold">v{p.patch}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">
                  {p.count.toLocaleString()} rolls
                </span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-slate-400 mt-1">
            Using last 2 patches • Total: {totalRecentRolls.toLocaleString()}{" "}
            training rolls
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
          <div className="text-[10px] text-slate-400 mb-1">Total Samples</div>
          <div className="text-2xl font-black text-emerald-300">
            {combinedDataset.total.toLocaleString()}
          </div>
          <div className="text-[9px] text-slate-500">
            {importedRolls.length > 0 && `+${importedRolls.length} imported`}
          </div>
        </div>
        <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
          <div className="text-[10px] text-slate-400 mb-1">Your Rolls</div>
          <div className="text-2xl font-black text-sky-300">
            {importedRolls.length + testRolls.length + live3Rolls.length}
          </div>
          <div className="text-[9px] text-slate-500">combined user data</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]">
        <div>
          <span className="text-slate-400">Most common:</span>{" "}
          <span className="text-emerald-300 font-mono font-bold">
            {combinedDataset.patterns[0].pattern}
          </span>
          <span className="text-slate-500">
            {" "}
            ({combinedDataset.patterns[0].pct}%)
          </span>
        </div>
        <div>
          <span className="text-slate-400">Least common:</span>{" "}
          <span className="text-emerald-300 font-mono font-bold">
            {
              combinedDataset.patterns[combinedDataset.patterns.length - 1]
                .pattern
            }
          </span>
          <span className="text-slate-500">
            {" "}
            ({combinedDataset.patterns[combinedDataset.patterns.length - 1].pct}
            %)
          </span>
        </div>
      </div>
    </div>
  );
}
