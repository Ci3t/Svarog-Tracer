import React, { useState } from "react";
import { translateTo4 } from "../../utils/stringHelpers";
import { caesarShiftForLine } from "../../utils/caesarUtils";

// Compact Caesar Shift component for sticky header
export default function CompactCaesarShift({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  // Reverse section local state
  const [revInput, setRevInput] = useState("");
  const [revLine, setRevLine] = useState(1);

  const cleanRev = (revInput || "").replace(/[^1-4]/g, "").slice(0, 3);
  const revResult = cleanRev.length >= 2 ? caesarShiftForLine(cleanRev, revLine) : "";

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 h-full flex flex-col">
      {/* ── Caesar Shift (existing) ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <div className="text-sm font-bold text-violet-300">Caesar Shift</div>
        </div>
        {shifted && (
          <span className="font-mono text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {shifted}
          </span>
        )}
      </div>

      <input
        value={clean}
        onChange={(e) => {
          const value = e.target.value.replace(/[^1-4]/g, "");
          setCaesarInput(value.slice(0, 10));
        }}
        placeholder="e.g. 234"
        maxLength={10}
        className="w-full bg-slate-900/50 border border-violet-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 mb-2"
      />

      {/* ── Divider ── */}
      <div className="border-t border-slate-700 mb-2" />

      {/* ── Reverse String (new) ── */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs text-slate-400 shrink-0">↩ Reverse</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((l) => (
            <button
              key={l}
              onClick={() => setRevLine(l)}
              className={`w-6 h-6 text-xs rounded-md font-bold transition-all cursor-pointer ${
                revLine === l
                  ? "bg-violet-600 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {revResult && (
          <>
            <span className="text-slate-500 text-xs ml-1">→</span>
            <span className="font-mono font-bold text-emerald-400 text-sm ml-0.5">{revResult}</span>
          </>
        )}
      </div>

      <input
        value={cleanRev}
        onChange={(e) => setRevInput(e.target.value.replace(/[^1-4]/g, "").slice(0, 3))}
        placeholder="e.g. 412"
        maxLength={3}
        className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </div>
  );
}
