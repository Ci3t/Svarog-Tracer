import React from "react";

function caesarShiftForLine(prediction, line) {
  if (!prediction || !line) return null;
  const cleanPred = String(prediction).replace(/[^1-4]/g, "");
  if (!cleanPred) return null;
  const lineDigit = Number(line);
  if (lineDigit < 1 || lineDigit > 4) return null;
  const digits = cleanPred.split("").map(Number);
  const shift = (lineDigit - digits[0] + 4) % 4;
  const shifted = digits
    .map((d) => {
      const z = d - 1;
      const s = (z + shift) % 4;
      return (s + 1).toString();
    })
    .join("");
  return shifted;
}

export default function PredictionCards({
  analyzeWavePatterns,
  smartPrefixPrediction,
  manualLine,
  setManualLine,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* RECOMMENDED TARGET */}
      {analyzeWavePatterns?.focusColumn &&
        (() => {
          const [_, focusCol] = analyzeWavePatterns.focusColumn;
          const prefixLastDigit = smartPrefixPrediction?.prediction?.[2];
          const isAligned =
            prefixLastDigit && focusCol.flipTarget.includes(prefixLastDigit);

          return (
            <div className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/50 rounded-lg p-3 border border-cyan-500/60">
              <div className="flex items-center gap-2 mb-2">
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

              <div className="space-y-2">
                <div className="bg-cyan-950/60 rounded p-2 border border-cyan-500/40">
                  <div className="text-[12px] text-cyan-300 font-semibold mb-1">
                    Target digits:
                  </div>
                  <div className="flex gap-1">
                    {focusCol.flipTarget.map((digit) => (
                      <div
                        key={digit}
                        className="flex-1 bg-cyan-900/60 rounded px-2 py-1.5 border border-cyan-500/50 text-center"
                      >
                        <div className="text-2xl font-mono font-black text-cyan-300">
                          4{digit}
                        </div>
                        <div className="text-[11px] text-yellow-200">
                          {focusCol.flipLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[12px] text-slate-400">
                  Confidence:{" "}
                  <span className="text-cyan-300 font-bold">
                    {Math.round(focusCol.confidence * 100)}%
                  </span>
                </div>

                {/* Alignment with Smart Prefix */}
                {smartPrefixPrediction && (
                  <div
                    className={`rounded px-2 py-1.5 border text-center ${
                      isAligned
                        ? "bg-emerald-950/60 border-emerald-500/40"
                        : "bg-red-950/60 border-red-500/40"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold ${
                        isAligned ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {isAligned
                        ? "✓ WAVE & PREFIX ALIGNED"
                        : "⚠️ WAVE vs PREFIX"}
                    </div>
                    <div
                      className={`text-[9px] mt-0.5 ${
                        isAligned ? "text-emerald-200" : "text-red-200"
                      }`}
                    >
                      {isAligned
                        ? `Both suggest ${prefixLastDigit}`
                        : `Wave: ${focusCol.flipTarget.join(
                            "/"
                          )} vs Prefix: ${prefixLastDigit}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* SMART PREFIX PREDICTOR */}
      {smartPrefixPrediction && (
        <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-lg p-3 border border-cyan-500/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-xs font-bold text-cyan-300">
                SMART PREFIX PREDICTOR
              </div>
              <div className="text-[8px] text-cyan-200">
                {smartPrefixPrediction.sourceType === "typing"
                  ? "Live input suggestions"
                  : `Prefix: ${smartPrefixPrediction.sourcePrefix}x`}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/40 text-center">
              <div className="text-[10px] text-cyan-400 mb-1">
                Analyzing: {smartPrefixPrediction.sourcePrefix}x
              </div>
              {smartPrefixPrediction.prediction ? (
                <>
                  <div className="text-3xl font-mono font-black text-cyan-300 mb-1">
                    {smartPrefixPrediction.prediction}
                  </div>
                  <div className="text-xs font-bold text-cyan-400">
                    {Math.round(smartPrefixPrediction.confidence * 100)}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {smartPrefixPrediction.matchCount} matches
                    {smartPrefixPrediction.confidenceBoost && (
                      <span
                        className={`ml-1 font-semibold ${
                          smartPrefixPrediction.confidenceBoost > 0
                            ? "text-emerald-400"
                            : "text-orange-400"
                        }`}
                      >
                        ({smartPrefixPrediction.confidenceBoost > 0 ? "+" : ""}
                        {Math.round(
                          smartPrefixPrediction.confidenceBoost * 100
                        )}
                        % live)
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-mono font-black text-orange-300 mb-1">
                    —
                  </div>
                  <div className="text-xs text-orange-400">
                    Insufficient data
                  </div>
                </>
              )}
            </div>

            {smartPrefixPrediction.prediction && smartPrefixPrediction.alt && (
              <div className="bg-blue-950/60 rounded-lg p-2 border border-blue-500/40 text-center">
                <div className="text-[10px] text-blue-400 mb-0.5">
                  Alternative
                </div>
                <div className="text-lg font-mono font-bold text-blue-300">
                  {smartPrefixPrediction.alt}
                </div>
                <div className="text-[10px] text-blue-400">
                  {Math.round(smartPrefixPrediction.confidence * 0.7 * 100)}%
                </div>
              </div>
            )}

            {/* All Candidates */}
            {smartPrefixPrediction.prediction && (
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">
                  All {smartPrefixPrediction.sourcePrefix}x options:
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {smartPrefixPrediction.candidates.map((cand, idx) => (
                    <div
                      key={cand.value}
                      className={`px-2 py-1.5 rounded text-xs font-mono font-bold text-center ${
                        idx === 0
                          ? "bg-cyan-500/20 border-2 border-cyan-400/60 text-cyan-300"
                          : idx === 1
                          ? "bg-blue-500/20 border border-blue-400/60 text-blue-300"
                          : "bg-slate-800/60 border border-slate-600/40 text-slate-300"
                      }`}
                    >
                      <div className="text-sm">{cand.value}</div>
                      <div className="text-[9px] opacity-75">{cand.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LINE HELPER */}
      <div className="rounded-lg p-3 border border-slate-500/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📍</span>
          <div>
            <div className="text-xs font-bold text-amber-300">LINE HELPER</div>
            <div className="text-[10px] text-amber-200">
              Caesar shift for your line
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] text-amber-300 font-semibold">
            Your line:
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((line) => (
              <button
                key={line}
                onClick={() =>
                  setManualLine(manualLine === String(line) ? "" : String(line))
                }
                className={`py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                  manualLine === String(line)
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/50"
                }`}
              >
                {line}
              </button>
            ))}
          </div>
        </div>

        {manualLine && smartPrefixPrediction && (
          <div className="space-y-1 pt-2 mt-2 border-t border-amber-500/30">
            {(() => {
              const mainShifted = caesarShiftForLine(
                smartPrefixPrediction.prediction,
                manualLine
              );
              const altShifted = caesarShiftForLine(
                smartPrefixPrediction.alt,
                manualLine
              );

              return (
                <>
                  {mainShifted && (
                    <div className="bg-violet-900/30 rounded p-1.5 border border-violet-500/30">
                      <div className="text-[10px] text-violet-300 font-semibold mb-0.5">
                        Main @ Line {manualLine}
                      </div>
                      <div className="text-lg font-mono font-black text-violet-300 text-center">
                        {mainShifted}
                      </div>
                    </div>
                  )}
                  {altShifted && (
                    <div className="bg-sky-900/30 rounded p-1.5 border border-sky-500/30">
                      <div className="text-[10px] text-sky-300 font-semibold mb-0.5">
                        Alt @ Line {manualLine}
                      </div>
                      <div className="text-base font-mono font-bold text-sky-300 text-center">
                        {altShifted}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {!manualLine && (
          <div className="text-center py-2 mt-2 text-[8px] text-amber-400/60 bg-amber-950/20 rounded border border-amber-500/20">
            Select a line to see Caesar shift
          </div>
        )}
      </div>
    </div>
  );
}
