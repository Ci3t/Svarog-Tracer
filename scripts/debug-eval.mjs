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

const file = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata/svarog_debug_2026-04-23T09-46-32.txt';
const rows = parseReplayBlocks(file);

let hits = 0;
for (const row of rows) {
  const result = predictWithPairs(row.rolls);
  const svarogTop2 = [result.analyzerPrediction, result.analyzerAlt]
    .filter(Boolean)
    .map(v => Number(v));
  if (svarogTop2.includes(row.actual)) hits++;
  console.log({
    actual: row.actual,
    svarog: svarogTop2.join('/') || 'null',
    hit: svarogTop2.includes(row.actual),
  });
}
console.log(`Hits: ${hits}/${rows.length}`);
