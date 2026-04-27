import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

// Scenario 1 from user's screenshots: next roll is 42
// Session data: 43, 42, 43, 41, 43, 43 (from image 3)
const scenario1 = ['43', '42', '43', '41', '43', '43'];
console.log('=== SCENARIO 1: Next roll should be 42 ===');
const r1 = predictWithPairs(scenario1);
console.log('Prediction:', r1.analyzerPrediction, '/', r1.analyzerAlt);
console.log('Noise predictor:', JSON.stringify(r1.noisePredictor, null, 2));
console.log('Noise due ratio:', r1.analyzerNoiseDueRatio);
console.log('Noise:', r1.noise);
console.log('Commons:', r1.commons);

// Scenario 2 from user's screenshots: 41 overdue, 44 never seen
// Session data from image 6: 42, 42, 42, 43, 42, 43, 41, 43, 43
const scenario2 = ['42', '42', '42', '43', '42', '43', '41', '43', '43'];
console.log('\n=== SCENARIO 2: 41 overdue, 44 never seen ===');
const r2 = predictWithPairs(scenario2);
console.log('Prediction:', r2.analyzerPrediction, '/', r2.analyzerAlt);
console.log('Noise predictor:', JSON.stringify(r2.noisePredictor, null, 2));
console.log('Noise due ratio:', r2.analyzerNoiseDueRatio);
console.log('Noise:', r2.noise);
console.log('Commons:', r2.commons);
