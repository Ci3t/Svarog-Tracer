// Modern Roll Input Component - Simple version
import React, { useEffect } from 'react';
import { sanitizeRollInput } from '../../utils/stringHelpers';
import { usePresenceContext } from '../../contexts/PresenceContext';

export default function ModernRollInput({
  rollInput,
  setRollInput,
  onAdd,
  entriesCount,
}) {
  const { trackPrediction } = usePresenceContext();

  const handleAdd = () => {
    onAdd();
    trackPrediction();
  };
  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Live Roll Input
        </h3>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
          {entriesCount} rolls
        </span>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <input
          value={rollInput}
          onChange={(e) => setRollInput(sanitizeRollInput(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Enter roll: 42, 234, 3441..."
          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
        <button
          onClick={handleAdd}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
        >
          Add Roll
        </button>
        <p className="text-xs text-slate-500 mt-2">
          Input only digits 1–4. Auto-split and pad to 5 digits.
        </p>
      </div>
    </div>
  );
}
