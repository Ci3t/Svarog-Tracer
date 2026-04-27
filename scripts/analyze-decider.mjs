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

const targetTrans = '42->42';
console.log(`Analyzing decider scores for ${targetTrans} misses:\n`);

for (const file of files) {
  const rows = parseReplayBlocks(file);
  for (const row of rows) {
    const lastTwo = row.rolls.slice(-2);
    const key = `${lastTwo[0]}->${lastTwo[1]}`;
    if (key !== targetTrans) continue;

    const result = predictWithPairs(row.rolls);
    const svarogPred = result.analyzerPrediction || null;
    const svarogAlt = result.analyzerAlt || null;
    const hit = svarogPred === row.actual || svarogAlt === row.actual;

    if (hit) continue;

    const decider = (result.analyzerFinalScores || []).map(e => `${e.value}:${Math.round(e.pickScore || 0)}(#${e.rank || '?'})`).join(', ');
    const common = (result.analyzerCommonDecisionScores || []).map(e => `${e.value}:${Math.round(e.commonScore || 0)}`).join(', ');
    const noise = (result.analyzerNoiseDecisionScores || []).map(e => `${e.value}:${Math.round(e.noiseScore || 0)}`).join(', ');

    console.log({
      actual: row.actual,
      svarog: `${svarogPred || 'null'} / ${svarogAlt || 'null'}`,
      decider,
      common,
      noise,
      mode: result.analyzerMode,
      timing: result.analyzerNoiseTiming,
    });
  }
}
