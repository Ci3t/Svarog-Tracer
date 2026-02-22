// Modern Long String Analysis Card — Compact version for Debug Panel
// Shows digit frequency + decode only. BBP predictor lives in ModernLongStringPage.
import React, { useState, useMemo } from "react";
import { exportLongStringAnalysis } from "../../utils/exportHelpers";
import { decodeLongString } from "../../utils/stringHelpers";

export default function ModernLongStringCard() {
  const [longStringInput, setLongStringInput] = useState("");

  const digitCounts = useMemo(() => {
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    const cleaned = longStringInput.replace(/[^1-4]/g, '');
    for (const digit of cleaned) {
      if (counts[digit] !== undefined) counts[digit]++;
    }
    return { ...counts, total: cleaned.length, cleaned };
  }, [longStringInput]);

  const handleExport = () => {
    if (!digitCounts.cleaned) { alert('Please enter a long string first'); return; }
    exportLongStringAnalysis({ cleaned: digitCounts.cleaned, digitCounts, pairs: [], rolls: [] });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Paste Long String (digits 1–4)
        </label>
        <textarea
          value={longStringInput}
          onChange={(e) => setLongStringInput(e.target.value)}
          placeholder="Example: 1234123412341234..."
          className="w-full h-28 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-mono"
        />
      </div>

      {digitCounts.total > 0 && (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Digit Frequency</h4>
          <div className="grid grid-cols-2 gap-3">
            {['1','2','3','4'].map((d, i) => (
              <div key={d} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-400">Digit {d}:</span>
                <span className={`text-lg font-bold ${['text-purple-400','text-blue-400','text-emerald-400','text-amber-400'][i]}`}>
                  {digitCounts[d]}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Total Digits:</span>
            <span className="text-xl font-bold text-violet-400">{digitCounts.total}</span>
          </div>

          {/* Decode */}
          {(() => {
            const decoded = decodeLongString(digitCounts.cleaned);
            return decoded.rolls.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Decode</h5>
                <div className="bg-slate-800/30 rounded-lg p-2">
                  <span className="text-xs text-slate-500">Pairs: </span>
                  <span className="text-xs font-mono text-cyan-400">{decoded.pairs.join(' ')}</span>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-2">
                  <span className="text-xs text-slate-500">Rolls: </span>
                  <span className="text-xs font-mono text-green-400">{decoded.rolls.join(' ')}</span>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={!digitCounts.cleaned}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium text-sm shadow-lg transition-all duration-200"
      >
        📥 Export Analysis
      </button>
    </div>
  );
}
