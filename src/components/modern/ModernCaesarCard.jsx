import React from "react";
import { translateTo4 } from "../../utils/stringHelpers";

export default function ModernCaesarCard({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Caesar Shift
        </h3>
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Paste a 1–4 string, we rotate it so it starts with 4.
      </p>

      {/* Input */}
      <div className="mb-4">
        <input
          value={clean}
          onChange={(e) => {
            const value = e.target.value.replace(/[^1-4]/g, "");
            setCaesarInput(value.slice(0, 5)); // Limit to 5 chars to prevent overflow
          }}
          placeholder="e.g. 234"
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200"
        />
      </div>

      {/* Result */}
      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Translated:
          </span>
          {shifted && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="mt-2">
          <span className="font-mono text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {shifted || "—"}
          </span>
        </div>
      </div>

      {/* Visual Representation */}
      {clean && shifted && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {clean.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-sm font-mono text-slate-300"
                >
                  {char}
                </div>
              ))}
            </div>
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="flex items-center gap-1">
              {shifted.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 border border-violet-500/50 flex items-center justify-center text-sm font-mono text-white font-bold shadow-lg"
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
