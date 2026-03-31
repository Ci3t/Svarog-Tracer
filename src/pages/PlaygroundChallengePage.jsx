import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft,
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
import {
  createBucketPatternProfile,
  getVisibleRollForUpgrade,
  describePatternProfile,
  advancePatternProfile,
} from '../utils/playgroundPatternProfiles';

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
    seedMood,
    ...meta,
    level: 0,
    lastLine: null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat,
    orderMode: 'random',
    lines: subs.slice(0, 3).map((stat, index) => ({
      slot: index + 1,
      stat,
      hits: 0,
      justHit: false,
    })),
    fourthLine: {
      slot: 4,
      stat: subs[3],
      hits: 0,
      justHit: false,
    },
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
    ...meta,
    level: readyForUpgrades ? 3 : 0,
    lastLine: readyForUpgrades ? (Number.isInteger(carryLine) ? carryLine : 4) : null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat,
    orderMode: 'random',
    lines: [
      { slot: 1, stat: subs[0], hits: 0, justHit: false },
      { slot: 2, stat: subs[1], hits: 0, justHit: false },
      { slot: 3, stat: subs[2], hits: 0, justHit: false },
    ],
    fourthLine: {
      slot: 4,
      stat: subs[3],
      hits: 0,
      justHit: false,
    },
    hasFourthLine: readyForUpgrades,
  };
}

function createForceRelic(baseLines = 2) {
  const mainStat = MAIN_STATS[Math.floor(Math.random() * MAIN_STATS.length)];
  const used = new Set([mainStat]);
  const subs = pickUniqueRandom(SUBSTATS, 4, used);
  const meta = createRelicMeta();
  return {
    ...meta,
    mainStat,
    baseLines,
    currentLineCount: baseLines,
    forcedLine: Math.min(baseLines + 1, 4),
    isPrimed: false,
    lines: [
      { slot: 1, stat: subs[0], hits: 0, justHit: false },
      { slot: 2, stat: subs[1], hits: 0, justHit: false },
      { slot: 3, stat: subs[2], hits: 0, justHit: false },
      { slot: 4, stat: subs[3], hits: 0, justHit: false },
    ],
  };
}

function getFixedRelicMeta(setNameHint, pieceLabel) {
  const setInfo =
    relicSets.find((entry) => entry?.name?.toLowerCase().includes(setNameHint.toLowerCase())) || relicSets[0] || {};
  return {
    setName: setInfo?.name || 'Challenge Set',
    setImage: setInfo?.image || '',
    pieceLabel,
  };
}

function createChallengeRelic(spec, options = {}) {
  const { readyForUpgrades = false, carryLine = null } = options;
  const meta = getFixedRelicMeta(spec.setNameHint, spec.pieceLabel);
  const lineStats = Array.isArray(spec.lines) ? spec.lines : [];
  return {
    ...meta,
    seedMood: 'mixed',
    level: readyForUpgrades ? 3 : 0,
    lastLine: readyForUpgrades ? (Number.isInteger(carryLine) ? carryLine : 4) : null,
    lastRawPair: '',
    lastVisibleRoll: '',
    mainStat: spec.mainStat,
    orderMode: 'fixed',
    lines: lineStats.slice(0, 3).map((stat, index) => ({
      slot: index + 1,
      stat,
      hits: 0,
      justHit: false,
    })),
    fourthLine: {
      slot: 4,
      stat: spec.fourthLine,
      hits: 0,
      justHit: false,
    },
    hasFourthLine: readyForUpgrades || Boolean(spec.hasFourthLine),
  };
}

function createChallengeForceRelic(spec) {
  const meta = getFixedRelicMeta(spec.setNameHint, spec.pieceLabel);
  return {
    ...meta,
    mainStat: spec.mainStat,
    baseLines: spec.baseLines,
    currentLineCount: spec.baseLines,
    forcedLine: Math.min(spec.baseLines + 1, 4),
    isPrimed: false,
    lines: spec.lines.map((stat, index) => ({
      slot: index + 1,
      stat,
      hits: 0,
      justHit: false,
    })),
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

function getLineHitsByStat(relic) {
  return [...relic.lines, relic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = line.hits;
    return acc;
  }, {});
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
              <span className="text-[11px] font-black uppercase text-white tracking-wide">{relic.mainStat}</span>
           </div>
           <Zap className={`relative z-10 h-3 w-3 ${themeClasses.text} opacity-20`} />
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
                    <span className={`text-[10px] font-black uppercase tracking-tight ${line.justHit ? 'text-white' : 'text-slate-500'}`}>
                      {line.stat}
                    </span>
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
                  <span className="text-[9px] font-black uppercase text-slate-800">{relic.fourthLine.stat}</span>
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
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              relic.level >= 15 
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-700 transition-all hover:bg-rose-500/10 hover:text-rose-400"
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

function ForceRelicCard({ relic, onPrime, onReset, onCycleType }) {
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
              className="rounded-lg border border-white/5 bg-white/5 p-1.5 text-slate-600 transition-colors hover:text-white"
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
            disabled={relic.isPrimed}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
              relic.isPrimed
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-[8px] font-black uppercase tracking-[0.15em] text-slate-700 transition-all hover:bg-rose-500/10 hover:text-rose-400"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </article>
  );
}

export default function PlaygroundChallengePage({ sessionTheme = 'modern' }) {
  const themeConfig = getSessionThemeConfig(sessionTheme);
  const navigate = useNavigate();
  const [currentContractId, setCurrentContractId] = useState('easy01');
  const [completedContracts, setCompletedContracts] = useState([]);
  const currentContract = useMemo(() => getChallengeContract(currentContractId), [currentContractId]);
  const seedMood = currentContract.mood;
  const bucketKey = currentContract.seedLabel;
  const [patternProfile, setPatternProfile] = useState(() => createChallengePatternProfile(currentContract));
  const [relic, setRelic] = useState(() => createChallengeRelic(currentContract.targetRelic));
  const [testRelic, setTestRelic] = useState(() => createChallengeRelic(currentContract.builderRelic));
  const [forceRelic, setForceRelic] = useState(() => createChallengeForceRelic(currentContract.forceRelic));
  const [sessionRolls, setSessionRolls] = useState(() => createChallengeSessionEntries(currentContract));
  const [hintVisible, setHintVisible] = useState(false);
  const [sessionTab, setSessionTab] = useState('current');
  const [rollInput, setRollInput] = useState('');
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
  const moodConfig = SEED_MOODS[seedMood];
  const hintText = useMemo(() => describeHint(relic, patternProfile), [relic, patternProfile]);
  const predictorEntries = useMemo(() => buildEntryRows(sessionRolls), [sessionRolls]);
  const translatedRolls = useMemo(() => sessionRolls.map((entry) => entry.translated), [sessionRolls]);
  const prediction2 = useMemo(() => predictWithPairs(translatedRolls, { region: currentContract.region }), [translatedRolls, currentContract.region]);
  const helperLineOverride = forceRelic.isPrimed
    ? forceRelic.forcedLine
    : relic.lastLine || testRelic.lastLine || null;
  const activeHint = hintStep > 0 ? currentContract.hints[Math.min(hintStep - 1, currentContract.hints.length - 1)] : 'No hint opened yet.';
  const lineHitsByStat = useMemo(() => getLineHitsByStat(relic), [relic]);
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
      const critRateHitCount = lineHitsByStat['CRIT RATE'] || 0;
      const critDmgHitCount = lineHitsByStat['CRIT DMG'] || 0;
      const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

      if (critRateHitCount >= (success.minEach || 1) && critDmgHitCount >= (success.minEach || 1) && passedJunkGate) {
        return {
          tone: 'clear',
          label: 'Contract Clear',
          text: `Dual-crit path confirmed: CRIT RATE ${critRateHitCount}, CRIT DMG ${critDmgHitCount}.`,
        };
      }

      return {
        tone: 'fail',
        label: 'Contract Failed',
        text: `You finished with CRIT RATE ${critRateHitCount}, CRIT DMG ${critDmgHitCount}, and ${junkHitCount} junk-side hits. Dual-crit means both crit lines must be hit.`,
      };
    }

    if (success.type === 'dualCritCombined') {
      const critRateHitCount = lineHitsByStat['CRIT RATE'] || 0;
      const critDmgHitCount = lineHitsByStat['CRIT DMG'] || 0;
      const combinedHits = critRateHitCount + critDmgHitCount;
      const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

      if (combinedHits >= (success.minCombined || 2) && passedJunkGate) {
        return {
          tone: 'clear',
          label: 'Contract Clear',
          text: `Crit-favored finish confirmed: CRIT RATE ${critRateHitCount}, CRIT DMG ${critDmgHitCount}, junk ${junkHitCount}.`,
        };
      }

      return {
        tone: 'fail',
        label: 'Contract Failed',
        text: `You finished with CRIT RATE ${critRateHitCount}, CRIT DMG ${critDmgHitCount}, and ${junkHitCount} junk-side hits. This contract needs at least ${(success.minCombined || 2)} combined crit hits.`,
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
  const nextContractId = useMemo(() => getNextChallengeContractId(currentContract.id), [currentContract.id]);
  const canOpenContract = (contractId) => {
    if (contractId === currentContractId) return true;
    const targetIndex = CHALLENGE_CONTRACT_ORDER.indexOf(contractId);
    if (targetIndex <= 0) return true;
    const previousId = CHALLENGE_CONTRACT_ORDER[targetIndex - 1];
    return completedContracts.includes(previousId);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const q = gsap.utils.selector(containerRef.current);
    gsap.fromTo(q('.gsap-fade-up'), 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (challengeStatus.tone !== 'clear') return;
    setCompletedContracts((existing) => (existing.includes(currentContract.id) ? existing : [...existing, currentContract.id]));
  }, [challengeStatus.tone, currentContract.id]);

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
    setRelic(createChallengeRelic(nextContract.targetRelic));
    setTestRelic(createChallengeRelic(nextContract.builderRelic));
    setForceRelic(createChallengeForceRelic({
      ...nextContract.forceRelic,
      baseLines: nextContract.forceRelic.baseLines,
    }));
    setSessionRolls(createChallengeSessionEntries(nextContract));
    setHintVisible(false);
    setMistakes(0);
    setHintStep(0);
    setSecondsLeft(300);
    setTimerRunning(false);
    setTriesUsed((current) => (incrementTry ? current + 1 : 1));
  };

  useEffect(() => {
    resetChallengeMode({ nextContract: currentContract, incrementTry: false });
  }, [currentContract]);

  const handleStartSession = () => {
    setTimerRunning(true);
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
        fourthLine: { ...currentRelic.fourthLine, justHit: false },
      };
    }

    if (currentRelic.level >= 15) return currentRelic;

    const nextSequenceIndex = Array.isArray(currentPatternProfile?.history) ? currentPatternProfile.history.length : 0;
    const visibleRoll = getVisibleRollForUpgrade(currentPatternProfile, nextSequenceIndex);
    const previousLine = Number.isInteger(forcedSlot) ? forcedSlot : (currentRelic.lastLine || 4);
    const { rawPair, targetSlot } = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
    const nextLevel = Math.min(currentRelic.level + 3, 15);
    const activeLines = [...currentRelic.lines, currentRelic.fourthLine].map((line) => ({
      ...line,
      hits: line.slot === targetSlot ? line.hits + 1 : line.hits,
      justHit: line.slot === targetSlot,
    }));

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
    const nextRelic = handleBaseUpgrade(relic, patternProfile, forceRelic.isPrimed && relic.hasFourthLine ? forceRelic.forcedLine : null);
    setRelic(nextRelic);

    if (nextRelic.level > relic.level && nextRelic.lastVisibleRoll) {
      setPatternProfile((current) => advancePatternProfile(current, nextRelic.lastVisibleRoll));
    }

    if (forceRelic.isPrimed && relic.hasFourthLine) {
      setForceRelic(createForceRelic(forceRelic.baseLines));
    } else if (relic.hasFourthLine && nextRelic.lastLine && ![1, 2].includes(nextRelic.lastLine)) {
      setMistakes((current) => current + 1);
    }
  };

  const handleTestRelicAction = () => {
    const startingRelic =
      testRelicLoopMode && testRelic.level >= 15
        ? createChallengeRelic(currentContract.builderRelic, { readyForUpgrades: true, carryLine: testRelic.lastLine })
        : testRelic;
    const nextRelic = handleBaseUpgrade(startingRelic, patternProfile);
    setTestRelic(nextRelic);

    const previousLevel = startingRelic.level;
    if (nextRelic.level > previousLevel && nextRelic.lastVisibleRoll) {
      setPatternProfile((current) => advancePatternProfile(current, nextRelic.lastVisibleRoll));
    }
  };

  const handleAddManualRoll = () => {
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
    setSessionRolls((existing) => existing.filter((entry) => entry.id !== entryId));
  };

  const handlePrimeForceRelic = () => {
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
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: forceRelic.baseLines,
    }));
  };

  const handleCycleForceRelicType = () => {
    const nextBaseLines = forceRelic.baseLines >= 3 ? 1 : forceRelic.baseLines + 1;
    setForceRelic(createChallengeForceRelic({
      ...currentContract.forceRelic,
      baseLines: nextBaseLines,
    }));
  };

  return (
    <div ref={containerRef} className={`min-h-screen bg-[#080B14] text-slate-200 relative ${themeConfig.rootClassName || ''}`}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(ellipse_at_center,rgba(15,18,25,0.7),#080B14)]" />
      </div>

      <ModernStickyHeader
        secondsLeft={secondsLeft}
        onStart={handleStartSession}
        onStop={() => setTimerRunning(false)}
        onRestart={() => resetChallengeMode()}
        timerRunning={timerRunning}
        rollInput={rollInput}
        setRollInput={setRollInput}
        onAddRoll={handleAddManualRoll}
        entriesCount={predictorEntries.length}
      />

      <div className="relative z-10 mx-auto max-w-[1900px] px-4 pt-16 pb-12 md:px-6 md:pt-20">
        
        <header className="gsap-fade-up mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/playground')} className="text-slate-700 hover:text-slate-500 transition-colors">
               <ArrowLeft className="h-5 w-5" />
             </button>
             <h1 className="text-xl font-black uppercase tracking-tighter text-white/90">
               Challenge <span className="text-rose-400/70 text-sm tracking-widest pl-2">CONTRACT</span>
             </h1>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 px-4 py-2">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-300">Static Contract Seed</div>
          </div>
        </header>

        <div className="gsap-fade-up mb-6 flex flex-wrap items-center gap-2">
          {CHALLENGE_CONTRACT_ORDER.map((contractId) => {
            const contract = getChallengeContract(contractId);
            const isCurrent = contractId === currentContractId;
            const isUnlocked = canOpenContract(contractId);
            const isCompleted = completedContracts.includes(contractId);
            return (
              <button
                key={contractId}
                type="button"
                disabled={!isUnlocked}
                onClick={() => setCurrentContractId(contractId)}
                className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                  isCurrent
                    ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                    : isUnlocked
                      ? 'border-white/5 bg-black/30 text-slate-300 hover:border-white/10 hover:text-white'
                      : 'cursor-not-allowed border-white/5 bg-white/5 text-slate-700'
                }`}
              >
                {contract.title}
                {isCompleted ? ' • Clear' : ''}
              </button>
            );
          })}
        </div>

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
                  onAction={handlePracticeRelicAction}
                  onReset={() => resetChallengeMode()}
                />

                <ModernRelicCard
                  relic={testRelic}
                  title="Setup / Builder"
                  themeColor="violet"
                  icon={FlaskConical}
                  onAction={handleTestRelicAction}
                  onReset={() => resetChallengeMode()}
                  footerSlot={
                    <button
                      type="button"
                      onClick={() => setTestRelicLoopMode((current) => !current)}
                      className={`mt-1 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] transition-all ${
                        testRelicLoopMode
                          ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                          : 'border-white/5 bg-white/5 text-slate-600'
                      }`}
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
                <div className="flex items-center gap-2 mb-3">
                   <Trophy className="h-3 w-3 text-amber-300" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">MISSION</span>
                </div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="text-lg font-black uppercase tracking-tight text-amber-300">{currentContract.title}</div>
                  <div className="rounded-full border border-white/5 bg-black/30 px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {currentContract.difficulty}
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 mb-3">{currentContract.goal}</p>
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 mb-3">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 mb-1">Win Condition</div>
                  <p className="text-[10px] leading-relaxed text-slate-300">{currentContract.win}</p>
                </div>
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
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Tries</div>
                      <div className="mt-1 text-xl font-black text-amber-200">{triesUsed}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mistakes</div>
                      <div className="mt-1 text-2xl font-black text-rose-300">{mistakes}</div>
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
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-300">{activeHint}</p>
                </div>
                {challengeStatus.tone === 'clear' && nextContractId ? (
                  <button
                    type="button"
                    onClick={() => setCurrentContractId(nextContractId)}
                    className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/12 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition-all hover:bg-emerald-500/20"
                  >
                    Next Contract
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-tight">{describePatternProfile(patternProfile)}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Seed {currentContract.seedLabel}</p>
                </div>
              </div>
          </section>

          {/* COLUMN 3: FAR RIGHT (3/12) - STATS & INTEL */}
          <aside className="gsap-fade-up flex flex-col gap-6 lg:col-span-3">
             {/* FORCE RELIC */}
             <ForceRelicCard
                relic={forceRelic}
                onPrime={handlePrimeForceRelic}
                onReset={handleResetForceRelic}
                onCycleType={handleCycleForceRelicType}
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

      <style dangerouslySetInnerHTML={{ __html: `
        .relic-session-container .astral-session-table .overflow-auto {
           max-height: 355px !important;
        }
      `}} />
    </div>
  );
}
