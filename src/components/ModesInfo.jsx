import React, { useState } from "react";

const MODE_EXAMPLES = {
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
          Confidence: 85% | Uses decay-weighted frequency
        </span>
      </>
    ),
  },

  wave: {
    title: "Wave",
    description: "Dominant number disappeared → expect it to return",
    body: (
      <>
        Top 2 most frequent rolls; if the #1 is missing from recent 5, it's
        about to return.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">42, 42, 42, 41, 43</span>
        <br />
        <span className="text-slate-400">→ Top 2:</span>{" "}
        <span className="text-violet-300">42 (50%), 41 (20%)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 68% | Triggered when dominant disappears
        </span>
      </>
    ),
  },

  "smart-transition": {
    title: "Smart Transition",
    description: "Learn what follows the last roll with decay weighting",
    body: (
      <>
        Finds all past occurrences of the last roll, sees what came next,
        weights by recency.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">42, 44, 42, 43, 42, 44, 42, 41</span>
        <br />
        <span className="text-slate-400">→ Times 42 appeared:</span>{" "}
        <span className="text-violet-300">
          pos 0→44, pos 2→43, pos 4→44, pos 6→41
        </span>
        <br />
        <span className="text-slate-400">→ After 42 came:</span>{" "}
        <span className="text-violet-300">
          44 (2x recent), 43 (1x), 41 (1x)
        </span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span> (weighted for
        recency)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–72% | Requires confidence ≥ 0.5
        </span>
      </>
    ),
  },

  "markov-3state": {
    title: "Markov 3-State",
    description: "Use last 3 rolls as a learned pattern key",
    body: (
      <>
        Builds a table: for each sequence of 3 rolls, what came next? Looks up
        the last 3.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">41, 42, 44, 43, 41, 42, 44</span>
        <br />
        <span className="text-slate-400">
          → Pattern [41, 42, 44] seen before
        </span>
        <br />
        <span className="text-slate-400">→ Next was:</span>{" "}
        <span className="text-violet-300">43</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">43</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 50–76% | Requires ≥2 samples + 48% confidence
        </span>
      </>
    ),
  },

  "cyclic-enhanced": {
    title: "Cyclic Enhanced",
    description: "Detect repeating loops of 2-4 rolls",
    body: (
      <>
        Scans for repeating chunks (cycles). If last chunk matches a previous
        one, predict the first element of that chunk.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">41, 42, 41, 42, 41, 42</span>
        <br />
        <span className="text-slate-400">→ Cycle detected:</span>{" "}
        <span className="text-violet-300">[41, 42]</span>
        <br />
        <span className="text-slate-400">→ Last chunk:</span>{" "}
        <span className="text-violet-300">[41, 42]</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">41</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 62–70%+ | Scales with cycle count
        </span>
      </>
    ),
  },

  "opposite-pair": {
    title: "Opposite Pair",
    description: "Mirror logic: 41↔44, 42↔43",
    body: (
      <>
        If the last roll repeated recently but its opposite hasn't, predict the
        opposite.
        <br />
        <span className="text-slate-400">Opposites:</span>{" "}
        <span className="text-violet-300">41 ↔ 44 | 42 ↔ 43</span>
        <br />
        <span className="text-slate-400">History (last 4):</span>{" "}
        <span className="text-violet-300">41, 41, 43, 41</span>
        <br />
        <span className="text-slate-400">→ Last = 41 (appeared 3x)</span>
        <br />
        <span className="text-slate-400">→ Opposite 44 (appeared 0x)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 58–62% | Requires imbalance in recent 4
        </span>
      </>
    ),
  },

  "phase-memory": {
    title: "Phase Memory",
    description: "Remember and repeat old roll 'phases'",
    body: (
      <>
        Caches up to 4 unique 'phases' (sets of 2-3 distinct values). If current
        phase matches a past one, predict based on that phase's history.
        <br />
        <span className="text-slate-400">Stored phase:</span>{" "}
        <span className="text-violet-300">[41, 43, 42]</span>
        <br />
        <span className="text-slate-400">Current tail:</span>{" "}
        <span className="text-violet-300">41, 43, 41, 42, 43</span>
        <br />
        <span className="text-slate-400">→ Matches phase!</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">41 or 43</span> (most
        common in tail)
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 56% | Cache size: 4 phases
        </span>
      </>
    ),
  },

  "transition-fallback": {
    title: "Transition Fallback",
    description: "Use smart-transition with lower confidence threshold",
    body: (
      <>
        Weaker version of Smart Transition. Used when main patterns fail.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">42, 44, 42, 43, 42, 44, 42, 41</span>
        <br />
        <span className="text-slate-400">→ After 42 came:</span>{" "}
        <span className="text-violet-300">44 (2x), 43 (1x), 41 (1x)</span>
        <br />
        <span className="text-slate-400">→ Main confidence was too low,</span>
        <br />
        <span className="text-slate-400">
          → but fallback still predicts:
        </span>{" "}
        <span className="text-emerald-300 font-bold">44</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 40–72% | Fallback layer (lower threshold)
        </span>
      </>
    ),
  },

  "frequency-fallback": {
    title: "Frequency Fallback",
    description: "Predict the most common recent roll",
    body: (
      <>
        When no pattern detected, fall back to frequency analysis with decay
        weighting (recent rolls count more).
        <br />
        <span className="text-slate-400">Recent rolls:</span>{" "}
        <span className="text-violet-300">41, 41, 42, 41, 44</span>
        <br />
        <span className="text-slate-400">→ Frequency (weighted):</span>{" "}
        <span className="text-violet-300">41 (50%), 42 (20%), 44 (20%)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">41</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 42–66% | Decay factor: 0.9 (recent weighted higher)
        </span>
      </>
    ),
  },
  // ADD AFTER "frequency-fallback" mode

  "anti-repeat": {
    title: "Anti-Repeat (EU)",
    description: "EU servers avoid repeating recent values",
    body: (
      <>
        EU RNG tends to avoid values that appeared recently. Predicts the LEAST
        recent value when last value repeated 2+ times.
        <br />
        <span className="text-slate-400">History (last 6):</span>{" "}
        <span className="text-violet-300">41, 43, 41, 42, 41, 41</span>
        <br />
        <span className="text-slate-400">→ Last value (41) appeared 4x</span>
        <br />
        <span className="text-slate-400">→ Least recent:</span>{" "}
        <span className="text-violet-300">44 (not seen)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">44</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 58% | EU-specific pattern (chaos resistance)
        </span>
      </>
    ),
  },

  "wave-theory-3str-eu": {
    title: "Wave Theory (EU 3-str)",
    description: "Paired alternation analysis across 3 columns",
    body: (
      <>
        Analyzes 3 pairing schemes to predict which digit comes next based on
        alternation rhythm.
        <br />
        <span className="text-slate-400">Recent rolls:</span>{" "}
        <span className="text-violet-300">421, 423, 422, 421, 424</span>
        <br />
        <span className="text-slate-400">Column 1 (Odds vs Evens):</span>{" "}
        <span className="text-violet-300">[1,3] appeared 3x → flip to [2,4]</span>
        <br />
        <span className="text-slate-400">Column 2 (Outer vs Inner):</span>{" "}
        <span className="text-violet-300">[1,4] appeared 2x → flip to [2,3]</span>
        <br />
        <span className="text-slate-400">Column 3 (Low vs High):</span>{" "}
        <span className="text-violet-300">[1,2] appeared 3x → flip to [3,4]</span>
        <br />
        <span className="text-slate-400">→ Consensus votes:</span>{" "}
        <span className="text-violet-300">digit 3 (2 columns), digit 2 (2 columns)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">423</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 50–72% | EU-specific | Analyzes pair flip timing
        </span>
      </>
    ),
  },

  "dominant-fallback": {
    title: "Dominant Fallback",
    description: "Absolute last resort → most common all-time",
    body: (
      <>
        When absolutely nothing works, predict the most frequent value across
        entire history.
        <br />
        <span className="text-slate-400">All history:</span>{" "}
        <span className="text-violet-300">
          42 (45%), 41 (30%), 43 (15%), 44 (10%)
        </span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">42</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 42% | Final layer before giving up
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

  // 3-STR modes
  "mono-3str": {
    title: "Mono (3-str)",
    description: "Last 4 rolls are identical 3-digit values",
    body: (
      <>
        Same as 2-str mono but for 3-digit rolls.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">421, 421, 421, 421</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">421</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 85%
        </span>
      </>
    ),
  },

  "transition-3str": {
    title: "Transition (3-str)",
    description: "What follows the last 3-digit roll?",
    body: (
      <>
        Smart transition logic adapted for 3-digit rolls.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">421, 443, 421, 432, 421</span>
        <br />
        <span className="text-slate-400">→ After 421 came:</span>{" "}
        <span className="text-violet-300">443, 432</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">443</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–72%
        </span>
      </>
    ),
  },

  "frequency-3str": {
    title: "Frequency (3-str)",
    description: "Most common 3-digit roll",
    body: (
      <>
        Fallback frequency analysis for 3-digit rolls.
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">421, 421, 432, 421, 443</span>
        <br />
        <span className="text-slate-400">→ Frequency:</span>{" "}
        <span className="text-violet-300">421 (60%)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">421</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–68%
        </span>
      </>
    ),
  },

  // 4-STR modes
  "mono-4str": {
    title: "Mono (4-str)",
    description: "Last 4 rolls are identical 4-digit values",
    body: (
      <>
        Same as 2-str mono but for 4-digit rolls.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">4213, 4213, 4213, 4213</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">4213</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 85%
        </span>
      </>
    ),
  },

  "transition-4str": {
    title: "Transition (4-str)",
    description: "What follows the last 4-digit roll?",
    body: (
      <>
        Smart transition logic for 4-digit rolls.
        <br />
        <span className="text-slate-400">History:</span>{" "}
        <span className="text-violet-300">4213, 4432, 4213, 4321, 4213</span>
        <br />
        <span className="text-slate-400">→ After 4213 came:</span>{" "}
        <span className="text-violet-300">4432, 4321</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">4432</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–72%
        </span>
      </>
    ),
  },

  "frequency-4str": {
    title: "Frequency (4-str)",
    description: "Most common 4-digit roll",
    body: (
      <>
        Fallback frequency for 4-digit rolls.
        <br />
        <span className="text-slate-400">Recent:</span>{" "}
        <span className="text-violet-300">4213, 4213, 4321, 4213, 4432</span>
        <br />
        <span className="text-slate-400">→ Frequency:</span>{" "}
        <span className="text-violet-300">4213 (60%)</span>
        <br />
        <span className="text-slate-400">→ Predicts:</span>{" "}
        <span className="text-emerald-300 font-bold">4213</span>
        <br />
        <span className="text-xs text-slate-500 mt-2 block">
          Confidence: 45–68%
        </span>
      </>
    ),
  },
};

const MODES = [
  // 2-str (main)
  "mono",
  "wave",
  "smart-transition",
  "anti-repeat",
  "markov-3state",
  "cyclic-enhanced",
  "opposite-pair",
  "phase-memory",
  "transition-fallback",
  "frequency-fallback",
  "dominant-fallback",
  "insufficient-data",
  // 3-str
  "mono-3str",
  "wave-theory-3str-eu",
  "transition-3str",
  "frequency-3str",
  // 4-str
  "mono-4str",
  "transition-4str",
  "frequency-4str",
];

const MODE_GROUPS = {
  "2-str": [
    "mono",
    "wave",
    "anti-repeat",
    "smart-transition",
    "markov-3state",
    "cyclic-enhanced",
    "opposite-pair",
    "phase-memory",
    "transition-fallback",
    "frequency-fallback",
    "dominant-fallback",
    "insufficient-data",
  ],
  "3-str": ["mono-3str",  "wave-theory-3str-eu",  "transition-3str", "frequency-3str"],
  "4-str": ["mono-4str", "transition-4str", "frequency-4str"],
};

export default function ModesInfo() {
  const [active, setActive] = useState(null);
  const [group, setGroup] = useState("2-str");

  const currentModes = MODE_GROUPS[group] || MODE_GROUPS["2-str"];

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1">
          Prediction Modes
        </h3>
        <p className="text-[11px] text-slate-500 mb-2">
          Click a mode to see how the predictor works. Modes are organized by
          roll type (2-str / 3-str / 4-str).
        </p>
      </div>

      {/* Group selector */}
      <div className="flex gap-2">
        {Object.keys(MODE_GROUPS).map((g) => (
          <button
            key={g}
            onClick={() => {
              setGroup(g);
              setActive(null);
            }}
            className={`text-[11px] px-3 py-1.5 rounded-lg border transition ${
              group === g
                ? "bg-violet-600/30 border-violet-500 text-violet-200"
                : "bg-slate-900/30 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Mode buttons */}
      <div className="flex flex-wrap gap-2">
        {currentModes.map((m) => (
          <button
            key={m}
            onClick={() => setActive(m)}
            className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-md border cursor-pointer transition ${
              active === m
                ? "bg-violet-500/20 border-violet-400 text-slate-100"
                : "bg-slate-900/20 border-slate-700/30 text-slate-300 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Detail view */}
      {active && MODE_EXAMPLES[active] && (
        <div className="mt-3 bg-slate-950/40 border border-slate-800/50 rounded-lg p-3 space-y-2">
          <div>
            <h4 className="text-[13px] sm:text-[14px] font-semibold text-slate-100">
              {MODE_EXAMPLES[active].title}
            </h4>
            <p className="text-[11px] text-slate-500 italic">
              {MODE_EXAMPLES[active].description}
            </p>
          </div>
          <p className="text-[12px] sm:text-[13px] text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-2 rounded border border-slate-800/30">
            {MODE_EXAMPLES[active].body}
          </p>
        </div>
      )}
    </div>
  );
}
