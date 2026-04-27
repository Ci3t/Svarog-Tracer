import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

// Simulate UI logic for the user's exact scenario
const scenario = ['43', '42', '43', '41', '43', '43'];
const result = predictWithPairs(scenario);

const noisePredictor = result.noisePredictor;
const noiseLikely = noisePredictor?.noiseLikelihoodNextRoll >= 0.55;
const exactPair = result.sessionState?.exactPair || [result.analyzerPrediction, result.analyzerAlt];
const shouldShowExact = noiseLikely && exactPair.length === 2;

console.log('=== UI SIMULATION ===');
console.log('Backend prediction:', result.analyzerPrediction, '/', result.analyzerAlt);
console.log('Session state key:', result.sessionState?.key);
console.log('Backbone pair:', result.sessionState?.backbonePair);
console.log('Exact pair:', exactPair);
console.log('Noise likelihood:', noisePredictor?.noiseLikelihoodNextRoll);
console.log('Should show exact?', shouldShowExact);
console.log('UI will display:', shouldShowExact ? exactPair : result.sessionState?.backbonePair);
