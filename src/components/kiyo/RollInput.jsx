import React from "react";
import { translateTo4 } from "../../utils/stringHelpers";

// Simple input field component for sticky header
export default function RollInput({
  testInput,
  setTestInput,
  handleTestRollSubmit,
  onAddRoll,
  setActivePrefix,
}) {
  return (
    <div className="kiyo-inner-card rounded-xl p-3 h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">[+]</span>
        <div className="text-left">
          <div className="text-sm font-bold theme-text-accent">Rolls Input</div>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={testInput}
          onChange={(e) => {
            const value = e.target.value.replace(/[^1-8]/g, "").slice(0, 2);
            setTestInput(value);

            // Real-time prefix tracking for predictions
            if (value.length >= 2) {
              const translated = translateTo4(value);
              setActivePrefix(translated.slice(0, 2)); // 2-digit prefix for 3-str
            } else if (value.length === 1) {
              const translated = translateTo4(value);
              setActivePrefix(translated[0]); // 1-digit prefix for 2-str
            } else {
              setActivePrefix(null); // Clear if empty
            }
          }}
          onKeyDown={handleTestRollSubmit}
          placeholder="e.g. 32  (2-str only)"
          maxLength={2}
          className="flex-1 theme-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--theme-input-focus)]"
        />
        <button
          onClick={onAddRoll}
          className="px-3 py-2 theme-action-primary text-xs font-bold rounded-lg transition-colors whitespace-nowrap active:scale-95"
        >
          Add Roll
        </button>
      </div>
    </div>
  );
}

