import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';
import { predictNoiseTiming } from '../src/utils/svarogNoisePredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== SMART HYBRID: Transition override + Noise-due override ===\n');

const WEAK_TRANSITIONS = ['44->43', '43->43', '42->42', '41->41'];

let baselineHits = 0;
let smartHits = 0;

for (let i = 0; i < rolls.length - 1; i++) {
  if (i < 5) continue;
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  const baselineHit = svarogPred === actualNext || svarogAlt === actualNext;
  if (baselineHit) baselineHits++;

  let smartPred = svarogPred;
  let smartAlt = svarogAlt;

  const transition = `${ctx[ctx.length - 2]}->${ctx[ctx.length - 1]}`;

  // Strategy 1: Weak transition override (remove lastRoll from top-2)
  if (WEAK_TRANSITIONS.includes(transition)) {
    const ranked = result.analyzerFinalScores || [];
    const filtered = ranked.filter(e => e.value !== ctx[ctx.length - 1]);
    if (filtered.length >= 2) {
      smartPred = filtered[0].value;
      smartAlt = filtered[1].value;
    }
  }

  // Strategy 2: Noise-due override
  // When noise due ratio > 1.5 AND top noise score is decently ranked,
  // swap alt for top noise candidate
  const noiseDueRatio = result.analyzerNoiseDueRatio || 0;
  if (noiseDueRatio > 1.5 && result.noise && !result.noise.includes(smartAlt)) {
    const lastRoll = ctx[ctx.length - 1];
    const secondLast = ctx[ctx.length - 2] || null;
    const noiseResult = predictNoiseTiming({
      rolls: ctx,
      commons: result.commons || [],
      noise: result.noise || [],
      lastRoll,
      secondLast,
      commonsSinceNoise: result.commonsSinceNoise || 0,
      avgNoiseGap: result.avgNoiseGap || 3,
      sessionLength: ctx.length,
    });

    // Only promote noise if it's NOT already in top-2 and likelihood is high enough
    if (noiseResult.noiseLikelihoodNextRoll >= 0.60) {
      const topNoise = noiseResult.noiseCandidates[0]?.value;
      if (topNoise && topNoise !== smartPred && topNoise !== smartAlt) {
        // Replace alt with noise, but keep main prediction
        smartAlt = topNoise;
      }
    }
  }

  const smartHit = smartPred === actualNext || smartAlt === actualNext;
  if (smartHit) smartHits++;

  const change = (smartPred !== svarogPred || smartAlt !== svarogAlt) ? ' [CHANGED]' : '';
  const label = baselineHit
    ? (smartHit ? 'baseline=hit smart=hit' : 'baseline=hit smart=MISS')
    : (smartHit ? 'baseline=MISS smart=hit' : 'baseline=MISS smart=MISS');

  console.log(
    `Roll ${i + 2}: actual=${actualNext} | ` +
    `trans=${transition} | due=${Math.round((result.analyzerNoiseDueRatio || 0) * 100)}% | ` +
    `base=${svarogPred}/${svarogAlt} | ` +
    `smart=${smartPred}/${smartAlt}${change} | ` +
    `${label}`
  );
}

console.log(`\n=== SUMMARY ===`);
console.log(`Baseline: ${baselineHits}/7 = ${Math.round((baselineHits/7)*100)}%`);
console.log(`Smart:    ${smartHits}/7 = ${Math.round((smartHits/7)*100)}%`);
console.log(`Delta: ${smartHits > baselineHits ? '+' : ''}${smartHits - baselineHits}`);
