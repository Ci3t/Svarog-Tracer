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

function LobbyRelicPreview({ title, relic, accent = 'cyan' }) {
  if (!relic) return null;
  const accentClasses = accent === 'rose'
    ? 'border-rose-400/15 bg-rose-500/6 text-rose-100'
    : accent === 'violet'
      ? 'border-violet-400/15 bg-violet-500/6 text-violet-100'
      : 'border-cyan-400/15 bg-cyan-500/6 text-cyan-100';
  const lines = [...(Array.isArray(relic.lines) ? relic.lines : []), relic.fourthLine].filter(Boolean);

  return (
    <div className={`rounded-2xl border p-4 ${accentClasses}`}>
      <div className="flex items-start gap-3">
        {relic.setImage ? (
          <img src={relic.setImage} alt={relic.setNameHint || relic.setName || title} className="h-12 w-12 rounded-xl border border-white/10 bg-black/30 object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-xl border border-white/10 bg-black/30" />
        )}
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</div>
          <div className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-white">
            {relic.pieceLabel || 'Relic'}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {relic.setNameHint || relic.setName || 'Unknown Set'}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2">
        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Main Stat</div>
        <div className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">{relic.mainStat || 'N/A'}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {lines.map((stat, index) => (
          <span key={`${title}-${stat}-${index}`} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-200">
            {stat}
          </span>
        ))}
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
    <div className={`min-h-screen bg-[#080B14] px-4 py-12 text-slate-200 md:px-8 ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-8">
        <header className="rounded-[2rem] border border-white/5 bg-slate-950/35 p-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Playground
            </button>
            <div className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">
              PvP Score Duel
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
            Same Seed. <span className="text-rose-300">Better Relic.</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
            Create a private room, share the join code, then play the exact same contract board. Each side gets 3 attempts,
            and the best submitted relic score wins. The full relic comparison comes after the finish.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 rounded-[2rem] border border-white/5 bg-slate-950/35 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Swords className="h-4 w-4 text-cyan-300" />
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Host A Duel</div>
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-400">
              Pick the tier, generate the room, wait for your opponent, then launch both players into the same score duel.
            </p>

            <div className="mb-5 flex flex-wrap gap-2">
              {TIERS.map((tier) => {
                const active = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                      active
                        ? 'border-cyan-400/30 bg-cyan-500/14 text-cyan-100'
                        : 'border-white/5 bg-black/30 text-slate-300 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {formatTierLabel(tier)}
                  </button>
                );
              })}
            </div>

            <div className="mb-5 min-w-0 rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">Target Set</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">
                    Pick a relic set to test. PvP will build the target relic around that set's preferred stats instead of generic crit/spd defaults.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSetName('')}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                    selectedSetName
                      ? 'border-white/10 bg-black/30 text-slate-300 hover:border-white/15 hover:text-white'
                      : 'border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-100'
                  }`}
                >
                  Random Set
                </button>
              </div>

              <div className="mt-4 max-w-full overflow-x-auto overscroll-x-contain pb-2">
                <div className="inline-flex w-max gap-2 pr-2">
                  {relicSetOptions.map((entry) => {
                    const active = selectedSetName === entry.name;
                    return (
                      <button
                        key={entry.numId || entry.name}
                        type="button"
                        onClick={() => setSelectedSetName(entry.name)}
                        className={`group flex w-[13.5rem] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                          active
                            ? 'border-fuchsia-400/30 bg-fuchsia-500/14 text-fuchsia-50 shadow-[0_0_0_1px_rgba(244,114,182,0.12)]'
                            : 'border-white/5 bg-black/25 text-slate-300 hover:border-white/10 hover:text-white'
                        }`}
                        title={entry.name}
                      >
                        {entry.image ? (
                          <img
                            src={entry.image}
                            alt={entry.name}
                            className="h-10 w-10 rounded-lg border border-white/10 bg-black/30 object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-white/10 bg-black/30" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-black uppercase tracking-[0.12em]">
                            {entry.name}
                          </div>
                          <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors group-hover:text-slate-400">
                            {active ? 'Pinned For Room' : 'Use This Set'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {selectedSetName ? `Selected set: ${selectedSetName}` : 'Selected set: Random from room pool'}
              </div>
            </div>

            <div className="mb-5 min-w-0 rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Target Relic Subs</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">
                Testing override for PvP. Pick 3 or 4 substats for the target relic and the room will use them directly.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TARGET_SUB_OPTIONS.map((stat) => {
                  const active = selectedTargetSubs.includes(stat);
                  return (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => toggleTargetSub(stat)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                        active
                          ? 'border-cyan-400/30 bg-cyan-500/14 text-cyan-100'
                          : 'border-white/5 bg-black/25 text-slate-300 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      {stat}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTargetSubs.length > 0 ? selectedTargetSubs.map((stat, index) => (
                  <div
                    key={`${stat}-${index}`}
                    className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100"
                  >
                    {index < 3 ? `L${index + 1}` : 'L4'} {stat}
                  </div>
                )) : (
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    No override selected. Room will generate subs normally.
                  </div>
                )}
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {selectedTargetSubs.length >= 3
                  ? 'Override active for PvP target relic.'
                  : 'Pick at least 3 subs to enable the override.'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={busyAction !== ''}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/12 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-100 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyAction === 'create' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Create Private Room
            </button>
          </div>

          <div className="min-w-0 rounded-[2rem] border border-white/5 bg-slate-950/35 p-6">
            <div className="mb-4 flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-amber-300" />
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Join By Code</div>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-400">
              Paste the host code and jump into the same shared relic duel room.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black uppercase tracking-[0.25em] text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400/30"
              />
              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={busyAction !== ''}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/12 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-amber-100 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === 'join' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                Join Room
              </button>
            </div>
          </div>
        </section>

        {room ? (
          <section className="rounded-[2rem] border border-white/5 bg-slate-950/35 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">Current Room</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-lg font-black uppercase tracking-[0.3em] text-white">
                    {room.code}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                  <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    {room.status}
                  </div>
                  <div className="rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {room.difficulty}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {room.status === 'lobby' && isHost ? (
                  <>
                    {canDevFill ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDevFill}
                          disabled={busyAction !== ''}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100 transition-all hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyAction === 'dev-fill' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                          Fill Svarog Bot
                        </button>
                        <button
                          type="button"
                          onClick={handleDevFillFair}
                          disabled={busyAction !== ''}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-500/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100 transition-all hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyAction === 'dev-fill-fair' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                          Fill Svarog #2 Fair
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRerollRoom}
                      disabled={busyAction !== ''}
                      className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition-all hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === 'reroll' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Reroll Relics
                    </button>
                    <button
                      type="button"
                      onClick={handleStartRoom}
                      disabled={busyAction !== '' || !room.guest?.userId}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyAction === 'start' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Start Race
                    </button>
                  </>
                ) : null}

                {(room.status === 'active' || room.status === 'finished') ? (
                  <button
                    type="button"
                    onClick={openBoard}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/12 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100 transition-all hover:bg-rose-500/20"
                  >
                    Enter Race Board
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Players</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">{room.host?.name || 'Host'}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Host</div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {room.host?.state?.status || 'ready'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-4 py-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-white">
                        {room.guest?.name || 'Waiting For Opponent'}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Guest</div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {room.guest?.userId ? room.guest?.state?.status || 'ready' : 'open'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Shared Contract</div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-4">
                  <div className="text-lg font-black uppercase tracking-tight text-white">{room.scenario?.title || 'Shared Contract'}</div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{room.scenario?.goal || 'Scenario loading...'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                    <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-100">
                      Target Set {formatSetShortName(room.scenario?.targetRelic?.setNameHint || room.scenario?.targetRelic?.setName || selectedSetName)}
                    </div>
                    <div className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-300">
                      Seed {room.seedLabel || room.scenario?.seedLabel}
                    </div>
                    <div className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-300">
                      {formatTierLabel(room.tier)}
                    </div>
                    <div className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-300">
                      {room.scenario?.mood || 'mixed'}
                    </div>
                    <div className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-300">
                      {formatRollTierLabel(room.scenario?.pvpRollTier)}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-3">
                    <LobbyRelicPreview title="Target Relic" relic={room.scenario?.targetRelic} accent="cyan" />
                    <LobbyRelicPreview title="Setup / Builder" relic={room.scenario?.builderRelic} accent="violet" />
                    <LobbyRelicPreview title="Force Relic" relic={room.scenario?.forceRelic} accent="rose" />
                  </div>
                </div>
              </div>
            </div>

            {room.status === 'finished' ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-100">
                  <Trophy className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Match Finished</span>
                </div>
                <p className="text-sm text-emerald-50/90">
                  Winner:{' '}
                  {room.winnerUserId === room.host?.userId
                    ? room.host?.name
                    : room.winnerUserId === room.guest?.userId
                      ? room.guest?.name
                      : 'Pending'}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
