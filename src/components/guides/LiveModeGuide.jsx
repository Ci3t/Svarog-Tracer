// Live Mode Guide - Accurate Version with Pro Tips
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
      <div ref={glowRef} className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 rounded-xl blur-xl opacity-0" style={{ pointerEvents: 'none' }} />
      <div className="relative bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-xl border border-slate-700/30 overflow-hidden backdrop-blur-sm">
        <button ref={headerRef} onClick={() => setIsOpen(!isOpen)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="w-full p-4 flex items-center justify-between transition-all group relative z-10">
          <div className="flex items-center gap-3">
            <div ref={iconRef} className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/30 to-violet-600/30 flex items-center justify-center text-xl border border-purple-500/30 shadow-lg shadow-purple-500/20">{icon}</div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              {readTime && <span className="text-xs text-slate-500">{readTime}</span>}
              {tag && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30">{tag}</span>}
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
    <div ref={boxRef} className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-l-2 border-purple-500/50 rounded-r-lg p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">TL;DR</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

export default function LiveModeGuide() {
  const headerRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(badgeRef.current, { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
      .fromTo(titleRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from(titleRef.current.querySelectorAll('span'), { y: 30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');
      gsap.to(badgeRef.current, { boxShadow: '0 0 30px rgba(147, 51, 234, 0.6)', duration: 2, ease: 'power1.inOut', yoyo: true, repeat: -1 });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div ref={headerRef} className="text-center mb-8">
        <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/30 to-violet-600/30 border border-purple-500/40 mb-4 shadow-lg">
          <span className="text-lg">🔴</span>
          <span className="text-sm font-bold text-purple-300">Live Mode Guide</span>
        </div>
        <h1 ref={titleRef} className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 mb-3">
          <span>L</span><span>i</span><span>v</span><span>e</span><span> </span><span>M</span><span>o</span><span>d</span><span>e</span>
        </h1>
        <p className="text-slate-400 text-sm">Real-time roll tracking • BBP prediction • 5-minute sessions</p>
      </div>

      <CollapsibleSection title="What is Live Mode?" icon="🔴" defaultOpen={true} readTime="2 min" tag="Overview">
        <TLDRBox>
          Live Mode tracks your relic rolls in <strong className="text-white">real-time</strong> and predicts the next outcome using pair transition analysis, trend tracking, and wave detection. Best used during active play.
        </TLDRBox>
        <p className="text-sm text-slate-300 leading-relaxed">
          This is the <strong className="text-white">main mode</strong> for active relic manipulation. You enter rolls as they happen (or auto-import), and the system analyzes patterns to predict what comes next. The prediction updates after every roll.
        </p>
        <div className="border-l-2 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-transparent rounded-r px-4 py-3">
          <p className="text-sm text-slate-400 italic leading-relaxed">
            <strong className="text-purple-400">Key Concept:</strong> The predictor uses "commons" (frequent rolls) vs "noise" (rare rolls) to detect patterns and predict flip points.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Step-by-Step Workflow" icon="📋" readTime="4 min" tag="Workflow">
        <TLDRBox>
          Start session → Enter rolls → Watch prediction → Bet when confidence is high → Track your accuracy → Restart after 5 min.
        </TLDRBox>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Start a Session', desc: 'Click "Start" to begin a 5-minute session. The timer helps you track optimal betting windows.' },
            { step: '2', title: 'Enter Rolls', desc: 'Type each 2-digit roll (41, 42, 43, 44) as it happens. Use the quick buttons or type directly. You can also auto-import from OCR.' },
            { step: '3', title: 'Watch the Predictor', desc: 'The BBP Mode card shows the predicted next roll with confidence %. Higher = safer bet.' },
            { step: '4', title: 'Understand Commons/Noise', desc: 'Commons (green) = frequently appearing rolls. Noise (red) = rare rolls. The system expects commons to repeat.' },
            { step: '5', title: 'Wait for Wave Warnings', desc: 'When "Run Len" gets high (4+), a flip is coming. The system will warn you with orange alerts.' },
            { step: '6', title: 'Restart After 5 Minutes', desc: 'Each 5-minute window has its own pattern. Restart to reset analysis for the new window.' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/40 rounded-lg p-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/30 to-violet-600/30 flex items-center justify-center text-sm font-bold text-purple-400 border border-purple-500/30 flex-shrink-0">{item.step}</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm mb-1">{item.title}</h5>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Understanding the Prediction Card" icon="🎯" readTime="3 min" tag="Core">
        <TLDRBox>
          The big number is the prediction. The ring shows confidence. Look at Commons, Noise, Run Length, and Flip Probability to understand why.
        </TLDRBox>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">🔮 Main Prediction</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Large number in circle = predicted next roll</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Ring fill = confidence (higher = better)</span></li>
              <li className="flex gap-2"><span className="text-purple-400">•</span><span>Alt prediction = backup if main fails</span></li>
            </ul>
          </div>
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">📊 Commons vs Noise</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span><strong className="text-emerald-400">Commons</strong>: The 2 most frequent rolls (appear 60%+ of time)</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span><strong className="text-red-400">Noise</strong>: The 2 rarest rolls (interrupts)</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span><span>System expects commons to repeat until flip</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h5 className="font-bold text-orange-400 mb-2 text-sm">⚠️ Wave/Flip Indicators</h5>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-white">Run Len</div>
              <p className="text-[10px] text-slate-400">Consecutive commons. {">"} 4 = flip soon</p>
            </div>
            <div>
              <div className="text-lg font-bold text-white">Noise Hits</div>
              <p className="text-[10px] text-slate-400">Recent noise appearances. {">"} 2 = unstable</p>
            </div>
            <div>
              <div className="text-lg font-bold text-white">Flip Prob</div>
              <p className="text-[10px] text-slate-400">Chance of pattern breaking</p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pro Tips & Strategies" icon="💎" readTime="4 min" tag="Pro">
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <h5 className="font-bold text-emerald-400 mb-2 text-sm">✅ When to Bet (High Confidence)</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Confidence {">"} 70% and Run Length {"<"} 3</li>
              <li>• Commons are clearly defined (both at 25%+ frequency)</li>
              <li>• No recent Commons Flip detected</li>
              <li>• Last 3-4 rolls were commons = pattern is stable</li>
            </ul>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h5 className="font-bold text-red-400 mb-2 text-sm">❌ When to Skip (Dangerous)</h5>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Wave Flip Warning showing (orange banner)</li>
              <li>• Run Length {">"} 4 (flip is imminent)</li>
              <li>• Commons Flip Detected (pattern just changed)</li>
              <li>• Less than 6 rolls in session (not enough data)</li>
            </ul>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h5 className="font-bold text-purple-400 mb-2 text-sm">🧠 Advanced Strategy: Reading the Gap Analysis</h5>
            <p className="text-xs text-slate-300 mb-2">The "Noise Gap Analysis" table shows how many commons appear between each noise roll.</p>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• If average gap is 4-5, expect 4-5 commons before next noise</li>
              <li>• If current "since last noise" {">"} average, a noise is overdue</li>
              <li>• Use this to time your bets BEFORE the flip</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Common Mistakes to Avoid" icon="🚫" readTime="2 min" tag="Tips">
        <div className="space-y-3">
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
            <h5 className="font-bold text-red-400 mb-1 text-sm">❌ Betting on Every Prediction</h5>
            <p className="text-xs text-slate-400">Low confidence predictions ({"<"}60%) are coin flips. Wait for strong signals.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
            <h5 className="font-bold text-red-400 mb-1 text-sm">❌ Ignoring Wave Warnings</h5>
            <p className="text-xs text-slate-400">The system TELLS you when a flip is coming. Don't bet against the warning.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
            <h5 className="font-bold text-red-400 mb-1 text-sm">❌ Not Restarting After 5 Minutes</h5>
            <p className="text-xs text-slate-400">Each 5-min window has its own pattern. Old data pollutes the analysis.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
            <h5 className="font-bold text-red-400 mb-1 text-sm">❌ Betting During Commons Flip</h5>
            <p className="text-xs text-slate-400">When the purple "Commons Flip Detected" banner shows, the pattern is resetting. Wait for it to stabilize (3-4 rolls).</p>
          </div>
        </div>
      </CollapsibleSection>

      <div className="mt-6 bg-gradient-to-br from-purple-600/10 to-violet-600/10 border border-purple-500/30 rounded-xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span>🏆</span>
          The Winning Formula
        </h3>
        <ol className="space-y-2 text-sm text-slate-300">
          <li className="flex gap-3"><span className="font-bold text-purple-400">1.</span><span>Wait for commons to stabilize (6+ rolls)</span></li>
          <li className="flex gap-3"><span className="font-bold text-purple-400">2.</span><span>Bet on high confidence (70%+) predictions</span></li>
          <li className="flex gap-3"><span className="font-bold text-purple-400">3.</span><span>Skip when Run Length {">"} 4 or Wave Warning active</span></li>
          <li className="flex gap-3"><span className="font-bold text-purple-400">4.</span><span>After flip, wait 3-4 rolls for new pattern</span></li>
          <li className="flex gap-3"><span className="font-bold text-purple-400">5.</span><span>Restart every 5 minutes for fresh analysis</span></li>
        </ol>
      </div>
    </div>
  );
}
