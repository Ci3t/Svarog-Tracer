import React, { useState } from "react";

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, gradient, border, titleColor, children }) {
  return (
    <section className={`rounded-2xl p-5 border ${border} space-y-3`}
      style={{ background: gradient }}>
      <h3 className={`text-lg font-bold flex items-center gap-2 ${titleColor}`}>
        {icon && <span>{icon}</span>}{title}
      </h3>
      {children}
    </section>
  );
}

function VerdictCard({ tag, tagStyle, label, bet, betColor, desc, example }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/40 flex gap-3 items-start">
      <span className="text-xs font-black px-2.5 py-1 rounded-lg shrink-0 min-w-[52px] text-center"
        style={tagStyle}>{tag}</span>
      <div className="space-y-0.5 min-w-0">
        <div className="text-sm font-bold text-slate-200">
          {label} <span className={`text-xs font-semibold ${betColor}`}>— {bet}</span>
        </div>
        <div className="text-xs text-slate-400">{desc}</div>
        <div className="text-xs text-slate-500 italic">e.g. {example}</div>
      </div>
    </div>
  );
}

function ModeCard({ emoji, name, bg, border, color, desc }) {
  return (
    <div className="rounded-xl p-3 border flex gap-2 items-start" style={{ background: bg, borderColor: border }}>
      <span className="text-lg shrink-0">{emoji}</span>
      <div>
        <div className="text-xs font-bold" style={{ color }}>{name}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function GuideModal({ show, onClose }) {
  const [tab, setTab] = useState("basics");

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 rounded-2xl border border-indigo-500/50 shadow-2xl max-w-2xl w-full max-h-[93vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-800/95 to-violet-800/95 backdrop-blur-xl border-b border-indigo-400/40 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <div className="text-xl font-bold text-white">🌊 Kiyo Mode — Masterclass</div>
            <div className="text-indigo-200 text-xs mt-0.5">Everything you need to understand and use Kiyo Mode</div>
          </div>
          <button onClick={onClose} className="text-white text-2xl hover:text-yellow-300 transition-colors cursor-pointer">✕</button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-5 pt-3 shrink-0 border-b border-slate-700/50 pb-0">
          {[
            { id: "basics",   label: "📖 Basics"   },
            { id: "verdicts", label: "🔤 Verdicts"  },
            { id: "modes",    label: "🎭 Modes"     },
            { id: "strategy", label: "⚡ Strategy"  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
                tab === t.id
                  ? "text-indigo-200 border-indigo-400 bg-indigo-900/30"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4" style={{ scrollbarWidth: "thin" }}>

          {/* ═══════ BASICS TAB ═══════════════════════════════════════════ */}
          {tab === "basics" && (
            <>
              <Section title="What Is Kiyo Mode?" icon="🎯"
                gradient="linear-gradient(135deg, rgba(67,56,202,0.25), rgba(30,58,138,0.18))"
                border="border-indigo-500/40" titleColor="text-indigo-300">
                <p className="text-slate-300 text-sm leading-relaxed">
                  The game organises 2-digit rolls into <span className="text-teal-300 font-bold">pairs</span> each session.
                  Every session, <strong className="text-white">one pairing</strong> dominates — two specific rolls appear much more often than the other two.
                  <br/><br/>
                  <span className="text-yellow-300 font-bold">Your job:</span> find which pair is active → bet on it → profit.
                </p>
              </Section>

              <Section title="The 3 Possible Pairings" icon="📊"
                gradient="linear-gradient(135deg, rgba(30,41,59,0.80), rgba(15,23,42,0.70))"
                border="border-slate-600/50" titleColor="text-white">
                <p className="text-slate-400 text-xs mb-2">Each session falls into <strong>one</strong> of these three. Only ONE column will be consistent.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "41/44", name: "Outer/Inner", sideA: "41 & 44", sideB: "42 & 43", color: "text-purple-300", dot: "#a78bfa" },
                    { key: "42/44", name: "Odd/Even",    sideA: "42 & 44", sideB: "41 & 43", color: "text-blue-300",   dot: "#60a5fa" },
                    { key: "43/44", name: "Low/High",    sideA: "43 & 44", sideB: "41 & 42", color: "text-teal-300",  dot: "#5eead4" },
                  ].map(p => (
                    <div key={p.key} className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40 text-center">
                      <div className={`font-bold text-sm ${p.color}`}>{p.key}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${p.color}`}>{p.name}</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px]"><span className="text-emerald-400">●</span> <span className="text-emerald-300 font-semibold">{p.sideA}</span></div>
                        <div className="text-[10px]"><span className="text-amber-400">●</span> <span className="text-amber-300 font-semibold">{p.sideB}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 mt-1">
                  💡 <strong className="text-indigo-300">44</strong> appears in the green side of all 3 pairings — so early sessions can be ambiguous until 41, 42, or 43 appear to differentiate.
                </div>
              </Section>

              <Section title="Reading the Color Table" icon="🎨"
                gradient="linear-gradient(135deg, rgba(6,78,59,0.25), rgba(19,78,74,0.18))"
                border="border-emerald-600/40" titleColor="text-emerald-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-emerald-900/40 rounded-lg px-3 py-2 border border-emerald-500/30">
                      <span className="w-4 h-4 rounded bg-emerald-500 inline-block shrink-0" />
                      <span className="text-emerald-200 font-semibold text-sm">GREEN = top pair side</span>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-900/40 rounded-lg px-3 py-2 border border-amber-500/30">
                      <span className="w-4 h-4 rounded bg-amber-500 inline-block shrink-0" />
                      <span className="text-amber-200 font-semibold text-sm">AMBER = bottom pair side</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300 flex flex-col justify-center">
                    <div className="flex gap-2"><span className="text-teal-400 mt-0.5">●</span><span>Long green streak → keep betting that side</span></div>
                    <div className="flex gap-2"><span className="text-amber-400 mt-0.5">●</span><span>1-2 amber between greens = normal noise</span></div>
                    <div className="flex gap-2"><span className="text-indigo-400 mt-0.5">●</span><span><strong>★</strong> star marks the auto-detected active column</span></div>
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3 font-mono text-lg flex gap-1 flex-wrap mt-1">
                  {["🟢","🟢","🟢","🟡","🟢","🟢","🟢","🟡","🟡","🟢","🟢","🟢"].map((c,i) => (
                    <span key={i}>{c}</span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs">↑ Healthy N=3 session: 3 green, 1-2 amber noise, repeat.</p>
              </Section>

              <Section title="The Noise Rule" icon="📣"
                gradient="linear-gradient(135deg, rgba(120,53,15,0.28), rgba(69,26,3,0.22))"
                border="border-amber-500/40" titleColor="text-amber-300">
                <p className="text-slate-300 text-sm leading-relaxed">
                  After every <span className="text-teal-300 font-bold">~3 green rows</span> in the active column,
                  expect <span className="text-amber-300 font-bold">1-2 amber noise rolls</span>. 
                  This is <strong>completely normal</strong> — the pattern resets after noise.
                </p>
                <div className="flex gap-2 text-xs flex-wrap">
                  <span className="bg-red-900/40 text-red-300 border border-red-500/30 px-2 py-1 rounded-lg">❌ Don't switch columns on noise</span>
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg">✅ Stay on ★ column and wait</span>
                </div>
              </Section>
            </>
          )}

          {/* ═══════ VERDICTS TAB ══════════════════════════════════════════ */}
          {tab === "verdicts" && (
            <>
              <Section title="Wave Verdicts — Every Word Explained" icon="🔤"
                gradient="linear-gradient(135deg, rgba(30,41,59,0.85), rgba(15,23,42,0.75))"
                border="border-slate-600/40" titleColor="text-white">
                <div className="space-y-2">
                  <VerdictCard
                    tag="DOM"
                    tagStyle={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #34d399' }}
                    label="Dominant"
                    bet="✅ Full bet every roll"
                    betColor="text-emerald-400"
                    desc="One side appears ≥60% of ALL session rolls. Pairing is locked and confirmed. Most reliable signal in Kiyo Mode."
                    example="DOM Even (67%) → Bet 42 or 44 every single roll until the session ends."
                  />
                  <VerdictCard
                    tag="HOLD"
                    tagStyle={{ background: '#0f3d3b', color: '#5eead4', border: '1px solid #14b8a6' }}
                    label="Hold current side"
                    bet="✅ Keep same bet"
                    betColor="text-teal-400"
                    desc="Current side's run is still going (e.g. run 2 out of 3). The game has not flipped yet — stay on the same side."
                    example="HOLD High (run 2/3) → 43 & 44 came twice in a row. Expect one more. Keep betting 43 or 44."
                  />
                  <VerdictCard
                    tag="FLIP"
                    tagStyle={{ background: '#78350f', color: '#fcd34d', border: '1px solid #f59e0b' }}
                    label="Switch sides now"
                    bet="✅ Bet the opposite side"
                    betColor="text-amber-400"
                    desc="Run hit N (e.g. 3/3 complete). The pattern has finished its run — the next roll will be the OTHER side."
                    example="FLIP → Low (run 3/3) → 43/44 hit 3 times. Switch and bet 41 or 42 next roll."
                  />
                  <VerdictCard
                    tag="LIKELY"
                    tagStyle={{ background: '#3b1f6e', color: '#e879f9', border: '1px solid #c084fc' }}
                    label="Probably, but unsure"
                    bet="⚠️ Half bet only"
                    betColor="text-purple-400"
                    desc="Pairing is not locked yet — early session or two columns look too similar. System is still building confidence."
                    example="⚡ LIKELY Even → Probably 42/44 but not confirmed. Bet smaller amounts."
                  />
                  <VerdictCard
                    tag="WAIT"
                    tagStyle={{ background: '#1c1917', color: '#a8a29e', border: '1px solid #78716c' }}
                    label="Not enough data"
                    bet="❌ Skip this roll"
                    betColor="text-slate-500"
                    desc="Less than ~4 rolls. The system hasn't seen enough to find any pattern yet."
                    example="⏳ WAIT → Only 3 rolls in. Skip — come back when you have more data."
                  />
                  <VerdictCard
                    tag="SKIP"
                    tagStyle={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #f87171' }}
                    label="Chaotic session"
                    bet="❌ Don't bet at all"
                    betColor="text-red-400"
                    desc="No consistent pairing detected. Rolls jumping randomly between all sides — no exploitable pattern."
                    example="⚠️ SKIP → Pattern is chaotic. The session is not following any pairing. Wait it out."
                  />
                </div>
              </Section>

              <Section title="Two Signal Panels" icon="📡"
                gradient="linear-gradient(135deg, rgba(76,29,149,0.25), rgba(67,20,129,0.18))"
                border="border-violet-500/40" titleColor="text-violet-300">
                <div className="space-y-3">
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-teal-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-700 px-2 py-0.5 rounded">TABLE %</span>
                      <span className="text-teal-300 font-bold text-sm">Short-term (recent rolls)</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Counts how many of the <strong>last ~10-15 rolls</strong> fell on one side.
                      A <span className="text-amber-300 font-semibold">×5 streak</span> = 5 same-color in a row (very strong).
                      A high dom% from only 4 rolls = weak signal alone.
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-indigo-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-700 px-2 py-0.5 rounded">🌊 WAVE</span>
                      <span className="text-indigo-300 font-bold text-sm">Long-term (whole session)</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Analyses <strong>every roll in the session</strong> to detect run length (N value) and predict whether the next roll continues or flips.
                      Needs <span className="text-teal-300 font-semibold">~8+ rolls</span> to fully confirm. The gold <span className="text-yellow-400 font-black">★</span> appears when confidence ≥ 60%.
                    </p>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ═══════ MODES TAB ═════════════════════════════════════════════ */}
          {tab === "modes" && (
            <Section title="Session Mode Labels" icon="🎭"
              gradient="linear-gradient(135deg, rgba(30,41,59,0.85), rgba(15,23,42,0.75))"
              border="border-slate-600/40" titleColor="text-white">
              <p className="text-slate-400 text-xs mb-3">
                The small badge inside the 🌊 Wave card shows what kind of pattern the session is following. 
                Each mode tells you how to bet differently.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <ModeCard emoji="🏆" name="DOMINANT"
                  bg="rgba(6,78,59,0.30)" border="#34d399" color="#6ee7b7"
                  desc="One side is appearing ≥60% of total rolls. This is the strongest signal. Simply bet that side every roll until DOM disappears." />
                <ModeCard emoji="🔄" name="RUN · N=2 / N=3 / N=4"
                  bg="rgba(30,58,138,0.30)" border="#60a5fa" color="#93c5fd"
                  desc="The session is producing runs of exactly N rolls on each side before flipping. N=3 means: 3 greens, then 1-2 amber, then 3 greens again. After N rolls on one side, expect a FLIP." />
                <ModeCard emoji="〰️" name="ALTERNATING"
                  bg="rgba(66,32,6,0.40)" border="#f59e0b" color="#fcd34d"
                  desc="Rolls are switching between sides every single roll: green-amber-green-amber. Bet alternately — if last was green, bet amber next, and vice versa." />
                <ModeCard emoji="⚡" name="AMBIGUOUS"
                  bg="rgba(59,31,110,0.35)" border="#c084fc" color="#e879f9"
                  desc="Two pairings are too close to differentiate. System is still figuring out which column is active. Bet smaller or wait 2-3 more rolls." />
                <ModeCard emoji="⚠️" name="CHAOTIC"
                  bg="rgba(69,10,10,0.40)" border="#f87171" color="#fca5a5"
                  desc="No consistent pattern. Rolls are jumping randomly. Skip betting entirely and wait for the session to settle." />
                <ModeCard emoji="⏳" name="BUILDING"
                  bg="rgba(28,25,23,0.50)" border="#78716c" color="#a8a29e"
                  desc="Not enough rolls yet to detect the pattern. Less than ~4-6 rolls. Skip until a clearer mode appears." />
              </div>
            </Section>
          )}

          {/* ═══════ STRATEGY TAB ══════════════════════════════════════════ */}
          {tab === "strategy" && (
            <>
              <Section title="Quick Decision — 3 Steps" icon="⚡"
                gradient="linear-gradient(135deg, rgba(30,41,59,0.85), rgba(15,23,42,0.75))"
                border="border-slate-600/50" titleColor="text-yellow-300">
                <div className="space-y-3">
                  {[
                    { step: "1", q: "Is there a ×4 or more streak in the ★ column?", y: "Follow that color immediately — no need to check Wave.", n: "Go to Step 2." },
                    { step: "2", q: "Does Wave say 🏆 DOM or HOLD?",                  y: "Follow the FOLLOW → signal shown below the cards.",   n: "LIKELY? Bet half. WAIT/SKIP? Don't bet at all." },
                    { step: "3", q: "Do TABLE and Wave point to the same side?",       y: "Bet with full confidence 🔥",                         n: "Bet smaller or skip and wait 1-2 more rolls." },
                  ].map(r => (
                    <div key={r.step} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/30">
                      <div className="flex items-start gap-3">
                        <span className="bg-indigo-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{r.step}</span>
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-200 text-sm">{r.q}</div>
                          <div className="text-xs flex flex-col gap-0.5">
                            <span className="text-emerald-300">YES: {r.y}</span>
                            <span className="text-slate-400">NO: {r.n}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Trust Hierarchy" icon="🤔"
                gradient="linear-gradient(135deg, rgba(112,26,117,0.22), rgba(86,17,90,0.15))"
                border="border-fuchsia-500/40" titleColor="text-fuchsia-300">
                <div className="space-y-2 text-sm">
                  {[
                    { signal: "Streak ×5+ AND Wave agree",   conf: "🔥 Maximum",  bet: "Full bet",    bg: "rgba(6,78,59,0.30)",  color: "#6ee7b7" },
                    { signal: "Table streak ×4",             conf: "✅ High",      bet: "Normal bet",  bg: "rgba(27,67,50,0.25)", color: "#34d399" },
                    { signal: "Wave 🏆 DOM (8+ rolls)",       conf: "✅ High",      bet: "Normal bet",  bg: "rgba(27,67,50,0.25)", color: "#5eead4" },
                    { signal: "HOLD + no streak",            conf: "🟡 Medium",    bet: "Normal bet",  bg: "rgba(66,32,6,0.25)",  color: "#fcd34d" },
                    { signal: "Wave ⚡ LIKELY",              conf: "⚠️ Low",       bet: "Half bet",    bg: "rgba(59,31,110,0.25)", color: "#e879f9" },
                    { signal: "WAIT or SKIP",                conf: "❌ None",      bet: "Skip entirely", bg: "rgba(69,10,10,0.30)", color: "#fca5a5" },
                  ].map(r => (
                    <div key={r.signal} className="rounded-lg px-3 py-2 border flex items-center justify-between gap-2 flex-wrap"
                      style={{ background: r.bg, borderColor: r.color + "50" }}>
                      <span className="text-slate-200 text-xs font-medium">{r.signal}</span>
                      <div className="flex gap-2 items-center shrink-0">
                        <span className="text-[10px]" style={{ color: r.color }}>{r.conf}</span>
                        <span className="text-[10px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-full">{r.bet}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Common Mistakes" icon="❌"
                gradient="linear-gradient(135deg, rgba(69,10,10,0.22), rgba(45,10,10,0.15))"
                border="border-red-700/40" titleColor="text-red-300">
                <div className="space-y-2 text-xs">
                  {[
                    { bad: "Switching columns when amber appears",         fix: "Amber = noise. Stay on ★ column." },
                    { bad: "Trusting 75% dom% from only 3-4 rolls",        fix: "Wait for ×4+ streak or Wave DOM to confirm." },
                    { bad: "Betting full on ⚡ LIKELY",                     fix: "Use half bet — pairing isn't locked yet." },
                    { bad: "Betting during WAIT or SKIP",                  fix: "No pattern = 50/50 = skip the roll." },
                    { bad: "Switching sides before the FLIP happens",       fix: "Switch AFTER the Wave shows FLIP, not before." },
                  ].map((m, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                      <div className="text-red-400 font-semibold">❌ {m.bad}</div>
                      <div className="text-emerald-400 mt-0.5">✅ {m.fix}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
