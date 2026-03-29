import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Clock3,
  History,
  RotateCcw,
  Target,
  Wand2,
} from 'lucide-react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { translateTo4 } from '../utils/stringHelpers';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

const CHAPTERS = [
  {
    id: 'read-live',
    label: 'Chapter 1',
    title: 'Read the Live State',
    summary:
      'Read the pair, noise risk, Svarog exact lean, history, and the line helper the same way you would during a real manip window.',
    coach:
      'Start here: the active pair is 42 / 43. That is the lane the live page says is safest. The question is whether that lane is good for the relic you actually care about.',
  },
  {
    id: 'bad-upgrade',
    label: 'Chapter 2',
    title: 'Why Direct Upgrade Is Wrong',
    summary:
      'The target relic is real, but the pair is bad for it right now. If you upgrade directly, one of the commons still lands on junk.',
    coach:
      'Look at the target relic with the helper below it. Directly taking 42 / 43 now means one crit line and one junk line. That is not the manip we want.',
  },
  {
    id: 'force-line',
    label: 'Chapter 3',
    title: 'Force The Line',
    summary:
      'Use the setup relic to force line 3 first. That changes how the commons pair behaves when you return to the target relic.',
    coach:
      'This is the real trick: use the 2-line setup relic to force line 3, then go back to the target relic so the commons pair can land on the crit side instead.',
  },
];

const INITIAL_SCRIPTED_ROLLS = ['43', '43', '41', '41', '42', '43', '42'];

const INITIAL_HISTORY_ROWS = [
  { time: '02:18:11', roll: '42', note: 'common starts' },
  { time: '02:18:19', roll: '43', note: 'other common' },
  { time: '02:18:24', roll: '42', note: 'pair repeats' },
  { time: '02:18:31', roll: '44', note: 'noise insert' },
  { time: '02:18:39', roll: '42', note: 'back to lane' },
  { time: '02:18:46', roll: '43', note: 'commons confirmed' },
  { time: '02:18:53', roll: '42', note: 'current read' },
];

const TARGET_BASE_LINES = [
  { slot: 1, stat: 'CRIT RATE', tone: 'good', hits: 0 },
  { slot: 2, stat: 'CRIT DMG', tone: 'good', hits: 0 },
  { slot: 3, stat: 'EFF RES', tone: 'bad', hits: 0 },
];

const TARGET_FOURTH_LINE = { slot: 4, stat: 'BREAK EFFECT', tone: 'bad', hits: 0 };

const SETUP_BASE_LINES = [
  { slot: 1, stat: 'HP%', state: 'locked' },
  { slot: 2, stat: 'SPD', state: 'locked' },
  { slot: 3, stat: 'OPEN LINE', state: 'open' },
];

const LEVEL_SEQUENCE = [3, 6, 9, 12, 15];
const DIRECT_LINE_SEQUENCE = [2, 3, 2, 3];
const SHIFTED_LINE_SEQUENCE = [1, 2, 1, 2];

function TargetRelicCard({ relic, activeChapter, onTargetAction, onReset }) {
  const actionLabel = !relic.hasFourthLine
    ? 'Add 4th Line'
    : relic.level >= 15
      ? 'Fully Upgraded'
      : `Upgrade to +${relic.nextLevel}`;

  return (
    <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Target Relic</div>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">The relic you actually care about</h2>
        </div>
        <Target className="h-5 w-5 text-emerald-300" />
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">5-star target relic</div>
            <div className="mt-1 text-base font-black uppercase text-white">Main Stat: CRIT RATE</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-200">
            +{relic.level}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {relic.lines.map((line) => {
            const isHit = relic.lastHit === line.slot;
            const isGood = line.tone === 'good';

            return (
              <div
                key={line.slot}
                className={`rounded-2xl border px-4 py-3 transition-all ${isHit
                  ? 'border-cyan-400/40 bg-cyan-500/12'
                  : 'border-white/10 bg-white/[0.03]'
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Line {line.slot}</div>
                    <div className={`mt-1 text-sm font-black uppercase ${isGood ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {line.stat}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Hits</div>
                    <div className="mt-1 text-lg font-black text-white">{line.hits}</div>
                  </div>
                </div>
                {isHit && (
                  <div className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100">
                    Latest simulator hit landed here.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onTargetAction}
            disabled={relic.level >= 15}
            className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-all ${relic.level >= 15
              ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
              : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
              }`}
          >
            {actionLabel}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Scenario
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Target read</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            Directly using <span className="font-black text-white">42 / 43</span> on this relic means you are still
            flirting with <span className="font-black text-amber-200">EFF RES</span>. One side is crit, one side is junk.
          </p>
        </div>
      </div>
    </article>
  );
}

function SetupRelicCard({ setupRelic, shiftActive, activeChapter, onForceThirdLine }) {
  return (
    <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Setup Relic</div>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Force the line before you return</h2>
        </div>
        <Wand2 className="h-5 w-5 text-cyan-300" />
      </div>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/8 px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Purple setup relic</div>
            <div className="mt-1 text-base font-black uppercase text-white">2-line / 3-line forcing</div>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${shiftActive
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 bg-white/[0.03] text-slate-300'
            }`}>
            {shiftActive ? 'Line 3 forced' : 'Waiting'}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {setupRelic.lines.map((line) => (
            <div
              key={line.slot}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${line.state === 'forced'
                ? 'border-emerald-400/30 bg-emerald-500/10'
                : line.state === 'open'
                  ? 'border-amber-400/30 bg-amber-500/10'
                  : 'border-white/10 bg-white/[0.03]'
                }`}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Line {line.slot}</div>
              <div className={`text-sm font-black uppercase ${line.state === 'forced'
                ? 'text-emerald-200'
                : line.state === 'open'
                  ? 'text-amber-300'
                  : 'text-slate-200'
                }`}>
                {line.stat}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onForceThirdLine}
          disabled={shiftActive}
          className={`mt-5 w-full rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-all ${shiftActive
            ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'
            : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
            }`}
        >
          {shiftActive ? '3rd Line Forced' : 'Add 3rd Line To Force It'}
        </button>

        <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Caesar shift lesson</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            This setup relic is the detour. You force line 3 here first so the commons pair can come back to the
            target relic on the crit side instead of drifting into junk.
          </p>
        </div>
      </div>
    </article>
  );
}

export default function TutorialPage({ sessionTheme = 'modern' }) {
  const navigate = useNavigate();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const [activeChapter, setActiveChapter] = useState(CHAPTERS[0].id);
  const [targetRelic, setTargetRelic] = useState(() => ({
    level: 0,
    nextLevel: 3,
    hasFourthLine: false,
    lines: TARGET_BASE_LINES,
    lastHit: null,
  }));
  const [setupRelic, setSetupRelic] = useState(() => ({
    forced: false,
    lines: SETUP_BASE_LINES,
  }));
  const [tutorialRolls, setTutorialRolls] = useState(INITIAL_SCRIPTED_ROLLS);
  const [historyRows, setHistoryRows] = useState(INITIAL_HISTORY_ROWS);
  const [directStepIndex, setDirectStepIndex] = useState(0);
  const [shiftedStepIndex, setShiftedStepIndex] = useState(0);
  const [lastDirectLine, setLastDirectLine] = useState(4);
  const [lastShiftedLine, setLastShiftedLine] = useState(3);

  const scriptedEntries = useMemo(
    () =>
      tutorialRolls.map((roll, index) => ({
        id: `tutorial-${index}`,
        raw: roll,
        translated: roll,
        s2: roll,
        time: `2026-03-29T02:18:${String(11 + index * 7).padStart(2, '0')}`,
      })),
    [tutorialRolls]
  );

  const scriptedPrediction = useMemo(
    () => predictWithPairs(tutorialRolls, { region: 'America' }),
    [tutorialRolls]
  );

  const chapter = useMemo(
    () => CHAPTERS.find((entry) => entry.id === activeChapter) || CHAPTERS[0],
    [activeChapter]
  );

  const shiftActive = setupRelic.forced;

  const mappingRows = useMemo(() => {
    if (shiftActive) {
      return [
        { roll: '42', line: '1', stat: 'CRIT RATE', tone: 'good' },
        { roll: '43', line: '2', stat: 'CRIT DMG', tone: 'good' },
      ];
    }

    return [
      { roll: '42', line: '2', stat: 'CRIT DMG', tone: 'good' },
      { roll: '43', line: '3', stat: 'EFF RES', tone: 'bad' },
    ];
  }, [shiftActive]);

  const handleTargetAction = () => {
    setTargetRelic((current) => {
      if (!current.hasFourthLine) {
        return {
          ...current,
          level: 3,
          nextLevel: 6,
          hasFourthLine: true,
          lastHit: null,
          lines: [...current.lines, TARGET_FOURTH_LINE],
        };
      }

      return current;
    });

    if (!targetRelic.hasFourthLine) {
      return;
    }

    const activeSequence = shiftActive ? SHIFTED_LINE_SEQUENCE : DIRECT_LINE_SEQUENCE;
    const currentIndex = shiftActive ? shiftedStepIndex : directStepIndex;
    const hitSlot = activeSequence[Math.min(currentIndex, activeSequence.length - 1)];
    const previousLine = shiftActive ? lastShiftedLine : lastDirectLine;
    const rawPair = `${previousLine}${hitSlot}`;
    const recordedRoll = translateTo4(rawPair) || '42';
    const statLabel = targetRelic.lines.find((line) => line.slot === hitSlot)?.stat || `LINE ${hitSlot}`;

    setTutorialRolls((existing) => [...existing, recordedRoll]);
    setHistoryRows((existing) => {
      const nextIndex = existing.length;
      const seconds = 11 + nextIndex * 7;
      const time = `02:${String(Math.floor(seconds / 60) + 18).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      return [
        ...existing,
        {
          time,
          roll: recordedRoll,
          note: `sim hit ${statLabel.toLowerCase()} (${rawPair} -> ${recordedRoll})`,
        },
      ];
    });

    setTargetRelic((current) => {
      if (current.level >= 15) return current;

      const nextLevel = LEVEL_SEQUENCE.find((value) => value > current.level) ?? current.level;
      const followingLevel = LEVEL_SEQUENCE.find((value) => value > nextLevel) ?? nextLevel;

      return {
        ...current,
        level: nextLevel,
        nextLevel: followingLevel,
        lastHit: hitSlot,
        lines: current.lines.map((line) =>
          line.slot === hitSlot ? { ...line, hits: line.hits + 1 } : line
        ),
      };
    });

    if (shiftActive) {
      setShiftedStepIndex((value) => value + 1);
      setLastShiftedLine(hitSlot);
    } else {
      setDirectStepIndex((value) => value + 1);
      setLastDirectLine(hitSlot);
    }
  };

  const handleForceThirdLine = () => {
    setSetupRelic((current) => {
      if (current.forced) return current;

      return {
        forced: true,
        lines: current.lines.map((line) =>
          line.slot === 3 ? { ...line, stat: 'ATK%', state: 'forced' } : line
        ),
      };
    });

    setActiveChapter('force-line');
  };

  const handleResetScenario = () => {
    setTargetRelic({
      level: 0,
      nextLevel: 3,
      hasFourthLine: false,
      lines: TARGET_BASE_LINES,
      lastHit: null,
    });
    setSetupRelic({
      forced: false,
      lines: SETUP_BASE_LINES,
    });
    setTutorialRolls(INITIAL_SCRIPTED_ROLLS);
    setHistoryRows(INITIAL_HISTORY_ROWS);
    setDirectStepIndex(0);
    setShiftedStepIndex(0);
    setLastDirectLine(4);
    setLastShiftedLine(3);
    setActiveChapter(CHAPTERS[0].id);
  };

  return (
    <div className={`min-h-screen px-4 py-8 md:px-8 ${themeConfig.rootClassName || ''}`}>
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6">
        <section className="theme-glass-card rounded-[2rem] border border-white/10 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-5xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <BookOpen className="h-3.5 w-3.5" />
                Svarog Manip Tutorial
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                Learn Live Mode the way you actually manip
              </h1>
              <p className="mt-3 max-w-4xl text-sm text-slate-300 md:text-base">
                This page teaches one real manip flow: read the live state, inspect the target relic, stop the bad
                direct upgrade, then use a setup relic to force the line you actually want.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {CHAPTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveChapter(entry.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${activeChapter === entry.id
                    ? 'border-cyan-400/50 bg-cyan-500/12 text-white'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/5'
                    }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">{entry.label}</div>
                  <div className="mt-1 text-sm font-black uppercase">{entry.title}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.95fr_0.95fr]">
          <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Training panel</div>
                <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Live mode mini board</h2>
              </div>
              <div className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-200">
                scripted session
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Clock3 className="h-4 w-4" />
                  <div className="text-[10px] font-black uppercase tracking-[0.2em]">Window timer</div>
                </div>
                <div className="text-3xl font-black text-white">03:18</div>
                <div className="mt-2 text-xs text-slate-400">The active 5-minute manip window is already running.</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <History className="h-4 w-4" />
                  <div className="text-[10px] font-black uppercase tracking-[0.2em]">Input rolls</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-black tracking-[0.18em] text-white">
                  {tutorialRolls.join(' ')}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  These are pre-entered on purpose so the real predictor already has enough history to teach the read.
                </div>
              </div>
            </div>

            <div className="mt-4">
              <ModernPairPredictorCard entries={scriptedEntries} region="America" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">History record</div>
                <div className="mt-3 space-y-2">
                  {historyRows.slice(-8).map((row) => (
                    <div
                      key={`${row.time}-${row.roll}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="text-xs font-bold text-slate-300">{row.time}</div>
                      <div className="text-sm font-black text-white">{row.roll}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{row.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <ModernStatsPanel
                  entries={scriptedEntries}
                  prediction2={scriptedPrediction}
                  prediction3={{ prediction: '-', alt: null, confidence: 0, mode: '-' }}
                  prediction4={{ prediction: '-', alt: null, confidence: 0, mode: '-' }}
                  currentRegion="America"
                  currentPatch="4.1"
                />
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Teaching read</div>
                  <div className="mt-3 grid gap-2">
                    {mappingRows.map((row) => (
                      <div
                        key={row.roll}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 ${row.tone === 'good'
                          ? 'border-emerald-400/20 bg-emerald-500/10'
                          : 'border-amber-400/20 bg-amber-500/10'
                          }`}
                      >
                        <div className="text-sm font-black text-white">{row.roll}</div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Line {row.line}</div>
                        <div className={`text-sm font-black uppercase ${row.tone === 'good' ? 'text-emerald-200' : 'text-amber-200'
                          }`}>
                          {row.stat}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-sm leading-relaxed text-slate-200">
                    {shiftActive
                      ? 'Setup relic is active. Practical read is now shifted back onto the crit lane: 42 -> CRIT RATE, 43 -> CRIT DMG.'
                      : 'Without the setup relic, the commons pair is still awkward here: 42 helps, but 43 drifts into EFF RES.'}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <TargetRelicCard
            relic={targetRelic}
            activeChapter={activeChapter}
            onTargetAction={handleTargetAction}
            onReset={handleResetScenario}
          />

          <SetupRelicCard
            setupRelic={setupRelic}
            shiftActive={shiftActive}
            activeChapter={activeChapter}
            onForceThirdLine={handleForceThirdLine}
          />
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="theme-glass-card rounded-[2rem] border border-white/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{chapter.label}</div>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">{chapter.title}</h3>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300">{chapter.summary}</p>

            <div className="mt-5 rounded-[1.6rem] border border-cyan-400/20 bg-cyan-500/8 p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Coach line</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-100">{chapter.coach}</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Step 1</div>
                <div className="mt-2 text-sm font-black uppercase text-white">Read 42 / 43 first</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Treat the active pair as the current lane. That is the raw state coming from live mode.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Step 2</div>
                <div className="mt-2 text-sm font-black uppercase text-white">Check the relic mapping</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Do not trust a pair blindly. Compare the helper against the actual target relic lines.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Step 3</div>
                <div className="mt-2 text-sm font-black uppercase text-white">Force then return</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  If the direct path is bad, use the setup relic first, shift the line, then go back to the target relic.
                </p>
              </div>
            </div>
          </article>

          <article className="theme-glass-card h-full rounded-[2rem] border border-white/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">End state</div>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">What the player should leave with</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>You can read the live pair and the Svarog exact lean together.</li>
              <li>You can tell when a direct upgrade still sends commons into junk.</li>
              <li>You know why a setup relic can force line 3 before returning.</li>
              <li>You understand the practical Caesar shift this creates on the target relic.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate('/live')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-200 transition-all hover:bg-cyan-500/20"
              >
                Open Live Mode
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/tutorial/level-2')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-rose-200 transition-all hover:bg-rose-500/20"
              >
                Next: Level 2
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/playground')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white/5"
              >
                Try Playground
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
