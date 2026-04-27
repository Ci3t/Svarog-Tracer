import { readFileSync } from 'fs';
import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

function parseReplayBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const block = match[2] || '';
    const actual = Number(block.match(/actual_next: (\d+)/)?.[1]);
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean).map(Number) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({ actual, rolls });
  }
  return rows;
}

// Analyze 44->43 transitions
const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readFileSync('scripts/test-files.txt', 'utf8').trim().split('\n');

let total443 = 0;
let miss443 = 0;
const missDetails = [];

for (const file of files) {
  const rows = parseReplayBlocks(file.trim());
  for (const row of rows) {
    const lastTwo = row.rolls.slice(-2);
    if (lastTwo[0] === 44 && lastTwo[1] === 43) {
      total443++;
      const result = predictWithPairs(row.rolls);
      const top2 = [result.analyzerPrediction, result.analyzerAlt];
      if (!top2.includes(row.actual)) {
        miss443++;
        missDetails.push({
          actual: row.actual,
          svarog: top2.join('/'),
          ctx: row.rolls.slice(-6).join(' '),
        });
      }
    }
  }
}

console.log(`44->43 transitions: ${total443}, misses: ${miss443}/${total443} = ${total443 ? Math.round((miss443/total443)*100) : 0}%`);
console.log('Miss details:');
missDetails.slice(0, 15).forEach(m => console.log(m));
