import React from "react";

export default function ModernRelicPositionCard() {
  const ORDER = [
    "Flat HP",
    "Flat ATK",
    "Flat DEF",
    "HP%",
    "ATK%",
    "DEF%",
    "SPD",
    "CRIT Rate",
    "CRIT DMG",
    "Effect Hit Rate",
    "Effect RES",
    "Break Effect",
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Default Filter Order
        </h3>
        <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        Reference list for how the game is sorting relic substats.
      </p>

      {/* Order List */}
      <div className="bg-slate-950/50 rounded-xl border border-slate-800/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Priority from top → bottom
          </span>
          <span className="text-[10px] text-slate-500">
            relic substat sorting
          </span>
        </div>

        <ol className="grid grid-cols-2 gap-2 text-sm">
          {ORDER.map((label, idx) => (
            <li
              key={label}
              className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2 hover:bg-slate-800/60 transition-colors duration-150"
            >
              <span className="text-amber-400 font-mono font-bold text-xs w-6">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent font-medium text-xs">
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Tip */}
      <div className="mt-4 text-[10px] text-slate-500 bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800/50">
        <span className="text-violet-400 font-semibold">💡 Tip:</span> Use this order when writing notes like{" "}
        <span className="text-violet-300 font-medium">"keep if ≥ 2 top stats"</span> or when
        setting up your optimizer filters.
      </div>
    </div>
  );
}
