import React, { useMemo } from 'react';

const PREFIXES = ['41', '42', '43', '44'];
const Z_DIGITS = ['1', '2', '3', '4'];

// Fixed column order — always L/H · O/I · O/E left→right
const COL_PAIRINGS = [
  { name: 'Low/High',    short: 'L/H', pairA: ['1','2'], pairALabel: 'Low',   pairB: ['3','4'], pairBLabel: 'High'  },
  { name: 'Outer/Inner', short: 'O/I', pairA: ['1','4'], pairALabel: 'Outer', pairB: ['2','3'], pairBLabel: 'Inner' },
  { name: 'Odd/Even',    short: 'O/E', pairA: ['1','3'], pairALabel: 'Odd',   pairB: ['2','4'], pairBLabel: 'Even'  },
];

const ACT = {
  FLIP: { color: '#f59e0b', dim: 'rgba(245,158,11,0.07)', edge: 'rgba(245,158,11,0.22)', label: 'FLIP' },
  HOLD: { color: '#22c55e', dim: 'rgba(34,197,94,0.06)',  edge: 'rgba(34,197,94,0.20)',  label: 'HOLD' },
  WAIT: { color: '#475569', dim: 'rgba(71,85,105,0.04)',  edge: 'rgba(71,85,105,0.12)',  label: 'WAIT' },
  SKIP: { color: '#334155', dim: 'rgba(51,65,85,0.03)',   edge: 'rgba(51,65,85,0.10)',   label: 'SKIP' },
};

// ── Frequency rank ────────────────────────────────────────────────────────────
function FreqRank({ prefix, zDigits }) {
  const total = zDigits.length;
  const counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
  zDigits.forEach(z => { if (counts[z] !== undefined) counts[z]++; });
  const ranked = [...Z_DIGITS].sort((a, b) => counts[b] - counts[a]);

  if (!total) {
    return <div style={{ padding: '14px 16px', fontSize: '12px', color: '#1e293b', textAlign: 'center' }}>no rolls yet</div>;
  }

  return (
    <div style={{ padding: '10px 16px 12px' }}>
      {ranked.map((z, rank) => {
        const pct = Math.round(counts[z] / total * 100);
        const isPopular = rank < 2;
        return (
          <div key={z} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: rank < 3 ? '5px' : 0 }}>
            <span style={{ fontSize: '10px', color: '#1e293b', width: '10px', flexShrink: 0 }}>{rank + 1}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', width: '30px', flexShrink: 0, color: isPopular ? '#4ade80' : '#fb923c' }}>
              {prefix}{z}
            </span>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: isPopular ? 'rgba(74,222,128,0.45)' : 'rgba(251,146,60,0.35)' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#475569', width: '30px', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
            <span style={{ fontSize: '10px', width: '62px', flexShrink: 0, color: isPopular ? '#4ade80' : '#fb923c' }}>
              {isPopular ? 'Popular' : 'Unpopular'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Pairing pattern table ─────────────────────────────────────────────────────
function PairingPatternTable({ analysis, prefixRolls, zDigits }) {
  if (!prefixRolls.length) return null;

  const hasData   = !!(analysis?.hasData && analysis?.allPairings?.length);
  const bestName  = analysis?.pairingName ?? null;
  const runLength = analysis?.runLength ?? 0;

  // Merge COL_PAIRINGS with scored analysis data + per-pairing prediction
  const colMeta = COL_PAIRINGS.map(cp => {
    const scored = analysis?.allPairings?.find(p => p.pairing.name === cp.name);
    const pred   = analysis?.perPairingPred?.find(p => p.pairingName === cp.name);
    return { ...cp, score: scored?.score ?? 0, n: scored?.n ?? null, pred };
  });

  // Show last 20 rolls
  const displayRolls   = prefixRolls.slice(-20);
  const displayZDigits = zDigits.slice(-20);
  const totalLen       = zDigits.length;
  const displayStart   = totalLen - displayRolls.length;
  const currentRunStart = Math.max(0, totalLen - runLength);

  // Row separators on best-pairing side changes
  const bestColDef = colMeta.find(c => c.name === bestName);
  const flipRows   = new Set();
  if (bestColDef) {
    let prev = null;
    displayZDigits.forEach((z, i) => {
      const side = bestColDef.pairA.includes(z) ? 'A' : 'B';
      if (prev !== null && side !== prev) flipRows.add(i);
      prev = side;
    });
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '340px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#0a0e14' }}>
          <tr>
            <th style={{
              padding: '6px 10px', fontSize: '10px', fontWeight: 500, color: '#1e293b',
              textAlign: 'left', letterSpacing: '0.5px',
              borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap',
            }}>roll</th>
            {colMeta.map(col => {
              const isBest = col.name === bestName;
              const sc     = Math.round((col.score ?? 0) * 100);
              // Per-pairing next prediction arrow
              const pred   = col.pred;
              const predLabel = pred ? pred.nextLabel : null;
              const predIsA   = pred ? pred.nextSide === 'A' : null;
              return (
                <th key={col.name} style={{
                  padding: '6px 6px', textAlign: 'center', minWidth: '62px',
                  borderBottom: `2px solid ${isBest ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.06)'}`,
                  background: isBest ? 'rgba(251,191,36,0.03)' : 'transparent',
                }}>
                  {isBest && (
                    <div style={{ fontSize: '7px', color: 'rgba(251,191,36,0.55)', letterSpacing: '0.4px', marginBottom: '1px' }}>FOLLOW</div>
                  )}
                  <div style={{ fontSize: '10px', fontWeight: 700, color: isBest ? '#fbbf24' : '#334155', marginBottom: '2px' }}>
                    {col.short}{isBest ? ' ★' : ''}
                  </div>
                  {hasData && (
                    <div style={{ fontSize: '9px', color: isBest ? 'rgba(251,191,36,0.65)' : '#1e293b' }}>
                      {sc}%{col.n ? ` N${col.n}` : ''}
                    </div>
                  )}
                  {/* Next-side arrow from per-pairing prediction */}
                  {predLabel && (
                    <div style={{
                      marginTop: '3px', fontSize: '9px', fontWeight: isBest ? 800 : 700,
                      color: predIsA ? '#4ade80' : '#fb923c',
                    }}>next: {predLabel}</div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayZDigits.map((z, i) => {
            const absIdx       = displayStart + i;
            const inCurrentRun = absIdx >= currentRunStart;
            const hasBoundary  = flipRows.has(i);
            return (
              <tr key={i} style={{
                borderTop: hasBoundary ? '1px solid rgba(255,255,255,0.09)' : undefined,
                background: inCurrentRun ? 'rgba(255,255,255,0.012)' : 'transparent',
              }}>
                <td style={{
                  padding: '4px 10px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600,
                  color: inCurrentRun ? '#64748b' : '#1e293b',
                  borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap',
                }}>{displayRolls[i]}</td>
                {colMeta.map(col => {
                  const isBestCol = col.name === bestName;
                  const side  = col.pairA.includes(z) ? 'A' : 'B';
                  const label = side === 'A' ? col.pairALabel : col.pairBLabel;
                  const isA   = side === 'A';
                  return (
                    <td key={col.name} style={{
                      padding: '4px 6px', textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isBestCol && inCurrentRun ? 'rgba(251,191,36,0.03)' : 'transparent',
                    }}>
                      <span style={{
                        display: 'inline-block', width: '46px', padding: '3px 0',
                        borderRadius: '2px', fontSize: '11px', fontWeight: 700, textAlign: 'center',
                        color: isA ? '#4ade80' : '#fb923c',
                        background: isBestCol
                          ? (isA ? 'rgba(74,222,128,0.14)' : 'rgba(251,146,60,0.14)')
                          : (isA ? 'rgba(74,222,128,0.05)' : 'rgba(251,146,60,0.05)'),
                        border: `1px solid ${isBestCol
                          ? (isA ? 'rgba(74,222,128,0.28)' : 'rgba(251,146,60,0.28)')
                          : 'transparent'}`,
                      }}>{label}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Z-vote prediction badge ───────────────────────────────────────────────────
// Shows the 1-2 digit prediction produced by the pair-then-narrow algorithm.
function ZVoteBadge({ prefix, analysis }) {
  if (!analysis?.hasData || !analysis?.topZDigits?.length || analysis.zVoteMax < 2) return null;

  const { topZDigits, zVoteMax, zPredConfidence } = analysis;
  const isSingle = topZDigits.length === 1;
  const confColor = zPredConfidence === 'high' ? '#4ade80' : zPredConfidence === 'medium' ? '#fbbf24' : '#94a3b8';
  const confBg    = zPredConfidence === 'high' ? 'rgba(74,222,128,0.05)' : 'rgba(251,191,36,0.04)';
  const confEdge  = zPredConfidence === 'high' ? 'rgba(74,222,128,0.18)' : 'rgba(251,191,36,0.16)';
  const confLabel = zVoteMax === 3 ? '3/3 agree' : isSingle ? '2/3 tiebreak' : '2/3 coinflip';
  const mainDigit = topZDigits[0];
  const altDigit  = topZDigits[1] ?? null;

  return (
    <div style={{
      margin: '4px 16px 8px',
      padding: '8px 12px',
      background: confBg,
      border: `1px solid ${confEdge}`,
      borderRadius: '4px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div>
        <div style={{ fontSize: '8px', color: '#475569', letterSpacing: '0.8px', marginBottom: '3px' }}>
          PREDICTED NEXT · {confLabel}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
          {/* Main prediction — always shown large */}
          <span style={{
            fontSize: '22px', fontWeight: 900, fontFamily: 'monospace',
            color: confColor, letterSpacing: '1px',
          }}>{prefix}{mainDigit}</span>
          {/* Alt prediction — shown smaller with ALT tag */}
          {altDigit && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span style={{ fontSize: '7px', color: '#334155', letterSpacing: '0.5px' }}>ALT</span>
              <span style={{
                fontSize: '14px', fontWeight: 700, fontFamily: 'monospace',
                color: '#475569', letterSpacing: '1px',
              }}>{prefix}{altDigit}</span>
            </div>
          )}
        </div>
      </div>
      {analysis.pairingName && (
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '8px', color: '#334155', marginBottom: '2px' }}>via</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#fbbf24' }}>
            {analysis.pairingName}
          </div>
        </div>
      )}
    </div>
  );
}

// ── One prefix column ─────────────────────────────────────────────────────────
function PrefixColumn({ prefix, analysis, combinedRolls, activePrefix }) {
  const isActive  = prefix === activePrefix;
  const act       = ACT[analysis?.action] ?? ACT.WAIT;
  const hasData   = !!(analysis?.hasData && analysis?.pairing);
  const isEmpty   = (analysis?.freq ?? 0) === 0;

  const prefixRolls = useMemo(() =>
    (combinedRolls ?? []).filter(r => String(r).startsWith(prefix)),
    [combinedRolls, prefix]
  );
  const zDigits = useMemo(() =>
    prefixRolls.map(r => String(r)[2]).filter(Boolean),
    [prefixRolls]
  );

  const targetDigits = analysis?.action === 'FLIP' ? analysis.flipDigits
    : analysis?.action === 'HOLD' ? analysis.currentDigits : null;

  return (
    <div style={{
      border: `1px solid ${isActive ? 'rgba(129,140,248,0.28)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '6px', overflow: 'hidden',
      opacity: isEmpty ? 0.28 : 1,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px',
        background: isActive ? 'rgba(129,140,248,0.06)' : 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: isActive ? '#a5b4fc' : '#64748b' }}>
          {prefix}x
        </span>
        <span style={{ fontSize: '11px', color: '#334155' }}>×{analysis?.freq ?? 0}</span>
        {isActive && (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', padding: '2px 6px', borderRadius: '3px' }}>NOW</span>
        )}
        {hasData && targetDigits && (
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px',
            color: act.color, padding: '2px 8px',
            background: act.dim, border: `1px solid ${act.edge}`, borderRadius: '3px',
          }}>{act.label} {targetDigits.join('')}</span>
        )}
        {!hasData && !isEmpty && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#1e293b' }}>building…</span>
        )}
      </div>

      {/* Frequency rank */}
      <FreqRank prefix={prefix} zDigits={zDigits} />

      {/* Z-vote prediction */}
      <ZVoteBadge prefix={prefix} analysis={analysis} />

      {/* Section label */}
      <div style={{ margin: '0 16px', height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ padding: '7px 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#1e293b', letterSpacing: '0.8px' }}>PAIRING ANALYSIS</span>
          <span style={{ fontSize: '8px', color: '#1e293b' }}>— 3 hypotheses tested</span>
        </div>
        <div style={{ fontSize: '8px', color: '#1e293b', marginTop: '2px' }}>
          ★ = strongest pattern this session · → = next predicted side · focus on ★ column
        </div>
      </div>

      {/* Pairing table */}
      <PairingPatternTable
        analysis={analysis}
        prefixRolls={prefixRolls}
        zDigits={zDigits}
      />

      {/* Footer */}
      {hasData && (
        <div style={{
          padding: '7px 16px', marginTop: 'auto',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px', color: '#334155', display: 'flex', gap: '6px', flexWrap: 'wrap',
        }}>
          <span style={{ color: '#fbbf24' }}>★ {analysis.pairingName}</span>
          <span>N={analysis.dominantN}</span>
          <span style={{ color: '#475569', marginLeft: 'auto' }}>
            {Math.round((analysis.confidence ?? 0) * 100)}% conf
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PrefixWavePanel({ prefixWaveData, combinedRolls, activePrefix }) {
  if (!prefixWaveData) return null;

  const active      = activePrefix ? prefixWaveData.analyses[activePrefix] : null;
  const activeAct   = active ? (ACT[active.action] ?? ACT.WAIT) : null;
  const activeTarget = active?.action === 'FLIP' ? active.flipDigits
    : active?.action === 'HOLD' ? active.currentDigits : null;
  const activeLabel = active?.action === 'FLIP' ? active.flipLabel
    : active?.action === 'HOLD' ? active.currentLabel : null;
  const showBanner  = active?.hasData && activeTarget;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Active signal banner */}
      {showBanner && (
        <div style={{
          background: activeAct.dim, border: `1px solid ${activeAct.edge}`,
          borderRadius: '6px', padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
        }}>

          {/* Block 1: Wave action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '8px', color: '#334155', letterSpacing: '0.8px' }}>WAVE SIGNAL · {activePrefix}x</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', color: activeAct.color,
                padding: '3px 8px', border: `1px solid ${activeAct.edge}`, borderRadius: '3px',
              }}>{activeAct.label}</span>
              {activeLabel && <span style={{ fontSize: '11px', color: '#475569' }}>→ {activeLabel} pair</span>}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Block 2: Full rolls to pick from */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ fontSize: '8px', color: '#334155', letterSpacing: '0.8px' }}>PICK FROM THIS PAIR</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {activeTarget.map((d, i) => (
                <React.Fragment key={d}>
                  {i > 0 && <span style={{ fontSize: '12px', color: '#1e293b' }}>or</span>}
                  <span style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'monospace', color: '#f1f5f9', letterSpacing: '2px' }}>
                    {activePrefix}{d}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Block 3: Best bet (Z-vote) — pushed right */}
          {active?.topZDigits?.length > 0 && active.zVoteMax >= 2 && (
            <>
              <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.06)', marginLeft: 'auto' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '8px', color: '#334155', letterSpacing: '0.8px' }}>
                  BEST BET · {active.zVoteMax === 3 ? '3/3 agree' : active.topZDigits.length === 1 ? '2/3 tiebreak' : '2/3 coinflip'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{
                    fontSize: '26px', fontWeight: 900, fontFamily: 'monospace',
                    color: active.zVoteMax === 3 ? '#4ade80' : '#fbbf24',
                  }}>{activePrefix}{active.topZDigits[0]}</span>
                  {active.topZDigits[1] && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                      <span style={{ fontSize: '7px', color: '#334155' }}>ALT</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#475569' }}>
                        {activePrefix}{active.topZDigits[1]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {!active?.topZDigits?.length && (
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#1e293b' }}>
              {active.pairingName} · N={active.dominantN} · {Math.round((active.confidence ?? 0) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* 4-column grid — full width, equal columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {PREFIXES.map(px => (
          <PrefixColumn
            key={px}
            prefix={px}
            analysis={prefixWaveData.analyses[px]}
            combinedRolls={combinedRolls}
            activePrefix={activePrefix}
          />
        ))}
      </div>

      {/* Commons footer */}
      {prefixWaveData.commonsPrefix?.length > 0 && (
        <div style={{
          display: 'flex', gap: '12px', alignItems: 'center',
          padding: '7px 12px', flexWrap: 'wrap',
          border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px',
        }}>
          <span style={{ fontSize: '10px', color: '#1e293b', letterSpacing: '0.8px' }}>COMMONS</span>
          {prefixWaveData.commonsPrefix.map(px => (
            <span key={px} style={{ fontSize: '11px', fontWeight: 600, color: '#818cf8', fontFamily: 'monospace' }}>
              {px}x <span style={{ color: '#334155', fontWeight: 400 }}>×{prefixWaveData.prefixFreq[px]}</span>
            </span>
          ))}
          {prefixWaveData.noisePrefix?.filter(px => prefixWaveData.prefixFreq[px] > 0).map(px => (
            <span key={px} style={{ fontSize: '11px', color: '#1e293b', fontFamily: 'monospace' }}>
              {px}x ×{prefixWaveData.prefixFreq[px]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
