// Modern Long String Analysis Card
import React, { useState, useMemo } from "react";
import { exportLongStringAnalysis } from "../../utils/exportHelpers";
import { decodeLongString } from "../../utils/stringHelpers";

export default function ModernLongStringCard() {
  const [longStringInput, setLongStringInput] = useState("");

  // Count digits
  const digitCounts = useMemo(() => {
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    const cleaned = longStringInput.replace(/[^1-4]/g, '');
    for (const digit of cleaned) {
      if (counts[digit] !== undefined) {
        counts[digit]++;
      }
    }
    return { ...counts, total: cleaned.length, cleaned };
  }, [longStringInput]);

  const handleExport = () => {
    if (!digitCounts.cleaned) {
      alert('Please enter a long string first');
      return;
    }
    exportLongStringAnalysis({
      cleaned: digitCounts.cleaned,
      digitCounts,
      pairs: [],
      rolls: []
    });
  };

  return (
    <div className="space-y-4">
      {/* Input Area */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Paste Long String (digits 1-4 only)
        </label>
        <textarea
          value={longStringInput}
          onChange={(e) => setLongStringInput(e.target.value)}
          placeholder="Example: 1234123412341234..."
          className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-mono"
        />
      </div>

      {/* Digit Counter */}
      {digitCounts.total > 0 && (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Digit Frequency
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-400">Digit 1:</span>
              <span className="text-lg font-bold text-purple-400">{digitCounts['1']}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-400">Digit 2:</span>
              <span className="text-lg font-bold text-blue-400">{digitCounts['2']}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-400">Digit 3:</span>
              <span className="text-lg font-bold text-emerald-400">{digitCounts['3']}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-400">Digit 4:</span>
              <span className="text-lg font-bold text-amber-400">{digitCounts['4']}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Total Digits:</span>
            <span className="text-xl font-bold text-violet-400">{digitCounts.total}</span>
          </div>

          {/* Decode Example */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Decode Example
            </h5>
            {(() => {
              const decoded = decodeLongString(digitCounts.cleaned);
              
              return (
                <>
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <span className="text-xs text-slate-500">Decode: </span>
                    <span className="text-xs font-mono text-cyan-400">
                      {decoded.pairs.join(' ') || '—'}
                    </span>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <span className="text-xs text-slate-500">Rolls: </span>
                    <span className="text-xs font-mono text-green-400">
                      {decoded.rolls.join(' ') || '—'}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!digitCounts.cleaned}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium text-sm shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
      >
        📥 Export Analysis
      </button>
    </div>
  );
}
