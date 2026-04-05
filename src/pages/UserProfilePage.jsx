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
  BookOpen
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
} from '../utils/marketplaceCatalog';
import {
  getTitleBadgeStyle,
  getTitleDefinition,
  resolveEquippedTitleKeyFromMetadata,
} from '../utils/titleCatalog';

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

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return '??';
  return text.split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
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

const IdentityHero = ({ user, displayName, credentials, stats, avatarUrl, initials, rankTier }) => {
  const heroRef = useRef(null);
  const { title, badge, banner, frame } = credentials;
  const accent = getCosmeticAccentStyle(title?.rarity || 'common');

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
      className="relative isolate z-20 mb-10 overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0a0b]/75 p-8 md:p-12 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)]"
    >
      {/* Dynamic Energy Core (Rarity Based Glow) - Increased visibility */}
      <div 
        className="absolute -top-20 -right-20 h-96 w-96 blur-[120px] opacity-50 animate-pulse pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: accent.color || 'var(--theme-accent)' }} 
      />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
          {/* Avatar with Animated Frame */}
          <div 
            className="relative isolate h-40 w-40 md:h-48 md:w-48 rounded-full border-4 flex items-center justify-center overflow-hidden bg-slate-950 group shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-500"
            style={{ ...getAvatarFrameStyle(frame?.key), borderColor: frame ? 'transparent' : 'rgba(255,255,255,0.1)' }}
          >
            <div className="absolute inset-[6px] z-0 rounded-full bg-black/35" />
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="relative z-10 h-full w-full object-cover opacity-100 group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <span className="relative z-10 font-['Orbitron'] text-4xl font-black">{initials}</span>
            )}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Avatar
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
                <span>Season XP</span>
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
            <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-400">Across Logged Modes</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Win Rate</div>
            <div className="font-['Orbitron'] text-2xl font-black text-[var(--theme-accent)]">{stats.winRate || 0}%</div>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-400">Competitive PvP</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Challenge Clears</div>
            <div className="font-['Orbitron'] text-2xl font-black text-white">{stats.handcraftedClears || 0}</div>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-400">Handcrafted Only</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-5 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black mb-1">Level</div>
            <div className="font-['Orbitron'] text-2xl font-black text-white">{stats.level || 1}</div>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-400">{stats.totalXp || 0} Total XP</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricRadar = ({ stats }) => {
  // Purely visual radar-like chart using SVG
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
          <polygon points="50,30 70,42.5 70,62.5 50,72.5 30,62.5 30,42.5" className="fill-none stroke-white/10 stroke-[0.5]" />
          <polygon points={polyPoints} className="fill-[var(--theme-accent-soft)]/20 stroke-[var(--theme-accent)] stroke-1" />
          {points.map(p => (
            <circle key={p.label} cx={50 + (p.x - 50) * (p.val / 100)} cy={50 + (p.y - 50) * (p.val / 100)} r="2" className="fill-[var(--theme-accent)] shadow-[0_0_10px_var(--theme-accent)]" />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-['Orbitron'] text-[10px] font-black text-white/40">SVAROG_S_RATIO</div>
        
        {/* Labels */}
        {points.map(p => (
          <div key={p.label} className="absolute text-[8px] font-black uppercase tracking-widest text-slate-500" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
            {p.label}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-6 w-full text-center">
        {points.slice(0,3).map(p => (
          <div key={p.label}>
            <div className="text-[8px] uppercase tracking-widest text-slate-600 font-black">{p.label} INDEX</div>
            <div className="mt-1 font-['Orbitron'] text-xs text-white">{p.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClaraOSFeedback = ({ bestScore, winRate }) => (
  <div className="rounded-2xl border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)]/5 p-6 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-20"><Binary className="h-10 w-10 text-[var(--theme-accent)]" /></div>
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
        <Cpu className="h-5 w-5 text-pink-400" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400 mb-1">Clara Note</div>
        <p className="text-[11px] leading-relaxed text-slate-300 italic">
          "{bestScore > 100 
            ? "Your score pace is ahead of the current baseline. Keep pushing while the reads are still clean."
            : "Your runs look stable so far. More PvP and challenge clears will give this profile a stronger read."}"
        </p>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                SUB-VIEWS                                   */
/* -------------------------------------------------------------------------- */

const DossierView = ({ stats, profile, presence }) => (
  <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors">
          <div className="flex items-center gap-3 text-slate-500 mb-6">
            <Trophy className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">PvP Snapshot</span>
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-end">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">Win Rate</span>
              <span className="font-['Orbitron'] text-lg font-bold text-white">{profile.competitive?.winRate || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-[var(--theme-accent)]" style={{ width: `${profile.competitive?.winRate || 0}%` }} />
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider">Average Score</span>
              <span className="font-['Orbitron'] text-lg font-bold text-white">{profile.competitive?.averageScore || 0}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${(profile.competitive?.averageScore || 0) / 1.5}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3 text-slate-500 mb-6">
            <Gamepad2 className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Bot Rooms</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Rooms</div>
              <div className="font-['Orbitron'] text-xl font-bold text-white">{profile.practice?.matches || 0}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Wins</div>
              <div className="font-['Orbitron'] text-xl font-bold text-emerald-400">{profile.practice?.wins || 0}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Avg Helpful Hits</div>
              <div className="font-['Orbitron'] text-xl font-bold text-white">{profile.practice?.averageHelpfulHits || 0}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Best Score</div>
              <div className="font-['Orbitron'] text-xl font-bold text-white">{profile.practice?.bestScore || 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 text-slate-500 mb-6">
            <Binary className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Season Metrics</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Level</span>
              <span className="text-sm font-black text-amber-300">Lv {stats.level || 1}</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>XP Progress</span>
                <span>{stats.currentLevelXp || 0}/{stats.nextLevelXp || 0}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-[var(--theme-accent)]" style={{ width: `${Math.max(0, Math.min(100, Number(stats.levelProgressPercent || 0)))}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Best Streak</span>
              <span className="text-sm font-black text-[var(--theme-accent)]">{profile.bestWinStreak || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Season Points</span>
              <span className="text-sm font-black text-white">{profile.competitive?.seasonPoints || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Best Challenge Grade</span>
              <span className="text-sm font-black text-white">{stats.bestChallengeGrade || 'C-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
        <div className="flex items-center gap-3 text-slate-500 mb-8">
          <Users className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Presence</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">User ID</div>
            <div className="font-['Orbitron'] text-xl font-black text-white">{stats.userId?.slice(0, 8)}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Status</div>
            <div className="font-['Orbitron'] text-xl font-black text-emerald-400">ONLINE</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Site Online</div>
            <div className="font-['Orbitron'] text-xl font-black text-white">{presence.online || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">Members Online</div>
            <div className="font-['Orbitron'] text-xl font-black text-white">{(presence.users || []).length}</div>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 pb-8">
        <div className="flex items-center gap-3 text-slate-500 mb-8">
          <Activity className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Performance Radar</span>
        </div>
        <MetricRadar
          stats={{
            accuracy: Math.min(100, profile.competitive?.winRate || 0),
            speed: Math.min(100, Math.round((profile.competitive?.averageScore || 0) * 2)),
            consistency: Math.min(100, Math.round((profile.bestWinStreak || 0) * 12)),
            experience: Math.min(100, stats.levelProgressPercent || 0),
            power: Math.min(100, Math.round((stats.bestScore || 0) * 1.1)),
            streak: Math.min(100, Math.round((profile.competitive?.seasonPoints || 0) * 4)),
          }}
        />
      </div>
      <ClaraOSFeedback bestScore={stats.bestScore} winRate={profile.competitive?.winRate} />
    </div>
  </div>
);

const CombatLogView = ({ recentMatches, practiceMatches, botTables }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 text-slate-500">
            <Target className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recent PvP Results</span>
          </div>
        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Current Season</span>
        </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-slate-500 px-4">
              <th className="pb-4 pl-4">Result</th>
              <th className="pb-4">Opponent</th>
              <th className="pb-4">Tier</th>
              <th className="pb-4 text-center">Score</th>
              <th className="pb-4 text-center">Hits/Mistakes</th>
              <th className="pb-4 pr-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {(recentMatches || []).length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-slate-600 text-[10px] uppercase font-bold">No PvP matches logged this season.</td></tr>
            ) : (
              recentMatches.map((m, idx) => (
                <tr key={idx} className="group transition-colors hover:bg-white/[0.02]">
                  <td className="py-4 pl-4 rounded-l-xl border-y border-l border-white/5">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-tighter border ${m.result === 'win' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-rose-500/30 text-rose-400 bg-rose-500/5'}`}>
                      {m.result || 'DRAW'}
                    </span>
                  </td>
                  <td className="py-4 border-y border-white/5 font-medium text-slate-300">{m.opponentName}</td>
                  <td className="py-4 border-y border-white/5 text-[10px] uppercase font-bold text-slate-500">{m.tier || 'Standard'}</td>
                  <td className="py-4 border-y border-white/5 text-center font-['Orbitron'] text-xs text-white">{m.score}</td>
                  <td className="py-4 border-y border-white/5 text-center text-[10px] text-slate-400">{m.helpfulHits} / {m.mistakes}</td>
                  <td className="py-4 pr-4 rounded-r-xl border-y border-r border-white/5 text-right text-[10px] text-slate-600 font-mono tracking-tighter">{formatRelativeTime(m.finishedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      {botTables.map(bot => (
        <div key={bot.botName} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-slate-500">
                <Cpu className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{bot.botName} Sessions</span>
              </div>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{bot.summary?.winRate || 0}% WR</span>
          </div>
          <div className="space-y-3">
            {bot.matches.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${m.result === 'win' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">{m.tier}</div>
                    <div className="text-[9px] text-slate-600 uppercase font-mono">{formatRelativeTime(m.finishedAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-['Orbitron'] text-xs text-white pb-1">{m.score}</div>
                  <div className="text-[9px] text-slate-600">{m.helpfulHits}H / {m.mistakes}M</div>
                </div>
              </div>
            ))}
            {bot.matches.length === 0 && <div className="py-10 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">No bot rooms logged yet.</div>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ArsenalView = ({ unlockedTitles, lockedTitles, ownedItems, credentials, onEquipTitle, clearTitle, activeTitleKey, buyItem, equipItem, clearSlot, walletBalance }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-10">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
            <div className="flex items-center gap-3 text-slate-500 mb-8">
              <Award className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Titles</span>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {[...unlockedTitles, ...lockedTitles].map(title => {
              const isUnlocked = unlockedTitles.find(t => t.key === title.key);
              const isActive = activeTitleKey === title.key;
              const accent = getTitleBadgeStyle(title.rarity);
              return (
                <div key={title.key} className={`relative group rounded-2xl border p-5 transition-all duration-300 ${isUnlocked ? (isActive ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)]/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20') : 'border-white/5 bg-white/[0.01] grayscale opacity-50'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-white/5">
                      <Trophy className={`h-4 w-4 ${isUnlocked ? 'text-[var(--theme-accent)]' : 'text-slate-700'}`} />
                    </div>
                    {isUnlocked && (
                      <button 
                        disabled={isActive}
                        onClick={() => onEquipTitle(title.key)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${isActive ? 'border-transparent text-[var(--theme-accent)]' : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        {isActive ? 'Active' : 'Equip'}
                      </button>
                    )}
                  </div>
                  <AnimatedTitleText title={title.name} rarity={title.rarity} className="text-sm font-black uppercase tracking-wider block mb-1" />
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3" style={{ color: accent.color }}>Tier: {title.rarity}</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">{title.requirement}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <Layers className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Equipped Cosmetics</span>
          </div>
          <div className="space-y-4">
            {['frame', 'badge', 'banner'].map(slot => {
              const item = credentials[slot];
              return (
                <div key={slot} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] group">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg border border-white/5 bg-slate-900 flex items-center justify-center">
                      {slot === 'frame' ? <Monitor className="h-4 w-4 text-slate-600" /> : slot === 'badge' ? <BadgeCheck className="h-4 w-4 text-slate-600" /> : <Layers className="h-4 w-4 text-slate-600" />}
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600">{slot}</div>
                      <div className="text-[11px] font-bold text-white uppercase">{item?.name || 'Standard v1'}</div>
                    </div>
                  </div>
                  {item && (
                    <button 
                      onClick={() => clearSlot(slot)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--theme-accent-soft)]/20 bg-[var(--theme-accent-soft)]/5 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 text-slate-500">
                <Wallet className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Token Balance</span>
              </div>
            <div className="font-['Orbitron'] text-lg font-bold text-[var(--theme-accent)]">{formatTokenCount(walletBalance)}</div>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-wider mb-6">
            Tokens come from season rewards and future ranked progression.
          </p>
          <button 
            onClick={() => window.location.href='/marketplace'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)]/10 text-[10px] font-black uppercase tracking-widest text-[var(--theme-accent)] hover:bg-[var(--theme-accent-soft)]/20 transition-all"
          >
            Open Marketplace <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MilestonesView = ({ achievements, challenges, seasonRewards, onClaimReward, claimingKey }) => (
  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
        <div className="flex items-center gap-3 text-slate-500 mb-8">
          <Award className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Achievements</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map(a => {
            const currentValue = Number(a.currentValue ?? a.value ?? 0);
            const targetValue = Math.max(1, Number(a.target || 1));
            const progressPercent = a.unlocked ? 100 : Math.max(0, Math.min(100, Math.floor((currentValue / targetValue) * 100)));
            return (
            <div key={a.key} className={`flex flex-col p-4 rounded-2xl border ${a.unlocked ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-white/5 bg-white/[0.01] opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`text-[11px] font-black uppercase tracking-wider ${a.unlocked ? 'text-white' : 'text-slate-500'}`}>{a.name}</div>
                {a.unlocked ? <BadgeCheck className="h-4 w-4 text-emerald-400" /> : <Binary className="h-4 w-4 text-slate-800" />}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed mb-4 font-medium">{a.description}</p>
              <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden mr-3">
                  <div className={`h-full ${a.unlocked ? 'bg-emerald-400' : 'bg-slate-700'}`} style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-[9px] font-mono text-slate-600">{a.unlocked ? '100%' : `${progressPercent}%`}</span>
              </div>
            </div>
          )})}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <History className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Challenge Ladder</span>
          </div>
          <div className="space-y-3">
            {challenges.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02] group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg border border-white/5 bg-slate-900 flex items-center justify-center font-['Orbitron'] text-[10px] font-black text-slate-500">
                    L{String(i + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">{c.contract_title}</div>
                    <div className="text-[9px] text-slate-600 uppercase font-mono tracking-tighter">{c.difficulty} SEC_CLEAR</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-['Orbitron'] text-xs text-white pb-0.5">{c.score}</div>
                    <div className="text-[9px] text-emerald-500 uppercase font-black">{c.grade}</div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-800" />
                </div>
              </div>
            ))}
            {challenges.length === 0 && <div className="py-20 text-center text-slate-600 text-[10px] uppercase font-bold tracking-widest">No ladder clears recorded.</div>}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--theme-accent-soft)]/20 bg-[var(--theme-accent-soft)]/5 p-8">
          <div className="flex items-center gap-3 text-slate-500 mb-8">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Season Rewards</span>
          </div>
          <div className="space-y-4">
            {seasonRewards.slice(0, 3).map(r => (
              <div key={r.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">{r.name}</div>
                  <div className="text-[9px] text-slate-600 uppercase mt-0.5">{r.requirement}</div>
                </div>
                <button 
                  disabled={!r.unlocked || r.claimed || claimingKey === r.key}
                  onClick={() => onClaimReward(r.key)}
                  className={`ml-4 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${r.claimed ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : r.unlocked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-transparent border-white/5 text-slate-700'}`}
                >
                  {r.claimed ? 'Claimed' : r.unlocked ? 'Ready' : 'Locked'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RecentUnlocksView = ({ items }) => (
  <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8">
      <div className="mb-8 flex items-center gap-3 text-slate-500">
        <History className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Recent Unlocks</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] px-6 py-16 text-center">
          <div className="text-[11px] font-semibold text-slate-300">No recent progression unlocks yet.</div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-600">
            New titles, achievements, and reward-ready items will appear here.
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={`${item.type}-${item.key}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{item.typeLabel}</span>
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                    item.status === 'ready'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-300'
                  }`}>
                    {item.statusLabel}
                  </span>
                </div>
                <div className="mt-2 text-[13px] font-semibold text-white">{item.name}</div>
                <div className="mt-1 text-[11px] text-slate-500">{item.meta}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-slate-200">{item.whenLabel}</div>
                <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">{item.rarity || 'standard'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [claimingKey, setClaimingKey] = useState('');

  const displayName = useMemo(() => resolveAuthDisplayName(user), [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initials = useMemo(() => displayName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), [displayName]);
  
  const equippedTitleKey = useMemo(() => resolveEquippedTitleKeyFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const credentials = {
    title: getTitleDefinition(equippedTitleKey),
    ...resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {})
  };

  const equippedItems = {
    badge: getMarketplaceItem(credentials.badgeKey),
    banner: getMarketplaceItem(credentials.nameplateKey),
    frame: getMarketplaceItem(credentials.frameKey),
    title: credentials.title
  };

  const profile = seasonData?.profile || {};
  const challengeRows = challengeData?.rows || [];
  const marketplaceCatalog = marketplaceData?.catalog || [];
  
  const walletBalance = Number(marketplaceData?.wallet?.tokenBalance || 0);

  const statsOverview = {
    userId: user?.id,
    leaderboardRank: profile.leaderboardRank,
    bestScore: profile.competitive?.bestScore || profile.all?.bestScore || 0,
    winRate: profile.competitive?.winRate || 0,
    handcraftedClears: new Set(challengeRows.filter(r => !r.generated).map(r => r.contract_id)).size,
    bestChallengeGrade: challengeData?.summary?.bestGrade || 'C-',
    ownedItemsCount: marketplaceCatalog.filter(it => it.owned).length,
    level: profile.progression?.levelProgress?.level || 1,
    totalXp: profile.progression?.levelProgress?.totalXp || 0,
    currentLevelXp: profile.progression?.levelProgress?.currentLevelXp || 0,
    nextLevelXp: profile.progression?.levelProgress?.nextLevelXp || 0,
    xpToNextLevel: profile.progression?.levelProgress?.xpToNextLevel || 0,
    levelProgressPercent: profile.progression?.levelProgress?.progressPercent || 0,
  };

  const titleCatalog = useMemo(() => {
    const progressionTitles = Array.isArray(profile.progression?.titles) ? profile.progression.titles : [];
    return progressionTitles
      .map((entry) => ({
        ...getTitleDefinition(entry.key),
        ...entry,
      }))
      .filter((entry) => entry?.key);
  }, [profile.progression?.titles]);

  const botTables = useMemo(() => {
    const pm = profile.practiceMatches || [];
    const pb = profile.practiceByBot || [];
    return ['Svarog Bot', 'Clara Bot'].map(name => ({
      botName: name,
      summary: pb.find(e => normalizeBotGroupName(e.botName) === name),
      matches: pm.filter(m => normalizeBotGroupName(m.opponentName) === name).sort((a,b) => new Date(b.finishedAt) - new Date(a.finishedAt))
    }));
  }, [profile]);

  const recentUnlocks = useMemo(() => {
    const titleItems = (profile.progression?.titles || [])
      .filter((entry) => entry.unlocked && entry.unlockedAt)
      .map((entry) => ({
        type: 'title',
        typeLabel: 'Title',
        status: 'unlocked',
        statusLabel: 'Unlocked',
        key: entry.key,
        name: entry.name,
        rarity: entry.rarity,
        whenValue: new Date(entry.unlockedAt).getTime(),
        whenLabel: formatRelativeTime(entry.unlockedAt),
        meta: entry.requirement || 'Progression title unlocked.',
      }));

    const achievementItems = (profile.progression?.achievements || [])
      .filter((entry) => entry.unlocked && entry.unlockedAt)
      .map((entry) => ({
        type: 'achievement',
        typeLabel: 'Achievement',
        status: 'unlocked',
        statusLabel: 'Unlocked',
        key: entry.key,
        name: entry.name,
        rarity: entry.category || 'standard',
        whenValue: new Date(entry.unlockedAt).getTime(),
        whenLabel: formatRelativeTime(entry.unlockedAt),
        meta: entry.description || entry.progressLabel || 'Achievement complete.',
      }));

    const rewardItems = (profile.rewardTrack || [])
      .filter((entry) => entry.claimedAt || entry.unlocked)
      .map((entry) => ({
        type: 'reward',
        typeLabel: 'Reward',
        status: entry.claimed ? 'claimed' : 'ready',
        statusLabel: entry.claimed ? 'Claimed' : 'Ready',
        key: entry.key,
        name: entry.name,
        rarity: entry.rarity,
        whenValue: entry.claimedAt ? new Date(entry.claimedAt).getTime() : 0,
        whenLabel: entry.claimedAt ? formatRelativeTime(entry.claimedAt) : 'Ready now',
        meta: entry.claimed ? 'Reward moved into your inventory.' : entry.requirement || 'Reward track requirement met.',
      }));

    return [...titleItems, ...achievementItems, ...rewardItems]
      .sort((left, right) => Number(right.whenValue || 0) - Number(left.whenValue || 0))
      .slice(0, 16);
  }, [profile.progression?.achievements, profile.progression?.titles, profile.rewardTrack]);

  const handleEquipTitle = async (key) => {
    setEquippingKey(key || 'clear');
    try {
      const response = await fetch(buildApiUrl('/api/profile-title'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ action: key ? 'equip' : 'clear', titleKey: key || undefined }),
      });
      const payload = await response.json();
      if (response.ok && payload?.user) {
        replaceUser?.(payload.user);
        refreshPresence?.();
      }
    } finally { setEquippingKey(''); }
  };

  const submitMarketplaceAction = async (body) => {
    const response = await fetch(buildApiUrl('/api/profile-marketplace'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (response.ok && payload?.user) {
      replaceUser?.(payload.user);
      await Promise.allSettled([refreshMarketplace?.(), refreshStats?.(), refreshPresence?.()]);
    }
  };

  const handleClaimReward = async (key) => {
    setClaimingKey(key);
    try {
      const response = await fetch(buildApiUrl('/api/profile-rewards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ rewardKey: key }),
      });
      if (response.ok) refreshStats?.();
    } finally { setClaimingKey(''); }
  };

  const tabs = [
    { id: 'dossier', label: 'Overview', icon: BookOpen },
    { id: 'combat', label: 'Matches', icon: Target },
    { id: 'arsenal', label: 'Loadout', icon: Shield },
    { id: 'milestones', label: 'Progress', icon: Award },
    { id: 'recent', label: 'Recent', icon: History },
  ];

  return (
    <div className="min-h-screen relative bg-transparent px-4 py-8 sm:px-8 lg:px-12">
      {/* Ambience particles */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[10%] -left-20 h-[500px] w-[500px] rounded-full bg-[var(--theme-accent-soft)] blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-20 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <IdentityHero 
          user={user} 
          displayName={displayName} 
          credentials={equippedItems} 
          stats={statsOverview} 
          avatarUrl={avatarUrl} 
          initials={initials}
          rankTier={profile.rankTier}
        />

        <div className="flex flex-col gap-10">
          {/* Tactical Tab Nav */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 mx-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'bg-[var(--theme-accent)] text-white shadow-[0_0_20px_rgba(0,0,0,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-700'}`} />
                <span className="font-['Orbitron'] text-[11px] font-black uppercase tracking-[0.16em]">{tab.label}</span>
              </button>
            ))}
            <div className="h-6 w-[1px] bg-white/10 mx-2" />
            <button 
              onClick={() => { refreshStats?.(); refreshChallenge?.(); refreshPresence?.(); }}
              className="px-4 py-3 text-slate-500 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <main className="min-h-[600px]">
            {activeTab === 'dossier' && <DossierView stats={statsOverview} profile={profile} presence={presenceStats} />}
            {activeTab === 'combat' && <CombatLogView recentMatches={profile.competitiveMatches} practiceMatches={profile.practiceMatches} botTables={botTables} />}
            {activeTab === 'arsenal' && (
              <ArsenalView 
                unlockedTitles={titleCatalog.filter(t => t.unlocked)}
                lockedTitles={titleCatalog.filter(t => !t.unlocked)}
                credentials={equippedItems}
                activeTitleKey={equippedTitleKey}
                onEquipTitle={handleEquipTitle}
                clearTitle={() => handleEquipTitle('')}
                walletBalance={walletBalance}
                clearSlot={(slot) => submitMarketplaceAction({ action: 'clear', slot })}
              />
            )}
            {activeTab === 'milestones' && (
              <MilestonesView 
                achievements={profile.progression?.achievements || []} 
                challenges={challengeRows.filter(r => !r.generated)}
                seasonRewards={profile.rewardTrack || []}
                onClaimReward={handleClaimReward}
                claimingKey={claimingKey}
              />
            )}
            {activeTab === 'recent' && <RecentUnlocksView items={recentUnlocks} />}
          </main>
        </div>
      </div>
    </div>
  );
}
