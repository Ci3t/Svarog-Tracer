import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';
import { predictNoiseTiming } from '../src/utils/svarogNoisePredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== SESSION ANALYSIS WITH NOISE PREDICTOR ===\n');

for (let i = 0; i < rolls.length - 1; i++) {
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  const svarogPred = result.analyzerPrediction || null;
  const svarogAlt = result.analyzerAlt || null;
  const svarogHit = svarogPred === actualNext || svarogAlt === actualNext;

  // Run noise predictor
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

  const marker = i >= 5 ? (svarogHit ? '✅' : '❌') : '(warmup)';

  console.log(
    `Roll ${i + 2}: actual=${actualNext} | ` +
    `Svarog=${svarogPred || 'null'}/${svarogAlt || 'null'} ${marker}`
  );

  if (i >= 5) {
    console.log(`  Noise predictor: ${Math.round(noiseResult.noiseLikelihoodNextRoll * 100)}% noise | predicted=${noiseResult.predictedNoiseValue} | confidence=${noiseResult.confidence}`);
    console.log(`  Noise candidates: ${noiseResult.noiseCandidates.map(c => `${c.value}(${Math.round(c.prob * 100)}%)`).join(', ')}`);
    console.log(`  Factors: ${noiseResult.factors.join(', ')}`);
    if (!svarogHit) {
      console.log(`  >>> MISS: actual=${actualNext} was ${result.noise?.includes(actualNext) ? 'NOISE' : 'COMMON'}`);
      console.log(`     If noise predictor was used, would have predicted: ${noiseResult.predictedNoiseValue}`);
    }
  }
}
