import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Crown,
  Sparkles,
  Trophy,
  Users,
  Target,
  ShieldCheck,
  RefreshCw,
  Store,
  Wallet,
} from 'lucide-react';
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

function panelStyle(extra = {}) {
  return {
    background: 'var(--theme-surface-1)',
    borderColor: 'var(--theme-border-soft)',
    color: 'var(--theme-text-primary)',
    ...extra,
  };
}

function subtlePanelStyle(extra = {}) {
  return {
    background: 'var(--theme-surface-2)',
    borderColor: 'var(--theme-border-soft)',
    color: 'var(--theme-text-primary)',
    ...extra,
  };
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
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function compareChallengeResultRows(left, right) {
  const scoreDiff = Number(left?.score || 0) - Number(right?.score || 0);
  if (scoreDiff !== 0) return scoreDiff;

  const leftTime = Number(left?.clear_time_seconds || 0);
  const rightTime = Number(right?.clear_time_seconds || 0);
  const leftHasTime = leftTime > 0;
  const rightHasTime = rightTime > 0;
  if (leftHasTime !== rightHasTime) return leftHasTime ? 1 : -1;
  if (leftHasTime && rightHasTime && leftTime !== rightTime) return rightTime - leftTime;

  const helpfulHitsDiff = Number(left?.helpful_hits || 0) - Number(right?.helpful_hits || 0);
  if (helpfulHitsDiff !== 0) return helpfulHitsDiff;

  const mistakesDiff = Number(right?.mistakes || 0) - Number(left?.mistakes || 0);
  if (mistakesDiff !== 0) return mistakesDiff;

  return new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime();
}

function dedupeChallengeRows(rows) {
  const generatedRows = [];
  const bestByContract = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.generated) {
      generatedRows.push(row);
      continue;
    }

    const key = String(row?.contract_id || '').trim();
    if (!key) continue;
    const current = bestByContract.get(key);
    if (!current || compareChallengeResultRows(row, current) > 0) {
      bestByContract.set(key, row);
    }
  }

  return [
    ...Array.from(bestByContract.values()),
    ...generatedRows,
  ].sort((left, right) => new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime());
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return '??';
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatTokenCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function SectionCard({ title, description, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border p-5 sm:p-6 ${className}`} style={panelStyle()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border" style={subtlePanelStyle({ color: 'var(--theme-accent)' })}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatTile({ label, value, hint, accent = false }) {
  return (
    <div className="rounded-lg border p-4" style={subtlePanelStyle()}>
      <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>{label}</div>
      <div className="mt-2 text-2xl font-semibold" style={accent ? { color: 'var(--theme-accent)' } : undefined}>{value}</div>
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-soft)' }}>{hint}</div>
      ) : null}
    </div>
  );
}

function ResultPill({ result }) {
  const normalized = String(result || '').toLowerCase();
  const style = normalized === 'win'
    ? { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.32)' }
    : normalized === 'loss'
      ? { background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.32)' }
      : { background: 'var(--theme-accent-soft)', color: 'var(--theme-accent)', borderColor: 'var(--theme-border-strong)' };

  return (
    <span className="inline-flex min-w-[56px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-semibold capitalize" style={style}>
      {normalized || 'draw'}
    </span>
  );
}

function RankTierBadge({ tier }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold" style={subtlePanelStyle()}>
        Unranked
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: tier.color,
        background: tier.accent,
        color: tier.color,
      }}
    >
      {tier.name}
    </span>
  );
}

function RewardTrackRow({ item, claiming, onClaim }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
      <div>
        <div className="text-sm font-medium">{item.name}</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.requirement}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getTitleBadgeStyle(item.rarity || 'common')}>
            {item.rarity || 'common'}
          </span>
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
            {item.rewardType || 'reward'}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold"
          style={item.claimed
            ? { background: 'rgba(59, 130, 246, 0.12)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.24)' }
            : item.unlocked
              ? { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.28)' }
              : { background: 'transparent', color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border-soft)' }}
        >
          {item.claimed ? 'Claimed' : item.unlocked ? 'Ready' : 'Locked'}
        </span>
        <button
          type="button"
          disabled={!item.unlocked || item.claimed || claiming}
          onClick={() => onClaim?.(item.key)}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={item.unlocked && !item.claimed
            ? { borderColor: 'rgba(16, 185, 129, 0.28)', background: 'rgba(16, 185, 129, 0.08)', color: '#6ee7b7' }
            : subtlePanelStyle()}
        >
          {item.claimed ? 'Claimed' : claiming ? 'Claiming...' : 'Claim'}
        </button>
      </div>
    </div>
  );
}

function EquippedCosmeticRow({ label, item, clearing, locked, onClear }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {item ? item.name : `No ${label.toLowerCase()} equipped`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item ? (
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getCosmeticAccentStyle(item.rarity)}>
            {item.rarity}
          </span>
        ) : null}
        <button
          type="button"
          disabled={!item || clearing || locked}
          onClick={onClear}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={subtlePanelStyle()}
        >
          {clearing ? 'Clearing...' : 'Clear'}
        </button>
      </div>
    </div>
  );
}

function MarketplaceItemCard({ item, actionBusy, locked, onPurchase, onEquip, equippedKey }) {
  const accentStyle = getCosmeticAccentStyle(item.rarity || 'common');
  const isTitle = item.type === 'title';
  const isOwned = Boolean(item.owned);
  const isEquipped = !isTitle && String(equippedKey || '') === String(item.key || '');
  const actionLabel = !isOwned
    ? `Buy for ${formatTokenCount(item.cost)}`
    : isTitle
      ? 'Owned in Titles'
      : isEquipped
        ? 'Equipped'
        : 'Equip';

  return (
    <div className="rounded-lg border p-4" style={subtlePanelStyle()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isTitle ? (
              <AnimatedTitleText title={item.name} rarity={item.rarity} className="text-sm font-medium" />
            ) : (
              <div className="text-sm font-medium">{item.name}</div>
            )}
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={accentStyle}>
              {item.rarity}
            </span>
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
              {item.type}
            </span>
          </div>
          <div className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {item.description}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Cost</div>
          <div className="mt-1 text-sm font-semibold">{formatTokenCount(item.cost)}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold"
          style={isOwned ? accentStyle : subtlePanelStyle()}
        >
          {isOwned ? 'Owned' : 'Available'}
        </span>
        <button
          type="button"
          disabled={actionBusy || locked || (isOwned && isTitle) || isEquipped}
          onClick={() => {
            if (!isOwned) {
              onPurchase?.(item.key);
              return;
            }
            if (!isTitle) {
              onEquip?.(item);
            }
          }}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={!isOwned || (!isTitle && !isEquipped) ? accentStyle : subtlePanelStyle()}
        >
          {actionBusy ? 'Working...' : actionLabel}
        </button>
      </div>
    </div>
  );
}

function LeaderboardList({ entries, profileUserId, metricLabel = 'Points', metricKey = 'seasonPoints', emptyText = 'No entries yet.' }) {
  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
          {emptyText}
        </div>
      ) : null}

      {entries.map((entry) => {
        const isViewer = String(entry.userId) === String(profileUserId || '');
        return (
          <div
            key={`${metricKey}-${entry.rank}-${entry.userId}`}
            className="grid items-center gap-3 rounded-lg border px-4 py-3"
            style={isViewer ? panelStyle({ borderColor: 'var(--theme-border-strong)' }) : subtlePanelStyle()}
          >
            <div className="grid grid-cols-[40px_minmax(0,1fr)_84px_72px] items-center gap-3">
              <div className="text-sm font-semibold" style={{ color: isViewer ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }}>
                #{entry.rank}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{entry.displayName}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {entry.wins}-{entry.losses}-{entry.draws} • {entry.winRate}% WR
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{metricLabel}</div>
                <div className="text-sm font-semibold">{entry[metricKey] ?? 0}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Best</div>
                <div className="text-sm font-semibold">{entry.bestScore}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchList({ matches, seasonLabel, emptyText, badgeText }) {
  return (
    <div className="space-y-3">
      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
          {emptyText.replace('{seasonLabel}', seasonLabel)}
        </div>
      ) : null}

      {matches.map((match) => (
        <div key={`${match.roomCode}-${match.finishedAt}-${match.opponentId}`} className="grid gap-3 rounded-lg border px-4 py-4 md:grid-cols-[84px_minmax(0,1fr)_108px_88px]" style={subtlePanelStyle()}>
          <div className="flex items-center">
            <ResultPill result={match.result} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{match.opponentName}</span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
                {badgeText}
              </span>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
                {match.tier}
              </span>
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {match.submitted ? 'Submitted relic' : 'Timed out / locked by state'} • {formatRelativeTime(match.finishedAt)}
            </div>
          </div>

          <div className="flex items-center justify-between md:block">
            <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Score</div>
            <div className="text-base font-semibold">{match.score}</div>
          </div>

          <div className="flex items-center justify-between md:block">
            <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Helpful / mistakes</div>
            <div className="text-sm font-medium">{match.helpfulHits} / {match.mistakes}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const BOT_ORDER = ['Svarog Bot', 'Clara Bot'];
const BOT_TIER_ORDER = ['new_player', 'beginner', 'intermediate', 'veteran', 'expert', 'expert_v2'];

function summarizePracticeByBot(matches) {
  const groups = new Map();

  for (const match of Array.isArray(matches) ? matches : []) {
    const name = normalizeBotGroupName(match?.opponentName || 'Bot');
    const current = groups.get(name) || {
      botName: name,
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      totalScore: 0,
      bestScore: 0,
      totalHelpfulHits: 0,
      totalMistakes: 0,
      lastPlayedAt: null,
      lastResult: '',
      submittedMatches: 0,
      tierCounts: {},
    };

    current.matches += 1;
    current.totalScore += Number(match?.score || 0);
    current.bestScore = Math.max(current.bestScore, Number(match?.score || 0));
    current.totalHelpfulHits += Number(match?.helpfulHits || 0);
    current.totalMistakes += Number(match?.mistakes || 0);
    current.submittedMatches += match?.submitted ? 1 : 0;

    const result = String(match?.result || 'draw').toLowerCase();
    if (result === 'win') current.wins += 1;
    else if (result === 'loss') current.losses += 1;
    else current.draws += 1;

    const tierKey = String(match?.tier || 'unknown').trim() || 'unknown';
    current.tierCounts[tierKey] = Number(current.tierCounts[tierKey] || 0) + 1;

    const finishedAt = String(match?.finishedAt || '').trim();
    if (!current.lastPlayedAt || new Date(finishedAt) > new Date(current.lastPlayedAt)) {
      current.lastPlayedAt = finishedAt || current.lastPlayedAt;
      current.lastResult = result;
    }

    groups.set(name, current);
  }

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      winRate: entry.matches > 0 ? Math.round((entry.wins / entry.matches) * 1000) / 10 : 0,
      averageScore: entry.matches > 0 ? Math.round((entry.totalScore / entry.matches) * 10) / 10 : 0,
      averageHelpfulHits: entry.matches > 0 ? Math.round((entry.totalHelpfulHits / entry.matches) * 10) / 10 : 0,
      averageMistakes: entry.matches > 0 ? Math.round((entry.totalMistakes / entry.matches) * 10) / 10 : 0,
      tiers: Object.entries(entry.tierCounts)
        .sort((left, right) => {
          const leftIndex = BOT_TIER_ORDER.indexOf(left[0]);
          const rightIndex = BOT_TIER_ORDER.indexOf(right[0]);
          if (leftIndex === -1 && rightIndex === -1) return left[0].localeCompare(right[0]);
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        })
        .map(([tier, count]) => ({ tier, count })),
    }))
    .sort((left, right) => {
      const leftIndex = BOT_ORDER.indexOf(left.botName);
      const rightIndex = BOT_ORDER.indexOf(right.botName);
      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }
      return right.matches - left.matches;
    });
}

function buildAchievementList({ profile, solvedChallengeCount, generatedClears, bestChallengeScore, practiceByBot }) {
  const competitiveMatches = Number(profile?.competitive?.matches || 0);
  const competitiveWins = Number(profile?.competitive?.wins || 0);
  const seasonPoints = Number(profile?.competitive?.seasonPoints || 0);
  const bestWinStreak = Number(profile?.bestWinStreak || 0);
  const practiceWins = Number(profile?.practice?.wins || 0);
  const claraMatches = Number(practiceByBot.find((entry) => entry.botName === 'Clara Bot')?.matches || 0);
  const svarogMatches = Number(practiceByBot.find((entry) => entry.botName === 'Svarog Bot')?.matches || 0);

  const definitions = [
    {
      key: 'first-duel',
      name: 'First Contact',
      description: 'Finish one competitive room.',
      value: competitiveMatches,
      target: 1,
    },
    {
      key: 'room-breaker',
      name: 'Rank Breaker',
      description: 'Win five competitive rooms.',
      value: competitiveWins,
      target: 5,
    },
    {
      key: 'season-climber',
      name: 'Astral Ascent',
      description: 'Reach 10 season points.',
      value: seasonPoints,
      target: 10,
    },
    {
      key: 'streak-line',
      name: 'Win Sequence',
      description: 'Hold a 3-win competitive streak.',
      value: bestWinStreak,
      target: 3,
    },
    {
      key: 'bot-calibration',
      name: 'Calibration Cycle',
      description: 'Win five bot rooms in season.',
      value: practiceWins,
      target: 5,
    },
    {
      key: 'clara-notes',
      name: 'Clara Field Notes',
      description: 'Finish three Clara Bot rooms.',
      value: claraMatches,
      target: 3,
    },
    {
      key: 'svarog-notes',
      name: 'Svarog Field Notes',
      description: 'Finish three Svarog Bot rooms.',
      value: svarogMatches,
      target: 3,
    },
    {
      key: 'contract-reader',
      name: 'Briefing Accepted',
      description: 'Clear one handcrafted challenge.',
      value: solvedChallengeCount,
      target: 1,
    },
    {
      key: 'solver-route',
      name: 'Route Engraved',
      description: 'Clear five handcrafted challenges.',
      value: solvedChallengeCount,
      target: 5,
    },
    {
      key: 'practice-draft',
      name: 'Proxy Warmup',
      description: 'Clear three generated challenges.',
      value: Number(generatedClears || 0),
      target: 3,
    },
    {
      key: 'sharp-score',
      name: 'Critical Route',
      description: 'Reach 90 challenge score.',
      value: Number(bestChallengeScore || 0),
      target: 90,
      format: 'score',
    },
  ];

  return definitions.map((entry) => ({
    ...entry,
    unlocked: entry.value >= entry.target,
    progressLabel: entry.format === 'score'
      ? `${Number(entry.value || 0).toFixed(1)} / ${entry.target}`
      : `${Math.min(entry.value, entry.target)} / ${entry.target}`,
  }));
}

function buildTitleCatalog({ unlockedTitles, profile, solvedChallengeCount }) {
  const unlocked = new Set((Array.isArray(unlockedTitles) ? unlockedTitles : []).map((entry) => String(entry?.key || '').trim()).filter(Boolean));
  const leaderboardRank = Number(profile?.leaderboardRank || 0);
  const competitiveWins = Number(profile?.competitive?.wins || 0);
  const bestCompetitiveScore = Number(profile?.competitive?.bestScore || 0);
  const practiceWins = Number(profile?.practice?.wins || 0);
  const statusByKey = new Map([
    ['astral-marshal', unlocked.has('astral-marshal') || leaderboardRank === 1],
    ['proxy-prime', unlocked.has('proxy-prime') || (leaderboardRank > 0 && leaderboardRank <= 3)],
    ['leyline-tactician', unlocked.has('leyline-tactician') || (leaderboardRank > 0 && leaderboardRank <= 10)],
    ['ranked-riftwalker', unlocked.has('ranked-riftwalker') || competitiveWins >= 5],
    ['resonium-savant', unlocked.has('resonium-savant') || bestCompetitiveScore >= 90],
    ['svarog-calibrated', unlocked.has('svarog-calibrated') || practiceWins >= 8],
    ['signal-initiate', solvedChallengeCount >= 1],
    ['hollow-cartographer', solvedChallengeCount >= 5],
    ['tracer-sovereign', solvedChallengeCount >= 10],
  ]);

  return Array.from(statusByKey.entries()).map(([key, isUnlocked]) => {
    const definition = getTitleDefinition(key);
    return {
      ...(definition || { key, name: key, requirement: '', rarity: 'common' }),
      unlocked: Boolean(isUnlocked),
    };
  });
}

function normalizeBotGroupName(value) {
  const normalized = String(value || '').trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return 'Bot';
  if (lower.includes('clara') || lower.includes('fair')) return 'Clara Bot';
  if (lower.includes('svarog')) return 'Svarog Bot';
  return normalized;
}

function buildBotSessionTables(matches, summaries) {
  const summaryMap = new Map((Array.isArray(summaries) ? summaries : []).map((entry) => [normalizeBotGroupName(entry?.botName), entry]));
  const groups = new Map([
    ['Svarog Bot', []],
    ['Clara Bot', []],
  ]);

  for (const match of Array.isArray(matches) ? matches : []) {
    const key = normalizeBotGroupName(match?.opponentName);
    const nextRows = groups.get(key) || [];
    nextRows.push({
      ...match,
      opponentName: key,
    });
    groups.set(key, nextRows);
  }

  return ['Svarog Bot', 'Clara Bot'].map((botName) => ({
    botName,
    summary: summaryMap.get(botName) || null,
    matches: (groups.get(botName) || []).slice().sort((left, right) => new Date(right?.finishedAt || 0) - new Date(left?.finishedAt || 0)),
  }));
}

function BotSessionTable({ botName, summary, matches }) {
  const summaryBits = summary
    ? [
        `${summary.wins}-${summary.losses}-${summary.draws}`,
        `${summary.winRate}% WR`,
        `Avg ${summary.averageScore}`,
        `Best ${summary.bestScore}`,
      ]
    : [];

  return (
    <div className="overflow-hidden rounded-lg border" style={subtlePanelStyle()}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--theme-border-soft)' }}>
        <div>
          <div className="text-sm font-semibold">{botName}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
            {summary ? summaryBits.map((bit) => <span key={`${botName}-${bit}`}>{bit}</span>) : <span>No season sessions yet.</span>}
          </div>
        </div>
        {summary ? <ResultPill result={summary.lastResult || 'draw'} /> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-surface-1)' }}>
              <th className="px-4 py-2 text-left font-medium">Result</th>
              <th className="px-4 py-2 text-left font-medium">When</th>
              <th className="px-4 py-2 text-left font-medium">Tier</th>
              <th className="px-4 py-2 text-right font-medium">Score</th>
              <th className="px-4 py-2 text-right font-medium">Hits / Mistakes</th>
              <th className="px-4 py-2 text-left font-medium">End state</th>
            </tr>
          </thead>
        </table>
        <div className={matches.length > 9 ? 'max-h-[432px] overflow-y-auto' : ''}>
          <table className="min-w-full text-sm">
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center" style={{ color: 'var(--theme-text-muted)' }}>
                    No finished sessions recorded against {botName} this season.
                  </td>
                </tr>
              ) : (
                matches.map((match, index) => (
                  <tr key={`${botName}-${match.roomCode}-${match.finishedAt}-${index}`} style={index > 0 ? { borderTop: '1px solid var(--theme-border-soft)' } : undefined}>
                    <td className="px-4 py-3"><ResultPill result={match.result} /></td>
                    <td className="px-4 py-3">{formatRelativeTime(match.finishedAt)}</td>
                    <td className="px-4 py-3">{match.tier}</td>
                    <td className="px-4 py-3 text-right font-semibold">{match.score}</td>
                    <td className="px-4 py-3 text-right">{match.helpfulHits} / {match.mistakes}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>
                      {match.submitted ? 'Submitted relic' : 'Timed out / locked'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AchievementList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
          <div>
            <div className="text-sm font-medium">{item.name}</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.description}</div>
            {item.unlockedAt ? (
              <div className="mt-2 text-[11px]" style={{ color: 'var(--theme-text-soft)' }}>
                Unlocked {formatRelativeTime(item.unlockedAt)}
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold"
              style={item.unlocked
                ? { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.28)' }
                : { background: 'transparent', color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border-soft)' }}
            >
              {item.unlocked ? 'Unlocked' : item.progressLabel}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserProfilePage({ sessionTheme = 'modern' }) {
  const { user, replaceUser, getAuthHeader } = useAuth();
  const { data: seasonData, loading: statsLoading, error: statsError, refresh: refreshStats } = usePvpSeasonStats();
  const { data: challengeData, loading: challengeLoading, error: challengeError, refresh: refreshChallenge } = useChallengeResults();
  const { data: marketplaceData, loading: marketplaceLoading, error: marketplaceError, refresh: refreshMarketplace } = useProfileMarketplace();
  const { stats: presenceStats, refreshPresence } = usePresenceContext();
  const [equippingTitleKey, setEquippingTitleKey] = useState('');
  const [titleActionError, setTitleActionError] = useState('');
  const [claimingRewardKey, setClaimingRewardKey] = useState('');
  const [rewardActionError, setRewardActionError] = useState('');
  const [marketActionKey, setMarketActionKey] = useState('');
  const [marketActionError, setMarketActionError] = useState('');
  const displayName = useMemo(() => resolveAuthDisplayName(user) || 'Trailblazer', [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initial = displayName.charAt(0).toUpperCase() || 'T';
  const equippedTitleKey = useMemo(() => resolveEquippedTitleKeyFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedTitle = useMemo(() => getTitleDefinition(equippedTitleKey), [equippedTitleKey]);
  const equippedCosmetics = useMemo(() => resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedBadgeItem = useMemo(() => getMarketplaceItem(equippedCosmetics.badgeKey), [equippedCosmetics.badgeKey]);
  const equippedNameplateItem = useMemo(() => getMarketplaceItem(equippedCosmetics.nameplateKey), [equippedCosmetics.nameplateKey]);
  const equippedFrameItem = useMemo(() => getMarketplaceItem(equippedCosmetics.frameKey), [equippedCosmetics.frameKey]);
  const memberDirectory = useMemo(() => Array.isArray(presenceStats?.users) ? presenceStats.users : [], [presenceStats?.users]);
  const onlineMembers = useMemo(() => memberDirectory.filter((entry) => entry.status === 'online'), [memberDirectory]);
  const siteOnlineCount = Number(presenceStats?.online || 0);
  const profile = seasonData?.profile || null;
  const progression = profile?.progression || null;
  const rankTier = profile?.rankTier || null;
  const leaderboard = Array.isArray(seasonData?.leaderboard) ? seasonData.leaderboard : [];
  const practiceLeaderboard = Array.isArray(seasonData?.practiceLeaderboard) ? seasonData.practiceLeaderboard : [];
  const rewardTrack = Array.isArray(profile?.rewardTrack) ? profile.rewardTrack : [];
  const claimedRewards = useMemo(() => rewardTrack.filter((entry) => entry.claimed), [rewardTrack]);
  const recentMatches = Array.isArray(profile?.competitiveMatches) ? profile.competitiveMatches : [];
  const practiceMatches = Array.isArray(profile?.practiceMatches) ? profile.practiceMatches : [];
  const seasonLabel = String(seasonData?.season?.label || 'Current season');
  const challengeRows = Array.isArray(challengeData?.rows) ? challengeData.rows : [];
  const challengeDisplayRows = useMemo(() => dedupeChallengeRows(challengeRows), [challengeRows]);
  const solvedContractIds = useMemo(
    () => new Set(challengeDisplayRows.filter((row) => !row?.generated).map((row) => String(row.contract_id || ''))),
    [challengeDisplayRows]
  );
  const totalChallengeContracts = CHALLENGE_CONTRACT_ORDER.length;
  const solvedChallengeCount = solvedContractIds.size;
  const unsolvedChallengeCount = Math.max(0, totalChallengeContracts - solvedChallengeCount);
  const practiceByBot = useMemo(
    () => (Array.isArray(profile?.practiceByBot) && profile.practiceByBot.length > 0 ? profile.practiceByBot : summarizePracticeByBot(practiceMatches)),
    [practiceMatches, profile?.practiceByBot],
  );
  const botSessionTables = useMemo(
    () => buildBotSessionTables(practiceMatches, practiceByBot),
    [practiceByBot, practiceMatches],
  );
  const titleCatalog = useMemo(() => Array.isArray(progression?.titles) ? progression.titles : [], [progression?.titles]);
  const unlockedTitles = useMemo(() => titleCatalog.filter((entry) => entry.unlocked), [titleCatalog]);
  const lockedTitles = useMemo(() => titleCatalog.filter((entry) => !entry.unlocked), [titleCatalog]);
  const achievementList = useMemo(() => Array.isArray(progression?.achievements) ? progression.achievements : [], [progression?.achievements]);
  const unlockedAchievements = useMemo(() => achievementList.filter((entry) => entry.unlocked), [achievementList]);
  const lockedAchievements = useMemo(() => achievementList.filter((entry) => !entry.unlocked), [achievementList]);
  const inventoryReady = progression?.inventoryReady !== false;
  const walletBalance = Number(marketplaceData?.wallet?.tokenBalance || 0);
  const testingGrant = Number(marketplaceData?.wallet?.testingGrant || 0);
  const marketplaceCatalog = useMemo(() => Array.isArray(marketplaceData?.catalog) ? marketplaceData.catalog : [], [marketplaceData?.catalog]);
  const ownedMarketItems = useMemo(() => marketplaceCatalog.filter((entry) => entry.owned), [marketplaceCatalog]);
  const cosmeticMarketItems = useMemo(() => marketplaceCatalog.filter((entry) => entry.type !== 'title' && entry.availableInShop !== false), [marketplaceCatalog]);
  const ownedCosmeticItems = useMemo(() => marketplaceCatalog.filter((entry) => entry.type !== 'title' && entry.owned), [marketplaceCatalog]);
  const marketTitleItems = useMemo(() => marketplaceCatalog.filter((entry) => entry.type === 'title' && entry.availableInShop !== false), [marketplaceCatalog]);
  const marketBusy = marketActionKey !== '';

  const handleEquipTitle = async (nextTitleKey = '') => {
    setEquippingTitleKey(nextTitleKey || 'clear');
    setTitleActionError('');
    try {
      const response = await fetch(buildApiUrl('/api/profile-title'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: nextTitleKey ? 'equip' : 'clear',
          titleKey: nextTitleKey || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to update title.');
      }
      if (payload?.user) {
        const nextUser = nextTitleKey
          ? payload.user
          : {
              ...payload.user,
              user_metadata: {
                ...(payload.user?.user_metadata || {}),
                svarog_equipped_title: null,
              },
            };
        replaceUser?.(nextUser);
      }
      refreshPresence?.();
    } catch (error) {
      setTitleActionError(error?.message || 'Failed to update title.');
    } finally {
      setEquippingTitleKey('');
    }
  };

  const handleClaimReward = async (rewardKey) => {
    const normalizedKey = String(rewardKey || '').trim();
    if (!normalizedKey) return;
    setClaimingRewardKey(normalizedKey);
    setRewardActionError('');
    try {
      const response = await fetch(buildApiUrl('/api/profile-rewards'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ rewardKey: normalizedKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to claim reward.');
      }
      refreshStats?.();
    } catch (error) {
      setRewardActionError(error?.message || 'Failed to claim reward.');
    } finally {
      setClaimingRewardKey('');
    }
  };

  const submitMarketplaceAction = async (body) => {
    const response = await fetch(buildApiUrl('/api/profile-marketplace'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Marketplace action failed.');
    }
    if (payload?.user) {
      replaceUser?.(payload.user);
    }
    await Promise.allSettled([
      refreshMarketplace?.(),
      refreshStats?.(),
      refreshPresence?.(),
    ]);
    return payload;
  };

  const handlePurchaseMarketItem = async (itemKey) => {
    const normalizedKey = String(itemKey || '').trim();
    if (!normalizedKey) return;
    setMarketActionKey(`purchase:${normalizedKey}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({
        action: 'purchase',
        itemKey: normalizedKey,
      });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to purchase item.');
    } finally {
      setMarketActionKey('');
    }
  };

  const handleEquipMarketItem = async (item) => {
    if (!item?.key || !item?.slot || item.type === 'title') return;
    setMarketActionKey(`equip:${item.key}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({
        action: 'equip',
        itemKey: item.key,
        slot: item.slot,
      });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to equip item.');
    } finally {
      setMarketActionKey('');
    }
  };

  const handleClearMarketSlot = async (slot) => {
    const normalizedSlot = String(slot || '').trim();
    if (!normalizedSlot) return;
    setMarketActionKey(`clear:${normalizedSlot}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({
        action: 'clear',
        slot: normalizedSlot,
      });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to clear slot.');
    } finally {
      setMarketActionKey('');
    }
  };

  const leaderboardUserIds = useMemo(() => new Set(leaderboard.map((entry) => String(entry.userId))), [leaderboard]);
  const visibleLeaderboard = useMemo(() => {
    if (!profile?.userId || leaderboardUserIds.has(String(profile.userId))) return leaderboard;
    const fallbackEntry = {
      rank: profile.leaderboardRank || leaderboard.length + 1,
      userId: profile.userId,
      displayName: profile.displayName || displayName,
      seasonPoints: profile.competitive?.seasonPoints || 0,
      matches: profile.competitive?.matches || 0,
      wins: profile.competitive?.wins || 0,
      losses: profile.competitive?.losses || 0,
      draws: profile.competitive?.draws || 0,
      winRate: profile.competitive?.winRate || 0,
      bestScore: profile.competitive?.bestScore || 0,
      averageScore: profile.competitive?.averageScore || 0,
      bestWinStreak: profile.bestWinStreak || 0,
      lastPlayedAt: profile.lastPlayedAt || null,
    };
    return [...leaderboard, fallbackEntry];
  }, [displayName, leaderboard, leaderboardUserIds, profile]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <section className="rounded-xl border p-5 sm:p-6" style={panelStyle()}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border" style={{ ...subtlePanelStyle(), ...getAvatarFrameStyle(equippedFrameItem?.key) }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold">{initial}</span>
                  )}
                </div>
                <div>
                  <UserIdentityBlock
                    name={displayName}
                    title={equippedTitle?.name || ''}
                    rarity={equippedTitle?.rarity || 'common'}
                    badge={equippedBadgeItem?.name || ''}
                    badgeRarity={equippedBadgeItem?.rarity || 'common'}
                    nameplate={equippedNameplateItem?.name || ''}
                    nameplateRarity={equippedNameplateItem?.rarity || 'common'}
                    nameClassName="text-2xl font-semibold sm:text-3xl"
                    titleClassName="mt-1 text-[12px]"
                  />
                  <div className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                    {seasonLabel} PvP season
                    {profile?.leaderboardRank ? ` • Rank #${profile.leaderboardRank}` : ' • Unranked'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RankTierBadge tier={rankTier} />
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium" style={subtlePanelStyle()}>
                      Site online: {siteOnlineCount}
                    </span>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium" style={subtlePanelStyle()}>
                      Members online: {onlineMembers.length}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  refreshPresence?.();
                  refreshStats?.();
                  refreshChallenge?.();
                }}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                style={subtlePanelStyle()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Competitive record"
                value={`${profile?.competitive?.wins || 0}-${profile?.competitive?.losses || 0}-${profile?.competitive?.draws || 0}`}
                hint={`${profile?.competitive?.matches || 0} matches • ${profile?.competitive?.winRate || 0}% win rate`}
                accent
              />
              <StatTile
                label="Season points"
                value={profile?.competitive?.seasonPoints || 0}
                hint={rankTier?.name || seasonData?.season?.pointsRule || '3 for a win, 1 for a draw'}
              />
              <StatTile
                label="Bot room record"
                value={`${profile?.practice?.wins || 0}-${profile?.practice?.losses || 0}-${profile?.practice?.draws || 0}`}
                hint={`${profile?.practice?.matches || 0} bot rooms`}
              />
              <StatTile
                label="Best score"
                value={profile?.competitive?.bestScore || profile?.all?.bestScore || 0}
                hint={`Average ${profile?.competitive?.averageScore || profile?.all?.averageScore || 0}`}
              />
            </div>

            {statsError ? (
              <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                {statsError}
              </div>
            ) : null}
          </section>

          <SectionCard
            title="Season track"
            description="Live rank tier plus claimable seasonal rewards."
            icon={Sparkles}
          >
            <div className="space-y-3">
              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Current tier</div>
                    <div className="mt-2"><RankTierBadge tier={rankTier} /></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Leaderboard</div>
                    <div className="mt-1 text-sm font-semibold">{profile?.leaderboardRank ? `#${profile.leaderboardRank}` : 'Unranked'}</div>
                  </div>
                </div>
              </div>

              {rewardActionError ? (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                  {rewardActionError}
                </div>
              ) : null}

              {rewardTrack.length > 0 ? rewardTrack.map((item) => (
                <RewardTrackRow
                  key={item.key}
                  item={item}
                  claiming={claimingRewardKey === item.key}
                  onClaim={handleClaimReward}
                />
              )) : (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  Reward rules will appear once this account has season activity.
                </div>
              )}

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Claimed inventory</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {claimedRewards.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No claimed season rewards yet.</span>
                  ) : claimedRewards.map((item) => (
                    <span
                      key={`claimed-${item.key}`}
                      className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold"
                      style={getTitleBadgeStyle(item.rarity || 'common')}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <SectionCard
            title="Market"
            description="Wallet, owned cosmetics, and market-only titles. Purchased titles unlock in the Titles section."
            icon={Store}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Tokens"
                  value={formatTokenCount(walletBalance)}
                  hint={testingGrant > 0 ? `Test grant active: ${formatTokenCount(testingGrant)}` : 'Earn more through season rewards later'}
                  accent
                />
                <StatTile
                  label="Owned items"
                  value={ownedMarketItems.length}
                  hint={`${marketTitleItems.filter((entry) => entry.owned).length} titles, ${ownedCosmeticItems.length} cosmetics`}
                />
                <StatTile
                  label="Equipped cosmetics"
                  value={[equippedBadgeItem, equippedNameplateItem, equippedFrameItem].filter(Boolean).length}
                  hint="Frame, badge, nameplate"
                />
              </div>

              {marketActionError ? (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                  {marketActionError}
                </div>
              ) : null}

              {marketplaceError ? (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                  {marketplaceError}
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-3">
                <EquippedCosmeticRow
                  label="Frame"
                  item={equippedFrameItem}
                  clearing={marketActionKey === 'clear:frame'}
                  locked={marketBusy}
                  onClear={() => handleClearMarketSlot('frame')}
                />
                <EquippedCosmeticRow
                  label="Badge"
                  item={equippedBadgeItem}
                  clearing={marketActionKey === 'clear:badge'}
                  locked={marketBusy}
                  onClear={() => handleClearMarketSlot('badge')}
                />
                <EquippedCosmeticRow
                  label="Nameplate"
                  item={equippedNameplateItem}
                  clearing={marketActionKey === 'clear:nameplate'}
                  locked={marketBusy}
                  onClear={() => handleClearMarketSlot('nameplate')}
                />
              </div>

              {marketplaceLoading && marketplaceCatalog.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  Loading market inventory...
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {marketplaceCatalog.map((item) => {
                  const equippedKey = item.slot === 'frame'
                    ? equippedFrameItem?.key
                    : item.slot === 'badge'
                      ? equippedBadgeItem?.key
                      : item.slot === 'nameplate'
                        ? equippedNameplateItem?.key
                        : '';
                  return (
                    <MarketplaceItemCard
                      key={item.key}
                      item={item}
                      actionBusy={marketActionKey === `purchase:${item.key}` || marketActionKey === `equip:${item.key}`}
                      locked={marketBusy}
                      onPurchase={handlePurchaseMarketItem}
                      onEquip={handleEquipMarketItem}
                      equippedKey={equippedKey}
                    />
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Owned loadout"
            description="What this account already owns from the market and seasonal track."
            icon={Wallet}
          >
            <div className="space-y-4">
              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Market titles</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {marketTitleItems.filter((entry) => entry.owned).length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No market titles owned yet.</span>
                  ) : marketTitleItems.filter((entry) => entry.owned).map((item) => (
                    <div key={`owned-title-${item.key}`} className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={getTitleBadgeStyle(item.rarity || 'common')}>
                      <AnimatedTitleText title={item.name} rarity={item.rarity} className="text-[11px]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Cosmetic inventory</div>
                <div className="mt-3 space-y-2">
                  {ownedCosmeticItems.length === 0 ? (
                    <div className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No cosmetic items owned yet.</div>
                  ) : ownedCosmeticItems.map((item) => (
                    <div key={`owned-cosmetic-${item.key}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={subtlePanelStyle()}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.type}</div>
                      </div>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getCosmeticAccentStyle(item.rarity)}>
                        {item.rarity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Season rewards claimed</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {claimedRewards.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No claimed rewards yet.</span>
                  ) : claimedRewards.map((item) => (
                    <span key={`inventory-${item.key}`} className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={getTitleBadgeStyle(item.rarity || 'common')}>
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)]">
          <SectionCard
            title="Recent PvP results"
            description="Finished human-vs-human rooms for this season. These are the ones that count toward standings."
            icon={Target}
          >
            {statsLoading && recentMatches.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                Loading season results...
              </div>
            ) : (
              <MatchList
                matches={recentMatches}
                seasonLabel={seasonLabel}
                badgeText="Competitive"
                emptyText="No finished PvP rooms recorded for this account in {seasonLabel}."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Season leaderboard"
            description="Competitive standings only. Bot rooms stay out of the ladder."
            icon={Crown}
          >
            <LeaderboardList
              entries={visibleLeaderboard}
              profileUserId={profile?.userId}
              metricLabel="Points"
              metricKey="seasonPoints"
              emptyText="No competitive PvP rooms have closed yet this season."
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <SectionCard
            title="Bot rooms"
            description="Compact bot-season readout. Finished bot rooms roll into profile without needing a long room log."
            icon={Target}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <StatTile label="Bot rooms" value={profile?.practice?.matches || 0} hint={`${profile?.practice?.wins || 0} wins`} accent />
              <StatTile label="Bot win rate" value={`${profile?.practice?.winRate || 0}%`} hint={`Best ${profile?.practice?.bestScore || 0}`} />
              <StatTile label="Average score" value={profile?.practice?.averageScore || 0} hint={`Helpful hits ${profile?.practice?.averageHelpfulHits || 0}`} />
            </div>

            {Number(seasonData?.summary?.archivedBotRooms || 0) > 0 ? (
              <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={subtlePanelStyle()}>
                {seasonData.summary.archivedBotRooms} bot rooms already moved out of the live room table for this season.
              </div>
            ) : null}

            <div className="space-y-4">
              {botSessionTables.map((botTable) => (
                <BotSessionTable
                  key={botTable.botName}
                  botName={botTable.botName}
                  summary={botTable.summary}
                  matches={botTable.matches}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Bot leaderboard"
            description="Bot-room standings only. Useful for testing and consistency outside ranked rooms."
            icon={Crown}
          >
            <LeaderboardList
              entries={practiceLeaderboard}
              profileUserId={profile?.userId}
              metricLabel="Avg"
              metricKey="averageScore"
              emptyText="No bot rooms have closed yet this season."
            />
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SectionCard
            title="Challenge ladder"
            description="Handcrafted solver contracts cleared this season. Generated practice contracts are tracked separately."
            icon={Sparkles}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <StatTile label="Solved" value={solvedChallengeCount} hint={`${totalChallengeContracts} total`} accent />
              <StatTile label="Unsolved" value={unsolvedChallengeCount} hint="Handcrafted contracts left" />
              <StatTile label="Best challenge score" value={challengeData?.summary?.bestScore || 0} hint={`Fastest ${challengeData?.summary?.fastestClearSeconds ?? '--'}s`} />
              <StatTile label="Generated clears" value={challengeData?.summary?.generatedClears || 0} hint="Practice-only clears" />
            </div>

            {challengeError ? (
              <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                {challengeError}
              </div>
            ) : null}

            <div className="space-y-3">
              {challengeLoading && challengeDisplayRows.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  Loading challenge results...
                </div>
              ) : null}

              {!challengeLoading && challengeDisplayRows.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  No challenge clears recorded yet for this account.
                </div>
              ) : null}

              {challengeDisplayRows.slice(0, 8).map((row) => (
                <div key={`${row.id}-${row.contract_id}`} className="grid gap-3 rounded-lg border px-4 py-4 md:grid-cols-[minmax(0,1fr)_86px_86px_86px]" style={subtlePanelStyle()}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{row.contract_title}</span>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
                        {row.generated ? 'Generated' : 'Ladder'}
                      </span>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
                        {row.difficulty}
                      </span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {row.seed_label || 'No seed'} • {formatRelativeTime(row.created_at)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Score</div>
                    <div className="text-sm font-semibold">{row.score}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Grade</div>
                    <div className="text-sm font-semibold">{row.grade}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Time</div>
                    <div className="text-sm font-semibold">{row.clear_time_seconds > 0 ? `${row.clear_time_seconds}s` : '--'}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Titles"
            description="Persistent season titles. Equip one and it follows your name across the site."
            icon={BadgeCheck}
          >
            <div className="space-y-3">
              {titleActionError ? (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>
                  {titleActionError}
                </div>
              ) : null}

              {!inventoryReady ? (
                <div className="rounded-lg border px-4 py-3 text-sm" style={subtlePanelStyle()}>
                  Progression inventory is still syncing. If this is the first run, apply `docs/supabase-user-progression.sql` and refresh once.
                </div>
              ) : null}

              {titleCatalog.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  No titles unlocked yet. The first ones come from leaderboard placement, 5 competitive wins, and a 90+ duel score.
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Unlocked</div>
                  {unlockedTitles.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                      No unlocked titles yet.
                    </div>
                  ) : unlockedTitles.map((title) => (
                    <div key={title.key} className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border" style={subtlePanelStyle({ color: 'var(--theme-accent)' })}>
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <AnimatedTitleText title={title.name} rarity={title.rarity} className="text-sm font-medium" />
                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getTitleBadgeStyle(title.rarity)}>
                              {title.rarity}
                            </span>
                            {equippedTitleKey === title.key ? (
                              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getTitleBadgeStyle(title.rarity)}>
                                Equipped
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{title.requirement}</div>
                          <div className="mt-2 text-[11px]" style={{ color: 'var(--theme-text-soft)' }}>
                            {title.unlockedAt ? `Unlocked ${formatRelativeTime(title.unlockedAt)}` : 'Unlocked this season'}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={equippingTitleKey !== '' || equippedTitleKey === title.key}
                          onClick={() => handleEquipTitle(title.key)}
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          style={equippedTitleKey === title.key ? getTitleBadgeStyle(title.rarity) : subtlePanelStyle()}
                        >
                          {equippedTitleKey === title.key ? 'Equipped' : equippingTitleKey === title.key ? 'Equipping...' : 'Equip'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Locked</div>
                  {lockedTitles.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                      Full title catalog complete for this account.
                    </div>
                  ) : lockedTitles.map((title) => (
                    <div key={title.key} className="rounded-lg border px-4 py-4" style={subtlePanelStyle({ opacity: 0.88 })}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border" style={subtlePanelStyle()}>
                          <Trophy className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <AnimatedTitleText title={title.name} rarity={title.rarity} className="text-sm font-medium" />
                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getTitleBadgeStyle(title.rarity)}>
                              {title.rarity}
                            </span>
                          </div>
                          <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{title.requirement}</div>
                        </div>
                        <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border-soft)' }}>
                          Locked
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {equippedTitleKey ? (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
                  <div>
                    <div className="text-sm font-medium">Current equipped title</div>
                    <AnimatedTitleText title={equippedTitle?.name || ''} rarity={equippedTitle?.rarity || 'common'} className="mt-1 text-xs" />
                  </div>
                  <button
                    type="button"
                    disabled={equippingTitleKey !== ''}
                    onClick={() => handleEquipTitle('')}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    style={subtlePanelStyle()}
                  >
                    {equippingTitleKey === 'clear' ? 'Clearing...' : 'Clear'}
                  </button>
                </div>
              ) : null}

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Streaks</div>
                <div className="mt-2 flex items-center justify-between">
                  <span style={{ color: 'var(--theme-text-muted)' }}>Competitive win streak</span>
                  <span className="font-semibold">{profile?.currentWinStreak || 0}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span style={{ color: 'var(--theme-text-muted)' }}>Best season streak</span>
                  <span className="font-semibold">{profile?.bestWinStreak || 0}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Achievements"
            description="Persistent unlocks for ranked rooms, bot practice, and handcrafted solver clears."
            icon={Target}
          > 
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-medium">Unlocked</div>
                {unlockedAchievements.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                    No achievements unlocked yet.
                  </div>
                ) : (
                  <AchievementList items={unlockedAchievements} />
                )}
              </div>
              <div>
                <div className="mb-3 text-sm font-medium">In progress</div>
                {lockedAchievements.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                    Everything in the current achievement set is unlocked.
                  </div>
                ) : (
                  <AchievementList items={lockedAchievements} />
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Member presence"
            description="Authenticated members only. Site online includes anonymous sessions too."
            icon={Users}
            action={(
              <button
                type="button"
                onClick={() => refreshPresence?.()}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                style={subtlePanelStyle()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            )}
          >
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <StatTile label="Members online" value={onlineMembers.length} hint={`${memberDirectory.length} tracked`} accent />
              <StatTile label="Site online" value={siteOnlineCount} hint="Anonymous + authenticated" />
              <StatTile label="Season rooms" value={seasonData?.summary?.competitiveRooms || 0} hint="Competitive only" />
            </div>

            <div className="space-y-3">
              {memberDirectory.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  No member presence data yet.
                </div>
              ) : null}

              {memberDirectory.slice(0, 10).map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border" style={{ ...subtlePanelStyle(), ...getAvatarFrameStyle(member.frameKey) }}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold">{getInitials(member.displayName)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <UserIdentityBlock
                            name={member.displayName}
                            title={member.titleLabel || ''}
                            rarity={member.titleRarity || 'common'}
                            badge={member.badgeLabel || ''}
                            badgeRarity={member.badgeRarity || 'common'}
                            nameplate={member.nameplateLabel || ''}
                            nameplateRarity={member.nameplateRarity || 'common'}
                            nameClassName="truncate text-sm font-medium"
                            titleClassName="mt-0.5 text-[10px]"
                          />
                        </div>
                        {member.role === 'admin' ? (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={{ borderColor: 'rgba(245, 158, 11, 0.28)', background: 'rgba(245, 158, 11, 0.10)', color: '#fcd34d' }}>
                            Admin
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                        {member.status === 'online'
                          ? `Browsing: ${resolvePresenceArea(member.pagePath)}`
                          : `Last seen ${member.lastSeenAt ? new Date(member.lastSeenAt).toLocaleString() : 'recently'}`}
                      </div>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize"
                    style={member.status === 'online'
                      ? { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.28)' }
                      : { background: 'transparent', color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border-soft)' }}
                  >
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <footer className="rounded-xl border px-5 py-4 text-sm" style={subtlePanelStyle()}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4" style={{ color: 'var(--theme-accent)' }} />
              <span style={{ color: 'var(--theme-text-muted)' }}>
                Season stats, bot summaries, challenge ladders, titles, and achievements now sync into the live progression inventory.
              </span>
            </div>
            <span style={{ color: 'var(--theme-text-soft)' }}>
              {sessionTheme} theme • {seasonData?.summary?.competitiveRooms || 0} competitive rooms tracked
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}


