import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';
import { predictNoiseTiming } from '../src/utils/svarogNoisePredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

// Focus on roll 11 prediction (from rolls 1-10)
const ctx = rolls.slice(0, 10); // NOT 11! We predict roll 11 from first 10 rolls
const result = predictWithPairs(ctx);

console.log('Roll 11 prediction debug:');
console.log('  ctx:', ctx.join(' '));
console.log('  commons:', result.commons);
console.log('  noise:', result.noise);
console.log('  lastRoll:', ctx[ctx.length - 1]);
console.log('  secondLast:', ctx[ctx.length - 2]);
console.log('  commonsSinceNoise:', result.commonsSinceNoise);
console.log('  avgNoiseGap:', result.avgNoiseGap);
console.log('  noiseDueRatio:', result.analyzerNoiseDueRatio);
console.log('  current top2:', result.analyzerPrediction, '/', result.analyzerAlt);

const noiseResult = predictNoiseTiming({
  rolls: ctx,
  commons: result.commons || [],
  noise: result.noise || [],
  lastRoll: ctx[ctx.length - 1],
  secondLast: ctx[ctx.length - 2],
  commonsSinceNoise: result.commonsSinceNoise || 0,
  avgNoiseGap: result.avgNoiseGap || 3,
  sessionLength: ctx.length,
});

console.log('\nNoise predictor result:');
console.log('  noiseLikelihood:', noiseResult.noiseLikelihoodNextRoll);
console.log('  predicted:', noiseResult.predictedNoiseValue);
console.log('  confidence:', noiseResult.confidence);
console.log('  candidates:', JSON.stringify(noiseResult.noiseCandidates));
console.log('  factors:', noiseResult.factors);

const topNoise = noiseResult.noiseCandidates[0];
console.log('\nGate checks:');
console.log('  likelihood >= 0.60:', noiseResult.noiseLikelihoodNextRoll >= 0.60);
console.log('  topNoise exists:', !!topNoise);
console.log('  prob >= 0.50:', topNoise?.prob >= 0.50);
console.log('  reason:', topNoise?.reason);
console.log('  hasTransitionSupport:', topNoise?.reason?.includes('transition'));
console.log('  isSeverelyOverdue:', result.analyzerNoiseDueRatio > 4.0 && topNoise?.reason?.includes('overdue'));
console.log('  noise.includes(topNoise.value):', result.noise?.includes(topNoise?.value));
console.log('  currentTop2:', [result.analyzerPrediction, result.analyzerAlt]);
console.log('  !currentTop2.includes(topNoise.value):', ![result.analyzerPrediction, result.analyzerAlt].includes(topNoise?.value));
