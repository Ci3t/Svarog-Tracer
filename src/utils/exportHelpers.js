// Export Helper Utilities for Debug Data
export function exportDebugLogsToTXT(debugLogs) {
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

  // 2-str section
  if (logs2str.length > 0) {
    content += '--- 2-str ---\n';
    logs2str.forEach(log => {
      content += formatLog(log) + '\n\n';
    });
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
