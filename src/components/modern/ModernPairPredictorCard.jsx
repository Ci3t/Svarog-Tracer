/**
 * ModernPairPredictorCard — Two-Tier Layout
 *
 * 5s Glance (always visible):
 *   - Mode badge + reason line
 *   - YOUR 2 PICKS: commons displayed prominently, leaning indicator on prediction
 *   - ⚡ Watch if noise is likely
 *
 * 30s Explore (expandable):
 *   - Trends, Pair matrix, Noise gap analysis, Run/Flip data
 */
import React, { useEffect, useMemo, useState } from 'react';
import { predictWithPairs } from '../../utils/pairTransitionPredictor';
import { withBaseUrl } from '../../utils/assetPaths';

const VALUES = ['41', '42', '43', '44'];

// Badge styles per label prefix
function getBadgeStyle(label = '') {
  if (label.includes('Running')) return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50';
  if (label.includes('Alternating')) return 'bg-blue-500/25 text-blue-300 border-blue-500/50';
  if (label.includes('Shifted') || label.includes('Sequence') || label.includes('Pair')) return 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50';
  if (label.includes('Overdue')) return 'bg-amber-500/25 text-amber-300 border-amber-500/50';
  if (label.includes('Recovery')) return 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50';
  if (label.includes('Chaotic') || label.includes('Trap')) return 'bg-orange-500/25 text-orange-300 border-orange-500/50';
  if (label.includes('Warming')) return 'bg-slate-500/25 text-slate-400 border-slate-500/50';
  return 'bg-violet-500/25 text-violet-300 border-violet-500/50';
}

// Card border/glow depends on session state
function getCardStyle(isChaotic, isWarming) {
  if (isWarming) return 'border-slate-600/40 shadow-slate-900/60';
  if (isChaotic) return 'border-orange-500/50 shadow-orange-900/30';
  return 'border-violet-500/30 shadow-violet-900/20';
}

// Tooltip content per badge label
const BADGE_TOOLTIPS = {
  '🔥 Running':    { desc: 'One value is dominant — keep picking it.',      ex: 'e.g. 42 42 42 → keep picking 42' },
  '🔄 Alternating': { desc: 'Two values are flip-flopping.',               ex: 'e.g. 41 42 41 42 → next: 41' },
  '🔀 Shifted':     { desc: 'A noise value is taking over.',               ex: 'e.g. 43 stealing 41’s spot' },
  '🔁 Sequence':    { desc: 'A 2-roll pattern repeats.',                  ex: 'e.g. after 42→43, seen 60%' },
  '🎯 Pair':        { desc: 'Based on what follows the last roll.',       ex: 'e.g. after 42, 41 came most' },
  '🔔 Overdue':     { desc: 'A value hasn’t appeared in a while — due.',  ex: 'e.g. 44 missing 7 rolls' },
  '🌀 Recovery':    { desc: 'After noise, a common tends to return.',    ex: 'e.g. 43 comes back after noise 3×' },
  '⚠️ Chaotic':    { desc: 'No clear pattern — session is random.',     ex: 'e.g. all values ~25% each' },
  '⏳ Warming Up':  { desc: 'Too few rolls to detect patterns yet.',     ex: 'Need 6+ rolls to start' },
};

export default function ModernPairPredictorCard({
  entries = [],
  region,
  advancedToggleId,
  advancedPanelId,
  tutorialIds = {},
  onTrustGuideChange,
  onAdvancedToggleChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTrendGlossary, setActiveTrendGlossary] = useState(null);

  useEffect(() => {
    onAdvancedToggleChange?.(expanded);
  }, [expanded, onAdvancedToggleChange]);

  // Extract 2-str rolls from entries
  const rolls = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    return entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
  }, [entries]);

  const data = useMemo(() => predictWithPairs(rolls, { region }), [rolls, region]);

  const isWarming = !data.prediction;


  const {
    prediction, alt, confidence, method, label, reasonLine,
    noiseWatch, overdueNoise, isChaotic,
    pairMatrix, lastRoll, last2Rolls, waveSignals, trends,
    commons, noise, distribution,
    momentumScores, currentRunLen, lastSeen, overdueValues, mostOverdue,
    commonsFlipDetected, newCommons, flipConfidence,
    noiseRate, alternatingPair, shiftedToValue, gram2Confidence,
    isAlternating,
    trustedPair, pairSafety, noiseRisk, freshOutsider, mixedWindow, pairScoreGap,
    analyzerPrediction, analyzerAlt,
    analyzerDecisionScores,
    analyzerFinalScores,
    analyzerCommonDecisionScores, analyzerNoiseDecisionScores,
    analyzerBreakChallenge,
    analyzerMode, analyzerNoiseTiming, analyzerNoiseDueRatio,
    // 🆕 Noise Trap
    isNoiseTrap, trapCandidate, noiseTrapProb, inRedZone, commonsSinceNoise, avgNoiseGap,
    // 🚨 Emergency brake
    isSessionReset
  } = data;

  // 🚨 SESSION RESET early return moved to AFTER all hooks (see below)

  const confidencePct = Math.round(confidence * 100);
  const cardStyle = getCardStyle(isChaotic, false);
  const badgeStyle = getBadgeStyle(label);
  const trendGlossary = {
    share: {
      label: 'Trend share',
      tone: 'text-slate-200',
      body: 'Trend share is the visible percent. It tells you how much this value owns the latest 5-roll trend window.',
      examples: [
        '42 at 40% share means 42 owned 40% of the recent window.',
        '20% share means the value is present, but not driving the board by itself.',
      ],
    },
    trust: {
      label: 'Trust',
      tone: 'text-cyan-200',
      body: 'Trust is internal confidence in the arrow direction itself. It is not the same thing as the visible share.',
      examples: [
        '100% trust means the predictor strongly believes the value is really rising.',
        '25% trust means the arrow is weak and easier to distrust even if the value still appears.',
      ],
    },
    freshness: {
      label: 'Freshness',
      tone: 'text-amber-200',
      body: 'Freshness tells you how new or old that arrow state is. It answers whether the push just started or has been lingering.',
      examples: [
        'Fresh = this move is new and lively.',
        'Low freshness means the arrow may still be valid, but it is getting old.',
      ],
    },
    state: {
      label: 'Fresh / Held / Stale',
      tone: 'text-violet-200',
      body: 'These are the freshness state labels. They tell you how long the same arrow has been alive.',
      examples: [
        'Fresh = the arrow changed this window.',
        'Held = the same arrow survived another window.',
        'Stale = the same arrow has repeated long enough that you should start watching for a break.',
      ],
    },
    examples: {
      label: 'Examples',
      tone: 'text-emerald-200',
      body: 'Use share, trust, and freshness together. One number alone is not the whole read.',
      examples: [
        '40% share + 100% trust + fresh = strong emerging read.',
        '40% share + 100% trust + stale = still alive, but watch for a break.',
        '20% share + 25% trust = visible, but the direction is weak and unreliable.',
      ],
    },
  };

  // ── Dynamic tooltip: uses real session data ──────────────────────────────
  const tooltip = useMemo(() => {
    if (!label) return null;
    // Count how many times a value appeared after lastRoll in pairMatrix
    const pairCount = (from, to) => {
      const d = pairMatrix?.[from]?.[to];
      return typeof d === 'object' ? d.samples : 0;
    };
    const pairPctVal = (from, to) => {
      const d = pairMatrix?.[from]?.[to];
      return typeof d === 'object' ? d.pct : (d || 0);
    };
    // Build a live example per mode
    let desc = '';
    let ex = '';
    if (label.includes('Running')) {
      desc = prediction + ' is dominant - keep picking it.';
      const run = currentRunLen >= 2 ? currentRunLen : 2;
      const streak = Array(run).fill(prediction).join(' ');
      ex = `${streak} -> keep picking ${prediction}`;
    } else if (label.includes('Alternating')) {
      desc = 'Two values are flip-flopping.';
      const p = isAlternating && alternatingPair?.length === 2 ? alternatingPair : commons;
      ex = `${p[0]} ${p[1]} ${p[0]} ${p[1]} -> next: ${prediction}`;
    } else if (label.includes('Shifted')) {
      desc = 'A value is rising and the board may be shifting.';
      ex = `${shiftedToValue || noise[0]} rising -> lean on ${prediction}`;
    } else if (label.includes('Sequence')) {
      desc = 'A 2-roll pattern is repeating this session.';
      const conf = gram2Confidence > 0 ? `${Math.round(gram2Confidence)}%` : '';
      ex = `after ${last2Rolls || '??'} -> ${prediction}${conf ? ` (${conf})` : ""} this session`;
    } else if (label.includes('Pair')) {
      desc = 'This read comes from what usually follows the last roll.';
      const allVals = [...(commons || []), ...(noise || [])];
      const topActual = allVals
        .map(v => ({ value: v, pct: pairPctVal(lastRoll, v), cnt: pairCount(lastRoll, v) }))
        .sort((a, b) => b.pct - a.pct)[0];
      const predPct = pairPctVal(lastRoll, prediction);
      const predCnt = pairCount(lastRoll, prediction);

      if (topActual && topActual.value !== prediction && topActual.pct > 0) {
        ex = `after ${lastRoll} -> ${topActual.value} most (${topActual.pct}%) | commons pick: ${prediction} (${predPct}%)`;
      } else {
        ex = predPct > 0
          ? `after ${lastRoll} -> ${prediction} appeared ${predCnt > 0 ? `${predCnt}x ` : ""}(${predPct}%) this session`
          : `after ${lastRoll} -> ${prediction} most likely`;
      }
    } else if (label.includes('Overdue')) {
      desc = prediction + ' has been missing long enough to become live again.';
      const ago = mostOverdue && lastSeen?.[mostOverdue] >= 0 ? lastSeen[mostOverdue] : '?';
      ex = `${prediction} missing ${ago} rolls this session`;
    } else if (label.includes('Recovery')) {
      desc = 'After noise, the board often returns to a common value.';
      ex = reasonLine;
    } else if (label.includes('Chaotic') || label.includes('Trap')) {
      desc = 'The board is messy enough that noise pressure is part of the read.';
      ex = `session noise: ${noiseRate ?? "?"}% - no clear winner`;
    } else if (label.includes('Warming')) {
      desc = 'There is not enough session history yet.';
      ex = `${rolls.length} / 6 rolls recorded so far`;
    }

    return { desc, ex };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, prediction, lastRoll, last2Rolls, currentRunLen, noiseRate, rolls.length]);

  const trustGuideAssistText = useMemo(() => {
    const displayPair = trustedPair?.length === 2 ? trustedPair : commons;
    const analyzerPicks = [];
    if (analyzerPrediction) analyzerPicks.push(analyzerPrediction);
    if (analyzerAlt && analyzerAlt !== analyzerPrediction) analyzerPicks.push(analyzerAlt);
    if (!analyzerPicks.length) return null;

    const analyzerMatchesLane = analyzerPicks.some((pick) => displayPair?.includes(pick));
    const analyzerLeadsOutsider = freshOutsider?.value && analyzerPrediction === freshOutsider.value;
    const analyzerSupport = trends?.[analyzerPrediction]?.supportScore ?? 0;
    const analyzerSupportTier = trends?.[analyzerPrediction]?.supportTier ?? 'weak';

    if (pairSafety === 'danger' && analyzerLeadsOutsider) {
      if (analyzerSupport >= 55) {
        return `Svarog has real backing here: ${freshOutsider.value} is carrying the live break-pressure read on a fragile pair.`;
      }
      return `Svarog sees ${freshOutsider.value} pressure, but the support is only ${analyzerSupportTier}. Treat it as a watch signal, not a free click.`;
    }
    if (pairSafety === 'safe') {
      return 'Trust the commons lane here. Use Svarog Eye mainly as a confirmation layer.';
    }
    if (pairSafety === 'caution' && analyzerMatchesLane) {
      return 'The board is shaky, but the commons lane and Svarog Eye still overlap. Keep the main lane first.';
    }
    if (pairSafety === 'caution' && !analyzerMatchesLane) {
      return 'Mixed pressure. Keep the lane as baseline, but watch Svarog Eye if the outsider keeps repeating.';
    }
    return null;
  }, [
    analyzerAlt,
    analyzerPrediction,
    commons,
    freshOutsider?.value,
    pairSafety,
    trustedPair,
  ]);

  useEffect(() => {
    if (!onTrustGuideChange) return;
    onTrustGuideChange(trustGuideAssistText);
  }, [onTrustGuideChange, trustGuideAssistText]);

  const noiseOrder = useMemo(() => {
    if (!Array.isArray(analyzerNoiseDecisionScores) || analyzerNoiseDecisionScores.length === 0) return [];
    return analyzerNoiseDecisionScores
      .map((entry) => entry?.value)
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .slice(0, 2);
  }, [analyzerNoiseDecisionScores]);
  const commonOrder = useMemo(() => {
    if (!Array.isArray(analyzerCommonDecisionScores) || analyzerCommonDecisionScores.length === 0) return [];
    return analyzerCommonDecisionScores
      .map((entry) => entry?.value)
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .slice(0, 2);
  }, [analyzerCommonDecisionScores]);
  const commonDecisionMap = useMemo(() => {
    const entries = Array.isArray(analyzerCommonDecisionScores) ? analyzerCommonDecisionScores : [];
    return new Map(entries.map((entry) => [entry.value, entry]));
  }, [analyzerCommonDecisionScores]);
  const noiseDecisionMap = useMemo(() => {
    const entries = Array.isArray(analyzerNoiseDecisionScores) ? analyzerNoiseDecisionScores : [];
    return new Map(entries.map((entry) => [entry.value, entry]));
  }, [analyzerNoiseDecisionScores]);
  const analyzerFinalMap = useMemo(() => {
    const entries = Array.isArray(analyzerFinalScores) ? analyzerFinalScores : [];
    return new Map(entries.map((entry) => [entry.value, entry]));
  }, [analyzerFinalScores]);
  const analyzerPicks = useMemo(() => {
    const picks = [];
    if (analyzerPrediction) picks.push(analyzerPrediction);
    if (analyzerAlt && analyzerAlt !== analyzerPrediction) picks.push(analyzerAlt);

    const breakTopCommon = analyzerBreakChallenge?.topCommon || null;
    const breakTopNoise = analyzerBreakChallenge?.topNoise || null;
    const breakSecondCommon = analyzerBreakChallenge?.secondCommon || null;

    if (picks.length < 2 && analyzerBreakChallenge?.promoted) {
      [breakTopCommon, breakTopNoise].forEach((value) => {
        if (value && !picks.includes(value)) picks.push(value);
      });
    }

    if (picks.length < 2) {
      [commonOrder[0], commonOrder[1], breakSecondCommon, noiseOrder[0], noiseOrder[1]]
        .forEach((value) => {
          if (value && !picks.includes(value)) picks.push(value);
        });
    }

    return picks.slice(0, 2);
  }, [
    analyzerAlt,
    analyzerBreakChallenge,
    analyzerPrediction,
    commonOrder,
    noiseOrder,
  ]);
  const analyzerMain = analyzerPicks[0] || null;
  const analyzerSecond = analyzerPicks[1] || null;
  const breakChallengeSummary = useMemo(() => {
    if (!analyzerBreakChallenge?.allowBreakChallenge) return null;
    const topCommon = analyzerBreakChallenge.topCommon;
    const secondCommon = analyzerBreakChallenge.secondCommon;
    const topNoise = analyzerBreakChallenge.topNoise;
    const hold = analyzerBreakChallenge.secondCommonHoldScore ?? null;
    const challenge = analyzerBreakChallenge.bestNoiseChallengeScore ?? null;
    const margin = analyzerBreakChallenge.margin ?? null;
    if (!topCommon || !secondCommon || !topNoise || hold == null || challenge == null || margin == null) return null;
    const challengerWins = challenge >= hold + margin;
    return {
      challengerWins,
      text: challengerWins
        ? `Hybrid read: keep ${topCommon}, but let ${topNoise} replace ${secondCommon} when break pressure wins (${Math.round(challenge)} vs ${Math.round(hold)}).`
        : `Hybrid read: keep ${topCommon}/${secondCommon}. Noise ${topNoise} is live, but the common hold still wins (${Math.round(hold)} vs ${Math.round(challenge)}).`,
    };
  }, [analyzerBreakChallenge]);

  // 🚨 SESSION RESET: all hooks done — safe to return early now
  if (isSessionReset) {
    return (
      <div className="astral-bbp-card rounded-2xl border border-red-500/60 bg-red-950/30 shadow-lg shadow-red-900/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-red-400 text-lg animate-pulse">🔴</span>
          <span className="text-red-300 text-sm font-bold uppercase tracking-wide">Session Reset Detected</span>
        </div>
        <p className="text-red-200/80 text-[12px] leading-relaxed">
          All 4 values appearing equally (~25%). Server re-salted.<br/>
          <span className="text-red-300 font-semibold">Stand by — skip this window.</span> Patterns return in 5–8 rolls.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {['41','42','43','44'].map(v => (
            <div key={v} className="bg-slate-800/50 rounded-lg p-1.5 text-center">
              <div className="text-slate-300 text-sm font-bold">{v}</div>
              <div className="text-slate-500 text-[10px]">{distribution?.[v] ?? '?'}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Warming-up: render after all hooks have run ───────────────────────────
  if (isWarming) {
    return (
      <div className={`astral-bbp-card bg-gradient-to-br from-slate-800/60 to-slate-900/90 rounded-2xl p-4 border shadow-xl ${getCardStyle(false, true)}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 BBP Mode</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getBadgeStyle('⏳')}`}>⏳ Warming Up</span>
        </div>
        <p className="text-center text-slate-500 py-6 text-xs">Need more rolls — building picture</p>
      </div>
    );
  }

  // Commons display: main = prediction (lean here), alt = other common
  const displayPair = trustedPair?.length === 2 ? trustedPair : commons;
  const mainCommon = displayPair?.includes(prediction) ? prediction : (displayPair || [])[0];
  const altCommon  = displayPair?.includes(alt) && alt !== mainCommon ? alt : (displayPair || []).find(c => c !== mainCommon) || alt;


  // Lean % — use pair matrix probability for each common from last roll
  // Falls back to equal split when noise dominates transitions (prevents 0%/100% display)
  const mainRawPct = pairMatrix?.[lastRoll]?.[mainCommon];
  const altRawPct  = pairMatrix?.[lastRoll]?.[altCommon];
  const mainMatrixPct = typeof mainRawPct === 'object' ? mainRawPct.pct : (mainRawPct || 0);
  const altMatrixPct  = typeof altRawPct  === 'object' ? altRawPct.pct  : (altRawPct  || 0);
  const totalMatrixPct = mainMatrixPct + altMatrixPct;
  // If commons together have < 40% of pair transitions, noise dominates → use equal split
  const pctCap = isChaotic ? 70 : 85;
  const rawMainPct = totalMatrixPct >= 40
    ? Math.round((mainMatrixPct / totalMatrixPct) * 100)
    : confidencePct; // fallback to confidence-based split
  const mainPct = Math.min(Math.max(rawMainPct, 30), pctCap); // also floor at 30% — never show 0%
  const altPct  = 100 - mainPct;
  const pairSpread = Math.abs(mainPct - altPct);
  const splitPairRead = pairSpread <= 14 || (pairSafety !== 'safe' && pairSpread <= 18);
  const playPairText = displayPair?.join(' / ') || `${mainCommon} / ${altCommon}`;
  const decisionLine = splitPairRead
    ? `Play ${playPairText}. No strong side yet — treat both as the live pair.`
    : `Play ${playPairText}. Lean ${mainCommon} first, but keep ${altCommon} live behind it.`;

  // Noise watch values — in chaos show ALL noise values, not just one
  const noiseWatchValues = (() => {
    const watches = new Set();
    if (noiseWatch) watches.add(noiseWatch);
    if (isChaotic && noise) noise.forEach(n => watches.add(n));
    return [...watches];
  })();


  const analyzerMatchesLane = analyzerPicks.some(pick => displayPair?.includes(pick));
  const analyzerAgreesOnMain = analyzerPrediction && displayPair?.includes(analyzerPrediction);
  const followGuide = (() => {
    if (!analyzerPicks.length) return null;
    if (analyzerMode === 'break') {
      return {
        tone: 'analyzer',
        title: 'Svarog Break Mode',
        text: `Noise looks ${analyzerNoiseTiming}. Svarog is ranking ${analyzerPicks.join(' / ')} as the exact next-line pair.`,
      };
    }
    if (analyzerMatchesLane && analyzerAgreesOnMain) {
      return {
        tone: 'good',
        title: splitPairRead ? 'Pair confirmed' : 'Main confirmed',
        text: splitPairRead
          ? 'Lane and analyzer agree on the same 2 picks. Stay on the pair.'
          : 'Lane and analyzer point to the same first lean.',
      };
    }
    if (pairSafety === 'safe') {
      return {
        tone: 'lane',
        title: 'Play the pair',
        text: 'Use the 2 commons first. Treat Svarog as a tie-break or confirmation layer.',
      };
    }
    if (pairSafety === 'danger') {
      return {
        tone: 'analyzer',
        title: 'Fragile pair',
        text: 'Stay on the pair unless the same outsider keeps repeating.',
      };
    }
    return {
      tone: 'split',
      title: 'Mixed board',
      text: 'Keep the pair first. Use Svarog only if break pressure keeps confirming.',
    };
  })();

  const primaryWatchLine = (() => {
    if (isNoiseTrap && trapCandidate) {
      return {
        tone: 'danger',
        text: `Trap: ${trapCandidate} likely next`,
      };
    }
    if (noiseWatchValues.length > 0 && pairSafety !== 'safe') {
      return {
        tone: pairSafety === 'danger' ? 'danger' : 'warn',
        text: `Watch: ${noiseWatchValues.join(', ')} may break the pair`,
      };
    }
    return null;
  })();

  const trustGuideLine = (() => {
    if (!analyzerPicks.length) return null;
    if (analyzerMode === 'break') {
      const ratioPct = Math.round((analyzerNoiseDueRatio || 0) * 100);
      return {
        tone: 'warn',
        text: `Svarog is in break mode here. Exact pair is ${analyzerPicks.join(' / ')}. If you expect a noise hit, trust the noise order shown below first.`,
      };
    }
    const analyzerLeadsOutsider = freshOutsider?.value && analyzerPrediction === freshOutsider.value;
    const analyzerSupport = trends?.[analyzerPrediction]?.supportScore ?? 0;
    const analyzerSupportTier = trends?.[analyzerPrediction]?.supportTier ?? 'weak';
    if (pairSafety === 'danger' && analyzerLeadsOutsider) {
      if (analyzerSupport >= 55) {
        return {
          tone: 'danger',
          text: `Svarog has real backing here: ${freshOutsider.value} is carrying the live break-pressure read on a fragile pair.`,
        };
      }
      return {
        tone: 'warn',
        text: `Svarog sees ${freshOutsider.value} pressure, but the support is only ${analyzerSupportTier}. Treat it as a watch signal, not a free click.`,
      };
    }
    if (pairSafety === 'safe') {
      return {
        tone: 'good',
        text: `Svarog exact pair is ${analyzerPicks.join(' / ')}. Use the noise order only if you think the board is breaking.`,
      };
    }
    if (pairSafety === 'caution' && analyzerMatchesLane) {
      return {
        tone: 'warn',
        text: splitPairRead
          ? 'Board is shaky, but both systems still point to the same pair. Play both commons.'
          : 'Board is shaky, but both systems still point to the same pair. Lean the lane lead first.',
      };
    }
    if (pairSafety === 'caution' && !analyzerMatchesLane) {
      return {
        tone: 'warn',
        text: 'Mixed pressure. Keep playing the pair unless the outsider repeats and proves the break.',
      };
    }
    return null;
  })();

  return (
    <div className={`astral-bbp-card bg-gradient-to-br from-violet-900/20 to-slate-900/90 rounded-2xl border shadow-xl transition-all duration-300 ${cardStyle}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 BBP Mode</span>
        {/* Mode badge with tooltip */}
        <div id={tutorialIds.modeBadgeId} className="relative group">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border cursor-default ${badgeStyle}`}>
            {label}
          </span>
          {/* Hover tooltip */}
          {tooltip && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-56 hidden group-hover:block">
              <div className="bg-slate-800 border border-slate-600/60 rounded-xl shadow-2xl px-3 py-2.5 text-left">
                <p className="text-[11px] text-slate-200 font-medium leading-relaxed">
                  {tooltip.desc}
                </p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono bg-slate-900/60 rounded px-2 py-1">
                  {tooltip.ex}
                </p>
              </div>
              {/* Arrow */}
              <div className="absolute right-3 -top-1.5 w-3 h-3 rotate-45 bg-slate-800 border-l border-t border-slate-600/60" />
            </div>
          )}
        </div>
      </div>

      {/* ── 5s GLANCE SECTION ──────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next 2 picks</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-100">{decisionLine}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decision mode</p>
              <p className={`mt-1 text-[11px] font-semibold ${splitPairRead ? 'text-amber-300' : 'text-violet-300'}`}>
                {splitPairRead ? 'Split pair' : 'Lead + fallback'}
              </p>
            </div>
          </div>
        </div>

        {/* Pair safety strip */}
        <div id={tutorialIds.warningStripId} className={`mb-4 rounded-xl border px-3 py-2 ${
          pairSafety === 'safe'
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : pairSafety === 'caution'
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-rose-500/40 bg-rose-500/10'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${
                pairSafety === 'safe'
                  ? 'text-emerald-300'
                  : pairSafety === 'caution'
                  ? 'text-amber-300'
                  : 'text-rose-300'
              }`}>
                {pairSafety === 'safe' ? 'Trusted Pair' : pairSafety === 'caution' ? 'Pair At Risk' : 'Break Danger'}
              </p>
              <p className="text-[11px] text-slate-300">
                {displayPair?.join(' / ')} • {mixedWindow ? 'mixed window' : 'lane holding'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Noise Risk</p>
              <p id={tutorialIds.noiseRiskId} className={`text-sm font-black ${
                noiseRisk >= 65 ? 'text-rose-300' : noiseRisk >= 35 ? 'text-amber-300' : 'text-emerald-300'
              }`}>
                {noiseRisk ?? 0}%
              </p>
            </div>
          </div>
          {freshOutsider?.value && (
            <p id={tutorialIds.breakPressureId} className="mt-2 text-[10px] text-slate-400">
              Break pressure: <span className="font-bold text-slate-200">{freshOutsider.value}</span>
              {' '}({Math.round(freshOutsider.score)} pts)
              {pairScoreGap >= 0 ? ` • pair gap ${pairScoreGap}` : ''}
            </p>
          )}
        </div>

        {/* YOUR 2 PICKS */}
        <div id={tutorialIds.mainPredictorId} className="mb-1">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center mb-2">
            Play this pair next
          </div>
          <div className="flex gap-3 justify-center">

            {/* Main pick — lean here */}
            <div className="flex flex-col items-center">
              <div className={`astral-pick-primary relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                border-2 shadow-lg transition-all duration-300
                ${isChaotic
                  ? 'bg-orange-500/15 border-orange-400/60 shadow-orange-900/30'
                  : 'bg-violet-500/20 border-violet-400/60 shadow-violet-900/30'
                }`}>
                <span className="text-3xl font-black text-white">{mainCommon}</span>
                <span className={`text-xs font-bold mt-0.5 ${isChaotic ? 'text-orange-300' : 'text-violet-300'}`}>{mainPct}%</span>
              </div>
              <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide ${isChaotic ? 'text-orange-400' : 'text-violet-400'}`}>
                {splitPairRead ? 'play pair' : 'first lean'}
              </span>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center justify-center text-slate-600 text-sm font-bold">/</div>

            {/* Alt pick — always a common, never noise */}
            <div className="flex flex-col items-center">
              <div className="astral-pick-secondary w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-slate-600/50 bg-slate-800/40 shadow-md">
                <span className="text-2xl font-bold text-slate-300">{altCommon}</span>
                <span className="text-xs text-slate-500 mt-0.5">{altPct}%</span>
              </div>
              <span className="mt-1.5 text-[10px] text-slate-500 uppercase tracking-wide">{splitPairRead ? 'play pair' : 'second lean'}</span>
            </div>
          </div>
        </div>

        {analyzerPicks.length > 0 && (
          <div id={tutorialIds.svarogEyeId} className="mt-4 rounded-[20px] border border-slate-700/60 bg-slate-800/30 px-5 pt-4 pb-4 relative">
            <div className="flex items-center justify-between mb-3.5 relative z-10 pl-6">
              <div className="relative">
                {/* The Svarog logo breaking out of the top/left corner */}
                <img 
                  src={withBaseUrl('svarog.png')} 
                  alt="Svarog Eye" 
                  className="absolute -left-14 -top-8 w-[76px] h-[76px] object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.6)] z-20 pointer-events-none"
                />
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-100 pl-8">Svarog Eye</p>
                <p className="text-[11px] text-slate-400 mt-1 pl-8">Svarog Analyzer — Next exact line</p>
                <p className="text-[10px] text-slate-500 mt-1 pl-8">
                  Mode: {analyzerMode === 'break' ? 'break pair' : analyzerMode === 'break-watch' ? 'break watch' : 'pair exact'}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {analyzerPicks.map((pick, idx) => (
                  <span
                    key={pick}
                    className={`min-w-[48px] inline-block rounded-[14px] border-2 px-3 py-1.5 text-center text-[16px] font-black tracking-tight transition-colors
                      ${idx === 0 
                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-100 shadow-[inset_0_0_12px_rgba(139,92,246,0.15)]' 
                        : 'border-slate-700/60 bg-slate-800/50 text-slate-400'}`}
                  >
                    {pick}
                  </span>
                ))}
              </div>
            </div>
            
            {followGuide && (
              <div className={`mt-2 rounded-[14px] border px-4 py-3 relative z-10 ${
                followGuide.tone === 'good'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : followGuide.tone === 'lane'
                  ? 'border-violet-500/30 bg-violet-500/10'
                  : followGuide.tone === 'analyzer'
                  ? 'border-rose-500/30 bg-rose-500/10'
                  : 'border-amber-500/30 bg-amber-500/10'
              }`}>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    followGuide.tone === 'good' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 
                    followGuide.tone === 'lane' ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]' : 
                    followGuide.tone === 'analyzer' ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)] animate-pulse' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                  }`} />
                  <p className={`text-[11px] font-black uppercase tracking-widest ${
                    followGuide.tone === 'good' ? 'text-emerald-300' : 
                    followGuide.tone === 'lane' ? 'text-violet-300' : 
                    followGuide.tone === 'analyzer' ? 'text-rose-300' : 'text-amber-300'
                  }`}>
                    {followGuide.title}
                  </p>
                </div>
                <p className="text-[12px] text-slate-300/90 leading-relaxed font-medium pl-4.5">
                  {followGuide.text}
                </p>
              </div>
            )}
          </div>
        )}


        {primaryWatchLine && (
          <div id={tutorialIds.watchMessageId} className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 ${
            primaryWatchLine.tone === 'danger'
              ? 'bg-rose-500/12 border border-rose-500/35'
              : primaryWatchLine.tone === 'warn'
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-slate-700/25 border border-slate-600/30'
          }`}>
            <span className={`text-xs ${
              primaryWatchLine.tone === 'danger'
                ? 'text-rose-300'
                : primaryWatchLine.tone === 'warn'
                ? 'text-amber-300'
                : 'text-slate-400'
            }`}>⚡</span>
            <span className={`text-[11px] font-medium ${
              primaryWatchLine.tone === 'danger'
                ? 'text-rose-200'
                : primaryWatchLine.tone === 'warn'
                ? 'text-amber-300'
                : 'text-slate-300'
            }`}>
              {primaryWatchLine.text}
            </span>
          </div>
        )}

        {trustGuideLine && (
          <div className={`mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 ${
            trustGuideLine.tone === 'danger'
              ? 'bg-fuchsia-500/12 border border-fuchsia-500/35'
              : trustGuideLine.tone === 'good'
                ? 'bg-emerald-500/12 border border-emerald-500/35'
                : 'bg-cyan-500/10 border border-cyan-500/30'
          }`}>
            <span className={`text-xs ${
              trustGuideLine.tone === 'danger'
                ? 'text-fuchsia-300'
                : trustGuideLine.tone === 'good'
                  ? 'text-emerald-300'
                  : 'text-cyan-300'
            }`}>◎</span>
            <span className={`text-[11px] font-medium ${
              trustGuideLine.tone === 'danger'
                ? 'text-fuchsia-100'
                : trustGuideLine.tone === 'good'
                  ? 'text-emerald-100'
                  : 'text-cyan-100'
            }`}>
              {trustGuideLine.text}
            </span>
          </div>
        )}

        {/* Commons Flip Alert — confidence-gated wording */}
        {commonsFlipDetected && (() => {
          const fc = flipConfidence || 0;
          const newList = newCommons?.join(', ') || '?';
          let icon, color, msg;
          if (fc >= 85) {
            icon = '🔄'; color = 'bg-purple-500/15 border-purple-500/40 text-purple-300';
            msg = `Commons shifted! Now: [${newList}] (${fc}%)`;
          } else if (fc >= 80) {
            icon = '⚠️'; color = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
            msg = `Shift possible: [${newList}] gaining (${fc}%)`;
          } else {
            icon = '📈'; color = 'bg-slate-500/10 border-slate-500/30 text-slate-400';
            msg = `${newList.split(', ')[1] || newList} rising — may not stick (${fc}%)`;
          }
          return (
            <div className={`mt-2 flex items-center justify-center gap-1.5 border rounded-lg px-3 py-1.5 ${color}`}>
              <span className="text-[11px]">{icon}</span>
              <span className="text-[11px] font-medium">{msg}</span>
            </div>
          );
        })()}

        {/* Chaotic session note */}
        {isChaotic && (
          <p className="mt-2 text-[10px] text-orange-400/70 text-center italic">
            Session is chaotic ({noiseRate}% noise) — picks have lower certainty
          </p>
        )}

        {/* Commons / Noise footer — always visible */}
        <div id={tutorialIds.commonsNoiseId} className="mt-3 pt-2.5 border-t border-slate-800/50 flex justify-center gap-5 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wide">Commons</span>
            <div className="flex gap-1">
              {displayPair?.map(c => (
                <span key={c} className="px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-600/40">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wide">Noise</span>
            <div className="flex gap-1">
              {noise?.map(n => (
                <span key={n} className="px-1.5 py-0.5 rounded bg-red-600/25 text-red-400 font-bold border border-red-600/30">{n}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPAND BUTTON ──────────────────────────────────────────────────── */}
      <button
        id={advancedToggleId}
        onClick={() => setExpanded(e => !e)}
        data-expanded={expanded ? 'true' : 'false'}
        className="astral-bbp-toggle w-full px-4 py-2 flex items-center justify-center gap-1.5 text-[10px] text-pink-300 hover:text-slate-300 border-t border-slate-800/60 transition-colors duration-200 cursor-pointer"
      >
        <span>{expanded ? '▲ Hide details' : '▼ Show details (Advanced Mode)'}</span>
      </button>

      {/* ── 30s EXPLORE SECTION ────────────────────────────────────────────── */}
      {expanded && (
        <div id={advancedPanelId} className="px-4 pb-4 space-y-4 border-t border-slate-800/40">

          {/* Method string (technical) */}
          <div id={tutorialIds.advancedMethodId} className="flex items-center justify-between pt-3">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Method</span>
            <span className="text-[10px] text-slate-500 font-mono">{method}</span>
          </div>

          {/* Trend Indicators */}
          <div id={tutorialIds.advancedTrendsId}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Trends</div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {[
                  ['share', 'trend share'],
                  ['trust', 'trust'],
                  ['freshness', 'freshness'],
                  ['state', 'fresh/held/stale'],
                  ['examples', 'examples'],
                ].map(([key, labelText]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTrendGlossary((current) => (current === key ? null : key))}
                    className={`rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] transition-colors ${
                      activeTrendGlossary === key
                        ? 'border-white/18 bg-white/[0.08] text-white'
                        : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/18 hover:text-slate-200'
                    }`}
                  >
                    {labelText}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <span className="font-semibold text-slate-400">Svarog rank:</span>
              <span className="rounded border border-violet-500/35 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">MAIN</span>
              <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">ALT</span>
              <span className="rounded border border-cyan-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">N1</span>
              <span className="rounded border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">N2</span>
              <span>These badges show Svarog's exact pair first, then the manual noise order if you think the board is breaking.</span>
            </div>
            {noiseOrder.length > 0 && (
              <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Noise order:</span>{' '}
                <span className="text-cyan-300">{noiseOrder[0]}</span>
                {noiseOrder[1] ? (
                  <>
                    <span className="px-1 text-slate-500">&gt;</span>
                    <span className="text-emerald-300">{noiseOrder[1]}</span>
                  </>
                ) : null}
                <span className="pl-2 text-slate-500">Use this only when you think the next hit leaves the commons pair.</span>
              </div>
            )}
            {commonOrder.length > 0 && (
              <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Commons order:</span>{' '}
                <span className="text-violet-300">{commonOrder[0]}</span>
                {commonOrder[1] ? (
                  <>
                    <span className="px-1 text-slate-500">&gt;</span>
                    <span className="text-amber-300">{commonOrder[1]}</span>
                  </>
                ) : null}
                <span className="pl-2 text-slate-500">Use this when you think the board stays on the commons pair.</span>
              </div>
            )}
            {breakChallengeSummary && (
              <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Hybrid read:</span>{' '}
                <span className={breakChallengeSummary.challengerWins ? 'text-cyan-300' : 'text-slate-300'}>
                  {breakChallengeSummary.text}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-1">
              {VALUES.map(v => {
                const t = trends?.[v] || { direction: 'stable', current: 0 };
                const arrow = t.direction === 'rising' ? '↑' : t.direction === 'falling' ? '↓' : '→';
                const color = t.direction === 'rising' ? 'text-emerald-400'
                            : t.direction === 'falling' ? 'text-red-400'
                            : 'text-slate-400';
                const isMain = v === analyzerMain;
                const trustPct = Math.round((t.trustScore ?? 0) * 100);
                const freshnessPct = Math.round((t.arrowWeight ?? 0) * 100);
                const commonEntry = commonDecisionMap.get(v);
                const commonDecider = Math.round(commonEntry?.commonScore ?? 0);
                const noiseDecider = Math.round(noiseDecisionMap.get(v)?.noiseScore ?? 0);
                const pickScore = Math.round(analyzerFinalMap.get(v)?.pickScore ?? 0);
                const freshnessLabel = t.arrowAge === 0 ? 'fresh'
                  : t.arrowAge === 1 ? 'held'
                  : 'stale';
                const freshnessStateColor = t.arrowAge === 0
                  ? 'text-emerald-300'
                  : t.arrowAge === 1
                    ? 'text-amber-300'
                    : 'text-rose-300';
                const isAlt = v === analyzerSecond && v !== analyzerMain;
                const isNoise1 = !isMain && !isAlt && v === noiseOrder[0];
                const isNoise2 = !isMain && !isAlt && v === noiseOrder[1];
                const isInPlay = isMain || isAlt || isNoise1 || isNoise2;
                const rankBadge = isMain ? { label: 'MAIN', cls: 'bg-violet-500/25 text-violet-300 border-violet-500/50' }
                  : isAlt         ? { label: 'ALT',  cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
                  : isNoise1      ? { label: 'N1', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }
                  : isNoise2      ? { label: 'N2', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
                  : null;
                return (
                  <div key={v} className={`flex-1 text-center py-1.5 rounded-md bg-slate-800/50
                    ${isMain ? 'border border-violet-500/40' : isAlt ? 'border border-amber-500/30' : isNoise1 ? 'border border-cyan-500/20' : isNoise2 ? 'border border-emerald-500/20' : ''}`}>
                    {rankBadge
                      ? <div className={`mx-auto mb-0.5 w-fit rounded px-1.5 py-px text-[8px] font-black uppercase tracking-widest border ${rankBadge.cls}`}>{rankBadge.label}</div>
                      : <div className="mb-0.5 h-[14px]" />}
                    <div className={`text-xs font-bold ${isInPlay ? 'text-slate-200' : 'text-slate-400'}`}>{v}</div>
                    <div className={`text-base font-bold ${color}`}>{arrow}</div>
                    <div className={`text-[11px] ${isInPlay ? 'text-slate-300' : 'text-slate-500'}`}>{t.current}%</div>
                    {(() => {
                      const isCommon = commons.includes(v);
                      const isFallenCommon = isCommon && (t.current ?? 0) < 25;
                      const isReboundLive = !!commonEntry?.reboundArmed;
                      if (isFallenCommon) {
                        return (
                          <>
                            <div className="mt-1 text-[10px] font-medium text-orange-400">common {commonDecider}%</div>
                            <div className={`text-[8px] font-black uppercase tracking-widest ${isReboundLive ? 'text-emerald-300/90' : 'text-orange-400/80'}`}>
                              {isReboundLive ? 'REBOUND LIVE' : 'WEAK - check pair row'}
                            </div>
                          </>
                        );
                      }
                      return (
                        <div className="mt-1 text-[10px] font-medium text-violet-300">
                          {isCommon ? `common ${commonDecider}%` : `noise ${noiseDecider}%`}
                        </div>
                      );
                    })()}
                    <div className="text-[10px] font-semibold text-sky-300">decider {pickScore}%</div>
                    <div className="mt-1 text-[10px] font-medium text-cyan-300">trust {trustPct}%</div>
                    <div className="text-[10px] font-medium text-amber-300">fresh {freshnessPct}%</div>
                    <div className={`text-[9px] uppercase tracking-wide ${freshnessStateColor}`}>{freshnessLabel}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-slate-500">
              `trend share` = how much this value owns the latest 5-roll window.
              `decider` = Svarog's final pick strength after all math is blended. Higher is the one to trust.
              `common / noise` = Svarog's pool-specific tie-break percent inside its own pool. Higher wins inside commons or inside noise.
              `trust` = internal confidence in the arrow direction.
              `fresh` = how recently that same arrow changed or stayed alive.
            </div>
            {activeTrendGlossary && (
              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-lg border border-white/6 bg-black/20 p-3">
                    <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${trendGlossary[activeTrendGlossary].tone}`}>
                      {trendGlossary[activeTrendGlossary].label}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      {trendGlossary[activeTrendGlossary].body}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/6 bg-black/20 p-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">Examples</div>
                    <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-400">
                      {trendGlossary[activeTrendGlossary].examples.map((example) => (
                        <p key={example}>{example}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pair matrix row for last roll */}
          {pairMatrix && lastRoll && (
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">
                After {lastRoll} → ?
              </div>
              <div className="flex gap-1">
                {VALUES.map(v => {
                  const matrixData = pairMatrix[lastRoll]?.[v] || { pct: 0, samples: 0, reliable: false };
                  const pct = typeof matrixData === 'object' ? matrixData.pct : matrixData;
                  const samples = typeof matrixData === 'object' ? matrixData.samples : 0;
                  const reliable = typeof matrixData === 'object' ? matrixData.reliable : false;
                  const rollsAgo = data.lastSeen?.[v] ?? -1;
                  const isOverdue = data.overdueValues?.includes(v);
                  const allPcts = VALUES.map(other => {
                    const d = pairMatrix[lastRoll]?.[other];
                    return typeof d === 'object' ? d.pct : (d || 0);
                  });
                  const isHighest = pct === Math.max(...allPcts) && pct > 0;
                  const displayValue = pct > 0 ? `${pct}%`
                    : rollsAgo >= 0 ? `↻${rollsAgo}` : 'N/A';
                  const momentum = data.momentumScores?.[v] ?? 0;
                  const isNoise = noise?.includes(v);
                  return (
                    <div key={v} className={`flex-1 text-center py-2 rounded-md
                      ${isHighest ? 'bg-purple-500/30 border border-purple-500/50'
                        : isOverdue ? 'bg-orange-500/20 border border-orange-500/40'
                        : 'bg-slate-800/50'}
                      ${!reliable && pct > 0 ? 'opacity-60' : ''}
                      ${isNoise ? 'opacity-50' : ''}
                    `}>
                      <div className={`text-xs font-bold ${isNoise ? 'text-red-400/70' : 'text-slate-300'}`}>{v}</div>
                      <div className={`text-sm font-bold ${
                        isHighest ? 'text-purple-300'
                        : isOverdue ? 'text-orange-400'
                        : pct === 0 ? 'text-slate-500' : 'text-slate-400'
                      }`}>{displayValue}</div>
                      <div className={`text-[10px] font-semibold ${
                        momentum >= 1.0 ? 'text-amber-400'
                        : momentum >= 0.5 ? 'text-yellow-500'
                        : momentum >= 0.2 ? 'text-cyan-400' : 'text-slate-500'
                      }`}>({momentum})</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wave Signals */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase">Run Len</div>
              <div className={`text-lg font-bold ${waveSignals?.lastCommonRunLength >= 4 ? 'text-orange-400' : 'text-slate-300'}`}>
                {waveSignals?.lastCommonRunLength || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase">Noise Hits</div>
              <div className={`text-lg font-bold ${waveSignals?.noiseAppearanceCount >= 2 ? 'text-orange-400' : 'text-slate-300'}`}>
                {waveSignals?.noiseAppearanceCount || 0}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase">Flip %</div>
              <div className="text-lg font-bold text-slate-300">
                {waveSignals?.waveFlipProbability || 0}%
              </div>
            </div>
          </div>

          {/* Pattern Analysis — roll sequence + noise gap table */}
          {rolls.length >= 6 && (() => {
            const markers = rolls.map(r => {
              if (r === commons?.[0]) return { type: 'A', value: r };
              if (r === commons?.[1]) return { type: 'B', value: r };
              return { type: 'N', value: r };
            });
            const gaps = [];
            let commonsCount = 0;
            let lastNoiseValue = null;
            for (let i = 0; i < markers.length; i++) {
              if (markers[i].type === 'N') {
                if (lastNoiseValue !== null) gaps.push({ noiseValue: lastNoiseValue, commonsAfter: commonsCount, nextNoise: markers[i].value });
                lastNoiseValue = markers[i].value;
                commonsCount = 0;
              } else { commonsCount++; }
            }
            if (lastNoiseValue !== null) gaps.push({ noiseValue: lastNoiseValue, commonsAfter: commonsCount, nextNoise: '?' });
            const avgGap = gaps.length > 1
              ? Math.round(gaps.slice(0, -1).reduce((s, g) => s + g.commonsAfter, 0) / (gaps.length - 1))
              : '—';
            return (
              <div id={tutorialIds.advancedSequenceId}>
                {/* Roll sequence */}
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                  Sequence (last {Math.min(20, rolls.length)})
                </div>
                <div className="flex flex-wrap gap-0.5 text-[10px] mb-3">
                  {markers.slice(-20).map((m, i) => (
                    <span key={i} className={`px-1 py-0.5 rounded font-bold
                      ${m.type === 'A' ? 'bg-emerald-600/50 text-emerald-300'
                        : m.type === 'B' ? 'bg-blue-600/50 text-blue-300'
                        : 'bg-red-600/50 text-red-300'}`}>
                      {m.value}
                    </span>
                  ))}
                </div>

                {/* Noise gap table */}
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Noise Gap Analysis</div>
                <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-700/50 text-slate-400">
                        <th className="px-2 py-1 text-left">#</th>
                        <th className="px-2 py-1 text-left">Noise</th>
                        <th className="px-2 py-1 text-left">Commons After</th>
                        <th className="px-2 py-1 text-left">→ Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gaps.slice(-5).map((gap, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800/30' : ''}>
                          <td className="px-2 py-1 text-slate-500">{gaps.length - 5 + idx + 1}</td>
                          <td className="px-2 py-1">
                            <span className="px-1.5 py-0.5 rounded bg-red-600/40 text-red-300 font-bold">{gap.noiseValue}</span>
                          </td>
                          <td className="px-2 py-1">
                            <span className={`font-bold ${
                              gap.commonsAfter >= 4 ? 'text-amber-400'
                              : gap.commonsAfter >= 2 ? 'text-emerald-400'
                              : 'text-slate-400'
                            }`}>{gap.commonsAfter}</span>
                          </td>
                          <td className="px-2 py-1">
                            {gap.nextNoise === '?' ? (
                              <span className="text-yellow-400">⏳ waiting</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-red-600/40 text-red-300 font-bold">{gap.nextNoise}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between mt-2 text-[10px]">
                  <div><span className="text-slate-500">Avg commons/noise: </span><span className="text-amber-400 font-bold">{avgGap}</span></div>
                  <div><span className="text-slate-500">Since last noise: </span><span className="text-emerald-400 font-bold">{commonsCount}</span></div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
