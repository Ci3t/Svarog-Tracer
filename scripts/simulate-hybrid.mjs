import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';
import { predictNoiseTiming } from '../src/utils/svarogNoisePredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== SIMULATION: NOISE PREDICTOR OVERRIDE ===\n');
console.log('When noiseLikelihood >= 55%, replace alt with top noise candidate\n');

let baselineHits = 0;
let hybridHits = 0;

for (let i = 0; i < rolls.length - 1; i++) {
  if (i < 5) continue;
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  const baselineHit = svarogPred === actualNext || svarogAlt === actualNext;
  if (baselineHit) baselineHits++;

  // Noise predictor
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

  // Hybrid: if noise likelihood >= 55%, use top noise candidate as alt
  let hybridPred = svarogPred;
  let hybridAlt = svarogAlt;
  if (noiseResult.noiseLikelihoodNextRoll >= 0.55) {
    const topNoise = noiseResult.predictedNoiseValue;
    if (topNoise && topNoise !== hybridPred) {
      hybridAlt = topNoise;
    }
  }

  const hybridHit = hybridPred === actualNext || hybridAlt === actualNext;
  if (hybridHit) hybridHits++;

  const marker = baselineHit ? (hybridHit ? '✅✅' : '✅❌') : (hybridHit ? '❌✅' : '❌❌');
  const labels = baselineHit ? (hybridHit ? 'baseline=hit hybrid=hit' : 'baseline=hit hybrid=MISS') : (hybridHit ? 'baseline=MISS hybrid=hit' : 'baseline=MISS hybrid=MISS');

  console.log(
    `Roll ${i + 2}: actual=${actualNext} | ` +
    `baseline=${svarogPred}/${svarogAlt} | ` +
    `hybrid=${hybridPred}/${hybridAlt} | ` +
    `noise=${Math.round(noiseResult.noiseLikelihoodNextRoll * 100)}% | ` +
    `${labels}`
  );
}

console.log(`\n=== SUMMARY ===`);
console.log(`Baseline hits: ${baselineHits}/7 = ${Math.round((baselineHits/7)*100)}%`);
console.log(`Hybrid hits: ${hybridHits}/7 = ${Math.round((hybridHits/7)*100)}%`);
console.log(`Delta: +${hybridHits - baselineHits}`);
