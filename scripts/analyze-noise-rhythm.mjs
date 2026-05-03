import { readFileSync } from 'fs';
import { basename, resolve } from 'path';

const VALUES = ['41','42','43','44'];

function parseTimeline(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const matches = [...text.matchAll(/\[(\d+:\d+:\d+\s*(?:AM|PM))\]\s*actual:\s*(\d+)/gi)];
  const seq = matches.map((m) => m[2]).reverse();
  return seq;
}

function pct(n, d) {
  return d ? Math.round((n / d) * 100) : 0;
}

function analyzeSequence(seq) {
  if (seq.length < 6) return null;
  const counts = Object.fromEntries(VALUES.map((v) => [v, 0]));
  seq.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  const ranked = VALUES.slice().sort((a, b) => counts[b] - counts[a]);
  const commons = ranked.slice(0, 2);
  const noise = VALUES.filter((v) => !commons.includes(v));

  const noiseGapLengths = [];
  const noiseStreakLengths = [];
  let commonsAfterNoise = 0;
  let inNoise = false;
  let currentNoiseStreak = 0;
  for (const roll of seq) {
    if (noise.includes(roll)) {
      if (!inNoise && commonsAfterNoise > 0) noiseGapLengths.push(commonsAfterNoise);
      inNoise = true;
      commonsAfterNoise = 0;
      currentNoiseStreak += 1;
    } else {
      if (inNoise && currentNoiseStreak > 0) {
        noiseStreakLengths.push(currentNoiseStreak);
        currentNoiseStreak = 0;
      }
      inNoise = false;
      commonsAfterNoise += 1;
    }
  }
  if (currentNoiseStreak > 0) noiseStreakLengths.push(currentNoiseStreak);

  let longCommonRuns = 0;
  let siblingReturns = 0;
  let sameContinues = 0;
  let noiseBreaks = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const current = seq[i];
    if (!commons.includes(current)) continue;
    let runLen = 1;
    for (let j = i - 1; j >= 0 && seq[j] === current; j--) runLen += 1;
    if (runLen < 3) continue;
    longCommonRuns += 1;
    const next = seq[i + 1];
    const sibling = commons.find((v) => v !== current);
    if (next === sibling) siblingReturns += 1;
    else if (next === current) sameContinues += 1;
    else if (noise.includes(next)) noiseBreaks += 1;
  }

  return {
    len: seq.length,
    commons,
    noise,
    counts,
    avgNoiseGap: noiseGapLengths.length ? (noiseGapLengths.reduce((a, b) => a + b, 0) / noiseGapLengths.length).toFixed(2) : 'n/a',
    avgNoiseStreak: noiseStreakLengths.length ? (noiseStreakLengths.reduce((a, b) => a + b, 0) / noiseStreakLengths.length).toFixed(2) : 'n/a',
    singleNoisePct: pct(noiseStreakLengths.filter((n) => n === 1).length, noiseStreakLengths.length),
    longCommonRuns,
    siblingReturns,
    sameContinues,
    noiseBreaks,
    siblingReturnPct: pct(siblingReturns, longCommonRuns),
    sameContinuePct: pct(sameContinues, longCommonRuns),
    noiseBreakPct: pct(noiseBreaks, longCommonRuns),
  };
}

const files = process.argv.slice(2).map((arg) => resolve(arg));
if (!files.length) {
  console.error('Usage: node scripts/analyze-noise-rhythm.mjs <txt-file> [more-files...]');
  process.exit(1);
}

for (const file of files) {
  const seq = parseTimeline(file);
  const result = analyzeSequence(seq);
  console.log(`\nFILE ${basename(file)}`);
  if (!result) {
    console.log('Too short');
    continue;
  }
  console.log(JSON.stringify(result, null, 2));
}
