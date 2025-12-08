import React, { useState } from "react";

export default function TestRollsInput({
  testInput,
  setTestInput,
  handleTestRollSubmit,
  testRolls,
  translatedTestRolls,
  handleDeleteTestRoll,
  setActivePrefix,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Function to download rolls starting with "4xx"
  const handleDownloadRolls = () => {
    const rollsStartingWith4 = translatedTestRolls.filter((roll) =>
      roll.startsWith("4")
    );
    const fileContent = rollsStartingWith4.join("\n");
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "rolls_4xx.txt";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
      {/* Input Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚗️</span>
          <div className="text-left">
            <div className="text-sm font-bold text-purple-300">
              Test Rolls Input
            </div>
          </div>
        </div>
        <input
          type="text"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value.replace(/[^1-4]/g, ""))}
          onKeyDown={handleTestRollSubmit}
          placeholder="Type 3-digit roll (e.g. 234)"
          maxLength={3}
          className="w-full bg-slate-900/50 border border-purple-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </div>

      {/* Added Test Rolls Section */}
      <div className="mt-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition rounded-lg bg-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div className="text-left">
              <div className="text-sm font-bold text-purple-300">
                Added Test Rolls
              </div>
              <div className="text-xs text-slate-400">
                {testRolls.length} rolls • Click to{" "}
                {isCollapsed ? "expand" : "collapse"}
              </div>
            </div>
          </div>
          <span className="text-slate-400">{isCollapsed ? "▼" : "▲"}</span>
        </button>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="space-y-3">
              {testRolls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Added test rolls:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {testRolls.map((roll, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/40 rounded-lg px-3 py-1.5 relative"
                      >
                        {/* Order Number */}
                        <div className="absolute top-0 left-0 text-[10px] text-slate-400 bg-slate-700/80 rounded-full px-2 py-1 transform -translate-x-1/2 -translate-y-1/2">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-mono text-purple-200">
                            {roll}
                          </div>
                          <div className="text-xs text-purple-400">
                            → {translatedTestRolls[idx]}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTestRoll(idx)}
                          className="text-purple-400 hover:text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Prefix Buttons */}
                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">
                      Quick prefix selection:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(translatedTestRolls.map((r) => r.slice(0, 2)))
                      ).map((prefix) => (
                        <button
                          key={prefix}
                          onClick={() => setActivePrefix(prefix)}
                          className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/40 rounded text-xs text-cyan-300 hover:bg-cyan-900/50"
                        >
                          {prefix}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="pt-3">
                <button
                  onClick={handleDownloadRolls}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-xs font-semibold transition"
                >
                  📥 Download Rolls (4xx)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
