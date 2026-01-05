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
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Top Row: Logo + Controls (Mobile) / Left Side (Desktop) */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={svarog}
                    alt="svarog"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-tight leading-none">
                    Svarog Tracer
                  </h1>
                  <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5">
                    Relic RNG Observation Engine
                  </p>
                </div>
              </div>

              {/* Region & Patch (Compact on Mobile) */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg px-2 py-1.5">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="bg-transparent text-[10px] sm:text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1"
                  >
                    <option className="bg-slate-900">America</option>
                    <option className="bg-slate-900">EU</option>
                    <option className="bg-slate-900">ASIA</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg px-2 py-1.5">
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
                    className="bg-transparent text-[10px] sm:text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1"
                  >
                    {PATCH_PRESETS.map((p) => (
                      <option key={p} className="bg-slate-900" value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Middle/Bottom Row: Navigation + Export Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              {/* Navigation Tabs - Full Width on Mobile */}
              <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-800/40 rounded-xl border border-slate-700/30 w-full sm:w-auto overflow-x-auto scrollbar-hide">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all text-center ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`
                  }
                >
                  🔴 Live
                </NavLink>
                <NavLink
                  to="/long-string"
                  className={({ isActive }) =>
                    `flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all text-center ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`
                  }
                >
                  🧪 Lab
                </NavLink>
                <NavLink
                  to="/kiyo"
                  className={({ isActive }) =>
                    `flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all text-center ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`
                  }
                >
                  🌊 Kiyo
                </NavLink>
                <NavLink
                  to="/warp-analyzer"
                  className={({ isActive }) =>
                    `flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all text-center ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`
                  }
                >
                  📊 Warp
                </NavLink>
              </nav>

              {/* Export Button */}
              <button
                onClick={onExportCSV}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-center"
              >
                EXPORT CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-[1920px] mx-auto p-4 flex-grow">
        <Outlet />
      </main>

      {/* GLOBAL FOOTER */}
      <footer className="mt-auto border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md py-8 px-4">
        <div className="max-w-[1920px] mx-auto flex flex-col items-center gap-6">
          
          {/* Brand & Version */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
              Svarog Tracer <span className="text-slate-600">•</span> Relic RNG Observation Engine
              <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono border border-purple-500/20">
                Ver 3.8.4
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">© 2025 Ciet</p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-medium text-slate-400">
            <a 
              href="https://twitch.tv/iciet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-purple-400 transition-colors group"
            >
              <span className="text-purple-500/50 group-hover:text-purple-400">Twitch:</span> twitch.tv/iciet
            </a>
            <a 
              href="https://discord.gg/AtGzKP7qnZ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-indigo-400 transition-colors group"
            >
              <span className="text-indigo-500/50 group-hover:text-indigo-400">Discord:</span> My Personal Discord
            </a>
            <a 
              href="https://discord.gg/YqAeBjpbE4" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
            >
              <span className="text-blue-500/50 group-hover:text-blue-400">Contact:</span> @Ciet in The Genius Society
            </a>
          </div>

          {/* Safety Disclaimer */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 max-w-3xl text-center">
            <p className="text-[10px] sm:text-xs text-amber-200/70 leading-relaxed uppercase tracking-tight">
              <span className="text-amber-400">⚠️ Svarog Tracer</span> is an independent observation and analysis tool. It does not modify, interact with, or access any game files or data — it is entirely safe and non-intrusive.
            </p>
          </div>

          {/* Special Attribution (StarRailStation for Warp Data) */}
          <div className="pt-4 border-t border-slate-800/30 w-full text-center">
             <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">
                Pattern Analysis Engine Powered by Svarog • May your pulls be lucky and your pities be short. ✦
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
