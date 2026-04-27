import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  if (history.length < 4) return null;
  const { commons, noise } = getCommonsNoise(history);
  const isNoise = noise.includes(nextRoll);

  const lastRoll = history[history.length - 1];
  const secondLast = history[history.length - 2];

  let runLen = 1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i] === lastRoll) runLen++;
    else break;
  }

  let rollsSinceNoise = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (noise.includes(history[i])) break;
    rollsSinceNoise++;
  }

  const recent6 = history.slice(-6);
  const noiseHits6 = recent6.filter(r => noise.includes(r)).length;
  const transitionIn = `${secondLast}->${lastRoll}`;
  const lastIsNoise = noise.includes(lastRoll);
  const sessionLen = history.length;

  return {
    isNoise, actual: nextRoll, lastRoll, secondLast, runLen, rollsSinceNoise,
    noiseHits6, transitionIn, lastIsNoise, sessionLen, commons, noise,
  };
}

function mine(sessions) {
  const all = [];
  for (const session of sessions) {
    for (let i = 6; i < session.length; i++) {
      const f = extractFeatures(session.slice(0, i), session[i]);
      if (f) all.push(f);
    }
  }

  const baseRate = all.filter(f => f.isNoise).length / all.length;
  console.log(`Contexts: ${all.length}, base noise rate: ${(baseRate * 100).toFixed(1)}%`);

  // 1. Transition → noise probability + which noise values
  const trans = {};
  for (const f of all) {
    if (!trans[f.transitionIn]) trans[f.transitionIn] = { total: 0, noise: 0, values: {} };
    trans[f.transitionIn].total++;
    if (f.isNoise) {
      trans[f.transitionIn].noise++;
      trans[f.transitionIn].values[f.actual] = (trans[f.transitionIn].values[f.actual] || 0) + 1;
    }
  }

  console.log(`\n=== TRANSITION → NOISE (support >= 8) ===`);
  const transSorted = Object.entries(trans)
    .filter(([_, v]) => v.total >= 8)
    .sort((a, b) => (b[1].noise / b[1].total) - (a[1].noise / a[1].total));

  for (const [key, val] of transSorted) {
    const rate = val.noise / val.total;
    const values = Object.entries(val.values)
      .sort((a, b) => b[1] - a[1])
      .map(([v, c]) => `${v}:${c}`)
      .join(', ');
    console.log(`  ${key.padEnd(10)} noise=${val.noise}/${val.total}=${(rate * 100).toFixed(1)}% | values=${values}`);
  }

  // 2. Session length effect
  console.log(`\n=== SESSION LENGTH BINS ===`);
  const bins = [
    { name: '1-10', min: 1, max: 10 },
    { name: '11-15', min: 11, max: 15 },
    { name: '16-20', min: 16, max: 20 },
    { name: '21-30', min: 21, max: 30 },
    { name: '31+', min: 31, max: 999 },
  ];
  for (const bin of bins) {
    const matching = all.filter(f => f.sessionLen >= bin.min && f.sessionLen <= bin.max);
    const noiseCount = matching.filter(f => f.isNoise).length;
    console.log(`  ${bin.name.padEnd(8)} noise=${noiseCount}/${matching.length}=${matching.length ? ((noiseCount / matching.length) * 100).toFixed(1) : 0}%`);
  }

  // 3. Run length effect
  console.log(`\n=== RUN LENGTH BINS ===`);
  for (let run = 1; run <= 5; run++) {
    const matching = all.filter(f => f.runLen === run);
    const noiseCount = matching.filter(f => f.isNoise).length;
    console.log(`  run=${run}      noise=${noiseCount}/${matching.length}=${matching.length ? ((noiseCount / matching.length) * 100).toFixed(1) : 0}%`);
  }

  // 4. Composite model: transition + sessionLen + runLen
  console.log(`\n=== COMPOSITE PATTERNS ===`);
  const composites = [
    { name: '44->43 + session<15', filter: f => f.transitionIn === '44->43' && f.sessionLen < 15 },
    { name: '44->43 + runLen=1', filter: f => f.transitionIn === '44->43' && f.runLen === 1 },
    { name: '43->42 + session<15', filter: f => f.transitionIn === '43->42' && f.sessionLen < 15 },
    { name: '43->42 + runLen=1', filter: f => f.transitionIn === '43->42' && f.runLen === 1 },
    { name: 'lastIsNoise + runLen=1', filter: f => f.lastIsNoise && f.runLen === 1 },
    { name: 'lastIsNoise + session<15', filter: f => f.lastIsNoise && f.sessionLen < 15 },
    { name: 'runLen=1 + session<15', filter: f => f.runLen === 1 && f.sessionLen < 15 },
    { name: 'runLen=1 + noiseHits6=0', filter: f => f.runLen === 1 && f.noiseHits6 === 0 },
    { name: 'runLen=1 + rollsSinceNoise>=4', filter: f => f.runLen === 1 && f.rollsSinceNoise >= 4 },
  ];

  for (const c of composites) {
    const matching = all.filter(c.filter);
    const noiseCount = matching.filter(f => f.isNoise).length;
    const rate = matching.length ? noiseCount / matching.length : 0;
    const lift = rate / baseRate;
    if (matching.length >= 5) {
      console.log(`  ${c.name.padEnd(35)} noise=${noiseCount}/${matching.length}=${(rate * 100).toFixed(1)}% lift=${lift.toFixed(2)}`);
    }
  }

  // 5. Noise value ranking per transition
  console.log(`\n=== NOISE VALUE RANKING PER TRANSITION (top transitions only) ===`);
  for (const [key, val] of transSorted.slice(0, 6)) {
    const values = Object.entries(val.values)
      .sort((a, b) => b[1] - a[1])
      .map(([v, c]) => `${v}(${c})`)
      .join(', ');
    console.log(`  ${key.padEnd(10)} → noise values: ${values}`);
  }

  return { all, trans, baseRate };
}

const files = process.argv.slice(2).map(arg => resolve(arg));
if (!files.length) {
  console.error('Usage: node scripts/pattern-miner-v2.mjs <txt-files...>');
  process.exit(1);
}

const sessions = [];
for (const file of files) {
  const rows = parseReplayBlocks(file);
  if (rows.length) {
    sessions.push(rows[0].rolls.concat(rows.map(r => r.actual)));
  }
}

mine(sessions);
