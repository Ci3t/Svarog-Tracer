import React, { useMemo } from 'react';
import {
  BadgeCheck,
  Coins,
  Crown,
  Flag,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { withBaseUrl } from '../utils/assetPaths';

function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const picks = [
    metadata.global_name,
    metadata.full_name,
    identityData.global_name,
    metadata.user_name,
    identityData.username,
    metadata.preferred_username,
    metadata.name,
    user.email,
    user.id,
  ];
  for (const value of picks) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function resolveAvatarUrl(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const candidates = [
    metadata.avatar_url,
    metadata.avatar,
    identityData.avatar_url,
    identityData.picture,
  ];
  for (const value of candidates) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return withBaseUrl(normalized);
  }
  return '';
}

function SectionCard({ title, icon: Icon, subtitle, children, className = '' }) {
  return (
    <section className={`theme-glass-card rounded-2xl border border-white/10 bg-black/30 p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {Icon ? <Icon className="h-4 w-4 text-slate-300" /> : null}
            <span>{title}</span>
          </div>
          {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Pill({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    : tone === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : tone === 'accent'
        ? 'border-violet-500/30 bg-violet-500/10 text-violet-100'
        : 'border-white/10 bg-white/5 text-slate-200';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-semibold ${toneClass}`}>
      <span className="uppercase tracking-[0.18em] text-[10px] text-slate-400">{label}</span>
      <span className="text-sm font-black text-white">{value}</span>
    </div>
  );
}

export default function UserProfilePage({ sessionTheme = 'modern' }) {
  const { user } = useAuth();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const displayName = useMemo(() => resolveAuthDisplayName(user) || 'Trailblazer', [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initial = displayName.charAt(0).toUpperCase() || 'T';
  const joinDate = user?.created_at ? new Date(user.created_at) : null;
  const joinLabel = joinDate ? joinDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Unknown';
  const regionLabel = String(user?.user_metadata?.region || user?.user_metadata?.server_region || 'NA').toUpperCase();

  const profileStats = [
    { label: 'Wins', value: '128', tone: 'success' },
    { label: 'Losses', value: '54' },
    { label: 'Win Rate', value: '70.3%', tone: 'accent' },
    { label: 'Best Score', value: '96', tone: 'warning' },
  ];

  const matchHistory = [
    { id: 1, result: 'Win', opponent: 'Kiyo', score: '93', time: '2h ago', tier: 'Expert' },
    { id: 2, result: 'Win', opponent: 'Noir', score: '88', time: '5h ago', tier: 'Veteran' },
    { id: 3, result: 'Loss', opponent: 'Lyra', score: '76', time: 'Yesterday', tier: 'Expert' },
    { id: 4, result: 'Win', opponent: 'Aran', score: '90', time: '2d ago', tier: 'Expert' },
    { id: 5, result: 'Win', opponent: 'Vance', score: '82', time: '3d ago', tier: 'Intermediate' },
  ];

  const achievements = [
    { id: 'first-clear', title: 'First Clear', status: 'earned' },
    { id: 'no-junk', title: 'No Junk Run', status: 'earned' },
    { id: 'win-streak', title: '5 Win Streak', status: 'earned' },
    { id: 'speedrun', title: 'Speed Runner', status: 'locked' },
    { id: 'perfect', title: 'Perfect Score', status: 'locked' },
    { id: 'legend', title: 'Legend Tier', status: 'locked' },
  ];

  const cosmetics = [
    { label: 'Title', value: "Clara's Pick" },
    { label: 'Nameplate', value: 'Crimson Arc' },
    { label: 'Frame', value: 'Astral Halo' },
    { label: 'Victory FX', value: 'Void Bloom' },
  ];

  return (
    <div className="min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
            Player Profile
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Commander Hub</h1>
              <p className="mt-1 text-sm text-slate-400">
                Track your PvP legacy, cosmetics, and progression milestones.
              </p>
            </div>
            <button
              type="button"
              className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${themeConfig.layout?.exportButtonClass || 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
            >
              Edit Profile
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Identity" icon={Users} subtitle="Your PvP signature">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white">
                      {initial}
                    </div>
                  )}
                  {!avatarUrl ? (
                    <img
                      src={withBaseUrl('clara-prof-assistant.png')}
                      alt="Clara assistant"
                      className="absolute -bottom-6 -right-6 h-14 w-14 opacity-60"
                    />
                  ) : null}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">{displayName}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-slate-200">
                      Region {regionLabel}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-slate-200">
                      Joined {joinLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-wrap gap-3">
                {profileStats.map((stat) => (
                  <Pill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Rank & Season" icon={Crown} subtitle="Season 1 snapshot">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Current Rank</span>
                <span className="font-semibold text-white">Crimson II</span>
              </div>
              <div className="h-3 rounded-full border border-white/10 bg-white/5">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500/70 via-fuchsia-500/60 to-rose-500/70" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Season Points</span>
                <span className="text-white">1,420 / 2,300</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Pill label="Best Rank" value="Crimson I" tone="accent" />
                <Pill label="Season Matches" value="182" />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="PvP Record" icon={Trophy} subtitle="Performance highlights">
            <div className="grid gap-3 sm:grid-cols-2">
              <Pill label="Longest Streak" value="9 Wins" tone="success" />
              <Pill label="Fastest Clear" value="01:12" tone="warning" />
              <Pill label="Clean Clears" value="58" />
              <Pill label="Perfect Routes" value="12" tone="accent" />
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Recent Match History</div>
              <div className="mt-3 space-y-2">
                {matchHistory.map((match) => (
                  <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${match.result === 'Win' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100'}`}>
                        {match.result}
                      </span>
                      <span className="font-semibold text-white">{match.opponent}</span>
                      <span className="text-slate-500">Tier {match.tier}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-300">
                      <span>Score {match.score}</span>
                      <span>{match.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Signature Build" icon={Shield} subtitle="What you are known for">
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Favorite Team</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-white">
                  {['Acheron', 'Sparkle', 'Ruan Mei', 'Fu Xuan'].map((name) => (
                    <span key={name} className="rounded-full border border-white/10 bg-black/30 px-3 py-1">{name}</span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Pill label="Most Used Cavern" value="Path of Possession" tone="accent" />
                <Pill label="Best Relic Score" value="S 98" tone="success" />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Signature Note</div>
                <p className="mt-2 text-sm text-slate-300">
                  Prefers high tempo SPD routes with double-crit clean paths and controlled junk mitigation.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr_0.8fr]">
          <SectionCard title="Achievements" icon={BadgeCheck} subtitle="Milestones earned">
            <div className="grid gap-3">
              {achievements.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold ${
                    item.status === 'earned'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  <span>{item.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em]">
                    {item.status === 'earned' ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Cosmetics" icon={Sparkles} subtitle="Equipped items">
            <div className="grid gap-3 sm:grid-cols-2">
              {cosmetics.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rewards Wallet" icon={Coins} subtitle="Clara Chips">
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/70">Balance</div>
                <div className="mt-2 text-3xl font-black text-white">1,840</div>
                <div className="mt-1 text-xs text-amber-200/70">Total earned 4,920</div>
              </div>
              <Pill label="Next Reward" value="Nameplate: Neon Core" tone="warning" />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <SectionCard title="Progression" icon={Star} subtitle="Account growth">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Level</span>
                <span className="font-semibold text-white">42</span>
              </div>
              <div className="h-3 rounded-full border border-white/10 bg-white/5">
                <div className="h-full w-[48%] rounded-full bg-gradient-to-r from-cyan-500/70 via-blue-500/60 to-indigo-500/70" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>XP</span>
                <span className="text-white">4,800 / 10,000</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Pill label="Next Unlock" value="Victory FX: Aurora" tone="accent" />
                <Pill label="Season Bonus" value="+5% Chips" tone="success" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Settings" icon={Flag} subtitle="Visibility controls">
            <div className="space-y-3">
              {[
                { label: 'Public Profile', value: 'On' },
                { label: 'Show Match History', value: 'On' },
                { label: 'Show Cosmetics', value: 'On' },
                { label: 'Allow Duel Invites', value: 'Off' },
              ].map((setting) => (
                <div key={setting.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                  <span>{setting.label}</span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${setting.value === 'On' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/10 text-slate-400'}`}>
                    {setting.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
