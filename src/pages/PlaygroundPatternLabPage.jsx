import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
  BrainCircuit,
  ChevronRight,
  Radar,
  RefreshCw,
  ScanSearch,
  Sparkles,
  StepForward,
  Play,
  FastForward,
  SkipBack,
  TerminalSquare
} from 'lucide-react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernNotesCard from '../components/modern/ModernNotesCard';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { decodeLongString, translateTo4 } from '../utils/stringHelpers';
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
  const lastRollIndexRef = useRef(0);

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
  const familyOptionMatchesMood = familyId === 'auto'
    || familyOptions.some((option) => option.id === familyId && option.mood === mood);

  const resetLab = (nextMood = mood, nextFamilyId = familyId) => {
    setMood(nextMood);
    setFamilyId(nextFamilyId);
    setCurrentLine(4);
    setLabRows([]);
    setPatternProfile(createLabProfile(nextMood, nextFamilyId));
    setSourceCursor(0);
    setSourceMessage('');
  };

  const loadExplicitSequence = (mode, nextSequence, message = '', filename = '') => {
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

  const forceDisplayRows = labRows.slice(-10).reverse();
  const sourceStatusText = sourceMode === 'auto'
    ? 'Auto Seed uses the internal profile and generated starter motif.'
    : sourceMode === 'import'
      ? `Imported replay mode. ${remainingSourceRolls > 0 ? `${remainingSourceRolls} rolls left to step.` : 'Imported session loaded. Step through it or import another file.'}`
      : `Manual replay mode. ${remainingSourceRolls > 0 ? `${remainingSourceRolls} rolls left to step.` : 'Load a pasted roll list to begin stepping.'}`;
  const nextObservedRoll = sourceMode === 'auto'
    ? getVisibleRollForUpgrade(patternProfile, labRows.length)
    : sourceSequence[sourceCursor]?.visibleRoll || null;
  const svarogAssistance = useMemo(
    () => buildSvarogAssistance(prediction2, nextObservedRoll),
    [prediction2, nextObservedRoll],
  );

  return (
    <div className={`min-h-screen px-4 py-10 text-slate-200 md:px-6 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`} ref={containerRef}>
      <div className="mx-auto max-w-[1600px]">

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

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-4 py-2">
            <Radar className={`h-4 w-4 ${themeColors.text}`} />
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              {patternProfile.family} / {patternProfile.phase}
            </div>
          </div>
        </div>

        {/* -- The 40/60 Asymmetrical Split -- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10 w-full mb-[150px]">

          {/* =========================================================
              LEFT (40%): THE SVAROG MATRIX
              ========================================================= */}
          <div className="xl:col-span-5 space-y-6 sticky top-24">

            {/* The Main Predictor - Placed High up */}
            <div className="matrix-fade">
              <ModernPairPredictorCard entries={entries} region={LAB_REGION} />
            </div>

            {/* Moved Stats and Line Card */}
            <div className="matrix-fade transition-all duration-500">
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
          <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-5 relative z-10 w-full">

            {/* Tile 1: Tactical Media Player Deck (Full Width) */}
            <div className={`bento-tile md:col-span-12 theme-glass-card rounded-[2rem] bg-black/40 backdrop-blur-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${themeColors.bgGlow} blur-[60px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity`} />

              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 relative z-10">

                {/* Internal Settings Rack */}
                <div className="flex flex-wrap gap-4 xs:gap-8">
                  <div>
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">System Mood</div>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
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
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={loadStarterMotif}
                    title="Load Starter Motif"
                    className="h-12 w-12 flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-slate-400 transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95"
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

              {/* Source Protocol moved inside/bottom of System Mood */}
              <div className="border-t border-white/5 pt-6 mt-6 relative z-10">
                <div className="flex flex-col md:flex-row gap-6">

                  <div className="w-full md:w-1/3">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Source Protocol</div>
                    <div className="flex flex-col gap-2">
                      {SOURCE_MODES.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSourceMode(option.id)}
                          className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${sourceMode === option.id
                            ? themeColors.buttonActive
                            : 'border border-white/5 bg-black/40 text-slate-400 hover:border-white/20 hover:text-white'
                            }`}
                        >
                          <div className={`mr-3 h-2 w-2 rounded-full ${sourceMode === option.id ? themeColors.accent : 'bg-slate-700'}`} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-2/3 md:pl-6 flex flex-col justify-center">
                    {sourceMode === 'import' ? (
                      <div className="space-y-4">
                        <input ref={fileInputRef} type="file" accept=".txt" onChange={handleImportFile} className="hidden" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${themeColors.button}`}
                        >
                          Select Session Data.txt
                        </button>
                        <div className="text-xs text-slate-400 font-medium">
                          {importedFileName ? `Currently active: ${importedFileName}` : 'Select a dump from Live/Free mode to simulate.'}
                        </div>
                      </div>
                    ) : sourceMode === 'manual' ? (
                      <div className="space-y-3">
                        <textarea
                          value={manualRollsInput}
                          onChange={(e) => setManualRollsInput(e.target.value)}
                          rows={2}
                          placeholder="Paste visible rolls here..."
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-mono text-slate-200 outline-none focus:border-white/30 transition-all"
                        />
                        <button
                          onClick={handleLoadManualRolls}
                          className={`inline-flex items-center gap-2 rounded-xl border px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${themeColors.button}`}
                        >
                          Execute Manual Payload
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 font-medium p-6 rounded-xl bg-black/20 border border-white/5 border-dashed text-center">
                        Automated generation using internal structural profiling.
                      </div>
                    )}

                    {sourceMessage && <div className={`mt-3 text-xs font-bold ${themeColors.textLight}`}>{sourceMessage}</div>}
                  </div>

                </div>
              </div>
            </div>

            {/* Tile 2: Engine Read (Square-ish) */}
            <div className={`bento-tile md:col-span-6 theme-glass-card rounded-[2rem] bg-black/40 backdrop-blur-xl p-6 group relative overflow-hidden`}>
              <div className={`mb-5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${themeColors.text} relative z-10`}>
                <Radar className="h-4 w-4" />
                Engine Diagnostics
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col justify-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Seed</span>
                  <span className={`font-mono text-xs ${themeColors.textLight} break-all`}>{sourceMode === 'auto' ? patternProfile.seed : 'Imported/Manual Session'}</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 p-3 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block mb-1">Commons</span>
                    <span className="font-black text-emerald-300 text-lg">{(patternProfile.commons || []).join('/')}</span>
                  </div>
                  <div className="flex-1 p-3 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block mb-1">Noise</span>
                    <span className="font-black text-rose-400 text-lg">{(patternProfile.noise || []).join('/')}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {profileDescription}
                </p>
              </div>
            </div>

            {/* Tile 3: The Terminal (Raw vs Translated Stream) */}
            <div className={`bento-tile md:col-span-6 theme-glass-card rounded-[2rem] bg-black/40 backdrop-blur-xl p-6 flex flex-col max-h-[350px] relative overflow-hidden`}>
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

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1 relative z-10">
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
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#0B0D13] to-transparent pointer-events-none rounded-b-[2rem] z-20" />
            </div>

            {/* Clara's lab (Tile 3) */}
            <div className={`bento-tile md:col-span-12 theme-glass-card force-overflow-visible rounded-[2.5rem] bg-black/40 backdrop-blur-2xl p-8 mt-12 md:mt-20 group relative overflow-visible shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
              {/* Surgical fix for Arctic/Glacial theme overflow:hidden !important */}
              <style dangerouslySetInnerHTML={{
                __html: `
                .force-overflow-visible { overflow: visible !important; }
                .arctic-theme .theme-glass-card.force-overflow-visible,
                .crimson-theme .theme-glass-card.force-overflow-visible { overflow: visible !important; }
              `}} />

              <div className="flex flex-col relative z-20">
                <div className={`mb-5 flex items-center gap-6 ${themeColors.textLight} relative`}>

                  {/* Anime/Manga Style Speech Bubble */}
                  <div className="absolute -top-24 md:-top-32 left-10 md:left-33 z-[130] animate-float-gentle select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105">
                    <div className="relative">
                      {/* Organic Manga SVG Bubble */}
                      <svg width="220" height="75" viewBox="0 0 220 75" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[200px] md:w-[240px]">
                        <path
                          d="M10 32C10 15.4315 28.3563 2 51 2H169C191.644 2 210 15.4315 210 32C210 48.5685 191.644 62 169 62H65L38 73L46 62C25.4395 62 10 48.5685 10 32Z"
                          fill="white"
                          fillOpacity="0.95"
                          stroke={themeColors.text.includes('cyan') ? '#0ea5e9' : '#000'}
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {/* Interaction Text */}
                      <div className="absolute inset-0 flex items-center justify-center pb-2.5 px-6">
                        <span className="text-[12px] md:text-[13px] font-black uppercase tracking-tight text-black text-center leading-none">
                          "I-I'm... I'm here to help, Mr. Svarog..."
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clara Assistant Massive Pop-out Icon */}
                  <div className="relative h-28 w-28 md:h-40 md:w-40 shrink-0 -mt-20 md:-mt-32 ml-4 md:ml-6 group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-[120]">
                    <div className={`absolute inset-0 rounded-full ${themeColors.bgGlow} blur-[60px] opacity-40 group-hover:scale-150 transition-transform duration-1000`} />
                    <img
                      src="/clara-prof-assistant.png"
                      alt="Clara Assistant Icon"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] max-w-none object-contain z-10 select-none pointer-events-none drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                      style={{
                        maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                        maskComposite: 'intersect',
                        WebkitMaskComposite: 'source-in'
                      }}
                    />
                  </div>

                  <div className="pt-4 relative z-10">
                    <div className={`text-[10px] font-black uppercase tracking-[0.5em] ${themeColors.text} opacity-50 mb-1`}>Clara's Lab</div>
                    <div className={`text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-md`}>{svarogAssistance.title}</div>
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

            {/* User requested turning this off since we have log output now
            <div className="bento-tile md:col-span-12">
              <ModernSessionTable
                sessionTab={sessionTab}
                setSessionTab={setSessionTab}
                entries={entries}
                prevSessions={[]}
                compact
              />
            </div>
            */}

            <div className="bento-tile md:col-span-12">
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
