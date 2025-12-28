export default function PredictionCard({
  prediction,
  suggestTab,
  setSuggestTab,
  rollCount = 0,
  minRolls = 6,
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
    "cyclic-enhanced": "bg-purple-500/15 text-purple-100 border-purple-400/40",
    "lcg-cycle": "bg-orange-500/15 text-orange-100 border-orange-400/40",
    "markov-3state": "bg-teal-500/15 text-teal-100 border-teal-400/40",
    "insufficient-data": "bg-slate-500/10 text-slate-400 border-slate-600/30",
  };

  const mainValue = prediction?.prediction || prediction?.pred || null;
  const confidencePct = Math.round((prediction?.confidence || 0) * 100);
  const hasPrediction = Boolean(mainValue);
  const mode = prediction?.mode || "—";

  // 🔥 FIXED: Show highest common as main, second as alt (not combined)
  const commons = prediction?.commons || [];
  const distribution = prediction?.distribution || {};
  
  let displayValue = mainValue;
  let displayConfidence = confidencePct;
  
  // For 2-str, find the highest common from distribution
  if (commons.length >= 2 && suggestTab === "2") {
    // 🔥 FIX: Distribution is an OBJECT, not an array!
    // Convert object to array: {41: {pct: 18}, 42: {pct: 36}} → [{value: '41', pct: 18}, {value: '42', pct: 36}]
    const distributionArray = Object.entries(distribution).map(([value, data]) => ({
      value,
      pct: data.pct,
      count: data.count
    }));
    
    if (distributionArray.length > 0) {
      // Find commons in distribution and sort by percentage
      const commonsWithPct = distributionArray
        .filter(d => commons.includes(d.value))
        .sort((a, b) => b.pct - a.pct);
      
      if (commonsWithPct.length > 0) {
        // Main prediction = highest common
        displayValue = commonsWithPct[0].value;
        displayConfidence = Math.round(commonsWithPct[0].pct);
      }
    } else {
      // Fallback: Show first common if distribution not available
      displayValue = commons[0];
    }
  }

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

  // 🔥 NEW: Check if we have enough rolls
  const hasEnoughRolls = rollCount >= minRolls;

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 rounded-2xl p-4 sm:p-6 border border-violet-500/20 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Next prediction
        </h3>
        <div className="flex gap-1 bg-slate-900/40 rounded-lg p-1 w-fit">
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

      {!hasEnoughRolls ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-2">
            Need at least {minRolls} rolls for accurate predictions
          </p>
          <p className="text-xs text-slate-500">
            Current: {rollCount} / {minRolls} rolls
          </p>
        </div>
      ) : hasPrediction ? (
        <div className="space-y-6">
          {/* Circular Progress Ring */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-56 h-56">
              {/* SVG Circle */}
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="112"
                  cy="112"
                  r="90"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="none"
                  className="text-slate-800"
                />
                {/* Progress Circle */}
                <circle
                  cx="112"
                  cy="112"
                  r="90"
                  stroke="url(#predictionGradient)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 90}
                  strokeDashoffset={2 * Math.PI * 90 * (1 - displayConfidence / 100)}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="predictionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-white mb-1">
                  {displayValue}
                </div>
                <div className="text-xl font-semibold text-purple-400">
                  {displayConfidence}%
                </div>
                {suggestTab === "2" &&
                  typeof prediction?.liveShare === "number" &&
                  typeof prediction?.sheetShare === "number" && (
                    <span className="text-[10px] text-slate-500 mt-1">
                      {Math.round((prediction.liveShare || 0) * 100)}% live /{" "}
                      {Math.round((prediction.sheetShare || 0) * 100)}% sheet
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* alternatives */}
          {prediction?.candidates && prediction.candidates.length > 1 && (() => {
            // 🔥 FIX: Filter out the DISPLAY value (not mainValue) to avoid duplicates
            const alternatives = prediction.candidates
              .filter(c => String(c.value) !== String(displayValue))
              .slice(0, 2); // Take top 2 alternatives
            
            return alternatives.length > 0 ? (
              <div className="flex items-center justify-center gap-3">
                {alternatives.map((c) => (
                  <div
                    key={c.value}
                    className="px-5 py-2 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
                  >
                    <span className="text-2xl font-bold text-slate-300 mr-2">
                      {c.value}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({c.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          {/* mode pill */}
          <div className="flex items-center gap-2 flex-wrap">
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
