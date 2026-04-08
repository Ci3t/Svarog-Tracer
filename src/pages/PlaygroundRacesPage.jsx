import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CircleHelp,
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
import PvpVsMark from '../components/modern/PvpVsMark';
import { withBaseUrl } from '../utils/assetPaths';
import { UserIdentityCard } from '../components/UserIdentityBlock';

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
const PVP_LOBBY_TOUR_KEY = 'pvp-lobby-tour-v1';
const SEED_MODES = ['shared', 'random'];

const PVP_LOBBY_TOUR_STEPS = [
  {
    target: '#pvp-lobby-tour-create',
    title: 'Create Room',
    body: 'Start here if you are hosting. Pick the duel tier, optional set, and optional target override, then create the room package.',
    placement: 'bottom',
  },
  {
    target: '#pvp-lobby-tour-tier',
    title: 'Tier Selection',
    body: 'Tier controls the contract difficulty and the kind of board pressure the room will generate once the duel begins.',
    placement: 'right',
  },
  {
    target: '#pvp-lobby-tour-set',
    title: 'Target Set',
    body: 'Use this if you want the room to lean into one specific relic set. Leave it on Random if you want the contract to choose for you.',
    placement: 'right',
  },
  {
    target: '#pvp-lobby-tour-override',
    title: 'Target Sub Override',
    body: 'These optional line picks let you force the target relic toward specific substats before the room is created.',
    placement: 'left',
  },
  {
    target: '#pvp-lobby-tour-seed-mode',
    title: 'Seed Mode',
    body: 'Shared means both players read the same seed. Random means both sides keep the same contract package but each player gets their own seed, which makes the duel tougher.',
    placement: 'left',
  },
  {
    target: '#pvp-lobby-tour-join',
    title: 'Join By Code',
    body: 'If someone else already created the room, paste the code here and join instead of creating a new one.',
    placement: 'left',
  },
  {
    target: '#pvp-lobby-tour-create-button',
    title: 'Generate A Room',
    body: 'Create one room now so the second half of the tour can explain the active encounter panel below.',
    prompt: 'Press Create room to continue the tour.',
    placement: 'bottom',
    waitFor: {
      type: 'selector',
      value: '#pvp-lobby-tour-room',
    },
  },
  {
    target: '#pvp-lobby-tour-room',
    title: 'Active Encounter',
    body: 'Once a room exists, this lower panel becomes your command sheet. It holds the roster, shared contract, room actions, and relic package.',
    placement: 'top',
  },
  {
    target: '#pvp-lobby-tour-room-actions',
    title: 'Room Actions',
    body: 'Copy the code here, fill a dev bot when you are testing locally, reroll the package, or start the duel once the room is ready.',
    placement: 'left',
  },
  {
    target: '#pvp-lobby-tour-roster',
    title: 'Duel Roster',
    body: 'This left rail shows who is host, who joined, and the current room state before the duel moves into the board.',
    placement: 'right',
  },
  {
    target: '#pvp-lobby-tour-contract',
    title: 'Shared Contract',
    body: 'This side explains the exact contract package both players will receive: title, seed, set, tier, and the three relics that define the duel.',
    placement: 'left',
  },
  {
    target: '#pvp-lobby-tour-relics',
    title: 'Relic Package',
    body: 'Review the target relic, setup package, and force relic here before you launch the duel so you know what kind of solve the room expects.',
    placement: 'top',
  },
];

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

function getRosterMark(name = '', fallback = 'P') {
  const value = String(name || '').trim();
  if (!value) return fallback;
  return value.charAt(0).toUpperCase();
}

function LobbySection({ title, actions, children, className = '' }) {
  return (
    <section className={`theme-glass-card rounded-xl ${className}`}>
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
    <div className={`theme-glass-card relative flex flex-col overflow-hidden rounded-lg`}>
      <div className={`border-b border-white/10 px-4 py-2 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest ${theme} border-l-[3px]`}>
        {title}
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-start gap-4">
          <div className="theme-subpanel flex h-10 w-10 shrink-0 items-center justify-center rounded-md p-1">
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
            <div key={i} className="theme-subpanel flex items-center justify-between px-2 py-1 text-xs font-medium text-slate-300">
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

function LobbyTourOverlay({
  steps,
  currentStep,
  onNext,
  onBack,
  onClose,
  canAdvance = true,
  isWaiting = false,
}) {
  const [rect, setRect] = useState(null);
  const [claraSpeaking, setClaraSpeaking] = useState(true);

  useEffect(() => {
    const step = steps[currentStep];
    if (!step) return undefined;

    const update = () => {
      const element = document.querySelector(step.target);
      if (!element) {
        setRect(null);
        return;
      }
      const nextRect = element.getBoundingClientRect();
      setRect(nextRect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [steps, currentStep]);

  useEffect(() => {
    setClaraSpeaking(true);
    const timer = window.setTimeout(() => setClaraSpeaking(false), 1800);
    return () => window.clearTimeout(timer);
  }, [currentStep]);

  const step = steps[currentStep];
  if (!step || !rect) return null;

  const cardWidth = 404;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const placement = step.placement || 'auto';
  const canPlaceRight = rect.right + 24 + cardWidth < viewportWidth;
  const canPlaceLeft = rect.left - cardWidth - 24 > 24;
  const canPlaceBelow = rect.bottom + 240 < viewportHeight;
  const canPlaceAbove = rect.top - 220 > 24;

  let top;
  let left;

  if (placement === 'right' && canPlaceRight) {
    top = Math.min(Math.max(24, rect.top), viewportHeight - 260);
    left = rect.right + 24;
  } else if (placement === 'left' && canPlaceLeft) {
    top = Math.min(Math.max(24, rect.top), viewportHeight - 260);
    left = rect.left - cardWidth - 24;
  } else if (placement === 'bottom' && canPlaceBelow) {
    top = rect.bottom + 16;
    left = Math.min(Math.max(24, rect.left), viewportWidth - cardWidth - 24);
  } else if (placement === 'top' && canPlaceAbove) {
    top = rect.top - 200;
    left = Math.min(Math.max(24, rect.left), viewportWidth - cardWidth - 24);
  } else if (canPlaceRight) {
    top = Math.min(Math.max(24, rect.top), viewportHeight - 260);
    left = rect.right + 24;
  } else if (canPlaceBelow) {
    top = rect.bottom + 16;
    left = Math.min(Math.max(24, rect.left), viewportWidth - cardWidth - 24);
  } else {
    top = Math.max(24, rect.top - 200);
    left = Math.min(Math.max(24, rect.left), viewportWidth - cardWidth - 24);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      <div
        className="pointer-events-auto absolute left-0 right-0 top-0 bg-black/45 backdrop-blur-[2px]"
        style={{ height: Math.max(0, rect.top - 8) }}
      />
      <div
        className="pointer-events-auto absolute left-0 bottom-0 bg-black/45 backdrop-blur-[2px]"
        style={{
          top: Math.max(0, rect.top - 8),
          width: Math.max(0, rect.left - 8),
          height: rect.height + 16,
        }}
      />
      <div
        className="pointer-events-auto absolute right-0 bottom-0 bg-black/45 backdrop-blur-[2px]"
        style={{
          top: Math.max(0, rect.top - 8),
          left: rect.left + rect.width + 8,
          height: rect.height + 16,
        }}
      />
      <div
        className="pointer-events-auto absolute left-0 right-0 bottom-0 bg-black/45 backdrop-blur-[2px]"
        style={{ top: rect.top + rect.height + 8 }}
      />
      <div
        className="absolute rounded-[1.5rem] border border-rose-400/40 shadow-[0_0_20px_rgba(251,113,133,0.15)]"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
        }}
      />
      <div
        className="pointer-events-auto absolute rounded-[1.25rem] border border-white/10 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        style={{ top, left, width: cardWidth }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">
            <CircleHelp className="h-3.5 w-3.5" />
            Clara Guide
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 transition-colors hover:text-white"
          >
            <DoorOpen className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 grid grid-cols-[88px_minmax(0,1fr)] items-end gap-4">
          <div className="relative flex h-[110px] items-end justify-center overflow-hidden">
            <div className="absolute inset-x-2 bottom-0 h-10 rounded-full bg-rose-500/10 blur-xl" />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />
            <img
              src={claraSpeaking ? withBaseUrl('clara-prof-OandMouth.gif') : withBaseUrl('clara-prof-assistant.png')}
              alt="Clara guide"
              className="relative z-[1] max-h-[108px] w-auto object-contain"
            />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Clara says</div>
            <div className="mt-2 rounded-[18px] border border-cyan-400/30 bg-white px-4 py-3 text-[13px] font-semibold leading-5 text-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              {step.title}
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{step.body}</p>
        {step.prompt ? (
          <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-100">
            {step.prompt}
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {isWaiting ? 'Waiting For Action' : `${currentStep + 1} / ${steps.length}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStep === 0}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canAdvance}
              className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {currentStep >= steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundRacesPage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthHeader, roleMode } = useAuth();
  const [selectedTier, setSelectedTier] = useState('beginner');
  const [selectedSeedMode, setSelectedSeedMode] = useState('shared');
  const [selectedSetName, setSelectedSetName] = useState('');
  const [selectedTargetSubs, setSelectedTargetSubs] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourSelectorSatisfied, setTourSelectorSatisfied] = useState(false);

  const roomCode = room?.code || '';
  const roomStatus = room?.status || 'idle';
  const isHost = room?.viewerRole === 'host';
  const isAdminMode = roleMode === 'admin';
  const canDevFill = isHost && room?.status === 'lobby' && !room?.guest?.userId && (isLocalHost() || isAdminMode);

  const opponent = useMemo(() => {
    if (!room) return null;
    return room.viewerRole === 'host' ? room.guest : room.host;
  }, [room]);
  const relicSetOptions = useMemo(
    () => (Array.isArray(relicSets) ? relicSets.filter((entry) => Number(entry?.numId || 0) >= 101 && Number(entry?.numId || 0) < 200) : []),
    []
  );
  const currentTourStep = PVP_LOBBY_TOUR_STEPS[tourStepIndex] || null;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const seen = window.localStorage.getItem(PVP_LOBBY_TOUR_KEY);
    if (seen === 'seen') return undefined;
    const timer = window.setTimeout(() => {
      setTourStepIndex(0);
      setTourRunning(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tourRunning || currentTourStep?.waitFor?.type !== 'selector') {
      setTourSelectorSatisfied(false);
      return undefined;
    }

    const check = () => {
      setTourSelectorSatisfied(Boolean(document.querySelector(currentTourStep.waitFor.value)));
    };

    check();
    const interval = window.setInterval(check, 250);
    return () => window.clearInterval(interval);
  }, [currentTourStep, tourRunning, room]);

  const canAdvanceTour = useMemo(() => {
    if (!currentTourStep?.waitFor) return true;
    if (currentTourStep.waitFor.type === 'selector') return tourSelectorSatisfied;
    return true;
  }, [currentTourStep, tourSelectorSatisfied]);

  const handleCloseTour = useCallback(() => {
    setTourRunning(false);
    setTourStepIndex(0);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PVP_LOBBY_TOUR_KEY, 'seen');
    }
  }, []);

  const handleNextTour = useCallback(() => {
    if (!canAdvanceTour) return;
    if (tourStepIndex >= PVP_LOBBY_TOUR_STEPS.length - 1) {
      handleCloseTour();
      return;
    }
    setTourStepIndex((current) => current + 1);
  }, [canAdvanceTour, handleCloseTour, tourStepIndex]);

  const handleBackTour = useCallback(() => {
    setTourStepIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    setSelectedSeedMode(selectedTier === 'expert_v2' ? 'random' : 'shared');
  }, [selectedTier]);

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
          seedMode: selectedSeedMode,
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
    <div className={`playground-theme-shell pvp-lobby-shell min-h-screen bg-transparent px-4 py-8 text-slate-200 md:px-8 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''} flex flex-col`}>
      <style>{`
        .pvp-lobby-shell .theme-glass-card::before,
        .pvp-lobby-shell .theme-glass-card::after,
        .pvp-lobby-shell .theme-subpanel::before,
        .pvp-lobby-shell .theme-subpanel::after,
        .pvp-lobby-shell .theme-panel-surface::before,
        .pvp-lobby-shell .theme-panel-surface::after {
          display: none !important;
          content: none !important;
          background-image: none !important;
          animation: none !important;
        }
      `}</style>
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
            <div className="flex items-center gap-2">
	            <div className="theme-subpanel rounded-md px-3 py-1.5 text-xs font-medium text-slate-300">
	              PvP Lobby
	            </div>
              <button
                type="button"
                onClick={() => {
                  setTourStepIndex(0);
                  setTourRunning(true);
                }}
                className="theme-subpanel inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
              >
                <CircleHelp className="h-3.5 w-3.5" />
                Guide
              </button>
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
              <div className="theme-subpanel rounded-lg px-4 py-3">
                <div className="text-xs text-slate-500">Seed</div>
                <div className="mt-1 font-medium text-white capitalize">{selectedSeedMode === 'shared' ? 'Shared' : 'Random'}</div>
              </div>
	              <div className="theme-subpanel rounded-lg px-4 py-3">
	                <div className="text-xs text-slate-500">Attempts</div>
	                <div className="mt-1 font-medium text-white">3 per side</div>
	              </div>
	              <div className="theme-subpanel rounded-lg px-4 py-3">
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
          <div id="pvp-lobby-tour-create">
          <LobbySection
            title="Create room"
            className="overflow-hidden"
            actions={
              <button
                id="pvp-lobby-tour-create-button"
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
              <div id="pvp-lobby-tour-tier">
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
                <div id="pvp-lobby-tour-set">
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

	                  <div className="theme-subpanel max-h-[260px] overflow-y-auto rounded-lg">
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
	                              className="theme-subpanel h-10 w-10 rounded-md object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
	                            <div className="theme-subpanel h-10 w-10 rounded-md" />
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

                <div id="pvp-lobby-tour-override">
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

	                  <div className="theme-subpanel mt-4 rounded-lg p-3 text-sm text-slate-400">
                    {selectedTargetSubs.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedTargetSubs.map((stat, index) => (
	                          <div key={`${stat}-${index}`} className="theme-subpanel rounded-md px-2.5 py-1.5 text-xs text-slate-200">
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
              <div id="pvp-lobby-tour-seed-mode" className="xl:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white">Seed mode</label>
                <div className="flex flex-wrap gap-2">
                  {SEED_MODES.map((mode) => {
                    const active = selectedSeedMode === mode;
                    const label = mode === 'shared' ? 'Shared seed' : 'Random per side';
                    const description = mode === 'shared'
                      ? 'Both players solve the same seed.'
                      : 'Same contract, different seed for each player.';
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedSeedMode(mode)}
                        className={`flex min-w-[220px] flex-col items-start rounded-lg border px-4 py-3 text-left transition-all ${
                          active
                            ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)]/15 text-white shadow-[0_0_12px_var(--theme-accent-soft)]'
                            : 'theme-subpanel border-white/8 text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="mt-1 text-xs text-slate-500">{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </LobbySection>
          </div>

          <div className="space-y-6">
            <LobbySection title="Join room" className="overflow-hidden">
              <div className="space-y-4">
                <div id="pvp-lobby-tour-join">
                  <label className="mb-2 block text-sm font-medium text-white">Room code</label>
	                  <input
	                    value={joinCode}
	                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
	                    placeholder="ROOM CODE"
	                    className="theme-subpanel w-full rounded-lg px-4 py-3 text-center text-lg font-semibold uppercase tracking-[0.2em] text-white outline-none transition-colors placeholder:text-slate-600 focus:border-white/30"
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
          <section id="pvp-lobby-tour-room" className="theme-glass-card overflow-hidden rounded-xl">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950">
                  Active Encounter
                </div>
                <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500">
                  Ref: {room.code}
                </div>
              </div>
              <div id="pvp-lobby-tour-room-actions" className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {room.status === 'lobby' && isHost ? (
                  <>
                    {canDevFill ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDevFill}
                          disabled={busyAction !== ''}
                          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                        >
                          <Users className="h-4 w-4" />
                          Svarog Bot
                        </button>
                        <button
                          type="button"
                          onClick={handleDevFillFair}
                          disabled={busyAction !== ''}
                          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                        >
                          <Users className="h-4 w-4" />
                          Clara Bot
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRerollRoom}
                      disabled={busyAction !== ''}
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reroll
                    </button>
                    <button
                      type="button"
                      onClick={handleStartRoom}
                      disabled={busyAction !== '' || !room.guest?.userId}
                      className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      Start Race
                    </button>
                  </>
                ) : null}
                {(room.status === 'countdown' || room.status === 'active' || room.status === 'finished') ? (
                  <button
                    type="button"
                    onClick={openBoard}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-slate-200"
                  >
                    {room.status === 'countdown' ? 'Enter Board' : 'Open Board'}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid xl:grid-cols-[300px_minmax(0,1fr)]">
              <div id="pvp-lobby-tour-roster" className="border-b border-white/10 xl:border-b-0 xl:border-r xl:border-white/10">
                <div className="border-b border-white/10 px-5 py-3 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
                  Duel Roster
                </div>
                <div>
                  <div className="px-5 py-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <UserIdentityCard
                          name={room.host?.name || 'Host'}
                          title={room.host?.state?.displayTitle || ''}
                          rarity={room.host?.state?.displayTitleRarity || 'common'}
                          badge={room.host?.state?.displayBadge || ''}
                          badgeRarity={room.host?.state?.displayBadgeRarity || 'common'}
                          nameplate={room.host?.state?.displayNameplate || ''}
                          nameplateRarity={room.host?.state?.displayNameplateRarity || 'common'}
                          nameplateKey={room.host?.state?.displayNameplateKey || ''}
                          avatarUrl={room.host?.state?.displayAvatarUrl || ''}
                          frameKey={room.host?.state?.displayFrameKey || ''}
                          sideLabel="Host"
                          className="border-white/10 bg-black/25"
                          nameClassName="text-lg font-semibold text-white"
                          titleClassName="mt-1 text-[11px]"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Status</div>
                        <div className="mt-1 text-sm font-medium text-white">{room.host?.state?.status || 'ready'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative border-t border-white/10 px-5 py-6">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white/10 bg-[var(--theme-surface-3)] px-3 py-1">
                      <PvpVsMark theme={sessionTheme} size="sm" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <UserIdentityCard
                          name={room.guest?.name || 'Waiting for opponent'}
                          title={room.guest?.state?.displayTitle || ''}
                          rarity={room.guest?.state?.displayTitleRarity || 'common'}
                          badge={room.guest?.state?.displayBadge || ''}
                          badgeRarity={room.guest?.state?.displayBadgeRarity || 'common'}
                          nameplate={room.guest?.state?.displayNameplate || ''}
                          nameplateRarity={room.guest?.state?.displayNameplateRarity || 'common'}
                          nameplateKey={room.guest?.state?.displayNameplateKey || ''}
                          avatarUrl={room.guest?.state?.displayAvatarUrl || ''}
                          frameKey={room.guest?.state?.displayFrameKey || ''}
                          sideLabel="Guest"
                          className="border-white/10 bg-black/25"
                          nameClassName="text-lg font-semibold text-white"
                          titleClassName="mt-1 text-[11px]"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Status</div>
                        <div className="mt-1 text-sm font-medium text-white">{room.guest?.userId ? room.guest?.state?.status || 'ready' : 'open'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 px-5 py-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Status</div>
                      <div className="mt-1 font-medium text-white">{room.status}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Tier</div>
                      <div className="mt-1 font-medium text-white">{formatTierLabel(room.tier)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Seed</div>
                      <div className="mt-1 font-medium text-white">{room.seedLabel || room.scenario?.seedLabel}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Rolls</div>
                      <div className="mt-1 font-medium text-white">{formatRollTierLabel(room.scenario?.pvpRollTier)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="pvp-lobby-tour-contract">
                <div className="border-b border-white/10 px-5 py-3 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
                  Shared Contract Params
                </div>
                <div className="p-5">
                  <div className="theme-subpanel rounded-lg p-5">
                    <div className="text-3xl font-semibold tracking-tight text-white">
                      {room.scenario?.title || 'Shared contract'}
                    </div>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
                      {room.scenario?.goal || 'Scenario loading...'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="theme-subpanel rounded-md px-2.5 py-1 text-xs text-slate-300">
                        Set: {formatSetShortName(room.scenario?.targetRelic?.setNameHint || room.scenario?.targetRelic?.setName || selectedSetName)}
                      </div>
                      <div className="theme-subpanel rounded-md px-2.5 py-1 text-xs text-slate-300">
                        Seed: {room.seedLabel || room.scenario?.seedLabel}
                      </div>
                      <div className="theme-subpanel rounded-md px-2.5 py-1 text-xs text-slate-300">
                        Tier: {formatTierLabel(room.tier)}
                      </div>
                      <div className="theme-subpanel rounded-md px-2.5 py-1 text-xs text-slate-300">
                        Mood: {room.scenario?.mood || 'mixed'}
                      </div>
                      <div className="theme-subpanel rounded-md px-2.5 py-1 text-xs text-slate-300">
                        Seed mode: {String(room.scenario?.pvpSeedMode || selectedSeedMode || 'shared') === 'random' ? 'Random per side' : 'Shared'}
                      </div>
                    </div>
                  </div>

                  <div id="pvp-lobby-tour-relics" className="mt-5 grid gap-4 xl:grid-cols-3">
                    <LobbyRelicPreview title="Target override" relic={room.scenario?.targetRelic} accent="cyan" />
                    <LobbyRelicPreview title="Setup package" relic={room.scenario?.builderRelic} accent="violet" />
                    <LobbyRelicPreview title="Force relic" relic={room.scenario?.forceRelic} accent="rose" />
                  </div>
                </div>
              </div>
            </div>

            {room.status === 'finished' ? (
              <div className="border-t border-white/10 px-5 py-4 text-sm text-emerald-100">
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
          </section>
        ) : null}
      </div>
      {tourRunning ? (
        <LobbyTourOverlay
          steps={PVP_LOBBY_TOUR_STEPS}
          currentStep={tourStepIndex}
          onNext={handleNextTour}
          onBack={handleBackTour}
          onClose={handleCloseTour}
          canAdvance={canAdvanceTour}
          isWaiting={Boolean(currentTourStep?.waitFor) && !canAdvanceTour}
        />
      ) : null}
    </div>
  );
}
