// Long String Lab Guide - Accurate Version (Same as Live Mode but with Long Strings)
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
          gsap.set(headerRef.current, { backgroundColor: 'rgba(16, 185, 129, 0.1)' });
          gsap.set(glowRef.current, { opacity: 0.6, scale: 1.05 });
          gsap.set(contentRef.current, { height: 'auto', opacity: 1 });
          gsap.set(arrowRef.current, { rotation: 180, scale: 1.1 });
          gsap.set(iconRef.current, { scale: 1.15, rotation: 360 });
          isFirstMount.current = false;
          return;
        }

        tl.to(headerRef.current, { backgroundColor: 'rgba(16, 185, 129, 0.1)', duration: 0.3, ease: 'power2.out' })
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
      <div ref={glowRef} className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 via-emerald-600/20 to-emerald-600/0 rounded-xl blur-xl opacity-0" style={{ pointerEvents: 'none' }} />
      <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl border border-slate-700/30 overflow-hidden backdrop-blur-sm">
        <button ref={headerRef} onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between transition-all group relative z-10 cursor-pointer">
          <div className="flex items-center gap-3">
            <div ref={iconRef} className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center text-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/20">{icon}</div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              {readTime && <span className="text-xs text-slate-500">{readTime}</span>}
              {tag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">{tag}</span>}
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
    <div ref={boxRef} className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-l-2 border-emerald-500/50 rounded-r-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">TL;DR</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

export default function LongStringGuide() {
  const headerRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(badgeRef.current, { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
      .fromTo(titleRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from(titleRef.current.querySelectorAll('span'), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');
      gsap.to(badgeRef.current, { boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)', duration: 2, ease: 'power1.inOut', yoyo: true, repeat: -1 });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div ref={headerRef} className="text-center mb-8">
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 mb-4 shadow-lg">
          <span className="text-lg">🧪</span>
          <span className="text-sm font-bold text-emerald-300">Long String Lab</span>
        </div>
        <h1 ref={titleRef} className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 mb-3">
          <span>L</span><span>o</span><span>n</span><span>g</span><span> </span><span>S</span><span>t</span><span>r</span><span>i</span><span>n</span><span>g</span><span> </span><span>L</span><span>a</span><span>b</span>
        </h1>
        <p className="text-slate-400 text-sm">Paste long roll strings • Same BBP analysis • No cutting needed</p>
      </div>

      <CollapsibleSection title="What is Long String Lab?" icon="🧪" defaultOpen={true} readTime="2 min" tag="Overview">
        <TLDRBox>
          Long String Lab is <strong className="text-white">exactly like Live Mode</strong>, but instead of entering rolls one by one, you paste a <strong className="text-white">long uncut roll string</strong>. Same BBP prediction, same commons/noise analysis.
        </TLDRBox>
        <p className="text-sm text-slate-300 leading-relaxed">
          When you have a continuous stream of roll data (like from screen recording or OCR), you don't need to cut it up. Just paste the whole thing here. The system automatically splits it into pairs and runs the same BBP analysis as Live Mode.
        </p>
        <div className="border-l-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-r px-4 py-3">
          <p className="text-sm text-slate-400 italic leading-relaxed">
            <strong className="text-emerald-400">Key Difference:</strong> Live Mode = enter rolls real-time. Long String Lab = paste all rolls at once.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Step-by-Step Workflow" icon="📋" readTime="3 min" tag="Workflow">
        <TLDRBox>
          Paste your long string → System decodes it → View BBP prediction → Use the same strategies as Live Mode.
        </TLDRBox>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Get Your Long String', desc: 'Copy a continuous roll string from OCR, screen recording, or manual tracking. Example: "213421342134..."' },
            { step: '2', title: 'Paste Into the Input', desc: 'Paste the entire string — no need to format it. The system handles spaces, commas, or no separators.' },
            { step: '3', title: 'View Decoded Rolls', desc: 'The system splits your string into pairs (21, 34, 21...) and converts to 4x format (41, 42, 43, 44).' },
            { step: '4', title: 'Read the BBP Prediction', desc: 'Same prediction card as Live Mode — shows commons, noise, confidence, and next roll prediction.' },
            { step: '5', title: 'Check Frequency & Trends', desc: 'See which rolls dominated (commons) and which were rare (noise). Use this for your next live session.' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center text-sm font-bold text-emerald-400 border border-emerald-500/30 flex-shrink-0">{item.step}</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm mb-1">{item.title}</h5>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Understanding the Display" icon="📊" readTime="3 min" tag="Analysis">
        <TLDRBox>
          You get the same BBP prediction card, frequency bars, commons/noise detection, and trend indicators as Live Mode.
        </TLDRBox>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">📊 Frequency Distribution</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span>Bar chart shows % for each roll (41, 42, 43, 44)</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span><strong className="text-purple-400">DOMINANT</strong> = over 40% of rolls</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span><strong className="text-emerald-400">COMMON</strong> = frequently appearing</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span><strong className="text-amber-400">NOISE</strong> = rare rolls</span></li>
            </ul>
          </div>
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">� BBP Prediction Card</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Same algorithm as Live Mode</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Shows predicted next roll with confidence</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Commons vs Noise classification</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Trend arrows (↑ rising, ↓ falling)</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h5 className="font-bold text-blue-400 mb-2 text-sm">� Trend Indicator</h5>
          <p className="text-xs text-slate-300 mb-2">Compares first half vs second half of your string:</p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <div className="text-lg font-bold text-emerald-400">↑</div>
              <p className="text-slate-500">Appearing more in 2nd half</p>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">↓</div>
              <p className="text-slate-500">Appearing less in 2nd half</p>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-400">—</div>
              <p className="text-slate-500">Stable throughout</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pro Tips & Strategies" icon="💎" readTime="3 min" tag="Pro">
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">✅ Best Uses for Long String Lab</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• <strong className="text-white">Pre-session scout:</strong> Paste recent data to see current commons before going live</li>
              <li>• <strong className="text-white">OCR dumps:</strong> When you have auto-captured roll data, paste it here</li>
              <li>• <strong className="text-white">Verify patterns:</strong> Check if a session's pattern matches your predictions</li>
              <li>• <strong className="text-white">Training:</strong> Learn to recognize commons/noise patterns</li>
            </ul>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">🧠 Reading the Results</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• If one roll is <strong className="text-purple-400">DOMINANT</strong> (40%+), the session was heavily biased</li>
              <li>• If trends show ↑ for noise rolls, the pattern might be flipping</li>
              <li>• Use the prediction to plan your next live session betting strategy</li>
            </ul>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <h5 className="font-bold text-amber-400 mb-2 text-sm">⏱️ Using the 5-Minute Timer</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Timer auto-saves your string to history when it expires</li>
              <li>• Use timer to simulate live session timing</li>
              <li>• History lets you compare multiple 5-min windows</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Long String vs Live Mode" icon="⚖️" readTime="2 min" tag="Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 text-slate-400 font-medium">Feature</th>
                <th className="text-center py-2 text-emerald-400 font-medium">Long String Lab</th>
                <th className="text-center py-2 text-purple-400 font-medium">Live Mode</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-800">
                <td className="py-2">Input Method</td>
                <td className="text-center text-emerald-300">Paste all at once</td>
                <td className="text-center text-purple-300">Enter roll by roll</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2">Prediction Algorithm</td>
                <td className="text-center">Same BBP</td>
                <td className="text-center">Same BBP</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2">Real-time Updates</td>
                <td className="text-center text-red-400">No</td>
                <td className="text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-slate-800">
                <td className="py-2">Wave Warnings</td>
                <td className="text-center text-slate-500">Limited</td>
                <td className="text-center text-emerald-400">Full</td>
              </tr>
              <tr>
                <td className="py-2">Best For</td>
                <td className="text-center text-emerald-300">Pre-analysis, OCR data</td>
                <td className="text-center text-purple-300">Active play</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <div className="mt-6 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>🏆</span>
          Long String Lab Quick Win
        </h3>
        <ol className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-3"><span className="font-bold text-emerald-400">1.</span><span>Before going live, paste recent data to see current commons</span></li>
          <li className="flex gap-3"><span className="font-bold text-emerald-400">2.</span><span>Check which 2 rolls dominate — these are your betting targets</span></li>
          <li className="flex gap-3"><span className="font-bold text-emerald-400">3.</span><span>Note the trend arrows — if noise is ↑, be ready for a flip</span></li>
          <li className="flex gap-3"><span className="font-bold text-emerald-400">4.</span><span>Go to Live Mode and apply what you learned</span></li>
        </ol>
      </div>
    </div>
  );
}
