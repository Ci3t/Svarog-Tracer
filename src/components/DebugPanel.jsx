import React, { useMemo, useState } from "react";
import { runBacktest } from "../utils/backtester.js";

const BASE_TABS = [
  { id: "2", label: "2-str" },
  { id: "3", label: "3-str" },
  { id: "4", label: "4-str" },
  { id: "all", label: "Merged" },
  { id: "long", label: "Long String" },
  { id: "logs", label: "Live Logs" },
];

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "--:--:--";
  }
}

// Manual long-string decoder helpers (1–4 digits -> 2-str rolls)
const CAESAR_GROUPS = {
  41: ["41", "34", "23", "12"],
  42: ["42", "31", "24", "13"],
  43: ["43", "32", "21", "14"],
  44: ["44", "33", "22", "11"],
};

const CAESAR_TO_BASE = Object.fromEntries(
  Object.entries(CAESAR_GROUPS).flatMap(([base, forms]) =>
    forms.map((code) => [code, base])
  )
);

/**
 * Expand a long-string of digits (1–4) into:
 *  - pairs: Caesar line codes, e.g. "41 12 24 …"
 *  - rolls: decoded 2-str values, e.g. "41 41 42 …"
 *
 * Example:
 *   expandManualLongString("41242323")
 *   => {
 *        cleaned: "41242323",
 *        pairs: ["41","12","24","42","23","32","23"],
 *        rolls: ["41","41","42","42","41","43","41"]
 *      }
 */
function expandManualLongString(longStr) {
  const cleaned = (longStr || "").replace(/[^1-4]/g, "");
  if (cleaned.length < 2) {
    return { cleaned, pairs: [], rolls: [] };
  }

  const digits = cleaned.split("");
  const pairs = [];
  for (let i = 0; i < digits.length - 1; i++) {
    pairs.push(digits[i] + digits[i + 1]);
  }

  const rolls = pairs.map((p) => CAESAR_TO_BASE[p] || null).filter(Boolean);
  return { cleaned, pairs, rolls };
}
export default function DebugPanel({
  debugLogs,
  onClearLogs,
  onImportLogs,
  isDebugMode = false,
}) {
  const [activeTab, setActiveTab] = useState("logs");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [sessionId, setSessionId] = useState(0); // Track session changes
  const [manualLongInput, setManualLongInput] = useState("");

  const manualLong = useMemo(
    () => expandManualLongString(manualLongInput),
    [manualLongInput]
  );

  // Dynamically build tabs — insert Backtest after "logs" only in debug mode
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (isDebugMode) {
      const logsIndex = tabs.findIndex((t) => t.id === "logs");
      tabs.splice(logsIndex + 1, 0, { id: "backtest", label: "Backtest" });
    }
    return tabs;
  }, [isDebugMode]);

  // 📊 Per-session mode accuracy stats (resets on new session)
  const modeStats = useMemo(() => {
    if (!debugLogs?.length) return [];

    // Detect session boundaries (big time gaps > 30 seconds)
    const sessions = [];
    let currentSession = [];
    const SESSION_THRESHOLD = 30000; // 30 seconds

    debugLogs.forEach((log, idx) => {
      if (idx === 0) {
        currentSession = [log];
      } else {
        const timeDiff = debugLogs[idx].ts - debugLogs[idx - 1].ts;
        if (timeDiff > SESSION_THRESHOLD) {
          if (currentSession.length > 0) {
            sessions.push(currentSession);
          }
          currentSession = [log];
        } else {
          currentSession.push(log);
        }
      }
    });
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    // Calculate accuracy for CURRENT (last) session only
    const currentSessionLogs = sessions[sessions.length - 1] || [];

    const stats = {};

    currentSessionLogs.forEach((log) => {
      if (!log.mode || !log.actual || !log.prediction) return;

      const mode = log.mode;
      if (!stats[mode]) {
        stats[mode] = { hits: 0, total: 0 };
      }

      stats[mode].total += 1;

      const hit =
        String(log.actual) === String(log.prediction) ||
        (log.alt && String(log.actual) === String(log.alt));

      if (hit) stats[mode].hits += 1;
    });

    const rows = Object.entries(stats).map(([mode, s]) => ({
      mode,
      hits: s.hits,
      total: s.total,
      pct: s.total ? Math.round((s.hits / s.total) * 100) : 0,
    }));

    // highest accuracy first
    rows.sort((a, b) => b.pct - a.pct);

    return rows;
  }, [debugLogs, sessionId]);

  // Format a single log line with mode accuracy
  const formatLine = (log) => {
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
        altPct != null
          ? ` | alt: ${log.alt} (${altPct}%)`
          : ` | alt: ${log.alt}`;
    }

    const modeStat = modeStats?.find((m) => m.mode === log.mode);
    const modeAccuracy = modeStat
      ? `(${modeStat.hits}/${modeStat.total} = ${modeStat.pct}%)`
      : "";

    return `[${formatTime(log.ts)}] ${log.kind}-str → pred: ${
      log.prediction
    } (${mainPct}%)${altPart} | mode: ${log.mode} ${modeAccuracy} | actual: ${
      log.actual
    } | ctx: ${(log.ctx || []).join(", ")}`;
  };

  // BACKTEST: Only compute when debug mode + tab is active
  const backtestResults = useMemo(() => {
    if (!isDebugMode || activeTab !== "backtest") return null;
    return runBacktest(debugLogs);
  }, [debugLogs, activeTab, isDebugMode]);

  // Latest session + per-roll stats
  const latestSessionStats = useMemo(() => {
    if (!backtestResults || !backtestResults.sessions?.length) return null;

    const session =
      backtestResults.sessions[backtestResults.sessions.length - 1];

    const detailRows = (session.details || []).filter((d) => !d.skip && d.pred);

    const mainHits = detailRows.filter((d) => d.hitMain).length;
    const altHits = detailRows.filter((d) => !d.hitMain && d.hitAlt).length;
    const misses = detailRows.length - mainHits - altHits;

    return { session, detailRows, mainHits, altHits, misses };
  }, [backtestResults]);

  const filtered = useMemo(() => {
    if (!debugLogs || !debugLogs.length) return [];
    if (activeTab === "all") return debugLogs;
    if (activeTab === "long" || activeTab === "backtest") return [];
    return debugLogs.filter((l) => l.kind === activeTab);
  }, [debugLogs, activeTab]);

  // 🔢 Long string builder
  const LONG_VALS = ["41", "42", "43", "44"];
  const DIFF_TO_DIGIT = {
    0: 1,
    1: 3,
    2: 2,
    3: 4,
  };

  function buildLongStringFromLogs(debugLogs) {
    if (!debugLogs || debugLogs.length === 0) return "";

    const rolls = debugLogs
      .filter((log) => log.kind === "2" && log.actual)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .map((log) => String(log.actual).slice(0, 2))
      .filter((val) => LONG_VALS.includes(val));

    if (rolls.length === 0) return "";

    const firstIdx = LONG_VALS.indexOf(rolls[0]);
    if (firstIdx === -1) return "";

    const digits = [4, firstIdx + 1];

    for (let i = 1; i < rolls.length; i++) {
      const prevIdx = LONG_VALS.indexOf(rolls[i - 1]);
      const currIdx = LONG_VALS.indexOf(rolls[i]);

      if (prevIdx === -1 || currIdx === -1) continue;

      const diff = (currIdx - prevIdx + 4) % 4;
      const d = DIFF_TO_DIGIT[diff];

      if (d) digits.push(d);
    }

    return digits.join("");
  }

  const longString = useMemo(() => {
    const str = buildLongStringFromLogs(debugLogs);
    return str || "—";
  }, [debugLogs]);

  const digitCounts = useMemo(() => {
    if (!longString || longString === "—") {
      return { 1: 0, 2: 0, 3: 0, 4: 0 };
    }
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const char of longString) {
      if (counts.hasOwnProperty(char)) counts[char]++;
    }
    return counts;
  }, [longString]);

  // Parse Svarog export format
  function parseSvarogExport(text) {
    const rawLines = text.split(/\r?\n/);

    let start = rawLines.findIndex((l) => l.trim().startsWith("--- 2-str"));
    if (start === -1) return [];

    start += 1;
    let end = rawLines.length;
    for (let i = start; i < rawLines.length; i++) {
      const t = rawLines[i].trim();
      if (t.startsWith("---") && !t.startsWith("--- 2-str")) {
        end = i;
        break;
      }
    }

    const sectionLines = rawLines
      .slice(start, end)
      .map((l) => l.trim())
      .filter(Boolean);

    const lines = [...sectionLines].reverse();
    const logs = [];

    for (const line of lines) {
      if (!line.includes("2-str")) continue;

      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) continue;

      const first = parts[0];

      // Parse timestamp
      let ts = Date.now();
      const timeMatch = first.match(/\[(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\]/);
      if (timeMatch) {
        let [, hh, mm, ss, ampm] = timeMatch;
        let h = parseInt(hh, 10);
        const m = parseInt(mm, 10);
        const s = parseInt(ss, 10);

        if (ampm === "PM" && h !== 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;

        const d = new Date();
        d.setHours(h, m, s, 0);
        ts = d.getTime();
      }

      // Parse prediction & confidence
      const predMatch = first.match(/pred:\s*(\d{2}|—)\s*\((\d+)%\)/);
      if (!predMatch) continue;
      const predRaw = predMatch[1];
      const confPct = parseInt(predMatch[2], 10) || 0;
      const pred = predRaw === "—" ? "—" : predRaw;

      // Parse alt
      const altPart = parts.find((p) => p.startsWith("alt:"));
      const altMatch = altPart
        ? altPart.match(/alt:\s*(\d{2})\s*\((\d+)%\)/)
        : null;
      const alt = altMatch ? altMatch[1] : null;

      // Parse mode
      const modePart = parts.find((p) => p.startsWith("mode:"));
      const mode = modePart
        ? modePart.replace(/^mode:\s*/, "").trim()
        : "imported";

      // Parse actual
      const actualPart = parts.find((p) => p.startsWith("actual:"));
      const actualMatch = actualPart
        ? actualPart.match(/actual:\s*(\d{2})/)
        : null;
      const actual = actualMatch ? actualMatch[1] : null;
      if (!actual) continue;

      // Parse context
      const ctxPart = parts.find((p) => p.startsWith("ctx:"));
      let ctx = [];
      if (ctxPart) {
        ctx = ctxPart
          .replace(/^ctx:\s*/, "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      logs.push({
        ts,
        kind: "2",
        prediction: pred,
        confidence: confPct / 100,
        alt,
        mode,
        actual,
        ctx,
        candidates: [],
      });
    }

    return logs;
  }

  // Parse simple roll list
  function parseSimpleRollList(lines) {
    const rolls = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^(\d{2})$/);
      if (!m) continue;
      rolls.push(m[1]);
    }

    const logs = [];
    let baseTs = Date.now() - rolls.length * 60000;

    rolls.forEach((actual, i) => {
      logs.push({
        ts: baseTs + i * 60000,
        kind: "2",
        prediction: "import",
        confidence: 0,
        alt: null,
        mode: "import-simple",
        actual,
        ctx: rolls.slice(0, i),
        candidates: [],
      });
    });

    return logs;
  }

  // Try Svarog export first, then simple list
  function parseDebugFile(text) {
    const logsFromExport = parseSvarogExport(text);
    if (logsFromExport.length) return logsFromExport;
    return parseSimpleRollList(text.split(/\r?\n/));
  }

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file || !onImportLogs) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const logs = parseDebugFile(text);

        if (!logs.length) {
          setToastMessage("No valid 2-str data found in file.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2500);
          return;
        }

        onImportLogs(logs);
        setToastMessage(`✓ Imported ${logs.length} entries!`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      } catch (err) {
        console.error("Import failed", err);
        setToastMessage("✗ Import failed");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyLongString = () => {
    if (!longString || longString === "—") return;
    navigator.clipboard.writeText(longString).then(() => {
      setToastMessage("✓ Long string copied!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    });
  };

  const handleDownload = () => {
    if (!debugLogs?.length) return;

    const lines = ["=== Svarog Tracer Debug Export ===\n"];
    ["2", "3", "4"].forEach((kind) => {
      lines.push(`--- ${kind}-str ---`);
      const kindLogs = debugLogs.filter((l) => l.kind === kind);
      if (!kindLogs.length) lines.push("(none)\n");
      else kindLogs.forEach((log) => lines.push(formatLine(log) + "\n"));
      lines.push("");
    });

    lines.push("--- merged (all) ---");
    debugLogs.forEach((log) => lines.push(formatLine(log) + "\n"));

    lines.push("\n--- Long String (chronological) ---");
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
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Clear all debug logs?")) {
      onClearLogs();
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mt-4 relative">
      {/* DEBUG MODE Badge */}
      {isDebugMode && (
        <div className="absolute top-2 right-2 text-xs bg-violet-600/80 text-white px-2 py-1 rounded-full font-bold border border-violet-500/50 z-10">
          DEBUG MODE
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 shadow-lg z-50 animate-pulse">
          {toastMessage}
        </div>
      )}

      {/* Header + Actions */}
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
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 transition cursor-pointer"
          >
            Download
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-300 transition cursor-pointer"
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
            className={`px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-violet-600 text-white border-violet-500 shadow-md"
                : "bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ BACKTEST TAB ═══ */}
      {activeTab === "backtest" && isDebugMode && (
        <div className="space-y-4 p-4 bg-gradient-to-br from-emerald-900/20 to-sky-900/20 rounded-2xl border border-emerald-500/30">
          <div className="text-center mb-4">
            <h4 className="text-lg font-black text-emerald-400 mb-1">
              Predictor Backtest
            </h4>
            <p className="text-xs text-slate-400">
              Live accuracy on your historical ctx → actual
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-[11px] text-slate-400">
              Import Svarog debug export or simple list of rolls (1 per line)
            </p>
            <label className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-600 cursor-pointer hover:bg-slate-700/80 transition">
              <span className="mr-2 text-slate-100">Import .txt</span>
              <input
                type="file"
                accept=".txt"
                className="hidden"
                onChange={handleImportFile}
              />
            </label>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-500/40 text-center">
              <div className="text-3xl font-black text-emerald-400">
                {backtestResults?.overall.top2Pct?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-emerald-300 uppercase tracking-wider">
                Top-2 Accuracy
              </div>
            </div>
            <div className="bg-sky-900/40 p-3 rounded-xl border border-sky-500/40 text-center">
              <div className="text-3xl font-black text-sky-400">
                {backtestResults?.overall.top1Pct?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-sky-300 uppercase tracking-wider">
                Top-1 Accuracy
              </div>
            </div>
            <div className="bg-violet-900/40 p-3 rounded-xl border border-violet-500/40 text-center">
              <div className="text-3xl font-bold text-violet-400">
                {backtestResults?.overall.totalValid || 0}
              </div>
              <div className="text-xs text-violet-300 uppercase tracking-wider">
                Valid Tests
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="overflow-x-auto max-h-40">
            <table className="w-full text-xs border-collapse bg-slate-950/50 rounded-lg overflow-hidden">
              <thead className="bg-slate-900/80 sticky top-0">
                <tr>
                  <th className="p-3 text-left font-bold text-slate-300 border-r border-slate-700/50">
                    Session
                  </th>
                  <th className="p-3 text-left font-bold text-slate-300 border-r border-slate-700/50">
                    Tests
                  </th>
                  <th className="p-3 text-left font-bold text-slate-300 border-r border-slate-700/50">
                    Valid
                  </th>
                  <th className="p-3 text-left font-bold text-emerald-400">
                    Top-1 %
                  </th>
                  <th className="p-3 text-left font-bold text-sky-400">
                    Top-2 %
                  </th>
                </tr>
              </thead>
              <tbody>
                {backtestResults?.sessions?.length ? (
                  backtestResults.sessions.map((session, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-800/50 border-t border-slate-700/30 even:bg-slate-950/20"
                    >
                      <td className="p-3 font-mono">#{session.session}</td>
                      <td className="p-3">{session.tests}</td>
                      <td className="p-3 font-bold text-violet-400">
                        {session.valid}
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">
                        {session.top1Pct.toFixed(1)}%
                      </td>
                      <td className="p-3 text-sky-400 font-bold">
                        {session.top2Pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-500 italic"
                    >
                      No historical data. Roll more!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Latest Session Details */}
          {latestSessionStats && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Session #{latestSessionStats.session.session} – detailed view
                </span>
                <span>
                  {latestSessionStats.session.valid} valid /{" "}
                  {latestSessionStats.session.tests} total
                </span>
              </div>

              {/* Summary boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-violet-900/40 p-3 rounded-xl border border-violet-500/40">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Top-2 Accuracy
                  </div>
                  <div className="text-2xl font-black text-violet-300">
                    {latestSessionStats.session.top2Pct.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-500/40">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Main Hits
                  </div>
                  <div className="text-2xl font-black text-emerald-300">
                    {latestSessionStats.mainHits}
                  </div>
                </div>
                <div className="bg-amber-900/40 p-3 rounded-xl border border-amber-500/40">
                  <div className="text-[11px] text-slate-300 mb-1">
                    Alt Hits
                  </div>
                  <div className="text-2xl font-black text-amber-300">
                    {latestSessionStats.altHits}
                  </div>
                </div>
                <div className="bg-rose-900/40 p-3 rounded-xl border border-rose-500/40">
                  <div className="text-[11px] text-slate-300 mb-1">Misses</div>
                  <div className="text-2xl font-black text-rose-300">
                    {latestSessionStats.misses}
                  </div>
                </div>
              </div>

              {/* Per-roll detail table */}
              <div className="overflow-x-auto max-h-52 text-[10px] font-mono">
                <table className="w-full border-collapse bg-slate-950/50 rounded-lg overflow-hidden">
                  <thead className="bg-slate-900/80 sticky top-0">
                    <tr>
                      <th className="p-2 text-left text-slate-300">#</th>
                      <th className="p-2 text-left text-slate-300">
                        Ctx (last 8)
                      </th>
                      <th className="p-2 text-left text-slate-300">Pred</th>
                      <th className="p-2 text-left text-slate-300">Alt</th>
                      <th className="p-2 text-left text-slate-300">Actual</th>
                      <th className="p-2 text-left text-slate-300">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestSessionStats.detailRows.map((row, i) => {
                      const resultLabel = row.hitMain
                        ? "MAIN"
                        : row.hitAlt
                        ? "ALT"
                        : "MISS";
                      const resultColor = row.hitMain
                        ? "text-emerald-300"
                        : row.hitAlt
                        ? "text-amber-300"
                        : "text-rose-300";

                      return (
                        <tr
                          key={i}
                          className="border-t border-slate-700/40 hover:bg-slate-800/40"
                        >
                          <td className="p-2 text-slate-400">{i + 1}</td>
                          <td className="p-2 text-slate-200">
                            {(row.rolls || []).join(", ")}
                          </td>
                          <td className="p-2 text-slate-200">
                            {row.pred}{" "}
                            {row.predConf != null && `(${row.predConf}%)`}
                          </td>
                          <td className="p-2 text-slate-200">
                            {row.alt || "—"}
                          </td>
                          <td className="p-2 text-slate-200">{row.actual}</td>
                          <td className={`p-2 font-bold ${resultColor}`}>
                            {resultLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ LONG STRING TAB ═══ */}
      {/* ═══ LONG STRING TAB ═══ */}
      {activeTab === "long" && (
        <div className="space-y-4">
          {/* auto-built long string from live debug logs */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-40 overflow-y-auto">
            {longString && longString !== "—" ? (
              <div className="flex items-start justify-between gap-2">
                <div className="text-slate-200 font-mono text-xs break-all leading-relaxed flex-1">
                  {longString}
                </div>
                <button
                  onClick={handleCopyLongString}
                  className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 whitespace-nowrap mt-1 transition cursor-pointer"
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

          {longString && longString !== "—" && (
            <>
              {/* what the digits mean */}
              <p className="text-[11px] text-slate-400">
                <span className="font-semibold text-violet-300">Hint:</span>{" "}
                digits <span className="text-violet-300">1–4</span> mark the
                line in the Caesar grid that each step landed on (
                <span className="text-violet-300">1</span> = line 1,{" "}
                <span className="text-violet-300">2</span> = line 2, etc.).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-950/60 rounded-lg border border-violet-500/30 p-3">
                  <div className="text-[11px] text-slate-400 mb-1">
                    Total Length
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-violet-300">
                    {longString.length}
                  </div>
                </div>
                {["1", "2", "3", "4"].map((digit) => (
                  <div
                    key={digit}
                    className="bg-slate-950/60 rounded-lg border border-slate-700/50 p-3"
                  >
                    <div className="text-[11px] font-semibold text-violet-300 mb-1">
                      Digit{" "}
                      <span className="text-violet-200 font-bold">{digit}</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-50">
                      {digitCounts[digit]}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {longString.length > 0
                        ? `${Math.round(
                            (digitCounts[digit] / longString.length) * 100
                          )}%`
                        : "0%"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Manual decoder */}
          <div className="mt-4 border-t border-slate-800/70 pt-3">
            <h4 className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wide">
              Manual Long String Decoder
            </h4>
            <p className="text-[11px] text-slate-500 mb-2">
              Type a long string like{" "}
              <span className="font-mono text-violet-300">41242323</span> and
              we&apos;ll expand it to 2-str lines using the Caesar card.
            </p>

            <div className="flex gap-2 items-center mb-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={64}
                value={manualLongInput}
                onChange={(e) => setManualLongInput(e.target.value)}
                placeholder="Digits 1–4 only, e.g. 41242323"
                className="flex-1 bg-slate-950/70 border border-slate-700/70 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              />
              {manualLongInput && (
                <button
                  onClick={() => setManualLongInput("")}
                  className="px-2 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {manualLong.cleaned.length > 1 ? (
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="text-slate-400 mb-1">Caesar pairs</div>
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 font-mono text-xs text-violet-200 break-all">
                    {manualLong.pairs.join(" ")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Decoded 2-str rolls</div>
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 font-mono text-xs text-emerald-200 break-all">
                    {manualLong.rolls.join(" ")}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Enter at least{" "}
                <span className="font-mono text-violet-300">2</span> digits to
                decode.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══ LOGS / FILTERED TABS ═══ */}
      {(activeTab === "logs" ||
        activeTab === "2" ||
        activeTab === "3" ||
        activeTab === "4" ||
        activeTab === "all") && (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-52 sm:max-h-64 overflow-y-auto text-[10px] sm:text-[11px] font-mono leading-relaxed">
          {filtered.length === 0 ? (
            <div className="text-slate-500">No debug entries yet.</div>
          ) : (
            filtered.map((log) => {
              const isMainHit =
                log.actual && String(log.actual) === String(log.prediction);
              const isAltHit =
                !isMainHit && log.alt && String(log.actual) === String(log.alt);

              const color = isMainHit
                ? "text-emerald-400"
                : isAltHit
                ? "text-amber-300"
                : "text-slate-200";

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
