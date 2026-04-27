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
      const lastTwo = row.rolls.slice(-2);
      const key = `${lastTwo[0]}->${lastTwo[1]}`;
      misses.push({
        actual: row.actual,
        svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}`,
        transition: key,
        sessionReset: svarogPred == null,
        ctx: row.rolls.slice(-8).join(' '),
      });
    }
  }
}

console.log(`Total: ${total}, hits: ${hits}, misses: ${total - hits}`);
console.log(`Top-2 accuracy: ${Math.round((hits/total)*100)}%`);

console.log(`\nMiss breakdown by transition:`);
const byTrans = {};
for (const m of misses) {
  if (!byTrans[m.transition]) byTrans[m.transition] = { count: 0, sessionResets: 0, withPred: [] };
  byTrans[m.transition].count++;
  if (m.sessionReset) byTrans[m.transition].sessionResets++;
  else byTrans[m.transition].withPred.push(m);
}

const sorted = Object.entries(byTrans).sort((a, b) => b[1].count - a[1].count);
for (const [key, val] of sorted) {
  const withPredCount = val.count - val.sessionResets;
  console.log(`  ${key.padEnd(10)} total=${val.count} resets=${val.sessionResets} withPred=${withPredCount}`);
}

console.log(`\n=== TOP MISS PATTERNS (non-reset) ===`);
for (const [key, val] of sorted) {
  const withPred = val.withPred;
  if (withPred.length < 3) continue;
  console.log(`\n${key} (${withPred.length} misses with predictions):`);
  const byActual = {};
  for (const m of withPred) {
    if (!byActual[m.actual]) byActual[m.actual] = [];
    byActual[m.actual].push(m.svarog);
  }
  for (const [actual, svarogs] of Object.entries(byActual)) {
    console.log(`  actual=${actual}: ${svarogs.slice(0, 5).join(', ')}`);
  }
}

console.log(`\n=== SESSION RESET MISS DETAILS ===`);
const resetMisses = misses.filter(m => m.sessionReset);
console.log(`Total session reset misses: ${resetMisses.length}`);
const resetByTrans = {};
for (const m of resetMisses) {
  if (!resetByTrans[m.transition]) resetByTrans[m.transition] = 0;
  resetByTrans[m.transition]++;
}
for (const [key, count] of Object.entries(resetByTrans).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${key}: ${count}`);
}
