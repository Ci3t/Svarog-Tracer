import React, { useState } from "react";

// Added rolls panel component for sidebar
export default function AddedRollsPanel({
  testRolls,
  setTestRolls,
  translatedTestRolls,
  handleDeleteTestRoll,
  setActivePrefix,
  children
}) {
  const [isCollapsed, setIsCollapsed] = useState(false); // Default open for this layout

  // Function to download rolls starting with "4xx"
  const handleDownloadRolls = () => {
    if (!translatedTestRolls || translatedTestRolls.length === 0) return;

    const rollsStartingWith4 = translatedTestRolls.filter((roll) =>
      roll.startsWith("4")
    );

    if (rollsStartingWith4.length === 0) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");

    const normalizedTimestamp = `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;

    const fileContent = rollsStartingWith4.join("\n");
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Kiyo 3str data [${normalizedTimestamp}].txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition cursor-pointer rounded-lg bg-slate-700 mb-3"
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
        <span className="text-slate-400 cursor-pointer">
          {isCollapsed ? "▼" : "▲"}
        </span>
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-3 pt-0">
          {/* LEFT COL: Rolls List */}
          <div className="space-y-3 border-r border-slate-700/50 pr-6">
             {testRolls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {testRolls.map((item, idx) => {
                    const roll = typeof item === 'string' ? item : item.roll;
                    return (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-purple-900/30 border border-purple-500/40 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {/* Order Number */}
                        <div className="text-xs text-slate-400 bg-slate-700/80 rounded-full px-2 py-0.5">
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
                      </div>
                      <button
                        onClick={() => handleDeleteTestRoll(idx)}
                        className="text-purple-400 hover:text-red-400 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )})}
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
                        className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/40 rounded text-xs text-cyan-300 hover:bg-cyan-900/50 cursor-pointer"
                      >
                        {prefix}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
               <div className="text-slate-500 italic p-4 text-center">
                 No rolls added yet. Use the input above.
               </div>
            )}

            {/* Download Button */}
            <div className="pt-3">
              <button
                onClick={handleDownloadRolls}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                📥 Download Rolls (4xx)
              </button>
            </div>
          </div>

          {/* RIGHT COL: Predictors (Passed as Children) */}
          <div className="min-h-[400px]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
