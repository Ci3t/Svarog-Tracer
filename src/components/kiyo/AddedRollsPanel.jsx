import React, { useState } from "react";

// Added rolls panel component for sidebar
export default function AddedRollsPanel({
  testRolls,
  setTestRolls,
  translatedTestRolls,
  handleDeleteTestRoll,
  setActivePrefix,
  children,
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

  const rollsListContent = (
    <div className="space-y-3">
      {testRolls.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {testRolls.map((item, idx) => {
              const raw = typeof item === "string" ? item : item.raw || item.roll;
              const translated = translatedTestRolls[idx];
              const isSame = raw === translated;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between kiyo-inner-subcard px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-xs theme-text-muted kiyo-chip-muted px-2 py-0.5">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-mono theme-text-accent">
                        {isSame ? (
                          translated
                        ) : (
                          <>
                            <span className="theme-text-muted">{raw}</span>{" "}
                            <span className="theme-text-accent">-&gt;</span>{" "}
                            {translated}
                          </>
                        )}
                      </div>
                      {!isSame && (
                        <div className="text-[10px] theme-text-soft">raw -&gt; translated</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTestRoll(idx)}
                    className="theme-text-accent hover:text-red-400 text-sm cursor-pointer"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-700">
            <div className="text-xs theme-text-muted mb-2">Quick prefix:</div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(translatedTestRolls.map((r) => r.slice(0, 2)))).map(
                (prefix) => (
                  <button
                    key={prefix}
                    onClick={() => setActivePrefix(prefix)}
                    className="px-2 py-1 kiyo-accent-soft rounded text-xs hover:brightness-110 cursor-pointer"
                  >
                    {prefix}x
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="theme-text-soft italic p-4 text-center text-sm">
          No rolls added yet. Use the input above.
        </div>
      )}
      <button
        onClick={handleDownloadRolls}
        className="px-3 py-1.5 kiyo-accent-soft rounded-lg text-xs font-semibold transition cursor-pointer"
      >
        Download Rolls (4xx)
      </button>
    </div>
  );

  return (
    <div className="kiyo-inner-card rounded-xl p-3">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 kiyo-inner-subcard transition cursor-pointer rounded-lg mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">[R]</span>
          <div className="text-left">
            <div className="text-sm font-bold theme-text-accent">Added Rolls</div>
            <div className="text-xs theme-text-muted">
              {testRolls.length} rolls - Click to {isCollapsed ? "expand" : "collapse"}
            </div>
          </div>
        </div>
        <span className="theme-text-muted cursor-pointer">{isCollapsed ? "v" : "^"}</span>
      </button>

      {!isCollapsed &&
        (children ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-3 pt-0">
            <div className="space-y-3 border-r border-slate-700/50 pr-6">{rollsListContent}</div>
            <div className="min-h-[300px]">{children}</div>
          </div>
        ) : (
          <div className="p-3 pt-0">{rollsListContent}</div>
        ))}
    </div>
  );
}
