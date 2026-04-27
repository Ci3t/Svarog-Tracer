import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

const rolls = ['44', '44', '43', '44', '42', '42', '42', '43', '42', '43', '41', '43', '43'];

console.log('=== DEBUG SMART NOISE PREDICTOR ===\n');

for (let i = 0; i < rolls.length - 1; i++) {
  if (i < 5) continue;
  const ctx = rolls.slice(0, i + 1);
  const actualNext = rolls[i + 1];
  const result = predictWithPairs(ctx);

  console.log(`Roll ${i + 2}: actual=${actualNext}`);
  console.log(`  Top2: ${result.analyzerPrediction}/${result.analyzerAlt}`);
  console.log(`  commons=[${result.commons?.join(',')}] noise=[${result.noise?.join(',')}]`);
  console.log(`  noiseDueRatio=${result.analyzerNoiseDueRatio}`);
  console.log(`  altIsNoise=${result.noise?.includes(result.analyzerAlt)}`);
  console.log(`  analyzerTop2?.value=${result.analyzerAlt}`);
  console.log(`  transition=${ctx[ctx.length - 2]}->${ctx[ctx.length - 1]}`);
}
