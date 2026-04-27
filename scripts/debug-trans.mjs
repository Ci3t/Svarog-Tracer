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
    const actual = Number(block.match(/actual_next: (\d+)/)?.[1]);
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean).map(Number) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({ actual, rolls });
  }
  return rows;
}

const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));

let found = false;
for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    const lastTwo = row.rolls.slice(-2);
    if (lastTwo[0] === 44 && lastTwo[1] === 43) {
      const result = predictWithPairs(row.rolls);
      console.log('All keys:', Object.keys(result));
      console.log('Full result (first 20 keys):');
      for (const [k, v] of Object.entries(result).slice(0, 20)) {
        console.log(`  ${k}:`, typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : v);
      }
      found = true;
      break;
    }
  }
  if (found) break;
}
