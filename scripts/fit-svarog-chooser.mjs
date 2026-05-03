import { readFileSync } from 'fs';
import { basename, resolve } from 'path';
import { predictWithPairs } from '../src/utils/pairTransitionPredictor.js';

function parseTimeLabelToSeconds(label) {
  const match = label.match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let [, hh, mm, ss, meridiem] = match;
  let hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Number(ss);
  const upper = meridiem.toUpperCase();
  if (upper === 'PM' && hours !== 12) hours += 12;
  if (upper === 'AM' && hours === 12) hours = 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseReplayBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const pattern = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const timeLabel = match[1] || null;
    const block = match[2] || '';
    const actual = block.match(/actual_next: (\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full: ([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter(Boolean) : [];
    if (!actual || rolls.length < 6) continue;
    rows.push({ actual, rolls, timeLabel, timestampSec: timeLabel ? parseTimeLabelToSeconds(timeLabel) : null });
  }
  return rows;
}

function collectRows(files) {
  const rows = [];
  for (const file of files) {
    for (const row of parseReplayBlocks(file)) {
      const result = predictWithPairs(row.rolls);
      const commonMap = new Map((result.analyzerCommonDecisionScores || []).map((e) => [e.value, e]));
      const noiseMap = new Map((result.analyzerNoiseDecisionScores || []).map((e) => [e.value, e]));
      rows.push({
        file: basename(file),
        actual: row.actual,
        candidates: (result.analyzerFinalScores || []).map((entry) => {
          const common = commonMap.get(entry.value) || {};
          const noise = noiseMap.get(entry.value) || {};
          return {
            value: entry.value,
            refined: entry.refinedExactScore || 0,
            exact: entry.exactScore || 0,
            base: entry.baseFinalDecisionRaw || 0,
            seq: entry.sequenceDecisionRaw || 0,
            common: common.commonScore || 0,
            noise: noise.noiseScore || 0,
          support: entry.supportScore || 0,
          carry: entry.recentCarryScore || 0,
          pair2: entry.pair2 || 0,
          pair3: entry.globalPair3Pct || 0,
          follow2: entry.recentFollow2 || 0,
          follow3: entry.recentFollow3 || 0,
          trust: Math.round((entry.trustScore || 0) * 100),
          latent: entry.latentPressure || 0,
            share: entry.currentShare || 0,
            motif: entry.motifScore || 0,
            isCommon: (common.commonScore || 0) > 0 ? 1 : 0,
            isNoise: (noise.noiseScore || 0) > 0 ? 1 : 0,
          };
        }),
      });
    }
  }
  return rows.filter((row) => row.candidates.length >= 4);
}

function scoreRows(rows, w) {
  let main = 0;
  let top2 = 0;
  for (const row of rows) {
    const ranked = row.candidates
      .map((c) => ({
        value: c.value,
        raw:
          c.base * w.base +
          c.seq * w.seq +
          c.refined * w.refined +
          c.exact * w.exact +
          c.common * w.common +
          c.noise * w.noise +
          c.support * w.support +
          c.carry * w.carry +
          c.pair2 * w.pair2 +
          c.pair3 * w.pair3 +
          c.follow2 * w.follow2 +
          c.follow3 * w.follow3 +
          c.trust * w.trust +
          c.latent * w.latent +
          c.share * w.share +
          c.motif * w.motif +
          c.isCommon * w.isCommon +
          c.isNoise * w.isNoise,
      }))
      .sort((a, b) => b.raw - a.raw);
    if (ranked[0]?.value === row.actual) main += 1;
    if (ranked[0]?.value === row.actual || ranked[1]?.value === row.actual) top2 += 1;
  }
  return { main, top2, total: rows.length };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

const files = process.argv.slice(2).map((arg) => resolve(arg));
if (!files.length) {
  console.error('Usage: node scripts/fit-svarog-chooser.mjs <txt-file> [more-files...]');
  process.exit(1);
}

const rows = collectRows(files);
let best = {
  weights: {
    base: 0.55, seq: 0.20, refined: 0.12, exact: 0.02,
    common: 0.20, noise: 0.18, support: 0.08, carry: 0.05,
    pair2: 0.10, pair3: 0.14, follow2: 0.12, follow3: 0.14, trust: 0.03, latent: 0.03,
    share: 0.02, motif: 0.02, isCommon: 0, isNoise: 0,
  },
  score: scoreRows(rows, {
    base: 0.55, seq: 0.20, refined: 0.12, exact: 0.02,
    common: 0.20, noise: 0.18, support: 0.08, carry: 0.05,
    pair2: 0.10, pair3: 0.14, follow2: 0.12, follow3: 0.14, trust: 0.03, latent: 0.03,
    share: 0.02, motif: 0.02, isCommon: 0, isNoise: 0,
  })
};

for (let i = 0; i < 4000; i++) {
  const weights = {
    base: rand(0.20, 0.90),
    seq: rand(0.00, 0.60),
    refined: rand(0.00, 0.35),
    exact: rand(-0.05, 0.15),
    common: rand(0.05, 0.40),
    noise: rand(0.05, 0.40),
    support: rand(0.00, 0.20),
    carry: rand(0.00, 0.16),
    pair2: rand(0.00, 0.20),
    pair3: rand(0.00, 0.35),
    follow2: rand(0.00, 0.22),
    follow3: rand(0.00, 0.35),
    trust: rand(-0.02, 0.08),
    latent: rand(-0.04, 0.10),
    share: rand(-0.02, 0.08),
    motif: rand(0.00, 0.08),
    isCommon: rand(-6, 6),
    isNoise: rand(-6, 6),
  };
  const score = scoreRows(rows, weights);
  if (
    score.top2 > best.score.top2 ||
    (score.top2 === best.score.top2 && score.main > best.score.main)
  ) {
    best = { weights, score };
  }
}

console.log(JSON.stringify(best, null, 2));
