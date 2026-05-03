import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
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

const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));

// Aggregate per-session transition stats
const sessionTransStats = [];

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    const transCounts = {};
    let sessionHits = 0;
    for (const row of session) {
      const result = predictWithPairs(row.rolls);
      const svarogPred = result.analyzerPrediction || null;
      const svarogAlt = result.analyzerAlt || null;
      const hit = svarogPred === row.actual || svarogAlt === row.actual;
      if (hit) sessionHits++;

      const lastRoll = row.rolls[row.rolls.length - 1];
      const secondLast = row.rolls[row.rolls.length - 2];
      const key = `${secondLast}->${lastRoll}`;
      if (!transCounts[key]) transCounts[key] = { total: 0, hits: 0 };
      transCounts[key].total++;
      if (hit) transCounts[key].hits++;
    }
    sessionTransStats.push({
      file: file.split('/').pop(),
      size: session.length,
      hits: sessionHits,
      trans: transCounts,
    });
  }
}

console.log(`Analyzed ${sessionTransStats.length} sessions\n`);

// Show per-session weak transitions
console.log('=== PER-SESSION WEAK TRANSITIONS (rate < 50%) ===');
for (const sess of sessionTransStats) {
  const weak = Object.entries(sess.trans)
    .filter(([_, v]) => v.total >= 3 && (v.hits / v.total) < 0.5)
    .sort((a, b) => a[1].total - b[1].total);
  if (weak.length) {
    console.log(`\n${sess.file} (${sess.size} rolls, ${sess.hits}/${sess.size}=${Math.round((sess.hits/sess.size)*100)}% top2)`);
    for (const [key, val] of weak) {
      console.log(`  ${key.padEnd(10)} ${val.hits}/${val.total}=${Math.round((val.hits/val.total)*100)}%`);
    }
  }
}

// Global per-transition stats across sessions
console.log(`\n=== GLOBAL TRANSITION STATS (per-session aggregated) ===`);
const globalTrans = {};
for (const sess of sessionTransStats) {
  for (const [key, val] of Object.entries(sess.trans)) {
    if (!globalTrans[key]) globalTrans[key] = { sessions: 0, total: 0, hits: 0 };
    globalTrans[key].sessions++;
    globalTrans[key].total += val.total;
    globalTrans[key].hits += val.hits;
  }
}

const sorted = Object.entries(globalTrans)
  .filter(([_, v]) => v.total >= 8)
  .sort((a, b) => (b[1].hits / b[1].total) - (a[1].hits / a[1].total));

console.log('Strong transitions (>= 70% top2):');
for (const [key, val] of sorted.filter(([_, v]) => (v.hits / v.total) >= 0.70)) {
  console.log(`  ${key.padEnd(10)} ${val.hits}/${val.total}=${Math.round((val.hits/val.total)*100)}% across ${val.sessions} sessions`);
}

console.log('\nWeak transitions (< 50% top2):');
for (const [key, val] of sorted.filter(([_, v]) => (v.hits / v.total) < 0.50)) {
  console.log(`  ${key.padEnd(10)} ${val.hits}/${val.total}=${Math.round((val.hits/val.total)*100)}% across ${val.sessions} sessions`);
}
