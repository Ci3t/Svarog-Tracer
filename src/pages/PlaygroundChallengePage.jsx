import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
  Copy,
  Lightbulb,
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
} from 'lucide-react';
import ModernStickyHeader from '../components/modern/ModernStickyHeader';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { translateTo4 } from '../utils/stringHelpers';
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

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
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
  onAction,
  onReset,
  onReorderLines,
  onChangeLineStat,
  onChangeOrderMode,
  footerSlot = null,
  disabled = false,
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

  return (
    <article className="group relative mt-16 flex-1 rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-1 shadow-2xl transition-all duration-500 hover:border-white/10">
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

      <div className="relative rounded-[1.4rem] border border-white/5 bg-slate-950/70 p-4 pt-12 backdrop-blur-3xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${themeClasses.border} bg-black/50`}>
              <Icon className={`h-4 w-4 ${themeClasses.text}`} />
            </div>
            <div>
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
          <div>
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-600">Score</div>
            <div className="text-[10px] font-black text-white">{relicScore.score}</div>
          </div>
          <div>
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
          {visibleLines.map((line) => (
            <div
              key={`${title}-${line.slot}`}
              draggable={Boolean(onReorderLines)}
              onDragStart={(event) => handleDragStart(event, line.slot)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, line.slot)}
              className={`group/item relative overflow-hidden rounded-xl border transition-all duration-300 ${
                line.justHit 
                  ? `${themeClasses.border} ${themeClasses.bgGlow}` 
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
                      <span className={`text-[10px] font-black uppercase tracking-tight ${line.justHit ? 'text-white' : 'text-slate-500'}`}>
                        {line.stat}
                      </span>
                      <span className={`text-[9px] font-mono ${line.justHit ? themeClasses.text : 'text-slate-600'}`}>
                        {formatStatValue(line.stat, line.value)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`flex h-6 min-w-[24px] items-center justify-center rounded-lg px-1.5 text-xs font-black ${line.justHit ? themeClasses.button : 'bg-white/5 text-slate-700'}`}>
                  {line.hits}
                </div>
              </div>
            </div>
          ))}

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
            disabled={disabled || relic.level >= 15}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              disabled || relic.level >= 15 
                ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-800' 
                : `${themeClasses.button}`
            }`}
          >
             {relic.level >= 15 ? 'MAXED' : (relic.hasFourthLine ? `UPGRADE +${Math.min(relic.level + 3, 15)}` : 'ADD LINE')}
             {relic.level < 15 && <ChevronRight className="h-3 w-3" />}
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
    <article className="group relative mt-16 flex-1 rounded-[1.5rem] border border-white/5 bg-slate-900/40 p-1 shadow-2xl transition-all duration-500 hover:border-white/10">
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

      <div className="relative rounded-[1.4rem] border border-white/5 bg-slate-950/70 p-4 pt-12 backdrop-blur-3xl">
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
              type="button"
              onClick={onCycleType}
              disabled={disabled}
              className="rounded-lg border border-white/5 bg-white/5 p-1.5 text-slate-600 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Cycle 1-liner / 2-liner / 3-liner"
            >
              <Settings2 className="h-3.5 w-3.5" />
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

function ResultRelicCard({ relic, title, accent = 'cyan' }) {
  if (!relic) {
    return (
      <div className="rounded-[1.15rem] border border-white/5 bg-black/20 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
        <div className="mt-3 rounded-xl border border-dashed border-white/5 bg-white/[0.02] px-4 py-6 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-600">
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
    <div className="rounded-[1.15rem] border border-white/5 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
          <div className="mt-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white">
            <span>{relic.pieceLabel}</span>
            <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] text-slate-200">+{relic.level || 0}</span>
          </div>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${accentClasses.chip}`}>
          {relicScore.grade} · {relicScore.score}
        </div>
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/5 bg-black/30 p-1">
          {relic.setImage ? (
            <img src={relic.setImage} alt={relic.setName} className="h-full w-full object-contain" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{relic.setName}</div>
          <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">Main Stat</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-white">{mainStatDisplay.label}</span>
              <span className="text-[10px] font-black text-slate-200">{mainStatDisplay.display}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {visibleLines.filter(Boolean).map((line) => (
          <div key={`result-${title}-${line.slot}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${accentClasses.dot}`} />
                <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">{line.stat}</span>
              </div>
              <div className="mt-1 pl-3.5 text-[10px] font-mono text-slate-400">{formatStatValue(line.stat, line.value)}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/25 px-2.5 py-1 text-xs font-black text-white">
              x{line.hits || 0}
            </div>
          </div>
        ))}
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

  const containerRef = useRef(null);
  const debugRef = useRef({
    bucketKey: null,
    historyLength: 0,
    family: null,
    commons: null,
    phase: null,
  });
  const lastPvpSyncRef = useRef('');
  const loadedPvpScenarioRef = useRef('');
  const lastPvpStartedAtRef = useRef('');
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
  const activeHint = hintStep > 0 ? currentContract.hints[Math.min(hintStep - 1, currentContract.hints.length - 1)] : 'No hint opened yet.';
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
  const pvpCountdownLeft = useMemo(() => {
    if (!isPvpMode || pvpRoom?.status !== 'countdown') return 0;
    const startedAtMs = new Date(pvpRoom?.startedAt || 0).getTime();
    if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return 0;
    return Math.max(0, 5 - Math.floor((clockNow - startedAtMs) / 1000));
  }, [clockNow, isPvpMode, pvpRoom?.startedAt, pvpRoom?.status]);
  const isPvpPreStartLocked = isPvpMode && pvpRoom?.status === 'countdown' && pvpCountdownLeft > 0;
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
  const opponentResultScore = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalScore ?? 0) : (pvpOpponent?.state?.bestScore ?? pvpOpponent?.state?.score ?? 0);
  const opponentResultGrade = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalGrade || 'F') : (pvpOpponent?.state?.bestGrade || pvpOpponent?.state?.grade || 'F');
  const opponentResultMistakes = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalMistakes ?? 0) : (pvpOpponent?.state?.bestMistakes ?? pvpOpponent?.state?.mistakes ?? 0);
  const opponentResultHelpful = opponentResultUsesTimeout ? (pvpOpponent?.state?.finalHelpfulHits ?? 0) : (pvpOpponent?.state?.bestHelpfulHits ?? pvpOpponent?.state?.helpfulHits ?? 0);
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
    if (isPvpPreStartLocked) return;
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
  }, [currentPvpAttempt, isPvpMode, isPvpPreStartLocked, pvpAttemptsUsed, pvpBusted, pvpSubmittedAttempt, relic.level]);

  const handleResetPvpAttempt = useCallback(() => {
    if (!isPvpMode) {
      resetChallengeMode();
      return;
    }
    if (isPvpPreStartLocked) return;
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
    setTestRelic(createChallengeRelic(currentContract.builderRelic, { rollTierMode: currentContract?.pvpRollTier || null }));
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: currentContract.forceRelic.baseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
    if (currentContract.requiresSessionBuilder) {
      setSessionRolls([]);
      setSharedCarryLine(null);
    }
    setMistakes(0);
    setHintStep(0);
    setHintVisible(false);
  }, [currentContract, currentPvpAttempt, isPvpMode, isPvpPreStartLocked, mistakes, pvpAttemptsUsed, relic.hasFourthLine, relic.level, pvpBusted, pvpSubmittedAttempt, sessionRolls.length, testRelic.level]);

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    gsap.fromTo(q('.gsap-fade-up'), 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (!isPvpMode) return;
    fetchPvpRoom();
  }, [fetchPvpRoom, isPvpMode]);

  useEffect(() => {
    if (!isPvpMode || !roomCode) return undefined;
    const interval = window.setInterval(() => {
      fetchPvpRoom({ silent: true });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [fetchPvpRoom, isPvpMode, roomCode]);

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
    if (pvpRoom?.status === 'active') {
      setTimerRunning(true);
    }
    if (pvpRoom?.status === 'finished') {
      setTimerRunning(false);
    }
  }, [isPvpMode, pvpRoom?.status]);

  useEffect(() => {
    if (challengeStatus.tone !== 'clear') return;
    if (isGeneratedChallengeActive) return;
    setCompletedContracts((existing) => (existing.includes(currentContract.id) ? existing : [...existing, currentContract.id]));
  }, [challengeStatus.tone, currentContract.id, isGeneratedChallengeActive]);

  useEffect(() => {
    const lastSessionRoll = patternProfile?.history?.[patternProfile.history.length - 1] || '-';
    const historyLength = patternProfile?.history?.length || 0;
    const commons = patternProfile?.commons?.join('/') || '-';
    const previous = debugRef.current;

    if (previous.bucketKey && previous.bucketKey !== bucketKey) {
      console.info(
        `[FreeMode] bucket rollover ${previous.bucketKey} -> ${bucketKey} | seed=${patternProfile?.seed} | mood=${patternProfile?.mood}`
      );
    }

    if (
      previous.family &&
      (
        previous.family !== (patternProfile?.family || null) ||
        previous.commons !== commons ||
        previous.phase !== (patternProfile?.phase || null)
      )
    ) {
      console.info(
        `[FreeMode] regime update ${previous.family}(${previous.commons || '-'}) -> ${patternProfile?.family || '-'}(${commons}) | phase=${patternProfile?.phase || '-'} | noise=${patternProfile?.noisePressure ?? 0}`
      );
    }

    if (historyLength > previous.historyLength) {
      console.groupCollapsed(
        `[FreeMode] consumed ${lastSessionRoll} | bucket=${bucketKey} | family=${patternProfile?.family || '-'} | phase=${patternProfile?.phase || '-'}`
      );
      console.table({
        bucketKey,
        seed: patternProfile?.seed,
        mood: patternProfile?.mood,
        family: patternProfile?.family,
        phase: patternProfile?.phase,
        commons,
        noise: patternProfile?.noise?.join('/') || '-',
        noisePressure: patternProfile?.noisePressure ?? 0,
        dominantRoll: patternProfile?.dominantRoll || '-',
        regimeShiftCount: patternProfile?.regimeShiftCount ?? 0,
        historyLength,
        lastSessionRoll,
        target: `${relic.level} | L${relic.lastLine || '-'} | ${relic.lastRawPair || '-'} -> ${relic.lastVisibleRoll || '-'}`,
        sessionBuilder: `${testRelic.level} | L${testRelic.lastLine || '-'} | ${testRelic.lastRawPair || '-'} -> ${testRelic.lastVisibleRoll || '-'} | loop=${testRelicLoopMode ? 'on' : 'off'}`,
        forceRelic: `primed=${forceRelic.isPrimed} | line=${forceRelic.forcedLine} | base=${forceRelic.baseLines}`,
      });
      console.groupEnd();
    }

    debugRef.current = {
      bucketKey,
      historyLength,
      family: patternProfile?.family || null,
      commons,
      phase: patternProfile?.phase || null,
    };
  }, [
    bucketKey,
    patternProfile,
    relic.level,
    relic.lastLine,
    relic.lastRawPair,
    relic.lastVisibleRoll,
    testRelic.level,
    testRelic.lastLine,
    testRelic.lastRawPair,
    testRelic.lastVisibleRoll,
    forceRelic.isPrimed,
    forceRelic.forcedLine,
    forceRelic.baseLines,
    testRelicLoopMode,
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
    if (isPvpPreStartLocked) return;
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
    if (isPvpPreStartLocked) return;
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
    if (isPvpPreStartLocked) return;
    const startingRelic =
      testRelicLoopMode && testRelic.level >= 15
        ? createChallengeRelic(currentContract.builderRelic, {
            readyForUpgrades: true,
            carryLine: testRelic.lastLine,
            rollTierMode: currentContract?.pvpRollTier || null,
          })
        : testRelic;
    let nextRelic = handleBaseUpgrade(startingRelic, patternProfile);
    const previousLevel = startingRelic.level;
    let sessionEntry = null;
    let sessionVisibleRoll = '';

    if (currentContract.requiresSessionBuilder && nextRelic.level > previousLevel) {
      if (!startingRelic.hasFourthLine && nextRelic.level === 3) {
        sessionEntry = createSessionEntry('44');
        sessionVisibleRoll = '44';
        nextRelic = {
          ...nextRelic,
          lastLine: 4,
          lastRawPair: '44',
          lastVisibleRoll: '44',
        };
      } else if (nextRelic.lastRawPair) {
        sessionEntry = createSessionEntry(nextRelic.lastRawPair);
        sessionVisibleRoll = sessionEntry?.translated || nextRelic.lastVisibleRoll || '';
      }
    }

    setTestRelic(nextRelic);

    if (sessionEntry) {
      setSessionRolls((existing) => [...existing, sessionEntry]);
      setPatternProfile((current) => advancePatternProfile(current, sessionVisibleRoll));
      setSharedCarryLine(nextRelic.lastLine || null);
    } else if (nextRelic.level > previousLevel && nextRelic.lastVisibleRoll) {
      setPatternProfile((current) => advancePatternProfile(current, nextRelic.lastVisibleRoll));
      setSharedCarryLine(nextRelic.lastLine || null);
    }
  };

  const handleAddManualRoll = () => {
    if (isPvpPreStartLocked) return;
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
    if (isPvpPreStartLocked) return;
    setSessionRolls((existing) => existing.filter((entry) => entry.id !== entryId));
  };

  const handlePrimeForceRelic = () => {
    if (isPvpPreStartLocked) return;
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
    if (isPvpPreStartLocked) return;
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: forceRelic.baseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
  };

  const handleCycleForceRelicType = () => {
    if (isPvpPreStartLocked) return;
    const nextBaseLines = forceRelic.baseLines >= 3 ? 1 : forceRelic.baseLines + 1;
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: nextBaseLines,
    }, { rollTierMode: currentContract?.pvpRollTier || null }));
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-[#080B14] text-slate-200 relative [&_button:not(:disabled)]:cursor-pointer ${themeConfig.rootClassName || ''}`}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(15,18,25,0.7),#080B14)]" />
      </div>

      <ModernStickyHeader
        secondsLeft={secondsLeft}
        onStart={handleStartSession}
        onStop={isPvpPreStartLocked ? undefined : (() => setTimerRunning(false))}
        onRestart={isPvpPreStartLocked ? undefined : (() => resetChallengeMode())}
        timerRunning={timerRunning}
        rollInput={rollInput}
        setRollInput={setRollInput}
        onAddRoll={isPvpPreStartLocked ? undefined : handleAddManualRoll}
        entriesCount={predictorEntries.length}
      />

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
          <div className="gsap-fade-up mb-6 space-y-4">
            <div className="overflow-hidden rounded-[1.5rem] border border-rose-400/15 bg-[radial-gradient(circle_at_top,rgba(120,18,36,0.2),rgba(5,8,16,0.92))] p-5 shadow-[0_0_50px_rgba(120,18,36,0.14)]">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
                <div className="rounded-[1.1rem] border border-cyan-400/15 bg-cyan-500/6 px-4 py-4">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200/70">You</div>
                  <div className="text-2xl font-black uppercase tracking-tight text-white">Trailblazer</div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/80">
                      <span>HP</span>
                      <span>{playerHp} / 100</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-cyan-400/15 bg-black/35">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-cyan-500 transition-all duration-500"
                        style={{ width: `${playerHp}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-cyan-400/15 bg-black/25 px-3 py-1 text-cyan-100">
                      {formatPvpStatusLabel(localPvpState.status, localPvpState.phase)}
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-slate-200">
                      +{localDisplayedPvpLevel}
                    </span>
                    {currentContract.requiresSessionBuilder ? (
                      <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-violet-200">
                        Session {sessionRolls.length}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-amber-200">
                      Attempts {pvpAttemptsUsed}/3
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-emerald-200">
                      Hits {helpfulHits}
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-slate-200">
                      Mistakes {mistakes}
                    </span>
                  </div>
                </div>

                <div className="px-2 text-center">
                  <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">
                    <Swords className="h-4 w-4" />
                    Score Duel
                  </div>
                  <div className="text-3xl font-black uppercase tracking-[0.18em] text-white">
                    VS
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                    <TimerReset className="h-3.5 w-3.5 text-rose-200" />
                    {pvpRoom?.status || (pvpLoading ? 'loading' : 'waiting')}
                  </div>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                    {pvpPressureLabel}
                  </div>
                  <div className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Seed {currentContract.seedLabel}
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-rose-400/15 bg-rose-500/6 px-4 py-4 text-right">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.24em] text-rose-200/70">Opponent</div>
                  <div className="text-2xl font-black uppercase tracking-tight text-white">{pvpOpponent?.name || 'Waiting'}</div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/80">
                      <span>HP</span>
                      <span>{opponentHp} / 100</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-rose-400/15 bg-black/35">
                      <div
                        className="ml-auto h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500 transition-all duration-500"
                        style={{ width: `${opponentHp}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                    <span className="rounded-full border border-rose-400/15 bg-black/25 px-3 py-1 text-rose-100">
                      {formatPvpStatusLabel(pvpOpponent?.state?.status || 'idle', pvpOpponent?.state?.phase || '')}
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-slate-200">
                      +{pvpOpponent?.state?.currentLevel ?? 0}
                    </span>
                    {currentContract.requiresSessionBuilder ? (
                      <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-violet-200">
                        Session {pvpOpponent?.state?.sessionEntriesBuilt ?? 0}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-amber-200">
                      Attempts {pvpOpponent?.state?.attemptsUsed ?? 0}/3
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-emerald-200">
                      Hits {pvpOpponent?.state?.helpfulHits ?? 0}
                    </span>
                    <span className="rounded-full border border-white/5 bg-black/25 px-3 py-1 text-slate-200">
                      Mistakes {pvpOpponent?.state?.mistakes ?? 0}
                    </span>
                  </div>
                </div>
              </div>
              {pvpError ? <p className="mt-4 text-xs text-rose-200">{pvpError}</p> : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.3rem] border border-white/5 bg-slate-950/35 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-amber-300" />
                  <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">Race Tracker</div>
                </div>
                {[
                  { label: 'You', color: 'cyan', level: localDisplayedPvpLevel, status: localPvpState.status },
                  { label: pvpOpponent?.name || 'Opponent', color: 'rose', level: Number(pvpOpponent?.state?.currentLevel || 0), status: pvpOpponent?.state?.status || 'idle' },
                ].map((lane) => {
                  const checkpoints = [3, 6, 9, 12, 15];
                  const laneClasses = lane.color === 'cyan'
                    ? {
                        glow: 'from-cyan-400/30 to-cyan-600/10',
                        fill: 'from-cyan-300 to-cyan-500',
                        badge: 'text-cyan-100 border-cyan-400/15 bg-cyan-500/10',
                      }
                    : {
                        glow: 'from-rose-400/30 to-rose-600/10',
                        fill: 'from-rose-300 to-rose-500',
                        badge: 'text-rose-100 border-rose-400/15 bg-rose-500/10',
                      };
                  const progressWidth = `${Math.max(0, Math.min(100, (lane.level / 15) * 100))}%`;
                  return (
                    <div key={`${lane.label}-${lane.color}`} className="mb-4 last:mb-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-sm font-black uppercase tracking-[0.14em] text-white">{lane.label}</div>
                        <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${laneClasses.badge}`}>
                          {lane.status}
                        </div>
                      </div>
                      <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-black/30 px-4 py-5`}>
                        <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${laneClasses.glow}`} style={{ width: progressWidth }} />
                        <div className="relative">
                          <div className="relative mb-3 h-3 rounded-full bg-white/5">
                            <div className={`h-full rounded-full bg-gradient-to-r ${laneClasses.fill} shadow-[0_0_18px_rgba(255,255,255,0.12)]`} style={{ width: progressWidth }} />
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                            {checkpoints.map((checkpoint) => (
                              <div
                                key={`${lane.label}-${checkpoint}`}
                                className={`rounded-lg border px-2 py-1 ${lane.level >= checkpoint ? 'border-white/10 bg-white/5 text-white' : 'border-white/5 bg-black/20'}`}
                              >
                                +{checkpoint}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.3rem] border border-white/5 bg-slate-950/35 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-300" />
                    <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">Match Feed</div>
                  </div>
                  <div className="space-y-2">
                  {pvpFeed.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-black/25 px-4 py-3 text-sm text-slate-500">
                      Waiting for the duel to develop.
                    </div>
                  ) : (
                    pvpFeed.map((entry) => {
                      const toneClasses = entry.tone === 'player'
                        ? 'border-cyan-400/15 bg-cyan-500/8 text-cyan-100'
                        : entry.tone === 'opponent'
                          ? 'border-rose-400/15 bg-rose-500/8 text-rose-100'
                          : 'border-amber-400/15 bg-amber-500/8 text-amber-100';
                      return (
                        <div key={entry.id} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${toneClasses}`}>
                          {entry.text}
                        </div>
                      );
                    })
                  )}
                </div>
                </div>
                {currentContract.requiresSessionBuilder && false ? (
                  <div className="rounded-[1.3rem] border border-violet-400/15 bg-violet-500/6 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-violet-300" />
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200">
                          {isOpponentBot ? 'Bot Read Notes' : 'Opponent Session Data'}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100">
                        {opponentSessionEntries.length} entries
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/5 bg-black/25 p-3">
                      {opponentSessionEntriesNewestFirst.length > 0 ? (
                        <div className="space-y-2">
                          {opponentSessionEntriesNewestFirst.map((entry, index) => (
                            <div key={`${entry.id || index}-${entry.raw || index}`} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] text-slate-200">
                              <div className="flex items-center justify-between gap-3 font-black uppercase tracking-[0.12em]">
                                <span className="text-slate-400">A{entry.attempt || 1} • #{entry.step || 1}</span>
                                <span>{entry.raw || '--'}</span>
                                <span className="text-violet-200">{entry.translated || entry.s2 || '--'}</span>
                              </div>
                              <div className="mt-2 grid gap-1 text-[9px] uppercase tracking-[0.1em] text-slate-400">
                                <div>Try {entry.attempt || 1}</div>
                                <div>Carry L{entry.carryLine || '-'} • Commons {entry.commons || '-'} • Noise {entry.noise || '-'}</div>
                                <div>Dominant {entry.dominantRoll || '-'} • Noise {Number(entry.noisePressure || 0).toFixed(2)} • Eye {entry.trustedPair || '-'} / {entry.pairSafety || '-'}</div>
                                <div>Risk {entry.noiseRisk || 0}%{entry.trendSummary ? ` • Trends ${entry.trendSummary}` : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] leading-relaxed text-slate-400">No opponent session entries recorded yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
                {currentContract.requiresSessionBuilder && isOpponentBot ? (
                  <div className="rounded-[1.3rem] border border-cyan-400/15 bg-cyan-500/6 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-300" />
                      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-200">Readable Bot Notes</div>
                    </div>
                    <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/5 bg-black/25 p-3">
                      {opponentSessionEntriesNewestFirst.length > 0 ? (
                        <div className="space-y-2">
                          {opponentSessionEntriesNewestFirst.map((entry, index) => (
                            <div key={`readable-${entry.id || index}-${entry.raw || index}`} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-slate-200">
                              Try {entry.attempt || 1}, read {entry.step || 1}: the bot entered {entry.raw || '--'}, translated it to {entry.translated || entry.s2 || '--'}, and ended on line L{entry.carryLine || '-'}. It was comparing commons {entry.commons || '-'} against noise {entry.noise || '-'}, leaning on Svarog eye {entry.trustedPair || '-'} with {entry.pairSafety || 'unknown'} safety and {entry.noiseRisk || 0}% noise risk.{entry.trendSummary ? ` Trends: ${entry.trendSummary}.` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] leading-relaxed text-slate-400">The bot has not recorded readable session notes yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
                {currentContract.requiresSessionBuilder && !isOpponentBot ? (
                  <div className="rounded-[1.3rem] border border-violet-400/15 bg-violet-500/6 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-violet-300" />
                        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-200">Opponent Session Data</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100">
                        {opponentSessionEntries.length} entries
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/5 bg-black/25 p-3">
                      {opponentSessionEntriesNewestFirst.length > 0 ? (
                        <div className="space-y-2">
                          {opponentSessionEntriesNewestFirst.map((entry, index) => (
                            <div key={`${entry.id || index}-${entry.raw || index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
                              <span className="text-slate-400">Try {entry.attempt || 1} • #{entry.step || 1}</span>
                              <span>{entry.raw || '--'}</span>
                              <span className="text-violet-200">{entry.translated || entry.s2 || '--'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] leading-relaxed text-slate-400">No opponent session entries recorded yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!isPvpMode ? (
        <div className="gsap-fade-up mb-4 rounded-[1.1rem] border border-white/5 bg-slate-950/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">Challenge Mode</div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Keep the handcrafted ladder and generated setup separate so you can switch between them without losing your place.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1">
              {[
                { id: 'ladder', label: 'Ladder' },
                { id: 'generated', label: 'Generated' },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setChallengeModeView(view.id)}
                  className={`rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                    challengeModeView === view.id
                      ? 'bg-cyan-500/18 text-cyan-100'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        ) : null}

        {!isPvpMode && challengeModeView === 'ladder' ? (
        <div className="gsap-fade-up mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Handcrafted Ladder
            </div>
            <button
              type="button"
              onClick={() => {
                setCompletedContracts([]);
                setCurrentContractId('level01');
              }}
              className="rounded-full border border-white/5 bg-black/30 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-white/10 hover:text-white"
            >
              Reset Ladder
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {CHALLENGE_CONTRACT_ORDER.map((contractId) => {
            const contract = getChallengeContract(contractId);
            const isCurrent = contractId === currentContractId;
            const isCompleted = completedContracts.includes(contractId);
            return (
              <button
                key={contractId}
                type="button"
                onClick={() => handleOpenHandcraftedContract(contractId)}
                className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                  isCurrent
                    ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                    : isCompleted
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16'
                      : 'border-white/5 bg-black/30 text-slate-300 hover:border-white/10 hover:text-white'
                }`}
              >
                {contract.title}
                {isCompleted ? ' • Clear' : ''}
              </button>
            );
          })}
          </div>
        </div>
        ) : null}

        {!isPvpMode && challengeModeView === 'generated' ? (
        <div className="gsap-fade-up mb-6 rounded-[1.1rem] border border-white/5 bg-slate-950/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">Generated Challenge Setup</div>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                Pick a tier here, generate a fresh challenge, and keep it separate from the ladder contracts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {roleMode === 'admin' ? (
                <button
                  type="button"
                  onClick={() => navigate('/playground/challenge/admin')}
                  className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-amber-100 transition-all hover:bg-amber-500/18"
                >
                  Admin Builder
                </button>
              ) : null}
              {generatedScenario ? (
                <button
                  type="button"
                  onClick={() => setGeneratedScenario(null)}
                  className="rounded-full border border-white/5 bg-black/30 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:border-white/10 hover:text-white"
                >
                  Clear Generated
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['new_player', 'beginner', 'intermediate', 'veteran', 'expert', 'expert_v2'].map((tier) => {
              const isSelected = selectedTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                    isSelected
                      ? 'border-cyan-400/30 bg-cyan-500/14 text-cyan-100'
                      : 'border-white/5 bg-black/30 text-slate-300 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {tier.replace('_', ' ')}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleGenerateScenario}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-4 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
            >
              Generate Challenge
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        ) : null}

        {!isPvpMode ? (
        <div className="gsap-fade-up mb-6 rounded-[1.25rem] border border-white/5 bg-slate-950/40 p-5 shadow-inner backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">Mission Brief</span>
                {generatedScenario ? (
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    Generated
                  </span>
                ) : null}
                <span className="rounded-full border border-white/5 bg-black/30 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {currentContract.difficulty}
                </span>
              </div>
              <div className="text-xl font-black uppercase tracking-tight text-amber-300">
                {currentContract.title}
              </div>
              <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-slate-300">
                {describeChallengeMission(currentContract.success)}
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:w-[260px]">
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Tries</div>
                <div className="mt-1 text-2xl font-black text-amber-200">
                  {triesUsed}
                  {maxTries ? <span className="text-sm text-slate-500"> / {maxTries}</span> : null}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Mistakes</div>
                <div className="mt-1 text-2xl font-black text-rose-300">{mistakes}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr_280px]">
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Clear Rule</div>
              <p className="text-[10px] leading-relaxed text-slate-300">
                {describeChallengeWinRule(currentContract.success)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">Goal Checklist</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {contractTargets.length > 0 ? contractTargets.map((target) => (
                  <span key={target} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                    {target}
                  </span>
                )) : (
                  <span className="text-[10px] text-slate-400">No explicit target lines.</span>
                )}
              </div>
              {currentContract.requiresSessionBuilder ? (
                <p className="mt-3 text-[10px] leading-relaxed text-amber-100/85">
                  Session-builder rule is active for this challenge. Read the board first, then convert that read into your target path.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <div
                className={`rounded-xl border p-3 ${
                  challengeStatus.tone === 'clear'
                    ? 'border-emerald-500/25 bg-emerald-500/10'
                    : challengeStatus.tone === 'fail'
                      ? 'border-rose-500/25 bg-rose-500/10'
                      : 'border-cyan-400/20 bg-cyan-500/5'
                }`}
              >
                <div
                  className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1 ${
                    challengeStatus.tone === 'clear'
                      ? 'text-emerald-200'
                      : challengeStatus.tone === 'fail'
                        ? 'text-rose-200'
                        : 'text-cyan-200'
                  }`}
                >
                  {challengeStatus.label}
                </div>
                <p className="text-[10px] leading-relaxed text-slate-200">{challengeStatus.text}</p>
              </div>

              {challengeStatus.tone === 'clear' && nextContractId ? (
                <button
                  type="button"
                  onClick={() => handleOpenHandcraftedContract(nextContractId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
                >
                  Next Contract
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
              {challengeStatus.tone === 'clear' && generatedScenario ? (
                <button
                  type="button"
                  onClick={handleGenerateScenario}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                >
                  Generate Next Challenge
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
              {challengeStatus.tone !== 'clear' ? (
                <button
                  type="button"
                  onClick={() => setHintStep((current) => Math.min(current + 1, currentContract.hints.length))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Show Hint
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-tight">{describePatternProfile(patternProfile)}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Seed {currentContract.seedLabel}</p>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{activeHint}</p>
        </div>
        ) : null}

        {/* 3-COLUMN TACTICAL COMMAND CENTER: 3-6-3 SPLIT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          
          {/* COLUMN 1: FAR LEFT (3/12) - PREDICTOR */}
          <aside className="gsap-fade-up flex flex-col gap-6 lg:col-span-3">
             <ModernPairPredictorCard entries={predictorEntries} region={currentContract.region} />

             <div className="rounded-[1.25rem] border border-white/5 bg-slate-950/40 p-5 shadow-inner backdrop-blur-md">
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
                <ModernRelicCard
                  relic={relic}
                  title="Target Relic"
                  themeColor="cyan"
                  icon={Target}
                  onAction={isPvpPreStartLocked ? undefined : handlePracticeRelicAction}
                  onReset={isPvpPreStartLocked ? undefined : (isPvpMode ? handleResetPvpAttempt : () => resetChallengeMode())}
                  disabled={isPvpPreStartLocked}
                />

                <ModernRelicCard
                  relic={testRelic}
                  title="Setup / Builder"
                  themeColor="violet"
                  icon={FlaskConical}
                  onAction={isPvpPreStartLocked ? undefined : handleTestRelicAction}
                  onReset={isPvpPreStartLocked ? undefined : (isPvpMode ? handleResetPvpAttempt : () => resetChallengeMode())}
                  disabled={isPvpPreStartLocked}
                  footerSlot={
                    <button
                      type="button"
                      onClick={() => setTestRelicLoopMode((current) => !current)}
                      disabled={isPvpPreStartLocked}
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

             {/* 2. SESSION TABLE - CENTER BOTTOM */}
             {/* 2. MISSION BRIEF - CENTER BOTTOM */}
             <div className="rounded-[1.25rem] border border-white/5 bg-slate-950/40 p-5 mt-6">
              {isPvpMode ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                   <Trophy className="h-3 w-3 text-amber-300" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Mission Card</span>
                </div>
                <div className="mb-1 flex items-center justify-between gap-3">
               <div className="text-lg font-black uppercase tracking-tight text-amber-300">{isPvpMode ? 'PVP Score Duel' : currentContract.title}</div>
                  <div className="flex items-center gap-2">
                    {generatedScenario ? (
                      <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100">
                        Generated
                      </div>
                    ) : null}
                    <div className="rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {currentContract.difficulty}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 mb-3">
                  {isPvpMode
                    ? 'You both get the same seed, target relic, and setup tools. Clear the contract first. If both sides fail the contract, the duel ends in a draw.'
                    : describeChallengeMission(currentContract.success)}
                </p>
                {isPvpPreStartLocked ? (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 p-3 mb-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">Match Countdown</div>
                    <p className="mt-1 text-[10px] leading-relaxed text-amber-50/90">
                      Shared seed is locking in. Duel controls unlock in {pvpCountdownLeft}s, then the 5-minute timer begins.
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 mb-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">{isPvpMode ? 'Win Condition' : 'Clear Rule'}</div>
                  <p className="text-[10px] leading-relaxed text-slate-300">
                    {isPvpMode
                      ? `If one side clears the contract and the other fails, the clear wins. If both clear, higher score wins. Mistakes reduce duel score by ${PVP_MISTAKE_SCORE_PENALTY} each. If both fail, the duel is a draw.`
                      : describeChallengeWinRule(currentContract.success)}
                  </p>
                </div>
                {contractTargets.length > 0 ? (
                  <div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 mb-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">{isPvpMode ? 'Contract Target' : 'Goal Checklist'}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {contractTargets.map((target) => (
                        <span key={target} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                          {target}
                        </span>
                      ))}
                    </div>
                    {currentContract.requiresSessionBuilder ? (
                      <p className="mt-3 text-[10px] leading-relaxed text-amber-100/85">
                        Expert v2 rule: no starter session data is given. Use the session builder relic first and let it record raw pairs into the session table.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {isPvpMode ? (
                  <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-3 mb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Set Score Guide</div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300">
                        {formatScoreProfileLabel(scoreGuide.profileId)}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-200">Aim For</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {scoreGuide.targetStats.length > 0 ? scoreGuide.targetStats.map((stat) => (
                            <span key={stat} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">
                              {stat}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-400">No preferred lines found.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-rose-200">Avoid</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {scoreGuide.avoidStats.length > 0 ? scoreGuide.avoidStats.map((stat) => (
                            <span key={stat} className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-rose-100">
                              {stat}
                            </span>
                          )) : (
                            <span className="text-[10px] text-slate-400">No dead lines on this relic.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div
                  className={`rounded-xl border p-3 mb-3 ${
                    challengeStatus.tone === 'clear'
                      ? 'border-emerald-500/25 bg-emerald-500/10'
                      : challengeStatus.tone === 'fail'
                        ? 'border-rose-500/25 bg-rose-500/10'
                        : 'border-cyan-400/20 bg-cyan-500/5'
                  }`}
                >
                  <div
                    className={`text-[9px] font-black uppercase tracking-[0.18em] mb-1 ${
                      challengeStatus.tone === 'clear'
                        ? 'text-emerald-200'
                        : challengeStatus.tone === 'fail'
                          ? 'text-rose-200'
                          : 'text-cyan-200'
                    }`}
                  >
                    {challengeStatus.label}
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-200">{challengeStatus.text}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 mb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{isPvpMode ? 'Attempts' : 'Tries'}</div>
                      <div className="mt-1 text-xl font-black text-amber-200">
                        {isPvpMode ? `${pvpAttemptsUsed}/3` : triesUsed}
                        {!isPvpMode && maxTries ? <span className="text-sm text-slate-500"> / {maxTries}</span> : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mistakes</div>
                      <div className="mt-1 text-2xl font-black text-rose-300">{mistakes}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHintStep((current) => Math.min(current + 1, currentContract.hints.length))}
                      disabled={isPvpPreStartLocked}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Hint
                    </button>
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-300">{activeHint}</p>
                  {isPvpMode && pvpSubmittedAttempt && !pvpBusted ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-violet-200">
                      Your final relic is locked in. You are now waiting for the opponent to finish or bust.
                    </p>
                  ) : null}
                </div>
                {isPvpMode ? (
                  <button
                    type="button"
                    onClick={pvpSubmittedAttempt || pvpBusted || isPvpPreStartLocked ? undefined : (relic.level >= 15 ? handleSubmitPvpAttempt : handleResetPvpAttempt)}
                    disabled={Boolean(pvpSubmittedAttempt || pvpBusted || isPvpPreStartLocked)}
                    className={`mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                      pvpSubmittedAttempt || pvpBusted
                        ? 'cursor-not-allowed border-white/5 bg-white/5 text-slate-600'
                        : relic.level >= 15
                          ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/20'
                          : 'border-violet-400/30 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20'
                    }`}
                  >
                    {pvpSubmittedAttempt
                      ? 'Final Relic Submitted'
                      : pvpBusted
                        ? 'Duel Lost'
                        : relic.level >= 15
                          ? `Submit Final Relic`
                          : pvpAttemptsUsed >= 3
                            ? 'Reset Loses Duel'
                            : `Reset To Try ${pvpAttemptsUsed + 1}`}
                    {(!pvpSubmittedAttempt && !pvpBusted)
                      ? <ChevronRight className="h-4 w-4" />
                      : null}
                  </button>
                ) : null}
                {challengeStatus.tone === 'clear' && nextContractId && !isPvpMode ? (
                  <button
                    type="button"
                    onClick={() => handleOpenHandcraftedContract(nextContractId)}
                    className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
                  >
                    Next Contract
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
                {challengeStatus.tone === 'clear' && generatedScenario && !isPvpMode ? (
                  <button
                    type="button"
                    onClick={handleGenerateScenario}
                    className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                  >
                    Generate Next Challenge
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-tight">{describePatternProfile(patternProfile)}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Seed {currentContract.seedLabel}</p>
                </div>
              </>
              ) : (
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Challenge Intel</div>
                      <div className="mt-1 text-[10px] leading-relaxed text-slate-300">
                        Use the predictor on the left, builder/target relics above, then compare your read against the line helper before committing.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHintStep((current) => Math.min(current + 1, currentContract.hints.length))}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition-all hover:bg-cyan-500/20"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      Hint
                    </button>
                  </div>
                </div>
              )}
              </div>
          </section>

          {/* COLUMN 3: FAR RIGHT (3/12) - STATS & INTEL */}
          <aside className="gsap-fade-up flex flex-col gap-6 lg:col-span-3">
             {/* FORCE RELIC */}
             <ForceRelicCard
                relic={forceRelic}
                onPrime={isPvpPreStartLocked ? undefined : handlePrimeForceRelic}
                onReset={isPvpPreStartLocked ? undefined : handleResetForceRelic}
                onCycleType={isPvpPreStartLocked ? undefined : handleCycleForceRelicType}
                disabled={isPvpPreStartLocked}
             />

             <div className="relic-session-container mt-2">
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

      {isPvpPreStartLocked ? (
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
          <div className="w-full max-w-5xl rounded-[1.8rem] border border-white/10 bg-[#0A0F1B]/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-200">Match Results</div>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
                  {pvpRoom?.winnerUserId
                    ? (pvpRoom?.winnerUserId === String(user?.id || '') ? 'You Won The Duel' : `${pvpOpponent?.name || 'Opponent'} Won The Duel`)
                    : 'Match Draw'}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {pvpRoom?.winnerUserId
                    ? (pvpRoom?.winnerUserId === String(user?.id || '')
                      ? 'Your submitted relic satisfied the duel rules better than the opponent.'
                      : `${pvpOpponent?.name || 'Opponent'} satisfied the duel rules better than you did.`)
                    : 'Neither side cleared the contract, so the duel ended in a draw.'}
                </p>
                {(localResultUsesTimeout || opponentResultUsesTimeout) ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-200">
                    Timeout rule: unfinished relics were scored from their live level with a reduced timeout value.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {pvpViewerRole === 'host' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRerollPvpMatch}
                      className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                    >
                      <Dice5 className="h-4 w-4" />
                      Reroll Relics & Restart
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartPvpMatch}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/20"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Restart Same Match
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowPvpResults(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/25 text-slate-200 transition hover:border-white/20 hover:text-white"
                  aria-label="Close results"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.35rem] border border-cyan-400/15 bg-cyan-500/6 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">You</div>
                    <div className="mt-1 text-xl font-black uppercase text-white">{localPvpState.displayName || 'Player'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Best Attempt</div>
                    <div className={`mt-1 text-sm font-black uppercase ${localResultUsesTimeout ? 'text-amber-200' : localPvpState.bestScore > 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {localResultUsesTimeout ? 'Timed Out' : localPvpState.bestScore > 0 ? 'Submitted' : 'None'}
                    </div>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-5 gap-3 text-center">
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Score</div>
                    <div className="mt-1 text-lg font-black text-white">{localResultScore}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Grade</div>
                    <div className="mt-1 text-lg font-black text-amber-200">{localResultGrade}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mistakes</div>
                    <div className="mt-1 text-lg font-black text-rose-200">{localResultMistakes}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Attempts</div>
                    <div className="mt-1 text-lg font-black text-slate-100">{localPvpState.attemptsUsed ?? 0} / 3</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Helpful</div>
                    <div className="mt-1 text-lg font-black text-emerald-200">{localResultHelpful}</div>
                  </div>
                </div>
                <ResultRelicCard relic={localBestRelicSnapshot} title={localPvpState.status === 'timeout' ? 'Timed Out Relic' : 'Best Target Relic'} accent="cyan" />
              </div>

              <div className="rounded-[1.35rem] border border-rose-400/15 bg-rose-500/6 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200">Opponent</div>
                    <div className="mt-1 text-xl font-black uppercase text-white">{pvpOpponent?.name || 'Opponent'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Best Attempt</div>
                    <div className={`mt-1 text-sm font-black uppercase ${opponentResultUsesTimeout ? 'text-amber-200' : Number(pvpOpponent?.state?.bestScore || 0) > 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {opponentResultUsesTimeout ? 'Timed Out' : Number(pvpOpponent?.state?.bestScore || 0) > 0 ? 'Submitted' : 'None'}
                    </div>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-5 gap-3 text-center">
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Score</div>
                    <div className="mt-1 text-lg font-black text-white">{opponentResultScore}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Grade</div>
                    <div className="mt-1 text-lg font-black text-amber-200">{opponentResultGrade}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mistakes</div>
                    <div className="mt-1 text-lg font-black text-rose-200">{opponentResultMistakes}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Attempts</div>
                    <div className="mt-1 text-lg font-black text-slate-100">{pvpOpponent?.state?.attemptsUsed ?? 0} / 3</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 px-3 py-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Helpful</div>
                    <div className="mt-1 text-lg font-black text-emerald-200">{opponentResultHelpful}</div>
                  </div>
                </div>
                <ResultRelicCard relic={opponentBestRelicSnapshot} title={String(pvpOpponent?.state?.status || '') === 'timeout' ? 'Timed Out Relic' : 'Best Target Relic'} accent="rose" />
              </div>
            </div>

            {opponentDebugLog.length > 0 ? (
              <div className="mt-5 rounded-[1.35rem] border border-violet-400/15 bg-violet-500/6 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">Bot Decision Trace</div>
                    <div className="mt-1 text-sm text-slate-300">Expert debug log of what the bot looked at and why it moved.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyBotTrace}
                      className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100 transition hover:bg-violet-500/20"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedBotTrace ? 'Copied' : 'Copy Trace'}
                    </button>
                    <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {opponentDebugLog.length} steps
                    </div>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/5 bg-black/25 p-3">
                  <div className="space-y-2">
                    {opponentDebugLogNewestFirst.map((entry, index) => (
                      <div key={`${index}-${entry.slice(0, 24)}`} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[10px] leading-relaxed text-slate-200">
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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
