import React, { useEffect, useMemo, useRef, useState } from "react";
import { runBacktest } from "../utils/backtester.js";

const BASE_TABS = [
  { id: "2", label: "2-str" },
  { id: "3", label: "3-str" },
  { id: "4", label: "4-str" },
  { id: "all", label: "Merged" },
  { id: "long", label: "Long String" },
  { id: "logs", label: "Live Logs" },
  { id: "kiyo-debug", label: "KiyoDebug" },
];

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "--:--:--";
  }
}

// Manual long-string decoder helpers
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

function expandManualLongString(longStr) {
  const cleaned = (longStr || "").replace(/[^1-4]/g, "");
  if (cleaned.length < 2) return { cleaned, pairs: [], rolls: [] };

  const digits = cleaned.split("");
  const pairs = [];
  const rolls = [];

  let prevPair = digits[0] + digits[1];
  pairs.push(prevPair);
  rolls.push(CAESAR_TO_BASE[prevPair] || null);

  for (let i = 2; i < digits.length; i++) {
    const nextPair = prevPair[1] + digits[i];
    pairs.push(nextPair);
    const decoded = CAESAR_TO_BASE[nextPair] || null;
    rolls.push(decoded);
    prevPair = nextPair;
  }

  return { cleaned, pairs, rolls };
}

export default function DebugPanel({
  debugLogs,
  onClearLogs,
  onImportLogs,
  isDebugMode = false,
  kiyoWaveData = null,
}) {
  const [activeTab, setActiveTab] = useState("logs");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const [sessionId, setSessionId] = useState(0);
  const [manualLongInput, setManualLongInput] = useState("");

  const manualLong = useMemo(
    () => expandManualLongString(manualLongInput),
    [manualLongInput]
  );

  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (isDebugMode) {
      const logsIndex = tabs.findIndex((t) => t.id === "logs");
      tabs.splice(logsIndex + 1, 0, { id: "backtest", label: "Backtest" });
    }
    return tabs;
  }, [isDebugMode]);

  const modeStats = useMemo(() => {
    if (!debugLogs?.length) return [];

    const sessions = [];
    let currentSession = [];
    const SESSION_THRESHOLD = 30000;

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

    rows.sort((a, b) => b.pct - a.pct);

    return rows;
  }, [debugLogs, sessionId]);


  // Helper: Classify failure reason
  const classifyFailure = (pred, actual, commons, noise) => {
    if (!actual || !pred) return null;
    if (actual === pred) return null; // Not a failure
    
    if (noise && noise.includes(actual)) {
      return `NOISE(${actual})`;
    }
    if (commons && commons.includes(actual)) {
      return `WRONG_COMMON(${actual})`;
    }
    return `UNPREDICTABLE(${actual})`;
  };

  // Helper: Get streak info
  const getStreakInfo = (logs, currentIndex) => {
    if (!logs || currentIndex < 0) return { current: 0, max: 0 };
    
    let current = 0;
    let max = 0;
    let tempStreak = 0;

    for (let i = currentIndex; i >= 0; i--) {
      const log = logs[i];
      if (!log.actual || !log.prediction) continue;
      
      const hit = String(log.actual) === String(log.prediction) ||
                  (log.alt && String(log.actual) === String(log.alt));
      
      if (hit) {
        tempStreak++;
        if (i === currentIndex) current = tempStreak;
      } else {
        if (i === currentIndex) current = 0;
        max = Math.max(max, tempStreak);
        tempStreak = 0;
      }
    }
    max = Math.max(max, tempStreak);
    
    return { current, max };
  };

  // Helper: Get last 5 visual
  const getLast5Visual = (logs, currentIndex) => {
    if (!logs || currentIndex < 0) return "";
    
    const symbols = [];
    for (let i = Math.max(0, currentIndex - 4); i <= currentIndex; i++) {
      const log = logs[i];
      if (!log.actual || !log.prediction) {
        symbols.push("-");
        continue;
      }
      
      const hit = String(log.actual) === String(log.prediction) ||
                  (log.alt && String(log.actual) === String(log.alt));
      symbols.push(hit ? "✅" : "❌");
    }
    
    return symbols.join("");
  };

  const formatLine = (log, logIndex) => {
    const mainPct = Math.round((log.confidence || 0) * 100);
    const basePct = log.baseConfidence ? Math.round(log.baseConfidence * 100) : mainPct;
    
    // Calibrated confidence display
    const confDisplay = basePct !== mainPct ? `${basePct}%→${mainPct}%` : `${mainPct}%`;
    
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

    // Pattern info
    let patternInfo = "";
    if (log.pattern && log.commons && log.commons.length >= 2) {
      const patternType = log.pattern.toUpperCase().substring(0, 3);
      const commonsStr = log.commons.join("↔");
      const strength = log.patternStrength || 0;
      const sequence = log.patternSequence || "";
      
      patternInfo = ` | Pattern: ${patternType}(${commonsStr}) ${strength}%`;
      if (sequence) {
        patternInfo += ` [${sequence}]`;
      }
    }

    // Commons breakdown
    let commonsBreakdown = "";
    if (log.distribution && log.commons) {
      const parts = [];
      Object.entries(log.distribution).forEach(([val, data]) => {
        const pct = Math.round(data.pct || 0);
        parts.push(`${val}:${pct}%`);
      });
      if (parts.length > 0) {
        commonsBreakdown = ` | Dist: ${parts.join(",")}`;
      }
    }

    // Failure analysis
    let failureInfo = "";
    const isCorrect = String(log.actual) === String(log.prediction) ||
                     (log.alt && String(log.actual) === String(log.alt));
    
    if (!isCorrect && log.actual) {
      const reason = classifyFailure(log.prediction, log.actual, log.commons, log.noise);
      if (reason) {
        failureInfo = ` | ❌ ${reason}`;
      }
    } else if (isCorrect) {
      failureInfo = ` | ✅`;
    }

    // Streak info
    const currentLogIndex = debugLogs?.findIndex(l => l.ts === log.ts) ?? -1;
    const streak = getStreakInfo(debugLogs, currentLogIndex);
    let streakInfo = "";
    if (streak.current > 0) {
      const fire = "🔥".repeat(Math.min(3, Math.floor(streak.current / 2)));
      streakInfo = ` | Streak: ${streak.current}${fire}`;
    } else if (streak.max > 0) {
      streakInfo = ` | Max: ${streak.max}`;
    }

    // Last 5 visual
    const last5 = getLast5Visual(debugLogs, currentLogIndex);
    const last5Info = last5 ? ` | Last5: ${last5}` : "";

    // Wave flip warning
    let waveFlipInfo = "";
    if (log.waveFlipData?.warning) {
      const flip = log.waveFlipData;
      const prob = Math.round(flip.probability * 100);
      const newCommons = flip.predictedNewCommons?.join(",") || "?";
      waveFlipInfo = ` | ⚠️ WAVE FLIP in ~${flip.rollsUntil} rolls! New: ${newCommons} (${prob}%)`;
    } else if (log.waveFlipData?.stable) {
      const stab = Math.round(log.waveFlipData.stability * 100);
      waveFlipInfo = ` | ✓ Stable ${stab}%`;
    }

    return `[${formatTime(log.ts)}] ${log.kind}-str → pred: ${
      log.prediction
    } (${confDisplay})${altPart} | mode: ${log.mode} ${modeAccuracy}${patternInfo}${commonsBreakdown}${failureInfo}${streakInfo}${last5Info}${waveFlipInfo} | actual: ${
      log.actual
    } | ctx: ${(log.ctx || []).join(", ")}`;
  };


  const backtestResults = useMemo(() => {
    if (!isDebugMode || activeTab !== "backtest") return null;
    return runBacktest(debugLogs);
  }, [debugLogs, activeTab, isDebugMode]);

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
    if (
      activeTab === "long" ||
      activeTab === "backtest" ||
      activeTab === "kiyo-debug"
    )
      return [];
    return debugLogs.filter((l) => l.kind === activeTab);
  }, [debugLogs, activeTab]);

  const LONG_VALS = ["41", "42", "43", "44"];

  function buildLongStringFromLogs(debugLogs) {
    if (!debugLogs || debugLogs.length === 0) return "";

    const rolls = debugLogs
      .filter((log) => log.kind === "2" && log.actual)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .map((log) => String(log.actual).slice(0, 2))
      .filter((val) => LONG_VALS.includes(val));

    if (rolls.length === 0) return "";

    let longString = rolls[0];

    for (let i = 1; i < rolls.length; i++) {
      longString += rolls[i][1];
    }

    return longString;
  }

  const longString = useMemo(() => {
    const str = buildLongStringFromLogs(debugLogs);
    return str || "—";
  }, [debugLogs]);

  const digitCounts = useMemo(() => {
    // Combine auto-built long string + manual input for counting
    let combinedString = "";
    
    // Add auto-built long string
    if (longString && longString !== "—") {
      combinedString += longString;
    }
    
    // Add manual decoder input (cleaned)
    if (manualLong.cleaned && manualLong.cleaned.length >= 2) {
      combinedString += manualLong.cleaned;
    }
    
    // Count digits
    const counts = { "1": 0, "2": 0, "3": 0, "4": 0 };
    for (const char of combinedString) {
      if (counts.hasOwnProperty(char)) counts[char]++;
    }
    return counts;
  }, [longString, manualLong]);

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

      let ts = Date.now();
      let timeMatch = first.match(/\[(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\]/);
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
      } else {
        timeMatch = first.match(/\[(\d{1,2}):(\d{2}):(\d{2})\]/);
        if (timeMatch) {
          const [, hh, mm, ss] = timeMatch;
          const d = new Date();
          d.setHours(parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10), 0);
          ts = d.getTime();
        }
      }

      const predMatch = first.match(/pred:\s*(\d{2}|—)\s*\((\d+)%\)/);
      if (!predMatch) continue;
      const predRaw = predMatch[1];
      const confPct = parseInt(predMatch[2], 10) || 0;
      const pred = predRaw === "—" ? "—" : predRaw;

      const altPart = parts.find((p) => p.startsWith("alt:"));
      const altMatch = altPart
        ? altPart.match(/alt:\s*(\d{2})\s*\((\d+)%\)/)
        : null;
      const alt = altMatch ? altMatch[1] : null;

      const modePart = parts.find((p) => p.startsWith("mode:"));
      const mode = modePart
        ? modePart.replace(/^mode:\s*/, "").trim()
        : "imported";

      const actualPart = parts.find((p) => p.startsWith("actual:"));
      const actualMatch = actualPart
        ? actualPart.match(/actual:\s*(\d{2})/)
        : null;
      const actual = actualMatch ? actualMatch[1] : null;
      if (!actual) continue;

      const ctxPart = parts.find((p) => p.startsWith("ctx:"));
      let ctx = [];
      if (ctxPart) {
        ctx = ctxPart
          .replace(/^ctx:\s*/, "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }

      const sourcePart = parts.find((p) => p.startsWith("source:"));
      const source = sourcePart
        ? sourcePart.replace(/^source:\s*/, "").trim()
        : "imported";

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
        source,
      });
    }

    return logs;
  }

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
        setToastMessage(`✔ Imported ${logs.length} entries!`);
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
      setToastMessage("✔ Long string copied!");
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

  // 🔥 IMPROVED KIYO DEBUG EXPORT

  const handleDownloadKiyoDebug = () => {
    const kiyoLogs = (debugLogs || [])
      .filter((l) => l?.source === "kiyo" && l?.kind === "3" && l?.actual)
      .slice()
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));

    if (!kiyoLogs.length && !kiyoWaveData) {
      showToastMessage("No Kiyo debug data to download.");
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const formatTime = (ts) => {
      try {
        return new Date(ts).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      } catch {
        return "--:--:--";
      }
    };

    const lines = [];
    lines.push("╔═══════════════════════════════════════════════════════════╗");
    lines.push("║         KIYO MODE DEBUG EXPORT v3.0                       ║");
    lines.push("║         Clean Tracking & Analysis                         ║");
    lines.push("╚═══════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push(`Generated: ${timestamp}`);
    lines.push(`Total Rolls: ${kiyoWaveData?.combinedRolls?.length || 0}`);
    lines.push("");

    // 🔥 FIX 1: Format rolls in table (15 per row)
    const allRollsFromLogs = kiyoLogs
      .map((l) => l?.actual)
      .filter(Boolean)
      .map(String);
    const allRolls = allRollsFromLogs.length
      ? allRollsFromLogs
      : kiyoWaveData?.combinedRolls || [];
    if (allRolls.length > 0) {
      lines.push("┌─────────────────────────────────────────────────────────┐");
      lines.push(
        "│  📋 ALL ROLLS (Session History)                          │"
      );
      lines.push("└─────────────────────────────────────────────────────────┘");
      lines.push("");

      const rollsPerRow = 15;
      for (let i = 0; i < allRolls.length; i += rollsPerRow) {
        const chunk = allRolls.slice(i, i + rollsPerRow);
        const formattedChunk = chunk.map(
          (r, idx) => `${(i + idx + 1).toString().padStart(3)}. ${r}`
        );
        lines.push(formattedChunk.join("  "));
      }

      lines.push("");
      lines.push("");
    }

    // Timeline with wave predictions
    lines.push("┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐");
    lines.push("│  📊 COMPREHENSIVE TRACKING TABLE                                                                                              │");
    lines.push("└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘");
    lines.push("");
    lines.push("Legend:");
    lines.push("  Actual = What you got in-game");
    lines.push("  Wave-C2/C3 = Wave predictions (digits suggested)");
    lines.push("  Suggest = What wave card recommended (message)");
    lines.push("  2str/3str = Prefix predictions");
    lines.push("  ✓ = Hit, ✗ = Miss, - = No prediction");
    lines.push("");

    const header = [
      "#".padEnd(3),
      "Time".padEnd(8),
      "Actual".padEnd(6),
      "Wave-C2".padEnd(8),
      "✓".padEnd(2),
      "C2-Suggest".padEnd(25),
      "Wave-C3".padEnd(8),
      "✓".padEnd(2),
      "C3-Suggest".padEnd(25),
      "2str".padEnd(5),
      "✓".padEnd(2),
      "3str".padEnd(5),
      "✓".padEnd(2),
    ].join(" ");

    lines.push(header);
    lines.push("─".repeat(140));

    // 🔥 COMPREHENSIVE TIMELINE SECTION:
    kiyoLogs.forEach((log, idx) => {
      const actual = log.actual || "---";
      const actualD2 = actual[1] || "-";
      const actualD3 = actual[2] || "-";

      // Wave predictions (prediction BEFORE this roll comes from previous log)
      const prev = idx > 0 ? kiyoLogs[idx - 1] : null;
      const c2Pred = prev?.waveData?.col2Prediction || null;
      const c3Pred = prev?.waveData?.col3Prediction || null;

      // Format wave suggestions
      const waveC2 = c2Pred ? `[${c2Pred.join(",")}]` : "-";
      const waveC3 = c3Pred ? `[${c3Pred.join(",")}]` : "-";

      // Check wave hits
      const c2Hit =
        c2Pred && actualD2 !== "-"
          ? c2Pred.includes(actualD2)
            ? "✓"
            : "✗"
          : "-";
      const c3Hit =
        c3Pred && actualD3 !== "-"
          ? c3Pred.includes(actualD3)
            ? "✓"
            : "✗"
          : "-";

      // Get wave card suggestions (what was recommended)
      const col2Data = prev?.waveAnalysis?.columns?.[0];
      const col3Data = prev?.waveAnalysis?.columns?.[1];
      
      const c2Suggest = col2Data?.message ? 
        col2Data.message.substring(0, 25) : "-";
      const c3Suggest = col3Data?.message ? 
        col3Data.message.substring(0, 25) : "-";

      // Get prefix predictions from smartRecommendation
      const prevRec = prev?.smartPrefix;
      
      // 2-str prediction
      const pred2str = prevRec?.prediction2str?.predicted || "-";
      const hit2str = pred2str !== "-" && actual === pred2str ? "✓" : 
                      pred2str !== "-" ? "✗" : "-";
      
      // 3-str prediction  
      const pred3str = prevRec?.prediction3str?.predicted || "-";
      const hit3str = pred3str !== "-" && actual === pred3str ? "✓" :
                      pred3str !== "-" ? "✗" : "-";

      const row = [
        String(idx + 1).padEnd(3),
        formatTime(log.ts).padEnd(8),
        actual.padEnd(6),
        waveC2.padEnd(8),
        c2Hit.padEnd(2),
        c2Suggest.padEnd(25),
        waveC3.padEnd(8),
        c3Hit.padEnd(2),
        c3Suggest.padEnd(25),
        pred2str.padEnd(5),
        hit2str.padEnd(2),
        pred3str.padEnd(5),
        hit3str.padEnd(2),
      ].join(" ");

      lines.push(row);
      
      // 🔥 ADD 5-MINUTE WINDOW SEPARATOR (visual only, every 11 rolls)
      if ((idx + 1) % 11 === 0 && idx + 1 < kiyoLogs.length) {
        lines.push("─".repeat(140) + " ◄ 5-min window boundary");
      }
    });

    lines.push("");
    lines.push("");
    // --- SUMMARY CALC (from table rows) ---
    const pct = (num, den) => (den ? ((num / den) * 100).toFixed(1) : "0.0");

    let c2Total = 0,
      c2Hits = 0;
    let c3Total = 0,
      c3Hits = 0;
    let combTotal = 0,
      combHits = 0;

    let prefix2strTotal = 0,
      prefix2strHits = 0;
    let prefix3strTotal = 0,
      prefix3strHits = 0;

    const isDash = (v) => !v || v === "-" || v === "--";

    kiyoLogs.forEach((log, idx) => {
      const actual = String(log.actual || "");

      const d2 = actual[1] || null;
      const d3 = actual[2] || null;

      const prev = idx > 0 ? kiyoLogs[idx - 1] : null;

      const c2Arr = prev?.waveData?.col2Prediction || null;
      const c3Arr = prev?.waveData?.col3Prediction || null;

      const hasC2 = Array.isArray(c2Arr) && c2Arr.length > 0;
      const hasC3 = Array.isArray(c3Arr) && c3Arr.length > 0;

      const c2Hit = hasC2 && d2 ? c2Arr.includes(d2) : false;
      const c3Hit = hasC3 && d3 ? c3Arr.includes(d3) : false;

      if (hasC2) {
        c2Total++;
        if (c2Hit) c2Hits++;
      }
      if (hasC3) {
        c3Total++;
        if (c3Hit) c3Hits++;
      }

      if (hasC2 && hasC3) {
        combTotal++;
        if (c2Hit && c3Hit) combHits++;
      }

      // 2-str and 3-str prefix predictions
      const prevRec = prev?.smartPrefix;
      
      const pred2str = prevRec?.prediction2str?.predicted;
      if (pred2str && pred2str !== "-") {
        prefix2strTotal++;
        if (actual === pred2str) prefix2strHits++;
      }
      
      const pred3str = prevRec?.prediction3str?.predicted;
      if (pred3str && pred3str !== "-") {
        prefix3strTotal++;
        if (actual === pred3str) prefix3strHits++;
      }
    });

    // Summary
    lines.push("┌─────────────────────────────────────────────────────────┐");
    lines.push("│  📈 ACCURACY SUMMARY                                     │");
    lines.push("└─────────────────────────────────────────────────────────┘");
    lines.push("");

    // Now print real numbers:
    lines.push("WAVE PERFORMANCE:");
    lines.push(
      `  Column 2: ${c2Hits} / ${c2Total} (${pct(c2Hits, c2Total)}%)`
    );
    lines.push(
      `  Column 3: ${c3Hits} / ${c3Total} (${pct(c3Hits, c3Total)}%)`
    );
    lines.push(
      `  Combined: ${combHits} / ${combTotal} (${pct(combHits, combTotal)}%)`
    );
    lines.push("");

    lines.push("PREFIX PERFORMANCE:");
    lines.push(
      `  2-String: ${prefix2strHits} / ${prefix2strTotal} (${pct(prefix2strHits, prefix2strTotal)}%)`
    );
    lines.push(
      `  3-String: ${prefix3strHits} / ${prefix3strTotal} (${pct(prefix3strHits, prefix3strTotal)}%)`
    );
    lines.push("");

    // Pattern analysis
    if (allRolls.length > 0) {
      lines.push("┌─────────────────────────────────────────────────────────┐");
      lines.push("│  🎨 PATTERN ANALYSIS (Last 12 Rolls)                    │");
      lines.push("└─────────────────────────────────────────────────────────┘");
      lines.push("");
      lines.push(
        "Roll | Digit 2 | Digit 3 | Col2 (O/I) | Col3 (L/H) | Pattern"
      );
      lines.push(
        "──────────────────────────────────────────────────────────────"
      );

      allRolls
        .slice(-12)
        .reverse()
        .forEach((roll) => {
          const d2 = roll[1];
          const d3 = roll[2];
          const col2 = ["1", "4"].includes(d2) ? "Outer" : "Inner";
          const col3 = ["1", "2"].includes(d3) ? "Low  " : "High ";
          const pattern = `${["1", "4"].includes(d2) ? "O" : "I"}-${
            ["1", "2"].includes(d3) ? "L" : "H"
          }`;

          lines.push(
            `${roll}  |    ${d2}    |    ${d3}    | ${col2.padEnd(
              5
            )}  | ${col3.padEnd(5)}  | ${pattern}`
          );
        });

      lines.push("");

      // Get current streaks from waveData if available
      if (kiyoWaveData?.waveAnalysis?.columns) {
        const col2 = kiyoWaveData.waveAnalysis.columns[0];
        const col3 = kiyoWaveData.waveAnalysis.columns[1];
        lines.push("Current Streaks:");
        lines.push(
          `  • Column 2: ${col2?.runLength || 0} consecutive ${
            col2?.currentLabel || "?"
          }`
        );
        lines.push(
          `  • Column 3: ${col3?.runLength || 0} consecutive ${
            col3?.currentLabel || "?"
          }`
        );
      } else {
        lines.push("Current Streaks:");
        lines.push(`  • Column 2: ___ consecutive ___`);
        lines.push(`  • Column 3: ___ consecutive ___`);
      }

      lines.push("");
      lines.push("");
    }

    // 🔥 NEW: Per-Window Breakdown
    if (kiyoLogs.length > 0) {
      lines.push("┌─────────────────────────────────────────────────────────┐");
      lines.push("│  📊 PER-WINDOW ANALYSIS                                 │");
      lines.push("└─────────────────────────────────────────────────────────┘");
      lines.push("");
      
      // Group logs by window (every 11 rolls)
      const windows = [];
      for (let i = 0; i < kiyoLogs.length; i += 11) {
        const windowLogs = kiyoLogs.slice(i, Math.min(i + 11, kiyoLogs.length));
        windows.push({
          index: Math.floor(i / 11),
          startRoll: i + 1,
          endRoll: Math.min(i + 11, kiyoLogs.length),
          logs: windowLogs
        });
      }
      
      windows.forEach((window, idx) => {
        const { startRoll, endRoll, logs } = window;
        
        // Calculate accuracy for this window
        let col2Hits = 0, col2Total = 0;
        let col3Hits = 0, col3Total = 0;
        let detectedCol2Pattern = null;
        let detectedCol3Pattern = null;
        
        logs.forEach((log, i) => {
          if (i === 0) return; // Skip first roll (no prediction)
          
          const prev = logs[i - 1];
          const actual = log.roll;
          const actualD2 = actual?.[1];
          const actualD3 = actual?.[2];
          
          // Col2 accuracy
          const c2Pred = prev?.waveData?.waveAnalysis?.columns?.[0]?.flipTarget;
          if (c2Pred && actualD2) {
            col2Total++;
            if (c2Pred.includes(actualD2)) col2Hits++;
          }
          
          // Col3 accuracy
          const c3Pred = prev?.waveData?.waveAnalysis?.columns?.[1]?.flipTarget;
          if (c3Pred && actualD3) {
            col3Total++;
            if (c3Pred.includes(actualD3)) col3Hits++;
          }
          
          // Get pattern from last roll in window
          if (i === logs.length - 1) {
            detectedCol2Pattern = log?.waveData?.waveAnalysis?.columns?.[0]?.patternDetected;
            detectedCol3Pattern = log?.waveData?.waveAnalysis?.columns?.[1]?.patternDetected;
          }
        });
        
        const col2Acc = col2Total > 0 ? ((col2Hits / col2Total) * 100).toFixed(1) : "N/A";
        const col3Acc = col3Total > 0 ? ((col3Hits / col3Total) * 100).toFixed(1) : "N/A";
        
        // Check for pattern transition
        let transitionMarker = "";
        if (idx > 0) {
          const prevWindow = windows[idx - 1];
          const prevLogs = prevWindow.logs;
          const prevLastLog = prevLogs[prevLogs.length - 1];
          const prevCol2Pattern = prevLastLog?.waveData?.waveAnalysis?.columns?.[0]?.patternDetected;
          const prevCol3Pattern = prevLastLog?.waveData?.waveAnalysis?.columns?.[1]?.patternDetected;
          
          const col2Changed = prevCol2Pattern?.type !== detectedCol2Pattern?.type;
          const col3Changed = prevCol3Pattern?.type !== detectedCol3Pattern?.type;
          
          if (col2Changed || col3Changed) {
            transitionMarker = " ⚠️ PATTERN CHANGED";
          }
        }
        
        lines.push(`Window ${idx + 1} (Rolls ${startRoll}-${endRoll}):${transitionMarker}`);
        lines.push(`  Col2: ${detectedCol2Pattern?.type || 'no pattern'} - ${col2Hits}/${col2Total} (${col2Acc}%)`);
        lines.push(`  Col3: ${detectedCol3Pattern?.type || 'no pattern'} - ${col3Hits}/${col3Total} (${col3Acc}%)`);
        
        if (detectedCol2Pattern || detectedCol3Pattern) {
          if (detectedCol2Pattern) {
            lines.push(`    → Col2: ${(detectedCol2Pattern.confidence * 100).toFixed(0)}% confidence`);
          }
          if (detectedCol3Pattern) {
            lines.push(`    → Col3: ${(detectedCol3Pattern.confidence * 100).toFixed(0)}% confidence`);
          }
        }
        
        lines.push("");
      });
    }

    // 🔥 NEW: Pattern Detection Status
    const lastLog = kiyoLogs[kiyoLogs.length - 1];
    if (lastLog?.waveData) {
      lines.push("┌─────────────────────────────────────────────────────────┐");
      lines.push("│  🎯 DETECTED PATTERNS                                   │");
      lines.push("└─────────────────────────────────────────────────────────┘");
      lines.push("");
      
      // Get pattern info from wave columns
      const col2Pattern = kiyoWaveData?.waveAnalysis?.columns?.[0]?.patternDetected;
      const col3Pattern = kiyoWaveData?.waveAnalysis?.columns?.[1]?.patternDetected;
      
      lines.push("COLUMN 2 (Outer/Inner):");
      if (col2Pattern) {
        lines.push(`  🎯 Pattern: ${col2Pattern.type}`);
        lines.push(`  📊 Confidence: ${(col2Pattern.confidence * 100).toFixed(0)}%`);
        lines.push(`  📏 Expected run: ${col2Pattern.runLength}`);
      } else {
        lines.push("  ⚠️ No clear pattern detected (using fallback logic)");
      }
      
      lines.push("");
      lines.push("COLUMN 3 (Low/High):");
      if (col3Pattern) {
        lines.push(`  🎯 Pattern: ${col3Pattern.type}`);
        lines.push(`  📊 Confidence: ${(col3Pattern.confidence * 100).toFixed(0)}%`);
        lines.push(`  📏 Expected run: ${col3Pattern.runLength}`);
      } else {
        lines.push("  ⚠️ No clear pattern detected (using fallback logic)");
      }
      
      lines.push("");
      
      // 🔥 NEW: Betting Recommendation
      const recommendation = kiyoWaveData?.waveAnalysis?.bettingRecommendation;
      if (recommendation) {
        lines.push("┌─────────────────────────────────────────────────────────┐");
        lines.push("│  🎯 BETTING RECOMMENDATION                              │");
        lines.push("└─────────────────────────────────────────────────────────┘");
        lines.push("");
        
        const col2Analysis = kiyoWaveData?.waveAnalysis?.columns?.[0];
        const col3Analysis = kiyoWaveData?.waveAnalysis?.columns?.[1];
        
        // Column 2 Status
        lines.push("COLUMN 2 (Outer/Inner):");
        if (recommendation.col2Status === 'good') {
          lines.push(`  ✅ BET - Clear pattern detected`);
          lines.push(`     Pattern: ${col2Analysis?.patternDetected?.type || 'N/A'}`);
          lines.push(`     Confidence: ${Math.round((col2Analysis?.confidence || 0) * 100)}%`);
        } else if (recommendation.col2Status === 'bad') {
          lines.push(`  ❌ SKIP - Chaotic pattern`);
          lines.push(`     Confidence: ${Math.round((col2Analysis?.confidence || 0) * 100)}%`);
          lines.push(`     Reason: Pattern too unstable`);
        } else {
          lines.push(`  ⚪ MONITOR - Building pattern`);
        }
        
        lines.push("");
        
        // Column 3 Status
        lines.push("COLUMN 3 (Low/High):");
        if (recommendation.col3Status === 'good') {
          lines.push(`  ✅ BET - Clear pattern detected`);
          lines.push(`     Pattern: ${col3Analysis?.patternDetected?.type || 'N/A'}`);
          lines.push(`     Confidence: ${Math.round((col3Analysis?.confidence || 0) * 100)}%`);
        } else if (recommendation.col3Status === 'bad') {
          lines.push(`  ❌ SKIP - Chaotic pattern`);
          lines.push(`     Confidence: ${Math.round((col3Analysis?.confidence || 0) * 100)}%`);
          lines.push(`     Reason: Pattern too unstable`);
        } else {
          lines.push(`  ⚪ MONITOR - Building pattern`);
        }
        
        lines.push("");
        
        // Overall Suggestion
        lines.push("OVERALL SUGGESTION:");
        lines.push(`  💡 ${recommendation.suggestion}`);
        lines.push(`     ${recommendation.message}`);
        
        lines.push("");
      }
    }

    // Footer
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("Generated by Kiyo Mode v3.0 - Pattern Recognition System");
    lines.push("═══════════════════════════════════════════════════════════");

    // Download the file
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Kiyo-Debug-v3-${now.toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToastMessage("✓ Debug file exported!");
  };
  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 sm:p-5 mt-4 relative">
      {isDebugMode && (
        <div className="absolute top-2 right-2 text-xs bg-violet-600/80 text-white px-2 py-1 rounded-full font-bold border border-violet-500/50 z-10">
          DEBUG MODE
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-200 shadow-lg z-50 animate-pulse">
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Import 2-str file */}
          <label className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/50 hover:bg-slate-700/60 border border-slate-600/50 text-slate-200 cursor-pointer">
            📥 Import
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/50 hover:bg-slate-700/60 border border-slate-600/50 text-slate-200 cursor-pointer"
          >
            ⬇ Export
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 cursor-pointer"
          >
            🗑 Clear
          </button>

          {/* Only show Kiyo export in kiyo-debug tab */}
          {activeTab === "kiyo-debug" && (
            <button
              onClick={handleDownloadKiyoDebug}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow"
            >
              📥 Download Kiyo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={[
              "px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition",
              activeTab === t.id
                ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                : "bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/70",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="space-y-3">
        {/* BACKTEST (debug mode only) */}
        {activeTab === "backtest" && isDebugMode && (
          <div className="bg-slate-950/40 border border-slate-700/50 rounded-xl p-3">
            {!backtestResults ? (
              <div className="text-sm text-slate-400">No backtest results.</div>
            ) : (
              <>
                <div className="text-sm text-slate-200 font-semibold mb-2">
                  Backtest Summary
                </div>

                {latestSessionStats ? (
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>
                      Session #{backtestResults.sessions.length} — rows:{" "}
                      {latestSessionStats.detailRows.length}
                    </div>
                    <div>
                      Main: {latestSessionStats.mainHits} | Alt:{" "}
                      {latestSessionStats.altHits} | Miss:{" "}
                      {latestSessionStats.misses}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No session.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* KIYO DEBUG TAB (shows snapshot info + download button already in header) */}
        {activeTab === "kiyo-debug" && (
          <div className="bg-slate-950/40 border border-slate-700/50 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-emerald-200">
                  Kiyo Debug Snapshot
                </div>
                <div className="text-xs text-slate-400">
                  Uses logs where <code>source="kiyo"</code> and{" "}
                  <code>kind="3"</code>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-200 space-y-1">
              <div>
                Latest combined rolls:{" "}
                <span className="text-slate-400">
                  {kiyoWaveData?.combinedRolls?.length ?? 0}
                </span>
              </div>
              <div>
                Latest prediction:{" "}
                <span className="text-slate-400">
                  {kiyoWaveData?.prediction?.prediction || "-"}{" "}
                  {kiyoWaveData?.prediction?.confidence != null
                    ? `(${Math.round(
                        kiyoWaveData.prediction.confidence * 100
                      )}%)`
                    : ""}
                </span>
              </div>
              <div>
                Latest smart prefix:{" "}
                <span className="text-slate-400">
                  {kiyoWaveData?.smartPrefix?.prediction
                    ? `${kiyoWaveData.smartPrefix.prediction}${
                        kiyoWaveData.smartPrefix.alt
                          ? ` / ${kiyoWaveData.smartPrefix.alt}`
                          : ""
                      }`
                    : "-"}
                </span>
              </div>
            </div>

            {/* 🔥 NEW: Adaptive System Stats */}
            {kiyoWaveData?.windowTracker && (
              <div className="mt-4 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-3">
                <div className="text-sm font-semibold text-cyan-300 mb-2">
                  🎯 Adaptive System Stats
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/40 rounded p-2">
                    <div className="text-slate-400 mb-1">Window Accuracy</div>
                    <div className="text-lg font-bold text-cyan-300">
                      {(kiyoWaveData.windowTracker.getCurrentWindowStats().accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {kiyoWaveData.windowTracker.getCurrentWindowStats().rollCount || 0} rolls
                    </div>
                  </div>
                  <div className="bg-slate-900/40 rounded p-2">
                    <div className="text-slate-400 mb-1">Best Predictor</div>
                    <div className="text-lg font-bold text-cyan-300">
                      {kiyoWaveData.windowTracker.getBestPredictor().predictor.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(kiyoWaveData.windowTracker.getBestPredictor().accuracy * 100).toFixed(0)}% ({kiyoWaveData.windowTracker.getBestPredictor().confidence})
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(kiyoWaveData.windowTracker.getWeights()).map(([pred, weight]) => (
                    <div key={pred} className="bg-slate-900/40 rounded p-1.5 text-center">
                      <div className="text-[10px] text-slate-400">{pred.toUpperCase()}</div>
                      <div className="text-sm font-bold text-cyan-300">{(weight * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 text-[11px] text-slate-500">
              Tip: If WaveC2/WaveC3 show “-” in export, it means the per-roll
              log didn’t include <code>waveData</code> at that moment (not just
              the latest snapshot).
            </div>
          </div>
        )}

        {/* LONG STRING TAB */}
        {activeTab === "long" && (
          <div className="bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Long String
                </div>
                <div className="text-[11px] text-slate-500">
                  Built from 2-str actuals (chronological).
                </div>
              </div>

              <button
                onClick={handleCopyLongString}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-800/50 hover:bg-slate-700/60 border border-slate-600/50 text-slate-200 cursor-pointer"
              >
                📋 Copy
              </button>
            </div>

            <div className="text-sm text-slate-200 font-mono break-all">
              {longString}
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              {["1", "2", "3", "4"].map((k) => (
                <div
                  key={k}
                  className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-2 text-center"
                >
                  <div className="text-slate-400">#{k}</div>
                  <div className="text-slate-200 font-semibold">
                    {digitCounts[k]}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700/50 pt-3">
              <div className="text-sm font-semibold text-slate-200 mb-2">
                Manual Decoder (paste long string)
              </div>
              <input
                value={manualLongInput}
                onChange={(e) => setManualLongInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                placeholder="e.g. 413241..."
              />

              {manualLong.cleaned && manualLong.cleaned.length >= 2 && (
                <div className="mt-3 text-xs text-slate-200 space-y-2">
                  <div className="text-slate-400">
                    cleaned:{" "}
                    <span className="text-slate-200 font-mono">
                      {manualLong.cleaned}
                    </span>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 mb-1">Pairs:</div>
                    <div className="font-mono break-all">
                      {manualLong.pairs.join(" ")}
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 mb-1">
                      Decoded (41/42/43/44):
                    </div>
                    <div className="font-mono break-all">
                      {manualLong.rolls.map((r) => r || "??").join(" ")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEFAULT LOG LIST (2/3/4/all/logs) */}
        {activeTab !== "long" &&
          activeTab !== "backtest" &&
          activeTab !== "kiyo-debug" && (
            <div className="bg-slate-950/40 border border-slate-700/50 rounded-xl p-3">
              {!filtered.length ? (
                <div className="text-sm text-slate-400">No logs.</div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {[...filtered]
                    .slice()
                    .reverse()
                    .slice(0, 200)
                    .map((log, i) => (
                      <div
                        key={`${log.ts}-${i}`}
                        className="text-[11px] text-slate-200 font-mono bg-slate-900/40 border border-slate-700/40 rounded-lg p-2"
                      >
                        {formatLine(log)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
      </div>

      {/* --- SUMMARY CALC (from table rows) --- */}
      {activeTab === "backtest" && isDebugMode && latestSessionStats && (
        <div className="bg-slate-950/40 border border-slate-700/50 rounded-xl p-3 text-xs">
          <div className="font-semibold text-slate-200 mb-2">
            Summary (from Backtest Table)
          </div>
          {/* Extracted values for easier reference */}
          {latestSessionStats.detailRows.length} rows total
          <br />
          Main hits: {latestSessionStats.mainHits} | Alt hits:{" "}
          {latestSessionStats.altHits} | Misses: {latestSessionStats.misses}
          <br />
          <br />
          {/* --- SUMMARY CALC (from table rows) --- */}
          {`WAVE PERFORMANCE:`}
          <br />
          {`  Column 2 Hits: ${latestSessionStats.c2Hits} / ${
            latestSessionStats.c2Total
          } (${
            latestSessionStats.c2Total
              ? (
                  (latestSessionStats.c2Hits / latestSessionStats.c2Total) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          {`  Column 3 Hits: ${latestSessionStats.c3Hits} / ${
            latestSessionStats.c3Total
          } (${
            latestSessionStats.c3Total
              ? (
                  (latestSessionStats.c3Hits / latestSessionStats.c3Total) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          {`  Combined: ${latestSessionStats.combHits} / ${
            latestSessionStats.combTotal
          } (${
            latestSessionStats.combTotal
              ? (
                  (latestSessionStats.combHits / latestSessionStats.combTotal) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          <br />
          {`PREFIX PERFORMANCE:`}
          <br />
          {`  Main Hits: ${latestSessionStats.mainHits} (${
            latestSessionStats.prefixAttempts
              ? (
                  (latestSessionStats.mainHits /
                    latestSessionStats.prefixAttempts) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          {`  Alt Hits: ${latestSessionStats.altHits} (${
            latestSessionStats.prefixAttempts
              ? (
                  (latestSessionStats.altHits /
                    latestSessionStats.prefixAttempts) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          {`  Total: ${
            latestSessionStats.mainHits + latestSessionStats.altHits
          } / ${latestSessionStats.prefixAttempts} (${
            latestSessionStats.prefixAttempts
              ? (
                  ((latestSessionStats.mainHits + latestSessionStats.altHits) /
                    latestSessionStats.prefixAttempts) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
          <br />
          <br />
          {`ALIGNED BETS (When both wave columns + prefix agree):`}
          <br />
          {`  Total: ${latestSessionStats.alignedTotal}`}
          <br />
          {`  Hits: ${latestSessionStats.alignedHits} / ${
            latestSessionStats.alignedTotal
          } (${
            latestSessionStats.alignedTotal
              ? (
                  (latestSessionStats.alignedHits /
                    latestSessionStats.alignedTotal) *
                  100
                ).toFixed(1)
              : "0.0"
          }%)`}
        </div>
      )}
    </div>
  );
}
