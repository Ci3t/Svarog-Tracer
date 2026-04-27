import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

// Session from user: translated values, oldest first (bottom to top)
const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== FULL SESSION REPLAY (roll 1 to roll 13) ===');
console.log(`Sequence: ${rolls.join(' ')}\n`);

let svarogHits = 0;
let mainHits = 0;
let totalPred = 0;

for (let i = 0; i < rolls.length - 1; i++) {
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  const mainPred = result.prediction || null;
  const mainAlt = result.alt || null;

  const svarogHit = svarogPred === actualNext || svarogAlt === actualNext;
  const mainHit = mainPred === actualNext || mainAlt === actualNext;

  if (i >= 5) {
    totalPred++;
    if (svarogHit) svarogHits++;
    if (mainHit) mainHits++;
  }

  const marker = i >= 5 ? (svarogHit ? '✅' : '❌') : '(warmup)';

  console.log(
    `Roll ${i + 2}: actual=${actualNext} | ` +
    `Svarog=${svarogPred || 'null'}/${svarogAlt || 'null'} ${marker} | ` +
    `Main=${mainPred || 'null'}/${mainAlt || 'null'} | ` +
    `timing=${result.analyzerNoiseTiming || 'N/A'} | ` +
    `commons=[${result.commons?.join(',') || '?'}] | ` +
    `noise=[${result.noise?.join(',') || '?'}]`
  );

  if (i >= 5 && !svarogHit) {
    console.log(`  ↳ Decider: ${(result.analyzerFinalScores || []).map(e => `${e.value}:${Math.round(e.pickScore || 0)}`).join(', ')}`);
    console.log(`  ↳ Transition: ${ctx[ctx.length - 2]}->${ctx[ctx.length - 1]}`);
    console.log(`  ↳ Noise due ratio: ${Math.round((result.analyzerNoiseDueRatio || 0) * 100)}%`);
  }
}

console.log(`\n=== SUMMARY (rolls 7-13, after warmup) ===`);
console.log(`Total predictions: ${totalPred}`);
console.log(`Svarog top-2 hits: ${svarogHits}/${totalPred} = ${Math.round((svarogHits / totalPred) * 100)}%`);
console.log(`Main top-2 hits: ${mainHits}/${totalPred} = ${Math.round((mainHits / totalPred) * 100)}%`);
