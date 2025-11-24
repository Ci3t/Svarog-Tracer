// src/components/LongStringLabCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { decodeLongString } from "../utils/stringHelpers.js";
import { predictNext, getModeBreakdown } from "../utils/predictNext.js";

export default function LongStringLabCard({ onSendToDebug }) {
  const [input, setInput] = useState("");

  // decode to pairs + 2-str rolls
  const { cleaned, pairs, rolls } = useMemo(
    () => decodeLongString(input),
    [input]
  );

  // main sandbox prediction (winner mode)
  const labPrediction = useMemo(() => {
    if (!rolls.length) return null;
    return predictNext(rolls);
  }, [rolls]);
  const altSandboxPct = useMemo(() => {
    if (!labPrediction || !labPrediction.alt) return null;
    const candidates = Array.isArray(labPrediction.candidates)
      ? labPrediction.candidates
      : [];
    const match = candidates.find(
      (c) => String(c.value) === String(labPrediction.alt)
    );
    return match ? match.pct : null;
  }, [labPrediction]);
  // per-mode breakdown (who votes what)
  const modeBreakdown = useMemo(() => {
    if (!rolls.length) return {};
    return getModeBreakdown(rolls);
  }, [rolls]);

  // 🔥 AUTO-SEND: whenever new decoded rolls appear, send ONLY the new ones
  // to debug, like a live stream.
  const prevRollCountRef = useRef(0);
  useEffect(() => {
    if (!onSendToDebug) return;

    // if user deleted chars, just reset the counter – don't send anything
    if (rolls.length <= prevRollCountRef.current) {
      prevRollCountRef.current = rolls.length;
      return;
    }

    const newRolls = rolls.slice(prevRollCountRef.current);
    prevRollCountRef.current = rolls.length;

    if (newRolls.length) {
      // e.g. [ "41" ] or [ "41","43" ] etc.
      onSendToDebug(newRolls);
    }
  }, [rolls, onSendToDebug]);

  const handleChange = (e) => {
    setInput(e.target.value);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-200">
            🧪 Long String Lab
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Type a long string like{" "}
            <span className="text-violet-300 font-mono">41242323</span> and see
            the decoded 2-str rolls + predictions. Rolls are sent to the{" "}
            <span className="text-violet-300">2-str debug</span> automatically
            as you type.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-1">
        <label className="text-[11px] text-slate-400">
          Long string (digits{" "}
          <span className="text-violet-300 font-semibold">1–4</span> only)
        </label>
        <input
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Example: 41242323"
          className="w-full rounded-lg bg-slate-950/70 border border-slate-700/60 px-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
        />
        {input && cleaned !== input.replace(/[^1-4]/g, "") && (
          <p className="text-[10px] text-amber-400 mt-0.5">
            Non 1–4 characters ignored. Cleaned:{" "}
            <span className="font-mono text-violet-300">{cleaned}</span>
          </p>
        )}
      </div>

      {/* Caesar pairs */}
      <div className="space-y-1">
        <div className="text-[11px] text-slate-400">
          Caesar pairs (sliding window):
        </div>
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/80 px-3 py-2 text-[11px] text-slate-200 font-mono min-h-[32px] max-h-24 overflow-y-auto">
          {pairs.length ? (
            <span className="space-x-1">
              {pairs.map((p, idx) => (
                <span key={`${p}-${idx}`} className="text-violet-300">
                  {p}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-slate-500">… waiting for input</span>
          )}
        </div>
      </div>

      {/* Decoded rolls */}
      <div className="space-y-1">
        <div className="text-[11px] text-slate-400">Decoded 2-str rolls:</div>
        <div className="bg-slate-950/70 rounded-lg border border-slate-800/80 px-3 py-2 text-[11px] text-slate-200 font-mono min-h-[32px] max-h-24 overflow-y-auto">
          {rolls.length ? (
            <span className="space-x-1">
              {rolls.map((r, idx) => (
                <span key={`${r}-${idx}`} className="text-emerald-300">
                  {r}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-slate-500">… nothing to decode yet</span>
          )}
        </div>
        {rolls.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            Total: {rolls.length} rolls decoded. Each new roll is streamed to{" "}
            the 2-str debug trace.
          </p>
        )}
      </div>

      {/* Sandbox prediction + mode breakdown */}
      {labPrediction && labPrediction.prediction && (
        <div className="mt-2 border-t border-slate-800/70 pt-3 space-y-3">
          {/* 🎯 Sandbox Prediction card (KEEP) */}
          <div className="bg-slate-900/70 border border-emerald-700/30 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <div className="text-slate-400 mb-1">🎯 Sandbox Prediction</div>
              <div className="text-emerald-300 font-mono text-sm">
                Main: {labPrediction.prediction} (
                {Math.round((labPrediction.confidence || 0) * 100)}%)
              </div>
              {labPrediction.alt && (
                <div className=" py-1 rounded-lg bg-slate-900/80 ">
                  <span className="text-amber-300 font-mono text-sm">Alt:</span>
                  <span className="font-mono text-amber-300">
                    {labPrediction.alt}
                  </span>
                  {altSandboxPct != null && (
                    <span className="text-amber-300 ml-1">
                      ({altSandboxPct}%)
                    </span>
                  )}
                </div>
              )}

              <div className="text-[10px] text-purple-300 mt-1">
                Mode: {labPrediction.mode}
              </div>
            </div>
          </div>

          {/* 📊 Mode breakdown – which mode is best */}
          {/* 📊 Mode breakdown – which mode is best */}
          {modeBreakdown && Object.keys(modeBreakdown).length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">
                Mode breakdown (sandbox – ordered by confidence; higher % = more
                reliable for this ctx):
              </div>

              {(() => {
                const sortedModes = Object.entries(modeBreakdown)
                  .map(([mode, info]) => ({
                    mode,
                    prediction: info.prediction,
                    confidence: info.confidence || 0,
                    alt: info.alt || null,
                  }))
                  .sort((a, b) => b.confidence - a.confidence); // ← all modes, sorted

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {sortedModes.map((m, index) => {
                      const pct = Math.round(m.confidence * 100);
                      const strong = pct >= 60;

                      return (
                        <div
                          key={m.mode}
                          className={`p-2 rounded-lg border ${
                            strong
                              ? "bg-emerald-900/30 border-emerald-600/60"
                              : "bg-slate-950/60 border-slate-700/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-mono text-slate-200 truncate">
                              {m.mode}
                            </div>
                            <div className="text-[10px] text-slate-400 ml-2">
                              #{index + 1}
                            </div>
                          </div>

                          <div className="text-violet-300">
                            pred:{" "}
                            <span className="font-mono">{m.prediction}</span>
                          </div>

                          {m.alt && (
                            <div className="text-sky-300">
                              alt: <span className="font-mono">{m.alt}</span>
                            </div>
                          )}

                          <div className="text-amber-300">
                            conf: <span className="font-mono">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
