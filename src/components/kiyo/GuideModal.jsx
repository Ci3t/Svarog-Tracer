import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

export default function GuideModal({ show, onClose }) {
  const [tab, setTab] = useState("workflow");
  const isGlacial =
    typeof document !== "undefined" &&
    Boolean(document.querySelector(".arctic-theme, .winter-theme"));

  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 backdrop-blur-md px-2 sm:px-4"
      onMouseDown={onClose}
    >
      <div
        className={`bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 rounded-2xl border border-indigo-500/50 shadow-2xl flex flex-col ${
          isGlacial
            ? "w-[96vw] max-w-[1700px] h-[92vh] max-h-[92vh]"
            : "max-w-3xl w-full max-h-[93vh]"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-indigo-800/95 to-violet-800/95 backdrop-blur-xl border-b border-indigo-400/40 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <div className="text-xl font-bold text-white">Kiyo Mode - How to Use</div>
            <div className="text-indigo-200 text-xs mt-0.5">Step-by-step guide to predict 3-digit rolls</div>
          </div>
          <button onClick={onClose} className="text-white text-2xl hover:text-yellow-300 transition-colors cursor-pointer">X</button>
        </div>

        <div className="flex gap-1 px-5 pt-3 shrink-0 border-b border-slate-700/50 pb-0 overflow-x-auto">
          {[
            { id: "workflow", label: "Workflow" },
            { id: "interface", label: "Interface" },
            { id: "reading",   label: "Reading" },
            { id: "tips",      label: "Tips" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? "text-indigo-200 border-indigo-400 bg-indigo-900/30"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4" style={{ scrollbarWidth: "thin" }}>

          {tab === "workflow" && (
            <>
              <Section title="Your Daily Workflow" icon="1."
                gradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(29,78,216,0.18))"
                border="border-blue-500/40" titleColor="text-blue-300">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">1</div>
                    <div>
                      <div className="text-white font-semibold">Enter your rolls</div>
                      <div className="text-sm text-slate-400">Type your 3-digit rolls (like 421, 432) in the input box at the top. Each roll you type adds to the session data.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">2</div>
                    <div>
                      <div className="text-white font-semibold">Check 2 String Pair Tracker</div>
                      <div className="text-sm text-slate-400">Look at COL 1, COL 2, COL 3 to see which column is active. Each column shows which pair (like 41 vs 42) is currently winning.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">3</div>
                    <div>
                      <div className="text-white font-semibold">Type your prefix</div>
                      <div className="text-sm text-slate-400">Type the first 2 digits of the roll you expect next (like 42 or 43). This narrows down the 3 String predictor to show exact options for that prefix.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">4</div>
                    <div>
                      <div className="text-white font-semibold">Bet MAIN + ALT</div>
                      <div className="text-sm text-slate-400">The predictor shows MAIN and ALT - these are your two best picks. If either hits, you win! Ignore WATCH - it is just context.</div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Understanding 2 String vs 3 String" icon="23"
                gradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,101,52,0.18))"
                border="border-green-500/40" titleColor="text-green-300">
                <div className="text-slate-300 text-sm space-y-3">
                  <p><span className="text-white font-bold">2 String</span> = first two digits (the prefix/lane)</p>
                  <p><span className="text-white font-bold">3 String</span> = full exact roll (prefix + last digit)</p>
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-600/40">
                    <p className="text-sm text-slate-300">Example: Roll <code className="text-teal-300 text-lg">421</code></p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="text-center">
                        <div className="text-teal-300 font-bold text-xl">42</div>
                        <div className="text-xs text-slate-400">2 String (prefix)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-300 font-bold text-xl">1</div>
                        <div className="text-xs text-slate-400">3 String (last digit)</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400">First find which 2 String column is active, then predict the last digit.</p>
                </div>
              </Section>

              <Section title="The 3 Columns" icon="C"
                gradient="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(88,28,135,0.18))"
                border="border-purple-500/40" titleColor="text-purple-300">
                <p className="text-sm text-slate-400 mb-3">Every session has 3 columns. Only ONE will be consistent. Find which one:</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { col: "COL 1", label: "Odds/Evens", odd: "1,3", even: "2,4", note: "Raw first digit" },
                    { col: "COL 2", label: "Outer/Inner", odd: "1,4", even: "2,3", note: "First digit of translated" },
                    { col: "COL 3", label: "Low/High", odd: "1,2", even: "3,4", note: "Last digit" },
                  ].map(p => (
                    <div key={p.col} className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40 text-center">
                      <div className="font-bold text-purple-300 text-lg">{p.col}</div>
                      <div className="text-xs text-purple-400 mb-2">{p.label}</div>
                      <div className="text-[10px] space-y-1">
                        <div className="text-emerald-400">G: {p.odd}</div>
                        <div className="text-amber-400">A: {p.even}</div>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">{p.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">G = green side, A = amber side. One column will have a clear pattern.</p>
              </Section>

              <Section title="Top-2 Strategy" icon="2"
                gradient="linear-gradient(135deg, rgba(251,191,36,0.25), rgba(180,83,9,0.18))"
                border="border-yellow-500/40" titleColor="text-yellow-300">
                <div className="text-slate-300 text-sm space-y-2">
                  <p><span className="text-white font-bold">Pick 2, not 1.</span> You choose MAIN and ALT as your two bets. If either hits, you win.</p>
                  <p className="text-slate-400">Why? Predicting 1 exact roll from 4 possibilities (421, 422, 423, 424) is hard. Getting the right one in your Top-2 happens about 55-65% of the time.</p>
                  <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-3 mt-2">
                    <div className="text-yellow-300 text-xs font-semibold">WARNING: Do not bet on WATCH!</div>
                    <div className="text-xs text-slate-400 mt-1">WATCH is just for context. Only bet on MAIN + ALT.</div>
                  </div>
                </div>
              </Section>
            </>
          )}

          {tab === "interface" && (
            <>
              <Section title="What Each Section Does" icon="S"
                gradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(29,78,216,0.18))"
                border="border-blue-500/40" titleColor="text-blue-300">
                <div className="space-y-3 text-sm">
                  {[
                    { name: "2 String Pair Tracker", what: "Shows COL 1, COL 2, COL 3 and which pair is active. Shows current pair in plain English.", when: "Every roll - read FIRST" },
                    { name: "2 String Lane Timeline", what: "Shows recent rolls newest-first so you can verify which column makes sense.", when: "When unsure about column" },
                    { name: "Pattern Recognition", what: "Helper tool that watches table rhythm. Shows 'same as pick' or 'table warning'.", when: "As confirmation layer" },
                    { name: "3 String Predictor", what: "Your exact roll predictions - MAIN and ALT. Only shows after you type a prefix.", when: "After prefix typed" },
                    { name: "3 String Pair Tracker", what: "Ranks the 4 possible Z outcomes inside your typed prefix (42x shows 421-424).", when: "After prefix typed" },
                    { name: "Data Confidence", what: "Shows what data is being used: Live rolls + Your prior + Region prior + Sheet fallback.", when: "Before betting big" },
                  ].map(item => (
                    <div key={item.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/40">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.what}</div>
                      <div className="text-[10px] text-indigo-400 mt-1">Use: {item.when}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="How to Read the Color Table" icon="T"
                gradient="linear-gradient(135deg, rgba(6,78,59,0.25), rgba(19,78,74,0.18))"
                border="border-emerald-600/40" titleColor="text-emerald-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-emerald-900/40 rounded-lg px-3 py-2 border border-emerald-500/30">
                      <span className="w-4 h-4 rounded bg-emerald-500 inline-block shrink-0" />
                      <span className="text-emerald-200 font-semibold text-sm">GREEN = active side</span>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-900/40 rounded-lg px-3 py-2 border border-amber-500/30">
                      <span className="w-4 h-4 rounded bg-amber-500 inline-block shrink-0" />
                      <span className="text-amber-200 font-semibold text-sm">AMBER = other side</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300 flex flex-col justify-center">
                    <div className="flex gap-2"><span className="text-teal-400 mt-0.5">*</span><span>Long green streak = column is active</span></div>
                    <div className="flex gap-2"><span className="text-amber-400 mt-0.5">*</span><span>1-2 amber between greens = normal noise</span></div>
                    <div className="flex gap-2"><span className="text-indigo-400 mt-0.5">*</span><span>STAR = this is the active column</span></div>
                  </div>
                </div>
              </Section>

              <Section title="Decision Strip" icon="DS"
                gradient="linear-gradient(135deg, rgba(234,179,8,0.25), rgba(161,98,7,0.18))"
                border="border-yellow-500/40" titleColor="text-yellow-300">
                <p className="text-sm text-slate-400 mb-2">Above the 2 String rows, a strip tells you:</p>
                <div className="space-y-2 text-sm">
                  <div className="bg-emerald-900/30 border border-emerald-600/30 rounded-lg p-3">
                    <div className="text-emerald-400 font-bold">Main read confirmed</div>
                    <div className="text-xs text-slate-400">Predictor and pattern rhythm point to the same pair - bet with confidence</div>
                  </div>
                  <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-3">
                    <div className="text-amber-400 font-bold">Table warning</div>
                    <div className="text-xs text-slate-400">Keep predictor pair first, but watch the table rhythm pair as the break</div>
                  </div>
                </div>
              </Section>

              <Section title="The Noise Rule" icon="N"
                gradient="linear-gradient(135deg, rgba(234,179,8,0.25), rgba(161,98,7,0.18))"
                border="border-yellow-500/40" titleColor="text-yellow-300">
                <p className="text-slate-300 text-sm leading-relaxed">
                  After every <span className="text-teal-300 font-bold">~3 green rows</span>, expect <span className="text-amber-300 font-bold">1-2 amber noise rolls</span>. This is completely normal - the pattern resets after noise.
                </p>
                <div className="flex gap-2 text-xs flex-wrap mt-3">
                  <span className="bg-red-900/40 text-red-300 border border-red-500/30 px-2 py-1 rounded-lg">X Do not switch when you see amber</span>
                  <span className="bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg">OK Stay on STAR column and wait</span>
                </div>
              </Section>

              <Section title="Data Sources" icon="D"
                gradient="linear-gradient(135deg, rgba(6,182,212,0.25), rgba(8,145,178,0.18))"
                border="border-cyan-500/40" titleColor="text-cyan-300">
                <p className="text-sm text-slate-400 mb-3">At the bottom, you will see what is being used to predict:</p>
                <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-800/60 rounded-lg p-3">
                  <div className="text-teal-400">Live 12 rolls - Your typed rolls (highest priority)</div>
                  <div className="text-yellow-400">+ your prior 89 - Your saved sessions from database</div>
                  <div className="text-blue-400">+ EU prior 1,247 - Regional data from other players</div>
                  <div className="text-slate-500">+ sheet fallback - Only when DB has little data</div>
                </div>
                <p className="text-xs text-slate-500 mt-2">More live rolls you type = less reliance on sheet/DB. After 5+ live rolls, seed weight becomes 0%.</p>
              </Section>

              <Section title="Saving Your Sessions" icon="SS"
                gradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,101,52,0.18))"
                border="border-green-500/40" titleColor="text-green-300">
                <div className="text-sm text-slate-300 space-y-2">
                  <p>Click <span className="text-teal-300 font-bold">Save Session</span> to store your rolls in the database:</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>* Anonymous users: saved with a unique ID in your browser</li>
                    <li>* Logged-in users: saved with your Discord account</li>
                    <li>* Your saved sessions help predict better on your next visit</li>
                  </ul>
                </div>
              </Section>
            </>
          )}

          {tab === "reading" && (
            <>
              <Section title="When to Bet Big" icon="$"
                gradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,101,52,0.18))"
                border="border-green-500/40" titleColor="text-green-300">
                <div className="space-y-2 text-sm">
                  {[
                    { level: "MAX", condition: "5+ live rolls + clear column signal + strong Top-2", bet: "Full bet" },
                    { level: "HIGH", condition: "5+ live rolls + clear column in table", bet: "Normal bet" },
                    { level: "MED", condition: "2-4 live rolls + some column data", bet: "Half bet" },
                    { level: "LOW", condition: "0-2 live rolls, mostly sheet data", bet: "Small or skip" },
                    { level: "SKIP", condition: "No clear pattern, chaotic table", bet: "Do not bet" },
                  ].map(r => (
                    <div key={r.level} className="flex items-center gap-3 bg-slate-800/40 rounded-lg p-2 border border-slate-700/40">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.level === 'MAX' ? 'bg-emerald-600 text-white' : r.level === 'HIGH' ? 'bg-green-600 text-white' : r.level === 'MED' ? 'bg-yellow-600 text-white' : r.level === 'LOW' ? 'bg-purple-600 text-white' : 'bg-red-600 text-white'}`}>{r.level}</span>
                      <span className="text-xs text-slate-400 flex-1">{r.condition}</span>
                      <span className="text-xs text-white bg-slate-700 px-2 py-0.5 rounded">{r.bet}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Prefix Scoping" icon=">"
                gradient="linear-gradient(135deg, rgba(59,130,246,0.25), rgba(29,78,216,0.18))"
                border="border-blue-500/40" titleColor="text-blue-300">
                <div className="text-sm text-slate-300 space-y-3">
                  <p>After checking which column is active, type the prefix to narrow down your 3 String options:</p>
                  <div className="bg-slate-800/60 rounded-lg p-4 space-y-2 font-mono text-sm">
                    <div><span className="text-slate-400">Type:</span> <span className="text-teal-300">42</span> - <span className="text-white">Shows: 421, 422, 423, 424</span></div>
                    <div><span className="text-slate-400">Type:</span> <span className="text-teal-300">43</span> - <span className="text-white">Shows: 431, 432, 433, 434</span></div>
                    <div><span className="text-slate-400">Type:</span> <span className="text-teal-300">41</span> - <span className="text-white">Shows: 411, 412, 413, 414</span></div>
                  </div>
                  <p className="text-slate-400 text-xs">If you do not type a prefix, it shows the global prediction across all prefixes.</p>
                </div>
              </Section>

              <Section title="What the Verdict Tags Mean" icon="V"
                gradient="linear-gradient(135deg, rgba(100,116,139,0.25), rgba(71,85,105,0.18))"
                border="border-slate-500/40" titleColor="text-slate-300">
                <div className="space-y-2 text-xs">
                  {[
                    { tag: "DOM", color: "bg-emerald-900", text: "Dominant", meaning: "One side 60%+ of all rolls - strongest signal, bet full" },
                    { tag: "HOLD", color: "bg-teal-900", text: "Hold", meaning: "Current run still going, keep betting same side" },
                    { tag: "FLIP", color: "bg-amber-900", text: "Flip", meaning: "Run complete, switch to opposite side next roll" },
                    { tag: "LIKELY", color: "bg-purple-900", text: "Likely", meaning: "Not confirmed yet - bet half only" },
                    { tag: "WAIT", color: "bg-slate-800", text: "Wait", meaning: "Not enough data - skip until more rolls" },
                    { tag: "SKIP", color: "bg-red-900", text: "Skip", meaning: "Chaotic session, no pattern - do not bet" },
                  ].map(v => (
                    <div key={v.tag} className="flex items-center gap-2 bg-slate-800/40 rounded-lg p-2 border border-slate-700/40">
                      <span className={`${v.color} text-white px-2 py-0.5 rounded font-bold`}>{v.tag}</span>
                      <span className="text-slate-300">{v.text}</span>
                      <span className="text-slate-500">- {v.meaning}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Two Signal Panels" icon="SP"
                gradient="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(88,28,135,0.18))"
                border="border-purple-500/40" titleColor="text-purple-300">
                <div className="space-y-3">
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-teal-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-700 px-2 py-0.5 rounded">TABLE %</span>
                      <span className="text-teal-300 font-bold text-sm">Short-term (recent rolls)</span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Counts last ~10-15 rolls. x5 streak = 5 same-color in a row (very strong). High % from only 4 rolls = weak signal.
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-indigo-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-700 px-2 py-0.5 rounded">WAVE</span>
                      <span className="text-indigo-300 font-bold text-sm">Long-term (whole session)</span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Uses all rolls to detect run length. Needs ~8+ rolls to fully confirm. STAR appears when confidence is 60% or higher.
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Pattern Recognition Helper" icon="PR"
                gradient="linear-gradient(135deg, rgba(168,85,247,0.25), rgba(88,28,135,0.18))"
                border="border-purple-500/40" titleColor="text-purple-300">
                <p className="text-sm text-slate-300 mb-2">
                  Under the 2 String predictor, Pattern Recognition watches the table rhythm and can detect:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
                  <div className="bg-slate-800/50 rounded-lg px-2 py-1">- Return patterns</div>
                  <div className="bg-slate-800/50 rounded-lg px-2 py-1">- Single-break snapbacks</div>
                  <div className="bg-slate-800/50 rounded-lg px-2 py-1">- Short runs</div>
                  <div className="bg-slate-800/50 rounded-lg px-2 py-1">- Alternating rows</div>
                </div>
                <div className="bg-amber-900/30 border border-amber-600/30 rounded-lg p-2">
                  <p className="text-xs text-amber-300">This is a <span className="text-white font-bold">helper tool</span>, not a replacement. Use it to confirm or question the main predictor - not override it.</p>
                </div>
              </Section>
            </>
          )}

          {tab === "tips" && (
            <>
              <Section title="Do This First" icon="+"
                gradient="linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,101,52,0.18))"
                border="border-green-500/40" titleColor="text-green-300">
                <div className="space-y-2 text-sm">
                  {[
                    "Check 2 String Pair Tracker to find the active COLUMN first",
                    "Type your prefix (42 or 43) to scope the 3 String predictor",
                    "Focus on MAIN + ALT only - ignore WATCH",
                    "Save your session when you have 10+ rolls",
                    "Wait for 5+ live rolls before betting big - seed weight should be 0%",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">+</span>
                      <span className="text-slate-300">{tip}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Avoid This" icon="-"
                gradient="linear-gradient(135deg, rgba(220,38,38,0.25), rgba(153,27,27,0.18))"
                border="border-red-500/40" titleColor="text-red-300">
                <div className="space-y-2 text-sm">
                  {[
                    "Do not skip 2 String and go straight to 3 String",
                    "Do not bet on all 4 outcomes - only MAIN + ALT",
                    "Do not switch columns just because you see amber (that is noise)",
                    "Do not bet full when you only have 0-2 live rolls",
                    "Do not ignore the data confidence indicator - check what data is being used",
                    "Do not bet during chaotic sessions - skip entirely",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span className="text-slate-300">{tip}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Caesar Shift" icon="CS"
                gradient="linear-gradient(135deg, rgba(234,179,8,0.25), rgba(161,98,7,0.18))"
                border="border-yellow-500/40" titleColor="text-yellow-300">
                <p className="text-sm text-slate-300">
                  Your rolls are automatically shifted so the first digit equals 4. Raw rolls like <code className="bg-slate-800 px-1 rounded">234</code> become <code className="bg-slate-800 px-1 rounded">412</code> internally.
                  <br/><br/>
                  Use the <span className="text-teal-300">Caesar Shift tool</span> at the bottom to see your raw to translated mapping if needed.
                </p>
              </Section>

              <Section title="Accuracy Reality Check" icon="AR"
                gradient="linear-gradient(135deg, rgba(236,72,153,0.25), rgba(190,24,93,0.18))"
                border="border-pink-500/40" titleColor="text-pink-300">
                <div className="text-sm text-slate-300 mb-3">
                  Based on archived session replay testing:
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Top-1", value: "8-11%", note: "1 exact match" },
                    { label: "Top-2", value: "22-28%", note: "Your target!" },
                    { label: "Top-3", value: "29-33%", note: "Sanity check" },
                  ].map(c => (
                    <div key={c.label} className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/40">
                      <div className="text-lg font-bold text-pink-300">{c.value}</div>
                      <div className="text-xs text-slate-500">{c.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{c.note}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">2 String column accuracy is ~60% first-pair, ~79% top-2 column coverage.</p>
              </Section>

              <Section title="Quick Test" icon="QT"
                gradient="linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.18))"
                border="border-indigo-500/40" titleColor="text-indigo-300">
                <p className="text-xs text-slate-400 mb-2">Try entering these rolls in order:</p>
                <p className="text-xs font-mono text-slate-300 bg-slate-800/60 rounded-lg p-2 mb-2">441 433 422 443 431 442 432 424 421 433 421 432 433 414 432 411 444 424 412 411</p>
                <p className="text-xs text-slate-500">After warmup, expect ~65% Top-2 accuracy on prefix-scoped predictions.</p>
              </Section>
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}