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

const transitions = {};

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    const lastTwo = row.rolls.slice(-2);
    const key = `${lastTwo[0]}->${lastTwo[1]}`;
    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const hit = svarogPred === row.actual || svarogAlt === row.actual;

    if (!transitions[key]) transitions[key] = { total: 0, hits: 0, misses: [] };
    transitions[key].total++;
    if (hit) transitions[key].hits++;
    else transitions[key].misses.push({ actual: row.actual, svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}` });
  }
}

const sorted = Object.entries(transitions).sort((a, b) => b[1].total - a[1].total);
console.log('Transition performance (sorted by frequency):');
for (const [key, val] of sorted) {
  const rate = val.total ? Math.round((val.hits / val.total) * 100) : 0;
  console.log(`  ${key.padEnd(10)} hits=${val.hits}/${val.total}=${rate}% misses=${val.misses.length}`);
}

console.log('\n=== 44->43 DETAILS ===');
for (const m of transitions['44->43']?.misses || []) console.log(m);

console.log('\n=== 42->42 DETAILS ===');
for (const m of transitions['42->42']?.misses || []) console.log(m);

console.log('\n=== 43->42 DETAILS ===');
for (const m of transitions['43->42']?.misses || []) console.log(m);
