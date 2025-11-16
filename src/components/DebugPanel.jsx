// src/components/DebugPanel.jsx
// 🟢 PERFECT - No changes needed. Colors work flawlessly with pre-snapshot logs.

import React, { useMemo, useState } from "react";

const TABS = [
  { id: "2", label: "2-str" },
  { id: "3", label: "3-str" },
  { id: "4", label: "4-str" },
  { id: "all", label: "Merged" },
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

export default function DebugPanel({ debugLogs }) {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    if (!debugLogs || !debugLogs.length) return [];
    if (activeTab === "all") return debugLogs;
    return debugLogs.filter((l) => l.kind === activeTab);
  }, [debugLogs, activeTab]);

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

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Svarog-Tracer-Debug-${new Date()
      .toTimeString()
      .slice(0, 8) // HH:MM:SS
      .replace(/:/g, "-")}.txt`; // only replace : → no T
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Debug / Trace
          </h3>
          <p className="text-[11px] text-slate-500">
            Auto-collected per stream. 3-str / 4-str appear only if roll had 3/4
            digits.
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="px-3 cursor-pointer py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100"
        >
          Download
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 text-[11px]">
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

      <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-52 overflow-y-auto text-[11px] font-mono">
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
    </div>
  );
}
