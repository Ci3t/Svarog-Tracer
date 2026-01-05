// Pattern Analysis Table - Proper Table Layout
// Col 1: First digit of RAW input (1, 2, 3, 4)
// Col 2: Second digit of TRANSLATED (1, 2, 3, 4 from 41, 42, 43, 44)

import React, { useMemo } from 'react';

export default function PatternAnalysisTable({ entries = [] }) {
  // Build pattern data from entries
  const patternData = useMemo(() => {
    return entries
      .filter(e => e.raw && e.translated)
      .map(e => {
        const raw = String(e.raw);
        const translated = String(e.translated).slice(0, 2);
        
        const col1 = raw.charAt(0);
        const col2 = translated.charAt(1);
        
        return {
          raw,
          translated,
          col1,
          col2
        };
      });
  }, [entries]);

  // Get last 16 for display
  const last16 = patternData.slice(-16);

  if (patternData.length < 6) {
    return (
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
        <div className="text-center text-slate-500 text-sm">
          Need at least 6 entries for pattern analysis
        </div>
      </div>
    );
  }

  const getDigitColor = (digit) => {
    const colors = {
      '1': 'bg-blue-500/30 text-blue-300',
      '2': 'bg-green-500/30 text-green-300',
      '3': 'bg-amber-500/30 text-amber-300',
      '4': 'bg-pink-500/30 text-pink-300',
    };
    return colors[digit] || 'bg-slate-500/30 text-slate-300';
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          🎲 Pattern Analysis
        </h3>
      </div>

      {/* Proper Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          {/* Table Header */}
          <thead className="bg-gradient-to-r from-violet-600 to-purple-600">
            <tr className="text-white font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3 text-left border-r border-white/10">#</th>
              <th className="py-2.5 px-3 text-center border-r border-white/10">RAW</th>
              <th className="py-2.5 px-3 text-center border-r border-white/10">COL 1</th>
              <th className="py-2.5 px-3 text-center border-r border-white/10">TRANSLATED</th>
              <th className="py-2.5 px-3 text-center">COL 2</th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/50">
            {last16.map((row, i) => (
              <tr 
                key={i} 
                className={`${i % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'} hover:bg-slate-700/30 transition-colors`}
              >
                <td className="py-2 px-3 text-slate-500 text-center border-r border-slate-700/30">
                  {patternData.length - 16 + i + 1}
                </td>
                <td className="py-2 px-3 text-center text-slate-300 font-mono border-r border-slate-700/30">
                  {row.raw}
                </td>
                <td className="py-2 px-3 text-center border-r border-slate-700/30">
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded font-bold ${getDigitColor(row.col1)}`}>
                    {row.col1}
                  </span>
                </td>
                <td className="py-2 px-3 text-center text-slate-300 font-mono border-r border-slate-700/30">
                  {row.translated}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded font-bold ${getDigitColor(row.col2)}`}>
                    {row.col2}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-slate-700/30 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span>COL 1 = First digit of RAW</span>
        <span>|</span>
        <span>COL 2 = Second digit of TRANSLATED</span>
        <span>|</span>
        <span className="flex gap-1">
          Colors:
          <span className="px-1.5 rounded bg-blue-500/30 text-blue-300">1</span>
          <span className="px-1.5 rounded bg-green-500/30 text-green-300">2</span>
          <span className="px-1.5 rounded bg-amber-500/30 text-amber-300">3</span>
          <span className="px-1.5 rounded bg-pink-500/30 text-pink-300">4</span>
        </span>
      </div>
    </div>
  );
}
