import React from "react";

export default function CombinedDatasetStats({
  combinedDataset,
  trainingStats,
  importedRolls,
  testRolls,
  live3Rolls,
}) {
  return (
    <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-xl p-4 border border-emerald-500/40">
      <div className="text-xs text-emerald-300 mb-3 font-semibold flex items-center gap-2">
        <span>📚 Combined Dataset</span>
        <span className="text-[10px] text-slate-400 font-normal">
          (Training: {trainingStats.total} + Imported: {importedRolls.length} +
          Test: {testRolls.length} + Live: {live3Rolls.length})
        </span>
      </div>
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
