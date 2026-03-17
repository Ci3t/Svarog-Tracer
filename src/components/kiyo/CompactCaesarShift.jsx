import React, { useState } from "react";
import { translateTo4 } from "../../utils/stringHelpers";
import { caesarShiftForLine } from "../../utils/caesarUtils";

// Compact Caesar Shift component for sticky header
export default function CompactCaesarShift({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  const [revInput, setRevInput] = useState("");
  const [revLine, setRevLine] = useState(1);

  const cleanRev = (revInput || "").replace(/[^1-4]/g, "").slice(0, 3);
  const revResult = cleanRev.length >= 2 ? caesarShiftForLine(cleanRev, revLine) : "";

  return (
    <div className="kiyo-inner-card rounded-xl p-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg theme-text-muted">[R]</span>
          <div className="text-sm font-bold theme-text-accent">Caesar Shift</div>
        </div>
        {shifted && (
          <span className="font-mono text-lg font-bold theme-text-accent">{shifted}</span>
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
        className="w-full theme-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-input-focus)] mb-2"
      />

      <div className="border-t border-[color:var(--theme-border-soft)] mb-2" />

      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs theme-text-muted shrink-0">Reverse</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((l) => (
            <button
              key={l}
              onClick={() => setRevLine(l)}
              className={`w-6 h-6 text-xs rounded-md font-bold transition-all cursor-pointer ${
                revLine === l
                  ? "kiyo-accent-soft"
                  : "kiyo-inner-subcard theme-text-muted hover:brightness-110"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {revResult && (
          <>
            <span className="theme-text-soft text-xs ml-1">-&gt;</span>
            <span className="font-mono font-bold theme-text-accent text-sm ml-0.5">{revResult}</span>
          </>
        )}
      </div>

      <input
        value={cleanRev}
        onChange={(e) => setRevInput(e.target.value.replace(/[^1-4]/g, "").slice(0, 3))}
        placeholder="e.g. 412"
        maxLength={3}
        className="w-full theme-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-input-focus)]"
      />
    </div>
  );
}
