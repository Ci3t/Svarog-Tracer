import React, { useMemo } from 'react';

/**
 * Game Theme Configuration
 * Provides colors, gradients, and styling for each supported game.
 */
const GAME_THEMES = {
  hsr: {
    name: 'Honkai: Star Rail',
    color: '#9333ea',
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500',
    bgGlow: 'from-purple-500/20',
    borderGlow: 'border-purple-500/30',
    accentGlow: 'shadow-purple-500/20',
    gradient: 'from-purple-600 to-indigo-600',
    chartBar: 'bg-purple-500',
    softPityColor: '#c084fc',
  },
  genshin: {
    name: 'Genshin Impact',
    color: '#f59e0b',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500',
    bgGlow: 'from-amber-500/20',
    borderGlow: 'border-amber-500/30',
    accentGlow: 'shadow-amber-500/20',
    gradient: 'from-amber-500 to-orange-600',
    chartBar: 'bg-amber-500',
    softPityColor: '#fcd34d',
  },
  wuwa: {
    name: 'Wuthering Waves',
    color: '#06b6d4',
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-500',
    bgGlow: 'from-cyan-500/20',
    borderGlow: 'border-cyan-500/30',
    accentGlow: 'shadow-cyan-500/20',
    gradient: 'from-cyan-500 to-teal-600',
    chartBar: 'bg-cyan-500',
    softPityColor: '#67e8f9',
  },
  zzz: {
    name: 'Zenless Zone Zero',
    color: '#22c55e',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500',
    bgGlow: 'from-green-500/20',
    borderGlow: 'border-green-500/30',
    accentGlow: 'shadow-green-500/20',
    gradient: 'from-green-500 to-emerald-600',
    chartBar: 'bg-green-500',
    softPityColor: '#86efac',
  },
};

export function useGameTheme(game) {
  return useMemo(() => GAME_THEMES[game] || GAME_THEMES.hsr, [game]);
}

export function getGameColor(game) {
  const theme = GAME_THEMES[game];
  if (!theme) return '#9333ea';
  
  // Check for arctic/winter theme override
  if (typeof document !== 'undefined') {
    const isGlacial = document.body.classList.contains('arctic-theme') || 
                      document.body.classList.contains('winter-theme');
    if (isGlacial) return '#7dd3fc';
  }
  
  return theme.color;
}

export { GAME_THEMES };
