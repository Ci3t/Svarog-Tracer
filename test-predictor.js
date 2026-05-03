// test-predictor.js - Quick swarm test for 3 roll sequences
import { predictWithPairs, identifyCommonsNoise, getDistribution } from './src/utils/pairTransitionPredictor.js';

const sessions = [
  { name: 'Session 1', rolls: [42, 44, 43, 44, 41, 42, 41, 43] },
  { name: 'Session 2', rolls: [41, 41, 42, 42, 44, 41, 43, 44] },
  { name: 'Session 3', rolls: [43, 44, 41, 44, 41, 41, 44, 41, 42, 41, 43, 42] },
];

console.log('=== PREDICTOR SWARM TEST ===\n');

for (const session of sessions) {
  console.log(`\n--- ${session.name}: ${session.rolls.join(' ')} ---`);
  
  // Show distribution
  const dist = getDistribution(session.rolls);
  const distValues = Object.values(dist);
  const maxDist = Math.max(...distValues);
  const minDist = Math.min(...distValues);
  console.log(`Distribution: ${JSON.stringify(dist)} (max-min=${maxDist-minDist})`);
  
  // Show commons/noise detection
  const commonsData = identifyCommonsNoise(session.rolls, {});
  console.log(`Voting Commons: [${commonsData.commons.join(', ')}] | Noise: [${commonsData.noise.join(', ')}]`);
  
  try {
    const result = predictWithPairs(session.rolls, { region: 'EU' });
    
    if (result.isSessionReset) {
      console.log('⚠️  EMERGENCY BRAKE: Session reset detected (flat distribution)');
      console.log(`  Reason: ${result.reasonLine}`);
      continue;
    }
    
    // Basic info
    console.log(`Prediction: ${result.prediction || 'null'} | Alt: ${result.alt || 'null'}`);
    console.log(`Mode: ${result.mode} | Noise Timing: ${result.noiseTiming} | Noise Risk: ${result.noiseRisk}`);
    
    // Model-ranked commons
    const modelCommons = result.commonDecisionScores?.map(c => c.value) || [];
    console.log(`Model Commons: [${modelCommons.join(', ')}]`);
    
    // 4-Way Raw Ranking
    if (result.finalScores?.length === 4) {
      const ranked = [...result.finalScores].sort((a, b) => (b.finalDecisionRaw || 0) - (a.finalDecisionRaw || 0));
      console.log('4-Way Raw Rank:');
      ranked.forEach((entry, i) => {
        const isCommon = modelCommons.includes(entry.value);
        const trend = result.trends?.[entry.value]?.direction || '?';
        console.log(`  #${i + 1} ${entry.value}: ${Math.round(entry.finalDecisionRaw || 0)} ${isCommon ? '(C)' : '(N)'} [${trend}]`);
      });
    }
    
    // Noise Predictor
    if (result.noisePredictor) {
      const np = result.noisePredictor;
      console.log(`Smart Noise: ${np.predictedNoiseValue || 'none'} @ ${Math.round((np.noiseLikelihoodNextRoll || 0) * 100)}%`);
      if (np.noiseCandidates?.length) {
        np.noiseCandidates.slice(0, 2).forEach(c => {
          console.log(`  - ${c.value}: ${Math.round((c.prob || 0) * 100)}% (seen ${c.seenAgo} ago)`);
        });
      }
    }
    
    // Burst detection
    const topNoise = result.noiseDecisionScores?.[0];
    const isBurst = topNoise && 
      (topNoise.recent4Hits || 0) >= 2 && 
      (result.noiseRisk || 0) >= 55;
    console.log(`Burst Detection: ${isBurst ? 'FIRE (' + topNoise.value + ')' : 'No burst'}`);
    
    // Break Challenge
    if (result.breakChallenge) {
      const bc = result.breakChallenge;
      console.log(`Break Challenge: ${bc.promoted ? 'PROMOTED' : 'Blocked'} (noise ${bc.topNoise} vs common ${bc.secondCommon}, margin ${bc.margin})`);
    }
    
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

console.log('\n=== END SWARM TEST ===');
