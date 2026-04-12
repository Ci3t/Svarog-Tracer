import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  Cpu,
  Flame,
  Gamepad2,
  LogOut,
  Map as MapIcon,
  Palette,
  Search,
  Shield,
  ShieldBan,
  ShieldCheck,
  Sparkles,
  Snowflake,
  Star,
  Store,
  Trophy,
  Users,
  User
} from 'lucide-react';
import LiveStatsBanner from './LiveStatsBanner';
import { getSessionThemeConfig, THEME_OPTIONS } from '../theme/sessionThemeConfig';
import { useAuth } from '../hooks/useAuth';
import { usePresenceContext } from '../contexts/PresenceContext';
import { withBaseUrl } from '../utils/assetPaths';
import { buildApiUrl } from '../utils/apiBase';
import { UserIdentityCard } from './UserIdentityBlock';
import { getAvatarFrameStyle, resolveEquippedCosmeticsFromMetadata } from '../utils/marketplaceCatalog';

const PATCH_PRESETS = ["4.0", "4.1", "4.2", "4.3", "4.4", "custom"];
const USER_MENU_WIDTH = 260;
const USER_MENU_GUTTER = 20;

const THEME_VISUALS = {
  modern: { Icon: Sparkles, iconClass: 'text-violet-200', glowClass: 'shadow-violet-500/35', ringClass: 'border-violet-400/45 bg-violet-500/12', washClass: 'from-violet-500/20 via-purple-500/10 to-transparent' },
  arctic: { Icon: Snowflake, iconClass: 'text-cyan-100', glowClass: 'shadow-cyan-500/35', ringClass: 'border-cyan-300/55 bg-cyan-400/12', washClass: 'from-cyan-400/20 via-blue-500/10 to-transparent' },
  crimson: { Icon: Flame, iconClass: 'text-rose-100', glowClass: 'shadow-red-500/40', ringClass: 'border-rose-300/60 bg-rose-500/16', washClass: 'from-red-500/26 via-rose-500/12 to-transparent' },
  neon: { Icon: Cpu, iconClass: 'text-cyan-100', glowClass: 'shadow-fuchsia-500/40', ringClass: 'border-cyan-300/60 bg-cyan-400/12', washClass: 'from-cyan-400/25 via-fuchsia-500/15 to-transparent' },
  astral: { Icon: Star, iconClass: 'text-amber-100', glowClass: 'shadow-amber-500/35', ringClass: 'border-amber-300/55 bg-amber-400/12', washClass: 'from-amber-400/22 via-yellow-500/12 to-transparent' },
};

function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata || {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discord = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord')?.identity_data || {};
  return metadata.global_name || metadata.full_name || metadata.display_name || discord.global_name || discord.full_name || discord.name || discord.display_name || discord.preferred_username || metadata.user_name || discord.username || metadata.preferred_username || metadata.name || user.email || user.id || '';
}

function resolvePresenceArea(pathname) {
  const value = String(pathname || '').trim().toLowerCase();
  if (!value) return 'On site';
  if (value === '/' || value === '/home') return 'Home';
  if (value.startsWith('/live')) return 'Live';
  if (value.startsWith('/long-string')) return 'Lab';
  if (value.startsWith('/kiyo')) return 'Kiyo';
  if (value.startsWith('/warp-analyzer')) return 'Warp Analyzer';
  if (value.startsWith('/banner-tracker')) return 'Banner Tracker';
  if (value.startsWith('/caverns')) return 'Caverns';
  if (value.startsWith('/zone-tracker')) return 'Zone Tracker';
  if (value.startsWith('/guides')) return 'Guides';
  if (value.startsWith('/tutorial')) return 'Tutorial';
  if (value.startsWith('/playground')) return 'Playground';
  if (value.startsWith('/profile')) return 'Profile';
  if (value.startsWith('/auth')) return 'Auth';
  return value
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[-_]+/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ') || 'On site';
}

export default function Layout({
  region, setRegion, patch, setPatch, isCustomPatch, setIsCustomPatch,
  onExportCSV, sessionTheme = "modern", onThemeChange = () => { },
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut, roleMode, setRoleMode, getAuthHeader, isBanned, banInfo, user } = useAuth();
  const { stats: presenceStats, refreshPresence } = usePresenceContext();
  const normalizedSessionTheme = sessionTheme === "winter" ? "arctic" : sessionTheme === "void" ? "crimson" : sessionTheme;

  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const userMenuRef = useRef(null);
  const userMenuButtonRef = useRef(null);
  const themeMenuRef = useRef(null);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState({ top: -1000, left: -1000 });
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
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

  useEffect(() => {
    if (!isAuthenticated || !membersDrawerOpen) return undefined;
    refreshPresence({ includeUsers: true });
    const timer = window.setInterval(() => {
      refreshPresence({ includeUsers: true });
    }, 120000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, membersDrawerOpen, refreshPresence]);

  const loadAdminUsers = useCallback(async () => {
    if (!isAuthenticated || roleMode !== 'admin') return;
    setAdminUsersLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/admin-users?per_page=200'), { headers: { ...getAuthHeader() } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to load users.');
      setAdminUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (error) { window.alert(error?.message || 'Failed to load users.'); }
    finally { setAdminUsersLoading(false); }
  }, [getAuthHeader, isAuthenticated, roleMode]);

  const openAdminModerationModal = useCallback((action) => {
    setAdminModerationMode(action === 'unban' ? 'unban' : 'ban');
    setAdminUserModalOpen(true);
    setAdminUserSearch('');
    setSelectedAdminUserId('');
    setAdminBanReason('');
  }, []);

  const closeAdminModerationModal = useCallback(() => {
    setAdminUserModalOpen(false);
    setAdminUserActionLoading(false);
  }, []);

  const submitAdminModerationAction = useCallback(async () => {
    if (!selectedAdminUserId || !adminModerationMode) return;
    if (adminModerationMode === 'ban' && !adminBanReason.trim()) return;
    setAdminUserActionLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/admin-users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action: adminModerationMode, userId: selectedAdminUserId, reason: adminBanReason }),
      });
      if (!response.ok) throw new Error('Action failed.');
      await loadAdminUsers();
      closeAdminModerationModal();
    } catch (error) { window.alert(error.message); }
    finally { setAdminUserActionLoading(false); }
  }, [adminBanReason, adminModerationMode, getAuthHeader, loadAdminUsers, selectedAdminUserId, closeAdminModerationModal]);

  const updateActiveIndicator = useCallback((duration = 0.4) => {
    if (!navRef.current || !indicatorRef.current) return;
    const activeTab = navRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      const { offsetLeft, offsetWidth } = activeTab;
      gsap.to(indicatorRef.current, { x: offsetLeft, width: offsetWidth, duration, ease: 'power3.out' });
    }
  }, []);

  const updateUserMenuPosition = useCallback(() => {
    const button = userMenuButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const top = rect.bottom + 8;
    const maxLeft = window.innerWidth - USER_MENU_WIDTH - USER_MENU_GUTTER;
    const left = Math.min(maxLeft, rect.right - USER_MENU_WIDTH);
    setUserMenuPosition({ top, left });
  }, []);

  useEffect(() => {
    updateActiveIndicator(0.3);
    const onResize = () => updateActiveIndicator(0.2);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [location.pathname, sessionTheme, updateActiveIndicator]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) setThemeMenuOpen(false);
      if (userMenuButtonRef.current && userMenuButtonRef.current.contains(e.target)) return;
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (userMenuOpen) {
      updateUserMenuPosition();
      const onResizeScroll = () => updateUserMenuPosition();
      window.addEventListener('resize', onResizeScroll);
      window.addEventListener('scroll', onResizeScroll, true);

      const menuItems = userMenuRef.current?.querySelectorAll('[data-user-menu-item="true"]');
      if (userMenuRef.current) {
        const animation = gsap.timeline({ defaults: { ease: 'elastic.out(1, 0.75)' } });
        animation.fromTo(userMenuRef.current,
          { opacity: 0, scaleY: 0.9, filter: 'blur(10px)' },
          { opacity: 1, scaleY: 1, filter: 'blur(0px)', duration: 0.5 }
        );
        if (menuItems) {
          animation.fromTo(menuItems,
            { opacity: 0, x: 20, filter: 'blur(5px)' },
            { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.05 },
            "-=0.3"
          );
        }
      }
      return () => {
        window.removeEventListener('resize', onResizeScroll);
        window.removeEventListener('scroll', onResizeScroll, true);
      };
    }
  }, [userMenuOpen, updateUserMenuPosition]);

  // Command Deck Styles (Themed)
  const deckStyles = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

      .deck-container {
        overflow: hidden;
      }
      .deck-container::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        opacity: 0.05;
        pointer-events: none;
      }
      .deck-container::after {
        content: '';
        position: absolute;
        top: -100%;
        left: 0;
        width: 100%;
        height: 200%;
        background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.03) 50%, transparent);
        animation: scanline 8s linear infinite;
        pointer-events: none;
      }
      @keyframes scanline {
        0% { transform: translateY(0); }
        100% { transform: translateY(50%); }
      }

      .deck-section-header::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, var(--theme-accent), transparent);
        opacity: 0.3;
      }

      /* Tactical Switch */
      .tactical-switch {
        width: 32px;
        height: 16px;
        background: rgba(255,245,245,0.05);
        border: 1px solid var(--theme-border-soft);
        border-radius: 20px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tactical-switch::before {
        content: '';
        position: absolute;
        width: 10px;
        height: 10px;
        background: #475569;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: all 0.2s ease;
      }
      .switch-input:checked + .tactical-switch {
        background: var(--theme-accent-soft);
        border-color: var(--theme-accent);
      }
      .switch-input:checked + .tactical-switch::before {
        left: 18px;
        background: var(--theme-accent);
        box-shadow: 0 0 10px var(--theme-accent);
      }

      .action-tile-deck {
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--theme-border-soft);
        position: relative;
        overflow: hidden;
      }
      .action-tile-deck::after {
        content: '';
        position: absolute;
        inset: -1px;
        border: 1px solid var(--theme-accent);
        opacity: 0;
        transition: opacity 0.2s ease;
        clip-path: inset(0 100% 100% 0);
      }
      .action-tile-deck:hover::after {
        opacity: 1;
        animation: beam-crawl 1.5s linear infinite;
      }
      @keyframes beam-crawl {
        0% { clip-path: inset(0 0 98% 0); }
        25% { clip-path: inset(0 0 0 98%); }
        50% { clip-path: inset(98% 0 0 0); }
        75% { clip-path: inset(0 98% 0 0); }
        100% { clip-path: inset(0 0 98% 0); }
      }
      .action-tile-deck:hover {
        background: var(--theme-accent-soft);
        border-color: var(--theme-accent);
        color: var(--theme-accent);
        box-shadow: 0 0 12px var(--theme-accent-soft);
      }
    `}</style>
  );

  const authDisplayName = resolveAuthDisplayName(user) || 'Trailblazer';
  const userInitial = authDisplayName.charAt(0).toUpperCase() || 'U';
  const equippedCosmetics = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});
  const siteOnlineCount = Number(presenceStats?.online || 0);
  const rawDirectoryUsers = Array.isArray(presenceStats?.users) ? presenceStats.users : [];
  const explicitSelfPresence = presenceStats?.self || rawDirectoryUsers.find((entry) => entry.userId === user?.id) || null;
  const syntheticSelfPresence = user?.id && !explicitSelfPresence ? {
    userId: user.id,
    displayName: authDisplayName,
    avatarUrl: user?.user_metadata?.avatar_url || '',
    role: roleMode === 'admin' ? 'admin' : 'user',
    status: siteOnlineCount > 0 ? 'online' : 'offline',
    pagePath: location.pathname || '',
    lastSeenAt: new Date().toISOString(),
  } : null;
  const directoryUsers = syntheticSelfPresence ? [syntheticSelfPresence, ...rawDirectoryUsers] : rawDirectoryUsers;
  const selfPresence = explicitSelfPresence || syntheticSelfPresence || null;
  const onlineMembers = directoryUsers.filter((entry) => entry.status === 'online');
  const presenceByUserId = new Map(directoryUsers.map((entry) => [entry.userId, entry]));
  const filteredAdminUsers = adminUsers.filter(u => {
    const q = adminUserSearch.toLowerCase();
    return !q || u.display_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.id.includes(q);
  });
  const filteredMembers = directoryUsers.filter((entry) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(entry?.displayName || '').toLowerCase().includes(query) ||
      String(entry?.pagePath || '').toLowerCase().includes(query) ||
      resolvePresenceArea(entry?.pagePath).toLowerCase().includes(query) ||
      String(entry?.role || '').toLowerCase().includes(query)
    );
  });
  const themedDeckShellStyle = {
    borderColor: 'var(--theme-border-strong)',
    boxShadow: '0 18px 44px rgba(0,0,0,0.35), 0 0 24px var(--theme-accent-soft)',
  };
  const themedActionTileStyle = {
    borderColor: 'var(--theme-border-soft)',
    color: 'var(--theme-text-primary)',
  };
  const themedAdminTileStyle = {
    borderColor: 'var(--theme-border-strong)',
    background: 'var(--theme-accent-soft)',
    color: 'var(--theme-text-primary)',
  };
  const themedPrimaryButtonStyle = {
    background: 'var(--theme-accent-soft)',
    borderColor: 'var(--theme-border-strong)',
    color: 'var(--theme-text-primary)',
  };
  const themedModalShellStyle = {
    borderColor: 'var(--theme-border-strong)',
    background: 'linear-gradient(180deg, var(--theme-surface-3), var(--theme-surface-overlay))',
    boxShadow: 'var(--theme-shadow-lg)',
  };
  const themedModalInputStyle = {
    borderColor: 'var(--theme-border-soft)',
    background: 'var(--theme-surface-2)',
    color: 'var(--theme-text-primary)',
  };
  const themedSelectedUserStyle = {
    borderColor: 'var(--theme-border-strong)',
    background: 'var(--theme-accent-soft)',
  };
  const themedPresenceBadgeStyle = {
    borderColor: 'var(--theme-border-strong)',
    background: 'var(--theme-accent-soft)',
    color: 'var(--theme-text-primary)',
  };
  const themedMembersButtonStyle = {
    borderColor: 'var(--theme-border-soft)',
    background: 'var(--theme-surface-2)',
    color: 'var(--theme-text-primary)',
  };

  return (
    <div className="min-h-screen bg-transparent">
      {deckStyles}
      <LiveStatsBanner sessionTheme={sessionTheme} />
      <header className="relative z-[320] glacial-header-glass">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap lg:flex-nowrap items-center w-full justify-between lg:justify-start gap-4 lg:gap-8">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <NavLink to="/" className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                    <img src={withBaseUrl('svarog.png')} alt="svarog" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h1 className="theme-font-display text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-tight leading-none">Svarog Tracer</h1>
                    <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5 uppercase tracking-tighter">Relic Observation Engine</p>
                  </div>
                </NavLink>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1.5" style={themeConfig.layout.controlPillStyle}>
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="theme-select bg-transparent text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1">
                      <option className="bg-slate-900">America</option>
                      <option className="bg-slate-900">EU</option>
                      <option className="bg-slate-900">ASIA</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 border rounded-lg px-2 py-1.5" style={themeConfig.layout.controlPillStyle}>
                    <select value={isCustomPatch ? "custom" : patch} onChange={(e) => e.target.value === "custom" ? setIsCustomPatch(true) : (setIsCustomPatch(false), setPatch(e.target.value))} className="theme-select bg-transparent text-xs text-slate-200 outline-none border-none cursor-pointer appearance-none px-1">
                      {PATCH_PRESETS.map(p => <option key={p} className="bg-slate-900" value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <nav ref={navRef} className="relative flex items-center gap-2 p-1 rounded-xl border w-full lg:w-auto overflow-x-auto scrollbar-hide flex-1 lg:flex-none justify-start sm:justify-center" style={themeConfig.layout.navShellStyle}>
                <div ref={indicatorRef} className={`absolute top-1 left-0 h-[calc(100%-8px)] rounded-lg pointer-events-none ${themeConfig.layout.navIndicatorClass}`} style={{ width: 0, transform: 'translateX(0)' }} />
                {[
                  { to: '/live', label: '🔴 Live' },
                  { to: '/long-string', label: '🧪 Lab' },
                  { to: '/kiyo', label: '🌊 Kiyo' },
                  { to: '/warp-analyzer', label: '📊 Warp' },
                  { to: '/banner-tracker', label: '📅 Banners' },
                  { to: '/caverns', label: '🛖 Caverns' },
                  { to: '/zone-tracker', label: '🌀 Zones' },
                  { to: '/guides', label: '📚 Guides' },
                  { to: '/tutorial', label: 'Tutorial', icon: BookOpen },
                  { to: '/playground', label: 'Playground', icon: Gamepad2 }
                ].map(tab => (
                  <NavLink key={tab.to} to={tab.to} data-active={location.pathname === tab.to || (tab.to === '/playground' && location.pathname.startsWith('/playground/'))} className={({ isActive }) => `relative z-10 flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors text-center ${isActive ? activeTabTextClass : inactiveTabTextClass}`}>
                    <span className="inline-flex items-center gap-1.5">{tab.icon && <tab.icon className="h-3.5 w-3.5" />}{tab.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="flex items-center gap-3 lg:ml-auto w-full lg:w-auto">
                <div ref={themeMenuRef} className="relative">
                  <button onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer" style={themeConfig.layout.themeButtonStyle}>
                    <Palette className="w-5 h-5" />
                  </button>
                  {themeMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border backdrop-blur-xl p-2.5 z-[260] shadow-2xl" style={themeConfig.layout.themeMenuStyle}>
                      <div className="flex flex-col gap-2">
                        {THEME_OPTIONS.map(opt => {
                          const visual = THEME_VISUALS[opt.id] || THEME_VISUALS.modern;
                          const ThemeIcon = visual.Icon;
                          return (
                            <button key={opt.id} onClick={() => { onThemeChange(opt.id); setThemeMenuOpen(false); }} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${normalizedSessionTheme === opt.id ? 'bg-slate-800 text-white border-slate-500' : 'text-slate-400 border-transparent hover:border-slate-700'}`}>
                              <div className={`p-1.5 rounded-md border ${visual.ringClass} ${visual.glowClass}`}><ThemeIcon className="w-3.5 h-3.5" /></div>{opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={onExportCSV} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${themeConfig.layout.exportButtonClass}`}>EXPORT</button>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMembersDrawerOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
                    style={themedMembersButtonStyle}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Members</span>
                    <span className="rounded-full border px-2 py-0.5 text-[9px]" style={themedPresenceBadgeStyle}>
                      {onlineMembers.length}
                    </span>
                  </button>
                ) : null}

                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      type="button"
                      ref={userMenuButtonRef}
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="user-trigger group flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2.5 transition-all hover:border-[var(--theme-accent)] hover:shadow-[0_0_20px_var(--theme-accent-soft)] outline-none"
                      aria-expanded={userMenuOpen}
                    >
                      <div className="h-9 w-9 border border-white/10 bg-slate-900 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-[var(--theme-accent-strong)] transition-all" style={getAvatarFrameStyle(equippedCosmetics.frameKey)}>
                        {user?.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-[var(--theme-accent)] flex items-center justify-center text-[10px] font-black">{userInitial}</div>
                        )}
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 opacity-40 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && createPortal(
                      <div
                        ref={userMenuRef}
                        className="deck-container fixed z-[999] w-[260px] rounded-sm border border-white/10 bg-black/95 p-4 shadow-2xl backdrop-blur-[40px]"
                        style={{
                          ...(themeConfig?.cssVars || {}),
                          top: `${userMenuPosition.top}px`,
                          left: `${userMenuPosition.left}px`,
                          transformOrigin: 'top right',
                          ...themedDeckShellStyle,
                        }}
                      >
                        {/* Section 1: Presence & Access */}
                        <div className="deck-section-header mb-3 flex items-center gap-2 font-['Orbitron'] text-[9px] uppercase tracking-[0.15em] text-[var(--theme-accent)]" data-user-menu-item="true">
                          Access State
                        </div>

                        <div className="space-y-3" data-user-menu-item="true">
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                            <div className="flex flex-col">
                              <span className="opacity-80">Site Presence</span>
                              <span className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">
                                {selfPresence?.status === 'online' ? `You online • Site ${siteOnlineCount}` : `You offline • Site ${siteOnlineCount}`}
                              </span>
                            </div>
                            <label className="relative">
                              <input type="checkbox" className="switch-input hidden" checked={selfPresence?.status === 'online'} readOnly />
                              <div className="tactical-switch" />
                            </label>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 border-t border-white/5 pt-3">
                            <div className="flex flex-col">
                              <span className="opacity-80">Admin Mode</span>
                              <span className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-500">
                                {roleMode === 'admin' ? `Enabled • Members ${onlineMembers.length}` : `Members ${onlineMembers.length} online`}
                              </span>
                            </div>
                            <label className="relative">
                              <input
                                type="checkbox"
                                className="switch-input hidden"
                                checked={roleMode === 'admin'}
                                onChange={() => setRoleMode(roleMode === 'admin' ? 'user' : 'admin')}
                              />
                              <div className="tactical-switch" />
                            </label>
                          </div>
                        </div>

                        {/* Section 2: Commands */}
                        <div className="deck-section-header mb-3 mt-5 flex items-center gap-2 font-['Orbitron'] text-[9px] uppercase tracking-[0.15em] text-[var(--theme-accent)]" data-user-menu-item="true">
                          Quick Actions
                        </div>

                        <button
                          type="button"
                          data-user-menu-item="true"
                          onClick={() => {
                            setMembersDrawerOpen(true);
                            setUserMenuOpen(false);
                          }}
                          className="mb-3 flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left transition-all hover:bg-white/[0.03]"
                          style={themedActionTileStyle}
                        >
                          <span className="inline-flex items-center gap-2 font-['Orbitron'] text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                            <Users className="h-3.5 w-3.5" />
                            View Members
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-[9px]" style={themedPresenceBadgeStyle}>
                            {onlineMembers.length}
                          </span>
                        </button>

                        <div className="grid grid-cols-2 gap-1.5" data-user-menu-item="true">
                          <button
                            type="button"
                            onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => { navigate('/marketplace'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <Store className="h-3.5 w-3.5" />
                            Market
                          </button>
                          <button
                            type="button"
                            onClick={() => { navigate('/leaderboard'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <Trophy className="h-3.5 w-3.5" />
                            Ladder
                          </button>
                          <button
                            type="button"
                            onClick={() => { navigate('/caverns'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <Flame className="h-3.5 w-3.5" />
                            Caverns
                          </button>
                          <button
                            type="button"
                            onClick={() => { navigate('/playground'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <Gamepad2 className="h-3.5 w-3.5" />
                            Forge
                          </button>
                          <button
                            type="button"
                            onClick={() => { navigate('/guides'); setUserMenuOpen(false); }}
                            className="action-tile-deck flex flex-col items-center justify-center gap-1 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest text-white cursor-pointer"
                            style={themedActionTileStyle}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Guides
                          </button>
                        </div>

                        {/* Admin Tools */}
                        {roleMode === 'admin' && (
                          <>
                            <div className="deck-section-header mb-3 mt-5 flex items-center gap-2 font-['Orbitron'] text-[9px] uppercase tracking-[0.15em] text-[var(--theme-accent)]" data-user-menu-item="true">
                              Moderation
                            </div>
                            <div className="grid grid-cols-2 gap-1.5" data-user-menu-item="true">
                              <button
                                type="button"
                                onClick={() => { setUserMenuOpen(false); openAdminModerationModal('ban'); }}
                                className="action-tile-deck flex flex-col items-center justify-center gap-1 border-rose-500/20 text-rose-300 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest cursor-pointer hover:text-rose-200"
                                style={themedAdminTileStyle}
                              >
                                <ShieldBan className="h-3.5 w-3.5" />
                                Ban
                              </button>
                              <button
                                type="button"
                                onClick={() => { setUserMenuOpen(false); openAdminModerationModal('unban'); }}
                                className="action-tile-deck flex flex-col items-center justify-center gap-1 border-emerald-500/20 text-emerald-300 p-3 text-center font-['Orbitron'] text-[9px] uppercase tracking-widest cursor-pointer hover:text-emerald-200"
                                style={themedAdminTileStyle}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Unban
                              </button>
                            </div>
                          </>
                        )}

                        {/* Disconnect */}
                        <button
                          type="button"
                          data-user-menu-item="true"
                          onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className={`mt-4 w-full border border-rose-500/20 bg-rose-500/5 py-3 font-['Orbitron'] text-[10px] uppercase tracking-widest text-rose-500 transition-all hover:border-rose-500 hover:bg-rose-500/10 cursor-pointer`}
                          style={themedPrimaryButtonStyle}
                        >
                          Sign Out
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                ) : (
                  <NavLink to="/auth" className="px-4 py-2 text-xs font-black rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Zone Login
                  </NavLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {isAuthenticated && isBanned && (
        <div className="max-w-[1920px] mx-auto px-4 pt-4">
          <div className="rounded-2xl border px-4 py-3 text-sm backdrop-blur-md" style={themedPrimaryButtonStyle}>
            <div className="text-[10px] font-black uppercase tracking-widest">Account Restricted</div>
            <p className="mt-1">Account restricted by Overseer. Reason: {banInfo?.reason || 'Protocol Violation'}</p>
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-4 flex-grow">
        <Outlet />
      </main>

      {adminUserModalOpen && roleMode === 'admin' && (
        <div className="fixed inset-0 z-[360] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border shadow-2xl" style={themedModalShellStyle}>
            <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--theme-border-soft)' }}>
              <h3 className="text-2xl font-black text-white uppercase">{adminModerationMode === 'ban' ? 'Ban Control' : 'Unban Control'}</h3>
              <button onClick={closeAdminModerationModal} className="text-slate-400 hover:text-white uppercase font-bold text-xs">Close</button>
            </div>
            <div className="p-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <input type="text" value={adminUserSearch} onChange={(e) => setAdminUserSearch(e.target.value)} placeholder="Scan Network for ID..." className="w-full rounded-xl border px-4 py-3 text-sm" style={themedModalInputStyle} />
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredAdminUsers.map(u => (
                    <button key={u.id} onClick={() => setSelectedAdminUserId(u.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedAdminUserId === u.id ? '' : 'border-white/5 hover:bg-white/5'}`} style={selectedAdminUserId === u.id ? themedSelectedUserStyle : undefined}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold text-white uppercase text-sm">{u.display_name}</div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${presenceByUserId.get(u.id)?.status === 'online' ? '' : 'border-white/10 bg-white/[0.04] text-slate-400'}`} style={presenceByUserId.get(u.id)?.status === 'online' ? themedPresenceBadgeStyle : undefined}>
                          <span className={`h-1.5 w-1.5 rounded-full ${presenceByUserId.get(u.id)?.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {presenceByUserId.get(u.id)?.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">{u.id}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {adminModerationMode === 'ban' && <textarea value={adminBanReason} onChange={(e) => setAdminBanReason(e.target.value)} placeholder="Violation Details..." className="w-full rounded-xl border p-4 text-sm h-[200px]" style={themedModalInputStyle} />}
                <button onClick={submitAdminModerationAction} disabled={adminUserActionLoading || !selectedAdminUserId} className="w-full py-4 rounded-xl font-black uppercase tracking-widest disabled:opacity-60" style={themedPrimaryButtonStyle}>{adminUserActionLoading ? 'Processing...' : 'Execute Directive'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {membersDrawerOpen && createPortal(
        <div
          className="fixed inset-0 z-[365] bg-black/55 backdrop-blur-sm"
          onClick={() => setMembersDrawerOpen(false)}
        >
          <div
            className="absolute inset-y-0 right-0 w-full max-w-[420px] overflow-hidden border-l shadow-2xl"
            style={{
              ...(themeConfig?.cssVars || {}),
              ...themedModalShellStyle,
              borderLeftColor: 'var(--theme-border-strong)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <div className="border-b px-5 py-5" style={{ borderColor: 'var(--theme-border-soft)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--theme-accent)' }}>
                      Member Presence
                    </div>
                    <h3 className="mt-2 text-2xl font-black text-white">Online and Recent Users</h3>
                    <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                      Site online: {siteOnlineCount} • Members online: {onlineMembers.length} • Tracked: {directoryUsers.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembersDrawerOpen(false)}
                    className="rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all hover:bg-white/[0.05]"
                    style={themedActionTileStyle}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={themedModalInputStyle}>
                  <Search className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search members, roles, or page"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 tactical-scrollbar">
                <div className="space-y-3">
                  {filteredMembers.map((member) => (
                    <UserIdentityCard
                      key={member.userId}
                      name={member.displayName}
                      title={member.titleLabel || ''}
                      rarity={member.titleRarity || 'common'}
                      badge={member.badgeLabel || ''}
                      badgeRarity={member.badgeRarity || 'common'}
                      nameplate={member.nameplateLabel || ''}
                      nameplateRarity={member.nameplateRarity || 'common'}
                      nameplateKey={member.nameplateKey || ''}
                      avatarUrl={member.avatarUrl || ''}
                      frameKey={member.frameKey || ''}
                      subtitle={member.status === 'online'
                        ? `Browsing: ${resolvePresenceArea(member.pagePath)}`
                        : `Last seen ${member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleString() : 'recently'}`}
                      className={`border-white/10 ${member.status === 'online' ? 'ring-1 ring-[var(--theme-accent-strong)] shadow-[0_0_15px_var(--theme-accent-soft)]' : ''}`}
                      nameClassName="truncate text-sm font-bold text-white"
                      titleClassName="mt-0.5 text-[10px]"
                      rightSlot={
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${member.status === 'online' ? 'animate-pulse' : 'opacity-50'}`}
                            style={member.status === 'online' ? themedPresenceBadgeStyle : themedActionTileStyle}
                          >
                            {member.status}
                          </span>
                          {member.role === 'admin' && (
                            <span className="rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]" style={themedPresenceBadgeStyle}>
                              Admin
                            </span>
                          )}
                        </div>
                      }
                    />
                  ))}
                  {filteredMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-xs uppercase tracking-[0.18em]" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                      No members matched your search
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className="mt-auto border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-md py-12 px-4 text-center">
        <div className="max-w-[1920px] mx-auto space-y-6">
          <div className="text-sm font-bold text-slate-300 uppercase tracking-[0.3em]">Svarog Tracer <span className="text-slate-600 px-2">//</span> Observation Suite</div>
          <p className="mx-auto max-w-4xl text-xs leading-6 text-slate-400">
            Svarog Tracer is an RNG observation and training tool. It does not inject, automate, edit game files, or perform cheating actions. It helps users study visible outcomes, track patterns, and practice decision-making around relic and banner results.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black uppercase text-slate-500 tracking-tighter">
            <a href="https://twitch.tv/iciet" target="_blank" rel="noopener" className="hover:text-purple-400 transition-colors">Twitch</a>
            <a href="https://discord.gg/AtGzKP7qnZ" target="_blank" rel="noopener" className="hover:text-indigo-400 transition-colors">Personal Discord</a>
            <a href="https://discord.gg/YqAeBjpbE4" target="_blank" rel="noopener" className="hover:text-fuchsia-400 transition-colors">Genius Society</a>
            <a href="https://paypal.me/RaNi141" target="_blank" rel="noopener" className="hover:text-emerald-400 transition-colors">Donate PayPal</a>
            
            <span className="text-slate-700">© 2026 Ciet // Protocol X-4.1.3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

