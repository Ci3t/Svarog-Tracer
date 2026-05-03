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
    if (hasLastRoll) continue;

    missesWithoutLastRoll.push({
      actual: row.actual,
      svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}`,
      lastRoll,
      secondLast: row.rolls[row.rolls.length - 2],
      transition: `${row.rolls[row.rolls.length - 2]}->${lastRoll}`,
      ctx: row.rolls.slice(-6).join(' '),
    });
  }
}

console.log(`Misses without lastRoll in top-2: ${missesWithoutLastRoll.length}`);
for (const m of missesWithoutLastRoll) {
  console.log(m);
}
