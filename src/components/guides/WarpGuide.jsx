// Warp Analyzer Guide - Accurate Version
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
          gsap.set(headerRef.current, { backgroundColor: 'rgba(147, 51, 234, 0.1)' });
          gsap.set(glowRef.current, { opacity: 0.6, scale: 1.05 });
          gsap.set(contentRef.current, { height: 'auto', opacity: 1 });
          gsap.set(arrowRef.current, { rotation: 180, scale: 1.1 });
          gsap.set(iconRef.current, { scale: 1.15, rotation: 360 });
          isFirstMount.current = false;
          return;
        }

        tl.to(headerRef.current, { backgroundColor: 'rgba(147, 51, 234, 0.1)', duration: 0.3, ease: 'power2.out' })
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

  const handleMouseEnter = () => {
    if (!isOpen) {
      gsap.to(iconRef.current, { scale: 1.1, rotation: 10, duration: 0.3, ease: 'power2.out' });
      gsap.to(glowRef.current, { opacity: 0.3, duration: 0.3 });
    }
  };

  const handleMouseLeave = () => {
    if (!isOpen) {
      gsap.to(iconRef.current, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
      gsap.to(glowRef.current, { opacity: 0, duration: 0.3 });
    }
  };

  return (
    <div className="mb-4 relative">
      <div ref={glowRef} className="absolute inset-0 bg-gradient-to-r from-amber-600/0 via-amber-600/20 to-amber-600/0 rounded-xl blur-xl opacity-0" style={{ pointerEvents: 'none' }} />
      <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl border border-slate-700/30 overflow-hidden backdrop-blur-sm">
        <button ref={headerRef} onClick={() => setIsOpen(!isOpen)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="w-full p-4 flex items-center justify-between transition-all group relative z-10">
          <div className="flex items-center gap-3">
            <div ref={iconRef} className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600/30 to-orange-600/30 flex items-center justify-center text-xl border border-amber-500/30 shadow-lg shadow-amber-500/20">{icon}</div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              {readTime && <span className="text-xs text-slate-500">{readTime}</span>}
              {tag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30">{tag}</span>}
            </div>
          </div>
          <svg ref={arrowRef} className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div ref={contentRef} style={{ 
          height: defaultOpen ? 'auto' : 0, 
          opacity: defaultOpen ? 1 : 0, 
          overflow: 'hidden', 
          display: defaultOpen ? 'block' : 'none' 
        }}>
          <div className="px-4 pb-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TLDRBox({ children }) {
  const boxRef = useRef(null);
  return (
    <div ref={boxRef} className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-l-2 border-amber-500/50 rounded-r-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">TL;DR</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

export default function WarpGuide() {
  const headerRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(badgeRef.current, { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
      .fromTo(titleRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from(titleRef.current.querySelectorAll('span'), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');
      gsap.to(badgeRef.current, { boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)', duration: 2, ease: 'power1.inOut', yoyo: true, repeat: -1 });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div ref={headerRef} className="text-center mb-8">
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/40 mb-4 shadow-lg">
          <span className="text-lg">📊</span>
          <span className="text-sm font-bold text-amber-300">Warp Analyzer Guide</span>
        </div>
        <h1 ref={titleRef} className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 mb-3">
          <span>W</span><span>a</span><span>r</span><span>p</span><span> </span><span>A</span><span>n</span><span>a</span><span>l</span><span>y</span><span>z</span><span>e</span><span>r</span>
        </h1>
        <p className="text-slate-400 text-sm">Community pull data • Lucky peaks • Shortcut strings</p>
      </div>

      <CollapsibleSection title="What is Warp Analyzer?" icon="📊" defaultOpen={true} readTime="2 min" tag="Overview">
        <TLDRBox>
          Warp Analyzer finds <strong className="text-white">"lucky peaks"</strong> — roll numbers where more players hit 5★ than statistically expected. It generates a <strong className="text-amber-400">shortcut string</strong> to guide your pulling strategy.
        </TLDRBox>
        <p className="text-sm text-slate-300 leading-relaxed">
          This tool analyzes <strong className="text-white">real community pull data</strong> from thousands of players to identify: which roll numbers produce more 5★ drops than average, how "lucky" those peaks are (Z-score), and an optimized pull sequence to land on those peaks.
        </p>
        <div className="border-l-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent rounded-r px-4 py-3">
          <p className="text-sm text-slate-400 italic leading-relaxed">
            <strong className="text-amber-400">Important:</strong> This is NOT a prediction tool. It's a statistical analyzer. Data varies by patch day (Day 1-2 usually has the best signal due to high pull volume).
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="How to Use It" icon="🎯" readTime="3 min" tag="Workflow">
        <TLDRBox>
          Select a banner → View the distribution chart → Note the shortcut string → Pull singles then x10s following the string pattern.
        </TLDRBox>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Select Your Banner', desc: 'Choose Character or Light Cone/Weapon tab, then click on the specific banner you want to analyze.' },
            { step: '2', title: 'Check the Chart', desc: 'Yellow bars = lucky peaks (more 5★ than expected). Purple zone = soft pity range.' },
            { step: '3', title: 'Read the Shortcut String', desc: 'Each digit = number of SINGLE pulls. After each digit, do a x10 pull.' },
            { step: '4', title: 'Follow the Sweep Path', desc: 'The sweep path shows exactly: "3x1 → 1x10 → lands on #13" meaning do 3 singles, then x10, and you land on roll 13.' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600/30 to-orange-600/30 flex items-center justify-center text-sm font-bold text-amber-400 border border-amber-500/30 flex-shrink-0">{item.step}</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm mb-1">{item.title}</h5>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Understanding the Shortcut String" icon="🔢" readTime="4 min" tag="Core Concept">
        <TLDRBox>
          String <span className="text-amber-400 font-mono">6 7 3</span> means: do 6 singles → x10 → 7 singles → x10 → 3 singles → x10... until you hit 5★.
        </TLDRBox>
        
        <div className="bg-slate-900/50 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div className="text-amber-400 text-xs mb-2 font-bold uppercase tracking-wider">Example String</div>
          <div className="text-3xl font-mono font-bold text-amber-400 tracking-[0.3em] text-center mb-3">6 7 3</div>
          <div className="text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-bold w-6">6</span>
              <span>→ Do 6 single pulls (rolls 1-6)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold w-6">x10</span>
              <span>→ Do x10 pull (rolls 7-16, <strong className="text-white">lands on 16</strong>)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-bold w-6">7</span>
              <span>→ Do 7 single pulls (rolls 17-23)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold w-6">x10</span>
              <span>→ Do x10 pull (rolls 24-33, <strong className="text-white">lands on 33</strong>)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-bold w-6">3</span>
              <span>→ Do 3 single pulls, then x10...</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">✓ Why This Works</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span>x10 = 10 consecutive pulls</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span>Singles before x10 = phase alignment</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span>Goal: Land x10's LAST roll on a lucky peak</span></li>
            </ul>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <h5 className="font-bold text-amber-400 mb-2 text-sm">⚠️ Key Point</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-amber-400">•</span><span><strong className="text-white">0</strong> in string = skip singles, go straight to x10</span></li>
              <li className="flex gap-2"><span className="text-amber-400">•</span><span>Repeat the pattern until you get 5★</span></li>
              <li className="flex gap-2"><span className="text-amber-400">•</span><span>If you hit soft pity, just keep pulling</span></li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="What is Z-Score?" icon="📈" readTime="2 min" tag="Stats">
        <TLDRBox>
          Z-Score = how "unusually lucky" a roll number is. Higher Z = more players hit 5★ on that roll than expected. <span className="text-amber-400">Z {'>'} 2.0 = top 2.5% lucky</span>.
        </TLDRBox>
        
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Z {'<'} 1.0</span>
            <span className="text-slate-500">Normal variance</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-400 font-bold">Z {'>'} 2.0</span>
            <span className="text-purple-400">Lucky (top 2.5% of rolls)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-400 font-bold">Z {'>'} 2.7</span>
            <span className="text-amber-400">Very Lucky (top 1%)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-400 font-bold">Z {'>'} 3.0</span>
            <span className="text-emerald-400">Extremely Lucky (top 0.3%)</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          <strong className="text-white">Translation:</strong> If roll #16 has Z=2.5, it means more players hit a 5★ on roll 16 than we'd expect from pure random chance. The analyzer highlights these peaks in <span className="text-amber-400">gold</span> on the chart.
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Reading the Chart" icon="📉" readTime="2 min" tag="Visual">
        <TLDRBox>
          Bars = how many 5★ drops occurred at each roll number. Yellow bars = lucky peaks. Purple zone (75-90) = soft pity where rates naturally increase.
        </TLDRBox>

        <div className="space-y-3">
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-4">
            <h5 className="font-bold text-amber-400 mb-2 text-sm">🟨 Yellow Bars (Lucky Peaks)</h5>
            <p className="text-xs text-slate-300">These roll numbers had MORE 5★ drops than expected. The shortcut string targets these peaks.</p>
          </div>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">🟪 Purple Zone (Soft Pity)</h5>
            <p className="text-xs text-slate-300">Rolls 75-90 (characters) or 65-80 (light cones). Drop rates increase here naturally, so high bars are expected.</p>
          </div>
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-4">
            <h5 className="font-bold text-slate-400 mb-2 text-sm">⬜ Gray Bars (Pre-Pity)</h5>
            <p className="text-xs text-slate-300">Rolls 1-74 before soft pity kicks in. Lucky peaks HERE are what you're really looking for — early 5★ is the dream.</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Tips & Best Practices" icon="💡" readTime="2 min" tag="Pro Tips">
        <div className="space-y-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">✓ Best Time to Use</h5>
            <p className="text-xs text-slate-400">Late Day 1 or Day 2 of a new banner. High pull volume = more reliable data. End of patch = stale data, less useful.</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <h5 className="font-bold text-amber-400 mb-2 text-sm">⚠️ It's NOT Magic</h5>
            <p className="text-xs text-slate-400">This is statistics, not prediction. Lucky peaks are historical anomalies — they may or may not repeat. Use as a guide, not a guarantee.</p>
          </div>
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">🎯 When to Just Pull x10</h5>
            <p className="text-xs text-slate-400">Once you're in soft pity (75+), just spam x10. The string is mostly useful for the early game (1-74) where rates are low and peaks matter more.</p>
          </div>
        </div>
      </CollapsibleSection>

      <div className="mt-6 bg-gradient-to-br from-amber-600/10 to-orange-600/10 border border-amber-500/30 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>🎲</span>
          Quick Reference
        </h3>
        <ol className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-3"><span className="font-bold text-amber-400">1.</span><span>String digit = singles before x10</span></li>
          <li className="flex gap-3"><span className="font-bold text-amber-400">2.</span><span>Z {'>'} 2.0 = statistically lucky peak</span></li>
          <li className="flex gap-3"><span className="font-bold text-amber-400">3.</span><span>Yellow bars = target rolls</span></li>
          <li className="flex gap-3"><span className="font-bold text-amber-400">4.</span><span>Best data = Day 1-2 of new banners</span></li>
        </ol>
      </div>
    </div>
  );
}
