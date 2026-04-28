/**
 * ModernPairPredictorCard — Two-Tier Layout
 *
 * 5s Glance (always visible):
 *   - Mode badge + reason line
 *   - YOUR 2 PICKS: commons displayed prominently, leaning indicator on prediction
 *   - Watch if noise is likely
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

// Card border/glow depends on board state
function getCardStyle(boardState, isWarming) {
  if (isWarming) return 'border-slate-600/40 shadow-slate-900/60';
  if (boardState === 'chaos') return 'border-red-500/60 shadow-red-900/40';
  if (boardState === 'caution') return 'border-amber-500/45 shadow-amber-900/25';
  return 'border-violet-500/30 shadow-violet-900/20';
}

// Tooltip content per badge label
const BADGE_TOOLTIPS = {
  'Running':    { desc: 'One value is dominant — keep picking it.',      ex: 'e.g. 42 42 42 -> keep picking 42' },
  'Alternating': { desc: 'Two values are flip-flopping.',               ex: 'e.g. 41 42 41 42 -> next: 41' },
  'Shifted':     { desc: 'A noise value is taking over.',               ex: 'e.g. 43 stealing 41’s spot' },
  'Sequence':    { desc: 'A 2-roll pattern repeats.',                  ex: 'e.g. after 42→43, seen 60%' },
  'Pair':        { desc: 'Based on what follows the last roll.',       ex: 'e.g. after 42, 41 came most' },
  'Overdue':     { desc: 'A value hasn’t appeared in a while — due.',  ex: 'e.g. 44 missing 7 rolls' },
  'Recovery':    { desc: 'After noise, a common tends to return.',    ex: 'e.g. 43 comes back after noise 3x' },
  'Chaotic':    { desc: 'No clear pattern — session is random.',     ex: 'e.g. all values ~25% each' },
  'Warming Up':  { desc: 'Too few rolls to detect patterns yet.',     ex: 'Need 6+ rolls to start' },
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
    analyzerSessionStateScores,
    analyzerBreakChallenge,
    analyzerMode, analyzerNoiseTiming, analyzerNoiseDueRatio, analyzerNoisePhase,
    // ?? Noise Predictor
    noisePredictor,
    // ?? Noise Trap
    isNoiseTrap, trapCandidate, noiseTrapProb, inRedZone, commonsSinceNoise, avgNoiseGap,
    // ?? Emergency brake
    isSessionReset,
    // Board state
    boardState, isChaosOverride,
    sessionState,
  } = data;

  // ?? SESSION RESET early return moved to AFTER all hooks (see below)

  const confidencePct = Math.round(confidence * 100);
  const cardStyle = getCardStyle(boardState, false);
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

  // -- Dynamic tooltip: uses real session data ------------------------------
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
  const sessionStateDecisionMap = useMemo(() => {
    const entries = Array.isArray(analyzerSessionStateScores) ? analyzerSessionStateScores : [];
    return new Map(entries.map((entry) => [entry.value, entry]));
  }, [analyzerSessionStateScores]);
  const analyzerPicks = useMemo(() => {
    const finalRanked = Array.isArray(analyzerFinalScores)
      ? analyzerFinalScores
          .slice()
          .sort((a, b) => (b?.finalDecisionRaw || 0) - (a?.finalDecisionRaw || 0))
          .map((entry) => entry?.value)
          .filter((value, index, array) => value && array.indexOf(value) === index)
      : [];
    if (finalRanked.length >= 2) return finalRanked.slice(0, 2);

    const picks = [];
    if (analyzerPrediction) picks.push(analyzerPrediction);
    if (analyzerAlt && analyzerAlt !== analyzerPrediction) picks.push(analyzerAlt);

    if (picks.length < 2 && analyzerBreakChallenge?.promoted) {
      [analyzerBreakChallenge?.topCommon, analyzerBreakChallenge?.topNoise].forEach((value) => {
        if (value && !picks.includes(value)) picks.push(value);
      });
    }

    if (picks.length < 2) {
      [commonOrder[0], commonOrder[1], noiseOrder[0], noiseOrder[1], ...finalRanked]
        .forEach((value) => {
          if (value && !picks.includes(value)) picks.push(value);
        });
    }

    return picks.slice(0, 2);
  }, [
    analyzerAlt,
    analyzerBreakChallenge,
    analyzerFinalScores,
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
        ? `${topNoise} has the stronger break edge over ${secondCommon} (${Math.round(challenge)} vs ${Math.round(hold)}).`
        : `${secondCommon} still holds over ${topNoise} (${Math.round(hold)} vs ${Math.round(challenge)}).`,
    };
  }, [analyzerBreakChallenge]);
  const noiseTrackerItems = useMemo(() => {
    if (!Array.isArray(analyzerNoiseDecisionScores) || analyzerNoiseDecisionScores.length === 0) return [];
    return analyzerNoiseDecisionScores.slice(0, 2).map((entry) => {
      const rawGap = typeof lastSeen?.[entry.value] === 'number' ? lastSeen[entry.value] : null;
      const gap = rawGap != null && rawGap >= 0 ? rawGap : null;
      // Use frequency-based signals instead of pair transitions (pair data is unreliable in short sessions)
      const sessionPct = Math.round(distribution?.[entry.value] ?? 0);  // full session frequency
      const recentPct = Math.round(trends?.[entry.value]?.current ?? 0); // recent window %
      const direction = trends?.[entry.value]?.direction ?? 'stable';     // rising/stable/falling
      const recent4Hits = entry.recent4Hits ?? 0;
      return {
        value: entry.value,
        score: Math.round(entry.noiseScore || 0),
        gap,
        unseen: rawGap != null && rawGap < 0,
        sessionPct,
        recentPct,
        direction,
        recent4Hits,
      };
    });
  }, [analyzerNoiseDecisionScores, distribution, lastSeen, trends]);

  // Clara alert — must be before early returns (Rules of Hooks)
  const claraAlertText = useMemo(() => {
    if (isNoiseTrap && trapCandidate)
      return `I'm seeing a noise trap — ${trapCandidate} is about to show up. Keep it as your next click.`;
    if (pairSafety === 'danger' && analyzerMain)
      return `The pair broke. Switch to ${analyzerMain}${analyzerSecond ? ` or ${analyzerSecond}` : ''} right now.`;
    if (commonsFlipDetected && (flipConfidence ?? 0) >= 85 && newCommons?.length)
      return `Commons might be shifting — ${newCommons.join(' and ')} is taking over the pair spot.`;
    const topNoise = noiseTrackerItems[0];
    if (topNoise) {
      if (topNoise.recent4Hits >= 2)
        return `Watch out — ${topNoise.value} has hit ${topNoise.recent4Hits} of the last 4 rolls. Break pressure is real.`;
      if (topNoise.unseen && rolls.length >= 8)
        return `${topNoise.value} hasn't appeared at all this session — after ${rolls.length} rolls, it's due.`;
      if (topNoise.gap != null && topNoise.gap >= 7)
        return `${topNoise.value} has been missing ${topNoise.gap} rolls. That's getting overdue — keep it ready.`;
      if (topNoise.direction === 'rising' && topNoise.score >= 58)
        return `Noise ${topNoise.value} is climbing in the recent window — it could break in soon. Have it ready.`;
    }
    // ?? Noise predictor alert: when noise is likely but not in top-2 picks
    const topNoiseCandidate = noisePredictor?.noiseCandidates?.[0];
    if (
      noisePredictor?.noiseLikelihoodNextRoll >= 0.55 &&
      topNoiseCandidate?.prob >= 0.60 &&
      noisePredictor?.predictedNoiseValue
    ) {
      const predictedNoise = noisePredictor.predictedNoiseValue;
      const top2Picks = [analyzerMain, analyzerSecond].filter(Boolean);
      if (!top2Picks.includes(predictedNoise)) {
        return `⚠️ Noise building: ${Math.round(noisePredictor.noiseLikelihoodNextRoll * 100)}% chance next roll breaks to ${predictedNoise}. Svarog Eye is not currently playing it — consider adding it.`;
      }
    }
    return null;
  }, [isNoiseTrap, trapCandidate, pairSafety, analyzerMain, analyzerSecond, commonsFlipDetected, flipConfidence, newCommons, noiseTrackerItems, rolls]);

  useEffect(() => {
    if (!onTrustGuideChange) return;
    onTrustGuideChange(claraAlertText ?? trustGuideAssistText);
  }, [onTrustGuideChange, claraAlertText, trustGuideAssistText]);

  // ?? SESSION RESET: all hooks done — safe to return early now
  if (isSessionReset) {
    return (
      <div className="astral-bbp-card rounded-2xl border border-red-500/60 bg-red-950/30 shadow-lg shadow-red-900/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-red-400 text-lg animate-pulse">??</span>
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

  // -- Warming-up: render after all hooks have run ---------------------------
  if (isWarming) {
    return (
      <div className={`astral-bbp-card bg-gradient-to-br from-slate-800/60 to-slate-900/90 rounded-2xl p-4 border shadow-xl ${getCardStyle(false, true)}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">BBP Mode</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getBadgeStyle('Warming Up')}`}>Warming Up</span>
        </div>
        <p className="text-center text-slate-500 py-6 text-xs">Need more rolls — building picture</p>
      </div>
    );
  }

  // Commons display: main = strongest common by commonScore, alt = second common
  const displayPair = trustedPair?.length === 2 ? trustedPair : commons;
  const mainCommon = commonOrder[0] || displayPair?.[0] || commons?.[0];
  const altCommon  = commonOrder[1] || displayPair?.find(c => c !== mainCommon) || commons?.find(c => c !== mainCommon) || alt;
  const sessionModel = sessionState || {
    key: pairSafety === 'danger' ? 'break' : pairSafety === 'caution' ? 'probe' : 'pair',
    label: pairSafety === 'danger' ? 'Break Live' : pairSafety === 'caution' ? 'Noise Watch' : 'Pair First',
    tone: pairSafety === 'danger' ? 'danger' : pairSafety === 'caution' ? 'warn' : 'lane',
    summary: pairSafety === 'danger'
      ? 'Noise has enough proof. Use the break order first for the next roll.'
      : pairSafety === 'caution'
        ? 'Pair is still first. Watch the noise tracker and switch only if the same break repeats.'
        : 'Pair still owns the next roll. Keep noise only as a backup read.',
    playPair: displayPair,
    playLead: prediction,
    fallback: [],
    backbonePair: displayPair,
    exactPair: analyzerPicks,
    displayPair: displayPair,
    supportLine: 'Use the pair first.',
  };
  const sessionPlayPair = Array.isArray(sessionModel.playPair) && sessionModel.playPair.length
    ? sessionModel.playPair
    : displayPair;
  const sessionPlayLead = sessionModel.playLead && sessionPlayPair.includes(sessionModel.playLead)
    ? sessionModel.playLead
    : sessionPlayPair?.[0] || prediction;
  const sessionPlayAlt = sessionPlayPair.find((value) => value !== sessionPlayLead) || sessionPlayPair?.[1] || altCommon;
  const sessionFallback = Array.isArray(sessionModel.fallback) ? sessionModel.fallback.filter(Boolean) : [];
  const sessionBackbonePair = Array.isArray(sessionModel.backbonePair) && sessionModel.backbonePair.length
    ? sessionModel.backbonePair
    : displayPair;
  // 🆕 When noise predictor is confident (≥55%) and the exact pair differs from
  // the backbone pair, show the exact pair in Svarog Eye so users see the actual
  // prediction instead of the conservative backbone fallback.
  const noiseLikely = noisePredictor?.noiseLikelihoodNextRoll >= 0.55;
  const exactPair = sessionModel.exactPair || analyzerPicks;
  const shouldShowExact = noiseLikely && exactPair.length === 2;
  const svarogDisplayPicks = shouldShowExact
    ? exactPair
    : (Array.isArray(sessionModel.displayPair) && sessionModel.displayPair.length
      ? sessionModel.displayPair
      : (sessionModel.key === 'probe' ? sessionBackbonePair : analyzerPicks));
  // 🆕 Challenge Mode: Svarog Eye switched to include noise
  const svarogSwitched = svarogDisplayPicks.some(p => !commons.includes(p)) && svarogDisplayPicks.some(p => commons.includes(p));
  const sessionToneClasses = sessionModel.tone === 'danger'
    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
    : sessionModel.tone === 'warn'
      ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
      : sessionModel.tone === 'good'
        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
        : 'border-violet-500/30 bg-violet-500/10 text-violet-200';
  const sessionBadgeStyle = sessionModel.tone === 'danger'
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : sessionModel.tone === 'warn'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/35'
      : sessionModel.tone === 'good'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
        : 'bg-violet-500/20 text-violet-300 border-violet-500/35';


  // Lean % - use pair matrix probability for each common from last roll
  // Falls back to equal split when noise dominates transitions (prevents 0%/100% display)
  const mainRawPct = pairMatrix?.[lastRoll]?.[mainCommon];
  const altRawPct  = pairMatrix?.[lastRoll]?.[altCommon];
  const mainMatrixPct = typeof mainRawPct === 'object' ? mainRawPct.pct : (mainRawPct || 0);
  const altMatrixPct  = typeof altRawPct  === 'object' ? altRawPct.pct  : (altRawPct  || 0);
  const totalMatrixPct = mainMatrixPct + altMatrixPct;
  // If commons together have < 40% of pair transitions, noise dominates ? use equal split
  const pctCap = isChaotic ? 70 : 85;
  const rawMainPct = totalMatrixPct >= 40
    ? Math.round((mainMatrixPct / totalMatrixPct) * 100)
    : confidencePct; // fallback to confidence-based split
  const mainPct = Math.min(Math.max(rawMainPct, 30), pctCap); // also floor at 30% — never show 0%
  const altPct  = 100 - mainPct;
  const pairSpread = Math.abs(mainPct - altPct);
  const splitPairRead = pairSpread <= 14 || (pairSafety !== 'safe' && pairSpread <= 18);
  const playPairText = sessionPlayPair?.join(' / ') || `${sessionPlayLead} / ${sessionPlayAlt}`;

  // 🆕 Common lean — use commonDecisionScores to show which common is stronger
  const mainCommonScore = Math.round(commonDecisionMap.get(mainCommon)?.commonScore ?? 0);
  const altCommonScore  = Math.round(commonDecisionMap.get(altCommon)?.commonScore ?? 0);
  const commonScoreTotal = mainCommonScore + altCommonScore || 1;
  const commonLeanPct = Math.round((mainCommonScore / commonScoreTotal) * 100);
  const topNoise = sessionFallback[0] || noiseOrder[0] || freshOutsider?.value || null;
  const secondNoise = sessionFallback[1] || noiseOrder[1] || null;
  // 🆕 Show exact prediction in summary when noise is likely
  const displayLead = shouldShowExact ? exactPair[0] : sessionPlayLead;
  const displayAlt  = shouldShowExact ? exactPair[1] : sessionPlayAlt;
  const topSummaryLine = displayAlt
    ? `Play ${displayLead} / ${displayAlt}. Lean ${displayLead} first.`
    : `Play ${displayLead}.`;
  const secondarySummaryLine = sessionModel.supportLine || (
    topNoise
      ? `If it breaks: ${topNoise}${secondNoise ? `, then ${secondNoise}` : ''}.`
      : 'If it breaks: stay with the live pair until a real outsider repeats.'
  );

  // Noise watch values — in chaos show ALL noise values, not just one
  const noiseWatchValues = (() => {
    const watches = new Set();
    if (noiseWatch) watches.add(noiseWatch);
    if (isChaotic && noise) noise.forEach(n => watches.add(n));
    return [...watches];
  })();


  const analyzerMatchesLane = analyzerPicks.some(pick => displayPair?.includes(pick));
  const analyzerAgreesOnMain = analyzerPrediction && displayPair?.includes(analyzerPrediction);
  const manualReadLine = sessionModel.summary;

  // -- Noise threat context: enriches Svarog Eye guidance when a break is building --
  const topNoiseThreat = noiseTrackerItems[0] || null;
  const noiseThreatActive = topNoiseThreat != null && (
    topNoiseThreat.score >= 58 ||
    topNoiseThreat.direction === 'rising' ||
    (topNoiseThreat.gap != null && topNoiseThreat.gap >= 5) ||
    topNoiseThreat.unseen ||
    topNoiseThreat.recent4Hits >= 2
  );
  const noiseThreatNote = noiseThreatActive && topNoiseThreat
    ? (() => {
        const v = topNoiseThreat.value;
        if (topNoiseThreat.unseen) return `${v} hasn't appeared yet this session — expect it to show up.`;
        const rollWord = topNoiseThreat.gap === 1 ? 'roll' : 'rolls';
        if (topNoiseThreat.gap != null && topNoiseThreat.gap >= 6) return `${v} is overdue — missing ${topNoiseThreat.gap} ${rollWord}, keep it ready.`;
        if (topNoiseThreat.recent4Hits >= 2) return `${v} hit ${topNoiseThreat.recent4Hits} of the last 4 rolls — break pressure is rising.`;
        if (topNoiseThreat.direction === 'rising') return `${v} is climbing in the recent window — keep it as your next break pick.`;
        if (topNoiseThreat.score >= 65) return `${v} has the highest break pressure right now — keep it as backup.`;
        return `${v} is the most likely break if the pair drops.`;
      })()
    : null;

  // Phase-aware noise directive: when the top noise value just appeared (gap ≤ 2)
  // and noiseRisk is HIGH, replace the generic subtext with a clear call-to-action
  // based on whether we're in burst (noise repeating) or recovery (pressure spent).
  const noiseJustHit = topNoiseThreat && (topNoiseThreat.gap != null && topNoiseThreat.gap <= 2);
  const isBurstNoise =
    noiseJustHit &&
    (noiseRisk ?? 0) >= 55 &&
    (topNoiseThreat?.recent4Hits ?? 0) >= 2;

  // Burst swap: when noise is truly bursting, replace Svarog Eye alt with the
  // top noise value so the Eye shows the honest prediction (e.g. 41 | 43)
  // instead of both commons. Only fires when Eye currently shows two commons.
  const svarogFinalPicks = (() => {
    if (
      !isBurstNoise ||
      !topNoiseThreat?.value ||
      svarogDisplayPicks.length !== 2 ||
      !svarogDisplayPicks.every(p => commons.includes(p))
    ) return svarogDisplayPicks;
    // Keep the main pick (index 0), swap alt to the bursting noise value
    return [svarogDisplayPicks[0], topNoiseThreat.value];
  })();

  const phaseDirective = (() => {
    if (!noiseJustHit || !topNoiseThreat || (noiseRisk ?? 0) < 55) return null;
    const v = topNoiseThreat.value;
    if (isBurstNoise) {
      return `${v} is repeating — swapped in as alt. Hold ${svarogFinalPicks[0]}, play ${v} if pair drops.`;
    }
    if (analyzerNoisePhase === 'burst') {
      return `${v} just hit — may repeat soon. Watch it, pair holds for now.`;
    }
    return `${v} just spent — pair is safe now. Hold ${svarogDisplayPicks.join(' / ')} this roll.`;
  })();

  const svarogSummaryLine = !analyzerPicks.length
    ? null
    : phaseDirective
      ? phaseDirective
      : sessionModel.key === 'break'
        ? `Svarog has switched to ${analyzerPicks.join(' / ')}.`
        : sessionModel.key === 'probe'
          ? shouldShowExact
            ? `Svarog is shifting to ${svarogFinalPicks.join(' / ')} — noise probability is high.`
            : `Svarog is holding ${svarogFinalPicks.join(' / ')}${noiseThreatNote ? ` — ${noiseThreatNote}` : ' and tracking noise separately.'}`
          : sessionModel.key === 'reentry'
            ? `Svarog is moving back to ${svarogFinalPicks.join(' / ')}.`
            : noiseThreatActive
              ? `Svarog agrees on ${svarogFinalPicks.join(' / ')}. ${noiseThreatNote}`
              : `Svarog agrees on ${svarogFinalPicks.join(' / ')}.`;
  const followGuide = (() => {
    if (!analyzerPicks.length) return null;
    if (sessionModel.key === 'break' || analyzerMode === 'break') {
      return {
        tone: 'analyzer',
        title: 'Break active',
        text: `Board state is break. Svarog is using ${analyzerPicks.join(' / ')} as the exact next pair.`,
      };
    }
    if (sessionModel.key === 'reentry') {
      return {
        tone: 'good',
        title: 'Back to pair',
        text: `Noise already hit. Keep ${sessionPlayPair.join(' / ')} live — noise tracker is your fallback if it breaks again.`,
      };
    }
    if (analyzerMatchesLane && analyzerAgreesOnMain && sessionModel.key === 'pair') {
      return {
        tone: 'good',
        title: 'Backbone confirmed',
        text: noiseThreatNote
          ? `Board is still pair-led. Keep ${sessionPlayPair.join(' / ')} first. ${noiseThreatNote}`
          : `Board is still pair-led. Keep ${sessionPlayPair.join(' / ')} as the play-now pair.`,
      };
    }
    if (sessionModel.key === 'pair') {
      return {
        tone: 'lane',
        title: 'Backbone first',
        text: noiseThreatNote
          ? `Keep ${sessionPlayPair.join(' / ')} first. ${noiseThreatNote}`
          : `Keep ${sessionPlayPair.join(' / ')} live first. Only use the break fallback if the same outsider confirms again.`,
      };
    }
    if (sessionModel.key === 'probe') {
      return {
        tone: 'split',
        title: 'Noise watch',
        text: noiseThreatNote
          ? `Stay on ${sessionPlayPair.join(' / ')} for now. ${noiseThreatNote}`
          : `Stay on ${sessionPlayPair.join(' / ')}. Use the noise tracker only if the same break repeats.`,
      };
    }
    return {
      tone: 'split',
      title: 'Mixed board',
      text: noiseThreatNote
        ? `Pair first. ${noiseThreatNote}`
        : 'Pair first. Switch if the outsider repeats twice.',
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

  return (
    <div className={`astral-bbp-card bg-gradient-to-br ${
      boardState === 'chaos'   ? 'from-red-950/35 to-slate-900/95'
      : boardState === 'caution' ? 'from-amber-950/20 to-slate-900/90'
      : 'from-violet-900/20 to-slate-900/90'
    } rounded-2xl border shadow-xl transition-all duration-300 ${cardStyle}`}>

      {/* -- HEADER ----------------------------------------------------------- */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${
          boardState === 'chaos' ? 'text-red-400' : boardState === 'caution' ? 'text-amber-400' : 'text-violet-400'
        }`}>BBP Mode</span>
        {/* Mode badge with tooltip */}
        <div id={tutorialIds.modeBadgeId} className="relative group">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border cursor-default ${sessionBadgeStyle}`}>
            {sessionModel.label}
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

      <div className={`mx-4 mb-2 rounded-lg border px-3 py-2 flex items-center justify-between gap-3 ${sessionToneClasses}`}>
        <div className="min-w-0 text-[13px] leading-snug text-slate-200">{manualReadLine}</div>
        <div className={`shrink-0 text-[13px] font-bold ${
          noiseRisk >= 65 ? 'text-rose-300' : noiseRisk >= 35 ? 'text-amber-300' : 'text-emerald-300'
        }`}>
          Risk {noiseRisk ?? 0}%
        </div>
      </div>
      {freshOutsider?.value && (
        <div className="mx-4 mb-1 text-[11px] text-slate-400">
          Break pressure: <span className="font-bold text-slate-200">{freshOutsider.value}</span>
          {' '}({Math.round(freshOutsider.score)} pts)
          {pairScoreGap >= 0 ? ` • gap ${pairScoreGap}` : ''}
        </div>
      )}

      {/* -- 5s GLANCE SECTION ------------------------------------------------ */}
      <div className="px-4 pb-3">
        <div className="mb-3">
          <p className="text-[16px] font-semibold text-slate-100">{topSummaryLine}</p>
          <p className="mt-0.5 text-[12px] text-slate-400">{secondarySummaryLine}</p>
        </div>

        {/* YOUR 2 PICKS */}
        <div id={tutorialIds.mainPredictorId} className="mb-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest text-center mb-2">
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
                <span className="text-3xl font-black text-white">{displayLead}</span>
                <span className={`text-xs font-bold mt-0.5 ${isChaotic ? 'text-orange-300' : 'text-violet-300'}`}>{mainPct}%</span>
              </div>
              <span className={`mt-1.5 text-[11px] font-bold uppercase tracking-wide ${isChaotic ? 'text-orange-400' : 'text-violet-400'}`}>
                play now
              </span>
            </div>

            {/* Divider + Common Lean */}
            <div className="flex flex-col items-center justify-center gap-1">
              <span className="text-slate-600 text-sm font-bold">/</span>
              <div className="text-center">
                <div className="text-[11px] font-bold text-slate-300">{commonLeanPct}%</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wide">lean</div>
              </div>
            </div>

            {/* Alt pick — always a common, never noise */}
            <div className="flex flex-col items-center">
              <div className="astral-pick-secondary w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-slate-600/50 bg-slate-800/40 shadow-md">
                <span className="text-2xl font-bold text-slate-300">{displayAlt}</span>
                <span className="text-xs text-slate-500 mt-0.5">{altPct}%</span>
              </div>
              <span className="mt-1.5 text-[11px] text-slate-500 uppercase tracking-wide">play now</span>
            </div>
          </div>
        </div>

        {/* Noise Prediction Banner */}
        {noiseRisk >= 35 && noiseTrackerItems.length > 0 && (
          <div className={`mt-2 rounded-lg border px-3 py-2 ${
            noiseRisk > 60
              ? 'border-red-500/40 bg-red-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[12px] font-bold ${
                noiseRisk > 60 ? 'text-red-300' : 'text-amber-300'
              }`}>
                Noise: {noiseRisk}%
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-px rounded border ${
                noiseRisk > 60
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {noiseRisk > 60 ? 'HIGH' : 'WATCH'}
              </span>
            </div>
            <div className="flex gap-2">
              {noiseTrackerItems.map((item) => (
                <div key={item.value} className="flex-1">
                  <div className="flex items-center justify-between text-[12px] mb-0.5">
                    <span className="font-bold text-slate-200">{item.value}</span>
                    <span className="text-slate-400">{item.score}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 60 ? 'bg-red-400'
                        : item.score >= 35 ? 'bg-amber-400'
                        : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min(item.score, 100)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {item.gap != null ? `${item.gap} ago` : 'unseen'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {svarogDisplayPicks.length > 0 && (
          <div id={tutorialIds.svarogEyeId} className="mt-3 rounded-xl border border-slate-700/60 bg-slate-800/30 px-4 py-3 relative">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex items-center gap-3">
                <img 
                  src={withBaseUrl('svarog.png')} 
                  alt="Svarog Eye" 
                  className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
                />
                <div>
                  <div className="flex items-center gap-2">
                  <p className="text-[12px] font-black uppercase tracking-widest text-slate-100">Svarog Eye</p>
                  {svarogSwitched && !isBurstNoise && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-px rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚡ Switched
                    </span>
                  )}
                  {isBurstNoise && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-px rounded bg-red-500/20 text-red-300 border border-red-500/40">
                      🔥 Burst
                    </span>
                  )}
                </div>
                  <p className="text-[11px] text-slate-400 leading-tight max-w-[180px]">{svarogSummaryLine || (sessionModel.key === 'probe' ? 'Backbone + noise tracker' : 'Exact next pair')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {svarogFinalPicks.map((pick, idx) => (
                  <span
                    key={pick}
                    className={`min-w-[36px] inline-block rounded-lg border-2 px-2 py-1 text-center text-[14px] font-black tracking-tight transition-colors
                      ${idx === 0 
                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-100 shadow-[inset_0_0_12px_rgba(139,92,246,0.15)]' 
                        : isBurstNoise && noise.includes(pick)
                          ? 'border-red-500/50 bg-red-500/10 text-red-200'
                          : 'border-slate-700/60 bg-slate-800/50 text-slate-400'}`}
                  >
                    {pick}
                  </span>
                ))}
              </div>
            </div>
            {(() => {
              const predictedNoise = noisePredictor?.predictedNoiseValue;
              const noiseProb = noisePredictor?.noiseLikelihoodNextRoll ?? 0;
              if (
                noiseProb < 0.55 ||
                !predictedNoise ||
                svarogFinalPicks.includes(predictedNoise) ||
                noiseRisk < 35
              ) return null;
              const swapTarget = svarogFinalPicks[1] || svarogFinalPicks[0];
              const topNoiseC = noisePredictor?.noiseCandidates?.[0];
              const noiseProbPct = topNoiseC?.prob
                ? Math.round(topNoiseC.prob * 100)
                : Math.round(noiseProb * 100);
              return (
                <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/40 bg-amber-500/10 px-1.5 py-px rounded">Noise Suggest</span>
                  <span className="text-[11px] text-slate-400">
                    Replace <span className="font-bold text-slate-300">{swapTarget}</span>
                    {' → '}
                    <span className="font-bold text-cyan-300">{predictedNoise}</span>
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-amber-400 shrink-0">{noiseProbPct}% likely</span>
                </div>
              );
            })()}
          </div>
        )}


        {primaryWatchLine && (
          <div id={tutorialIds.watchMessageId} className={`mt-2 rounded-lg px-3 py-1.5 ${
            primaryWatchLine.tone === 'danger'
              ? 'bg-rose-500/12 border border-rose-500/35'
              : primaryWatchLine.tone === 'warn'
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-slate-700/25 border border-slate-600/30'
          }`}>
            <p className={`text-[12px] font-medium ${
              primaryWatchLine.tone === 'danger'
                ? 'text-rose-200'
                : primaryWatchLine.tone === 'warn'
                ? 'text-amber-300'
                : 'text-slate-300'
            }`}>
              {primaryWatchLine.text}
            </p>
          </div>
        )}

        {/* Commons Flip Alert - confidence-gated wording */}
        {commonsFlipDetected && (() => {
          const fc = flipConfidence || 0;
          const newList = newCommons?.join(', ') || '?';
          let icon, color, msg;
          if (fc >= 85) {
            icon = '?'; color = 'bg-purple-500/15 border-purple-500/40 text-purple-300';
            msg = `Commons shifted! Now: [${newList}] (${fc}%)`;
          } else if (fc >= 80) {
            icon = '!'; color = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
            msg = `Shift possible: [${newList}] gaining (${fc}%)`;
          } else {
            icon = '?'; color = 'bg-slate-500/10 border-slate-500/30 text-slate-400';
            msg = `${newList.split(', ')[1] || newList} rising — may not stick (${fc}%)`;
          }
          return (
            <div className={`mt-2 flex items-center justify-center gap-1.5 border rounded-lg px-3 py-1 ${color}`}>
              <span className="text-[11px]">{icon}</span>
              <span className="text-[11px] font-medium">{msg}</span>
            </div>
          );
        })()}

        {/* Commons / Noise footer - always visible */}
        <div id={tutorialIds.commonsNoiseId} className="mt-2 pt-2 border-t border-slate-800/50 flex justify-center gap-4 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase tracking-wide">Commons</span>
            <div className="flex gap-1">
              {sessionBackbonePair?.map(c => (
                <span key={c} className="px-1.5 py-px rounded bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-600/40">{c}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 uppercase tracking-wide">Noise</span>
            <div className="flex gap-1">
              {noise?.map(n => (
                <span key={n} className="px-1.5 py-px rounded bg-red-600/25 text-red-400 font-bold border border-red-600/30">{n}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -- EXPAND BUTTON ---------------------------------------------------- */}
      <button
        id={advancedToggleId}
        onClick={() => setExpanded(e => !e)}
        data-expanded={expanded ? 'true' : 'false'}
        className="astral-bbp-toggle w-full px-4 py-2 flex items-center justify-center gap-1.5 text-[10px] text-pink-300 hover:text-slate-300 border-t border-slate-800/60 transition-colors duration-200 cursor-pointer"
      >
        <span>{expanded ? 'Hide signals' : 'Show signals'}</span>
      </button>

      {/* -- 30s EXPLORE SECTION ---------------------------------------------- */}
      {expanded && (
        <div id={advancedPanelId} className="px-4 pb-4 space-y-4 border-t border-slate-800/40">

          {/* Trend cards — full data with labels */}
          <div id={tutorialIds.advancedTrendsId}>
            <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Live Trends</div>
            <div className="grid grid-cols-4 gap-2">
              {VALUES.map(v => {
                const t = trends?.[v] || { direction: 'stable', current: 0 };
                const arrow = t.direction === 'rising' ? '\u2191' : t.direction === 'falling' ? '\u2193' : '\u2192';
                const arrowColor = t.direction === 'rising' ? 'text-emerald-400' : t.direction === 'falling' ? 'text-red-400' : 'text-yellow-300';
                const isMain = v === analyzerMain;
                const isAlt = v === analyzerSecond && v !== analyzerMain;
                const isNoise1 = !isMain && !isAlt && v === noiseOrder[0];
                const isNoise2 = !isMain && !isAlt && v === noiseOrder[1];
                const rankBadge = isMain ? { label: 'MAIN', cls: 'bg-violet-500/25 text-violet-300 border-violet-500/50' }
                  : isAlt         ? { label: 'ALT',  cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
                  : isNoise1      ? { label: 'N1', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }
                  : isNoise2      ? { label: 'N2', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
                  : null;
                const seenAgoRaw = lastSeen?.[v] ?? -1;
                const gapText = seenAgoRaw < 0 ? 'unseen' : seenAgoRaw === 0 ? 'just hit' : `${seenAgoRaw} ago`;
                const gapColor = seenAgoRaw < 0 ? 'text-slate-500'
                  : seenAgoRaw === 0 ? 'text-emerald-400'
                  : seenAgoRaw >= 5 ? 'text-amber-400'
                  : 'text-slate-400';
                const sessionFreq = distribution?.[v] ?? 0;
                const pickScore = Math.round(analyzerFinalMap.get(v)?.pickScore ?? 0);
                const isInPlay = isMain || isAlt || isNoise1 || isNoise2;
                return (
                  <div key={v} className={`rounded-lg px-2 py-2 text-center ${
                    isMain ? 'bg-slate-800/50 border border-violet-500/40'
                    : isAlt ? 'bg-slate-800/50 border border-amber-500/30'
                    : isNoise1 ? 'bg-slate-800/50 border border-cyan-500/20'
                    : isNoise2 ? 'bg-slate-800/50 border border-emerald-500/20'
                    : 'bg-slate-800/30 border border-white/5'
                  }`}>
                    {rankBadge
                      ? <div className={`mx-auto mb-1 w-fit rounded px-1.5 py-px text-[10px] font-black uppercase tracking-widest border ${rankBadge.cls}`}>{rankBadge.label}</div>
                      : <div className="mb-1 h-[16px]" />}
                    <div className={`text-sm font-bold ${isInPlay ? 'text-slate-200' : 'text-slate-400'}`}>{v}</div>
                    <div className={`text-lg font-bold ${arrowColor}`}>{arrow}</div>
                    <div className="text-[11px] text-slate-500 leading-none mt-0.5">trend</div>

                    <div className="mt-2">
                      <div className={`text-sm font-bold ${isInPlay ? 'text-slate-300' : 'text-slate-500'}`}>{t.current}%</div>
                      <div className="text-[11px] text-slate-500 leading-none">recent</div>
                    </div>

                    <div className="mt-1.5">
                      <div className={`text-sm ${sessionFreq >= 30 ? 'text-slate-300' : sessionFreq >= 18 ? 'text-slate-400' : 'text-slate-600'}`}>{sessionFreq}%</div>
                      <div className="text-[11px] text-slate-500 leading-none">session</div>
                    </div>

                    <div className="mt-1.5">
                      <div className={`text-sm font-bold ${gapColor}`}>{gapText}</div>
                      <div className="text-[11px] text-slate-500 leading-none">gap</div>
                    </div>

                    <div className="mt-1.5">
                      <div className={`text-sm font-black ${
                        pickScore >= 60 ? 'text-cyan-300' : pickScore >= 35 ? 'text-fuchsia-300/90' : 'text-rose-400/85'
                      }`}>{pickScore}%</div>
                      <div className="text-[11px] text-slate-500 leading-none">score</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {breakChallengeSummary && breakChallengeSummary.challengerWins && (
              <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">Break edge:</span>{' '}
                <span className="text-cyan-300">
                  {breakChallengeSummary.text}
                </span>
              </div>
            )}
          </div>

          {/* Read it yourself */}
          {[...commons, ...noise].length === 4 && (
            <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-500 mb-2">Read it yourself</div>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-1 pr-2">Value</th>
                    <th className="text-left py-1 pr-2">Type</th>
                    <th className="text-left py-1 pr-2">Trend</th>
                    <th className="text-left py-1 pr-2">Next %</th>
                    <th className="text-left py-1 pr-2">Gap</th>
                    <th className="text-left py-1 pr-2">Status</th>
                    <th className="text-right py-1 pl-2">Read</th>
                  </tr>
                </thead>
                <tbody>
                  {[...commons, ...noise].map(v => {
                    const isCommon = commons.includes(v);
                    const tv = trends?.[v] || { direction: 'stable', current: 0 };
                    const dir = tv.direction;
                    const dirArrow = dir === 'rising' ? '\u2191' : dir === 'falling' ? '\u2193' : '\u2192';
                    const dirColor = dir === 'rising' ? 'text-emerald-400' : dir === 'falling' ? 'text-red-400' : 'text-yellow-300';
                    const seenAgoV = lastSeen?.[v] ?? -1;
                    const noiseEntryV = noiseDecisionMap.get(v);
                    const noiseScoreV = Math.round(noiseEntryV?.noiseScore ?? 0);
                    const gapWordV = seenAgoV < 0 ? 'not seen yet'
                      : seenAgoV === 0 ? 'just hit'
                      : `${seenAgoV} roll${seenAgoV === 1 ? '' : 's'} ago`;
                    const gapColorV = seenAgoV < 0 || seenAgoV >= 5 ? 'text-amber-400'
                      : seenAgoV === 0 ? 'text-emerald-400' : 'text-slate-500';
                    const nextRollProb = Math.round(analyzerFinalMap.get(v)?.pickScore ?? 0);
                    let readPhrase, readColor;
                    if (isCommon) {
                      if (dir === 'rising' && seenAgoV >= 0 && seenAgoV <= 2) { readPhrase = 'Lead — stay on it'; readColor = 'text-emerald-300'; }
                      else if (seenAgoV > 8 || (seenAgoV < 0 && rolls.length > 10)) { readPhrase = 'Long absence — may have shifted'; readColor = 'text-rose-400'; }
                      else if (dir === 'falling' && seenAgoV > 3) { readPhrase = 'Fading — watch for a switch'; readColor = 'text-amber-300'; }
                      else { readPhrase = 'Valid — still your lane'; readColor = 'text-slate-300'; }
                    } else {
                      if (noiseScoreV >= 65 || (seenAgoV >= 6 && noiseScoreV >= 40)) { readPhrase = 'Overdue — break pick if pair drops'; readColor = 'text-cyan-300'; }
                      else if (seenAgoV < 0) { readPhrase = 'Not appeared — could spike'; readColor = 'text-amber-400'; }
                      else if (dir === 'rising' || noiseScoreV >= 45) { readPhrase = 'Climbing — keep it ready'; readColor = 'text-amber-300'; }
                      else { readPhrase = 'Quiet for now'; readColor = 'text-slate-500'; }
                    }
                    let urgencyTag = null;
                    if (!isCommon) {
                      if (noiseScoreV >= 65 || (seenAgoV >= 6 && noiseScoreV >= 40) || seenAgoV < 0) {
                        const tagText = seenAgoV < 0 ? 'NOT SEEN' : seenAgoV >= 8 ? 'OVERDUE' : 'DUE SOON';
                        urgencyTag = { text: tagText, cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
                      } else if (noiseEntryV?.recent4Hits >= 2) {
                        urgencyTag = { text: 'HOT', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
                      } else if (dir === 'rising' && noiseScoreV >= 45) {
                        urgencyTag = { text: 'WATCH', cls: 'bg-slate-600/40 text-slate-300 border-slate-500/40' };
                      }
                    }
                    return (
                      <tr key={v} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 pr-2">
                          <span className="text-[13px] font-black text-slate-200">{v}</span>
                        </td>
                        <td className="py-1.5 pr-2">
                          <span className={`text-[11px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0 ${isCommon ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                            {isCommon ? 'PAIR' : 'NOISE'}
                          </span>
                        </td>
                        <td className={`py-1.5 pr-2 text-[13px] font-bold ${dirColor}`}>{dirArrow}</td>
                        <td className="py-1.5 pr-2">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-slate-200">{nextRollProb}%</span>
                            {!isCommon && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <div className="h-1 w-10 rounded-full bg-slate-700 overflow-hidden">
                                  <div className={`h-full rounded-full ${noiseScoreV >= 60 ? 'bg-red-400' : noiseScoreV >= 35 ? 'bg-amber-400' : 'bg-slate-500'}`} style={{ width: `${Math.min(noiseScoreV, 100)}%` }} />
                                </div>
                                <span className="text-[11px] text-slate-500">{noiseScoreV}% break</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`py-1.5 pr-2 text-[12px] ${gapColorV}`}>{gapWordV}</td>
                        <td className="py-1.5 pr-2">
                          {urgencyTag && (
                            <span className={`text-[11px] font-black uppercase tracking-wide rounded px-1.5 py-0.5 border shrink-0 ${urgencyTag.cls}`}>
                              {urgencyTag.text}
                            </span>
                          )}
                        </td>
                        <td className={`py-1.5 pl-2 text-[12px] font-medium text-right ${readColor}`}>{readPhrase}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pattern Analysis - roll sequence + noise gap progress bar */}
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
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
                  Sequence (last {Math.min(20, rolls.length)})
                </div>
                <div className="flex flex-wrap gap-0.5 text-[12px] mb-3">
                  {markers.slice(-20).map((m, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded font-bold
                      ${m.type === 'A' ? 'bg-emerald-600/50 text-emerald-300'
                        : m.type === 'B' ? 'bg-blue-600/50 text-blue-300'
                        : 'bg-red-600/50 text-red-300'}`}>
                      {m.value}
                    </span>
                  ))}
                </div>

                {/* Noise gap progress bar */}
                {typeof avgGap === 'number' && avgGap > 0 && (
                  <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-slate-400">Gap fullness</span>
                      <span className={`font-bold ${
                        commonsSinceNoise >= avgGap ? 'text-red-400'
                        : commonsSinceNoise >= avgGap * 0.7 ? 'text-amber-400'
                        : 'text-emerald-400'
                      }`}>
                        {commonsSinceNoise >= avgGap
                          ? 'Noise is overdue!'
                          : 'Noise due in ~' + Math.max(1, Math.round(avgGap - commonsSinceNoise)) + ' roll' + (Math.round(avgGap - commonsSinceNoise) === 1 ? '' : 's')}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          commonsSinceNoise >= avgGap ? 'bg-red-400'
                          : commonsSinceNoise >= avgGap * 0.7 ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        }`}
                        style={{ width: String(Math.min((commonsSinceNoise / avgGap) * 100, 100)) + '%' }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                      <span>{commonsSinceNoise} since last noise</span>
                      <span>avg gap {avgGap}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 4-Way Raw Strength Tracker (Test) */}
          {Array.isArray(analyzerFinalScores) && analyzerFinalScores.length === 4 && (
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider">4-Way Raw Strength (Test)</div>
                <div className="text-[10px] text-slate-600">finalDecisionRaw</div>
              </div>
              {(() => {
                const ranked = [...analyzerFinalScores].sort((a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0));
                const raws = ranked.map(e => e.finalDecisionRaw || 0);
                const minRaw = Math.min(...raws, 0);
                const maxRaw = Math.max(...raws, 1);
                const range = maxRaw - minRaw || 1;
                return ranked.map((entry, idx) => {
                  const v = entry.value;
                  const isCommon = commons.includes(v);
                  const isInSvarog = svarogFinalPicks.includes(v);
                  const isInMain = v === mainCommon || v === altCommon;
                  const raw = Math.round(entry.finalDecisionRaw || 0);
                  const pct = Math.round(((raw - minRaw) / range) * 100);
                  const direction = trends?.[v]?.direction || 'stable';
                  const ago = lastSeen?.[v];
                  const noiseCandidate = !isCommon ? noisePredictor?.noiseCandidates?.find(c => c.value === v) : null;
                  const noiseProbPct = noiseCandidate ? Math.round(noiseCandidate.prob * 100) : null;
                  return (
                    <div key={v} className="flex items-center gap-2 mb-1 last:mb-0">
                      <span className={`text-[10px] font-black w-5 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-slate-500'}`}>#{idx + 1}</span>
                      <span className={`text-[13px] font-bold w-6 ${isCommon ? 'text-emerald-400' : 'text-cyan-400'}`}>{v}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCommon ? 'bg-emerald-500/60' : 'bg-cyan-500/60'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{raw}</span>
                      {direction === 'rising' ? (
                        <span className="text-[9px] font-black text-emerald-400">↑</span>
                      ) : direction === 'falling' ? (
                        <span className="text-[9px] font-black text-red-400">↓</span>
                      ) : (
                        <span className="w-[9px]" />
                      )}
                      {noiseProbPct !== null ? (
                        <span className="text-[9px] font-mono text-cyan-500 w-9 text-right">{noiseProbPct}%N</span>
                      ) : ago != null && ago > 0 ? (
                        <span className="text-[9px] font-mono text-slate-600 w-9 text-right">-{ago}</span>
                      ) : (
                        <span className="w-9" />
                      )}
                      <div className="flex gap-1">
                        {isInMain && (
                          <span className="text-[9px] font-black uppercase px-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">PAIR</span>
                        )}
                        {isInSvarog && (
                          <span className="text-[9px] font-black uppercase px-1 rounded bg-violet-500/15 text-violet-400 border border-violet-500/30">EYE</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


