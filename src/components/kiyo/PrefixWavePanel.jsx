import React, { useMemo } from 'react';
import { analyzeKiyoExplicitPairs, KIYO_EXACT_ROLLS, KIYO_XY_COLUMNS } from '../../utils/kiyoExplicitPairEngine';

const PREFIXES = ['41', '42', '43', '44'];

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function scoreTone(score) {
  if (score >= 0.72) return '#34d399';
  if (score >= 0.52) return '#fbbf24';
  if (score >= 0.34) return '#fb7185';
  return '#64748b';
}

function countTone(count, max) {
  if (!count) return '#475569';
  if (count === max) return '#34d399';
  if (count >= Math.max(2, max - 1)) return '#fbbf24';
  return '#fb923c';
}

function boxBase(extra = {}) {
  return {
    border: '1px solid rgba(148,163,184,0.16)',
    borderRadius: '8px',
    background: '#100d12',
    ...extra,
  };
}

function pickPanel(isMain = false) {
  return {
    border: `1px solid ${isMain ? 'rgba(251,0,88,0.64)' : 'rgba(148,163,184,0.18)'}`,
    borderRadius: '7px',
    padding: '8px',
    background: isMain ? '#251019' : '#151217',
  };
}

function ExactPredictor({ read }) {
  const picks = [read.activeCandidates?.[0], read.activeCandidates?.[1], read.activeCandidates?.[2]].filter(Boolean);
  if (!read.valid || !picks.length) {
    return (
      <div style={boxBase({ padding: '12px' })}>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>3 String Predictor</div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>Need 3+ rolls. Best read starts around 6-8 live rolls.</div>
      </div>
    );
  }

  return (
    <div style={boxBase({ padding: '12px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '8px' }}>
        <div>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>3 String Predictor</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {read.previewPrefix ? `Reading ${read.previewPrefix}x from live input.` : 'Type a 2-digit prefix like 42 to read that lane.'}
          </div>
        </div>
        {read.warmup && <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 900 }}>warm-up read</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {picks.slice(0, 2).map((pick, idx) => (
          <div key={pick.roll} style={pickPanel(idx === 0)}>
            <div style={{ fontSize: '9px', color: idx === 0 ? '#ff4f8b' : '#94a3b8', fontWeight: 900, letterSpacing: '0.8px' }}>
              {idx === 0 ? 'MAIN' : 'ALT'}
            </div>
            <div style={{ marginTop: '3px', fontSize: idx === 0 ? '24px' : '19px', color: '#f8fafc', fontWeight: 950, fontFamily: 'monospace' }}>{pick.roll}</div>
            <div style={{ marginTop: '5px', color: scoreTone(pick.score), fontSize: '13px', fontWeight: 900 }}>{pct(pick.score)}</div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
              seen x{pick.exactCount} · age {pick.age >= 20 ? 'new' : `${pick.age}r`}
            </div>
          </div>
        ))}
      </div>
      {picks[2] && (
        <div style={{ marginTop: '7px', padding: '6px 8px', border: '1px solid rgba(148,163,184,0.12)', borderRadius: '7px', background: '#151217', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>Watch only</span>
          <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontWeight: 900 }}>{picks[2].roll} · {pct(picks[2].score)}</span>
        </div>
      )}
    </div>
  );
}

function XyPairTracker({ read }) {
  const lead = read.xyRows[0];
  const second = read.xyRows[1];
  const patternLead = [...(read.xyRows || [])].sort((a, b) => b.pattern.confidence - a.pattern.confidence)[0];
  const tableWarns = patternLead && patternLead.pattern.targetSide !== patternLead.side && patternLead.pattern.confidence >= 0.58;
  const leadState = lead?.action === 'SWITCH' ? 'Break watch' : 'Stay watch';
  const leadHelp = lead?.action === 'SWITCH'
    ? `Current pair is ${lead.currentLabel || 'unclear'}. Watch ${lead.targetLabel} as the break pair.`
    : `Current pair is ${lead.currentLabel || lead.targetLabel}. Stay with it unless the timeline flips.`;
  const backupText = second
    ? `Backup: ${second.targetLabel} if this pair fails.`
    : 'Backup appears after more rolls.';
  return (
    <div style={boxBase({ padding: '12px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>2 String Pair Tracker</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Column read before choosing Z.</div>
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>green = pointed side</div>
      </div>
      {lead && (
        <div style={{
          marginBottom: '8px',
          padding: '8px 9px',
          borderRadius: '7px',
          border: `1px solid ${tableWarns ? 'rgba(251,191,36,0.38)' : 'rgba(52,211,153,0.28)'}`,
          background: tableWarns ? '#21170d' : '#0f211c',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '10px',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: tableWarns ? '#fbbf24' : '#34d399', fontWeight: 900 }}>
              {tableWarns ? 'Table warning' : 'Main read confirmed'}
            </div>
            <div style={{ marginTop: '2px', fontSize: '11px', color: '#cbd5e1' }}>
              {tableWarns
                ? `${patternLead.name} rhythm points to ${patternLead.pattern.targetLabel}; keep ${lead.targetLabel} first, but be ready for that break.`
                : `Predictor and table rhythm both support ${lead.targetLabel}.`}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: tableWarns ? '#fbbf24' : '#34d399', fontWeight: 950, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {tableWarns ? patternLead.pattern.targetLabel : lead.targetLabel}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: '6px' }}>
        {read.xyRows.map((row, idx) => {
          const leftLive = row.side === 'left';
          return (
            <div key={row.key} style={{
              display: 'grid', gridTemplateColumns: '64px 1fr 82px', gap: '8px', alignItems: 'center',
              padding: '7px 9px', borderRadius: '7px',
              border: `1px solid ${idx === 0 ? 'rgba(251,0,88,0.52)' : 'rgba(148,163,184,0.14)'}`,
              background: idx === 0 ? '#251019' : '#151217',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: idx === 0 ? '#ff4f8b' : '#94a3b8', fontWeight: 900 }}>{row.name}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{row.action === 'SWITCH' ? 'break' : 'stay'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 900 }}>
                  <span style={{ color: leftLive ? '#34d399' : '#fb923c' }}>{row.leftLabel}</span>
                  <span style={{ color: '#475569', margin: '0 8px' }}>vs</span>
                  <span style={{ color: !leftLive ? '#34d399' : '#fb923c' }}>{row.rightLabel}</span>
                </div>
                <div style={{ marginTop: '5px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: pct(row.score), height: '100%', background: idx === 0 ? '#fb0058' : '#64748b' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', color: scoreTone(row.score), fontWeight: 900, fontSize: '11px' }}>
                {pct(row.score)}
                <div style={{ color: '#64748b', fontWeight: 800, fontSize: '10px' }}>{row.runLength} roll run</div>
              </div>
            </div>
          );
        })}
      </div>
      {lead && (
        <div style={{
          marginTop: '8px',
          padding: '10px',
          borderRadius: '7px',
          border: '1px solid rgba(251,0,88,0.48)',
          background: '#251019',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '10px', color: '#ff4f8b', fontWeight: 900, letterSpacing: '0.8px' }}>{lead.name} · 2 STRING PREDICTOR</div>
            <div style={{ marginTop: '4px', fontSize: '16px', color: '#f8fafc', fontWeight: 950 }}>
              {leadState}: <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{lead.targetLabel}</span>
            </div>
            <div style={{ marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>{leadHelp}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8' }}>
            <span style={{ color: scoreTone(lead.score), fontSize: '16px', fontWeight: 950 }}>{pct(lead.score)}</span>
            <div style={{ marginTop: '2px', color: '#64748b' }}>{backupText}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TwoStringPatternRecognition({ read }) {
  const rows = [...(read.xyRows || [])].sort((a, b) => b.pattern.confidence - a.pattern.confidence).slice(0, 3);
  return (
    <div style={boxBase({ padding: '10px', marginTop: '8px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>2 String Pattern Recognition</div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>same = confirms · warning = possible break</div>
      </div>
      <div style={{ display: 'grid', gap: '6px' }}>
        {rows.map((row, idx) => {
          const matchesMain = row.pattern.targetSide === row.side;
          const relationLabel = matchesMain ? 'same as pick' : 'table warning';
          return (
            <div key={row.key} style={{
              display: 'grid',
              gridTemplateColumns: '72px 1fr 62px',
              gap: '8px',
              alignItems: 'center',
              padding: '7px 8px',
              borderRadius: '7px',
              border: `1px solid ${idx === 0 ? 'rgba(52,211,153,0.34)' : 'rgba(148,163,184,0.14)'}`,
              background: idx === 0 ? '#10251f' : '#151217',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: idx === 0 ? '#34d399' : '#94a3b8', fontWeight: 900 }}>{row.name}</div>
                <div style={{ fontSize: '10px', color: matchesMain ? '#34d399' : '#fbbf24' }}>{relationLabel}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 900, fontFamily: 'monospace' }}>{row.pattern.targetLabel}</div>
                <div style={{ marginTop: '2px', fontSize: '10px', color: '#94a3b8' }}>{row.pattern.note}</div>
              </div>
              <div style={{ textAlign: 'right', color: scoreTone(row.pattern.confidence), fontWeight: 950, fontSize: '12px' }}>{pct(row.pattern.confidence)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PairTimeline({ read }) {
  const recent = read.recent.slice(-10).reverse();
  return (
    <div style={boxBase({ overflow: 'hidden' })}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>2 String Lane Timeline</div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>#1 is newest. Green = roll belongs to the first pair in that column.</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '470px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '34px', padding: '7px', color: '#94a3b8', fontSize: '10px', textAlign: 'left' }}>#</th>
              {KIYO_XY_COLUMNS.map((column) => {
                const isLead = read.xyRows[0]?.key === column.key;
                return (
                <th key={column.key} style={{ padding: '7px', color: isLead ? '#ff4f8b' : '#cbd5e1', fontSize: '11px', textAlign: 'center', borderLeft: '1px solid rgba(251,146,60,0.14)', background: isLead ? '#251019' : '#151217' }}>
                  {column.name}<div style={{ color: '#64748b', fontSize: '9px' }}>{column.leftLabel} / {column.rightLabel}</div>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {recent.map((roll, idx) => {
              const prefix = roll.slice(0, 2);
              return (
                <tr key={`${roll}-${idx}`}>
                  <td style={{ padding: '6px 7px', color: '#64748b', fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{idx + 1}</td>
                  {KIYO_XY_COLUMNS.map((column) => {
                    const hit = column.left.includes(prefix);
                    const isLead = read.xyRows[0]?.key === column.key;
                    return (
                      <td key={column.key} style={{
                        padding: '6px 7px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900,
                        color: hit ? '#34d399' : '#fb923c',
                        background: isLead
                          ? (hit ? '#0d3328' : '#2a1b12')
                          : (hit ? '#10251f' : '#1b1410'),
                        borderLeft: '1px solid rgba(251,146,60,0.12)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}>{prefix}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrefixSeedAssist({ read }) {
  return (
    <div style={boxBase({ padding: '10px 12px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>Seed Assist</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Live rolls: {read.liveRollCount}. Seed rolls: {read.seedRollCount}. Seed weight {Math.round(read.seedWeight * 100)}%; disabled after 5 live rolls.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {read.prefixSummary.slice(0, 4).map((row) => (
            <span key={row.prefix} style={{ fontSize: '11px', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '5px 8px', fontFamily: 'monospace' }}>
              {row.prefix}x <span style={{ color: countTone(row.count, read.prefixSummary[0]?.count || 1) }}>x{row.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function XyzPairTracker({ read }) {
  const prefix = read.previewPrefix;
  const rows = prefix
    ? read.candidates.filter((candidate) => candidate.prefix === prefix).slice(0, 4)
    : [];

  return (
    <div style={boxBase({ padding: '12px' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>3 String Pair Tracker</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {prefix ? `Checks the ${prefix}x table and ranks which Z comes next.` : 'Type 41, 42, 43, or 44 to target a lane.'}
          </div>
        </div>
        {prefix && <div style={{ fontSize: '11px', color: '#ff4f8b', fontWeight: 900, fontFamily: 'monospace' }}>{prefix}x</div>}
      </div>
      {rows.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {rows.map((row, idx) => (
            <div key={row.roll} style={{
              ...pickPanel(idx === 0),
              padding: idx < 2 ? '9px' : '7px',
            }}>
              <div style={{ fontSize: '9px', color: idx === 0 ? '#ff4f8b' : idx === 1 ? '#fbbf24' : '#94a3b8', fontWeight: 900 }}>{idx === 0 ? 'MAIN Z' : idx === 1 ? 'ALT Z' : `CHECK ${idx + 1}`}</div>
              <div style={{ marginTop: '3px', color: '#f8fafc', fontSize: '16px', fontWeight: 950, fontFamily: 'monospace' }}>{row.roll}</div>
              <div style={{ marginTop: '4px', color: scoreTone(row.score), fontSize: '12px', fontWeight: 900 }}>{pct(row.score)}</div>
              <div style={{ marginTop: '3px', color: '#64748b', fontSize: '10px' }}>x{row.exactCount} · age {row.age >= 20 ? 'new' : `${row.age}r`}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#64748b', fontSize: '11px' }}>No lane selected yet.</div>
      )}
    </div>
  );
}

function XyzBreakdown({ read }) {
  const maxCount = Math.max(1, ...Object.values(read.exactCounts));
  const recent = read.recent.slice(-10);
  return (
    <div style={boxBase({ overflow: 'hidden' })}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#f8fafc' }}>3 String Breakdown</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Header count color shows which exact rolls are most hit in this session.</div>
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>green = row hit · amber = visible reset</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1120px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '38px', padding: '7px', color: '#94a3b8', fontSize: '10px', textAlign: 'left' }}>#</th>
              {KIYO_EXACT_ROLLS.map((exact, idx) => {
                const count = read.exactCounts[exact] || 0;
                return (
                  <th key={exact} style={{ padding: '6px 5px', color: '#cbd5e1', fontSize: '11px', fontFamily: 'monospace', textAlign: 'center', borderLeft: idx % 4 === 0 ? '2px solid rgba(251,0,88,0.30)' : '1px solid rgba(255,255,255,0.04)' }}>
                    {exact}
                    <div style={{ color: countTone(count, maxCount), fontSize: '10px', marginTop: '2px', fontWeight: 900 }}>x{count}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {recent.map((roll, rowIdx) => (
              <tr key={`${roll}-${rowIdx}`}>
                <td style={{ padding: '6px 7px', color: '#64748b', fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{rowIdx + 1}</td>
                {KIYO_EXACT_ROLLS.map((exact, idx) => {
                  const hit = roll === exact;
                  return (
                    <td key={exact} style={{ padding: '6px 5px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, color: hit ? '#34d399' : '#fb923c', background: hit ? '#0d3328' : '#1b1410', borderTop: '1px solid rgba(255,255,255,0.05)', borderLeft: idx % 4 === 0 ? '2px solid rgba(251,0,88,0.26)' : '1px solid rgba(255,255,255,0.035)' }}>
                      {exact}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PrefixWavePanel({ liveRolls, seedRolls, combinedRolls, activePrefix }) {
  const read = useMemo(
    () => analyzeKiyoExplicitPairs(liveRolls || combinedRolls || [], { previewPrefix: activePrefix, seedRolls }),
    [liveRolls, combinedRolls, seedRolls, activePrefix]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(420px, 1.1fr)', gap: '10px' }}>
        <div>
          <XyPairTracker read={read} />
          <TwoStringPatternRecognition read={read} />
        </div>
        <PairTimeline read={read} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(420px, 1.1fr)', gap: '10px' }}>
        <ExactPredictor read={read} />
        <XyzPairTracker read={read} />
      </div>
      <XyzBreakdown read={read} />
      <PrefixSeedAssist read={read} />
    </div>
  );
}


