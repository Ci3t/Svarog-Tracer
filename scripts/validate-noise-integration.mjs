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
let exactHits = 0;
let top2Hits = 0;
let noiseIntegrationFires = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    for (const row of session) {
      totalRolls++;
      const result = predictWithPairs(row.rolls);
      const pred = result.analyzerPrediction || null;
      const alt = result.analyzerAlt || null;

      if (pred === row.actual) exactHits++;
      if (pred === row.actual || alt === row.actual) top2Hits++;

      // Check if noise integration fired (alt is noise and wasn't before)
      const noise = result.noise || [];
      if (noise.includes(alt) && result.noisePredictor?.predictedNoiseValue === alt) {
        noiseIntegrationFires++;
      }
    }
  }
}

console.log('=== NOISE INTEGRATION VALIDATION ===');
console.log(`Total rolls: ${totalRolls}`);
console.log(`Exact hits: ${exactHits} (${Math.round((exactHits/totalRolls)*100)}%)`);
console.log(`Top-2 hits: ${top2Hits} (${Math.round((top2Hits/totalRolls)*100)}%)`);
console.log(`Noise integration fires: ${noiseIntegrationFires}`);
console.log(`Baseline (from Kimi-live-prediction-fixes.md): exact 29%, top-2 70%`);
