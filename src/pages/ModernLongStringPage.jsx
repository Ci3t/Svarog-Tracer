// Modern Long String Lab Page - Full Width Design
import React, { useState, useMemo } from 'react';
import { decodeLongString } from '../utils/stringHelpers.js';
import { predictNext2BBPMode } from '../utils/bbp-mode-2str.js';

export default function ModernLongStringPage() {
  const [longString, setLongString] = useState('');
  const [region, setRegion] = useState('Global');

  // Download handler
  const handleDownload = () => {
    if (!longString) {
      alert('No data to download');
      return;
    }

    const blob = new Blob([longString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `longstring_${region}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import handler
  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setLongString(content);
      }
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsText(file);
    
    // Reset input so same file can be imported again
    event.target.value = '';
  };

  // Decode the long string
  const decoded = useMemo(() => {
    if (!longString) return { cleaned: '', pairs: [], rolls: [] };
    return decodeLongString(longString);
  }, [longString]);

  // Get prediction from decoded rolls
  const prediction = useMemo(() => {
    if (decoded.rolls.length < 6) return null;
    return predictNext2BBPMode(decoded.rolls);
  }, [decoded.rolls]);

  // Calculate frequency distribution
  const frequency = useMemo(() => {
    if (decoded.rolls.length === 0) return [];
    
    const counts = {};
    decoded.rolls.forEach(roll => {
      counts[roll] = (counts[roll] || 0) + 1;
    });

    const total = decoded.rolls.length;
    const freqArray = Object.entries(counts).map(([value, count]) => ({
      value,
      count,
      pct: ((count / total) * 100).toFixed(1),
      last5: decoded.rolls.slice(-5).filter(r => r === value).length,
    }));

    // Sort by count descending
    return freqArray.sort((a, b) => b.count - a.count);
  }, [decoded.rolls]);

  // Determine status for each value
  const getStatus = (value) => {
    if (!prediction) return [];
    const isCommon = prediction.commons?.includes(value);
    const isNoise = prediction.noise?.includes(value);
    
    const statuses = [];
    
    // Get frequency percentage for this value
    const freq = frequency.find(f => f.value === value);
    const pct = freq ? parseFloat(freq.pct) : 0;
    
    // Check for dominance (>40%)
    if (pct > 40) {
      statuses.push({ label: 'DOMINANT', color: 'purple' });
    }
    
    if (isCommon) statuses.push({ label: 'COMMON', color: 'emerald' });
    if (isNoise) statuses.push({ label: 'NOISE', color: 'amber' });
    
    // Check if reversing (low frequency but in noise)
    if (isNoise && pct < 15) {
      statuses.push({ label: 'REVERSING', color: 'blue' });
    }
    
    return statuses;
  };

  // Calculate trend (simplified - just check if increasing in last 5)
  const getTrend = (value) => {
    if (decoded.rolls.length < 10) return '—';
    const firstHalf = decoded.rolls.slice(0, Math.floor(decoded.rolls.length / 2));
    const secondHalf = decoded.rolls.slice(Math.floor(decoded.rolls.length / 2));
    
    const firstCount = firstHalf.filter(r => r === value).length;
    const secondCount = secondHalf.filter(r => r === value).length;
    
    if (secondCount > firstCount) return '↑';
    if (secondCount < firstCount) return '↓';
    return '—';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Top Section: Input + Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Input Area (60% / 3 columns) */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-purple-500/30 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                  🧪 Long String Lab
                </h2>
                <div className="flex items-center gap-3">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option>Global</option>
                    <option>CN</option>
                    <option>Asia</option>
                  </select>
                  <button 
                    onClick={handleDownload}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                  >
                    Download
                  </button>
                  <label className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors cursor-pointer">
                    Import
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                value={longString}
                onChange={(e) => setLongString(e.target.value)}
                placeholder="Paste your long string here (e.g., 213421234123...)"
                className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm resize-none"
              />

              {/* Character Count */}
              <div className="mt-2 text-right text-xs text-slate-500">
                {longString.length} characters
              </div>

              {/* Rolls (Pairs) */}
              {decoded.pairs.length > 0 && (
                <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-purple-500/20">
                  <div className="text-xs text-slate-500 mb-1">Rolls:</div>
                  <div className="text-purple-300 font-mono text-sm">
                    {decoded.pairs.join(' ')}
                  </div>
                </div>
              )}

              {/* Decoded Rolls (4xxx format) */}
              {decoded.rolls.length > 0 && (
                <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-cyan-500/20">
                  <div className="text-xs text-slate-500 mb-1">Decoded Rolls:</div>
                  <div className="text-cyan-300 font-mono text-sm">
                    {decoded.rolls.join(' ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prediction Card (40% / 2 columns) - MOVED TO TOP RIGHT */}
          <div className="lg:col-span-2">
            {prediction ? (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl h-full">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
                  Next Prediction
                </h3>

                {/* Mode Badge */}
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
                    {prediction.mode}
                  </span>
                </div>

                {/* Circular Display */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="75"
                        stroke="rgb(51, 65, 85)"
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="75"
                        stroke="url(#gradient)"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 75}`}
                        strokeDashoffset={`${2 * Math.PI * 75 * (1 - (prediction.confidence || 0))}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                          <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-5xl font-bold text-white mb-1">
                        {prediction.prediction || '—'}
                      </div>
                      <div className="text-xl font-medium text-purple-400">
                        {Math.round((prediction.confidence || 0) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commons Display */}
                {prediction.commons && prediction.commons.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 text-center">
                      Commons
                    </div>
                    <div className="flex gap-2 justify-center">
                      {prediction.commons.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium border border-emerald-500/30"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl h-full flex items-center justify-center">
                <p className="text-slate-500 text-sm">Need at least 6 rolls for prediction</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Frequency Table */}
        {frequency.length > 0 && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-6 py-3 border-b border-slate-700/50">
                <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  <div>Value</div>
                  <div className="text-center">Count</div>
                  <div className="text-center">%</div>
                  <div className="text-center">Trend</div>
                  <div>Last 5</div>
                  <div>Status</div>
                </div>
              </div>

              <div className="divide-y divide-slate-700/30">
                {frequency.map((item, idx) => {
                  const statuses = getStatus(item.value);
                  const trend = getTrend(item.value);
                  
                  return (
                    <div
                      key={item.value}
                      className="px-6 py-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="grid grid-cols-6 gap-4 items-center">
                        {/* Value */}
                        <div className="text-2xl font-bold text-white">
                          {item.value}
                        </div>

                        {/* Count */}
                        <div className="text-center text-lg font-medium text-slate-300">
                          {item.count}
                        </div>

                        {/* Percentage */}
                        <div className="text-center text-lg font-medium text-purple-400">
                          {item.pct}%
                        </div>

                        {/* Trend */}
                        <div className="text-center text-2xl">
                          {trend === '↑' && <span className="text-emerald-400">↑</span>}
                          {trend === '↓' && <span className="text-red-400">↓</span>}
                          {trend === '—' && <span className="text-slate-600">—</span>}
                        </div>

                        {/* Last 5 */}
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < item.last5
                                  ? 'bg-purple-500'
                                  : 'bg-slate-700/30'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Status */}
                        <div className="flex gap-2 flex-wrap">
                          {statuses.map((status, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                status.color === 'emerald'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : status.color === 'amber'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : status.color === 'purple'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              }`}
                            >
                              {status.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section: Quick Stats + Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Stats - MOVED TO BOTTOM LEFT */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Quick Stats
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-white mb-1">
                  {decoded.cleaned.length}
                </div>
                <div className="text-xs text-slate-500">Total Digits</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {decoded.rolls.length}
                </div>
                <div className="text-xs text-slate-500">Decoded Rolls</div>
              </div>

              {/* Digit Frequency Counter */}
              {longString.length > 0 && (
                <div className="pt-2 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-3">Raw Digit Count</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mb-2">
                        <span className="text-xl font-bold text-cyan-300">1</span>
                      </div>
                      <div className="text-sm font-medium text-white">
                        {(longString.match(/1/g) || []).length}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-2">
                        <span className="text-xl font-bold text-emerald-300">2</span>
                      </div>
                      <div className="text-sm font-medium text-white">
                        {(longString.match(/2/g) || []).length}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-2">
                        <span className="text-xl font-bold text-amber-300">3</span>
                      </div>
                      <div className="text-sm font-medium text-white">
                        {(longString.match(/3/g) || []).length}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-2">
                        <span className="text-xl font-bold text-purple-300">4</span>
                      </div>
                      <div className="text-sm font-medium text-white">
                        {(longString.match(/4/g) || []).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {frequency.length > 0 && (
                <>
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="text-xl font-bold text-white mb-1">
                      {frequency.length}
                    </div>
                    <div className="text-xs text-slate-500">Unique Values</div>
                  </div>

                  {/* Most & Least Frequent - Inline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-emerald-400">
                          {frequency[0].value}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({frequency[0].pct}%)
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">Most Frequent</div>
                    </div>

                    {frequency[frequency.length - 1] && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-red-400">
                            {frequency[frequency.length - 1].value}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({frequency[frequency.length - 1].pct}%)
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">Least Frequent</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="text-lg font-bold text-purple-400 mb-1">
                      {(100 / frequency.length).toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">Average Frequency</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Warnings/Insights Card */}
          {prediction && (
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Insights & Warnings
              </h3>

              <div className="space-y-3">
                {/* Wave Flip Warning */}
                {prediction.markData?.signals?.map((signal, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 rounded-lg bg-amber-900/20 border border-amber-600/40 text-amber-200 text-sm"
                  >
                    {signal}
                  </div>
                ))}

                {/* Pattern Info */}
                {prediction.pattern && (
                  <div className="px-4 py-3 rounded-lg bg-purple-900/20 border border-purple-600/40 text-purple-200 text-sm">
                    <strong>Pattern:</strong> {prediction.pattern}
                  </div>
                )}

                {/* Recommendation */}
                {prediction.markData?.recommendation && (
                  <div className="px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm font-medium">
                    {prediction.markData.recommendation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
