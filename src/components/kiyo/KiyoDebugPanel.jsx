import React, { useState, useRef } from "react";

function calculateStrategicTier(
  waveAnalysis,
  prefixPrediction,
  legacyPrediction
) {
  const factors = {
    stickyColumns: waveAnalysis.stickyColumns,
    flipColumns: waveAnalysis.flipColumns,
    avgSwapRate: parseFloat(waveAnalysis.avgSwapRate),
    focusColumn: waveAnalysis.focusColumn?.[1],
    compoundConfidence: waveAnalysis.compoundConfidence,
    prefixConfidence: prefixPrediction?.confidence || 0,
    waveConfidence: legacyPrediction?.confidence || 0,
  };

  let tier = "B";
  let reasoning = [];
  let action = "SKIP or BET TRASH";
  let effectiveReliability = 0;
  let alignment = "UNKNOWN";
  let conflictResolution = null;

  // Calculate effective reliability with swap rate penalty
  if (factors.focusColumn) {
    const swapPenalty = factors.focusColumn.swapRate;
    const runBonus = Math.min(factors.focusColumn.run.length / 5, 1);
    effectiveReliability = Math.round(
      factors.focusColumn.confidence * (1 - swapPenalty * 0.5) * runBonus * 100
    );
  } else {
    effectiveReliability = Math.round(factors.prefixConfidence * 100);
  }

  // Check wave vs prefix alignment
  if (prefixPrediction?.prediction && factors.focusColumn) {
    const prefixLastDigit = prefixPrediction.prediction[2];
    const isAligned = factors.focusColumn.flipTarget.includes(prefixLastDigit);
    alignment = isAligned ? "ALIGNED" : "CONFLICT";
  } else if (!factors.focusColumn) {
    alignment = "PREFIX_ONLY";
  } else if (!prefixPrediction?.prediction) {
    alignment = "WAVE_ONLY";
  }

  // 🔥 TIER S: Bet Good Relics (75%+ effective reliability)
  if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.3 &&
    factors.focusColumn.run.length >= 5
  ) {
    tier = "S";
    reasoning.push("🔥 Sticky (<30%) + 5+ Run = 80-85% confidence");
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 80);
    conflictResolution = "TRUST WAVE - Highest reliability pattern";
  } else if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.4 &&
    factors.focusColumn.run.length >= 4
  ) {
    tier = "S";
    reasoning.push("🔥 Sticky (<40%) + 4+ Run = 75-80% confidence");
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 75);
    conflictResolution = "TRUST WAVE - Strong reliability";
  } else if (alignment === "ALIGNED" && factors.flipColumns >= 1) {
    tier = "S";
    reasoning.push(
      `⚡ Wave + Prefix ALIGNED (${factors.flipColumns} flip cols)`
    );
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 80);
    conflictResolution = "PERFECT ALIGNMENT - Both agree";
  }

  // 🔥 TIER A: Bet Okay Relics (60-70% effective reliability)
  else if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.5 &&
    factors.focusColumn.run.length >= 3
  ) {
    tier = "A";
    reasoning.push("⚡ Moderate sticky (<50%) + 3+ Run = 65-70%");
    action = "BET OKAY RELICS";
    effectiveReliability = Math.max(effectiveReliability, 65);
    conflictResolution =
      alignment === "CONFLICT" ? "CAUTIOUS - Wave acceptable" : "TRUST WAVE";
  } else if (
    factors.compoundConfidence === "MODERATE" &&
    factors.stickyColumns >= 1
  ) {
    tier = "A";
    reasoning.push(
      `⚡ MODERATE (1 flip) + ${factors.stickyColumns} sticky cols`
    );
    action = "BET OKAY RELICS";
    effectiveReliability = Math.max(effectiveReliability, 60);
    conflictResolution = "TRUST WAVE with caution";
  }
  // 🔥 FIX: Add volatility gating for prefix-only scenarios
  else if (
    prefixPrediction?.confidence >= 0.65 &&
    !factors.focusColumn &&
    factors.avgSwapRate < 0.6
  ) {
    tier = "A";
    reasoning.push(
      `📊 Prefix high conf (${Math.round(
        prefixPrediction.confidence * 100
      )}%) + Low volatility`
    );
    action = "BET OKAY RELICS";
    effectiveReliability = Math.round(prefixPrediction.confidence * 100);
    conflictResolution = "PREFIX ONLY - No strong wave";
  }

  // 🔥 TIER B: Trash Relics Only (45-60% effective reliability)
  // 🔥 FIX: Add volatility downgrade case BEFORE balanced case
  else if (
    alignment === "PREFIX_ONLY" &&
    factors.avgSwapRate >= 0.6 &&
    factors.flipColumns === 0
  ) {
    tier = "B";
    reasoning.push(
      `🌊 High avg volatility (${Math.round(
        factors.avgSwapRate * 100
      )}%) - Unstable patterns`
    );
    action = "SKIP or BET TRASH";
    // 🔥 FIX: Apply confidence penalty for high volatility
    const volatilityPenalty = factors.avgSwapRate >= 0.65 ? 0.6 : 0.8;
    effectiveReliability = Math.round(
      (prefixPrediction?.confidence * 100 || 50) * volatilityPenalty
    );
    conflictResolution = "TRUST PREFIX - Wave too volatile";
  } else if (factors.flipColumns === 0) {
    tier = "B";
    reasoning.push("🤷 BALANCED (0 flips) - No strong patterns");
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Wave unreliable";
  } else if (factors.avgSwapRate >= 0.7) {
    tier = "B";
    reasoning.push(
      `🌊 High volatility (${Math.round(factors.avgSwapRate * 100)}% avg swap)`
    );
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Too volatile";
  } else if (alignment === "CONFLICT" && factors.focusColumn?.swapRate >= 0.5) {
    tier = "B";
    reasoning.push(
      `⚠️ CONFLICT + moderate swap (${Math.round(
        factors.focusColumn.swapRate * 100
      )}%)`
    );
    action = "SKIP or BET TRASH";
    effectiveReliability = 50;
    conflictResolution = "UNCERTAIN - Consider both or skip";
  } else {
    tier = "B";
    reasoning.push("📊 Normal prefix - No strong signals");
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Default fallback";
  }

  return {
    tier,
    reasoning,
    action,
    effectiveReliability,
    factors,
    alignment,
    conflictResolution,
  };
}

// 🔥 NEW: Parse debug file and calculate accuracy
function analyzeDebugFile(content, actualRolls) {
  const lines = content.split("\n");

  // Extract prediction from debug file
  let prediction = null;
  let focusColumn = null;
  let flipColumns = [];

  for (const line of lines) {
    if (line.includes("Main Prediction:")) {
      prediction = line.match(/\d{3}/)?.[0];
    }
    if (line.includes("Focus:")) {
      const colMatch = line.match(/Column (\d)/);
      if (colMatch) focusColumn = parseInt(colMatch[1]);
    }
    if (line.includes("Columns Due to Flip:")) {
      const nextLine = lines[lines.indexOf(line) + 1];
      if (nextLine && nextLine.includes("Column")) {
        flipColumns =
          nextLine
            .match(/Column \d/g)
            ?.map((m) => parseInt(m.match(/\d/)[0])) || [];
      }
    }
  }

  if (!prediction || !actualRolls || actualRolls.length === 0) {
    return null;
  }

  // Compare prediction with actual rolls
  const results = actualRolls.map((actual, idx) => {
    const match = actual === prediction;

    // Check column-wise accuracy
    const predDigits = prediction.split("").map(Number);
    const actualDigits = actual.split("").map(Number);

    const col1Match = predDigits[1] === actualDigits[1];
    const col2Match = predDigits[1] === actualDigits[1]; // Simplified - should check pair
    const col3Match = predDigits[2] === actualDigits[2];

    return {
      rollNumber: idx + 1,
      predicted: prediction,
      actual,
      match,
      col1Match,
      col2Match,
      col3Match,
    };
  });

  const totalRolls = results.length;
  const hits = results.filter((r) => r.match).length;
  const col1Hits = results.filter((r) => r.col1Match).length;
  const col2Hits = results.filter((r) => r.col2Match).length;
  const col3Hits = results.filter((r) => r.col3Match).length;

  return {
    prediction,
    focusColumn,
    flipColumns,
    results,
    accuracy: {
      overall: totalRolls > 0 ? Math.round((hits / totalRolls) * 100) : 0,
      col1: totalRolls > 0 ? Math.round((col1Hits / totalRolls) * 100) : 0,
      col2: totalRolls > 0 ? Math.round((col2Hits / totalRolls) * 100) : 0,
      col3: totalRolls > 0 ? Math.round((col3Hits / totalRolls) * 100) : 0,
    },
    stats: {
      total: totalRolls,
      hits,
      misses: totalRolls - hits,
    },
  };
}

export default function KiyoDebugPanel({
  analyzeWavePatterns,
  smartPrefixPrediction,
  prediction,
}) {
  const strategicTier = calculateStrategicTier(
    analyzeWavePatterns,
    smartPrefixPrediction,
    prediction
  );

  // 🔥 NEW: State for debug file import
  const [showAccuracyTest, setShowAccuracyTest] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [actualRollsInput, setActualRollsInput] = useState("");
  const debugFileInputRef = useRef(null);

  // 🔥 NEW: Handle debug file import
  const handleDebugFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setShowAccuracyTest(true);

      // Store file content for later analysis
      sessionStorage.setItem("lastDebugFile", content);
    };

    reader.readAsText(file);

    if (debugFileInputRef.current) {
      debugFileInputRef.current.value = "";
    }
  };

  // 🔥 NEW: Analyze accuracy with actual rolls
  const handleAnalyzeAccuracy = () => {
    const debugContent = sessionStorage.getItem("lastDebugFile");
    if (!debugContent) {
      alert("Please import a debug file first!");
      return;
    }

    const rolls = actualRollsInput
      .split(/[\n,\s]+/)
      .map((r) => r.trim())
      .filter((r) => /^[1-4]{3}$/.test(r));

    if (rolls.length === 0) {
      alert("Please enter valid 3-digit rolls!");
      return;
    }

    const results = analyzeDebugFile(debugContent, rolls);
    setTestResults(results);
  };

  return (
    <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-700/50 space-y-3 text-[11px] font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-emerald-300 font-bold">
          🔬 Enhanced Debug Info
        </div>
        <div className="flex items-center gap-2">
          {/* 🔥 NEW: Import Debug File Button */}
          <input
            ref={debugFileInputRef}
            type="file"
            accept=".txt"
            onChange={handleDebugFileImport}
            className="hidden"
          />
          <button
            onClick={() => debugFileInputRef.current?.click()}
            className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded transition"
            title="Import debug file for accuracy testing"
          >
            📥 Import Debug
          </button>

          <div className="text-[10px] text-slate-500">
            Lookback: {analyzeWavePatterns.lookbackUsed} rolls
          </div>
        </div>
      </div>

      {/* 🔥 NEW: Accuracy Testing Panel */}
      {showAccuracyTest && (
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg p-4 border border-blue-500/50 space-y-3">
          <div className="text-sm font-bold text-blue-300 mb-2 flex items-center justify-between">
            <span>🎯 Accuracy Testing</span>
            <button
              onClick={() => setShowAccuracyTest(false)}
              className="text-blue-400 hover:text-blue-200 text-lg"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-blue-200">
              Enter actual rolls that occurred (one per line or
              comma-separated):
            </label>
            <textarea
              value={actualRollsInput}
              onChange={(e) => setActualRollsInput(e.target.value)}
              placeholder="e.g. 413, 444, 422, 433..."
              className="w-full bg-blue-950/60 border border-blue-500/40 rounded-lg px-3 py-2 text-xs font-mono text-blue-100 outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[80px]"
            />
            <button
              onClick={handleAnalyzeAccuracy}
              className="w-full px-3 py-2 bg-blue-500/30 text-blue-200 hover:bg-blue-500/40 border border-blue-500/50 rounded-lg transition text-xs font-semibold"
            >
              📊 Calculate Accuracy
            </button>
          </div>

          {/* 🔥 NEW: Accuracy Results */}
          {testResults && (
            <div className="space-y-3 mt-4">
              {/* Overall Stats */}
              <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/40">
                <div className="text-xs font-bold text-blue-200 mb-2">
                  📈 Overall Accuracy
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-blue-300">Prediction:</span>
                    <span className="text-blue-100 font-mono font-bold">
                      {testResults.prediction}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-300">Total Rolls:</span>
                    <span className="text-blue-100 font-bold">
                      {testResults.stats.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-300">Hits:</span>
                    <span className="text-green-200 font-bold">
                      {testResults.stats.hits}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-300">Misses:</span>
                    <span className="text-red-200 font-bold">
                      {testResults.stats.misses}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-500/30">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-100 mb-1">
                      {testResults.accuracy.overall}%
                    </div>
                    <div className="text-[9px] text-blue-300">
                      Overall Accuracy
                    </div>
                  </div>
                </div>
              </div>

              {/* Column-wise Accuracy */}
              <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/40">
                <div className="text-xs font-bold text-blue-200 mb-2">
                  📊 Column Accuracy
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-blue-900/30 rounded px-2 py-1.5">
                    <span className="text-[10px] text-blue-300">
                      Column 1 (Odds/Evens)
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        testResults.accuracy.col1 >= 70
                          ? "text-green-300"
                          : testResults.accuracy.col1 >= 50
                          ? "text-yellow-300"
                          : "text-red-300"
                      }`}
                    >
                      {testResults.accuracy.col1}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-900/30 rounded px-2 py-1.5">
                    <span className="text-[10px] text-blue-300">
                      Column 2 (Outer/Inner)
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        testResults.accuracy.col2 >= 70
                          ? "text-green-300"
                          : testResults.accuracy.col2 >= 50
                          ? "text-yellow-300"
                          : "text-red-300"
                      }`}
                    >
                      {testResults.accuracy.col2}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-900/30 rounded px-2 py-1.5">
                    <span className="text-[10px] text-blue-300">
                      Column 3 (Low/High)
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        testResults.accuracy.col3 >= 70
                          ? "text-green-300"
                          : testResults.accuracy.col3 >= 50
                          ? "text-yellow-300"
                          : "text-red-300"
                      }`}
                    >
                      {testResults.accuracy.col3}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Flip Prediction Accuracy */}
              {testResults.focusColumn && (
                <div className="bg-orange-950/60 rounded-lg p-3 border border-orange-500/40">
                  <div className="text-xs font-bold text-orange-200 mb-2">
                    🔄 Flip Prediction
                  </div>
                  <div className="text-[10px] text-orange-100">
                    <div className="mb-1">
                      Focus Column:{" "}
                      <span className="font-bold">
                        Column {testResults.focusColumn}
                      </span>
                    </div>
                    {testResults.flipColumns.length > 0 && (
                      <div>
                        Flip Columns:{" "}
                        <span className="font-bold">
                          {testResults.flipColumns.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Roll-by-Roll Results */}
              <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/40 max-h-[300px] overflow-y-auto">
                <div className="text-xs font-bold text-blue-200 mb-2">
                  📋 Roll-by-Roll Results
                </div>
                <div className="space-y-1">
                  {testResults.results.map((result) => (
                    <div
                      key={result.rollNumber}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] ${
                        result.match
                          ? "bg-green-900/30 border border-green-500/30"
                          : "bg-red-900/30 border border-red-500/30"
                      }`}
                    >
                      <span className="text-blue-300">
                        Roll #{result.rollNumber}
                      </span>
                      <span className="font-mono">
                        <span className="text-blue-200">
                          Pred: {result.predicted}
                        </span>
                        <span className="mx-2 text-blue-400">→</span>
                        <span
                          className={
                            result.match ? "text-green-300" : "text-red-300"
                          }
                        >
                          Actual: {result.actual}
                        </span>
                        <span className="ml-2">
                          {result.match ? "✅" : "❌"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Strategic Tier Summary */}
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 rounded-lg p-3 border border-violet-500/50">
        <div className="text-violet-300 font-semibold mb-2 flex items-center gap-2">
          🎯 Strategic Assessment
          <span
            className={`text-xs px-2 py-0.5 rounded font-bold ${
              strategicTier.tier === "S"
                ? "bg-emerald-500/30 text-emerald-200"
                : strategicTier.tier === "A"
                ? "bg-blue-500/30 text-blue-200"
                : "bg-slate-500/30 text-slate-200"
            }`}
          >
            TIER {strategicTier.tier}
          </span>
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Effective Reliability:</span>
            <span
              className={`font-bold ${
                strategicTier.effectiveReliability >= 75
                  ? "text-emerald-400"
                  : strategicTier.effectiveReliability >= 60
                  ? "text-blue-400"
                  : "text-slate-400"
              }`}
            >
              {strategicTier.effectiveReliability}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Alignment:</span>
            <span
              className={`font-bold ${
                strategicTier.alignment === "ALIGNED"
                  ? "text-green-400"
                  : strategicTier.alignment === "CONFLICT"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {strategicTier.alignment}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Action:</span>
            <span
              className={`font-bold ${
                strategicTier.action.includes("GOOD")
                  ? "text-emerald-400"
                  : strategicTier.action.includes("OKAY")
                  ? "text-blue-400"
                  : "text-slate-400"
              }`}
            >
              {strategicTier.action}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-violet-500/30 text-violet-200">
            {strategicTier.reasoning.join(" • ")}
          </div>
        </div>
      </div>

      {/* Wave Analysis Summary */}
      <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
        <div className="text-sky-300 font-semibold mb-2">🌊 Wave Analysis</div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Flip Columns:</span>
            <span className="text-orange-300 font-bold">
              {analyzeWavePatterns.flipColumns}/3
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Sticky Columns:</span>
            <span className="text-green-300 font-bold">
              {analyzeWavePatterns.stickyColumns}/3
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Avg Swap Rate:</span>
            <span
              className={`font-bold ${
                parseFloat(analyzeWavePatterns.avgSwapRate) >= 0.7
                  ? "text-red-400"
                  : parseFloat(analyzeWavePatterns.avgSwapRate) >= 0.4
                  ? "text-yellow-400"
                  : "text-green-400"
              }`}
            >
              {(parseFloat(analyzeWavePatterns.avgSwapRate) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Compound:</span>
            <span
              className={`font-bold ${
                analyzeWavePatterns.compoundConfidence === "HIGH"
                  ? "text-green-400"
                  : analyzeWavePatterns.compoundConfidence === "MODERATE"
                  ? "text-yellow-400"
                  : "text-slate-400"
              }`}
            >
              {analyzeWavePatterns.compoundConfidence}
            </span>
          </div>
        </div>

        {analyzeWavePatterns.ignoredColumns?.length > 0 && (
          <div className="mt-2 text-[9px] text-red-400 bg-red-950/30 rounded px-2 py-1">
            🚫 Ignored: Column {analyzeWavePatterns.ignoredColumns.join(", ")}{" "}
            (≥70% swap)
          </div>
        )}

        {analyzeWavePatterns.postFlipColumns?.length > 0 && (
          <div className="mt-2 text-[9px] text-purple-400 bg-purple-950/30 rounded px-2 py-1">
            ⏸️ Post-Flip: Column{" "}
            {analyzeWavePatterns.postFlipColumns.join(", ")}
          </div>
        )}
      </div>

      {/* Column Details */}
      {prediction.debug?.columnResults?.map((col) => (
        <div
          key={col.column}
          className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-violet-300 font-semibold">
              {col.name} (Column {col.column})
            </div>
            <div className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
              {col.swapRate ? `${(col.swapRate * 100).toFixed(0)}% swap` : ""}
            </div>
          </div>
          <div className="text-slate-400 text-[10px] space-y-0.5">
            <div>
              Predicted Pair:{" "}
              <span className="text-emerald-300">{col.predictedPair}</span> → [
              {col.predictedDigits.join(", ")}]
            </div>
            <div>
              Last Run:{" "}
              <span className="text-amber-300">{col.lastRunPair}</span> ×{" "}
              {col.lastRunLength} | Avg: {col.avgRunLength}
            </div>
            <div className="flex items-center gap-2">
              <span>Confidence:</span>
              <span className="text-sky-300">
                {(col.confidence * 100).toFixed(0)}%
              </span>
              {col.consecutiveCount >= 3 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                  {col.consecutiveCount} consecutive
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Digit Votes */}
      {prediction.debug?.digitVotes && (
        <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
          <div className="text-sky-300 font-semibold mb-2">Digit Votes</div>
          <div className="grid grid-cols-4 gap-2">
            {prediction.debug.digitVotes.map((vote) => (
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
      )}

      {/* Vote Strength */}
      <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
        <span className="text-slate-500">Vote Strength:</span>{" "}
        <span className="text-emerald-300 font-bold">
          {(parseFloat(prediction.debug?.voteStrength || 0) * 100).toFixed(1)}%
        </span>
      </div>

      {/* Recent Context */}
      {prediction.debug?.recentRolls && (
        <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
          <div className="text-slate-500 mb-1">Recent Context:</div>
          <div className="text-slate-200 font-mono text-[10px]">
            {prediction.debug.recentRolls.join(" → ")}
          </div>
        </div>
      )}

      {/* 🔥 NEW: Adaptive Learning Metrics */}
      <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/40">
        <div className="text-sm font-bold text-purple-300 mb-2">
          🧠 Adaptive Learning
        </div>
        <div className="space-y-2 text-xs text-purple-100">
          {analyzeWavePatterns.columns?.map((col) => (
            <div key={col.column} className="flex justify-between">
              <span>{col.name}:</span>
              <span className="font-mono">
                {col.behavior} (flip@2:{" "}
                {Math.round((col.flipAt2Rate || 0) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
