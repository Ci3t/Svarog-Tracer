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

const transRates = {
  '43->42': 85, '41->43': 80, '43->44': 73, '42->41': 69,
  '44->42': 67, '42->43': 75, '42->44': 80, '41->42': 60,
  '43->41': 70, '44->44': 89, '41->44': 50, '44->41': 50,
  '41->41': 40, '42->42': 38, '43->43': 39, '44->43': 40,
};

const WEAK_THRESHOLD = 50;

const transStats = {};
let baselineHits = 0;
let overrideHits = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const baselineHit = svarogPred === row.actual || svarogAlt === row.actual;
    if (baselineHit) baselineHits++;

    const lastRoll = row.rolls[row.rolls.length - 1];
    const secondLast = row.rolls[row.rolls.length - 2];
    const key = `${secondLast}->${lastRoll}`;
    const rate = transRates[key] || 50;

    if (!transStats[key]) transStats[key] = { total: 0, baselineHits: 0, overrideHits: 0, changed: 0 };
    transStats[key].total++;
    if (baselineHit) transStats[key].baselineHits++;

    let newPred = svarogPred;
    let newAlt = svarogAlt;

    if (rate < WEAK_THRESHOLD) {
      const ranked = result.analyzerFinalScores || [];
      const filtered = ranked.filter(e => e.value !== lastRoll);
      if (filtered.length >= 2) {
        newPred = filtered[0].value;
        newAlt = filtered[1].value;
      } else if (filtered.length === 1) {
        newPred = filtered[0].value;
        newAlt = null;
      }
      if (newPred !== svarogPred || newAlt !== svarogAlt) {
        transStats[key].changed++;
      }
    }

    const overrideHit = newPred === row.actual || newAlt === row.actual;
    if (overrideHit) {
      overrideHits++;
      transStats[key].overrideHits++;
    }
  }
}

console.log('Per-transition delta (weak transitions only):');
for (const [key, val] of Object.entries(transStats).sort((a, b) => (b[1].overrideHits - b[1].baselineHits) - (a[1].overrideHits - a[1].baselineHits))) {
  if (transRates[key] >= WEAK_THRESHOLD) continue;
  const delta = val.overrideHits - val.baselineHits;
  console.log(`  ${key.padEnd(10)} total=${val.total} baseline=${val.baselineHits} override=${val.overrideHits} delta=${delta > 0 ? '+' : ''}${delta} changed=${val.changed}`);
}

console.log(`\nOverall: baseline=${baselineHits} override=${overrideHits} delta=+${overrideHits - baselineHits}`);
