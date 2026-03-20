import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Cpu, Flame, Snowflake, Sparkles, Star } from "lucide-react";
import HomeStatsWidget from "../components/HomeStatsWidget";
import { getSessionThemeConfig, THEME_OPTIONS } from "../theme/sessionThemeConfig";
import ArcticSnow from "../components/snow/ArcticSnow";
import AstralStars from "../components/snow/AstralStars";
import AstralExpress from "../components/snow/AstralExpress";
import VoidPetals from "../components/snow/VoidPetals";
import CrimsonBloom from "../components/snow/CrimsonBloom";
import SilverWolf999Backdrop from "../components/snow/SilverWolf999Backdrop";
import AetherEffect from "../components/snow/AetherEffect";
import { useAuth } from "../hooks/useAuth";

const HOME_THEME_ICONS = {
  modern: Sparkles,
  arctic: Snowflake,
  crimson: Flame,
  neon: Cpu,
  astral: Star,
};

export default function HomePage({
  sessionTheme = "modern",
  onThemeChange = () => {},
}) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const normalizedSessionTheme =
    sessionTheme === "winter" ? "arctic" : sessionTheme === "void" ? "crimson" : sessionTheme;
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const baseUrl = import.meta.env.BASE_URL;
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const homeTheme = themeConfig.home || {};
  const showBackdropImage = homeTheme.disableBackdropImage !== true;
  const fullText =
    "Decrypt the hidden rhythms of the gacha. A sophisticated observation suite built to visualize RNG patterns and historical probability peaks.";
  const tlRef = useRef(null);

  const baseModes = [
    {
      title: "Scanner",
      label: "Live Predictor",
      desc: "Track in-game sessions with real-time pattern detection.",
      path: "/live",
      icon: "💠",
    },
    {
      title: "Waveform",
      label: "Kiyo Mode",
      desc: "Advanced 3nd digit forecasting with wave analysis.",
      path: "/kiyo",
      icon: "🌊",
    },
    {
      title: "Chronicles",
      label: "Caverns",
      desc: "Community drop records and technical execution archives.",
      path: "/caverns",
      icon: "🏛️",
    },
    {
      title: "Database",
      label: "Warp Analyzer",
      desc: "Global pull data processing for HSR, Genshin, and WuWa.",
      path: "/warp-analyzer",
      icon: "📊",
    },
    {
      title: "Sandbox",
      label: "The Lab",
      desc: "Experimental sandboxing for long roll strings.",
      path: "/long-string",
      icon: "🧪",
    },
    {
      title: "Manual",
      label: "Guides",
      desc: "Detailed documentation and technical guides for RNG analysis.",
      path: "/guides",
      icon: "📘",
    },
    {
      title: "Tracker",
      label: "Banner Rerun",
      desc: "Timeline of character banners and drought counters.",
      path: "/banner-tracker",
      icon: "🗓️",
    },
  ];

  const modes = isAuthenticated
    ? [
        ...baseModes,
        {
          title: "Nexus",
          label: "Zone Tracker",
          desc: "Collaborative drop mapping and team efficiency analysis.",
          path: "/zone-tracker",
          icon: "🌀",
        },
      ]
    : baseModes;

  useEffect(() => {
    gsap.set(".hero-content > *, .mode-card", { y: 30, opacity: 0 });
    gsap.set(".splash-matte", { scale: 0, opacity: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsSplashDone(true);
        gsap.to(".hero-content > *, .mode-card", {
          opacity: 1,
          y: 0,
          duration: 0.1,
        });
      },
    });
    tlRef.current = tl;

    tl.to(".splash-matte", {
      opacity: 1,
      scale: 1,
      duration: 0.15,
      ease: "power2.out",
    })
      .to(".splash-matte", {
        scale: 80,
        duration: 0.55,
        ease: "expo.in",
      })
      .to(
        ".hero-content > *",
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
        },
        "-=0.3"
      )
      .to(
        ".mode-card",
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out",
        },
        "-=0.4"
      );

    gsap.to(".hero-title", {
      y: 8,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    const failsafe = setTimeout(() => {
      setIsSplashDone(true);
      gsap.to(".hero-content > *, .mode-card", { opacity: 1, y: 0, duration: 0.1 });
    }, 1500);

    return () => {
      clearTimeout(failsafe);
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  useEffect(() => {
    if (!isSplashDone) return;
    let i = 0;
    const interval = setInterval(() => {
      setTypewriterText(fullText.slice(0, i));
      i += 1;
      if (i > fullText.length) clearInterval(interval);
    }, 12);
    return () => clearInterval(interval);
  }, [isSplashDone, fullText]);

  const renderHomeThemeEffects = () => {
    if (normalizedSessionTheme === "arctic") {
      return (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none opacity-95">
          <ArcticSnow particleCount={36} speedScale={0.7} />
        </div>
      );
    }

    if (normalizedSessionTheme === "crimson") {
      return (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="opacity-95">
            <CrimsonBloom />
          </div>
          <div className="opacity-100">
            <VoidPetals />
          </div>
        </div>
      );
    }

    if (normalizedSessionTheme === "neon") {
      return (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="opacity-90">
            <SilverWolf999Backdrop image="999SW.png" />
          </div>
          <div className="opacity-85">
            <AetherEffect />
          </div>
        </div>
      );
    }

    if (normalizedSessionTheme === "astral") {
      return (
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="opacity-100">
            <AstralStars />
          </div>
          <div className="opacity-90">
            <AstralExpress />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(227,192,114,0.12),transparent_34%)]" />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden font-sans ${
        homeTheme.backgroundClass ||
        "bg-[#020617] text-slate-100 selection:bg-cyan-500/50 selection:text-white"
      }`}
    >
      <div className="fixed right-4 top-4 z-[95] sm:right-6 sm:top-6">
        <div
          className="flex items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl shadow-2xl"
          style={themeConfig.layout.themeMenuStyle}
        >
          {THEME_OPTIONS.map((themeOption) => {
            const ThemeIcon = HOME_THEME_ICONS[themeOption.id] || Sparkles;
            const isActive = normalizedSessionTheme === themeOption.id;
            return (
              <button
                key={themeOption.id}
                type="button"
                onClick={() => onThemeChange(themeOption.id)}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "text-white shadow-lg"
                    : "border-slate-700/60 bg-slate-800/55 text-slate-300 hover:border-slate-500/70 hover:text-white"
                }`}
                style={
                  isActive
                    ? themeConfig.layout.themeOptionActiveStyles?.[themeOption.id]
                    : undefined
                }
                aria-label={`Switch to ${themeOption.label} theme`}
                title={themeOption.label}
              >
                <ThemeIcon
                  className={`h-4 w-4 transition-transform duration-300 ${
                    isActive ? "animate-pulse" : "group-hover:scale-110 group-hover:rotate-6"
                  }`}
                />
                <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {themeOption.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!isSplashDone && (
        <div
          className="fixed inset-0 z-[100] bg-black pointer-events-none"
          style={{ mixBlendMode: "multiply" }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <img
              src={`${baseUrl}mask.webp`}
              alt="Shutter"
              className="splash-matte w-full h-full object-cover invert brightness-[15]"
              style={{ mixBlendMode: "screen" }}
            />
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {showBackdropImage && (
          <img
            src={`${baseUrl}${homeTheme.backdropImage || "clara-2.png"}`}
            alt="Backdrop"
            className={`w-full h-full object-cover ${
              homeTheme.backdropImageClass ||
              "opacity-[0.25] saturate-50 blur-[2px] transform scale-105"
            }`}
          />
        )}
        {renderHomeThemeEffects()}
        <div
          className={`absolute inset-0 ${
            homeTheme.overlayClass ||
            "bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]"
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] mix-blend-screen ${
            homeTheme.orbPrimaryClass || "bg-cyan-500/10"
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] mix-blend-screen ${
            homeTheme.orbSecondaryClass || "bg-blue-600/10"
          }`}
        />
      </div>

      <div className="relative z-[60] flex flex-col items-center justify-center min-h-screen pt-32 pb-12 px-4 max-w-7xl mx-auto">
        <div className="hero-content text-center mb-20 w-full">
          <div
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-full backdrop-blur-md border text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] mb-12 ${
              homeTheme.statusBadgeClass ||
              "bg-slate-900/40 border-white/10 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                homeTheme.statusDotClass || "bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
              }`}
            />
            Svarog Neural Network Active
          </div>

          <h1
            className={`hero-title text-6xl md:text-[8rem] font-black tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b drop-shadow-[0_4px_24px_rgba(255,255,255,0.1)] leading-none select-none ${
              homeTheme.heroTitleGradientClass || "from-white via-slate-100 to-slate-400"
            }`}
          >
            SVAROG TRACER
          </h1>

          <div className="max-w-2xl mx-auto mb-16 min-h-[4.5em] px-4">
            <p
              className={`text-sm md:text-lg leading-relaxed font-light tracking-wide ${
                homeTheme.typeTextClass || "text-slate-300"
              }`}
            >
              {typewriterText}
              {(!isSplashDone || typewriterText.length < fullText.length) && (
                <span
                  className={`inline-block w-2.5 h-6 ml-1.5 animate-pulse align-middle rounded-sm ${
                    homeTheme.typeCursorClass || "bg-cyan-400/80"
                  }`}
                />
              )}
            </p>
            <span
              className={`block mt-6 text-[11px] font-bold uppercase tracking-[0.3em] drop-shadow-sm ${
                homeTheme.sublineClass || "text-cyan-300/80"
              }`}
            >
              Prediction Deck • Strategic Observation
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <div
              className={`px-6 py-2 border rounded-full text-[10px] uppercase tracking-widest font-medium backdrop-blur-sm ${
                homeTheme.chipPrimaryClass || "bg-slate-900/30 border-white/5 text-slate-400"
              }`}
            >
              Ver.4.1.0 FCS
            </div>
            <div
              className={`px-6 py-2 border rounded-full text-[10px] uppercase tracking-widest font-medium backdrop-blur-sm ${
                homeTheme.chipSecondaryClass ||
                "bg-cyan-900/20 border-cyan-500/20 text-cyan-200"
              }`}
            >
              SYS-Status: Validated
            </div>
          </div>

          <div className="mt-20 flex justify-center w-full">
            <div className="w-full max-w-4xl">
              <HomeStatsWidget
                theme={homeTheme.statsTheme}
                themeKey={normalizedSessionTheme}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-32 px-4 text-left">
          {modes.map((mode) => (
            <div
              key={mode.path}
              onClick={() => navigate(mode.path)}
              className={`mode-card group cursor-pointer relative p-10 rounded-3xl border backdrop-blur-xl transition-all duration-500 overflow-hidden ${
                homeTheme.modeCardClass ||
                "bg-slate-900/40 border-white/10 hover:bg-slate-800/60 hover:border-cyan-500/40 hover:shadow-[0_8px_32px_rgba(6,182,212,0.15)]"
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                      homeTheme.modeTitleClass || "text-cyan-400"
                    }`}
                  >
                    {mode.title}
                  </div>
                  <div className="text-3xl group-hover:scale-110 group-hover:-rotate-[-10deg] transition-transform duration-500 ease-out">
                    {mode.icon}
                  </div>
                </div>

                <h3
                  className={`text-xl font-bold mb-3 tracking-tight transition-colors ${
                    homeTheme.modeLabelClass || "text-white group-hover:text-cyan-100"
                  }`}
                >
                  {mode.label}
                </h3>
                <p
                  className={`text-sm leading-relaxed transition-colors mt-auto ${
                    homeTheme.modeDescClass || "text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  {mode.desc}
                </p>
              </div>

              <div
                className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
                  homeTheme.modeGlowClass || "bg-cyan-600/20"
                }`}
              />
            </div>
          ))}
        </div>

        <footer
          className={`w-full pt-16 pb-12 text-center mt-auto border-t relative z-10 ${
            homeTheme.footerBorderClass || "border-white/5"
          }`}
        >
          <p
            className={`text-[10px] uppercase tracking-widest mb-10 font-medium ${
              homeTheme.footerTextClass || "text-slate-500/80"
            }`}
          >
            Svarog Tracer Observation Engine
          </p>

          <div className={`flex justify-center gap-12 ${homeTheme.footerMetaClass || "text-slate-400/70"}`}>
            {["Mainframe Doc", "Server Heartbeat", "Data Integrity: 100%"].map((txt) => (
              <span
                key={txt}
                className={`text-[10px] uppercase font-semibold transition-all cursor-pointer tracking-wider ${
                  homeTheme.footerMetaHoverClass || "hover:text-cyan-400"
                }`}
              >
                {txt}
              </span>
            ))}
          </div>

          <div className="flex justify-center gap-6 mt-10">
            <a
              href="https://discord.gg/AtGzKP7qnZ"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2 border rounded-full text-[10px] uppercase font-semibold tracking-widest transition-all cursor-pointer ${
                homeTheme.footerDiscordClass ||
                "bg-slate-900/30 border-white/5 hover:border-cyan-500/30 hover:bg-slate-800/50 text-slate-300"
              }`}
            >
              Discord
            </a>
            <a
              href="https://discord.gg/YqAeBjpbE4"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2 border rounded-full text-[10px] uppercase font-semibold tracking-widest transition-all cursor-pointer ${
                homeTheme.footerSocietyClass ||
                "bg-blue-900/20 border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-900/40 text-blue-200"
              }`}
            >
              The Genius Society
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
