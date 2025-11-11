// src/components/PredictionCard.jsx
export default function PredictionCard({
  prediction,
  suggestTab,
  setSuggestTab,
}) {
  const tabs = ["2", "3", "4"];

  // color per mode
  const MODE_COLORS = {
    mono: "bg-rose-500/20 text-rose-200 border-rose-400/60",
    "mono-3str": "bg-rose-500/20 text-rose-200 border-rose-400/60",
    "mono-4str": "bg-rose-500/20 text-rose-200 border-rose-400/60",

    "phase-memory": "bg-violet-500/15 text-violet-100 border-violet-400/50",
    "phase-memory-3str":
      "bg-violet-500/15 text-violet-100 border-violet-400/50",
    "phase-memory-4str":
      "bg-violet-500/15 text-violet-100 border-violet-400/50",

    stable: "bg-sky-500/15 text-sky-100 border-sky-400/40",
    "stable-3str": "bg-sky-500/15 text-sky-100 border-sky-400/40",
    "stable-4str": "bg-sky-500/15 text-sky-100 border-sky-400/40",

    branch: "bg-amber-500/15 text-amber-100 border-amber-400/40",
    rotation: "bg-emerald-500/15 text-emerald-100 border-emerald-400/40",
    cyclic: "bg-purple-500/15 text-purple-100 border-purple-400/40",
    "markov-3str": "bg-teal-500/15 text-teal-100 border-teal-400/40",
    "markov-4str": "bg-teal-500/15 text-teal-100 border-teal-400/40",
    transition: "bg-slate-500/10 text-slate-100 border-slate-400/30",
    "transition-3str": "bg-slate-500/10 text-slate-100 border-slate-400/30",
    "transition-4str": "bg-slate-500/10 text-slate-100 border-slate-400/30",
    wave: "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-400/40",
    "wave-3str": "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-400/40",
    "wave-4str": "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-400/40",
  };

  const mainValue = prediction?.prediction || prediction?.pred || null;
  const confidencePct = Math.round((prediction?.confidence || 0) * 100);
  const hasPrediction = Boolean(mainValue);
  const mode = prediction?.mode || "—";

  // little subtitle under the mode
  const activeLabel =
    suggestTab === "2"
      ? "2-str stream"
      : suggestTab === "3"
      ? "3-str stream"
      : "4-str stream";

  // pick class for the pill
  const modeClass =
    MODE_COLORS[mode] || "bg-slate-700/30 text-slate-100 border-slate-500/20";

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-2xl p-6 border border-violet-500/20 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Next prediction
        </h3>
        <div className="flex gap-1 bg-slate-900/40 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSuggestTab(tab)}
              className={`px-2 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                suggestTab === tab
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {tab}-str
            </button>
          ))}
        </div>
      </div>

      {hasPrediction ? (
        <div className="space-y-4">
          {/* main block */}
          <div className="bg-slate-950/30 rounded-xl p-4 border border-violet-500/10">
            <p className="text-xs text-slate-400 mb-1">Next roll</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-4xl font-mono bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                {mainValue}
              </span>
              <span className="text-xs font-medium text-violet-100">
                {confidencePct}% confidence
              </span>
            </div>
          </div>

          {/* alternatives */}
          {prediction?.candidates && prediction.candidates.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">
                Alternatives
              </p>
              {prediction.candidates.slice(1, 3).map((c) => (
                <div
                  key={c.value}
                  className="flex items-center justify-between bg-slate-900/30 rounded-lg px-3 py-2 border border-slate-700/20"
                >
                  <span className="font-mono text-sm text-slate-200">
                    {c.value}
                  </span>
                  <span className="text-xs text-slate-400">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}

          {/* mode pill */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border ${modeClass}`}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
              {mode}
            </span>
            <span className="text-[10px] text-slate-500">{activeLabel}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Add a few rolls to see prediction.
        </p>
      )}
    </div>
  );
}
