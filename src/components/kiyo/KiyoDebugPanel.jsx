import React from "react";

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

  return (
    <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-700/50 space-y-3 text-[11px] font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-emerald-300 font-bold">
          🔬 Enhanced Debug Info
        </div>
        <div className="text-[10px] text-slate-500">
          Lookback: {analyzeWavePatterns.lookbackUsed} rolls
        </div>
      </div>

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
    </div>
  );
}
