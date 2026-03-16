// Modern Long String Lab Page - Full Width Design
import React, { useState, useMemo, useEffect } from 'react';
import { decodeLongString } from '../utils/stringHelpers.js';
// OLD: import { predictNext2BBPMode } from '../utils/bbp-mode-2str.js';
import { predictWithPairs } from '../utils/pairTransitionPredictor.js';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernDebugPanel from '../components/modern/ModernDebugPanel';
import ModernTimerCard from '../components/modern/ModernTimerCard';

export default function ModernLongStringPage({ debugLogs = [], onClearLogs, onImportLogs, isDebugMode = false, sessionTheme }) {
  const [longString, setLongString] = useState('');
  const [region, setRegion] = useState('Global');
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [stringHistory, setStringHistory] = useState([]);
  const [predictorMode, setPredictorMode] = useState('simple'); // 'simple' | 'advanced'

  // Timer countdown effect
  useEffect(() => {
    if (!timerRunning || timerPaused) return;
    if (secondsLeft <= 0) {
      // Timer completed - save to history
      if (longString.trim()) {
        const historyEntry = {
          string: longString,
          timestamp: new Date().toISOString(),
          region: region,
          rollCount: decodeLongString(longString).rolls.length
        };
        setStringHistory(prev => [historyEntry, ...prev]);
        setLongString(''); // Clear the string
      }
      // Auto-restart timer after saving
      setSecondsLeft(300);
      setTimerRunning(true);
      setTimerPaused(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerPaused, secondsLeft, longString, region]);

  // Start timer handler
  const handleStartTimer = () => {
    setSecondsLeft(300); // Reset to 5 minutes
    setTimerRunning(true);
    setTimerPaused(false);
  };

  // Pause timer handler
  const handlePauseTimer = () => {
    setTimerPaused(!timerPaused);
  };

  // Restart timer handler
  const handleRestartTimer = () => {
    // Save current session to history if there's a string
    if (longString.trim()) {
      const historyEntry = {
        string: longString,
        timestamp: new Date().toISOString(),
        region: region,
        rollCount: decodeLongString(longString).rolls.length
      };
      setStringHistory(prev => [historyEntry, ...prev]);
      setLongString(''); // Clear for new session
    }
    // Start fresh timer
    setSecondsLeft(300);
    setTimerRunning(true);
    setTimerPaused(false);
  };

  // Load from history
  const handleLoadFromHistory = (entry) => {
    setLongString(entry.string);
    setRegion(entry.region);
  };

  // Delete history entry
  const handleDeleteHistory = (index) => {
    setStringHistory(prev => prev.filter((_, i) => i !== index));
  };

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
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="theme-page-shell max-w-[1920px] mx-auto">
        {/* Top Section: Input + Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
          {/* Input Area (60% / 3 columns) */}
          <div className="lg:col-span-3">
            <div className="theme-glass-card p-4 sm:p-6 overflow-visible">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="theme-badge-accent rounded-lg p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.574.344l-3.118-.624A5 5 0 012 10.122V4a2 2 0 012-2h12a2 2 0 012 2v11.428l2.428 2.428a2 2 0 003.414-1.414V4a2 2 0 00-2-2h-3.428" />
                    </svg>
                  </div>
                  <h2 className="theme-text-accent text-xs sm:text-sm font-black uppercase tracking-[0.2em]">
                    Long String Lab
                  </h2>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="theme-select min-w-[100px] flex-1 appearance-none rounded-xl px-3 py-2 text-xs sm:flex-none"
                  >
                    <option>Global</option>
                    <option>CN</option>
                    <option>Asia</option>
                  </select>
                  
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <button
                      onClick={handleDownload}
                      className="theme-action-secondary flex-1 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 sm:flex-none"
                    >
                      DOWNLOAD
                    </button>
                    <label className="theme-action-primary flex-1 cursor-pointer rounded-xl px-4 py-2 text-center text-xs font-bold transition-all active:scale-95 sm:flex-none">
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
                className="theme-textarea h-32 w-full resize-none rounded-xl px-4 py-3 font-mono text-sm"
              />

              {/* Character Count */}
              <div className="theme-text-muted mt-2 text-right text-xs">
                {longString.length} characters
              </div>

              {/* Rolls (Pairs) */}
              {decoded.pairs.length > 0 && (
                <div className="theme-subpanel mt-4 rounded-lg border p-3">
                  <div className="theme-text-muted mb-1 text-xs">Rolls:</div>
                  <div className="theme-text-accent font-mono text-sm">
                    {decoded.pairs.join(' ')}
                  </div>
                </div>
              )}

              {/* Decoded Rolls (4xxx format) */}
              {decoded.rolls.length > 0 && (
                <div className="theme-subpanel mt-4 rounded-lg border p-3">
                  <div className="theme-text-muted mb-1 text-xs">Decoded Rolls:</div>
                  <div className="theme-text-accent font-mono text-sm">
                    {decoded.rolls.join(' ')}
                  </div>
                </div>
              )}
            </div>
              <div className="theme-glass-card p-4">
              <ModernTimerCard
                secondsLeft={secondsLeft}
                onStart={handleStartTimer}
                onPause={handlePauseTimer}
                onRestart={handleRestartTimer}
                timerRunning={timerRunning}
                timerPaused={timerPaused}
              />
            </div>
              </div>

          {/* Right Column — BBP Predictor with mode toggle */}
          <div className="lg:col-span-2 space-y-3">
            {/* ── MODE TOGGLE REMOVED ──────────────────────────────────
            <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl border border-slate-700/50 p-1">
              {['simple','advanced'].map(m => (
                <button
                  key={m}
                  onClick={() => setPredictorMode(m)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    predictorMode === m
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-900/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m === 'simple' ? '🎯 Simple' : '🔬 Advanced'}
                </button>
              ))}
            </div>
            ────────────────────────────────────────────────────────── */}

            {decoded.rolls.length < 6 ? (
              <div className="theme-glass-card py-8 px-6 flex items-center justify-center">
                <p className="theme-text-muted text-sm">Need at least 6 rolls for prediction</p>
              </div>
            ) : (
              <>
                {/* ── BBP CARD (Permanently shown) ───────────────────── */}
                <div className="theme-glass-card overflow-visible">
                  <ModernPairPredictorCard
                    entries={decoded.rolls.map(r => ({ translated: r }))}
                  />
                </div>

                {/* ── ADVANCED MODE COMMENTED OUT ───────────────────────
                {predictorMode === 'advanced' && prediction && (
                  <div className="bg-gradient-to-br from-violet-900/30 to-slate-900/90 rounded-2xl p-4 border border-violet-500/30 shadow-2xl space-y-4">
                    ... (advanced view code) ...
                  </div>
                )}
                ────────────────────────────────────────────────────────── */}
              </>
            )}

            {/* History Section */}
            {stringHistory.length > 0 && (
              <div className="theme-glass-card p-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stringHistory.map((entry, index) => (
                    <div key={index} className="theme-subpanel rounded-lg p-3 transition-colors hover:border-[color:var(--theme-border-strong)]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="theme-text-muted mb-1 text-xs">
                            {new Date(entry.timestamp).toLocaleString()} • {entry.region}
                          </div>
                          <div className="theme-text-soft text-xs">
                            {entry.rollCount} rolls
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleLoadFromHistory(entry)}
                            className="theme-action-secondary theme-text-accent rounded border px-2 py-1 text-xs transition-colors"
                            title="Load"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(index)}
                            className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded border border-red-500/30 transition-colors"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="truncate text-xs font-mono text-slate-300">
                        {entry.string.length > 55 ? entry.string.substring(0, 55) + '...' : entry.string}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Quick Stats (Compact) */}
        {(decoded.cleaned.length > 0 || frequency.length > 0) && (
          <div className="theme-glass-card p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Stats
            </h3>
            
            {/* Compact Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Total Digits */}
              <div className="theme-subpanel rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-white">{decoded.cleaned.length}</div>
                <div className="theme-text-muted text-[10px]">Total Digits</div>
              </div>

              {/* Decoded Rolls */}
              <div className="theme-subpanel rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-white">{decoded.rolls.length}</div>
                <div className="theme-text-muted text-[10px]">Decoded Rolls</div>
              </div>

              {/* Unique Values */}
              {frequency.length > 0 && (
                <div className="theme-subpanel rounded-lg p-2 text-center">
                  <div className="text-xl font-bold text-white">{frequency.length}</div>
                  <div className="theme-text-muted text-[10px]">Unique Values</div>
                </div>
              )}

              {/* Most Frequent */}
              {frequency.length > 0 && (
                <div className="theme-badge-accent rounded-lg p-2 text-center">
                  <div className="theme-text-accent text-xl font-bold">{frequency[0].value}</div>
                  <div className="theme-text-muted text-[10px]">Most ({frequency[0].pct}%)</div>
                </div>
              )}

              {/* Least Frequent */}
              {frequency.length > 1 && frequency[frequency.length - 1] && (
                <div className="bg-red-500/10 rounded-lg p-2 text-center border border-red-500/20">
                  <div className="text-xl font-bold text-red-400">{frequency[frequency.length - 1].value}</div>
                  <div className="theme-text-muted text-[10px]">Least ({frequency[frequency.length - 1].pct}%)</div>
                </div>
              )}

              {/* Dominant (if exists) */}
              {frequency.length > 0 && parseFloat(frequency[0].pct) > 40 && (
                <div className="theme-badge-accent rounded-lg p-2 text-center">
                  <div className="theme-text-accent text-xl font-bold">{parseFloat(frequency[0].pct).toFixed(0)}%</div>
                  <div className="theme-text-muted text-[10px]">Dominant</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Panel */}
        <div className="theme-glass-card p-4 mt-6">
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
