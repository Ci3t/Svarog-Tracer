
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Info, Radar, RefreshCw, Sparkles, Target } from 'lucide-react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import relicSets from '../data/relics.json';
import { getTutorialLevelConfig, TUTORIAL_LEVELS } from '../data/tutorialLevelConfigs';
import { activateRelicLine, createRelicLine, formatStatValue, getMainStatDisplay } from '../utils/relicScoring';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';

const LINE_STYLE = {
  1: { chip: 'border-amber-400/30 bg-amber-500/10 text-amber-100', ring: 'ring-amber-400/35' },
  2: { chip: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100', ring: 'ring-cyan-400/35' },
  3: { chip: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100', ring: 'ring-emerald-400/35' },
  4: { chip: 'border-violet-400/30 bg-violet-500/10 text-violet-100', ring: 'ring-violet-400/35' },
};

const STAGE_SEQUENCES = {
  5: [
    { slot: 1, raw: '41', translated: '41', note: 'Raw 41 landed on line 1 and paid out CRIT RATE.' },
    { slot: 3, raw: '13', translated: '42', note: 'Raw 13 landed on line 3. In the 4x view that becomes 42, so CRIT DMG still belongs to the calm commons lane.' },
    { slot: 3, raw: '13', translated: '42', note: 'Another raw 13 translated into visible 42 and returned to CRIT DMG.' },
    { slot: 3, raw: '13', translated: '42', note: 'The calm route kept returning to the same translated 42 side, so the relic stayed safe.' },
  ],
  6: [
    { slot: 1, raw: '41', translated: '41', note: 'The clean start still opens on raw 41 into CRIT RATE.' },
    { slot: 3, raw: '13', translated: '42', note: 'Raw 13 follows and translates into visible 42 on CRIT DMG.' },
    { slot: 2, raw: '32', translated: '43', note: 'Then raw 32 appears. That translates into visible 43 and breaks the route into FLAT HP.' },
    { slot: 3, raw: '13', translated: '42', note: 'The calm lane can return after the break, but the board was not safe the whole time.' },
  ],
  8: [
    { slot: 1, raw: '41', translated: '41', note: 'The calm board opens on raw 41 and lands cleanly on CRIT RATE.' },
    { slot: 2, raw: '13', translated: '42', note: 'Then raw 13 translates into visible 42 and lands on SPD. Same calm lane, no outsider pressure.' },
  ],
  9: [
    { slot: 4, raw: '44', translated: '44', note: 'Svarog Eye and Main Predictor both agree on the fresh 44 push here.' },
    { slot: 1, raw: '41', translated: '41', note: 'The follow-up stays readable because both tools were already pointing the same way.' },
  ],
  10: [
    { slot: 4, raw: '44', translated: '44', note: 'Svarog Eye leans into the fresh 44 pressure first.' },
    { slot: 3, raw: '43', translated: '43', note: 'The next hit follows 43, not the older 42 lane. This is what the split read was warning about.' },
  ],
  11: [
    { slot: 2, raw: '13', translated: '42', note: 'The board still looked usable at first because the commons lane was returning cleanly.' },
    { slot: 4, raw: '44', translated: '44', note: 'Then break danger becomes real: the outsider 44 is strong enough to matter before the hit lands.' },
  ],
  12: [
    { slot: 2, raw: '24', translated: '42', note: 'The older lane still has visible share, so the board does not look broken yet.' },
    { slot: 3, raw: '43', translated: '43', note: 'A fresh 43 push appears. Trends are what tell you this is a new move, not just noise.' },
    { slot: 4, raw: '44', translated: '44', note: 'Then 44 strengthens. Share, trust, and freshness together tell the real story of the shift.' },
  ],
  13: [
    { slot: 1, raw: '41', translated: '41', note: 'The guided solve opens on raw 41 and lands cleanly on CRIT RATE.' },
    { slot: 3, raw: '13', translated: '42', note: 'Raw 13 translates into visible 42 and lands on CRIT DMG.' },
    { slot: 1, raw: '41', translated: '41', note: 'The pair returns to 41 cleanly, with no drift into noise.' },
    { slot: 3, raw: '13', translated: '42', note: 'Then 42 returns again through raw 13. This is the stable loop you want to recognize.' },
    { slot: 3, raw: '13', translated: '42', note: 'The guided solve finishes on the same safe lane. No outsider ever stole the route.' },
  ],
  14: [
    { slot: 2, raw: '24', translated: '42', note: 'Now the warning side turns into visible 42. This is the hit Clara wants you to notice before moving on: the route is no longer calm, and the board was warning you first.' },
  ],
};

const TUTORIAL_PREDICTOR_IDS = {
  warningStripId: 'tutorial-predictor-warning',
  statusMessageId: 'tutorial-predictor-status',
  noiseRiskId: 'tutorial-predictor-noise-risk',
  breakPressureId: 'tutorial-predictor-break-pressure',
  mainPredictorId: 'tutorial-predictor-main',
  svarogEyeId: 'tutorial-predictor-eye',
  watchMessageId: 'tutorial-predictor-watch',
  commonsNoiseId: 'tutorial-predictor-commons-noise',
  advancedMethodId: 'tutorial-predictor-advanced-method',
  advancedTrendsId: 'tutorial-predictor-advanced-trends',
  advancedSequenceId: 'tutorial-predictor-advanced-sequence',
};

function buildPredictorEntries(rolls = []) {
  return rolls.map((roll, index) => ({
    id: `tutorial-roll-${index}`,
    raw: roll,
    translated: translateTo4(roll) || roll,
    s2: roll,
    time: `2026-04-09T12:${String(10 + index).padStart(2, '0')}:00`,
  }));
}

function findRelicSet(setId) {
  return relicSets.find((entry) => entry.id === setId) || relicSets[0];
}

function buildTargetRelic(levelConfig) {
  const setMeta = findRelicSet(levelConfig.relicSetId);
  const rawLines = levelConfig.relic?.lines || [];
  const baseLines = rawLines.slice(0, 3).map((line) => ({ ...createRelicLine(line.slot, line.stat, { active: true }), tone: line.tone || 'neutral' }));
  const fourthSource = rawLines[3];
  const fourthLine = fourthSource
    ? { ...createRelicLine(fourthSource.slot, fourthSource.stat, { active: !fourthSource.locked }), tone: fourthSource.tone || 'neutral', locked: Boolean(fourthSource.locked) }
    : null;

  return {
    setName: setMeta.name,
    setImage: setMeta.image,
    pieceLabel: levelConfig.relic?.piece || 'Relic',
    mainStat: levelConfig.relic?.mainStat || 'HP%',
    level: fourthLine?.locked ? 0 : 3,
    lines: baseLines,
    fourthLine,
    hasFourthLine: Boolean(fourthLine && !fourthLine.locked),
  };
}

function buildForceRelic(levelConfig) {
  if (!levelConfig.setupRelic) return null;
  const setMeta = findRelicSet('messenger-traversing-hackerspace');
  return {
    setName: setMeta.name,
    setImage: setMeta.image,
    pieceLabel: levelConfig.setupRelic.piece || 'Force Relic',
    forcedLine: 3,
    isPrimed: false,
    lines: (levelConfig.setupRelic.lines || []).map((line) => ({ ...createRelicLine(line.slot, line.stat, { active: true }), tone: line.tone || 'neutral' })),
  };
}

function createStageState(levelConfig) {
  const baseRelic = buildTargetRelic(levelConfig);
  return {
    targetRelic: baseRelic,
    forceRelic: buildForceRelic(levelConfig),
    currentLine: baseRelic.hasFourthLine ? 4 : 3,
    currentString: '--',
    currentRawRoll: '--',
    currentTranslatedRoll: '--',
    eventLog: ['Clara is keeping this stage focused on one idea at a time.'],
    recentHits: [],
    sequenceIndex: 0,
    stageComplete: false,
    sessionRolls: [...(levelConfig.sampleRolls || [])],
  };
}

function appendHit(relic, slot, nextLevel) {
  const applyToLine = (line) => {
    if (!line) return line;
    if (line.slot !== slot) return { ...line, justHit: false };
    const activated = activateRelicLine(line);
    return { ...activated, hits: Number(line.hits || 0) + 1, justHit: true };
  };

  return {
    ...relic,
    level: nextLevel,
    lines: relic.lines.map(applyToLine),
    fourthLine: relic.fourthLine ? applyToLine(relic.fourthLine) : relic.fourthLine,
  };
}

function applyProgressionStep(current, step) {
  const nextLevel = Math.min(current.targetRelic.level + 3, 15);
  const rawRoll = step.raw || step.roll || '--';
  const translatedRoll = step.translated || translateTo4(rawRoll) || step.roll || rawRoll;
  const preparedRelic = current.targetRelic.hasFourthLine
    ? current.targetRelic
    : {
      ...current.targetRelic,
      hasFourthLine: true,
      fourthLine: current.targetRelic.fourthLine ? { ...activateRelicLine(current.targetRelic.fourthLine), locked: false } : null,
    };
  const visibleLines = preparedRelic.lines.concat(preparedRelic.fourthLine ? [preparedRelic.fourthLine] : []);
  const hitLine = visibleLines.find((line) => line?.slot === step.slot);

  return {
    ...current,
    currentLine: step.slot,
    currentRawRoll: rawRoll,
    currentTranslatedRoll: translatedRoll,
    currentString: translatedRoll,
    targetRelic: appendHit(preparedRelic, step.slot, nextLevel),
    recentHits: [...current.recentHits, { raw: rawRoll, translated: translatedRoll, result: hitLine?.stat || `Line ${step.slot}` }],
    eventLog: [...current.eventLog, step.note],
    sequenceIndex: current.sequenceIndex + 1,
    sessionRolls: [...current.sessionRolls, rawRoll],
  };
}
function TutorialRelicCard({ relic, currentLine, currentString, currentRawRoll, currentTranslatedRoll, showRawRead, title, actionLabel, onAction, onReset, disabled }) {
  const visibleLines = relic.hasFourthLine && relic.fourthLine ? [...relic.lines, relic.fourthLine] : relic.lines;
  const mainStatDisplay = getMainStatDisplay(relic.mainStat, relic.level);

  return (
    <article data-tutorial="target" className="group relative mt-16 rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-1 shadow-2xl">
      <div className="absolute -top-16 left-1/2 z-20 h-32 w-32 -translate-x-1/2 transform">
        <div className="absolute inset-0 bg-cyan-500/10 blur-3xl opacity-70" />
        {relic.setImage ? <img src={relic.setImage} alt={relic.setName} className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" /> : null}
      </div>

      <div className="rounded-[1.4rem] border border-white/5 bg-slate-950/75 p-4 pt-12 backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-400/60">{title}</div>
            <h2 className="text-sm font-black uppercase tracking-tight text-white/90">{relic.pieceLabel}</h2>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/40 px-2.5 py-1 text-[9px] font-black text-white/70">+{relic.level}</div>
        </div>

        <div className="mb-4 text-center text-[7px] font-black uppercase tracking-[0.4em] text-slate-600">{relic.setName}</div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-4 py-2">
          <div>
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Main stat</div>
            <div className="text-[11px] font-black uppercase tracking-wide text-white">{mainStatDisplay.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-white/90">{mainStatDisplay.display}</div>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Current line</div>
            <div className="mt-1 text-sm font-black text-white">{currentLine}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">{showRawRead ? 'Raw roll' : 'Visible roll'}</div>
            <div className="mt-1 text-sm font-black text-white">{showRawRead ? currentRawRoll : currentTranslatedRoll}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">{showRawRead ? '4x read' : 'String read'}</div>
            <div className="mt-1 text-sm font-black text-white">{showRawRead ? currentTranslatedRoll : currentString}</div>
          </div>
        </div>

        <div className="space-y-1.5">
          {visibleLines.map((line) => {
            const style = LINE_STYLE[line.slot];
            const isActive = currentLine === line.slot;
            return (
              <div key={`${title}-${line.slot}`} className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${isActive ? `border-white/12 bg-black/40 ring-1 ${style.ring}` : 'border-white/5 bg-black/30'}`}>
                <div className="relative z-10 flex h-10 items-center justify-between px-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[8px] font-black ${style.chip}`}>{line.slot}</div>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-tight ${line.locked ? 'text-slate-600' : 'text-white'}`}>{line.stat}</span>
                      <span className="text-[9px] font-mono text-slate-500">{line.locked ? 'Locked until +3' : formatStatValue(line.stat, line.value)}</span>
                    </div>
                  </div>
                  <div className={`flex min-w-[32px] items-center justify-center rounded-lg px-1.5 text-xs font-black ${line.locked ? 'bg-white/5 text-slate-700' : 'bg-white/5 text-white/80'}`}>x{line.hits || 0}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {actionLabel ? (
            <button type="button" onClick={onAction} onFocus={(event) => event.currentTarget.blur()} disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-50">
              {actionLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}
          <button type="button" onClick={onReset} onFocus={(event) => event.currentTarget.blur()} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-300">
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </article>
  );
}

function TutorialForceRelicCard({ relic, actionLabel, onAction, onReset, disabled }) {
  if (!relic) return null;

  return (
    <article data-tutorial="force" className="group relative mt-16 rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-1 shadow-2xl">
      <div className="absolute -top-16 left-1/2 z-20 h-32 w-32 -translate-x-1/2 transform">
        <div className="absolute inset-0 bg-amber-500/10 blur-3xl opacity-70" />
        {relic.setImage ? <img src={relic.setImage} alt={relic.setName} className="relative z-10 h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" /> : null}
      </div>

      <div className="rounded-[1.4rem] border border-white/5 bg-slate-950/75 p-4 pt-12 backdrop-blur-3xl">
        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400/60">Force relic</div>
            <h2 className="text-sm font-black uppercase tracking-tight text-white/90">{relic.pieceLabel}</h2>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/40 px-2.5 py-1 text-[9px] font-black text-amber-200">{relic.isPrimed ? `Line ${relic.forcedLine}` : `Force ${relic.forcedLine}`}</div>
        </div>

        <div className="mb-4 rounded-xl border border-white/5 bg-black/40 px-4 py-2">
          <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Status</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-wide text-white">{relic.isPrimed ? `Sitting on line ${relic.forcedLine}` : `Need to add line ${relic.forcedLine}`}</div>
        </div>

        <div className="space-y-1.5">
          {relic.lines.map((line) => {
            const style = LINE_STYLE[line.slot];
            const active = relic.forcedLine === line.slot;
            return (
              <div key={`force-${line.slot}`} className={`rounded-xl border px-3 py-3 ${active ? `border-white/12 bg-black/40 ring-1 ${style.ring}` : 'border-white/5 bg-black/30'}`}>
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[8px] font-black ${style.chip}`}>{line.slot}</div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-white">{line.stat}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {actionLabel ? (
            <button type="button" onClick={onAction} onFocus={(event) => event.currentTarget.blur()} disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-500/18 disabled:cursor-not-allowed disabled:opacity-50">
              {actionLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}
          <button type="button" onClick={onReset} onFocus={(event) => event.currentTarget.blur()} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500 transition-all hover:bg-rose-500/10 hover:text-rose-300">
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </article>
  );
}
function ClaraCard({ round, roundIndex, roundCount }) {
  return (
    <section data-tutorial="clara" className="rounded-xl border border-white/10 bg-[#101520] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Clara explains</div>
      <h3 className="mt-2 text-lg font-semibold text-white">{round.title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{round.body}</p>
      <div className="mt-4 rounded-lg border border-white/8 bg-black/20 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Keep in mind</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{round.hint}</p>
      </div>
      <div className="mt-4 text-xs text-slate-500">Step {roundIndex + 1} of {roundCount}</div>
    </section>
  );
}

function EventLogCard({ recentHits, eventLog }) {
  return (
    <section data-tutorial="log" className="rounded-xl border border-white/10 bg-[#101520] p-5">
      <div className="flex items-center gap-2">
        <Radar className="h-4 w-4 text-cyan-200" />
        <h3 className="text-base font-semibold text-white">What just happened</h3>
      </div>
      {recentHits.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {recentHits.slice(-4).map((hit, index) => (
            <div key={`${hit.raw || hit.roll}-${hit.translated || ''}-${hit.result}-${index}`} className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm text-slate-200">
              <span className="font-semibold text-white">{hit.raw || hit.roll}</span>
              {hit.translated && hit.translated !== (hit.raw || hit.roll) ? (
                <>
                  <span className="mx-2 text-slate-500">-&gt;</span>
                  <span className="font-semibold text-cyan-200">{hit.translated}</span>
                </>
              ) : null}
              <span className="mx-2 text-slate-500">-&gt;</span>
              <span>{hit.result}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 space-y-3">
        {eventLog.slice(-4).map((entry, index) => (
          <div key={`${entry}-${index}`} className="rounded-lg border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300">{entry}</div>
        ))}
      </div>
    </section>
  );
}

function NavigationCard({ levelConfig, round, stageComplete, onContinue }) {
  const actionText = round?.actionLabel
    ? `Do this now: ${round.actionLabel}.`
    : stageComplete
      ? 'This step is done. Move to the next lesson when you are ready.'
      : 'Read the board and Clara guide first, then continue.';

  return (
    <section data-tutorial="nav" className="rounded-xl border border-white/10 bg-[#101520] p-5">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-amber-200" />
        <h3 className="text-base font-semibold text-white">Current goal</h3>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{actionText}</p>
      <div className="mt-4 rounded-lg border border-white/8 bg-black/20 px-4 py-3 text-sm text-slate-300">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Stage summary</div>
        <p className="mt-2 leading-6">{levelConfig.subtitle}</p>
      </div>
      <button type="button" onClick={onContinue} disabled={!stageComplete && Boolean(round.actionKey)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50">
        {stageComplete ? (levelConfig.nextRoute === '/playground' ? 'Finish tutorial' : 'Next stage') : 'Continue lesson'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function getDefaultTourTarget(levelConfig, round, roundPosition, roundCount) {
  if (roundPosition === roundCount - 1) return '[data-tutorial="nav"]';
  if (round.actionKey === 'stage4-force-line') return '[data-tutorial="force"]';
  if (levelConfig.id >= 5) {
    if (round.actionKey) return '[data-tutorial="workspace"]';
    if (levelConfig.id === 7) return '[data-tutorial="board"]';
    if (levelConfig.id === 11 || levelConfig.id === 12) return '[data-tutorial="board"]';
    if (roundPosition === 0) return '[data-tutorial="board"]';
    return '[data-tutorial="board"]';
  }
  if (round.actionKey) return '[data-tutorial="target"]';
  return '[data-tutorial="overview"]';
}

function TutorialTourOverlay({ steps, currentStep, stageReady, onBack, onNext, onClose }) {
  const [rect, setRect] = useState(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!step?.target) return undefined;

    const update = () => {
      const element = document.querySelector(step.target);
      if (!element) {
        setRect(null);
        return;
      }
      const nextRect = element.getBoundingClientRect();
      setRect(nextRect);
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  if (!step || !rect) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = 420;
  const cardHeight = 280;
  const gap = 20;
  const spotlightPadding = 10;

  const spotlightTop = Math.max(rect.top - spotlightPadding, 0);
  const spotlightLeft = Math.max(rect.left - spotlightPadding, 0);
  const spotlightWidth = Math.min(rect.width + spotlightPadding * 2, viewportWidth - spotlightLeft);
  const spotlightHeight = Math.min(rect.height + spotlightPadding * 2, viewportHeight - spotlightTop);

  let top = rect.top;
  let left = rect.right + gap;

  if (step.placement === 'left') {
    left = rect.left - cardWidth - gap;
  } else if (step.placement === 'bottom') {
    left = rect.left + (rect.width / 2) - (cardWidth / 2);
    top = rect.bottom + gap;
  } else if (step.placement === 'top') {
    left = rect.left + (rect.width / 2) - (cardWidth / 2);
    top = rect.top - cardHeight - gap;
  }

  left = Math.min(Math.max(left, 20), viewportWidth - cardWidth - 20);
  top = Math.min(Math.max(top, 20), viewportHeight - cardHeight - 20);

  const requiresAction = Boolean(step.requiresActionType);
  const nextDisabled = requiresAction && !stageReady;
  const claraImage = withBaseUrl('clara-prof-assistant.png');

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none">
      <div
        className="absolute left-0 top-0 bg-black/68"
        style={{ width: '100%', height: spotlightTop }}
      />
      <div
        className="absolute left-0 bg-black/68"
        style={{ top: spotlightTop, width: spotlightLeft, height: spotlightHeight }}
      />
      <div
        className="absolute right-0 bg-black/68"
        style={{
          top: spotlightTop,
          left: spotlightLeft + spotlightWidth,
          width: Math.max(viewportWidth - (spotlightLeft + spotlightWidth), 0),
          height: spotlightHeight,
        }}
      />
      <div
        className="absolute left-0 bg-black/68"
        style={{ top: spotlightTop + spotlightHeight, width: '100%', height: Math.max(viewportHeight - (spotlightTop + spotlightHeight), 0) }}
      />
      <div
        className="absolute rounded-[2rem] border border-cyan-400/35 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightWidth,
          height: spotlightHeight,
        }}
      />
      <div
        className="absolute w-[420px] rounded-[1.75rem] border border-white/10 bg-[#0d121c]/96 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)] pointer-events-auto"
        style={{ top, left }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Clara guide
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              {step.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:text-white"
          >
            Hide
          </button>
        </div>

        <div className="mt-5 flex items-end gap-4">
          <img
            src={claraImage}
            alt="Clara guide"
            className="h-28 w-24 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
          />
          <div className="relative flex-1 rounded-[1.25rem] border border-cyan-400/20 bg-cyan-500/8 px-4 py-3 text-sm leading-7 text-slate-200">
            <div className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-l border-b border-cyan-400/20 bg-[#122031]" />
            {step.body}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Keep in mind
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{step.hint}</p>
        </div>

        {requiresAction && !stageReady ? (
          <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-500/8 px-4 py-3 text-xs leading-6 text-cyan-100">
            Use the highlighted control first. Clara will advance once that step is complete.
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            {currentStep + 1}/{steps.length}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStep === 0}
              className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition-colors hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {currentStep === steps.length - 1 ? 'Finish guide' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function preserveScrollPosition() {
  if (typeof window === 'undefined') return;
  const top = window.scrollY;
  requestAnimationFrame(() => {
    window.scrollTo({ top, left: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
      window.scrollTo({ top, left: 0, behavior: 'auto' });
    });
  });
}

export default function TutorialPage({ sessionTheme = 'modern', level = 1 }) {
  const navigate = useNavigate();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const levelConfig = useMemo(() => getTutorialLevelConfig(level), [level]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [stageState, setStageState] = useState(() => createStageState(levelConfig));
  const [tourRunning, setTourRunning] = useState(false);
  const [predictorAdvancedOpen, setPredictorAdvancedOpen] = useState(false);

  useEffect(() => {
    setRoundIndex(0);
    setTourStepIndex(0);
    setStageState(createStageState(levelConfig));
    setTourRunning(false);
    setPredictorAdvancedOpen(false);
  }, [levelConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    try {
      window.localStorage.removeItem('svarog-tutorial-tour-v1');
      window.localStorage.removeItem('svarog-tutorial-tour-v3');
    } catch {
      // ignore storage failures
    }

    const timeoutId = window.setTimeout(() => {
      setTourRunning(true);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [levelConfig.id]);

  const rounds = levelConfig.rounds || [];
  const tutorialTourSteps = useMemo(() => {
    if (levelConfig.tourSteps?.length) {
      return levelConfig.tourSteps.map((step) => ({
        placement: 'right',
        requiresActionType: null,
        ...step,
      }));
    }

    return rounds.map((round, index) => ({
      roundIndex: index,
      target: getDefaultTourTarget(levelConfig, round, index, rounds.length),
      title: round.title,
      body: round.body,
      hint: round.hint,
      placement: levelConfig.id >= 5 ? (round.actionKey ? 'right' : 'left') : 'right',
      requiresActionType: round.actionKey === 'stage4-force-line' ? 'force' : round.actionKey ? 'relic' : null,
    }));
  }, [levelConfig, rounds]);
  const currentTourStep = tutorialTourSteps[Math.min(tourStepIndex, Math.max(tutorialTourSteps.length - 1, 0))];
  const activeRoundIndex = currentTourStep?.roundIndex ?? roundIndex;
  const currentRound = rounds[Math.min(activeRoundIndex, Math.max(0, rounds.length - 1))] || rounds[0];
  const predictorEntries = useMemo(() => buildPredictorEntries(stageState.sessionRolls), [stageState.sessionRolls]);
  const showPredictor = levelConfig.id >= 5;
  const currentTourStepReady = useMemo(() => {
    const actionType = currentTourStep?.requiresActionType;
    if (!actionType) return true;
    if (actionType === 'advanced-open') return predictorAdvancedOpen;
    if (actionType === 'force' || actionType === 'relic') return stageState.stageComplete;
    return true;
  }, [currentTourStep, predictorAdvancedOpen, stageState.stageComplete]);

  const handleContinue = () => {
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const isLastRound = roundIndex >= rounds.length - 1;
    if (isLastRound) {
      navigate(levelConfig.nextRoute);
      return;
    }
    setRoundIndex((value) => Math.min(value + 1, rounds.length - 1));
  };

  const handleReset = () => {
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setRoundIndex(0);
    setStageState(createStageState(levelConfig));
    setTourRunning(false);
    setTimeout(() => setTourRunning(true), 120);
  };

  const handleTargetAction = () => {
    if (!currentRound?.actionKey) return;
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    switch (currentRound.actionKey) {
      case 'stage1-add-fourth':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentRawRoll: '--',
          currentTranslatedRoll: '--',
          targetRelic: {
            ...current.targetRelic,
            level: 3,
            hasFourthLine: true,
            fourthLine: current.targetRelic.fourthLine ? { ...activateRelicLine(current.targetRelic.fourthLine), locked: false } : null,
          },
          eventLog: [...current.eventLog, 'Added the fourth substat slot. You now sit on line 4.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage1-move-line':
        setStageState((current) => ({
          ...current,
          currentLine: 2,
          currentRawRoll: '42',
          currentTranslatedRoll: '42',
          currentString: '42',
          targetRelic: appendHit(current.targetRelic, 2, 6),
          recentHits: [...current.recentHits, { raw: '42', translated: '42', result: 'CRIT RATE' }],
          eventLog: [...current.eventLog, 'From line 4 you landed on line 2, so the read becomes 42.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage2-add-fourth':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentRawRoll: '--',
          currentTranslatedRoll: '--',
          currentString: '4_',
          targetRelic: {
            ...current.targetRelic,
            level: 3,
            hasFourthLine: true,
            fourthLine: current.targetRelic.fourthLine ? { ...activateRelicLine(current.targetRelic.fourthLine), locked: false } : null,
          },
          eventLog: [...current.eventLog, 'The fourth slot is open. Because you are sitting on line 4, the string starts with 4.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage2-move-line':
        setStageState((current) => ({
          ...current,
          currentLine: 2,
          currentRawRoll: '42',
          currentTranslatedRoll: '42',
          currentString: '42',
          targetRelic: appendHit(current.targetRelic, 2, 6),
          recentHits: [...current.recentHits, { raw: '42', translated: '42', result: 'CRIT RATE' }],
          eventLog: [...current.eventLog, '42 means start on line 4, hit line 2.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage3-add-fourth':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentString: '41 / 43',
          currentRawRoll: '--',
          currentTranslatedRoll: '--',
          targetRelic: {
            ...current.targetRelic,
            level: 3,
            hasFourthLine: true,
            fourthLine: current.targetRelic.fourthLine ? { ...activateRelicLine(current.targetRelic.fourthLine), locked: false } : null,
          },
          eventLog: [...current.eventLog, 'Added the fourth line. The commons behind the scene stay 41 and 42, but we only take the first direct hit here.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage3-direct-plus-six':
        setStageState((current) => ({
          ...current,
          currentLine: 1,
          currentRawRoll: '41',
          currentTranslatedRoll: '41',
          currentString: '41 / 43',
          targetRelic: appendHit(current.targetRelic, 1, 6),
          recentHits: [...current.recentHits, { raw: '41', translated: '41', result: 'FLAT ATK' }],
          eventLog: [...current.eventLog, 'Direct +6 used 41 first and landed on line 1. On this relic that means FLAT ATK, which is why the route still matters.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage4-forced-plus-six':
        setStageState((current) => ({
          ...current,
          currentLine: 2,
          currentRawRoll: '41',
          currentTranslatedRoll: '41',
          currentString: '41 / 42',
          targetRelic: appendHit(current.targetRelic, 2, 6),
          recentHits: [...current.recentHits, { raw: '41', translated: '41', result: 'CRIT RATE' }],
          eventLog: [...current.eventLog, 'With line 3 primed first, the same 41 now lands on line 2 and gives you CRIT RATE.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage4-forced-plus-nine':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentRawRoll: '43',
          currentTranslatedRoll: '43',
          currentString: '41 / 42',
          targetRelic: appendHit(current.targetRelic, 4, 9),
          recentHits: [...current.recentHits, { raw: '43', translated: '43', result: 'CRIT DMG' }],
          eventLog: [...current.eventLog, 'Then 43 follows and lands on line 4. This time the same pair finishes as CRIT DMG instead of trash.'],
          stageComplete: true,
        }));
        setRoundIndex((value) => value + 1);
        break;
      default: {
        const sequence = STAGE_SEQUENCES[levelConfig.id] || [];
        const step = sequence[stageState.sequenceIndex];
        if (!step) {
          setStageState((current) => ({ ...current, stageComplete: true }));
          setRoundIndex((value) => Math.min(value + 1, rounds.length - 1));
          return;
        }
        setStageState((current) => {
          const next = applyProgressionStep(current, step);
          const finished = next.sequenceIndex >= sequence.length;
          return {
            ...next,
            stageComplete: finished,
            eventLog: finished ? [...next.eventLog, 'This guided sequence is complete. Review the board once more, then continue.'] : next.eventLog,
          };
        });
        break;
      }
    }
  };

  const handleForceAction = () => {
    if (currentRound?.actionKey !== 'stage4-force-line') return;
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStageState((current) => ({
      ...current,
      forceRelic: current.forceRelic ? { ...current.forceRelic, isPrimed: true, forcedLine: 3 } : current.forceRelic,
      currentLine: 3,
      currentRawRoll: '--',
      currentTranslatedRoll: '--',
      currentString: '3x',
      eventLog: [...current.eventLog, 'Force line 3 is primed. You changed the control point before the next target roll.'],
      stageComplete: true,
    }));
    setRoundIndex((value) => value + 1);
  };

  const targetActionLabel = useMemo(() => {
    if (!currentRound?.actionKey || currentRound.actionKey === 'stage4-force-line') return null;
    if (currentRound.actionKey === 'stage5-guided-upgrade') return stageState.sequenceIndex === 0 ? 'Start upgrading relic' : 'Upgrade relic again';
    if (currentRound.actionKey === 'stage6-noise-demo') return stageState.sequenceIndex === 0 ? 'Start relic upgrades' : 'Upgrade relic again';
    if (currentRound.actionKey === 'stage8-calm-hit') return 'Take a calm practice hit';
    if (currentRound.actionKey === 'stage9-eye-practice') return stageState.sequenceIndex === 0 ? 'Practice with Svarog Eye' : 'Continue practice';
    if (currentRound.actionKey === 'stage10-split-demo') return stageState.sequenceIndex === 0 ? 'Run split read practice' : 'Continue split read';
    if (currentRound.actionKey === 'stage11-break-demo') return stageState.sequenceIndex === 0 ? 'Watch break danger' : 'Continue break demo';
    if (currentRound.actionKey === 'stage12-trend-demo') return stageState.sequenceIndex === 0 ? 'Read the trend move' : 'Continue trend demo';
    if (currentRound.actionKey === 'stage13-auto-commons') return stageState.sequenceIndex === 0 ? 'Start guided commons solve' : 'Continue guided solve';
    if (currentRound.actionKey === 'stage14-eye-control') return stageState.sequenceIndex === 0 ? 'Start guided Eye demo' : 'Continue guided solve';
    if (currentRound.actionKey === 'stage15-trend-advantage') return stageState.sequenceIndex === 0 ? 'Start guided trend demo' : 'Continue guided solve';
    return currentRound.actionLabel;
  }, [currentRound, stageState.sequenceIndex]);

  const forceActionLabel = currentRound?.actionKey === 'stage4-force-line' ? 'Prime line 3' : null;
  const closeTour = () => setTourRunning(false);
  const nextTourStep = () => {
    preserveScrollPosition();
    if (!currentTourStepReady) return;
    if (tourStepIndex >= tutorialTourSteps.length - 1) {
      setTourRunning(false);
      return;
    }
    const nextIndex = Math.min(tourStepIndex + 1, tutorialTourSteps.length - 1);
    const nextStep = tutorialTourSteps[nextIndex];
    setTourStepIndex(nextIndex);
    if (typeof nextStep?.roundIndex === 'number') {
      setRoundIndex(nextStep.roundIndex);
    }
  };
  const prevTourStep = () => {
    preserveScrollPosition();
    if (tourStepIndex <= 0) return;
    const prevIndex = Math.max(tourStepIndex - 1, 0);
    const prevStep = tutorialTourSteps[prevIndex];
    setTourStepIndex(prevIndex);
    if (typeof prevStep?.roundIndex === 'number') {
      setRoundIndex(prevStep.roundIndex);
    }
  };

  return (
    <div className={`min-h-screen bg-[#0b1018] px-4 py-6 text-slate-100 [&_button]:cursor-pointer [&_[role='button']]:cursor-pointer md:px-6 lg:px-8 ${themeConfig.rootClassName || ''}`}>
      {tourRunning && tutorialTourSteps.length > 0 ? (
        <TutorialTourOverlay
          steps={tutorialTourSteps}
          currentStep={Math.min(tourStepIndex, tutorialTourSteps.length - 1)}
          stageReady={currentTourStepReady}
          onBack={prevTourStep}
          onNext={nextTourStep}
          onClose={closeTour}
        />
      ) : null}
      <div className="mx-auto max-w-[1580px] space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">{levelConfig.label}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{levelConfig.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{levelConfig.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                preserveScrollPosition();
                setTourStepIndex(0);
                setRoundIndex(tutorialTourSteps[0]?.roundIndex ?? 0);
                setTourRunning(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
            >
              <Info className="h-4 w-4" />
              Clara guide
            </button>
            <button type="button" onClick={() => navigate('/playground')} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-black/30">
              <ArrowLeft className="h-4 w-4" />
              Leave tutorial
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {TUTORIAL_LEVELS.map((entry) => (
            <button key={entry.id} type="button" onClick={() => navigate(entry.route)} className={`rounded-lg border px-3 py-2 text-sm transition ${entry.id === levelConfig.id ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-black/20 text-slate-400 hover:bg-black/30 hover:text-white'}`}>
              {entry.id}
            </button>
          ))}
        </nav>

        <section data-tutorial="overview" className="rounded-xl border border-white/10 bg-[#101520] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">What we are teaching right now</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">{currentRound?.body}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Current focus</div>
              <div className="mt-2 font-medium text-white">{currentRound?.title}</div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <main data-tutorial="workspace" className="space-y-6">
            {showPredictor ? (
              <section data-tutorial="board" className="rounded-xl border border-white/10 bg-[#101520] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  <h2 className="text-base font-semibold text-white">Board read</h2>
                </div>
                <ModernPairPredictorCard
                  entries={predictorEntries}
                  region="America"
                  advancedToggleId="tutorial-predictor-advanced-toggle"
                  advancedPanelId="tutorial-predictor-advanced-panel"
                  tutorialIds={TUTORIAL_PREDICTOR_IDS}
                  onAdvancedToggleChange={setPredictorAdvancedOpen}
                />
              </section>
            ) : null}

            <div className={`grid gap-6 ${stageState.forceRelic ? 'lg:grid-cols-2' : ''}`}>
              <TutorialRelicCard relic={stageState.targetRelic} currentLine={stageState.currentLine} currentString={stageState.currentString} currentRawRoll={stageState.currentRawRoll} currentTranslatedRoll={stageState.currentTranslatedRoll} showRawRead={levelConfig.id >= 5} title="Target relic" actionLabel={targetActionLabel} onAction={handleTargetAction} onReset={handleReset} disabled={false} />
              {stageState.forceRelic ? <TutorialForceRelicCard relic={stageState.forceRelic} actionLabel={forceActionLabel} onAction={handleForceAction} onReset={handleReset} disabled={false} /> : null}
            </div>
          </main>

          <aside className="space-y-6">
            <NavigationCard levelConfig={levelConfig} round={currentRound} stageComplete={stageState.stageComplete} onContinue={handleContinue} />
            <EventLogCard recentHits={stageState.recentHits} eventLog={stageState.eventLog} />
            <section data-tutorial="rule" className="rounded-xl border border-white/10 bg-[#101520] p-5">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-cyan-200" />
                <h3 className="text-base font-semibold text-white">One rule to keep</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{currentRound?.hint}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
