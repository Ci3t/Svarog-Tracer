import React, { useState } from "react";

export default function DebugPanel({ debugLogs = [] }) {
  const [tab, setTab] = useState("2");

  const logs2 = debugLogs.filter((l) => l.kind === "2");
  const logs3 = debugLogs.filter((l) => l.kind === "3");
  const logs4 = debugLogs.filter((l) => l.kind === "4");

  const activeLogs = tab === "2" ? logs2 : tab === "3" ? logs3 : logs4;

  // render one row
  const rowText = (log, label) => {
    const ts = new Date(log.ts).toLocaleTimeString();
    const pct = Math.round((log.confidence || 0) * 100);
    const ctx = Array.isArray(log.ctx) ? log.ctx.join(", ") : "";
    const altText =
      log.alt && log.altConf
        ? ` | alt: ${log.alt} (${Math.round(log.altConf * 100)}%)`
        : log.alt
        ? ` | alt: ${log.alt}`
        : "";

    return `[${ts}] ${label} → pred: ${
      log.prediction ?? "—"
    } (${pct}%)${altText} | mode: ${log.mode ?? "—"} | actual: ${
      log.actual ?? "—"
    }${ctx ? ` | ctx: ${ctx}` : ""}`;
  };

  // text for visible tab
  const tabText =
    activeLogs.map((log) => rowText(log, `${tab}-str`)).join("\n") ||
    "No debug entries yet.";

  // merged (all) in chronological order (we already store newest first)
  const mergedText =
    debugLogs.map((log) => rowText(log, `${log.kind}-str`)).join("\n") ||
    "(none)";

  // full export
  const fullExport = [
    "=== Svarog Tracer Debug Export ===",
    "",
    "--- 2-str ---",
    ...(logs2.length ? logs2.map((l) => rowText(l, "2-str")) : ["(none)"]),
    "",
    "--- 3-str ---",
    ...(logs3.length ? logs3.map((l) => rowText(l, "3-str")) : ["(none)"]),
    "",
    "--- 4-str ---",
    ...(logs4.length ? logs4.map((l) => rowText(l, "4-str")) : ["(none)"]),
    "",
    "--- merged (all) ---",
    mergedText,
  ].join("\n");

  const handleDownload = () => {
    const blob = new Blob([fullExport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "svarog-tracer-debug.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
          Debug / trace
        </h3>
        <div className="flex gap-1 bg-slate-950/40 rounded-lg p-1">
          {["2", "3", "4"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-[12px] rounded-md cursor-pointer ${
                tab === t
                  ? "bg-violet-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}-str
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          className="text-[14px] px-2 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700/60 text-slate-100 cursor-pointer"
        >
          Download
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Auto-collected per stream. 3-str / 4-str appear only if roll had 3/4
        digits.
      </p>
      <div className="bg-slate-950/40 rounded-lg p-2 max-h-48 overflow-auto text-[11px] font-mono whitespace-pre-wrap text-slate-200">
        {tabText}
      </div>
    </div>
  );
}
