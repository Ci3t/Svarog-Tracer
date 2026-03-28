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

    logs2str.forEach(log => {
      const ctx = log.ctx;
      const actual = log.actual;
      if (!ctx || !Array.isArray(ctx) || ctx.length < 6) return;

      const rolls = ctx.map(r => String(r));
      const data = predictWithPairs(rolls);

      const pred = data.prediction;
      const alt = data.alt;
      const conf = Math.round((data.confidence || 0) * 100);
      const method = data.method || 'unknown';
      const commons = data.commons || [];
      const noise = data.noise || [];
      const dist = data.distribution || {};

      const isHit = pred === actual;
      const isAltHit = alt === actual;
      const status = isHit ? '✅ HIT' : (isAltHit ? '⚡ ALT-HIT' : '❌ MISS');

      if (isHit) hits++;
      if (isHit || isAltHit) top2++;
      total++;

      if (!methodStats[method]) methodStats[method] = { hits: 0, top2: 0, total: 0 };
      methodStats[method].total++;
      if (isHit) methodStats[method].hits++;
      if (isHit || isAltHit) methodStats[method].top2++;

      const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
      const distStr = formatDistribution(dist);

      content += `[${time}] pred: ${pred} (${conf}%) | alt: ${alt} | method: ${method}\n`;
      content += `         ↳ actual: ${actual} | ${status}\n`;
      content += `         Commons: [${commons.join(', ')}] | Noise: [${noise.join(', ')}]\n`;
      if (data.trustedPair?.length === 2) {
        content += `         Pair: [${data.trustedPair.join(', ')}] | Safety: ${data.pairSafety || 'unknown'} | Noise risk: ${data.noiseRisk ?? 0}%\n`;
        const analyzerPicks = [pred, alt].filter((value, idx, arr) => value && arr.indexOf(value) === idx);
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
      content += '\n';
    });

    // Summary
    const mainPct = total > 0 ? Math.round((hits / total) * 100) : 0;
    const top2Pct = total > 0 ? Math.round((top2 / total) * 100) : 0;
    content += `--- Summary ---\n`;
    content += `Main hits:  ${hits}/${total} = ${mainPct}%\n`;
    content += `Top-2:      ${top2}/${total} = ${top2Pct}%\n\n`;
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
