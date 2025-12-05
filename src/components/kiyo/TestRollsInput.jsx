import React from "react";

export default function TestRollsInput({
  testInput,
  setTestInput,
  handleTestRollSubmit,
  testRolls,
  translatedTestRolls,
  handleDeleteTestRoll,
  setActivePrefix,
}) {
  return (
    <div className="space-y-2 flex flex-col">
      <label className="text-xs text-slate-300 font-semibold flex items-center gap-2">
        🧪 Test Rolls
        <span className="text-[10px] text-slate-500 font-normal">
          (Enter 3-digit combo, auto-translated to 4xx)
        </span>
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={3}
        value={testInput}
        onChange={(e) => {
          const val = e.target.value.replace(/[^1-4]/g, "");
          setTestInput(val);

          // Clear activePrefix when typing to let smartPrefixPrediction use typing mode
          if (val.length >= 2) {
            setActivePrefix(null);
          }
        }}
        onKeyDown={handleTestRollSubmit}
        placeholder="e.g. 121 or 232"
        className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-violet-300 font-semibold">
          Test Rolls
        </span>
        <span className="text-xs text-slate-500">{testRolls.length} rolls</span>
      </div>

      <div className="bg-slate-950/60 rounded-lg border border-slate-700/50 max-h-[500px] overflow-y-auto flex-1">
        {testRolls.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No test rolls yet
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-900/60 sticky top-0">
              <tr className="text-left text-[11px] font-semibold text-slate-400">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Input</th>
                <th className="py-2 px-3">→ Translated</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {[...testRolls]
                .map((roll, idx) => ({
                  idx,
                  raw: roll,
                  translated: translatedTestRolls[idx],
                }))
                .reverse()
                .map(({ idx, raw, translated }, displayIdx) => {
                  const displayIndex = testRolls.length - displayIdx;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-500">
                        {displayIndex}
                      </td>
                      <td className="py-2 px-3 font-mono text-violet-300 font-bold">
                        {raw}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                        {translated}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTestRoll(idx)}
                          className="text-[11px] text-slate-500 hover:text-red-400 transition"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
