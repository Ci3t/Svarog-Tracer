// Simplified Modern Debug Panel - keeping core functionality
import React, { useState, useMemo } from "react";
import { exportDebugLogsToTXT } from "../../utils/exportHelpers";
import ModernLongStringCard from "./ModernLongStringCard";
import { runBacktest } from "../../utils/backtester";
import { runLongStringBacktest } from "../../utils/longStringBacktester";
import { runKiyoBacktest } from "../../utils/kiyoBacktester";
import BacktestComparison from "../BacktestComparison";
import { LongStringBacktestResults } from "./LongStringBacktestResults";
import { KiyoBacktestResults } from "./KiyoBacktestResults";

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
  const [backtestResults, setBacktestResults] = useState(null);
  const [longStringBacktestResults, setLongStringBacktestResults] = useState(null);
  const [kiyoBacktestResults, setKiyoBacktestResults] = useState(null);

  // Base tabs always visible
  const tabs = [
    { id: 'logs', label: 'Live Logs', icon: '📋' },
    { id: '2str', label: '2-str', icon: '2️⃣' },
    { id: '3str', label: '3-str', icon: '3️⃣' },
    { id: 'long', label: 'Long String', icon: '📝' },
    { id: 'kiyo', label: 'Kiyo', icon: '🎯' }, // NEW: Kiyo tracking tab
  ];

  // Add backtest tabs only in debug mode
  if (isDebugMode) {
    tabs.push({ id: 'backtest', label: 'Backtest', icon: '🔬' });
    tabs.push({ id: 'backtest-longstring', label: 'Backtest Long String', icon: '📊' });
    tabs.push({ id: 'backtest-kiyo', label: 'Backtest Kiyo', icon: '🎯' });
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

          {/* Kiyo Tab - Shows Kiyo-specific logs */}
          {activeTab === 'kiyo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Kiyo Mode Predictions (kind="3", source="kiyo")
                </div>
                <button
                  onClick={() => {
                    const kiyoLogs = debugLogs.filter((log) => log.kind === "3" && log.source === "kiyo");
                    if (kiyoLogs.length === 0) {
                      alert("No Kiyo logs to download");
                      return;
                    }
                    
                    // Create formatted export
                    let lines = [];
                    lines.push("═══════════════════════════════════════════════════════════");
                    lines.push("         KIYO MODE DEBUG EXPORT");
                    lines.push("═══════════════════════════════════════════════════════════");
                    lines.push("");
                    lines.push(`Generated: ${new Date().toLocaleString()}`);
                    lines.push(`Total Predictions: ${kiyoLogs.length}`);
                    lines.push("");
                    
                    // Timeline with wave predictions
                    lines.push("┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐");
                    lines.push("│  📊 COMPREHENSIVE TRACKING TABLE                                                                                              │");
                    lines.push("└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘");
                    lines.push("");
                    lines.push("Legend:");
                    lines.push("  Actual = What you got in-game");
                    lines.push("  Wave-C1 = Column 1 (Odds/Evens) - based on raw first digit");
                    lines.push("  Wave-C2/C3 = Wave predictions (digits suggested)");
                    lines.push("  Suggest = What wave card recommended (message)");
                    lines.push("  2str/3str = Prefix predictions");
                    lines.push("  ✓ = Hit, ✗ = Miss, - = No prediction");
                    lines.push("");

                    const header = [
                      "#".padEnd(3),
                      "Time".padEnd(12),
                      "Actual".padEnd(8),
                      "Wave-C1".padEnd(10),
                      "✓".padEnd(2),
                      "C1-Suggest".padEnd(12),
                      "Wave-C2".padEnd(10),
                      "✓".padEnd(2),
                      "C2-Suggest".padEnd(12),
                      "Wave-C3".padEnd(10),
                      "✓".padEnd(2),
                      "C3-Suggest".padEnd(12),
                      "2str-M".padEnd(6),
                      "✓".padEnd(2),
                      "2str-A".padEnd(6),
                      "✓".padEnd(2),
                      "3str-M".padEnd(6),
                      "✓".padEnd(2),
                      "3str-A".padEnd(6),
                      "✓".padEnd(2),
                    ].join(" ");

                    lines.push(header);
                    lines.push("─".repeat(160));

                    kiyoLogs.forEach((log, idx) => {
                      const actual = log.actual || "---";
                      const rawActual = log.rawActual || actual; // Use raw roll for Col 1
                      const rawD1 = rawActual[0] || "-"; // Raw first digit for Col 1
                      const actualD2 = actual[1] || "-"; // Translated for Col 2
                      const actualD3 = actual[2] || "-"; // Translated for Col 3

                      // Column 1 predictions (Odds/Evens based on RAW first digit)
                      const waveC1 = log.waveC1 ? `[${log.waveC1.join(",")}]` : "-";
                      const c1Hit = log.waveC1 && rawD1 !== "-" ? (log.waveC1.includes(rawD1) ? "✓" : "✗") : "-";
                      const c1Suggest = log.col1Expected ? log.col1Expected.substring(0, 12) : "-";

                      // Wave predictions
                      const waveC2 = log.waveC2 ? `[${log.waveC2.join(",")}]` : "-";
                      const waveC3 = log.waveC3 ? `[${log.waveC3.join(",")}]` : "-";

                      // Check wave hits
                      const c2Hit = log.waveC2 && actualD2 !== "-" ? (log.waveC2.includes(actualD2) ? "✓" : "✗") : "-";
                      const c3Hit = log.waveC3 && actualD3 !== "-" ? (log.waveC3.includes(actualD3) ? "✓" : "✗") : "-";

                      // Suggestions
                      const c2Suggest = log.col2Expected ? log.col2Expected.substring(0, 12) : "-";
                      const c3Suggest = log.col3Expected ? log.col3Expected.substring(0, 12) : "-";

                      // Prefix predictions: 2str
                      const p2m = log.pred2 || "-";
                      const h2m = p2m !== "-" && actual.startsWith(p2m) ? "✓" : (p2m !== "-" ? "✗" : "-");
                      const p2a = log.alt2 || "-";
                      const h2a = p2a !== "-" && actual.startsWith(p2a) ? "✓" : (p2a !== "-" ? "✗" : "-");
                      
                      // Prefix predictions: 3str
                      const p3m = log.pred3 || "-";
                      const h3m = p3m !== "-" && actual === p3m ? "✓" : (p3m !== "-" ? "✗" : "-");
                      const p3a = log.alt3 || "-";
                      const h3a = p3a !== "-" && actual === p3a ? "✓" : (p3a !== "-" ? "✗" : "-");

                      const row = [
                        String(idx + 1).padEnd(3),
                        (log.time || "—").padEnd(12),
                        actual.padEnd(8),
                        waveC1.padEnd(10),
                        c1Hit.padEnd(2),
                        c1Suggest.padEnd(12),
                        waveC2.padEnd(10),
                        c2Hit.padEnd(2),
                        c2Suggest.padEnd(12),
                        waveC3.padEnd(10),
                        c3Hit.padEnd(2),
                        c3Suggest.padEnd(12),
                        p2m.padEnd(6),
                        h2m.padEnd(2),
                        p2a.padEnd(6),
                        h2a.padEnd(2),
                        p3m.padEnd(6),
                        h3m.padEnd(2),
                        p3a.padEnd(6),
                        h3a.padEnd(2),
                      ].join(" ");

                      lines.push(row);
                      
                      // 5-minute window separator
                      if ((idx + 1) % 11 === 0 && idx + 1 < kiyoLogs.length) {
                        lines.push("─".repeat(160) + " ◄ 5-min window boundary");
                      }
                    });

                    lines.push("");
                    lines.push("");

                    const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : "0.0");
                    let c1Total = 0, c1Hits = 0, c2Total = 0, c2Hits = 0, c3Total = 0, c3Hits = 0;
                    let p2mTotal = 0, p2mHits = 0, p2aHits = 0;
                    let p3mTotal = 0, p3mHits = 0, p3aHits = 0;

                    kiyoLogs.forEach(log => {
                      const actual = String(log.actual || "");
                      const rawActual = String(log.rawActual || actual); // Raw for Col 1
                      const rawD1 = rawActual[0]; // Raw first digit
                      const d2 = actual[1]; // Translated for Col 2
                      const d3 = actual[2]; // Translated for Col 3
                      
                      // Column 1 Accuracy (Odds/Evens using RAW roll)
                      if (log.waveC1 && Array.isArray(log.waveC1) && log.waveC1.length > 0) {
                        c1Total++;
                        if (log.waveC1.includes(rawD1)) c1Hits++;
                      }
                      
                      // Wave Accuracy (using translated rolls)
                      if (log.waveC2 && Array.isArray(log.waveC2) && log.waveC2.length > 0) { 
                        c2Total++; 
                        if (log.waveC2.includes(d2)) c2Hits++; 
                      }
                      if (log.waveC3 && Array.isArray(log.waveC3) && log.waveC3.length > 0) { 
                        c3Total++; 
                        if (log.waveC3.includes(d3)) c3Hits++; 
                      }
                      
                      // 2-Str Prefix Accuracy
                      if (log.pred2) {
                        p2mTotal++;
                        if (actual.startsWith(log.pred2)) p2mHits++;
                        else if (log.alt2 && actual.startsWith(log.alt2)) p2aHits++;
                      }

                      // 3-Str Prefix Accuracy
                      if (log.pred3) {
                        p3mTotal++;
                        if (actual === log.pred3) p3mHits++;
                        else if (log.alt3 && actual === log.alt3) p3aHits++;
                      }
                    });

                    lines.push("┌─────────────────────────────────────────────────────────┐");
                    lines.push("│  📈 ACCURACY SUMMARY                                     │");
                    lines.push("└─────────────────────────────────────────────────────────┘");
                    lines.push("");
                    lines.push("WAVE PERFORMANCE:");
                    lines.push(`  Column 1 (Odds/Evens): ${c1Hits} / ${c1Total} (${pct(c1Hits, c1Total)}%)`);
                    lines.push(`  Column 2 (Outer/Inner): ${c2Hits} / ${c2Total} (${pct(c2Hits, c2Total)}%)`);
                    lines.push(`  Column 3 (Low/High): ${c3Hits} / ${c3Total} (${pct(c3Hits, c3Total)}%)`);
                    lines.push("");

                    lines.push("PREFIX PERFORMANCE:");
                    lines.push(`  2-Str Main: ${p2mHits} / ${p2mTotal} (${pct(p2mHits, p2mTotal)}%)`);
                    lines.push(`  2-Str Alt:  ${p2aHits} / ${p2mTotal} (${pct(p2aHits, p2mTotal)}%)`);
                    lines.push(`  2-Str Top2: ${(p2mHits + p2aHits)} / ${p2mTotal} (${pct(p2mHits + p2aHits, p2mTotal)}%)`);
                    lines.push("");
                    lines.push(`  3-Str Main: ${p3mHits} / ${p3mTotal} (${pct(p3mHits, p3mTotal)}%)`);
                    lines.push(`  3-Str Alt:  ${p3aHits} / ${p3mTotal} (${pct(p3aHits, p3mTotal)}%)`);
                    lines.push(`  3-Str Top2: ${(p3mHits + p3aHits)} / ${p3mTotal} (${pct(p3mHits + p3aHits, p3mTotal)}%)`);
                    lines.push("");

                    // Translated Rolls Section (4xx format)
                    lines.push("┌─────────────────────────────────────────────────────────┐");
                    lines.push("│  🎲 ALL ROLLS (Translated 4xx)                           │");
                    lines.push("└─────────────────────────────────────────────────────────┘");
                    lines.push("");
                    const allRolls = kiyoLogs.map(log => log.actual || "---").join(", ");
                    lines.push(allRolls);
                    lines.push("");

                    // Raw Rolls Section (original input)
                    lines.push("┌─────────────────────────────────────────────────────────┐");
                    lines.push("│  🎰 ALL ROLLS (Raw Input)                                │");
                    lines.push("└─────────────────────────────────────────────────────────┘");
                    lines.push("");
                    const allRawRolls = kiyoLogs.map(log => log.rawActual || log.actual || "---").join(", ");
                    lines.push(allRawRolls);
                    lines.push("");

                    lines.push("═══════════════════════════════════════════════════════════");
                    lines.push("Generated by Modern Kiyo Debug System");
                    lines.push("═══════════════════════════════════════════════════════════");
                    
                    const text = lines.join("\n");
                    
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `kiyo-debug-${new Date().toISOString().slice(0, 10)}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  📥 Download Kiyo Logs
                </button>
              </div>
              
              {debugLogs && debugLogs.length > 0 ? (
                debugLogs
                  .filter((log) => log.kind === "3" && log.source === "kiyo")
                  .slice(0, 50)
                  .map((log, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono bg-slate-950/50 p-3 rounded-lg border border-slate-700/30"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-slate-500">{log.time || "—"}</span>
                        <span className="text-cyan-400 font-bold pr-2">ROLL: {log.actual}</span>
                        {log.rawActual && (
                          <span className="text-amber-400 font-bold border-r border-slate-700 pr-2">Raw: {log.rawActual}</span>
                        )}
                        
                        {/* 2str Info */}
                        <div className="flex items-center gap-1 px-2 border-r border-slate-700">
                          <span className="text-slate-500">2s:</span>
                          <span className="text-emerald-400 font-mono">{log.pred2 || "—"}</span>
                          {log.pred2 && (String(log.actual).startsWith(log.pred2) ? <span className="text-green-500">✓M</span> : log.alt2 && String(log.actual).startsWith(log.alt2) ? <span className="text-blue-400">✓A</span> : <span className="text-red-500">✗</span>)}
                        </div>

                        {/* 3str Info */}
                        <div className="flex items-center gap-1 px-2">
                          <span className="text-slate-500">3s:</span>
                          <span className="text-amber-400 font-mono">{log.pred3 || "—"}</span>
                          {log.pred3 && (String(log.actual) === log.pred3 ? <span className="text-green-500">✓M</span> : log.alt3 && String(log.actual) === log.alt3 ? <span className="text-blue-400">✓A</span> : <span className="text-red-500">✗</span>)}
                        </div>
                      </div>
                      
                      {/* Column Predictions */}
                      {(log.col1Expected || log.col2Expected || log.col3Expected) && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
                            <div className="text-[10px] text-slate-500 mb-1">Column 1 (Odds/Evens) {log.rawActual && <span className="text-amber-400">Raw: {log.rawActual}</span>}</div>
                            <div className="text-emerald-300">
                              Suggest: {log.col1Expected || "—"}
                              {log.col1Confidence && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({Math.round(log.col1Confidence * 100)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] mt-1 text-slate-400">
                              {log.rawActual ? (
                                <>
                                  Result: {["1", "3", "5", "7"].includes(String(log.rawActual[0])) ? "Odd" : "Even"}
                                  {log.waveC1 && log.waveC1.length > 0 && (
                                    log.waveC1.includes(log.rawActual[0]) 
                                      ? <span className="text-green-400 font-bold ml-1">✓</span> 
                                      : <span className="text-red-400 font-bold ml-1">✗</span>
                                  )}
                                </>
                              ) : "—"}
                            </div>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                            <div className="text-[10px] text-slate-500 mb-1">Column 2 (Outer/Inner)</div>
                            <div className="text-blue-300">
                              Suggest: {log.col2Expected || "—"}
                              {log.col2Confidence && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({Math.round(log.col2Confidence * 100)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] mt-1 text-slate-400">
                              Result: {log.actual ? (["1", "4"].includes(log.actual[1]) ? "Outer" : "Inner") : "—"}
                            </div>
                          </div>
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                            <div className="text-[10px] text-slate-500 mb-1">Column 3 (Low/High)</div>
                            <div className="text-purple-300">
                              Suggest: {log.col3Expected || "—"}
                              {log.col3Confidence && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({Math.round(log.col3Confidence * 100)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] mt-1 text-slate-400">
                              Result: {log.actual ? (["1", "2"].includes(log.actual[2]) ? "Low" : "High") : "—"}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Wave Predictions */}
                      {(log.waveC2 || log.waveC3) && (
                        <div className="text-[10px] text-slate-500 border-t border-slate-700/30 pt-2">
                          <span className="text-blue-400">Wave C2: {JSON.stringify(log.waveC2) || "—"}</span>
                          <span className="mx-2">|</span>
                          <span className="text-purple-400">Wave C3: {JSON.stringify(log.waveC3) || "—"}</span>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-lg">
                  <div className="text-4xl mb-2">🎯</div>
                  <div>No Kiyo logs yet</div>
                  <div className="text-xs text-slate-600 mt-1">Start using Kiyo mode to see predictions here</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'backtest' && isDebugMode && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  🔬 Backtest Mode
                  {backtestResults && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      Re-simulation Active
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Import historical rolls to re-run the <strong>current predictor</strong> and compare accuracy.
                  <br />
                  <span className="text-slate-600">Format: Same as 2-str Export (Svarog Tracer Debug Export)</span>
                </p>
                
                <label className="block w-full px-6 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-sm text-center cursor-pointer transition-all transform hover:scale-[1.02]">
                  📁 Import File
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const text = String(reader.result || '');
                            // Parse the Svarog debug export format
                            const parsedLogs = parseSvarogExport(text);
                            
                            if (parsedLogs.length === 0) {
                              alert('No valid 2-str logs found in file');
                              return;
                            }
                            
                            // Import the logs first
                            if (onImportLogs) {
                              onImportLogs(parsedLogs);
                            }
                            
                            // Run backtest with the imported logs
                            const results = runBacktest(parsedLogs);
                            setBacktestResults(results);
                          } catch (err) {
                            console.error('Backtest import failed:', err);
                            alert('Failed to parse debug file: ' + err.message);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {!backtestResults ? (
                <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-lg">
                  <div className="text-4xl mb-2">📊</div>
                  <div>No backtest results yet.</div>
                  <div className="text-xs text-slate-600 mt-1">Import a file to begin re-simulation.</div>
                </div>
              ) : (
                <BacktestResultsDisplay results={backtestResults} debugLogs={debugLogs} />
              )}
            </div>
          )}

          {/* Long String Backtest Tab */}
          {activeTab === 'backtest-longstring' && isDebugMode && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  📊 Long String Backtest
                  {longStringBacktestResults && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      Analysis Complete
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Import a raw digit string (e.g., "1233212332123") to test the BBP predictor.
                  <br />
                  <span className="text-slate-600">The string will be decoded to 4xxx format and analyzed.</span>
                </p>
                
                <label className="block w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-sm text-center cursor-pointer transition-all transform hover:scale-[1.02]">
                  📁 Import String
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const text = String(reader.result || '').trim();
                            
                            if (!text) {
                              alert('File is empty');
                              return;
                            }
                            
                            // Run long string backtest
                            const results = runLongStringBacktest(text);
                            
                            if (results.error) {
                              alert(results.error);
                              return;
                            }
                            
                            setLongStringBacktestResults(results);
                          } catch (err) {
                            console.error('Long string backtest failed:', err);
                            alert('Failed to parse string: ' + err.message);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {!longStringBacktestResults ? (
                <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-lg">
                  <div className="text-4xl mb-2">📊</div>
                  <div>No results yet.</div>
                  <div className="text-xs text-slate-600 mt-1">Import a digit string to begin analysis.</div>
                </div>
              ) : (
                <LongStringBacktestResults results={longStringBacktestResults} />
              )}
            </div>
          )}

          {/* Kiyo Backtest Tab */}
          {activeTab === 'backtest-kiyo' && isDebugMode && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  🎯 Kiyo Backtest
                  {kiyoBacktestResults && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                      Analysis Complete
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Import a Kiyo debug export file to analyze wave predictions.
                  <br />
                  <span className="text-slate-600">Shows Column 2 (Outer/Inner) and Column 3 (Low/High) accuracy.</span>
                </p>
                
                <label className="block w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-sm text-center cursor-pointer transition-all transform hover:scale-[1.02]">
                  📁 Import Kiyo Debug Export
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const text = String(reader.result || '');
                            
                            if (!text) {
                              alert('File is empty');
                              return;
                            }
                            
                            // Run Kiyo backtest
                            const results = runKiyoBacktest(text);
                            
                            if (results.error) {
                              alert(results.error);
                              return;
                            }
                            
                            setKiyoBacktestResults(results);
                          } catch (err) {
                            console.error('Kiyo backtest failed:', err);
                            alert('Failed to parse Kiyo debug export: ' + err.message);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>

              {!kiyoBacktestResults ? (
                <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-lg">
                  <div className="text-4xl mb-2">🎯</div>
                  <div>No results yet.</div>
                  <div className="text-xs text-slate-600 mt-1">Import a Kiyo debug export to begin analysis.</div>
                </div>
              ) : (
                <KiyoBacktestResults results={kiyoBacktestResults} />
              )}
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

// Helper component to display backtest results
function BacktestResultsDisplay({ results, debugLogs }) {
  if (!results || !results.sessions || results.sessions.length === 0) {
    return <div className="text-xs text-slate-400">No session data available.</div>;
  }

  const latestSession = results.sessions[results.sessions.length - 1];
  const detailRows = (latestSession.details || []).filter(d => !d.skip && d.pred);
  
  const mainHits = detailRows.filter(d => d.hitMain).length;
  const altHits = detailRows.filter(d => !d.hitMain && d.hitAlt).length;
  const misses = detailRows.length - mainHits - altHits;

  return (
    <div className="space-y-4">
      {/* Session Info */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
        <div className="text-slate-400 text-xs mb-1">Session Info:</div>
        <div className="font-mono text-sm text-slate-200">
          Session #{results.sessions.length} — {detailRows.length} predictions re-run
        </div>
        <div className="text-xs text-slate-500 mt-1">
          ✨ Predictor re-analyzed each roll with current algorithm
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <div className="text-green-400 font-bold text-2xl">{mainHits}</div>
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Main Hits</div>
          <div className="text-green-300 text-xs mt-1">
            {detailRows.length > 0 ? Math.round((mainHits / detailRows.length) * 100) : 0}%
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <div className="text-blue-400 font-bold text-2xl">{altHits}</div>
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Alt Hits</div>
          <div className="text-blue-300 text-xs mt-1">
            {detailRows.length > 0 ? Math.round((altHits / detailRows.length) * 100) : 0}%
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <div className="text-red-400 font-bold text-2xl">{misses}</div>
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mt-1">Misses</div>
          <div className="text-red-300 text-xs mt-1">
            {detailRows.length > 0 ? Math.round((misses / detailRows.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Combined Accuracy */}
      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-lg p-3">
        <div className="text-xs text-slate-400 mb-1">Combined Accuracy (Main + Alt):</div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {detailRows.length > 0 ? Math.round(((mainHits + altHits) / detailRows.length) * 100) : 0}%
          </div>
          <div className="text-sm text-slate-400">
            ({mainHits + altHits}/{detailRows.length})
          </div>
        </div>
      </div>

      {/* Roll-by-Roll Comparison */}
      <BacktestComparison sessionStats={{ detailRows }} />
    </div>
  );
}

// Parse Svarog Tracer Debug Export format
function parseSvarogExport(text) {
  const rawLines = text.split(/\r?\n/);
  
  // Find the 2-str section
  let start = rawLines.findIndex(l => l.trim().startsWith('--- 2-str'));
  if (start === -1) return [];
  
  start += 1; // Skip the section header
  let end = rawLines.length;
  
  // Find where 2-str section ends
  for (let i = start; i < rawLines.length; i++) {
    const t = rawLines[i].trim();
    if (t.startsWith('---') && !t.startsWith('--- 2-str')) {
      end = i;
      break;
    }
  }
  
  const sectionLines = rawLines
    .slice(start, end)
    .map(l => l.trim())
    .filter(Boolean);
  
  const logs = [];
  
  for (const line of sectionLines) {
    if (!line.includes('2-str')) continue;
    
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 3) continue;
    
    const first = parts[0];
    
    // Parse timestamp
    let ts = Date.now();
    const timeMatch = first.match(/\[(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\]/);
    if (timeMatch) {
      let [, hh, mm, ss, ampm] = timeMatch;
      let h = parseInt(hh, 10);
      const m = parseInt(mm, 10);
      const s = parseInt(ss, 10);
      
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      
      const d = new Date();
      d.setHours(h, m, s, 0);
      ts = d.getTime();
    }
    
    // Parse prediction
    const predMatch = first.match(/pred:\s*(\d{2}|—)\s*\((\d+)%\)/);
    if (!predMatch) continue;
    const predRaw = predMatch[1];
    const confPct = parseInt(predMatch[2], 10) || 0;
    const pred = predRaw === '—' ? '—' : predRaw;
    
    // Parse alt
    const altPart = parts.find(p => p.startsWith('alt:'));
    const altMatch = altPart ? altPart.match(/alt:\s*(\d{2})/) : null;
    const alt = altMatch ? altMatch[1] : null;
    
    // Parse mode
    const modePart = parts.find(p => p.startsWith('mode:'));
    const mode = modePart ? modePart.replace(/^mode:\s*/, '').trim() : 'imported';
    
    // Parse pattern
    const patternPart = parts.find(p => p.startsWith('Pattern:'));
    const pattern = patternPart ? patternPart.replace(/^Pattern:\s*/, '').trim() : '';
    
    // Parse distribution
    const distPart = parts.find(p => p.startsWith('Dist:'));
    let distribution = null;
    if (distPart) {
      const distStr = distPart.replace(/^Dist:\s*/, '').trim();
      distribution = {};
      distStr.split(',').forEach(item => {
        const [val, pctStr] = item.split(':');
        if (val && pctStr) {
          const pct = parseInt(pctStr.replace('%', ''), 10);
          distribution[val.trim()] = { pct };
        }
      });
    }
    
    // Parse actual
    const actualPart = parts.find(p => p.startsWith('actual:'));
    const actualMatch = actualPart ? actualPart.match(/actual:\s*(\d{2})/) : null;
    const actual = actualMatch ? actualMatch[1] : null;
    if (!actual) continue;
    
    // Parse context
    const ctxPart = parts.find(p => p.startsWith('ctx:'));
    let ctx = [];
    if (ctxPart) {
      ctx = ctxPart
        .replace(/^ctx:\s*/, '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);
    }
    
    logs.push({
      ts,
      kind: '2',
      prediction: pred,
      confidence: confPct / 100,
      alt,
      mode,
      pattern,
      distribution,
      actual,
      ctx,
      candidates: [],
      source: 'imported',
    });
  }
  
  return logs;
}
