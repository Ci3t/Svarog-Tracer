import React from "react";

export default function ImportStatsDisplay({
  importedRolls,
  showImportStats,
  testRolls,
  live3Rolls,
  onClearImported,
}) {
  if (importedRolls.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-4 border border-blue-500/40">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-blue-300 font-semibold flex items-center gap-2">
          <span>📁 Imported Rolls Dataset</span>
          {showImportStats && (
            <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full animate-pulse">
              Just imported!
            </span>
          )}
        </div>
        <button
          onClick={onClearImported}
          className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/30 transition"
        >
          Clear Imported
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-blue-950/40 rounded-lg p-2.5 border border-blue-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1">Imported</div>
          <div className="text-2xl font-black text-blue-300">
            {importedRolls.length}
          </div>
          <div className="text-[9px] text-slate-500">patterns</div>
        </div>

        <div className="bg-indigo-950/40 rounded-lg p-2.5 border border-indigo-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1">Test Rolls</div>
          <div className="text-2xl font-black text-indigo-300">
            {testRolls.length}
          </div>
          <div className="text-[9px] text-slate-500">manual</div>
        </div>

        <div className="bg-cyan-950/40 rounded-lg p-2.5 border border-cyan-500/20 text-center">
          <div className="text-[10px] text-slate-400 mb-1">Live Rolls</div>
          <div className="text-2xl font-black text-cyan-300">
            {live3Rolls.length}
          </div>
          <div className="text-[9px] text-slate-500">session</div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-blue-200 bg-blue-950/40 rounded p-2 border border-blue-500/20">
        <span className="font-semibold">💡 Tip:</span> Imported rolls are added
        to the training pool for better predictions. They appear first in
        chronological order.
      </div>
    </div>
  );
}
