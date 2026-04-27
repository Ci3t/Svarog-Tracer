import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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

let baselineHits = 0;
let overrideHits = 0;
let totalRolls = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    totalRolls++;
    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const hit = svarogPred === row.actual || svarogAlt === row.actual;
    if (hit) baselineHits++;
  }
}

console.log(`Total rolls: ${totalRolls}`);
console.log(`Hits: ${baselineHits}/${totalRolls} = ${Math.round((baselineHits/totalRolls)*100)}%`);
