import React from "react";
import { translateTo4 } from "../../utils/stringHelpers";

export default function ModernCaesarCard({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Caesar Shift
        </h3>
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
          <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mb-5 leading-relaxed font-medium">
        Paste a 1–4 string. We automatically rotate it to start with 4.
      </p>

      {/* Input */}
      <div className="mb-5">
        <input
          value={clean}
          onChange={(e) => {
            const value = e.target.value.replace(/[^1-4]/g, "");
            setCaesarInput(value.slice(0, 10)); // Increased to 10
          }}
          placeholder="e.g. 234"
          className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
        />
      </div>

      {/* Result */}
      <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
            Translated:
          </span>
          {shifted && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
              <span className="text-[9px] font-bold text-green-400 uppercase">Valid</span>
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
            {shifted || "—"}
          </span>
        </div>
      </div>

      {/* Visual Representation */}
      {clean && shifted && (
        <div className="mt-5 pt-5 border-t border-slate-800/60">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {clean.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono text-slate-400"
                >
                  {char}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center py-1">
              <svg className="w-4 h-4 text-violet-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {shifted.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 border border-violet-400/30 flex items-center justify-center text-xs font-mono text-white font-black shadow-lg shadow-violet-900/20"
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
