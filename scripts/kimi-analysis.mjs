import { predictWithPairs, getDistribution, identifyCommonsNoise, calculateTrends, calculateWaveSignals, classifyRegime } from '../src/utils/pairTransitionPredictor.js';

const sessions = [
  { id: 'A', date: 'Dec-29', rolls: ['42','42','42','43','43','41','42','43','43','41','44'] },
  { id: 'B', date: 'Dec-29 short', rolls: ['42','42','42','43','43','41','41','42','43'] },
  { id: 'C', date: 'Dec-29 variant', rolls: ['42','42','42','43','43','43','41','41','42','42','43'] },
  { id: 'D', date: 'Jan-05', rolls: ['41','41','42','42','43','43','42','44','44','44','44','44','44','41','42','44','44','42','42','43','41'] },
  { id: 'E', date: 'Feb-20', rolls: ['43','41','42','43','43','43','42','41','44','44','43','44','44','44','42','43','41','41','41','43','43','43','42','43'] },
  { id: 'F', date: 'Feb-21', rolls: ['44','44','43','41','44','44','42','41','43','41','44','41','44','44','43','44','42'] },
  { id: 'G', date: 'Feb-22 A', rolls: ['42','42','42','44','43','44','44','43','43','41','42','44'] },
  { id: 'H', date: 'Feb-22 B', rolls: ['41','41','41','42','44','41','42','43','43','44','44','43','42'] },
  { id: 'I', date: 'Mar-31', rolls: ['41','41','44','44','41','41','44','41','44','42','44','43','43','44','42','43','41'] },
];

function getFullCommons(rolls) {
  const { commons } = identifyCommonsNoise(rolls);
  return commons;
}

function getRecent8Commons(rolls) {
  const { commons } = identifyCommonsNoise(rolls.slice(-8));
  return commons;
}

function analyzeSession(session) {
  const results = [];
  const rollByRoll = [];
  const switchLog = [];

  for (let i = 6; i <= session.rolls.length; i++) {
    const slice = session.rolls.slice(0, i);
    const result = predictWithPairs(slice, { region: 'NA' });
    const actual = session.rolls[i] || null; // actual next roll

    const fullCommons = getFullCommons(slice);
    const recent8Commons = slice.length >= 8 ? getRecent8Commons(slice) : fullCommons;

    const prevSlice = i > 6 ? session.rolls.slice(0, i - 1) : slice;
    const prevFullCommons = getFullCommons(prevSlice);
    const prevRecent8Commons = prevSlice.length >= 8 ? getRecent8Commons(prevSlice) : prevFullCommons;

    const commonsSwitched = i > 6 && (
      fullCommons[0] !== prevFullCommons[0] || fullCommons[1] !== prevFullCommons[1]
    );
    const recent8Switched = slice.length >= 8 && (
      recent8Commons[0] !== prevRecent8Commons[0] || recent8Commons[1] !== prevRecent8Commons[1]
    );

    const trends = calculateTrends(slice);
    const wave = calculateWaveSignals(slice, result.commons);

    const last6 = slice.slice(-6).join(' ');
    const pos = i <= 8 ? 'early' : i <= session.rolls.length - 4 ? 'mid' : 'late';

    const pred = result.analyzerPrediction || result.prediction || null;
    const alt = result.analyzerAlt || result.alt || null;

    const hit = pred === actual ? 'HIT' : alt === actual ? 'ALT-HIT' : 'MISS';

    const trendNote = ['41','42','43','44']
      .filter(v => trends[v]?.direction && trends[v].direction !== 'stable')
      .map(v => `${v} ${trends[v].direction}`)
      .join(', ') || 'all stable';

    const lastSeen = {};
    for (let j = slice.length - 1; j >= 0; j--) {
      if (!lastSeen[slice[j]]) lastSeen[slice[j]] = slice.length - 1 - j;
    }
    const noiseValues = result.noise || [];
    const absentNoise = noiseValues
      .filter(v => (lastSeen[v] ?? 99) > 2)
      .sort((a, b) => (lastSeen[b] ?? 0) - (lastSeen[a] ?? 0));
    const noiseNote = absentNoise.length
      ? `${absentNoise.map(v => `${v} absent ${lastSeen[v]}r`).join(', ')}`
      : 'noise recently seen';

    const record = {
      rollNum: i + 1,
      pos,
      context: last6,
      pred,
      alt,
      actual,
      hit,
      trendNote,
      noiseNote,
      switchNote: recent8Switched ? 'RECENT-8 SWITCH' : commonsSwitched ? 'FULL SWITCH' : '',
      fullCommons: fullCommons.join('/'),
      recent8Commons: recent8Commons.join('/'),
      pairSafety: result.pairSafety,
      noiseRisk: result.noiseRisk,
      regime: result.regime,
      method: result.method,
      label: result.label,
      confidence: result.confidence,
      svarogPrediction: result.analyzerPrediction,
      svarogAlt: result.analyzerAlt,
      mainPrediction: result.prediction,
      mainAlt: result.alt,
    };

    if (actual !== null) {
      rollByRoll.push(record);
    }
    results.push(record);
  }

  // checkpoint commons
  const checkpoints = [];
  const cpIdxs = [];
  if (session.rolls.length >= 6) cpIdxs.push(6);
  if (session.rolls.length >= 10) cpIdxs.push(10);
  cpIdxs.push(session.rolls.length);
  for (const idx of cpIdxs) {
    const slice = session.rolls.slice(0, idx);
    const { commons, noise } = identifyCommonsNoise(slice);
    checkpoints.push({ afterRoll: idx, commons: commons.join('/'), noise: noise.join('/') });
  }

  // hit stats
  const hits = rollByRoll.filter(r => r.hit === 'HIT').length;
  const altHits = rollByRoll.filter(r => r.hit === 'ALT-HIT').length;
  const misses = rollByRoll.filter(r => r.hit === 'MISS').length;
  const total = rollByRoll.length;

  return {
    session,
    checkpoints,
    rollByRoll,
    hits,
    altHits,
    misses,
    total,
    top2: hits + altHits,
  };
}

const all = sessions.map(analyzeSession);
console.log(JSON.stringify(all, null, 2));
