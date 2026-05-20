import React, { useState, useEffect } from 'react';
import { useGameTheme } from './GameTheme';
import { apiFetch } from '../../utils/apiClient.js';

const FALLBACK_PATCH_INFO = {
  hsr: { patch: '4.2', startDate: '2026-04-22', totalDays: 40 },
  genshin: { patch: '6.6', startDate: '2026-05-20', totalDays: 42 },
  wuwa: { patch: '3.3', startDate: '2026-04-25', totalDays: 42 },
  zzz: { patch: '2.4', startDate: '2026-04-23', totalDays: 42 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function comparePatchVersion(a, b) {
  const left = String(a || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = String(b || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getFallbackPatchInfo(game) {
  const fallback = FALLBACK_PATCH_INFO[game] || FALLBACK_PATCH_INFO.hsr;
  const start = new Date(`${fallback.startDate}T00:00:00Z`);
  const now = new Date();
  const totalMs = fallback.totalDays * DAY_MS;
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const daysElapsed = Math.floor(elapsedMs / DAY_MS);
  const phase = daysElapsed < fallback.totalDays / 2 ? 1 : 2;

  return {
    patch: fallback.patch,
    phase,
    phaseDaysLeft: phase === 1
      ? Math.max(0, Math.floor((fallback.totalDays / 2) - daysElapsed))
      : Math.max(0, Math.floor(fallback.totalDays - daysElapsed)),
    daysLeft: Math.floor(remainingMs / DAY_MS),
    totalDays: fallback.totalDays,
    progressPercent: Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100))),
  };
}

function preferFreshPatchInfo(game, data) {
  const fallback = FALLBACK_PATCH_INFO[game];
  if (!fallback || !data?.patch) return data;
  if (comparePatchVersion(data.patch, fallback.patch) < 0) {
    return getFallbackPatchInfo(game);
  }
  return data;
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

    apiFetch(`/patch-timers?game=${game}`, { cacheClient: false })
      .then(data => {
        if (!cancelled && data?.patch) setPatchData(preferFreshPatchInfo(game, data));
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
  const progressPercent = info.progressPercent;

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
