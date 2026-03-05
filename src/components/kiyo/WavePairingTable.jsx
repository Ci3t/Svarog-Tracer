import React, { useMemo } from "react";
import { analyze2strWave } from "../../utils/kiyoPrefixWave";

// The 3 unique ways to split {41,42,43,44} into 2 pairs
const PAIRINGS = [
  { key: "41/44",  sideA: ["41","44"], sideB: ["42","43"] },
  { key: "42/44",  sideA: ["42","44"], sideB: ["41","43"] },
  { key: "43/44",  sideA: ["43","44"], sideB: ["41","42"] },
];
// Maps analyze2strWave pairA Y-digits to the WavePairingTable column key:
// Z_PAIRINGS pairA always contains '1':
//   Low/High   pairA=['1','2'] → sideB of '43/44' (41&42 vs 43&44) → key '43/44'
//   Odd/Even   pairA=['1','3'] → sideB of '42/44' (41&43 vs 42&44) → key '42/44'
//   Outer/Inner pairA=['1','4'] → sideA of '41/44' (41&44 vs 42&43) → key '41/44'
const Y_TO_KEY = { "12": "43/44", "13": "42/44", "14": "41/44" };

function getGroup(twoStr, pairing) {
  if (!twoStr) return null;
  if (pairing.sideA.includes(twoStr)) return "A";
  if (pairing.sideB.includes(twoStr)) return "B";
  return null;
}

export default function WavePairingTable({ pairingViz, combinedRolls }) {
  if (!pairingViz || pairingViz.length === 0) return null;

  // Use ALL combinedRolls for wave analysis (same source as the 2-String Wave card)
  // NOT pairingViz which is only the last 12 rolls
  const wave2 = useMemo(() =>
    analyze2strWave(
      (combinedRolls || [...pairingViz].reverse().map(r => r.row?.roll || r.roll)).filter(Boolean)
    ),
    [combinedRolls, pairingViz]
  );

  // activePairingKey — driven by TABLE's own raw-dominance count (highest %-side column)
  // This makes ★ follow what you can literally SEE in the row colors
  const { activePairingKey, waveAlignedKey } = useMemo(() => {
    const recentRolls = pairingViz
      .map(r => r.roll?.slice(0, 2))
      .filter(r => ["41","42","43","44"].includes(r));

    if (recentRolls.length < 3) {
      // Fallback: use wave's pick
      const waveKey = wave2?.pairing
        ? (Y_TO_KEY[[...wave2.pairing.pairA].sort().join("")] ?? null)
        : null;
      return { activePairingKey: waveKey, waveAlignedKey: waveKey };
    }

    // For each pairing column, count which side dominates
    const colStats = PAIRINGS.map(p => {
      let aCount = 0, bCount = 0;
      recentRolls.forEach(r => {
        if (p.sideA.includes(r)) aCount++;
        else if (p.sideB.includes(r)) bCount++;
      });
      const total = aCount + bCount;
      const domPct = Math.round(Math.max(aCount, bCount) / total * 100);
      return { key: p.key, domPct };
    });

    // ★ = column with the most lopsided distribution
    const best = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];

    // waveAlignedKey = what the wave algorithm picked (for ⚠️ warning)
    const waveKey = wave2?.pairing
      ? (Y_TO_KEY[[...wave2.pairing.pairA].sort().join("")] ?? null)
      : null;

    return { activePairingKey: best?.key ?? waveKey, waveAlignedKey: waveKey };
  }, [pairingViz, wave2]);

  // Build rows: roll | window separator + chunk freq summary
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

  return (
    <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-700/50 space-y-3">

      {/* ── Unified Signal Block ─────────────────────────────────── */}
      {(() => {
        // Table-native signal: which column is most lopsided
        const recentRolls = pairingViz
          .map(r => r.roll?.slice(0, 2))
          .filter(r => ["41","42","43","44"].includes(r));

        const colStats = PAIRINGS.map(p => {
          let aCount = 0, bCount = 0;
          recentRolls.forEach(r => {
            if (p.sideA.includes(r)) aCount++;
            else if (p.sideB.includes(r)) bCount++;
          });
          const total = aCount + bCount;
          const domSide = aCount >= bCount ? 'A' : 'B';
          const domPct = total > 0 ? Math.round(Math.max(aCount, bCount) / total * 100) : 0;
          const domRolls = domSide === 'A' ? p.sideA : p.sideB;
          const domLabel = domSide === 'A' ? p.sideA.join('+') : p.sideB.join('+');
          return { key: p.key, domSide, domPct, domRolls, domLabel, total };
        });
        const tableBest = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];

        // Wave signal
        const wavePct = wave2
          ? (wave2.action === 'DOMINANT' ? wave2.dominantPct
           : wave2.action === 'FLIP' || wave2.action === 'HOLD' ? Math.round((wave2.confidence || 0.5) * 100)
           : 0)
          : 0;
        const waveLabel = wave2?.action === 'DOMINANT' ? `🏆 DOM ${wave2.dominantLabel}`
          : wave2?.action === 'FLIP' ? `🎯 FLIP→${wave2.flipLabel}`
          : wave2?.action === 'HOLD' ? `📊 HOLD ${wave2.currentLabel}`
          : wave2?.action || '⏳';
        const waveBet = wave2?.betRolls;

        // Who wins? Higher % = brighter, lower = dimmed
        const tableWins = (tableBest?.domPct || 0) >= wavePct;
        const followRolls = tableWins ? tableBest?.domRolls : waveBet;
        const followPct = tableWins ? tableBest?.domPct : wavePct;
        const hasTableSignal = tableBest && tableBest.domPct >= 55;
        const hasWaveSignal = wave2 && wavePct >= 50;

        return (
          <div className="rounded-lg border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-700/40">
              <span className="text-[11px] text-emerald-300 font-semibold">
                🌊 2-String Wave Groups ({pairingViz.length} rolls)
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                ★ {activePairingKey || '…'}
              </span>
            </div>

            {/* Two signals side by side */}
            <div className="grid grid-cols-2 divide-x divide-slate-700/40">
              {/* Wave signal */}
              <div className={`p-2.5 transition-all ${
                hasWaveSignal && !tableWins
                  ? 'bg-cyan-900/25 border-l-2 border-cyan-400'
                  : hasWaveSignal
                  ? 'bg-slate-900/40'
                  : 'bg-slate-900/20 opacity-40'
              }`}>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Wave</div>
                <div className={`text-[12px] font-bold mb-0.5 ${!tableWins ? 'text-cyan-200' : 'text-slate-400'}`}>
                  {wavePct}%
                  <span className="text-[10px] font-normal ml-1">{waveLabel}</span>
                </div>
                <div className={`text-[10px] ${!tableWins ? 'text-white font-semibold' : 'text-slate-500'}`}>
                  {waveBet ? `Bet: ${waveBet.join(' or ')}` : '—'}
                </div>
              </div>

              {/* Table signal */}
              <div className={`p-2.5 transition-all ${
                hasTableSignal && tableWins
                  ? 'bg-teal-900/25 border-l-2 border-teal-400'
                  : hasTableSignal
                  ? 'bg-slate-900/40'
                  : 'bg-slate-900/20 opacity-40'
              }`}>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">
                  Table ({tableBest?.key || '…'})
                </div>
                <div className={`text-[12px] font-bold mb-0.5 ${tableWins ? 'text-teal-200' : 'text-slate-400'}`}>
                  {tableBest?.domPct || 0}%
                  <span className="text-[10px] font-normal ml-1">{tableBest?.domLabel}</span>
                </div>
                <div className={`text-[10px] ${tableWins ? 'text-white font-semibold' : 'text-slate-500'}`}>
                  {tableBest?.domRolls ? `Bet: ${tableBest.domRolls.join(' or ')}` : '—'}
                </div>
              </div>
            </div>

            {/* Follow recommendation */}
            {followRolls && (
              <div className={`px-3 py-2 flex items-center gap-2 border-t border-slate-700/40 ${
                followPct >= 70 ? 'bg-teal-950/60' : 'bg-slate-800/60'
              }`}>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Follow →</span>
                <span className={`text-[14px] font-bold ${followPct >= 70 ? 'text-teal-300' : 'text-indigo-300'}`}>
                  {followRolls.join(' or ')}
                </span>
                <span className="text-[9px] text-slate-500 ml-auto">
                  {tableWins ? 'Table' : 'Wave'} wins · {followPct}%
                </span>
              </div>
            )}
          </div>
        );
      })()}



      {/* How to use */}

      <div className="text-[11px] bg-slate-900/60 rounded p-2.5 border border-slate-700/40 space-y-1">
        <div className="text-indigo-300 font-semibold">📖 How to use:</div>
        <div className="text-slate-400 leading-relaxed">
          Each column is one possible 2-str pairing. <span className="text-emerald-300">Green</span> = top pair side, <span className="text-amber-300">Amber</span> = bottom pair side.<br/>
          Find the column where the <strong>colors hold the longest runs</strong> (e.g. green-green-green-amber-amber) — that's your active pairing.<br/>
          Once found, <span className="text-indigo-300">★ auto-detection</span> marks it. The verdict pill tells you whether to HOLD current side or FLIP to the other.
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        {PAIRINGS.map(p => {
          const isActive = activePairingKey === p.key;
          return (
            <div key={p.key} className={`rounded px-2.5 py-1.5 border ${
              isActive ? "bg-indigo-900/25 border-indigo-500/50" : "bg-slate-900/50 border-slate-700/40"}`}>
              <div className={`font-bold text-[11px] mb-1.5 ${
                isActive ? "text-indigo-300" : "text-slate-300"}`}>
                {isActive && "★ "}{p.key}
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                  <span className="text-emerald-300 font-semibold">{p.sideA.join(" & ")}</span>
                  <span className="text-slate-500 ml-1">(green side)</span>
                </div>
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                  <span className="text-amber-300 font-semibold">{p.sideB.join(" & ")}</span>
                  <span className="text-slate-500 ml-1">(amber side)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-900/80 sticky top-0 z-10">
            <tr>
              <th className="py-1.5 px-3 text-left text-slate-400 font-semibold border border-slate-700/50 w-16">Roll</th>
              {PAIRINGS.map(p => (
                <th key={p.key} className={`py-1.5 px-3 text-center border border-slate-700/50 ${
                  activePairingKey === p.key ? "text-indigo-300" : "text-slate-300"}`}>
                  <div className="font-bold text-[11px]">
                    {activePairingKey === p.key && "★ "}{p.key}
                  </div>
                  <div className="text-[9px] text-slate-600">
                    🟢{p.sideA.join("&")} vs 🟡{p.sideB.join("&")}
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
                const pct = v => total > 0 ? Math.round(item.rolls.filter(r => r === v).length / total * 100) + "%" : "—";
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

              // Roll row
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
