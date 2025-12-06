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
  // 🔥 NEW: Copy translated rolls to clipboard
  const handleCopyTranslated = () => {
    const text = translatedTestRolls.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert(
        `✅ Copied ${translatedTestRolls.length} translated rolls to clipboard!`
      );
    });
  };

  // 🔥 NEW: Copy original rolls to clipboard
  const handleCopyOriginal = () => {
    const text = testRolls.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ Copied ${testRolls.length} original rolls to clipboard!`);
    });
  };

  // 🔥 NEW: Download translated rolls as .txt file
  const handleDownloadTranslated = () => {
    const text = translatedTestRolls.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-rolls-translated-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🔥 NEW: Download original rolls as .txt file
  const handleDownloadOriginal = () => {
    const text = testRolls.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-rolls-original-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {testRolls.length} rolls
          </span>

          {/* 🔥 NEW: Copy/Download Buttons */}
          {testRolls.length > 0 && (
            <>
              <div className="relative group">
                <button
                  onClick={handleCopyTranslated}
                  className="text-[11px] px-2 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 rounded transition"
                  title="Copy translated rolls"
                >
                  📋 Copy 4xx
                </button>
              </div>

              <div className="relative group">
                <button
                  onClick={handleDownloadTranslated}
                  className="text-[11px] px-2 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded transition"
                  title="Download translated rolls"
                >
                  💾 Save 4xx
                </button>
              </div>

              <div className="relative group">
                <button
                  onClick={handleCopyOriginal}
                  className="text-[11px] px-2 py-1 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40 rounded transition"
                  title="Copy original rolls"
                >
                  📋 Copy Raw
                </button>
              </div>
            </>
          )}
        </div>
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
