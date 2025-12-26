// Add this to KiyoModeCard.jsx - Replace the analyzeWavePatterns section

const analyzeWavePatterns = useMemo(() => {
  if (combinedRolls.length < 4) return { columns: [], /* ... */ };

  // ... existing LOOKBACK and recentRolls logic ...

  const columnAnalysis = schemes.map((scheme, idx) => {
    // ... existing run/swap/flip calculations ...

    // 🔥 NEW: Multi-stage gating system
    let finalStatus = adjustedFlipStatus.status;
    let finalConfidence = adjustedFlipStatus.confidence;
    let gatingReason = null;

    // 🚫 GATE 1: High volatility (>70% swap rate)
    if (swapRate >= 0.7) {
      finalStatus = "gated_volatile";
      finalConfidence = 0;
      gatingReason = `High swap rate (${Math.round(swapRate * 100)}%) - Pattern too unstable`;
    }

    // 🚫 GATE 2: Window warm-up (for live rolls only)
    else if (windowWarmupRemaining > 0 && live3Rolls.length > 0) {
      finalStatus = "gated_warmup";
      finalConfidence = Math.min(finalConfidence, 0.3);
      gatingReason = `Window warm-up: need ${windowWarmupRemaining} more live roll(s)`;
    }

    // 🚫 GATE 3: Near window boundary (last 20 seconds)
    else if (windowSecondsRemaining <= 20 && windowSecondsRemaining > 0) {
      finalStatus = "gated_transition";
      finalConfidence = finalConfidence * 0.5;
      gatingReason = `Window transition in ${windowSecondsRemaining}s - Pattern may shift`;
    }

    // 🚫 GATE 4: Low run length + moderate volatility
    else if (runAnalysis.length < 3 && swapRate >= 0.5) {
      finalStatus = "gated_unstable";
      finalConfidence = Math.min(finalConfidence, 0.45);
      gatingReason = `Short run (${runAnalysis.length}) + moderate volatility (${Math.round(swapRate * 100)}%)`;
    }

    // ✅ PASS: Column is good to use
    else {
      gatingReason = null; // Column passed all gates
    }

    return {
      // ... existing column properties ...
      
      // 🔥 NEW: Gating info
      isGated: finalStatus.startsWith("gated_"),
      gatingReason,
      originalStatus: adjustedFlipStatus.status,
      originalConfidence: adjustedFlipStatus.confidence,
      
      // Override status/confidence if gated
      status: finalStatus,
      confidence: finalConfidence,
      
      // 🔥 NEW: UI display logic
      shouldShowPrediction: !finalStatus.startsWith("gated_"),
      warningMessage: gatingReason,
    };
  });

  // ... rest of analyzeWavePatterns logic ...

  return {
    columns: columnAnalysis,
    // ... other properties ...
    
    // 🔥 NEW: Global window assessment
    windowQuality: (() => {
      const ungatedCols = columnAnalysis.filter(c => !c.isGated);
      if (ungatedCols.length === 0) return "SKIP";
      if (ungatedCols.length === 2 && ungatedCols.every(c => c.confidence >= 0.7)) return "GOLDEN";
      if (ungatedCols.length >= 1) return "MIXED";
      return "CHAOTIC";
    })(),
  };
}, [/* dependencies */]);


// 🔥 USAGE IN WaveAnalysisDisplay.jsx:

// Replace the column rendering logic:
{[col2, col3].map((col) => {
  // 🚫 If column is gated, show warning instead of prediction
  if (col.isGated) {
    return (
      <div key={col.column} className="bg-slate-800/40 rounded-lg p-4 border-2 border-red-500/50">
        <div className="text-center">
          <div className="text-4xl mb-2">🚫</div>
          <div className="text-sm font-bold text-red-300 mb-2">
            Column {col.column} Gated
          </div>
          <div className="text-xs text-slate-400">
            {col.gatingReason}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Original confidence: {Math.round(col.originalConfidence * 100)}%
          </div>
        </div>
      </div>
    );
  }

  // ✅ Column passed gates - show normal prediction UI
  return (
    <div key={col.column} className={`bg-gradient-to-br ${bgColor} ...`}>
      {/* Normal column display */}
    </div>
  );
})}
