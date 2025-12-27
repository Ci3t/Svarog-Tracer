import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import svarog from '/svarog.png';

const PATCH_PRESETS = ["3.6", "3.7", "3.8", "3.9", "4.0", "custom"];

export default function Layout({ 
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  entries,
  prevSessions,
  onExportCSV,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                <img
                  src={svarog}
                  alt="svarog"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-semibold text-slate-100">
                  Svarog Tracer
                </h1>
                <p className="text-[12px] text-slate-500">
                  Relic RNG Observation Engine
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                🔴 Live Session
              </NavLink>
              <NavLink
                to="/long-string"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                🧪 Long String Lab
              </NavLink>
              <NavLink
                to="/kiyo"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`
                }
              >
                🌊 Kiyo Mode
              </NavLink>
            </nav>

            {/* Controls (Region, Patch, Export) */}
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              {/* Region */}
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

              {/* Patch */}
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

              {/* Export CSV */}
              <button
                onClick={onExportCSV}
                className="w-full xs:w-auto md:w-auto px-3 py-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 text-xs text-white font-semibold hover:from-violet-400 hover:to-purple-400 shadow-md shadow-violet-500/30 transition-all cursor-pointer"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-[1920px] mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
