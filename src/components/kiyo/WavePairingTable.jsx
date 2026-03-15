import React, { useMemo, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { analyze2strWave } from "../../utils/kiyoPrefixWave";

// The 3 unique ways to split {41,42,43,44} into 2 pairs
const PAIRINGS = [
  { key: "41/44",  name: "Outer/Inner", sideAName: "Outer", sideBName: "Inner", sideA: ["41","44"], sideB: ["42","43"] },
  { key: "42/44",  name: "Odd/Even",   sideAName: "Even",  sideBName: "Odd",   sideA: ["42","44"], sideB: ["41","43"] },
  { key: "43/44",  name: "Low/High",   sideAName: "High",  sideBName: "Low",   sideA: ["43","44"], sideB: ["41","42"] },
];
const Y_TO_KEY = { "12": "43/44", "13": "42/44", "14": "41/44" };

function getGroup(twoStr, pairing) {
  if (!twoStr) return null;
  if (pairing.sideA.includes(twoStr)) return "A";
  if (pairing.sideB.includes(twoStr)) return "B";
  return null;
}

// ── GSAP-animated counter hook ──────────────────────────────────────────────
function useCountUp(ref, target, deps) {
  useEffect(() => {
    if (!ref.current || target == null) return;
    const obj = { val: 0 };
    gsap.killTweensOf(obj);
    gsap.fromTo(obj, { val: 0 }, {
      val: target,
      duration: 0.9,
      ease: "power2.out",
      onUpdate() {
        if (ref.current) ref.current.textContent = Math.round(obj.val) + "%";
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── GSAP fade-in-up hook ─────────────────────────────────────────────────────
function useFadeInUp(ref, deps) {
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function WavePairingTable({ pairingViz, combinedRolls }) {
  if (!pairingViz || pairingViz.length === 0) return null;

  const lockedPairingRef = useRef(null);

  // TABLE key → wave pairing name (for tiebreaker hint)
  const TABLE_TO_WAVE = {
    '43/44': 'Low/High',
    '42/44': 'Odd/Even',
    '41/44': 'Outer/Inner',
  };

  // Compute TABLE's preferred pairing BEFORE calling analyze2strWave
  // (no wave2 dependency — avoids circular dep)
  const tablePreferredKey = useMemo(() => {
    const recentRolls = pairingViz
      .map(r => r.roll?.slice(0, 2))
      .filter(r => ['41','42','43','44'].includes(r));
    if (recentRolls.length < 3) return null;
    const colStats = PAIRINGS.map(p => {
      const sides = recentRolls.map(r =>
        p.sideA.includes(r) ? 'A' : p.sideB.includes(r) ? 'B' : null
      );
      const firstValid = sides.find(s => s !== null);
      let streakLen = 0;
      if (firstValid) {
        for (const s of sides) {
          if (s === firstValid) streakLen++;
          else if (s !== null) break;
        }
      }
      const total = recentRolls.length;
      const aCount = recentRolls.filter(r => p.sideA.includes(r)).length;
      const domPct = total > 0 ? Math.round(Math.max(aCount, total - aCount) / total * 100) : 0;
      return { key: p.key, streakLen, domPct };
    });
    const withStreak = colStats
      .filter(s => s.streakLen >= 4)
      .sort((a, b) => b.streakLen - a.streakLen || b.domPct - a.domPct);
    const bestByDom = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];
    return (withStreak[0] ?? bestByDom)?.key ?? null;
  }, [pairingViz]);

  const wave2 = useMemo(() =>
    analyze2strWave(
      (combinedRolls || [...pairingViz].reverse().map(r => r.row?.roll || r.roll)).filter(Boolean),
      lockedPairingRef.current,
      tablePreferredKey ? TABLE_TO_WAVE[tablePreferredKey] : null   // ← TABLE hint
    ),
    [combinedRolls, pairingViz, tablePreferredKey]
  );

  useEffect(() => {
    if (wave2 && wave2.pairingConfidence >= 0.55 && !wave2.isAmbiguous) {
      lockedPairingRef.current = wave2.pairing.name;
    }
  }, [wave2]);

  const { activePairingKey, tableStreakInfo } = useMemo(() => {
    const recentRolls = pairingViz
      .map(r => r.roll?.slice(0, 2))
      .filter(r => ["41","42","43","44"].includes(r));

    const waveKey = wave2?.pairing
      ? (Y_TO_KEY[[...wave2.pairing.pairA].sort().join("")] ?? null)
      : null;

    if (recentRolls.length < 3) {
      return { activePairingKey: waveKey, tableStreakInfo: null };
    }

    const colStats = PAIRINGS.map(p => {
      let aCount = 0, bCount = 0;
      recentRolls.forEach(r => {
        if (p.sideA.includes(r)) aCount++;
        else if (p.sideB.includes(r)) bCount++;
      });
      const total = aCount + bCount;
      const domPct = total > 0 ? Math.round(Math.max(aCount, bCount) / total * 100) : 0;

      const sides = recentRolls.map(r =>
        p.sideA.includes(r) ? 'A' : p.sideB.includes(r) ? 'B' : null
      );
      const firstValid = sides.find(s => s !== null);
      let streakLen = 0;
      if (firstValid) {
        for (const s of sides) {
          if (s === firstValid) streakLen++;
          else if (s !== null) break;
        }
      }
      const streakSide = firstValid;
      const streakRolls = streakSide === 'A' ? p.sideA : p.sideB;
      const streakLabel = streakSide === 'A'
        ? p.sideA.join(' & ') : p.sideB.join(' & ');

      // Identify the pairing name for streakSide
      const activePairing = PAIRINGS.find(x => x.key === p.key);
      const streakSideName = streakSide === 'A'
        ? activePairing?.sideAName
        : activePairing?.sideBName;

      return { key: p.key, domPct, streakLen, streakSide, streakRolls, streakLabel, streakSideName, total };
    });

    const withStreak = colStats
      .filter(s => s.streakLen >= 4)
      .sort((a, b) => b.streakLen - a.streakLen || b.domPct - a.domPct);

    const bestByStreak = withStreak[0] ?? null;
    const bestByDom    = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];
    const chosenStat   = bestByStreak ?? bestByDom;
    const activeKey    = chosenStat?.key ?? waveKey;

    return { activePairingKey: activeKey, tableStreakInfo: chosenStat };
  }, [pairingViz, wave2]);

  const rows = useMemo(() => {
    const result = [];
    let chunk = [];

    pairingViz.forEach((row, idx) => {
      const twoStr = row.roll?.slice(0, 2);
      const valid = ["41","42","43","44"].includes(twoStr);
      const prevWin = pairingViz[idx - 1]?.windowStartMs;
      const currWin = row?.windowStartMs;
      const windowsPassed = idx > 0 && currWin && prevWin && prevWin > currWin
        ? Math.floor((prevWin - currWin) / (5 * 60 * 1000)) : 0;

      if (idx > 0 && windowsPassed > 0) {
        if (chunk.length > 0) { result.push({ type: "freq", rolls: chunk }); chunk = []; }
        result.push({ type: "sep", windows: windowsPassed });
      }

      result.push({ type: "roll", row, twoStr: valid ? twoStr : null });
      if (valid) chunk.push(twoStr);
    });

    if (chunk.length > 0) result.push({ type: "freq", rolls: chunk });
    return result;
  }, [pairingViz]);

  // ── Refs for GSAP ─────────────────────────────────────────────────────────
  const waveCardRef  = useRef(null);
  const tableCardRef = useRef(null);
  const followRef    = useRef(null);
  const tablePctRef  = useRef(null);

  // Animate cards in on mount / when wave2 changes
  useFadeInUp(waveCardRef,  [wave2?.action]);
  useFadeInUp(tableCardRef, [tableStreakInfo?.domPct]);
  useFadeInUp(followRef,    [tableStreakInfo?.domPct, wave2?.action]);

  // Animate the TABLE % counter
  useCountUp(tablePctRef, tableStreakInfo?.domPct ?? 0, [tableStreakInfo?.domPct]);

  // ── Derived FOLLOW data ────────────────────────────────────────────────────
  const followData = useMemo(() => {
    const t = tableStreakInfo;
    if (!t || t.domPct < 50) return null;
    const wavePct = wave2
      ? (wave2.action === 'DOMINANT' ? wave2.dominantPct
       : wave2.action === 'FLIP' || wave2.action === 'HOLD'
         ? Math.round((wave2.confidence || 0.5) * 100) : 0)
      : 0;
    const tableHasStreak = t.streakLen >= 5;
    const tableHighDom   = t.domPct >= 65;
    const tableWins = tableHasStreak || (tableHighDom && t.domPct >= wavePct - 5) || t.domPct >= wavePct;
    const followRolls = tableWins
      ? (t.streakRolls ?? t.domRolls)
      : (wave2?.betRolls || wave2?.flipPrefixes || wave2?.currentPrefixes);
    const followPct  = tableWins ? t.domPct : wavePct;
    const followSrc  = tableWins ? (t.streakLen >= 5 ? `Table ×${t.streakLen}` : 'Table') : 'Wave';
    const followLabel = tableWins ? (t.streakLabel ?? t.domLabel) : null;
    if (!followRolls) return null;
    return { followRolls, followPct, followSrc, followLabel };
  }, [tableStreakInfo, wave2]);

  // ── Suspect-TABLE warning: pairing shows ≥90% but one side never appeared ─
  const suspectWarning = useMemo(() => {
    const t = tableStreakInfo;
    if (!t || t.domPct < 90) return null;
    const pairing = PAIRINGS.find(p => p.key === activePairingKey);
    if (!pairing) return null;
    const recentRolls = pairingViz
      .map(r => r.roll?.slice(0, 2))
      .filter(r => ['41','42','43','44'].includes(r));
    const sideACount = recentRolls.filter(r => pairing.sideA.includes(r)).length;
    const sideBCount = recentRolls.filter(r => pairing.sideB.includes(r)).length;
    // Only warn when one side has ZERO appearances
    if (sideACount > 0 && sideBCount > 0) return null;
    const missingRolls = sideACount === 0 ? pairing.sideA : pairing.sideB;
    const missingName  = sideACount === 0 ? pairing.sideAName : pairing.sideBName;
    const waveKey      = wave2?.pairing
      ? (Y_TO_KEY[[...wave2.pairing.pairA].sort().join('')]  ?? null)
      : null;
    // Warn only when wave disagrees (or when we simply have a missing side)
    return {
      pairingKey:   pairing.key,
      pairingName:  pairing.name,
      missingRolls: missingRolls.join(' & '),
      missingName,
      waveKey,
      wavePairingName: wave2?.pairingName ?? null,
      rollCount: recentRolls.length,
    };
  }, [tableStreakInfo, activePairingKey, pairingViz, wave2]);

  // ── Active pairing info for TABLE card display ────────────────────────────
  const activePairingInfo = useMemo(() =>
    PAIRINGS.find(p => p.key === activePairingKey) ?? null
  , [activePairingKey]);

  return (
    <div className="wave-pairing-table bg-slate-950/80 rounded-lg p-4 border border-slate-700/50 space-y-3">

      {/* ── How to use ───────────────────────────────────────────── */}
      <div className="text-[12px] bg-slate-900/60 rounded p-2.5 border border-slate-700/40 space-y-1">
        <div className="text-indigo-300 font-semibold">📖 How to use:</div>
        <div className="text-slate-400 leading-relaxed">
          Each column is one possible 2-str pairing. <span className="text-emerald-300 font-bold">Green</span> = top pair side, <span className="text-amber-300 font-bold">Amber</span> = bottom pair side.<br/>
          Find the column where the <strong className="text-white">colors hold the longest runs</strong> — that's your active pairing.<br/>
          Once found, <span className="text-yellow-400 font-bold">★ auto-detection</span> marks it. The Wave card looks at <span className="text-teal-300 font-bold">the whole session</span> to predict HOLD or FLIP.
        </div>
      </div>

      {/* ── Dual Signal Cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* ── WAVE CARD ─────────────────────────────────────────── */}
        {wave2 && (() => {
          const w = wave2;
          const isDom  = w.action === 'DOMINANT';
          const isFlip = w.action === 'FLIP';
          const isHold = w.action === 'HOLD';
          const isWait = !isDom && !isFlip && !isHold;
          const actionColor = isDom ? '#34d399' : isFlip ? '#f59e0b' : isHold ? '#6ee7b7' : '#64748b';
          const borderColor = isDom ? 'rgba(52,211,153,0.45)' : isFlip ? 'rgba(245,158,11,0.50)' : isHold && w.pairingConfidence >= 0.6 ? 'rgba(52,211,153,0.30)' : 'rgba(99,102,241,0.25)';
          const betPrefixes = isDom ? w.dominantPrefixes : isFlip ? w.flipPrefixes : w.currentPrefixes;
          const betLabel    = isDom ? `${w.dominantLabel} (${w.dominantPct}%)` : isFlip ? w.flipLabel : w.currentLabel;
          const actionTag   = isDom ? 'DOM' : isFlip ? 'FLIP' : 'HOLD';
          const modeMap = {
            DOMINANT:    { bg:'#064e3b', border:'#34d399', color:'#6ee7b7', label:'🏆 DOMINANT' },
            'RUN-N2':    { bg:'#1e3a5f', border:'#60a5fa', color:'#93c5fd', label:'🔄 RUN · N=2' },
            'RUN-N3':    { bg:'#1e3a5f', border:'#818cf8', color:'#a78bfa', label:'🔄 RUN · N=3' },
            'RUN-N4':    { bg:'#1e3a5f', border:'#818cf8', color:'#a78bfa', label:'🔄 RUN · N=4' },
            ALTERNATING: { bg:'#422006', border:'#f59e0b', color:'#fcd34d', label:'〰️ ALTERNATING' },
            AMBIGUOUS:   { bg:'#3b1f6e', border:'#c084fc', color:'#e879f9', label:'⚡ AMBIGUOUS' },
            CHAOTIC:     { bg:'#450a0a', border:'#f87171', color:'#fca5a5', label:'⚠️ CHAOTIC' },
            BUILDING:    { bg:'#1c1917', border:'#78716c', color:'#a8a29e', label:'⏳ BUILDING' },
          };
          const modeCfg = modeMap[w.sessionMode] ?? null;
          return (
            <div ref={waveCardRef} style={{ border: `2px solid ${borderColor}`, borderRadius: '14px', overflow: 'hidden', background: 'rgba(10,15,30,0.90)', opacity: 0 }}>
              {/* Header */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#818cf8' }}>🌊 WAVE</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#a78bfa' }}>{w.pairingName}</span>
                  {w.pairingConfidence >= 0.6 && (
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 8px #fbbf24' }}>★</span>
                  )}
                  {modeCfg && (
                    <span style={{ fontSize: '8px', fontWeight: 800, padding: '2px 6px', background: modeCfg.bg, border: `1px solid ${modeCfg.border}`, color: modeCfg.color, borderRadius: '5px', whiteSpace: 'nowrap' }}>
                      {modeCfg.label}
                    </span>
                  )}
                </div>
                {/* Y-sequence dots */}
                {w.states && w.states.length > 0 && w.pairing && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {w.states.slice(-12).map((s, i) => {
                      const isA = s === 'A';
                      const isLast = i === Math.min(w.states.length, 12) - 1;
                      return (
                        <span key={i} style={{
                          fontSize: '7px', fontWeight: 700, width: '14px', height: '14px', flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '3px',
                          background: isA ? 'rgba(99,102,241,0.22)' : 'rgba(245,158,11,0.18)',
                          color: isA ? '#818cf8' : '#f59e0b',
                          outline: isLast ? `2px solid ${isA ? '#818cf8' : '#f59e0b'}` : 'none',
                          outlineOffset: '1px',
                        }}>
                          {isA ? w.pairing.pairALabel[0] : w.pairing.pairBLabel[0]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: '10px 14px' }}>
                {/* "whole session" subtitle */}
                <div style={{ fontSize: '9px', color: '#334155', fontWeight: 600, letterSpacing: '1px', marginBottom: '2px', textTransform: 'uppercase' }}>
                  Whole session · {w.count ?? 0} rolls
                </div>
                <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '5px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Next — Expect</div>
                {isWait ? (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>⚠️ {w.message}</div>
                ) : (
                  <>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: actionColor, letterSpacing: '3px', lineHeight: 1 }}>
                      {(betPrefixes || []).join(' / ')}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: isDom ? '#34d399' : isFlip ? '#f59e0b' : '#6ee7b7' }}>{actionTag}</span>
                      <span style={{ fontSize: '14px', color: isDom ? '#6ee7b7' : isFlip ? '#fcd34d' : '#94a3b8' }}>· {betLabel}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>
                      run {w.runLength}/{w.dominantN} · {Math.round(w.confidence * 100)}% conf
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── TABLE CARD ────────────────────────────────────────── */}
        {(() => {
          const t = tableStreakInfo;
          if (!t || t.domPct < 50) return <div />;
          const isStreak = t.streakLen >= 4;
          const borderClr = isStreak ? 'rgba(245,158,11,0.50)' : 'rgba(20,184,166,0.35)';
          const pctColor  = isStreak ? '#f59e0b' : '#5eead4';
          const pairing   = PAIRINGS.find(p => p.key === activePairingKey);
          return (
            <div ref={tableCardRef} style={{ border: `2px solid ${borderClr}`, borderRadius: '14px', overflow: 'hidden', background: 'rgba(10,15,30,0.90)', opacity: 0 }}>
              {/* Header */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>📊 TABLE</span>
                {isStreak && (
                  <span style={{ fontSize: '8px', fontWeight: 800, padding: '2px 7px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.40)', color: '#fcd34d', borderRadius: '5px' }}>
                    ×{t.streakLen} STREAK 🔥
                  </span>
                )}
                {/* Active pairing key + name in header */}
                {pairing && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                    <span style={{ color: '#818cf8' }}>{pairing.key}</span>
                    {' '}
                    <span style={{ color: '#475569' }}>{pairing.name}</span>
                  </span>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '5px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Recent Rolls</div>
                {/* Big % counter */}
                <div ref={tablePctRef} style={{ fontSize: '36px', fontWeight: 900, color: pctColor, lineHeight: 1 }}>
                  0%
                </div>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Streak label */}
                  <span style={{ fontSize: '15px', fontWeight: 700, color: pctColor }}>
                    {isStreak ? `×${t.streakLen} streak` : 'dom%'}
                  </span>
                  {/* Rolls label */}
                  <span style={{ fontSize: '15px', color: '#e2e8f0', fontWeight: 600 }}>
                    {isStreak ? t.streakLabel : t.domLabel ?? ''}
                  </span>
                </div>
                {/* Pairing breakdown  42/44 even side / odd side */}
                {pairing && (
                  <div style={{ marginTop: '5px', fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span><span style={{ color: '#34d399' }}>●</span> {pairing.sideA.join(' & ')} <span style={{ color: '#475569' }}>({pairing.sideAName})</span></span>
                    <span><span style={{ color: '#f59e0b' }}>●</span> {pairing.sideB.join(' & ')} <span style={{ color: '#475569' }}>({pairing.sideBName})</span></span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── FOLLOW banner ─────────────────────────────────────────── */}
      {followData && (() => {
        const { followRolls, followPct, followSrc, followLabel } = followData;
        return (
          <div ref={followRef} style={{
            background: 'linear-gradient(135deg, rgba(20,184,166,0.14), rgba(99,102,241,0.08))',
            border: '1.5px solid rgba(20,184,166,0.50)',
            borderRadius: '12px', padding: '12px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap',
            textAlign: 'center',
            opacity: 0,
          }}>
            {/* Left: source / confidence */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '70px' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>📍 Follow</span>
              <span style={{ fontSize: '12px', color: '#475569', marginTop: '1px' }}>{followSrc}</span>
            </div>

            {/* Center: the rolls */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '30px', fontWeight: 900, color: '#34d399', letterSpacing: '3px', lineHeight: 1 }}>
                {Array.isArray(followRolls) ? followRolls.join(' or ') : followRolls}
              </span>
              {followLabel && (
                <span style={{ fontSize: '11px', color: '#5eead4', marginTop: '2px' }}>({followLabel})</span>
              )}
            </div>

            {/* Right: pct */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '70px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: followPct >= 70 ? '#34d399' : '#94a3b8' }}>{followPct}%</span>
              <span style={{ fontSize: '10px', color: '#475569' }}>dom</span>
            </div>
          </div>
        );
      })()}

      {/* ── Suspect-TABLE warning ────────────────────────────────── */}
      {suspectWarning && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1.5px solid rgba(245,158,11,0.45)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px' }}>⚠️</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fcd34d' }}>
              TABLE {suspectWarning.pairingKey} looks {suspectWarning.domPct ?? '100'}% but
              {' '}<span style={{ color: '#f59e0b' }}>{suspectWarning.missingRolls} ({suspectWarning.missingName})</span>
              {' '}never appeared yet
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>
            In a short session of {suspectWarning.rollCount} rolls, 100% on one side can simply mean
            the {suspectWarning.missingRolls} rolls haven't shown up yet — not that the pairing is locked.
            {suspectWarning.waveKey && suspectWarning.waveKey !== activePairingKey
              ? <span style={{ color: '#818cf8', fontWeight: 600 }}>
                  {' '}Wave detected <strong>{suspectWarning.wavePairingName}</strong> instead ({suspectWarning.waveKey}) — if {suspectWarning.missingRolls} appears next, switch focus to the Wave column.
                </span>
              : <span> Watch for the first {suspectWarning.missingRolls} roll — if it appears, the streak is noise.</span>
            }
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            💡 Rule of thumb: wait for at least <strong style={{ color: '#fcd34d' }}>8–10 rolls</strong> or a <strong style={{ color: '#fcd34d' }}>×4+ streak</strong> with both sides visible before fully trusting TABLE.
          </div>
        </div>
      )}

      {/* ── Pairing legend cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {PAIRINGS.map(p => {
          const isActive = activePairingKey === p.key;
          return (
            <div key={p.key} className={`rounded px-2.5 py-1.5 border ${
              isActive ? "bg-indigo-900/25 border-indigo-500/50" : "bg-slate-900/50 border-slate-700/40"}`}>
              <div className={`font-bold text-[12px] mb-0.5 flex items-center gap-1 ${
                isActive ? "text-indigo-300" : "text-slate-300"}`}>
                {isActive && <span className="text-yellow-400 text-[15px] font-black" style={{ textShadow: '0 0 6px #fbbf24' }}>★</span>}
                {p.key}
              </div>
              <div className={`text-[9px] mb-1 font-semibold tracking-wide ${
                isActive ? "text-indigo-400" : "text-slate-500"}`}>
                {p.name}
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-emerald-300 font-semibold">{p.sideA.join(" & ")}</span>
                  <span className="text-slate-500 ml-1">({p.sideAName})</span>
                </div>
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  <span className="text-amber-300 font-semibold">{p.sideB.join(" & ")}</span>
                  <span className="text-slate-500 ml-1">({p.sideBName})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Roll Table ───────────────────────────────────────────── */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-900/80 sticky top-0 z-10">
            <tr>
              <th className="py-1.5 px-3 text-left text-slate-400 font-semibold border border-slate-700/50 w-16">Roll</th>
              {PAIRINGS.map(p => (
                <th key={p.key} className={`py-1.5 px-3 text-center border border-slate-700/50 ${
                  activePairingKey === p.key ? "text-indigo-300" : "text-slate-300"}`}>
                  <div className="font-bold text-[11px] flex items-center justify-center gap-1">
                    {activePairingKey === p.key && (
                      <span className="text-yellow-400 text-[14px] font-black" style={{ textShadow: '0 0 6px #fbbf24' }}>★</span>
                    )}
                    {p.key}
                  </div>
                  <div className={`text-[9px] font-semibold ${
                    activePairingKey === p.key ? "text-violet-300" : "text-slate-500"}`}>
                    {p.name}
                  </div>
                  <div className="text-[8px] text-slate-600 mt-0.5">
                    🟢{p.sideAName} vs 🟡{p.sideBName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => {
              if (item.type === "sep") {
                const label = item.windows === 1 ? "◄ 5-MIN WINDOW ►" : `◄ ${item.windows * 5} min gap ►`;
                return (
                  <tr key={`sep-${i}`}>
                    <td colSpan={4} className="p-0">
                      <div className="flex items-center gap-2 px-3 py-1 bg-cyan-900/30 border-y border-cyan-500/40">
                        <div className="h-px flex-1 bg-cyan-400/40" />
                        <div className="text-[10px] font-bold text-cyan-200">{label}</div>
                        <div className="h-px flex-1 bg-cyan-400/40" />
                      </div>
                    </td>
                  </tr>
                );
              }

              if (item.type === "freq") {
                const total = item.rolls.length;
                return (
                  <tr key={`freq-${i}`} className="bg-teal-900/20 border-y border-teal-700/40">
                    <td className="py-1 px-3 text-[10px] text-teal-400 font-semibold border border-slate-700/30">
                      {total} rolls
                    </td>
                    {PAIRINGS.map(p => {
                      const pA = item.rolls.filter(r => p.sideA.includes(r)).length;
                      const pB = item.rolls.filter(r => p.sideB.includes(r)).length;
                      const pctA = total > 0 ? Math.round(pA / total * 100) : 0;
                      const pctB = total > 0 ? Math.round(pB / total * 100) : 0;
                      const isActive = activePairingKey === p.key;
                      return (
                        <td key={p.key} className={`py-1 px-3 text-center text-[10px] border border-slate-700/30 ${isActive ? "border-indigo-500/30" : ""}`}>
                          <span className="text-emerald-300 font-bold">{pctA}%</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-amber-300 font-bold">{pctB}%</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              const { row, twoStr } = item;
              return (
                <tr key={`roll-${i}`} className="hover:bg-slate-800/15">
                  <td className="py-1.5 px-3 font-mono text-[10px] text-slate-400 border border-slate-700/25">{row.roll}</td>
                  {PAIRINGS.map(p => {
                    const grp = getGroup(twoStr, p);
                    const isActive = activePairingKey === p.key;
                    return (
                      <td key={p.key} className={`py-1.5 px-3 text-center font-bold text-[11px] border ${
                        isActive ? "border-indigo-500/30" : "border-slate-700/25"
                      } ${grp === "A" ? "bg-emerald-900/35 text-emerald-300"
                        : grp === "B" ? "bg-amber-900/35 text-amber-300"
                        : "text-slate-600"}`}>
                        {twoStr ?? "—"}
                      </td>
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
