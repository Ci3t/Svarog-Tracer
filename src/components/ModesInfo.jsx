// src/components/ModesInfo.jsx
import React, { useState } from "react";

const MODE_EXAMPLES = {
  mono: {
    title: "mono (stuck)",
    body: (
      <>
        Last 4 rolls are the same — e.g.{" "}
        <span className="text-violet-300 font-mono">43, 43, 43, 43</span> →
        Unity looks stuck → predict{" "}
        <span className="text-cyan-300 font-mono">43</span> again.
      </>
    ),
  },
  stable: {
    title: "stable (one value dominates)",
    body: (
      <>
        Most of the rolls in this 5m window are, say,{" "}
        <span className="text-violet-300 font-mono">42</span> → predict{" "}
        <span className="text-cyan-300 font-mono">42</span>. Example:{" "}
        <span className="text-violet-300 font-mono">
          42, 43, 42, 42, 44, 42
        </span>
        .
      </>
    ),
  },
  branch: {
    title: "branch (one-time diverge)",
    body: (
      <>
        Window was mostly <span className="text-violet-300 font-mono">42</span>,
        but last roll was <span className="text-amber-300 font-mono">44</span>{" "}
        once → assume RNG branched to what usually comes after{" "}
        <span className="text-amber-300 font-mono">44</span>.
      </>
    ),
  },
  rotation: {
    title: "rotation (short loop)",
    body: (
      <>
        Pattern like{" "}
        <span className="text-violet-300 font-mono">41→43→44→41→43→44</span> →
        we pick the next in the loop →{" "}
        <span className="text-cyan-300 font-mono">41</span>.
      </>
    ),
  },
  "phase-memory": {
    title: "cyclic / phase-memory",
    body: (
      <>
        Recent rolls look like a mini-pattern we already saw earlier this
        session → reuse that phase. Example:{" "}
        <span className="text-violet-300 font-mono">
          42, 43, 44, 42, 43, 44
        </span>
        .
      </>
    ),
  },
  transition: {
    title: "transition (markov fallback)",
    body: (
      <>
        We couldn’t detect a strong pattern, so we use what usually follows a
        pair. Example: after{" "}
        <span className="text-violet-300 font-mono">42, 43</span> → usually see{" "}
        <span className="text-cyan-300 font-mono">44</span>.
      </>
    ),
  },
  wave: {
    title: "wave (commons missed)",
    body: (
      <>
        Top 1–2 values are <span className="text-violet-300 font-mono">42</span>{" "}
        and <span className="text-violet-300 font-mono">43</span>, but last
        rolls were <span className="text-amber-300 font-mono">41, 44, 44</span>{" "}
        → likely a wave → we still suggest{" "}
        <span className="text-cyan-300 font-mono">42</span> (or{" "}
        <span className="text-cyan-300 font-mono">43</span>) but with lower
        confidence.
      </>
    ),
  },
};

export default function ModesInfo() {
  const [active, setActive] = useState(null);

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 space-y-2">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide mb-1">
        Prediction modes
      </h3>
      <p className="text-[11px] text-slate-500 mb-2">
        Click a mode to see example.
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          "mono",
          "stable",
          "branch",
          "rotation",
          "phase-memory",
          "transition",
          "wave",
        ].map((m) => (
          <button
            key={m}
            onClick={() => setActive(m)}
            className={`text-[12px] px-2 py-1 rounded-md border cursor-pointer ${
              active === m
                ? "bg-violet-500/20 border-violet-400 text-slate-100"
                : "bg-slate-900/20 border-slate-700/30 text-slate-300 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-3 bg-slate-950/40 border border-slate-800/50 rounded-lg p-3">
          <h4 className="text-[14px] font-semibold text-slate-100 mb-1">
            {MODE_EXAMPLES[active].title}
          </h4>
          <p className="text-[14px] text-slate-400 leading-relaxed">
            {MODE_EXAMPLES[active].body}
          </p>
        </div>
      )}
    </div>
  );
}
