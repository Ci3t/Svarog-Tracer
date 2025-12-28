// Modern Live Tracking Table with BBP Mode Analysis
import React from 'react';
import { predictNext2BBPMode } from '../../utils/bbp-mode-2str';

export default function ModernLiveTrackingTable({ rolls = [] }) {
  if (rolls.length < 6) {
    return (
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-12 shadow-xl">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <svg className="w-16 h-16 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium">Need at least 6 rolls to analyze patterns</span>
        </div>
      </div>
    );
  }

  // Get BBP Mode analysis
  const rollValues = rolls
    .map(r => {
      const val = r.value || r;
      return String(val).slice(0, 2);
    })
    .filter(v => v && v.length === 2);
  
  const beastAnalysis = predictNext2BBPMode(rollValues);
  
  // Count occurrences
  const freq = {};
  rollValues.forEach(v => {
    freq[v] = (freq[v] || 0) + 1;
  });
  
  // Build distribution data
  const total = rollValues.length;
  const distribution = Object.entries(freq).map(([value, count]) => {
    const pct = (count / total) * 100;
    
    // Determine trend
    const mid = Math.floor(rollValues.length / 2);
    const firstHalf = rollValues.slice(0, mid).filter(v => v === value).length;
    const secondHalf = rollValues.slice(mid).filter(v => v === value).length;
    let trend = '→';
    if (secondHalf > firstHalf * 1.3) trend = '↑';
    else if (secondHalf < firstHalf * 0.7) trend = '↓';
    
    // Determine status
    let status = 'noise';
    let isDominant = false;
    
    if (beastAnalysis.commons && beastAnalysis.commons.includes(value)) {
      status = 'common';
      if (pct > 55) {
        isDominant = true;
        status = 'dominant';
      }
    }
    
    // Get last 5 pattern
    const last5Pattern = rollValues
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v === value)
      .slice(-5)
      .map(({ v }) => v)
      .join('-') || '—';
    
    return {
      value,
      count,
      pct,
      trend,
      status,
      isDominant,
      last5Pattern,
      sortKey: isDominant ? 2000 + count : status === 'common' ? 1000 + count : count
    };
  });
  
  distribution.sort((a, b) => b.sortKey - a.sortKey);

  const getTrendColor = (trend) => {
    if (trend === '↑') return 'text-green-400';
    if (trend === '↓') return 'text-red-400';
    return 'text-slate-400';
  };

  const getStatusBadge = (status) => {
    if (status === 'dominant') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
    if (status === 'common') {
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
    return 'bg-slate-700/30 text-slate-500 border-slate-600/30';
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Live Tracking (2-str)
        </h3>
      </div>

      {/* Distribution Table */}
      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-violet-600 to-purple-600 sticky top-0">
            <tr className="text-white text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 text-center border-r border-white/10">Value</th>
              <th className="py-3 px-4 text-center border-r border-white/10">Count</th>
              <th className="py-3 px-4 text-center border-r border-white/10">%</th>
              <th className="py-3 px-4 text-center border-r border-white/10">Trend</th>
              <th className="py-3 px-4 text-center border-r border-white/10">Last 5</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {distribution.map((item) => {
              const candidate = beastAnalysis.candidates?.find(c => c.value === item.value);
              const isMeanReversion = candidate?.meanReversion;
              
              return (
                <tr
                  key={item.value}
                  className={`transition-colors duration-150 ${
                    item.status === 'dominant' 
                      ? 'bg-amber-500/10 border-l-4 border-amber-500' 
                      : item.status === 'common' 
                      ? 'bg-green-500/5' 
                      : 'bg-slate-900/30'
                  } hover:bg-slate-800/40`}
                >
                  <td className="py-3 px-4 text-center font-bold text-lg text-slate-200">
                    {item.value}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-300">
                    {item.count}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-300">
                    {item.pct.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-4 text-center text-xl font-bold ${getTrendColor(item.trend)}`}>
                    {item.trend}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                    {item.last5Pattern}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(item.status)}`}>
                        {item.status === 'dominant' ? 'DOMINANT' : item.status === 'common' ? 'COMMON' : 'NOISE'}
                      </span>
                      {isMeanReversion && (
                        <span className="px-2 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded text-[9px] font-bold border border-white/30 shadow-lg">
                          ⚡ REVERSION
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trend Legend */}
      <div className="px-6 py-3 bg-slate-900/40 border-t border-slate-700/30 flex items-center gap-4 flex-wrap text-[10px] text-slate-400">
        <span className="font-semibold">Trend:</span>
        <span className="flex items-center gap-1"><span className="text-green-400">↑</span> Rising</span>
        <span className="flex items-center gap-1"><span className="text-slate-400">→</span> Stable</span>
        <span className="flex items-center gap-1"><span className="text-red-400">↓</span> Falling</span>
      </div>

      {/* BBP Mode Info */}
      {beastAnalysis.commons && beastAnalysis.commons.length >= 2 && (
        <div className="px-6 py-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-t-2 border-violet-500/40">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wide">
              🦁 BBP:
            </span>
            <div className="flex items-center gap-2">
              {beastAnalysis.commons.map((c, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold shadow-lg border border-white/20"
                >
                  {c}
                </span>
              ))}
            </div>
            <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-[11px] font-bold shadow-lg border border-white/20 capitalize">
              {beastAnalysis.pattern}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-sm font-bold shadow-lg border border-white/20 ${
                beastAnalysis.commonsConfidence >= 0.7
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : beastAnalysis.commonsConfidence >= 0.5
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              }`}
            >
              {Math.round(beastAnalysis.commonsConfidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* MARK Mode Stability */}
      {beastAnalysis.markData && (
        <div
          className={`px-6 py-4 border-t-2 ${
            beastAnalysis.markData.state === 'LOCKED'
              ? 'bg-green-500/10 border-green-500'
              : beastAnalysis.markData.state === 'WATCH'
              ? 'bg-amber-500/10 border-amber-500'
              : beastAnalysis.markData.state === 'COUNTER'
              ? 'bg-orange-500/10 border-orange-500'
              : beastAnalysis.markData.state === 'CHAOS'
              ? 'bg-red-500/10 border-red-500'
              : 'bg-slate-500/10 border-slate-500'
          }`}
        >
          {/* State Badge + Metrics */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-white ${
                beastAnalysis.markData.state === 'LOCKED'
                  ? 'bg-green-500'
                  : beastAnalysis.markData.state === 'WATCH'
                  ? 'bg-amber-500'
                  : beastAnalysis.markData.state === 'COUNTER'
                  ? 'bg-orange-500'
                  : beastAnalysis.markData.state === 'CHAOS'
                  ? 'bg-red-500'
                  : 'bg-slate-500'
              }`}
            >
              {beastAnalysis.markData.state === 'LOCKED' ? '🟢' :
               beastAnalysis.markData.state === 'WATCH' ? '🟡' :
               beastAnalysis.markData.state === 'COUNTER' ? '🟠' :
               beastAnalysis.markData.state === 'CHAOS' ? '🔴' : '⚪'}{' '}
              {beastAnalysis.markData.state}
            </span>
            <span className="text-[11px] text-slate-300">
              Stability: <strong className="text-white">{beastAnalysis.markData.stabilityScore}/100</strong>
            </span>
            {beastAnalysis.markData.waveIntensity > 0 && (
              <span className="text-[11px] text-slate-300">
                Wave: <strong className="text-white">{beastAnalysis.markData.waveIntensity} flips</strong>
              </span>
            )}
          </div>

          {/* Roll Timeline */}
          <div className="mb-4 p-4 bg-black/20 rounded-xl">
            <div className="text-[10px] text-slate-400 font-semibold mb-3 uppercase tracking-wide">
              📊 Last 12 Rolls (Oldest → Newest)
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {rollValues.slice(-12).map((roll, idx) => {
                const isCommon = beastAnalysis.commons?.includes(roll);
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-[11px] font-bold border-2 ${
                      isCommon
                        ? roll === '41'
                          ? 'bg-blue-500 text-white border-white/30'
                          : roll === '42'
                          ? 'bg-purple-500 text-white border-white/30'
                          : roll === '43'
                          ? 'bg-pink-500 text-white border-white/30'
                          : 'bg-amber-500 text-white border-white/30'
                        : 'bg-slate-700/30 text-slate-400 border-transparent'
                    }`}
                  >
                    {roll}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[9px] text-slate-400 mb-3 flex-wrap">
              <span>🟦 41</span>
              <span>🟪 42</span>
              <span>🟥 43</span>
              <span>🟧 44</span>
              <span className="ml-2">⚪ = Noise</span>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center gap-4 text-[9px] text-slate-300 flex-wrap">
              <span>Pattern Strength: <strong>{beastAnalysis.markData.csi}</strong></span>
              <span>Noise Level: <strong>{beastAnalysis.markData.ntl}</strong></span>
              <span>Clarity: <strong>{beastAnalysis.markData.pc}</strong></span>
              <span>Flips: <strong>{beastAnalysis.markData.waveIntensity}</strong></span>
            </div>
          </div>

          {/* Warnings + Quick Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warnings */}
            {beastAnalysis.markData.signals && beastAnalysis.markData.signals.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-wide">
                  ⚠️ Warnings
                </div>
                <div className="space-y-2">
                  {beastAnalysis.markData.signals.map((signal, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] text-amber-200 font-medium"
                    >
                      ⚠️ {signal}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Guide */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                📖 Quick Guide
              </div>
              <div className="space-y-2 text-[9px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0" />
                  <span className="text-slate-300">
                    <strong>BET GOOD:</strong> Strength ≥60, Noise ≤40, Clarity ≥60, Flips &lt;5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-500 flex-shrink-0" />
                  <span className="text-slate-300">
                    <strong>BET OKAY:</strong> Strength ≥50, Noise &lt;60, Clarity ≥50, Flips &lt;5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500 flex-shrink-0" />
                  <span className="text-slate-300">
                    <strong>SKIP:</strong> Noise &gt;60 OR Flips ≥5 OR Strength &lt;50
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div
            className={`mt-4 px-4 py-3 rounded-xl border font-semibold text-sm text-white ${
              beastAnalysis.markData.state === 'LOCKED'
                ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500'
                : beastAnalysis.markData.state === 'WATCH'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500'
                : 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500'
            }`}
          >
            {beastAnalysis.markData.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
