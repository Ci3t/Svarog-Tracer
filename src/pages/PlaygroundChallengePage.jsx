import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
  Copy,
  Lightbulb,
  Map,
  RefreshCw,
  Target,
  FlaskConical,
  Zap,
  Settings2,
  Dice5,
  GripVertical,
  ChevronRight,
  TrendingUp,
  History,
  Info,
  Trophy,
  Users,
  Swords,
  TimerReset,
  Flag,
  ShieldAlert,
  X,
  TerminalSquare,
  Sparkles,
  BrainCircuit,
  Radar,
  ScanSearch,
  StepForward,
  CircleHelp,
} from 'lucide-react';
import ModernStickyHeader from '../components/modern/ModernStickyHeader';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import PvpVsMark from '../components/modern/PvpVsMark';
import UserIdentityBlock from '../components/UserIdentityBlock';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import relicSets from '../data/relics.json';
import { CHALLENGE_CONTRACT_ORDER, getChallengeContract, getNextChallengeContractId } from '../data/challengeContracts';
import { createChallengeScenario } from '../data/challengeScenarioFactory';
import { readCustomChallengeScenario } from '../data/customChallengeStorage';
import { useAuth } from '../hooks/useAuth';
import { buildApiUrl } from '../utils/apiBase';
import {
  createBucketPatternProfile,
  getVisibleRollForUpgrade,
  describePatternProfile,
  advancePatternProfile,
} from '../utils/playgroundPatternProfiles';
import {
  activateRelicLine,
  applyUpgradeRoll,
  createRelicId,
  createRelicLine,
  describeRelicScoreGuide,
  detectRelicScoreProfile,
  formatStatValue,
  getMainStatDisplay,
  replaceRelicLineStat,
  scoreRelicWithProfile,
} from '../utils/relicScoring';

const MAIN_STATS = ['CRIT RATE', 'HP%', 'ATK%', 'SPD BOOTS'];
const SUBSTATS = [
  'CRIT RATE',
  'CRIT DMG',
  'SPD',
  'EFFECT HIT RATE',
  'EFFECT RES',
  'BREAK EFFECT',
  'ATK%',
  'HP%',
  'FLAT HP',
  'FLAT ATK',
];
const REQUEST_TIMEOUT_MS = 8000;
const LOCAL_REQUEST_TIMEOUT_MS = 30000;
const CHALLENGE_TOUR_KEY = 'challenge-mode-tour-v1';
const PVP_TOUR_KEY = 'challenge-mode-pvp-tour-v1';
const CHALLENGE_TOUR_STEPS = [
  {
    target: '#challenge-tour-mode',
    title: 'Mode And Ladder',
    body: 'This top strip is your challenge navigator. Switch between Ladder and Generated, reset the ladder, reopen this tour, and click any node in the operation track to jump to that level directly.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-mode',
    title: 'Generated Challenges',
    body: 'The Generated tab is your fresh-contract mode. Pick a difficulty tier there, press Load, and the page builds a new challenge outside the handcrafted ladder so you can practice without losing your current ladder progress.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-mission',
    title: 'Mission Brief',
    body: 'This is the contract. Read the mission text, the clear rule, the exact target stats, your attempt count, and how many deviations you have already burned.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-hints',
    title: 'Intel And Hints',
    body: 'Use Intel when you want the next hint from the contract pack. It is there to teach the intended read, not to replace the solve, so treat it like a nudge when the board stops making sense.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-stickybar',
    title: 'Sticky Roll Bar',
    body: 'This timer and roll-input bar stays with you while you scroll. Use it to keep entering rolls fast without having to climb back to the top of the page every time.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-predictor',
    title: 'Svarog Predictor',
    body: 'Start here before you touch a relic. It gives you commons, noise, the lane lean, and Svarog Eye so you know whether the board is stable or if break pressure is coming.',
    placement: 'right',
  },
  {
    target: '#challenge-tour-advanced-toggle',
    title: 'Advanced Mode',
    body: 'Open Show details when you want the deeper proof behind the lean: trends, trust, freshness, pair behavior, matrix evidence, and why the board is reading that way.',
    placement: 'right',
  },
  {
    target: '#challenge-tour-helper',
    title: 'Stats And Line Helper',
    body: 'This panel turns the read into manipulation logic. Use it to understand line helper mapping, Caesar-style pair translation, and which raw pair actually lands on the slot you want.',
    placement: 'right',
  },
  {
    target: '#challenge-tour-target',
    title: 'Target Relic',
    body: 'This is the relic you are trying to solve. Green rows mean the line is part of the goal and has hits. Red rows mean it is part of the goal but still missed. You only finish cleanly when the contract is satisfied.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-builder',
    title: 'Setup / Builder Relic',
    body: 'Use this relic to scout or reposition without committing to the target relic yet. It is where you can build a read, loop a setup, or consume a roll before going back to the target.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-force',
    title: 'Force Relic',
    body: 'The force relic lets you prime a forced line before the next important hit. Use it when the default path drifts into junk and you need to redirect the outcome onto a different slot.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-force-switch',
    title: 'Switch Force',
    body: 'This control changes the force relic mode between 1-liner, 2-liner, and 3-liner. If the current force setup is wrong for the board, switch it here first, then add the shown line to prime the next force path.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-session',
    title: 'Session History',
    body: 'This is the replay trail for the current run. Compare the history on the right with the predictor on the left and the helper panel to understand exactly where the session changed.',
    placement: 'left',
  },
];

const PVP_TOUR_STEPS = [
  {
    target: '#challenge-tour-pvp-room',
    title: 'Score Duel Board',
    body: 'This top duel board is the room overview. It tells you who is ahead, how far each side has progressed, and what the live room status feels like before you touch any relic.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-pvp-room-meta',
    title: 'Room Controls',
    body: 'This cluster is your quick room utility. Keep an eye on the room id, open tips, check the live room state, reopen results once the duel finishes, and open this guide again while you are learning against bots.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-pvp-you',
    title: 'Your Duel Card',
    body: 'This card is your live combat read. HP shows how badly the opponent is pressuring you, the inline chips show status, level, attempts, hits, and mistakes, and the segmented bar below tells you exactly how far your current relic has climbed.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-pvp-center',
    title: 'Center Lane',
    body: 'The VS lane is the focal action rail. Use the main button here to submit at +15 or burn the current try and restart the target solve when the route is dead.',
    placement: 'bottom',
  },
  {
    target: '#challenge-tour-pvp-mission',
    title: 'Mission Card',
    body: 'This is the duel contract. Read the exact win rule, target stats, and aim-for versus avoid guide before you commit to any route.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-pvp-feed',
    title: 'Signal Feed',
    body: 'Feed shows the live room events. Switch to Details to study the opponent side: bot rooms show session data and reasoning, while player rooms only show opponent roll history.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-predictor',
    title: 'Svarog Predictor',
    body: 'This is still your first board read in PvP. Use commons, noise, lane lean, and Svarog Eye to decide whether the next target touch should be clean, forced, or delayed.',
    placement: 'right',
  },
  {
    target: '#challenge-tour-helper',
    title: 'Stats And Line Helper',
    body: 'Turn the read into a real route here. Check Caesar-style mapping, helper landing lines, and whether the next visible roll can actually reach your desired slot.',
    placement: 'right',
  },
  {
    target: '#challenge-tour-target',
    title: 'Target Relic',
    body: 'This is the relic that wins or loses the duel. Green goal rows are helping the contract, red rows are still missing, and your submit only matters once the solve is worth locking.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-builder',
    title: 'Setup / Builder Relic',
    body: 'Use the builder to scout or reposition when the live target route is bad. The Loop Builder switch turns repeated upgrades on or off, and the builder progress bar shows each upgrade chunk as the setup relic climbs toward max.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-force',
    title: 'Force Relic',
    body: 'Use the force relic to redirect the next important hit. Prime it only when the default line drifts off the contract and the forced slot actually improves the board.',
    placement: 'left',
  },
  {
    target: '#challenge-tour-session',
    title: 'Session History',
    body: 'This is the replay trail of the duel. Compare it with the predictor and helper so you can explain why the board stayed clean, slipped, or broke into noise.',
    placement: 'left',
  },
];

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

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

function getPvpFetchErrorMessage(error, fallback) {
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

const SEED_MOODS = {
  stable: { label: 'Stable', color: 'emerald' },
  mixed: { label: 'Mixed', color: 'cyan' },
  chaotic: { label: 'Chaotic', color: 'rose' },
};

const RELIC_PIECES = ['Head', 'Hands', 'Body', 'Feet'];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createRelicMeta() {
  const setInfo = pickRandom(relicSets);
  return {
    setName: setInfo?.name || 'Training Set',
    setImage: setInfo?.image || '',
    pieceLabel: pickRandom(RELIC_PIECES),
  };
}

function pickUniqueRandom(pool, count, exclude = new Set()) {
  const candidates = pool.filter((entry) => !exclude.has(entry));
  const picked = [];
  while (picked.length < count && candidates.length > 0) {
    const index = Math.floor(Math.random() * candidates.length);
    picked.push(candidates.splice(index, 1)[0]);
  }
  return picked;
}

function createRelic(seedMood) {
  const mainStat = MAIN_STATS[Math.floor(Math.random() * MAIN_STATS.length)];
  const used = new Set([mainStat]);
  const subs = pickUniqueRandom(SUBSTATS, 4, used);
  const meta = createRelicMeta();
  return {
    id: createRelicId('challenge-target'),
    seedMood,
    ...meta,
    level: 0,
    lastLine: null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat,
    orderMode: 'random',
    lines: subs.slice(0, 3).map((stat, index) => createRelicLine(index + 1, stat, { active: true })),
    fourthLine: createRelicLine(4, subs[3], { active: false }),
    hasFourthLine: false,
  };
}

function createTestRelic(options = {}) {
  const { readyForUpgrades = false, carryLine = null } = options;
  const mainStat = MAIN_STATS[Math.floor(Math.random() * MAIN_STATS.length)];
  const used = new Set([mainStat]);
  const subs = pickUniqueRandom(SUBSTATS, 4, used);
  const meta = createRelicMeta();
  return {
    id: createRelicId('challenge-builder'),
    ...meta,
    level: readyForUpgrades ? 3 : 0,
    lastLine: readyForUpgrades ? (Number.isInteger(carryLine) ? carryLine : 4) : null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat,
    orderMode: 'random',
    lines: [
      createRelicLine(1, subs[0], { active: true }),
      createRelicLine(2, subs[1], { active: true }),
      createRelicLine(3, subs[2], { active: true }),
    ],
    fourthLine: createRelicLine(4, subs[3], { active: readyForUpgrades }),
    hasFourthLine: readyForUpgrades,
  };
}

function createForceRelic(baseLines = 2) {
  const mainStat = MAIN_STATS[Math.floor(Math.random() * MAIN_STATS.length)];
  const used = new Set([mainStat]);
  const subs = pickUniqueRandom(SUBSTATS, 4, used);
  const meta = createRelicMeta();
  return {
    id: createRelicId('challenge-force'),
    ...meta,
    mainStat,
    baseLines,
    currentLineCount: baseLines,
    forcedLine: Math.min(baseLines + 1, 4),
    isPrimed: false,
    lines: [
      createRelicLine(1, subs[0], { active: true }),
      createRelicLine(2, subs[1], { active: true }),
      createRelicLine(3, subs[2], { active: true }),
      createRelicLine(4, subs[3], { active: true }),
    ],
  };
}

function getFixedRelicMeta(setNameHint, pieceLabel) {
  const normalizedHint = String(setNameHint || '').toLowerCase();
  const setInfo =
    relicSets.find((entry) => entry?.name?.toLowerCase() === normalizedHint) ||
    relicSets.find((entry) => entry?.name?.toLowerCase().includes(normalizedHint)) ||
    relicSets[0] ||
    {};
  return {
    setName: setInfo?.name || 'Challenge Set',
    setImage: setInfo?.image || '',
    pieceLabel,
  };
}

function createChallengeRelic(spec, options = {}) {
  const { readyForUpgrades = false, carryLine = null, rollTierMode = null } = options;
  const meta = spec.setImage
    ? {
        setName: spec.setNameHint || 'Challenge Set',
        setImage: spec.setImage,
        pieceLabel: spec.pieceLabel,
      }
    : getFixedRelicMeta(spec.setNameHint, spec.pieceLabel);
  const lineStats = Array.isArray(spec.lines) ? spec.lines : [];
  return {
    id: createRelicId('contract-target'),
    ...meta,
    seedMood: 'mixed',
    level: readyForUpgrades ? 3 : 0,
    lastLine: readyForUpgrades ? (Number.isInteger(carryLine) ? carryLine : 4) : null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat: spec.mainStat,
    orderMode: 'fixed',
    lines: lineStats.slice(0, 3).map((stat, index) => createRelicLine(index + 1, stat, { active: true, rollTierMode })),
    fourthLine: createRelicLine(4, spec.fourthLine, { active: readyForUpgrades || Boolean(spec.hasFourthLine), rollTierMode }),
    hasFourthLine: readyForUpgrades || Boolean(spec.hasFourthLine),
  };
}

function createChallengeForceRelic(spec, options = {}) {
  const { rollTierMode = null } = options;
  const meta = spec.setImage
    ? {
        setName: spec.setNameHint || 'Challenge Set',
        setImage: spec.setImage,
        pieceLabel: spec.pieceLabel,
      }
    : getFixedRelicMeta(spec.setNameHint, spec.pieceLabel);
  return {
    id: createRelicId('contract-force'),
    ...meta,
    mainStat: spec.mainStat,
    baseLines: spec.baseLines,
    currentLineCount: spec.baseLines,
    forcedLine: Math.min(spec.baseLines + 1, 4),
    isPrimed: false,
    lines: spec.lines.map((stat, index) => createRelicLine(index + 1, stat, { active: true, rollTierMode })),
  };
}

function createSessionEntry(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!/^[1-4]{2}$/.test(normalized)) return null;
  const translated = /^(41|42|43|44)$/.test(normalized) ? normalized : translateTo4(normalized);
  if (!translated || !/^4[1-4]$/.test(translated)) return null;
  return {
    id: `free-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    raw: normalized,
    translated,
    s2: translated,
    s3: '',
    s4: '',
    s5: '',
    time: new Date().toISOString(),
  };
}

function resolveNextSlotFromVisibleRoll(previousLine, visibleRoll) {
  for (let candidate = 1; candidate <= 4; candidate += 1) {
    const rawPair = `${previousLine}${candidate}`;
    if (translateTo4(rawPair) === visibleRoll) {
      return { rawPair, targetSlot: candidate };
    }
  }
  return {
    rawPair: `${previousLine}${previousLine}`,
    targetSlot: previousLine,
  };
}

function buildEntryRows(entries) {
  return entries.map((entry) => ({
    ...entry,
    s2: entry.translated,
  }));
}

function createChallengeSessionEntries(contract) {
  return (contract.starterRolls || []).map(createSessionEntry).filter(Boolean);
}

function createChallengePatternProfile(contract) {
  const starterEntries = createChallengeSessionEntries(contract);
  return starterEntries.reduce(
    (currentProfile, entry) => advancePatternProfile(currentProfile, entry.translated),
    createBucketPatternProfile(contract.mood, contract.seedLabel, contract.region, contract.patch)
  );
}

const PVP_MISTAKE_SCORE_PENALTY = 4;

function getPvpEffectiveScore(attempt = null) {
  if (!attempt) return 0;
  const multiplier = String(attempt.completionType || 'submitted') === 'timeout' ? 0.7 : 1;
  return (Math.max(0, Number(attempt.score || 0)) * multiplier) - (Math.max(0, Number(attempt.mistakes || 0)) * PVP_MISTAKE_SCORE_PENALTY);
}

function describeContractTargets(success = {}) {
  if (success.type === 'monoLine') {
    return [
      `${success.target}: at least ${success.minHits || 1} hit${(success.minHits || 1) > 1 ? 's' : ''}`,
      ...(typeof success.maxJunk === 'number' ? [`Junk lines: max ${success.maxJunk}`] : []),
    ];
  }

  if (success.type === 'dualCrit') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : [];
    return [
      ...required.map((stat) => `${stat}: at least ${success.minEach || 1}`),
      ...(typeof success.maxJunk === 'number' ? [`Junk lines: max ${success.maxJunk}`] : []),
    ];
  }

  if (success.type === 'dualCritCombined') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : [];
    return [
      `${required.join(' + ')}: combined ${success.minCombined || 2}`,
      ...(typeof success.maxJunk === 'number' ? [`Junk lines: max ${success.maxJunk}`] : []),
    ];
  }

  return [];
}

function describeChallengeMission(success = {}) {
  if (success.type === 'monoLine') {
    return `Keep landing on ${success.target} and avoid drifting into junk.`;
  }
  if (success.type === 'dualCrit') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : ['CRIT RATE', 'CRIT DMG'];
    return `Hit both ${required[0]} and ${required[1]}. One-sided crit finishes do not clear this mission.`;
  }
  if (success.type === 'dualCritCombined') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : ['CRIT RATE', 'CRIT DMG'];
    return `Build enough total value on ${required[0]} and ${required[1]} while keeping the junk side low.`;
  }
  return 'Read the board, land on the useful lines, and avoid junk.';
}

function describeChallengeWinRule(success = {}) {
  if (success.type === 'monoLine') {
    return `Clear by landing at least ${success.minHits || 1} hits on ${success.target}${typeof success.maxJunk === 'number' ? ` while keeping junk hits at ${success.maxJunk} or less` : ''}.`;
  }
  if (success.type === 'dualCrit') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : ['CRIT RATE', 'CRIT DMG'];
    return `Clear by hitting ${required[0]} at least ${success.minEach || 1} time${(success.minEach || 1) > 1 ? 's' : ''} and ${required[1]} at least ${success.minEach || 1} time${(success.minEach || 1) > 1 ? 's' : ''}${typeof success.maxJunk === 'number' ? `, with junk hits at ${success.maxJunk} or less` : ''}.`;
  }
  if (success.type === 'dualCritCombined') {
    const required = Array.isArray(success.required) ? success.required.slice(0, 2) : ['CRIT RATE', 'CRIT DMG'];
    return `Clear by getting at least ${success.minCombined || 2} combined hits on ${required[0]} and ${required[1]}${typeof success.maxJunk === 'number' ? `, with junk hits at ${success.maxJunk} or less` : ''}.`;
  }
  return 'Meet the relic target and avoid the bad side.';
}

function getLineHitsByStat(relic) {
  return [...relic.lines, relic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = line.hits;
    return acc;
  }, {});
}

function ChallengeTourOverlay({
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
    <div className="pointer-events-none fixed inset-0 z-[420]">
      <div className="pointer-events-auto absolute left-0 right-0 top-0 bg-black/45 backdrop-blur-[2px]" style={{ height: Math.max(0, rect.top - 8) }} />
      <div
        className="pointer-events-auto absolute left-0 bottom-0 bg-black/45 backdrop-blur-[2px]"
        style={{ top: Math.max(0, rect.top - 8), width: Math.max(0, rect.left - 8), height: rect.height + 16 }}
      />
      <div
        className="pointer-events-auto absolute right-0 bottom-0 bg-black/45 backdrop-blur-[2px]"
        style={{ top: Math.max(0, rect.top - 8), left: rect.left + rect.width + 8, height: rect.height + 16 }}
      />
      <div className="pointer-events-auto absolute left-0 right-0 bottom-0 bg-black/45 backdrop-blur-[2px]" style={{ top: rect.top + rect.height + 8 }} />
      <div
        className="absolute rounded-[1.75rem] border border-pink-400/55 shadow-[0_0_22px_rgba(244,114,182,0.18)] transition-all duration-300"
        style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
      />
      <div
        className="pointer-events-auto absolute rounded-[1.5rem] border border-cyan-400/30 bg-slate-950/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        style={{ top, left, width: cardWidth }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
            <Map className="h-3.5 w-3.5" />
            Clara Guide
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-4 grid grid-cols-[88px_minmax(0,1fr)] items-end gap-4">
          <div className="relative flex h-[110px] items-end justify-center overflow-hidden">
            <div className="absolute inset-x-2 bottom-0 h-10 rounded-full bg-cyan-500/10 blur-xl" />
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
        <div className="mt-5 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {isWaiting ? 'Waiting For Action' : `${currentStep + 1} / ${steps.length}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStep === 0}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canAdvance}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getChallengeGoalStats(success = {}) {
  if (Array.isArray(success.required) && success.required.length > 0) {
    return success.required.filter(Boolean);
  }
  if (success.target) {
    return [success.target];
  }
  return [];
}

function getChallengeLineFeedback(success = {}, line = {}) {
  const isGoal = getChallengeGoalStats(success).includes(line.stat);
  const hits = Number(line.hits || 0);
  return {
    isGoal,
    isGoalHit: isGoal && hits > 0,
    isGoalMiss: isGoal && hits <= 0,
  };
}

function getDisplayedLineRollCount(line = {}) {
  return Math.max(0, Array.isArray(line.rolls) ? line.rolls.length : 0);
}

function getHelpfulHitsForContract(hitMap, success) {
  if (!success || typeof success !== 'object') return 0;

  if (success.type === 'monoLine') {
    return Math.max(0, Number(hitMap?.[success.target] || 0));
  }

  if (Array.isArray(success.required) && success.required.length > 0) {
    return success.required.reduce((sum, stat) => sum + Math.max(0, Number(hitMap?.[stat] || 0)), 0);
  }

  return 0;
}

function evaluateContractSuccess(hitMap, success) {
  if (!success || typeof success !== 'object') return false;
  const junkHitCount = Array.isArray(success.junk)
    ? success.junk.reduce((sum, stat) => sum + Math.max(0, Number(hitMap?.[stat] || 0)), 0)
    : 0;
  const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

  if (success.type === 'monoLine') {
    return Math.max(0, Number(hitMap?.[success.target] || 0)) >= (success.minHits || 1) && passedJunkGate;
  }

  if (success.type === 'dualCrit') {
    const requiredStats = Array.isArray(success.required) && success.required.length >= 2
      ? success.required.slice(0, 2)
      : [];
    if (requiredStats.length < 2) return false;
    return requiredStats.every((stat) => Math.max(0, Number(hitMap?.[stat] || 0)) >= (success.minEach || 1)) && passedJunkGate;
  }

  if (success.type === 'dualCritCombined') {
    const requiredStats = Array.isArray(success.required) && success.required.length >= 2
      ? success.required.slice(0, 2)
      : [];
    const combinedHits = requiredStats.reduce((sum, stat) => sum + Math.max(0, Number(hitMap?.[stat] || 0)), 0);
    return combinedHits >= (success.minCombined || 2) && passedJunkGate;
  }

  return false;
}

function comparePvpAttempts(left = null, right = null) {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (Boolean(left.goalSatisfied) !== Boolean(right.goalSatisfied)) return left.goalSatisfied ? 1 : -1;
  if (getPvpEffectiveScore(left) !== getPvpEffectiveScore(right)) return getPvpEffectiveScore(left) - getPvpEffectiveScore(right);
  if ((left.helpfulHits || 0) !== (right.helpfulHits || 0)) return (left.helpfulHits || 0) - (right.helpfulHits || 0);
  if ((left.mistakes || 0) !== (right.mistakes || 0)) return (right.mistakes || 0) - (left.mistakes || 0);
  return (left.rollCount || 0) - (right.rollCount || 0);
}

function formatPvpStatusLabel(status, phase = '') {
  const normalized = String(status || '').trim().toLowerCase();
  const normalizedPhase = String(phase || '').trim().toLowerCase();
  if (normalizedPhase === 'building_read') return 'BUILDING READ';
  if (normalizedPhase === 'analyzing_read') return 'ANALYZING';
  if (normalizedPhase === 'upgrading_target') return 'UPGRADING';
  if (normalizedPhase === 'submitted_final') return 'SUBMITTED';
  if (normalized === 'countdown') return 'COUNTDOWN';
  if (normalized === 'attempting') return 'ATTEMPTING';
  if (normalized === 'maxed') return 'READY TO SUBMIT';
  if (normalized === 'waiting') return 'ATTEMPT LOCKED';
  if (normalized === 'submitted') return 'DUEL DONE';
  if (normalized === 'busted') return 'BUSTED';
  if (normalized === 'timeout') return 'TIMEOUT';
  if (normalized === 'disconnected') return 'DISCONNECTED';
  return normalized ? normalized.toUpperCase() : 'READY';
}

function getPvpLevelSegments(level = 0) {
  const safeLevel = Math.max(0, Math.min(15, Number(level) || 0));
  return Array.from({ length: 5 }, (_, index) => {
    const segmentStart = index * 3;
    const progress = Math.max(0, Math.min(1, (safeLevel - segmentStart) / 3));
    return {
      key: `seg-${index + 1}`,
      label: `+${segmentStart + 3}`,
      progress,
    };
  });
}

function formatScoreProfileLabel(profileId = 'crit') {
  return String(profileId || 'crit').replace(/_/g, ' ');
}

function describeHint(relic, moodConfig) {
  const activeLines = relic.hasFourthLine ? [...relic.lines, relic.fourthLine] : relic.lines;
  const critLines = activeLines.filter((line) => line.stat === 'CRIT RATE' || line.stat === 'CRIT DMG').length;
  const junkLines = activeLines.filter((line) =>
    ['EFFECT RES', 'BREAK EFFECT', 'FLAT HP', 'FLAT ATK'].includes(line.stat)
  ).length;

  if (critLines >= 2) {
    return 'Relic favors crit. Check if current pair lands there.';
  }
  if (junkLines >= 2) {
    return 'Relic favors junk stats. Watch for pair drift.';
  }
  return 'Compare visible pair to relic shape.';
}

/**
 * Premium Modern Relic Card Component - Space-Saving Overflow Design
 */
function ModernRelicCard({
  relic,
  title,
  themeColor = 'cyan', 
  icon: Icon,
  success = null,
  onAction,
  onReset,
  onReorderLines,
  onChangeLineStat,
  onChangeOrderMode,
  footerSlot = null,
  disabled = false,
  actionLabel = null,
  actionDisabled = null,
}) {
  const handleDragStart = (event, slot) => {
    event.dataTransfer.setData('text/plain', String(slot));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event, slot) => {
    event.preventDefault();
    const sourceSlot = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isInteger(sourceSlot) || sourceSlot === slot || !onReorderLines) return;
    onReorderLines(sourceSlot, slot);
  };

  const themeClasses = {
    cyan: {
      border: 'border-cyan-500/20',
      bgGlow: 'bg-cyan-500/5',
      text: 'text-cyan-400',
      button: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20',
      accent: 'bg-cyan-400',
    },
    violet: {
      border: 'border-violet-500/20',
      bgGlow: 'bg-violet-500/5',
      text: 'text-violet-400',
      button: 'bg-violet-500/10 border-violet-500/30 text-violet-200 hover:bg-violet-500/20',
      accent: 'bg-violet-400',
    },
  }[themeColor];

  const visibleLines = [...relic.lines, ...(relic.hasFourthLine ? [relic.fourthLine] : [])];
  const mainStatDisplay = getMainStatDisplay(relic.mainStat, relic.level);
  const relicScore = scoreRelicWithProfile(relic, detectRelicScoreProfile(relic));
  const resolvedActionDisabled = actionDisabled ?? (disabled || relic.level >= 15);
  const resolvedActionLabel = actionLabel ?? (relic.level >= 15 ? 'MAXED' : (relic.hasFourthLine ? `UPGRADE +${Math.min(relic.level + 3, 15)}` : 'ADD LINE'));

  return (
    <article className="theme-glass-card force-overflow-visible group relative mt-16 flex-1 rounded-[1.5rem] border border-white/5 bg-transparent p-1 shadow-2xl transition-all duration-500 hover:border-white/10">
      {/* Dynamic Relic Overflow Image */}
      <div className="absolute -top-16 left-1/2 z-20 h-32 w-32 -translate-x-1/2 transform transition-transform duration-700 group-hover:scale-110">
         <div className={`absolute inset-0 ${themeClasses.bgGlow} blur-3xl opacity-60`} />
         {relic.setImage ? (
            <img 
              src={relic.setImage} 
              alt={relic.setName} 
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
            />
         ) : null}
      </div>

      <div className="relative rounded-[1.4rem] border border-white/5 bg-black/20 p-4 pt-12 backdrop-blur-3xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${themeClasses.border} bg-black/50`}>
              <Icon className={`h-4 w-4 ${themeClasses.text}`} />
            </div>
                            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`h-1 w-1 rounded-full ${themeClasses.accent}`} />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-500/50">{title}</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-white/90">{relic.pieceLabel || 'RELIC'}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="rounded-lg border border-white/5 bg-black/40 px-2.5 py-1 text-[9px] font-black text-white/60">
                +{relic.level}
             </div>
             {onChangeOrderMode && (
                <button 
                  onClick={() => onChangeOrderMode(relic.orderMode === 'random' ? 'custom' : 'random')}
                  className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-600 hover:text-white transition-colors"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
             )}
          </div>
        </div>

        {/* Set Name */}
        <div className="mb-4 text-center">
           <div className="truncate text-[7px] font-black uppercase tracking-[0.4em] text-slate-700">
              {relic.setName}
           </div>
        </div>

        {/* Main Stat */}
        <div className={`relative mb-4 flex items-center justify-between overflow-hidden rounded-xl border border-white/5 bg-black/40 px-4 py-2 shadow-sm`}>
           <div className="relative z-10 flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Main Stat</span>
              <span className="text-[11px] font-black uppercase text-white tracking-wide">{mainStatDisplay.label}</span>
           </div>
           <div className="relative z-10 text-right">
              <div className="text-[10px] font-black text-white/90">{mainStatDisplay.display}</div>
           </div>
           <Zap className={`relative z-10 h-3 w-3 ${themeClasses.text} opacity-20`} />
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                            <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Score</div>
            <div className="text-[10px] font-black text-white">{relicScore.score}</div>
          </div>
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Grade</div>
            <div className="text-[10px] font-black text-amber-200">{relicScore.grade}</div>
          </div>
          <div>
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Rolls</div>
            <div className="text-[10px] font-black text-cyan-200">{relicScore.rollCount}</div>
          </div>
        </div>

        {/* Substats */}
        <div className="space-y-1.5">
          {visibleLines.map((line) => {
            const feedback = getChallengeLineFeedback(success, line);
            return (
            <div
              key={`${title}-${line.slot}`}
              draggable={Boolean(onReorderLines)}
              onDragStart={(event) => handleDragStart(event, line.slot)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, line.slot)}
              className={`group/item relative overflow-hidden rounded-xl border transition-all duration-300 ${
                line.justHit 
                  ? `${themeClasses.border} ${themeClasses.bgGlow}` 
                  : feedback.isGoalHit
                    ? 'border-emerald-400/25 bg-emerald-500/8 hover:bg-emerald-500/12'
                    : feedback.isGoalMiss
                      ? 'border-rose-400/20 bg-rose-500/8 hover:bg-rose-500/12'
                      : 'border-white/5 bg-black/30 hover:bg-black/50'
              } ${onReorderLines ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="relative z-10 flex h-10 items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 border border-white/5 text-[8px] font-black ${line.justHit ? themeClasses.text : 'text-slate-700'}`}>
                    {relic.orderMode === 'custom' ? <GripVertical className="h-3 w-3 opacity-30" /> : `L${line.slot}`}
                  </div>
                  {relic.orderMode === 'custom' && onChangeLineStat ? (
                    <select
                      value={line.stat}
                      onChange={(event) => onChangeLineStat(line.slot, event.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase text-white outline-none"
                    >
                      {SUBSTATS.map(stat => <option key={stat} value={stat} className="bg-slate-900">{stat}</option>)}
                    </select>
                  ) : (
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase tracking-tight ${
                        line.justHit
                          ? 'text-white'
                          : feedback.isGoalHit
                            ? 'text-emerald-200'
                            : feedback.isGoalMiss
                              ? 'text-rose-200'
                              : 'text-slate-400'
                      }`}>
                        {line.stat}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-[11px] font-black ${
                    feedback.isGoalHit
                      ? 'text-emerald-200'
                      : feedback.isGoalMiss
                        ? 'text-rose-200'
                        : line.justHit
                          ? themeClasses.text
                          : 'text-slate-400'
                  }`}>
                    {formatStatValue(line.stat, line.value)}
                  </div>
                  <div className={`flex h-7 min-w-[38px] items-center justify-center rounded-lg px-2 text-[13px] font-black ${
                    feedback.isGoalHit
                      ? 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-100'
                      : feedback.isGoalMiss
                        ? 'border border-rose-400/20 bg-rose-500/15 text-rose-100'
                        : line.justHit
                          ? themeClasses.button
                          : 'bg-white/5 text-slate-700'
                  }`}>
                  x{getDisplayedLineRollCount(line)}
                  </div>
                </div>
              </div>
            </div>
          )})}

          {!relic.hasFourthLine && (
            <div className="flex h-10 items-center justify-between rounded-xl border border-dashed border-white/5 bg-white/[0.01] px-3 opacity-30">
               <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-dashed border-white/5 text-[8px] font-black text-slate-800">L4</div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-800">{relic.fourthLine.stat}</span>
                    <span className="text-[8px] font-mono text-slate-800">{formatStatValue(relic.fourthLine.stat, relic.fourthLine.value)}</span>
                  </div>
               </div>
               <span className="text-[7px] font-bold text-slate-900">LOCKED</span>
            </div>
          )}
        </div>

        {/* Compact Actions */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAction}
            disabled={resolvedActionDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              resolvedActionDisabled 
                ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-800' 
                : `${themeClasses.button}`
            }`}
          >
             {resolvedActionLabel}
             {!resolvedActionDisabled && <ChevronRight className="h-3 w-3" />}
          </button>
          
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-700 transition-all hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>

          {footerSlot}
        </div>
      </div>
    </article>
  );
}

function ForceRelicCard({ relic, onPrime, onReset, onCycleType, disabled = false }) {
  const lineTypeLabel = `${relic.baseLines}-Liner`;
  const nextLabel = relic.forcedLine;
  const visibleLines = relic.lines.slice(0, relic.currentLineCount);
  const previewLine = !relic.isPrimed && relic.currentLineCount < 4 ? relic.lines[relic.currentLineCount] : null;

  return (
    <article className="theme-glass-card force-overflow-visible group relative mt-16 flex-1 rounded-[1.5rem] border border-white/5 bg-transparent p-1 shadow-2xl transition-all duration-500 hover:border-white/10">
      <div className="absolute -top-16 left-1/2 z-20 h-32 w-32 -translate-x-1/2 transform transition-transform duration-700 group-hover:scale-110">
        <div className="absolute inset-0 bg-amber-500/10 blur-3xl opacity-60" />
        {relic.setImage ? (
          <img
            src={relic.setImage}
            alt={relic.setName}
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
          />
        ) : null}
      </div>

      <div className="relative rounded-[1.4rem] border border-white/5 bg-black/20 p-4 pt-12 backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-black/50">
              <Zap className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <div className="mb-0.5 flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-amber-400" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500/60">Force Relic</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-white/90">{lineTypeLabel}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-white/5 bg-black/40 px-2.5 py-1 text-[9px] font-black text-amber-200">
              Force {nextLabel}
            </div>
            <button
              id="challenge-tour-force-switch"
              type="button"
              onClick={onCycleType}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Switch force relic type: 1-liner / 2-liner / 3-liner"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Switch Force</span>
            </button>
          </div>
        </div>

        <div className="mb-4 text-center">
          <div className="truncate text-[7px] font-black uppercase tracking-[0.4em] text-slate-700">{relic.setName}</div>
        </div>

        <div className="mb-4 rounded-xl border border-white/5 bg-black/40 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Status</span>
              <span className="text-[11px] font-black uppercase tracking-wide text-white">
                {relic.isPrimed ? `Sitting on line ${relic.forcedLine}` : `Need to add line ${relic.forcedLine}`}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${relic.isPrimed ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/5 text-slate-500'}`}>
              {relic.isPrimed ? 'Primed' : 'Waiting'}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          {visibleLines.map((line) => (
            <div key={`force-${line.slot}`} className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${line.justHit ? 'border-amber-400/45 bg-amber-500/10' : 'border-white/5 bg-black/30'}`}>
              <div className="relative z-10 flex h-10 items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border border-white/5 text-[8px] font-black ${line.justHit ? 'text-amber-200' : 'text-slate-700'}`}>
                    L{line.slot}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${line.justHit ? 'text-white' : 'text-slate-500'}`}>{line.stat}</span>
                </div>
              </div>
            </div>
          ))}

          {previewLine ? (
            <div className="flex h-10 items-center justify-between rounded-xl border border-dashed border-amber-500/20 bg-amber-500/[0.04] px-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-dashed border-amber-500/20 text-[8px] font-black text-amber-200">
                  L{previewLine.slot}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">Open Line</span>
              </div>
              <span className="text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500">Next add</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onPrime}
            disabled={disabled || relic.isPrimed}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              disabled || relic.isPrimed
                ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-800'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18'
            }`}
          >
            {relic.isPrimed ? `Line ${relic.forcedLine} Ready` : `Add line ${relic.forcedLine}`}
            {!relic.isPrimed ? <ChevronRight className="h-3 w-3" /> : null}
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-700 transition-all hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </article>
  );
}

function ResultRelicCard({ relic, title, accent = 'cyan', success = null }) {
  if (!relic) {
    return (
      <div className="theme-subpanel rounded-xl p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
        <div className="mt-3 rounded-lg border border-dashed border-white/8 bg-white/[0.02] px-4 py-6 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          No submitted relic
        </div>
      </div>
    );
  }

  const relicScore = scoreRelicWithProfile(relic, detectRelicScoreProfile(relic));
  const mainStatDisplay = getMainStatDisplay(relic.mainStat, relic.level);
  const visibleLines = relic.hasFourthLine ? [...relic.lines, relic.fourthLine] : [...relic.lines, relic.fourthLine].filter(Boolean);
  const accentClasses = accent === 'rose'
    ? {
        chip: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
        dot: 'bg-rose-400',
      }
    : {
        chip: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
        dot: 'bg-cyan-400',
      };

  return (
    <div className="theme-subpanel rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
          <div className="mt-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white">
            <span>{relic.pieceLabel}</span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] text-slate-200">+{relic.level || 0}</span>
          </div>
        </div>
        <div className={`rounded-md border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${accentClasses.chip}`}>
          {relicScore.grade} · {relicScore.score}
        </div>
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/8 bg-white/[0.04] p-1">
          {relic.setImage ? (
            <img src={relic.setImage} alt={relic.setName} className="h-full w-full object-contain" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{relic.setName}</div>
          <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Main Stat</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-white">{mainStatDisplay.label}</span>
              <span className="text-[10px] font-black text-slate-200">{mainStatDisplay.display}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {visibleLines.filter(Boolean).map((line) => {
          const feedback = getChallengeLineFeedback(success, line);
          return (
          <div
            key={`result-${title}-${line.slot}`}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              feedback.isGoalHit
                ? 'border-emerald-400/25 bg-emerald-500/8'
                : feedback.isGoalMiss
                  ? 'border-rose-400/20 bg-rose-500/8'
                  : 'border-white/5 bg-white/[0.03]'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${accentClasses.dot}`} />
                <span className={`truncate text-[11px] font-black uppercase tracking-[0.16em] ${
                  feedback.isGoalHit ? 'text-emerald-100' : feedback.isGoalMiss ? 'text-rose-100' : 'text-slate-200'
                }`}>
                  {line.stat}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-[12px] font-black ${
                feedback.isGoalHit ? 'text-emerald-200' : feedback.isGoalMiss ? 'text-rose-200' : 'text-slate-300'
              }`}>
                {formatStatValue(line.stat, line.value)}
              </div>
              <div className={`rounded-lg px-2.5 py-1 text-[13px] font-black ${
                feedback.isGoalHit
                  ? 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-100'
                  : feedback.isGoalMiss
                    ? 'border border-rose-400/20 bg-rose-500/15 text-rose-100'
                    : 'border border-white/8 bg-white/[0.04] text-white'
              }`}>
                x{getDisplayedLineRollCount(line)}
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

export default function PlaygroundChallengePage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const { roleMode, getAuthHeader, user } = useAuth();
  const roomCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get('room') || '').trim().toUpperCase();
  }, [location.search]);
  const isPvpMode = Boolean(roomCode);
  const [currentContractId, setCurrentContractId] = useState('level01');
  const [completedContracts, setCompletedContracts] = useState([]);
  const [selectedTier, setSelectedTier] = useState('beginner');
  const [challengeModeView, setChallengeModeView] = useState('ladder');
  const [generatedScenario, setGeneratedScenario] = useState(null);
  const [pvpRoom, setPvpRoom] = useState(null);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [pvpError, setPvpError] = useState('');
  const [pvpFeed, setPvpFeed] = useState([]);
  const [showPvpResults, setShowPvpResults] = useState(false);
  const [pvpAttempts, setPvpAttempts] = useState([]);
  const [pvpAttemptsUsed, setPvpAttemptsUsed] = useState(1);
  const [pvpSubmittedAttempt, setPvpSubmittedAttempt] = useState(null);
  const [pvpBusted, setPvpBusted] = useState(false);
  const [copiedBotTrace, setCopiedBotTrace] = useState(false);
  const [signalFeedView, setSignalFeedView] = useState('feed');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const ladderContract = useMemo(() => getChallengeContract(currentContractId), [currentContractId]);
  const currentContract = useMemo(
    () => (challengeModeView === 'generated' && generatedScenario ? generatedScenario : ladderContract),
    [challengeModeView, generatedScenario, ladderContract]
  );
  const seedMood = currentContract.mood;
  const bucketKey = currentContract.seedLabel;
  const [patternProfile, setPatternProfile] = useState(() => createChallengePatternProfile(currentContract));
  const [relic, setRelic] = useState(() => createChallengeRelic(currentContract.targetRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
  const [testRelic, setTestRelic] = useState(() => createChallengeRelic(currentContract.builderRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
  const [forceRelic, setForceRelic] = useState(() => createChallengeForceRelic(currentContract.forceRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
  const [sessionRolls, setSessionRolls] = useState(() => createChallengeSessionEntries(currentContract));
  const [hintVisible, setHintVisible] = useState(false);
  const [sessionTab, setSessionTab] = useState('current');
  const [rollInput, setRollInput] = useState('');
  const [sharedCarryLine, setSharedCarryLine] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [testRelicLoopMode, setTestRelicLoopMode] = useState(true);
  const [mistakes, setMistakes] = useState(0);
  const [hintStep, setHintStep] = useState(0);
  const [triesUsed, setTriesUsed] = useState(1);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [pvpTourAutoFreeze, setPvpTourAutoFreeze] = useState(false);

  const containerRef = useRef(null);
  const lastPvpSyncRef = useRef('');
  const loadedPvpScenarioRef = useRef('');
  const lastPvpStartedAtRef = useRef('');
  const lastSegmentWidthsRef = useRef({});
  const lastLoggedChallengeResultRef = useRef('');
  const pvpTrackerRef = useRef({
    localLevel: 0,
    localStatus: '',
    localMistakes: 0,
    opponentLevel: 0,
    opponentStatus: '',
    opponentMistakes: 0,
    winnerUserId: '',
  });
  const moodConfig = SEED_MOODS[seedMood];
  const hintText = useMemo(() => describeHint(relic, patternProfile), [relic, patternProfile]);
  const predictorEntries = useMemo(() => buildEntryRows(sessionRolls), [sessionRolls]);
  const translatedRolls = useMemo(() => sessionRolls.map((entry) => entry.translated), [sessionRolls]);
  const prediction2 = useMemo(() => predictWithPairs(translatedRolls, { region: currentContract.region }), [translatedRolls, currentContract.region]);
  const helperLineOverride = forceRelic.isPrimed
    ? forceRelic.forcedLine
    : sharedCarryLine || relic.lastLine || testRelic.lastLine || null;
  const activeHint = hintStep > 0 ? currentContract.hints[Math.min(hintStep - 1, currentContract.hints.length - 1)] : null;
  const activeTourSteps = isPvpMode ? PVP_TOUR_STEPS : CHALLENGE_TOUR_STEPS;
  const lineHitsByStat = useMemo(() => getLineHitsByStat(relic), [relic]);
  const helpfulHits = useMemo(
    () => getHelpfulHitsForContract(lineHitsByStat, currentContract.success),
    [currentContract.success, lineHitsByStat]
  );
  const relicScore = useMemo(() => scoreRelicWithProfile(relic, detectRelicScoreProfile(relic)), [relic]);
  const scoreGuide = useMemo(() => describeRelicScoreGuide(relic), [relic]);
  const contractTargets = useMemo(() => describeContractTargets(currentContract.success), [currentContract.success]);
  const localDisplayedPvpLevel = useMemo(
    () => (currentContract.requiresSessionBuilder ? Math.max(relic.level || 0, testRelic.level || 0) : relic.level || 0),
    [currentContract.requiresSessionBuilder, relic.level, testRelic.level]
  );
  const currentPvpAttempt = useMemo(() => ({
    score: relicScore.score,
    grade: relicScore.grade,
    rollCount: relicScore.rollCount,
    helpfulHits,
    mistakes,
    goalSatisfied: evaluateContractSuccess(lineHitsByStat, currentContract.success),
    statBreakdown: lineHitsByStat,
    relicSnapshot: JSON.parse(JSON.stringify(relic)),
    summary: `${relic.setName || 'Relic'} ${relic.pieceLabel || ''} | ${relicScore.grade} ${relicScore.score}`,
    completionType: 'submitted',
  }), [currentContract.success, helpfulHits, lineHitsByStat, mistakes, relic, relic.pieceLabel, relic.setName, relicScore.grade, relicScore.rollCount, relicScore.score]);
  const bestPvpAttempt = useMemo(
    () => pvpAttempts.reduce((best, attempt) => (comparePvpAttempts(attempt, best) > 0 ? attempt : best), null),
    [pvpAttempts]
  );

  useEffect(() => {
    if (isPvpMode && !pvpRoom) return undefined;
    if (isPvpMode) {
      const viewerRole = pvpRoom?.viewerRole || null;
      const opponentUserId = String((viewerRole === 'host' ? pvpRoom?.guest?.userId : pvpRoom?.host?.userId) || '');
      if (!/^dev-bot/.test(opponentUserId)) return undefined;
    }
    if (isPvpMode && (pvpRoom?.status === 'active' || pvpRoom?.status === 'finished')) return undefined;
    const storageKey = isPvpMode ? PVP_TOUR_KEY : CHALLENGE_TOUR_KEY;
    try {
      const seenTour = window.localStorage.getItem(storageKey);
      if (!seenTour) {
        setTourStepIndex(0);
        setTourRunning(true);
        setPvpTourAutoFreeze(isPvpMode);
      }
    } catch {
      setTourStepIndex(0);
      setTourRunning(true);
      setPvpTourAutoFreeze(isPvpMode);
    }
    return undefined;
  }, [isPvpMode, pvpRoom]);

  const challengeStatus = useMemo(() => {
    if (relic.level < 15) {
      return {
        tone: 'progress',
        label: 'In Progress',
        text: currentContract.progressText,
      };
    }

    const success = currentContract.success || {};
    const junkHitCount = Array.isArray(success.junk)
      ? success.junk.reduce((sum, stat) => sum + (lineHitsByStat[stat] || 0), 0)
      : 0;

    if (success.type === 'dualCrit') {
      const requiredStats = Array.isArray(success.required) && success.required.length >= 2
        ? success.required.slice(0, 2)
        : ['CRIT RATE', 'CRIT DMG'];
      const firstStat = requiredStats[0];
      const secondStat = requiredStats[1];
      const firstHitCount = lineHitsByStat[firstStat] || 0;
      const secondHitCount = lineHitsByStat[secondStat] || 0;
      const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

      if (firstHitCount >= (success.minEach || 1) && secondHitCount >= (success.minEach || 1) && passedJunkGate) {
        return {
          tone: 'clear',
          label: 'Contract Clear',
          text: `Paired-line finish confirmed: ${firstStat} ${firstHitCount}, ${secondStat} ${secondHitCount}.`,
        };
      }

      return {
        tone: 'fail',
        label: 'Contract Failed',
        text: `You finished with ${firstStat} ${firstHitCount}, ${secondStat} ${secondHitCount}, and ${junkHitCount} junk-side hits. This contract needs both paired lines to be hit.`,
      };
    }

    if (success.type === 'dualCritCombined') {
      const requiredStats = Array.isArray(success.required) && success.required.length >= 2
        ? success.required.slice(0, 2)
        : ['CRIT RATE', 'CRIT DMG'];
      const firstStat = requiredStats[0];
      const secondStat = requiredStats[1];
      const firstHitCount = lineHitsByStat[firstStat] || 0;
      const secondHitCount = lineHitsByStat[secondStat] || 0;
      const combinedHits = firstHitCount + secondHitCount;
      const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

      if (combinedHits >= (success.minCombined || 2) && passedJunkGate) {
        return {
          tone: 'clear',
          label: 'Contract Clear',
          text: `Paired finish confirmed: ${firstStat} ${firstHitCount}, ${secondStat} ${secondHitCount}, junk ${junkHitCount}.`,
        };
      }

      return {
        tone: 'fail',
        label: 'Contract Failed',
        text: `You finished with ${firstStat} ${firstHitCount}, ${secondStat} ${secondHitCount}, and ${junkHitCount} junk-side hits. This contract needs at least ${(success.minCombined || 2)} combined hits on the paired stats.`,
      };
    }

    if (success.type === 'monoLine') {
      const targetHits = lineHitsByStat[success.target] || 0;
      const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

      if (targetHits >= (success.minHits || 1) && passedJunkGate) {
        return {
          tone: 'clear',
          label: 'Contract Clear',
          text: `Mono-line finish confirmed: ${success.target} hit ${targetHits} times.`,
        };
      }

      return {
        tone: 'fail',
        label: 'Contract Failed',
        text: `You finished with ${success.target} hit ${targetHits} times and ${junkHitCount} junk-side hits. This contract needs at least ${(success.minHits || 1)} ${success.target} hits.`,
      };
    }

    return {
      tone: 'fail',
      label: 'Contract Failed',
      text: 'This contract has no valid success evaluator yet.',
    };
  }, [currentContract.progressText, currentContract.success, lineHitsByStat, relic.level]);
  const isGeneratedChallengeActive = !isPvpMode && challengeModeView === 'generated';
  const nextContractId = useMemo(
    () => (isGeneratedChallengeActive ? null : getNextChallengeContractId(currentContract.id)),
    [currentContract.id, isGeneratedChallengeActive]
  );
  const canOpenContract = () => true;
  const maxTries = currentContract?.attempts?.maxTries ?? null;
  const pvpViewerRole = pvpRoom?.viewerRole || null;
  const pvpOpponent = useMemo(() => {
    if (!pvpRoom) return null;
    return pvpViewerRole === 'host' ? pvpRoom.guest : pvpRoom.host;
  }, [pvpRoom, pvpViewerRole]);
  const isOpponentBot = /^dev-bot/.test(String(pvpOpponent?.userId || ''));
  const canUsePvpGuide = !isPvpMode || isOpponentBot;
  const pvpCountdownLeft = useMemo(() => {
    if (!isPvpMode || pvpRoom?.status !== 'countdown') return 0;
    const startedAtMs = new Date(pvpRoom?.startedAt || 0).getTime();
    if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return 0;
    return Math.max(0, 5 - Math.floor((clockNow - startedAtMs) / 1000));
  }, [clockNow, isPvpMode, pvpRoom?.startedAt, pvpRoom?.status]);
  const authDisplayName = useMemo(() => resolveAuthDisplayName(user), [user]);
  const isPvpCountdownLocked = isPvpMode && pvpRoom?.status === 'countdown' && pvpCountdownLeft > 0;
  const isPvpTourFreezeActive = isPvpMode && pvpTourAutoFreeze && tourRunning && pvpRoom?.status === 'active';
  const isPvpInteractionLocked = isPvpCountdownLocked || isPvpTourFreezeActive;
  const opponentHelpfulHits = Math.max(0, Number(pvpOpponent?.state?.helpfulHits || 0));
  const playerHp = Math.max(0, 100 - opponentHelpfulHits * 25);
  const opponentHp = Math.max(0, 100 - helpfulHits * 25);
  const localPvpState = useMemo(() => {
    const summary = isPvpMode
      ? (pvpSubmittedAttempt?.summary || bestPvpAttempt?.summary || `Try ${pvpAttemptsUsed} live`)
      : challengeStatus.tone === 'clear'
        ? challengeStatus.text
        : `Lvl ${relic.level} | ${challengeStatus.label}`;

    let status = 'ready';
    let phase = 'idle';
    if (pvpRoom?.status === 'countdown') {
      status = 'countdown';
      phase = 'idle';
    } else if (pvpRoom?.status === 'active' || pvpRoom?.status === 'finished') {
      if (isPvpMode) {
        status = secondsLeft <= 0
          ? 'timeout'
          : pvpSubmittedAttempt
          ? 'submitted'
          : pvpBusted
            ? 'busted'
            : relic.level >= 15
              ? 'maxed'
              : 'attempting';
        phase = pvpSubmittedAttempt
          ? 'submitted_final'
          : pvpBusted
            ? 'busted'
            : secondsLeft <= 0
              ? 'timeout'
            : currentContract.requiresSessionBuilder && relic.level === 0
              ? (sessionRolls.length > 0 || testRelic.level > 0 ? 'building_read' : 'idle')
              : 'upgrading_target';
      } else if (secondsLeft <= 0) {
        status = 'timeout';
      } else if (relic.level >= 15 && challengeStatus.tone === 'fail') {
        status = 'attempt-failed';
      } else {
        status = 'racing';
      }
    }

    return {
      status,
      phase,
      currentLevel: localDisplayedPvpLevel,
      helpfulHits,
      hp: playerHp,
      tries: isPvpMode ? pvpAttemptsUsed : triesUsed,
      mistakes,
      score: isPvpMode ? Math.max(0, Number((pvpSubmittedAttempt?.score ?? bestPvpAttempt?.score) || 0)) : relicScore.score,
      grade: isPvpMode ? String((pvpSubmittedAttempt?.grade ?? bestPvpAttempt?.grade) || relicScore.grade) : relicScore.grade,
      rollCount: isPvpMode ? Math.max(0, Number((pvpSubmittedAttempt?.rollCount ?? bestPvpAttempt?.rollCount) || 0)) : relicScore.rollCount,
      hintStep,
      statBreakdown: isPvpMode ? (pvpSubmittedAttempt?.statBreakdown || bestPvpAttempt?.statBreakdown || {}) : lineHitsByStat,
      goalSatisfied: isPvpMode ? Boolean(pvpSubmittedAttempt?.goalSatisfied ?? bestPvpAttempt?.goalSatisfied) : challengeStatus.tone === 'clear',
      attemptsUsed: pvpAttemptsUsed,
      submittedAttempts: pvpSubmittedAttempt ? 1 : 0,
      finalScore: Math.max(0, Number(pvpSubmittedAttempt?.score || 0)),
      finalGrade: String(pvpSubmittedAttempt?.grade || 'F'),
      finalRollCount: Math.max(0, Number(pvpSubmittedAttempt?.rollCount || 0)),
      finalHelpfulHits: Math.max(0, Number(pvpSubmittedAttempt?.helpfulHits || 0)),
      finalMistakes: Math.max(0, Number(pvpSubmittedAttempt?.mistakes || 0)),
      finalGoalSatisfied: Boolean(pvpSubmittedAttempt?.goalSatisfied || false),
      finalStatBreakdown: pvpSubmittedAttempt?.statBreakdown || {},
      finalRelicSnapshot: pvpSubmittedAttempt?.relicSnapshot || (secondsLeft <= 0 ? JSON.parse(JSON.stringify(relic)) : null),
      finalRelicSummary: pvpSubmittedAttempt?.summary || (secondsLeft <= 0 ? `${relic.setName || 'Relic'} ${relic.pieceLabel || ''} | timeout at +${relic.level}` : ''),
      currentRelicSnapshot: JSON.parse(JSON.stringify(relic)),
      currentRelicSummary: `${relic.setName || 'Relic'} ${relic.pieceLabel || ''} | +${relic.level} | ${relicScore.grade} ${relicScore.score}`,
      sessionEntriesBuilt: sessionRolls.length,
      sessionEntries: sessionRolls,
      bestScore: Math.max(0, Number(bestPvpAttempt?.score || 0)),
      bestGrade: String(bestPvpAttempt?.grade || relicScore.grade),
      bestRollCount: Math.max(0, Number(bestPvpAttempt?.rollCount || 0)),
      bestHelpfulHits: Math.max(0, Number(bestPvpAttempt?.helpfulHits || 0)),
      bestMistakes: Math.max(0, Number(bestPvpAttempt?.mistakes || 0)),
      bestGoalSatisfied: Boolean(bestPvpAttempt?.goalSatisfied || false),
      bestStatBreakdown: bestPvpAttempt?.statBreakdown || {},
      bestRelicSnapshot: bestPvpAttempt?.relicSnapshot || null,
      bestRelicSummary: bestPvpAttempt?.summary || '',
      relicSummary: summary,
      displayName: pvpViewerRole === 'host' ? pvpRoom?.host?.name : pvpRoom?.guest?.name,
      displayTitle: pvpViewerRole === 'host' ? pvpRoom?.host?.state?.displayTitle : pvpRoom?.guest?.state?.displayTitle,
      displayTitleRarity: pvpViewerRole === 'host' ? pvpRoom?.host?.state?.displayTitleRarity : pvpRoom?.guest?.state?.displayTitleRarity,
    };
  }, [
    challengeStatus.label,
    challengeStatus.text,
    challengeStatus.tone,
    hintStep,
    lineHitsByStat,
    mistakes,
    pvpRoom,
    pvpViewerRole,
    helpfulHits,
    isPvpMode,
    currentContract.requiresSessionBuilder,
    localDisplayedPvpLevel,
    bestPvpAttempt,
    pvpAttempts.length,
    pvpAttemptsUsed,
    pvpBusted,
    pvpSubmittedAttempt,
    playerHp,
    relic.level,
    sessionRolls.length,
    testRelic.level,
    relicScore.grade,
    relicScore.rollCount,
    relicScore.score,
    sessionRolls.length,
    secondsLeft,
    triesUsed,
  ]);
  const viewerDisplayName = localPvpState.displayName || authDisplayName || 'Trailblazer';
  const pvpPressureLabel = useMemo(() => {
    if (!isPvpMode) return '';
    const yourLevel = relic.level || 0;
    const enemyLevel = Number(pvpOpponent?.state?.currentLevel || 0);
    if (pvpRoom?.status === 'finished') {
      return pvpRoom?.winnerUserId === user?.id ? 'Victory locked.' : 'Opponent got there first.';
    }
    if (yourLevel === enemyLevel) return 'Neck and neck.';
    if (yourLevel >= enemyLevel + 6) return 'You are pulling ahead.';
    if (enemyLevel >= yourLevel + 6) return 'Opponent pressure is rising.';
    if (yourLevel > enemyLevel) return 'You are slightly ahead.';
    return 'Opponent has the edge.';
  }, [isPvpMode, pvpOpponent?.state?.currentLevel, pvpRoom?.status, pvpRoom?.winnerUserId, relic.level, user?.id]);
  const localBestRelicSnapshot = localPvpState?.finalRelicSnapshot || localPvpState?.bestRelicSnapshot || bestPvpAttempt?.relicSnapshot || null;
  const opponentBestRelicSnapshot = pvpOpponent?.state?.finalRelicSnapshot || pvpOpponent?.state?.bestRelicSnapshot || null;
  const localResultUsesTimeout = localPvpState?.status === 'timeout' && Boolean(localPvpState?.finalRelicSnapshot);
  const opponentResultUsesTimeout = String(pvpOpponent?.state?.status || '') === 'timeout' && Boolean(pvpOpponent?.state?.finalRelicSnapshot);
  const localResultScore = localResultUsesTimeout ? localPvpState.finalScore : (localPvpState.bestScore ?? localPvpState.score);
  const localResultGrade = localResultUsesTimeout ? localPvpState.finalGrade : (localPvpState.bestGrade ?? localPvpState.grade);
  const localResultMistakes = localResultUsesTimeout ? localPvpState.finalMistakes : (localPvpState.bestMistakes ?? localPvpState.mistakes);
  const localResultHelpful = localResultUsesTimeout ? localPvpState.finalHelpfulHits : (localPvpState.bestHelpfulHits ?? localPvpState.helpfulHits);
  const localResultLevel = localBestRelicSnapshot?.level ?? localPvpState?.currentLevel ?? 0;
  const opponentResultScore = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalScore ?? 0) : (pvpOpponent?.state?.bestScore ?? pvpOpponent?.state?.score ?? 0);
  const opponentResultGrade = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalGrade || 'F') : (pvpOpponent?.state?.bestGrade || pvpOpponent?.state?.grade || 'F');
  const opponentResultMistakes = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalMistakes ?? 0) : (pvpOpponent?.state?.bestMistakes ?? pvpOpponent?.state?.mistakes ?? 0);
  const opponentResultHelpful = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalHelpfulHits ?? 0) : (pvpOpponent?.state?.bestHelpfulHits ?? pvpOpponent?.state?.helpfulHits ?? 0);
  const opponentResultLevel = opponentBestRelicSnapshot?.level ?? pvpOpponent?.state?.currentLevel ?? 0;
  const localWonPvp = Boolean(pvpRoom?.winnerUserId) && String(pvpRoom?.winnerUserId) === String(user?.id || '');
  const opponentWonPvp = Boolean(pvpRoom?.winnerUserId) && !localWonPvp;
  const localResultStateLabel = localResultUsesTimeout ? 'Timed out' : localPvpState.bestScore > 0 ? 'Submitted' : 'No clear';
  const opponentResultStateLabel = opponentResultUsesTimeout ? 'Timed out' : Number(pvpOpponent?.state?.bestScore || 0) > 0 ? 'Submitted' : 'No clear';
  const opponentDebugLog = Array.isArray(pvpOpponent?.state?.debugLog) ? pvpOpponent.state.debugLog : [];
  const opponentSessionEntries = Array.isArray(pvpOpponent?.state?.sessionArchive)
    ? pvpOpponent.state.sessionArchive
    : (Array.isArray(pvpOpponent?.state?.sessionEntries) ? pvpOpponent.state.sessionEntries : []);
  const opponentSessionEntriesNewestFirst = useMemo(
    () => [...opponentSessionEntries].reverse(),
    [opponentSessionEntries]
  );
  const opponentDebugLogNewestFirst = useMemo(
    () => [...opponentDebugLog].reverse(),
    [opponentDebugLog]
  );
  useEffect(() => {
    if (!isPvpMode) return;
    setSignalFeedView('details');
  }, [isOpponentBot, isPvpMode, roomCode]);
  const showBotTrace = isOpponentBot && opponentDebugLog.length > 0;
  const activePvpScenario = pvpRoom?.scenario || currentContract;
  const botTraceExport = useMemo(() => JSON.stringify({
    roomCode: pvpRoom?.code || roomCode || null,
    tier: pvpRoom?.tier || null,
    difficulty: pvpRoom?.difficulty || null,
    seedLabel: pvpRoom?.seedLabel || activePvpScenario?.seedLabel || null,
    targetSet: activePvpScenario?.targetRelic?.setName || activePvpScenario?.targetRelic?.setNameHint || null,
    targetStatGuide: activePvpScenario?.targetStatGuide || null,
    success: activePvpScenario?.success || null,
    targetRelic: activePvpScenario?.targetRelic || null,
    botState: pvpOpponent?.state || null,
    botBestRelic: opponentBestRelicSnapshot || null,
    botSessionEntries: opponentSessionEntriesNewestFirst,
    botDebugLog: opponentDebugLogNewestFirst,
  }, null, 2), [
    activePvpScenario?.seedLabel,
    activePvpScenario?.success,
    activePvpScenario?.targetRelic,
    activePvpScenario?.targetStatGuide,
    opponentBestRelicSnapshot,
    opponentSessionEntriesNewestFirst,
    opponentDebugLogNewestFirst,
    pvpOpponent?.state,
    pvpRoom?.code,
    pvpRoom?.difficulty,
    pvpRoom?.seedLabel,
    pvpRoom?.tier,
    roomCode,
  ]);

  const pushPvpFeed = useCallback((tone, text) => {
    setPvpFeed((current) => {
      const entry = {
        id: `pvp-feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tone,
        text,
      };
      return [entry, ...current].slice(0, 8);
    });
  }, []);

  const handleCopyBotTrace = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(botTraceExport);
      setCopiedBotTrace(true);
      window.setTimeout(() => setCopiedBotTrace(false), 1400);
    } catch {
      setCopiedBotTrace(false);
    }
  }, [botTraceExport]);

  const fetchPvpRoom = useCallback(async ({ silent = false } = {}) => {
    if (!isPvpMode || !roomCode) return null;
    if (!silent) setPvpLoading(true);
    try {
      const response = await fetchWithTimeout(buildApiUrl(`/api/pvp?code=${encodeURIComponent(roomCode)}`), {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load PvP room.');
      }
      setPvpRoom(payload.room || null);
      setPvpError('');
      return payload.room || null;
    } catch (error) {
      setPvpError(getPvpFetchErrorMessage(error, 'Failed to load PvP room.'));
      return null;
    } finally {
      if (!silent) setPvpLoading(false);
    }
  }, [getAuthHeader, isPvpMode, roomCode]);

  const handleRestartPvpMatch = useCallback(async () => {
    if (!roomCode) return;
    try {
      setPvpLoading(true);
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'restart',
          code: roomCode,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to restart match.');
      }
      setPvpRoom(body.room || null);
      setShowPvpResults(false);
      setPvpError('');
    } catch (error) {
      setPvpError(getPvpFetchErrorMessage(error, 'Failed to restart match.'));
    } finally {
      setPvpLoading(false);
    }
  }, [getAuthHeader, roomCode]);

  const handleRerollPvpMatch = useCallback(async () => {
    if (!roomCode) return;
    try {
      setPvpLoading(true);
      const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          action: 'reroll-restart',
          code: roomCode,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to reroll match.');
      }
      setPvpRoom(body.room || null);
      setShowPvpResults(false);
      setPvpError('');
    } catch (error) {
      setPvpError(getPvpFetchErrorMessage(error, 'Failed to reroll match.'));
    } finally {
      setPvpLoading(false);
    }
  }, [getAuthHeader, roomCode]);

  const handleSubmitPvpAttempt = useCallback(() => {
    if (!isPvpMode) return;
    if (isPvpInteractionLocked) return;
    if (pvpAttemptsUsed > 3) return;
    if (relic.level < 15) return;
    if (pvpSubmittedAttempt || pvpBusted) return;

    setPvpAttempts((current) => [...current, currentPvpAttempt].slice(0, 3));
    setPvpSubmittedAttempt(currentPvpAttempt);

    setPvpFeed((current) => [
      {
        id: `pvp-feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tone: 'player',
        text: `Final relic submitted on try ${pvpAttemptsUsed} with ${currentPvpAttempt.grade} ${currentPvpAttempt.score}.`,
      },
      ...current,
    ].slice(0, 8));
  }, [currentPvpAttempt, isPvpMode, isPvpInteractionLocked, pvpAttemptsUsed, pvpBusted, pvpSubmittedAttempt, relic.level]);

  const handleResetPvpAttempt = useCallback(() => {
    if (!isPvpMode) {
      resetChallengeMode();
      return;
    }
    if (isPvpInteractionLocked) return;
    if (pvpSubmittedAttempt || pvpBusted) {
      return;
    }

    const hasProgress = relic.level > 0
      || relic.hasFourthLine
      || mistakes > 0
      || (currentContract.requiresSessionBuilder && (testRelic.level > 0 || sessionRolls.length > 0));
    if (!hasProgress) return;

    setPvpAttempts((current) => [...current, currentPvpAttempt].slice(0, 3));
    const nextUsed = pvpAttemptsUsed + 1;
    setPvpAttemptsUsed(nextUsed);
    setPvpFeed((current) => [
      {
        id: `pvp-feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tone: 'warning',
        text: nextUsed > 3 ? `You exceeded the retry limit and lost the duel.` : `Try ${pvpAttemptsUsed} was abandoned at +${relic.level}.`,
      },
      ...current,
    ].slice(0, 8));
    if (nextUsed > 3) {
      setPvpBusted(true);
      return;
    }
    setRelic(createChallengeRelic(currentContract.targetRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
    if (!currentContract.requiresSessionBuilder) {
      setTestRelic(createChallengeRelic(currentContract.builderRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
    }
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: currentContract.forceRelic.baseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
    if (!currentContract.requiresSessionBuilder) {
      setSessionRolls([]);
      setSharedCarryLine(null);
    }
    setMistakes(0);
    setHintStep(0);
    setHintVisible(false);
  }, [currentContract, currentPvpAttempt, isPvpMode, isPvpInteractionLocked, mistakes, pvpAttemptsUsed, relic.hasFourthLine, relic.level, pvpBusted, pvpSubmittedAttempt, sessionRolls.length, testRelic.level]);

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    gsap.fromTo(q('.gsap-fade-up'), 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (!isPvpMode || !containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    const bars = q('.pvp-animate-width');
    bars.forEach((bar) => {
      const targetWidth = bar.getAttribute('data-target-width') || bar.style.width || '0%';
      gsap.fromTo(bar, {
        x: -12,
        opacity: 0.75,
      }, {
        width: targetWidth,
        x: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
    const segments = q('.pvp-segment-fill');
    segments.forEach((segment) => {
      const targetWidth = segment.getAttribute('data-target-width') || '0%';
      const progressKey = segment.getAttribute('data-progress-key') || '';
      const previousWidth = lastSegmentWidthsRef.current[progressKey];
      if (previousWidth == null) {
        gsap.set(segment, { width: targetWidth, x: 0, opacity: 1 });
      } else if (previousWidth !== targetWidth) {
        gsap.fromTo(segment, {
          width: previousWidth,
          x: -8,
          opacity: 0.72,
        }, {
          width: targetWidth,
          x: 0,
          opacity: 1,
          duration: 0.42,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      } else {
        gsap.set(segment, { width: targetWidth, x: 0, opacity: 1 });
      }
      lastSegmentWidthsRef.current[progressKey] = targetWidth;
    });
    gsap.fromTo(q('.pvp-stat-pill'), {
      y: 6,
      opacity: 0.55,
    }, {
      y: 0,
      opacity: 1,
      duration: 0.28,
      stagger: 0.03,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [isPvpMode, localDisplayedPvpLevel, opponentHp, playerHp, pvpOpponent?.state?.currentLevel]);

  useEffect(() => {
    if (!isPvpMode) return;
    fetchPvpRoom();
  }, [fetchPvpRoom, isPvpMode]);

  useEffect(() => {
    if (!isPvpMode || !roomCode) return undefined;
    if (isPvpTourFreezeActive) return undefined;
    const interval = window.setInterval(() => {
      fetchPvpRoom({ silent: true });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [fetchPvpRoom, isPvpMode, isPvpTourFreezeActive, roomCode]);

  useEffect(() => {
    if (!isPvpMode) return undefined;
    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 250);
    return () => window.clearInterval(interval);
  }, [isPvpMode]);

  useEffect(() => {
    if (!isPvpMode || pvpRoom?.status !== 'countdown' || pvpCountdownLeft > 0) return;
    fetchPvpRoom({ silent: true });
  }, [fetchPvpRoom, isPvpMode, pvpCountdownLeft, pvpRoom?.status]);

  useEffect(() => {
    if (!isPvpMode || !pvpRoom?.scenario) return;
    const scenarioId = String(pvpRoom.scenario?.id || pvpRoom.scenario?.slug || roomCode || '');
    if (!scenarioId) return;
    if (loadedPvpScenarioRef.current === scenarioId) return;
    loadedPvpScenarioRef.current = scenarioId;
    setGeneratedScenario(pvpRoom.scenario);
  }, [isPvpMode, pvpRoom?.scenario, roomCode]);

  useEffect(() => {
    if (!isPvpMode) return;
    const startedAt = String(pvpRoom?.startedAt || '');
    if (!startedAt) return;
    if (startedAt === lastPvpStartedAtRef.current) return;
    lastPvpStartedAtRef.current = startedAt;
    resetChallengeMode({ nextContract: pvpRoom?.scenario || currentContract, incrementTry: false });
    setPvpFeed([]);
    setPvpAttempts([]);
    setPvpAttemptsUsed(1);
    setPvpSubmittedAttempt(null);
    setPvpBusted(false);
    setShowPvpResults(false);
    lastPvpSyncRef.current = '';
  }, [currentContract, isPvpMode, pvpRoom?.scenario, pvpRoom?.startedAt]);

  useEffect(() => {
    if (!isPvpMode) return;
    if (isPvpTourFreezeActive) {
      setTimerRunning(false);
      return;
    }
    if (pvpRoom?.status === 'active') {
      setTimerRunning(true);
    }
    if (pvpRoom?.status === 'finished') {
      setTimerRunning(false);
    }
  }, [isPvpMode, isPvpTourFreezeActive, pvpRoom?.status]);

  useEffect(() => {
    if (challengeStatus.tone !== 'clear') return;
    if (isGeneratedChallengeActive) return;
    setCompletedContracts((existing) => (existing.includes(currentContract.id) ? existing : [...existing, currentContract.id]));
  }, [challengeStatus.tone, currentContract.id, isGeneratedChallengeActive]);

  useEffect(() => {
    if (isPvpMode) return;
    if (!user?.id) return;
    if (challengeStatus.tone !== 'clear') return;

    const clearTimeSeconds = Math.max(0, 300 - Number(secondsLeft || 0));
    const logKey = [
      currentContract.id,
      currentContract.seedLabel,
      relicScore.score,
      triesUsed,
      clearTimeSeconds,
    ].join('|');

    if (lastLoggedChallengeResultRef.current === logKey) return;
    lastLoggedChallengeResultRef.current = logKey;

    fetch(buildApiUrl('/api/challenge-results'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        contractId: currentContract.id,
        contractTitle: currentContract.title,
        difficulty: currentContract.difficulty,
        seedLabel: currentContract.seedLabel,
        region: currentContract.region,
        score: relicScore.score,
        grade: relicScore.grade,
        helpfulHits,
        mistakes,
        clearTimeSeconds,
        triesUsed,
        generated: isGeneratedChallengeActive,
      }),
    }).catch(() => {});
  }, [
    challengeStatus.tone,
    currentContract.difficulty,
    currentContract.id,
    currentContract.region,
    currentContract.seedLabel,
    currentContract.title,
    getAuthHeader,
    helpfulHits,
    isGeneratedChallengeActive,
    isPvpMode,
    mistakes,
    relicScore.grade,
    relicScore.score,
    secondsLeft,
    triesUsed,
    user?.id,
  ]);


  useEffect(() => {
    if (!timerRunning) return undefined;

    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  const resetChallengeMode = (options = {}) => {
    const { nextContract = currentContract, incrementTry = true } = options;
    setPatternProfile(createChallengePatternProfile(nextContract));
    setRelic(createChallengeRelic(nextContract.targetRelic, { rollTierMode: nextContract?.pvpRollTier || null }));
    setTestRelic(createChallengeRelic(nextContract.builderRelic, { rollTierMode: nextContract?.pvpRollTier || null }));
    setForceRelic(createChallengeForceRelic({
      ...nextContract.forceRelic,
      baseLines: nextContract.forceRelic.baseLines,
    }, { rollTierMode: nextContract?.pvpRollTier || null }));
    setSessionRolls(createChallengeSessionEntries(nextContract));
    setSharedCarryLine(null);
    setHintVisible(false);
    setMistakes(0);
    setHintStep(0);
    setSecondsLeft(300);
    setTimerRunning(false);
    setTriesUsed((current) => (incrementTry ? current + 1 : 1));
  };

  useEffect(() => {
    resetChallengeMode({ nextContract: currentContract, incrementTry: false });
    if (!isPvpMode) {
      setPvpAttempts([]);
      setPvpAttemptsUsed(1);
      setPvpSubmittedAttempt(null);
      setPvpBusted(false);
    }
  }, [currentContract]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (isPvpMode) return;
    if (searchParams.get('custom') !== 'latest') return;

    const stateScenario = location.state?.customScenario;
    const storedScenario = stateScenario || readCustomChallengeScenario();
    if (!storedScenario) return;

    setGeneratedScenario(storedScenario);
  }, [isPvpMode, location.search, location.state]);

  useEffect(() => {
    if (!isPvpMode || !pvpRoom?.viewerRole) return undefined;
    if (pvpRoom.status !== 'active' && pvpRoom.status !== 'finished') return undefined;

    const payload = JSON.stringify(localPvpState);
    if (payload === lastPvpSyncRef.current) return undefined;

    const syncTimer = window.setTimeout(async () => {
      try {
        const response = await fetchWithTimeout(buildApiUrl('/api/pvp'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            action: 'update',
            code: roomCode,
            state: localPvpState,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || 'Failed to sync room state.');
        }
        lastPvpSyncRef.current = payload;
        setPvpRoom(body.room || null);
      } catch (error) {
        setPvpError(getPvpFetchErrorMessage(error, 'Failed to sync room state.'));
      }
    }, 400);

    return () => window.clearTimeout(syncTimer);
  }, [getAuthHeader, isPvpMode, localPvpState, pvpRoom?.status, pvpRoom?.viewerRole, roomCode]);

  useEffect(() => {
    if (!isPvpMode) return;

    const previous = pvpTrackerRef.current;
    const currentLocalLevel = Number(localPvpState.currentLevel || 0);
    const currentLocalStatus = localPvpState.status || '';
    const currentLocalAttemptsUsed = Number(localPvpState.attemptsUsed || 0);
    const currentLocalSubmitted = Number(localPvpState.submittedAttempts || 0);
    const currentLocalMistakes = mistakes || 0;
    const currentOpponentLevel = Number(pvpOpponent?.state?.currentLevel || 0);
    const currentOpponentStatus = String(pvpOpponent?.state?.status || '');
    const currentOpponentAttemptsUsed = Number(pvpOpponent?.state?.attemptsUsed || 0);
    const currentOpponentSubmitted = Number(pvpOpponent?.state?.submittedAttempts || 0);
    const currentOpponentMistakes = Number(pvpOpponent?.state?.mistakes || 0);
    const currentWinner = String(pvpRoom?.winnerUserId || '');

    if (currentLocalLevel > previous.localLevel) {
      pushPvpFeed('player', `You reached +${currentLocalLevel}.`);
    }
    if (currentOpponentLevel > previous.opponentLevel) {
      pushPvpFeed('opponent', `${pvpOpponent?.name || 'Opponent'} reached +${currentOpponentLevel}.`);
    }
    if (currentLocalMistakes > previous.localMistakes) {
      pushPvpFeed('warning', 'You made a mistake.');
    }
    if (currentOpponentMistakes > previous.opponentMistakes) {
      pushPvpFeed('opponent', `${pvpOpponent?.name || 'Opponent'} made a mistake.`);
    }
    if (currentLocalSubmitted > previous.localSubmitted) {
      pushPvpFeed('player', `You submitted attempt ${currentLocalSubmitted}.`);
    }
    if (currentOpponentSubmitted > previous.opponentSubmitted) {
      pushPvpFeed('opponent', `${pvpOpponent?.name || 'Opponent'} submitted attempt ${currentOpponentSubmitted}.`);
    }
    if (currentLocalAttemptsUsed > previous.localAttemptsUsed && currentLocalSubmitted === previous.localSubmitted) {
      pushPvpFeed('warning', `You burned attempt ${currentLocalAttemptsUsed}.`);
    }
    if (currentOpponentAttemptsUsed > previous.opponentAttemptsUsed && currentOpponentSubmitted === previous.opponentSubmitted) {
      pushPvpFeed('opponent', `${pvpOpponent?.name || 'Opponent'} burned attempt ${currentOpponentAttemptsUsed}.`);
    }
    if (currentWinner && currentWinner !== previous.winnerUserId) {
      pushPvpFeed(
        currentWinner === String(user?.id || '') ? 'player' : 'opponent',
        currentWinner === String(user?.id || '') ? 'Victory secured.' : `${pvpOpponent?.name || 'Opponent'} won the duel.`
      );
    }

    pvpTrackerRef.current = {
      localLevel: currentLocalLevel,
      localStatus: currentLocalStatus,
      localAttemptsUsed: currentLocalAttemptsUsed,
      localSubmitted: currentLocalSubmitted,
      localMistakes: currentLocalMistakes,
      opponentLevel: currentOpponentLevel,
      opponentStatus: currentOpponentStatus,
      opponentAttemptsUsed: currentOpponentAttemptsUsed,
      opponentSubmitted: currentOpponentSubmitted,
      opponentMistakes: currentOpponentMistakes,
      winnerUserId: currentWinner,
    };
  }, [
    isPvpMode,
    localPvpState.status,
    localPvpState.attemptsUsed,
    localPvpState.submittedAttempts,
    mistakes,
    pvpOpponent?.name,
    pvpOpponent?.state?.attemptsUsed,
    pvpOpponent?.state?.currentLevel,
    pvpOpponent?.state?.mistakes,
    pvpOpponent?.state?.status,
    pvpOpponent?.state?.submittedAttempts,
    pvpRoom?.winnerUserId,
    pushPvpFeed,
    localPvpState.currentLevel,
    user?.id,
  ]);

  useEffect(() => {
    if (!isPvpMode) return;
    if (pvpRoom?.status === 'finished') {
      setShowPvpResults(true);
    }
  }, [isPvpMode, pvpRoom?.status]);

  const handleStartSession = () => {
    if (isPvpInteractionLocked) return;
    setTimerRunning(true);
  };

  const handleOpenHandcraftedContract = (contractId) => {
    setChallengeModeView('ladder');
    setCurrentContractId(contractId);
  };

  const handleGenerateScenario = () => {
    const nextScenario = createChallengeScenario({ tier: selectedTier, generated: true });
    setGeneratedScenario(nextScenario);
    setChallengeModeView('generated');
  };

  const updateRelicState = (kind, updater) => {
    if (kind === 'target') {
      setRelic((current) => updater(current));
      return;
    }
    if (kind === 'test') {
      setTestRelic((current) => updater(current));
      return;
    }
    setForceRelic((current) => updater(current));
  };

  const handleBaseUpgrade = (currentRelic, currentPatternProfile, forcedSlot = null) => {
    if (!currentRelic.hasFourthLine) {
      return {
        ...currentRelic,
        level: 3,
        lastLine: 4,
        lastRawPair: '',
        lastVisibleRoll: '',
        hasFourthLine: true,
        lines: currentRelic.lines.map((line) => ({ ...line, justHit: false })),
        fourthLine: { ...activateRelicLine(currentRelic.fourthLine), justHit: false },
      };
    }

    if (currentRelic.level >= 15) return currentRelic;

    const nextSequenceIndex = Array.isArray(currentPatternProfile?.history) ? currentPatternProfile.history.length : 0;
    const visibleRoll = getVisibleRollForUpgrade(currentPatternProfile, nextSequenceIndex);
    const previousLine = Number.isInteger(forcedSlot)
      ? forcedSlot
      : (sharedCarryLine || currentRelic.lastLine || 4);
    const { rawPair, targetSlot } = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
    const nextLevel = Math.min(currentRelic.level + 3, 15);
    const activeLines = [...currentRelic.lines, currentRelic.fourthLine].map((line) => (
      line.slot === targetSlot ? applyUpgradeRoll(line) : { ...line, justHit: false }
    ));

    return {
      ...currentRelic,
      level: nextLevel,
      lastLine: targetSlot,
      lastRawPair: rawPair,
      lastVisibleRoll: visibleRoll,
      lines: activeLines.slice(0, 3),
      fourthLine: activeLines[3],
    };
  };

  const handlePracticeRelicAction = () => {
    if (isPvpInteractionLocked) return;
    const nextRelic = handleBaseUpgrade(relic, patternProfile, forceRelic.isPrimed && relic.hasFourthLine ? forceRelic.forcedLine : null);
    setRelic(nextRelic);

    if (nextRelic.level > relic.level && nextRelic.lastVisibleRoll) {
      setPatternProfile((current) => advancePatternProfile(current, nextRelic.lastVisibleRoll));
      setSharedCarryLine(nextRelic.lastLine || null);
    }

    if (forceRelic.isPrimed && relic.hasFourthLine) {
      setForceRelic(createForceRelic(forceRelic.baseLines));
    } else if (relic.hasFourthLine && nextRelic.lastLine && ![1, 2].includes(nextRelic.lastLine)) {
      setMistakes((current) => current + 1);
    }
  };

  const handleTestRelicAction = () => {
    if (isPvpInteractionLocked) return;
    const rollTierMode = currentContract?.pvpRollTier || null;
    const applyBuilderStep = (startingRelic, startingProfile) => {
      let nextRelic = handleBaseUpgrade(startingRelic, startingProfile);
      const previousLevel = startingRelic.level;
      let nextProfile = startingProfile;
      let nextCarryLine = nextRelic.lastLine || null;
      const builtEntries = [];

      if (currentContract.requiresSessionBuilder && nextRelic.level > previousLevel) {
        if (!startingRelic.hasFourthLine && nextRelic.level === 3) {
          const sessionEntry = createSessionEntry('44');
          nextRelic = {
            ...nextRelic,
            lastLine: 4,
            lastRawPair: '44',
            lastVisibleRoll: '44',
          };
          if (sessionEntry) {
            builtEntries.push(sessionEntry);
            nextProfile = advancePatternProfile(nextProfile, '44');
            nextCarryLine = 4;
          }
        } else if (nextRelic.lastRawPair) {
          const sessionEntry = createSessionEntry(nextRelic.lastRawPair);
          const sessionVisibleRoll = sessionEntry?.translated || nextRelic.lastVisibleRoll || '';
          if (sessionEntry) {
            builtEntries.push(sessionEntry);
          }
          if (sessionVisibleRoll) {
            nextProfile = advancePatternProfile(nextProfile, sessionVisibleRoll);
            nextCarryLine = nextRelic.lastLine || nextCarryLine;
          }
        }
      } else if (nextRelic.level > previousLevel && nextRelic.lastVisibleRoll) {
        nextProfile = advancePatternProfile(nextProfile, nextRelic.lastVisibleRoll);
        nextCarryLine = nextRelic.lastLine || nextCarryLine;
      }

      return {
        relic: nextRelic,
        profile: nextProfile,
        carryLine: nextCarryLine,
        entries: builtEntries,
      };
    };

    const runBuilderLoop = () => {
      let workingRelic =
        testRelic.level >= 15
          ? createChallengeRelic(currentContract.builderRelic, {
              readyForUpgrades: true,
              carryLine: testRelic.lastLine,
              rollTierMode,
            })
          : testRelic;
      let workingProfile = patternProfile;
      let workingCarryLine = sharedCarryLine;
      const builtEntries = [];
      let safety = 0;

      // Opening line 4 is a distinct step. Loop mode should not skip past it on the first click.
      if (!workingRelic.hasFourthLine) {
        const firstStep = applyBuilderStep(workingRelic, workingProfile);
        setTestRelic(firstStep.relic);
        setPatternProfile(firstStep.profile);
        setSharedCarryLine(firstStep.carryLine || null);
        if (firstStep.entries.length > 0) {
          setSessionRolls((existing) => [...existing, ...firstStep.entries]);
        }
        return;
      }

      while (workingRelic.level < 15 && safety < 8) {
        const result = applyBuilderStep(workingRelic, workingProfile);
        workingRelic = result.relic;
        workingProfile = result.profile;
        workingCarryLine = result.carryLine;
        if (result.entries.length > 0) {
          builtEntries.push(...result.entries);
        }
        safety += 1;
      }

      setTestRelic(workingRelic);
      setPatternProfile(workingProfile);
      setSharedCarryLine(workingCarryLine || null);
      if (builtEntries.length > 0) {
        setSessionRolls((existing) => [...existing, ...builtEntries]);
      }
    };

    if (testRelicLoopMode) {
      runBuilderLoop();
      return;
    }

    const result = applyBuilderStep(testRelic, patternProfile);
    setTestRelic(result.relic);
    setPatternProfile(result.profile);
    setSharedCarryLine(result.carryLine || null);
    if (result.entries.length > 0) {
      setSessionRolls((existing) => [...existing, ...result.entries]);
    }
  };

  const handleResetTestRelic = () => {
    if (isPvpInteractionLocked) return;
    setTestRelic(createChallengeRelic(currentContract.builderRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
  };

  const handleAddManualRoll = () => {
    if (isPvpInteractionLocked) return;
    const parts = String(rollInput || '')
      .trim()
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const nextEntries = parts.map(createSessionEntry).filter(Boolean);
    if (nextEntries.length === 0) return;
    setSessionRolls((existing) => [...existing, ...nextEntries]);
    setRollInput('');
  };

  const handleDeleteEntry = (entryId) => {
    if (isPvpInteractionLocked) return;
    setSessionRolls((existing) => existing.filter((entry) => entry.id !== entryId));
  };

  const handlePrimeForceRelic = () => {
    if (isPvpInteractionLocked) return;
    setForceRelic((current) => {
      if (current.isPrimed || current.currentLineCount >= 4) return current;
      return {
        ...current,
        isPrimed: true,
        currentLineCount: current.forcedLine,
        lines: current.lines.map((line) => ({
          ...line,
          justHit: line.slot === current.forcedLine,
        })),
      };
    });
  };

  const handleResetForceRelic = () => {
    if (isPvpInteractionLocked) return;
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: forceRelic.baseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
  };

  const handleCycleForceRelicType = () => {
    if (isPvpInteractionLocked) return;
    const nextBaseLines = forceRelic.baseLines >= 3 ? 1 : forceRelic.baseLines + 1;
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: nextBaseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
  };

  const handleOpenIntel = useCallback(() => {
    setHintStep((current) => Math.min(current + 1, currentContract.hints.length));
    setHintVisible(true);
  }, [currentContract.hints.length]);

  const handleCloseTour = () => {
    setTourRunning(false);
    setPvpTourAutoFreeze(false);
    try {
      window.localStorage.setItem(isPvpMode ? PVP_TOUR_KEY : CHALLENGE_TOUR_KEY, 'seen');
    } catch {
      // ignore localStorage issues
    }
  };

  const handleNextTourStep = () => {
    if (tourStepIndex >= activeTourSteps.length - 1) {
      handleCloseTour();
      return;
    }
    setTourStepIndex((current) => Math.min(current + 1, activeTourSteps.length - 1));
  };

  const handleBackTourStep = () => {
    setTourStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <div
      ref={containerRef}
      className={`playground-theme-shell min-h-screen bg-transparent text-slate-200 relative [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`}
    >
      {!(isPvpMode && showPvpResults) ? (
        <ModernStickyHeader
          containerId="challenge-tour-stickybar"
          topOffsetClass={themeConfig.rootClassName === 'arctic-theme' ? 'top-[112px] md:top-[128px]' : 'top-[72px] md:top-[84px]'}
          secondsLeft={secondsLeft}
          onStart={handleStartSession}
          onStop={isPvpInteractionLocked ? undefined : (() => setTimerRunning(false))}
          onRestart={isPvpInteractionLocked ? undefined : (() => resetChallengeMode())}
          timerRunning={timerRunning}
          rollInput={rollInput}
          setRollInput={setRollInput}
          onAddRoll={isPvpInteractionLocked ? undefined : handleAddManualRoll}
          entriesCount={predictorEntries.length}
        />
      ) : null}

      <div className="relative z-10 mx-auto max-w-[1900px] px-4 pt-16 pb-12 md:px-6 md:pt-20">
        
        <header className="gsap-fade-up mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/playground')} className="text-slate-700 hover:text-slate-500 transition-colors">
               <ArrowLeft className="h-5 w-5" />
             </button>
             <h1 className="text-xl font-black uppercase tracking-tighter text-white/90">
               {isPvpMode ? 'Score Duel' : 'Challenge'} <span className="text-rose-400/70 text-sm tracking-widest pl-2">{isPvpMode ? 'PVP' : 'CONTRACT'}</span>
             </h1>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 px-4 py-2">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-300">
              {isPvpMode ? `Room ${roomCode || '----'}` : 'Static Contract Seed'}
            </div>
          </div>
        </header>
        {isPvpMode ? (
          <div className="gsap-fade-up mb-8">
            <section id="challenge-tour-pvp-room" className="theme-glass-card rounded-xl p-5">
              <div className="flex flex-col gap-4 border-b border-white/8 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[12px] font-semibold tracking-tight text-white">
                    <Swords className="h-4 w-4 text-slate-400" />
                    Score Duel
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Same seed, same contract, best clear wins. Read fast, route cleanly, and don&apos;t hand away mistakes.
                  </p>
                </div>
                <div id="challenge-tour-pvp-room-meta" className="flex max-w-[420px] flex-col items-stretch gap-2">
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200">
                    Room {roomCode || '----'}
                    </div>
                    {pvpRoom?.status === 'finished' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPvpResults(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200 transition-all hover:bg-white/[0.06]"
                        >
                          View results
                        </button>
                        {pvpViewerRole === 'host' ? (
                          <button
                            type="button"
                            onClick={handleRestartPvpMatch}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition-all hover:bg-cyan-500/18"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Restart
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleOpenIntel}
                      disabled={isPvpInteractionLocked}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition-all hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Tips
                    </button>
                    {canUsePvpGuide ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTourStepIndex(0);
                          setTourRunning(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200 transition-all hover:bg-white/[0.06]"
                      >
                        <CircleHelp className="h-4 w-4" />
                        Guide
                      </button>
                    ) : null}
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200">
                    {pvpRoom?.status || (pvpLoading ? 'Loading' : 'Waiting')}
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200">
                    {pvpPressureLabel}
                    </div>
                  </div>
                  {hintVisible && activeHint ? (
                    <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/8 px-3 py-2 text-[11px] leading-5 text-cyan-100/90">
                      {activeHint}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-stretch">
                <div id="challenge-tour-pvp-you" className="theme-subpanel rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/70">You</div>
                      <UserIdentityBlock
                        name={viewerDisplayName}
                        title={localPvpState.displayTitle || ''}
                        rarity={localPvpState.displayTitleRarity || 'common'}
                        badge={localPvpState.displayBadge || ''}
                        badgeRarity={localPvpState.displayBadgeRarity || 'common'}
                        nameplate={localPvpState.displayNameplate || ''}
                        nameplateRarity={localPvpState.displayNameplateRarity || 'common'}
                        nameClassName="mt-1 text-3xl font-semibold tracking-tight text-white"
                        titleClassName="mt-1 text-[12px]"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">HP</div>
                      <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{playerHp}%</div>
                    </div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full border border-white/8 bg-black/20">
                    <div
                      className="pvp-animate-width h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300"
                      data-target-width={`${playerHp}%`}
                      style={{ width: `${playerHp}%` }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Status</span>
                      <span className="font-semibold text-cyan-100">{formatPvpStatusLabel(localPvpState.status, localPvpState.phase)}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Level</span>
                      <span className="font-semibold text-white">+{localDisplayedPvpLevel}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Attempts</span>
                      <span className="font-semibold text-amber-200">{pvpAttemptsUsed}/3</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Hits</span>
                      <span className="font-semibold text-emerald-100">{helpfulHits}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Mistakes</span>
                      <span className="font-semibold text-rose-200">{mistakes}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <div className="font-semibold text-white">{pvpSubmittedAttempt ? 'Submitted' : 'Upgrade progress'}</div>
                      <div className="font-semibold text-slate-300">{pvpSubmittedAttempt ? 'Locked' : `+${localDisplayedPvpLevel}`}</div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {getPvpLevelSegments(localDisplayedPvpLevel).map((segment) => (
                        <div key={`local-${segment.key}`} className="h-2 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                          <div
                            className="pvp-segment-fill h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300"
                            data-progress-key={`duel-local-${segment.key}`}
                            data-target-width={`${segment.progress * 100}%`}
                            style={{ width: `${segment.progress * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div id="challenge-tour-pvp-center" className="flex flex-col items-center justify-center gap-4 px-2 text-center">
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Score Duel</div>
                    <PvpVsMark theme={sessionTheme} size="md" />
                  </div>
                  <div className="rounded-md border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold text-slate-200">
                    {challengeStatus.label}
                  </div>
                  <p className="max-w-[210px] text-xs leading-5 text-slate-400">{challengeStatus.text}</p>
                  <div className="h-px w-24 bg-white/8" />
                  <button
                    type="button"
                    onClick={pvpSubmittedAttempt || pvpBusted || isPvpInteractionLocked ? undefined : (relic.level >= 15 ? handleSubmitPvpAttempt : handleResetPvpAttempt)}
                    disabled={Boolean(pvpSubmittedAttempt || pvpBusted || isPvpInteractionLocked)}
                    className={`inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg border px-5 py-3.5 text-[12px] font-semibold transition-all ${
                      pvpSubmittedAttempt || pvpBusted
                        ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-600'
                        : relic.level >= 15
                          ? 'border-cyan-400/30 bg-cyan-500/14 text-cyan-50 hover:bg-cyan-500/20'
                          : 'border-violet-400/30 bg-violet-500/14 text-violet-50 hover:bg-violet-500/20'
                    }`}
                  >
                    {pvpSubmittedAttempt
                      ? 'Final relic submitted'
                      : pvpBusted
                        ? 'Duel lost'
                        : relic.level >= 15
                            ? 'Submit final relic'
                            : pvpAttemptsUsed >= 3
                              ? 'Reset loses duel'
                              : `Reset to try ${pvpAttemptsUsed + 1}`}
                    {!pvpSubmittedAttempt && !pvpBusted ? <ChevronRight className="h-4 w-4" /> : null}
                  </button>
                  {!pvpSubmittedAttempt && !pvpBusted ? (
                    <div className="text-[10px] font-medium leading-5 text-slate-500">
                      {relic.level >= 15
                        ? 'Lock the final relic and end the duel.'
                        : pvpAttemptsUsed >= 3
                          ? 'This reset ends the room if you still cannot clear.'
                          : 'Reset now if the route is dead, or keep pushing the current solve.'}
                    </div>
                  ) : null}
                </div>

                <div className="theme-subpanel rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200/70">Opponent</div>
                      <UserIdentityBlock
                        name={pvpOpponent?.name || 'Awaiting'}
                        title={pvpOpponent?.state?.displayTitle || ''}
                        rarity={pvpOpponent?.state?.displayTitleRarity || 'common'}
                        badge={pvpOpponent?.state?.displayBadge || ''}
                        badgeRarity={pvpOpponent?.state?.displayBadgeRarity || 'common'}
                        nameplate={pvpOpponent?.state?.displayNameplate || ''}
                        nameplateRarity={pvpOpponent?.state?.displayNameplateRarity || 'common'}
                        nameClassName="mt-1 text-3xl font-semibold tracking-tight text-white"
                        titleClassName="mt-1 text-[12px]"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">HP</div>
                      <div className="mt-1 text-2xl font-semibold tracking-tight text-white">{opponentHp}%</div>
                    </div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full border border-white/8 bg-black/20">
                    <div
                      className="pvp-animate-width ml-auto h-full rounded-full bg-rose-400"
                      data-target-width={`${opponentHp}%`}
                      style={{ width: `${opponentHp}%` }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2 text-[11px]">
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Status</span>
                      <span className="font-semibold text-rose-100">{formatPvpStatusLabel(pvpOpponent?.state?.status || 'idle', pvpOpponent?.state?.phase || '')}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Level</span>
                      <span className="font-semibold text-white">+{pvpOpponent?.state?.currentLevel ?? 0}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Attempts</span>
                      <span className="font-semibold text-amber-200">{pvpOpponent?.state?.attemptsUsed ?? 0}/3</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Hits</span>
                      <span className="font-semibold text-emerald-100">{pvpOpponent?.state?.helpfulHits ?? 0}</span>
                    </div>
                    <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Mistakes</span>
                      <span className="font-semibold text-rose-200">{pvpOpponent?.state?.mistakes ?? 0}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <div className="font-semibold text-white">{Number(pvpOpponent?.state?.submittedAttempts || 0) > 0 ? 'Submitted' : 'Upgrade progress'}</div>
                      <div className="font-semibold text-slate-300">
                        {Number(pvpOpponent?.state?.submittedAttempts || 0) > 0 ? 'Locked' : `+${pvpOpponent?.state?.currentLevel ?? 0}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {getPvpLevelSegments(pvpOpponent?.state?.currentLevel ?? 0).map((segment) => (
                            <div key={`opponent-${segment.key}`} className="h-2 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                              <div
                                className="pvp-segment-fill h-full rounded-full bg-gradient-to-r from-rose-300 via-rose-400 to-pink-500"
                                data-progress-key={`duel-opponent-${segment.key}`}
                                data-target-width={`${segment.progress * 100}%`}
                                style={{ width: `${segment.progress * 100}%` }}
                              />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {pvpError ? <p className="mt-4 text-sm text-rose-200">{pvpError}</p> : null}
            </section>
          </div>
        ) : (
          /* STATIC CONTRACT MODE - UNCODIXIFIED BENTO */
          <div className="gsap-fade-up mb-8 space-y-4">
            <div id="challenge-tour-mode" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg border border-white/10 bg-slate-900/40 p-1 backdrop-blur-md">
                  {[
                    { id: 'ladder', label: 'Ladder' },
                    { id: 'generated', label: 'Generated' },
                  ].map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setChallengeModeView(view.id)}
                      className={`rounded-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        challengeModeView === view.id
                          ? 'bg-cyan-500/20 text-cyan-100'
                          : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTourStepIndex(0);
                    setTourRunning(true);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all"
                >
                  Guide
                </button>
              </div>

              {challengeModeView === 'ladder' ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {CHALLENGE_CONTRACT_ORDER.map((contractId, index) => {
                    const contract = getChallengeContract(contractId);
                    const isCurrent = contractId === currentContractId;
                    const isCompleted = completedContracts.includes(contractId);
                    const num = (index + 1).toString().padStart(2, '0');
                    return (
                      <button
                        key={contractId}
                        type="button"
                        onClick={() => handleOpenHandcraftedContract(contractId)}
                        className={`h-8 w-8 rounded-lg border text-[10px] font-black transition-all ${
                          isCurrent
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                            : isCompleted
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/5 bg-black/20 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {['new_player', 'beginner', 'intermediate', 'veteran', 'expert'].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        selectedTier === tier
                          ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-100'
                          : 'border-white/5 bg-black/20 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tier.replace('_', ' ')}
                    </button>
                  ))}
                  <button
                    onClick={handleGenerateScenario}
                    className="ml-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    Sync
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-1 backdrop-blur-md">
              <div className="rounded-lg border border-white/5 bg-black/40 p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">{currentContract.title}</h2>
                    <span className="rounded border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                      {currentContract.difficulty}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-300 max-w-4xl">
                    {describeChallengeMission(currentContract.success)}
                  </p>
                  <div className="flex flex-wrap gap-6 items-center pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vector:</span>
                      <div className="flex gap-2">
                        {contractTargets.map(t => (
                          <span key={t} className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black text-slate-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-10 lg:border-l lg:border-white/5 lg:pl-10">
                  <div className="flex gap-8">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Tries</span>
                      <span className="text-3xl font-black text-white">{triesUsed}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Errors</span>
                      <span className="text-3xl font-black text-rose-500">{mistakes}</span>
                    </div>
                  </div>
                  <div className="min-w-[140px] text-center space-y-3">
                    <div className={`text-[11px] font-black uppercase tracking-widest ${challengeStatus.tone === 'clear' ? 'text-emerald-400' : challengeStatus.tone === 'fail' ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {challengeStatus.label}
                    </div>
                    {challengeStatus.tone === 'clear' ? (
                      <button
                        onClick={() => {
                          if (generatedScenario) handleGenerateScenario();
                          else if (nextContractId) handleOpenHandcraftedContract(nextContractId);
                        }}
                        className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/20 transition-all"
                      >
                        Advance
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenIntel}
                        className="w-full rounded-lg border border-white/10 bg-black/20 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                      >
                        Hint {activeHint && '✓'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {activeHint && (
              <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-4 text-[13px] leading-relaxed text-cyan-100/90 border-l-2 border-l-cyan-500">
                {activeHint}
              </div>
            )}
          </div>
        )}

        {/* 3-COLUMN TACTICAL COMMAND CENTER: 3-6-3 SPLIT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <aside className="gsap-fade-up flex flex-col gap-6 lg:col-span-3">
             <div id="challenge-tour-predictor">
               <ModernPairPredictorCard entries={predictorEntries} region={currentContract.region} advancedToggleId="challenge-tour-advanced-toggle" />
             </div>

             <div id="challenge-tour-helper" className="rounded-[1.25rem] border border-white/5 bg-slate-950/40 p-5 shadow-inner backdrop-blur-md">
                <ModernStatsPanel
                  entries={predictorEntries}
                  prediction2={prediction2}
                  prediction3={{ prediction: '-', alt: null, confidence: 0, mode: '-' }}
                  prediction4={{ prediction: '-', alt: null, confidence: 0, mode: '-' }}
                  currentRegion={currentContract.region}
                  currentPatch={currentContract.patch}
                  forcedLineOverride={helperLineOverride}
                />
             </div>
          </aside>

          {/* COLUMN 2: CENTER (6/12) - RELICS & ACTIVITY */}
          <section className="gsap-fade-up flex flex-col gap-10 lg:col-span-6">
             {/* 1. RELIC ACTION BAY - CENTER TOP */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div id="challenge-tour-target">
                <ModernRelicCard
                  relic={relic}
                  title="Target Relic"
                  themeColor="cyan"
                  icon={Target}
                  success={currentContract.success}
                  onAction={isPvpInteractionLocked ? undefined : handlePracticeRelicAction}
                  onReset={isPvpInteractionLocked ? undefined : (isPvpMode ? handleResetPvpAttempt : () => resetChallengeMode())}
                  disabled={isPvpInteractionLocked}
                />
                </div>

                <div id="challenge-tour-builder">
                <ModernRelicCard
                  relic={testRelic}
                  title="Setup / Builder"
                  themeColor="violet"
                  icon={FlaskConical}
                  success={currentContract.success}
                  onAction={isPvpInteractionLocked ? undefined : handleTestRelicAction}
                  onReset={isPvpInteractionLocked ? undefined : handleResetTestRelic}
                  disabled={isPvpInteractionLocked}
                  actionDisabled={isPvpInteractionLocked ? true : (!testRelicLoopMode && testRelic.level >= 15)}
                  actionLabel={
                    testRelicLoopMode
                      ? (testRelic.level >= 15 ? 'Loop Again' : 'Loop To Max')
                      : null
                  }
                  footerSlot={
                    <button
                      type="button"
                      onClick={() => setTestRelicLoopMode((current) => !current)}
                      disabled={isPvpInteractionLocked}
                      className={`mt-1 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] transition-all ${
                        testRelicLoopMode
                          ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                          : 'border-white/5 bg-white/5 text-slate-600'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span>Loop Builder</span>
                      <span className={`rounded-full px-2 py-1 text-[7px] ${testRelicLoopMode ? 'bg-violet-500/20 text-violet-100' : 'bg-black/30 text-slate-500'}`}>
                        {testRelicLoopMode ? 'On' : 'Off'}
                      </span>
                    </button>
                  }
                />
                </div>
             </div>

             {/* 2. MISSION BRIEF / PVP ACTION STRIP */}
             {isPvpMode ? null : (
              <div id="challenge-tour-mission" className="rounded-xl border border-white/10 bg-slate-950/40 p-8 mt-6 backdrop-blur-md">
                 <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                    <div className="flex-1 space-y-4">
                       <div className="flex items-center gap-3">
                          <Trophy className="h-4 w-4 text-amber-500/80" />
                          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                             {currentContract.title}
                          </h2>
                          <div className="rounded border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                             {currentContract.difficulty}
                          </div>
                       </div>
                       
                       <p className="text-[13px] leading-relaxed text-slate-300 max-w-2xl">
                          {describeChallengeMission(currentContract.success)}
                       </p>

                       <div className="flex flex-wrap items-center gap-6 pt-2">
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Success Vector:</span>
                             <span className="text-[11px] text-slate-200 font-medium">
                                {describeChallengeWinRule(currentContract.success)}
                             </span>
                          </div>
                          {contractTargets.length > 0 && (
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/60">Checkpoints:</span>
                                <div className="flex gap-1.5">
                                   {contractTargets.map(t => (
                                      <span key={t} className="rounded-md border border-white/5 bg-black/40 px-2 py-0.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                         {t}
                                      </span>
                                   ))}
                                </div>
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="w-full lg:w-auto shrink-0 flex items-center justify-between lg:justify-end gap-10 lg:border-l lg:border-white/5 lg:pl-10">
                       <div className="flex gap-8">
                          <div className="flex flex-col items-center">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Tries</span>
                             <span className="text-3xl font-black text-white leading-tight">{triesUsed}</span>
                          </div>
                          <div className="flex flex-col items-center">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Errors</span>
                             <span className="text-3xl font-black text-rose-500 leading-tight">{mistakes}</span>
                          </div>
                       </div>

                       <div className="min-w-[140px] space-y-3">
                          <div className="text-center font-black uppercase tracking-[0.2em] text-[10px]">
                             <span className={challengeStatus.tone === 'clear' ? 'text-emerald-400' : challengeStatus.tone === 'fail' ? 'text-rose-400' : 'text-cyan-400'}>
                                {challengeStatus.label}
                             </span>
                          </div>

                          {challengeStatus.tone === 'clear' ? (
                             <button
                                type="button"
                                onClick={() => {
                                   if (generatedScenario) handleGenerateScenario();
                                   else if (nextContractId) handleOpenHandcraftedContract(nextContractId);
                                }}
                                className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                             >
                                Next <ChevronRight className="h-4 w-4" />
                             </button>
                          ) : (
                             <button
                                type="button"
                                onClick={handleOpenIntel}
                                className="w-full rounded-lg border border-white/10 bg-white/5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                             >
                                <Lightbulb className="h-3.5 w-3.5" /> Intel {activeHint && '✓'}
                             </button>
                          )}
                       </div>
                    </div>
                 </div>
                 {activeHint && (
                    <div className="mt-8 rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-4 text-[13px] leading-relaxed text-cyan-100/90 border-l-2 border-l-cyan-500">
                       {activeHint}
                    </div>
                 )}
                 
                 <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 opacity-40">
                       <span className="text-[10px] font-black uppercase tracking-widest">Environment:</span>
                       <span className="text-[10px] font-black">{describePatternProfile(patternProfile)}</span>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                       Trace Seed: {currentContract.seedLabel}
                    </div>
                 </div>
              </div>
             )}

             {isPvpMode ? (
               <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <section id="challenge-tour-pvp-mission" className="theme-glass-card rounded-xl p-5">
                   <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
                     <div>
                       <div className="text-[11px] font-semibold tracking-tight text-white">Mission card</div>
                       <p className="mt-2 text-sm leading-6 text-slate-400">
                         Clear the contract first. If both sides fail the contract, the duel ends in a draw.
                       </p>
                     </div>
                     <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-200">
                       {currentContract.difficulty}
                     </div>
                   </div>

                   <div className="mt-4 space-y-4">
                     <div>
                       <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Win condition</div>
                       <p className="mt-2 text-sm leading-6 text-slate-300">{describeChallengeWinRule(currentContract.success)}</p>
                     </div>

                     <div>
                       <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Contract target</div>
                       <div className="mt-3 flex flex-wrap gap-2">
                         {contractTargets.map((target) => (
                           <span key={target} className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                             {target}
                           </span>
                         ))}
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                       <div className="rounded-lg border border-white/6 bg-black/15 px-3 py-3">
                         <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Aim for</div>
                         <div className="mt-2 flex flex-wrap gap-2">
                           {scoreGuide.targetStats.length > 0 ? scoreGuide.targetStats.map((stat) => (
                             <span key={stat} className="rounded-lg border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                               {stat}
                             </span>
                           )) : <span className="text-xs text-slate-500">No preferred lines.</span>}
                         </div>
                       </div>
                       <div className="rounded-lg border border-white/6 bg-black/15 px-3 py-3">
                         <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Avoid</div>
                         <div className="mt-2 flex flex-wrap gap-2">
                           {scoreGuide.avoidStats.length > 0 ? scoreGuide.avoidStats.map((stat) => (
                             <span key={stat} className="rounded-lg border border-rose-400/15 bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                               {stat}
                             </span>
                           )) : <span className="text-xs text-slate-500">No dead lines.</span>}
                         </div>
                       </div>
                     </div>

                     <div className={`rounded-lg border px-3 py-3 ${
                       challengeStatus.tone === 'clear'
                         ? 'border-emerald-500/20 bg-emerald-500/10'
                         : challengeStatus.tone === 'fail'
                           ? 'border-rose-500/20 bg-rose-500/10'
                           : 'border-cyan-400/15 bg-cyan-500/8'
                     }`}>
                       <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                         challengeStatus.tone === 'clear'
                           ? 'text-emerald-200'
                           : challengeStatus.tone === 'fail'
                             ? 'text-rose-200'
                             : 'text-cyan-200'
                       }`}>
                         {challengeStatus.label}
                       </div>
                       <p className="mt-2 text-sm leading-6 text-slate-200">
                         {activeHint || 'Open Intel from the duel board if you want a nudge before committing to the next route.'}
                       </p>
                     </div>
                   </div>
                 </section>

                  <section id="challenge-tour-pvp-feed" className="theme-glass-card rounded-xl p-5">
                   <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-4">
                     <div className="flex items-center gap-2">
                       <ShieldAlert className="h-4 w-4 text-rose-300" />
                       <div className="text-[11px] font-semibold tracking-tight text-white">Signal feed</div>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
                         <button
                           type="button"
                           onClick={() => setSignalFeedView('feed')}
                           className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${
                             signalFeedView === 'feed'
                               ? 'bg-white/[0.08] text-white'
                               : 'text-slate-400 hover:text-slate-200'
                           }`}
                         >
                           Feed
                         </button>
                          <button
                            type="button"
                            onClick={() => setSignalFeedView('details')}
                           className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${
                             signalFeedView === 'details'
                               ? 'bg-white/[0.08] text-white'
                               : 'text-slate-400 hover:text-slate-200'
                           }`}
                          >
                            Details
                          </button>
                          {isOpponentBot ? (
                          <button
                            type="button"
                            onClick={() => setSignalFeedView('bot-decisions')}
                            className={`rounded-md px-3 py-1.5 text-[10px] font-semibold transition ${
                              signalFeedView === 'bot-decisions'
                                ? 'bg-white/[0.08] text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Bot Decisions
                          </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                   {signalFeedView === 'feed' ? (
                     <div className="max-h-[324px] overflow-y-auto space-y-2 pr-2 font-mono text-[11px] leading-relaxed">
                       {pvpFeed.length === 0 ? (
                         <div className="pt-4 text-slate-600 italic">{'>'} AUTHENTICATING SIGNAL...</div>
                       ) : (
                         pvpFeed.map((entry) => {
                           const toneClasses = entry.tone === 'player'
                             ? 'text-cyan-400'
                             : entry.tone === 'opponent'
                               ? 'text-rose-400'
                               : 'text-amber-400';
                           return (
                             <div key={entry.id} className={`flex items-start gap-3 border-b border-white/5 py-1 last:border-0 ${toneClasses}`}>
                               <span className="shrink-0 opacity-40">[{new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}]</span>
                               <span>{'>'} {entry.text}</span>
                             </div>
                           );
                         })
                       )}
                     </div>
                   ) : signalFeedView === 'details' ? (
                     <div className="min-h-[324px] rounded-lg border border-white/8 bg-white/[0.02] p-3">
                       <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                         {isOpponentBot ? 'Bot Session Data' : 'Opponent Session Rolls'}
                       </div>
                       <div className="mt-3 max-h-[276px] space-y-2 overflow-y-auto pr-1">
                         {opponentSessionEntriesNewestFirst.length > 0 ? opponentSessionEntriesNewestFirst.map((entry, index) => (
                           <div key={`signal-session-${entry.id || index}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-slate-200">
                             <span className="font-semibold text-white">#{entry.step || opponentSessionEntriesNewestFirst.length - index}</span>
                             {' | raw '}
                             <span className="text-cyan-100">{entry.rawPair || '-'}</span>
                             {' -> '}
                             <span className="text-violet-100">{entry.translated || '-'}</span>
                             {entry.attemptNumber ? ` | try ${entry.attemptNumber}` : ''}
                           </div>
                         )) : (
                           <div className="rounded-lg border border-dashed border-white/8 px-3 py-4 text-xs text-slate-500">
                             {isOpponentBot ? 'No bot session entries recorded yet.' : 'No opponent session rolls recorded yet.'}
                           </div>
                         )}
                       </div>
                     </div>
                   ) : (
                     <div className="min-h-[324px] rounded-lg border border-white/8 bg-white/[0.02] p-3">
                       <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Bot Decisions</div>
                       <div className="mt-3 max-h-[276px] space-y-2 overflow-y-auto pr-1">
                         {opponentDebugLogNewestFirst.length > 0 ? opponentDebugLogNewestFirst.map((entry, index) => (
                           <div key={`bot-debug-${index}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-slate-200">
                             {entry}
                           </div>
                         )) : (
                           <div className="rounded-lg border border-dashed border-white/8 px-3 py-4 text-xs text-slate-500">
                             No bot reasoning recorded yet.
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                 </section>
               </div>
             ) : null}
          </section>

          {/* COLUMN 3: FAR RIGHT (3/12) - STATS & INTEL */}
          <aside className="gsap-fade-up flex flex-col gap-6 lg:col-span-3">
             {/* FORCE RELIC */}
             <div id="challenge-tour-force">
             <ForceRelicCard
                relic={forceRelic}
                onPrime={isPvpInteractionLocked ? undefined : handlePrimeForceRelic}
                onReset={isPvpInteractionLocked ? undefined : handleResetForceRelic}
                onCycleType={isPvpInteractionLocked ? undefined : handleCycleForceRelicType}
                disabled={isPvpInteractionLocked}
             />
             </div>

             <div id="challenge-tour-session" className="relic-session-container mt-2">
                <div className="mb-4 flex items-center gap-3">
                   <History className="h-4 w-4 text-violet-500/60" />
                   <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Session History</h3>
                </div>
                <div className="h-[500px] overflow-hidden">
                  <ModernSessionTable
                    sessionTab={sessionTab}
                    setSessionTab={setSessionTab}
                    entries={predictorEntries}
                    prevSessions={[]}
                    onDeleteEntry={handleDeleteEntry}
                    onDeleteSession={() => {}}
                    compact={true}
                  />
                </div>
             </div>
          </aside>

        </div>
      </div>

      {tourRunning ? (
        <ChallengeTourOverlay
          steps={activeTourSteps}
          currentStep={tourStepIndex}
          onNext={handleNextTourStep}
          onBack={handleBackTourStep}
          onClose={handleCloseTour}
        />
      ) : null}

      {isPvpCountdownLocked ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#05070dcc]/95 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="text-[12px] font-black uppercase tracking-[0.4em] text-amber-200">PVP Countdown</div>
            <div className="text-8xl font-black uppercase tracking-[0.04em] text-white md:text-[10rem]">
              {pvpCountdownLeft}
            </div>
            <div className="text-2xl font-black uppercase tracking-[0.2em] text-fuchsia-200 md:text-3xl">
              {pvpCountdownLeft >= 4 ? 'Read...' : pvpCountdownLeft >= 2 ? 'Set...' : 'Go!'}
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300">
              Shared seed is about to start. Controls stay locked until the countdown ends, then the 5-minute duel timer begins.
            </p>
          </div>
        </div>
      ) : null}

      {isPvpMode && showPvpResults && pvpRoom ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md">
          <div className="theme-glass-card w-full max-w-[1400px] rounded-xl p-5 md:p-6">
            <div className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Match results</div>
                <h2 className="mt-2 text-[2rem] font-semibold tracking-tight text-white">
                  {localWonPvp ? 'You won the duel' : opponentWonPvp ? `${pvpOpponent?.name || 'Opponent'} won the duel` : 'Match draw'}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  {localWonPvp
                    ? 'Your relic satisfied the room rules better than the opponent.'
                    : opponentWonPvp
                      ? `${pvpOpponent?.name || 'Opponent'} satisfied the room rules better than you did.`
                      : 'Neither side cleared the contract strongly enough to break the tie.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className={`rounded-md border px-3 py-2 text-[11px] font-semibold ${
                  localWonPvp
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                    : opponentWonPvp
                      ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-200'
                }`}>
                  {localWonPvp ? 'Winner: You' : opponentWonPvp ? `Winner: ${pvpOpponent?.name || 'Opponent'}` : 'Result: Draw'}
                </div>
                {(localResultUsesTimeout || opponentResultUsesTimeout) ? (
                  <div className="rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-100">
                    Timeout scoring applied
                  </div>
                ) : null}
                {pvpViewerRole === 'host' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRerollPvpMatch}
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold text-slate-100 transition hover:bg-white/[0.06]"
                    >
                      <Dice5 className="h-4 w-4" />
                      Reroll relics
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartPvpMatch}
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-semibold text-slate-100 transition hover:bg-white/[0.06]"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Restart same match
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowPvpResults(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close results"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className={`mt-5 grid gap-4 ${showBotTrace ? 'xl:grid-cols-[minmax(0,1.38fr)_390px]' : ''}`}>
              <div className="min-w-0 space-y-4">
                <div className="theme-subpanel rounded-xl p-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] lg:items-center">
                    <div className={`rounded-xl border p-4 ${localWonPvp ? 'border-emerald-400/20 bg-emerald-500/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">You</div>
                          <UserIdentityBlock
                            name={localPvpState.displayName || 'Player'}
                            title={localPvpState.displayTitle || ''}
                            rarity={localPvpState.displayTitleRarity || 'common'}
                            badge={localPvpState.displayBadge || ''}
                            badgeRarity={localPvpState.displayBadgeRarity || 'common'}
                            nameplate={localPvpState.displayNameplate || ''}
                            nameplateRarity={localPvpState.displayNameplateRarity || 'common'}
                            nameClassName="mt-1 text-[1.45rem] font-semibold tracking-tight text-white"
                            titleClassName="mt-1 text-[11px]"
                          />
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                          {localResultStateLabel}
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300"
                          style={{ width: `${Math.max(0, Math.min(100, Number(playerHp) || 0))}%` }}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Score</span>
                          <span className="font-semibold text-white">{localResultScore}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Grade</span>
                          <span className="font-semibold text-white">{localResultGrade}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Helpful</span>
                          <span className="font-semibold text-emerald-100">{localResultHelpful}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Mistakes</span>
                          <span className="font-semibold text-rose-200">{localResultMistakes}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px]">
                          <div className="font-semibold text-white">{localPvpState.submittedAttempts > 0 ? 'Submitted' : 'Upgrade progress'}</div>
                          <div className="font-semibold text-slate-300">{localPvpState.submittedAttempts > 0 ? 'Locked' : `+${localResultLevel}`}</div>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {getPvpLevelSegments(localResultLevel).map((segment) => (
                            <div key={`result-local-${segment.key}`} className="h-2 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                              <div
                                className="pvp-segment-fill h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300"
                                data-progress-key={`result-local-${segment.key}`}
                                data-target-width={`${segment.progress * 100}%`}
                                style={{ width: `${segment.progress * 100}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Score Duel</div>
                  <PvpVsMark theme={sessionTheme} size="md" />
                      <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                        {localWonPvp ? 'You took the room' : opponentWonPvp ? 'Opponent took the room' : 'Draw'}
                      </div>
                    </div>

                    <div className={`rounded-xl border p-4 ${opponentWonPvp ? 'border-rose-400/20 bg-rose-500/[0.04]' : 'border-white/8 bg-white/[0.02]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Opponent</div>
                          <UserIdentityBlock
                            name={pvpOpponent?.name || 'Opponent'}
                            title={pvpOpponent?.state?.displayTitle || ''}
                            rarity={pvpOpponent?.state?.displayTitleRarity || 'common'}
                            badge={pvpOpponent?.state?.displayBadge || ''}
                            badgeRarity={pvpOpponent?.state?.displayBadgeRarity || 'common'}
                            nameplate={pvpOpponent?.state?.displayNameplate || ''}
                            nameplateRarity={pvpOpponent?.state?.displayNameplateRarity || 'common'}
                            nameClassName="mt-1 text-[1.45rem] font-semibold tracking-tight text-white"
                            titleClassName="mt-1 text-[11px]"
                          />
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                          {opponentResultStateLabel}
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-300 via-rose-400 to-pink-500"
                          style={{ width: `${Math.max(0, Math.min(100, Number(opponentHp) || 0))}%` }}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Score</span>
                          <span className="font-semibold text-white">{opponentResultScore}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Grade</span>
                          <span className="font-semibold text-white">{opponentResultGrade}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Helpful</span>
                          <span className="font-semibold text-emerald-100">{opponentResultHelpful}</span>
                        </div>
                        <div className="pvp-stat-pill inline-flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Mistakes</span>
                          <span className="font-semibold text-rose-200">{opponentResultMistakes}</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[11px]">
                          <div className="font-semibold text-white">{Number(pvpOpponent?.state?.submittedAttempts || 0) > 0 ? 'Submitted' : 'Upgrade progress'}</div>
                          <div className="font-semibold text-slate-300">
                            {Number(pvpOpponent?.state?.submittedAttempts || 0) > 0 ? 'Locked' : `+${opponentResultLevel}`}
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {getPvpLevelSegments(opponentResultLevel).map((segment) => (
                            <div key={`result-opponent-${segment.key}`} className="h-2 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
                              <div
                                className="pvp-segment-fill h-full rounded-full bg-gradient-to-r from-rose-300 via-rose-400 to-pink-500"
                                data-progress-key={`result-opponent-${segment.key}`}
                                data-target-width={`${segment.progress * 100}%`}
                                style={{ width: `${segment.progress * 100}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ResultRelicCard relic={localBestRelicSnapshot} title={localResultUsesTimeout ? 'Timed out relic' : 'Best target relic'} accent="cyan" success={currentContract.success} />
                  <ResultRelicCard relic={opponentBestRelicSnapshot} title={opponentResultUsesTimeout ? 'Timed out relic' : 'Best target relic'} accent="rose" success={currentContract.success} />
                </div>
              </div>

              {showBotTrace ? (
                <aside className="theme-subpanel rounded-xl p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Bot Decision Trace</div>
                      <div className="mt-1 text-sm leading-6 text-slate-300">What the bot compared, rejected, and committed to during the duel.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyBotTrace}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-slate-100 transition hover:bg-white/[0.06]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedBotTrace ? 'Copied' : 'Copy Trace'}
                      </button>
                      <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-slate-300">
                        {opponentDebugLog.length} steps
                      </div>
                    </div>
                  </div>
                  <div className="h-[620px] overflow-y-auto rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <div className="space-y-2">
                      {opponentDebugLogNewestFirst.map((entry, index) => (
                        <div key={`${index}-${entry.slice(0, 24)}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-slate-200">
                          {entry}
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style dangerouslySetInnerHTML={{ __html: `
        .relic-session-container .astral-session-table .overflow-auto {
           max-height: 355px !important;
        }
      `}} />
    </div>
  );
}
