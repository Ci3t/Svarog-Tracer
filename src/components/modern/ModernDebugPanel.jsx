// Simplified Modern Debug Panel - keeping core functionality
import React, { useState, useMemo, useRef } from "react";
import { exportDebugLogsToTXT } from "../../utils/exportHelpers";
import ModernLongStringCard from "./ModernLongStringCard";
import { runBacktest } from "../../utils/backtester";
import { runLongStringBacktest } from "../../utils/longStringBacktester";
import { runKiyoBacktest } from "../../utils/kiyoBacktester";
import BacktestComparison from "../BacktestComparison";
import { LongStringBacktestResults } from "./LongStringBacktestResults";
import { KiyoBacktestResults } from "./KiyoBacktestResults";
import { analyze2strWave } from "../../utils/kiyoPrefixWave";

export default function ModernDebugPanel({
  debugLogs,
  entries = [], // 🔥 NEW
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
  const kiyoExportButtonRef = useRef(null);

  // 2str wave pairing detection for live Kiyo table
  const kiyoLogsForDisplay = useMemo(() =>
    (debugLogs || []).filter(l => l.kind === '3' && l.source === 'kiyo'),
    [debugLogs]
  );
  const livePairing2str = useMemo(() =>
    analyze2strWave(kiyoLogsForDisplay.map(l => l.actual).filter(Boolean)),
    [kiyoLogsForDisplay]
  );
  const getGroupBadge2str = (roll) => {
    if (!livePairing2str?.pairing || !roll) return null;
    const y = String(roll)[1];
    const isA = livePairing2str.pairing.pairA.includes(y);
    const isB = livePairing2str.pairing.pairB.includes(y);
    if (!isA && !isB) return null;
    return { label: isA ? livePairing2str.pairing.pairALabel : livePairing2str.pairing.pairBLabel, isA, pairingName: livePairing2str.pairingName };
  };

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

  const handleQuickKiyoExport = () => {
    const kiyoLogs = (debugLogs || []).filter((log) => log.kind === "3" && log.source === "kiyo");
    if (kiyoLogs.length === 0) {
      alert("No Kiyo logs to download");
      return;
    }

    if (activeTab !== "kiyo") {
      setActiveTab("kiyo");
      setTimeout(() => {
        kiyoExportButtonRef.current?.click();
      }, 0);
      return;
    }

    kiyoExportButtonRef.current?.click();
  };

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
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
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
              onClick={() => exportDebugLogsToTXT(debugLogs, entries)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              📥 Export Live/Lab TXT
            </button>
            <button
              onClick={handleQuickKiyoExport}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              🎯 Export Kiyo TXT
            </button>
            <button
              onClick={onClearLogs}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all duration-200 transform hover:scale-[1.02]"
            >
              Clear All Logs
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.id
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
                  ref={kiyoExportButtonRef}
                  onClick={() => {
                    try {
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
                      lines.push("  Actual        = What you got in-game");
                      lines.push("  Y-Grp         = Which side of active pairing (Outer/Inner/High/Low/Even/Odd)");
                      lines.push("  Mode          = Session type: DOMINANT / RUN-N3 / ALTERNATING / AMBIGUOUS / CHAOTIC");
                      lines.push("  Wave-Verdict  = DOM / HOLD / FLIP / WAIT signal from 2-str wave");
                      lines.push("  WaveBet       = Rolls the WAVE card said to bet on");
                      lines.push("  WaveHit       = ✓ if WaveBet won, ✗ = miss, - = no bet");
                      lines.push("  TableBet      = Rolls the TABLE (dominant pairing streak) said to bet on");
                      lines.push("  TableHit      = ✓ if TableBet won, ✗ = miss, - = no bet");
                      lines.push("");

                      // Pre-compute 2str wave pairing from session rolls
                      const sessionRollsAll = kiyoLogs.map(l => l.actual).filter(Boolean);
                      const finalW2 = analyze2strWave(sessionRollsAll);
                      const getYGroup = (roll) => {
                        if (!finalW2?.pairing || !roll) return '-';
                        const y = String(roll)[1];
                        if (finalW2.pairing.pairA.includes(y)) return finalW2.pairing.pairALabel;
                        if (finalW2.pairing.pairB.includes(y)) return finalW2.pairing.pairBLabel;
                        return '-';
                      };
                      if (finalW2) {
                        lines.push(`Session pairing: ${finalW2.pairingName} — A:${finalW2.pairing.pairALabel}[4${finalW2.pairing.pairA.join('/4')}] vs B:${finalW2.pairing.pairBLabel}[4${finalW2.pairing.pairB.join('/4')}]`);
                        lines.push("");
                      }

                      const header = [
                        "#".padEnd(3),
                        "Time".padEnd(12),
                        "Actual".padEnd(8),
                        "Y-Grp".padEnd(8),
                        "Mode".padEnd(13),
                        "Wave-Verdict".padEnd(26),
                        "WaveBet".padEnd(10),
                        "WaveHit".padEnd(9),
                        "TableBet".padEnd(10),
                        "TableHit".padEnd(9),
                      ].join(" ");

                      lines.push(header);
                      lines.push("─".repeat(108));

                      // Pre-compute wave snapshot at each roll (oldest → newest)
                      // Thread hysteresis lock through each step to match live behaviour
                      const chronoRolls = [...kiyoLogs].reverse().map(l => l.actual).filter(Boolean);
                      const w2Snapshots = [];
                      let _lockedPairing = null;
                      for (let i = 0; i < chronoRolls.length; i++) {
                        if (i < 2) { w2Snapshots.push(null); continue; }
                        const snap = analyze2strWave(chronoRolls.slice(0, i + 1), _lockedPairing);
                        if (snap && snap.pairingConfidence >= 0.55 && !snap.isAmbiguous) {
                          _lockedPairing = snap.pairing.name;
                        }
                        w2Snapshots.push(snap);
                      }


                      let betHitTotal = 0, betHitHits = 0;
                      let tableHitTotal = 0, tableHitHits = 0;

                      // TABLE pairing definitions (mirrors WavePairingTable.jsx)
                      const TABLE_PAIRINGS = [
                        { key: "41/44", sideA: ["41", "44"], sideB: ["42", "43"], sideAName: "Outer", sideBName: "Inner" },
                        { key: "42/44", sideA: ["42", "44"], sideB: ["41", "43"], sideAName: "Even", sideBName: "Odd" },
                        { key: "43/44", sideA: ["43", "44"], sideB: ["41", "42"], sideAName: "High", sideBName: "Low" },
                      ];

                      // Compute TABLE bet at each roll (snapshot of last N rolls up to this point)
                      const getTableBet = (rollsUpTo) => {
                        if (!rollsUpTo || rollsUpTo.length < 3) return "—";
                        const recent = rollsUpTo.slice(-12).map(r => String(r).slice(0, 2)).filter(r => ["41", "42", "43", "44"].includes(r));
                        if (recent.length < 3) return "—";

                        const colStats = TABLE_PAIRINGS.map(p => {
                          const aCount = recent.filter(r => p.sideA.includes(r)).length;
                          const bCount = recent.filter(r => p.sideB.includes(r)).length;
                          const total = aCount + bCount;
                          const domPct = total > 0 ? Math.round(Math.max(aCount, bCount) / total * 100) : 0;
                          const sides = recent.map(r => p.sideA.includes(r) ? 'A' : p.sideB.includes(r) ? 'B' : null);
                          const firstValid = sides.find(s => s !== null);
                          let streakLen = 0;
                          if (firstValid) {
                            for (const s of sides) {
                              if (s === firstValid) streakLen++;
                              else if (s !== null) break;
                            }
                          }
                          const streakSide = firstValid;
                          const streakRolls = streakSide === 'A' ? p.sideA : p.sideB;
                          return { key: p.key, domPct, streakLen, streakSide, streakRolls, total };
                        });

                        const withStreak = colStats.filter(s => s.streakLen >= 4).sort((a, b) => b.streakLen - a.streakLen || b.domPct - a.domPct);
                        const bestByDom = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];
                        const chosen = withStreak[0] ?? bestByDom;
                        if (!chosen || !chosen.streakRolls) return "—";
                        return chosen.streakRolls.join("/");
                      };

                      kiyoLogs.forEach((log, idx) => {
                        const actual = log.actual || "---";
                        const rawActual = log.rawActual || actual;
                        const actualD2 = actual[1] || "-";

                        // Wave snapshot for this roll (newest first → index in chrono is reversed)
                        const chronoIdx = chronoRolls.length - 1 - idx;
                        const snap = chronoIdx > 0 ? w2Snapshots[chronoIdx - 1] : null;
                        let waveVerdict = "—";
                        let betRollsStr = "—";
                        let waveHit = "-";
                        if (snap) {
                          const a = snap.action;
                          if (a === 'DOMINANT')
                            waveVerdict = `DOM ${snap.dominantLabel}(${snap.dominantPct}%)`;
                          else if (a === 'FLIP')
                            waveVerdict = `FLIP→${snap.flipLabel} (${snap.runLength}/${snap.dominantN})`;
                          else if (a === 'HOLD')
                            waveVerdict = `HOLD ${snap.currentLabel} (${snap.runLength}/${snap.dominantN})`;
                          else
                            waveVerdict = a || "—";
                          if (snap.betRolls) {
                            betRollsStr = snap.betRolls.join("/");
                            const hit = snap.betRolls.some(b => actual.startsWith(b));
                            waveHit = hit ? "✓" : "✗";
                            if (betRollsStr !== "—") { betHitTotal++; if (hit) betHitHits++; }
                          }
                        }

                        const tableBetStr = getTableBet(chronoRolls.slice(0, chronoIdx));
                        let tableHit = "-";
                        if (tableBetStr !== "—") {
                          const tRolls = tableBetStr.split("/");
                          const hit = tRolls.some(b => actual.startsWith(b));
                          tableHit = hit ? "✓" : "✗";
                          tableHitTotal++;
                          if (hit) tableHitHits++;
                        }

                        const row = [
                          String(idx + 1).padEnd(3),
                          (log.time || "—").padEnd(12),
                          actual.padEnd(8),
                          getYGroup(actual).padEnd(8),
                          (snap?.sessionMode || "—").padEnd(13),
                          waveVerdict.padEnd(26),
                          betRollsStr.padEnd(10),
                          waveHit.padEnd(9),
                          tableBetStr.padEnd(10),
                          tableHit.padEnd(9),
                        ].join(" ");

                        lines.push(row);

                        if ((idx + 1) % 11 === 0 && idx + 1 < kiyoLogs.length) {
                          lines.push("─".repeat(108) + " ◄ 5-min window");
                        }
                      });

                      const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : "0.0");

                      // ── Accuracy summary ──────────────────────────────────────────────────

                      lines.push("┌─────────────────────────────────────────────────────────┐");
                      lines.push("│  📈 ACCURACY SUMMARY                                     │");
                      lines.push("└─────────────────────────────────────────────────────────┘");
                      lines.push("");
                      lines.push("WAVE BET PERFORMANCE:");
                      lines.push(`  🌊 WaveBet  : ${betHitHits} / ${betHitTotal} (${pct(betHitHits, betHitTotal)}%)`);
                      lines.push(`  📊 TableBet : ${tableHitHits} / ${tableHitTotal} (${pct(tableHitHits, tableHitTotal)}%)`);
                      lines.push("");

                      // ── Verdict type breakdown ────────────────────────────────────────────
                      lines.push("VERDICT TYPE BREAKDOWN:");
                      const verdictStats = {};
                      chronoRolls.forEach((actual, i) => {
                        const snap = i > 0 ? w2Snapshots[i - 1] : null;
                        if (!snap || !snap.betRolls) return;
                        const a = snap.action || 'OTHER';
                        if (!verdictStats[a]) verdictStats[a] = { total: 0, hits: 0 };
                        verdictStats[a].total++;
                        if (snap.betRolls.some(b => actual.startsWith(b))) verdictStats[a].hits++;
                      });
                      const verdictOrder = ['DOMINANT', 'LEAN', 'HOLD', 'FLIP'];
                      verdictOrder.forEach(v => {
                        if (verdictStats[v]) {
                          const s = verdictStats[v];
                          const bar = '█'.repeat(Math.round(s.hits / s.total * 10)) + '░'.repeat(10 - Math.round(s.hits / s.total * 10));
                          lines.push(`  ${v.padEnd(9)}: ${String(s.hits).padStart(2)}/${s.total} (${pct(s.hits, s.total)}%) [${bar}]`);
                        }
                      });
                      lines.push("");

                      // ── Confidence-tier accuracy ──────────────────────────────────────────
                      lines.push("CONFIDENCE TIER ACCURACY:");
                      lines.push("  (How often wave bet wins when confidence is high vs low)");
                      const tier = { high: { h: 0, t: 0 }, mid: { h: 0, t: 0 }, low: { h: 0, t: 0 } };
                      chronoRolls.forEach((actual, i) => {
                        const snap = i > 0 ? w2Snapshots[i - 1] : null;
                        if (!snap || !snap.betRolls) return;
                        const confPct = snap.action === 'DOMINANT'
                          ? snap.dominantPct
                          : Math.round((snap.confidence || 0.5) * 100);
                        const hit = snap.betRolls.some(b => actual.startsWith(b));
                        if (confPct >= 70) { tier.high.t++; if (hit) tier.high.h++; }
                        else if (confPct >= 60) { tier.mid.t++; if (hit) tier.mid.h++; }
                        else { tier.low.t++; if (hit) tier.low.h++; }
                      });
                      if (tier.high.t > 0) lines.push(`  ≥ 70% conf : ${tier.high.h}/${tier.high.t} (${pct(tier.high.h, tier.high.t)}%) ← strong signal`);
                      if (tier.mid.t > 0) lines.push(`  60–69% conf: ${tier.mid.h}/${tier.mid.t}  (${pct(tier.mid.h, tier.mid.t)}%)`);
                      if (tier.low.t > 0) lines.push(`  < 60% conf : ${tier.low.h}/${tier.low.t}  (${pct(tier.low.h, tier.low.t)}%) ← weak, skip bet`);
                      lines.push(`  Recommendation: only bet when conf ≥ ${tier.high.t > 0 && pct(tier.high.h, tier.high.t) >= 70 ? 70 : 65}%`);


                      // ── Baseline: always bet dominant side ───────────────────────────────
                      lines.push("BASELINE COMPARISON:");
                      const finalW2full = analyze2strWave(chronoRolls);
                      if (finalW2full?.dominantPrefixes) {
                        const domPfx = finalW2full.dominantPrefixes;
                        const naiveHits = chronoRolls.filter(r => domPfx.some(b => r.startsWith(b))).length;
                        const naivePct = pct(naiveHits, chronoRolls.length);
                        lines.push(`  Always bet dominant (${finalW2full.dominantLabel}): ${naiveHits}/${chronoRolls.length} (${naivePct}%)`);
                        lines.push(`  Wave Bet:                                          ${betHitHits}/${betHitTotal} (${pct(betHitHits, betHitTotal)}%)`);
                        const gain = ((betHitHits / betHitTotal) - (naiveHits / chronoRolls.length)) * 100;
                        lines.push(`  Delta vs naive:  ${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%`);
                      }
                      lines.push("");

                      // ── Run streak visualization ──────────────────────────────────────────
                      lines.push("Y-SEQUENCE RUNS (oldest→newest):");
                      if (finalW2full?.states && finalW2full?.pairing) {
                        const states = finalW2full.states;
                        const pa = finalW2full.pairing;
                        let runStr = "";
                        let prev = states[0]; let len = 1;
                        const labelOf = s => s === 'A' ? pa.pairALabel[0] : pa.pairBLabel[0];
                        for (let i = 1; i < states.length; i++) {
                          if (states[i] === prev) { len++; }
                          else { runStr += `${labelOf(prev)}(${len}) → `; prev = states[i]; len = 1; }
                        }
                        runStr += `${labelOf(prev)}(${len})`;
                        lines.push("  " + runStr);
                        // N analysis
                        const runLens = [];
                        let prev2 = states[0]; let len2 = 1;
                        for (let i = 1; i < states.length; i++) {
                          if (states[i] === prev2) len2++;
                          else { runLens.push(len2); prev2 = states[i]; len2 = 1; }
                        }
                        runLens.push(len2);
                        const avgRun = (runLens.reduce((a, b) => a + b, 0) / runLens.length).toFixed(1);
                        const maxRun = Math.max(...runLens);
                        lines.push(`  Avg run length: ${avgRun} · Max run: ${maxRun} · N (mode): ${finalW2full.dominantN}`);
                      }
                      lines.push("");

                      // ── Early vs late accuracy ────────────────────────────────────────────
                      lines.push("EARLY vs LATE ACCURACY:");
                      const half = Math.floor(chronoRolls.length / 2);
                      let earlyHits = 0, earlyTotal = 0, lateHits = 0, lateTotal = 0;
                      chronoRolls.forEach((actual, i) => {
                        const snap = i > 0 ? w2Snapshots[i - 1] : null;
                        if (!snap?.betRolls) return;
                        const hit = snap.betRolls.some(b => actual.startsWith(b));
                        if (i < half) { earlyTotal++; if (hit) earlyHits++; }
                        else { lateTotal++; if (hit) lateHits++; }
                      });
                      lines.push(`  First half (${half} rolls): ${earlyHits}/${earlyTotal} (${pct(earlyHits, earlyTotal)}%) — pairing still learning`);
                      lines.push(`  Second half (${chronoRolls.length - half} rolls): ${lateHits}/${lateTotal} (${pct(lateHits, lateTotal)}%) — pairing stable`);
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

                      // 2-String Wave Analysis — computed from session rolls
                      lines.push("┌─────────────────────────────────────────────────────────┐");
                      lines.push("│  🌊 2-STRING WAVE ANALYSIS                               │");
                      lines.push("└─────────────────────────────────────────────────────────┘");
                      lines.push("");
                      const sessionRollsFor2str = kiyoLogs.map(l => l.actual).filter(Boolean);
                      const is2strOnly = sessionRollsFor2str.every(r => String(r).length <= 2);
                      const w2 = analyze2strWave(sessionRollsFor2str);
                      if (is2strOnly) lines.push("⚠️  2-str only session — C2/C3 (Z-digit) columns are N/A");
                      lines.push("");
                      if (w2) {
                        lines.push(`Pairing Detected : ${w2.pairingName}${w2.pairingConfidence >= 0.6 ? ' ★' : ' (low confidence)'}`);
                        lines.push(`Session Mode     : ${w2.sessionMode || '—'}`);
                        lines.push(`Confidence Score : ${Math.round(w2.pairingConfidence * 100)}%`);
                        lines.push(`Dominant Side    : ${w2.dominantLabel} [${(w2.dominantPrefixes || []).join(' / ')}] — ${w2.dominantPct}% of rolls${w2.isDominant ? ' 🏆 DOMINANT' : ''}`);
                        if (!w2.isDominant) {
                          lines.push(`Flip N           : ${w2.dominantN} (rolls before side flip)`);
                          lines.push(`Current Run      : ${w2.currentLabel} [${(w2.currentPrefixes || []).join(' / ')}] — ${w2.runLength} consecutive`);
                        }
                        lines.push(`VERDICT          : ${w2.message}`);
                        lines.push(`Next Bet         : ${w2.betRolls ? w2.betRolls.join(' or ') : '—'}`);
                        lines.push("");
                        lines.push("Y-Sequence (all rolls, oldest first):");
                        if (w2.pairing && w2.states) {
                          const labels = w2.states.map(s => s === 'A' ? w2.pairing.pairALabel[0] : w2.pairing.pairBLabel[0]);
                          for (let i = 0; i < labels.length; i += 20) {
                            lines.push("  " + labels.slice(i, i + 20).join(" "));
                          }
                        }
                        lines.push("");
                        lines.push(`Pairing scores   : ${w2.allPairings.map(p => `${p.pairing.name}:${Math.round(p.score * 100)}%`).join(' | ')}`);
                      } else {
                        lines.push("Not enough rolls yet (need 3+).");
                      }
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
                    } catch (err) { alert('Download error: ' + err?.message); }
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-semibold rounded-lg transition-all"
                >
                  🎯 Export Kiyo TXT
                </button>
              </div>

              {kiyoLogsForDisplay.length > 0 ? (
                kiyoLogsForDisplay.slice(0, 50).map((log, idx) => (
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
                      {/* 2str Wave Pairing Group badge */}
                      {(() => {
                        const g = getGroupBadge2str(log.actual);
                        if (!g) return null;
                        return (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${g.isA ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                            {g.pairingName}: {g.label}
                          </span>
                        );
                      })()}
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
                        <div className="bg-slate-500/10 border border-slate-500/30 rounded p-2">
                          <div className="text-[10px] text-slate-500 mb-1">2str Wave Group</div>
                          {(() => {
                            const g = getGroupBadge2str(log.actual);
                            return g ? (
                              <div className={`text-[11px] font-bold ${g.isA ? 'text-indigo-300' : 'text-amber-300'}`}>
                                {g.pairingName}: {g.label}
                              </div>
                            ) : <div className="text-slate-600 text-[10px]">Detecting...</div>;
                          })()}
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
