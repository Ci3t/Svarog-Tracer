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

  // ── Warming-up state ──────────────────────────────────────────────────────
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

  const {
    prediction, alt, confidence, method, label, reasonLine,
    noiseWatch, isChaotic,
    pairMatrix, lastRoll, waveSignals, trends,
    commons, noise, distribution,
    momentumScores, currentRunLen, lastSeen, overdueValues,
    commonsFlipDetected, newCommons, flipConfidence,
    noiseRate
  } = data;

  const confidencePct = Math.round(confidence * 100);
  const cardStyle = getCardStyle(isChaotic, false);
  const badgeStyle = getBadgeStyle(label);

  // Commons display: main = prediction (lean here), alt = other common
  const mainCommon = commons.includes(prediction) ? prediction : commons[0];
  const altCommon  = commons.includes(alt) && alt !== mainCommon ? alt : commons.find(c => c !== mainCommon) || alt;

  // Lean percentages (who's more favored among the 2 commons right now)
  const mainPct = confidencePct;
  const altPct  = Math.max(100 - confidencePct, 20);

  return (
    <div className={`bg-gradient-to-br from-violet-900/20 to-slate-900/90 rounded-2xl border shadow-xl transition-all duration-300 ${cardStyle}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">🎯 BBP Mode</span>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badgeStyle}`}>
          {label}
        </span>
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

            {/* Alt pick */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                border border-slate-600/50 bg-slate-800/40 shadow-md">
                <span className="text-2xl font-bold text-slate-300">{altCommon}</span>
                <span className="text-xs text-slate-500 mt-0.5">{altPct}%</span>
              </div>
              <span className="mt-1.5 text-[10px] text-slate-500 uppercase tracking-wide">or this</span>
            </div>
          </div>
        </div>

        {/* ⚡ Noise Watch */}
        {noiseWatch && (
          <div className="mt-3 flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
            <span className="text-amber-400 text-xs">⚡</span>
            <span className="text-amber-300 text-[11px] font-medium">Watch: {noiseWatch} may appear (noise)</span>
          </div>
        )}

        {/* Commons Flip Alert */}
        {commonsFlipDetected && (
          <div className="mt-2 flex items-center justify-center gap-1.5 bg-purple-500/15 border border-purple-500/40 rounded-lg px-3 py-1.5">
            <span className="text-purple-300 text-[11px] font-medium">
              🔄 Commons shift detected! New: [{newCommons?.join(', ')}] ({flipConfidence}%)
            </span>
          </div>
        )}

        {/* Chaotic session note */}
        {isChaotic && (
          <p className="mt-2 text-[10px] text-orange-400/70 text-center italic">
            Session is chaotic ({noiseRate}% noise) — picks have lower certainty
          </p>
        )}
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
