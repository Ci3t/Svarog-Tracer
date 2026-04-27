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

const missesWithLastRoll = [];
const missesWithoutLastRoll = [];

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const hit = svarogPred === row.actual || svarogAlt === row.actual;
    if (hit) continue;

    const lastRoll = row.rolls[row.rolls.length - 1];
    const hasLastRoll = svarogPred === lastRoll || svarogAlt === lastRoll;
    const miss = {
      actual: row.actual,
      svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}`,
      lastRoll,
      secondLast: row.rolls[row.rolls.length - 2],
      thirdLast: row.rolls[row.rolls.length - 3],
    };
    if (hasLastRoll) missesWithLastRoll.push(miss);
    else missesWithoutLastRoll.push(miss);
  }
}

console.log(`Misses with lastRoll in top-2: ${missesWithLastRoll.length}`);
console.log(`Misses without lastRoll in top-2: ${missesWithoutLastRoll.length}`);

// What is actual when lastRoll is in top-2?
const actualCounts = {};
for (const m of missesWithLastRoll) {
  if (!actualCounts[m.actual]) actualCounts[m.actual] = 0;
  actualCounts[m.actual]++;
}
console.log('\nActual values when lastRoll is in top-2 (misses):');
for (const [v, c] of Object.entries(actualCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v}: ${c}`);
}

// What is the OTHER prediction (not lastRoll)?
const otherPredCounts = {};
for (const m of missesWithLastRoll) {
  const [p1, p2] = m.svarog.split(' / ');
  const other = p1 === m.lastRoll ? p2 : p1;
  if (!otherPredCounts[other]) otherPredCounts[other] = { count: 0, hits: 0 };
  otherPredCounts[other].count++;
  if (other === m.actual) otherPredCounts[other].hits++;
}
console.log('\nOther prediction value performance:');
for (const [v, data] of Object.entries(otherPredCounts).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${v}: ${data.hits}/${data.count} = ${Math.round((data.hits/data.count)*100)}%`);
}

// Transition analysis for misses with lastRoll in top-2
const transCounts = {};
for (const m of missesWithLastRoll) {
  const key = `${m.secondLast}->${m.lastRoll}`;
  if (!transCounts[key]) transCounts[key] = { total: 0, actuals: {} };
  transCounts[key].total++;
  if (!transCounts[key].actuals[m.actual]) transCounts[key].actuals[m.actual] = 0;
  transCounts[key].actuals[m.actual]++;
}
console.log('\nTop transitions when lastRoll is in top-2 (misses):');
for (const [key, val] of Object.entries(transCounts).sort((a, b) => b[1].total - a[1].total).slice(0, 10)) {
  const actuals = Object.entries(val.actuals).sort((a, b) => b[1] - a[1]).map(([v, c]) => `${v}:${c}`).join(', ');
  console.log(`  ${key.padEnd(10)} n=${val.total} actuals=${actuals}`);
}
