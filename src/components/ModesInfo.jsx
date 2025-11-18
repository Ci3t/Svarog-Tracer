// src/components/ModesInfo.jsx
import React, { useState } from "react";

const MODE_EXAMPLES = {
  mono: {
    title: "mono (stuck on one value)",
    body: (
      <>
        The rolls are basically glued to one value. Example:{" "}
        <span className="text-violet-300 font-mono">43, 43, 43, 43</span> →
        Unity is &quot;stuck&quot; on the same outcome, so we just predict{" "}
        <span className="text-cyan-300 font-mono">43</span> again with very high
        confidence.
      </>
    ),
  },

  stable: {
    title: "stable (one value dominates)",
    body: (
      <>
        One value clearly dominates the recent window, even if it&apos;s not
        every roll. Example:{" "}
        <span className="text-violet-300 font-mono">
          42, 43, 42, 42, 44, 42
        </span>{" "}
        → <span className="text-violet-300 font-mono">42</span> shows up the
        most, so the predictor chooses{" "}
        <span className="text-cyan-300 font-mono">42</span> as next, with a
        solid but not insane confidence.
      </>
    ),
  },

  branch: {
    title: "branch (rare detour that usually leads somewhere)",
    body: (
      <>
        The window is mostly one value, but there&apos;s a rare
        &quot;branch&quot; that tends to lead to a specific follow-up. Example:{" "}
        <span className="text-violet-300 font-mono">42, 42, 42, 44</span> and in
        history we often see{" "}
        <span className="text-violet-300 font-mono">…42, 42, 42, 44, 41</span>
        .
        <br />
        That means when the branch{" "}
        <span className="text-amber-300 font-mono">44</span> appears, it usually
        flows into <span className="text-cyan-300 font-mono">41</span>, so we
        predict <span className="text-cyan-300 font-mono">41</span> as the next
        roll.
      </>
    ),
  },

  rotation: {
    title: "rotation (short repeating loop)",
    body: (
      <>
        Values loop in a repeating order. Example:{" "}
        <span className="text-violet-300 font-mono">
          41, 43, 44, 41, 43, 44
        </span>{" "}
        → once we detect the loop{" "}
        <span className="text-violet-300 font-mono">41 → 43 → 44</span>, and the
        last value is <span className="text-violet-300 font-mono">44</span>, the
        natural next step in the loop is{" "}
        <span className="text-cyan-300 font-mono">41</span>.
      </>
    ),
  },

  "phase-memory": {
    title: "phase-memory (reusing a known mini-pattern)",
    body: (
      <>
        The recent rolls match a mini-pattern that already happened earlier this
        session. Example:
        <br />
        Earlier:{" "}
        <span className="text-violet-300 font-mono">
          42, 43, 44, 42, 43, 44
        </span>
        <br />
        Now: <span className="text-violet-300 font-mono">42, 43, 44</span> pops
        up again at the tail.
        <br />
        The predictor remembers what usually came after that phase last time and
        reuses it, e.g. predicting{" "}
        <span className="text-cyan-300 font-mono">42</span> if history shows{" "}
        <span className="text-violet-300 font-mono">…42, 43, 44, 42</span>.
      </>
    ),
  },

  // 🔥 NEW MODES WITH IMPROVED EXAMPLES

  "cyclic-enhanced": {
    title: "cyclic-enhanced (longer repeating phase)",
    body: (
      <>
        This mode looks deeper (up to the last 12 rolls) and tries to find a
        repeating chunk, not just a tiny 2–3 roll loop.
        <br />
        Example:
        <br />
        <span className="text-violet-300 font-mono">
          41, 42, 43, 41, 42, 43, 41, 42, 43
        </span>
        <br />
        The tail <span className="text-violet-300 font-mono">
          41, 42, 43
        </span>{" "}
        shows up more than once, so we treat that as a strong cycle.
        <br />
        If the current tail is{" "}
        <span className="text-violet-300 font-mono">41, 42, 43</span>, and
        historically that was followed by{" "}
        <span className="text-violet-300 font-mono">41</span>, the mode predicts{" "}
        <span className="text-cyan-300 font-mono">41</span> again (and may offer{" "}
        <span className="text-cyan-300 font-mono">42</span> as an alt if it also
        appears after that phase).
      </>
    ),
  },

  "lcg-cycle": {
    title: "lcg-cycle (Unity RNG step pattern)",
    body: (
      <>
        Instead of just the raw values, this mode watches the{" "}
        <span className="font-mono text-amber-300">steps</span> between them on
        the 41–44 ring (mod 4).
        <br />
        For example, look at:
        <br />
        Rolls:{" "}
        <span className="text-violet-300 font-mono">
          41, 42, 43, 41, 42, 43, 41, 42
        </span>
        <br />
        If we convert to steps (mod 4), we see something like:{" "}
        <span className="text-violet-300 font-mono">
          +1, +1, +2, +1, +1, +2, +1…
        </span>{" "}
        — the same pattern of steps repeating.
        <br />
        That&apos;s exactly what a small Unity LCG cycle looks like on a 4-value
        ring. When the predictor detects that the step pattern has repeated at
        least once, it tries to continue the same step logic and suggests the
        next value (for example from{" "}
        <span className="text-violet-300 font-mono">42</span> to{" "}
        <span className="text-cyan-300 font-mono">43</span> if the next step in
        the pattern is <span className="font-mono">+1</span>).
      </>
    ),
  },

  "markov-3state": {
    title: "markov-3state (3-roll memory state)",
    body: (
      <>
        This mode treats the last{" "}
        <span className="font-mono text-violet-300">3</span> rolls as a
        &quot;state&quot; and checks what usually came after that exact triple
        in this session.
        <br />
        Suppose we see these sequences in your history:
        <br />
        <span className="text-violet-300 font-mono">41, 42, 44, 43</span>
        <br />
        <span className="text-violet-300 font-mono">41, 42, 44, 43</span>
        <br />
        <span className="text-violet-300 font-mono">41, 42, 44, 41</span>
        <br />
        The 3-state{" "}
        <span className="text-violet-300 font-mono">[41, 42, 44]</span> appears
        3 times and is followed by{" "}
        <span className="text-violet-300 font-mono">43</span> twice and{" "}
        <span className="text-violet-300 font-mono">41</span> once.
        <br />
        That means ≈66% of the time this state leads to{" "}
        <span className="text-cyan-300 font-mono">43</span>, so when your last 3
        rolls are <span className="text-violet-300 font-mono">41, 42, 44</span>,
        the mode predicts <span className="text-cyan-300 font-mono">43</span>{" "}
        with decent confidence.
      </>
    ),
  },

  "insufficient-data": {
    title: "insufficient-data (needs more rolls first)",
    body: (
      <>
        Safety mode. If there aren&apos;t enough valid 2-str rolls, the
        predictor refuses to hallucinate a pattern.
        <br />
        Example: you only have{" "}
        <span className="text-violet-300 font-mono">41, 42, 43</span> so far.
        That&apos;s only 3 valid 2-str entries, so the predictor returns{" "}
        <span className="text-cyan-300 font-mono">insufficient-data</span> and
        asks you to collect more rolls (usually 4+ for 2-str, 3+ for 3/4-str)
        before trusting any mode.
      </>
    ),
  },

  transition: {
    title: "transition (pair-based fallback)",
    body: (
      <>
        When nothing else looks strong enough, this is the &quot;boring but
        honest&quot; fallback. It just looks at what usually follows the last{" "}
        <span className="font-mono">2</span> rolls.
        <br />
        Example: in your history, the pair{" "}
        <span className="text-violet-300 font-mono">42, 43</span> is followed
        by:
        <br />
        <span className="text-violet-300 font-mono">42, 43, 44</span>
        <br />
        <span className="text-violet-300 font-mono">42, 43, 44</span>
        <br />
        <span className="text-violet-300 font-mono">42, 43, 41</span>
        <br />
        Here <span className="text-violet-300 font-mono">44</span> appears more
        often than <span className="text-violet-300 font-mono">41</span>, so the
        mode predicts <span className="text-cyan-300 font-mono">44</span> — but
        with lower confidence than phase / mono / cyclic modes.
      </>
    ),
  },

  wave: {
    title: "wave (top values skipped in a streak)",
    body: (
      <>
        The top 1–2 values are very common overall, but the most recent streak
        avoided them — like the wave pulled away and now should swing back.
        <br />
        Example: in the full window,{" "}
        <span className="text-violet-300 font-mono">42</span> and{" "}
        <span className="text-violet-300 font-mono">43</span> are the most
        frequent, but the latest streak is:
        <br />
        <span className="text-violet-300 font-mono">41, 44, 44, 41</span>
        <br />
        This mode assumes the system will &quot;return&quot; to the usual
        commons and suggests <span className="text-cyan-300 font-mono">
          42
        </span>{" "}
        or <span className="text-cyan-300 font-mono">43</span>, with medium
        confidence.
      </>
    ),
  },
};

export default function ModesInfo() {
  const [active, setActive] = useState(null);

  const MODES = [
    "mono",
    "stable",
    "branch",
    "rotation",
    "phase-memory",
    "cyclic-enhanced",
    "lcg-cycle",
    "markov-3state",
    "transition",
    "wave",
    "insufficient-data",
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 sm:p-5 space-y-2">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1">
        Prediction modes
      </h3>
      <p className="text-[11px] text-slate-500 mb-2">
        Click a mode to see how the predictor thinks in that scenario, with real
        41–44 style examples.
      </p>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setActive(m)}
            className={`text-[11px] sm:text-[12px] px-2 py-1 rounded-md border cursor-pointer ${
              active === m
                ? "bg-violet-500/20 border-violet-400 text-slate-100"
                : "bg-slate-900/20 border-slate-700/30 text-slate-300 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {active && MODE_EXAMPLES[active] && (
        <div className="mt-3 bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
          <h4 className="text-[13px] sm:text-[14px] font-semibold text-slate-100 mb-1">
            {MODE_EXAMPLES[active].title}
          </h4>
          <p className="text-[12px] sm:text-[14px] text-slate-400 leading-relaxed">
            {MODE_EXAMPLES[active].body}
          </p>
        </div>
      )}
    </div>
  );
}
