import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BrainCircuit,
  ChevronRight,
  Radar,
  RefreshCw,
  ScanSearch,
  Sparkles,
  StepForward,
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
  const themeConfig = getSessionThemeConfig(sessionTheme);
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
    <div className={`min-h-screen bg-[#080B14] px-4 py-10 text-slate-200 md:px-6 [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
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
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">Study Sandbox</div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">Pattern Lab</h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/50 px-4 py-2">
            <Radar className="h-4 w-4 text-fuchsia-300" />
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              {patternProfile.family} / {patternProfile.phase}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-5">
          <div className="mb-3 flex items-center gap-2 text-fuchsia-200">
            <Sparkles className="h-4 w-4" />
            <div className="text-[10px] font-black uppercase tracking-[0.22em]">What Pattern Lab Is</div>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Pattern Lab is the study room. You can use the auto profile, import a saved session TXT, or paste the full visible-roll history from a
            real run. Then you step the session forward slowly to study commons, noise, raw pairs, translated rolls, and line position together.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-5 xl:col-span-8">
            <div className="mb-4 flex items-center gap-2 text-fuchsia-200">
              <ScanSearch className="h-4 w-4" />
              <div className="text-[10px] font-black uppercase tracking-[0.22em]">Session Controls</div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Mood</div>
                <div className="flex gap-2">
                  {MOODS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => resetLab(option, familyOptionMatchesMood ? familyId : 'auto')}
                      className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                        mood === option
                          ? 'border-fuchsia-400/30 bg-fuchsia-500/12 text-fuchsia-100'
                          : 'border-white/5 bg-black/20 text-slate-300 hover:border-white/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Family Lock</div>
                <select
                  value={familyId}
                  onChange={(event) => resetLab(mood, event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-200 outline-none"
                >
                  <option value="auto">Auto from mood</option>
                  {familyOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Current Line</div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setCurrentLine(line)}
                      className={`rounded-xl border px-0 py-3 text-sm font-black transition-all ${
                        currentLine === line
                          ? 'border-amber-400/30 bg-amber-500/12 text-amber-100'
                          : 'border-white/5 bg-black/20 text-slate-300 hover:border-white/10'
                      }`}
                    >
                      L{line}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-white/5 bg-black/20 p-4">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Session Source</div>
              <div className="mb-4 flex flex-wrap gap-2">
                {SOURCE_MODES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSourceMode(option.id)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                      sourceMode === option.id
                        ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-100'
                        : 'border-white/5 bg-black/20 text-slate-300 hover:border-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {sourceMode === 'import' ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
                  >
                    Import Session TXT
                  </button>
                  <div className="text-xs text-slate-400">
                    Import the same TXT format downloaded from Session Data in live/free mode.
                    {importedFileName ? ` Loaded: ${importedFileName}.` : ''}
                  </div>
                </div>
              ) : null}

              {sourceMode === 'manual' ? (
                <div className="space-y-3">
                  <textarea
                    value={manualRollsInput}
                    onChange={(event) => setManualRollsInput(event.target.value)}
                    rows={4}
                    placeholder="Paste visible rolls like: 41 42 44 43 42 41, or a longstring like 23412345331345123552"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleLoadManualRolls}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 transition-all hover:bg-amber-500/20"
                    >
                      Load Manual Session
                    </button>
                    <div className="self-center text-xs text-slate-400">
                      Enter the full real session from start to end, then step through it.
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 text-xs text-slate-400">{sourceStatusText}</div>
              {sourceMessage ? <div className="mt-2 text-xs font-medium text-fuchsia-200">{sourceMessage}</div> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runSteps(1)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
              >
                <StepForward className="h-4 w-4" />
                Step 1 Roll
              </button>
              <button
                type="button"
                onClick={() => runSteps(5)}
                className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition-all hover:bg-fuchsia-500/20"
              >
                <ChevronRight className="h-4 w-4" />
                Step 5 Rolls
              </button>
              <button
                type="button"
                onClick={loadStarterMotif}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
              >
                <BrainCircuit className="h-4 w-4" />
                Load Starter Motif
              </button>
              <button
                type="button"
                onClick={() => resetLab(mood, familyId)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200 transition-all hover:border-white/20"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Lab
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-5 xl:col-span-4">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Engine Read</div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Seed</div>
                <div className="mt-1 font-mono text-white">{sourceMode === 'auto' ? patternProfile.seed : 'Imported / manual replay'}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Starter Motif</div>
                <div className="mt-1 font-mono text-white">{sourceMode === 'auto' ? (displayedStarter || '-') : 'User session replay'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Commons</div>
                  <div className="mt-1 font-black text-emerald-100">{(patternProfile.commons || []).join(' / ')}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Noise</div>
                  <div className="mt-1 font-black text-rose-100">{(patternProfile.noise || []).join(' / ')}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Phase</div>
                  <div className="mt-1 font-black text-white">{patternProfile.phase}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Noise</div>
                  <div className="mt-1 font-black text-white">{Number(patternProfile.noisePressure || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Dominant</div>
                  <div className="mt-1 font-black text-white">{patternProfile.dominantRoll || '-'}</div>
                </div>
              </div>
              <p className="rounded-xl border border-white/5 bg-black/20 p-3 text-sm leading-relaxed text-slate-300">
                {profileDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-5">
              <div className="mb-4 flex items-center gap-2 text-fuchsia-200">
                <BrainCircuit className="h-4 w-4" />
                <div className="text-[10px] font-black uppercase tracking-[0.22em]">Svarog Assistance</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="text-sm font-black text-white">{svarogAssistance.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-300">{svarogAssistance.summary}</div>
                {svarogAssistance.bullets.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {svarogAssistance.bullets.map((bullet) => (
                      <div key={bullet} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                        {bullet}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <ModernPairPredictorCard entries={entries} region={LAB_REGION} />
            <div className="rounded-[1.5rem] border border-white/5 bg-slate-950/45 p-5">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Raw vs Translated</div>
              <div className="overflow-hidden rounded-xl border border-white/5">
                <div className="grid grid-cols-[80px_90px_90px_80px_1fr] gap-0 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  <div>Step</div>
                  <div>From</div>
                  <div>Raw</div>
                  <div>Show</div>
                  <div>State</div>
                </div>
                {forceDisplayRows.length > 0 ? (
                  forceDisplayRows.map((row) => (
                    <div
                      key={`lab-row-${row.index}`}
                      className="grid grid-cols-[80px_90px_90px_80px_1fr] gap-0 border-t border-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      <div className="font-black">{row.index}</div>
                      <div>L{row.fromLine}</div>
                      <div className="font-mono">{row.rawPair}</div>
                      <div className="font-mono text-cyan-200">{row.visibleRoll}</div>
                      <div className="text-xs text-slate-400">
                        {row.family} / {row.phase} / {row.commons}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-400">
                    No rolls yet. Step the session forward, import a TXT, or load a manual session.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <ModernSessionTable
              sessionTab={sessionTab}
              setSessionTab={setSessionTab}
              entries={entries}
              prevSessions={[]}
              compact
            />
            <ModernStatsPanel
              entries={entries}
              prediction2={prediction2}
              prediction3={null}
              prediction4={null}
              currentRegion={LAB_REGION}
              currentPatch={LAB_PATCH}
              forcedLineOverride={currentLine}
            />
            <ModernNotesCard
              notes={notes}
              setNotes={setNotes}
              prediction={prediction2}
              region={LAB_REGION}
              patch={LAB_PATCH}
              entries={entries}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
