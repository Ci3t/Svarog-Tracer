import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';

const VALUES = ['41', '42', '43', '44'];

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

function parseActualTimeline(text) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\]\s*actual:\s*(\d+)/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    rows.push({
      timeLabel: match[1],
      timestampSec: parseTimeLabelToSeconds(match[1]),
      value: match[2],
    });
  }
  return rows;
}

function parseReplayBlocks(text) {
  const re = /\[(\d+:\d+:\d+\s*(?:AM|PM))\][\s\S]*?--- AI REPLAY BLOCK ---([\s\S]*?)--- END AI REPLAY BLOCK ---/gi;
  const rows = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const timeLabel = match[1];
    const block = match[2] || '';
    const actual = block.match(/actual_next: (\d+)/)?.[1] || null;
    const freshOutsider = block.match(/fresh_outsider: (\d+)/)?.[1] || null;
    const freshOutsiderScore = Number(block.match(/fresh_outsider: \d+ \| score ([\d.]+)/)?.[1] || 0);
    const mode = block.match(/analyzer_mode: ([^\n]+)/)?.[1]?.trim() || null;
    const timing = block.match(/analyzer_noise_timing: ([^\n]+)/)?.[1]?.trim() || null;
    const dueRatioPct = Number(block.match(/analyzer_noise_due_ratio_pct: ([\d.]+)/)?.[1] || 0);
    const breakLine = block.match(/analyzer_break_challenge: ([^\n]+)/)?.[1] || '';
    const topNoise = breakLine.match(/top_noise=(\d+)/)?.[1] || null;
    const promoted = /promoted=yes/.test(breakLine);
    if (!actual) continue;
    rows.push({
      timeLabel,
      timestampSec: parseTimeLabelToSeconds(timeLabel),
      actual,
      freshOutsider,
      freshOutsiderScore,
      mode,
      timing,
      dueRatioPct,
      topNoise,
      promoted,
    });
  }
  return rows;
}

function splitSessions(rows) {
  if (!rows.length) return [];
  const sessions = [];
  let current = [];
  let sessionStart = null;
  for (const row of rows) {
    if (row.timestampSec == null) {
      current.push(row);
      continue;
    }
    if (sessionStart == null) {
      sessionStart = row.timestampSec;
      current.push(row);
      continue;
    }
    if (row.timestampSec - sessionStart >= 300) {
      sessions.push(current);
      current = [row];
      sessionStart = row.timestampSec;
    } else {
      current.push(row);
    }
  }
  if (current.length) sessions.push(current);
  return sessions;
}

function pct(n, d) {
  return d ? (100 * n) / d : 0;
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function entropy(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let h = 0;
  for (const count of Object.values(counts)) {
    if (!count) continue;
    const p = count / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function analyzeSequence(rows) {
  const counts = Object.fromEntries(VALUES.map((v) => [v, 0]));
  const transitions = {};
  const pair2 = {};
  const runDist = Object.fromEntries(VALUES.map((v) => [v, {}]));
  let maxRun = { value: null, len: 0 };

  for (const row of rows) counts[row.value] = (counts[row.value] || 0) + 1;

  for (let i = 0; i < rows.length - 1; i += 1) {
    const a = rows[i].value;
    const b = rows[i + 1].value;
    transitions[a] ||= Object.fromEntries(VALUES.map((v) => [v, 0]));
    transitions[a][b] += 1;
  }

  for (let i = 0; i < rows.length - 2; i += 1) {
    const key = `${rows[i].value},${rows[i + 1].value}`;
    const next = rows[i + 2].value;
    pair2[key] ||= Object.fromEntries(VALUES.map((v) => [v, 0]));
    pair2[key][next] += 1;
  }

  let i = 0;
  while (i < rows.length) {
    const value = rows[i].value;
    let len = 1;
    while (i + len < rows.length && rows[i + len].value === value) len += 1;
    runDist[value][len] = (runDist[value][len] || 0) + 1;
    if (len > maxRun.len) maxRun = { value, len };
    i += len;
  }

  const total = rows.length;
  const freq = Object.fromEntries(VALUES.map((v) => [v, pct(counts[v], total)]));

  const liftedTransitions = [];
  for (const from of VALUES) {
    for (const to of VALUES) {
      const fromTotal = Object.values(transitions[from] || {}).reduce((a, b) => a + b, 0);
      const cond = pct(transitions[from]?.[to] || 0, fromTotal);
      const base = freq[to];
      const lift = base ? cond / base : 0;
      liftedTransitions.push({ from, to, cond: round(cond), base: round(base), lift: round(lift), samples: transitions[from]?.[to] || 0 });
    }
  }
  liftedTransitions.sort((a, b) => b.lift - a.lift || b.samples - a.samples);

  const topPairFollowers = Object.entries(pair2)
    .map(([key, map]) => {
      const totalSamples = Object.values(map).reduce((a, b) => a + b, 0);
      const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
      return {
        key,
        samples: totalSamples,
        top: top?.[0] || null,
        topPct: round(pct(top?.[1] || 0, totalSamples)),
      };
    })
    .filter((x) => x.samples >= 2)
    .sort((a, b) => b.topPct - a.topPct || b.samples - a.samples)
    .slice(0, 12);

  return {
    total,
    counts,
    freq,
    entropyBits: round(entropy(counts)),
    transitions,
    liftedTransitions: liftedTransitions.slice(0, 12),
    topPairFollowers,
    runDist,
    maxRun,
  };
}

function analyzeReplaySignals(blocks) {
  const total = blocks.length;
  const bpHit = blocks.filter((b) => b.freshOutsider && b.freshOutsider === b.actual).length;
  const topNoiseHit = blocks.filter((b) => b.topNoise && b.topNoise === b.actual).length;
  const promotedHit = blocks.filter((b) => b.promoted && b.topNoise && b.topNoise === b.actual).length;
  const dueOrApproaching = blocks.filter((b) => b.timing === 'due' || b.timing === 'approaching');
  const dueHits = dueOrApproaching.filter((b) => (b.freshOutsider && b.freshOutsider === b.actual) || (b.topNoise && b.topNoise === b.actual)).length;

  const pressureBuckets = [
    { name: '0-39', min: 0, max: 39 },
    { name: '40-69', min: 40, max: 69 },
    { name: '70+', min: 70, max: 9999 },
  ].map((bucket) => {
    const subset = blocks.filter((b) => b.freshOutsiderScore >= bucket.min && b.freshOutsiderScore <= bucket.max);
    const hits = subset.filter((b) => b.freshOutsider && b.freshOutsider === b.actual).length;
    return {
      ...bucket,
      samples: subset.length,
      hitRate: round(pct(hits, subset.length)),
    };
  });

  return {
    total,
    breakPressureHitRate: round(pct(bpHit, total)),
    topNoiseHitRate: round(pct(topNoiseHit, total)),
    promotedNoiseHitRate: round(pct(promotedHit, blocks.filter((b) => b.promoted).length)),
    dueModeHitRate: round(pct(dueHits, dueOrApproaching.length)),
    pressureBuckets,
  };
}

function dominantPairForSession(rows) {
  const counts = Object.fromEntries(VALUES.map((v) => [v, 0]));
  for (const row of rows) counts[row.value] += 1;
  const top2 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v]) => v);
  return top2.join('/');
}

function analyzeFiles(dir) {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.txt'))
    .map((name) => ({
      name,
      path: join(dir, name),
      text: readFileSync(join(dir, name), 'utf8'),
    }));

  const sequences = [];
  const replayBlocks = [];
  const perFile = [];

  for (const file of files) {
    const actuals = parseActualTimeline(file.text);
    const blocks = parseReplayBlocks(file.text);
    sequences.push(...actuals);
    replayBlocks.push(...blocks);

    const sessions = splitSessions(actuals).map((sessionRows, index) => ({
      index: index + 1,
      rolls: sessionRows.length,
      dominantPair: dominantPairForSession(sessionRows),
      entropyBits: round(entropy(Object.fromEntries(VALUES.map((v) => [v, sessionRows.filter((r) => r.value === v).length])))),
      freq: Object.fromEntries(VALUES.map((v) => [v, round(pct(sessionRows.filter((r) => r.value === v).length, sessionRows.length))])),
    }));

    perFile.push({
      file: file.name,
      rolls: actuals.length,
      replayBlocks: blocks.length,
      sessions,
      replaySignal: analyzeReplaySignals(blocks),
    });
  }

  return {
    files: perFile,
    sequenceAnalysis: analyzeSequence(sequences),
    replaySignalAnalysis: analyzeReplaySignals(replayBlocks),
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# PRNG Bias Analysis');
  lines.push('');
  lines.push('This report does **statistical analysis of observed rolls**. It does not claim to reconstruct or clone the server PRNG.');
  lines.push('');

  const seq = report.sequenceAnalysis;
  lines.push('## Global Sequence Summary');
  lines.push(`- Total rolls analyzed: \`${seq.total}\``);
  lines.push(`- Entropy: \`${seq.entropyBits}\` bits out of max \`2.0\` for four equally likely values`);
  lines.push(`- Frequency split: ${VALUES.map((v) => `\`${v}: ${round(seq.freq[v])}%\``).join(', ')}`);
  lines.push(`- Longest run: \`${seq.maxRun.value ?? '?'} x${seq.maxRun.len}\``);
  lines.push('');

  lines.push('## Strongest 1-Step Transition Lifts');
  for (const row of seq.liftedTransitions) {
    lines.push(`- \`${row.from} -> ${row.to}\`: \`${row.cond}%\` conditional vs \`${row.base}%\` base, lift \`${row.lift}x\` (\`${row.samples}\` samples)`);
  }
  lines.push('');

  lines.push('## Strongest 2-Step Followers');
  for (const row of seq.topPairFollowers) {
    lines.push(`- \`${row.key} -> ${row.top}\`: \`${row.topPct}%\` (\`${row.samples}\` samples)`);
  }
  lines.push('');

  lines.push('## Replay Signal Quality');
  const rs = report.replaySignalAnalysis;
  lines.push(`- Break pressure exact-hit rate: \`${rs.breakPressureHitRate}%\``);
  lines.push(`- Top-noise exact-hit rate: \`${rs.topNoiseHitRate}%\``);
  lines.push(`- Promoted top-noise exact-hit rate: \`${rs.promotedNoiseHitRate}%\``);
  lines.push(`- Due/approaching noise hit rate: \`${rs.dueModeHitRate}%\``);
  lines.push('- Break-pressure buckets:');
  for (const bucket of rs.pressureBuckets) {
    lines.push(`  - \`${bucket.name}\`: \`${bucket.hitRate}%\` hit rate over \`${bucket.samples}\` samples`);
  }
  lines.push('');

  lines.push('## Per-File 5-Minute Session Drift');
  for (const file of report.files) {
    lines.push(`### ${file.file}`);
    lines.push(`- Rolls: \`${file.rolls}\` | Replay blocks: \`${file.replayBlocks}\``);
    lines.push(`- Break pressure hit rate: \`${file.replaySignal.breakPressureHitRate}%\``);
    for (const session of file.sessions) {
      lines.push(`- Session ${session.index}: dominant pair \`${session.dominantPair}\`, entropy \`${session.entropyBits}\`, split ${VALUES.map((v) => `\`${v}:${session.freq[v]}%\``).join(' ')}`);
    }
    lines.push('');
  }

  lines.push('## Practical Takeaways');
  lines.push('- If lift-heavy transitions exist, the system is not behaving like uniform independent randomness.');
  lines.push('- If break pressure has real hit rate above its low-score baseline, it is carrying useful signal and should stay in the predictor.');
  lines.push('- If per-session dominant pairs drift a lot, predictor logic should stay session-local rather than relying on one global bias.');
  lines.push('- If 2-step followers are strong, they are better candidates for predictor features than more generic trust-only rules.');
  lines.push('');

  return lines.join('\n');
}

const targetDir = resolve(process.argv[2] || 'debugfiles/testdata');
const report = analyzeFiles(targetDir);
const markdown = toMarkdown(report);
const outputPath = resolve('debugfiles', 'prng-bias-analysis.md');
writeFileSync(outputPath, markdown, 'utf8');

console.log(`Wrote ${basename(outputPath)}`);
console.log(markdown);
