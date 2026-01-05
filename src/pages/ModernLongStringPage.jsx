// Modern Long String Lab Page - Full Width Design
import React, { useState, useMemo } from 'react';
import { decodeLongString } from '../utils/stringHelpers.js';
// OLD: import { predictNext2BBPMode } from '../utils/bbp-mode-2str.js';
import { predictWithPairs } from '../utils/pairTransitionPredictor.js';
import ModernDebugPanel from '../components/modern/ModernDebugPanel';

export default function ModernLongStringPage({ debugLogs = [], onClearLogs, onImportLogs, isDebugMode = false }) {
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

  // Get prediction from decoded rolls - NOW USING predictWithPairs
  const prediction = useMemo(() => {
    if (decoded.rolls.length < 6) return null;
    return predictWithPairs(decoded.rolls);
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
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Top Section: Input + Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
          {/* Input Area (60% / 3 columns) */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-purple-500/30 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.574.344l-3.118-.624A5 5 0 012 10.122V4a2 2 0 012-2h12a2 2 0 012 2v11.428l2.428 2.428a2 2 0 003.414-1.414V4a2 2 0 00-2-2h-3.428" />
                    </svg>
                  </div>
                  <h2 className="text-xs sm:text-sm font-black text-purple-400 uppercase tracking-[0.2em]">
                    Long String Lab
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none min-w-[100px]"
                  >
                    <option>Global</option>
                    <option>CN</option>
                    <option>Asia</option>
                  </select>
                  
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <button
                      onClick={handleDownload}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all active:scale-95"
                    >
                      DOWNLOAD
                    </button>
                    <label className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer text-center">
                      IMPORT
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleImport}
                        className="hidden"
                      />
                    </label>
                  </div>
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

          {/* Prediction Card - EXPANDED SUGGEST with TRENDS */}
          <div className="lg:col-span-2">
            {prediction ? (
              <div className="bg-gradient-to-br from-violet-900/30 to-slate-900/90 rounded-2xl p-4 border border-violet-500/30 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider">
                    🎯 SUGGEST
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                    {prediction.method || 'pair-matrix'}
                  </span>
                </div>

                {/* Circular Display + Alt */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="rgb(51, 65, 85)" strokeWidth="8" fill="none" />
                      <circle
                        cx="56" cy="56" r="48"
                        stroke="url(#suggestGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - (prediction.confidence || 0.5))}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="suggestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-white">{prediction.prediction || '—'}</div>
                      <div className="text-xs font-medium text-violet-400">{Math.round((prediction.confidence || 0.5) * 100)}%</div>
                    </div>
                  </div>
                  {prediction.alt && (
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-bold text-slate-400">{prediction.alt}</div>
                      <div className="text-xs text-slate-500">alt {Math.max(Math.round((prediction.confidence || 0.5) * 100) - 10, 20)}%</div>
                    </div>
                  )}
                </div>

                {/* Freq vs Pair comparison */}
                {prediction.freqPrediction && prediction.pairPrediction && prediction.freqPrediction !== prediction.pairPrediction && (
                  <div className="text-center text-[10px] text-slate-500 mb-3">
                    <span className="text-slate-400">Freq: {prediction.freqPrediction}</span>
                    <span className="mx-2">vs</span>
                    <span className="text-cyan-400">Pair: {prediction.pairPrediction}</span>
                  </div>
                )}

                {/* TRENDS section */}
                {prediction.trends && (
                  <div className="mb-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">TRENDS</div>
                    <div className="grid grid-cols-4 gap-2">
                      {['41', '42', '43', '44'].map(value => {
                        const trend = prediction.trends?.[value];
                        const pct = prediction.distribution?.[value] || 0;
                        const isHot = prediction.hotValues?.includes(value);
                        const isCold = prediction.coldValues?.includes(value);
                        return (
                          <div
                            key={value}
                            className={`p-2 rounded-lg border text-center ${
                              isHot ? 'border-emerald-500/50 bg-emerald-500/10' :
                              isCold ? 'border-red-500/30 bg-red-500/10' :
                              'border-slate-700/50 bg-slate-800/30'
                            }`}
                          >
                            <div className="text-lg font-bold text-white">{value}</div>
                            <div className={`text-lg ${
                              trend === 'up' ? 'text-emerald-400' :
                              trend === 'down' ? 'text-red-400' :
                              'text-slate-500'
                            }`}>
                              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                            </div>
                            <div className="text-[10px] text-slate-500">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AFTER X → ? section */}
                {prediction.pairMatrix && prediction.lastRoll && (
                  <div className="mb-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                      AFTER {prediction.lastRoll} → ?
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['41', '42', '43', '44'].map(value => {
                        const pairData = prediction.pairMatrix?.[prediction.lastRoll]?.[value];
                        const pct = pairData?.pct || 0;
                        const samples = pairData?.samples || 0;
                        const momentum = prediction.momentumScores?.[value] || 0;
                        const isTop = pct >= 80;
                        return (
                          <div
                            key={value}
                            className={`p-2 rounded-lg border text-center ${
                              isTop ? 'border-amber-500/50 bg-amber-500/20' :
                              samples === 0 ? 'border-red-500/30 bg-red-500/10' :
                              'border-slate-700/50 bg-slate-800/30'
                            }`}
                          >
                            <div className="text-sm font-bold text-white">{value}</div>
                            <div className="text-xs text-slate-400">↺{samples}</div>
                            <div className={`text-sm font-bold ${isTop ? 'text-amber-400' : samples === 0 ? 'text-red-400' : 'text-slate-300'}`}>
                              {samples === 0 ? 'N/A' : `${pct}%`}
                            </div>
                            <div className="text-[10px] text-slate-500">({momentum.toFixed(2)})</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Commons + Noise Labels */}
                <div className="flex justify-between text-[10px] mb-3">
                  {prediction.commons && prediction.commons.length > 0 && (
                    <div>
                      <span className="text-slate-500 uppercase">Commons: </span>
                      <span className="text-emerald-400 font-bold">{prediction.commons.join(', ')}</span>
                    </div>
                  )}
                  {prediction.noise && prediction.noise.length > 0 && (
                    <div>
                      <span className="text-slate-500 uppercase">Noise: </span>
                      <span className="text-amber-400 font-bold">{prediction.noise.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Sequence (Last 12) */}
                <div className="border-t border-slate-700/50 pt-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">SEQUENCE (LAST 12)</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {decoded.rolls.slice(-12).map((roll, idx) => {
                      const isCommon = prediction.commons?.includes(roll);
                      const isNoise = prediction.noise?.includes(roll);
                      return (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            isCommon ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' :
                            isNoise ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                            'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                          }`}
                        >
                          {roll}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-violet-900/30 to-slate-900/90 rounded-2xl p-6 border border-violet-500/30 shadow-2xl h-full flex items-center justify-center">
                <p className="text-slate-500 text-sm">Need at least 6 rolls for prediction</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Quick Stats only */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
        </div>

        {/* Debug Panel */}
        <div className="mt-6">
          <ModernDebugPanel
            debugLogs={debugLogs}
            onClearLogs={onClearLogs}
            onImportLogs={onImportLogs}
            isDebugMode={isDebugMode}
          />
        </div>
      </div>
    </div>
  );
}
