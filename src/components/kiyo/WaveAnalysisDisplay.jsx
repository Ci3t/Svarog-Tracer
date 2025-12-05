import React from "react";

export default function WaveAnalysisDisplay({ analyzeWavePatterns }) {
  if (!analyzeWavePatterns) return null;

  const hasFlipColumns = analyzeWavePatterns.flipCols?.length > 0;

  return (
    <div className="flex flex-col">
      {hasFlipColumns ? (
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/40 rounded-lg p-3 border border-orange-500/60 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-sm font-bold text-orange-300">
                DUE TO FLIP
              </div>
              <div className="text-[9px] text-orange-200">
                {analyzeWavePatterns.flipCols.length} column
                {analyzeWavePatterns.flipCols.length > 1 ? "s" : ""} showing
                long run
              </div>
            </div>
          </div>

          {/* Focus Column Detail */}
          {analyzeWavePatterns.focusColumn &&
            (() => {
              const [_, focusCol] = analyzeWavePatterns.focusColumn;
              return (
                <div className="bg-orange-950/60 rounded-lg p-3 border border-orange-500/40 mb-2 flex-1 flex flex-col">
                  <div className="text-xs text-orange-300 font-bold mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    <span>Focus: {focusCol.scheme.name}</span>
                  </div>

                  <div className="space-y-3 flex-1">
                    {/* Rhythm Pattern Display */}
                    <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                      <div className="text-[10px] text-orange-200 mb-1.5">
                        Rhythm Pattern
                      </div>
                      <div className="text-base font-mono font-black text-orange-300 mb-1">
                        {focusCol.rhythmDisplay}
                      </div>
                      <div className="text-xs text-orange-400">
                        Run: {focusCol.run.length} consecutive{" "}
                        {focusCol.currentLabel}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                        <div className="text-[10px] text-orange-200 mb-1">
                          Current Run
                        </div>
                        <div className="text-2xl font-black text-orange-300">
                          {focusCol.run.length}
                          <span className="text-base text-orange-400 ml-0.5">
                            {focusCol.currentLabel[0]}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30">
                        <div className="text-[10px] text-emerald-200 mb-1">
                          Expected Flip
                        </div>
                        <div className="text-lg font-black text-emerald-300">
                          {focusCol.flipLabel}
                        </div>
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-orange-200">
                          Flip Confidence
                        </span>
                        <span className="text-sm font-bold text-orange-300">
                          {Math.round(focusCol.confidence * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-orange-950/60 rounded-full overflow-hidden border border-orange-500/30">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-400 transition-all duration-300"
                          style={{ width: `${focusCol.confidence * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-[9px] text-orange-200 mt-1">
                        {focusCol.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* All Columns Grid */}
          <div className="grid grid-cols-3 gap-2 flex-1 content-start">
            {Object.entries(analyzeWavePatterns.columnAnalysis).map(
              ([key, col]) => {
                const urgencyColors = {
                  critical:
                    "from-red-900/80 to-orange-900/80 border-red-500/70",
                  high: "from-orange-900/70 to-amber-900/70 border-orange-500/60",
                  medium:
                    "from-amber-900/60 to-yellow-900/60 border-amber-500/50",
                  low: "from-slate-800/60 to-slate-700/60 border-slate-600/50",
                  none: "from-slate-900/60 to-slate-800/60 border-slate-700/50",
                  skip: "from-purple-900/60 to-violet-900/60 border-purple-500/50",
                };

                const urgencyBadge = {
                  critical: "🔴 CRITICAL",
                  high: "🟠 HIGH",
                  medium: "🟡 MEDIUM",
                  low: "⚪ LOW",
                  none: "🔵 NONE",
                  skip: "🟣 SKIP",
                };

                return (
                  <div
                    key={key}
                    className={`rounded-lg p-2 border bg-gradient-to-br ${
                      urgencyColors[col.urgency] || urgencyColors.none
                    }`}
                  >
                    {/* Header with urgency badge */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[11px] font-bold text-slate-300">
                        {col.scheme.name}
                      </div>
                      <div
                        className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                          col.urgency === "critical"
                            ? "bg-red-500/30 text-red-200"
                            : col.urgency === "high"
                            ? "bg-orange-500/30 text-orange-200"
                            : col.urgency === "medium"
                            ? "bg-amber-500/30 text-amber-200"
                            : "bg-slate-700/30 text-slate-400"
                        }`}
                      >
                        {urgencyBadge[col.urgency] || "NONE"}
                      </div>
                    </div>

                    {/* Rhythm pattern */}
                    <div className="text-[10px] font-mono mb-1 text-slate-400">
                      {col.rhythmDisplay.slice(-11)}
                    </div>

                    {/* Run info with icon */}
                    <div className="text-[11px] mb-1 flex items-center gap-1">
                      <span className="text-slate-400">Run:</span>
                      <span className="text-lg">{col.flipStatus.icon}</span>
                      <span
                        className={
                          col.urgency === "critical" || col.urgency === "high"
                            ? "text-orange-300 font-bold"
                            : "text-slate-300"
                        }
                      >
                        {col.run.length} {col.currentLabel[0]}
                      </span>
                    </div>

                    {/* Confidence bar */}
                    <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full ${
                          col.urgency === "critical"
                            ? "bg-gradient-to-r from-red-400 to-orange-400"
                            : col.urgency === "high"
                            ? "bg-gradient-to-r from-orange-400 to-amber-400"
                            : col.urgency === "medium"
                            ? "bg-amber-500"
                            : "bg-slate-600"
                        }`}
                        style={{ width: `${col.confidence * 100}%` }}
                      ></div>
                    </div>

                    {/* Status message */}
                    <div
                      className={`text-[9px] font-bold ${
                        col.urgency === "critical" || col.urgency === "high"
                          ? "text-orange-300"
                          : col.urgency === "medium"
                          ? "text-amber-300"
                          : "text-slate-500"
                      }`}
                    >
                      {col.status === "due_to_flip"
                        ? `⚠️ → ${col.flipLabel}`
                        : col.status === "post_flip_cooldown"
                        ? "⏸️ POST-FLIP"
                        : col.status === "could_go_either_way"
                        ? "🤔 Either Way"
                        : col.status === "likely_continue"
                        ? `→ ${col.flipLabel}`
                        : col.status === "ignored"
                        ? "🚫 IGNORE"
                        : "Balanced"}
                    </div>

                    {/* Swap Rate with color coding */}
                    <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                      <span className="text-[10px]">Swap:</span>
                      <span
                        className={`font-bold text-[10px] ${
                          col.swapRate >= 0.7
                            ? "text-red-400"
                            : col.swapRate >= 0.4
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {(col.swapRate * 100).toFixed(0)}% ({col.swapRateLabel})
                      </span>
                    </div>

                    {/* Post-flip warning */}
                    {col.missedFlip?.justFlipped && (
                      <div className="mt-1 text-[8px] bg-purple-900/40 rounded px-1.5 py-1 border border-purple-500/40 text-purple-200">
                        ⏸️ Just flipped from {col.missedFlip.previousRun}-run
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-lg p-3 border border-emerald-500/40 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✓</span>
            <div>
              <div className="text-sm font-bold text-emerald-300">BALANCED</div>
              <div className="text-[9px] text-emerald-200">
                No strong run patterns detected
              </div>
            </div>
          </div>

          {/* Show all columns with short runs */}
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(analyzeWavePatterns.columnAnalysis).map(
              ([key, col]) => (
                <div
                  key={key}
                  className="bg-slate-900/60 rounded p-2 border border-slate-700/50"
                >
                  <div className="text-[11px] font-bold text-slate-300 mb-1">
                    {col.scheme.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mb-1">
                    {col.rhythmDisplay.slice(-11)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Run: {col.run.length} {col.currentLabel[0]}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
