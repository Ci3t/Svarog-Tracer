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
      icon: "💠" // Changed to sleek crystal
    },
    {
      title: "Waveform",
      label: "Kiyo Mode",
      desc: "Advanced 3nd digit forecasting with wave analysis.",
      path: "/kiyo",
      icon: "❄️"
    },
    {
      title: "Chronicles",
      label: "Caverns",
      desc: "Community drop records and technical execution archives.",
      path: "/caverns",
      icon: "🏔️"
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
      title: "Manual",
      label: "Guides",
      desc: "Detailed documentation and technical guides for RNG analysis.",
      path: "/guides",
      icon: "📘"
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
    // Initial setup - elegant drop-in
    gsap.set(".hero-content > *, .mode-card", { y: 30, opacity: 0 });
    gsap.set(".splash-matte", { scale: 0, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsSplashDone(true);
        gsap.to(".hero-content > *, .mode-card", { opacity: 1, y: 0, duration: 0.1 });
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
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out"
      }, "-=0.3")
      .to(".mode-card", {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out"
      }, "-=0.4");

    // Title floating loop - soft icy float
    gsap.to(".hero-title", {
      y: 8,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    // Failsafe: Force splash done after 1.5 seconds no matter what
    const failsafe = setTimeout(() => {
      setIsSplashDone(true);
      gsap.to(".hero-content > *, .mode-card", { opacity: 1, y: 0, duration: 0.1 });
    }, 1500);

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
      }, 12); 
      return () => clearInterval(interval);
    }
  }, [isSplashDone, fullText]);

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 overflow-x-hidden selection:bg-cyan-500/50 selection:text-white font-sans">

      {/* 
          CINEMATIC LUMA-MATTE REVEAL
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

      {/* BACKGROUND SCENE - Winter Landscape via Clara Image + Deep Frost Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Subtle Clara/Winter base image */}
        <img
          src={`${baseUrl}clara-2.png`}
          alt="Backdrop"
          className="w-full h-full object-cover opacity-[0.25] saturate-50 blur-[2px] transform scale-105"
        />
        {/* Frost / Aurora Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-[60] flex flex-col items-center justify-center min-h-screen pt-32 pb-12 px-4 max-w-7xl mx-auto">

        <div className="hero-content text-center mb-20 w-full">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/10 text-cyan-100 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] mb-12 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
            Svarog Neural Network Active
          </div>

          <h1 className="hero-title text-6xl md:text-[8rem] font-black tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_4px_24px_rgba(255,255,255,0.1)] leading-none select-none">
            SVAROG TRACER
          </h1>

          <div className="max-w-2xl mx-auto mb-16 min-h-[4.5em] px-4">
            <p className="text-slate-300 text-sm md:text-lg leading-relaxed font-light tracking-wide">
              {typewriterText}
              {(!isSplashDone || typewriterText.length < fullText.length) && (
                <span className="inline-block w-2.5 h-6 ml-1.5 bg-cyan-400/80 animate-pulse align-middle rounded-sm" />
              )}
            </p>
            <span className="block mt-6 text-cyan-300/80 text-[11px] font-bold uppercase tracking-[0.3em] drop-shadow-sm">
              💠 Prediction Deck • Strategic Observation
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-2 bg-slate-900/30 border border-white/5 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-medium backdrop-blur-sm">
              Ver.4.0.2 FCS
            </div>
            <div className="px-6 py-2 bg-cyan-900/20 border border-cyan-500/20 rounded-full text-[10px] text-cyan-200 uppercase tracking-widest font-medium backdrop-blur-sm">
              SYS-Status: Validated
            </div>
          </div>

          <div className="mt-20 flex justify-center w-full">
            <div className="w-full max-w-4xl">
              <HomeStatsWidget />
            </div>
          </div>
        </div>

        {/* MODES GRID - Frost Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-32 px-4 text-left">
          {modes.map((mode) => (
            <div
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className="mode-card group cursor-pointer relative p-10 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl hover:bg-slate-800/60 hover:border-cyan-500/40 hover:shadow-[0_8px_32px_rgba(6,182,212,0.15)] transition-all duration-500 overflow-hidden"
            >
              {/* Glass subtle top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">{mode.title}</div>
                  <div className="text-3xl group-hover:scale-110 group-hover:-rotate-[-10deg] transition-transform duration-500 ease-out">{mode.icon}</div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-cyan-100 transition-colors">{mode.label}</h3>
                <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors mt-auto">
                  {mode.desc}
                </p>
              </div>
              
              {/* Subtle accent glow bubble */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-600/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* FOOTER - Minimalist Frost Line */}
        <footer className="w-full pt-16 pb-12 text-center mt-auto border-t border-white/5 relative z-10">
          <p className="text-[10px] text-slate-500/80 uppercase tracking-widest mb-10 font-medium">
            Svarog Tracer Observation Engine
          </p>
          
          <div className="flex justify-center gap-12 text-slate-400/70">
            {["Mainframe Doc", "Server Heartbeat", "Data Integrity: 100%"].map((txt) => (
              <span key={txt} className="text-[10px] uppercase font-semibold hover:text-cyan-400 transition-all cursor-crosshair tracking-wider">{txt}</span>
            ))}
          </div>

          <div className="flex justify-center gap-6 mt-10">
            <a href="https://discord.gg/AtGzKP7qnZ" target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-slate-900/30 border border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/50 rounded-full text-[10px] text-slate-300 uppercase font-semibold tracking-widest transition-all">
              Discord
            </a>
            <a href="https://discord.gg/YqAeBjpbE4" target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-blue-900/20 border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-900/40 rounded-full text-[10px] text-blue-200 uppercase font-semibold tracking-widest transition-all">
              The Genius Society
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
