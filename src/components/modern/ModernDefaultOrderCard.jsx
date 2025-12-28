import React, { useState } from "react";

const MODE_EXAMPLES = {
  // BBP Mode PATTERNS
  "BBP-alternating": {
    title: "BBP Mode: Alternating",
    description: "Commons flip back and forth between 2 values",
    body: (
      <>
        BBP Mode identified 2 commons (e.g., 41 & 42) and detected they're alternating.
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">41, 42</span>
        <br />
        <span className="text-slate-400">Recent pattern:</span>{" "}
        <span className="text-violet-300">41, 42, 41, 42, 41</span>
        <br />
        <span className="text-slate-400">→ Last was 41</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span> (flip)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 70-85% | Pattern: alternating
        </span>
      </>
    ),
  },

  "BBP-dominant": {
    title: "BBP Mode: Dominant",
    description: "One common appears >55% of the time",
    body: (
      <>
        One value is clearly dominant (appears &gt;55%).
        <br />
        <span className="text-slate-400">Distribution:</span>{" "}
        <span className="text-violet-300">42 (60%), 41 (25%), 43 (10%), 44 (5%)</span>
        <br />
        <span className="text-slate-400">→ Commons:</span>{" "}
        <span className="text-green-400">42, 41</span>
        <br />
        <span className="text-slate-400">→ Dominant:</span>{" "}
        <span className="text-amber-400">42 (60%)</span> 🟡
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 75-90% | Pattern: dominant | Badge: DOMINANT (amber)
        </span>
      </>
    ),
  },

  "BBP-sticky": {
    title: "BBP Mode: Sticky",
    description: "One common repeats 2-3 times in a row",
    body: (
      <>
        Detected a "sticky" pattern where one common repeats consecutively.
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">42, 41</span>
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">41, 42, 42, 42, 43</span>
        <br />
        <span className="text-slate-400">→ 42 repeated 3x (sticky run)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span> (continue run)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 65-80% | Pattern: sticky
        </span>
      </>
    ),
  },

  "BBP-wave": {
    title: "BBP Mode: Wave",
    description: "Noise values alternating (1-2 flips)",
    body: (
      <>
        Noise values are alternating instead of random (EU region common).
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">41, 42</span>
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">42, 41, 44, 41</span>
        <br />
        <span className="text-slate-400">→ Wave detected:</span>{" "}
        <span className="text-amber-300">41 ↔ 44</span> (alternating)
        <br />
        <span className="text-slate-400">→ Last was 41</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span> (continue wave)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 65% | Pattern: wave (1-2 flips)
        </span>
      </>
    ),
  },

  "BBP-wave-ending": {
    title: "BBP Mode: Wave Ending",
    description: "Wave ending after 3 flips → snap to common",
    body: (
      <>
        After 3 wave flips, expect snap-back to commons.
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">41, 42</span>
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">42, 41, 44, 41, 44</span>
        <br />
        <span className="text-slate-400">→ Wave:</span>{" "}
        <span className="text-amber-300">41 ↔ 44 ↔ 41</span> (3 flips)
        <br />
        <span className="text-slate-400">→ Wave ending</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span> (snap to common)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 68% | Pattern: wave-ending (3 flips)
        </span>
      </>
    ),
  },

  "BBP-dominance-run": {
    title: "BBP Mode: Dominance Run",
    description: "One common running 4-7 times consecutively",
    body: (
      <>
        Detected a dominance run (4-7 consecutive hits of same value).
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">41, 42</span>
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">42, 41, 41, 41, 41, 41</span>
        <br />
        <span className="text-slate-400">→ 41 running 5x (dominance)</span>
        <br />
        <span className="text-slate-400">→ Continues until 8+ hits</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">41</span> (continue run)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 72% | Pattern: dominance-run (4-7 hits)
        </span>
      </>
    ),
  },

  "BBP-noise-run": {
    title: "BBP Mode: Noise Run",
    description: "Noise values (43/44) repeating",
    body: (
      <>
        Noise values appeared 2+ times consecutively.
        <br />
        <span className="text-slate-400">Commons:</span>{" "}
        <span className="text-green-400">41, 42</span>
        <br />
        <span className="text-slate-400">Noise:</span>{" "}
        <span className="text-slate-500">43, 44</span>
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">41, 42, 43, 43, 43</span>
        <br />
        <span className="text-slate-400">→ Noise (43) running 3x</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">43</span> (might continue)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 60% | Pattern: noise-run
        </span>
      </>
    ),
  },

  "BBP-balanced": {
    title: "BBP Mode: Balanced",
    description: "Commons are roughly equal in frequency",
    body: (
      <>
        Both commons appear with similar frequency (balanced).
        <br />
        <span className="text-slate-400">Distribution:</span>{" "}
        <span className="text-violet-300">41 (30%), 42 (30%), 43 (25%), 44 (15%)</span>
        <br />
        <span className="text-slate-400">→ Commons:</span>{" "}
        <span className="text-green-400">41, 42</span> (both 30%)
        <br />
        <span className="text-slate-400">→ Pattern:</span>{" "}
        <span className="text-violet-300">Balanced (no clear dominance)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">41 or 42</span> (equal chance)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 50-65% | Pattern: balanced
        </span>
      </>
    ),
  },

  "BBP-chaotic": {
    title: "BBP Mode: Chaotic",
    description: "All values appear equally (no pattern)",
    body: (
      <>
        Distribution is too flat - all values appear roughly equally.
        <br />
        <span className="text-slate-400">Distribution:</span>{" "}
        <span className="text-violet-300">41 (25%), 42 (25%), 43 (25%), 44 (25%)</span>
        <br />
        <span className="text-slate-400">→ No clear commons detected</span>
        <br />
        <span className="text-slate-400">→ Result:</span>{" "}
        <span className="text-slate-400">Skip prediction (chaotic)</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 0% | Pattern: chaotic (insufficient pattern)
        </span>
      </>
    ),
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
  "BBP Mode (2-str)": [
    "BBP-alternating",
    "BBP-dominant",
    "BBP-dominance-run",
    "BBP-sticky",
    "BBP-wave",
    "BBP-wave-ending",
    "BBP-balanced",
    "BBP-noise-run",
    "BBP-chaotic",
  ],
  "Legacy (2-str)": [
    "mono",
    "smart-transition",
    "insufficient-data",
  ],
};

export default function ModernDefaultOrderCard() {
  const [active, setActive] = useState(null);
  const [group, setGroup] = useState("BBP Mode (2-str)");

  const currentModes = MODE_GROUPS[group] || MODE_GROUPS["BBP Mode (2-str)"];

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Prediction Modes
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Click a mode to see how BBP Mode detects patterns. Organized by pattern type.
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
