// Export Helper Utilities for Debug Data
import { 
  predictWithPairs, 
  formatTrendsForExport, 
  formatWaveSignalsForExport,
  formatPairRowForExport 
} from './pairTransitionPredictor';

export function exportDebugLogsToTXT(debugLogs, entries = []) {
  if (!debugLogs || debugLogs.length === 0) {
    alert('No debug logs to export');
    return;
  }

  let content = '=== Svarog Tracer Debug Export ===\n\n';

  // Separate logs by kind (reverse for newest first)
  const logs2str = [...debugLogs].reverse().filter(log => log.kind === '2');
  const logs4str = [...debugLogs].reverse().filter(log => log.kind === '4');

  // Helper to format a single log entry
  const formatLog = (log) => {
    const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
    const kind = log.kind || '?';
    const pred = log.prediction || '—';
    const actual = log.actual || '—';
    const conf = Math.round((log.confidence || 0) * 100);
    const alt = log.alt || '';
    const mode = log.mode || 'unknown';
    const pattern = log.pattern?.name || log.pattern?.pattern || log.pattern || '';
    const dist = log.distribution ? formatDistribution(log.distribution) : '';
    const ctx = log.ctx ? (Array.isArray(log.ctx) ? log.ctx.join(', ') : log.ctx) : '';
    const isCorrect = pred === actual || pred === actual.slice(0, pred.length);
    const status = isCorrect ? '✅' : `❌ ${log.status || 'MISS'}`;
    const streak = log.streak ? `Streak: ${log.streak}` : '';
    const last5 = log.last5 || '';
    
    // Enhanced with commons and noise
    const commons = log.commons ? `Commons: [${log.commons.join(', ')}]` : '';
    const noise = log.noise ? `Noise: [${log.noise.join(', ')}]` : '';
    
    let line = `[${time}] ${kind}-str → pred: ${pred} (${conf}%)`;
    if (alt) line += ` | alt: ${alt}`;
    if (mode) line += ` | mode: ${mode}`;
    if (pattern) line += ` | Pattern: ${pattern}`;
    if (dist) line += ` | Dist: ${dist}`;
    line += ` | ${status}`;
    if (streak) line += ` | ${streak}`;
    if (last5) line += ` | Last5: ${last5}`;
    line += ` | actual: ${actual}`;
    if (ctx) line += ` | ctx: ${ctx}`;
    if (commons) line += ` | ${commons}`;
    if (noise) line += ` | ${noise}`;
    
    return line;
  };

  const formatDistribution = (dist) => {
    if (typeof dist !== 'object') return '';
    return Object.entries(dist)
      .map(([key, data]) => {
        const pct = typeof data === 'object' ? Math.round((data.pct || 0)) : Math.round(data || 0);
        return `${key}:${pct}%`;
      })
      .join(',');
  };

  // NEW: Live Tracking (2-str) Section with commons, noise, trends
  if (entries && entries.length >= 6) {
    content += '--- Live Tracking (2-str) ---\n';
    const rolls = entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
    
    if (rolls.length >= 6) {
      const pairData = predictWithPairs(rolls);
      const time = new Date().toLocaleTimeString();
      content += `[${time}] Commons: [${pairData.commons?.join(', ') || '—'}] | Noise: [${pairData.noise?.join(', ') || '—'}] | Trend: ${formatTrendsForExport(pairData.trends)}\n`;
      content += `         Distribution: ${Object.entries(pairData.distribution || {}).map(([k,v]) => `${k}:${v}%`).join(', ')}\n\n`;
    }
  }

  // NEW: Pair Predictor (Experimental) Section
  if (entries && entries.length >= 6) {
    content += '--- Pair Predictor (Experimental) ---\n';
    const rolls = entries
      .map(e => (e.translated || '').slice(0, 2))
      .filter(r => r && r.length === 2);
    
    if (rolls.length >= 6) {
      const pairData = predictWithPairs(rolls);
      const time = new Date().toLocaleTimeString();
      content += `[${time}] Pair pred: ${pairData.pairPrediction || '—'} | Freq pred: ${pairData.freqPrediction || '—'} | Used: ${pairData.method} (flipProb: ${pairData.waveSignals?.waveFlipProbability || 0}%)\n`;
      content += `         ${formatWaveSignalsForExport(pairData.waveSignals)} | Matrix[${pairData.lastRoll}→]: ${formatPairRowForExport(pairData.pairMatrix, pairData.lastRoll)}\n\n`;
    }
  }

  // 2-str section
  if (logs2str.length > 0) {
    content += '--- 2-str ---\n';
    logs2str.forEach(log => {
      content += formatLog(log) + '\n\n';
    });
  }

  // =========================================================================
  // 🔥 NEW: EXPERIMENTAL PREDICTOR REPLAY
  // Re-run predictWithPairs on each log's context to show what it would predict
  // =========================================================================
  if (logs2str.length > 0) {
    content += '\n--- 🧪 EXPERIMENTAL PREDICTOR (Pair Matrix) ---\n';
    content += '(Replaying each roll with experimental predictor)\n\n';
    
    let expHits = 0;
    let expTop2 = 0;
    let expTotal = 0;
    
    logs2str.forEach(log => {
      // Get the context (rolls before this prediction)
      const ctx = log.ctx;
      const actualRoll = log.actual;
      
      if (ctx && Array.isArray(ctx) && ctx.length >= 6) {
        const rolls = ctx.map(r => String(r));
        const expData = predictWithPairs(rolls);
        
        const expPred = expData.prediction;
        const expAlt = expData.alt;
        const expMethod = expData.method;
        const expConf = Math.round((expData.confidence || 0) * 100);
        
        const isHit = expPred === actualRoll;
        const isAltHit = expAlt === actualRoll;
        const status = isHit ? '✅ HIT' : (isAltHit ? '⚡ ALT-HIT' : '❌ MISS');
        
        if (isHit) expHits++;
        if (isHit || isAltHit) expTop2++;
        expTotal++;
        
        const time = log.ts ? new Date(log.ts).toLocaleTimeString() : '--:--:--';
        
        // Clear, noticeable format
        content += `[${time}] 🧪 EXP → pred: ${expPred} (${expConf}%) | alt: ${expAlt} | method: ${expMethod}\n`;
        content += `         ↳ actual: ${actualRoll} | ${status}\n`;
        // Beast Mode indicators
        if (expData.noiseDoubleTapLikely) content += `         🔁 DOUBLE-TAP: Expecting ${expData.doubleTapValue} repeat!\n`;
        if (expData.wasChange && expData.smartRunScores?.[expData.lastRoll] >= 1.2) content += `         📈 PAIR-EXPECT: Boosting ${expData.lastRoll}\n`;
        if (expData.currentRunLen >= 3) content += `         ⚠️ LONG RUN: ${expData.lastRoll} x${expData.currentRunLen} - break likely\n`;
        if (expData.momentumScores) {
          const hotStr = Object.entries(expData.momentumScores).map(([v,s]) => `${v}:${s}`).join(',');
          content += `         🔥 MOMENTUM: ${hotStr} | Hot: [${expData.hotValues?.join(',')}]\n`;
        }
        if (expData.isUncertain) content += `         ⚠️ UNCERTAIN (gap: ${expData.confidenceGap}%)\n`;
        if (expData.isAlternating) content += `         🔄 ALTERNATING: ${expData.alternatingPair?.join('↔')}\n`;
        if (expData.patternShifted) content += `         🔀 PATTERN SHIFT: ${expData.shiftedToValue} is rising!\n`;
        content += '\n';
      }
    });
    
    // Summary with TOP-2 RATE
    const expAcc = expTotal > 0 ? Math.round((expHits / expTotal) * 100) : 0;
    const expTop2Acc = expTotal > 0 ? Math.round((expTop2 / expTotal) * 100) : 0;
    content += `--- EXPERIMENTAL SUMMARY ---\n`;
    content += `Hits (main):    ${expHits}/${expTotal} = ${expAcc}%\n`;
    content += `Top-2 (±alt):   ${expTop2}/${expTotal} = ${expTop2Acc}%\n\n`;
  }

  // 4-str section
  if (logs4str.length > 0) {
    content += '\n--- 4-str ---\n';
    logs4str.forEach(log => {
      content += formatLog(log) + '\n\n';
    });
  } else {
    content += '\n--- 4-str ---\n(none)\n\n';
  }

  // Merged section (all logs, newest first)
  content += '\n--- merged (all) ---\n';
  [...debugLogs].reverse().forEach(log => {
    content += formatLog(log) + '\n\n';
  });

  // Long string section (chronological order - oldest to newest)
  content += '\n--- Long String (chronological) ---\n';
  const longString = debugLogs
    .map(log => log.actual)
    .filter(Boolean)
    .join('');
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
