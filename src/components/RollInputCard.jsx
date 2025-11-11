import { sanitizeRollInput } from "../utils/stringHelpers";

export default function RollInputCard({
  rollInput,
  setRollInput,
  onAdd,
  entriesCount,
}) {
  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Live roll input
        </h2>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 cursor-default">
          {entriesCount} rolls
        </span>
      </div>
      <div className="flex gap-3">
        <input
          value={rollInput}
          onChange={(e) => setRollInput(sanitizeRollInput(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Enter roll: 42, 234, 3441..."
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <button
          onClick={onAdd}
          className="px-6 cursor-pointer py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Input only digits 1–4. We auto-split and pad to 5 digits for 2/3/4/5
        string views.
      </p>
    </div>
  );
}
