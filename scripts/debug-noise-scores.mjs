import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

// Scenario 1 from user's screenshots
const scenario1 = ['43', '42', '43', '41', '43', '43'];
console.log('=== SCENARIO 1: Next roll should be 42 ===');
const r1 = predictWithPairs(scenario1);
console.log('Prediction:', r1.analyzerPrediction, '/', r1.analyzerAlt);
console.log('Noise decision scores:');
if (r1.analyzerNoiseDecisionScores) {
  r1.analyzerNoiseDecisionScores.forEach(n => {
    console.log(`  ${n.value}: candidateScore=${n.candidateScore}, pressureScore=${n.pressureScore}, activationScore=${n.activationScore}, neverSeenBonus=${n.neverSeenBonus}, overdueScore=${n.overdueScore}`);
  });
}

// Scenario 2 from user's screenshots
const scenario2 = ['42', '42', '42', '43', '42', '43', '41', '43', '43'];
console.log('\n=== SCENARIO 2: 41 overdue, 44 never seen ===');
const r2 = predictWithPairs(scenario2);
console.log('Prediction:', r2.analyzerPrediction, '/', r2.analyzerAlt);
console.log('Noise decision scores:');
if (r2.analyzerNoiseDecisionScores) {
  r2.analyzerNoiseDecisionScores.forEach(n => {
    console.log(`  ${n.value}: candidateScore=${n.candidateScore}, pressureScore=${n.pressureScore}, activationScore=${n.activationScore}, neverSeenBonus=${n.neverSeenBonus}, overdueScore=${n.overdueScore}`);
  });
}
