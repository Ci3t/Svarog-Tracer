// src/components/DebugPanel.jsx - REPLACE YOUR EXISTING FILE
import React, { useMemo, useState } from "react";

const TABS = [
  { id: "2", label: "2-str" },
  { id: "3", label: "3-str" },
  { id: "4", label: "4-str" },
  { id: "all", label: "Merged" },
  { id: "long", label: "Long String" },
];

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "--:--:--";
  }
}

function formatLine(log) {
  const mainPct = Math.round((log.confidence || 0) * 100);
  let altPart = "";

  if (log.alt) {
    const altCandidate = (log.candidates || []).find(
      (c) => c.value === log.alt
    );
    const altPct =
      altCandidate && typeof altCandidate.pct === "number"
        ? altCandidate.pct
        : null;
    altPart =
      altPct != null ? ` | alt: ${log.alt} (${altPct}%)` : ` | alt: ${log.alt}`;
  }

  return `[${formatTime(log.ts)}] ${log.kind}-str → pred: ${
    log.prediction
  } (${mainPct}%)${altPart} | mode: ${log.mode} | actual: ${
    log.actual
  } | ctx: ${(log.ctx || []).join(", ")}`;
}

export default function DebugPanel({ debugLogs, onClearLogs }) {
  const [activeTab, setActiveTab] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const filtered = useMemo(() => {
    if (!debugLogs || !debugLogs.length) return [];
    if (activeTab === "all") return debugLogs;
    if (activeTab === "long") return []; // handled separately
    return debugLogs.filter((l) => l.kind === activeTab);
  }, [debugLogs, activeTab]);

  // Generate long string from all actual values (chronological)
  const longString = useMemo(() => {
    if (!debugLogs || !debugLogs.length) return "";

    // Get full actual values, translate each to 4xxx, then combine
    return debugLogs
      .map((log) => {
        const actual = String(log.actual || "");
        // Translate each full value to start with 4
        return translateTo4(actual);
      })
      .reverse() // Reverse to get chronological order
      .filter(Boolean) // Remove empty strings
      .join("");
  }, [debugLogs]);

  // Count occurrences of each digit 1-4
  const digitCounts = useMemo(() => {
    if (!longString) return { 1: 0, 2: 0, 3: 0, 4: 0 };

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const char of longString) {
      if (counts[char] !== undefined) {
        counts[char]++;
      }
    }
    return counts;
  }, [longString]);
  const handleCopyLongString = () => {
    if (!longString) return;
    navigator.clipboard
      .writeText(longString)
      .then(() => {
        setToastMessage("✓ Long string copied to clipboard!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        setToastMessage("✗ Failed to copy");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      });
  };
  // Helper function to translate strings
  function translateTo4(str = "") {
    if (!str) return "";
    const digits = str.split("").map((d) => Number(d));
    if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) return "";
    const shift = (4 - digits[0] + 4) % 4;
    return digits
      .map((d) => {
        const z = d - 1;
        const s = (z + shift) % 4;
        return (s + 1).toString();
      })
      .join("");
  }

  const handleDownload = () => {
    if (!debugLogs || !debugLogs.length) return;

    const lines = [];
    lines.push("=== Svarog Tracer Debug Export ===", "");

    // per-kind sections
    ["2", "3", "4"].forEach((kind) => {
      lines.push(`--- ${kind}-str ---`);
      const byKind = debugLogs.filter((l) => l.kind === kind);
      if (!byKind.length) {
        lines.push("(none)", "");
        return;
      }
      byKind.forEach((log) => lines.push(formatLine(log)));
      lines.push("");
    });

    // merged
    lines.push("--- merged (all) ---");
    debugLogs.forEach((log) => lines.push(formatLine(log)));

    // long string
    lines.push("", "--- Long String (chronological) ---");
    lines.push(longString || "(no data)");

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Svarog-Tracer-Debug-${new Date()
      .toTimeString()
      .slice(0, 8)
      .replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Clear all debug logs? This cannot be undone.")) {
      onClearLogs();
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mt-4">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 shadow-lg animate-fade-in-out z-50">
          {toastMessage}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300">
            Debug / Trace
          </h3>
          <p className="text-[11px] text-slate-500">
            Auto-collected per stream. 3-str / 4-str appear only if roll had 3/4
            digits.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-3 cursor-pointer py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100"
          >
            Download
          </button>
          <button
            onClick={handleClear}
            className="px-3 cursor-pointer py-1.5 text-xs rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-3 text-[11px]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1 rounded-full border ${
              activeTab === tab.id
                ? "bg-violet-600 text-white border-violet-500"
                : "bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "long" ? (
        <div className="space-y-3">
          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-40 overflow-y-auto">
            {longString ? (
              <div className="flex items-start justify-between gap-2">
                <div className="text-slate-200 font-mono text-xs break-all leading-relaxed flex-1">
                  {longString}
                </div>
                <button
                  onClick={handleCopyLongString}
                  className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 whitespace-nowrap mt-1"
                >
                  Copy
                </button>
              </div>
            ) : (
              <div className="text-slate-500 text-xs">
                No debug entries yet.
              </div>
            )}
          </div>

          {longString && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-slate-950/60 rounded-lg border border-violet-500/30 p-3">
                <div className="text-xs text-slate-400 mb-1">Total Length</div>
                <div className="text-2xl font-bold text-violet-300">
                  {longString.length}
                </div>
              </div>

              {["1", "2", "3", "4"].map((digit) => (
                <div
                  key={digit}
                  className="bg-slate-950/60 rounded-lg border border-slate-700/50 p-3"
                >
                  <div className="text-xs text-slate-400 mb-1">
                    Digit {digit}
                  </div>
                  <div className="text-2xl font-bold text-slate-200">
                    {digitCounts[digit]}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {longString.length > 0
                      ? `${Math.round(
                          (digitCounts[digit] / longString.length) * 100
                        )}%`
                      : "0%"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-52 sm:max-h-64 overflow-y-auto text-[10px] sm:text-[11px] font-mono leading-relaxed">
          {filtered.length === 0 ? (
            <div className="text-slate-500">No debug entries yet.</div>
          ) : (
            filtered.map((log) => {
              const isMainHit =
                log.actual &&
                log.prediction &&
                String(log.actual) === String(log.prediction);

              const isAltHit =
                !isMainHit && log.alt && String(log.actual) === String(log.alt);

              let color = "text-slate-200";
              if (isMainHit) color = "text-emerald-400"; // 🟢 GREEN
              else if (isAltHit) color = "text-amber-300"; // 🟡 YELLOW

              return (
                <div
                  key={`${log.ts}-${log.kind}-${log.actual}`}
                  className={color}
                >
                  {formatLine(log)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
