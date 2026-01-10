// Kiyo Mode Guide - Complete Version with Wave Theory from Original Guide
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function CollapsibleSection({ title, icon, children, defaultOpen = false, readTime, tag }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const arrowRef = useRef(null);
  const iconRef = useRef(null);
  const headerRef = useRef(null);
  const glowRef = useRef(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      if (isOpen) {
        gsap.set(contentRef.current, { display: 'block' });
        
        if (isFirstMount.current) {
          gsap.set(headerRef.current, { backgroundColor: 'rgba(6, 182, 212, 0.1)' });
          gsap.set(glowRef.current, { opacity: 0.6, scale: 1.05 });
          gsap.set(contentRef.current, { height: 'auto', opacity: 1 });
          gsap.set(arrowRef.current, { rotation: 180, scale: 1.1 });
          gsap.set(iconRef.current, { scale: 1.15, rotation: 360 });
          isFirstMount.current = false;
          return;
        }

        tl.to(headerRef.current, { backgroundColor: 'rgba(6, 182, 212, 0.1)', duration: 0.3, ease: 'power2.out' })
        .to(glowRef.current, { opacity: 0.6, scale: 1.05, duration: 0.4, ease: 'power2.out' }, '<')
        .to(contentRef.current, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out' }, '<')
        .to(arrowRef.current, { rotation: 180, scale: 1.1, duration: 0.4, ease: 'back.out(1.7)' }, '<')
        .to(iconRef.current, { scale: 1.15, rotation: 360, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, '<')
        .from(contentRef.current.children, { y: 20, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }, '-=0.3');
      } else {
        if (isFirstMount.current) {
          gsap.set(contentRef.current, { display: 'none', height: 0, opacity: 0 });
          isFirstMount.current = false;
          return;
        }

        tl.to(contentRef.current, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in' })
        .to(arrowRef.current, { rotation: 0, scale: 1, duration: 0.3, ease: 'back.in(1.7)' }, '<')
        .to(iconRef.current, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.in' }, '<')
        .to(headerRef.current, { backgroundColor: 'transparent', duration: 0.2 }, '<')
        .to(glowRef.current, { opacity: 0, scale: 1, duration: 0.2 }, '<')
        .set(contentRef.current, { display: 'none' });
      }
    });

    return () => ctx.revert();
  }, [isOpen]);

  return (
    <div className="mb-4 relative">
      <div ref={glowRef} className="absolute inset-0 bg-gradient-to-r from-cyan-600/0 via-cyan-600/20 to-cyan-600/0 rounded-xl blur-xl opacity-0" style={{ pointerEvents: 'none' }} />
      <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl border border-slate-700/30 overflow-hidden backdrop-blur-sm">
        <button ref={headerRef} onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between transition-all group relative z-10 cursor-pointer">
          <div className="flex items-center gap-3">
            <div ref={iconRef} className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600/30 to-teal-600/30 flex items-center justify-center text-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/20">{icon}</div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              {readTime && <span className="text-xs text-slate-500">{readTime}</span>}
              {tag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">{tag}</span>}
            </div>
          </div>
          <svg ref={arrowRef} className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div ref={contentRef} style={{ height: defaultOpen ? 'auto' : 0, opacity: defaultOpen ? 1 : 0, overflow: 'hidden', display: defaultOpen ? 'block' : 'none' }}>
          <div className="px-4 pb-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TLDRBox({ children }) {
  const boxRef = useRef(null);
  return (
    <div ref={boxRef} className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-l-2 border-cyan-500/50 rounded-r-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">TL;DR</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

export default function KiyoGuide() {
  const headerRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(badgeRef.current, { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
      .fromTo(titleRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from(titleRef.current.querySelectorAll('span'), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');
      gsap.to(badgeRef.current, { boxShadow: '0 0 30px rgba(6, 182, 212, 0.6)', duration: 2, ease: 'power1.inOut', yoyo: true, repeat: -1 });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div ref={headerRef} className="text-center mb-8">
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600/30 to-teal-600/30 border border-cyan-500/40 mb-4 shadow-lg">
          <span className="text-lg">🌊</span>
          <span className="text-sm font-bold text-cyan-300">Kiyo Mode Guide</span>
        </div>
        <h1 ref={titleRef} className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-500 mb-3">
          <span>K</span><span>i</span><span>y</span><span>o</span><span> </span><span>M</span><span>o</span><span>d</span><span>e</span>
        </h1>
        <p className="text-slate-400 text-sm">Wave theory • Column analysis • Smart betting</p>
      </div>

      <CollapsibleSection title="Core Concept — Waves in 2 Columns Only" icon="🌊" defaultOpen={true} readTime="2 min" tag="Core">
        <TLDRBox>
          Kiyo Mode analyzes <strong className="text-white">Column 2</strong> (Outer vs Inner) and <strong className="text-white">Column 3</strong> (Low vs High). Column 1 is ignored — it's affected by relic color/line.
        </TLDRBox>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cyan-950/60 rounded-lg p-4 border border-cyan-600/40">
            <div className="text-cyan-200 font-bold mb-1 text-sm">Column 2</div>
            <div className="text-xs text-slate-400">Outer (1/4) vs Inner (2/3)</div>
          </div>
          <div className="bg-cyan-950/60 rounded-lg p-4 border border-cyan-600/40">
            <div className="text-cyan-200 font-bold mb-1 text-sm">Column 3</div>
            <div className="text-xs text-slate-400">Low (1/2) vs High (3/4)</div>
          </div>
        </div>

        <p className="text-cyan-200 text-xs mt-4 italic">
          Column 1 (Odds/Evens) is ignored — it's affected by relic color/line.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="The Two Magic Numbers" icon="🔢" readTime="3 min" tag="Key">
        <TLDRBox>
          <strong className="text-emerald-400">Swap Rate</strong> tells you how reliable the pattern is. <strong className="text-orange-400">Run Length</strong> tells you when to expect a flip.
        </TLDRBox>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Swap Rate */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-4 border border-emerald-500/40">
            <h4 className="text-sm font-bold text-emerald-300 mb-3">Swap Rate = How Reliable</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between bg-emerald-950/70 p-2 rounded-lg">
                <span className="text-slate-300">{"<"}30% → Sticky</span>
                <span className="text-emerald-300 font-bold">MAX TRUST</span>
              </div>
              <div className="flex justify-between bg-teal-950/60 p-2 rounded-lg">
                <span className="text-slate-300">30–60% → Moderate</span>
                <span className="text-teal-300">Decent</span>
              </div>
              <div className="flex justify-between bg-red-950/70 p-2 rounded-lg">
                <span className="text-slate-300">≥70% → Volatile</span>
                <span className="text-red-300 font-bold">SKIP</span>
              </div>
            </div>
          </div>

          {/* Run Length */}
          <div className="bg-gradient-to-br from-orange-900/40 to-amber-900/40 rounded-xl p-4 border border-orange-500/40">
            <h4 className="text-sm font-bold text-orange-300 mb-3">Run Length = When to Flip</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between bg-orange-950/70 p-2 rounded-lg">
                <span className="text-slate-300">5+ in a row</span>
                <span className="text-xl text-orange-200 font-bold">80-90%</span>
              </div>
              <div className="flex justify-between bg-amber-950/60 p-2 rounded-lg">
                <span className="text-slate-300">4 in a row</span>
                <span className="text-lg text-amber-300">70-75%</span>
              </div>
              <div className="flex justify-between bg-yellow-950/50 p-2 rounded-lg">
                <span className="text-slate-300">3 in a row</span>
                <span className="text-yellow-300">~65%</span>
              </div>
              <div className="text-center text-slate-500 text-xs mt-2">
                ≤2 → Usually skip
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Smart Betting Recommendations" icon="🎯" readTime="2 min" tag="Pro">
        <TLDRBox>
          The system tells you EXACTLY which columns to bet on: <strong className="text-emerald-400">BET</strong> (clear pattern), <strong className="text-red-400">SKIP</strong> (chaotic), or focus on a specific column.
        </TLDRBox>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30">
            <div className="text-emerald-300 font-bold mb-1 text-sm">✅ BET</div>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Clear pattern detected</li>
              <li>• Confidence ≥60%</li>
              <li>• Accuracy tracked</li>
            </ul>
          </div>
          <div className="bg-red-900/40 rounded-lg p-3 border border-red-500/30">
            <div className="text-red-300 font-bold mb-1 text-sm">❌ SKIP</div>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Chaotic pattern</li>
              <li>• Confidence {"<"}50%</li>
              <li>• System monitors</li>
            </ul>
          </div>
        </div>

        <div className="bg-black/40 rounded-lg p-3 mt-3">
          <div className="text-yellow-300 font-bold mb-1 text-sm">💡 Recommendation Types:</div>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• "BET ON BOTH" — Both columns clear</li>
            <li>• "FOCUS ON COL3" — Only Col3 reliable</li>
            <li>• "SKIP SESSION" — Both chaotic</li>
          </ul>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Confidence vs Accuracy" icon="📈" readTime="2 min" tag="Important">
        <TLDRBox>
          <strong className="text-purple-400">Confidence</strong> = pattern strength (how sure system is). <strong className="text-violet-400">Accuracy</strong> = actual hit rate (how often correct). Check BOTH before betting!
        </TLDRBox>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-purple-950/60 rounded-lg p-4 border border-purple-500/30">
            <div className="text-purple-300 font-bold mb-2">Confidence</div>
            <ul className="text-purple-100 space-y-1">
              <li>= How sure the system is</li>
              <li>= Pattern strength</li>
              <li className="text-yellow-300 mt-2">Example: 77% confidence</li>
              <li className="text-[10px]">"I'm 77% sure this is a mixed-run pattern"</li>
            </ul>
          </div>
          <div className="bg-violet-950/60 rounded-lg p-4 border border-violet-500/30">
            <div className="text-violet-300 font-bold mb-2">Accuracy</div>
            <ul className="text-violet-100 space-y-1">
              <li>= How often predictions hit</li>
              <li>= Actual success rate</li>
              <li className="text-emerald-300 mt-2">Example: 73% accuracy</li>
              <li className="text-[10px]">"73% of my predictions were correct"</li>
            </ul>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
          <div className="text-amber-300 font-bold text-xs mb-1">⚠️ Important:</div>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• High confidence ≠ High accuracy</li>
            <li>• Always check BOTH before betting</li>
            <li>• Accuracy is tracked across your entire session</li>
          </ul>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Decision Matrix — When to Bet?" icon="⚖️" readTime="2 min" tag="Action">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-gradient-to-b from-emerald-800/70 to-emerald-900/70 rounded-xl p-4 border border-emerald-400 text-center">
            <div className="text-lg font-bold text-white mb-1">✅ BET GOOD RELICS</div>
            <div className="text-3xl font-black text-emerald-300 mb-2">70%+</div>
            <ul className="text-emerald-100 space-y-1 text-left">
              <li>• Clear pattern detected</li>
              <li>• Accuracy ≥70%</li>
              <li>• Confidence ≥60%</li>
            </ul>
          </div>

          <div className="bg-gradient-to-b from-amber-800/70 to-orange-900/70 rounded-xl p-4 border border-amber-400 text-center">
            <div className="text-lg font-bold text-white mb-1">⚪ OKAY RELICS</div>
            <div className="text-3xl font-black text-amber-300 mb-2">60-70%</div>
            <ul className="text-amber-100 space-y-1 text-left">
              <li>• Moderate pattern</li>
              <li>• Accuracy 60-70%</li>
              <li>• Use caution</li>
            </ul>
          </div>

          <div className="bg-gradient-to-b from-red-900/70 to-red-950/70 rounded-xl p-4 border border-red-400 text-center">
            <div className="text-lg font-bold text-white mb-1">❌ SKIP / TRASH</div>
            <div className="text-3xl font-black text-red-300 mb-2">{"<"}60%</div>
            <ul className="text-red-100 space-y-1 text-left">
              <li>• Chaotic pattern</li>
              <li>• Low accuracy</li>
              <li>• SKIP recommended</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="5-Minute Window System" icon="⏱️" readTime="2 min" tag="Advanced">
        <TLDRBox>
          Patterns change every <strong className="text-white">5 minutes</strong> in real games. The system analyzes each window independently and adapts automatically!
        </TLDRBox>

        <div className="bg-cyan-950/60 rounded-lg p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">Window 1:</span>
            <span className="text-slate-300">Alternating pattern → 90% accuracy ✅</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">Window 2:</span>
            <span className="text-yellow-300">⚠️ PATTERN CHANGED</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">Window 2:</span>
            <span className="text-slate-300">Dominance pattern → 85% accuracy ✅</span>
          </div>
        </div>

        <p className="text-cyan-200 font-semibold mt-3 text-xs">
          → System adapts to pattern changes automatically!<br/>
          → Debug export shows per-window breakdown
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Real Examples" icon="📋" readTime="2 min" tag="Examples">
        <div className="space-y-3">
          <div className="bg-slate-800/80 rounded-lg p-4 border border-emerald-500/40">
            <div className="font-bold text-emerald-300 text-sm">✅ Perfect Setup</div>
            <ul className="text-xs mt-2 space-y-1 text-slate-300">
              <li>• Pattern: Alternating (90% confidence)</li>
              <li>• Accuracy: 73% (tracked)</li>
              <li>• Recommendation: BET</li>
            </ul>
            <div className="mt-2 text-sm font-bold text-emerald-300">→ Follow the recommendation!</div>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-4 border border-amber-500/40">
            <div className="font-bold text-amber-300 text-sm">⚪ Moderate Setup</div>
            <ul className="text-xs mt-2 space-y-1 text-slate-300">
              <li>• Pattern: Mixed-run (77% confidence)</li>
              <li>• Accuracy: 55% (tracked)</li>
              <li>• Recommendation: BET (with caution)</li>
            </ul>
            <div className="mt-2 text-sm font-bold text-amber-300">→ Okay for decent relics</div>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-4 border border-red-500/40">
            <div className="font-bold text-red-300 text-sm">❌ Skip This</div>
            <ul className="text-xs mt-2 space-y-1 text-slate-300">
              <li>• Pattern: Chaotic (35% confidence)</li>
              <li>• Status: SUPPRESSED</li>
              <li>• Recommendation: SKIP</li>
            </ul>
            <div className="mt-2 text-sm font-bold text-red-300">→ System is monitoring - wait!</div>
          </div>
        </div>
      </CollapsibleSection>

      <div className="mt-6 bg-gradient-to-br from-cyan-600/10 to-teal-600/10 border border-cyan-500/30 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>🏆</span>
          Kiyo Mode Quick Tips
        </h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-3"><span className="text-cyan-400">•</span><span>Trust the betting recommendations — they're based on real accuracy!</span></li>
          <li className="flex gap-3"><span className="text-cyan-400">•</span><span>Check both confidence AND accuracy before betting</span></li>
          <li className="flex gap-3"><span className="text-cyan-400">•</span><span>Patterns change every 5 minutes — system adapts automatically</span></li>
          <li className="flex gap-3"><span className="text-cyan-400">•</span><span>SKIP when both columns are chaotic</span></li>
          <li className="flex gap-3"><span className="text-cyan-400">•</span><span>Export debug to see per-window breakdown</span></li>
        </ul>
      </div>
    </div>
  );
}
