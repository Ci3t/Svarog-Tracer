import React from "react";

export default function PredictionCard({
  prediction,
  suggestTab,
  setSuggestTab,
}) {
  const mainValue = prediction?.prediction ?? "—";
  const confidencePct = Math.round((prediction?.confidence || 0) * 100);
  const altValue = prediction?.alt || null;
  const candidates = Array.isArray(prediction?.candidates)
    ? prediction.candidates
    : [];

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        {["2", "3", "4"].map((t) => (
          <button
            key={t}
            onClick={() => setSuggestTab(t)}
            className={`px-2 py-1 rounded text-xs ${
              suggestTab === t
                ? "bg-violet-700 text-white"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {t}-STR
          </button>
        ))}
      </div>

      {/* Main Prediction */}
      <div className="bg-slate-950/40 rounded-lg p-3 border border-violet-500/20">
        <div className="text-xs text-slate-400 mb-1">Next Roll</div>

        <div className="flex items-center justify-between">
          <span className="text-3xl font-mono text-violet-300">
            {mainValue}
          </span>

          <div className="text-right">
            <div className="text-xs text-violet-200">
              {confidencePct}% confidence
            </div>

            {suggestTab === "2" &&
              typeof prediction?.liveShare === "number" && (
                <div className="text-[10px] text-slate-400">
                  {Math.round(prediction.liveShare * 100)}% live /{" "}
                  {Math.round(prediction.sheetShare * 100)}% sheet
                </div>
              )}
          </div>
        </div>

        {altValue && (
          <div className="mt-1 text-[11px] text-amber-300 font-mono">
            Alt: {altValue}
          </div>
        )}
      </div>

      {/* ✅🔥 PER-CANDIDATE PROBABILITY BARS (2-STR ONLY) */}
      {suggestTab === "2" && candidates.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-slate-700/50">
          <div className="text-[11px] text-slate-400 mb-1">
            Candidate Distribution
          </div>

          {candidates.slice(0, 6).map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px]">
              <span className="w-6 text-emerald-300 font-mono">{c.value}</span>

              <div className="flex-1 bg-slate-800 rounded h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${c.pct}%` }}
                />
              </div>

              <span className="w-8 text-slate-300 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Mode */}
      {prediction?.mode && (
        <div className="text-[10px] text-purple-300 mt-1">
          Mode: {prediction.mode}
        </div>
      )}
    </div>
  );
}
