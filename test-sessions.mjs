import { predictWithPairs } from './src/utils/pairTransitionPredictor.js';

const sessions = [
  { name: 'Session 1', rolls: ['42', '44', '43', '44', '41', '42', '41', '43'] },
  { name: 'Session 2', rolls: ['41', '41', '42', '42', '44', '41', '43', '44'] },
  { name: 'Session 3', rolls: ['43', '44', '41', '44', '41', '41', '44', '41', '42', '41', '43', '42'] },
];

console.log('═══════════════════════════════════════════════════════════');
console.log('  PREDICTOR SWARM TEST — 3 Sessions');
console.log('═══════════════════════════════════════════════════════════\n');

sessions.forEach(({ name, rolls }) => {
  console.log(`\n━━━ ${name} ━━━ ${rolls.join(' ')}`);
  console.log('─'.repeat(60));

  // Test at each roll position (step through the session)
  for (let i = 3; i <= rolls.length; i++) {
    const partial = rolls.slice(0, i);
    const result = predictWithPairs(partial);

    const commons = (result.commons || []);
    const noise = (result.noise || []);

    const top2 = [result.prediction, result.alt];
    const svarogPicks = result.analyzerFinalScores
      ?.sort((a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0))
      ?.slice(0, 2)
      ?.map(e => e.value) || top2;

    const noisePredictor = result.noisePredictor || {};
    const burstFired =
      noisePredictor.noiseLikelihoodNextRoll >= 0.55 &&
      (noisePredictor.predictedNoiseValue && partial.slice(-3).includes(noisePredictor.predictedNoiseValue));

    if (i === rolls.length) {
      // Full detail for final state
      console.log(`  Rolls: ${partial.join(' ')}`);
      console.log(`  Voting Commons: ${(result.commons || []).join(', ')}`);
      console.log(`  Model Commons:  ${commons.join(', ')}`);
      console.log(`  Noise:          ${noise.join(', ')}`);
      console.log(`  Svarog Eye:     ${svarogPicks.join(' / ')}`);
      console.log(`  Noise Predictor: ${noisePredictor.predictedNoiseValue || 'none'} @ ${Math.round((noisePredictor.noiseLikelihoodNextRoll || 0) * 100)}%`);
      console.log(`  Burst Fired:    ${burstFired ? 'YES' : 'no'}`);
      console.log(`  Top 4 Raw:`);
      (result.analyzerFinalScores || [])
        .sort((a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0))
        .forEach((e, idx) => {
          const dir = result.trends?.[e.value]?.direction || 'stable';
          const arrow = dir === 'rising' ? '↑' : dir === 'falling' ? '↓' : '→';
          console.log(`    #${idx + 1} ${e.value}: ${Math.round(e.finalDecisionRaw || 0)} ${arrow}`);
        });
    }
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  END SWARM TEST');
console.log('═══════════════════════════════════════════════════════════');
