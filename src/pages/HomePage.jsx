import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import HomeStatsWidget from '../components/HomeStatsWidget';

export default function HomePage() {
  const navigate = useNavigate();
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const baseUrl = import.meta.env.BASE_URL;
  const fullText = "Decrypt the hidden rhythms of the gacha. A sophisticated observation suite built to visualize RNG patterns and historical probability peaks.";
  const tlRef = useRef(null);

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
    },
    {
      title: "Archive",
      label: "Guides",
      desc: "Detailed documentation and technical guides for RNG analysis.",
      path: "/guides",
      icon: "📚"
    },
    {
      title: "Tracker",
      label: "Banner Rerun",
      desc: "Timeline of character banners and drought counters.",
      path: "/banner-tracker",
      icon: "🗓️"
    }
  ];

  useEffect(() => {
    // Initial setup - don't start at 0 opacity to avoid stuck ghosts
    gsap.set(".hero-content > *, .mode-card", { y: 20 });
    gsap.set(".splash-matte", { scale: 0, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsSplashDone(true);
        // Failsafe: ensure everything is visible
        gsap.to(".hero-content, .home-stats-widget, .mode-card", { opacity: 1, y: 0, duration: 0.1 });
      }
    });
    tlRef.current = tl;

    // 1. Instant Start
    tl.to(".splash-matte", {
      opacity: 1,
      scale: 1,
      duration: 0.15,
      ease: "power2.out"
    })
    // 2. Ultra-Fast Burst (Reduced from 0.8s to 0.5s)
    .to(".splash-matte", {
      scale: 80, 
      duration: 0.55, 
      ease: "expo.in",
    })
    // 3. Reveal Site Content (Overlapping with burst)
    .to(".hero-content > *", {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: "power3.out"
    }, "-=0.3")
    .to(".mode-card", {
      opacity: 1,
      y: 0,
      duration: 0.4,
      stagger: 0.04,
      ease: "power2.out"
    }, "-=0.3");

    // Title floating loop
    gsap.to(".hero-title", {
      y: 10,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    // Failsafe: Force splash done after 1 second no matter what
    const failsafe = setTimeout(() => {
      setIsSplashDone(true);
      gsap.to(".hero-content, .home-stats-widget, .mode-card", { opacity: 1, y: 0, duration: 0.1 });
    }, 1000);

    return () => {
      clearTimeout(failsafe);
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (isSplashDone) {
      let i = 0;
      const interval = setInterval(() => {
        setTypewriterText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) clearInterval(interval);
      }, 8); // Very fast typing for premium feel
      return () => clearInterval(interval);
    }
  }, [isSplashDone, fullText]);

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden selection:bg-purple-500 selection:text-white">
      
      {/* 
          CINEMATIC LUMA-MATTE REVEAL
          High-speed burst reveal using mask.webp as a luma-shutter.
      */}
      {!isSplashDone && (
        <div className="fixed inset-0 z-[100] bg-black pointer-events-none" style={{ mixBlendMode: 'multiply' }}>
          <div className="flex items-center justify-center w-full h-full">
             <img 
               src={`${baseUrl}mask.webp`} 
               alt="Shutter" 
               className="splash-matte w-full h-full object-cover invert brightness-[15]" 
               style={{ mixBlendMode: 'screen' }}
             />
          </div>
        </div>
      )}

      {/* SCANLINE EFFECT - Very faint to avoid 'line' appearance */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />

      {/* BACKGROUND IMAGE - Vibrant but under the dark theme */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={`${baseUrl}clara.jpg`} 
          alt="Backdrop" 
          className="w-full h-full object-cover opacity-[0.35] brightness-125 saturate-[1.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617]/40 to-[#020617]" />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-[60] flex flex-col items-center justify-center min-h-screen pt-32 pb-12 px-4 max-w-7xl mx-auto">
        
        <div className="hero-content text-center mb-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] mb-12 shadow-2xl">
             <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_15px_#a855f7]" />
             Svarog Neural Network Active
          </div>
          
          <h1 className="hero-title text-7xl md:text-[9.5rem] font-black tracking-tighter mb-4 text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.2)] leading-none select-none">
            SVAROG TRACER
          </h1>
          
          <div className="max-w-2xl mx-auto mb-12 min-h-[4.5em] px-4">
            <p className="text-slate-200 text-sm md:text-xl leading-relaxed tracking-wide font-medium">
              {typewriterText}
              {(!isSplashDone || typewriterText.length < fullText.length) && (
                <span className="inline-block w-3 h-7 ml-2 bg-purple-500 animate-pulse align-middle" />
              )}
            </p>
            <span className="block mt-8 text-amber-400 text-[11px] md:text-sm font-black uppercase tracking-[0.4em] drop-shadow-lg">
               ⚡ Prediction Deck • Professional Observation Only
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
             <div className="px-8 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[10px] text-slate-400 uppercase tracking-widest font-black font-mono backdrop-blur-sm">
               Ver.4.0.1 FCS
             </div>
             <div className="px-8 py-3 bg-slate-900/60 border border-slate-800 rounded-2xl text-[10px] text-slate-400 uppercase tracking-widest font-black font-mono backdrop-blur-sm">
               SYS-Status: Validated
             </div>
          </div>
          
          <div className="mt-20">
            <HomeStatsWidget />
          </div>
        </div>

        {/* MODES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-32 px-4 text-center">
          {modes.map((mode) => (
            <div 
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className="mode-card group cursor-pointer relative p-12 rounded-[3rem] bg-slate-900/60 border border-slate-800/80 backdrop-blur-3xl hover:border-purple-500/50 hover:bg-slate-900/80 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] transition-all duration-500 overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.5em] mb-8 inline-block border-b border-purple-500/30 pb-1.5">{mode.title}</div>
                <div className="text-6xl mb-8 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 ease-out inline-block drop-shadow-2xl">{mode.icon}</div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-purple-100">{mode.label}</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed group-hover:text-slate-200 transition-colors">
                  {mode.desc}
                </p>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-800/40">
                 <div className="w-0 group-hover:w-full h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 transition-all duration-1000 ease-out shadow-[0_0_20px_#a855f7]" />
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER - Refined to eliminate sharp boundary lines */}
        <footer className="w-full pt-32 pb-16 text-center mt-20 relative">
           <p className="text-[10px] text-slate-500 uppercase tracking-[1em] mb-16 font-black opacity-60 select-none">
             Svarog Tracer Observation Engine
           </p>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-20 max-w-5xl mx-auto px-6">
              <div className="text-center group border-r border-slate-800/30 hidden sm:block">
                <div className="text-purple-500/80 text-[10px] font-black uppercase tracking-widest mb-3">Sync Status</div>
                <div className="text-slate-300 text-xs font-bold uppercase tracking-widest">Fully Operational</div>
              </div>
              <div className="text-center group border-r border-slate-800/30 hidden sm:block">
                <div className="text-purple-500/80 text-[10px] font-black uppercase tracking-widest mb-3">Network ID</div>
                <div className="text-slate-300 text-xs font-bold uppercase tracking-widest">SVAROG-N9-STATION</div>
              </div>
              <div className="text-center group">
                <div className="text-purple-500/80 text-[10px] font-black uppercase tracking-widest mb-3">Efficiency</div>
                <div className="text-slate-300 text-xs font-bold uppercase tracking-widest">Optimal Burst Mod</div>
              </div>
           </div>
           
           <div className="flex flex-wrap justify-center gap-12 text-slate-500/60 pt-10 border-t border-slate-800/20 max-w-4xl mx-auto">
              {["Mainframe Doc", "Server Heartbeat", "Data Integrity: 100%"].map((txt) => (
                <span key={txt} className="text-[9px] uppercase font-black hover:text-purple-400 transition-all cursor-crosshair tracking-[0.3em]">{txt}</span>
              ))}
           </div>

           <div className="flex flex-wrap justify-center gap-10 mt-12">
              <a href="https://discord.gg/AtGzKP7qnZ" target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 rounded-xl text-[10px] text-slate-400 uppercase font-bold tracking-widest transition-all hover:text-purple-400">
                Personal Discord
              </a>
              <a href="https://discord.gg/YqAeBjpbE4" target="_blank" rel="noopener noreferrer" className="px-6 py-2 bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-[10px] text-slate-400 uppercase font-bold tracking-widest transition-all hover:text-indigo-400">
                The Genius Society
              </a>
           </div>
        </footer>

      </div>
    </div>
  );
}
