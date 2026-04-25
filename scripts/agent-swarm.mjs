import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { predictWithPairs, classifyRegime, identifyCommonsNoise, calculateTrends, calculateWaveSignals } from '../src/utils/pairTransitionPredictor.js';
import { analyze2strWave } from '../src/utils/kiyoPrefixWave.js';

const VALUES = ['41', '42', '43', '44'];

function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }

function parseTimeToSeconds(label) {
  const match = String(label || '').match(/(\d+):(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const meridiem = match[4].toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseReplayRows(text, file) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const block = match[2] || '';
    const actual = block.match(/actual_next:\s*(\d+)/)?.[1] || null;
    const ctx = block.match(/ctx_full:\s*([\d ]+)/)?.[1]?.trim() || '';
    const rolls = ctx ? ctx.split(/\s+/).filter((v) => VALUES.includes(v)) : [];
    if (actual && rolls.length >= 6) {
      rows.push({ file, timeLabel: match[1], timestampSec: parseTimeToSeconds(match[1]), actual, rolls });
    }
  }
  return rows;
}

function parseLegacyCtxRows(text, file) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][^\n]*actual:\s*(\d+)[^\n]*?\|\s*ctx:\s*([0-9,\s]+)/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const rolls = (match[3] || '').split(/[,\s]+/).filter((v) => VALUES.includes(v));
    if (rolls.length >= 6) {
      rows.push({ file, timeLabel: match[1], timestampSec: parseTimeToSeconds(match[1]), actual: match[2], rolls });
    }
  }
  return rows;
}

function parseTimeline(text, file) {
  const rows = [];
  const translatedRe = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][^\n]*TRANSLATED:\s*(\d+)/gi;
  let match;
  while ((match = translatedRe.exec(text)) !== null) {
    if (VALUES.includes(match[2])) {
      rows.push({ file, timeLabel: match[1], timestampSec: parseTimeToSeconds(match[1]), value: match[2] });
    }
  }
  if (rows.length) return rows;
  const actualRe = /\[(\d+:\d+:\d+\s*(?:AM|PM))\]\s*actual:\s*(\d+)/gi;
  while ((match = actualRe.exec(text)) !== null) {
    if (VALUES.includes(match[2])) {
      rows.push({ file, timeLabel: match[1], timestampSec: parseTimeToSeconds(match[1]), value: match[2] });
    }
  }
  return rows;
}

function rowsFromTimeline(timeline) {
  const rows = [];
  for (let i = 6; i < timeline.length; i += 1) {
    rows.push({
      file: timeline[i].file,
      timeLabel: timeline[i].timeLabel,
      timestampSec: timeline[i].timestampSec,
      actual: timeline[i].value,
      rolls: timeline.slice(0, i).map((row) => row.value),
    });
  }
  return rows;
}

function readTextFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    const root = resolve(dir);
    const walk = (current) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && /\.(txt|md)$/i.test(entry.name)) {
          files.push({ path: full, name: basename(full), text: readFileSync(full, 'utf8') });
        }
      }
    };
    try { walk(root); } catch {}
  }
  return files;
}

function splitFiveMinute(timeline) {
  if (!timeline.length) return [];
  const sessions = [];
  let current = [];
  let start = null;
  for (const row of timeline) {
    if (row.timestampSec == null) { current.push(row); continue; }
    if (start == null) { start = row.timestampSec; current.push(row); continue; }
    if (row.timestampSec - start >= 300 && current.length) {
      sessions.push(current);
      current = [row];
      start = row.timestampSec;
    } else {
      current.push(row);
    }
  }
  if (current.length) sessions.push(current);
  return sessions;
}

// ─── AGENTS ──────────────────────────────────────────────────────────────────

function agentMain(rolls) {
  return predictWithPairs(rolls);
}

function agentKiyoWave(rolls) {
  try {
    const snap = analyze2strWave(rolls);
    if (!snap) return { prediction: null, alt: null, confidence: 0 };
    const bets = snap.betRolls || [];
    return {
      prediction: bets[0] || null,
      alt: bets[1] || null,
      confidence: snap.confidence || 0,
      pairing: snap.pairing,
    };
  } catch {
    return { prediction: null, alt: null, confidence: 0 };
  }
}

function agentSvarogOnly(result) {
  return {
    prediction: result.analyzerPrediction || null,
    alt: result.analyzerAlt || null,
    confidence: result.confidence || 0,
  };
}

function classifyBoardState(rolls, pResult) {
  const { commons, noise, isChaotic } = identifyCommonsNoise(rolls);
  const regime = classifyRegime(rolls, commons, noise);
  const trends = calculateTrends(rolls);
  const wave = calculateWaveSignals(rolls, commons);

  const staleCommons = (commons || []).filter(c => {
    const t = trends[c];
    return t && (t.trend === 'falling' || t.freshness === 'stale');
  }).length;

  const bothStale = staleCommons >= 2;
  const oneStaleOneFalling = staleCommons === 1 && (commons || []).some(c => {
    const t = trends[c];
    return t && t.trend === 'falling';
  });

  const pairSafety = pResult.pairSafety || 'unknown';
  const noiseRisk = pResult.noiseRisk || 0;
  const mixedWindow = pResult.mixedWindow || false;
  let top2Share = 0;
  const dist = pResult.distribution || {};
  if (Array.isArray(dist)) {
    top2Share = dist.slice(0, 2).reduce((s, v) => s + (v.pct || 0), 0);
  } else {
    const sorted = Object.entries(dist)
      .map(([k, v]) => ({ value: k, pct: v?.pct || 0 }))
      .sort((a, b) => b.pct - a.pct);
    top2Share = sorted.slice(0, 2).reduce((s, v) => s + v.pct, 0);
  }

  let degradedScore = 0;
  if (bothStale || oneStaleOneFalling) degradedScore += 1;
  if (pairSafety === 'caution' || pairSafety === 'danger') degradedScore += 1;
  if (noiseRisk > 40 || mixedWindow) degradedScore += 1;
  if (top2Share < 65) degradedScore += 1;

  const breakPressure = pResult.analyzerBreakChallenge || null;
  const svarogLead = breakPressure && breakPressure.scores ?
    Math.max(...breakPressure.scores.map(s => s.score || 0)) - Math.min(...breakPressure.scores.map(s => s.score || 0)) : 0;
  if (svarogLead > 15) degradedScore += 1;

  let state = 'stable';
  if (isChaotic) state = 'chaotic';
  else if (degradedScore >= 4) state = 'degraded-heavy';
  else if (degradedScore === 3) state = 'degraded-moderate';
  else if (degradedScore >= 1) state = 'degraded-light';
  else if (wave?.isWaveWarning) state = 'wave-warning';

  return {
    state,
    degradedScore,
    isChaotic,
    staleCommons,
    pairSafety,
    noiseRisk,
    top2Share,
    regime: regime?.regime || 'unknown',
  };
}

// ─── SIMULATION ──────────────────────────────────────────────────────────────

function runSwarm(rows) {
  const agents = {
    main: { hits: 0, top2: 0, total: 0, byState: {} },
    svarog: { hits: 0, top2: 0, total: 0, byState: {} },
    kiyoWave: { hits: 0, top2: 0, total: 0, byState: {} },
  };

  const disagreements = [];
  const weaknessHeatmap = {};
  const agentWins = {};

  for (const row of rows) {
    const rolls = row.rolls;
    const actual = row.actual;

    const mainR = agentMain(rolls);
    const svarogR = agentSvarogOnly(mainR);
    const kiyoR = agentKiyoWave(rolls);

    const board = classifyBoardState(rolls, mainR);
    const stateKey = board.state;

    const results = {
      main: mainR,
      svarog: svarogR,
      kiyoWave: kiyoR,
    };

    for (const [name, res] of Object.entries(results)) {
      const hit = res.prediction === actual;
      const top2 = hit || res.alt === actual;
      const a = agents[name];
      a.total += 1;
      if (hit) a.hits += 1;
      if (top2) a.top2 += 1;
      if (!a.byState[stateKey]) a.byState[stateKey] = { hits: 0, top2: 0, total: 0 };
      a.byState[stateKey].total += 1;
      if (hit) a.byState[stateKey].hits += 1;
      if (top2) a.byState[stateKey].top2 += 1;
    }

    const mainHit = mainR.prediction === actual;
    if (!mainHit) {
      const winners = [];
      for (const [name, res] of Object.entries(results)) {
        if (name === 'main') continue;
        if (res.prediction === actual || res.alt === actual) winners.push(name);
      }

      if (winners.length) {
        if (!agentWins[stateKey]) agentWins[stateKey] = {};
        for (const w of winners) {
          agentWins[stateKey][w] = (agentWins[stateKey][w] || 0) + 1;
        }
      }

      if (winners.length && stateKey.startsWith('degraded')) {
        disagreements.push({
          actual,
          ctx: rolls.slice(-10).join(' '),
          state: stateKey,
          degradedScore: board.degradedScore,
          main: `${mainR.prediction}/${mainR.alt}`,
          svarog: `${svarogR.prediction}/${svarogR.alt}`,
          kiyoWave: `${kiyoR.prediction}/${kiyoR.alt}`,
          winners,
          pairSafety: board.pairSafety,
          noiseRisk: board.noiseRisk,
          regime: board.regime,
        });
      }
    }

    const allMissed = !Object.values(results).some(r => r.prediction === actual || r.alt === actual);
    if (allMissed) {
      weaknessHeatmap[stateKey] = (weaknessHeatmap[stateKey] || 0) + 1;
    }
  }

  return { agents, disagreements, agentWins, weaknessHeatmap };
}

// ─── REPORT ──────────────────────────────────────────────────────────────────

function toMarkdown({ rows, swarm, totalRolls, sessions }) {
  const lines = [];
  lines.push('# Agent Swarm Simulation Report');
  lines.push('');
  lines.push('> Auto-generated by `scripts/agent-swarm.mjs`');
  lines.push(`> Date: ${new Date().toISOString()}`);
  lines.push(`> Test rows: ${rows.length} | Timeline rolls: ${totalRolls} | Sessions: ${sessions}`);
  lines.push('');

  lines.push('## Baseline Accuracy (All Board States)');
  lines.push('| Agent | Top-1 | Top-2 | Total |');
  lines.push('|-------|-------|-------|-------|');
  for (const [name, stats] of Object.entries(swarm.agents)) {
    lines.push(`| ${name} | ${pct(stats.hits, stats.total)}% | ${pct(stats.top2, stats.total)}% | ${stats.total} |`);
  }
  lines.push('');

  lines.push('## Accuracy by Board State');
  const allStates = new Set();
  for (const stats of Object.values(swarm.agents)) {
    Object.keys(stats.byState).forEach(s => allStates.add(s));
  }
  for (const state of [...allStates].sort()) {
    lines.push(`### ${state}`);
    lines.push('| Agent | Top-1 | Top-2 | Total |');
    lines.push('|-------|-------|-------|-------|');
    for (const [name, stats] of Object.entries(swarm.agents)) {
      const s = stats.byState[state] || { hits: 0, top2: 0, total: 0 };
      lines.push(`| ${name} | ${pct(s.hits, s.total)}% | ${pct(s.top2, s.total)}% | ${s.total} |`);
    }
    lines.push('');
  }

  lines.push('## Where Main Misses, Who Saves It?');
  lines.push('When `main` predictor misses, which alternative agents caught the actual roll?');
  lines.push('');
  const winKeys = Object.keys(swarm.agentWins).sort();
  for (const state of winKeys) {
    lines.push(`### ${state}`);
    const wins = swarm.agentWins[state];
    for (const [agent, count] of Object.entries(wins).sort((a, b) => b[1] - a[1])) {
      lines.push(`- **${agent}**: ${count} saves`);
    }
    lines.push('');
  }

  lines.push('## Degraded Board Disagreements (Detailed)');
  lines.push('These are rolls where the board was degraded and the main predictor missed while at least one agent saved it.');
  lines.push('');
  const byState = {};
  for (const d of swarm.disagreements) {
    if (!byState[d.state]) byState[d.state] = [];
    byState[d.state].push(d);
  }
  for (const state of Object.keys(byState).sort()) {
    lines.push(`### ${state} (${byState[state].length} cases)`);
    for (const d of byState[state].slice(0, 15)) {
      lines.push(`- **actual ${d.actual}** | ctx: \`${d.ctx}\``);
      lines.push(`  - main: ${d.main} | svarog: ${d.svarog} | kiyo: ${d.kiyoWave}`);
      lines.push(`  - winners: ${d.winners.join(', ')} | degradedScore: ${d.degradedScore} | pairSafety: ${d.pairSafety} | noiseRisk: ${d.noiseRisk}% | regime: ${d.regime}`);
    }
    lines.push('');
  }

  lines.push('## Universal Miss Heatmap');
  lines.push('Board states where **all agents missed** (hardest cases):');
  lines.push('');
  for (const [state, count] of Object.entries(swarm.weaknessHeatmap).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${state}\`: ${count} rolls`);
  }
  lines.push('');

  lines.push('## Key Findings & Recommendations');
  lines.push('');

  const main = swarm.agents.main;
  const svarog = swarm.agents.svarog;
  const kiyo = swarm.agents.kiyoWave;

  lines.push('### 1. Baseline Performance');
  lines.push(`- **Main predictor**: ${pct(main.hits, main.total)}% top-1, ${pct(main.top2, main.total)}% top-2`);
  lines.push(`- **Svarog only**: ${pct(svarog.hits, svarog.total)}% top-1, ${pct(svarog.top2, svarog.total)}% top-2`);
  lines.push(`- **Kiyo Wave**: ${pct(kiyo.hits, kiyo.total)}% top-1, ${pct(kiyo.top2, kiyo.total)}% top-2`);
  lines.push('');

  lines.push('### 2. Best Agent by Board State');
  for (const state of [...allStates].sort()) {
    let best = null, bestAcc = -1;
    for (const [name, stats] of Object.entries(swarm.agents)) {
      const s = stats.byState[state];
      if (!s || s.total < 3) continue;
      const acc = pct(s.hits, s.total);
      if (acc > bestAcc) { bestAcc = acc; best = name; }
    }
    if (best) lines.push(`- \`${state}\`: **${best}** (${bestAcc}% top-1)`);
  }
  lines.push('');

  const degradedMisses = swarm.disagreements.length;
  const savesByAgent = {};
  for (const state of winKeys) {
    for (const [agent, count] of Object.entries(swarm.agentWins[state])) {
      savesByAgent[agent] = (savesByAgent[agent] || 0) + count;
    }
  }
  lines.push('### 3. Dormant / Degraded Board Rescue');
  lines.push(`- Main predictor missed on degraded boards: ${degradedMisses} times`);
  lines.push('- Alternative agents saved it:');
  for (const [agent, count] of Object.entries(savesByAgent).sort((a, b) => b[1] - a[1])) {
    lines.push(`  - ${agent}: ${count} saves`);
  }
  lines.push('');

  lines.push('### 4. Concrete Recommendations');
  lines.push('');
  lines.push('**A. Tighten Svarog Override Rules**');
  lines.push('- Only allow Svarog to override main when ALL three hold:');
  lines.push('  1. Svarog candidate leads lane-memory pick by > 15 pts');
  lines.push('  2. Board is degraded (pair safety caution/danger OR noise risk > 40%)');
  lines.push('  3. Lane-memory pick is stale or falling, not fresh-rising');
  lines.push('');
  lines.push('**B. Dormant-Value Rescue Bonus**');
  lines.push('- Gate dormant rescue behind board weakness (3+ degraded conditions)');
  lines.push('- At 3/5 degraded conditions: dormant value can enter top-2 if trust tier >= medium');
  lines.push('- At 4-5/5 degraded conditions: dormant value can compete for main prediction if it also has Svarog backing');
  lines.push('- Bonus should be enough to beat a stale-falling common, but lose to a fresh-rising common');
  lines.push('');
  lines.push('**C. Minimum-Sample Gate**');
  lines.push('- Degraded-board detection and dormant rescue should NOT fire until:');
  lines.push('  - total session rolls >= 8 AND pair age >= 3');
  lines.push('- Below this threshold: fall back to existing default behavior');
  lines.push('');
  lines.push('**D. Implement Svarog First, Dormant Second**');
  lines.push('- Implement tightened Svarog override rules first');
  lines.push('- Re-run this swarm analysis to see if dormant values are still missed');
  lines.push('- If yes, add dormant rescue as a second pass. If no, skip it (avoids double-count).');
  lines.push('');

  lines.push('---');
  lines.push('End of report.');

  return lines.join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const dirs = process.argv.slice(2);
const scanDirs = dirs.length ? dirs : ['debugfiles/testdata'];
const files = readTextFiles(scanDirs);

const timelines = [];
const evalRows = [];

for (const file of files) {
  const replay = parseReplayRows(file.text, file.path);
  const legacy = parseLegacyCtxRows(file.text, file.path);
  const timeline = parseTimeline(file.text, file.path);
  if (timeline.length) timelines.push(timeline);
  if (replay.length || legacy.length) {
    evalRows.push(...replay, ...legacy);
  } else if (timeline.length >= 7) {
    evalRows.push(...rowsFromTimeline(timeline));
  }
}

const allTimelineValues = timelines.flatMap(t => t.map(r => r.value));
const sessions = timelines.flatMap(t => splitFiveMinute(t)).filter(s => s.length >= 6).length;

console.log(`Loaded ${evalRows.length} eval rows from ${files.length} files`);
console.log(`Timeline rolls: ${allTimelineValues.length}, Sessions: ${sessions}`);

const swarm = runSwarm(evalRows);

const markdown = toMarkdown({
  rows: evalRows,
  swarm,
  totalRolls: allTimelineValues.length,
  sessions,
});

const outputPath = resolve('debugfiles', 'kimi.md');
writeFileSync(outputPath, markdown, 'utf8');

console.log(`\nWrote ${outputPath}`);
console.log(`\nQuick Summary:`);
for (const [name, stats] of Object.entries(swarm.agents)) {
  console.log(`  ${name}: top-1 ${pct(stats.hits, stats.total)}% | top-2 ${pct(stats.top2, stats.total)}% (${stats.total} rolls)`);
}
