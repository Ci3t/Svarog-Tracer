// Modern String Frequency Component with Horizontal Bars
import React from 'react';

export default function ModernFrequencyCard({ freq2, freq3, freq4, freq5, freqTab, setFreqTab }) {
  // Select active frequency based on tab
  const activeFreq = freqTab === '3' ? freq3 : freqTab === '4' ? freq4 : freqTab === '5' ? freq5 : freq2;

  if (!activeFreq || Object.keys(activeFreq).length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          String Frequency
        </h3>
        <p className="text-slate-500 text-sm">No data yet</p>
      </div>
    );
  }

  // Convert frequency data to array
  // buildPrefixFreq returns an array of {pattern, count, pct}, not an object
  const freqArray = Array.isArray(activeFreq)
    ? activeFreq
        .map(item => ({
          str: (item.pattern || item.str || '').replace(/0+$/, ''), // Remove trailing zeros
          count: item.count || 0,
          pct: item.pct || 0
        }))
        .slice(0, 8) // Top 8
    : Object.entries(activeFreq)
        .map(([str, data]) => {
          const count = typeof data === 'object' && data !== null ? (data.count || 0) : data;
          const pct = typeof data === 'object' && data !== null ? (data.pct || 0) : 0;
          return { str: str.replace(/0+$/, ''), count, pct }; // Remove trailing zeros
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8

  const maxCount = Math.max(...freqArray.map(f => f.count), 1);

  // Color palette for bars
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-yellow-500 to-orange-500',
    'from-red-500 to-pink-500',
    'from-indigo-500 to-purple-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          String Frequency
        </h3>
        {setFreqTab && (
          <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
            {['2', '3', '4', '5'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFreqTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  freqTab === tab
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tab}-str
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Frequency Bars */}
      <div className="space-y-4">
        {freqArray.map((item, idx) => {
          const percentage = (item.count / maxCount) * 100;
          
          return (
            <div key={item.str} className="group">
              {/* Label Row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  {item.str}
                </span>
                <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                  {item.pct}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            Total Strings
          </span>
          <span className="text-lg font-bold text-purple-400">
            {Array.isArray(activeFreq) ? activeFreq.length : Object.keys(activeFreq).length}
          </span>
        </div>
      </div>
    </div>
  );
}
