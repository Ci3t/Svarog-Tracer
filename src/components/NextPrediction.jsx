// src/components/NextPrediction.jsx
import React from "react";

export default function NextPrediction({ prediction, secondsLeft }) {
  const endingSoon = typeof secondsLeft === "number" && secondsLeft <= 25;

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">
          Next line suggestion
        </h2>
        {endingSoon && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-200 border border-red-500/30">
            session shifting
          </span>
        )}
      </div>

      {prediction && prediction.prediction ? (
        <>
          <div className="bg-slate-950/40 rounded-xl p-4 border border-violet-500/20">
            <p className="text-[11px] uppercase text-slate-400 mb-1">Next</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-mono font-bold text-violet-200">
                {prediction.prediction}
              </span>
              <span className="text-xs text-violet-200/80">
                {Math.round((prediction.confidence || 0) * 100)}%
              </span>
            </div>
          </div>

          {/* alternatives */}
          {prediction.candidates && prediction.candidates.length > 1 && (
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                Alternatives
              </p>
              {prediction.candidates.slice(1, 3).map((c) => (
                <div
                  key={c.value}
                  className="flex items-center justify-between text-xs bg-slate-950/20 rounded-lg px-2 py-1"
                >
                  <span className="font-mono text-slate-200">{c.value}</span>
                  <span className="text-slate-400">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Mode: <span className="text-slate-200">{prediction.mode}</span>
          </p>
          {endingSoon && (
            <p className="text-[10px] text-amber-200/80">
              5m window about to rotate — do 1–2 fresh rolls.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Add a few rolls to see prediction.
        </p>
      )}
    </div>
  );
}
