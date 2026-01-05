import React, { useState } from "react";

const MODE_EXAMPLES = {
  // 🔥 BBP Adaptive (New SUGGEST logic)
  "BBP-pattern-shift": {
    title: "BBP: Pattern Shift",
    description: "Detects fundamental shift in commons/noise distribution",
    body: (
      <>
        The 80% accuracy mode. Identifies when previously random noise values become the new dominant commons.
        <br />
        <span className="text-slate-400">Signal:</span>{" "}
        <span className="text-emerald-300">New pattern locked 🔒</span>
        <br />
        <span className="text-slate-400">→ Result:</span>{" "}
        <span className="text-emerald-300 font-bold">Swap logic</span> targets new hot values
      </>
    ),
  },
  "BBP-wave": {
    title: "BBP: Wave Transition",
    description: "Predicts based on consistent transition targets",
    body: (
      <>
        Used when simple frequency fails but the "next" digit follows a strong wave pattern.
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">41 → 43, 41 → 43, 41</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">43</span> (target lock)
      </>
    ),
  },
  "BBP-overdue": {
    title: "BBP: Overdue Capture",
    description: "Catches values that are statistically 'due' to return",
    body: (
      <>
        Detects a "missing" value with rising momentum.
        <br />
        <span className="text-slate-400">Absent:</span>{" "}
        <span className="text-orange-400">44 (not seen in 8 rolls)</span>
        <br />
        <span className="text-slate-400">→ Momentum:</span>{" "}
        <span className="text-emerald-400">Rising ↑</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span> (return)
      </>
    ),
  },
  "BBP-trend": {
    title: "BBP: Trend Tiebreaker",
    description: "Uses rising/falling momentum for close calls",
    body: (
      <>
        When two values are tied in probability, momentum breaks the tie.
        <br />
        <span className="text-slate-400">Tie:</span>{" "}
        <span className="text-violet-300">41 vs 42</span>
        <br />
        <span className="text-slate-400">→ Trend:</span>{" "}
        <span className="text-emerald-400">42 is rising ↑</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span>
      </>
    ),
  },
  "BBP-double-tap": {
    title: "BBP: Double Tap",
    description: "Detects noise values that tend to repeat once",
    body: (
      <>
        Noise values appearing in pairs.
        <br />
        <span className="text-slate-400">Pattern:</span>{" "}
        <span className="text-violet-300">43, 43 ... 44, 44</span>
        <br />
        <span className="text-slate-400">→ Last:</span>{" "}
        <span className="text-slate-400">43 (first hit)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">43</span> (repeat)
      </>
    ),
  },

  // Legacy/Basic
  "BBP-alternating": {
    title: "Basic: Alternating",
    description: "Simple switch between two values",
    body: "Classic flip-flop pattern detection. Simplest BBP mode.",
  },
  "BBP-dominance": {
    title: "Basic: Dominance",
    description: "One value appears >55% of the time",
    body: "Focuses on the most frequent value in the session.",
  },
  "BBP-balanced": {
    title: "Basic: Balanced",
    description: "Values are roughly equal in frequency",
    body: "No clear leader, predictor waits for pattern or uses matrix.",
  },

  // LEGACY MODES
  mono: {
    title: "Mono",
    description: "Last 4 rolls are identical → predict repetition",
    body: (
      <>
        When the last 4 rolls are all the same value.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">42, 42, 42, 42</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 85% | Legacy mode
        </span>
      </>
    ),
  },

  "smart-transition": {
    title: "Smart Transition (Legacy)",
    description: "Learn what follows the last roll with decay weighting",
    body: (
      <>
        Finds all past occurrences of the last roll, sees what came next.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">42, 44, 42, 43, 42, 44, 42, 41</span>
        <br />
        <span className="text-slate-400">→ After 42 came:</span>{" "}
        <span className="text-violet-300">44 (2x recent), 43 (1x), 41 (1x)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–72% | Fallback when BBP Mode confidence low
        </span>
      </>
    ),
  },

  "insufficient-data": {
    title: "Insufficient Data",
    description: "Not enough history to make a prediction",
    body: (
      <>
        Requires ≥6 rolls before any pattern detection starts.
        <br />
        <span className="text-slate-400">Current history:</span>{" "}
        <span className="text-violet-300">41, 42</span>
        <br />
        <span className="text-slate-400">→ Only 2 rolls, need 6+</span>
        <br />
        <span className="text-slate-400">→ Result:</span>{" "}
        <span className="text-slate-400">No prediction</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 0% | Minimum threshold: 6 rolls
        </span>
      </>
    ),
  },
};

const MODE_GROUPS = {
  "BBP Adaptive (New)": [
    "BBP-pattern-shift",
    "BBP-wave",
    "BBP-overdue",
    "BBP-trend",
    "BBP-double-tap",
  ],
  "Basic BBP patterns": [
    "BBP-alternating",
    "BBP-dominance",
    "BBP-balanced",
  ],
  "Legacy": [
    "mono",
    "smart-transition",
    "insufficient-data",
  ],
};

export default function ModernDefaultOrderCard() {
  const [active, setActive] = useState(null);
  const [group, setGroup] = useState("BBP Adaptive (New)");

  const currentModes = MODE_GROUPS[group] || MODE_GROUPS["BBP Adaptive (New)"];

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Prediction Modes
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Click a mode to see how the predictor detects patterns.
        </p>
      </div>

      {/* Group selector */}
      <div className="flex gap-2 mb-4">
        {Object.keys(MODE_GROUPS).map((g) => (
          <button
            key={g}
            onClick={() => {
              setGroup(g);
              setActive(null);
            }}
            className={`text-[11px] px-4 py-2 rounded-xl border transition-all duration-200 font-medium ${
              group === g
                ? "bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500 text-white shadow-lg"
                : "bg-slate-900/30 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {currentModes.map((m) => (
          <button
            key={m}
            onClick={() => setActive(m)}
            className={`text-[10px] sm:text-[11px] px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              active === m
                ? "bg-violet-500/20 border-violet-400 text-slate-100 shadow-md"
                : "bg-slate-900/20 border-slate-700/30 text-slate-300 hover:text-white hover:bg-slate-800/30 hover:border-slate-600"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Detail view */}
      {active && MODE_EXAMPLES[active] && (
        <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div>
            <h4 className="text-[13px] sm:text-[14px] font-semibold text-slate-100 mb-1">
              {MODE_EXAMPLES[active].title}
            </h4>
            <p className="text-[11px] text-slate-500 italic">
              {MODE_EXAMPLES[active].description}
            </p>
          </div>
          <div className="text-[12px] sm:text-[13px] text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800/30">
            {MODE_EXAMPLES[active].body}
          </div>
        </div>
      )}
    </div>
  );
}
