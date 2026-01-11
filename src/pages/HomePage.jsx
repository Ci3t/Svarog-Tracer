import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

export default function HomePage() {
  const navigate = useNavigate();
  const [isSplashDone, setIsSplashDone] = useState(false);
  const baseUrl = import.meta.env.BASE_URL;

  const modes = [
    {
      title: "Scanner",
      label: "Live Predictor",
      desc: "Track in-game sessions with real-time pattern detection.",
      path: "/live",
      icon: "🔴"
    },
    {
      title: "Waveform",
      label: "Kiyo Mode",
      desc: "Advanced 3nd digit forecasting with wave analysis.",
      path: "/kiyo",
      icon: "🌊"
    },
    {
      title: "Database",
      label: "Warp Analyzer",
      desc: "Global pull data processing for HSR, Genshin, and WuWa.",
      path: "/warp-analyzer",
      icon: "📊"
    },
    {
      title: "Sandbox",
      label: "The Lab",
      desc: "Experimental sandboxing for long roll strings.",
      path: "/long-string",
      icon: "🧪"
    }
  ];

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => setIsSplashDone(true)
    });

    // Reveal sequence
    tl.to(".splash-shutter", {
      maskSize: "800% 800%",
      WebkitMaskSize: "800% 800%",
      duration: 2.5,
      ease: "power4.inOut",
      delay: 0.2
    })
    .to(".splash-shutter", {
      opacity: 0,
      duration: 0.3,
      pointerEvents: "none"
    })
    .from(".hero-content > *", {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out"
    }, "-=1.0")
    .from(".mode-card", {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: "power2.out"
    }, "-=0.8");

    // Title Float
    gsap.to(".hero-title", {
      y: 10,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    // FAILSAFE: Force clear after 5s if GSAP hangs
    const failsafe = setTimeout(() => setIsSplashDone(true), 5000);
    return () => clearTimeout(failsafe);
  }, []);

  const [typewriterText, setTypewriterText] = useState("");
  const fullText = "Decrypt the hidden rhythms of the gacha. A sophisticated observation suite built to visualize RNG patterns and historical probability peaks.";

  useEffect(() => {
    if (isSplashDone) {
      let i = 0;
      const interval = setInterval(() => {
        setTypewriterText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) clearInterval(interval);
      }, 15);
      return () => clearInterval(interval);
    }
  }, [isSplashDone]);

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden selection:bg-purple-500 selection:text-white">
      
      {/* SHUTTER LAYER (Separate from content for zero-flicker) */}
      {!isSplashDone && (
        <div 
          className="splash-shutter fixed inset-0 z-[100] bg-[#020617] pointer-events-none"
          style={{
            maskImage: `url(${baseUrl}mask.webp)`,
            WebkitMaskImage: `url(${baseUrl}mask.webp)`,
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            maskSize: '0% 0%',
            WebkitMaskSize: '0% 0%',
          }}
        />
      )}

      {/* SCANLINE EFFECT */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* BACKGROUND IMAGE - CLEAR & BRIGHT */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={`${baseUrl}clara.jpg`} 
          alt="Backdrop" 
          className="w-full h-full object-cover opacity-20 grayscale brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-transparent to-[#020617] opacity-80" />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        
        <div className="hero-content text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] mb-12 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
             <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_12px_#a855f7]" />
             Svarog Neural Network Active
          </div>
          
          <h1 className="hero-title text-7xl md:text-9xl font-black tracking-tighter mb-6 text-white leading-none drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]">
            SVAROG TRACER
          </h1>
          
          <div className="max-w-2xl mx-auto text-slate-300 text-sm md:text-xl leading-relaxed tracking-wide mb-12 min-h-[4em] drop-shadow-sm font-medium">
            {typewriterText}
            {(!isSplashDone || typewriterText.length < fullText.length) && <span className="inline-block w-2.5 h-6 ml-1.5 bg-purple-500 animate-pulse align-middle" />}
            <span className="block mt-6 text-amber-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] italic">⚡ Critical Status: Prediction Engine Operational</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
             <div className="px-6 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-[10px] text-slate-400 uppercase tracking-widest font-black font-mono">
               Ver_3.8.6_Stable
             </div>
             <div className="px-6 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-[10px] text-slate-400 uppercase tracking-widest font-black font-mono">
               Sync_Efficiency:100%
             </div>
          </div>
        </div>

        {/* MODES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full mb-32 px-4 text-center">
          {modes.map((mode) => (
            <div 
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className="mode-card group cursor-pointer relative p-10 rounded-3xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-3xl hover:border-purple-500/40 hover:bg-slate-800 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.3em] mb-6 group-hover:text-purple-400 transition-colors font-mono">{mode.title}</div>
                <div className="text-4xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 inline-block drop-shadow-xl">{mode.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-100">{mode.label}</h3>
                <p className="text-slate-400 text-xs leading-relaxed group-hover:text-slate-200 transition-colors">
                  {mode.desc}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-800">
                 <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_15px_#a855f7]" />
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER INFO */}
        <footer className="w-full border-t border-slate-800/80 pt-20 pb-12 text-center mt-12">
           <p className="text-[11px] text-slate-500 uppercase tracking-[0.8em] mb-12 font-black opacity-80">
             Svarog Tracer Protocol • Mainframe Observation
           </p>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16 max-w-4xl mx-auto">
              <div className="text-center group border-r border-slate-800 hidden sm:block">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-2">Status</div>
                <div className="text-white text-xs font-bold uppercase">Fully Operational</div>
              </div>
              <div className="text-center group border-r border-slate-800 hidden sm:block">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-2">Auth</div>
                <div className="text-white text-xs font-bold uppercase">Public Deck</div>
              </div>
              <div className="text-center group">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-2">Uptime</div>
                <div className="text-white text-xs font-bold uppercase">Permanent Sync</div>
              </div>
           </div>
           
           <div className="flex flex-wrap justify-center gap-10 text-slate-600 pt-8 border-t border-slate-800/20">
              <span className="text-[9px] uppercase font-black hover:text-purple-400 transition-all cursor-pointer font-mono tracking-widest">Mainframe Doc</span>
              <span className="text-[9px] uppercase font-black hover:text-purple-400 transition-all cursor-pointer font-mono tracking-widest">API Endpoint</span>
              <span className="text-[9px] uppercase font-black hover:text-purple-400 transition-all cursor-pointer font-mono tracking-widest">Dev: @Ciet</span>
           </div>
        </footer>

      </div>
    </div>
  );
}
