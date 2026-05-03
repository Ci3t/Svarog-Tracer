import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  BadgeCheck,
  Sparkles,
  Trophy,
  Users,
  Target,
  ShieldCheck,
  ShieldBan,
  RefreshCw,
  Store,
  Wallet,
  Cpu,
  Monitor,
  Layers,
  Info,
  History,
  Activity,
  Award,
  Gamepad2,
  ChevronRight,
  Flame,
  Binary,
  Zap,
  Shield,
  Search,
  BookOpen,
  LayoutGrid,
  Package,
  Briefcase,
  Boxes,
  Lock,
  Check,
  Terminal,
  Timer,
  ToggleLeft,
  Save,
  Trash2,
  Pencil,
  Clock,
  Save
} from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { CHALLENGE_CONTRACT_ORDER } from '../data/challengeContracts';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { useChallengeResults } from '../hooks/useChallengeResults';
import { useProfileMarketplace } from '../hooks/useProfileMarketplace';
import { useOwnedRoster } from '../hooks/useOwnedRoster';
import { usePresenceContext } from '../contexts/PresenceContext';
import { withBaseUrl } from '../utils/assetPaths';
import { buildApiUrl } from '../utils/apiBase';
import UserIdentityBlock, { AnimatedTitleText } from '../components/UserIdentityBlock';
import OwnedRosterPanel from '../components/zone/OwnedRosterPanel';
import {
  getAvatarFrameStyle,
  getCosmeticAccentStyle,
  getMarketplaceItem,
  resolveEquippedCosmeticsFromMetadata,
  MARKETPLACE_ITEMS
} from '../utils/marketplaceCatalog';
import { getClaraCompanionPreview, getClaraCompanionSlotLabel } from '../utils/claraCosmetics';
import {
  getTitleBadgeStyle,
  getTitleDefinition,
  resolveEquippedTitleKeyFromMetadata,
  getTitleTextStyle,
} from '../utils/titleCatalog';
import { PRESET_LOADOUTS, getLoadoutDefinitions } from '../utils/loadoutCatalog';
import { LOADOUT_PRESETS } from '../components/cosmetics/PremiumAssets';
import { TITLE_DEFINITIONS } from '../utils/progressionCatalog';
import { getSvgBannerByKey } from '../components/cosmetics/SVGBanners';

/* HELPER: Resolve Discord and Profile Names */
function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata || {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discord = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord')?.identity_data || {};
  return metadata.global_name || metadata.full_name || discord.global_name || discord.username || metadata.user_name || user.email || user.id || '';
}

function getDiscordUserId(user) {
  if (!user || typeof user !== 'object') return null;
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord');
  if (!discordIdentity?.identity_data) return null;
  return String(discordIdentity.identity_data.id || discordIdentity.identity_data.sub || '').trim() || null;
}

const SUPER_ADMINS = new Set([
  '110890964364627968', // Ciet
  '97579134456168448',  // Bigboypinoy
]);

function resolveAvatarUrl(user) {
  if (!user) return '';
  const metadata = user.user_metadata || {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discord = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord')?.identity_data || {};
  const candidates = [metadata.avatar_url, metadata.avatar, discord.avatar_url, discord.picture];
  for (const value of candidates) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return withBaseUrl(normalized);
  }
  return '';
}

function formatRelativeTime(value) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'Not yet';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : date.toLocaleDateString();
}

function formatTokenCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function normalizeBotGroupName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('clara') || normalized.includes('fair')) return 'Clara Bot';
  if (normalized.includes('svarog')) return 'Svarog Bot';
  return String(value || 'Bot');
}

/* -------------------------------------------------------------------------- */
/*                               CORE UI MODULES                              */
/* -------------------------------------------------------------------------- */

const IdentityHero = ({ user, displayName, credentials, stats, avatarUrl, initials, rankTier, activeTheme }) => {
  const heroRef = useRef(null);
  const { title, badge, banner, frame } = credentials;
  const accent = getCosmeticAccentStyle(title?.rarity || 'common');
  const bannerKey = banner?.key || '';

  const FramePreset = useMemo(() => {
    if (!frame?.key) return null;
    const presetKey = frame.key.replace('-banner', '').replace('-frame', '').replace('-badge', '').replace('-title', '');
    return LOADOUT_PRESETS[presetKey] || null;
  }, [frame?.key]);

  useEffect(() => {
    if (!heroRef.current) return;
    gsap.fromTo(heroRef.current, {
      opacity: 0,
      scale: 0.95,
      y: 20,
    }, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      clearProps: 'opacity,transform',
    });
  }, []);

  return (
    <div 
      ref={heroRef}
      className={`relative isolate z-20 mb-10 overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0a0b]/75 p-8 md:p-12 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] theme-${activeTheme}`}
    >
      {bannerKey ? (
        <>
          <div className="absolute inset-0 z-0 opacity-95 pointer-events-none">
            {getSvgBannerByKey(bannerKey, activeTheme)}
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/82 via-black/58 to-black/46 pointer-events-none" />
        </>
      ) : null}
      {/* Atmosphere Overlays */}
      {activeTheme === 'phoenix' && <div className="atmosphere-embers" />}
      {activeTheme === 'noir' && <div className="atmosphere-fog" />}
      
      {/* Dynamic Energy Core (Rarity Based Glow) */}
      <div 
        className="absolute -top-20 -right-20 h-96 w-96 blur-[120px] opacity-50 animate-pulse pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: accent.color || 'var(--theme-accent)' }} 
      />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
          {/* Avatar with Animated Frame */}
          <div 
            className="relative isolate h-40 w-40 md:h-48 md:w-48 rounded-full border-2 flex items-center justify-center bg-slate-950 group shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}
          >
            {/* Dynamic Premium Frame Component - only show SVG frame, no extra borders */}
            {FramePreset && FramePreset.frame && (
              <div className="absolute inset-[-30px] pointer-events-none z-10">
                <FramePreset.frame />
              </div>
            )}

            <div className="absolute inset-[6px] z-0 rounded-full bg-black/45 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="relative z-20 h-full w-full object-cover opacity-100 group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <span className="relative z-20 font-['Orbitron'] text-4xl font-black">{initials}</span>
              )}
            </div>
            
            <div className="absolute inset-0 z-30 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Identity_0
            </div>
          </div>

          <div className="text-center md:text-left">
            <UserIdentityBlock
              name={displayName}
              title={title?.name || ''}
              rarity={title?.rarity || 'common'}
              badge={badge?.name || ''}
              badgeRarity={badge?.rarity || 'common'}
              nameplate={banner?.name || ''}
              nameplateRarity={banner?.rarity || 'common'}
              nameplateKey={banner?.key || ''}
              nameClassName="text-3xl md:text-5xl font-black uppercase tracking-[0.1em] text-white italic"
              titleClassName="mt-3 text-[14px] md:text-base opacity-90"
            />
            
            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div 
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-xl"
                style={{ borderColor: rankTier?.color || 'rgba(255,255,255,0.1)', color: rankTier?.color || 'white' }}
              >
                <Award className="h-4 w-4" /> {rankTier?.name || 'Unranked'}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-300">
                <Sparkles className="h-4 w-4" /> Lv {stats.level || 1}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-[var(--theme-accent)]">
                <Target className="h-4 w-4" /> {stats.leaderboardRank ? `Rank #${stats.leaderboardRank}` : 'No Rank Yet'}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-400">
                <Activity className="h-4 w-4" /> Online
              </div>
            </div>

            <div className="mt-5 w-full max-w-xl">
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                <span>Level XP</span>
                <span>{stats.currentLevelXp || 0} / {stats.nextLevelXp || 0}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[var(--theme-accent)] transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, Number(stats.levelProgressPercent || 0)))}%` }}
                />
              </div>
              <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                {stats.xpToNextLevel || 0} XP to next level
              </div>
            </div>
          </div>
        </div>

        {/* Quick Core Metrics */}
        <div className="grid grid-cols-2 gap-4 w-full lg:w-72 relative z-30">
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Best Score</div>
            <div className="font-['Orbitron'] text-2xl font-black text-white">{stats.bestScore || 0}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Win Rate</div>
            <div className="font-['Orbitron'] text-2xl font-black text-[var(--theme-accent)]">{stats.winRate || 0}%</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Items</div>
            <div className="font-['Orbitron'] text-2xl font-black text-white">{stats.ownedItemsCount || 0}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Grade</div>
            <div className="font-['Orbitron'] text-2xl font-black text-white">{stats.bestChallengeGrade || 'C-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Patch Timer Admin ──────────────────────────────────────────────────

const DEFAULT_PATCHES = {
  hsr: { version: '4.0', startDate: '2026-04-09', durationDays: 42 },
  genshin: { version: '6.5', startDate: '2026-04-16', durationDays: 42 },
  wuwa: { version: '3.3', startDate: '2026-04-25', durationDays: 42 },
};

function PatchTimerAdminView() {
  const [patches, setPatches] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_patch_timers');
      return saved ? JSON.parse(saved) : DEFAULT_PATCHES;
    } catch { return DEFAULT_PATCHES; }
  });
  const [editGame, setEditGame] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState('');

  const savePatches = (next) => {
    setPatches(next);
    localStorage.setItem('admin_patch_timers', JSON.stringify(next));
  };

  const calculateDays = (startDate, durationDays) => {
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();
    const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const remaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const progress = Math.min(100, Math.max(0, (elapsed / durationDays) * 100));
    return { elapsed, remaining, progress, end };
  };

  const gameCards = [
    { key: 'hsr', label: 'HSR', color: 'text-purple-400', accent: '#a855f7' },
    { key: 'genshin', label: 'Genshin', color: 'text-emerald-400', accent: '#10b981' },
    { key: 'wuwa', label: 'WuWa', color: 'text-amber-400', accent: '#f59e0b' },
  ];

  const btnBase = "rounded-xl px-5 py-2.5 font-['Orbitron'] text-[10px] uppercase tracking-widest transition-all";
  const btnPrimary = `${btnBase} bg-[var(--theme-accent)] text-white hover:brightness-110`;
  const cardBase = "rounded-2xl border border-white/10 bg-[#0a0a0b]/60 p-6 backdrop-blur-xl";

  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-[var(--theme-accent)]" />
          <h3 className="font-['Orbitron'] text-sm font-black uppercase tracking-[0.12em] text-white">Patch Timers</h3>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-2 text-xs mb-4 ${message.includes('Error') ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gameCards.map(g => {
          const patch = patches[g.key] || DEFAULT_PATCHES[g.key];
          const isEditing = editGame === g.key;
          const { elapsed, remaining, progress, end } = calculateDays(patch.startDate, patch.durationDays);

          return (
            <div key={g.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-slate-500 text-xs uppercase tracking-widest">{g.label}</div>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditGame(null);
                    } else {
                      setEditGame(g.key);
                      setEditForm(prev => ({ ...prev, [g.key]: { ...patch } }));
                    }
                  }}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  {isEditing ? 'Cancel' : <><Pencil className="h-3 w-3 inline mr-1" />Edit</>}
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Version</label>
                    <input
                      type="text"
                      value={editForm[g.key]?.version || patch.version}
                      onChange={e => setEditForm(prev => ({ ...prev, [g.key]: { ...prev[g.key], version: e.target.value } }))}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-[var(--theme-accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm[g.key]?.startDate || patch.startDate}
                      onChange={e => setEditForm(prev => ({ ...prev, [g.key]: { ...prev[g.key], startDate: e.target.value } }))}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-[var(--theme-accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={editForm[g.key]?.durationDays || patch.durationDays}
                      onChange={e => setEditForm(prev => ({ ...prev, [g.key]: { ...prev[g.key], durationDays: parseInt(e.target.value) || 42 } }))}
                      className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-[var(--theme-accent)] outline-none"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const next = { ...patches, [g.key]: editForm[g.key] };
                      savePatches(next);
                      setEditGame(null);
                      setMessage(`✓ ${g.label} patch updated`);
                      setTimeout(() => setMessage(''), 2000);
                    }}
                    className={`${btnPrimary} w-full text-[10px] py-2`}
                  >
                    <Save className="h-3 w-3 inline mr-2" />
                    Save Patch
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`text-3xl font-black ${g.color}`}>{patch.version}</div>
                  <div className="text-slate-500 text-xs">Current patch</div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Day {elapsed} / {patch.durationDays}</span>
                      <span className={remaining <= 7 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {remaining > 0 ? `${remaining}d left` : 'Ended'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: g.accent, opacity: 0.8 }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Ends: {end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

    } catch {}
    finally { setEquippingKey(''); }
  };
  const handleEquipLoadout = async (key) => {
    const defs = getLoadoutDefinitions(key);
    if (!defs) return;
  };

  const handleEquipCosmetic = async (item) => {
    setEquippingKey(`equip:${item.key}`);
    try {
      const response = await fetch(buildApiUrl('/api/profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action: 'equip', itemKey: item.key, slot: item.slot }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        if (payload?.user) replaceUser?.(payload.user);
        await refreshMarketplace?.();
      }
    } catch {}
    finally { setEquippingKey(''); }
  };

  const tabs = useMemo(() => {
    const base = [
      { id: 'dossier', label: 'Overview', icon: BookOpen },
      { id: 'combat', label: 'Matches', icon: Target },
      { id: 'arsenal', label: 'Arsenal', icon: Briefcase },
      { id: 'loadout', label: 'Gear', icon: Boxes },
      { id: 'roster', label: 'Roster', icon: Users },
      { id: 'milestones', label: 'Progress', icon: Award },
      { id: 'recent', label: 'Recent', icon: History },
    ];
    if (isSuperAdmin) {
      base.push({ id: 'admin', label: 'Overseer', icon: Terminal });
    }
    return base;
  }, [isSuperAdmin]);

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <IdentityHero user={user} displayName={displayName} credentials={credentials} stats={statsOverview} avatarUrl={avatarUrl} initials={initials} rankTier={profile.rankTier} activeTheme={activeTheme} />
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 mx-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[var(--theme-accent)] text-white' : 'text-slate-500 hover:text-white'}`}>
                <tab.icon className="h-4 w-4" />
                <span className="font-['Orbitron'] text-[11px] font-black uppercase tracking-[0.16em]">{tab.label}</span>
              </button>
            ))}
          </div>
          <main className="min-h-[600px]">
            {activeTab === 'dossier' && <DossierView stats={statsOverview} profile={profile} />}
            {activeTab === 'combat' && <CombatLogView recentMatches={profile.competitiveMatches || []} />}
            {activeTab === 'arsenal' && (
              <ArsenalView
                ownedItems={ownedItems}
                equippedKeys={equippedKeys}
                onEquip={handleEquipCosmetic}
                displayName={displayName}
                actionKey={equippingKey}
              />
            )}
            {activeTab === 'loadout' && (
              <LoadoutView 
                allTitles={allTitles} 
                credentials={credentials} 
                onEquipTitle={handleEquipTitle} 
                activeTitleKey={equippedTitleKey} 
                unlockedTitles={unlockedTitleKeys}
                actionKey={equippingKey}
              />
            )}
            {activeTab === 'roster' && (
              <RosterView
                user={ownedRoster.user}
                ownedOptions={ownedRoster.ownedOptions}
                ownedSet={ownedRoster.ownedSet}
                ownedSearchTerm={ownedRoster.ownedSearchTerm}
                setOwnedSearchTerm={ownedRoster.setOwnedSearchTerm}
                toggleOwnedCharacter={ownedRoster.toggleOwnedCharacter}
                saveOwnedRoster={ownedRoster.saveOwnedRoster}
                loadOwnedRoster={ownedRoster.loadOwnedRoster}
                importOwnedRosterFile={ownedRoster.importOwnedRosterFile}
                ownedLoading={ownedRoster.ownedLoading}
                ownedSaving={ownedRoster.ownedSaving}
                ownedImporting={ownedRoster.ownedImporting}
                error={ownedRoster.error}
                success={ownedRoster.success}
              />
            )}
            {activeTab === 'milestones' && <MilestonesView achievements={profile.progression?.achievements || []} />}
            {activeTab === 'recent' && <RecentUnlocksView items={recentItems} />}
            {activeTab === 'admin' && (
              <AdminView
                getAuthHeader={getAuthHeader}
                discordUserId={discordUserId}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               ADMIN PANEL                                  */
/* -------------------------------------------------------------------------- */

function AdminView({ getAuthHeader, discordUserId }) {
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const [patchConfig, setPatchConfig] = useState(null);
  const [patchLoading, setPatchLoading] = useState(false);
  const [newPatch, setNewPatch] = useState('');
  const [phase1Days, setPhase1Days] = useState(21);
  const [phase2Days, setPhase2Days] = useState(21);
  const [adminPassword, setAdminPassword] = useState('');
  const [kiyoMessage, setKiyoMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin-users?per_page=200'), { headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load users.');
      setAdminUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      setActionMessage(`Users load failed: ${e.message}`);
    } finally {
      setAdminUsersLoading(false);
    }
  }, [getAuthHeader]);

  const loadPatch = useCallback(async () => {
    setPatchLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/hsr/kiyo/patch'));
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPatchConfig(data);
    } catch {}
    finally { setPatchLoading(false); }
  }, []);

  useEffect(() => {
    loadUsers();
    loadPatch();
  }, [loadUsers, loadPatch]);

  const submitModeration = async (action) => {
    if (!selectedUserId) return;
    if (action === 'ban' && !banReason.trim()) return;
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/admin-users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action, userId: selectedUserId, reason: banReason }),
      });
      if (!res.ok) throw new Error('Action failed.');
      setActionMessage(`${action === 'ban' ? 'Banned' : 'Unbanned'} successfully.`);
      setBanReason('');
      setSelectedUserId('');
      await loadUsers();
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const kiyoAdminAction = async (action) => {
    setKiyoMessage('');
    if (!adminPassword.trim()) {
      setKiyoMessage('Enter admin password.');
      return;
    }
    try {
      const body = { action, password: adminPassword };
      if (action === 'set_patch' || action === 'override_timer') {
        if (!newPatch.trim()) {
          setKiyoMessage('Enter patch version (e.g. 4.3).');
          return;
        }
        body.patch = newPatch.trim();
      }
      if (action === 'set_patch') {
        body.phase_1_days = Number(phase1Days) || 21;
        body.phase_2_days = Number(phase2Days) || 21;
      }
      const res = await fetch(buildApiUrl('/api/hsr/kiyo/admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || 'Admin action failed.');
      setKiyoMessage(`Success: ${data.status}`);
      if (action === 'set_patch' || action === 'override_timer') {
        setNewPatch('');
      }
      await loadPatch();
    } catch (e) {
      setKiyoMessage(`Error: ${e.message}`);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return adminUsers;
    return adminUsers.filter(u => {
      const name = String(u?.display_name || u?.email || u?.id || '').toLowerCase();
      return name.includes(term);
    });
  }, [adminUsers, userSearch]);

  const cardBase = "rounded-2xl border border-white/10 bg-[#0a0a0b]/60 p-6 backdrop-blur-xl";
  const labelBase = "font-['Orbitron'] text-[10px] uppercase tracking-widest text-slate-400 mb-2 block";
  const inputBase = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[var(--theme-accent)] focus:outline-none transition-colors";
  const btnBase = "rounded-xl px-5 py-2.5 font-['Orbitron'] text-[10px] uppercase tracking-widest transition-all";
  const btnPrimary = `${btnBase} bg-[var(--theme-accent)] text-white hover:brightness-110`;
  const btnDanger = `${btnBase} border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20`;
  const btnSuccess = `${btnBase} border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20`;
  const btnGhost = `${btnBase} border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10`;

  return (
    <div className="flex flex-col gap-8">
      {(actionMessage || kiyoMessage) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${actionMessage?.includes('Error') || kiyoMessage?.includes('Error') ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
          {actionMessage || kiyoMessage}
        </div>
      )}

      <div className={cardBase}>
        <div className="flex items-center gap-3 mb-6">
          <ShieldBan className="h-5 w-5 text-rose-400" />
          <h3 className="font-['Orbitron'] text-sm font-black uppercase tracking-[0.12em] text-white">Moderation</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className={labelBase}>Search Users</label>
            <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Filter by name or email..." className={inputBase} />
          </div>
          <div className="flex items-end">
            <button onClick={loadUsers} disabled={adminUsersLoading} className={btnGhost}>
              <RefreshCw className={`h-3.5 w-3.5 inline mr-2 ${adminUsersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5 mb-4">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No users found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#0f0f10]">
                <tr className="text-slate-400 font-['Orbitron'] text-[9px] uppercase tracking-widest">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Select</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`${selectedUserId === u.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'} transition-colors`}>
                    <td className="px-4 py-2">
                      <div className="text-white font-medium">{u.display_name || u.email || u.id}</div>
                      {u.email && <div className="text-slate-500 text-xs">{u.email}</div>}
                    </td>
                    <td className="px-4 py-2">
                      {u.banned ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-bold uppercase"><ShieldBan className="h-3 w-3" /> Banned</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold uppercase"><ShieldCheck className="h-3 w-3" /> Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setSelectedUserId(u.id)} className={`text-xs px-3 py-1 rounded-lg border transition-colors ${selectedUserId === u.id ? 'bg-[var(--theme-accent)] text-white border-[var(--theme-accent)]' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
                        {selectedUserId === u.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedUserId && (
          <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <label className={labelBase}>Reason (required for ban)</label>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Violation details..." rows={3} className={inputBase} />
            <div className="flex gap-3">
              <button onClick={() => submitModeration('ban')} disabled={actionLoading || !banReason.trim()} className={btnDanger}>
                <ShieldBan className="h-3.5 w-3.5 inline mr-2" />
                Ban User
              </button>
              <button onClick={() => submitModeration('unban')} disabled={actionLoading} className={btnSuccess}>
                <ShieldCheck className="h-3.5 w-3.5 inline mr-2" />
                Unban User
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cardBase}>
        <div className="flex items-center gap-3 mb-6">
          <Terminal className="h-5 w-5 text-[var(--theme-accent)]" />
          <h3 className="font-['Orbitron'] text-sm font-black uppercase tracking-[0.12em] text-white">Kiyo Patch Control</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Current Patch</div>
            <div className="text-2xl font-black text-white">{patchConfig?.current_patch || '—'}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Phase</div>
            <div className="text-2xl font-black text-white">{patchConfig?.current_phase ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Phase Remaining</div>
            <div className="text-2xl font-black text-white">
              {patchConfig?.phase_days_remaining != null ? `${patchConfig.phase_days_remaining}d ${patchConfig.phase_hours_remaining ?? 0}h` : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Remaining</div>
            <div className="text-2xl font-black text-white">{patchConfig?.total_days_remaining ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Auto Advance</div>
            <div className="text-2xl font-black text-white">{patchConfig?.auto_advance ? 'ON' : 'OFF'}</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className={labelBase}>Admin Password</label>
            <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="KIYO_ADMIN_PASSWORD" className={inputBase} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className={labelBase}>Patch Version</label>
              <input type="text" value={newPatch} onChange={e => setNewPatch(e.target.value)} placeholder="e.g. 4.3" className={inputBase} />
            </div>
            <div className="flex-1">
              <label className={labelBase}>Phase 1 Days</label>
              <input type="number" value={phase1Days} onChange={e => setPhase1Days(Number(e.target.value))} placeholder="21" className={inputBase} />
            </div>
            <div className="flex-1">
              <label className={labelBase}>Phase 2 Days</label>
              <input type="number" value={phase2Days} onChange={e => setPhase2Days(Number(e.target.value))} placeholder="21" className={inputBase} />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => kiyoAdminAction('set_patch')} className={btnPrimary}>
                <Save className="h-3.5 w-3.5 inline mr-2" />
                Set Patch
              </button>
              <button onClick={() => kiyoAdminAction('override_timer')} className={btnGhost}>
                <Timer className="h-3.5 w-3.5 inline mr-2" />
                Override
              </button>
            </div>
          </div>

          <button onClick={() => kiyoAdminAction('toggle_auto_advance')} className={`${btnGhost} self-start`}>
            <ToggleLeft className="h-3.5 w-3.5 inline mr-2" />
            Toggle Auto-Advance
          </button>
        </div>
      </div>

      {/* Banner Management */}
      <BannerAdminView discordUserId={discordUserId} />

      {/* Patch Timers */}
      <div className="mt-6">
        <PatchTimerAdminView />
      </div>
    </div>
  );
}

function BannerAdminView({ discordUserId }) {
  const [banners, setBanners] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editGame, setEditGame] = useState(null);
  const [editForm, setEditForm] = useState({});

  const loadBanners = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin?action=banners&game=all', {
        headers: discordUserId ? { 'X-Discord-Id': discordUserId } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setBanners(data.data || {});
      setMessage('✓ Banners refreshed');
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearCaches = async () => {
    setMessage('');
    try {
      const keys = [
        'cached_banner_data_v2',
        'genshin_cached_banners_v2',
        'wuwa_live_banners_cache_v5',
        'wuwa_parser_working_strategy',
        'admin_banner_overrides'
      ];
      let cleared = 0;
      for (const k of keys) {
        if (localStorage.getItem(k)) {
          localStorage.removeItem(k);
          cleared++;
        }
      }
      const res = await fetch('/api/admin?action=clear-cache', {
        method: 'POST',
        headers: discordUserId ? { 'X-Discord-Id': discordUserId } : {}
      });
      const data = await res.json().catch(() => ({}));
      setMessage(`✓ Cleared ${cleared} client cache(s). Server: ${data?.status || 'OK'}`);
      setEditForm({});
    } catch (e) {
      setMessage(`Cache clear error: ${e.message}`);
    }
  };

  const saveOverrides = () => {
    try {
      localStorage.setItem('admin_banner_overrides', JSON.stringify(editForm));
      setMessage('✓ Overrides saved locally');
      setEditGame(null);
    } catch (e) {
      setMessage(`Save error: ${e.message}`);
    }
  };

  const applyOverrides = (game, list) => {
    try {
      const overrides = JSON.parse(localStorage.getItem('admin_banner_overrides') || '{}');
      if (!overrides[game]) return list;
      return list.map(b => {
        const key = b.id || b.bannerId;
        if (overrides[game][key]) {
          return { ...b, ...overrides[game][key] };
        }
        return b;
      });
    } catch (e) { return list; }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const cardBase = "rounded-2xl border border-white/10 bg-[#0a0a0b]/60 p-6 backdrop-blur-xl";
  const btnBase = "rounded-xl px-5 py-2.5 font-['Orbitron'] text-[10px] uppercase tracking-widest transition-all";
  const btnPrimary = `${btnBase} bg-[var(--theme-accent)] text-white hover:brightness-110`;
  const btnGhost = `${btnBase} border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10`;
  const btnDanger = `${btnBase} border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20`;

  const gameCards = [
    { key: 'hsr', label: 'HSR', color: 'text-purple-400' },
    { key: 'genshin', label: 'Genshin', color: 'text-emerald-400' },
    { key: 'wuwa', label: 'WuWa', color: 'text-amber-400' },
  ];

  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 text-[var(--theme-accent)] ${loading ? 'animate-spin' : ''}`} />
          <h3 className="font-['Orbitron'] text-sm font-black uppercase tracking-[0.12em] text-white">Banner Management</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={loadBanners} disabled={loading} className={btnPrimary}>
            <RefreshCw className="h-3.5 w-3.5 inline mr-2" />
            Refresh Banners
          </button>
          <button onClick={clearCaches} className={btnGhost}>
            <Trash2 className="h-3.5 w-3.5 inline mr-2" />
            Clear Caches
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-2 text-xs mb-4 ${message.includes('Error') ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {gameCards.map(g => {
          const rawList = banners[g.key] || [];
          const list = applyOverrides(g.key, rawList);
          const isEditing = editGame === g.key;

          return (
            <div key={g.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-500 text-xs uppercase tracking-widest">{g.label}</div>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditGame(null);
                    } else {
                      setEditGame(g.key);
                      const form = {};
                      list.forEach(b => { form[b.id || b.bannerId] = { name: b.name, image: b.image }; });
                      setEditForm(prev => ({ ...prev, [g.key]: form }));
                    }
                  }}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  {isEditing ? 'Cancel' : <><Pencil className="h-3 w-3 inline mr-1" />Edit</>}
                </button>
              </div>
              <div className={`text-3xl font-black ${g.color}`}>{list.length}</div>
              <div className="text-slate-500 text-xs mt-1">Active banners</div>

              {list.length > 0 && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {list.map((b, i) => {
                    const key = b.id || b.bannerId;
                    const edited = isEditing && editForm[g.key]?.[key];

                    return (
                      <div key={i} className="text-xs">
                        {isEditing ? (
                          <div className="space-y-1.5 p-2 rounded-lg bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2">
                              <img src={b.image} alt="" className="w-8 h-8 rounded object-cover bg-white/5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editForm[g.key]?.[key]?.name || b.name}
                                  onChange={e => setEditForm(prev => ({
                                    ...prev,
                                    [g.key]: { ...prev[g.key], [key]: { ...prev[g.key]?.[key], name: e.target.value } }
                                  }))}
                                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs focus:border-[var(--theme-accent)] outline-none"
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              value={editForm[g.key]?.[key]?.image || b.image}
                              onChange={e => setEditForm(prev => ({
                                ...prev,
                                [g.key]: { ...prev[g.key], [key]: { ...prev[g.key]?.[key], image: e.target.value } }
                              }))}
                              placeholder="Image URL"
                              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-slate-300 text-[10px] focus:border-[var(--theme-accent)] outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <img src={b.image} alt="" className="w-8 h-8 rounded object-cover bg-white/5 shrink-0" loading="lazy" onError={e => e.target.style.display='none'} />
                            <div className="min-w-0">
                              <div className="text-white font-medium truncate">{b.name}</div>
                              <div className="text-slate-500 capitalize">{b.type}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isEditing && (
                <button onClick={saveOverrides} className={`${btnPrimary} w-full mt-3 text-[10px] py-2`}>
                  <Save className="h-3 w-3 inline mr-2" />
                  Save Overrides
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Asset Upload Commands</div>
        <code className="block text-xs text-slate-300 font-mono bg-black/30 rounded-lg p-3 space-y-1">
          <div>node scripts/auto-upload-assets.js genshin</div>
          <div>node scripts/auto-upload-assets.js wuwa</div>
          <div>node scripts/upload-hoyo-assets.js hsr</div>
        </code>
        <div className="text-slate-500 text-xs mt-2">Run in terminal. Put new images in D:\Coding\Assests Hoyo\[game] first.</div>
      </div>
    </div>
  );
}

