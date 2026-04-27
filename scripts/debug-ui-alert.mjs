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

let alertWouldFire = 0;
let alertWouldFireAndMissed = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    for (const row of session) {
      const result = predictWithPairs(row.rolls);
      const pred = result.analyzerPrediction || null;
      const alt = result.analyzerAlt || null;
      const np = result.noisePredictor;

      if (np && np.noiseLikelihoodNextRoll >= 0.55 && np.predictedNoiseValue) {
        const top2 = [pred, alt].filter(Boolean);
        if (!top2.includes(np.predictedNoiseValue)) {
          alertWouldFire++;
          const actualIsPredictedNoise = row.actual === np.predictedNoiseValue;
          if (actualIsPredictedNoise) alertWouldFireAndMissed++;
          if (alertWouldFire <= 5) {
            console.log(`Alert fire #${alertWouldFire}: actual=${row.actual} | pred=${pred}/${alt} | predictedNoise=${np.predictedNoiseValue} | likelihood=${Math.round(np.noiseLikelihoodNextRoll*100)}% | hit=${actualIsPredictedNoise}`);
          }
        }
      }
    }
  }
}

console.log(`\nTotal alerts would fire: ${alertWouldFire}`);
console.log(`Alerts where predicted noise was actual: ${alertWouldFireAndMissed}`);
console.log(`Alert precision: ${alertWouldFire > 0 ? Math.round((alertWouldFireAndMissed/alertWouldFire)*100) : 0}%`);
