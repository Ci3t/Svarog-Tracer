import React from "react";

export default function RelicPositionCard() {
  return (
    <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 sm:p-5 space-y-3">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
        Relic substat order (reference)
      </h3>
      <p className="text-[11px] text-slate-400">
        Base stat on top, then 4 subs go from bottom → up in game UI.
      </p>
      <div className="bg-slate-950/40 rounded-lg p-3 text-[11px] space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-300">Main stat</span>
          <span className="text-violet-300 font-mono">ATK 352</span>
        </div>
        <ul className="space-y-1">
          <li className="flex justify-between">
            <span className="text-slate-500">1 (bottom)</span>
            <span className="text-slate-200">sub #1</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-500">2</span>
            <span className="text-slate-200">sub #2</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-500">3</span>
            <span className="text-slate-200">sub #3</span>
          </li>
          <li className="flex justify-between">
            <span className="text-slate-500">4 (top)</span>
            <span className="text-slate-200">sub #4</span>
          </li>
        </ul>
      </div>
      <p className="text-[10px] text-slate-500">
        Use this when you write notes about “3rd sub rolled” or “hit 2nd”.
      </p>
    </div>
  );
}
