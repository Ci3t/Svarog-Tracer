import React, { useMemo, useState } from 'react';
import { RefreshCw, Swords, Bot, ScrollText, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { useChallengeLeaderboard } from '../hooks/useChallengeLeaderboard';

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

function formatClearTime(value) {
  const seconds = Number(value || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function SectionCard({ title, description, icon: Icon, children, action }) {
  return (
    <section className="rounded-xl border p-5 sm:p-6" style={panelStyle()}>
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
      {hint ? <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-soft)' }}>{hint}</div> : null}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors"
      style={active
        ? { borderColor: 'var(--theme-border-strong)', background: 'var(--theme-accent-soft)', color: 'var(--theme-text-primary)' }
        : subtlePanelStyle({ color: 'var(--theme-text-muted)' })}
    >
      {children}
    </button>
  );
}

function TableShell({ children, emptyText, hasRows }) {
  if (!hasRows) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={subtlePanelStyle()}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function CompetitiveTable({ rows, viewerUserId, metricLabel, metricKey }) {
  return (
    <TableShell hasRows={rows.length > 0} emptyText="No ranked rooms finished this season yet.">
      <table className="min-w-full text-left text-sm">
        <thead style={{ color: 'var(--theme-text-muted)' }}>
          <tr className="border-b" style={{ borderColor: 'var(--theme-border-soft)' }}>
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium">Record</th>
            <th className="px-4 py-3 font-medium">{metricLabel}</th>
            <th className="px-4 py-3 font-medium">Best</th>
            <th className="px-4 py-3 font-medium">Last played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isViewer = String(row.userId) === String(viewerUserId || '');
            return (
              <tr key={`${metricKey}-${row.rank}-${row.userId}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--theme-border-soft)', background: isViewer ? 'var(--theme-accent-soft)' : 'transparent' }}>
                <td className="px-4 py-3 font-semibold">#{row.rank}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.displayName}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{row.winRate}% win rate</div>
                </td>
                <td className="px-4 py-3">{row.wins}-{row.losses}-{row.draws}</td>
                <td className="px-4 py-3 font-semibold">{row[metricKey] ?? 0}</td>
                <td className="px-4 py-3">{row.bestScore}</td>
                <td className="px-4 py-3">{formatRelativeTime(row.lastPlayedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

function ChallengePlayersTable({ rows, viewerUserId }) {
  return (
    <TableShell hasRows={rows.length > 0} emptyText="No handcrafted challenge clears tracked this season yet.">
      <table className="min-w-full text-left text-sm">
        <thead style={{ color: 'var(--theme-text-muted)' }}>
          <tr className="border-b" style={{ borderColor: 'var(--theme-border-soft)' }}>
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium">Solved</th>
            <th className="px-4 py-3 font-medium">Avg score</th>
            <th className="px-4 py-3 font-medium">Best</th>
            <th className="px-4 py-3 font-medium">Fastest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isViewer = String(row.userId) === String(viewerUserId || '');
            return (
              <tr key={`challenge-${row.rank}-${row.userId}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--theme-border-soft)', background: isViewer ? 'var(--theme-accent-soft)' : 'transparent' }}>
                <td className="px-4 py-3 font-semibold">#{row.rank}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.displayName}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{formatRelativeTime(row.lastPlayedAt)}</div>
                </td>
                <td className="px-4 py-3 font-semibold">{row.solvedCount}</td>
                <td className="px-4 py-3">{row.averageScore}</td>
                <td className="px-4 py-3">{row.bestScore}</td>
                <td className="px-4 py-3">{formatClearTime(row.fastestClearSeconds)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

function ContractBestsTable({ rows, viewerUserId }) {
  return (
    <TableShell hasRows={rows.length > 0} emptyText="No best contract clears available yet.">
      <table className="min-w-full text-left text-sm">
        <thead style={{ color: 'var(--theme-text-muted)' }}>
          <tr className="border-b" style={{ borderColor: 'var(--theme-border-soft)' }}>
            <th className="px-4 py-3 font-medium">Level</th>
            <th className="px-4 py-3 font-medium">Winner</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Grade</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isViewer = String(row.userId) === String(viewerUserId || '');
            return (
              <tr key={`contract-${row.contractId}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--theme-border-soft)', background: isViewer ? 'var(--theme-accent-soft)' : 'transparent' }}>
                <td className="px-4 py-3">
                  <div className="font-medium">{row.contractTitle}</div>
                  <div className="mt-1 text-xs capitalize" style={{ color: 'var(--theme-text-muted)' }}>{row.difficulty}</div>
                </td>
                <td className="px-4 py-3">{row.displayName}</td>
                <td className="px-4 py-3 font-semibold">{row.score}</td>
                <td className="px-4 py-3">{row.grade}</td>
                <td className="px-4 py-3">{formatClearTime(row.clearTimeSeconds)}</td>
                <td className="px-4 py-3">{formatRelativeTime(row.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('competitive');
  const { data: seasonData, loading: seasonLoading, error: seasonError, refresh: refreshSeason } = usePvpSeasonStats();
  const { data: challengeData, loading: challengeLoading, error: challengeError, refresh: refreshChallenge } = useChallengeLeaderboard(20);

  const season = seasonData?.season || challengeData?.season || null;
  const summary = seasonData?.summary || {};
  const challengeSummary = challengeData?.summary || {};
  const competitiveRows = useMemo(() => Array.isArray(seasonData?.leaderboard) ? seasonData.leaderboard : [], [seasonData?.leaderboard]);
  const practiceRows = useMemo(() => Array.isArray(seasonData?.practiceLeaderboard) ? seasonData.practiceLeaderboard : [], [seasonData?.practiceLeaderboard]);
  const challengeRows = useMemo(() => Array.isArray(challengeData?.leaderboard) ? challengeData.leaderboard : [], [challengeData?.leaderboard]);
  const contractRows = useMemo(() => Array.isArray(challengeData?.contracts) ? challengeData.contracts : [], [challengeData?.contracts]);
  const loading = seasonLoading || challengeLoading;
  const error = seasonError || challengeError;

  const statTiles = useMemo(() => {
    if (activeTab === 'competitive') {
      return [
        { label: 'Tracked ranked players', value: summary.trackedPlayers || 0, hint: `${summary.competitiveRooms || 0} ranked rooms` },
        { label: 'Finished rooms', value: summary.finishedRooms || 0, hint: `${summary.practiceRooms || 0} bot rooms archived/live` },
        { label: 'Season label', value: season?.label || '--', hint: season?.pointsRule || 'Season scoring active' },
      ];
    }
    if (activeTab === 'practice') {
      return [
        { label: 'Bot players', value: practiceRows.length, hint: `${summary.practiceRooms || 0} bot rooms` },
        { label: 'Archived bot rooms', value: summary.archivedBotRooms || 0, hint: 'Moved out of live room storage' },
        { label: 'Tracked players', value: summary.trackedPlayers || 0, hint: season?.label || 'Current season' },
      ];
    }
    return [
      { label: 'Challenge players', value: challengeSummary.trackedPlayers || 0, hint: `${challengeSummary.handcraftedClears || 0} handcrafted clears` },
      { label: 'Tracked levels', value: challengeSummary.trackedContracts || 0, hint: `${challengeSummary.generatedClears || 0} generated clears excluded` },
      { label: 'Season label', value: season?.label || '--', hint: 'Best clear per contract drives the ladder' },
    ];
  }, [activeTab, challengeSummary.generatedClears, challengeSummary.handcraftedClears, challengeSummary.trackedContracts, challengeSummary.trackedPlayers, practiceRows.length, season?.label, season?.pointsRule, summary.archivedBotRooms, summary.competitiveRooms, summary.finishedRooms, summary.practiceRooms, summary.trackedPlayers]);

  const handleRefresh = async () => {
    await Promise.allSettled([refreshSeason?.(), refreshChallenge?.()]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-xl border px-5 py-6 sm:px-6" style={panelStyle()}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Season tracking</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Leaderboards</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--theme-text-muted)' }}>
              Ranked PvP, bot practice, and handcrafted challenge clears in one place. This page is the public season read, separate from your profile inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            style={subtlePanelStyle()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton active={activeTab === 'competitive'} onClick={() => setActiveTab('competitive')}>
            <span className="inline-flex items-center gap-2"><Swords className="h-4 w-4" /> Competitive</span>
          </TabButton>
          <TabButton active={activeTab === 'practice'} onClick={() => setActiveTab('practice')}>
            <span className="inline-flex items-center gap-2"><Bot className="h-4 w-4" /> Bot Practice</span>
          </TabButton>
          <TabButton active={activeTab === 'challenge'} onClick={() => setActiveTab('challenge')}>
            <span className="inline-flex items-center gap-2"><ScrollText className="h-4 w-4" /> Challenges</span>
          </TabButton>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ ...panelStyle(), borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' }}>
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {statTiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} hint={tile.hint} accent={tile.label === 'Season label'} />
        ))}
      </section>

      {activeTab === 'competitive' ? (
        <SectionCard
          title="Competitive ladder"
          description="Human-vs-human rooms only. Season points break ties before score and volume."
          icon={Trophy}
        >
          <CompetitiveTable rows={competitiveRows} viewerUserId={user?.id} metricLabel="Points" metricKey="seasonPoints" />
        </SectionCard>
      ) : null}

      {activeTab === 'practice' ? (
        <SectionCard
          title="Bot practice ladder"
          description="Clara Bot and Svarog Bot rooms only. Sorted by wins, then win rate, then average score."
          icon={Bot}
        >
          <CompetitiveTable rows={practiceRows} viewerUserId={user?.id} metricLabel="Wins" metricKey="wins" />
        </SectionCard>
      ) : null}

      {activeTab === 'challenge' ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="Challenge player ladder"
            description="Best handcrafted clear per level for each player. Generated practice clears do not affect rank."
            icon={ScrollText}
          >
            <ChallengePlayersTable rows={challengeRows} viewerUserId={user?.id} />
          </SectionCard>

          <SectionCard
            title="Best level clears"
            description="Current season best holder for each handcrafted challenge level."
            icon={Trophy}
          >
            <ContractBestsTable rows={contractRows} viewerUserId={user?.id} />
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
