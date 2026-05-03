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

function testAlertConditions(likelihoodThreshold, probThreshold, requireNeverSeen) {
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

        if (!np || !np.noiseCandidates || !np.noiseCandidates[0]) continue;
        const topNoise = np.noiseCandidates[0];
        
        if (
          np.noiseLikelihoodNextRoll >= likelihoodThreshold &&
          topNoise.prob >= probThreshold &&
          (!requireNeverSeen || topNoise.seenAgo === -1) &&
          np.predictedNoiseValue
        ) {
          const top2 = [pred, alt].filter(Boolean);
          if (!top2.includes(np.predictedNoiseValue)) {
            alertWouldFire++;
            if (row.actual === np.predictedNoiseValue) alertWouldFireAndMissed++;
          }
        }
      }
    }
  }

  const precision = alertWouldFire > 0 ? Math.round((alertWouldFireAndMissed/alertWouldFire)*100) : 0;
  return { fires: alertWouldFire, hits: alertWouldFireAndMissed, precision };
}

console.log('=== UI ALERT PRECISION TEST ===');
const conditions = [
  { l: 0.55, p: 0.50, n: false, name: '55%/50%, any' },
  { l: 0.55, p: 0.60, n: false, name: '55%/60%, any' },
  { l: 0.60, p: 0.50, n: false, name: '60%/50%, any' },
  { l: 0.60, p: 0.60, n: false, name: '60%/60%, any' },
  { l: 0.55, p: 0.50, n: true, name: '55%/50%, never-seen' },
  { l: 0.55, p: 0.60, n: true, name: '55%/60%, never-seen' },
  { l: 0.60, p: 0.60, n: true, name: '60%/60%, never-seen' },
];

for (const c of conditions) {
  const r = testAlertConditions(c.l, c.p, c.n);
  console.log(`${c.name}: fires=${r.fires}, hits=${r.hits}, precision=${r.precision}%`);
}
