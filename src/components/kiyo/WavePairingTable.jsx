import React from "react";

const WAVE_SCHEMES = {
  col1: {
    name: "Column 1",
    label: "Odds/Evens",
    pairA: ["1", "3"],
    pairB: ["2", "4"],
    pairALabel: "Odds",
    pairBLabel: "Evens",
    pairAFull: "Odds (1/3)",
    pairBFull: "Evens (2/4)",
  },
  col2: {
    name: "Column 2",
    label: "Outer/Inner",
    pairA: ["1", "4"],
    pairB: ["2", "3"],
    pairALabel: "Outer",
    pairBLabel: "Inner",
    pairAFull: "Outer (1/4)",
    pairBFull: "Inner (2/3)",
  },
  col3: {
    name: "Column 3",
    label: "Low/High",
    pairA: ["1", "2"],
    pairB: ["3", "4"],
    pairALabel: "Low",
    pairBLabel: "High",
    pairAFull: "Low (1/2)",
    pairBFull: "High (3/4)",
  },
};

export default function WavePairingTable({ pairingViz, splitIndex = null }) {
  if (!pairingViz) return null;
  const to4xx = (roll) => {
    const s = String(roll ?? "").trim();
    if (s.length !== 3) return null;
    const shift = (ch) => {
      const n = Number(ch);
      if (!Number.isFinite(n)) return ch;
      return String((n % 4) + 1); // 1->2,2->3,3->4,4->1
    };
    return shift(s[0]) + shift(s[1]) + shift(s[2]);
  };

  return (
    <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-700/50">
      <div className="text-xs text-emerald-300 font-semibold mb-3">
        🎨 Wave Pairing Pattern (Last {pairingViz?.length || 0} rolls)
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-[12px]">
        {Object.entries(WAVE_SCHEMES).map(([key, scheme]) => (
          <div
            key={key}
            className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/50"
          >
            <div className="text-slate-400 font-semibold mb-1">
              {scheme.name}: {scheme.label}
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                <span className="text-emerald-300">{scheme.pairAFull}</span>
              </div>
              <div>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                <span className="text-amber-300">{scheme.pairBFull}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-900/60 sticky top-0">
            <tr>
              <th className="py-2 px-3 text-left text-slate-400 font-semibold border border-slate-700/50">
                Roll
              </th>
              <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                Odds/Evens
              </th>
              <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                Outer/Inner
              </th>
              <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                Low/High
              </th>
            </tr>
          </thead>
          <tbody>
            {pairingViz?.flatMap((row, idx) => {
              const currWin = row?.windowStartMs;
              const prevWin = pairingViz[idx - 1]?.windowStartMs;
              const currTs = row?.ts || 0;
              const prevTs = pairingViz[idx - 1]?.ts || 0;
              const rows = [];

              // Since table is newest-first, prevWin is actually NEWER than currWin
              // Separator should show when we go BACK in time to an older window
              // So check if prevWin > currWin (crossing boundary going backwards)
              const windowsPassed = currWin && prevWin && prevWin > currWin
                ? Math.floor((prevWin - currWin) / (5 * 60 * 1000))
                : 0;
              
              // Insert separator(s) for each 5-minute window boundary that passed
              if (idx > 0 && windowsPassed > 0) {
                
                // If multiple windows passed (e.g., 10+ minutes gap), show how many
                const label = windowsPassed === 1 
                  ? "◄ 5-MIN WINDOW BOUNDARY ►"
                  : `◄ ${windowsPassed} WINDOW BOUNDARIES (${windowsPassed * 5} min gap) ►`;
                
                rows.push(
                  <tr key={`window-sep-${idx}`}>
                    <td colSpan={4} className="p-0">
                      <div className="flex items-center gap-3 px-3 py-2 bg-cyan-900/30 border-y-2 border-cyan-500/60">
                        <div className="h-[2px] flex-1 bg-cyan-400/60" />
                        <div className="text-xs font-bold text-cyan-100 tracking-wide">
                          {label}
                        </div>
                        <div className="h-[2px] flex-1 bg-cyan-400/60" />
                      </div>
                    </td>
                  </tr>
                );
              }

              rows.push(
                <tr key={idx} className="hover:bg-slate-800/20">
                  <td className="py-2 px-3 text-slate-300 font-mono font-bold border border-slate-700/30">
                    {row.roll}
                  </td>
                  <td
                    className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                      row?.col1?.isA
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {row?.col1?.label ?? "—"} ({row.roll})
                  </td>
                  <td
                    className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                      row.col2.isA
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {row.col2.label} ({row.roll})
                  </td>
                  <td
                    className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                      row.col3.isA
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {row.col3.label} ({row.roll})
                  </td>
                </tr>
              );

              return rows;
            }) || (
              <tr>
                <td colSpan="4" className="py-4 text-center text-slate-500">
                  No data yet - add at least 4 rolls
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[12px] text-slate-400 bg-slate-900/40 rounded p-2 border border-slate-700/30">
        <span className="text-emerald-300 font-semibold">📖 How to Read:</span>{" "}
        Look for long runs of the same color (3+ consecutive) - that column is
        "due to flip" to the opposite. Rhythm patterns like E-E-E-E-O-E show
        strong even dominance with potential flip coming.
      </div>
    </div>
  );
}
