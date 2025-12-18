// import React from "react";

export default function WaveAnalysisDisplay({
  analyzeWavePatterns,
  smartPrefixPrediction,
}) {
  // Defensive: ensure columns exists & has at least 2 entries
  const hasData =
    Array.isArray(analyzeWavePatterns?.columns) &&
    analyzeWavePatterns.columns.length >= 2;

  const cols = analyzeWavePatterns?.columns ?? [];
  const col2 = hasData ? cols[0] : null;
  const col3 = hasData ? cols[1] : null;

  // focusColumn is expected like [index, colObj]
  const [__, rawFocusCol] = analyzeWavePatterns?.focusColumn || [null, null];
  const focusCol = rawFocusCol || null;

  // Make focusCol.flipTarget safe everywhere
  const focusFlipTarget = Array.isArray(focusCol?.flipTarget)
    ? focusCol.flipTarget
    : [];

  // 5-min window helpers (optional)
  const windowInfo = analyzeWavePatterns?.window || null;
  const warmupRemaining = windowInfo?.warmupRemaining ?? 0;
  const secondsRemaining = windowInfo?.secondsRemaining;
  const minsLeft =
    typeof secondsRemaining === "number"
      ? Math.floor(secondsRemaining / 60)
      : null;
  const secsLeft =
    typeof secondsRemaining === "number"
      ? String(secondsRemaining % 60).padStart(2, "0")
      : null;

  const windowQuality = analyzeWavePatterns?.windowQuality;

  const gatedCount = cols.filter((c) => c?.isGated).length;

  // avgSwapRate might be undefined or non-number
  const avgSwapRateNum = Number(analyzeWavePatterns?.avgSwapRate);
  const avgSwapRatePct = Number.isFinite(avgSwapRateNum)
    ? (avgSwapRateNum * 100).toFixed(0)
    : null;

  const postFlipColumns = Array.isArray(analyzeWavePatterns?.postFlipColumns)
    ? analyzeWavePatterns.postFlipColumns
    : [];

  return (
    <div className="space-y-3">
      {/* Wave Pattern Analysis Card */}
      <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-cyan-500/60 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-cyan-300">
              🌊 Wave Pattern Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Column 2 & 3 flip detection
            </p>
          </div>

          {hasData ? (
            <div className="text-right text-xs text-slate-400">
              <div>
                Avg Swap:{" "}
                <span className="text-white font-semibold">
                  {avgSwapRatePct ?? "—"}%
                </span>
              </div>
              <div>
                Flip Columns:{" "}
                <span className="text-cyan-300 font-semibold">
                  {analyzeWavePatterns?.flipColumns ?? 0}/2
                </span>
              </div>
              {gatedCount > 0 && (
                <div className="text-[10px] text-red-300 mt-1">
                  🚫 {gatedCount} gated
                </div>
              )}
            </div>
          ) : (
            <div className="text-right text-xs text-slate-400">
              <div>⏳ Waiting for data...</div>
            </div>
          )}
        </div>

        {/* Show placeholder when no data */}
        {!hasData ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-sm mb-2">No wave data yet</div>
            <div className="text-xs text-slate-500">
              Add at least 4 rolls to see wave pattern analysis
            </div>
          </div>
        ) : (
          <>
            {/* Post-Flip Warning */}
            {postFlipColumns.length > 0 && (
              <div className="mb-4 bg-purple-900/40 rounded-lg p-3 border border-purple-500/50 text-center">
                <div className="text-sm font-bold text-purple-200">
                  🟣 POST-FLIP COOLDOWN DETECTED
                </div>
                <div className="text-xs text-purple-300 mt-1">
                  Column {postFlipColumns.join(", ")} just flipped - SKIP
                  betting
                </div>
              </div>
            )}

            {/* Column Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[col2, col3].map((col, idx) => {
                // Defensive: skip if missing
                if (!col) return null;

                // Make flipTarget safe for this column
                const flipTarget = Array.isArray(col.flipTarget)
                  ? col.flipTarget
                  : [];

                const isPostFlip =
                  col.flipStatus?.status === "post_flip_cooldown";
                const isIgnored = Boolean(col.isIgnored);
                const urgency = col.urgency;

                // Background color based on urgency
                const bgColor = isPostFlip
                  ? "from-purple-900/30 to-purple-800/30"
                  : isIgnored
                  ? "from-gray-800/40 to-gray-700/40"
                  : urgency === "critical"
                  ? "from-red-900/40 to-red-800/40"
                  : urgency === "high"
                  ? "from-orange-900/40 to-orange-800/40"
                  : urgency === "medium"
                  ? "from-yellow-900/40 to-yellow-800/40"
                  : "from-slate-700/40 to-slate-600/40";

                // Border color
                const borderColor = isPostFlip
                  ? "border-purple-500/50"
                  : isIgnored
                  ? "border-gray-600/40"
                  : urgency === "critical"
                  ? "border-red-500/60"
                  : urgency === "high"
                  ? "border-orange-500/60"
                  : urgency === "medium"
                  ? "border-yellow-500/60"
                  : "border-slate-600/40";

                // Gated view
                if (col.isGated) {
                  return (
                    <div
                      key={col.column ?? `col-${idx}`}
                      className="bg-slate-800/40 rounded-lg p-4 border-2 border-red-500/50"
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">🚫</div>
                        <div className="text-sm font-bold text-red-300 mb-2">
                          Column {col.column ?? "?"} Gated
                        </div>
                        <div className="text-xs text-slate-400">
                          {col.gatingReason ?? "No gating reason provided"}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Original confidence:{" "}
                          {Number.isFinite(col.originalConfidence)
                            ? `${Math.round(col.originalConfidence * 100)}%`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={col.column ?? `col-${idx}`}
                    className={`bg-linear-to-br ${bgColor} rounded-lg p-4 border-2 ${borderColor}`}
                  >
                    {/* Icon + Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{col.icon ?? "📌"}</span>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {col.name ?? "Column"}
                        </div>
                        <div className="text-xs text-slate-300">
                          {col.label ?? ""}
                        </div>
                      </div>
                    </div>

                    {/* Run Length */}
                    <div className="text-center mb-3">
                      <div className="text-5xl font-black text-white">
                        {col.runLength ?? 0}
                      </div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">
                        CONSECUTIVE RUN
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        ({col.runLength ?? 0} {col.currentLabel ?? ""} in a row)
                      </div>
                    </div>

                    <div className="bg-black/30 rounded p-2 mb-3">
                      <div className="text-xs text-slate-400 mb-1">
                        Current Pattern:
                      </div>
                      <div className="text-lg font-bold text-cyan-300">
                        {col.currentPair === "A"
                          ? `${col.scheme?.pairALabel ?? ""} (${(
                              col.scheme?.pairA ?? []
                            ).join("/")})`
                          : `${col.scheme?.pairBLabel ?? ""} (${(
                              col.scheme?.pairB ?? []
                            ).join("/")})`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {urgency === "critical" || urgency === "high"
                          ? "⚠️ Pattern likely to flip soon"
                          : urgency === "medium"
                          ? "⏳ Pattern may continue or flip"
                          : "✓ Pattern stable"}
                      </div>
                    </div>

                    {/* Expected Flip / Continuation */}
                    {!isIgnored && !isPostFlip && flipTarget.length > 0 && (
                      <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/40 text-center mb-3">
                        <div className="text-xs text-cyan-400 mb-1 uppercase font-semibold">
                          {col.status === "due_to_flip"
                            ? "⚡ EXPECTED TO FLIP TO:"
                            : col.status === "likely_continue"
                            ? "✅ EXPECTED TO CONTINUE:"
                            : "🟡 PATTERN OUTLOOK:"}
                        </div>

                        <div className="text-3xl font-black text-cyan-300 mb-1">
                          {col.status === "likely_continue"
                            ? col.currentLabel ?? "—"
                            : col.flipLabel ?? "—"}
                        </div>

                        <div className="text-sm text-slate-300">
                          [
                          {col.status === "likely_continue"
                            ? col.currentPair === "A"
                              ? (col.scheme?.pairA ?? []).join(", ")
                              : (col.scheme?.pairB ?? []).join(", ")
                            : flipTarget.join(", ")}
                          ]
                        </div>

                        <div className="text-[10px] text-cyan-400 mt-2">
                          {col.status === "due_to_flip"
                            ? urgency === "critical"
                              ? "🔴 FLIP VERY LIKELY - Bet now!"
                              : urgency === "high"
                              ? "🟠 FLIP LIKELY - Good opportunity"
                              : "🟡 FLIP POSSIBLE - Monitor"
                            : col.status === "likely_continue"
                            ? "✅ Trend continuation expected"
                            : "🟡 No strong signal - Monitor"}
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Confidence */}
                      <div className="bg-black/20 rounded p-2">
                        <div className="text-slate-400 text-[10px] mb-1">
                          Flip Confidence
                        </div>
                        <div className="text-white font-bold text-lg">
                          {Number.isFinite(col.confidence)
                            ? `${Math.round(col.confidence * 100)}%`
                            : "—"}
                        </div>
                        <div className="text-slate-500 text-[9px] mt-0.5">
                          {col.confidence >= 0.8
                            ? "Very High"
                            : col.confidence >= 0.65
                            ? "High"
                            : col.confidence >= 0.5
                            ? "Moderate"
                            : "Low"}
                        </div>
                      </div>

                      {/* Swap Rate */}
                      <div className="bg-black/20 rounded p-2">
                        <div className="text-slate-400 text-[10px] mb-1">
                          Swap Rate (Volatility)
                        </div>
                        <div
                          className={`font-bold text-lg ${
                            col.swapRate < 0.3
                              ? "text-green-400"
                              : col.swapRate < 0.6
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {Number.isFinite(col.swapRate)
                            ? `${Math.round(col.swapRate * 100)}%`
                            : "—"}
                        </div>
                        <div className="text-slate-500 text-[9px] mt-0.5">
                          {col.swapRateLabel ?? ""}
                        </div>
                      </div>
                    </div>

                    {/* Adaptive Note */}
                    {col.adaptiveNote && (
                      <div className="mt-2 text-xs text-cyan-300 bg-cyan-950/40 rounded px-2 py-1.5">
                        🧠 {col.adaptiveNote}
                      </div>
                    )}

                    {/* Warm-up */}
                    {warmupRemaining > 0 && (
                      <div className="mt-3 text-xs text-center text-slate-300 italic border-t border-slate-700/50 pt-2">
                        Warm-up: need {warmupRemaining} more roll(s) in this
                        5-min window
                        {minsLeft !== null && secsLeft !== null && (
                          <span className="ml-2 opacity-80">
                            (≈{minsLeft}m {secsLeft}s left)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message */}
                    <div className="mt-2 text-xs text-center text-slate-300 italic">
                      {col.message ?? ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Alignment Status Banner */}
      {smartPrefixPrediction && focusCol && (
        <div
          className={`rounded-lg px-3 py-2 border text-center text-sm font-bold ${(() => {
            const prefixLastDigit = smartPrefixPrediction.prediction?.[2];
            const isAligned =
              prefixLastDigit && focusFlipTarget.includes(prefixLastDigit);
            return isAligned
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-orange-950/60 border-orange-500/40 text-orange-300";
          })()}`}
        >
          {(() => {
            const prefixLastDigit = smartPrefixPrediction.prediction?.[2];
            const isAligned =
              prefixLastDigit && focusFlipTarget.includes(prefixLastDigit);
            return isAligned
              ? "✓ WAVE & PREFIX AGREE - HIGH CONFIDENCE"
              : "⚠️ WAVE vs PREFIX CONFLICT";
          })()}
        </div>
      )}

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* RECOMMENDED TARGET (Wave) */}
        <div className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/50 rounded-lg p-3 border border-cyan-500/60">
          <div className="bg-linear-to-br from-cyan-900/50 to-emerald-900/50 rounded-lg p-3 border border-cyan-500/60">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-xs font-bold text-cyan-300">
                RECOMMENDED TARGET
              </div>
              <div className="text-[10px] text-cyan-200">
                Based on wave rhythm
              </div>
            </div>
          </div>

          {focusFlipTarget.length > 0 ? (
            <div className="space-y-2">
              <div className="bg-cyan-950/60 rounded p-2 border border-cyan-500/40">
                <div className="text-[12px] text-cyan-300 font-semibold mb-1">
                  Target digits:
                </div>
                <div className="flex gap-1">
                  {focusFlipTarget.map((digit) => (
                    <div
                      key={digit}
                      className="flex-1 bg-cyan-900/60 rounded px-2 py-1.5 border border-cyan-500/50 text-center"
                    >
                      <div className="text-2xl font-mono font-black text-cyan-300">
                        4{digit}
                      </div>
                      <div className="text-[11px] text-yellow-200">
                        {focusCol?.flipLabel ?? ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[12px] text-slate-400">
                Confidence:{" "}
                <span className="text-cyan-300 font-bold">
                  {Number.isFinite(focusCol?.confidence)
                    ? `${Math.round(focusCol.confidence * 100)}%`
                    : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-xs">No wave target yet</div>
              <div className="text-[10px] text-slate-500 mt-1">
                Waiting for flip pattern
              </div>
            </div>
          )}
        </div>

        {/* SMART PREFIX PREDICTOR */}
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-lg p-3 border border-cyan-500/60">
          <div className="bg-linear-to-br from-cyan-900/50 to-blue-900/50 rounded-lg p-3 border border-cyan-500/60">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-xs font-bold text-cyan-300">
                SMART PREFIX PREDICTOR
              </div>
              <div className="text-[8px] text-cyan-200">
                {smartPrefixPrediction?.sourceType === "typing"
                  ? "Live input suggestions"
                  : smartPrefixPrediction?.sourcePrefix
                  ? `Prefix: ${smartPrefixPrediction.sourcePrefix}x`
                  : "Waiting for input"}
              </div>
            </div>
          </div>

          {smartPrefixPrediction && smartPrefixPrediction.prediction ? (
            <div className="space-y-2">
              <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/40 text-center">
                <div className="text-[10px] text-cyan-400 mb-1">
                  Analyzing: {smartPrefixPrediction.sourcePrefix}x
                </div>
                <div className="text-3xl font-mono font-black text-cyan-300 mb-1">
                  {smartPrefixPrediction.prediction}
                </div>
                <div className="text-xs font-bold text-cyan-400">
                  {Math.round((smartPrefixPrediction.confidence ?? 0) * 100)}%
                  {smartPrefixPrediction.blendInfo?.liveWeight > 0 && (
                    <span className="ml-1 text-[9px] text-cyan-200">
                      (
                      {Math.round(
                        smartPrefixPrediction.blendInfo.liveWeight * 100
                      )}
                      % live)
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {smartPrefixPrediction.matchCount ?? 0} matches
                </div>
              </div>

              {smartPrefixPrediction.alt && (
                <div className="bg-blue-950/60 rounded-lg p-2 border border-blue-500/40 text-center">
                  <div className="text-[10px] text-blue-400 mb-0.5">
                    Alternative
                  </div>
                  <div className="text-lg font-mono font-bold text-blue-300">
                    {smartPrefixPrediction.alt}
                  </div>
                  <div className="text-[10px] text-blue-400">
                    {Math.round(
                      (smartPrefixPrediction.confidence ?? 0) * 0.7 * 100
                    )}
                    %
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-xs">No prediction yet</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {smartPrefixPrediction?.sourcePrefix
                  ? "Insufficient data for this prefix"
                  : "Start typing or add rolls"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Window Quality Alert */}
      {hasData && windowQuality && (
        <div
          className={`mb-4 rounded-lg p-3 border text-center ${
            windowQuality === "SKIP"
              ? "bg-red-900/40 border-red-500/50"
              : windowQuality === "MIXED"
              ? "bg-yellow-900/40 border-yellow-500/50"
              : windowQuality === "GOLDEN"
              ? "bg-green-900/40 border-green-500/50"
              : "bg-slate-900/40 border-slate-500/50"
          }`}
        >
          <div
            className={`text-sm font-bold ${
              windowQuality === "SKIP"
                ? "text-red-200"
                : windowQuality === "MIXED"
                ? "text-yellow-200"
                : windowQuality === "GOLDEN"
                ? "text-green-200"
                : "text-slate-200"
            }`}
          >
            {windowQuality === "SKIP"
              ? "🚫 SKIP THIS WINDOW – wait for next boundary"
              : windowQuality === "MIXED"
              ? "⚠️ MIXED QUALITY – proceed with caution"
              : windowQuality === "GOLDEN"
              ? "✅ GOLDEN WINDOW – optimal conditions"
              : "🤷 CHAOTIC WINDOW"}
          </div>
        </div>
      )}
    </div>
  );
}
