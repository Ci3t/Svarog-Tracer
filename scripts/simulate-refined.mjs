import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== REFINED TRANSITION OVERRIDE ===');
console.log('Only fire transition override when runLen <= 2\n');

const WEAK_TRANSITIONS = ['44->43', '43->43', '42->42', '41->41'];

let baselineHits = 0;
let refinedHits = 0;

for (let i = 0; i < rolls.length - 1; i++) {
  if (i < 5) continue;
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  const baselineHit = svarogPred === actualNext || svarogAlt === actualNext;
  if (baselineHit) baselineHits++;

  let refinedPred = svarogPred;
  let refinedAlt = svarogAlt;

  const transition = `${ctx[ctx.length - 2]}->${ctx[ctx.length - 1]}`;

  // Compute run length of lastRoll
  const lastRoll = ctx[ctx.length - 1];
  let runLen = 1;
  for (let j = ctx.length - 2; j >= 0; j--) {
    if (ctx[j] === lastRoll) runLen++;
    else break;
  }

  // Refined: only remove lastRoll if runLen <= 2 AND transition is weak
  if (WEAK_TRANSITIONS.includes(transition) && runLen <= 2) {
    const ranked = result.analyzerFinalScores || [];
    const filtered = ranked.filter(e => e.value !== lastRoll);
    if (filtered.length >= 2) {
      refinedPred = filtered[0].value;
      refinedAlt = filtered[1].value;
    }
  }

  const refinedHit = refinedPred === actualNext || refinedAlt === actualNext;
  if (refinedHit) refinedHits++;

  const change = (refinedPred !== svarogPred || refinedAlt !== svarogAlt) ? ' [CHANGED]' : '';
  const label = baselineHit
    ? (refinedHit ? 'baseline=hit refined=hit' : 'baseline=hit refined=MISS')
    : (refinedHit ? 'baseline=MISS refined=hit' : 'baseline=MISS refined=MISS');

  console.log(
    `Roll ${i + 2}: actual=${actualNext} | ` +
    `trans=${transition} run=${runLen} | ` +
    `base=${svarogPred}/${svarogAlt} | ` +
    `refined=${refinedPred}/${refinedAlt}${change} | ` +
    `${label}`
  );
}

console.log(`\n=== SUMMARY ===`);
console.log(`Baseline: ${baselineHits}/7 = ${Math.round((baselineHits/7)*100)}%`);
console.log(`Refined:  ${refinedHits}/7 = ${Math.round((refinedHits/7)*100)}%`);
console.log(`Delta: ${refinedHits > baselineHits ? '+' : ''}${refinedHits - baselineHits}`);
