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

function getCommonsNoise(rolls) {
  const counts = {};
  ['41','42','43','44'].forEach(v => counts[v] = 0);
  rolls.forEach(r => { if (counts[r] !== undefined) counts[r]++; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const commons = sorted.slice(0, 2).map(x => x[0]);
  const noise = ['41','42','43','44'].filter(v => !commons.includes(v));
  return { commons, noise };
}

const dir = 'D:/Coding/HSR_PatternRecord/debugfiles/testdata';
const files = readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => join(dir, f));

console.log('=== PER-SESSION PERFORMANCE ===\n');

const sessionsData = [];

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    let hits = 0;
    for (const row of session) {
      const result = predictWithPairs(row.rolls);
      const svarogPred = result.analyzerPrediction || null;
      const svarogAlt = result.analyzerAlt || null;
      if (svarogPred === row.actual || svarogAlt === row.actual) hits++;
    }
    const fullRolls = session[0].rolls.concat(session.map(r => r.actual));
    const { commons, noise } = getCommonsNoise(fullRolls);
    const noiseCount = fullRolls.filter(r => noise.includes(r)).length;
    const noiseRate = Math.round((noiseCount / fullRolls.length) * 100);

    sessionsData.push({
      file: file.split('/').pop(),
      sessionIdx: i + 1,
      rolls: fullRolls.length,
      hits,
      accuracy: Math.round((hits / session.length) * 100),
      noiseRate,
      commons: commons.join(','),
    });
  }
}

// Sort by accuracy
sessionsData.sort((a, b) => a.accuracy - b.accuracy);

for (const s of sessionsData) {
  console.log(`${s.file} s${s.sessionIdx} | ${s.rolls} rolls | top2=${s.hits}/${s.rolls - s.hits}=${s.accuracy}% | noise=${s.noiseRate}% | commons=[${s.commons}]`);
}

console.log(`\nWorst sessions:`);
for (const s of sessionsData.filter(s => s.accuracy < 50)) {
  console.log(`  ${s.file} s${s.sessionIdx}: ${s.accuracy}% (${s.hits}/${s.rolls}) noise=${s.noiseRate}%`);
}

console.log(`\nBest sessions:`);
for (const s of sessionsData.filter(s => s.accuracy >= 80)) {
  console.log(`  ${s.file} s${s.sessionIdx}: ${s.accuracy}% (${s.hits}/${s.rolls}) noise=${s.noiseRate}%`);
}
