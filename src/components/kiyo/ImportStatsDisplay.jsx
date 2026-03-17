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
    <div className="kiyo-inner-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs theme-text-accent font-semibold flex items-center gap-2">
          <span>Imported Rolls Dataset</span>
          {showImportStats && (
            <span className="text-[10px] kiyo-accent-soft px-2 py-0.5 rounded-full animate-pulse">
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
        <div className="kiyo-inner-subcard p-2.5 text-center">
          <div className="text-[10px] theme-text-muted mb-1">Imported</div>
          <div className="text-2xl font-black theme-text-accent">{importedRolls.length}</div>
          <div className="text-[9px] theme-text-soft">patterns</div>
        </div>

        <div className="kiyo-inner-subcard p-2.5 text-center">
          <div className="text-[10px] theme-text-muted mb-1">Test Rolls</div>
          <div className="text-2xl font-black theme-text-accent">{testRolls.length}</div>
          <div className="text-[9px] theme-text-soft">manual</div>
        </div>

        <div className="kiyo-inner-subcard p-2.5 text-center">
          <div className="text-[10px] theme-text-muted mb-1">Live Rolls</div>
          <div className="text-2xl font-black theme-text-accent">{live3Rolls.length}</div>
          <div className="text-[9px] theme-text-soft">session</div>
        </div>
      </div>

      <div className="mt-3 text-[11px] theme-text-muted kiyo-inner-subcard rounded p-2">
        <span className="font-semibold">Tip:</span> Imported rolls are added to the
        training pool for better predictions. They appear first in chronological
        order.
      </div>
    </div>
  );
}
