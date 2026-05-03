import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

function parseReplayBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const block = match[2] || '';
    const actual = block.match(/actual_next: (\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({ actual, rolls });
  }
  return rows;
}

const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));

let total = 0;
let hits = 0;
const misses = [];

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    total++;
    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    if (svarogPred === row.actual || svarogAlt === row.actual) {
      hits++;
    } else {
      misses.push({
        actual: row.actual,
        svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}`,
        lastRoll: row.rolls[row.rolls.length - 1],
        secondLast: row.rolls[row.rolls.length - 2],
      });
    }
  }
}

console.log(`Total: ${total}, hits: ${hits}, misses: ${total - hits}`);

// What values are missed most?
const missValues = {};
for (const m of misses) {
  if (!missValues[m.actual]) missValues[m.actual] = 0;
  missValues[m.actual]++;
}
console.log('\nMisses by actual value:');
for (const [v, c] of Object.entries(missValues).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}: ${c}`);
}

// What predictions are most common on misses?
const missPreds = {};
for (const m of misses) {
  if (!missPreds[m.svarog]) missPreds[m.svarog] = 0;
  missPreds[m.svarog]++;
}
console.log('\nMisses by prediction:');
for (const [p, c] of Object.entries(missPreds).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${p}: ${c}`);
}

// Is lastRoll in top-2 on misses?
let lastRollInTop2 = 0;
for (const m of misses) {
  const [p1, p2] = m.svarog.split(' / ');
  if (p1 === m.lastRoll || p2 === m.lastRoll) lastRollInTop2++;
}
console.log(`\nLast roll in predicted top-2 on misses: ${lastRollInTop2}/${misses.length}`);

// Is actual === lastRoll on misses?
let actualIsLastRoll = 0;
for (const m of misses) {
  if (m.actual === m.lastRoll) actualIsLastRoll++;
}
console.log(`Actual === lastRoll on misses: ${actualIsLastRoll}/${misses.length}`);

// Is actual === secondLast on misses?
let actualIsSecondLast = 0;
for (const m of misses) {
  if (m.actual === m.secondLast) actualIsSecondLast++;
}
console.log(`Actual === secondLast on misses: ${actualIsSecondLast}/${misses.length}`);

// Run-length analysis on misses
let runLen1 = 0, runLen2 = 0, runLen3plus = 0;
for (const m of misses) {
  if (m.lastRoll !== m.secondLast) runLen1++;
  else if (m.lastRoll === m.secondLast && m.lastRoll !== m.rolls?.[m.rolls.length - 3]) runLen2++;
  else runLen3plus++;
}
// Need full rolls for runLen3plus, skip for now
console.log(`\nMisses by run length (approx): runLen1=${runLen1}, runLen2=${runLen2}`);
