import React from "react";
import { translateTo4 } from "../../utils/stringHelpers";

// Compact Caesar Shift component for sticky header
export default function CompactCaesarShift({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  return (
    <div className="bg-slate-800 rounded-xl  border border-slate-700 p-3 h-full flex flex-col">
      {/* Header with Result on Right */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <div className="text-sm font-bold text-violet-300">Caesar Shift</div>
        </div>
        {/* Result Display - Top Right */}
        {shifted && (
          <span className="font-mono text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {shifted}
          </span>
        )}
      </div>

      {/* Input */}
      <input
        value={clean}
        onChange={(e) => {
          const value = e.target.value.replace(/[^1-4]/g, "");
          setCaesarInput(value.slice(0, 10));
        }}
        placeholder="e.g. 234"
        maxLength={10}
        className="w-full bg-slate-900/50 border border-violet-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      />
    </div>
  );
}
