import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
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
const LEVEL_TWO_TARGET_BASE_LINES = [
  { slot: 1, stat: 'FLAT HP', tone: 'bad', hits: 0 },
  { slot: 2, stat: 'CRIT RATE', tone: 'good', hits: 0 },
  { slot: 3, stat: 'CRIT DMG', tone: 'good', hits: 0 },
];
const LEVEL_THREE_TARGET_BASE_LINES = [
  { slot: 1, stat: 'FLAT ATK', tone: 'bad', hits: 0 },
  { slot: 2, stat: 'FLAT HP', tone: 'bad', hits: 0 },
  { slot: 3, stat: 'SPD', tone: 'good', hits: 0 },
];

const SETUP_BASE_LINES = [
  { slot: 1, stat: 'HP%', state: 'locked' },
  { slot: 2, stat: 'SPD', state: 'locked' },
  { slot: 3, stat: 'OPEN LINE', state: 'open' },
];
const ONE_LINE_SETUP_BASE_LINES = [
  { slot: 1, stat: 'HP%', state: 'locked' },
  { slot: 2, stat: 'OPEN LINE', state: 'open' },
];

const LEVEL_SEQUENCE = [3, 6, 9, 12, 15];
const DIRECT_LINE_SEQUENCE = [2, 3, 2, 3];
const SHIFTED_LINE_SEQUENCE = [1, 2, 1, 2];
const LEVEL_TWO_DIRECT_LINE_SEQUENCE = [2, 1, 4, 1];
const LEVEL_TWO_SHIFTED_LINE_SEQUENCE = [2, 3, 2, 3];
const LEVEL_TWO_VISIBLE_ROLLS = ['42', '44', '41', '44'];
const LEVEL_THREE_FOURTH_LINE = { slot: 4, stat: 'EFFECT HIT RATE', tone: 'bad', hits: 0 };

function TargetRelicCard({ relic, title, mainStat, targetRead, onTargetAction, onReset, successBanner = null, compact = true }) {
  const actionLabel = !relic.hasFourthLine
    ? 'Add 4th'
    : relic.level >= 15
      ? 'Maxed'
      : `+${relic.nextLevel}`;

  return (
    <article className={`relative overflow-hidden ${compact ? 'rounded-[1.5rem] p-0.5' : 'rounded-[2.5rem] p-1'} border border-slate-700/60 bg-slate-900/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500 hover:border-slate-500/60 hover:shadow-[0_16px_48px_rgba(0,0,0,0.8)] h-full`}>
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
      
      <div className={`relative h-full ${compact ? 'rounded-[1.3rem] p-4' : 'rounded-[2.3rem] p-6 md:p-8'} border border-white/5 bg-slate-950/40`}>
        <div className={`${compact ? 'mb-4' : 'mb-8'} flex items-start justify-between`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Target</div>
            </div>
            <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400`}>{title}</h2>
          </div>
          <div className={`${compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]`}>
            <Target className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-emerald-400`} />
          </div>
        </div>

        <div className={`relative ${compact ? 'rounded-[1.2rem] p-4' : 'rounded-[2rem] p-6'} border border-slate-700/50 bg-black/40 shadow-inner`}>
          <div className={`flex items-center justify-between gap-3 ${compact ? 'rounded-xl px-4 py-3' : 'rounded-2xl px-5 py-4'} border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent shadow-[0_4px_20px_rgba(0,0,0,0.2)]`}>
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.25em] text-emerald-400 opacity-80">5-star Protocol</div>
              <div className={`${compact ? 'text-xs' : 'text-lg'} mt-1 font-black uppercase text-white drop-shadow-md`}><span className="text-slate-400">Main:</span> <span className="text-emerald-300 ml-1">{mainStat}</span></div>
            </div>
            <div className={`${compact ? 'h-8 px-2 text-[10px]' : 'h-10 px-4 text-sm'} flex items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 font-black uppercase tracking-[0.2em] text-slate-200 shadow-sm backdrop-blur-md`}>
              +{relic.level}
            </div>
          </div>

          <div className={`${compact ? 'mt-4 gap-2' : 'mt-6 gap-3.5'} grid`}>
            {relic.lines.map((line) => {
              const isHit = relic.lastHit === line.slot;
              const isGood = line.tone === 'good';

              return (
                <div
                  key={line.slot}
                  className={`group relative overflow-hidden ${compact ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-5 py-4'} border transition-all duration-300 ${isHit
                    ? 'border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/50'
                    : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60'
                    }`}
                >
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`${compact ? 'h-7 w-7 text-[9px]' : 'h-10 w-10 text-[11px]'} flex items-center justify-center rounded-lg bg-black/40 font-black tracking-widest text-slate-500 border border-white/5`}>
                        {line.slot}
                      </div>
                      <div>
                        <div className={`${compact ? 'text-[11px]' : 'text-base'} font-black uppercase tracking-wide ${isGood ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {line.stat}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex ${compact ? 'h-6 w-6 text-sm' : 'h-8 w-8 text-lg'} items-center justify-center rounded-lg font-black ${isHit ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-400'}`}>
                        {line.hits}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`${compact ? 'mt-6 gap-2' : 'mt-8 gap-4'} grid grid-cols-2`}>
            <button
              type="button"
              onClick={onTargetAction}
              disabled={relic.level >= 15}
              className={`group relative overflow-hidden rounded-xl border ${compact ? 'px-4 py-2.5 text-[10px]' : 'px-6 py-4 text-sm'} font-black uppercase tracking-[0.2em] transition-all duration-300 ${relic.level >= 15
                ? 'cursor-not-allowed border-slate-700/50 bg-slate-800/30 text-slate-500'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/60 hover:bg-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5'
                }`}
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                {actionLabel}
              </div>
            </button>
            <button
              type="button"
              onClick={onReset}
              className={`group flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 ${compact ? 'px-4 py-2.5 text-[10px]' : 'px-6 py-4 text-sm'} font-black uppercase tracking-[0.2em] text-slate-400 transition-all duration-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200 hover:-translate-y-0.5`}
            >
              <RotateCcw className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} transition-transform duration-500 group-hover:-rotate-180`} />
              Reset
            </button>
          </div>

          {!compact && (
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-900/10 p-5 shadow-sm">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Target read</div>
                <p className="mt-2 text-[13px] leading-relaxed text-amber-100/80">{targetRead}</p>
              </div>
            </div>
          )}

          {successBanner && (
            <div className={`mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 ${compact ? 'p-3' : 'p-5'} shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <p className={`${compact ? 'text-[9px]' : 'text-sm'} font-black uppercase tracking-wide text-emerald-200`}>{successBanner}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SetupRelicCard({
  setupRelic,
  shiftActive,
  onForceThirdLine,
  title = 'Force the line before you return',
  badgeLabel = 'Purple setup relic',
  modeLabel = '2-line / 3-line forcing',
  forcedLabel = 'Line 3 forced',
  waitingLabel = 'Waiting',
  buttonLabel = 'Add 3rd Line To Force It',
  lessonTitle = 'Caesar shift lesson',
  lessonText = 'This setup relic is the detour. You force line 3 here first so the commons pair can come back to the target relic on the crit side instead of drifting into junk.',
  helperText = null,
  compact = true,
}) {
  return (
    <article className={`relative overflow-hidden ${compact ? 'rounded-[1.5rem] p-0.5' : 'rounded-[2.5rem] p-1'} border border-slate-700/60 bg-slate-900/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-500 hover:border-slate-500/60 h-full`}>
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />

      <div className={`relative h-full ${compact ? 'rounded-[1.3rem] p-4' : 'rounded-[2.3rem] p-6 md:p-8'} border border-white/5 bg-slate-950/40`}>
        <div className={`${compact ? 'mb-4' : 'mb-8'} flex items-start justify-between`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex h-1.5 w-1.5 rounded-full ${shiftActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]'}`} />
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Setup</div>
            </div>
            <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400`}>{title}</h2>
          </div>
          <div className={`${compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} flex items-center justify-center border border-violet-500/30 bg-violet-500/10 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]`}>
            <Wand2 className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} text-violet-400`} />
          </div>
        </div>

        <div className={`relative ${compact ? 'rounded-[1.2rem] p-4' : 'rounded-[2rem] p-6'} border border-slate-700/50 bg-black/40 shadow-inner`}>
          <div className={`flex flex-col ${compact ? 'gap-2' : 'sm:flex-row sm:items-center justify-between gap-4'} rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-transparent ${compact ? 'px-4 py-3' : 'px-5 py-4'} shadow-sm`}>
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.25em] text-violet-300 opacity-80">{badgeLabel}</div>
              {!compact && <div className="mt-1.5 text-lg font-black uppercase text-white drop-shadow-md">{modeLabel}</div>}
            </div>
            <div className={`flex items-center justify-center rounded-xl ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'} text-[10px] font-black uppercase tracking-[0.2em] shadow-sm backdrop-blur-md transition-colors duration-500 ${shiftActive
              ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'border border-white/10 bg-slate-800/80 text-slate-300'
              }`}>
              {shiftActive ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  {forcedLabel}
                </div>
              ) : waitingLabel}
            </div>
          </div>

          <div className={`${compact ? 'mt-4 gap-2' : 'mt-6 gap-3.5'} grid text-slate-300`}>
            {setupRelic.lines.map((line) => (
              <div
                key={line.slot}
                className={`group flex items-center justify-between transition-all duration-300 ${compact ? 'rounded-xl px-3 py-2' : 'rounded-2xl px-5 py-4'} border ${line.state === 'forced'
                  ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]'
                  : line.state === 'open'
                    ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
                    : 'border-slate-700/50 bg-slate-800/40'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex ${compact ? 'h-6 w-6 text-[8px]' : 'h-9 w-9 text-[10px]'} items-center justify-center rounded-lg bg-black/40 font-black tracking-widest border border-white/5 ${line.state === 'forced' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    L{line.slot}
                  </div>
                  <div className={`${compact ? 'text-[11px]' : 'text-base'} font-black uppercase tracking-wide ${line.state === 'forced'
                    ? 'text-emerald-300'
                    : line.state === 'open'
                      ? 'text-amber-300'
                      : 'text-slate-300'
                    }`}>
                    {line.stat}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onForceThirdLine}
            disabled={shiftActive}
            className={`group relative ${compact ? 'mt-4 px-4 py-3 text-[10px]' : 'mt-8 px-6 py-4 text-sm'} w-full overflow-hidden rounded-xl border font-black uppercase tracking-[0.2em] transition-all duration-300 ${shiftActive
              ? 'cursor-not-allowed border-slate-700/50 bg-slate-800/30 text-slate-500'
              : 'border-violet-500/40 bg-violet-500/10 text-violet-200 hover:border-violet-400/60 hover:bg-violet-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:-translate-y-0.5'
              }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {shiftActive ? forcedLabel : buttonLabel}
            </div>
            {!shiftActive && (
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent flex translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
            )}
          </button>

          {!compact && (
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-5 shadow-sm">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">{lessonTitle}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-cyan-100/80">{lessonText}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function TutorialPage({ sessionTheme = 'modern', level = 1 }) {
  const navigate = useNavigate();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const isLevelTwo = level === 2;
  const isLevelThree = level === 3;
  const [activeChapter, setActiveChapter] = useState(CHAPTERS[0].id);

  const containerRef = useRef(null);


  const [targetRelic, setTargetRelic] = useState(() => ({
    level: 0,
    nextLevel: 3,
    hasFourthLine: false,
    lines: isLevelThree ? LEVEL_THREE_TARGET_BASE_LINES : (isLevelTwo ? LEVEL_TWO_TARGET_BASE_LINES : TARGET_BASE_LINES),
    lastHit: null,
  }));
  const [setupRelic, setSetupRelic] = useState(() => ({
    forced: false,
    lines: SETUP_BASE_LINES,
  }));
  const [oneLineSetupRelic, setOneLineSetupRelic] = useState(() => ({
    forced: false,
    lines: ONE_LINE_SETUP_BASE_LINES,
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

  const shiftActive = isLevelTwo || isLevelThree ? oneLineSetupRelic.forced : setupRelic.forced;

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.gsap-fade-up',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", clearProps: "all" }
      );
      gsap.fromTo('.gsap-scale-in',
        { scale: 0.95, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power4.out", clearProps: "all" }
      );
      gsap.fromTo('.gsap-slide-right',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power2.out", clearProps: "all" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [activeChapter, level]);

  // Handle Focus Pulses
  useEffect(() => {
    const clearPulses = () => {
      document.querySelectorAll('.pulse-cyan, .pulse-violet').forEach(el => {
        el.classList.remove('pulse-cyan', 'pulse-violet');
      });
    };

    clearPulses();

    let targetId = '';
    let pulseClass = 'pulse-cyan';

    if (activeChapter === 'read-live') {
      targetId = 'svarog-feed-focus';
    } else if (activeChapter === 'bad-upgrade') {
      targetId = 'target-relic-focus';
    } else if (activeChapter === 'force-line') {
      if (!shiftActive) {
        targetId = 'setup-relic-focus';
        pulseClass = 'pulse-violet';
      } else {
        targetId = 'target-relic-focus';
      }
    }

    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.classList.add(pulseClass);
    }
  }, [activeChapter, shiftActive]);

  const mappingRows = useMemo(() => {
    if (isLevelThree) {
      return shiftActive
        ? [{ roll: '41', line: '3', stat: 'SPD', tone: 'good' }]
        : [
            { roll: '43', line: '3', stat: 'SPD', tone: 'good' },
            { roll: '44', line: '4', stat: 'EFFECT HIT RATE', tone: 'bad' },
          ];
    }

    if (isLevelTwo && shiftActive) {
      return [
        { roll: '42', line: '2', stat: 'CRIT RATE', tone: 'good' },
        { roll: '44', line: '3', stat: 'CRIT DMG', tone: 'good' },
        { roll: '41', line: '2', stat: 'CRIT RATE', tone: 'good' },
      ];
    }

    if (isLevelTwo) {
      return [
        { roll: '42', line: '2', stat: 'CRIT RATE', tone: 'good' },
        { roll: '44', line: '4', stat: 'BREAK EFFECT', tone: 'bad' },
        { roll: '41', line: '1', stat: 'FLAT HP', tone: 'bad' },
      ];
    }

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
  }, [isLevelThree, isLevelTwo, shiftActive]);

  const hasBeginnerClear =
    level === 1 &&
    shiftActive &&
    targetRelic.level >= 15 &&
    (targetRelic.lines.find((line) => line.slot === 1)?.hits || 0) >= 2 &&
    (targetRelic.lines.find((line) => line.slot === 2)?.hits || 0) >= 2;

  const hasLevelTwoClear =
    isLevelTwo &&
    targetRelic.level >= 15 &&
    (targetRelic.lines.find((line) => line.slot === 2)?.hits || 0) >= 2 &&
    (targetRelic.lines.find((line) => line.slot === 3)?.hits || 0) >= 2;

  const hasLevelThreeClear =
    isLevelThree &&
    targetRelic.level >= 15 &&
    (targetRelic.lines.find((line) => line.slot === 3)?.hits || 0) >= 4;

  useEffect(() => {
    if (!hasBeginnerClear) return;
    const timer = setTimeout(() => navigate('/tutorial/level-2'), 1200);
    return () => clearTimeout(timer);
  }, [hasBeginnerClear, navigate]);

  useEffect(() => {
    if (!hasLevelTwoClear) return;
    const timer = setTimeout(() => navigate('/tutorial/level-3'), 1200);
    return () => clearTimeout(timer);
  }, [hasLevelTwoClear, navigate]);

  const handleTargetAction = () => {
    setTargetRelic((current) => {
      if (!current.hasFourthLine) {
        return {
          ...current,
          level: 3,
          nextLevel: 6,
          hasFourthLine: true,
          lastHit: null,
          lines: [...current.lines, isLevelThree ? LEVEL_THREE_FOURTH_LINE : TARGET_FOURTH_LINE],
        };
      }

      return current;
    });

    if (!targetRelic.hasFourthLine) {
      return;
    }

    let currentIndex = shiftActive ? shiftedStepIndex : directStepIndex;
    let hitSlot;
    let rawPair;
    let recordedRoll;

    if (isLevelThree) {
      if (shiftActive) {
        rawPair = '23';
        hitSlot = 3;
        recordedRoll = '41';
      } else {
        const levelThreeDirectPath = [
          { rawPair: '43', hitSlot: 3, recordedRoll: '43' },
          { rawPair: '34', hitSlot: 4, recordedRoll: '44' },
          { rawPair: '41', hitSlot: 1, recordedRoll: '41' },
          { rawPair: '12', hitSlot: 2, recordedRoll: '42' },
        ];
        const step = levelThreeDirectPath[Math.min(directStepIndex, levelThreeDirectPath.length - 1)];
        rawPair = step.rawPair;
        hitSlot = step.hitSlot;
        recordedRoll = step.recordedRoll;
      }
    } else {
      const activeSequence = isLevelTwo
        ? (shiftActive ? LEVEL_TWO_SHIFTED_LINE_SEQUENCE : LEVEL_TWO_DIRECT_LINE_SEQUENCE)
        : (shiftActive ? SHIFTED_LINE_SEQUENCE : DIRECT_LINE_SEQUENCE);
      hitSlot = activeSequence[Math.min(currentIndex, activeSequence.length - 1)];
      const previousLine = shiftActive ? lastShiftedLine : lastDirectLine;
      rawPair = `${previousLine}${hitSlot}`;
      recordedRoll = isLevelTwo && shiftActive
        ? LEVEL_TWO_VISIBLE_ROLLS[Math.min(currentIndex, LEVEL_TWO_VISIBLE_ROLLS.length - 1)]
        : (translateTo4(rawPair) || '42');
    }
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

    if (isLevelThree && shiftActive) {
      setOneLineSetupRelic({
        forced: false,
        lines: ONE_LINE_SETUP_BASE_LINES,
      });
      setDirectStepIndex((value) => value + 1);
    } else if (isLevelThree) {
      setDirectStepIndex((value) => value + 1);
    } else if (shiftActive) {
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

  const handleForceSecondLine = () => {
    setOneLineSetupRelic((current) => {
      if (current.forced) return current;
      return {
        forced: true,
        lines: current.lines.map((line) =>
          line.slot === 2
            ? { ...line, stat: 'ATK%', state: 'forced' }
            : line
        ),
      };
    });
    setActiveChapter('force-line');
    setLastShiftedLine(2);
    if (!isLevelThree) {
      setShiftedStepIndex(1);
    }
  };

  const handleResetScenario = () => {
    setTargetRelic({
      level: 0,
      nextLevel: 3,
      hasFourthLine: false,
      lines: isLevelThree ? LEVEL_THREE_TARGET_BASE_LINES : (isLevelTwo ? LEVEL_TWO_TARGET_BASE_LINES : TARGET_BASE_LINES),
      lastHit: null,
    });
    setSetupRelic({
      forced: false,
      lines: SETUP_BASE_LINES,
    });
    setOneLineSetupRelic({
      forced: false,
      lines: ONE_LINE_SETUP_BASE_LINES,
    });
    setTutorialRolls(INITIAL_SCRIPTED_ROLLS);
    setHistoryRows(INITIAL_HISTORY_ROWS);
    setDirectStepIndex(0);
    setShiftedStepIndex(0);
    setLastDirectLine(4);
    setLastShiftedLine(isLevelThree ? 2 : 3);
    setActiveChapter(CHAPTERS[0].id);
  };

  return (
    <div ref={containerRef} className={`min-h-screen p-4 md:p-6 lg:p-8 bg-[#0B0F19] text-slate-200 relative overflow-x-hidden ${themeConfig.rootClassName || ''}`}>
      {/* Dynamic Simulation Deck Environment */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[1000px] w-[1000px] rounded-full bg-violet-600/10 blur-[150px] mix-blend-screen"></div>
        <div className="absolute right-[-10%] top-[40%] h-[800px] w-[800px] rounded-full bg-cyan-600/15 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] left-[20%] h-[900px] w-[900px] rounded-full bg-rose-600/5 blur-[180px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[#0B0F19]/20 backdrop-brightness-50"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      <div className="mx-auto w-full max-w-[1900px] relative z-10 flex flex-col gap-6">
        
        {/* --- TACTICAL HEADER --- */}
        <header className="gsap-fade-up flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-xl">
               <span className="text-2xl font-black text-cyan-400">S</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 font-black uppercase tracking-[0.3em] text-[10px] text-violet-400">
                <span className="flex h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                Deck Level {level}
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white md:text-4xl">
                Tactical <span className="text-cyan-400">Command Center</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-1 flex items-center gap-1 backdrop-blur-xl shadow-inner">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => navigate(`/tutorial/level-${num}`)}
                  className={`min-w-[44px] py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${level === num ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  0{num}
                </button>
              ))}
            </div>
            <button
               onClick={() => navigate('/live')}
               className="group flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-rose-300 transition-all hover:bg-rose-500/10 backdrop-blur-md hover:border-rose-500/40"
            >
              Exit Simulation <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </header>

        {/* --- MAIN 3-5-4 TACTICAL GRID --- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mt-2 items-start">
          
          {/* COLUMN 1: Mission Logistics (col-span-3) */}
          <aside className="flex flex-col gap-6 lg:col-span-3 lg:sticky lg:top-8">
            <div className="gsap-slide-right relative rounded-[2rem] border border-white/5 bg-slate-950/50 p-6 backdrop-blur-3xl shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                  <div className="h-1 w-4 bg-cyan-400 rounded-full" />
                  Mission Timeline
                </div>
                <div className="text-[9px] font-black text-cyan-400/60 uppercase">Live_State</div>
              </div>
              
              <nav className="flex flex-col gap-3">
                {CHAPTERS.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveChapter(entry.id)}
                    className={`group relative overflow-hidden rounded-2xl border px-6 py-5 text-left transition-all duration-500 ${activeChapter === entry.id
                      ? 'border-cyan-400/40 bg-cyan-400/5 ring-1 ring-cyan-400/20 shadow-[0_4px_30px_rgba(34,211,238,0.1)]'
                      : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/5'
                      }`}
                  >
                    <div className="relative z-10">
                      <div className={`text-[9px] font-black uppercase tracking-[0.25em] mb-1.5 transition-colors ${activeChapter === entry.id ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-500'}`}>{entry.label}</div>
                      <div className={`text-sm font-black uppercase tracking-widest transition-colors ${activeChapter === entry.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{entry.title}</div>
                    </div>
                    {activeChapter === entry.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
                    )}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 shadow-inner">
                      <BookOpen className="h-4 w-4 text-violet-400" />
                   </div>
                   <div className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">Coach Intelligence</div>
                </div>
                <div className="relative rounded-[1.5rem] border border-violet-500/15 bg-violet-500/5 p-5 italic shadow-inner overflow-hidden">
                   <div className="absolute top-[-50%] right-[-50%] h-40 w-40 rounded-full bg-violet-500/10 blur-[40px]" />
                   <p className="relative z-10 text-[13px] leading-relaxed text-slate-300/90 font-medium">
                      "{chapter.coach}"
                   </p>
                </div>
              </div>
            </div>
          </aside>

          {/* COLUMN 2: Sensor Array - Intelligence (col-span-5) */}
          <section className="flex flex-col gap-6 lg:col-span-5">
            
            {/* Primary Analysis Module (Predictor) */}
            <div id="svarog-feed-focus" className="gsap-scale-in relative rounded-[2.5rem] border border-white/5 bg-slate-950/40 p-8 backdrop-blur-3xl shadow-2xl transition-all duration-700">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                      <Clock3 className="h-5 w-5 text-orange-400" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Svarog Sensor Feed</h3>
                     <div className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live_Prediction_Stream</div>
                   </div>
                </div>
                <div className="flex items-center gap-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5">
                   <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                   <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest leading-none">Healthy Signal</span>
                </div>
              </div>
              
              <div className="transform transition-all duration-700 hover:scale-[1.01] origin-top mb-10 p-4 bg-black/20 rounded-[2rem] border border-white/5 shadow-inner">
                <ModernPairPredictorCard entries={scriptedEntries} region="America" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-inner backdrop-blur-md">
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Algorithm Status</div>
                  <div className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <span className="text-cyan-400">SYNCED</span> / V4.1.1
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 shadow-inner backdrop-blur-md">
                   <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Seed Sample</div>
                   <div className="text-xs font-black tracking-[0.3em] text-slate-400 truncate">
                      {tutorialRolls.join(' ')}
                   </div>
                </div>
              </div>

              {/* Data Flow Indicator Line pointing to Interaction Bay */}
              <div className="hidden xl:block absolute right-[-2.5rem] top-1/2 -translate-y-1/2 w-10 h-px bg-gradient-to-r from-cyan-400/50 to-transparent z-0"></div>
            </div>

            {/* Decryption Module (Map) */}
            <div id="teaching-map-focus" className="gsap-scale-in relative rounded-[2.5rem] border border-white/5 bg-slate-950/40 p-8 backdrop-blur-3xl shadow-2xl transition-all duration-700">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                     <Wand2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Decryption Map</h3>
                    <div className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Common_Pair_Translation</div>
                  </div>
               </div>

               <div className="grid gap-3">
                 {mappingRows.map((row) => (
                   <div
                     key={row.roll}
                     className={`flex items-center justify-between rounded-2xl border px-6 py-4 transition-all duration-300 shadow-sm ${row.tone === 'good'
                       ? 'border-emerald-500/20 bg-emerald-500/5'
                       : 'border-amber-500/20 bg-amber-500/5'
                       }`}
                   >
                     <div className="flex h-10 w-14 items-center justify-center rounded-xl bg-black/40 border border-white/10 text-[13px] font-black text-white shadow-inner">{row.roll}</div>
                     <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-4">IO_SYNC {row.line}</div>
                     <div className={`text-[13px] font-black uppercase tracking-[0.1em] ${row.tone === 'good' ? 'text-emerald-300' : 'text-amber-300'}`}>
                       {row.stat}
                     </div>
                   </div>
                 ))}
               </div>

               <div className="mt-8 pt-8 border-t border-white/5 overflow-hidden">
                  <div className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-400/60 mb-4">Command Terminal Output</div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 shadow-inner group">
                     <p className="text-[13px] leading-relaxed text-slate-300 font-medium tracking-wide">
                        {shiftActive
                          ? (isLevelThree
                            ? '> L2_OVERRIDE EQUIPPED. STABILIZING SPD_LOOP AT ROLL 41.'
                            : '> DETOUR_PROTOCOL_ENGAGED. CAESAR_SYNC TO CRIT_LANE.')
                          : (isLevelThree
                            ? '> RAW_READ: 43. SYSTEM DRIFT DETECTED IN SEED-SPACE.'
                            : '> DIRECT_PATH WARNING: L3_DRIFT INTO RESISTANCE.')}
                     </p>
                  </div>
               </div>
            </div>
          </section>

          {/* COLUMN 3: Interaction Bay - Actions (col-span-4) */}
          <section className="flex flex-col gap-6 lg:col-span-4">
            
            <div className="flex items-center gap-3 mb-2 px-2">
               <div className="h-6 w-1 bg-violet-400 rounded-full" />
               <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Interaction Bay</h3>
            </div>

            {/* Target Relic (Compact) */}
            <div id="target-relic-focus" className="gsap-scale-in transition-all duration-700">
              <TargetRelicCard
                relic={targetRelic}
                title={isLevelThree ? 'Mono SPD Target' : (isLevelTwo ? 'Dual Crit Target' : 'Target Item')}
                mainStat={isLevelThree ? 'HP%' : (isLevelTwo ? 'ATK%' : 'CRIT RATE')}
                targetRead={targetRelic.lines[targetRelic.lines.length-1]?.stat === 'EFF RES' ? 'Junk Alert: EFF RES is the drift point.' : 'Targeting Crit side.'}
                onTargetAction={handleTargetAction}
                onReset={handleResetScenario}
                compact={true}
                successBanner={
                  hasBeginnerClear
                    ? 'Dual Crit Clear - Level 2 Unlocked'
                    : hasLevelTwoClear
                      ? 'Dual Crit Clear - Level 3 Unlocked'
                      : hasLevelThreeClear
                        ? 'Mono SPD Complete'
                        : null
                }
              />
            </div>

            {/* Setup Relic (Compact) */}
            <div id="setup-relic-focus" className="gsap-scale-in transition-all duration-700">
              <div className="h-full flex flex-col justify-start">
                {level === 1 && (
                  <SetupRelicCard
                    setupRelic={setupRelic}
                    shiftActive={shiftActive}
                    onForceThirdLine={handleForceThirdLine}
                    compact={true}
                  />
                )}
                {(isLevelTwo || isLevelThree) && (
                  <SetupRelicCard
                    compact={true}
                    setupRelic={oneLineSetupRelic}
                    shiftActive={oneLineSetupRelic.forced}
                    onForceThirdLine={handleForceSecondLine}
                    title={isLevelThree ? 'Re-force line 2' : 'Force line 2 detour'}
                    badgeLabel="Mini reset"
                    modeLabel="1st -> 2nd force"
                    forcedLabel="Detour Active"
                    buttonLabel="Engage Overdrive"
                    lessonTitle="Detour Lesson"
                  />
                )}
              </div>
            </div>

            {/* Action Footer (Utility) */}
            <div className="gsap-fade-up rounded-[2rem] border border-white/5 bg-slate-950/40 p-6 backdrop-blur-3xl shadow-2xl flex flex-col gap-4">
               <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-2">Sim Status Log</div>
               <div className="space-y-3">
                  {historyRows.slice(-3).map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                       <span className="text-slate-500 uppercase tracking-tighter">{row.time}</span>
                       <span className="text-slate-300 truncate max-w-[150px]">{row.note}</span>
                       <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-cyan-400">{row.roll}</span>
                    </div>
                  ))}
               </div>
            </div>
            
          </section>

        </div>
      </div>
      
      {/* Global Optimization Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .pulse-cyan {
          box-shadow: 0 0 50px rgba(6, 182, 212, 0.35);
          border-color: rgba(6, 182, 212, 0.6) !important;
          transform: scale(1.02);
          z-index: 50;
        }
        .pulse-violet {
          box-shadow: 0 0 50px rgba(139, 92, 246, 0.35);
          border-color: rgba(139, 92, 246, 0.6) !important;
          transform: scale(1.02);
          z-index: 50;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}
