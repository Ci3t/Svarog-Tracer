import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
  BrainCircuit,
  CircleHelp,
  ChevronRight,
  Map,
  Radar,
  RefreshCw,
  ScanSearch,
  Sparkles,
  StepForward,
  Play,
  FastForward,
  SkipBack,
  TerminalSquare,
  X,
} from 'lucide-react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernNotesCard from '../components/modern/ModernNotesCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { decodeLongString, translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { buildApiUrl } from '../utils/apiBase';
import {
  advancePatternProfile,
  createPatternProfile,
  createPatternProfileFromId,
  describePatternProfile,
  getPatternLibrary,
  getVisibleRollForUpgrade,
} from '../utils/playgroundPatternProfiles';



const LAB_REGION = 'America';
const LAB_PATCH = '4.1';
const MOODS = ['stable', 'mixed', 'chaotic'];
const SOURCE_MODES = [
  { id: 'auto', label: 'Auto Seed' },
  { id: 'import', label: 'Import TXT' },
  { id: 'manual', label: 'Manual Rolls' },
];

const PATTERN_LAB_TOUR_KEY = 'pattern-lab-tour-v1';
const PATTERN_LAB_TOUR_STEPS = [
  {
    target: '#pattern-lab-source',
    title: 'Source Protocols',
    body: 'Start here. Auto Seed creates a practice session. Import TXT loads a session export from live/free mode. Manual Rolls accepts normal rolls like 41 43 43 or a longstring like 4123432.',
    placement: 'bottom',
  },
  {
    target: '#pattern-lab-controls',
    title: 'Control Buttons',
    body: 'Use Step 5 twice here so the lab has enough rolls to build a real board read. Step Back rewinds, Sparkles loads a motif, Step 1 advances one move, and Reset clears the lab.',
    placement: 'bottom',
    waitFor: { type: 'state', value: 'rows_at_least_10' },
    prompt: 'Click Step 5 two times. Once the lab has 10 or more rolls, Next will unlock.',
  },
  {
    target: '#pattern-lab-predictor',
    title: 'Svarog Predictor',
    body: 'Now the board has enough data. This is the fast read for commons, noise, the current lean, and Svarog Eye before you dive into the deeper evidence.',
    placement: 'right',
  },
  {
    target: '#pattern-lab-advanced-toggle',
    title: 'Advanced Mode',
    body: 'Open Show details to inspect trends, trust, freshness, pair matrix, run/flip behavior, and the deeper logic behind the board lean.',
    placement: 'right',
    waitFor: { type: 'selector', value: '#pattern-lab-advanced-toggle' },
  },
  {
    target: '#pattern-lab-stats',
    title: 'Stats & Line Helper',
    body: 'This panel turns the board read into manipulation logic. It shows helper mapping, your line, and Caesar-style raw-pair conversions.',
    placement: 'right',
  },
  {
    target: '#pattern-lab-clara',
    title: "Clara's Lab",
    body: 'Clara gives quick rotating tips, and this panel explains Svarog Main, Svarog Eye, the real output, and what you should trust.',
    placement: 'left',
  },
  {
    target: '#pattern-lab-log',
    title: 'Log Output',
    body: 'This is the replay trail. It records each move with line, raw pair, and translated roll so you can inspect the path step by step.',
    placement: 'left',
  },
  {
    target: '#pattern-lab-notes',
    title: 'Notes',
    body: 'Write your own read here, then copy or download it. This turns Pattern Lab into a real study tool instead of only a viewer.',
    placement: 'top',
  },
];

function PatternLabTourOverlay({
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
    <div className="pointer-events-none fixed inset-0 z-[220]">
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
        {step.prompt ? (
          <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-xs font-semibold text-cyan-100">
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
              {currentStep === steps.length - 1 ? 'Finish' : (isWaiting ? 'Waiting' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createSessionEntry(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!/^[1-4]{2}$/.test(normalized)) return null;
  const translated = /^(41|42|43|44)$/.test(normalized) ? normalized : translateTo4(normalized);
  if (!translated || !/^4[1-4]$/.test(translated)) return null;
  return {
    id: `lab-entry-${normalized}-${Math.random().toString(36).slice(2, 8)}`,
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

function getFamilyOptions() {
  const library = getPatternLibrary();
  return Object.values(library).map((profile) => ({
    id: profile.id,
    label: `${profile.family} / ${profile.mood}`,
    mood: profile.mood,
    note: profile.note,
  }));
}

function createLabProfile(mood, familyId) {
  if (familyId === 'auto') {
    return createPatternProfile(mood, LAB_REGION, LAB_PATCH);
  }
  return createPatternProfileFromId(familyId, LAB_REGION, LAB_PATCH);
}

function extractManualSequence(rawText = '') {
  const text = String(rawText || '').trim();
  const spacedNormalized = text
    .replace(/[\r\n,|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const compactDigits = text.replace(/[^1-4]/g, '');

  // Treat clearly tokenized input as visible rolls, for example:
  // "41 42 44 43" or "41,42,44,43"
  const visibleRollTokens = spacedNormalized ? spacedNormalized.split(' ') : [];
  const isTokenizedVisibleRollList = visibleRollTokens.length > 0
    && visibleRollTokens.every((token) => /^4[1-4]$/.test(token))
    && /[\s,|\r\n]/.test(text);

  if (isTokenizedVisibleRollList) {
    return {
      rows: visibleRollTokens.map((visibleRoll) => ({ visibleRoll, rawPair: null })),
      message: `Loaded ${visibleRollTokens.length} manual visible rolls.`,
    };
  }

  const decoded = decodeLongString(compactDigits);
  if (!decoded.rolls.length) {
    return { rows: [], message: '' };
  }

  return {
    rows: decoded.rolls.map((visibleRoll, index) => ({
      visibleRoll,
      rawPair: decoded.pairs[index] || null,
    })),
    message: `Decoded longstring into ${decoded.rolls.length} visible rolls from ${decoded.pairs.length} Caesar pairs.`,
  };
}

function extractSessionRowsFromExport(rawText = '') {
  const lines = String(rawText || '').split(/\r?\n/);
  return lines
    .map((line) => {
      const rawMatch = line.match(/RAW:\s*([1-4]{2})/i);
      const translatedMatch = line.match(/TRANSLATED:\s*(4[1-4])/i);
      if (!rawMatch && !translatedMatch) return null;
      const rawPair = rawMatch?.[1] || null;
      const visibleRoll = translatedMatch?.[1] || (rawPair ? translateTo4(rawPair) : '');
      if (!visibleRoll || !/^4[1-4]$/.test(visibleRoll)) return null;
      return { rawPair, visibleRoll };
    })
    .filter(Boolean)
    .reverse();
}

function formatTrust(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value) * 100)}%`;
}

function getDisplayLane(prediction) {
  const displayPair = prediction?.trustedPair?.length === 2 ? prediction.trustedPair : prediction?.commons || [];
  const mainCommon = displayPair.includes(prediction?.prediction)
    ? prediction.prediction
    : displayPair[0] || prediction?.prediction || '-';
  const altCommon = displayPair.includes(prediction?.alt) && prediction?.alt !== mainCommon
    ? prediction.alt
    : displayPair.find((value) => value !== mainCommon) || prediction?.alt || '-';
  return { displayPair, mainCommon, altCommon };
}

function describeFreshness(arrowAge) {
  if (arrowAge === 0) return 'fresh this window';
  if (arrowAge === 1) return 'carried over from the last window';
  return 'stale trend that has repeated for multiple windows';
}

function getTransitionSupport(prediction, targetValue) {
  if (!prediction?.lastRoll || !targetValue) return null;
  const raw = prediction.pairMatrix?.[prediction.lastRoll]?.[targetValue];
  if (raw == null) return null;
  if (typeof raw === 'object') {
    return {
      pct: raw.pct ?? 0,
      samples: raw.samples ?? 0,
    };
  }
  return {
    pct: raw || 0,
    samples: 0,
  };
}

function buildRowsFromSequence(baseProfile, sequence, maxCount = sequence.length) {
  let workingProfile = baseProfile;
  let workingLine = 4;
  const rows = [];
  const limitedSequence = sequence.slice(0, Math.max(0, maxCount));

  limitedSequence.forEach((sequenceRow, index) => {
    const visibleRoll = sequenceRow.visibleRoll;
    const resolved = sequenceRow.rawPair
      ? {
          rawPair: sequenceRow.rawPair,
          targetSlot: Number(String(sequenceRow.rawPair).slice(1, 2)) || workingLine,
        }
      : resolveNextSlotFromVisibleRoll(workingLine, visibleRoll);

    rows.push({
      index: index + 1,
      fromLine: workingLine,
      rawPair: resolved.rawPair,
      visibleRoll,
      targetSlot: resolved.targetSlot,
      phase: workingProfile.phase,
      family: workingProfile.family,
      commons: (workingProfile.commons || []).join(' / '),
      noise: (workingProfile.noise || []).join(' / '),
    });

    workingLine = resolved.targetSlot;
    workingProfile = advancePatternProfile(workingProfile, visibleRoll);
  });

  return {
    rows,
    currentLine: workingLine,
    patternProfile: workingProfile,
  };
}

function buildSvarogAssistance(prediction, nextObservedRoll) {
  if (!prediction) {
    return {
      title: 'Need More Data',
      summary: 'Enter or step a few more rolls so Svarog can build a real read.',
      bullets: [],
    };
  }

  const { displayPair, mainCommon, altCommon } = getDisplayLane(prediction);
  const bullets = [];
  const trustedPair = prediction.trustedPair?.join(' / ') || 'none yet';
  const commons = prediction.commons?.join(' / ') || 'none yet';
  const noise = prediction.noise?.join(' / ') || 'none yet';
  const analyzerMain = prediction.analyzerPrediction || '-';
  const analyzerAlt = prediction.analyzerAlt || '-';
  const mainTrend = prediction.trends?.[mainCommon];
  const nextTrend = nextObservedRoll ? prediction.trends?.[nextObservedRoll] : null;
  const mainTransition = getTransitionSupport(prediction, mainCommon);
  const nextTransition = nextObservedRoll ? getTransitionSupport(prediction, nextObservedRoll) : null;
  const nextDistribution = nextObservedRoll ? prediction.distribution?.[nextObservedRoll] : null;
  const nextIsAnalyzerPick = nextObservedRoll && [prediction.analyzerPrediction, prediction.analyzerAlt].includes(nextObservedRoll);
  const nextIsTrusted = nextObservedRoll && prediction.trustedPair?.includes(nextObservedRoll);
  const nextIsOutsider = nextObservedRoll && prediction.freshOutsider?.value === nextObservedRoll;
  const reasonLine = prediction.reasonLine || '';
  const analyzerLeadsOutsider = prediction.freshOutsider?.value && prediction.analyzerPrediction === prediction.freshOutsider.value;

  bullets.push(`Main lane is ${mainCommon} / ${altCommon}, with the lean on ${mainCommon}. Svarog Eye suggests ${analyzerMain}${analyzerAlt && analyzerAlt !== analyzerMain ? ` / ${analyzerAlt}` : ''}.`);
  bullets.push(`Trusted pair is ${trustedPair}, commons are ${commons}, and noise is ${noise}.`);
  if (displayPair.length === 2 && !displayPair.includes(analyzerMain)) {
    bullets.push(`That means the lane read and Svarog eye are not perfectly aligned here. The lane says ${displayPair.join(' / ')}, while the analyzer wants ${analyzerMain}${analyzerAlt && analyzerAlt !== analyzerMain ? ` / ${analyzerAlt}` : ''}.`);
  }
  bullets.push(`Pair safety is ${prediction.pairSafety || 'unknown'} with noise risk ${prediction.noiseRisk ?? 0}%. Current regime feels ${prediction.regime || 'unknown'}.`);
  if (prediction.pairSafety === 'danger' && analyzerLeadsOutsider) {
    bullets.push(`What to trust here: trust Svarog Eye first. ${prediction.freshOutsider.value} is the active break-pressure roll, and the pair is fragile enough that the outsider can beat the commons lane.`);
  } else if (prediction.pairSafety === 'safe') {
    bullets.push('What to trust here: trust the commons lane first. Use Svarog Eye as confirmation, not as the main override.');
  } else if (prediction.pairSafety === 'caution' && displayPair.includes(analyzerMain)) {
    bullets.push('What to trust here: the board is shaky, but lane and Svarog Eye still overlap, so keep the main lane first.');
  } else if (prediction.pairSafety === 'caution') {
    bullets.push('What to trust here: keep the commons lane as baseline, but stay alert to Svarog Eye if the outsider keeps repeating.');
  }

  if (mainTrend) {
    bullets.push(
      `${mainCommon} trend is ${mainTrend.direction || 'stable'} with trust ${formatTrust(mainTrend.trustScore)} and freshness ${formatTrust(mainTrend.arrowWeight)}. Trust is an internal trend confidence score, while freshness tells you how stale that same arrow has become (${describeFreshness(mainTrend.arrowAge)}).`,
    );
  }
  if (mainTransition) {
    bullets.push(
      `After ${prediction.lastRoll || '-'}, the session transition into ${mainCommon} is worth ${mainTransition.pct}%${mainTransition.samples ? ` over ${mainTransition.samples} samples` : ''}. That is why the main lane was allowed to lean there.`,
    );
  }

  if (prediction.freshOutsider?.value) {
    bullets.push(
      `Fresh outsider pressure is ${prediction.freshOutsider.value}, which can break the main pair if it keeps appearing.`,
    );
  }

  if (nextObservedRoll) {
    if (nextObservedRoll === prediction.prediction) {
      bullets.push(
        `The next real roll is ${nextObservedRoll}, so the live board followed the main lean. That usually means the trusted pair and trend were aligned enough to hold.`,
      );
    } else if (nextObservedRoll === altCommon || nextObservedRoll === prediction.alt || nextObservedRoll === prediction.analyzerAlt) {
      bullets.push(
        `The next real roll is ${nextObservedRoll}, so the board slipped into the lane alt instead of the main lean. That usually points to caution-level safety or mixed pressure.`,
      );
    } else {
      bullets.push(
        `The next real roll is ${nextObservedRoll}, which broke the main read. That means the current board had enough noise, outsider pressure, or transition drift to beat the expected pair.`,
      );
    }

    const actualReasons = [];
    if (nextIsTrusted) actualReasons.push(`it still belonged to the trusted pair ${trustedPair}`);
    if (nextIsAnalyzerPick) actualReasons.push(`Svarog Eye already had it in its suggestion lane`);
    if (nextTransition && nextTransition.pct > 0) {
      actualReasons.push(`after ${prediction.lastRoll || '-'} the transition into ${nextObservedRoll} still had ${nextTransition.pct}% support${nextTransition.samples ? ` across ${nextTransition.samples} samples` : ''}`);
    }
    if (typeof nextDistribution === 'number') actualReasons.push(`${nextObservedRoll} still owns ${nextDistribution}% of the current distribution`);
    if (nextTrend?.direction === 'rising') actualReasons.push(`${nextObservedRoll} is currently rising`);
    if (nextIsOutsider) actualReasons.push(`it was the fresh outsider putting break pressure on the pair`);

    if (actualReasons.length > 0) {
      bullets.push(`Why the real output became ${nextObservedRoll}: ${actualReasons.join(', ')}.`);
    } else {
      bullets.push(`Why the real output became ${nextObservedRoll}: the board had enough mixed pressure that the session drifted outside the clean main lane.`);
    }

    if (reasonLine) {
      bullets.push(`Predictor method context: ${reasonLine}`);
    }

    if (nextTrend) {
      bullets.push(
        `${nextObservedRoll} itself is reading ${nextTrend.direction || 'stable'} with trust ${formatTrust(nextTrend.trustScore)} and freshness ${formatTrust(nextTrend.arrowWeight)}. Again, that trust/freshness layer is internal Svarog trend weighting, not the same number as the visible percent in the predictor card.`,
      );
    }
  }

  return {
    title: nextObservedRoll
      ? `Svarog Main leans ${mainCommon} • Svarog Eye suggests ${analyzerMain}${analyzerAlt && analyzerAlt !== analyzerMain ? ` / ${analyzerAlt}` : ''} • Real output is ${nextObservedRoll}`
      : `Svarog Main leans ${mainCommon} • Svarog Eye suggests ${analyzerMain}${analyzerAlt && analyzerAlt !== analyzerMain ? ` / ${analyzerAlt}` : ''}`,
    summary: 'This panel explains the board like a human-style read: pair lean, commons, noise, trend trust, and whether the next real roll fit the story.',
    bullets,
  };
}

export default function PlaygroundPatternLabPage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const themeConfig = getSessionThemeConfig(sessionTheme);

  const rootThemeClass = themeConfig.rootClassName;
  const isGlacial = rootThemeClass === 'arctic-theme';
  const isNeon = rootThemeClass === 'neon-theme';
  const isCrimson = rootThemeClass === 'crimson-theme' || rootThemeClass === 'void-theme';
  const isAstral = rootThemeClass === 'astral-theme';

  const themeColors = useMemo(() => {
    if (isCrimson) return {
      border: 'border-red-500/30',
      bgGlow: 'bg-red-500/5',
      text: 'text-red-400',
      textLight: 'text-red-200',
      button: 'bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20',
      buttonActive: 'bg-red-500/20 border-red-400/50 text-red-100',
      accent: 'bg-red-400',
    };
    if (isGlacial) return {
      border: 'border-cyan-500/30',
      bgGlow: 'bg-cyan-500/5',
      text: 'text-cyan-400',
      textLight: 'text-cyan-200',
      button: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20',
      buttonActive: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100',
      accent: 'bg-cyan-400',
    };
    if (isNeon) return {
      border: 'border-cyan-500/30',
      bgGlow: 'bg-cyan-500/5',
      text: 'text-cyan-400',
      textLight: 'text-cyan-200',
      button: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20',
      buttonActive: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100',
      accent: 'bg-cyan-400',
    };
    if (isAstral) return {
      border: 'border-[#d6b360]/30',
      bgGlow: 'bg-[#d6b360]/5',
      text: 'text-[#d6b360]',
      textLight: 'text-[#fae5a0]',
      button: 'bg-[#d6b360]/10 border-[#d6b360]/30 text-[#ecd189] hover:bg-[#d6b360]/20',
      buttonActive: 'bg-[#d6b360]/20 border-[#ecd189]/50 text-[#fae5a0]',
      accent: 'bg-[#d6b360]',
    };
    // Default modern / fuchsia as fallback
    return {
      border: 'border-fuchsia-400/30',
      bgGlow: 'bg-fuchsia-500/5',
      text: 'text-fuchsia-300',
      textLight: 'text-fuchsia-100',
      button: 'bg-fuchsia-500/10 border-fuchsia-400/30 text-fuchsia-200 hover:bg-fuchsia-500/20',
      buttonActive: 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-100',
      accent: 'bg-fuchsia-400',
    };
  }, [isCrimson, isGlacial, isNeon, isAstral]);

  const familyOptions = useMemo(() => getFamilyOptions(), []);
  const [sessionTab, setSessionTab] = useState('current');
  const [mood, setMood] = useState('mixed');
  const [familyId, setFamilyId] = useState('auto');
  const [currentLine, setCurrentLine] = useState(4);
  const [patternProfile, setPatternProfile] = useState(() => createLabProfile('mixed', 'auto'));
  const [labRows, setLabRows] = useState([]);
  const [sourceMode, setSourceMode] = useState('auto');
  const [manualRollsInput, setManualRollsInput] = useState('');
  const [importedFileName, setImportedFileName] = useState('');
  const [sourceSequence, setSourceSequence] = useState([]);
  const [sourceCursor, setSourceCursor] = useState(0);
  const [sourceMessage, setSourceMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [claraTipIndex, setClaraTipIndex] = useState(0);
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const lastRollIndexRef = useRef(0);
  const patternLabSessionKeyRef = useRef(`patternlab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const loggedPatternLabSessionRef = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);

    // Bento entrance animation with scale and stagger
    gsap.fromTo(q('.bento-tile'),
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.08, ease: 'back.out(1.2)' }
    );

    // Matrix fade up for Left Side elements
    gsap.fromTo(q('.matrix-fade'),
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
    );

    // Floating background for Svarog
    gsap.to(q('.gsap-float'), {
      y: -15,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, [themeConfig.rootClassName]);

  // Pulse animation when a step changes
  useEffect(() => {
    if (labRows.length > lastRollIndexRef.current && containerRef.current) {
      const q = gsap.utils.selector(containerRef.current);
      gsap.fromTo(q('.gsap-pulse-row'),
        { backgroundColor: 'rgba(255,255,255,0.2)' },
        { backgroundColor: 'transparent', duration: 1, ease: 'power2.out' }
      );
    }
    lastRollIndexRef.current = labRows.length;
  }, [labRows.length]);

  const entries = useMemo(() => labRows.map((row) => createSessionEntry(row.rawPair)).filter(Boolean), [labRows]);
  const prediction2 = useMemo(() => predictWithPairs(entries.map((entry) => entry.translated), { region: LAB_REGION }), [entries]);
  const profileDescription = useMemo(() => describePatternProfile(patternProfile), [patternProfile]);
  const displayedStarter = (patternProfile?.starterSequence || []).join(' ');
  const remainingSourceRolls = Math.max(0, sourceSequence.length - sourceCursor);
  const nextObservedRoll = sourceMode === 'auto'
    ? getVisibleRollForUpgrade(patternProfile, labRows.length)
    : sourceSequence[sourceCursor]?.visibleRoll || null;
  const familyOptionMatchesMood = familyId === 'auto'
    || familyOptions.some((option) => option.id === familyId && option.mood === mood);

  const submitPatternLabSession = React.useCallback((reason = 'manual') => {
    if (!user?.id) return;
    if (labRows.length < 10) return;
    const sessionKey = patternLabSessionKeyRef.current;
    if (!sessionKey || loggedPatternLabSessionRef.current === sessionKey) return;
    loggedPatternLabSessionRef.current = sessionKey;

    fetch(buildApiUrl('/api/practice-results'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      keepalive: true,
      body: JSON.stringify({
        mode: 'pattern_lab',
        sessionKey,
        score: labRows.length,
        success: true,
        sourceMode: sourceMode,
        rowsCount: labRows.length,
        detail: {
          reason,
          mood,
          family_id: familyId,
          notes_length: String(notes || '').trim().length,
          imported_file_name: importedFileName || '',
          pair_safety: prediction2?.pairSafety || '',
          next_observed_roll: nextObservedRoll || '',
        },
      }),
    }).catch(() => {});
  }, [
    familyId,
    getAuthHeader,
    importedFileName,
    labRows.length,
    mood,
    nextObservedRoll,
    notes,
    prediction2?.pairSafety,
    sourceMode,
    user?.id,
  ]);

  const resetLab = (nextMood = mood, nextFamilyId = familyId) => {
    submitPatternLabSession('reset');
    patternLabSessionKeyRef.current = `patternlab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    loggedPatternLabSessionRef.current = '';
    setMood(nextMood);
    setFamilyId(nextFamilyId);
    setCurrentLine(4);
    setLabRows([]);
    setPatternProfile(createLabProfile(nextMood, nextFamilyId));
    setSourceCursor(0);
    setSourceMessage('');
  };

  const loadExplicitSequence = (mode, nextSequence, message = '', filename = '') => {
    submitPatternLabSession('load-sequence');
    patternLabSessionKeyRef.current = `patternlab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    loggedPatternLabSessionRef.current = '';
    setSourceMode(mode);
    setSourceSequence(nextSequence);
    setSourceCursor(0);
    setImportedFileName(filename);
    setSourceMessage(message);
    setCurrentLine(4);
    setLabRows([]);
    setPatternProfile(createLabProfile(mood, familyId));
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = extractSessionRowsFromExport(text);
    if (!rows.length) {
      setSourceMessage('No session rows found in that TXT file.');
      return;
    }
    loadExplicitSequence('import', rows, `Loaded ${rows.length} session rolls from ${file.name}.`, file.name);
  };

  const handleLoadManualRolls = () => {
    const { rows, message } = extractManualSequence(manualRollsInput);
    if (!rows.length) {
      setSourceMessage('Enter visible rolls like 41 42 44 43, or paste a longstring to decode it into rolls.');
      return;
    }
    loadExplicitSequence('manual', rows, message, '');
  };

  const rebuildLabToCount = (targetCount) => {
    const freshProfile = createLabProfile(mood, familyId);
    const activeSequence = sourceMode === 'auto'
      ? labRows.map((row) => ({ visibleRoll: row.visibleRoll, rawPair: row.rawPair }))
      : sourceSequence;
    const safeCount = Math.max(0, Math.min(targetCount, activeSequence.length));
    const rebuilt = buildRowsFromSequence(freshProfile, activeSequence, safeCount);

    setLabRows(rebuilt.rows);
    setCurrentLine(rebuilt.currentLine);
    setPatternProfile(rebuilt.patternProfile);

    if (sourceMode !== 'auto') {
      setSourceCursor(safeCount);
    }
  };

  const runSteps = (count = 1, useStarterSequence = false) => {
    let workingProfile = patternProfile;
    let workingLine = currentLine;
    const rows = [...labRows];
    const starterSequence = useStarterSequence ? (workingProfile.starterSequence || []) : null;
    const explicitSequence = !useStarterSequence && sourceMode !== 'auto'
      ? sourceSequence.slice(sourceCursor, sourceCursor + count)
      : null;
    const stepCount = useStarterSequence
      ? starterSequence.length
      : explicitSequence
        ? explicitSequence.length
        : count;

    for (let index = 0; index < stepCount; index += 1) {
      const explicitRow = explicitSequence?.[index] || null;
      const visibleRoll = useStarterSequence
        ? starterSequence[index]
        : explicitRow?.visibleRoll || getVisibleRollForUpgrade(workingProfile, rows.length);
      const resolved = explicitRow?.rawPair
        ? {
          rawPair: explicitRow.rawPair,
          targetSlot: Number(String(explicitRow.rawPair).slice(1, 2)) || workingLine,
        }
        : resolveNextSlotFromVisibleRoll(workingLine, visibleRoll);

      rows.push({
        index: rows.length + 1,
        fromLine: workingLine,
        rawPair: resolved.rawPair,
        visibleRoll,
        targetSlot: resolved.targetSlot,
        phase: workingProfile.phase,
        family: workingProfile.family,
        commons: (workingProfile.commons || []).join(' / '),
        noise: (workingProfile.noise || []).join(' / '),
      });
      workingLine = resolved.targetSlot;
      workingProfile = advancePatternProfile(workingProfile, visibleRoll);
    }

    setLabRows(rows);
    setCurrentLine(workingLine);
    setPatternProfile(workingProfile);
    if (explicitSequence) {
      setSourceCursor((current) => current + explicitSequence.length);
    }
  };

  const loadStarterMotif = () => {
    submitPatternLabSession('starter-motif');
    patternLabSessionKeyRef.current = `patternlab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    loggedPatternLabSessionRef.current = '';
    const fresh = createLabProfile(mood, familyId);
    let workingProfile = fresh;
    let workingLine = 4;
    const starterRows = [];
    const starter = fresh.starterSequence || [];

    starter.forEach((visibleRoll, index) => {
      const { rawPair, targetSlot } = resolveNextSlotFromVisibleRoll(workingLine, visibleRoll);
      starterRows.push({
        index: index + 1,
        fromLine: workingLine,
        rawPair,
        visibleRoll,
        targetSlot,
        phase: workingProfile.phase,
        family: workingProfile.family,
        commons: (workingProfile.commons || []).join(' / '),
        noise: (workingProfile.noise || []).join(' / '),
      });
      workingLine = targetSlot;
      workingProfile = advancePatternProfile(workingProfile, visibleRoll);
    });

    setPatternProfile(workingProfile);
    setCurrentLine(workingLine);
    setLabRows(starterRows);
    setSourceMode('auto');
    setSourceSequence([]);
    setSourceCursor(0);
    setSourceMessage('Loaded the profile starter motif.');
  };

  useEffect(() => {
    const handlePageHide = () => {
      submitPatternLabSession('pagehide');
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      handlePageHide();
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [submitPatternLabSession]);

  const forceDisplayRows = labRows.slice(-10).reverse();
  const sourceStatusText = sourceMode === 'auto'
    ? 'Auto Seed uses the internal profile and generated starter motif.'
    : sourceMode === 'import'
      ? `Imported replay mode. ${remainingSourceRolls > 0 ? `${remainingSourceRolls} rolls left to step.` : 'Imported session loaded. Step through it or import another file.'}`
      : `Manual replay mode. ${remainingSourceRolls > 0 ? `${remainingSourceRolls} rolls left to step.` : 'Load a pasted roll list to begin stepping.'}`;
  const svarogAssistance = useMemo(
    () => buildSvarogAssistance(prediction2, nextObservedRoll),
    [prediction2, nextObservedRoll],
  );
  const claraTips = useMemo(() => {
    const tips = [];
    if (!labRows.length) {
      tips.push("I'm here to help. Pick a source, then step forward to watch the session unfold.");
      tips.push('Import a Session Data TXT or paste a longstring to replay a real session.');
      tips.push('Use Step 1 to inspect one roll at a time, or Step 5 to skip ahead faster.');
      return tips;
    }

    if (sourceMode === 'import' && remainingSourceRolls > 0) {
      tips.push(`Imported replay active. ${remainingSourceRolls} rolls left to inspect.`);
      tips.push('Use Step Back to compare before and after a key roll.');
    }

    if (sourceMode === 'manual' && remainingSourceRolls > 0) {
      tips.push(`Manual replay active. ${remainingSourceRolls} rolls remain in the payload.`);
      tips.push('Use Step Back to compare how the same session looks before and after a key roll.');
    }

    if (prediction2?.pairSafety === 'danger' && prediction2?.freshOutsider?.value) {
      tips.push(`Break danger. ${prediction2.freshOutsider.value} is the active outsider, so compare the commons lane with Svarog Eye first.`);
    }

    if (prediction2?.trustedPair?.length === 2) {
      tips.push(`Watch the trusted pair ${prediction2.trustedPair.join(' / ')} and compare it with the real output to learn why the board held or broke.`);
    }

    if (nextObservedRoll) {
      tips.push(`Next observed roll is ${nextObservedRoll}. Check Svarog Assistance below to see why it fit or broke the current read.`);
    }

    tips.push('Use Notes on the right to write your own read, then copy or download it.');
    return tips;
  }, [labRows, sourceMode, remainingSourceRolls, prediction2, nextObservedRoll]);
  const claraTip = claraTips[claraTipIndex % Math.max(claraTips.length, 1)] || "I'm here to help.";

  useEffect(() => {
    setClaraTipIndex(0);
  }, [sourceMode, sourceCursor, labRows.length, prediction2?.pairSafety, prediction2?.freshOutsider?.value, nextObservedRoll]);

  useEffect(() => {
    setClaraSpeaking(true);
    const timer = window.setTimeout(() => {
      setClaraSpeaking(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [claraTip]);

  useEffect(() => {
    if (claraTips.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setClaraTipIndex((current) => (current + 1) % claraTips.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [claraTips]);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(PATTERN_LAB_TOUR_KEY);
      if (!seen) {
        const timer = setTimeout(() => setTourRunning(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      const timer = setTimeout(() => setTourRunning(true), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const closeTour = () => {
    setTourRunning(false);
    setTourStepIndex(0);
    try {
      window.localStorage.setItem(PATTERN_LAB_TOUR_KEY, '1');
    } catch {
      // ignore localStorage failures
    }
  };

  const nextTourStep = () => {
    if (tourStepIndex >= PATTERN_LAB_TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }
    setTourStepIndex((current) => current + 1);
  };

  const previousTourStep = () => {
    setTourStepIndex((current) => Math.max(0, current - 1));
  };

  const patternLabTourState = useMemo(
    () => ({
      rows_at_least_10: labRows.length >= 10,
    }),
    [labRows.length],
  );

  const currentTourStep = PATTERN_LAB_TOUR_STEPS[tourStepIndex] || null;
  const [tourSelectorSatisfied, setTourSelectorSatisfied] = useState(false);

  useEffect(() => {
    if (!tourRunning || currentTourStep?.waitFor?.type !== 'selector') {
      setTourSelectorSatisfied(false);
      return undefined;
    }

    const checkSelector = () => {
      if (typeof document === 'undefined') return;
      setTourSelectorSatisfied(Boolean(document.querySelector(currentTourStep.waitFor.value)));
    };

    checkSelector();
    const interval = window.setInterval(checkSelector, 150);
    return () => window.clearInterval(interval);
  }, [currentTourStep, tourRunning]);

  const currentTourStepSatisfied = useMemo(() => {
    if (!currentTourStep?.waitFor) return true;
    if (currentTourStep.waitFor.type === 'state') {
      return Boolean(patternLabTourState[currentTourStep.waitFor.value]);
    }
    if (currentTourStep.waitFor.type === 'selector') {
      return tourSelectorSatisfied;
    }
    return false;
  }, [currentTourStep, patternLabTourState, tourSelectorSatisfied]);

  const canAdvanceTour = currentTourStepSatisfied;

  return (
    <div className={`pattern-lab-shell min-h-screen px-4 py-10 text-slate-200 md:px-6 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`} ref={containerRef}>
      <div className="mx-auto max-w-[1600px]">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .pattern-lab-shell {
                background: transparent !important;
              }
              .pattern-lab-shell .theme-glass-card {
                background: rgba(255, 255, 255, 0.012) !important;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
              }
              .pattern-lab-shell .theme-panel-surface {
                background: rgba(255, 255, 255, 0.012) !important;
              }
              .pattern-lab-shell .theme-subpanel {
                background: rgba(255, 255, 255, 0.01) !important;
              }
              .pattern-lab-shell .theme-glass-card::before,
              .pattern-lab-shell .theme-panel-surface::before,
              .pattern-lab-shell .theme-subpanel::before {
                opacity: 0.14 !important;
              }
              .pattern-lab-shell .theme-glass-card::after,
              .pattern-lab-shell .theme-panel-surface::after {
                opacity: 0.22 !important;
              }
              .pattern-lab-shell [class*="bg-slate-900"],
              .pattern-lab-shell [class*="bg-slate-950"],
              .pattern-lab-shell [class*="bg-slate-800"],
              .pattern-lab-shell [class*="bg-black"],
              .pattern-lab-shell [class*="from-slate-900"],
              .pattern-lab-shell [class*="to-slate-800"] {
                background: rgba(255, 255, 255, 0.028) !important;
              }
              .pattern-lab-shell [class*="bg-white/["] {
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
              }
            `,
          }}
        />

        {tourRunning && PATTERN_LAB_TOUR_STEPS.length > 0 ? (
          <PatternLabTourOverlay
            steps={PATTERN_LAB_TOUR_STEPS}
            currentStep={tourStepIndex}
            onNext={nextTourStep}
            onBack={previousTourStep}
            onClose={closeTour}
            canAdvance={canAdvanceTour}
            isWaiting={!canAdvanceTour}
          />
        ) : null}

        {/* -- Super Header -- */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center matrix-fade relative z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/playground')}
              className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Playground
            </button>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-[0.24em] ${themeColors.text}`}>Research Division</div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Pattern Lab</h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-2">
            <Radar className={`h-4 w-4 ${themeColors.text}`} />
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              {patternProfile.family} / {patternProfile.phase}
            </div>
            <button
              type="button"
              onClick={() => {
                setTourStepIndex(0);
                setTourRunning(true);
              }}
              title="Open guided tour"
              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:bg-white/[0.09] hover:text-white"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* -- The 40/60 Asymmetrical Split -- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10 w-full mb-[150px]">

          {/* =========================================================
              LEFT (40%): THE SVAROG MATRIX
              ========================================================= */}
          <div className="xl:col-span-5 space-y-6 sticky top-24">

            {/* The Main Predictor - Placed High up */}
            <div id="pattern-lab-predictor" className="matrix-fade">
              <ModernPairPredictorCard
                entries={entries}
                region={LAB_REGION}
                advancedToggleId="pattern-lab-advanced-toggle"
                advancedPanelId="pattern-lab-advanced-panel"
              />
            </div>

            {/* Moved Stats and Line Card */}
            <div id="pattern-lab-stats" className="matrix-fade transition-all duration-500">
              <ModernStatsPanel
                entries={entries}
                prediction2={prediction2}
                prediction3={null}
                prediction4={null}
                currentRegion={LAB_REGION}
                currentPatch={LAB_PATCH}
                forcedLineOverride={currentLine}
                compact={false}
              />
            </div>

          </div>


          {/* =========================================================
              RIGHT (60%): THE BENTO DASHBOARD
              ========================================================= */}
          <div className="xl:col-span-7 grid grid-cols-1 md:col-span-12 gap-5 relative z-10 w-full bento-container">
            
            {/* Tile 1: Tactical Media Player Deck (Unified Header) */}
            <div className={`bento-tile md:col-span-12 theme-glass-card rounded-[2rem] bg-transparent backdrop-blur-md p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${themeColors.bgGlow} blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity`} />

              <div className="flex flex-col gap-6 relative z-[140]">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                  
                  {/* Internal Settings Rack */}
                  <div className="flex flex-wrap gap-4 xs:gap-8">
                    <div>
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">System Mood</div>
                      <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                        {MOODS.map((option) => (
                          <button
                            key={option}
                            onClick={() => resetLab(option, familyOptionMatchesMood ? familyId : 'auto')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mood === option
                              ? themeColors.buttonActive
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Target Line</div>
                      <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                        {[1, 2, 3, 4].map((line) => (
                          <button
                            key={line}
                            onClick={() => setCurrentLine(line)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all duration-300 ${currentLine === line
                              ? 'bg-amber-500/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            L{line}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Media Controls */}
                  <div id="pattern-lab-controls" className="flex items-center gap-3">
                    <button
                      onClick={() => rebuildLabToCount(labRows.length - 1)}
                      title="Step Back"
                      disabled={labRows.length === 0}
                      className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all duration-300 active:scale-95 ${
                        labRows.length === 0
                          ? 'border-white/5 bg-black/20 text-slate-600 cursor-not-allowed'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:scale-105 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <StepForward className="h-5 w-5 rotate-180" />
                    </button>
                    <button
                      onClick={loadStarterMotif}
                      title="Load Starter Motif"
                      className="h-12 w-12 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      <Sparkles className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => runSteps(1)}
                      title="Step 1"
                      className={`h-14 w-14 flex items-center justify-center rounded-[1.25rem] border transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg ${themeColors.button} pl-1`}
                    >
                      <Play className="h-6 w-6 text-current drop-shadow-[0_0_8px_currentColor]" />
                    </button>
                    <button
                      onClick={() => runSteps(5)}
                      title="Step 5"
                      className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 ${themeColors.button}`}
                    >
                      <FastForward className="h-5 w-5 drop-shadow-[0_0_5px_currentColor]" />
                    </button>
                    <div className="w-px h-8 bg-white/10 mx-1" />
                    <button
                      onClick={() => resetLab(mood, familyId)}
                      title="Reset Data"
                      className="h-10 w-10 flex items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 transition-all duration-300 hover:scale-105 hover:bg-rose-500/20 active:scale-95"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Integrated Diagnostics Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/5 backdrop-blur-sm">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Active Seed</span>
                    <span className={`font-mono text-[11px] ${themeColors.textLight} truncate group-hover:text-white transition-colors`}>{sourceMode === 'auto' ? patternProfile.seed : 'Imported/Manual Session'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Commons</span>
                    <span className="font-black text-emerald-300 text-sm">{(patternProfile.commons || []).join(' / ')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Noise</span>
                    <span className="font-black text-rose-400 text-sm">{(patternProfile.noise || []).join(' / ')}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 leading-tight italic line-clamp-2">
                      {profileDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Protocol Bottom Rack */}
              <div id="pattern-lab-source" className="border-t border-white/5 pt-6 mt-6 relative z-[140]">
                <div className="flex flex-col gap-6">
                  {/* Inline Mode Switcher on Top */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Source Protocol Selection</div>
                    <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/5 self-start md:self-auto backdrop-blur-sm">
                      {SOURCE_MODES.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSourceMode(option.id)}
                          className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sourceMode === option.id
                            ? themeColors.buttonActive
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Content Below */}
                  <div className="w-full bg-white/[0.02] rounded-2xl p-4 md:p-6 border border-white/5">
                    {sourceMode === 'import' ? (
                      <div className="flex flex-col md:flex-row items-center justify-end gap-6 text-right">
                        <div className="text-xs text-slate-400 font-medium order-2 md:order-1">
                          {importedFileName ? `Session: ${importedFileName}` : 'Select a dump from Live/Free mode to simulate.'}
                        </div>
                        <div className="flex items-center gap-3 order-1 md:order-2">
                          <input ref={fileInputRef} type="file" accept=".txt" onChange={handleImportFile} className="hidden" />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${themeColors.button}`}
                          >
                            Select Session Data.txt
                          </button>
                        </div>
                      </div>
                    ) : sourceMode === 'manual' ? (
                      <div className="space-y-4">
                        <textarea
                          value={manualRollsInput}
                          onChange={(e) => setManualRollsInput(e.target.value)}
                          rows={2}
                          placeholder="Paste visible rolls here..."
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-mono text-slate-200 outline-none focus:border-white/30 transition-all backdrop-blur-sm"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleLoadManualRolls}
                            className={`inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${themeColors.button}`}
                          >
                            Execute Manual Payload
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 font-medium p-4 rounded-xl bg-white/[0.03] border border-white/5 border-dashed text-right backdrop-blur-sm">
                        Automated generation using internal structural profiling.
                      </div>
                    )}
                    {sourceMessage && <div className={`mt-3 text-xs font-bold ${themeColors.textLight} text-right`}>{sourceMessage}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Clara's Lab (Primary) & Log Output (Secondary) */}
            <div id="pattern-lab-clara" className={`bento-tile md:col-span-8 theme-glass-card force-overflow-visible rounded-[2.5rem] bg-transparent backdrop-blur-md p-8 group relative overflow-visible shadow-[0_0_50px_rgba(0,0,0,0.35)]`}>
              <style dangerouslySetInnerHTML={{
                __html: `
                .force-overflow-visible { overflow: visible !important; }
                .arctic-theme .theme-glass-card.force-overflow-visible,
                .crimson-theme .theme-glass-card.force-overflow-visible { overflow: visible !important; }
              `}} />

              <div className="flex flex-col relative z-20">
                <div className={`mb-5 flex items-center gap-6 ${themeColors.textLight} relative`}>
                  <div className="absolute -top-24 md:-top-32 left-10 md:left-33 z-[130] animate-float-gentle select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105">
                    <div className="relative">
                      <svg width="270" height="92" viewBox="0 0 270 92" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[230px] md:w-[290px]">
                        <path
                          d="M10 38C10 18.1178 31.4903 2 58 2H212C238.51 2 260 18.1178 260 38C260 57.8822 238.51 74 212 74H78L44 90L54 74C29.5964 74 10 57.8822 10 38Z"
                          fill="white"
                          fillOpacity="0.95"
                          stroke={(themeColors && themeColors.text && themeColors.text.includes('cyan')) ? '#0ea5e9' : '#000'}
                          strokeWidth="3"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pb-3 px-8 md:px-10 z-20">
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight clara-chat-text text-center leading-[1.05]" style={{ color: '#000000' }}>
                          {claraTip}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-28 w-28 md:h-40 md:w-40 shrink-0 -mt-20 md:-mt-32 ml-4 md:ml-6 group-hover:scale-110 transition-transform duration-700 z-[120]">
                    <div className={`absolute inset-0 rounded-full ${themeColors.bgGlow} blur-[60px] opacity-40 group-hover:scale-150 transition-transform duration-1000`} />
                    <img
                      src={claraSpeaking ? withBaseUrl('clara-prof-OandMouth.gif') : withBaseUrl('clara-prof-assistant.png')}
                      alt="Clara Assistant Icon"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] max-w-none object-contain z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                      style={{
                        maskImage: 'linear-gradient(to bottom, black 50%, transparent 95%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 95%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                        maskComposite: 'intersect',
                        WebkitMaskComposite: 'source-in'
                      }}
                    />
                  </div>

                  <div className="pt-4 relative z-10">
                    <div className={`text-[10px] font-black uppercase tracking-[0.5em] ${themeColors.text} opacity-50 mb-1`}>Clara's Lab</div>
                    <div className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-md">{svarogAssistance.title}</div>
                  </div>
                </div>

                <div className="text-sm md:text-md leading-relaxed text-slate-200 font-semibold md:pl-6 border-l-2 border-white/10 mt-2 relative z-10">
                  {svarogAssistance.summary}
                </div>

                {svarogAssistance.bullets.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {svarogAssistance.bullets.map((bullet, idx) => (
                      <div key={idx} className="relative pl-4 text-xs leading-relaxed text-slate-300 transition-colors hover:text-white group">
                        <span className={`absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full ${themeColors.accent} shadow-[0_0_10px_currentColor] group-hover:scale-150 transition-transform`} />
                        {bullet}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 opacity-50">Awaiting Data Signature...</div>
                )}
              </div>
            </div>

            {/* Tile 2: Log Output (Sidebar) */}
            <div id="pattern-lab-log" className={`bento-tile md:col-span-4 theme-glass-card rounded-[2.5rem] bg-transparent backdrop-blur-md p-6 flex flex-col min-h-[400px] relative overflow-hidden group`}>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-300`}>
                  <TerminalSquare className="h-4 w-4" />
                  Log Output
                </div>
                <div className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md">{labRows.length} Ops</div>
              </div>

              <div className="grid grid-cols-[30px_35px_35px_1fr] gap-2 mb-2 px-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2 relative z-10">
                <div>Idx</div>
                <div>Line</div>
                <div>Raw</div>
                <div>Trans</div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 relative z-10 text-[10px]">
                {forceDisplayRows.length > 0 ? forceDisplayRows.map((row) => (
                  <div key={row.index} className="gsap-pulse-row grid grid-cols-[30px_35px_35px_1fr] gap-2 items-center text-xs py-1.5 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                    <span className="text-slate-600 font-bold text-[9px]">{row.index}</span>
                    <span className="text-slate-400 font-bold text-[10px]">L{row.fromLine}</span>
                    <span className="text-slate-500 font-mono text-[10px]">{row.rawPair}</span>
                    <span className={`font-mono font-bold text-sm ${themeColors.textLight}`}>{row.visibleRoll}</span>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-600 font-mono italic">
                    &gt; awaiting input_stream...
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-b-[2rem] z-20" />
            </div>

            <div id="pattern-lab-notes" className="bento-tile md:col-span-12">
              <ModernNotesCard
                notes={notes}
                setNotes={setNotes}
                prediction={prediction2}
                region={LAB_REGION}
                patch={LAB_PATCH}
                entries={entries}
                themeColors={themeColors}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
