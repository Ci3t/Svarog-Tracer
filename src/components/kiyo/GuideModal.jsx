import React from "react";

export default function GuideModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl border border-purple-500/60 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-800/95 to-violet-800/95 backdrop-blur-xl border-b border-purple-400/40 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="text-4xl">Wave Theory Guide</div>
            <div className="text-purple-200 text-sm opacity-90">
              Updated Dec 2025 • Beginner to Pro
            </div>
          </div>
          <button
            onClick={onClose}
            className="group relative w-11 h-11  borderflex items-center justify-center transition-all duration-200 cursor-pointer"
            aria-label="Close guide"
          >
            <span
              className="text-white text-2xl font-light group-hover:scale-110 transition-transform leading-none hover:text-yellow-300"
              style={{ lineHeight: 1 }}
            >
              x
            </span>
            {/* Optional: subtle ring on hover */}
            {/* <span className="absolute inset-0  ring-2 ring-transparent group-hover:ring-red-400/40 transition-all"></span> */}
          </button>
        </div>

        <div className="p-6 space-y-7 text-sm">
          {/* 1. Core Concept */}
          <section className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/40">
            <h2 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-3">
              Core Idea — Waves in 2 Columns Only
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-cyan-950/60 rounded-lg p-4 border border-cyan-600/40">
                <div className="text-cyan-200 font-bold mb-1">Column 2</div>
                <div className="text-xs">Outer (1/4) vs Inner (2/3)</div>
              </div>
              <div className="bg-cyan-950/60 rounded-lg p-4 border border-cyan-600/40">
                <div className="text-cyan-200 font-bold mb-1">Column 3</div>
                <div className="text-xs">Low (1/2) vs High (3/4)</div>
              </div>
            </div>
            <p className="text-cyan-200 text-xs mt-4 italic">
              Column 1 (Odds/Evens) is ignored — it's affected by relic
              color/line.
            </p>
          </section>

          {/* 2. The Two Magic Numbers */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Swap Rate */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-6 border border-emerald-500/40">
              <h3 className="text-lg font-bold text-emerald-300 mb-4">
                Swap Rate = How Reliable
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between bg-emerald-950/70 p-3 rounded-lg">
                  <span>&lt;30% → Sticky</span>
                  <span className="text-emerald-300 font-bold text-lg">
                    MAX TRUST
                  </span>
                </div>
                <div className="flex justify-between bg-teal-950/60 p-3 rounded-lg">
                  <span>30–60% → Moderate</span>
                  <span className="text-teal-300">Decent</span>
                </div>
                <div className="flex justify-between bg-red-950/70 p-3 rounded-lg">
                  <span>≥70% → Volatile</span>
                  <span className="text-red-300 font-bold">SKIP</span>
                </div>
              </div>
            </div>

            {/* Run Length */}
            <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 rounded-xl p-6 border border-orange-500/40">
              <h3 className="text-lg font-bold text-orange-300 mb-4">
                Run Length = When to Flip
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between bg-orange-950/70 p-3 rounded-lg">
                  <span>5+ in a row</span>
                  <span className="text-2xl text-orange-200">80-90%</span>
                </div>
                <div className="flex justify-between bg-amber-950/60 p-3 rounded-lg">
                  <span>4 in a row</span>
                  <span className="text-xl text-amber-300">70-75%</span>
                </div>
                <div className="flex justify-between bg-yellow-950/50 p-3 rounded-lg">
                  <span>3 in a row</span>
                  <span className="text-yellow-300">~65%</span>
                </div>
                <div className="text-center text-slate-400 text-xs mt-3">
                  ≤2 → Usually skip
                </div>
              </div>
            </div>
          </section>

          {/* 3. NEW: Betting Recommendations */}
          <section className="bg-gradient-to-br from-fuchsia-900/40 to-pink-900/40 rounded-xl p-6 border-2 border-fuchsia-500/60">
            <h3 className="text-xl font-bold text-fuchsia-300 mb-4 flex items-center gap-3">
              🎯 Smart Betting Recommendations (NEW!)
            </h3>
            <div className="bg-fuchsia-950/60 rounded-lg p-4 border border-fuchsia-500/30 space-y-3 text-xs text-fuchsia-100">
              <p className="text-fuchsia-200 font-semibold">
                The system now tells you EXACTLY which columns to bet on!
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-emerald-900/40 rounded p-3 border border-emerald-500/30">
                  <div className="text-emerald-300 font-bold mb-1">✅ BET</div>
                  <div className="text-xs">Clear pattern detected</div>
                  <div className="text-xs">Confidence ≥60%</div>
                  <div className="text-xs">Accuracy tracked</div>
                </div>
                <div className="bg-red-900/40 rounded p-3 border border-red-500/30">
                  <div className="text-red-300 font-bold mb-1">❌ SKIP</div>
                  <div className="text-xs">Chaotic pattern</div>
                  <div className="text-xs">Confidence &lt;50%</div>
                  <div className="text-xs">System monitors</div>
                </div>
              </div>
              <div className="bg-black/40 rounded p-3 mt-3">
                <div className="text-yellow-300 font-bold mb-1">💡 Recommendations:</div>
                <div className="text-xs space-y-1">
                  <div>• "BET ON BOTH" - Both columns clear</div>
                  <div>• "FOCUS ON COL3" - Only Col3 reliable</div>
                  <div>• "SKIP SESSION" - Both chaotic</div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Per-Window Analysis */}
          <section className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-xl p-6 border border-cyan-500/40">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">
              📊 Per-Window Pattern Analysis (NEW!)
            </h3>
            <div className="space-y-3 text-xs text-cyan-100">
              <p>
                Patterns change every <strong>5 minutes</strong> in real games. 
                The system now analyzes each window independently!
              </p>
              <div className="bg-cyan-950/60 rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300">Window 1:</span>
                  <span>Alternating pattern → 90% accuracy ✅</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300">Window 2:</span>
                  <span className="text-yellow-300">⚠️ PATTERN CHANGED</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300">Window 2:</span>
                  <span>Dominance pattern → 85% accuracy ✅</span>
                </div>
              </div>
              <p className="text-cyan-200 font-semibold mt-3">
                → System adapts to pattern changes automatically!<br/>
                → Debug export shows per-window breakdown
              </p>
            </div>
          </section>

          {/* 5. Understanding Accuracy */}
          <section className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 rounded-xl p-6 border border-purple-500/40">
            <h3 className="text-xl font-bold text-purple-300 mb-4">
              📈 Understanding Accuracy vs Confidence
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-purple-950/60 rounded p-4 border border-purple-500/30">
                <div className="text-purple-300 font-bold mb-2">Confidence</div>
                <div className="text-purple-100 space-y-1">
                  <div>= How sure the system is</div>
                  <div>= Pattern strength</div>
                  <div className="text-yellow-300 mt-2">Example: 77% confidence</div>
                  <div className="text-xs">"I'm 77% sure this is a mixed-run pattern"</div>
                </div>
              </div>
              <div className="bg-violet-950/60 rounded p-4 border border-violet-500/30">
                <div className="text-violet-300 font-bold mb-2">Accuracy</div>
                <div className="text-violet-100 space-y-1">
                  <div>= How often predictions hit</div>
                  <div>= Actual success rate</div>
                  <div className="text-green-300 mt-2">Example: 73% accuracy</div>
                  <div className="text-xs">"73% of my predictions were correct"</div>
                </div>
              </div>
            </div>
            <div className="bg-black/40 rounded p-3 mt-4 text-xs">
              <div className="text-yellow-300 font-bold mb-2">⚠️ Important:</div>
              <div className="space-y-1">
                <div>• High confidence ≠ High accuracy</div>
                <div>• Always check BOTH before betting</div>
                <div>• Accuracy is tracked across your entire session</div>
              </div>
            </div>
          </section>

          {/* 6. Decision Matrix */}
          <section className="bg-gradient-to-br from-violet-900/60 to-purple-900/60 rounded-2xl p-7 border border-violet-500/70">
            <h2 className="text-2xl font-bold text-violet-200 text-center mb-6">
              When Do I Bet? (Updated!)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="bg-gradient-to-b from-emerald-800/70 to-emerald-900/70 rounded-xl p-5 border border-emerald-400 text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  ✅ BET GOOD RELICS
                </div>
                <div className="text-4xl font-black text-emerald-300 mb-3">
                  70%+
                </div>
                <div className="space-y-2 text-emerald-100">
                  <div>• Clear pattern detected</div>
                  <div>• Accuracy ≥70%</div>
                  <div>• Confidence ≥60%</div>
                  <div>• Recommendation: BET</div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-amber-800/70 to-orange-900/70 rounded-xl p-5 border border-amber-400 text-center">
                <div className="text-xl font-bold text-white mb-2">
                  ⚪ BET OKAY RELICS
                </div>
                <div className="text-3xl font-black text-amber-300">60-70%</div>
                <div className="mt-3 text-amber-100 space-y-1">
                  <div>• Moderate pattern</div>
                  <div>• Accuracy 60-70%</div>
                  <div>• Use caution</div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-red-900/70 to-red-950/70 rounded-xl p-5 border border-red-400 text-center">
                <div className="text-xl font-bold text-white mb-2">
                  ❌ SKIP / TRASH ONLY
                </div>
                <div className="text-3xl font-black text-red-300">&lt;60%</div>
                <div className="mt-3 text-red-100 space-y-1">
                  <div>• Chaotic pattern</div>
                  <div>• Low accuracy</div>
                  <div>• Recommendation: SKIP</div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Real Examples */}
          <section className="space-y-5">
            <h2 className="text-xl font-bold text-purple-300">Real Examples (Updated!)</h2>
            <div className="grid gap-4">
              <div className="bg-slate-800/80 rounded-xl p-5 border border-emerald-500/40">
                <div className="font-bold text-emerald-300">✅ Perfect Setup</div>
                <div className="text-xs mt-2 space-y-1 text-slate-300">
                  <div>• Pattern: Alternating (90% confidence)</div>
                  <div>• Accuracy: 73% (tracked)</div>
                  <div>• Recommendation: BET</div>
                </div>
                <div className="mt-3 text-lg font-bold text-emerald-300">
                  → Follow the recommendation!
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-5 border border-amber-500/40">
                <div className="font-bold text-amber-300">⚪ Moderate Setup</div>
                <div className="text-xs mt-2 space-y-1 text-slate-300">
                  <div>• Pattern: Mixed-run (77% confidence)</div>
                  <div>• Accuracy: 55% (tracked)</div>
                  <div>• Recommendation: BET (with caution)</div>
                </div>
                <div className="mt-3 text-lg font-bold text-amber-300">
                  → Okay for decent relics
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-5 border border-red-500/40">
                <div className="font-bold text-red-300">❌ Skip This</div>
                <div className="text-xs mt-2 space-y-1 text-slate-300">
                  <div>• Pattern: Chaotic (35% confidence)</div>
                  <div>• Status: SUPPRESSED</div>
                  <div>• Recommendation: SKIP</div>
                </div>
                <div className="mt-3 text-lg font-bold text-red-300">
                  → System is monitoring - wait!
                </div>
              </div>
            </div>
          </section>

          {/* 8. Quick Tips */}
          <section className="bg-gradient-to-r from-slate-800/90 to-slate-900 rounded-xl p-6 border border-slate-600">
            <h3 className="text-lg font-bold text-cyan-300 mb-4">Quick Tips (Updated!)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div>
                • Trust the betting recommendations - they're based on real accuracy!
              </div>
              <div>• Check both confidence AND accuracy before betting</div>
              <div>• Patterns change every 5 minutes - system adapts automatically</div>
              <div>• SKIP when both columns are chaotic</div>
              <div>• Export debug to see per-window breakdown</div>
              <div>• Accuracy is tracked across your entire session</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
