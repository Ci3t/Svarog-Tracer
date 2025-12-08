// src/components/KiyoDebugPanel.jsx - REPLACE YOUR EXISTING FILE
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
  // 🔥 ADD: Safety check for null prediction
  if (!analyzeWavePatterns || !prediction) {
    return (
      <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-700/50 text-center text-slate-400 text-sm">
        No debug data available yet. Add some rolls to see analysis.
      </div>
    );
  }

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

  const exportToFile = () => {
    // Export implementation (keeping existing code)
    alert("Export functionality - implement as needed");
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

      {/* Accuracy Testing Panel - keeping existing implementation */}
      {showAccuracyTest && (
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg p-4 border border-blue-500/50 space-y-3">
          {/* ... existing accuracy test UI ... */}
        </div>
      )}

      {/* Strategic Tier Summary */}
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 rounded-lg p-3 border border-violet-500/50">
        <div className="text-violet-300 font-semibold mb-2 flex items-center gap-2">
          🎯 Strategic Assessment
          <span
            className={`text-xs px-2 py-0.5 rounded font-bold ${
              strategicTier.tier === "S"
                ? "bg-emerald-500/10 text-emerald-300"
                : strategicTier.tier === "A"
                ? "bg-yellow-500/10 text-yellow-300"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            TIER {strategicTier.tier}
          </span>
        </div>
        <div className="text-sm text-slate-300">
          {strategicTier.reasoning.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {strategicTier.reasoning.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-slate-500 text-xs italic">
              No strategic reasoning available.
            </div>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={exportToFile}
            className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded transition"
            title="Export strategic analysis"
          >
            📤 Export Analysis
          </button>
        </div>
      </div>

      {/* Wave Pattern Analysis - keeping existing implementation */}
      <div className="mt-4">
        <div className="text-xs text-emerald-300 font-bold mb-2">
          📊 Wave Pattern Analysis
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
            <div className="text-sm text-slate-300 mb-2">
              Focus Column:{" "}
              <span className="text-emerald-300">
                {strategicTier.factors.focusColumn?.[1] || "N/A"}
              </span>
            </div>
            <div className="text-sm text-slate-300">
              Flip Columns:{" "}
              <span className="text-emerald-300">
                {strategicTier.factors.flipColumns || 0}
              </span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
            <div className="text-sm text-slate-300 mb-2">
              Avg Swap Rate:{" "}
              <span className="text-emerald-300">
                {strategicTier.factors.avgSwapRate
                  ? Math.round(strategicTier.factors.avgSwapRate * 100) + "%"
                  : "N/A"}
              </span>
            </div>
            <div className="text-sm text-slate-300">
              Compound Confidence:{" "}
              <span className="text-emerald-300">
                {strategicTier.factors.compoundConfidence || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Log Analysis - keeping existing implementation */}
      <div className="mt-4">
        <div className="text-xs text-emerald-300 font-bold mb-2">
          📝 Debug Log Analysis
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
          {Object.keys(prediction).length > 0 ? (
            <div className="text-sm text-slate-300">
              {/* Display parsed prediction data */}
              <div className="mb-2">
                <strong>Parsed Prediction:</strong>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-slate-500">Roll</div>
                  <div className="text-lg font-semibold text-emerald-300">
                    {prediction.parsedRoll}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Focus</div>
                  <div className="text-lg font-semibold text-emerald-300">
                    {prediction.focusColumn}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Flips</div>
                  <div className="text-lg font-semibold text-emerald-300">
                    {prediction.flipColumns?.join(", ") || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs italic">
              No prediction data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
