// src/components/PredictionCard.jsx
import React from "react";
import { predictNext } from "../utils/predictNext";
import { translateTo4 } from "../utils/stringHelpers";

export default function PredictionCard({ entries }) {
  const [tab, setTab] = React.useState("2"); // "2" | "3" | "4"

  // sort oldest -> newest
  const ordered = [...entries].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );

  // build 3 different streams from the same entries
  const rolls2 = ordered
    .map((e) => (e.translated ? translateTo4(e.translated).slice(0, 2) : ""))
    .filter((v) => v.length === 2);

  const rolls3 = ordered
    .map((e) => (e.translated ? translateTo4(e.translated).slice(0, 3) : ""))
    .filter((v) => v.length === 3);

  const rolls4 = ordered
    .map((e) => (e.translated ? translateTo4(e.translated).slice(0, 4) : ""))
    .filter((v) => v.length === 4);

  // pick stream based on tab
  const stream = tab === "2" ? rolls2 : tab === "3" ? rolls3 : rolls4;
  const prediction = predictNext(stream);

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-2xl p-6 border border-violet-500/20 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Next prediction
        </h3>
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 cursor-pointer">
          {["2", "3", "4"].map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                tab === tabName
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tabName}-str
            </button>
          ))}
        </div>
      </div>

      {prediction && prediction.prediction ? (
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-violet-500/30">
            <p className="text-xs text-slate-400 mb-1">Next roll</p>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-mono bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                {prediction.prediction}
              </span>
              <span className="text-xs font-medium text-violet-200">
                {Math.round((prediction.confidence || 0) * 100)}% confidence
              </span>
            </div>
          </div>

          {prediction.candidates && prediction.candidates.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">
                Alternatives
              </p>
              {prediction.candidates.slice(1, 3).map((c) => (
                <div
                  key={c.value}
                  className="flex items-center justify-between bg-slate-900/30 rounded-lg px-3 py-2 border border-slate-700/30"
                >
                  <span className="font-mono text-sm text-slate-200">
                    {c.value}
                  </span>
                  <span className="text-xs text-slate-400">
                    {c.pct ?? Math.round((c.conf || 0) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Mode:{" "}
            <span className="text-slate-200 font-medium">
              {prediction.mode}
            </span>{" "}
            <span className="text-slate-500">{`(tab: ${tab}-str stream)`}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Add a few rolls to see prediction.
        </p>
      )}
    </div>
  );
}
