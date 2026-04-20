// Export Helper Utilities for Debug Data
import { 
  predictWithPairs, 
  formatTrendsForExport, 
  formatWaveSignalsForExport,
  formatPairRowForExport 
} from './pairTransitionPredictor';
import { predictNext2BBPMode } from './bbp-mode-2str';

export function exportDebugLogsToTXT(debugLogs, entries = []) {
  if (!debugLogs || debugLogs.length === 0) {
    alert('No debug logs to export');
    return;
  }

  let content = '=== Svarog Tracer Debug Export ===\n\n';

  // Separate logs by kind (reverse for newest first)
  const logs2str = [...debugLogs].reverse().filter(log => log.kind === '2');
  const logs4str = [...debugLogs].reverse().filter(log => log.kind === '4');

  const formatDistribution = (dist) => {
    if (typeof dist !== 'object') return '';
    return Object.entries(dist)
      .map(([key, data]) => {
        const pct = typeof data === 'object' ? Math.round((data.pct || 0)) : Math.round(data || 0);
        return `${key}:${pct}%`;
      })
      .join(',');
  };

  const VALUES = ['41', '42', '43', '44'];

  const formatTrendPercent = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0';
    return String(Math.round(value * 100));
  };

  const formatTrendDetail = (trends) => {
    if (!trends || typeof trends !== 'object') return ['none'];
    return VALUES.map((value) => {
      const trend = trends[value] || {};
      const share = trend.current ?? 0;
      const trust = formatTrendPercent(trend.trustScore ?? 0);
      const freshness = formatTrendPercent(trend.arrowWeight ?? 0);
      const support = Math.round(trend.supportScore ?? 0);
      const supportTier = trend.supportTier || 'weak';
      const latent = Math.round(trend.latentPressure ?? 0);
      const latentTier = trend.latentTier || 'quiet';
      const noisePriority = Math.round(trend.noisePriorityScore ?? 0);
      const noisePriorityTier = trend.noisePriorityTier || 'quiet';
      const state = trend.state || 'unknown';
      const direction = trend.direction || 'stable';
      return `${value}: share ${share}% | trust ${trust}% | fresh ${freshness}% | support ${support}% (${supportTier}) | latent ${latent}% (${latentTier}) | noise ${noisePriority}% (${noisePriorityTier}) | ${state} | ${direction}`;
    });
  };

  const formatAnalyzerScores = (scores) => {
    if (!Array.isArray(scores) || scores.length === 0) return 'none';
    return scores
      .slice(0, 4)
      .map((entry) => `${entry.value}:${Math.round(entry.score)}`)
      .join(', ');
  };

  const formatNoiseScores = (scores) => {
    if (!Array.isArray(scores) || scores.length === 0) return 'none';
    return scores
      .slice(0, 4)
      .map((entry) => `${entry.value}:${Math.round(entry.candidateScore || entry.score || 0)}(p:${Math.round(entry.pressureScore || 0)},a:${Math.round(entry.activationScore || 0)},gap:${Math.round((entry.overdueNorm || 0) * 100) / 100})`)
      .join(', ');
  };

  const formatDormantCandidates = (data) => {
    const trends = data?.trends;
    if (!trends || typeof trends !== 'object') return ['none'];
    const dormant = VALUES
      .map((value) => ({ value, trend: trends[value] || {} }))
      .filter(({ trend }) =>
        (trend.current ?? 0) === 0 &&
        ((trend.trustScore ?? 0) >= 0.45 || (trend.arrowWeight ?? 0) >= 0.4 || (trend.supportScore ?? 0) >= 42 || (trend.noisePriorityScore ?? 0) >= 48)
      )
      .map(({ value, trend }) =>
        `${value}: trust ${formatTrendPercent(trend.trustScore ?? 0)}% | fresh ${formatTrendPercent(trend.arrowWeight ?? 0)}% | support ${Math.round(trend.supportScore ?? 0)}% (${trend.supportTier || 'weak'}) | latent ${Math.round(trend.latentPressure ?? 0)}% (${trend.latentTier || 'quiet'}) | noise ${Math.round(trend.noisePriorityScore ?? 0)}% (${trend.noisePriorityTier || 'quiet'}) | ${trend.state || 'unknown'} | ${trend.direction || 'stable'}`
      );
    return dormant.length > 0 ? dormant : ['none'];
  };

  const formatFreshOutsider = (freshOutsider) => {
    if (!freshOutsider?.value) return 'none';
    return `${freshOutsider.value} | score ${Math.round(freshOutsider.score || 0)} | r2 ${freshOutsider.recent2Hits || 0} | r4 ${freshOutsider.recent4Hits || 0} | ago ${freshOutsider.rollsAgo ?? '-'} | ${freshOutsider.direction || 'stable'}`;
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen || typeof lastSeen !== 'object') return 'none';
    return VALUES.map((value) => `${value}:${lastSeen[value] ?? -1}`).join(', ');
  };

  // =========================================================================
  // 📋 INPUT TIMELINE — raw actuals only, clean reference
  // =========================================================================
  if (logs2str.length > 0) {
    content += '--- 📋 Input Timeline (2-str) ---\n';
    content += '(Raw actuals — newest first)\n\n';
    logs2str.forEach(log => {
      const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
      const actual = log.actual || '—';
      const ctx = log.ctx ? (Array.isArray(log.ctx) ? log.ctx.slice(-4).join(', ') : log.ctx) : '';
      content += `[${time}] actual: ${actual}  ←  last 4 ctx: [${ctx}]\n`;
    });
    content += '\n';
  }

  // =========================================================================
  // 🎯 PREDICTOR LOG — single source of truth per entry
  // One predictWithPairs(log.ctx) call per roll.
  // All fields come from the same function call on the same snapshot.
  // =========================================================================
  if (logs2str.length > 0) {
    content += '--- 🎯 Predictor Log ---\n';
    content += '(All data from one predictWithPairs(ctx) call per entry)\n\n';

    let hits = 0;
    let top2 = 0;
    let total = 0;
    const methodStats = {};
    let analyzerHits = 0;
    let analyzerTop2 = 0;

    logs2str.forEach(log => {
      const ctx = log.ctx;
      const actual = log.actual;
      if (!ctx || !Array.isArray(ctx) || ctx.length < 6) return;

      const rolls = ctx.map(r => String(r));
      const data = predictWithPairs(rolls);

      const pred = data.prediction;
      const alt = data.alt;
      const analyzerPred = data.analyzerPrediction;
      const analyzerAlt = data.analyzerAlt;
      const conf = Math.round((data.confidence || 0) * 100);
      const method = data.method || 'unknown';
      const commons = data.commons || [];
      const noise = data.noise || [];
      const dist = data.distribution || {};
      const fullCtx = rolls.join(' ');
      const tail4 = rolls.slice(-4).join(' ');

      const isHit = pred === actual;
      const isAltHit = alt === actual;
      const status = isHit ? '✅ HIT' : (isAltHit ? '⚡ ALT-HIT' : '❌ MISS');

      if (isHit) hits++;
      if (isHit || isAltHit) top2++;
      total++;
      if (analyzerPred === actual) analyzerHits++;
      if (analyzerPred === actual || analyzerAlt === actual) analyzerTop2++;

      if (!methodStats[method]) methodStats[method] = { hits: 0, top2: 0, total: 0 };
      methodStats[method].total++;
      if (isHit) methodStats[method].hits++;
      if (isHit || isAltHit) methodStats[method].top2++;

      const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
      const distStr = formatDistribution(dist);

      content += `[${time}] pred: ${pred} (${conf}%) | alt: ${alt} | method: ${method}\n`;
      content += `         ↳ actual: ${actual} | ${status}\n`;
      content += `         Full ctx (${rolls.length}): [${fullCtx}]\n`;
      content += `         Tail-4: [${tail4}]\n`;
      content += `         Commons: [${commons.join(', ')}] | Noise: [${noise.join(', ')}]\n`;
      if (data.trustedPair?.length === 2) {
        content += `         Pair: [${data.trustedPair.join(', ')}] | Safety: ${data.pairSafety || 'unknown'} | Noise risk: ${data.noiseRisk ?? 0}%\n`;
        const analyzerPicks = [data.analyzerPrediction, data.analyzerAlt].filter((value, idx, arr) => value && arr.indexOf(value) === idx);
        if (analyzerPicks.length > 0) {
          content += `         Svarog Analyzer: [${analyzerPicks.join('] [')}] | exact-line lean only\n`;
        }
        if (data.freshOutsider?.value) {
          content += `         Break pressure: ${data.freshOutsider.value} (${Math.round(data.freshOutsider.score)} pts) | Mixed window: ${data.mixedWindow ? 'yes' : 'no'}\n`;
        }
      }
      if (distStr) content += `         Dist: ${distStr}\n`;
      if (data.momentumScores) {
        const hotStr = Object.entries(data.momentumScores).map(([v, s]) => `${v}:${s}`).join(', ');
        content += `         🔥 Momentum: ${hotStr} | Hot: [${data.hotValues?.join(', ')}]\n`;
      }
      if (data.lastSeen) {
        const seenStr = Object.entries(data.lastSeen).map(([v, n]) => `${v}:${n}`).join(', ');
        content += `         🔍 Last-seen: ${seenStr} | Overdue: [${data.overdueValues?.join(', ') || 'none'}]\n`;
      }
      if (data.noiseDoubleTapLikely) content += `         🔁 DOUBLE-TAP: ${data.doubleTapValue} likely repeat\n`;
      if (data.currentRunLen >= 3) content += `         ⚠️ LONG RUN: ${data.lastRoll} x${data.currentRunLen} — break likely\n`;
      if (data.isAlternating) content += `         🔄 ALTERNATING: ${data.alternatingPair?.join('↔')}\n`;
      if (data.patternShifted) content += `         🔀 PATTERN SHIFT: ${data.shiftedToValue} is rising\n`;
      if (data.commonsFlipDetected) content += `         🔄 COMMONS FLIP: New commons [${data.newCommons?.join(', ')}] (${data.flipConfidence}%)\n`;
      if (data.regime) content += `         📊 REGIME: ${data.regime}\n`;
      content += `         --- AI REPLAY BLOCK ---\n`;
      content += `         actual_next: ${actual}\n`;
      content += `         ctx_full: ${fullCtx}\n`;
      content += `         ctx_tail4: ${tail4}\n`;
      content += `         last_roll: ${data.lastRoll || 'none'}\n`;
      content += `         last_2_rolls: ${data.last2Rolls || 'none'}\n`;
      content += `         main_prediction: ${pred || 'none'}\n`;
      content += `         alt_prediction: ${alt || 'none'}\n`;
      content += `         analyzer_prediction: ${analyzerPred || 'none'}\n`;
      content += `         analyzer_alt: ${analyzerAlt || 'none'}\n`;
      content += `         analyzer_mode: ${data.analyzerMode || 'pair'}\n`;
      content += `         analyzer_noise_timing: ${data.analyzerNoiseTiming || 'unknown'}\n`;
      content += `         analyzer_noise_due_ratio_pct: ${Math.round((data.analyzerNoiseDueRatio || 0) * 100)}\n`;
      content += `         label: ${data.label || 'none'}\n`;
      content += `         reason_line: ${data.reasonLine || 'none'}\n`;
      content += `         confidence_pct: ${conf}\n`;
      content += `         confidence_gap_pct: ${Math.round(data.confidenceGap || 0)}\n`;
      content += `         method: ${method}\n`;
      content += `         trusted_pair: ${data.trustedPair?.join(' ') || 'none'}\n`;
      content += `         runner_up_pair: ${data.runnerUpPair?.join(' ') || 'none'}\n`;
      content += `         pair_safety: ${data.pairSafety || 'unknown'}\n`;
      content += `         noise_risk_pct: ${data.noiseRisk ?? 0}\n`;
      content += `         pair_gap: ${data.pairScoreGap ?? 0}\n`;
      content += `         mixed_window: ${data.mixedWindow ? 'yes' : 'no'}\n`;
      content += `         regime: ${data.regime || 'unknown'}\n`;
      content += `         fresh_outsider: ${formatFreshOutsider(data.freshOutsider)}\n`;
      content += `         noise_watch: ${data.noiseWatch || 'none'}\n`;
      content += `         commons_since_noise: ${data.commonsSinceNoise ?? 'n/a'}\n`;
      content += `         avg_noise_gap: ${data.avgNoiseGap ?? 'n/a'}\n`;
      content += `         current_run_len: ${data.currentRunLen ?? data.currentRunLength ?? 0}\n`;
      content += `         analyzer_scores: ${formatAnalyzerScores(data.analyzerScores)}\n`;
      content += `         analyzer_noise_scores: ${formatNoiseScores(data.analyzerNoiseScores)}\n`;
      content += `         pair_row_last: ${formatPairRowForExport(data.pairMatrix, data.lastRoll) || 'none'}\n`;
      content += `         pair_row_last2: ${formatPairRowForExport(data.pairMatrix2gram, data.last2Rolls) || 'none'}\n`;
      content += `         trends:\n`;
      formatTrendDetail(data.trends).forEach((line) => {
        content += `           ${line}\n`;
      });
      content += `         dormant_candidates:\n`;
      formatDormantCandidates(data).forEach((line) => {
        content += `           ${line}\n`;
      });
      content += `         last_seen: ${formatLastSeen(data.lastSeen)}\n`;
      content += `         --- END AI REPLAY BLOCK ---\n`;
      content += '\n';
    });

    // Summary
    const mainPct = total > 0 ? Math.round((hits / total) * 100) : 0;
    const top2Pct = total > 0 ? Math.round((top2 / total) * 100) : 0;
    const analyzerMainPct = total > 0 ? Math.round((analyzerHits / total) * 100) : 0;
    const analyzerTop2Pct = total > 0 ? Math.round((analyzerTop2 / total) * 100) : 0;
    content += `--- Summary ---\n`;
    content += `Main hits:  ${hits}/${total} = ${mainPct}%\n`;
    content += `Top-2:      ${top2}/${total} = ${top2Pct}%\n\n`;
    content += `Svarog Analyzer:\n`;
    content += `  Main:      ${analyzerHits}/${total} = ${analyzerMainPct}%\n`;
    content += `  Top-2:     ${analyzerTop2}/${total} = ${analyzerTop2Pct}%\n\n`;
    content += `Method breakdown:\n`;
    const sortedMethods = Object.entries(methodStats).sort((a, b) => b[1].total - a[1].total);
    sortedMethods.forEach(([m, s]) => {
      const mPct = Math.round((s.hits / s.total) * 100);
      const t2Pct = Math.round((s.top2 / s.total) * 100);
      content += `  ${m.padEnd(32)} main:${String(mPct+'%').padStart(5)}  top2:${String(t2Pct+'%').padStart(5)}  n=${s.total}\n`;
    });
    content += '\n';

    // Commons Sub-Pattern Analysis
    const allRolls = logs2str.map(log => String(log.actual)).filter(Boolean);
    if (allRolls.length >= 6) {
      content += `--- 📊 Commons Sub-Pattern Analysis ---\n\n`;
      const rollCounts = {};
      allRolls.forEach(r => { rollCounts[r] = (rollCounts[r] || 0) + 1; });
      const sortedRolls = Object.entries(rollCounts).sort((a, b) => b[1] - a[1]).map(([val]) => val);
      const spCommons = sortedRolls.slice(0, 2);
      const spNoise = sortedRolls.slice(2);
      content += `Commons: [${spCommons.join(', ')}]\nNoise:   [${spNoise.join(', ')}]\n\n`;

      const markers = allRolls.map(r => r === spCommons[0] ? 'A' : r === spCommons[1] ? 'B' : 'N');
      const displayCount = Math.min(20, allRolls.length);
      content += `Roll sequence (last ${displayCount}):\n`;
      content += `Roll: ${allRolls.slice(-displayCount).map(r => r.padStart(2)).join(' | ')}\n`;
      content += `Type: ${markers.slice(-displayCount).map(m => m.padStart(2)).join(' | ')}\n\n`;

      const pc = { 'A→A': 0, 'A→B': 0, 'B→A': 0, 'B→B': 0, 'N→A': 0, 'N→B': 0, 'A→N': 0, 'B→N': 0 };
      for (let i = 0; i < markers.length - 1; i++) {
        const key = `${markers[i]}→${markers[i + 1]}`;
        if (pc[key] !== undefined) pc[key]++;
      }
      content += `Pair transitions:\n`;
      content += `  ${spCommons[0]}→${spCommons[0]}: ${pc['A→A']}x (run)  |  ${spCommons[0]}→${spCommons[1]}: ${pc['A→B']}x (alt)\n`;
      content += `  ${spCommons[1]}→${spCommons[0]}: ${pc['B→A']}x (alt)  |  ${spCommons[1]}→${spCommons[1]}: ${pc['B→B']}x (run)\n`;
      content += `  Noise→${spCommons[0]}: ${pc['N→A']}x  |  Noise→${spCommons[1]}: ${pc['N→B']}x\n`;
      content += `  ${spCommons[0]}→Noise: ${pc['A→N']}x  |  ${spCommons[1]}→Noise: ${pc['B→N']}x\n\n`;

      const altCount = pc['A→B'] + pc['B→A'];
      const runCount = pc['A→A'] + pc['B→B'];
      const noiseInserts = pc['A→N'] + pc['B→N'];
      let patternType = 'MIXED';
      if (altCount > runCount * 1.5) patternType = 'ALTERNATING (A-B-A-B)';
      else if (runCount > altCount * 1.5) patternType = 'RUNS (A-A-B-B)';
      content += `Pattern: ${patternType}\n`;
      content += `  Alt: ${altCount}  |  Runs: ${runCount}  |  Noise inserts: ${noiseInserts}\n`;
      if (noiseInserts > 0) {
        const commonsOnly = markers.filter(m => m !== 'N').length;
        content += `  Avg noise every ~${Math.round(commonsOnly / noiseInserts)} commons\n`;
      }
      let sinceNoise = 0;
      for (let i = markers.length - 1; i >= 0; i--) { if (markers[i] === 'N') break; sinceNoise++; }
      content += `  Commons since last noise: ${sinceNoise}\n\n`;
    }
  }

  // 4-str section
  if (logs4str.length > 0) {
    content += '--- 4-str ---\n';
    logs4str.forEach(log => {
      const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
      const pred = log.prediction || '—';
      const actual = log.actual || '—';
      const conf = Math.round((log.confidence || 0) * 100);
      const isCorrect = pred === actual;
      content += `[${time}] 4-str → pred: ${pred} (${conf}%) | ${isCorrect ? '✅' : '❌ MISS'} | actual: ${actual}\n\n`;
    });
  } else {
    content += '--- 4-str ---\n(none)\n\n';
  }

  // Long string section (chronological)
  content += '--- Long String (chronological) ---\n';
  const longString = debugLogs.map(log => log.actual).filter(Boolean).join('');
  content += longString || '(none)';

  // Create blob and download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.href = url;
  link.download = `svarog_debug_${timestamp}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}


export function exportLongStringAnalysis(analysis) {
  if (!analysis) {
    alert('No analysis data to export');
    return;
  }

  const { cleaned, pairs, rolls, digitCounts } = analysis;
  
  let content = '=== Long String Analysis ===\n\n';
  content += `Input String: ${cleaned}\n`;
  content += `Total Length: ${cleaned.length} digits\n\n`;
  
  if (digitCounts) {
    content += '=== Digit Frequency ===\n';
    content += `1: ${digitCounts['1'] || 0} times\n`;
    content += `2: ${digitCounts['2'] || 0} times\n`;
    content += `3: ${digitCounts['3'] || 0} times\n`;
    content += `4: ${digitCounts['4'] || 0} times\n\n`;
  }
  
  if (pairs && pairs.length > 0) {
    content += '=== Decoded Pairs ===\n';
    pairs.forEach((pair, idx) => {
      const roll = rolls && rolls[idx] ? rolls[idx] : '??';
      content += `${pair} → ${roll}\n`;
    });
  }

  // Create blob and download
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.href = url;
  link.download = `longstring_analysis_${timestamp}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportKiyoDebugData(kiyoData, debugLogs) {
  if (!kiyoData && (!debugLogs || debugLogs.length === 0)) {
    alert('No Kiyo debug data to export');
    return;
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    waveAnalysis: kiyoData || null,
    debugLogs: debugLogs ? debugLogs.filter(log => log.source === 'kiyo').slice(0, 100) : [],
  };

  // Create blob and download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  link.href = url;
  link.download = `kiyo_debug_${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
