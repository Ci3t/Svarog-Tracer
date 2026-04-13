
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Info, Radar, RefreshCw, Sparkles, Target, Volume2 } from 'lucide-react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';
import relicSets from '../data/relics.json';
import { getTutorialLevelConfig, TUTORIAL_LEVELS } from '../data/tutorialLevelConfigs';
import { activateRelicLine, createRelicLine, formatStatValue, getMainStatDisplay } from '../utils/relicScoring';
import { translateTo4 } from '../utils/stringHelpers';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { resolveGuideClaraAsset, resolvePlaygroundClaraAsset } from '../utils/claraCosmetics';

const TUTORIAL_GUIDE_PROGRESS_KEY = 'svarog_tutorial_guide_progress_v1';

function readTutorialGuideProgress() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TUTORIAL_GUIDE_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeTutorialGuideProgress(nextValue) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TUTORIAL_GUIDE_PROGRESS_KEY, JSON.stringify(nextValue));
  } catch {
    // ignore storage failures
  }
}

function markTutorialGuideStageComplete(stageId) {
  const normalizedId = Math.max(1, Number(stageId || 0) || 0);
  if (!normalizedId) return;
  const current = readTutorialGuideProgress();
  current[normalizedId] = true;
  writeTutorialGuideProgress(current);
}

function getCompletedTutorialGuideStageCount() {
  return Object.values(readTutorialGuideProgress()).filter(Boolean).length;
}

function hasCompletedAllTutorialGuides() {
  return TUTORIAL_LEVELS.every((entry) => Boolean(readTutorialGuideProgress()[entry.id]));
}

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
  ],
  6: [
    { slot: 1, raw: '41', translated: '41', note: 'The clean start still opens on raw 41 into CRIT RATE.' },
    { slot: 3, raw: '13', translated: '42', note: 'Raw 13 follows and translates into visible 42 on CRIT DMG.' },
    { slot: 2, raw: '32', translated: '43', note: 'Then raw 32 appears. That translates into visible 43 and breaks the route into FLAT HP.' },
    { slot: 3, raw: '13', translated: '42', note: 'The calm lane can return after the break, but the board was not safe the whole time.' },
  ],
  8: [
    { slot: 1, raw: '41', translated: '41', note: 'The calm board opens on raw 41 and lands cleanly on CRIT RATE.' },
    { slot: 2, raw: '13', translated: '42', note: 'Then raw 13 translates into visible 42 and lands on SPD. Same calm lane, no noise pressure.' },
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
    { slot: 3, raw: '43', translated: '43', note: 'The noise side lands first. This is the warning hit Clara wants you to connect to break danger.' },
    { slot: 2, raw: '31', translated: '42', note: 'Then the route snaps back into visible 42. The point is not that noise stays forever. The point is that the warning was real before the board calmed down again.' },
  ],
  12: [
    { slot: 4, raw: '44', translated: '44', note: 'The first hit follows the strongest trend pressure and lands on line 4.' },
    { slot: 3, raw: '43', translated: '43', note: 'Then 43 follows right after it. This is the fresh pressure the trends panel is trying to teach.' },
    { slot: 2, raw: '32', translated: '43', note: 'The third hit still reads as visible 43, but it lands on line 2. That is why raw route and trend context both matter.' },
  ],
  13: [
    { slot: 1, raw: '41', translated: '41', note: 'The guided solve opens on raw 41 and lands cleanly on CRIT RATE.' },
    { slot: 3, raw: '13', translated: '42', note: 'Raw 13 translates into visible 42 and lands on CRIT DMG.' },
    { slot: 1, raw: '41', translated: '41', note: 'The pair returns to 41 cleanly, with no drift into noise.' },
    { slot: 3, raw: '13', translated: '42', note: 'Then 42 returns again through raw 13. This is the stable loop you want to recognize.' },
    { slot: 3, raw: '13', translated: '42', note: 'The guided solve finishes on the same safe lane. No noise route ever stole the board.' },
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
    level: typeof levelConfig.relic?.startLevel === 'number' ? levelConfig.relic.startLevel : (fourthLine?.locked ? 0 : 3),
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
    forcedLine: levelConfig.setupRelic.forcedLine || 3,
    isPrimed: false,
    lines: (levelConfig.setupRelic.lines || []).map((line) => ({
      ...createRelicLine(line.slot, line.stat, { active: true }),
      tone: line.tone || 'neutral',
      hidden: Boolean(line.hidden),
    })),
  };
}

function createStageState(levelConfig) {
  const baseRelic = buildTargetRelic(levelConfig);
  return {
    targetRelic: baseRelic,
    forceRelic: buildForceRelic(levelConfig),
    currentLine: levelConfig.relic?.startLine || (baseRelic.hasFourthLine ? 4 : 3),
    currentString: '--',
    currentRawRoll: '--',
    currentTranslatedRoll: '--',
    eventLog: ['Clara is keeping this stage focused on one idea at a time.'],
    recentHits: [],
    sequenceIndex: 0,
    stageComplete: false,
    completedRoundIndex: null,
    sessionRolls: [...(levelConfig.sampleRolls || [])],
  };
}

function isRoundComplete(round, roundIndex, stageState, predictorAdvancedOpen) {
  if (!round) return false;
  if (round.actionKey === 'stage15-open-advanced') return predictorAdvancedOpen;
  if (round.actionKey) return typeof stageState.completedRoundIndex === 'number' && stageState.completedRoundIndex >= roundIndex;
  return true;
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
    <article data-tutorial="target" className="theme-glass-card group relative mt-20 rounded-[2.5rem] p-1 ring-1 ring-white/5 transition-all duration-500">
      {/* Relic Image Floating Header */}
      <div className="absolute -top-16 left-1/2 z-20 h-40 w-40 -translate-x-1/2 transform transition-transform duration-700 group-hover:-translate-y-2 group-hover:scale-105">
        <div className="absolute inset-0 opacity-60 animate-pulse" style={{ background: 'color-mix(in srgb, var(--theme-accent) 16%, transparent)', filter: 'blur(50px)' }} />
        {relic.setImage ? <img src={relic.setImage} alt={relic.setName} className="relative z-10 h-full w-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.9)]" /> : null}
      </div>

      <div className="rounded-[2.4rem] border border-white/5 p-6 pt-16" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-2) 96%, transparent), color-mix(in srgb, var(--theme-surface-3) 98%, transparent))' }}>
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--theme-accent)' }} />
              <span className="theme-text-accent text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">{relic.pieceLabel}</h2>
          </div>
          <div className="relative group/level">
            <div className="absolute -inset-2 bg-white/5 rounded-xl blur opacity-0 group-hover/level:opacity-100 transition-opacity" />
            <div className="theme-subpanel relative rounded-xl px-4 py-2 text-[12px] font-black text-white shadow-inner">
              +{relic.level}
            </div>
          </div>
        </div>

        <div className="theme-subpanel mb-6 flex items-center justify-between rounded-[1.5rem] p-5 shadow-inner transition-colors">
          <div className="space-y-1">
            <div className="theme-text-soft text-[9px] font-black uppercase tracking-widest">Main stat</div>
            <div className="text-[13px] font-black uppercase text-white tracking-wide">{mainStatDisplay.label}</div>
          </div>
          <div className="text-right">
            <div className="theme-text-accent text-xl font-black">{mainStatDisplay.display}</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Line Id', val: currentLine, theme: 'text-white' },
            { label: showRawRead ? 'Raw' : 'Visible', val: showRawRead ? currentRawRoll : currentTranslatedRoll, theme: 'theme-text-accent' },
            { label: showRawRead ? '4x Read' : 'String', val: showRawRead ? currentTranslatedRoll : currentString, theme: 'text-white' }
          ].map((stat, i) => (
            <div key={i} className="theme-subpanel rounded-2xl px-3 py-3 text-center transition-all hover:border-white/10">
              <div className="theme-text-soft mb-1 text-[8px] font-black uppercase tracking-widest">{stat.label}</div>
              <div className={`text-sm font-black ${stat.theme}`}>{stat.val}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="px-2 mb-3 text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <span>Substat Matrix</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          {visibleLines.map((line) => {
            const style = LINE_STYLE[line.slot];
            const isActive = currentLine === line.slot;
            return (
              <div key={`${title}-${line.slot}`} className={`relative group/line overflow-hidden rounded-2xl border transition-all duration-500 ${isActive ? `border-white/15 bg-white/[0.08] ring-1 ${style.ring} shadow-[0_0_20px_rgba(0,0,0,0.4)]` : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                {isActive && (
                  <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 8%, transparent), transparent)' }} />
                )}
                <div className="relative z-10 flex h-12 items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-xl border text-[10px] font-black shadow-inner transition-transform group-hover/line:scale-110 ${style.chip}`}>{line.slot}</div>
                    <div className="flex flex-col justify-center">
                      <span className={`text-[11px] font-black uppercase tracking-tight leading-none ${line.locked ? 'text-slate-600' : 'text-white'}`}>{line.stat}</span>
                      <span className="mt-1 text-[10px] font-mono font-bold text-slate-500 tracking-tighter">{line.locked ? 'LOCKED_WAIT_+3' : formatStatValue(line.stat, line.value)}</span>
                    </div>
                  </div>
                  <div className={`flex min-w-[36px] items-center justify-center rounded-lg py-1 text-[10px] font-black shadow-inner ${line.locked ? 'bg-white/5 text-slate-700' : 'theme-badge-accent'}`}>
                    <span className="opacity-40 mr-1 text-[8px]">x</span>{line.hits || 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {actionLabel ? (
            <button type="button" onClick={onAction} onFocus={(event) => event.currentTarget.blur()} disabled={disabled} className="theme-action-primary group/action relative w-full overflow-hidden rounded-2xl px-8 py-3.5 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="relative flex items-center justify-center gap-3">
                <span className="text-[12px] font-black uppercase tracking-[0.25em]">{actionLabel}</span>
                <ChevronRight className="h-5 w-5 transition-transform group-hover/action:translate-x-1" />
              </div>
            </button>
          ) : null}
          <button type="button" onClick={onReset} onFocus={(event) => event.currentTarget.blur()} className="theme-action-secondary group/reset flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[10px] font-black uppercase tracking-[0.2em]">
            <RefreshCw className="h-4 w-4 transition-transform group-hover/reset:rotate-180 duration-500" />
            Reset Baseline
          </button>
        </div>
      </div>
    </article>
  );
}

function TutorialForceRelicCard({ relic, actionLabel, onAction, onReset, disabled }) {
  if (!relic) return null;
  const visibleLines = relic.lines.filter((line) => !line.hidden);

  return (
    <article data-tutorial="force" className="theme-glass-card group relative mt-20 rounded-[2.5rem] p-1 ring-1 ring-white/5 transition-all duration-500">
      {/* Relic Image Floating Header */}
      <div className="absolute -top-16 left-1/2 z-20 h-40 w-40 -translate-x-1/2 transform transition-transform duration-700 group-hover:-translate-y-2 group-hover:scale-105">
        <div className="absolute inset-0 bg-amber-500/15 blur-[50px] opacity-60 animate-pulse" />
        {relic.setImage ? <img src={relic.setImage} alt={relic.setName} className="relative z-10 h-full w-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.9)]" /> : null}
      </div>

      <div className="rounded-[2.4rem] border border-white/5 p-6 pt-16" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-2) 96%, transparent), color-mix(in srgb, var(--theme-surface-3) 98%, transparent))' }}>
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300/80">Force Override</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">{relic.pieceLabel}</h2>
          </div>
          <div className="theme-subpanel rounded-xl px-3 py-1.5 text-[11px] font-black text-amber-200 shadow-inner">
            {relic.isPrimed ? 'READY_LINK' : 'SEEKING_LINK'}
          </div>
        </div>

        <div className="theme-subpanel mb-6 rounded-[1.5rem] p-5 shadow-inner">
          <div className="theme-text-soft mb-1 text-[9px] font-black uppercase tracking-widest">Status</div>
          <div className="text-[12px] font-black uppercase tracking-wide text-white">
            {relic.isPrimed ? `SITTING ON LINE ${relic.forcedLine}` : `SEEKING LINE ${relic.forcedLine} ENTRANCE`}
          </div>
        </div>

        <div className="space-y-2">
          <div className="px-2 mb-3 text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <span>Control Point Array</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          {visibleLines.map((line) => {
            const style = LINE_STYLE[line.slot];
            const active = relic.forcedLine === line.slot;
            return (
              <div key={`force-${line.slot}`} className={`relative group/line overflow-hidden rounded-2xl border transition-all duration-500 ${active ? `border-white/15 bg-white/[0.08] ring-1 ${style.ring} shadow-[0_0_20px_rgba(0,0,0,0.4)]` : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                <div className="relative z-10 flex h-14 items-center gap-4 px-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-black shadow-inner transition-transform group-hover/line:scale-110 ${style.chip}`}>{line.slot}</div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-tight text-white">{line.stat}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{active ? 'Assigned Target' : 'Idle Sector'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {actionLabel ? (
            <button type="button" onClick={onAction} onFocus={(event) => event.currentTarget.blur()} disabled={disabled} className="theme-action-primary group/action relative w-full overflow-hidden rounded-2xl px-8 py-3.5 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="relative flex items-center justify-center gap-3">
                <span className="text-[12px] font-black uppercase tracking-[0.25em]">{actionLabel}</span>
                <ChevronRight className="h-5 w-5 transition-transform group-hover/action:translate-x-1" />
              </div>
            </button>
          ) : null}
          <button type="button" onClick={onReset} onFocus={(event) => event.currentTarget.blur()} className="theme-action-secondary group/reset flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[10px] font-black uppercase tracking-[0.2em]">
            <RefreshCw className="h-4 w-4 transition-transform group-hover/reset:rotate-180 duration-500" />
            Reset Baseline
          </button>
        </div>
      </div>
    </article>
  );
}
function ClaraCard({ round, roundIndex, roundCount }) {
  return (
    <section data-tutorial="clara" className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18]/80 p-6 shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/40" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">Tactical Briefing</span>
        </div>
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{roundIndex + 1} / {roundCount}</div>
      </div>
      
      <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-4 leading-tight">{round.title}</h3>
      <div className="space-y-4">
        <p className="text-[15px] font-medium leading-relaxed text-slate-200">{round.body}</p>
        
        <div className="relative rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Internal Monologue</div>
          <p className="text-sm italic leading-relaxed text-slate-400">{round.hint}</p>
        </div>
      </div>
    </section>
  );
}

function EventLogCard({ recentHits, eventLog }) {
  return (
    <section data-tutorial="log" className="theme-glass-card group relative overflow-hidden rounded-3xl p-6 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40" />
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full" />
          <Radar className="h-5 w-5 text-emerald-400 relative z-10" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">Sensor Feed Log</h3>
      </div>

      {recentHits.length ? (
        <div className="mb-6 grid gap-2">
          {recentHits.slice(-3).map((hit, index) => (
            <div key={`${hit.raw || hit.roll}-${index}`} className="group/hit flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-all hover:bg-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white">{hit.raw || hit.roll}</span>
                {hit.translated && hit.translated !== (hit.raw || hit.roll) ? (
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-slate-600" />
                    <span className="text-[11px] font-black text-cyan-400 tracking-tight">{hit.translated}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{hit.result}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 flex flex-col items-center justify-center py-8 opacity-20">
          <Radar className="h-10 w-10 text-slate-500 mb-2 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">No recent activity</span>
        </div>
      )}

      <div className="space-y-3">
        {eventLog.slice(-3).map((entry, index) => (
          <div key={`${entry}-${index}`} className="relative pl-6 before:absolute before:left-0 before:top-3 before:h-px before:w-4 before:bg-white/10 text-[13px] leading-relaxed text-slate-300 font-medium">
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
}

function NavigationCard({ levelConfig, round, stageComplete, onContinue }) {
  const actionText = round?.actionLabel
    ? `Required action: ${round.actionLabel}.`
    : stageComplete
      ? 'This stage is complete. Move on when you are ready.'
      : 'Read the board, follow Clara\'s guide, then do the required action.';

  return (
    <section data-tutorial="nav" className="theme-glass-card group relative overflow-hidden rounded-3xl p-6 shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40" />
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-5 w-5 text-amber-400" />
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-300">Current goal</h3>
      </div>
      
      <div className="theme-subpanel mb-6 rounded-2xl p-5">
        <div className="theme-text-soft mb-2 text-[10px] font-black uppercase tracking-widest">What to do now</div>
        <p className="text-[14px] font-bold leading-relaxed text-white">{actionText}</p>
      </div>

      <div className="theme-subpanel theme-text-soft mb-8 rounded-xl p-3 text-[10px] font-medium italic leading-relaxed">
        {levelConfig.subtitle}
      </div>

      <button 
        type="button" 
        onClick={onContinue} 
        disabled={!stageComplete && Boolean(round.actionKey)} 
        className="theme-action-primary group/btn relative w-full overflow-hidden rounded-2xl px-6 py-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
      >
        <div className="relative flex items-center justify-center gap-2">
          <span className="text-[13px] font-black uppercase tracking-[0.2em]">
            {stageComplete ? (levelConfig.nextRoute === '/tutorial/complete' ? 'Finish tutorial' : 'Next stage') : 'Continue lesson'}
          </span>
          <ChevronRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
        </div>
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

function TutorialTourOverlay({ steps, currentStep, stageReady, onBack, onNext, onClose, user }) {
  const [rect, setRect] = useState(null);
  const step = steps[currentStep];

  useEffect(() => {
    if (!step?.target) return undefined;

    const update = () => {
      const element = document.querySelector(step.target);
      if (!element) {
        return false;
      }
      const nextRect = element.getBoundingClientRect();
      setRect(nextRect);
      return true;
    };

    let rafId = null;
    let attempts = 0;
    const tryUpdate = () => {
      const found = update();
      if (!found && attempts < 24) {
        attempts += 1;
        rafId = window.requestAnimationFrame(tryUpdate);
        return;
      }
      if (!found) setRect(null);
    };

    tryUpdate();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  if (!step || !rect) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = 460;
  const cardHeight = 320;
  const gap = 30;
  const spotlightPadding = 15;

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
  const claraImage = resolveGuideClaraAsset(user?.user_metadata || {}, { speaking: false });

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none">
      <div
        className="absolute left-0 top-0"
        style={{ background: 'var(--theme-modal-overlay)', width: '100%', height: spotlightTop }}
      />
      <div
        className="absolute left-0"
        style={{ top: spotlightTop, width: spotlightLeft, height: spotlightHeight, background: 'var(--theme-modal-overlay)' }}
      />
      <div
        className="absolute right-0"
        style={{
          top: spotlightTop,
          left: spotlightLeft + spotlightWidth,
          width: Math.max(viewportWidth - (spotlightLeft + spotlightWidth), 0),
          height: spotlightHeight,
          background: 'var(--theme-modal-overlay)',
        }}
      />
      <div
        className="absolute left-0"
        style={{ top: spotlightTop + spotlightHeight, width: '100%', height: Math.max(viewportHeight - (spotlightTop + spotlightHeight), 0), background: 'var(--theme-modal-overlay)' }}
      />
      <div
        className="absolute rounded-[2.5rem] border"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightWidth,
          height: spotlightHeight,
          borderColor: 'var(--theme-border-strong)',
        }}
      />
      
      {/* HUD Pointer Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
         <circle cx={rect.left + rect.width / 2} cy={rect.top + rect.height / 2} r="10" fill="none" stroke="var(--theme-accent)" strokeWidth="2" className="animate-ping" />
      </svg>

      <div
        className="theme-modal-shell absolute w-[460px] overflow-hidden rounded-[2rem] p-8 pointer-events-auto"
        style={{ top, left }}
      >
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: 'var(--theme-accent)' }} />
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <div className="theme-text-accent flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em]">
              <Sparkles className="h-3 w-3" />
              Clara guide
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-white uppercase leading-none">
              {step.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-action-secondary group/close rounded-xl p-2 px-3 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Hide
          </button>
        </div>

        <div className="flex items-start gap-6 mb-8">
          <div className="relative group/avatar shrink-0">
            <div className="absolute inset-0 rounded-full opacity-60" style={{ background: 'color-mix(in srgb, var(--theme-accent) 14%, transparent)', filter: 'blur(16px)' }} />
            <img
              src={claraImage}
              alt="Clara"
              className="h-24 w-20 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform group-hover/avatar:scale-110"
            />
          </div>
          <div className="theme-subpanel flex-1 rounded-2xl p-5 text-[15px] leading-relaxed font-medium">
            {step.body}
          </div>
        </div>

        <div className="theme-subpanel mb-8 rounded-2xl p-5">
          <div className="theme-text-soft mb-2 text-[10px] font-black uppercase tracking-[0.2em]">
            Keep in mind
          </div>
          <p className="theme-text-muted text-sm font-medium leading-relaxed italic">{step.hint}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[12px] font-black text-white">{currentStep + 1} / {steps.length}</span>
            <span className="theme-text-soft mt-1 text-[9px] font-black uppercase tracking-widest">Guide progress</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={currentStep === 0}
              className="theme-action-secondary rounded-xl px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] disabled:opacity-20"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="theme-action-primary group/next relative overflow-hidden rounded-xl px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.05] disabled:grayscale disabled:opacity-40"
            >
              <div className="relative flex items-center justify-center gap-2">
                <span>
                  {currentStep === steps.length - 1 ? 'Finish guide' : 'Next'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </div>
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
  const { user } = useAuth();
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const levelConfig = useMemo(() => getTutorialLevelConfig(level), [level]);
  const [showIntroScreen, setShowIntroScreen] = useState(level === 1);
  const [introSpeaking, setIntroSpeaking] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [stageState, setStageState] = useState(() => createStageState(levelConfig));
  const [tourRunning, setTourRunning] = useState(false);
  const [predictorAdvancedOpen, setPredictorAdvancedOpen] = useState(false);
  const actionLockRef = useRef(null);
  const introAudioRef = useRef(null);
  const claraIntroImage = resolvePlaygroundClaraAsset(user?.user_metadata || {}, { speaking: introSpeaking });
  const claraIntroVoice = withBaseUrl('companions/Clara/tutorial/Clara-tutorial-intro.mp3');

  useEffect(() => {
    setShowIntroScreen(level === 1);
    setIntroSpeaking(false);
    setRoundIndex(0);
    setTourStepIndex(0);
    setStageState(createStageState(levelConfig));
    setTourRunning(false);
    setPredictorAdvancedOpen(false);
    actionLockRef.current = null;
  }, [levelConfig]);

  useEffect(() => {
    if (typeof window === 'undefined' || showIntroScreen) return undefined;

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
  }, [levelConfig.id, showIntroScreen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !showIntroScreen) return undefined;

    const audio = new Audio(claraIntroVoice);
    audio.volume = 0.6;
    introAudioRef.current = audio;

    const handlePlay = () => setIntroSpeaking(true);
    const handleStop = () => setIntroSpeaking(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handleStop);
    audio.addEventListener('pause', handleStop);

    const timeoutId = window.setTimeout(() => {
      audio.play().catch(() => {
        setIntroSpeaking(false);
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      audio.pause();
      audio.currentTime = 0;
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handleStop);
      audio.removeEventListener('pause', handleStop);
    };
  }, [claraIntroVoice, showIntroScreen]);

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
  const currentRoundIndex = Math.min(activeRoundIndex, Math.max(0, rounds.length - 1));
  const currentRound = rounds[currentRoundIndex] || rounds[0];
  const predictorEntries = useMemo(() => buildPredictorEntries(stageState.sessionRolls), [stageState.sessionRolls]);
  const showPredictor = levelConfig.mode === 'predictor-practice';

  useEffect(() => {
    actionLockRef.current = null;
  }, [currentRoundIndex, stageState.completedRoundIndex]);

  const currentRoundComplete = useMemo(
    () => isRoundComplete(currentRound, currentRoundIndex, stageState, predictorAdvancedOpen),
    [currentRound, currentRoundIndex, stageState, predictorAdvancedOpen],
  );
  const currentTourStepReady = useMemo(() => {
    const actionType = currentTourStep?.requiresActionType;
    if (!actionType) return true;
    if (actionType === 'advanced-open') return predictorAdvancedOpen;
    if (actionType === 'force' || actionType === 'relic') {
      return typeof currentTourStep?.roundIndex === 'number'
        && isRoundComplete(rounds[currentTourStep.roundIndex], currentTourStep.roundIndex, stageState, predictorAdvancedOpen);
    }
    return true;
  }, [currentTourStep, predictorAdvancedOpen, rounds, stageState]);

  const handleContinue = () => {
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (tourRunning) {
      nextTourStep();
      return;
    }
    const isLastRound = roundIndex >= rounds.length - 1;
    if (isLastRound) {
      navigate(levelConfig.nextRoute, {
        state: {
          guideCompleted: hasCompletedAllTutorialGuides(),
          completedGuideStages: getCompletedTutorialGuideStageCount(),
        },
      });
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
    if (currentRound.actionKey === 'stage15-open-advanced') return;
    if (currentRound?.actionKey && stageState.completedRoundIndex === currentRoundIndex) return;
    const actionLockKey = `target:${levelConfig.id}:${currentRoundIndex}`;
    if (actionLockRef.current === actionLockKey) return;
    actionLockRef.current = actionLockKey;
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
          completedRoundIndex: currentRoundIndex,
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
          completedRoundIndex: currentRoundIndex,
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
          completedRoundIndex: currentRoundIndex,
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
          completedRoundIndex: currentRoundIndex,
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
          completedRoundIndex: currentRoundIndex,
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
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage4-forced-plus-six':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentRawRoll: '34',
          currentTranslatedRoll: '41',
          currentString: '41 / 42',
          targetRelic: appendHit(current.targetRelic, 4, 6),
          recentHits: [...current.recentHits, { raw: '34', translated: '41', result: 'CRIT DMG' }],
          eventLog: [...current.eventLog, 'With line 3 primed first, the route spends from line 3 into line 4. That resolves as visible 41 and lands on CRIT DMG.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage4-forced-plus-nine':
        setStageState((current) => ({
          ...current,
          currentLine: 2,
          currentRawRoll: '42',
          currentTranslatedRoll: '42',
          currentString: '41 / 42',
          targetRelic: appendHit(current.targetRelic, 2, 9),
          recentHits: [...current.recentHits, { raw: '42', translated: '42', result: 'CRIT RATE' }],
          eventLog: [...current.eventLog, 'The next hit is visible 42, and this time it lands on line 2 for CRIT RATE. That is the full forced route.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-normal-plus3':
        setStageState((current) => ({
          ...current,
          currentLine: 1,
          currentRawRoll: '41',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 1, 3),
          recentHits: [...current.recentHits, { raw: '41', translated: '41', result: 'FLAT ATK' }],
          eventLog: [...current.eventLog, 'Normal route: +3 landed on line 1. That is raw 41.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-normal-plus6':
        setStageState((current) => ({
          ...current,
          currentLine: 2,
          currentRawRoll: '12',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 2, 6),
          recentHits: [...current.recentHits, { raw: '12', translated: '41', result: 'FLAT HP' }],
          eventLog: [...current.eventLog, 'Normal route: +6 landed on line 2. The raw route is 12, but it still reads as visible 41.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-normal-plus9':
        setStageState((current) => ({
          ...current,
          currentLine: 3,
          currentRawRoll: '23',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 3, 9),
          recentHits: [...current.recentHits, { raw: '23', translated: '41', result: 'SPD' }],
          eventLog: [...current.eventLog, 'Normal route: +9 landed on line 3. Raw 23 still reads as visible 41.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-normal-plus12':
        setStageState((current) => ({
          ...current,
          currentLine: 4,
          currentRawRoll: '34',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 4, 12),
          recentHits: [...current.recentHits, { raw: '34', translated: '41', result: 'EFFECT RES' }],
          eventLog: [...current.eventLog, 'Normal route: +12 landed on line 4. Raw 34 still reads as visible 41.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-normal-plus15':
        setStageState((current) => ({
          ...current,
          currentLine: 1,
          currentRawRoll: '41',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 1, 15),
          recentHits: [...current.recentHits, { raw: '41', translated: '41', result: 'FLAT ATK' }],
          eventLog: [...current.eventLog, 'Normal route: +15 returned to line 1. The visible read stayed 41 the whole way, even though the line kept changing.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-reset-target':
        setStageState((current) => {
          const fresh = createStageState(levelConfig);
          return {
            ...fresh,
            eventLog: [...fresh.eventLog, 'Relic reset. Now we use force line 2 to make the same visible 41 keep landing on SPD.'],
            recentHits: current.recentHits,
            stageComplete: true,
            completedRoundIndex: currentRoundIndex,
          };
        });
        setRoundIndex((value) => value + 1);
        break;
      case 'stage16-shift-plus3':
      case 'stage16-shift-plus6':
      case 'stage16-shift-plus9':
      case 'stage16-shift-plus12':
      case 'stage16-shift-plus15': {
        const nextLevelMap = {
          'stage16-shift-plus3': 3,
          'stage16-shift-plus6': 6,
          'stage16-shift-plus9': 9,
          'stage16-shift-plus12': 12,
          'stage16-shift-plus15': 15,
        };
        setStageState((current) => ({
          ...current,
          currentLine: 3,
          currentRawRoll: '23',
          currentTranslatedRoll: '41',
          currentString: '41',
          targetRelic: appendHit(current.targetRelic, 3, nextLevelMap[currentRound.actionKey]),
          recentHits: [...current.recentHits, { raw: '23', translated: '41', result: 'SPD' }],
          eventLog: [...current.eventLog, 'With force line 2 primed, the route becomes 23. That still reads as visible 41, but now it lands on SPD every time.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        }));
        setRoundIndex((value) => value + 1);
        break;
      }
      default: {
        const sequence = STAGE_SEQUENCES[levelConfig.id] || [];
        const step = sequence[stageState.sequenceIndex];
        if (!step) {
          setStageState((current) => ({ ...current, stageComplete: true, completedRoundIndex: currentRoundIndex }));
          setRoundIndex((value) => Math.min(value + 1, rounds.length - 1));
          return;
        }
        const isFinalSequenceStep = stageState.sequenceIndex + 1 >= sequence.length;
        setStageState((current) => {
          const next = applyProgressionStep(current, step);
          const finished = next.sequenceIndex >= sequence.length;
          return {
            ...next,
            stageComplete: finished,
            completedRoundIndex: finished ? currentRoundIndex : current.completedRoundIndex,
            eventLog: finished ? [...next.eventLog, 'This guided sequence is complete. Review the board once more, then continue.'] : next.eventLog,
          };
        });
        if (!isFinalSequenceStep) {
          window.setTimeout(() => {
            if (actionLockRef.current === actionLockKey) {
              actionLockRef.current = null;
            }
          }, 0);
        }
        break;
      }
    }
  };

  const handleForceAction = () => {
    if (!['stage4-force-line', 'stage16-force-line-two', 'stage16-reset-force-line'].includes(currentRound?.actionKey)) return;
    if (currentRound?.actionKey && stageState.completedRoundIndex === currentRoundIndex) return;
    const actionLockKey = `force:${levelConfig.id}:${currentRoundIndex}`;
    if (actionLockRef.current === actionLockKey) return;
    actionLockRef.current = actionLockKey;
    preserveScrollPosition();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStageState((current) => {
      if (currentRound?.actionKey === 'stage16-reset-force-line') {
        return {
          ...current,
          forceRelic: current.forceRelic
            ? {
              ...current.forceRelic,
              isPrimed: false,
              forcedLine: 2,
              lines: current.forceRelic.lines.map((line) => (line.slot === 2 ? { ...line, hidden: true } : line)),
            }
            : current.forceRelic,
          currentRawRoll: '--',
          currentTranslatedRoll: '--',
          currentString: '--',
          eventLog: [...current.eventLog, 'Force line reset. Prime line 2 again before the next upgrade.'],
          stageComplete: true,
          completedRoundIndex: currentRoundIndex,
        };
      }
      const forcedLine = currentRound?.actionKey === 'stage16-force-line-two' ? 2 : 3;
      return {
        ...current,
        forceRelic: current.forceRelic
          ? {
            ...current.forceRelic,
            isPrimed: true,
            forcedLine,
            lines: current.forceRelic.lines.map((line) => (line.slot === forcedLine ? { ...line, hidden: false } : line)),
          }
          : current.forceRelic,
        currentLine: forcedLine,
        currentRawRoll: '--',
        currentTranslatedRoll: '--',
        currentString: `${forcedLine}x`,
        eventLog: [...current.eventLog, `Force line ${forcedLine} is primed. You now sit on line ${forcedLine} before the next target roll.`],
        stageComplete: true,
        completedRoundIndex: currentRoundIndex,
      };
    });
    setRoundIndex((value) => value + 1);
  };

  const targetActionLabel = useMemo(() => {
    if (!currentRound?.actionKey || ['stage4-force-line', 'stage16-force-line-two', 'stage16-reset-force-line'].includes(currentRound.actionKey)) return null;
    if (currentRound.actionKey === 'stage15-open-advanced') return null;
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
  const resolvedForceActionLabel = currentRound?.actionKey === 'stage4-force-line'
    ? 'Prime line 3'
    : currentRound?.actionKey === 'stage16-force-line-two'
      ? 'Prime line 2'
      : currentRound?.actionKey === 'stage16-reset-force-line'
        ? 'Reset force line'
        : null;
  const targetActionDisabled = Boolean(currentRound?.actionKey)
    && !['stage4-force-line', 'stage16-force-line-two', 'stage16-reset-force-line', 'stage15-open-advanced'].includes(currentRound.actionKey)
    && stageState.completedRoundIndex === currentRoundIndex;
  const forceActionDisabled = ['stage4-force-line', 'stage16-force-line-two', 'stage16-reset-force-line'].includes(currentRound?.actionKey) && stageState.completedRoundIndex === currentRoundIndex;
  const closeTour = () => setTourRunning(false);
  const toggleIntroVoice = () => {
    if (!introAudioRef.current) return;
    if (!introAudioRef.current.paused) {
      introAudioRef.current.pause();
      return;
    }
    if (introAudioRef.current.currentTime > 0 && introAudioRef.current.currentTime < introAudioRef.current.duration) {
      introAudioRef.current.play().catch(() => {
        setIntroSpeaking(false);
      });
      return;
    }
    introAudioRef.current.currentTime = 0;
    introAudioRef.current.play().catch(() => {
      setIntroSpeaking(false);
    });
  };
  const beginTutorialFromIntro = () => {
    if (introAudioRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
    }
    setIntroSpeaking(false);
    setShowIntroScreen(false);
  };
  const nextTourStep = () => {
    preserveScrollPosition();
    if (!currentTourStepReady) return;
    if (tourStepIndex >= tutorialTourSteps.length - 1) {
      markTutorialGuideStageComplete(levelConfig.id);
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

  if (showIntroScreen) {
    return (
      <div className={`min-h-screen overflow-hidden flex items-center justify-center p-4 md:p-8 ${themeConfig.rootClassName || ''}`}>

        <div className="relative w-full max-w-6xl">
          <div className="theme-glass-card relative overflow-hidden rounded-[3.5rem] shadow-[0_60px_150px_rgba(0,0,0,0.35)]">
            <div className="grid gap-12 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-center p-8 md:p-12">
              
              {/* Clara Tactical Deck */}
              <div className="relative group">
                <div className="absolute -inset-10 opacity-40 transition-opacity group-hover:opacity-60" style={{ background: 'color-mix(in srgb, var(--theme-accent) 16%, transparent)', filter: 'blur(60px)' }} />
                <div className="theme-subpanel relative rounded-[3rem] p-6 shadow-inner overflow-hidden">
                  {/* Neural Link Status Overlay */}
                  <div className="absolute top-0 left-0 h-1 w-full opacity-40 animate-pulse" style={{ background: 'linear-gradient(90deg, transparent, var(--theme-accent), transparent)' }} />
                  <div className="absolute top-8 left-8 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--theme-accent)' }} />
                    <span className="theme-text-accent text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Clara online</span>
                  </div>

                  <img
                    src={claraIntroImage}
                    alt="Clara"
                    className="mx-auto h-[480px] w-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Aesthetic HUD Scanline */}
                  <div className="absolute top-0 h-20 w-full pointer-events-none animate-[scanline_4s_linear_infinite]" style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--theme-accent) 8%, transparent), transparent)' }} />
                </div>
              </div>

              {/* Mission Briefing Column */}
              <div className="space-y-10">
                <header>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px w-12" style={{ background: 'color-mix(in srgb, var(--theme-accent) 45%, transparent)' }} />
                    <span className="theme-text-accent text-[11px] font-black uppercase tracking-[0.4em]">Tutorial intro</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[0.9] uppercase">
                    Ready to start <br />
                    <span className="theme-text-accent">training?</span>
                  </h1>
                </header>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={toggleIntroVoice}
                    className="theme-action-secondary group/voice relative flex items-center gap-3 rounded-2xl px-6 py-4 transition-all hover:scale-[1.02]"
                  >
                    <Volume2 className="theme-text-accent h-5 w-5 transition-transform group-hover/voice:scale-110" />
                    <span className="text-sm font-black uppercase tracking-widest">{introSpeaking ? 'Pause Clara' : 'Hear Clara'}</span>
                  </button>
                  <div className="flex-1 overflow-hidden h-12 flex items-center">
                    <div className={`text-[11px] font-black uppercase tracking-widest text-slate-500 transition-opacity duration-300 ${introSpeaking ? 'opacity-100' : 'opacity-40'}`}>
                      {introSpeaking ? 'Clara is speaking...' : 'Play Clara intro'}
                    </div>
                  </div>
                </div>

                <div className="relative group/box">
                  <div className="theme-glass-card relative overflow-hidden rounded-[2rem] border border-white/10 p-8 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                    <div
                      className="absolute left-0 top-0 h-full w-1.5"
                      style={{ background: 'var(--theme-accent)' }}
                    />
                    <p className="pr-2 text-xl md:text-2xl font-bold leading-relaxed tracking-tight text-white">
                      "Welcome to the training module! I'll be your guide. Mr. Svarog and I will help you! Ready for some practice? Let's master these seeds together!"
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="theme-subpanel rounded-2xl border border-white/8 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--theme-accent)' }} />
                      <div className="text-[11px] font-black uppercase tracking-widest text-white">What you will learn</div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300 font-medium">
                      We start with relic lines and control points, then move into commons, noise, pair safety, Svarog Eye, and trends.
                    </p>
                  </div>
                  <div className="theme-subpanel rounded-2xl border border-white/8 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <div className="text-[11px] font-black uppercase tracking-widest text-white">How it works</div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300 font-medium">
                      Clara will guide each step, and you will click through semi-guided examples before moving into drills.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-6">
                  <button
                    type="button"
                    onClick={beginTutorialFromIntro}
                    className="theme-action-primary group/start relative overflow-hidden rounded-2xl px-10 py-5 transition-all hover:scale-[1.05] active:scale-95"
                  >
                    <div className="relative flex items-center justify-center gap-4">
                      <span className="text-[15px] font-black uppercase tracking-[0.3em]">Begin tutorial</span>
                      <ChevronRight className="h-6 w-6 transition-transform group-hover/start:translate-x-1" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/playground')}
                    className="group/leave flex items-center gap-2 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-rose-400"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover/leave:-translate-x-1" />
                    Leave tutorial
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-slate-100 relative overflow-hidden flex flex-col ${themeConfig.rootClassName || ''}`}>

      {tourRunning && tutorialTourSteps.length > 0 ? (
        <TutorialTourOverlay
          steps={tutorialTourSteps}
          currentStep={Math.min(tourStepIndex, tutorialTourSteps.length - 1)}
          stageReady={currentTourStepReady}
          onBack={prevTourStep}
          onNext={nextTourStep}
          onClose={closeTour}
          user={user}
        />
      ) : null}

      {/* Tutorial Header */}
      <header className="theme-modal-header relative z-10 px-6 py-8 shadow-2xl">
        <div className="mx-auto max-w-[1780px] flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="relative group/avatar">
              <div className="absolute inset-0 rounded-full opacity-40 animate-pulse" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)', filter: 'blur(18px)' }} />
              <img src={resolveGuideClaraAsset(user?.user_metadata || {}, { speaking: false })} className="h-16 w-14 object-contain relative z-10 transition-transform group-hover:scale-110" alt="Clara" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                 <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--theme-accent)' }} />
                 <span className="theme-text-accent text-[10px] font-black uppercase tracking-[0.4em] opacity-80">{levelConfig.label}</span>
              </div>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white leading-none">{levelConfig.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                preserveScrollPosition();
                setTourStepIndex(0);
                setRoundIndex(tutorialTourSteps[0]?.roundIndex ?? 0);
                setTourRunning(true);
              }}
            className="theme-action-secondary group/guide relative overflow-hidden rounded-2xl px-5 py-3.5 transition-all hover:scale-[1.02]"
            >
              <div className="relative flex items-center gap-3">
                <Info className="theme-text-accent h-5 w-5" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Clara guide</span>
              </div>
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/playground')} 
              className="group/abort flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-rose-400"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover/abort:-translate-x-1" />
              Leave tutorial
            </button>
          </div>
        </div>
      </header>

      {/* Stage Nav */}
      <nav className="theme-modal-header relative z-10 backdrop-blur-md">
        <div className="mx-auto max-w-[1780px] px-6 py-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max py-2">
            {TUTORIAL_LEVELS.map((entry, idx) => {
              const isActive = entry.id === levelConfig.id;
              return (
                <button 
                  key={entry.id} 
                  type="button" 
                  onClick={() => navigate(entry.route)} 
                  className={`group/tab relative px-5 py-2.5 rounded-xl border transition-all duration-300 ${isActive ? 'theme-badge-accent border shadow-[0_0_20px_rgba(0,0,0,0.12)]' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`}>{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-[11px] font-black uppercase tracking-widest">{entry.id}</span>
                  </div>
                  {isActive && (
                    <div className="absolute -bottom-[9px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full theme-accent-glow" style={{ background: 'var(--theme-accent)' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <main data-tutorial="workspace" className="relative z-10 flex-1 overflow-y-auto no-scrollbar pt-8 pb-20">
        <div className="mx-auto max-w-[1780px] px-6">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_420px]">
            {/* Tutorial Workspace */}
            <div data-tutorial="overview" className="space-y-10">
              
              {showPredictor ? (
                <section data-tutorial="board" className="relative group">
                  <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--theme-accent) 8%, transparent)', filter: 'blur(100px)' }} />
                  <div className="theme-glass-card relative rounded-[3rem] p-8 shadow-2xl">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                           <div className="absolute inset-0 rounded-full shadow-inner" style={{ background: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)', filter: 'blur(8px)' }} />
                           <Sparkles className="theme-text-accent relative z-10 h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white">Board read</h2>
                      </div>
                      <div className="theme-subpanel flex items-center gap-3 rounded-2xl px-4 py-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Live tutorial feed</span>
                      </div>
                    </div>
                    <ModernPairPredictorCard
                      entries={predictorEntries}
                      region="America"
                      advancedToggleId="tutorial-predictor-advanced-toggle"
                      advancedPanelId="tutorial-predictor-advanced-panel"
                      tutorialIds={TUTORIAL_PREDICTOR_IDS}
                      onAdvancedToggleChange={setPredictorAdvancedOpen}
                    />
                  </div>
                </section>
              ) : null}

              <div className={`grid gap-10 ${stageState.forceRelic ? 'lg:grid-cols-2' : ''} items-start`}>
                <TutorialRelicCard relic={stageState.targetRelic} currentLine={stageState.currentLine} currentString={stageState.currentString} currentRawRoll={stageState.currentRawRoll} currentTranslatedRoll={stageState.currentTranslatedRoll} showRawRead={levelConfig.id >= 5} title="Target relic" actionLabel={targetActionLabel} onAction={handleTargetAction} onReset={handleReset} disabled={targetActionDisabled} />
                {stageState.forceRelic ? <TutorialForceRelicCard relic={stageState.forceRelic} actionLabel={resolvedForceActionLabel} onAction={handleForceAction} onReset={handleReset} disabled={forceActionDisabled} /> : null}
              </div>
            </div>

            {/* Tutorial Sidebar */}
            <aside className="space-y-8 flex flex-col">
              <NavigationCard levelConfig={levelConfig} round={currentRound} stageComplete={currentRoundComplete} onContinue={handleContinue} />
              <EventLogCard recentHits={stageState.recentHits} eventLog={stageState.eventLog} />
              
              <div className="relative mt-auto pt-8 border-t border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <Info className="h-4 w-4 text-slate-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">One rule to keep</span>
                </div>
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 text-[12px] font-medium leading-relaxed text-slate-500 italic">
                  {currentRound?.hint}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

