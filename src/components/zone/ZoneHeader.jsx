import React from 'react';
import { Target, User, Activity, LayoutGrid, RefreshCw, History, Dna } from 'lucide-react';

/**
 * ZoneHeader
 * Compact header bar showing:
 *  - Logo + auth display name
 *  - Active Cycle pill (renamed from "Live Epoch")
 *  - Viewing Map pill
 *  - Epoch toggle buttons (Current Cycle / Previous)
 *
 * Flag Discrepancy card removed — reporting is handled per relic card.
 */
export default function ZoneHeader({
  authDisplayName,
  userId,
  currentEpoch,
  epoch,
  requestedEpoch,
  loadingMap,
  mapData,
  onSetRequestedEpoch,
  workspaceView,
  setWorkspaceView
}) {
  return (
    <section className="page-header relative overflow-hidden theme-glass-card p-5 border-indigo-500/20">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Dna className="w-32 h-32 text-indigo-400 rotate-12" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Target className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white leading-tight">
              Zone <span className="text-indigo-400">Tracker</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="w-3 h-3 text-slate-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Logged in: <span className="text-indigo-300/80">{authDisplayName || userId}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: Compact status pills */}
        <div className="flex items-center gap-3">
          {/* Active Cycle (was "Live Epoch") */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <Activity className="w-3.5 h-3.5 text-indigo-400/70" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">Active Cycle</p>
              <p className="text-sm font-black text-white leading-tight mt-0.5">
                #{currentEpoch?.id || '--'}
                <span className="text-[10px] font-bold text-slate-400 font-mono ml-1.5">
                  {currentEpoch?.calendar_week || ''}
                </span>
              </p>
            </div>
          </div>

          {/* Viewing Map */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-950/20 border border-indigo-500/10">
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400/70" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none">Viewing Map</p>
              <p className="text-sm font-black text-indigo-100 leading-tight mt-0.5">
                #{epoch?.id || '--'}
                <span className="text-[10px] font-bold text-indigo-400/60 font-mono ml-1.5 italic">
                  {requestedEpoch === 'previous' ? 'PREV' : 'LIVE'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Switcher (New Row) */}
        <div className="flex items-center gap-2 lg:ml-8">
           <button 
             onClick={() => setWorkspaceView('logger')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${workspaceView === 'logger' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500'}`}
           >
             Relic Log
           </button>
           <button 
             onClick={() => setWorkspaceView('zones')}
             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${workspaceView === 'zones' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100' : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500'}`}
           >
             Zones
           </button>
        </div>

        {/* Right: Epoch toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetRequestedEpoch('current')}
            disabled={loadingMap}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
              requestedEpoch === 'current'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100 shadow-lg shadow-indigo-500/20'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${loadingMap && requestedEpoch === 'current' ? 'animate-spin' : ''}`} />
            Current
          </button>
          <button
            type="button"
            onClick={() => onSetRequestedEpoch('previous')}
            disabled={loadingMap}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
              requestedEpoch === 'previous'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100 shadow-lg shadow-indigo-500/20'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <History className={`w-3 h-3 ${loadingMap && requestedEpoch === 'previous' ? 'animate-spin' : ''}`} />
            Previous
          </button>
        </div>
      </div>
    </section>
  );
}
