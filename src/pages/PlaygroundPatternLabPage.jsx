import React, { useMemo, useState } from 'react';
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
import ModernSessionTable from '../components/modern/ModernSessionTable';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { translateTo4 } from '../utils/stringHelpers';
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

export default function PlaygroundPatternLabPage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const familyOptions = useMemo(() => getFamilyOptions(), []);
  const [sessionTab, setSessionTab] = useState('current');
  const [mood, setMood] = useState('mixed');
  const [familyId, setFamilyId] = useState('auto');
  const [currentLine, setCurrentLine] = useState(4);
  const [patternProfile, setPatternProfile] = useState(() => createLabProfile('mixed', 'auto'));
  const [labRows, setLabRows] = useState([]);

  const entries = useMemo(() => labRows.map((row) => createSessionEntry(row.rawPair)).filter(Boolean), [labRows]);
  const prediction2 = useMemo(() => predictWithPairs(entries.map((entry) => entry.translated), { region: LAB_REGION }), [entries]);
  const profileDescription = useMemo(() => describePatternProfile(patternProfile), [patternProfile]);
  const displayedStarter = (patternProfile?.starterSequence || []).join(' ');

  const resetLab = (nextMood = mood, nextFamilyId = familyId) => {
    setMood(nextMood);
    setFamilyId(nextFamilyId);
    setCurrentLine(4);
    setLabRows([]);
    setPatternProfile(createLabProfile(nextMood, nextFamilyId));
  };

  const runSteps = (count = 1, useStarterSequence = false) => {
    let workingProfile = patternProfile;
    let workingLine = currentLine;
    const rows = [...labRows];
    const sequence = useStarterSequence ? (workingProfile.starterSequence || []) : null;
    const stepCount = useStarterSequence ? sequence.length : count;

    for (let index = 0; index < stepCount; index += 1) {
      const visibleRoll = useStarterSequence
        ? sequence[index]
        : getVisibleRollForUpgrade(workingProfile, rows.length);
      const { rawPair, targetSlot } = resolveNextSlotFromVisibleRoll(workingLine, visibleRoll);
      rows.push({
        index: rows.length + 1,
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
    }

    setLabRows(rows);
    setCurrentLine(workingLine);
    setPatternProfile(workingProfile);
  };

  const forceDisplayRows = labRows.slice(-10).reverse();
  const familyOptionMatchesMood = familyId === 'auto'
    || familyOptions.some((option) => option.id === familyId && option.mood === mood);

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
            Pattern Lab is the study room. You lock a family or let the engine choose one, then step the session forward slowly to see how
            commons, noise, raw pairs, translated rolls, and line position all evolve together.
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
                onClick={() => {
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
                  setMood(mood);
                  setFamilyId(familyId);
                  setPatternProfile(workingProfile);
                  setCurrentLine(workingLine);
                  setLabRows(starterRows);
                }}
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
                <div className="mt-1 font-mono text-white">{patternProfile.seed}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Starter Motif</div>
                <div className="mt-1 font-mono text-white">{displayedStarter || '—'}</div>
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
                  <div className="mt-1 font-black text-white">{patternProfile.dominantRoll || '—'}</div>
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
                    No rolls yet. Step the session forward or load the starter motif.
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
          </div>
        </div>
      </div>
    </div>
  );
}
