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

let totalMissedNoise = 0;
let wouldCatchWithLowerGate = 0;
let wouldCatchWithCurrentGate = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    for (const row of session) {
      const result = predictWithPairs(row.rolls);
      const pred = result.analyzerPrediction || null;
      const alt = result.analyzerAlt || null;
      const noise = result.noise || [];
      const isNoise = noise.includes(row.actual);
      const isMiss = pred !== row.actual && alt !== row.actual;

      if (isMiss && isNoise) {
        totalMissedNoise++;
        const np = result.noisePredictor;
        if (np && np.noiseLikelihoodNextRoll >= 0.55 && np.predictedNoiseValue === row.actual) {
          wouldCatchWithLowerGate++;
          console.log(`Would catch (55% gate): actual=${row.actual} | pred=${pred}/${alt} | likelihood=${Math.round(np.noiseLikelihoodNextRoll*100)}% | prob=${np.noiseCandidates[0]?.prob} | dueRatio=${Math.round((result.analyzerNoiseDueRatio || 0)*100)/100} | last=${row.rolls[row.rolls.length-1]}`);
        }
        if (np && np.noiseLikelihoodNextRoll >= 0.60 && np.predictedNoiseValue === row.actual && np.noiseCandidates[0]?.prob >= 0.60) {
          wouldCatchWithCurrentGate++;
        }
      }
    }
  }
}

console.log(`\nTotal missed noise rolls: ${totalMissedNoise}`);
console.log(`Would catch with 55% gate: ${wouldCatchWithLowerGate}`);
console.log(`Would catch with current 60%/60% gate: ${wouldCatchWithCurrentGate}`);
