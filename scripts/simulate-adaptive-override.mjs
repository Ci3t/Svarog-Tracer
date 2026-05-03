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

console.log('=== ADAPTIVE PER-SESSION OVERRIDE ===\n');
let totalBaselineHits = 0;
let totalAdaptiveHits = 0;
let totalRolls = 0;

for (const file of files) {
  const rows = parseReplayBlocks(file);
  const sessions = splitIntoFiveMinuteSessions(rows);
  for (const session of sessions) {
    // Per-session transition tracker
    const sessionTrans = {}; // key -> { total, hits }
    let sessBaseline = 0;
    let sessAdaptive = 0;
    let sessOverrides = 0;

    for (const row of session) {
      totalRolls++;
      const result = predictWithPairs(row.rolls);
      const svarogPred = result.analyzerPrediction || null;
      const svarogAlt = result.analyzerAlt || null;
      const baselineHit = svarogPred === row.actual || svarogAlt === row.actual;
      if (baselineHit) { totalBaselineHits++; sessBaseline++; }

      const lastRoll = row.rolls[row.rolls.length - 1];
      const secondLast = row.rolls[row.rolls.length - 2];
      const key = `${secondLast}->${lastRoll}`;

      // Check if this transition has been weak in this session so far
      const stats = sessionTrans[key];
      const isWeak = stats && stats.total >= 2 && (stats.hits / stats.total) < 0.5;

      let newPred = svarogPred;
      let newAlt = svarogAlt;

      if (isWeak) {
        sessOverrides++;
        const ranked = result.analyzerFinalScores || [];
        const filtered = ranked.filter(e => e.value !== lastRoll);
        if (filtered.length >= 2) {
          newPred = filtered[0].value;
          newAlt = filtered[1].value;
        } else if (filtered.length === 1) {
          newPred = filtered[0].value;
          newAlt = null;
        }
      }

      const adaptiveHit = newPred === row.actual || newAlt === row.actual;
      if (adaptiveHit) { totalAdaptiveHits++; sessAdaptive++; }

      // Update stats for this transition
      if (!sessionTrans[key]) sessionTrans[key] = { total: 0, hits: 0 };
      sessionTrans[key].total++;
      if (adaptiveHit || (!isWeak && baselineHit)) {
        // Use whichever prediction was applied
        sessionTrans[key].hits++;
      }
    }

    const delta = sessAdaptive - sessBaseline;
    if (sessOverrides > 0 || delta !== 0) {
      console.log(`${file.split('/').pop()} | ${session.length} rolls | baseline=${sessBaseline} adaptive=${sessAdaptive} delta=${delta > 0 ? '+' : ''}${delta} (overrides=${sessOverrides})`);
    }
  }
}

console.log(`\n=== TOTALS ===`);
console.log(`Total rolls: ${totalRolls}`);
console.log(`Baseline hits: ${totalBaselineHits} (${Math.round((totalBaselineHits/totalRolls)*100)}%)`);
console.log(`Adaptive hits: ${totalAdaptiveHits} (${Math.round((totalAdaptiveHits/totalRolls)*100)}%)`);
console.log(`Delta: +${totalAdaptiveHits - totalBaselineHits}`);
