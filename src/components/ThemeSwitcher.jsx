import React from 'react';
import { Palette, Snowflake } from 'lucide-react'; // Changed Terminal to Snowflake

export default function ThemeSwitcher({ currentTheme, onThemeChange }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {/* ICY ARCTIC TOGGLE */}
      <button
        onClick={() => onThemeChange('arctic')}
        className={`group relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 overflow-hidden border ${
          currentTheme === 'arctic'
            ? 'bg-blue-600/20 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
            : 'bg-slate-900/60 border-slate-700/50 hover:border-blue-400/40'
        }`}
      >
        <div className={`transition-transform duration-300 ${currentTheme === 'arctic' ? 'scale-110' : 'group-hover:rotate-[15deg]'}`}>
          <Snowflake className={currentTheme === 'arctic' ? 'text-cyan-400' : 'text-slate-400'} size={18} />
        </div>
        <span className={`text-sm font-cinzel tracking-widest font-bold uppercase transition-colors ${
          currentTheme === 'arctic' ? 'text-cyan-100 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-slate-400'
        }`}>
          {currentTheme === 'arctic' ? 'Glacial Active' : 'Glacial Core'}
        </span>
        {currentTheme === 'arctic' && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-transparent animate-pulse" />
        )}
      </button>

      {/* MODERN BASE TOGGLE */}
      <button
        onClick={() => onThemeChange('modern')}
        className={`group relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-500 overflow-hidden border ${
          currentTheme === 'modern'
            ? 'bg-cyan-600/20 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-500'
        }`}
      >
        <div className={`transition-transform duration-500 ${currentTheme === 'modern' ? 'scale-110' : 'group-hover:rotate-12'}`}>
          <Palette className={currentTheme === 'modern' ? 'text-cyan-400' : 'text-slate-400'} size={20} />
        </div>
        <span className={`text-sm font-bold tracking-wider uppercase transition-colors ${
          currentTheme === 'modern' ? 'text-cyan-100' : 'text-slate-400'
        }`}>
          Modern Base
        </span>
        {currentTheme === 'modern' && (
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent animate-pulse" />
        )}
      </button>
    </div>
  );
}
