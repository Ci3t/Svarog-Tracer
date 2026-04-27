import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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

console.log('=== PER-SESSION NOISE ANALYSIS ===\n');
let totalSessions = 0;
let totalRolls = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    totalSessions++;
    totalRolls += session.length;

    // Reconstruct full session rolls
    const fullRolls = session[0].rolls.concat(session.map(r => r.actual));
    const { commons, noise } = getCommonsNoise(fullRolls);

    // Noise rate in session
    const noiseCount = fullRolls.filter(r => noise.includes(r)).length;
    const noiseRate = Math.round((noiseCount / fullRolls.length) * 100);

    // Avg noise gap
    let gapSum = 0;
    let gapCount = 0;
    let sinceNoise = 0;
    for (const r of fullRolls) {
      if (noise.includes(r)) {
        if (gapCount > 0) gapSum += sinceNoise;
        gapCount++;
        sinceNoise = 0;
      } else {
        sinceNoise++;
      }
    }
    const avgGap = gapCount > 1 ? (gapSum / (gapCount - 1)).toFixed(1) : 'N/A';

    // Most common transition
    const transCounts = {};
    for (let j = 1; j < fullRolls.length; j++) {
      const key = `${fullRolls[j-1]}->${fullRolls[j]}`;
      transCounts[key] = (transCounts[key] || 0) + 1;
    }
    const topTrans = Object.entries(transCounts).sort((a, b) => b[1] - a[1])[0];

    // Dominant value
    const counts = {};
    fullRolls.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    console.log(`${file.split('/').pop()} session ${i+1} | ${fullRolls.length} rolls | noise=${noiseCount}/${fullRolls.length}=${noiseRate}% | commons=[${commons.join(',')}] | avgGap=${avgGap} | dom=${dominant[0]}(${dominant[1]}) | topTrans=${topTrans ? topTrans[0] + '(' + topTrans[1] + ')' : 'N/A'}`);
  }
}

console.log(`\nTotal sessions: ${totalSessions}, total rolls: ${totalRolls}`);
