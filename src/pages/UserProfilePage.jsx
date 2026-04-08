import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  BadgeCheck,
  Sparkles,
  Trophy,
  Users,
  Target,
  ShieldCheck,
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
  Check
} from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { CHALLENGE_CONTRACT_ORDER } from '../data/challengeContracts';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { useChallengeResults } from '../hooks/useChallengeResults';
import { useProfileMarketplace } from '../hooks/useProfileMarketplace';
import { usePresenceContext } from '../contexts/PresenceContext';
import { withBaseUrl } from '../utils/assetPaths';
import { buildApiUrl } from '../utils/apiBase';
import UserIdentityBlock, { AnimatedTitleText } from '../components/UserIdentityBlock';
import {
  getAvatarFrameStyle,
  getCosmeticAccentStyle,
  getMarketplaceItem,
  resolveEquippedCosmeticsFromMetadata,
  MARKETPLACE_ITEMS
} from '../utils/marketplaceCatalog';
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
};

const MetricRadar = ({ stats }) => {
  const points = [
    { label: 'ACC', val: Math.min(stats.accuracy || 80, 100), x: 50, y: 10 },
    { label: 'SPD', val: Math.min(stats.speed || 70, 100), x: 90, y: 35 },
    { label: 'STR', val: Math.min(stats.streak || 60, 100), x: 90, y: 75 },
    { label: 'CON', val: Math.min(stats.consistency || 85, 100), x: 50, y: 95 },
    { label: 'EXP', val: Math.min(stats.experience || 50, 100), x: 10, y: 75 },
    { label: 'PWR', val: Math.min(stats.power || 40, 100), x: 10, y: 35 },
  ];

  const polyPoints = points.map(p => {
    const rx = 50 + (p.x - 50) * (p.val / 100);
    const ry = 50 + (p.y - 50) * (p.val / 100);
    return `${rx},${ry}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-60 w-60">
        <svg viewBox="0 0 100 100" className="h-full w-full opacity-60">
          <polygon points="50,10 90,35 90,75 50,95 10,75 10,35" className="fill-none stroke-white/20 stroke-[0.5]" />
          <polygon points={polyPoints} className="fill-[var(--theme-accent-soft)]/20 stroke-[var(--theme-accent)] stroke-1" />
        </svg>
      </div>
    </div>
  );
};

const ClaraOSFeedback = ({ bestScore, winRate }) => (
  <div className="rounded-2xl border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)]/5 p-6 relative overflow-hidden">
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        <Cpu className="h-5 w-5 text-pink-400" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 mb-1">Clara Note</div>
        <p className="text-[11px] leading-relaxed text-slate-300 italic">
          "{bestScore > 100 ? "Performance metrics are exceeding baseline projections." : "Stable run cycle detected. Maintain focus."}"
        </p>
      </div>
    </div>
  </div>
);

const DossierView = ({ stats, profile, presence }) => (
  <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> PvP Snapshot
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-end">
              <span className="text-[11px] text-slate-400">Win Rate</span>
              <span className="font-['Orbitron'] text-lg font-bold text-white">{profile.competitive?.winRate || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-accent)]" style={{ width: `${profile.competitive?.winRate || 0}%` }} />
            </div>
          </div>
        </div>
        {/* Placeholder for other cards to match original breadth */}
      </div>
    </div>
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <MetricRadar stats={{ accuracy: profile.competitive?.winRate || 0 }} />
      </div>
      <ClaraOSFeedback bestScore={stats.bestScore} />
    </div>
  </div>
);

const CombatLogView = ({ recentMatches }) => (
  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
      <Target className="h-4 w-4" /> Combat History
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-slate-500">
            <th className="pb-4">Result</th>
            <th className="pb-4">Opponent</th>
            <th className="pb-4 text-center">Score</th>
            <th className="pb-4 text-right">Time</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {recentMatches.map((m, i) => (
            <tr key={i} className="border-t border-white/5">
              <td className="py-4">
                <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${m.result === 'win' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                  {m.result}
                </span>
              </td>
              <td className="py-4 text-white font-medium">{m.opponentName}</td>
              <td className="py-4 text-center font-mono text-white">{m.score}</td>
              <td className="py-4 text-right text-slate-500 text-[10px]">{formatRelativeTime(m.finishedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const LoadoutView = ({ allTitles, credentials, onEquipTitle, activeTitleKey, unlockedTitles = [], actionKey = '' }) => (
  <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-8">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center justify-between">
      <div className="flex items-center gap-2"><Award className="h-4 w-4 text-[var(--theme-accent)]" /> Identity Titles</div>
      <div className="text-slate-600 font-mono text-[9px] uppercase tracking-widest">{unlockedTitles.length} / {allTitles.length} UNLOCKED</div>
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {allTitles.map(title => {
        const isUnlocked = unlockedTitles.includes(title.key);
        const isActive = activeTitleKey === title.key;
        const isBusy = actionKey === `equip-title:${title.key}`;
        return (
          <div 
            key={title.key} 
            className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
              isActive 
                ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)]/10 shadow-[0_0_15px_var(--theme-accent-soft)]' 
                : isUnlocked 
                  ? 'border-white/10 bg-white/[0.03] hover:border-white/20' 
                  : 'border-white/5 bg-black/40 opacity-60 grayscale'
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <AnimatedTitleText 
                  title={title.name} 
                  rarity={title.rarity} 
                  className={`text-[12px] font-black uppercase ${!isUnlocked && 'blur-[1px]'}`} 
                />
                {!isUnlocked && <Lock className="h-3 w-3 text-slate-600" />}
                {isUnlocked && isActive && <Check className="h-3 w-3 text-[var(--theme-accent)]" />}
              </div>
              
              <div className="text-[9px] font-mono text-slate-500 leading-relaxed min-h-[2em]">
                {isUnlocked 
                  ? (title.description || title.requirement || '')
                  : (title.requirement ? `LOCKED: ${title.requirement}` : '???. UNLOCK VIA PLAYGROUND OR MARKETPLACE.')}
              </div>

              {isUnlocked ? (
                <button 
                  onClick={() => onEquipTitle(title.key)} 
                  disabled={isActive || isBusy}
                  className={`mt-2 w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    isActive 
                      ? 'bg-[var(--theme-accent)]/20 text-white cursor-default' 
                      : isBusy
                        ? 'bg-white/5 text-slate-500 cursor-wait'
                        : 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isBusy ? 'Equipping...' : isActive ? 'Active' : 'Equip Title'}
                </button>
              ) : (
                <div className="mt-2 w-full py-1.5 rounded-lg border border-white/5 bg-black/20 text-center text-[8px] font-black uppercase tracking-widest text-slate-700">
                  {title.cost > 0 ? `Buy for ${title.cost.toLocaleString()} tokens` : 'Earn via Gameplay'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ArsenalView = ({ ownedItems, equippedKeys, onEquip, displayName, actionKey }) => {
  const [filter, setFilter] = useState('all');
  const SLOT_LABELS = { frame: '🔲 Frames', badge: '🏅 Badges', nameplate: '🎖️ Banners', title: '🏆 Titles' };
  const slots = ['all', 'frame', 'badge', 'nameplate', 'title'];

  const filtered = filter === 'all' ? ownedItems : ownedItems.filter(it => it.slot === filter || it.type === filter);

  return (
    <div className="space-y-6">
      {/* Slot Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/5">
        {slots.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === s ? 'bg-[var(--theme-accent)] text-white shadow-[0_0_10px_var(--theme-accent-soft)]' : 'text-slate-500 hover:text-white'
            }`}
          >
            {s === 'all' ? '✦ All Items' : SLOT_LABELS[s] || s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600 font-['Orbitron'] text-[10px] uppercase tracking-widest space-y-3">
          <Package className="h-12 w-12 opacity-20" />
          <span>No items found in this slot.</span>
          <a href="/marketplace" className="text-[var(--theme-accent)] underline hover:opacity-80 transition-opacity">Browse the Marketplace</a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(item => {
            const accent = getCosmeticAccentStyle(item.rarity || 'common');
            const presetKey = item.key.replace(/-banner$|-frame$|-badge$|-title$/g, '');
            const Preset = LOADOUT_PRESETS[presetKey] || LOADOUT_PRESETS['quantum-neon'];
            const slotEquippedKey = equippedKeys?.[item.slot] || equippedKeys?.[item.type] || '';
            const isEquipped = String(slotEquippedKey).trim() === String(item.key).trim();
            const isBusy = actionKey === `equip:${item.key}`;

            return (
              <div
                key={item.key}
                className={`relative group overflow-hidden rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 ${
                  isEquipped
                    ? 'border-[var(--theme-accent)]/60 bg-[var(--theme-accent-soft)]/10 shadow-[0_0_20px_var(--theme-accent-soft)]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                {/* Color glow */}
                <div className="absolute -top-6 -right-6 h-16 w-16 blur-2xl opacity-30 pointer-events-none" style={{ backgroundColor: Preset.color }} />

                {/* Item Preview */}
                <div className="flex items-center justify-center h-20 relative">
                  {item.slot === 'nameplate' && <div className="w-full h-12 pointer-events-none"><Preset.banner /></div>}
                  {item.slot === 'badge' && <div className="h-16 w-16 pointer-events-none"><Preset.badge /></div>}
                  {item.slot === 'frame' && (
                    <div className="h-16 w-16 relative flex items-center justify-center">
                      <div className="absolute inset-[-12px]"><Preset.frame /></div>
                      <div className="h-12 w-12 rounded-full bg-slate-800" />
                    </div>
                  )}
                  {(item.type === 'title' || item.slot === 'title') && (
                    <AnimatedTitleText title={item.name} rarity={item.rarity} className="text-sm font-black uppercase" />
                  )}
                </div>

                {/* Item Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: Preset.color }}>{item.rarity}</div>
                    <div className="text-xs font-black text-white uppercase tracking-wide">{item.name}</div>
                    <div className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">{item.slot}</div>
                  </div>
                  {isEquipped && <BadgeCheck className="h-5 w-5 flex-shrink-0" style={{ color: accent.color }} />}
                </div>

                {/* Equip Button */}
                {item.type !== 'title' && (
                  <button
                    onClick={() => onEquip?.(item)}
                    disabled={isEquipped || isBusy}
                    className="w-full py-2 rounded-lg border font-['Orbitron'] text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={!isEquipped ? { borderColor: accent.borderColor, color: accent.color, backgroundColor: `${accent.color}15` } : { borderColor: 'rgba(255,255,255,0.1)', color: '#64748b', backgroundColor: 'transparent' }}
                  >
                    {isBusy ? 'Equipping...' : isEquipped ? '✓ Equipped' : 'Equip'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MilestonesView = ({ achievements }) => (
  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
      <Award className="h-4 w-4" /> Achievements
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {achievements.map(a => (
        <div key={a.key} className={`p-5 rounded-2xl border ${a.unlocked ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-white/5 opacity-60'}`}>
          <div className="flex justify-between mb-2">
            <div className="text-[11px] font-black uppercase text-white">{a.name}</div>
            {a.unlocked && <BadgeCheck className="h-4 w-4 text-emerald-400" />}
          </div>
          <p className="text-[10px] text-slate-500 mb-4">{a.description}</p>
        </div>
      ))}
    </div>
  </div>
);

const RecentUnlocksView = ({ items }) => (
  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
      <History className="h-4 w-4" /> Recent Timeline
    </div>
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-white/5">
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-600">{it.typeLabel}</div>
            <div className="text-xs font-bold text-white">{it.name}</div>
          </div>
          <div className="text-[10px] text-slate-500">{it.whenLabel}</div>
        </div>
      ))}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                               MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function UserProfilePage() {
  const { user, replaceUser, getAuthHeader } = useAuth();
  const { data: seasonData, refresh: refreshStats } = usePvpSeasonStats();
  const { data: challengeData, refresh: refreshChallenge } = useChallengeResults();
  const { data: marketplaceData, refresh: refreshMarketplace } = useProfileMarketplace();
  const { stats: presenceStats, refreshPresence } = usePresenceContext();

  const [activeTab, setActiveTab] = useState('dossier');
  const [equippingKey, setEquippingKey] = useState('');

  const displayName = useMemo(() => resolveAuthDisplayName(user), [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initials = useMemo(() => displayName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), [displayName]);
  
  const equippedTitleKey = useMemo(() => resolveEquippedTitleKeyFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedCosmetics = useMemo(() => {
    const fromMeta = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});
    const fromApi = marketplaceData?.equipped && typeof marketplaceData.equipped === 'object' ? marketplaceData.equipped : {};
    return {
      badgeKey: fromApi.badgeKey || fromMeta.badgeKey || '',
      nameplateKey: fromApi.nameplateKey || fromMeta.nameplateKey || '',
      frameKey: fromApi.frameKey || fromMeta.frameKey || '',
    };
  }, [user?.user_metadata, marketplaceData?.equipped]);

  const credentials = useMemo(() => ({
    title: getTitleDefinition(equippedTitleKey),
    badge: getMarketplaceItem(equippedCosmetics.badgeKey),
    banner: getMarketplaceItem(equippedCosmetics.nameplateKey),
    frame: getMarketplaceItem(equippedCosmetics.frameKey),
  }), [equippedTitleKey, equippedCosmetics]);

  const ownedItems = useMemo(
    () => (Array.isArray(marketplaceData?.catalog) ? marketplaceData.catalog.filter(it => it.owned) : []),
    [marketplaceData?.catalog]
  );

  const equippedKeys = useMemo(() => ({
    badge: equippedCosmetics.badgeKey,
    nameplate: equippedCosmetics.nameplateKey,
    frame: equippedCosmetics.frameKey,
    title: equippedTitleKey,
  }), [equippedCosmetics, equippedTitleKey]);

  const profile = seasonData?.profile || {};
  const walletBalance = Number(marketplaceData?.wallet?.tokenBalance || 0);

  // Merge marketplace titles + progression-only titles not in marketplace
  const allTitles = useMemo(() => {
    const marketTitles = MARKETPLACE_ITEMS.filter(it => it.slot === 'title' || it.type === 'title');
    const marketKeys = new Set(marketTitles.map(it => it.key));
    const progressionOnly = TITLE_DEFINITIONS
      .filter(it => !marketKeys.has(it.key))
      .map(it => ({ ...it, type: 'title', slot: 'title', cost: 0 }));
    return [...marketTitles, ...progressionOnly];
  }, []);

  // All title keys this user has unlocked — from API (covers both marketplace + earned)
  const unlockedTitleKeys = useMemo(() => {
    const fromApi = Array.isArray(marketplaceData?.unlockedTitleKeys) ? marketplaceData.unlockedTitleKeys : [];
    // Also include catalog-owned titles as a fallback
    const fromCatalog = Array.isArray(marketplaceData?.catalog)
      ? marketplaceData.catalog.filter(it => (it.slot === 'title' || it.type === 'title') && it.owned).map(it => it.key)
      : [];
    return [...new Set([...fromApi, ...fromCatalog])];
  }, [marketplaceData]);

  // Recent unlocks from ownedItems timestamps
  const recentItems = useMemo(() => {
    if (!Array.isArray(marketplaceData?.ownedItems)) return [];
    return marketplaceData.ownedItems
      .filter(it => it.purchased_at || it.created_at)
      .sort((a, b) => new Date(b.purchased_at || b.created_at) - new Date(a.purchased_at || a.created_at))
      .slice(0, 15)
      .map(it => {
        const def = getMarketplaceItem(it.key);
        return {
          name: def?.name || it.key,
          typeLabel: def?.slot || def?.type || 'Item',
          whenLabel: formatRelativeTime(it.purchased_at || it.created_at),
        };
      });
  }, [marketplaceData?.ownedItems]);

  const statsOverview = {
    userId: user?.id,
    leaderboardRank: profile.leaderboardRank,
    bestScore: profile.competitive?.bestScore || 0,
    winRate: profile.competitive?.winRate || 0,
    level: profile.progression?.levelProgress?.level || 1,
    currentLevelXp: profile.progression?.levelProgress?.currentLevelXp || 0,
    nextLevelXp: profile.progression?.levelProgress?.nextLevelXp || 0,
    levelProgressPercent: profile.progression?.levelProgress?.progressPercent || 0,
  };

  const activeTheme = PRESET_LOADOUTS.find(l => l.banner === credentials.banner?.key)?.theme || 'default';

  const handleEquipTitle = async (key) => {
    setEquippingKey(`equip-title:${key}`);
    try {
      const response = await fetch(buildApiUrl('/api/profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action: 'equip', titleKey: key }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        if (payload?.user) replaceUser?.(payload.user);
        await refreshMarketplace?.();
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

  const tabs = [
    { id: 'dossier', label: 'Overview', icon: BookOpen },
    { id: 'combat', label: 'Matches', icon: Target },
    { id: 'arsenal', label: 'Arsenal', icon: Briefcase },
    { id: 'loadout', label: 'Gear', icon: Boxes },
    { id: 'milestones', label: 'Progress', icon: Award },
    { id: 'recent', label: 'Recent', icon: History },
  ];

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
            {activeTab === 'milestones' && <MilestonesView achievements={profile.progression?.achievements || []} />}
            {activeTab === 'recent' && <RecentUnlocksView items={recentItems} />}
          </main>
        </div>
      </div>
    </div>
  );
}
