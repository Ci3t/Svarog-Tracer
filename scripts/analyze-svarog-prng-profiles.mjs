import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

const VALUES = ['41', '42', '43', '44'];

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function entropy(counts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!total) return 0;
  return Object.values(counts).reduce((sum, count) => {
    if (!count) return sum;
    const p = count / total;
    return sum - p * Math.log2(p);
  }, 0);
}

function parseTimeToSeconds(label) {
  const match = String(label || '').match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const meridiem = match[4].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseReplayRows(text, file) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const block = match[2] || '';
    const actual = block.match(/actual_next:\s*(\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full:\s*([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter((v) => VALUES.includes(v)) : [];
    if (actual && rolls.length >= 6) {
      rows.push({
        file,
        source: 'replay',
        timeLabel: match[1],
        timestampSec: parseTimeToSeconds(match[1]),
        actual,
        rolls,
      });
    }
  }
  return rows;
}

function parseLegacyCtxRows(text, file) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][^\n]*actual:\s*(\d+)[^\n]*?\|\s*ctx:\s*([0-9,\s]+)/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const rolls = (match[3] || '').split(/[,\s]+/).filter((v) => VALUES.includes(v));
    if (rolls.length >= 6) {
      rows.push({
        file,
        source: 'legacy-ctx',
        timeLabel: match[1],
        timestampSec: parseTimeToSeconds(match[1]),
        actual: match[2],
        rolls,
      });
    }
  }
  return rows;
}

function parseTimeline(text, file) {
  const rows = [];
  const translatedRe = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][^\n]*TRANSLATED:\s*(\d+)/gi;
  let match;
  while ((match = translatedRe.exec(text)) !== null) {
    if (VALUES.includes(match[2])) {
      rows.push({
        file,
        timeLabel: match[1],
        timestampSec: parseTimeToSeconds(match[1]),
        value: match[2],
      });
    }
  }
  if (rows.length) return rows;

  const actualRe = /\[(\d+:\d+:\d+\s*(?:AM|PM))\]\s*actual:\s*(\d+)/gi;
  while ((match = actualRe.exec(text)) !== null) {
    if (VALUES.includes(match[2])) {
      rows.push({
        file,
        timeLabel: match[1],
        timestampSec: parseTimeToSeconds(match[1]),
        value: match[2],
      });
    }
  }
  return rows;
}

function rowsFromTimeline(timeline) {
  const rows = [];
  for (let i = 6; i < timeline.length; i += 1) {
    rows.push({
      file: timeline[i].file,
      source: 'timeline',
      timeLabel: timeline[i].timeLabel,
      timestampSec: timeline[i].timestampSec,
      actual: timeline[i].value,
      rolls: timeline.slice(0, i).map((row) => row.value),
    });
  }
  return rows;
}

function readTextFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    const root = resolve(dir);
    const walk = (current) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && /\.(txt|md)$/i.test(entry.name)) {
          files.push({ path: full, name: basename(full), text: readFileSync(full, 'utf8') });
        }
      }
    };
    try {
      walk(root);
    } catch {
      // Optional folders are allowed to be missing.
    }
  }
  return files;
}

function splitFiveMinute(timeline) {
  if (!timeline.length) return [];
  const sessions = [];
  let current = [];
  let start = null;
  for (const row of timeline) {
    if (row.timestampSec == null) {
      current.push(row);
      continue;
    }
    if (start == null) {
      start = row.timestampSec;
      current.push(row);
      continue;
    }
    if (row.timestampSec - start >= 300 && current.length) {
      sessions.push(current);
      current = [row];
      start = row.timestampSec;
    } else {
      current.push(row);
    }
  }
  if (current.length) sessions.push(current);
  return sessions;
}

function countsFor(values) {
  const counts = Object.fromEntries(VALUES.map((value) => [value, 0]));
  for (const value of values) counts[value] += 1;
  return counts;
}

function rankedCounts(values) {
  const counts = countsFor(values);
  return VALUES.map((value) => ({ value, count: counts[value], pct: pct(counts[value], values.length) }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function profileKey(seq) {
  const ids = new Map();
  let next = 0;
  return seq.map((value) => {
    if (!ids.has(value)) ids.set(value, String.fromCharCode(65 + next++));
    return ids.get(value);
  }).join('');
}

function scoreRows(rows) {
  const summary = {
    total: 0,
    mainExact: 0,
    mainTop2: 0,
    svarogExact: 0,
    svarogTop2: 0,
    noiseActuals: 0,
    noiseExact: 0,
    noiseTop2: 0,
    commonActuals: 0,
    commonExact: 0,
    breakLeadRows: 0,
    breakLeadHits: 0,
    misses: [],
    profileStats: new Map(),
    modeStats: new Map(),
    transitionStats: new Map(),
  };

  for (const row of rows) {
    const result = predictWithPairs(row.rolls);
    const mainPair = [result.prediction, result.alt].filter(Boolean);
    const svarogPair = [result.analyzerPrediction, result.analyzerAlt].filter(Boolean);
    const isNoiseActual = (result.noise || []).includes(row.actual);
    const stateKey = result.sessionState?.key || result.sessionStateKey || 'unknown';
    const reason = result.svarogBreakLeadReason || 'none';

    summary.total += 1;
    if (result.prediction === row.actual) summary.mainExact += 1;
    if (mainPair.includes(row.actual)) summary.mainTop2 += 1;
    if (result.analyzerPrediction === row.actual) summary.svarogExact += 1;
    if (svarogPair.includes(row.actual)) summary.svarogTop2 += 1;

    if (isNoiseActual) {
      summary.noiseActuals += 1;
      if (result.analyzerPrediction === row.actual) summary.noiseExact += 1;
      if (svarogPair.includes(row.actual)) summary.noiseTop2 += 1;
    } else {
      summary.commonActuals += 1;
      if (result.analyzerPrediction === row.actual) summary.commonExact += 1;
    }

    if (result.svarogBreakLeadReason) {
      summary.breakLeadRows += 1;
      if (result.analyzerPrediction === row.actual) summary.breakLeadHits += 1;
    }

    const tail = row.rolls.slice(-6);
    const pKey = profileKey(tail);
    const pStat = summary.profileStats.get(pKey) || {
      key: pKey,
      samples: 0,
      exact: 0,
      top2: 0,
      next: Object.fromEntries(VALUES.map((value) => [value, 0])),
      examples: [],
    };
    pStat.samples += 1;
    if (result.analyzerPrediction === row.actual) pStat.exact += 1;
    if (svarogPair.includes(row.actual)) pStat.top2 += 1;
    pStat.next[row.actual] += 1;
    if (pStat.examples.length < 2) pStat.examples.push(`${tail.join(' ')} -> ${row.actual}`);
    summary.profileStats.set(pKey, pStat);

    const mKey = `${stateKey}/${reason}`;
    const mStat = summary.modeStats.get(mKey) || { key: mKey, samples: 0, exact: 0, top2: 0, noise: 0, noiseExact: 0 };
    mStat.samples += 1;
    if (result.analyzerPrediction === row.actual) mStat.exact += 1;
    if (svarogPair.includes(row.actual)) mStat.top2 += 1;
    if (isNoiseActual) {
      mStat.noise += 1;
      if (result.analyzerPrediction === row.actual) mStat.noiseExact += 1;
    }
    summary.modeStats.set(mKey, mStat);

    const last = row.rolls.at(-1);
    const tKey = `${last}->${row.actual}`;
    summary.transitionStats.set(tKey, (summary.transitionStats.get(tKey) || 0) + 1);

    if (result.analyzerPrediction !== row.actual) {
      summary.misses.push({
        file: basename(row.file),
        source: row.source,
        actual: row.actual,
        ctx: row.rolls.join(' '),
        svarog: `${result.analyzerPrediction || '?'} / ${result.analyzerAlt || '?'}`,
        main: `${result.prediction || '?'} / ${result.alt || '?'}`,
        state: stateKey,
        reason,
        isNoiseActual,
        noiseRisk: result.noiseRisk ?? 0,
        pairSafety: result.pairSafety,
        noiseTiming: result.analyzerNoiseTiming,
        topNoise: result.analyzerNoiseDecisionScores?.[0]?.value || null,
        topNoiseScore: Math.round(result.analyzerNoiseDecisionScores?.[0]?.noiseScore || 0),
        topCommon: result.analyzerCommonDecisionScores?.[0]?.value || null,
        topCommonScore: Math.round(result.analyzerCommonDecisionScores?.[0]?.commonScore || 0),
      });
    }
  }

  return summary;
}

function analyzeSequences(timelines) {
  const allValues = timelines.flatMap((timeline) => timeline.map((row) => row.value));
  const globalCounts = rankedCounts(allValues);
  const sessions = timelines.flatMap((timeline) => splitFiveMinute(timeline));
  const sessionSummaries = sessions
    .filter((session) => session.length >= 6)
    .map((session) => {
      const values = session.map((row) => row.value);
      const ranked = rankedCounts(values);
      const commonSet = new Set(ranked.slice(0, 2).map((row) => row.value));
      let noiseStreaks = [];
      let commonGaps = [];
      let inNoise = false;
      let noiseLen = 0;
      let commonGap = 0;
      for (const value of values) {
        if (commonSet.has(value)) {
          if (inNoise && noiseLen) {
            noiseStreaks.push(noiseLen);
            noiseLen = 0;
          }
          inNoise = false;
          commonGap += 1;
        } else {
          if (!inNoise && commonGap) commonGaps.push(commonGap);
          inNoise = true;
          commonGap = 0;
          noiseLen += 1;
        }
      }
      if (noiseLen) noiseStreaks.push(noiseLen);
      return {
        file: basename(session[0].file),
        rolls: values.length,
        pair: ranked.slice(0, 2).map((row) => row.value).join('/'),
        top2Pct: pct(ranked[0].count + ranked[1].count, values.length),
        entropy: Math.round(entropy(countsFor(values)) * 100) / 100,
        avgCommonGapBeforeNoise: commonGaps.length ? Math.round((commonGaps.reduce((a, b) => a + b, 0) / commonGaps.length) * 10) / 10 : null,
        singleNoisePct: pct(noiseStreaks.filter((len) => len === 1).length, noiseStreaks.length),
      };
    });

  return {
    totalRolls: allValues.length,
    globalCounts,
    globalEntropy: Math.round(entropy(countsFor(allValues)) * 100) / 100,
    sessions: sessionSummaries,
  };
}

function mapToTopArray(map, limit, mapper) {
  return [...map.values()].map(mapper).sort((a, b) => (b.samples || b.count || 0) - (a.samples || a.count || 0)).slice(0, limit);
}

function toMarkdown({ dirs, files, timelines, rows, sequence, scored }) {
  const lines = [];
  lines.push('# Svarog PRNG / Profile Analysis');
  lines.push('');
  lines.push('This is observed-output analysis. It cannot prove the server PRNG algorithm or salt because the data is already collapsed into four labels (`41-44`).');
  lines.push('');
  lines.push('## Corpus');
  lines.push(`- Directories: ${dirs.map((dir) => `\`${dir}\``).join(', ')}`);
  lines.push(`- Text files scanned: \`${files.length}\``);
  lines.push(`- Timeline rolls parsed: \`${sequence.totalRolls}\``);
  lines.push(`- Replay/eval rows parsed: \`${rows.length}\``);
  lines.push(`- Global entropy: \`${sequence.globalEntropy}\` / 2.00 bits`);
  lines.push(`- Global split: ${sequence.globalCounts.map((row) => `\`${row.value}:${row.pct}%\``).join(' ')}`);
  lines.push('');

  lines.push('## Current Predictor Replay');
  lines.push(`- Main exact: \`${scored.mainExact}/${scored.total} (${pct(scored.mainExact, scored.total)}%)\``);
  lines.push(`- Main top-2: \`${scored.mainTop2}/${scored.total} (${pct(scored.mainTop2, scored.total)}%)\``);
  lines.push(`- Svarog exact: \`${scored.svarogExact}/${scored.total} (${pct(scored.svarogExact, scored.total)}%)\``);
  lines.push(`- Svarog top-2: \`${scored.svarogTop2}/${scored.total} (${pct(scored.svarogTop2, scored.total)}%)\``);
  lines.push(`- Noise exact: \`${scored.noiseExact}/${scored.noiseActuals} (${pct(scored.noiseExact, scored.noiseActuals)}%)\``);
  lines.push(`- Noise top-2: \`${scored.noiseTop2}/${scored.noiseActuals} (${pct(scored.noiseTop2, scored.noiseActuals)}%)\``);
  lines.push(`- Break-lead exact: \`${scored.breakLeadHits}/${scored.breakLeadRows} (${pct(scored.breakLeadHits, scored.breakLeadRows)}%)\``);
  lines.push('');

  lines.push('## Session Profile Signals');
  const pairCounts = new Map();
  for (const session of sequence.sessions) pairCounts.set(session.pair, (pairCounts.get(session.pair) || 0) + 1);
  for (const [pair, count] of [...pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    lines.push(`- Dominant pair \`${pair}\`: \`${count}\` sessions`);
  }
  const avgTop2 = sequence.sessions.length
    ? sequence.sessions.reduce((sum, session) => sum + session.top2Pct, 0) / sequence.sessions.length
    : 0;
  const avgGap = sequence.sessions
    .filter((session) => session.avgCommonGapBeforeNoise != null)
    .reduce((sum, session, _index, array) => sum + session.avgCommonGapBeforeNoise / array.length, 0);
  const avgSingleNoise = sequence.sessions.length
    ? sequence.sessions.reduce((sum, session) => sum + session.singleNoisePct, 0) / sequence.sessions.length
    : 0;
  lines.push(`- Average top-2 session share: \`${Math.round(avgTop2)}%\``);
  lines.push(`- Average common gap before noise: \`${Math.round(avgGap * 10) / 10}\` rolls`);
  lines.push(`- Average single-noise streak rate: \`${Math.round(avgSingleNoise)}%\``);
  lines.push('');

  lines.push('## Svarog Mode Quality');
  const modeRows = [...scored.modeStats.values()]
    .sort((a, b) => b.samples - a.samples)
    .slice(0, 16);
  for (const row of modeRows) {
    lines.push(`- \`${row.key}\`: samples \`${row.samples}\`, exact \`${pct(row.exact, row.samples)}%\`, top-2 \`${pct(row.top2, row.samples)}%\`, noise exact \`${pct(row.noiseExact, row.noise)}%\` over \`${row.noise}\` noise actuals`);
  }
  lines.push('');

  lines.push('## Repeating Tail Profiles');
  const profileRows = [...scored.profileStats.values()]
    .filter((row) => row.samples >= 5)
    .map((row) => {
      const top = Object.entries(row.next).sort((a, b) => b[1] - a[1])[0];
      return {
        ...row,
        topNext: top?.[0] || '?',
        topNextPct: pct(top?.[1] || 0, row.samples),
        exactPct: pct(row.exact, row.samples),
        top2Pct: pct(row.top2, row.samples),
      };
    })
    .sort((a, b) => b.topNextPct - a.topNextPct || b.samples - a.samples)
    .slice(0, 18);
  for (const row of profileRows) {
    lines.push(`- Shape \`${row.key}\`: next \`${row.topNext}\` at \`${row.topNextPct}%\` over \`${row.samples}\`; Svarog exact \`${row.exactPct}%\`; examples ${row.examples.map((ex) => `\`${ex}\``).join(', ')}`);
  }
  lines.push('');

  lines.push('## Largest Svarog Miss Classes');
  const missGroups = new Map();
  for (const miss of scored.misses) {
    const key = `${miss.state}/${miss.reason}/${miss.isNoiseActual ? 'noise' : 'common'}`;
    const group = missGroups.get(key) || { key, count: 0, examples: [] };
    group.count += 1;
    if (group.examples.length < 4) group.examples.push(miss);
    missGroups.set(key, group);
  }
  for (const group of [...missGroups.values()].sort((a, b) => b.count - a.count).slice(0, 10)) {
    lines.push(`- \`${group.key}\`: \`${group.count}\` misses`);
    for (const ex of group.examples) {
      lines.push(`  - ${ex.file}: actual \`${ex.actual}\`, Svarog \`${ex.svarog}\`, risk \`${ex.noiseRisk}%\`, topNoise \`${ex.topNoise}:${ex.topNoiseScore}\`, topCommon \`${ex.topCommon}:${ex.topCommonScore}\`, ctx \`${ex.ctx}\``);
    }
  }
  lines.push('');

  lines.push('## Model Implication');
  lines.push('- The output does not look like a stable global bias; global frequency is close to uniform.');
  lines.push('- The exploitable signal is session-local: dominant pair, short tail shape, noise gap, and whether noise appears as single-hit or sweep.');
  lines.push('- Svarog should use profile matching before generic noise aggression. The misses are mostly mixed-profile/common-return, not pure late-noise.');
  lines.push('');
  return lines.join('\n');
}

const dirs = process.argv.slice(2);
const scanDirs = dirs.length ? dirs : ['debugfiles/testdata', 'debugpatternfiles'];
const files = readTextFiles(scanDirs);
const timelines = [];
const evalRows = [];

for (const file of files) {
  const replay = parseReplayRows(file.text, file.path);
  const legacy = parseLegacyCtxRows(file.text, file.path);
  const timeline = parseTimeline(file.text, file.path);
  if (timeline.length) timelines.push(timeline);
  if (replay.length || legacy.length) {
    evalRows.push(...replay, ...legacy);
  } else if (timeline.length >= 7) {
    evalRows.push(...rowsFromTimeline(timeline));
  }
}

const sequence = analyzeSequences(timelines);
const scored = scoreRows(evalRows);
const markdown = toMarkdown({ dirs: scanDirs, files, timelines, rows: evalRows, sequence, scored });
const output = resolve('debugfiles', 'svarog-prng-profile-analysis.md');
writeFileSync(output, markdown, 'utf8');

console.log(markdown);
console.log(`\nWrote ${output}`);
