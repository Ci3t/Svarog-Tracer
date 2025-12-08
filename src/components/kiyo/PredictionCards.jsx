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
  const [_, focusCol] = analyzeWavePatterns?.focusColumn || [null, null];
  const prefixLastDigit = smartPrefixPrediction?.prediction?.[2];
  const isAligned =
    focusCol &&
    prefixLastDigit &&
    focusCol.flipTarget.includes(prefixLastDigit);

  return (
    <div className="space-y-3">
      {/* LINE HELPER */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📍</span>
          <div>
            <div className="text-sm font-bold text-amber-300">LINE HELPER</div>
            <div className="text-[10px] text-amber-200">
              Caesar shift for your line
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] text-amber-300 font-semibold">
            Your line:
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((line) => (
              <button
                key={line}
                onClick={() =>
                  setManualLine(manualLine === String(line) ? "" : String(line))
                }
                className={`py-2 rounded text-sm font-bold transition-all cursor-pointer ${
                  manualLine === String(line)
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-700/60 text-slate-400 hover:bg-slate-700 border border-slate-600/50"
                }`}
              >
                {line}
              </button>
            ))}
          </div>
        </div>

        {manualLine && smartPrefixPrediction && (
          <div className="space-y-2 pt-3 mt-3 border-t border-amber-500/30">
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
                    <div className="bg-violet-900/30 rounded-lg p-3 border border-violet-500/40">
                      <div className="text-[10px] text-violet-300 font-semibold mb-1">
                        Main @ Line {manualLine}
                      </div>
                      <div className="text-2xl font-mono font-black text-violet-300 text-center">
                        {mainShifted}
                      </div>
                    </div>
                  )}
                  {altShifted && (
                    <div className="bg-sky-900/30 rounded-lg p-3 border border-sky-500/40">
                      <div className="text-[10px] text-sky-300 font-semibold mb-1">
                        Alt @ Line {manualLine}
                      </div>
                      <div className="text-xl font-mono font-bold text-sky-300 text-center">
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
          <div className="text-center py-3 mt-3 text-xs text-amber-400/60 bg-amber-950/20 rounded border border-amber-500/20">
            Select a line to see Caesar shift
          </div>
        )}
      </div>
    </div>
  );
}
