import { predictWithPairs } from './src/utils/pairTransitionPredictor.js';

const session = ['42', '44', '43', '44', '41', '42', '41', '43'];

console.log('Debug Session 1:', session.join(' '));
console.log('─'.repeat(60));

const result = predictWithPairs(session);

console.log('prediction:', result.prediction);
console.log('alt:', result.alt);
console.log('commons:', result.commons);
console.log('noise:', result.noise);
console.log('analyzerFinalScores length:', result.analyzerFinalScores?.length);
console.log('analyzerFinalScores:', JSON.stringify(result.analyzerFinalScores?.map(e => ({ value: e.value, raw: e.finalDecisionRaw })), null, 2));
console.log('noisePredictor:', JSON.stringify(result.noisePredictor, null, 2));
