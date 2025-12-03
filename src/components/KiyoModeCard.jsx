import React, { useState, useMemo, useEffect, useRef } from "react";
import { predictNext3EU } from "../utils/predictNext";
import { translateTo4 } from "../utils/stringHelpers";

const EU_TRAINING_DATA = {
  413: 102,
  422: 108,
  423: 56,
  432: 174,
  433: 96,
  441: 80,
  443: 136,
  444: 142,
  411: 122,
  442: 92,
  412: 108,
  414: 146,
  424: 98,
  431: 108,
  434: 106,
  421: 102,
};

export default function KiyoModeCard({ entries, onSendToDebug }) {
  const [testInput, setTestInput] = useState("");
  const [testRolls, setTestRolls] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const lastSentRef = useRef(null);
  const [, forceUpdate] = useState();

  const live3Rolls = useMemo(() => {
    return entries
      .map((e) => (e.s3 || "").replace(/0+$/, ""))
      .filter((r) => r.length === 3)
      .reverse();
  }, [entries]);

  const translatedTestRolls = useMemo(() => {
    return testRolls.map((roll) => {
      const translated = translateTo4(roll);
      return translated || roll;
    });
  }, [testRolls]);

  const combinedRolls = useMemo(() => {
    return [...translatedTestRolls, ...live3Rolls];
  }, [translatedTestRolls, live3Rolls]);

  const prediction = (() => {
    if (combinedRolls.length < 6) return null;
    return predictNext3EU([...combinedRolls]);
  })();

  useEffect(() => {
    forceUpdate({});
  }, [combinedRolls.length, testRolls.length]);

  useEffect(() => {
    if (!prediction || combinedRolls.length < 6) return;

    const fingerprint = combinedRolls.join(",");

    if (lastSentRef.current !== fingerprint) {
      lastSentRef.current = fingerprint;
      onSendToDebug?.(combinedRolls, "3-str");
    }
  }, [prediction, combinedRolls, onSendToDebug]);

  const handleTestRollSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = testInput.trim();

      if (value.length === 3 && /^[1-4]{3}$/.test(value)) {
        setTestRolls((prev) => [...prev, value]);
        setTestInput("");
      } else {
        setTestInput("");
      }
    }
  };

  const handleDeleteTestRoll = (idx) => {
    setTestRolls((prev) => prev.filter((_, i) => i !== idx));
  };

  const trainingStats = useMemo(() => {
    const total = Object.values(EU_TRAINING_DATA).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(EU_TRAINING_DATA)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return { total, patterns: sorted };
  }, []);

  const combinedDataset = useMemo(() => {
    const combined = { ...EU_TRAINING_DATA };

    live3Rolls.forEach((roll) => {
      combined[roll] = (combined[roll] || 0) + 1;
    });

    const total = Object.values(combined).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(combined)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return { total, patterns: sorted, liveCount: live3Rolls.length };
  }, [live3Rolls]);

  // 🔥 NEW: Analyze wave patterns and detect flips
  // Replace the entire analyzeWavePatterns function with this:
  // Replace the analyzeWavePatterns function with this CORRECTED version:

  const analyzeWavePatterns = () => {
    if (combinedRolls.length < 6) return null;

    const last6 = combinedRolls.slice(-6);
    const lastRoll = combinedRolls[combinedRolls.length - 1];

    const schemes = {
      col1: {
        name: "Column 1",
        label: "Odds/Evens",
        pairA: ["1", "3"],
        pairB: ["2", "4"],
        pairALabel: "Odds (1/3)",
        pairBLabel: "Evens (2/4)",
      },
      col2: {
        name: "Column 2",
        label: "Outer/Inner",
        pairA: ["1", "4"],
        pairB: ["2", "3"],
        pairALabel: "Outer (1/4)",
        pairBLabel: "Inner (2/3)",
      },
      col3: {
        name: "Column 3",
        label: "Low/High",
        pairA: ["1", "2"],
        pairB: ["3", "4"],
        pairALabel: "Low (1/2)",
        pairBLabel: "High (3/4)",
      },
    };

    const columnAnalysis = {};

    Object.entries(schemes).forEach(([colKey, scheme]) => {
      let aCountRecent = 0,
        bCountRecent = 0;

      // Count last 6 rolls
      last6.forEach((roll) => {
        const lastDigit = roll[2];
        if (scheme.pairA.includes(lastDigit)) {
          aCountRecent++;
        } else if (scheme.pairB.includes(lastDigit)) {
          bCountRecent++;
        }
      });

      const recentTotal = aCountRecent + bCountRecent;
      const aDominance = recentTotal > 0 ? aCountRecent / recentTotal : 0;
      const bDominance = recentTotal > 0 ? bCountRecent / recentTotal : 0;

      // 🔥 FIX: Identify what's ACTUALLY dominating
      let currentLabel;
      let dominantLabel;
      let oppositeLabel;

      if (aDominance > bDominance) {
        // A is dominating
        currentLabel = scheme.pairALabel;
        dominantLabel = scheme.pairALabel;
        oppositeLabel = scheme.pairBLabel;
      } else if (bDominance > aDominance) {
        // B is dominating
        currentLabel = scheme.pairBLabel;
        dominantLabel = scheme.pairBLabel;
        oppositeLabel = scheme.pairALabel;
      } else {
        // Balanced - check last roll
        const lastDigit = lastRoll[2];
        const lastIsA = scheme.pairA.includes(lastDigit);
        currentLabel = lastIsA ? scheme.pairALabel : scheme.pairBLabel;
        dominantLabel = currentLabel;
        oppositeLabel = lastIsA ? scheme.pairBLabel : scheme.pairALabel;
      }

      let status = "balanced";
      let confidence = 0;

      // 🔥 FIX: Only trigger flip if truly dominated (55%+)
      if (aDominance >= 0.55) {
        status = "expect_flip";
        confidence = aDominance;
      } else if (bDominance >= 0.55) {
        status = "expect_flip";
        confidence = bDominance;
      } else if (aDominance >= 0.5 && aDominance < 0.55) {
        status = "slight_favor_a";
        confidence = aDominance;
      } else if (bDominance > 0.5 && bDominance < 0.55) {
        status = "slight_favor_b";
        confidence = bDominance;
      }

      columnAnalysis[colKey] = {
        scheme,
        aCountRecent,
        bCountRecent,
        status,
        dominantLabel, // What's ACTUALLY dominating
        oppositeLabel, // What we expect (if flip happens)
        currentLabel, // Same as dominant
        confidence: (confidence * 100).toFixed(0),
      };
    });

    const predictableCols = Object.entries(columnAnalysis)
      .filter(([_, col]) => col.status === "expect_flip")
      .sort((a, b) => {
        const confA = parseFloat(a[1].confidence);
        const confB = parseFloat(b[1].confidence);
        return confB - confA;
      });

    const focusColumn = predictableCols.length > 0 ? predictableCols[0] : null;

    return { columnAnalysis, focusColumn, predictableCols };
  };
  const waveAnalysis = analyzeWavePatterns();

  // Replace the buildPairingViz function with this corrected version:

  const buildPairingViz = () => {
    if (combinedRolls.length < 6) return null;

    // 🔥 FIX: Use combinedRolls directly in correct order (oldest to newest)
    const vizRolls = combinedRolls.slice(-12);

    const schemes = {
      col1: {
        name: "41/42",
        label: "Odds vs Evens",
        pairA: ["1", "3"],
        pairB: ["2", "4"],
        pairALabel: "Odds (1/3)",
        pairBLabel: "Evens (2/4)",
      },
      col2: {
        name: "41/43",
        label: "Outer vs Inner",
        pairA: ["1", "4"],
        pairB: ["2", "3"],
        pairALabel: "Outer (1/4)",
        pairBLabel: "Inner (2/3)",
      },
      col3: {
        name: "41/44",
        label: "Low vs High",
        pairA: ["1", "2"],
        pairB: ["3", "4"],
        pairALabel: "Low (1/2)",
        pairBLabel: "High (3/4)",
      },
    };

    // 🔥 FIX: Return in REVERSE order so table displays newest at bottom
    return vizRolls.reverse().map((roll) => {
      const lastDigit = roll[2];

      return {
        roll,
        col1: {
          isA: schemes.col1.pairA.includes(lastDigit),
          label: schemes.col1.pairA.includes(lastDigit)
            ? schemes.col1.pairALabel
            : schemes.col1.pairBLabel,
        },
        col2: {
          isA: schemes.col2.pairA.includes(lastDigit),
          label: schemes.col2.pairA.includes(lastDigit)
            ? schemes.col2.pairALabel
            : schemes.col2.pairBLabel,
        },
        col3: {
          isA: schemes.col3.pairA.includes(lastDigit),
          label: schemes.col3.pairA.includes(lastDigit)
            ? schemes.col3.pairALabel
            : schemes.col3.pairBLabel,
        },
      };
    });
  };

  const pairingViz = buildPairingViz();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-emerald-400">
            🌊 Kiyo Mode (EU Wave Theory)
          </h3>
          <p className="text-[11px] text-slate-400">
            3-string predictor trained on EU server patterns
          </p>
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          {showDebug ? "Hide" : "Show"} Debug
        </button>
      </div>
      {/* Combined Dataset */}
      <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-xl p-4 border border-emerald-500/40">
        <div className="text-xs text-emerald-300 mb-3 font-semibold flex items-center gap-2">
          <span>📚 Combined Dataset</span>
          <span className="text-[10px] text-slate-400 font-normal">
            (Training: {trainingStats.total} + Live: {combinedDataset.liveCount}
            )
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
            <div className="text-[10px] text-slate-400 mb-1">Total Samples</div>
            <div className="text-2xl font-black text-emerald-300">
              {combinedDataset.total.toLocaleString()}
            </div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
            <div className="text-[10px] text-slate-400 mb-1">Live Added</div>
            <div className="text-2xl font-black text-sky-300">
              {combinedDataset.liveCount}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]">
          <div>
            <span className="text-slate-400">Most common:</span>{" "}
            <span className="text-emerald-300 font-mono font-bold">
              {combinedDataset.patterns[0].pattern}
            </span>
            <span className="text-slate-500">
              {" "}
              ({combinedDataset.patterns[0].pct}%)
            </span>
          </div>
          <div>
            <span className="text-slate-400">Least common:</span>{" "}
            <span className="text-emerald-300 font-mono font-bold">
              {
                combinedDataset.patterns[combinedDataset.patterns.length - 1]
                  .pattern
              }
            </span>
            <span className="text-slate-500">
              {" "}
              (
              {
                combinedDataset.patterns[combinedDataset.patterns.length - 1]
                  .pct
              }
              %)
            </span>
          </div>
        </div>
      </div>
      {/* Test Roll Input */}
      <div className="space-y-2">
        <label className="text-xs text-slate-300 font-semibold flex items-center gap-2">
          🧪 Test Rolls
          <span className="text-[10px] text-slate-500 font-normal">
            (Enter any 3-digit combo 1-4, auto-translated to 4xx)
          </span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={testInput}
          onChange={(e) => {
            const val = e.target.value.replace(/[^1-4]/g, "");
            setTestInput(val);
          }}
          onKeyDown={handleTestRollSubmit}
          placeholder="e.g. 121 or 232"
          className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Test Rolls Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-violet-300 font-semibold">
              Test Rolls
            </span>
            <span className="text-xs text-slate-500">
              {testRolls.length} rolls
            </span>
          </div>
          <div className="bg-slate-950/60 rounded-lg border border-slate-700/50 max-h-64 overflow-y-auto">
            {testRolls.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No test rolls yet
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-900/60 sticky top-0">
                  <tr className="text-left text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">User Input</th>
                    <th className="py-2 px-3">→ Translated</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {[...testRolls]
                    .map((roll, idx) => ({
                      idx,
                      raw: roll,
                      translated: translatedTestRolls[idx],
                    }))
                    .reverse()
                    .map(({ idx, raw, translated }, displayIdx) => {
                      const displayIndex = testRolls.length - displayIdx;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="py-2 px-3 text-slate-500">
                            {displayIndex}
                          </td>
                          <td className="py-2 px-3 font-mono text-violet-300 font-bold">
                            {raw}
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                            {translated}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() =>
                                handleDeleteTestRoll(
                                  testRolls.length - displayIndex
                                )
                              }
                              className="text-[11px] text-slate-500 hover:text-red-400 transition"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 🔥 Pattern Analysis + Expect Change */}
        {combinedRolls.length >= 6 && waveAnalysis && (
          <div className="space-y-2">
            <div className="text-xs text-violet-300 font-semibold">
              📊 Wave Pattern Status
            </div>

            {/* 🔥 EXPECT CHANGE SECTION - BACK AND CLEAR */}
            {waveAnalysis.predictableCols.length > 0 ? (
              <div className="bg-gradient-to-br from-orange-900/50 to-red-900/40 rounded-lg p-4 border-2 border-orange-500/60 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="text-lg font-bold text-orange-300">
                      EXPECT CHANGE
                    </div>
                    <div className="text-[10px] text-orange-200">
                      Pattern detected - flip likely next
                    </div>
                  </div>
                </div>

                {/* Focus Column Recommendation */}
                {waveAnalysis.focusColumn && (
                  <div className="bg-orange-950/60 rounded-lg p-3 border border-orange-500/40">
                    <div className="text-[10px] text-orange-300 font-semibold mb-2">
                      🎯 Focus on {waveAnalysis.focusColumn[1].scheme.name}:
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300">
                          Dominating pattern:
                        </span>
                        <span className="font-bold text-orange-300">
                          {waveAnalysis.focusColumn[1].currentLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300">Appears:</span>
                        <span className="font-bold text-orange-300">
                          {waveAnalysis.focusColumn[1].aCountRecent +
                            waveAnalysis.focusColumn[1].bCountRecent >
                          0
                            ? waveAnalysis.focusColumn[1].aCountRecent +
                              waveAnalysis.focusColumn[1].bCountRecent
                            : "N/A"}{" "}
                          / 6 times
                        </span>
                      </div>
                      <div className="h-1.5 bg-orange-950/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                          style={{
                            width: `${
                              (waveAnalysis.focusColumn[1].confidence / 100) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <div className="text-[9px] text-orange-200 mt-2">
                        ↓ Expect flip to:{" "}
                        <span className="font-bold text-emerald-300">
                          {waveAnalysis.focusColumn[1].oppositeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* All predictable columns */}
                {waveAnalysis.predictableCols.length > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    {waveAnalysis.predictableCols.slice(1).map(([key, col]) => (
                      <div
                        key={key}
                        className="bg-orange-950/40 rounded p-2 border border-orange-500/30 text-[9px]"
                      >
                        <div className="text-orange-300 font-semibold mb-1">
                          {col.scheme.name}
                        </div>
                        <div className="text-slate-300">
                          {col.dominantLabel} → {col.oppositeLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-lg p-4 border border-emerald-500/40">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  <div>
                    <div className="text-lg font-bold text-emerald-300">
                      BALANCED
                    </div>
                    <div className="text-[10px] text-emerald-200">
                      No dominant pattern yet
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-400">
                  Check the table below to see which column might be building a
                  pattern.
                </div>
              </div>
            )}

            {/* All columns status */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(waveAnalysis.columnAnalysis).map(([key, col]) => (
                <div
                  key={key}
                  className={`rounded-lg p-2.5 border ${
                    col.status === "expect_flip"
                      ? "bg-orange-950/60 border-orange-500/50"
                      : col.status.includes("favor")
                      ? "bg-slate-900/60 border-slate-700/50"
                      : "bg-slate-900/40 border-slate-700/30"
                  }`}
                >
                  <div className="text-[9px] font-semibold text-slate-400 mb-1">
                    {col.scheme.name}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="text-[10px] font-mono">
                      <span className="text-emerald-300">
                        {col.aCountRecent}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-amber-300">{col.bCountRecent}</span>
                    </div>
                  </div>
                  <div
                    className={`text-[8px] font-bold ${
                      col.status === "expect_flip"
                        ? "text-orange-300"
                        : col.status.includes("favor")
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {col.status === "expect_flip"
                      ? "⚠️ FLIP"
                      : col.status === "balanced"
                      ? "Balanced"
                      : col.status.includes("favor_a")
                      ? "Favor A"
                      : "Favor B"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🎯 RECOMMENDED TARGET - NEW SECTION */}
      {waveAnalysis && waveAnalysis.focusColumn && (
        <div className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/50 rounded-lg p-4 border-2 border-cyan-500/60 space-y-3 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-lg font-bold text-cyan-300">
                RECOMMENDED TARGET
              </div>
              <div className="text-[10px] text-cyan-200">
                Based on wave pattern analysis
              </div>
            </div>
          </div>

          {/* Get the dominant and opposite values */}
          {(() => {
            const focusCol = waveAnalysis.focusColumn[1];
            const scheme = focusCol.scheme;

            // Determine which digit to target
            let targetDigits = [];
            let targetLabel = "";

            if (focusCol.status === "expect_flip") {
              // If expecting flip, target the OPPOSITE
              targetDigits =
                focusCol.dominantLabel === scheme.pairALabel
                  ? scheme.pairB
                  : scheme.pairA;
              targetLabel = focusCol.oppositeLabel;
            }

            return (
              <div className="space-y-2">
                {/* Target Line Display */}
                <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/40 space-y-2">
                  <div className="text-[10px] text-cyan-300 font-semibold mb-1">
                    Target the last digit:
                  </div>
                  <div className="flex items-center gap-2">
                    {targetDigits.map((digit) => (
                      <div
                        key={digit}
                        className="flex-1 bg-cyan-900/60 rounded-lg px-3 py-3 border border-cyan-500/50 text-center"
                      >
                        <div className="text-4xl font-mono font-black text-cyan-300">
                          4{digit}
                        </div>
                        <div className="text-[9px] text-cyan-200 mt-1">
                          = {targetLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reasoning */}
                <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-700/30">
                  <div className="text-[9px] text-slate-300 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold mt-0.5">→</span>
                      <span>
                        {focusCol.scheme.name} has been showing{" "}
                        <span className="text-orange-300 font-bold">
                          {focusCol.dominantLabel}
                        </span>{" "}
                        for 6/6 rolls
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold mt-0.5">→</span>
                      <span>
                        Pattern is strong enough to predict a{" "}
                        <span className="text-emerald-300 font-bold">flip</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold mt-0.5">→</span>
                      <span>
                        Next roll should switch to{" "}
                        <span className="text-cyan-300 font-bold">
                          {targetLabel}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-300">Target Confidence:</span>
                    <span className="font-bold text-cyan-300">
                      {focusCol.confidence}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden border border-cyan-500/30">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                      style={{
                        width: `${focusCol.confidence}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Risk Warning if confidence is low */}
                {parseFloat(focusCol.confidence) < 60 && (
                  <div className="bg-yellow-900/30 rounded-lg px-3 py-2 border border-yellow-600/40 text-[9px] text-yellow-200">
                    <span className="font-semibold">
                      ⚠️ Moderate Confidence:
                    </span>{" "}
                    Consider checking the Tracer Prediction as secondary
                    confirmation.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      {/* Tracer Prediction */}
      {prediction && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-300 font-semibold">
              🎯 Tracer Prediction
            </span>
            <span className="text-xs text-slate-500">
              {combinedRolls.length} rolls
            </span>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 rounded-lg p-4 border border-emerald-500/50">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  Next Roll (4xx format)
                </div>
                <div className="text-5xl font-mono font-black text-emerald-300 tracking-tight">
                  {prediction.prediction}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 mb-1">
                  Confidence
                </div>
                <div className="text-3xl font-black text-emerald-400">
                  {Math.round(prediction.confidence * 100)}%
                </div>
              </div>
            </div>

            {prediction.alt && (
              <div className="flex items-center justify-between bg-emerald-950/60 rounded-lg px-3 py-2 border border-emerald-500/30 mb-3">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Alternative
                </span>
                <span className="text-xl font-mono font-black text-cyan-300">
                  {prediction.alt}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border bg-emerald-500/20 text-emerald-200 border-emerald-400/60">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {prediction.mode}
              </span>
              <span className="text-[9px] text-slate-500">
                Roll #{combinedRolls.length}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Wave Pairing Table */}
      {pairingViz && (
        <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-700/50">
          <div className="text-xs text-emerald-300 font-semibold mb-3">
            🎨 Wave Pairing Pattern (Last {pairingViz.length} rolls)
          </div>

          {/* Legend */}
          <div className="mb-4 grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/50">
              <div className="text-slate-400 font-semibold mb-1">
                Column 1: Odds/Evens
              </div>
              <div className="space-y-0.5 text-[9px]">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-emerald-300">Odds (1/3)</span>
                </div>
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  <span className="text-amber-300">Evens (2/4)</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/50">
              <div className="text-slate-400 font-semibold mb-1">
                Column 2: Outer/Inner
              </div>
              <div className="space-y-0.5 text-[9px]">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-emerald-300">Outer (1/4)</span>
                </div>
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  <span className="text-amber-300">Inner (2/3)</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/50">
              <div className="text-slate-400 font-semibold mb-1">
                Column 3: Low/High
              </div>
              <div className="space-y-0.5 text-[9px]">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-emerald-300">Low (1/2)</span>
                </div>
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  <span className="text-amber-300">High (3/4)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900/60 sticky top-0">
                <tr>
                  <th className="py-2 px-3 text-left text-slate-400 font-semibold border border-slate-700/50">
                    Roll
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Odds/Evens
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Outer/Inner
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Low/High
                  </th>
                </tr>
              </thead>
              <tbody>
                {pairingViz.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 text-slate-300 font-mono font-bold border border-slate-700/30">
                      {row.roll}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col1.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col1.label.split(" ")[0]}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col2.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col2.label.split(" ")[0]}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col3.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col3.label.split(" ")[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[10px] text-slate-400 bg-slate-900/40 rounded p-2 border border-slate-700/30">
            <span className="text-emerald-300 font-semibold">
              📖 How to Read:
            </span>{" "}
            If any column shows the same color 4+ times in a row, flip to
            opposite is likely. When you see 1-2 colors only, look at the
            focused column above (highlighted in orange) as it's most
            predictable.
          </div>
        </div>
      )}
      {/* Debug Panel */}
      {showDebug && prediction?.debug && (
        <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-700/50 space-y-3 text-[11px] font-mono">
          <div className="text-xs text-emerald-300 font-bold mb-2">
            🔬 Wave Analysis Debug
          </div>

          {prediction.debug.columnResults?.map((col) => (
            <div
              key={col.column}
              className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800"
            >
              <div className="text-violet-300 font-semibold mb-1">
                {col.name} (Column {col.column})
              </div>
              <div className="text-slate-400 text-[10px] space-y-0.5">
                <div>
                  Predicted Pair:{" "}
                  <span className="text-emerald-300">{col.predictedPair}</span>{" "}
                  → [{col.predictedDigits.join(", ")}]
                </div>
                <div>
                  Last Run:{" "}
                  <span className="text-amber-300">{col.lastRunPair}</span> ×{" "}
                  {col.lastRunLength} | Avg: {col.avgRunLength}
                </div>
                <div>
                  Confidence:{" "}
                  <span className="text-sky-300">
                    {(col.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
            <div className="text-sky-300 font-semibold mb-2">
              Digit Vote Scores
            </div>
            <div className="grid grid-cols-4 gap-2">
              {prediction.debug.digitVotes?.map((vote) => (
                <div
                  key={vote.digit}
                  className="bg-slate-950/60 rounded px-2 py-1.5 text-center border border-slate-700/30"
                >
                  <div className="text-slate-200 font-bold text-sm">
                    {vote.digit}
                  </div>
                  <div className="text-slate-500 text-[9px]">{vote.score}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-500">Vote Strength:</span>{" "}
            <span className="text-emerald-300 font-bold">
              {(parseFloat(prediction.debug.voteStrength) * 100).toFixed(1)}%
            </span>
          </div>

          {prediction.debug.recentRolls && (
            <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
              <div className="text-slate-500 mb-1">Recent Context:</div>
              <div className="text-slate-200 font-mono text-[10px]">
                {prediction.debug.recentRolls.join(" → ")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
