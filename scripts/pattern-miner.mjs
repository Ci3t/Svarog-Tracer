import { readFileSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';

const VALUES = [41, 42, 43, 44];

function parseReplayBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const block = match[2] || '';
    const actual = block.match(/actual_next: (\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean).map(Number) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({ actual: Number(actual), rolls });
  }
  return rows;
}

function getCommonsNoise(rolls) {
  const counts = {};
  VALUES.forEach(v => counts[v] = 0);
  rolls.forEach(r => { if (VALUES.includes(r)) counts[r]++; });
  const sorted = VALUES.map(v => ({ value: v, count: counts[v] })).sort((a, b) => b.count - a.count);
  const commons = sorted.slice(0, 2).map(x => x.value);
  const noise = VALUES.filter(v => !commons.includes(v));
  return { commons, noise };
}

function extractFeatures(history, nextRoll) {
  // history = all rolls BEFORE nextRoll
  if (history.length < 4) return null;

  const { commons, noise } = getCommonsNoise(history);
  const isNoise = noise.includes(nextRoll);

  const lastRoll = history[history.length - 1];
  const secondLast = history[history.length - 2];
  const thirdLast = history[history.length - 3];
  const fourthLast = history[history.length - 4];

  // Run length of last roll
  let runLen = 1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i] === lastRoll) runLen++;
    else break;
  }

  // Rolls since last noise
  let rollsSinceNoise = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (noise.includes(history[i])) break;
    rollsSinceNoise++;
  }

  // Recent noise count in last 6
  const recent6 = history.slice(-6);
  const noiseHits6 = recent6.filter(r => noise.includes(r)).length;

  // Pattern of last 3 rolls (e.g., "41-41-42")
  const last3Pattern = [thirdLast, secondLast, lastRoll].join('-');

  // Transition type into last roll
  const transitionIn = `${secondLast}->${lastRoll}`;

  // Is last roll common or noise?
  const lastIsNoise = noise.includes(lastRoll);

  // Is there a repeated noise in last 4?
  const recent4 = history.slice(-4);
  const repeatedNoise = noise.find(v => recent4.filter(r => r === v).length >= 2) || null;

  // Session length
  const sessionLen = history.length;

  // Dominant common in last 6
  const commonCounts = {};
  commons.forEach(c => commonCounts[c] = 0);
  recent6.forEach(r => { if (commons.includes(r)) commonCounts[r]++; });
  const dominantCommon = commons.length
    ? commons.reduce((a, b) => (commonCounts[a] || 0) >= (commonCounts[b] || 0) ? a : b)
    : null;

  // Is nextRoll the dominant common?
  const nextIsDominantCommon = nextRoll === dominantCommon;

  // Alternation pattern (A-B-A-B)
  const isAlternating = lastRoll !== secondLast && lastRoll === thirdLast && secondLast === fourthLast;

  return {
    isNoise,
    lastRoll,
    secondLast,
    runLen,
    rollsSinceNoise,
    noiseHits6,
    last3Pattern,
    transitionIn,
    lastIsNoise,
    repeatedNoise,
    sessionLen,
    dominantCommon,
    nextIsDominantCommon,
    isAlternating,
    commons,
    noise,
    actual: nextRoll,
  };
}

function minePatterns(sessions) {
  const allFeatures = [];

  for (const session of sessions) {
    for (let i = 6; i < session.length; i++) {
      const history = session.slice(0, i);
      const nextRoll = session[i];
      const features = extractFeatures(history, nextRoll);
      if (features) allFeatures.push(features);
    }
  }

  const total = allFeatures.length;
  const noiseCount = allFeatures.filter(f => f.isNoise).length;
  const baseRate = noiseCount / total;

  console.log(`\n=== PATTERN MINING REPORT ===`);
  console.log(`Total roll contexts analyzed: ${total}`);
  console.log(`Noise rolls: ${noiseCount} (${(baseRate * 100).toFixed(1)}% base rate)`);

  const patterns = [];

  function testPattern(name, filterFn) {
    const matching = allFeatures.filter(filterFn);
    const noiseInMatching = matching.filter(f => f.isNoise).length;
    const rate = matching.length ? noiseInMatching / matching.length : 0;
    const lift = rate / (baseRate || 1);
    const support = matching.length;
    patterns.push({ name, rate, lift, support, noiseCount: noiseInMatching, total: matching.length });
  }

  // Test individual features
  testPattern('lastIsNoise', f => f.lastIsNoise);
  testPattern('lastIsCommon', f => !f.lastIsNoise);
  testPattern('runLen=1', f => f.runLen === 1);
  testPattern('runLen=2', f => f.runLen === 2);
  testPattern('runLen>=3', f => f.runLen >= 3);
  testPattern('rollsSinceNoise=1', f => f.rollsSinceNoise === 1);
  testPattern('rollsSinceNoise=2', f => f.rollsSinceNoise === 2);
  testPattern('rollsSinceNoise=3', f => f.rollsSinceNoise === 3);
  testPattern('rollsSinceNoise=4', f => f.rollsSinceNoise === 4);
  testPattern('rollsSinceNoise=5', f => f.rollsSinceNoise === 5);
  testPattern('rollsSinceNoise>=6', f => f.rollsSinceNoise >= 6);
  testPattern('rollsSinceNoise>=8', f => f.rollsSinceNoise >= 8);
  testPattern('noiseHits6=0', f => f.noiseHits6 === 0);
  testPattern('noiseHits6=1', f => f.noiseHits6 === 1);
  testPattern('noiseHits6>=2', f => f.noiseHits6 >= 2);
  testPattern('isAlternating', f => f.isAlternating);
  testPattern('sessionLen<15', f => f.sessionLen < 15);
  testPattern('sessionLen>=15', f => f.sessionLen >= 15);
  testPattern('sessionLen>=25', f => f.sessionLen >= 25);
  testPattern('repeatedNoise!=null', f => f.repeatedNoise !== null);

  // Per-value patterns
  for (const v of VALUES) {
    testPattern(`lastRoll=${v}`, f => f.lastRoll === v);
    testPattern(`actual=${v}+noise`, f => f.actual === v && f.isNoise);
  }

  // Transition patterns
  for (const a of VALUES) {
    for (const b of VALUES) {
      if (a !== b) {
        testPattern(`transition_${a}->${b}`, f => f.transitionIn === `${a}->${b}`);
      }
    }
  }

  // Combined patterns
  testPattern('lastIsNoise && runLen=1', f => f.lastIsNoise && f.runLen === 1);
  testPattern('lastIsCommon && rollsSinceNoise>=6', f => !f.lastIsNoise && f.rollsSinceNoise >= 6);
  testPattern('lastIsCommon && noiseHits6=0', f => !f.lastIsNoise && f.noiseHits6 === 0);
  testPattern('lastIsCommon && noiseHits6=0 && rollsSinceNoise>=4', f => !f.lastIsNoise && f.noiseHits6 === 0 && f.rollsSinceNoise >= 4);
  testPattern('lastIsCommon && isAlternating', f => !f.lastIsNoise && f.isAlternating);
  testPattern('lastIsNoise && rollsSinceNoise=1', f => f.lastIsNoise && f.rollsSinceNoise === 1);

  // Sort by lift descending, filter for meaningful support
  const significant = patterns
    .filter(p => p.support >= 10)
    .sort((a, b) => b.lift - a.lift);

  console.log(`\n--- TOP NOISE PREDICTORS (lift > 1.2, support >= 10) ---`);
  for (const p of significant.filter(p => p.lift > 1.2)) {
    console.log(
      `${p.name.padEnd(45)} noise=${p.noiseCount}/${p.total}=${(p.rate * 100).toFixed(1)}% ` +
      `lift=${p.lift.toFixed(2)}`
    );
  }

  console.log(`\n--- TOP COMMON PREDICTORS (lift < 0.8, support >= 10) ---`);
  for (const p of significant.filter(p => p.lift < 0.8).slice(0, 20)) {
    console.log(
      `${p.name.padEnd(45)} noise=${p.noiseCount}/${p.total}=${(p.rate * 100).toFixed(1)}% ` +
      `lift=${p.lift.toFixed(2)}`
    );
  }

  // Value-specific noise predictors
  console.log(`\n--- VALUE-SPECIFIC NOISE SIGNALS ---`);
  for (const v of VALUES) {
    const vNoise = allFeatures.filter(f => f.isNoise && f.actual === v);
    if (!vNoise.length) continue;
    console.log(`\nValue ${v} as noise (${vNoise.length} cases):`);

    const subPatterns = [];
    subPatterns.push({ name: 'lastIsNoise', count: vNoise.filter(f => f.lastIsNoise).length });
    subPatterns.push({ name: 'runLen=1', count: vNoise.filter(f => f.runLen === 1).length });
    subPatterns.push({ name: 'rollsSinceNoise>=6', count: vNoise.filter(f => f.rollsSinceNoise >= 6).length });
    subPatterns.push({ name: 'noiseHits6=0', count: vNoise.filter(f => f.noiseHits6 === 0).length });
    subPatterns.push({ name: 'isAlternating', count: vNoise.filter(f => f.isAlternating).length });
    subPatterns.push({ name: 'sessionLen<15', count: vNoise.filter(f => f.sessionLen < 15).length });

    for (const sp of subPatterns.sort((a, b) => b.count - a.count)) {
      console.log(`  ${sp.name.padEnd(25)} ${sp.count}/${vNoise.length} = ${((sp.count / vNoise.length) * 100).toFixed(0)}%`);
    }
  }

  // Build a transition probability matrix for noise
  console.log(`\n--- TRANSITION → NOISE MATRIX ---`);
  const transMatrix = {};
  for (const f of allFeatures) {
    const key = f.transitionIn;
    if (!transMatrix[key]) transMatrix[key] = { total: 0, noise: 0 };
    transMatrix[key].total++;
    if (f.isNoise) transMatrix[key].noise++;
  }
  const transSorted = Object.entries(transMatrix)
    .filter(([_, v]) => v.total >= 10)
    .sort((a, b) => (b[1].noise / b[1].total) - (a[1].noise / a[1].total));
  for (const [key, val] of transSorted.slice(0, 15)) {
    console.log(`  ${key.padEnd(10)} noise=${val.noise}/${val.total} = ${((val.noise / val.total) * 100).toFixed(1)}%`);
  }

  return { allFeatures, baseRate, patterns };
}

// Main
const files = process.argv.slice(2).map(arg => resolve(arg));
if (!files.length) {
  console.error('Usage: node scripts/pattern-miner.mjs <txt-file> [more-files...]');
  process.exit(1);
}

const allSessions = [];
for (const file of files) {
  const rows = parseReplayBlocks(file);
  // Reconstruct full session from rows
  if (rows.length) {
    const session = rows[0].rolls.concat(rows.map(r => r.actual));
    allSessions.push(session);
  }
}

console.log(`Loaded ${allSessions.length} sessions from ${files.length} files`);
const result = minePatterns(allSessions);

// Save raw features for further analysis
writeFileSync('scripts/pattern-mining-result.json', JSON.stringify({
  baseRate: result.baseRate,
  topPatterns: result.patterns
    .filter(p => p.support >= 10)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 50),
}, null, 2));

console.log(`\nSaved top patterns to scripts/pattern-mining-result.json`);
