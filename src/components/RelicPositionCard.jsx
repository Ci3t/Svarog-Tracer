import React from "react";

export default function RelicPositionCard() {
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
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
        Default filter order
      </h3>

      <p className="text-[13px] text-slate-400 leading-relaxed">
        Reference list for how the game is sorting relic substats.
      </p>

      <div className="bg-slate-950/50 rounded-xl border border-slate-800/70 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Priority from top → bottom
          </span>
          <span className="text-[10px] text-slate-500">
            how relic substats are sorted
          </span>
        </div>

        <ol className="grid grid-cols-2 grid-rows-6 grid-flow-col  sm:grid-cols-2 gap-1.5 text-[14px]">
          {ORDER.map((label, idx) => (
            <li
              key={label}
              className="flex items-center justify-between bg-slate-900/60 rounded-lg px-2 py-1"
            >
              <span className="text-yellow-500 font-mono mr-2">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-violet-300 font-medium">
                {label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-[10px] text-slate-500">
        Tip: use this order when writing notes like{" "}
        <span className="text-violet-300">“keep if ≥ 2 top stats”</span> or when
        setting up your optimizer filters.
      </p>
    </div>
  );
}
