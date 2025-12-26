import React, { useRef, useEffect } from "react";

export default function WaveAccuracyDisplay({ waveAccuracy, kiyoAccuracy }) {
  // Persist data using refs
  const persistedWaveAccuracy = useRef(null);
  const persistedKiyoAccuracy = useRef(null);

  // Update persisted data only when new valid data is received
  useEffect(() => {
    if (waveAccuracy && waveAccuracy.combined.pct > 0) {
      persistedWaveAccuracy.current = waveAccuracy;
    }
    if (kiyoAccuracy && kiyoAccuracy.total > 0) {
      persistedKiyoAccuracy.current = kiyoAccuracy;
    }
  }, [waveAccuracy, kiyoAccuracy]);

  // Use persisted data if current data is not valid
  const displayWaveAccuracy =
    waveAccuracy && waveAccuracy.combined.pct > 0
      ? waveAccuracy
      : persistedWaveAccuracy.current;
  const displayKiyoAccuracy =
    kiyoAccuracy && kiyoAccuracy.total > 0
      ? kiyoAccuracy
      : persistedKiyoAccuracy.current;

  const hasData = displayWaveAccuracy && displayWaveAccuracy.combined.pct > 0;

  return (
    <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-lg p-3 border border-cyan-500/40">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <div>
          <div className="text-sm font-bold text-cyan-300">
            Wave Flip Accuracy
          </div>
          <div className="text-[10px] text-cyan-400">
            Column 2 & 3 digit predictions
          </div>
        </div>
      </div>

      {!hasData ? (
        // Show placeholder when no data
        <div className="text-center py-4 text-slate-400 text-xs">
          <div className="mb-1">⏳ No predictions yet</div>
          <div className="text-[10px] text-slate-500">
            Wave accuracy will appear after making predictions
          </div>
        </div>
      ) : (
        <>
          {/* Wave Column Accuracy */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-cyan-950/40 rounded-lg p-2 border border-cyan-500/20">
              <div className="text-[10px] text-slate-400 mb-1">
                Column 2 (Outer/Inner)
              </div>
              <div className="text-2xl font-black text-cyan-300">
                {displayWaveAccuracy.col2.pct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {displayWaveAccuracy.col2.hits}/{displayWaveAccuracy.col2.total}{" "}
                correct
              </div>
            </div>

            <div className="bg-emerald-950/40 rounded-lg p-2 border border-emerald-500/20">
              <div className="text-[10px] text-slate-400 mb-1">
                Column 3 (Low/High)
              </div>
              <div className="text-2xl font-black text-emerald-300">
                {displayWaveAccuracy.col3.pct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {displayWaveAccuracy.col3.hits}/{displayWaveAccuracy.col3.total}{" "}
                correct
              </div>
            </div>
          </div>

          {/* Combined Wave Accuracy */}
          <div className="bg-blue-950/40 rounded-lg p-2 border border-blue-500/30">
            <div className="text-[10px] text-slate-400 mb-1">
              Combined Wave Accuracy
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xl font-black text-sky-300">
                {displayWaveAccuracy.combined.pct}%
              </div>
              <div className="text-[9px] text-slate-400">
                {displayWaveAccuracy.col2.hits + displayWaveAccuracy.col3.hits}{" "}
                /{" "}
                {displayWaveAccuracy.col2.total +
                  displayWaveAccuracy.col3.total}{" "}
                predictions
              </div>
            </div>
          </div>

          {/* Comparison with Full Roll */}
          {displayKiyoAccuracy && displayKiyoAccuracy.total > 0 && (
            <div className="mt-3 pt-3 border-t border-cyan-500/20">
              <div className="text-[10px] text-slate-400 mb-1">
                vs Full Roll (Tracer)
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-300">
                  Wave:{" "}
                  <span className="font-bold text-cyan-300">
                    {displayWaveAccuracy.combined.pct}%
                  </span>
                </div>
                <div className="text-slate-400">|</div>
                <div className="text-slate-300">
                  Tracer:{" "}
                  <span className="font-bold text-violet-300">
                    {displayKiyoAccuracy.top2Pct}%
                  </span>
                </div>
              </div>
              <div className="mt-1 text-[9px] text-slate-500">
                {displayWaveAccuracy.combined.pct > displayKiyoAccuracy.top2Pct
                  ? "✅ Wave more accurate"
                  : displayWaveAccuracy.combined.pct ===
                    displayKiyoAccuracy.top2Pct
                  ? "⚖️ Equal accuracy"
                  : "⚠️ Tracer more accurate"}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
