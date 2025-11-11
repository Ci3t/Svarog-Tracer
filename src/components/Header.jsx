// src/components/TopBar.jsx
import React from "react";

const PATCH_PRESETS = ["3.7", "3.8", "3.9", "4.0", "custom"];

export default function TopBar({
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
}) {
  return (
    <header className="w-full flex items-center justify-between gap-4 py-4 px-6 bg-slate-900/30 border-b border-slate-800/40 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold tracking-tight">
            HSR
          </span>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-100">
            HSR RNG Tracker
          </h1>
          <p className="text-[10px] text-slate-500">
            Unity 5m pattern recorder
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* region */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/40 rounded-lg px-3 py-2">
          <span className="text-[11px] text-slate-400">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-transparent text-sm text-slate-100 outline-none border-none cursor-pointer"
          >
            <option className="bg-slate-900">America</option>
            <option className="bg-slate-900">EU</option>
            <option className="bg-slate-900">ASIA</option>
          </select>
        </div>

        {/* patch */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/40 rounded-lg px-3 py-2">
          <span className="text-[11px] text-slate-400">Patch</span>
          <select
            value={isCustomPatch ? "custom" : patch}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") {
                setIsCustomPatch(true);
              } else {
                setIsCustomPatch(false);
                setPatch(v);
              }
            }}
            className="bg-transparent text-sm text-slate-100 outline-none border-none cursor-pointer"
          >
            {PATCH_PRESETS.map((p) => (
              <option key={p} className="bg-slate-900" value={p}>
                {p}
              </option>
            ))}
          </select>
          {isCustomPatch && (
            <input
              value={patch}
              onChange={(e) => setPatch(e.target.value)}
              className="w-16 bg-slate-950/40 border border-slate-700/50 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none"
              placeholder="3.7"
            />
          )}
        </div>
      </div>
    </header>
  );
}
