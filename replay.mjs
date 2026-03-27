/**
 * Offline Replay Script — Predictor Accuracy Baseline
 * 
 * Parses existing debug TXT files, extracts ctx + actual for each logged prediction,
 * runs predictWithPairs logic on each ctx, and reports accuracy stats.
 * 
 * Usage: node replay.mjs
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEBUG_DIR = join(__dirname, 'debugfiles');

// ============================================================
// STANDALONE COPY of pairTransitionPredictor core logic
// (mirrors the real file — update if predictor changes)
// ============================================================

const VALUES = ['41', '42', '43', '44'];

function getDistribution(rolls) {
  const freq = {};
  VALUES.forEach(v => { freq[v] = 0; });
  rolls.forEach(r => { if (VALUES.includes(r)) freq[r]++; });
  const dist = {};
  VALUES.forEach(v => { dist[v] = Math.round((freq[v] / rolls.length) * 100); });
  return dist;
}

function identifyCommonsNoise(rolls) {
  const n = rolls.length;
  const fullDistribution = getDistribution(rolls);
  const windowSizes = [4, 8, 12].map(w => Math.min(w, n));
  const windowVotes = {};
  VALUES.forEach(v => { windowVotes[v] = 0; });

  windowSizes.forEach(wSize => {
    const wRolls = rolls.slice(-wSize);
    const wDist = getDistribution(wRolls);
    const wSorted = VALUES.map(v => ({ value: v, pct: wDist[v] })).sort((a, b) => b.pct - a.pct);
    wSorted.slice(0, 2).forEach(({ value }) => { windowVotes[value]++; });
  });

  const ranked = VALUES
    .map(v => ({ value: v, votes: windowVotes[v], fullPct: fullDistribution[v] }))
    .sort((a, b) => b.votes - a.votes || b.fullPct - a.fullPct);

  let commons = ranked.slice(0, 2).map(x => x.value);
  let noise = ranked.slice(2).map(x => x.value);

  const last6 = rolls.slice(-6);
  const noiseRising = [];
  noise.forEach(noiseVal => {
    const countInLast6 = last6.filter(r => r === noiseVal).length;
    if (countInLast6 >= 3) noiseRising.push(noiseVal);
  });
  if (noiseRising.length > 0) {
    const risingNoise = noiseRising[0];
    const weakerCommon = commons[1];
    const risingCount = last6.filter(r => r === risingNoise).length;
    const weakerCount = last6.filter(r => r === weakerCommon).length;
    if (risingCount > weakerCount) {
      commons = [commons[0], risingNoise];
      noise = noise.filter(nv => nv !== risingNoise);
      noise.push(weakerCommon);
    }
  }

  const lastRoll = rolls[rolls.length - 1];
  let currentRunLength = 0;
  for (let i = rolls.length - 1; i >= 0; i--) {
    if (rolls[i] === lastRoll) currentRunLength++;
    else break;
  }
  const isLastRollCommon = commons.includes(lastRoll);
  const runBreakThreshold = isLastRollCommon ? 2 : 3;

  return { commons, noise, distribution: fullDistribution, noiseRising, currentRunLength, runBreakLikely: currentRunLength >= runBreakThreshold };
}

function buildPairMatrix(rolls) {
  if (!rolls || rolls.length < 2) return { matrix: {}, matrix2gram: {}, lastRoll: null, last2Rolls: null };
  const counts = {};
  const sampleCounts = {};
  VALUES.forEach(from => {
    counts[from] = {};
    sampleCounts[from] = {};
    VALUES.forEach(to => { counts[from][to] = 0; sampleCounts[from][to] = 0; });
  });
  const counts2gram = {};
  const sampleCounts2gram = {};
  const windowSize = 24;
  const startIdx = Math.max(0, rolls.length - windowSize);
  const matrixRolls = rolls.slice(startIdx);

  for (let i = 0; i < matrixRolls.length - 1; i++) {
    const from = matrixRolls[i];
    const to = matrixRolls[i + 1];
    if (!VALUES.includes(from) || !VALUES.includes(to)) continue;
    const age = matrixRolls.length - 1 - i;
    let weight = 1;
    if (age < 3) weight = 3;
    else if (age < 6) weight = 2;
    counts[from][to] += weight;
    sampleCounts[from][to] += 1;
    if (i >= 1) {
      const prevRoll = matrixRolls[i - 1];
      if (VALUES.includes(prevRoll)) {
        const key2gram = `${prevRoll},${from}`;
        if (!counts2gram[key2gram]) {
          counts2gram[key2gram] = {};
          sampleCounts2gram[key2gram] = {};
          VALUES.forEach(v => { counts2gram[key2gram][v] = 0; sampleCounts2gram[key2gram][v] = 0; });
        }
        counts2gram[key2gram][to] += weight;
        sampleCounts2gram[key2gram][to] += 1;
      }
    }
  }

  const matrix = {};
  VALUES.forEach(from => {
    matrix[from] = {};
    const total = VALUES.reduce((sum, to) => sum + counts[from][to], 0);
    VALUES.forEach(to => {
      matrix[from][to] = {
        pct: total > 0 ? Math.round((counts[from][to] / total) * 100) : 0,
        samples: sampleCounts[from][to],
        reliable: sampleCounts[from][to] >= 3
      };
    });
  });

  const matrix2gram = {};
  Object.keys(counts2gram).forEach(key => {
    matrix2gram[key] = {};
    const total = VALUES.reduce((sum, to) => sum + counts2gram[key][to], 0);
    VALUES.forEach(to => {
      matrix2gram[key][to] = {
        pct: total > 0 ? Math.round((counts2gram[key][to] / total) * 100) : 0,
        samples: sampleCounts2gram[key][to],
        reliable: sampleCounts2gram[key][to] >= 2
      };
    });
  });

  const lastRoll = rolls[rolls.length - 1];
  const last2Rolls = rolls.length >= 2 ? `${rolls[rolls.length - 2]},${rolls[rolls.length - 1]}` : null;
  return { matrix, matrix2gram, lastRoll, last2Rolls };
}

function calculateTrends(rolls) {
  if (!rolls || rolls.length < 6) {
    return VALUES.reduce((acc, v) => { acc[v] = { direction: 'stable', delta: 0, current: 0, arrowAge: 0, arrowWeight: 1.0 }; return acc; }, {});
  }
  function computeDir(recent5, older5) {
    const dir = {};
    VALUES.forEach(v => {
      const rc = recent5.filter(r => r === v).length;
      const oc = older5.length > 0 ? older5.filter(r => r === v).length : 0;
      const rp = (rc / recent5.length) * 100;
      const op = older5.length > 0 ? (oc / older5.length) * 100 : rp;
      const d = Math.round(rp - op);
      dir[v] = d >= 10 ? 'rising' : d <= -10 ? 'falling' : 'stable';
    });
    return dir;
  }
  const recentRolls = rolls.slice(-5);
  const olderRolls  = rolls.slice(-10, -5);
  const curDir      = computeDir(recentRolls, olderRolls);
  const prevDir     = rolls.length >= 15 ? computeDir(rolls.slice(-10,-5), rolls.slice(-15,-10)) : curDir;
  const prev2Dir    = rolls.length >= 20 ? computeDir(rolls.slice(-15,-10), rolls.slice(-20,-15)) : prevDir;

  const trends = {};
  VALUES.forEach(v => {
    const rc = recentRolls.filter(r => r === v).length;
    const oc = olderRolls.length > 0 ? olderRolls.filter(r => r === v).length : 0;
    const rp = (rc / recentRolls.length) * 100;
    const op = olderRolls.length > 0 ? (oc / olderRolls.length) * 100 : rp;
    const direction = curDir[v];
    let arrowAge = 0;
    if (direction === prevDir[v]) { arrowAge = 1; if (direction === prev2Dir[v]) arrowAge = 2; }
    const arrowWeight = arrowAge === 0 ? 1.0 : arrowAge === 1 ? 0.75 : 0.40;
    const trustScore = direction === 'rising' ? 1.0 : direction === 'stable' ? 0.6 : 0.25;
    trends[v] = { direction, delta: Math.round(rp - op), current: Math.round(rp), arrowAge, arrowWeight, trustScore };
  });
  return trends;
}

function predictWithPairs(rolls) {
  if (!rolls || rolls.length < 6) return { prediction: null, alt: null, confidence: 0, method: 'insufficient-data' };

  const commonsData = identifyCommonsNoise(rolls);
  const { commons, noise, distribution, currentRunLength, runBreakLikely } = commonsData;
  const { matrix, matrix2gram, lastRoll, last2Rolls } = buildPairMatrix(rolls);
  const trends = calculateTrends(rolls);

  const distValues = Object.values(distribution);
  const maxDist = Math.max(...distValues);
  const minDist = Math.min(...distValues);
  const isFlat = (maxDist - minDist) < 15;
  const last10 = rolls.slice(-10);
  const noiseInLast10 = last10.filter(r => noise.includes(r)).length;
  const noiseRate = noiseInLast10 / Math.min(10, rolls.length);
  const isChaotic = noiseRate >= 0.40 || isFlat;
  const isTotallyFlat = (maxDist - minDist) < 6;
  if (isTotallyFlat && rolls.length >= 8) return { prediction: null, alt: null, confidence: 0, method: 'session-reset' };

  // Momentum scores
  const momentumScores = {};
  VALUES.forEach(v => {
    let score = 0;
    for (let i = rolls.length - 1; i >= Math.max(0, rolls.length - 12); i--) {
      if (rolls[i] === v) {
        const distance = rolls.length - 1 - i;
        score += 1 / Math.pow(distance + 1, 1.5);
      }
    }
    const trendWeight = trends[v]?.arrowWeight ?? 1.0;
    momentumScores[v] = Math.round(score * trendWeight * 100) / 100;
  });
  const sortedByMomentum = VALUES.map(v => ({ value: v, momentum: momentumScores[v] })).sort((a, b) => b.momentum - a.momentum);
  const hotValues = sortedByMomentum.slice(0, 2).map(x => x.value);

  // 2-gram lookup
  let twoGramPrediction = null;
  let twoGramConfidence = 0;
  if (last2Rolls && matrix2gram[last2Rolls]) {
    const twoGramRow = matrix2gram[last2Rolls];
    const twoGramSorted = VALUES.map(v => ({ value: v, ...twoGramRow[v] })).sort((a, b) => b.pct - a.pct);
    if (twoGramSorted[0].reliable) {
      twoGramPrediction = twoGramSorted[0].value;
      twoGramConfidence = twoGramSorted[0].pct / 100;
    }
  }

  // 1-gram lookup
  let pairPrediction = null;
  let pairConfidence = 0;
  if (lastRoll && matrix[lastRoll]) {
    const pairRow = matrix[lastRoll];
    const pairSorted = VALUES.map(v => ({ value: v, ...pairRow[v] })).sort((a, b) => b.pct - a.pct);
    if (pairSorted[0].reliable) {
      pairPrediction = pairSorted[0].value;
      pairConfidence = pairSorted[0].pct / 100;
    }
  }

  // Frequency prediction
  const freqSorted = VALUES.map(v => ({ value: v, pct: distribution[v] })).sort((a, b) => b.pct - a.pct);
  const freqPrediction = freqSorted[0].value;

  // Blended scores with trust modifier
  const pairSamplesForLastRoll = lastRoll ? rolls.filter(r => r === lastRoll).length : 0;
  const pairWeight2 = pairSamplesForLastRoll < 3 ? 0.20 : pairSamplesForLastRoll < 6 ? 0.50 : 0.80;
  const freqWeight2 = 1 - pairWeight2;
  const blendedScores = VALUES.map(v => ({
    value: v,
    blended: (freqWeight2 * (distribution[v] || 0) + pairWeight2 * (lastRoll && matrix[lastRoll] ? matrix[lastRoll][v]?.pct || 0 : 0))
             * (trends[v]?.trustScore ?? 1.0)
  })).sort((a, b) => b.blended - a.blended);
  const blendedCommons = blendedScores.filter(x => commons.includes(x.value));

  // Pick main prediction
  let prediction, alt, method, confidence;
  if (twoGramPrediction && twoGramConfidence > 0.5) {
    prediction = twoGramPrediction;
    method = '2-gram';
    confidence = twoGramConfidence;
    alt = pairPrediction !== prediction ? pairPrediction : freqSorted[1].value;
  } else if (pairPrediction && pairConfidence > 0.4) {
    prediction = pairPrediction;
    method = 'pair';
    confidence = pairConfidence;
    alt = hotValues.find(v => v !== prediction) || freqSorted[1].value;
  } else {
    prediction = hotValues[0] || freqPrediction;
    method = 'momentum';
    confidence = 0.4;
    alt = hotValues[1] || freqSorted[1].value;
  }

  // Run break override
  if (runBreakLikely && currentRunLength >= 3 && prediction === lastRoll) {
    const runBreakAlt = commons.find(v => v !== lastRoll) || alt;
    alt = prediction;
    prediction = runBreakAlt;
    method += '+run-break';
  }

  return { prediction, alt, confidence, method, commons, noise, distribution, hotValues, momentumScores, lastRoll };
}

// ============================================================
// PARSE DEBUG FILES
// ============================================================

function parseDebugFile(filepath) {
  const content = readFileSync(filepath, 'utf-8');
  const entries = [];

  // Find MAIN PREDICTOR entries: extract ctx and actual from the log format
  // Format: [time] 2-str → pred: XX (Y%) | ... | actual: ZZ | ctx: a, b, c, ... | Commons: ...
  const logLines = content.split('\n');

  for (let i = 0; i < logLines.length; i++) {
    const line = logLines[i];
    if (!line.includes('2-str →') || !line.includes('actual:')) continue;

    // Extract actual
    const actualMatch = line.match(/actual:\s*(\d+)/);
    if (!actualMatch) continue;
    const actual = actualMatch[1];

    // Extract ctx
    const ctxMatch = line.match(/ctx:\s*([\d,\s]+?)(?:\s*\||$)/);
    if (!ctxMatch) continue;
    const ctx = ctxMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (ctx.length < 6) continue;

    entries.push({ ctx, actual, line: line.trim() });
  }

  return entries;
}

// ============================================================
// RUN REPLAY
// ============================================================

function runReplay() {
  let files;
  try {
    files = readdirSync(DEBUG_DIR).filter(f => f.endsWith('.txt') && f.startsWith('svarog_debug'));
  } catch (e) {
    console.error(`Could not read debugfiles/: ${e.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No svarog_debug*.txt files found in debugfiles/');
    process.exit(0);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  PREDICTOR OFFLINE REPLAY — BASELINE MEASUREMENT');
  console.log(`${'='.repeat(60)}\n`);

  let totalHits = 0;
  let totalTop2 = 0;
  let totalEntries = 0;
  let totalSkipped = 0;

  const methodStats = {};

  for (const file of files) {
    const filepath = join(DEBUG_DIR, file);
    const entries = parseDebugFile(filepath);
    let fileHits = 0;
    let fileTop2 = 0;
    let fileSkipped = 0;

    for (const { ctx, actual } of entries) {
      const result = predictWithPairs(ctx);
      if (!result.prediction) { fileSkipped++; continue; }

      const isHit = result.prediction === actual;
      const isAltHit = result.alt === actual;

      if (isHit) fileHits++;
      if (isHit || isAltHit) fileTop2++;

      // Method tracking
      const m = result.method || 'unknown';
      if (!methodStats[m]) methodStats[m] = { hits: 0, top2: 0, total: 0 };
      methodStats[m].total++;
      if (isHit) methodStats[m].hits++;
      if (isHit || isAltHit) methodStats[m].top2++;
    }

    const fileTotal = entries.length - fileSkipped;
    totalHits += fileHits;
    totalTop2 += fileTop2;
    totalEntries += fileTotal;
    totalSkipped += fileSkipped;

    const mainPct = fileTotal > 0 ? Math.round((fileHits / fileTotal) * 100) : 0;
    const top2Pct = fileTotal > 0 ? Math.round((fileTop2 / fileTotal) * 100) : 0;

    console.log(`📄 ${file}`);
    console.log(`   Parsed: ${entries.length} entries | Valid: ${fileTotal} | Skipped: ${fileSkipped}`);
    console.log(`   Main hits: ${fileHits}/${fileTotal} = ${mainPct}%`);
    console.log(`   Top-2:     ${fileTop2}/${fileTotal} = ${top2Pct}%\n`);
  }

  const totalMainPct = totalEntries > 0 ? Math.round((totalHits / totalEntries) * 100) : 0;
  const totalTop2Pct = totalEntries > 0 ? Math.round((totalTop2 / totalEntries) * 100) : 0;

  console.log(`${'─'.repeat(60)}`);
  console.log(`COMBINED BASELINE (all files)`);
  console.log(`  Total entries: ${totalEntries} (${totalSkipped} skipped)`);
  console.log(`  Main hits:     ${totalHits}/${totalEntries} = ${totalMainPct}%`);
  console.log(`  Top-2 rate:    ${totalTop2}/${totalEntries} = ${totalTop2Pct}%`);
  console.log(`${'─'.repeat(60)}\n`);

  console.log(`METHOD BREAKDOWN:`);
  const sortedMethods = Object.entries(methodStats).sort((a, b) => b[1].total - a[1].total);
  for (const [method, stats] of sortedMethods) {
    const mPct = Math.round((stats.hits / stats.total) * 100);
    const t2Pct = Math.round((stats.top2 / stats.total) * 100);
    console.log(`  ${method.padEnd(30)} | main: ${String(mPct+'%').padStart(4)} | top2: ${String(t2Pct+'%').padStart(4)} | n=${stats.total}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Save these numbers as your BEFORE baseline.`);
  console.log(`  Re-run after each improvement step to measure delta.`);
  console.log(`${'='.repeat(60)}\n`);
}

runReplay();
