import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  Swords, 
  Bot, 
  ScrollText, 
  Trophy, 
  Target, 
  Monitor, 
  Cpu, 
  Waves, 
  Zap, 
  Triangle, 
  ShieldAlert, 
  Layers,
  ArrowUpRight,
  TrendingUp,
  History,
  Activity,
  Award,
  Gamepad2,
  Users
} from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { useChallengeLeaderboard } from '../hooks/useChallengeLeaderboard';

/* HELPER: Formatting */
function formatRelativeTime(value) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : date.toLocaleDateString();
}

function formatClearTime(value) {
  const seconds = Number(value || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/*                               CORE UI MODULES                              */
/* -------------------------------------------------------------------------- */

const RankingPodium = ({ top3, metricKey, metricLabel, title }) => {
  const podiumRef = useRef(null);

  useEffect(() => {
    if (!podiumRef.current) return;
    gsap.from(podiumRef.current.children, {
      opacity: 0,
      y: 40,
      scale: 0.9,
      duration: 1,
      stagger: 0.15,
      ease: "elastic.out(1, 0.8)",
    });
  }, [top3]);

  if (!top3 || top3.length === 0) return null;

  // Rearranges Top 3 for visual hierarchy [Rank 2, Rank 1, Rank 3]
  const ordered = [top3[1] || null, top3[0] || null, top3[2] || null].filter(Boolean);

  const getRankAura = (rank) => {
    if (rank === 1) return { border: 'rgba(234, 179, 8, 0.4)', shadow: 'rgba(234, 179, 8, 0.2)', text: '#facc15' }; // Gold
    if (rank === 2) return { border: 'rgba(203, 213, 225, 0.3)', shadow: 'rgba(203, 213, 225, 0.15)', text: '#e2e8f0' }; // Silver
    if (rank === 3) return { border: 'rgba(120, 113, 108, 0.3)', shadow: 'rgba(120, 113, 108, 0.15)', text: '#d6d3d1' }; // Bronze
    return { border: 'rgba(255, 255, 255, 0.1)', shadow: 'transparent', text: '#94a3b8' };
  };

  return (
    <div ref={podiumRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
      {ordered.map((player, idx) => {
        const aura = getRankAura(player.rank);
        const isMain = player.rank === 1;
        return (
          <div 
            key={player.userId}
            className={`relative group rounded-3xl border bg-black/60 p-8 backdrop-blur-2xl transition-all duration-500 overflow-hidden ${isMain ? 'md:order-2 md:-translate-y-4' : idx === 0 ? 'md:order-1' : 'md:order-3'}`}
            style={{ borderColor: aura.border, boxShadow: `0 0 30px ${aura.shadow}` }}
          >
            {/* Rank Visual */}
            <div className="absolute top-4 right-6 font-['Orbitron'] text-4xl font-black italic opacity-20 select-none group-hover:opacity-40 transition-opacity" style={{ color: aura.text }}>
              #{player.rank}
            </div>

            {/* Glowing Accent */}
            <div className="absolute -top-10 -left-10 h-32 w-32 blur-[60px] opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity" style={{ backgroundColor: aura.text }} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 h-20 w-20 rounded-full border-2 bg-slate-900 border-white/10 flex items-center justify-center font-['Orbitron'] text-xl font-bold text-white shadow-xl">
                {player.displayName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-black uppercase tracking-[0.15em] text-white italic truncate max-w-full">{player.displayName}</h3>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{player.rank === 1 ? 'Season Leader' : `Top ${player.rank}`}</div>

              <div className="mt-8 flex flex-col gap-1 w-full p-4 rounded-xl border border-white/5 bg-white/[0.03]">
                <div className="text-[9px] uppercase tracking-widest text-slate-500">{metricLabel}</div>
                <div className="font-['Orbitron'] text-2xl font-black" style={{ color: aura.text }}>{Number(player[metricKey] || 0).toLocaleString()}</div>
              </div>
              <div className="mt-4 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black">Verified Season Data</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TacticalTicker = ({ text }) => (
  <div className="fixed bottom-0 left-0 right-0 z-50 h-8 flex items-center bg-black/80 backdrop-blur-md border-t border-white/5 overflow-hidden group">
    <div className="absolute left-0 top-0 bottom-0 px-4 bg-[var(--theme-accent)] flex items-center gap-2 z-10">
      <Activity className="h-3.5 w-3.5 text-white animate-pulse" />
      <span className="font-['Orbitron'] text-[10px] font-black text-white uppercase tracking-widest">Live Ladder Feed</span>
    </div>
    <div className="flex whitespace-nowrap px-4 animate-marquee group-hover:pause">
      {[...Array(5)].map((_, i) => (
        <span key={i} className="mx-8 font-mono text-[10px] uppercase text-slate-400 tracking-wider">
          {text} • STATUS: LIVE • TOTAL LOGS: {Math.floor(Math.random() * 10000)} • TRACKER: SVAROG
        </span>
      ))}
    </div>
    <style>{`
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-marquee {
        animation: marquee 40s linear infinite;
        display: inline-flex;
      }
      .group:hover .animate-marquee {
        animation-play-state: paused;
      }
    `}</style>
  </div>
);

const HUDTable = ({ rows, viewerUserId, metricKey, metricLabel, emptyText, type }) => {
  const tableRef = useRef(null);

  useEffect(() => {
    if (!tableRef.current) return;
    gsap.from(tableRef.current.querySelectorAll('tr[data-rank-row]'), {
      opacity: 0,
      x: -20,
      duration: 1,
      stagger: 0.05,
      ease: "power2.out",
    });
  }, [rows]);

  if (!rows || rows.length === 0) {
    return (
      <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 bg-black/20 rounded-2xl border border-white/5">
        No leaderboard data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl">
      <table className="w-full text-left border-separate border-spacing-y-2 p-4" ref={tableRef}>
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-6">
            <th className="pb-4 pl-6">Rank</th>
            <th className="pb-4">Operator</th>
            <th className="pb-4">{type === 'challenge' ? 'Solved' : 'Record'}</th>
            <th className="pb-4 text-center">{metricLabel}</th>
            <th className="pb-4 text-center">Efficiency</th>
            <th className="pb-4 pr-6 text-right">Last Sync</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isViewer = String(row.userId) === String(viewerUserId || '');
            const score = type === 'challenge' ? row.solvedCount : row[metricKey];
            const meta = type === 'challenge' ? `Avg Score ${row.averageScore}` : `${row.wins}-${row.losses}-${row.draws}`;

            return (
              <tr 
                key={`${row.userId}-${row.rank}`}
                data-rank-row="true"
                className={`group transition-all duration-300 ${isViewer ? 'bg-[var(--theme-accent-soft)]/20 border-white/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
              >
                <td className="py-5 pl-6 rounded-l-2xl border-y border-l border-inherit">
                  <div className="flex items-center gap-3">
                    <span className={`font-['Orbitron'] text-xs font-black ${row.rank <= 3 ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>#{row.rank}</span>
                    {isViewer && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />}
                  </div>
                </td>
                <td className="py-5 border-y border-inherit">
                  <div className="font-['Orbitron'] text-[11px] font-black uppercase tracking-widest text-white">{row.displayName}</div>
                  {(row.displayTitle || row.displayBadge) && (
                    <div className="mt-0.5 flex items-center gap-2">
                      {row.displayBadge && (
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                          row.displayBadgeRarity === 'mythic' ? 'border-purple-400/40 bg-purple-500/10 text-purple-300' :
                          row.displayBadgeRarity === 'legendary' ? 'border-amber-400/40 bg-amber-500/10 text-amber-300' :
                          row.displayBadgeRarity === 'epic' ? 'border-violet-400/40 bg-violet-500/10 text-violet-300' :
                          'border-white/10 bg-white/5 text-slate-400'
                        }`}>{row.displayBadge}</span>
                      )}
                      {row.displayTitle && (
                        <span className={`text-[9px] font-semibold italic ${
                          row.displayTitleRarity === 'mythic' ? 'text-purple-300' :
                          row.displayTitleRarity === 'legendary' ? 'text-amber-300' :
                          row.displayTitleRarity === 'epic' ? 'text-violet-300' :
                          'text-slate-500'
                        }`}>{row.displayTitle}</span>
                      )}
                    </div>
                  )}
                  {isViewer && <div className="text-[8px] font-bold text-[var(--theme-accent)] uppercase tracking-tighter mt-0.5">You</div>}
                </td>
                <td className="py-5 border-y border-inherit text-[10px] font-bold text-slate-400 italic">{meta || 'No data'}</td>
                <td className="py-5 border-y border-inherit text-center">
                  <span className={`font-['Orbitron'] text-sm font-black ${isViewer ? 'text-[var(--theme-accent)]' : 'text-white'}`}>{Number(score || 0).toLocaleString()}</span>
                </td>
                <td className="py-5 border-y border-inherit text-center">
                  <div className="text-[10px] font-bold text-slate-300">{type === 'challenge' ? (row.grade || 'C-') : `${row.winRate}% WR`}</div>
                </td>
                <td className="py-5 pr-6 rounded-r-2xl border-y border-r border-inherit text-right text-[10px] font-mono text-slate-600 tracking-tighter">
                  {formatRelativeTime(row.lastPlayedAt || row.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('competitive');
  const { data: seasonData, loading: seasonLoading, error: seasonError, refresh: refreshSeason } = usePvpSeasonStats();
  const { data: challengeData, loading: challengeLoading, error: challengeError, refresh: refreshChallenge } = useChallengeLeaderboard(50);

  const season = seasonData?.season || challengeData?.season || null;
  const summary = seasonData?.summary || {};
  const challengeSummary = challengeData?.summary || {};
  
  const competitiveRows = useMemo(() => Array.isArray(seasonData?.leaderboard) ? seasonData.leaderboard : [], [seasonData?.leaderboard]);
  const botRows = useMemo(() => Array.isArray(seasonData?.practiceLeaderboard) ? seasonData.practiceLeaderboard : [], [seasonData?.practiceLeaderboard]);
  const challengeRows = useMemo(() => Array.isArray(challengeData?.leaderboard) ? challengeData.leaderboard : [], [challengeData?.leaderboard]);
  const loading = seasonLoading || challengeLoading;

  const currentConfig = useMemo(() => {
    if (activeTab === 'competitive') return { rows: competitiveRows, metricLabel: 'Points', metricKey: 'seasonPoints', type: 'pvp' };
    if (activeTab === 'practice') return { rows: botRows, metricLabel: 'Wins', metricKey: 'wins', type: 'bot' };
    return { rows: challengeRows, metricLabel: 'Solved', metricKey: 'solvedCount', type: 'challenge' };
  }, [activeTab, competitiveRows, botRows, challengeRows]);

  const handleRefresh = async () => {
    await Promise.allSettled([refreshSeason?.(), refreshChallenge?.()]);
  };

  const categories = [
    { id: 'competitive', label: 'Ranked PvP', icon: Swords },
    { id: 'practice', label: 'Bot Rooms', icon: Bot },
    { id: 'challenge', label: 'Solver Ladder', icon: ScrollText },
  ];

  const tickerText = useMemo(() => {
    const topPlayer = currentConfig.rows[0]?.displayName || '---';
    return `CURRENT LEADER: ${topPlayer} • SEASON: ${season?.label || 'UNKNOWN'} • SOURCE: LIVE`;
  }, [currentConfig.rows, season]);

  return (
    <div className="min-h-screen relative bg-transparent px-4 py-8 sm:px-8 lg:px-12 pb-20">
      {/* Ambience particles */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[10%] -left-20 h-[500px] w-[500px] rounded-full bg-[var(--theme-accent-soft)] blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] -right-20 h-[500px] w-[500px] rounded-full bg-slate-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="relative">
            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-[var(--theme-accent)]" />
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Season Overview</div>
            <h1 className="font-['Orbitron'] text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">
              Seas<span className="text-[var(--theme-accent)]">on</span> Ladder
            </h1>
            <p className="mt-4 max-w-2xl text-[11px] font-medium leading-relaxed text-slate-400 uppercase tracking-wider">
              Ranked PvP, bot rooms, and challenge clears in one place. This page tracks the current season outside the profile page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[8px] uppercase tracking-widest text-slate-500">Tracked Players</div>
              <div className="mt-1 font-['Orbitron'] text-lg font-black text-white">{summary.trackedPlayers || challengeSummary.trackedPlayers || 0}</div>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white transition-all disabled:opacity-30"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-[var(--theme-accent)]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tactical Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16 p-2 rounded-[2rem] bg-black/40 border border-white/5 backdrop-blur-xl max-w-fit mx-auto lg:mx-0">
          {categories.map(cat => {
            const active = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-4 px-8 py-4 rounded-[1.5rem] transition-all duration-500 ${active ? 'bg-[var(--theme-accent)] text-white shadow-[0_0_25px_var(--theme-accent-soft)]' : 'text-slate-500 hover:text-white hover:bg-white/[0.05]'}`}
              >
                <cat.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-700'}`} />
                <span className="font-['Orbitron'] text-[11px] font-black uppercase tracking-[0.2em]">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Podium View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-600 uppercase tracking-[0.4em] font-black text-xs">
            <div className="mb-6 h-12 w-12 rounded-full border-2 border-slate-800 border-t-[var(--theme-accent)] animate-spin" />
            Loading Leaderboards...
          </div>
        ) : (
          <>
            <RankingPodium 
              top3={currentConfig.rows.slice(0, 3)} 
              metricKey={currentConfig.metricKey} 
              metricLabel={currentConfig.metricLabel} 
              title={activeTab.toUpperCase()}
            />

            <div className="flex items-center gap-4 mb-6">
              <TrendingUp className="h-4 w-4 text-[var(--theme-accent)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Full Standings</span>
            </div>

            <HUDTable 
              rows={currentConfig.rows.slice(3)}
              viewerUserId={user?.id}
              metricKey={currentConfig.metricKey}
              metricLabel={currentConfig.metricLabel}
              type={currentConfig.type}
            />
          </>
        )}
      </div>

      <TacticalTicker text={tickerText} />
    </div>
  );
}
