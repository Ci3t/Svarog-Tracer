// Simplified Modern Debug Panel - keeping core functionality
import React, { useState } from "react";
import { exportDebugLogsToTXT } from "../../utils/exportHelpers";
import ModernLongStringCard from "./ModernLongStringCard";

export default function ModernDebugPanel({
  debugLogs,
  onClearLogs,
  onImportLogs,
  isDebugMode = false,
  livePrediction,
  livePrediction3,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  const tabs = [
    { id: 'logs', label: 'Live Logs', icon: '📋' },
    { id: '2str', label: '2-str', icon: '2️⃣' },
    { id: '3str', label: '3-str', icon: '3️⃣' },
    { id: 'long', label: 'Long String', icon: '📝' },
  ];

  if (isDebugMode) {
    tabs.push({ id: 'backtest', label: 'Backtest', icon: '🔬' });
  }

  // Always show the panel, just collapsed by default
  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Debug Panel
          </h3>
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
            {debugLogs?.length || 0} logs
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-slate-700/30">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            <button
              onClick={() => exportDebugLogsToTXT(debugLogs)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              📥 Export Logs
            </button>
            <button
              onClick={onClearLogs}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              Clear Logs
            </button>
            <label className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02] cursor-pointer">
              Import Logs
              <input
                type="file"
                accept=".txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onImportLogs) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      // Simple import logic
                      onImportLogs([]);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'logs' && (
            <div className="bg-slate-950/50 rounded-xl p-4 max-h-96 overflow-auto">
              <div className="text-xs font-mono text-slate-400 space-y-1">
                {debugLogs && debugLogs.length > 0 ? (
                  [...debugLogs].reverse().map((log, idx) => {
                    const pred = String(log.prediction || '—');
                    const actual = String(log.actual || '—');
                    const confidence = Math.round((log.confidence || 0) * 100);
                    const isCorrect = pred === actual || pred === actual.slice(0, pred.length);
                    
                    return (
                      <div key={idx} className="py-1 border-b border-slate-800/30 last:border-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-400">[{new Date(log.ts).toLocaleTimeString()}]</span>
                          <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                            {pred} → {actual}
                          </span>
                          <span className="text-slate-500">({confidence}%)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No debug logs yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === '2str' && (
            <div className="bg-slate-950/50 rounded-xl p-4 max-h-96 overflow-auto">
              <div className="text-xs font-mono text-slate-400 space-y-2">
                {debugLogs && debugLogs.length > 0 ? (
                  [...debugLogs].reverse().filter(log => log.kind === '2').map((log, idx) => {
                    const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
                    const pred = log.prediction || '—';
                    const actual = log.actual || '—';
                    const conf = Math.round((log.confidence || 0) * 100);
                    const alt = log.alt || '';
                    const mode = log.mode || 'unknown';
                    const pattern = log.pattern?.name || log.pattern?.pattern || log.pattern || '';
                    const dist = log.distribution ? 
                      Object.entries(log.distribution)
                        .map(([key, data]) => {
                          const pct = typeof data === 'object' ? Math.round(data.pct || 0) : Math.round(data || 0);
                          return `${key}:${pct}%`;
                        })
                        .join(',')
                      : '';
                    // Show ALL session rolls, not just last 8
                    const ctx = log.ctx ? (Array.isArray(log.ctx) ? log.ctx.join(', ') : log.ctx) : '';
                    const isCorrect = pred === actual || pred === actual.slice(0, pred.length);
                    const status = isCorrect ? '✅' : `❌ ${log.status || 'MISS'}`;
                    
                    return (
                      <div key={idx} className="py-2 px-3 bg-slate-900/50 rounded-lg border border-slate-800/30">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-violet-400">[{time}]</span>
                          <span className="text-slate-500">2-str →</span>
                          <span className="text-slate-400">pred:</span>
                          <span className={isCorrect ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{pred}</span>
                          <span className="text-slate-500">({conf}%)</span>
                          {alt && (
                            <>
                              <span className="text-slate-600">|</span>
                              <span className="text-slate-400">alt:</span>
                              <span className="text-cyan-400">{alt}</span>
                            </>
                          )}
                          {mode && (
                            <>
                              <span className="text-slate-600">|</span>
                              <span className="text-slate-400">mode:</span>
                              <span className="text-blue-400">{mode}</span>
                            </>
                          )}
                          {pattern && (
                            <>
                              <span className="text-slate-600">|</span>
                              <span className="text-slate-400">Pattern:</span>
                              <span className="text-purple-400">{pattern}</span>
                            </>
                          )}
                          {dist && (
                            <>
                              <span className="text-slate-600">|</span>
                              <span className="text-slate-400">Dist:</span>
                              <span className="text-amber-400">{dist}</span>
                            </>
                          )}
                          <span className="text-slate-600">|</span>
                          <span className={isCorrect ? "text-green-400" : "text-red-400"}>{status}</span>
                          <span className="text-slate-600">|</span>
                          <span className="text-slate-400">actual:</span>
                          <span className="text-white font-bold">{actual}</span>
                        </div>
                        {/* CTX on separate line for better readability */}
                        {ctx && (
                          <div className="mt-2 pt-2 border-t border-slate-800/30">
                            <span className="text-slate-400">ctx: </span>
                            <span className="text-slate-500">{ctx}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No 2-str logs yet
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === '3str' && livePrediction3 && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                3-String Prediction
              </h4>
              <div className="text-center">
                <div className="text-5xl font-bold text-emerald-400 mb-2">
                  {livePrediction3.prediction || '—'}
                </div>
                <div className="text-sm text-slate-400">
                  Confidence: {Math.round((livePrediction3.confidence || 0) * 100)}%
                </div>
                {livePrediction3.alt && (
                  <div className="mt-3 text-sm text-slate-500">
                    Alt: <span className="text-cyan-400 font-medium">{livePrediction3.alt}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'long' && (
            <ModernLongStringCard />
          )}

          {activeTab === 'backtest' && isDebugMode && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Backtest Mode
              </h4>
              <p className="text-sm text-slate-500 mb-3">
                Import a file to run backtest analysis
              </p>
              <label className="block w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm text-center cursor-pointer transition-all">
                📂 Import File
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    // Handle backtest file import
                    console.log('Backtest file:', e.target.files?.[0]);
                  }}
                />
              </label>
            </div>
          )}

          {/* Logs Display - OLD LOCATION, NOW MOVED TO TAB */}
          <div className="bg-slate-950/50 rounded-xl p-4 max-h-96 overflow-auto" style={{ display: 'none' }}>

            <div className="text-xs font-mono text-slate-400 space-y-1">
              {debugLogs && debugLogs.length > 0 ? (
                debugLogs.slice(0, 50).map((log, idx) => {
                  const pred = String(log.prediction || '—');
                  const actual = String(log.actual || '—');
                  const confidence = Math.round((log.confidence || 0) * 100);
                  const isCorrect = pred === actual || pred === actual.slice(0, pred.length);
                  
                  return (
                    <div key={idx} className="py-1 border-b border-slate-800/30 last:border-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-violet-400">[{new Date(log.ts).toLocaleTimeString()}]</span>
                        <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                          {pred} → {actual}
                        </span>
                        <span className="text-slate-500">({confidence}%)</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No debug logs yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
