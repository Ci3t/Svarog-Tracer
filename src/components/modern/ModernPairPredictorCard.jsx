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
import React, { useMemo, useState } from 'react';
import { predictWithPairs } from '../../utils/pairTransitionPredictor';

const VALUES = ['41', '42', '43', '44'];

// Badge styles per label prefix
function getBadgeStyle(label = '') {
  if (label.startsWith('🔥')) return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50';
  if (label.startsWith('🔄')) return 'bg-blue-500/25 text-blue-300 border-blue-500/50';
  if (label.startsWith('🔀')) return 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50';
  if (label.startsWith('🔁')) return 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50';
  if (label.startsWith('🎯')) return 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50';
  if (label.startsWith('🔔')) return 'bg-amber-500/25 text-amber-300 border-amber-500/50';
  if (label.startsWith('🌀')) return 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50';
  if (label.startsWith('⚠️')) return 'bg-orange-500/25 text-orange-300 border-orange-500/50';
  if (label.startsWith('⏳')) return 'bg-slate-500/25 text-slate-400 border-slate-500/50';
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

export default function ModernPairPredictorCard({ entries = [] }) {
  const [expanded, setExpanded] = useState(false);

  // Extract 2-str rolls from entries
  const rolls = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    return entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
  }, [entries]);

  const data = useMemo(() => predictWithPairs(rolls), [rolls]);

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
    // 🆕 Noise Trap
    isNoiseTrap, trapCandidate, noiseTrapProb, inRedZone, commonsSinceNoise, avgNoiseGap,
    // 🚨 Emergency brake
    isSessionReset
  } = data;

  // 🚨 SESSION RESET early return moved to AFTER all hooks (see below)

  const confidencePct = Math.round(confidence * 100);
  const cardStyle = getCardStyle(isChaotic, false);
  const badgeStyle = getBadgeStyle(label);

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

    const descs = {
      '🔥 Running':    `${prediction} is dominant — keep picking it.`,
      '🔄 Alternating': 'Two values are flip-flopping.',
      '🔀 Shifted':     'A value is rising — pattern shifting.',
      '🔁 Sequence':    'A 2-roll pattern repeats this session.',
      '🎯 Pair':        'Based on what follows the last roll.',
      '🔔 Overdue':     `${prediction} hasn't appeared in a while — due.`,
      '🌀 Recovery':    'After noise, a common tends to return.',
      '⚠️ Chaotic':    'No clear pattern — session is randomised.',
      '⏳ Warming Up':  'Too few rolls to detect patterns yet.',
    };

    // Build a live example per mode
    let ex = '';
    if (label.startsWith('🔥')) {
      const run = currentRunLen >= 2 ? currentRunLen : 2;
      const streak = Array(run).fill(prediction).join(' ');
      ex = `${streak} → keep picking ${prediction}`;
    } else if (label.startsWith('🔄')) {
      const p = isAlternating && alternatingPair?.length === 2 ? alternatingPair : commons;
      ex = `${p[0]} ${p[1]} ${p[0]} ${p[1]} → next: ${prediction}`;
    } else if (label.startsWith('🔀')) {
      ex = `${shiftedToValue || noise[0]} rising → lean on ${prediction}`;
    } else if (label.startsWith('🔁')) {
      const conf = gram2Confidence > 0 ? `${Math.round(gram2Confidence)}%` : '';
      ex = `after ${last2Rolls || '??'} → ${prediction}${conf ? ` (${conf})` : ''} this session`;
    } else if (label.startsWith('🎯')) {
      // Find actual top pair-matrix transition from lastRoll (may be noise)
      const allVals = [...(commons || []), ...(noise || [])];
      const topActual = allVals
        .map(v => ({ value: v, pct: pairPctVal(lastRoll, v), cnt: pairCount(lastRoll, v) }))
        .sort((a, b) => b.pct - a.pct)[0];
      const predPct = pairPctVal(lastRoll, prediction);
      const predCnt = pairCount(lastRoll, prediction);

      if (topActual && topActual.value !== prediction && topActual.pct > 0) {
        // Top transition is NOT the prediction (noise appears more often) — be honest about it
        ex = `after ${lastRoll} → ${topActual.value} most (${topActual.pct}%) | commons pick: ${prediction} (${predPct}%)`;
      } else {
        ex = predPct > 0
          ? `after ${lastRoll} → ${prediction} appeared ${predCnt > 0 ? `${predCnt}× ` : ''}(${predPct}%) this session`
          : `after ${lastRoll} → ${prediction} most likely`;
      }
    } else if (label.startsWith('🔔')) {
      const ago = mostOverdue && lastSeen?.[mostOverdue] >= 0 ? lastSeen[mostOverdue] : '?';
      ex = `${prediction} missing ${ago} rolls this session`;
    } else if (label.startsWith('🌀')) {
      ex = reasonLine; // already has e.g. "43 returns (3×)"
    } else if (label.startsWith('⚠️')) {
      ex = `session noise: ${noiseRate ?? '?'}% — no clear winner`;
    } else if (label.startsWith('⏳')) {
      ex = `${rolls.length} / 6 rolls recorded so far`;
    }

    return { desc: descs[label] || '', ex };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, prediction, lastRoll, last2Rolls, currentRunLen, noiseRate, rolls.length]);

  // 🚨 SESSION RESET: all hooks done — safe to return early now
  if (isSessionReset) {
    return (
      <div className="rounded-2xl border border-red-500/60 bg-red-950/30 shadow-lg shadow-red-900/30 p-4">
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
      <div className={`bg-gradient-to-br from-slate-800/60 to-slate-900/90 rounded-2xl p-4 border shadow-xl ${getCardStyle(false, true)}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 BBP Mode</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getBadgeStyle('⏳')}`}>⏳ Warming Up</span>
        </div>
        <p className="text-center text-slate-500 py-6 text-xs">Need more rolls — building picture</p>
      </div>
    );
  }

  // Commons display: main = prediction (lean here), alt = other common
  const mainCommon = (commons || []).includes(prediction) ? prediction : (commons || [])[0];
  const altCommon  = (commons || []).includes(alt) && alt !== mainCommon ? alt : (commons || []).find(c => c !== mainCommon) || alt;


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

  // Noise watch values — in chaos show ALL noise values, not just one
  const noiseWatchValues = (() => {
    const watches = new Set();
    if (noiseWatch) watches.add(noiseWatch);
    if (isChaotic && noise) noise.forEach(n => watches.add(n));
    return [...watches];
  })();

  return (
    <div className={`bg-gradient-to-br from-violet-900/20 to-slate-900/90 rounded-2xl border shadow-xl transition-all duration-300 ${cardStyle}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 BBP Mode</span>
        {/* Mode badge with tooltip */}
        <div className="relative group">
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

        {/* Reason line */}
        <p className="text-[11px] text-slate-400 italic mb-4 text-center">{reasonLine}</p>

        {/* YOUR 2 PICKS */}
        <div className="mb-1">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center mb-2">
            Your 2 Picks This Session
          </div>
          <div className="flex gap-3 justify-center">

            {/* Main pick — lean here */}
            <div className="flex flex-col items-center">
              <div className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                border-2 shadow-lg transition-all duration-300
                ${isChaotic
                  ? 'bg-orange-500/15 border-orange-400/60 shadow-orange-900/30'
                  : 'bg-violet-500/20 border-violet-400/60 shadow-violet-900/30'
                }`}>
                <span className="text-3xl font-black text-white">{mainCommon}</span>
                <span className={`text-xs font-bold mt-0.5 ${isChaotic ? 'text-orange-300' : 'text-violet-300'}`}>{mainPct}%</span>
              </div>
              <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide ${isChaotic ? 'text-orange-400' : 'text-violet-400'}`}>
                ← lean here
              </span>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center justify-center text-slate-600 text-sm font-bold">or</div>

            {/* Alt pick — always a common, never noise */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-slate-600/50 bg-slate-800/40 shadow-md">
                <span className="text-2xl font-bold text-slate-300">{altCommon}</span>
                <span className="text-xs text-slate-500 mt-0.5">{altPct}%</span>
              </div>
              <span className="mt-1.5 text-[10px] text-slate-500 uppercase tracking-wide">or this</span>
            </div>
          </div>
        </div>


        {/* ⚡ Noise Watch — rising noise candidates */}
        {noiseWatchValues.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
            <span className="text-amber-400 text-xs">⚡</span>
            <span className="text-amber-300 text-[11px] font-medium">
              Watch: {noiseWatchValues.join(', ')} may appear (noise)
            </span>
          </div>
        )}

        {/* ⚠️ Noise Trap Strip — high-confidence noise warning */}
        {isNoiseTrap && trapCandidate && (
          <div className="mt-3 flex items-center justify-between gap-2 bg-orange-500/15 border border-orange-500/40 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-sm">⚠️</span>
              <div>
                <span className="text-orange-300 text-[11px] font-bold uppercase tracking-wide">Trap Signal</span>
                <span className="text-orange-200 text-[11px] ml-2">🎯 {trapCandidate} likely next</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-orange-400 text-[11px] font-medium">{noiseTrapProb}%</div>
              <div className="text-slate-500 text-[10px]">{commonsSinceNoise}/{avgNoiseGap?.toFixed(1)} gap</div>
            </div>
          </div>
        )}

        {/* ⏰ Overdue Noise Comeback — sorted by likelihood (overdue + pair link), not just absence */}
        {overdueNoise?.length > 0 && (
          <div className="mt-2 flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 flex-wrap">
            <span className="text-rose-400 text-xs">⏰</span>
            {overdueNoise.map((v, i) => {
              const ago = lastSeen?.[v] ?? '?';
              const isTop = i === 0;
              return (
                <span key={v} className={isTop
                  ? 'text-rose-200 text-[11px] font-bold'
                  : 'text-rose-400/60 text-[11px]'}>
                  {isTop ? `🎯 ${v}` : v} ({ago}r)
                </span>
              );
            })}
            <span className="text-rose-500/50 text-[10px]">— comeback order</span>
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
        <div className="mt-3 pt-2.5 border-t border-slate-800/50 flex justify-center gap-5 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wide">Commons</span>
            <div className="flex gap-1">
              {commons?.map(c => (
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
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 border-t border-slate-800/60 transition-colors duration-200"
      >
        <span>{expanded ? '▲ Hide details' : '▼ Show details (30s explore)'}</span>
      </button>

      {/* ── 30s EXPLORE SECTION ────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800/40">

          {/* Method string (technical) */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Method</span>
            <span className="text-[10px] text-slate-500 font-mono">{method}</span>
          </div>

          {/* Trend Indicators */}
          <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Trends</div>
            <div className="flex justify-between gap-1">
              {VALUES.map(v => {
                const t = trends?.[v] || { direction: 'stable', current: 0 };
                const arrow = t.direction === 'rising' ? '↑' : t.direction === 'falling' ? '↓' : '→';
                const color = t.direction === 'rising' ? 'text-emerald-400'
                            : t.direction === 'falling' ? 'text-red-400'
                            : 'text-slate-400';
                const isMain = v === mainCommon;
                return (
                  <div key={v} className={`flex-1 text-center py-1.5 rounded-md bg-slate-800/50
                    ${isMain ? 'border border-violet-500/40' : ''}`}>
                    <div className="text-xs font-bold text-slate-300">{v}</div>
                    <div className={`text-base font-bold ${color}`}>{arrow}</div>
                    <div className="text-[10px] text-slate-500">{t.current}%</div>
                  </div>
                );
              })}
            </div>
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
              <div>
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
