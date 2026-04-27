import { readFileSync } from 'fs';
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

const file = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata/svarog_debug_2026-04-23T09-46-32.txt';
const rows = parseReplayBlocks(file);

let svarogTop2Hits = 0;
for (const row of rows) {
  const result = predictWithPairs(row.rolls);
  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  if (svarogPred === row.actual || svarogAlt === row.actual) svarogTop2Hits += 1;
}
console.log(`Svarog Top2 ${svarogTop2Hits}/${rows.length}`);
