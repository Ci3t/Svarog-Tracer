import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  DoorOpen,
  LoaderCircle,
  Play,
  Radio,
  RefreshCw,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { buildApiUrl } from '../utils/apiBase';
import relicSets from '../data/relics.json';

const TIERS = ['new_player', 'beginner', 'intermediate', 'veteran', 'expert', 'expert_v2'];
const TARGET_SUB_OPTIONS = [
  'CRIT RATE',
  'CRIT DMG',
  'SPD',
  'ATK%',
  'HP%',
  'DEF%',
  'BREAK EFFECT',
  'EFFECT HIT RATE',
  'EFFECT RES',
  'FLAT HP',
  'FLAT ATK',
];
const REQUEST_TIMEOUT_MS = 8000;
const LOCAL_REQUEST_TIMEOUT_MS = 30000;

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function getFetchErrorMessage(error, fallback) {
  const message = String(error?.message || '').trim();
  if (message === 'signal timed out' || error?.name === 'AbortError') {
    return isLocalHost()
      ? 'Local PvP backend timed out. Make sure `vercel dev` is running and Supabase PvP table exists.'
      : fallback;
  }
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return isLocalHost()
      ? 'Could not reach local PvP backend. Start `vercel dev` and try again.'
      : fallback;
  }
  return message || fallback;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = isLocalHost() ? LOCAL_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(new Error('signal timed out')), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed.');
  }
  return payload;
}

function formatTierLabel(tier) {
  return String(tier || '').replace(/_/g, ' ');
}

function formatRollTierLabel(tier) {
  if (tier === 'high') return 'All High Rolls';
  if (tier === 'mid') return 'All Mid Rolls';
  if (tier === 'low') return 'All Low Rolls';
  return 'Mixed Rolls';
}

function formatSetShortName(name = '') {
  const value = String(name || '').trim();
  if (!value) return 'Random Set';
  return value.length > 28 ? `${value.slice(0, 28)}...` : value;
}

function LobbySection({ title, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-black/20 ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LobbyRelicPreview({ title, relic, accent = 'cyan' }) {
  if (!relic) return null;
  const colorMap = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5',
    rose: 'border-rose-500/30 text-rose-400 bg-rose-500/5',
    violet: 'border-violet-500/30 text-violet-400 bg-violet-500/5',
    fuchsia: 'border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/5',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-500/5'
  };

  const lines = [...(Array.isArray(relic.lines) ? relic.lines : []), relic.fourthLine].filter(Boolean);
  const theme = colorMap[accent] || colorMap.cyan;

  return (
    <div className={`relative flex flex-col border border-white/10 bg-black/40 overflow-hidden`}>
      <div className={`border-b border-white/10 px-4 py-2 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme} border-l-[3px]`}>
        {title}
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-sm border border-white/10 bg-black/40 p-1 flex items-center justify-center">
             {relic.setImage ? (
               <img src={relic.setImage} className="max-h-full max-w-full opacity-80" alt="" onError={e => e.currentTarget.style.display='none'} />
             ) : (
               <div className="h-4 w-4 rounded-full bg-white/5" />
             )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-mono text-xs uppercase text-slate-400">{relic.pieceLabel || 'Unknown'}</div>
            <div className="mt-0.5 truncate text-[10px] font-medium text-slate-500 uppercase">{relic.setNameHint || relic.setName || 'Any set'}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">Main Node</div>
          <div className="mt-0.5 font-mono text-[13px] text-white uppercase">{relic.mainStat || 'N/A'}</div>
        </div>

        <div className="mt-auto space-y-1.5 border-t border-white/5 pt-3">
          {lines.map((stat, i) => (
            <div key={i} className="flex justify-between items-center text-xs font-medium text-slate-300 bg-white/[0.02] px-2 py-1">
               <span className="text-slate-600 font-mono text-[9px] mr-3">[{i+1}]</span>
               <span className="flex-1 truncate uppercase">{stat}</span>
            </div>
          ))}
          {lines.length === 0 && <div className="text-[10px] text-slate-600 italic">No overrides</div>}
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundRacesPage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthHeader } = useAuth();
  const [selectedTier, setSelectedTier] = useState('beginner');
  const [selectedSetName, setSelectedSetName] = useState('');
  const [selectedTargetSubs, setSelectedTargetSubs] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const roomCode = room?.code || '';
  const roomStatus = room?.status || 'idle';
  const isHost = room?.viewerRole === 'host';
  const canDevFill = isLocalHost() && isHost && room?.status === 'lobby' && !room?.guest?.userId;

  const opponent = useMemo(() => {
    if (!room) return null;
    return room.viewerRole === 'host' ? room.guest : room.host;
  }, [room]);
  const relicSetOptions = useMemo(
    () => (Array.isArray(relicSets) ? relicSets.filter((entry) => Number(entry?.numId || 0) >= 101 && Number(entry?.numId || 0) < 200) : []),
    []
  );

  useEffect(() => {
    const currentSetName = room?.scenario?.targetRelic?.setNameHint || room?.scenario?.targetRelic?.setName || '';
    if (!currentSetName) return;
    setSelectedSetName(currentSetName);
  }, [room?.scenario?.targetRelic?.setNameHint, room?.scenario?.targetRelic?.setName]);

  useEffect(() => {
    if (!room?.scenario?.targetRelic) return;
    const targetRelic = room.scenario.targetRelic;
    const nextSubs = [...(Array.isArray(targetRelic.lines) ? targetRelic.lines : []), targetRelic.fourthLine].filter(Boolean).slice(0, 4);
    if (nextSubs.length >= 3) {
      setSelectedTargetSubs(nextSubs);
    }
  }, [room?.scenario?.targetRelic]);

  const targetRelicOverride = useMemo(() => {
    if (selectedTargetSubs.length < 3) return null;
    return {
      lines: selectedTargetSubs.slice(0, 3),
      fourthLine: selectedTargetSubs[3] || '',
      hasFourthLine: selectedTargetSubs.length >= 4,
    };
  }, [selectedTargetSubs]);

  const fetchRoom = useCallback(async (code) => {
    const normalized = String(code || roomCode || '').trim().toUpperCase();
    if (!normalized) return null;

    const response = await fetchWithTimeout(buildApiUrl(`/api/pvp?code=${encodeURIComponent(normalized)}`), {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    const payload = await parseResponse(response);
    setRoom(payload.room || null);
    setError('');
    return payload.room || null;
  }, [getAuthHeader, roomCode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeFromUrl = params.get('code');
    if (!codeFromUrl) return;
    setJoinCode(codeFromUrl.toUpperCase());
  }, [location.search]);

  useEffect(() => {
    if (!roomCode) return undefined;
    const interval = window.setInterval(() => {
      fetchRoom(roomCode).catch((fetchError) => {
        setError(fetchError.message || 'Failed to refresh room.');
      });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [fetchRoom, roomCode]);

  const handleCreateRoom = async () => {
    setBusyAction('create');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'create',
          tier: selectedTier,
          selectedSetName: selectedSetName || null,
          targetRelicOverride,
        }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setJoinCode(payload.room?.code || '');
      setError('');
    } catch (createError) {
      setError(getFetchErrorMessage(createError, 'Failed to create room.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleJoinRoom = async () => {
    const normalized = String(joinCode || '').trim().toUpperCase();
    if (!normalized) {
      setError('Enter a room code first.');
      return;
    }

    setBusyAction('join');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'join', code: normalized }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setJoinCode(normalized);
      setError('');
    } catch (joinError) {
      setError(getFetchErrorMessage(joinError, 'Failed to join room.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleStartRoom = async () => {
    if (!roomCode) return;
    setBusyAction('start');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'start', code: roomCode }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setError('');
      navigate(`/playground/challenge?room=${encodeURIComponent(roomCode)}`);
    } catch (startError) {
      setError(getFetchErrorMessage(startError, 'Failed to start room.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleRerollRoom = async () => {
    if (!roomCode) return;
    setBusyAction('reroll');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'reroll',
          code: roomCode,
          selectedSetName: selectedSetName || null,
          targetRelicOverride,
        }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setError('');
    } catch (rerollError) {
      setError(getFetchErrorMessage(rerollError, 'Failed to reroll room relics.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleDevFill = async () => {
    if (!roomCode) return;
    setBusyAction('dev-fill');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'dev-fill', code: roomCode, botKind: 'oracle' }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setError('');
    } catch (fillError) {
      setError(getFetchErrorMessage(fillError, 'Failed to add dev opponent.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleDevFillFair = async () => {
    if (!roomCode) return;
    setBusyAction('dev-fill-fair');
    try {
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ action: 'dev-fill', code: roomCode, botKind: 'fair' }),
      });
      const payload = await parseResponse(response);
      setRoom(payload.room || null);
      setError('');
    } catch (fillError) {
      setError(getFetchErrorMessage(fillError, 'Failed to add dev opponent.'));
    } finally {
      setBusyAction('');
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const openBoard = () => {
    if (!roomCode) return;
    navigate(`/playground/challenge?room=${encodeURIComponent(roomCode)}`);
  };

  const toggleTargetSub = (stat) => {
    setSelectedTargetSubs((current) => {
      if (current.includes(stat)) {
        return current.filter((entry) => entry !== stat);
      }
      if (current.length >= 4) {
        return [...current.slice(0, 3), stat];
      }
      return [...current, stat];
    });
  };

  return (
    <div className={`playground-theme-shell min-h-screen bg-transparent px-4 py-8 text-slate-200 md:px-8 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''} flex flex-col`}>
      <div className="mx-auto flex w-full max-w-[1380px] flex-1 flex-col gap-6 pt-4">
        <header className="border-b border-white/10 pb-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Playground
            </button>
            <div className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300">
              PvP Lobby
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">PvP Score Duel</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Create a private room, share the code, and run the same contract seed against another player. Both sides get the same setup and the best relic wins.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs text-slate-500">Seed</div>
                <div className="mt-1 font-medium text-white">Shared</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs text-slate-500">Attempts</div>
                <div className="mt-1 font-medium text-white">3 per side</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-xs text-slate-500">Result</div>
                <div className="mt-1 font-medium text-white">Best submit</div>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <LobbySection
            title="Create room"
            actions={
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={busyAction !== ''}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                {busyAction === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                Create room
              </button>
            }
          >
            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIERS.map((tier) => {
                    const active = selectedTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'border-white/30 bg-white/10 text-white'
                            : 'border-white/10 bg-transparent text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {formatTierLabel(tier)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-white">Target set</label>
                    <button
                      type="button"
                      onClick={() => setSelectedSetName('')}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selectedSetName
                          ? 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                          : 'border-white/20 bg-white/10 text-white'
                      }`}
                    >
                      Random
                    </button>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto rounded-lg border border-white/10">
                    {relicSetOptions.map((entry) => {
                      const active = selectedSetName === entry.name;
                      return (
                        <button
                          key={entry.numId || entry.name}
                          type="button"
                          onClick={() => setSelectedSetName(entry.name)}
                          className={`flex w-full items-center gap-3 border-b border-white/10 px-3 py-3 text-left transition-colors last:border-b-0 ${
                            active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                          }`}
                          title={entry.name}
                        >
                          {entry.image ? (
                            <img
                              src={entry.image}
                              alt={entry.name}
                              className="h-10 w-10 rounded-md border border-white/10 bg-black/30 object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-white/10 bg-black/20" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{entry.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{active ? 'Selected' : 'Use set rules'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Target sub override</label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_SUB_OPTIONS.map((stat) => {
                      const active = selectedTargetSubs.includes(stat);
                      return (
                        <button
                          key={stat}
                          type="button"
                          onClick={() => toggleTargetSub(stat)}
                          className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                            active
                              ? 'border-white/30 bg-white/10 text-white'
                              : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {stat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
                    {selectedTargetSubs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedTargetSubs.map((stat, index) => (
                          <div key={`${stat}-${index}`} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-200">
                            <span className="mr-1 text-slate-500">{index < 3 ? `L${index + 1}` : 'L4'}</span>
                            {stat}
                          </div>
                        ))}
                      </div>
                    ) : (
                      'No override selected. The room will generate the target relic normally.'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </LobbySection>

          <div className="space-y-6">
            <LobbySection title="Join room">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Room code</label>
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-center text-lg font-semibold uppercase tracking-[0.2em] text-white outline-none transition-colors placeholder:text-slate-600 focus:border-white/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={busyAction !== ''}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                >
                  {busyAction === 'join' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  Join room
                </button>
              </div>
            </LobbySection>

            <LobbySection title="How it works">
              <div className="space-y-3 text-sm leading-6 text-slate-400">
                <p>Create a room or join by code.</p>
                <p>The host picks the tier and optional relic setup.</p>
                <p>Both players get the same seed, contract, and relic package.</p>
                <p>Best submitted relic wins the duel.</p>
              </div>
            </LobbySection>
          </div>
        </section>

        {room ? (
          <LobbySection
            title="Active room"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-white">{room.code}</div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            }
          >
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 text-sm font-medium text-white">Players</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-md border border-white/10 px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{room.host?.name || 'Host'}</div>
                        <div className="text-xs text-slate-500">Host</div>
                      </div>
                      <div className="text-xs font-medium text-slate-300">{room.host?.state?.status || 'ready'}</div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/10 px-3 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{room.guest?.name || 'Waiting for opponent'}</div>
                        <div className="text-xs text-slate-500">Guest</div>
                      </div>
                      <div className="text-xs font-medium text-slate-300">{room.guest?.userId ? room.guest?.state?.status || 'ready' : 'open'}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 text-sm font-medium text-white">Room status</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Status</div>
                      <div className="mt-1 text-sm font-medium text-white">{room.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Tier</div>
                      <div className="mt-1 text-sm font-medium text-white">{formatTierLabel(room.tier)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Seed</div>
                      <div className="mt-1 text-sm font-medium text-white">{room.seedLabel || room.scenario?.seedLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Rolls</div>
                      <div className="mt-1 text-sm font-medium text-white">{formatRollTierLabel(room.scenario?.pvpRollTier)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {room.status === 'lobby' && isHost ? (
                    <>
                      {canDevFill ? (
                        <>
                          <button
                            type="button"
                            onClick={handleDevFill}
                            disabled={busyAction !== ''}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                          >
                            <Users className="h-4 w-4" />
                            Fill Svarog Bot
                          </button>
                          <button
                            type="button"
                            onClick={handleDevFillFair}
                            disabled={busyAction !== ''}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                          >
                            <Users className="h-4 w-4" />
                            Fill Svarog #2 Fair
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleRerollRoom}
                        disabled={busyAction !== ''}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reroll relics
                      </button>
                      <button
                        type="button"
                        onClick={handleStartRoom}
                        disabled={busyAction !== '' || !room.guest?.userId}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                        Start race
                      </button>
                    </>
                  ) : null}

                  {(room.status === 'countdown' || room.status === 'active' || room.status === 'finished') ? (
                    <button
                      type="button"
                      onClick={openBoard}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-slate-200"
                    >
                      {room.status === 'countdown' ? 'Enter countdown board' : 'Enter race board'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="text-lg font-semibold text-white">{room.scenario?.title || 'Shared contract'}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{room.scenario?.goal || 'Scenario loading...'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                      Set: {formatSetShortName(room.scenario?.targetRelic?.setNameHint || room.scenario?.targetRelic?.setName || selectedSetName)}
                    </div>
                    <div className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                      Mood: {room.scenario?.mood || 'mixed'}
                    </div>
                    <div className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                      Difficulty: {room.difficulty}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <LobbyRelicPreview title="Target relic" relic={room.scenario?.targetRelic} accent="cyan" />
                  <LobbyRelicPreview title="Builder relic" relic={room.scenario?.builderRelic} accent="violet" />
                  <LobbyRelicPreview title="Force relic" relic={room.scenario?.forceRelic} accent="rose" />
                </div>
              </div>
            </div>

            {room.status === 'finished' ? (
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                <span className="font-medium">
                  <Trophy className="mr-2 inline h-4 w-4" />
                  Winner:
                </span>{' '}
                {room.winnerUserId === room.host?.userId
                  ? room.host?.name
                  : room.winnerUserId === room.guest?.userId
                    ? room.guest?.name
                    : 'Pending'}
              </div>
            ) : null}
          </LobbySection>
        ) : null}
      </div>
    </div>
  );
}
