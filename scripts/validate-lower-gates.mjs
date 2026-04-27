import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
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

function splitIntoFiveMinuteSessions(rows) {
  if (!rows.length) return [];
  const sessions = [];
  let current = [];
  let sessionStart = null;
  for (const row of rows) {
    if (row.timestampSec == null) { current.push(row); continue; }
    if (sessionStart == null) { sessionStart = row.timestampSec; current.push(row); continue; }
    const elapsed = row.timestampSec - sessionStart;
    if (elapsed >= 300 && current.length) { sessions.push(current); current = [row]; sessionStart = row.timestampSec; }
    else { current.push(row); }
  }
  if (current.length) sessions.push(current);
  return sessions;
}

const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));

let totalRolls = 0;
let baselineTop2 = 0;
let integrationTop2 = 0;
let integrationFires = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    for (const row of session) {
      totalRolls++;
      const result = predictWithPairs(row.rolls);
      const pred = result.analyzerPrediction || null;
      const alt = result.analyzerAlt || null;
      const noise = result.noise || [];

      // Baseline
      if (pred === row.actual || alt === row.actual) baselineTop2++;

      // Simulate integration with lower gates
      let newPred = pred;
      let newAlt = alt;
      const np = result.noisePredictor;
      const altIsNoise = noise.includes(alt);
      const currentTop2 = [pred, alt].filter(Boolean);

      if (
        !altIsNoise &&
        result.analyzerNoiseDueRatio > 2.0 &&
        row.rolls.length >= 8 &&
        np &&
        np.noiseLikelihoodNextRoll >= 0.55 &&
        np.noiseCandidates[0] &&
        np.noiseCandidates[0].prob >= 0.50 &&
        noise.includes(np.predictedNoiseValue) &&
        !currentTop2.includes(np.predictedNoiseValue)
      ) {
        newAlt = np.predictedNoiseValue;
        integrationFires++;
      }

      if (newPred === row.actual || newAlt === row.actual) integrationTop2++;
    }
  }
}

console.log('=== INTEGRATION GATE COMPARISON ===');
console.log(`Total rolls: ${totalRolls}`);
console.log(`Baseline top-2: ${baselineTop2} (${Math.round((baselineTop2/totalRolls)*100)}%)`);
console.log(`Integration top-2: ${integrationTop2} (${Math.round((integrationTop2/totalRolls)*100)}%)`);
console.log(`Integration fires: ${integrationFires}`);
console.log(`Delta: +${integrationTop2 - baselineTop2}`);
