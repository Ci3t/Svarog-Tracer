import { readFileSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

function parseTimeLabelToSeconds(label) {
  const match = label.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let [, hh, mm, ss, meridiem] = match;
  let hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Number(ss);
  const upper = meridiem.toUpperCase();
  if (upper === 'PM' && hours !== 12) hours += 12;
  if (upper === 'AM' && hours === 12) hours = 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseReplayBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const timeLabel = match[1] || null;
    const block = match[2] || '';
    const actual = block.match(/actual_next: (\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({
      actual,
      rolls,
      timeLabel,
      timestampSec: timeLabel ? parseTimeLabelToSeconds(timeLabel) : null,
    });
  }
  return rows;
}

function splitIntoFiveMinuteSessions(rows) {
  if (!rows.length) return [];
  const sessions = [];
  let current = [];
  let sessionStart = null;

  for (const row of rows) {
    if (row.timestampSec == null) {
      current.push(row);
      continue;
    }
    if (sessionStart == null) {
      sessionStart = row.timestampSec;
      current.push(row);
      continue;
    }
    const elapsed = row.timestampSec - sessionStart;
    if (elapsed >= 300 && current.length) {
      sessions.push(current);
      current = [row];
      sessionStart = row.timestampSec;
    } else {
      current.push(row);
    }
  }

  if (current.length) sessions.push(current);
  return sessions;
}

function scoreNoiseRows(rows) {
  let total = 0;
  let noiseRolls = 0;
  let svarogNoiseExact = 0;
  let svarogNoiseTop2 = 0;
  let mainNoiseExact = 0;
  let mainNoiseTop2 = 0;

  const timingMatrix = {
    not_due: { noise: 0, noNoise: 0 },
    approaching: { noise: 0, noNoise: 0 },
    due: { noise: 0, noNoise: 0 },
    unknown: { noise: 0, noNoise: 0 },
  };

  const noiseValueStats = {};
  const noiseMisses = [];

  for (const row of rows) {
    const result = predictWithPairs(row.rolls);
    total += 1;

    const mainPred = result.prediction || null;
    const altPred = result.alt || null;
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const commons = result.commons || [];
    const noise = result.noise || [];
    const timing = result.analyzerNoiseTiming || 'unknown';
    const dueRatio = result.analyzerNoiseDueRatio || 0;

    const actualIsNoise = !commons.includes(row.actual);

    if (actualIsNoise) {
      noiseRolls += 1;

      if (svarogPred === row.actual) svarogNoiseExact += 1;
      if (svarogPred === row.actual || svarogAlt === row.actual) svarogNoiseTop2 += 1;
      if (mainPred === row.actual) mainNoiseExact += 1;
      if (mainPred === row.actual || altPred === row.actual) mainNoiseTop2 += 1;

      if (!noiseValueStats[row.actual]) {
        noiseValueStats[row.actual] = { total: 0, svarogExact: 0, svarogTop2: 0 };
      }
      noiseValueStats[row.actual].total += 1;
      if (svarogPred === row.actual) noiseValueStats[row.actual].svarogExact += 1;
      if (svarogPred === row.actual || svarogAlt === row.actual) noiseValueStats[row.actual].svarogTop2 += 1;

      if (svarogPred !== row.actual && svarogAlt !== row.actual) {
        noiseMisses.push({
          actual: row.actual,
          ctx: row.rolls.join(' '),
          svarog: `${svarogPred || 'none'} / ${svarogAlt || 'none'}`,
          main: `${mainPred || 'none'} / ${altPred || 'none'}`,
          timing,
          dueRatio: Math.round(dueRatio * 100),
          commons: commons.join(','),
          noise: noise.join(','),
        });
      }
    }

    const timingKey = timing === 'not_due' || timing === 'approaching' || timing === 'due' ? timing : 'unknown';
    if (actualIsNoise) {
      timingMatrix[timingKey].noise += 1;
    } else {
      timingMatrix[timingKey].noNoise += 1;
    }
  }

  return {
    total,
    noiseRolls,
    svarogNoiseExact,
    svarogNoiseTop2,
    mainNoiseExact,
    mainNoiseTop2,
    timingMatrix,
    noiseValueStats,
    noiseMisses,
  };
}

function pct(hit, total) {
  return total ? Math.round((hit / total) * 100) : 0;
}

function scoreFile(filePath) {
  const rows = parseReplayBlocks(filePath);
  const sessions = splitIntoFiveMinuteSessions(rows);
  const overall = scoreNoiseRows(rows);
  return {
    file: basename(filePath),
    sessions: sessions.map((sessionRows, index) => ({
      index: index + 1,
      ...scoreNoiseRows(sessionRows),
    })),
    ...overall,
  };
}

function aggregateStats(results) {
  let total = 0;
  let noiseRolls = 0;
  let svarogNoiseExact = 0;
  let svarogNoiseTop2 = 0;
  let mainNoiseExact = 0;
  let mainNoiseTop2 = 0;

  const timingMatrix = {
    not_due: { noise: 0, noNoise: 0 },
    approaching: { noise: 0, noNoise: 0 },
    due: { noise: 0, noNoise: 0 },
    unknown: { noise: 0, noNoise: 0 },
  };

  const noiseValueStats = {};
  const allMisses = [];

  for (const r of results) {
    total += r.total;
    noiseRolls += r.noiseRolls;
    svarogNoiseExact += r.svarogNoiseExact;
    svarogNoiseTop2 += r.svarogNoiseTop2;
    mainNoiseExact += r.mainNoiseExact;
    mainNoiseTop2 += r.mainNoiseTop2;

    for (const key of Object.keys(timingMatrix)) {
      timingMatrix[key].noise += r.timingMatrix[key].noise;
      timingMatrix[key].noNoise += r.timingMatrix[key].noNoise;
    }

    for (const [val, stats] of Object.entries(r.noiseValueStats)) {
      if (!noiseValueStats[val]) noiseValueStats[val] = { total: 0, svarogExact: 0, svarogTop2: 0 };
      noiseValueStats[val].total += stats.total;
      noiseValueStats[val].svarogExact += stats.svarogExact;
      noiseValueStats[val].svarogTop2 += stats.svarogTop2;
    }

    allMisses.push(...r.noiseMisses);
  }

  return { total, noiseRolls, svarogNoiseExact, svarogNoiseTop2, mainNoiseExact, mainNoiseTop2, timingMatrix, noiseValueStats, allMisses };
}

const files = process.argv.slice(2).map((arg) => resolve(arg));

if (!files.length) {
  console.error('Usage: node scripts/eval-noise-predictor.mjs <txt-file> [more-files...]');
  process.exit(1);
}

const allResults = [];

for (const file of files) {
  const result = scoreFile(file);
  allResults.push(result);

  console.log(`\n========================================`);
  console.log(`FILE: ${result.file}`);
  console.log(`========================================`);
  console.log(`Total rolls: ${result.total}`);
  console.log(`Noise rolls: ${result.noiseRolls}`);
  console.log(`Main noise exact: ${result.mainNoiseExact}/${result.noiseRolls} = ${pct(result.mainNoiseExact, result.noiseRolls)}%`);
  console.log(`Main noise top2:  ${result.mainNoiseTop2}/${result.noiseRolls} = ${pct(result.mainNoiseTop2, result.noiseRolls)}%`);
  console.log(`Svarog noise exact: ${result.svarogNoiseExact}/${result.noiseRolls} = ${pct(result.svarogNoiseExact, result.noiseRolls)}%`);
  console.log(`Svarog noise top2:  ${result.svarogNoiseTop2}/${result.noiseRolls} = ${pct(result.svarogNoiseTop2, result.noiseRolls)}%`);

  result.sessions.forEach((session) => {
    if (session.noiseRolls === 0) return;
    console.log(
      `  Session ${session.index}: noise=${session.noiseRolls}, Svarog noise top2 ${session.svarogNoiseTop2}/${session.noiseRolls} = ${pct(session.svarogNoiseTop2, session.noiseRolls)}%`
    );
  });

  console.log(`\n  Timing Confusion Matrix:`);
  for (const [timing, counts] of Object.entries(result.timingMatrix)) {
    const totalTimed = counts.noise + counts.noNoise;
    if (totalTimed === 0) continue;
    console.log(`    ${timing}: noise=${counts.noise}, noNoise=${counts.noNoise} (noise rate: ${pct(counts.noise, totalTimed)}%)`);
  }

  console.log(`\n  Per-Noise-Value Stats:`);
  for (const [val, stats] of Object.entries(result.noiseValueStats)) {
    console.log(`    ${val}: exact=${stats.svarogExact}/${stats.total}=${pct(stats.svarogExact, stats.total)}%, top2=${stats.svarogTop2}/${stats.total}=${pct(stats.svarogTop2, stats.total)}%`);
  }

  if (result.noiseMisses.length > 0) {
    console.log(`\n  Noise Misses (first 8):`);
    result.noiseMisses.slice(0, 8).forEach((miss) => {
      console.log(`    actual=${miss.actual} | svarog=${miss.svarog} | main=${miss.main} | timing=${miss.timing} | due=${miss.dueRatio}%`);
    });
  }
}

const agg = aggregateStats(allResults);
console.log(`\n========================================`);
console.log(`GLOBAL AGGREGATE (${files.length} files)`);
console.log(`========================================`);
console.log(`Total rolls: ${agg.total}`);
console.log(`Noise rolls: ${agg.noiseRolls} (${pct(agg.noiseRolls, agg.total)}% of all rolls)`);
console.log(`Main noise exact: ${agg.mainNoiseExact}/${agg.noiseRolls} = ${pct(agg.mainNoiseExact, agg.noiseRolls)}%`);
console.log(`Main noise top2:  ${agg.mainNoiseTop2}/${agg.noiseRolls} = ${pct(agg.mainNoiseTop2, agg.noiseRolls)}%`);
console.log(`Svarog noise exact: ${agg.svarogNoiseExact}/${agg.noiseRolls} = ${pct(agg.svarogNoiseExact, agg.noiseRolls)}%`);
console.log(`Svarog noise top2:  ${agg.svarogNoiseTop2}/${agg.noiseRolls} = ${pct(agg.svarogNoiseTop2, agg.noiseRolls)}%`);

console.log(`\nGlobal Timing Confusion Matrix:`);
for (const [timing, counts] of Object.entries(agg.timingMatrix)) {
  const totalTimed = counts.noise + counts.noNoise;
  if (totalTimed === 0) continue;
  console.log(`  ${timing}: noise=${counts.noise}, noNoise=${counts.noNoise} (noise rate: ${pct(counts.noise, totalTimed)}%)`);
}

console.log(`\nGlobal Per-Noise-Value Stats:`);
for (const [val, stats] of Object.entries(agg.noiseValueStats)) {
  console.log(`  ${val}: exact=${stats.svarogExact}/${stats.total}=${pct(stats.svarogExact, stats.total)}%, top2=${stats.svarogTop2}/${stats.total}=${pct(stats.svarogTop2, stats.total)}%`);
}

const reportPath = resolve('scripts', 'noise-baseline-report.json');
writeFileSync(reportPath, JSON.stringify({
  aggregate: {
    total: agg.total,
    noiseRolls: agg.noiseRolls,
    svarogNoiseExact: agg.svarogNoiseExact,
    svarogNoiseTop2: agg.svarogNoiseTop2,
    mainNoiseExact: agg.mainNoiseExact,
    mainNoiseTop2: agg.mainNoiseTop2,
    noiseExactPct: pct(agg.svarogNoiseExact, agg.noiseRolls),
    noiseTop2Pct: pct(agg.svarogNoiseTop2, agg.noiseRolls),
    timingMatrix: agg.timingMatrix,
    noiseValueStats: agg.noiseValueStats,
  },
  files: allResults.map(r => ({
    file: r.file,
    total: r.total,
    noiseRolls: r.noiseRolls,
    svarogNoiseExact: r.svarogNoiseExact,
    svarogNoiseTop2: r.svarogNoiseTop2,
  })),
}, null, 2));
console.log(`\nBaseline report saved to: ${reportPath}`);
