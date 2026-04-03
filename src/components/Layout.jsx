import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { BookOpen, Cpu, Flame, Gamepad2, Palette, ShieldBan, ShieldCheck, Sparkles, Snowflake, Star } from 'lucide-react';
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
  const { isAuthenticated, signOut, roleMode, setRoleMode, getAuthHeader, isBanned, banInfo } = useAuth();
  const normalizedSessionTheme =
    sessionTheme === "winter" ? "arctic" : sessionTheme === "void" ? "crimson" : sessionTheme;
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const tabRefs = useRef({});
  const themeMenuRef = useRef(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [adminModerationMode, setAdminModerationMode] = useState('');
  const [adminUserModalOpen, setAdminUserModalOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [selectedAdminUserId, setSelectedAdminUserId] = useState('');
  const [adminBanReason, setAdminBanReason] = useState('');
  const [adminUserActionLoading, setAdminUserActionLoading] = useState(false);
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const activeTabTextClass = themeConfig.layout.activeTabTextClass;
  const inactiveTabTextClass = themeConfig.layout.inactiveTabTextClass;

  const loadAdminUsers = useCallback(async () => {
    if (!isAuthenticated || roleMode !== 'admin') return;
    setAdminUsersLoading(true);
    try {
      const response = await fetch('/api/admin-users?per_page=200', {
        headers: {
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load users.');
      }
      setAdminUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (error) {
      window.alert(error?.message || 'Failed to load users.');
    } finally {
      setAdminUsersLoading(false);
    }
  }, [getAuthHeader, isAuthenticated, roleMode]);

  const openAdminModerationModal = useCallback((action) => {
    if (!isAuthenticated || roleMode !== 'admin') return;
    setAdminModerationMode(action === 'unban' ? 'unban' : 'ban');
    setAdminUserModalOpen(true);
    setAdminUserSearch('');
    setSelectedAdminUserId('');
    setAdminBanReason('');
  }, [isAuthenticated, roleMode]);

  const closeAdminModerationModal = useCallback(() => {
    setAdminUserModalOpen(false);
    setAdminModerationMode('');
    setAdminUserSearch('');
    setSelectedAdminUserId('');
    setAdminBanReason('');
    setAdminUserActionLoading(false);
  }, []);

  const submitAdminModerationAction = useCallback(async () => {
    if (!selectedAdminUserId || !adminModerationMode) return;
    if (adminModerationMode === 'ban' && !adminBanReason.trim()) return;

    const pickedUser = adminUsers.find((entry) => entry.id === selectedAdminUserId);
    const confirmed = window.confirm(
      adminModerationMode === 'ban'
        ? `Ban ${pickedUser?.display_name || selectedAdminUserId}?`
        : `Unban ${pickedUser?.display_name || selectedAdminUserId}?`
    );
    if (!confirmed) return;

    setAdminUserActionLoading(true);
    try {
      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: adminModerationMode,
          userId: selectedAdminUserId,
          reason: adminModerationMode === 'ban' ? adminBanReason.trim() : undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Admin moderation action failed.');
      }

      const displayName = payload?.user?.display_name || pickedUser?.display_name || selectedAdminUserId;
      window.alert(adminModerationMode === 'ban' ? `Banned ${displayName}.` : `Unbanned ${displayName}.`);
      await loadAdminUsers();
      closeAdminModerationModal();
    } catch (error) {
      window.alert(error?.message || 'Admin moderation action failed.');
    } finally {
      setAdminUserActionLoading(false);
    }
  }, [adminBanReason, adminModerationMode, adminUsers, closeAdminModerationModal, getAuthHeader, loadAdminUsers, selectedAdminUserId]);

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

  useEffect(() => {
    if (!adminUserModalOpen || roleMode !== 'admin') return;
    loadAdminUsers();
  }, [adminUserModalOpen, loadAdminUsers, roleMode]);

  const filteredAdminUsers = adminUsers.filter((entry) => {
    const query = adminUserSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(entry?.display_name || '').toLowerCase().includes(query) ||
      String(entry?.email || '').toLowerCase().includes(query) ||
      String(entry?.id || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-transparent">
      {/* Live Stats Banner */}
      <LiveStatsBanner sessionTheme={sessionTheme} />

      {/* Header */}
      <header className="relative z-[320] glacial-header-glass">
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
                <NavLink
                  to="/tutorial"
                  data-active={location.pathname === '/tutorial'}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Tutorial
                  </span>
                </NavLink>
                <NavLink
                  to="/playground"
                  data-active={location.pathname === '/playground' || location.pathname.startsWith('/playground/')}
                  className={({ isActive }) =>
                    `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive
                      ? activeTabTextClass
                      : inactiveTabTextClass
                    }`
                  }
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Playground
                  </span>
                </NavLink>
              </nav>

              {/* Theme Switch (Paint Dropdown) */}
              <div ref={themeMenuRef} className="relative z-[220] w-full lg:w-auto mt-2 lg:mt-0 lg:ml-auto">
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
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border backdrop-blur-xl p-2.5 z-[260] shadow-2xl" style={themeConfig.layout.themeMenuStyle}>
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
              {isAuthenticated && roleMode === 'admin' ? (
                <div className="w-full lg:w-auto inline-flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/60 p-1 mt-2 lg:mt-0">
                  <button
                    type="button"
                    onClick={() => openAdminModerationModal('ban')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/35 bg-rose-500/12 px-2.5 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-200 transition-all hover:bg-rose-500/18 cursor-pointer"
                  >
                    <ShieldBan className="h-3.5 w-3.5" />
                    Ban User
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdminModerationModal('unban')}
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-200 transition-all hover:bg-emerald-500/16 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Unban
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

      {isAuthenticated && isBanned ? (
        <div className="max-w-[1920px] mx-auto px-4 pt-4">
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200">Account Restricted</div>
            <p className="mt-1">
              This account is banned.
              {banInfo?.reason ? ` Reason: ${banInfo.reason}` : ''}
              {banInfo?.bannedByName ? ` Banned by: ${banInfo.bannedByName}.` : ''}
            </p>
          </div>
        </div>
      ) : null}

      {/* Page Content */}
      <main className="max-w-[1920px] mx-auto p-4 flex-grow">
        <Outlet />
      </main>

      {adminUserModalOpen && roleMode === 'admin' ? (
        <div className="theme-modal-overlay fixed inset-0 z-[360] flex items-center justify-center p-4">
          <div className="theme-modal-shell w-full max-w-4xl overflow-hidden rounded-[2rem]">
            <div className="theme-modal-header flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Admin Moderation</div>
                <h3 className="mt-1 text-2xl font-black text-white">
                  {adminModerationMode === 'ban' ? 'Ban User' : 'Unban User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAdminModerationModal}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300 transition-all hover:bg-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="theme-subpanel rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Supabase Users</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {adminUsersLoading ? 'Loading...' : `${filteredAdminUsers.length} users`}
                  </div>
                </div>
                <input
                  type="text"
                  value={adminUserSearch}
                  onChange={(event) => setAdminUserSearch(event.target.value)}
                  placeholder="Search username, email, or user id"
                  className="mb-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
                />
                <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                  {filteredAdminUsers.map((entry) => {
                    const isSelected = selectedAdminUserId === entry.id;
                    const isBannedUser = Boolean(entry.banned);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedAdminUserId(entry.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-cyan-400/40 bg-cyan-500/10'
                            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-white">{entry.display_name}</div>
                            <div className="mt-1 truncate text-xs text-slate-400">{entry.email || entry.id}</div>
                            <div className="mt-1 truncate text-[10px] font-mono text-slate-500">{entry.id}</div>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                              isBannedUser
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {isBannedUser ? 'Banned' : 'Active'}
                          </span>
                        </div>
                        {isBannedUser && entry.ban_reason ? (
                          <div className="mt-2 text-xs text-rose-200/80">Reason: {entry.ban_reason}</div>
                        ) : null}
                      </button>
                    );
                  })}
                  {!adminUsersLoading && filteredAdminUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                      No users matched your search.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="theme-subpanel rounded-2xl p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Action</div>
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Selected User</div>
                  <div className="mt-2 text-lg font-black text-white">
                    {selectedAdminUserId
                      ? (adminUsers.find((entry) => entry.id === selectedAdminUserId)?.display_name || selectedAdminUserId)
                      : 'No user selected'}
                  </div>
                  {selectedAdminUserId ? (
                    <div className="mt-2 text-xs text-slate-400">
                      {adminUsers.find((entry) => entry.id === selectedAdminUserId)?.email || selectedAdminUserId}
                    </div>
                  ) : null}
                </div>

                {adminModerationMode === 'ban' ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Ban Reason
                    </label>
                    <textarea
                      value={adminBanReason}
                      onChange={(event) => setAdminBanReason(event.target.value)}
                      placeholder="Reason for ban"
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/20"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">
                    This will remove the current ban flag from the selected account.
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitAdminModerationAction}
                  disabled={
                    adminUserActionLoading ||
                    !selectedAdminUserId ||
                    (adminModerationMode === 'ban' && !adminBanReason.trim())
                  }
                  className={`mt-5 w-full rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                    adminModerationMode === 'ban'
                      ? 'border-rose-500/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18'
                      : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16'
                  } disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
                >
                  {adminUserActionLoading
                    ? (adminModerationMode === 'ban' ? 'Banning...' : 'Unbanning...')
                    : (adminModerationMode === 'ban' ? 'Ban Selected User' : 'Unban Selected User')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* GLOBAL FOOTER */}
      <footer className="mt-auto border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md py-8 px-4">
        <div className="max-w-[1920px] mx-auto flex flex-col items-center gap-6">

          {/* Brand & Version */}
          <div className="text-center">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
              Svarog Tracer <span className="text-slate-600">•</span> Relic RNG Observation Engine
              <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono border border-purple-500/20">
                Ver 4.1.2
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
