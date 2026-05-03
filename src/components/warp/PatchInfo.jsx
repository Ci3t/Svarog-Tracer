import React, { useState, useEffect } from 'react';
import { useGameTheme } from './GameTheme';
import { buildApiUrl } from '../../utils/apiBase';

const FALLBACK_PATCH_INFO = {
  hsr: { patch: '3.7', phase: 1, phaseDaysLeft: 0, daysLeft: 0, totalDays: 42, progressPercent: 0 },
  genshin: { patch: '6.2', phase: 1, phaseDaysLeft: 0, daysLeft: 0, totalDays: 42, progressPercent: 0 },
  wuwa: { patch: '2.8', phase: 1, phaseDaysLeft: 0, daysLeft: 0, totalDays: 42, progressPercent: 0 },
  zzz: { patch: '2.4', phase: 1, phaseDaysLeft: 0, daysLeft: 0, totalDays: 42, progressPercent: 0 },
};

function getFallbackPatchInfo(game) {
  return FALLBACK_PATCH_INFO[game] || FALLBACK_PATCH_INFO.hsr;
}

/**
 * Patch Info Bar
 * Shows current patch, phase, and days remaining for the selected game.
 * Fetches from server API which handles auto-advance logic and Turso storage.
 */
export default function PatchInfo({ game }) {
  const theme = useGameTheme(game);
  const [patchData, setPatchData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(buildApiUrl(`/api/patch-timers?game=${game}`))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled && data?.patch) setPatchData(data);
      })
      .catch(err => {
        console.warn('[PatchInfo] Failed to fetch patch:', err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [game]);

  // Default fallback if API fails
  const info = patchData || getFallbackPatchInfo(game);

  const phaseLabel = info.phase === 1 ? 'Phase 1' : 'Phase 2';
  const progressPercent = 100 - info.progressPercent;

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
      {/* Background glow */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${theme.bgGlow} to-transparent opacity-30`}
      />
      
      <div className="relative z-10 px-4 py-3 flex items-center justify-between gap-4">
        {/* Patch Badge */}
        <div className="flex items-center gap-3">
          <div 
            className={`px-3 py-1 rounded-lg ${theme.bgClass} text-black font-black text-sm tracking-wider`}
            style={{ backgroundColor: theme.color }}
          >
            v{info.patch}
          </div>
          
          <div className="hidden sm:block">
            <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
              {phaseLabel}
            </div>
            <div className="text-xs text-white/70 font-medium">
              {loading ? 'Loading...' : `${info.daysLeft} days remaining`}
            </div>
          </div>
        </div>

        {/* Days Progress Bar */}
        <div className="flex-1 max-w-[200px] hidden md:block">
          <div className="flex justify-between text-[10px] text-white/30 mb-1">
            <span>Patch Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: theme.color,
                boxShadow: `0 0 8px ${theme.color}40`
              }}
            />
          </div>
        </div>

        {/* Mobile: just days */}
        <div className="sm:hidden text-xs text-white/60">
          {info.daysLeft}d left
        </div>
      </div>
    </div>
  );
}
