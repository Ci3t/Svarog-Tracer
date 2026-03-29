import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Cpu, Flame, Palette, Sparkles, Snowflake, Star } from 'lucide-react';
import svarog from '/svarog.png';
import LiveStatsBanner from './LiveStatsBanner';
import { getSessionThemeConfig, THEME_OPTIONS } from '../theme/sessionThemeConfig';
import { useAuth } from '../hooks/useAuth';

const PATCH_PRESETS = ["4.0", "4.1", "4.2", "4.3", "4.4", "custom"];
const THEME_VISUALS = {
  modern: {
    Icon: Sparkles,
    iconClass: 'text-violet-200',
    glowClass: 'shadow-violet-500/35',
    ringClass: 'border-violet-400/45 bg-violet-500/12',
    washClass: 'from-violet-500/20 via-purple-500/10 to-transparent',
  },
  arctic: {
    Icon: Snowflake,
    iconClass: 'text-cyan-100',
    glowClass: 'shadow-cyan-500/35',
    ringClass: 'border-cyan-300/55 bg-cyan-400/12',
    washClass: 'from-cyan-400/20 via-blue-500/10 to-transparent',
  },
  crimson: {
    Icon: Flame,
    iconClass: 'text-rose-100',
    glowClass: 'shadow-red-500/40',
    ringClass: 'border-rose-300/60 bg-rose-500/16',
    washClass: 'from-red-500/26 via-rose-500/12 to-transparent',
  },
  neon: {
    Icon: Cpu,
    iconClass: 'text-cyan-100',
    glowClass: 'shadow-fuchsia-500/40',
    ringClass: 'border-cyan-300/60 bg-cyan-400/12',
    washClass: 'from-cyan-400/25 via-fuchsia-500/15 to-transparent',
  },
  astral: {
    Icon: Star,
    iconClass: 'text-amber-100',
    glowClass: 'shadow-amber-500/35',
    ringClass: 'border-amber-300/55 bg-amber-400/12',
    washClass: 'from-amber-400/22 via-yellow-500/12 to-transparent',
  },
};

export default function Layout({
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  entries,
  prevSessions,
  onExportCSV,
  sessionTheme = "modern",
  onThemeChange = () => { },
}) {
  const location = useLocation();
  const { isAuthenticated, signOut, roleMode, setRoleMode } = useAuth();
  const normalizedSessionTheme =
    sessionTheme === "winter" ? "arctic" : sessionTheme === "void" ? "crimson" : sessionTheme;
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const themeMenuRef = useRef(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const activeTabTextClass = themeConfig.layout.activeTabTextClass;
  const inactiveTabTextClass = themeConfig.layout.inactiveTabTextClass;

  const updateActiveIndicator = useCallback((duration = 0.4) => {
    if (!navRef.current || !indicatorRef.current) return;

    const activeTab = navRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab;
      gsap.to(indicatorRef.current, {
        x: offsetLeft,
        width: offsetWidth,
        duration,
        ease: 'power3.out',
      });
    }
  }, []);

  // Recalculate indicator on route/theme change
  useEffect(() => {
    const raf = requestAnimationFrame(() => updateActiveIndicator(0.3));
    const delayed = setTimeout(() => updateActiveIndicator(0.2), 140);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(delayed);
    };
  }, [location.pathname, sessionTheme, updateActiveIndicator]);

  // Keep indicator synced on viewport changes
  useEffect(() => {
    const onResize = () => updateActiveIndicator(0.2);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateActiveIndicator]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!themeMenuRef.current?.contains(event.target)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // GSAP: Initial animation on mount
  useEffect(() => {
    if (!navRef.current) return;

    gsap.fromTo(navRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.2 }
    );
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Live Stats Banner */}
      <LiveStatsBanner sessionTheme={sessionTheme} />

      {/* Header */}
      <header className="relative z-50 glacial-header-glass">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Top Row: Logo + Controls (Mobile) / Left Side (Desktop) */}
            <div className="flex flex-wrap lg:flex-nowrap items-center w-full justify-between lg:justify-start gap-4 lg:gap-8">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <NavLink to="/" className="flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center overflow-hidden">
                    <img
                      src={svarog}
                      alt="svarog"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="theme-font-display text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-tight leading-none">
                      Svarog Tracer
                    </h1>
                    <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5">
                      Relic RNG Observation Engine
                    </p>
                  </div>
                </NavLink>

                {/* Region & Patch (Compact on Mobile) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1.5" style={themeConfig.layout.controlPillStyle}>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="theme-select bg-transparent text-[10px] sm:text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1"
                    >
                      <option className="bg-slate-900">America</option>
                      <option className="bg-slate-900">EU</option>
                      <option className="bg-slate-900">ASIA</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1.5" style={themeConfig.layout.controlPillStyle}>
                    <select
                      value={isCustomPatch ? "custom" : patch}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "custom") {
                          setIsCustomPatch(true);
                        } else {
                          setIsCustomPatch(false);
                          setPatch(v);
                        }
                      }}
                      className="theme-select bg-transparent text-[10px] sm:text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1"
                    >
                      {PATCH_PRESETS.map((p) => (
                        <option key={p} className="bg-slate-900" value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs with Animated Indicator (Middle on Desktop, Second Row on Mobile) */}
              <nav
                ref={navRef}
                className="relative flex items-center gap-1 sm:gap-2 p-1 rounded-xl border w-full lg:w-auto overflow-x-auto scrollbar-hide flex-1 lg:flex-none justify-start sm:justify-center"
                style={themeConfig.layout.navShellStyle}
              >
                {/* Animated indicator background */}
                <div
                  ref={indicatorRef}
                  className={`absolute top-1 left-0 h-[calc(100%-8px)] rounded-lg pointer-events-none ${themeConfig.layout.navIndicatorClass
                    }`}
                  style={{ width: 0, transform: 'translateX(0)' }}
                />

                <NavLink
                  to="/live"
                  data-active={location.pathname === '/live'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  🔴 Live
                </NavLink>
                <NavLink
                  to="/long-string"
                  data-active={location.pathname === '/long-string'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  🧪 Lab
                </NavLink>
                <NavLink
                  to="/kiyo"
                  data-active={location.pathname === '/kiyo'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  🌊 Kiyo
                </NavLink>
                <NavLink
                  to="/warp-analyzer"
                  data-active={location.pathname === '/warp-analyzer'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  📊 Warp
                </NavLink>
                <NavLink
                  to="/banner-tracker"
                  data-active={location.pathname === '/banner-tracker'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  📅 Banners
                </NavLink>
                <NavLink
                  to="/caverns"
                  data-active={location.pathname === '/caverns'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  🛖 Caverns
                </NavLink>
                {isAuthenticated && (
                  <NavLink
                    to="/zone-tracker"
                    data-active={location.pathname === '/zone-tracker'}
                    className={({ isActive }) =>
                      `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                        ? activeTabTextClass
                        : inactiveTabTextClass
                      }`
                    }
                  >
                    🌀 Zone
                  </NavLink>
                )}
                <NavLink
                  to="/guides"
                  data-active={location.pathname === '/guides'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  📚 Guides
                </NavLink>
              </nav>

              {/* Theme Switch (Paint Dropdown) */}
              <div ref={themeMenuRef} className="relative w-full lg:w-auto mt-2 lg:mt-0 lg:ml-auto">
                <button
                  type="button"
                  onClick={() => setThemeMenuOpen(prev => !prev)}
                  className="w-full lg:w-11 h-10 lg:h-11 rounded-xl lg:rounded-full border flex items-center justify-center transition-all cursor-pointer"
                  style={themeConfig.layout.themeButtonStyle}
                  title="Theme menu"
                  aria-label="Open theme menu"
                >
                  <Palette className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
                {themeMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border backdrop-blur-xl p-2.5 z-[70] shadow-2xl" style={themeConfig.layout.themeMenuStyle}>
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 px-1.5 pb-2">
                      Theme
                    </div>
                    <div className="flex flex-col gap-2">
                      {THEME_OPTIONS.map((themeOption) => {
                        const isActive = normalizedSessionTheme === themeOption.id;
                        const visual = THEME_VISUALS[themeOption.id] || THEME_VISUALS.modern;
                        const ThemeIcon = visual.Icon;
                        return (
                          <button
                            key={themeOption.id}
                            type="button"
                            onClick={() => {
                              onThemeChange(themeOption.id);
                              setThemeMenuOpen(false);
                            }}
                            className={`group w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] transition-all cursor-pointer border ${isActive
                              ? 'bg-slate-800/70 text-white border-slate-500/70'
                              : 'bg-slate-800/55 text-slate-300 border-slate-700/60 hover:text-white hover:border-slate-500/70'
                              }`}
                            style={isActive ? themeConfig.layout.themeOptionActiveStyles?.[themeOption.id] : undefined}
                            aria-label={`Switch to ${themeOption.label} theme`}
                          >
                            <span className="relative flex items-center justify-center overflow-hidden">
                              <span
                                className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${visual.washClass} opacity-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'group-hover:opacity-100'
                                  }`}
                              />
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg border shadow-lg transition-all duration-300 ${visual.ringClass} ${visual.glowClass} ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-translate-y-0.5'
                                    }`}
                                >
                                  <ThemeIcon
                                    className={`h-4 w-4 transition-transform duration-300 ${visual.iconClass} ${isActive ? 'animate-pulse' : 'group-hover:rotate-12'
                                      }`}
                                  />
                                </span>
                                <span
                                  className={`overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-300 ${isActive
                                    ? 'max-w-44 opacity-100'
                                    : 'max-w-0 opacity-0 group-hover:max-w-44 group-hover:opacity-100'
                                    }`}
                                >
                                  {themeOption.label}
                                </span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                onClick={onExportCSV}
                className={`w-full lg:w-auto px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg active:scale-95 transition-all text-center mt-2 lg:mt-0 ${themeConfig.layout.exportButtonClass}`}
              >
                EXPORT CSV
              </button>

              {/* Role Mode Toggle */}
              {isAuthenticated ? (
                <div className="w-full lg:w-auto inline-flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/60 p-1 mt-2 lg:mt-0">
                  <button
                    type="button"
                    onClick={() => setRoleMode('user')}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${roleMode === 'user'
                      ? 'bg-slate-700/80 text-slate-100 border border-slate-500/70'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleMode('admin')}
                    className={`px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${roleMode === 'admin'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60'
                      : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Admin
                  </button>
                </div>
              ) : null}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full lg:w-auto px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition-all text-center mt-2 lg:mt-0"
                >
                  Sign Out
                </button>
              ) : (
                <NavLink
                  to="/auth"
                  className="w-full lg:w-auto px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 transition-all text-center mt-2 lg:mt-0 inline-flex items-center justify-center"
                >
                  Zone Login
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-[1920px] mx-auto p-4 flex-grow">
        <Outlet />
      </main>

      {/* GLOBAL FOOTER */}
      <footer className="mt-auto border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md py-8 px-4">
        <div className="max-w-[1920px] mx-auto flex flex-col items-center gap-6">

          {/* Brand & Version */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
              Svarog Tracer <span className="text-slate-600">•</span> Relic RNG Observation Engine
              <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono border border-purple-500/20">
                Ver 4.1.0
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">© 2026 Ciet</p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-medium text-slate-400">
            <a
              href="https://twitch.tv/iciet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-purple-400 transition-colors group"
            >
              <span className="text-purple-500/50 group-hover:text-purple-400">Twitch:</span> twitch.tv/iciet
            </a>
            <a
              href="https://discord.gg/AtGzKP7qnZ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-indigo-400 transition-colors group"
            >
              <span className="text-indigo-500/50 group-hover:text-indigo-400">Discord:</span> My Personal Discord
            </a>
            <a
              href="https://discord.gg/YqAeBjpbE4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-blue-400 transition-colors group"
            >
              <span className="text-blue-500/50 group-hover:text-blue-400">Contact:</span> @Ciet in The Genius Society
            </a>
          </div>

          {/* Safety Disclaimer */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 max-w-3xl text-center">
            <p className="text-[10px] sm:text-xs text-amber-200/70 leading-relaxed uppercase tracking-tight">
              <span className="text-amber-400">⚠️ Svarog Tracer</span> is an independent observation and analysis tool. It does not modify, interact with, or access any game files or data — it is entirely safe and non-intrusive.
            </p>
          </div>

          {/* Special Attribution (StarRailStation for Warp Data) */}
          <div className="pt-4 border-t border-slate-800/30 w-full text-center">
            <p className="text-[10px] text-slate-600 italic uppercase tracking-widest">
              Pattern Analysis Engine Powered by Svarog • May your pulls be lucky and your pities be short. ✦
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
