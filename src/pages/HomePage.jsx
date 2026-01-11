import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

export default function HomePage() {
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    // Initial state: mask is small and centered
    gsap.set(contentRef.current, {
      maskImage: `url(${baseUrl}mask.webp)`,
      WebkitMaskImage: `url(${baseUrl}mask.webp)`,
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      maskSize: '0% 0%',
      WebkitMaskSize: '0% 0%',
      opacity: 0
    });

    const tl = gsap.timeline({
      onComplete: () => {
        // Remove mask after animation for performance and scroll
        gsap.set(contentRef.current, {
          maskImage: 'none',
          WebkitMaskImage: 'none',
        });
        setIsSplashDone(true);
      }
    });

    // Sequence
    tl.to(contentRef.current, {
      opacity: 1,
      duration: 0.1
    })
    .to(contentRef.current, {
      maskSize: '600% 600%',
      WebkitMaskSize: '600% 600%',
      duration: 2.8,
      ease: 'power4.inOut',
      delay: 0.5
    })
    .from('.hero-content > *', {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power3.out'
    }, '-=1.5')
    .from('.mode-card', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out'
    }, '-=0.8');

    // Subtle floating loop for title
    gsap.to('.hero-content h1', {
      y: 10,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 4
    });

  }, [baseUrl]);

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

  const [typewriterText, setTypewriterText] = useState("");
  const fullText = "Decrypt the hidden rhythms of the gacha. A sophisticated observation suite built to visualize RNG patterns and historical probability peaks.";

  useEffect(() => {
    if (isSplashDone) {
      let i = 0;
      const interval = setInterval(() => {
        setTypewriterText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isSplashDone]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-purple-500 selection:text-white">
      
      {/* SCANLINE EFFECT */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      {/* BACKGROUND IMAGE - FADED */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={`${baseUrl}clara.jpg`} 
          alt="Backdrop" 
          className="w-full h-full object-cover opacity-10 grayscale scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/40 to-slate-950" />
      </div>

      {/* CONTENT CONTAINER (Masked during splash) */}
      <div ref={contentRef} className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
        
        <div className="hero-content text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] mb-8 shadow-xl">
             <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#a855f7]" />
             Svarog Neural Network Active
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 leading-none">
            SVAROG TRACER
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-400 text-sm md:text-lg leading-relaxed tracking-wide mb-12 opacity-80 font-light min-h-[3em]">
            {typewriterText}
            {!isSplashDone || typewriterText.length < fullText.length ? <span className="inline-block w-2 h-5 ml-1 bg-purple-500 animate-pulse" /> : null}
            <span className="block mt-4 text-amber-500/90 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] italic">⚡ Critical: Prediction Hub • Non-Intrusive Observation Only</span>
          </p>

          <div className="flex flex-wrap justify-center gap-4">
             <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] text-slate-500 uppercase tracking-widest font-bold">
               V.3.8.6 Final
             </div>
             <div className="px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] text-slate-500 uppercase tracking-widest font-bold">
               QOS: Synchronized
             </div>
          </div>
        </div>

        {/* MODES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-32">
          {modes.map((mode) => (
            <div 
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className="mode-card group cursor-pointer relative p-8 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md hover:border-purple-500/40 hover:bg-slate-800/40 transition-all duration-500 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-sm font-black text-purple-500/40 uppercase tracking-[0.3em] mb-4 group-hover:text-purple-400 transition-colors">{mode.title}</div>
                <div className="text-3xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 inline-block">{mode.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{mode.label}</h3>
                <p className="text-slate-500 text-xs leading-relaxed group-hover:text-slate-400 transition-colors">
                  {mode.desc}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                 <div className="w-0 group-hover:w-full h-full bg-purple-600 transition-all duration-700 ease-out" />
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER INFO */}
        <footer className="hero-content w-full border-t border-slate-800/30 pt-16 pb-8 text-center mt-12">
           <p className="text-[10px] text-slate-600 uppercase tracking-[0.5em] mb-10 font-bold">
             Observation Deck Protocol • Special Thanks to The Genius Society
           </p>
           <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 mb-12">
              <div className="text-left">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-1">Status</div>
                <div className="text-slate-300 text-xs font-bold uppercase">Online</div>
              </div>
              <div className="text-left">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-1">Authorization</div>
                <div className="text-slate-300 text-xs font-bold uppercase">Public Access</div>
              </div>
              <div className="text-left">
                <div className="text-purple-500 text-[10px] font-black uppercase tracking-widest mb-1">Purpose</div>
                <div className="text-slate-300 text-xs font-bold uppercase">Pattern Decryptor</div>
              </div>
           </div>
           
           <div className="flex justify-center gap-8 text-slate-700">
              <span className="text-[9px] uppercase font-black hover:text-slate-400 transition-all cursor-pointer">Documentation</span>
              <span className="text-[9px] uppercase font-black hover:text-slate-400 transition-all cursor-pointer">Endpoint: Active</span>
              <span className="text-[9px] uppercase font-black hover:text-slate-400 transition-all cursor-pointer">Synchronized: 99.9%</span>
           </div>
        </footer>

      </div>
    </div>
  );
}
