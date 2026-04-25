import { readFileSync } from 'fs';
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

function scoreRows(rows) {
  let total = 0;
  let mainHits = 0;
  let top2Hits = 0;
  let svarogMainHits = 0;
  let svarogTop2Hits = 0;
  const misses = [];

  for (const row of rows) {
    const result = predictWithPairs(row.rolls);
    total += 1;

    const mainPred = result.prediction || null;
    const altPred = result.alt || null;
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;

    if (mainPred === row.actual) mainHits += 1;
    if (mainPred === row.actual || altPred === row.actual) top2Hits += 1;
    if (svarogPred === row.actual) svarogMainHits += 1;
    if (svarogPred === row.actual || svarogAlt === row.actual) svarogTop2Hits += 1;

    if (svarogPred !== row.actual && svarogAlt !== row.actual) {
      const finalScores = Array.isArray(result.analyzerFinalScores)
        ? result.analyzerFinalScores.map((entry) => `${entry.value}:${Math.round(entry.pickScore || 0)}(#${entry.rank || '?'})`).join(', ')
        : 'none';
      const commonScores = Array.isArray(result.analyzerCommonDecisionScores)
        ? result.analyzerCommonDecisionScores.map((entry) => `${entry.value}:${Math.round(entry.commonScore || 0)}(#${entry.rank || '?'})`).join(', ')
        : 'none';
      const noiseScores = Array.isArray(result.analyzerNoiseDecisionScores)
        ? result.analyzerNoiseDecisionScores.map((entry) => `${entry.value}:${Math.round(entry.noiseScore || 0)}(#${entry.rank || '?'})`).join(', ')
        : 'none';
      misses.push({
        actual: row.actual,
        ctx: row.rolls.join(' '),
        svarog: `${svarogPred || 'none'} / ${svarogAlt || 'none'}`,
        main: `${mainPred || 'none'} / ${altPred || 'none'}`,
        decider: finalScores,
        common: commonScores,
        noise: noiseScores,
        mode: result.analyzerMode || 'pair',
        timing: result.analyzerNoiseTiming || 'unknown',
        due: Math.round((result.analyzerNoiseDueRatio || 0) * 100),
      });
    }
  }

  return {
    total,
    mainHits,
    top2Hits,
    svarogMainHits,
    svarogTop2Hits,
    misses,
  };
}

function scoreFile(filePath) {
  const rows = parseReplayBlocks(filePath);
  const sessions = splitIntoFiveMinuteSessions(rows);
  const overall = scoreRows(rows);
  return {
    file: basename(filePath),
    sessions: sessions.map((sessionRows, index) => ({
      index: index + 1,
      ...scoreRows(sessionRows),
    })),
    ...overall,
  };
}

function pct(hit, total) {
  return total ? Math.round((hit / total) * 100) : 0;
}

const files = process.argv.slice(2).map((arg) => resolve(arg));

if (!files.length) {
  console.error('Usage: node scripts/eval-current-predictor.mjs <txt-file> [more-files...]');
  process.exit(1);
}

for (const file of files) {
  const result = scoreFile(file);
  console.log(`\nFILE ${result.file}`);
  console.log(`Main   ${result.mainHits}/${result.total} = ${pct(result.mainHits, result.total)}%`);
  console.log(`Top2   ${result.top2Hits}/${result.total} = ${pct(result.top2Hits, result.total)}%`);
  console.log(`Svarog ${result.svarogMainHits}/${result.total} = ${pct(result.svarogMainHits, result.total)}%`);
  console.log(`Svarog Top2 ${result.svarogTop2Hits}/${result.total} = ${pct(result.svarogTop2Hits, result.total)}%`);
  result.sessions.forEach((session) => {
    console.log(
      `  Session ${session.index}: Svarog Top2 ${session.svarogTop2Hits}/${session.total} = ${pct(session.svarogTop2Hits, session.total)}%`
    );
  });
  result.misses.slice(0, 12).forEach((miss) => {
    console.log(JSON.stringify(miss));
  });
}
