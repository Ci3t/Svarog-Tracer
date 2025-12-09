import React, { useMemo, useState } from "react";
import { runBacktest } from "../utils/backtester.js";

const BASE_TABS = [
  { id: "2", label: "2-str" },
  { id: "3", label: "3-str" },
  { id: "4", label: "4-str" },
  { id: "all", label: "Merged" },
  { id: "long", label: "Long String" },
  { id: "logs", label: "Live Logs" },
  { id: "kiyo-debug", label: "KiyoDebug" }, // 🔥 NEW TAB
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
 */
/**
 * Expand a long-string of digits (1–4) into:
 *  - pairs: Caesar line codes, e.g. "41 12 24 …"
 *  - rolls: decoded 2-str values, e.g. "41 41 42 …"
 */
/**
 * Expand a long-string of digits (1–4) into:
 *  - pairs: Caesar line codes, e.g. "41 12 24 …"
 *  - rolls: decoded 2-str values, e.g. "41 41 42 …"
 */
function expandManualLongString(longStr) {
  const cleaned = (longStr || "").replace(/[^1-4]/g, "");
  if (cleaned.length < 2) return { cleaned, pairs: [], rolls: [] };

  const digits = cleaned.split("");
  const pairs = [];
  const rolls = [];

  // ✅ Step 1 — first full Caesar pair
  let prevPair = digits[0] + digits[1];
  pairs.push(prevPair);
  rolls.push(CAESAR_TO_BASE[prevPair] || null);

  // ✅ Step 2 — sliding LAST-digit only
  for (let i = 2; i < digits.length; i++) {
    const nextPair = prevPair[1] + digits[i]; // ✅ ONLY LAST DIGIT SLIDES
    pairs.push(nextPair);

    const decoded = CAESAR_TO_BASE[nextPair] || null;
    rolls.push(decoded); // ✅ DECODED ONLY — NO 4xx

    prevPair = nextPair;
  }

  return { cleaned, pairs, rolls };
}

export default function DebugPanel({
  debugLogs,
  onClearLogs,
  onImportLogs,
  isDebugMode = false,
  kiyoWaveData = null, // 🔥 NEW: Accept Kiyo wave analysis data
}) {
  const [activeTab, setActiveTab] = useState("logs");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
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
      .map((log) => String(log.actual).slice(0, 2)) // ✅ RAW PAIRS
      .filter((val) => LONG_VALS.includes(val));

    if (rolls.length === 0) return "";

    // ✅ FIRST RAW INPUT IS USED FULLY
    let longString = rolls[0];

    // ✅ ONLY SECOND DIGIT OF EACH NEXT RAW INPUT
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
    if (!longString || longString === "—") {
      return { 1: 0, 2: 0, 3: 0, 4: 0 };
    }
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const char of longString) {
      if (counts.hasOwnProperty(char)) counts[char]++;
    }
    return counts;
  }, [longString]);

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
      // Try multiple time formats
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
        // Try 24-hour format [HH:MM:SS]
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

      // 🔥 FIX: Check for source in the line (added by newer exports)
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
        source, // 🔥 FIX: Preserve source
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

  // Add this function before the return statement (around line 680):

  // Replace the handleDownloadKiyoDebug function (around line 680):

  const handleDownloadKiyoDebug = () => {
    if (!kiyoWaveData) return;

    const lines = [
      "═══════════════════════════════════════════════════════════",
      "KIYO MODE DEBUG ANALYSIS EXPORT v2.0",
      "═══════════════════════════════════════════════════════════\n",
      `Generated: ${new Date().toLocaleString()}\n`,
    ];

    // 🔥 ENHANCED: WAVE ANALYSIS WITH URGENCY LEVELS
    if (kiyoWaveData.waveAnalysis) {
      lines.push("📊 WAVE PATTERN ANALYSIS (Enhanced)");
      lines.push("═══════════════════════════════════════════\n");

      const wa = kiyoWaveData.waveAnalysis;

      // Summary stats with new fields
      lines.push(
        `Average Swap Rate: ${(parseFloat(wa.avgSwapRate) * 100).toFixed(0)}%`
      );
      lines.push(`Flip Columns: ${wa.flipColumns}/3`);
      lines.push(`Sticky Columns: ${wa.stickyColumns}/3`);
      lines.push(`Compound Confidence: ${wa.compoundConfidence}`);

      // 🔥 NEW: Lookback window used
      if (wa.lookbackUsed) {
        lines.push(`Lookback Window: ${wa.lookbackUsed} rolls (dynamic)`);
      }

      // 🔥 NEW: Ignored columns
      if (wa.ignoredColumns && wa.ignoredColumns.length > 0) {
        lines.push(
          `🚫 Ignored Columns: ${wa.ignoredColumns.join(
            ", "
          )} (≥70% swap - too volatile)`
        );
      }

      // 🔥 NEW: Post-flip columns
      if (wa.postFlipColumns && wa.postFlipColumns.length > 0) {
        lines.push(
          `⏸️ Post-Flip Cooldown: Column ${wa.postFlipColumns.join(
            ", "
          )} (just flipped)`
        );
      }

      lines.push("");

      // Column details with urgency
      if (wa.columns) {
        wa.columns.forEach((col) => {
          const urgencyEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
            low: "⚪",
            none: "🔵",
            skip: "🟣",
          };

          const urgencyBadge = urgencyEmoji[col.urgency] || "⚫";

          lines.push(
            `─── Column ${col.column}: ${col.name} (${
              col.label
            }) ${urgencyBadge} ${col.urgency?.toUpperCase() || "UNKNOWN"} ───`
          );
          lines.push(
            `  Pair A (${col.scheme.pairALabel}): [${col.scheme.pairA.join(
              ", "
            )}]`
          );
          lines.push(
            `  Pair B (${col.scheme.pairBLabel}): [${col.scheme.pairB.join(
              ", "
            )}]`
          );
          lines.push(`  ---`);
          lines.push(
            `  Current Pair: ${col.currentPair} (${col.currentLabel})`
          );
          lines.push(`  Run Length: ${col.runLength} consecutive`);
          lines.push(`  Rhythm Pattern: ${col.rhythmDisplay}`);
          lines.push(
            `  Swap Rate: ${(col.swapRate * 100).toFixed(0)}% (${
              col.swapRateLabel
            })`
          );
          lines.push(`  Status: ${col.status}`);
          lines.push(
            `  ${urgencyBadge} Urgency: ${
              col.urgency?.toUpperCase() || "UNKNOWN"
            }`
          );
          lines.push(`  Confidence: ${Math.round(col.confidence * 100)}%`);
          lines.push(`  ${col.message}`);

          if (col.status === "due_to_flip") {
            lines.push(
              `  ⚠️ FLIP TARGET: ${col.flipLabel} [${col.flipTarget.join(
                ", "
              )}]`
            );
          }

          // 🔥 NEW: Post-flip warning
          if (col.missedFlip?.justFlipped) {
            lines.push(
              `  ⏸️ POST-FLIP: Just flipped from ${col.missedFlip.previousRun}-run ${col.missedFlip.previousPair}`
            );
            lines.push(`  ⚠️ ${col.missedFlip.recommendation}`);
          }

          // 🔥 NEW: Ignored warning
          if (col.isIgnored) {
            lines.push(
              `  🚫 IGNORED: Too volatile (≥70% swap) - excluded from analysis`
            );
          }

          lines.push("");
        });
      }

      // Focus Column with urgency
      if (wa.focusColumn) {
        lines.push("\n🎯 FOCUS COLUMN (Highest Urgency + Confidence)");
        lines.push("───────────────────────────────────");
        const fc = wa.focusColumn[1];

        lines.push(`Column: ${fc.scheme?.name || "Unknown"}`);
        lines.push(
          `Urgency: ${fc.urgency?.toUpperCase() || "UNKNOWN"} ${fc.icon || ""}`
        );
        lines.push(`Pattern: ${fc.rhythmDisplay}`);
        lines.push(`Current: ${fc.currentLabel} (Run: ${fc.run.length})`);
        lines.push(`Expected Flip: ${fc.flipLabel}`);
        lines.push(`Flip Targets: [${fc.flipTarget.join(", ")}]`);
        lines.push(`Confidence: ${Math.round(fc.confidence * 100)}%`);
        lines.push(`Swap Rate: ${(fc.swapRate * 100).toFixed(0)}%`);
        lines.push("");
      }
    }

    // CURRENT PREDICTION
    if (kiyoWaveData.prediction) {
      lines.push("\n🎯 CURRENT PREDICTION");
      lines.push("═══════════════════════════════════════════\n");

      const pred = kiyoWaveData.prediction;
      lines.push(`Main Prediction: ${pred.prediction}`);
      lines.push(`Confidence: ${Math.round(pred.confidence * 100)}%`);
      if (pred.alt) {
        lines.push(`Alternative: ${pred.alt}`);
      }
      lines.push(`Mode: ${pred.mode}`);

      if (pred.multiColumnAgreement) {
        lines.push(`✨ Multi-Column Agreement: YES`);
      }

      if (pred.debug) {
        lines.push(`\n  Debug Details:`);
        lines.push(
          `  Vote Strength: ${(
            parseFloat(pred.debug.voteStrength) * 100
          ).toFixed(1)}%`
        );
        if (pred.debug.flipColumns) {
          lines.push(
            `  Flip Columns: ${pred.debug.flipColumns
              .map((c) => `Col${c.col} (run:${c.runLength})`)
              .join(", ")}`
          );
        }
        if (pred.debug.avgSwapRate) {
          lines.push(
            `  Avg Swap Rate: ${(
              parseFloat(pred.debug.avgSwapRate) * 100
            ).toFixed(0)}%`
          );
        }
      }
      lines.push("");

      if (pred.isDisagreement) {
        lines.push("⚠️ DISAGREEMENT DETAILS");
        lines.push("───────────────────────────────────");
        lines.push(`Tracer Predicts: ${pred.prediction}`);
        const waveTarget = pred.waveTarget || [];
        lines.push(`Wave Expects: 4${waveTarget.join(", 4")}`);
        lines.push(`Reason: Wave pattern suggests flip needed\n`);
      }
    }

    // 🔥 ENHANCED: STRATEGIC TIER ASSESSMENT
    if (kiyoWaveData.strategicTier) {
      lines.push("\n💎 STRATEGIC TIER ASSESSMENT (Enhanced)");
      lines.push("═══════════════════════════════════════════\n");

      const tierEmoji = {
        S: "🔥",
        A: "⚡",
        B: "🤷",
      };

      lines.push(
        `🏆 TIER: ${tierEmoji[kiyoWaveData.strategicTier] || ""} ${
          kiyoWaveData.strategicTier
        }`
      );
      lines.push(
        `📊 Effective Reliability: ${kiyoWaveData.effectiveReliability}%`
      );
      lines.push(`🎯 Recommended Action: ${kiyoWaveData.recommendedAction}`);
      lines.push(`🔗 Alignment: ${kiyoWaveData.alignment}`);

      if (kiyoWaveData.tierReasoning && kiyoWaveData.tierReasoning.length > 0) {
        lines.push("\nReasoning:");
        kiyoWaveData.tierReasoning.forEach((reason) => {
          lines.push(`  ${reason}`);
        });
      }

      if (kiyoWaveData.conflictResolution) {
        lines.push(
          `\n⚖️ Conflict Resolution: ${kiyoWaveData.conflictResolution}`
        );
      }

      if (kiyoWaveData.reliabilityFactors) {
        const rf = kiyoWaveData.reliabilityFactors;
        lines.push("\nReliability Factors:");
        lines.push(`  Sticky Columns: ${rf.stickyColumns}/3`);
        lines.push(`  Flip Columns: ${rf.flipColumns}/3`);
        lines.push(`  Avg Swap Rate: ${(rf.avgSwapRate * 100).toFixed(0)}%`);
        lines.push(`  Compound Confidence: ${rf.compoundConfidence}`);
        if (rf.focusColumn) {
          lines.push(
            `  Focus Column Swap: ${(rf.focusColumn.swapRate * 100).toFixed(
              0
            )}%`
          );
          lines.push(`  Focus Column Run: ${rf.focusColumn.run.length}`);
          lines.push(
            `  Focus Column Urgency: ${
              rf.focusColumn.urgency?.toUpperCase() || "UNKNOWN"
            }`
          );
        }
      }

      // 🔥 ENHANCED: Tier guide with urgency
      lines.push("\n📖 TIER GUIDE (Updated):");
      lines.push("  🔥 TIER S: Bet good relics (75-90% reliability)");
      lines.push("      • 🔴 CRITICAL urgency (5+ run) + Sticky (<30%)");
      lines.push("      • 🟠 HIGH urgency (4 run) + Sticky (<40%)");
      lines.push("      • Wave + Prefix perfectly aligned");
      lines.push("  ⚡ TIER A: Bet okay relics (60-70% reliability)");
      lines.push("      • 🟡 MEDIUM urgency (3 run) + Moderate sticky (<50%)");
      lines.push("      • MODERATE confidence (1 flip + sticky)");
      lines.push("      • Prefix high conf (≥65%) + LOW volatility (<60%)");
      lines.push("  🤷 TIER B: Skip or bet trash (45-60% reliability)");
      lines.push("      • BALANCED (0 flips) - No strong patterns");
      lines.push("      • High volatility (≥60% avg swap) - Unstable");
      lines.push("      • ⚪ LOW/🔵 NONE urgency - Weak signals");
      lines.push("      • 🟣 POST-FLIP cooldown - Just flipped");
      lines.push("");
    }

    // PAIRING HISTORY
    if (kiyoWaveData.pairingViz && kiyoWaveData.pairingViz.length > 0) {
      lines.push("\n🎨 WAVE PAIRING HISTORY (Last 12 Rolls)");
      lines.push("═══════════════════════════════════════════\n");

      lines.push("LEGEND:");
      lines.push("  Column 1 (Odds/Evens): Odds [1,3] | Evens [2,4]");
      lines.push("  Column 2 (Outer/Inner): Outer [1,4] | Inner [2,3]");
      lines.push("  Column 3 (Low/High): Low [1,2] | High [3,4]");
      lines.push("");

      lines.push(
        "Roll | Column 1        | Column 2        | Column 3        | Pattern"
      );
      lines.push("─".repeat(75));

      kiyoWaveData.pairingViz.forEach((row) => {
        const col1Label = row.col1.label.padEnd(15);
        const col2Label = row.col2.label.padEnd(15);
        const col3Label = row.col3.label.padEnd(15);
        const pattern = `${row.col1.isA ? "A" : "B"}${
          row.col2.isA ? "A" : "B"
        }${row.col3.isA ? "A" : "B"}`;

        lines.push(
          `${row.roll.padEnd(
            5
          )} | ${col1Label} | ${col2Label} | ${col3Label} | ${pattern}`
        );
      });
      lines.push("");
    }

    // COMBINED ROLLS CONTEXT
    if (kiyoWaveData.combinedRolls) {
      lines.push("\n📈 COMBINED ROLLS CONTEXT");
      lines.push("═══════════════════════════════════════════\n");
      lines.push(`Total Rolls: ${kiyoWaveData.combinedRolls.length}`);
      lines.push(
        `Recent 20: ${kiyoWaveData.combinedRolls.slice(-20).join(" → ")}`
      );
      lines.push("");
    }

    // 🔥 ENHANCED: ANALYSIS SUMMARY
    lines.push("\n📋 ANALYSIS SUMMARY");
    lines.push("═══════════════════════════════════════════\n");

    if (kiyoWaveData.waveAnalysis) {
      const wa = kiyoWaveData.waveAnalysis;

      if (wa.flipCols && wa.flipCols.length > 0) {
        lines.push(`Columns Due to Flip (${wa.flipCols.length}):`);
        wa.flipCols.forEach((col) => {
          const urgencyEmoji = {
            critical: "🔴",
            high: "🟠",
            medium: "🟡",
          };
          lines.push(
            `  ${urgencyEmoji[col.urgency] || "•"} ${col.name}: ${
              col.currentLabel
            } → ${col.flipLabel} (${Math.round(
              col.confidence * 100
            )}%, ${col.urgency?.toUpperCase()})`
          );
        });
      } else {
        lines.push(`Columns Due to Flip: None`);
      }

      lines.push("");
      lines.push(`Swap Rate Analysis:`);
      lines.push(
        `  Average: ${(parseFloat(wa.avgSwapRate) * 100).toFixed(0)}% ${
          parseFloat(wa.avgSwapRate) >= 0.7
            ? "(HIGH - Volatile)"
            : parseFloat(wa.avgSwapRate) >= 0.4
            ? "(MODERATE)"
            : "(LOW - Sticky)"
        }`
      );
      lines.push(`  Sticky Columns: ${wa.stickyColumns}/3`);
      lines.push(`  Compound Confidence: ${wa.compoundConfidence}`);

      if (wa.ignoredColumns && wa.ignoredColumns.length > 0) {
        lines.push(
          `  🚫 Ignored: Column ${wa.ignoredColumns.join(", ")} (≥70% swap)`
        );
      }

      if (wa.postFlipColumns && wa.postFlipColumns.length > 0) {
        lines.push(`  ⏸️ Post-Flip: Column ${wa.postFlipColumns.join(", ")}`);
      }
    }

    if (kiyoWaveData.prediction) {
      lines.push("");
      lines.push(
        `Final Prediction: ${kiyoWaveData.prediction.prediction} (${Math.round(
          kiyoWaveData.prediction.confidence * 100
        )}%)`
      );
    }

    // 🔥 ENHANCED: Explanation with urgency system
    lines.push("\n═══════════════════════════════════════════════════════════");
    lines.push("EXPLANATION:");
    lines.push("  Run Length: # of consecutive times same pattern appeared");
    lines.push(
      "  Swap Rate: % of time column changes (0%=sticky, 100%=alternating)"
    );
    lines.push("");
    lines.push("  Urgency Levels (NEW!):");
    lines.push(
      "    🔴 CRITICAL (5+ run): 75-90% confidence - HIGHEST priority"
    );
    lines.push("    🟠 HIGH (4 run): 70% confidence - Very reliable");
    lines.push("    🟡 MEDIUM (3 run): 65% confidence - Use with caution");
    lines.push("    ⚪ LOW (2 run): 55% confidence - Uncertain");
    lines.push("    🔵 NONE (1 run): 50% confidence - Just started");
    lines.push(
      "    🟣 SKIP (post-flip): Pattern just flipped - cooldown needed"
    );
    lines.push("");
    lines.push("  Status:");
    lines.push("    • due_to_flip: 3+ consecutive, flip highly likely");
    lines.push("    • could_go_either_way: 2 consecutive, uncertain");
    lines.push("    • likely_continue: 1 occurrence, may continue");
    lines.push("    • post_flip_cooldown: Just flipped, skip this column");
    lines.push("    • ignored: ≥70% swap rate, excluded from analysis");
    lines.push("");
    lines.push("  Compound Confidence: HIGH when 2+ columns agree on flip");
    lines.push(
      "  Dynamic Lookback: 20 rolls (sticky), 15 (moderate), 12 (volatile)"
    );
    lines.push("═══════════════════════════════════════════════════════════");

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `Kiyo-Debug-v2-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <div className="flex flex-wrap gap-1 mb-3 text-[12px]">
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

      {/* ═══ KIYO DEBUG TAB 🔥 NEW ═══ */}
      {activeTab === "kiyo-debug" && (
        <div className="space-y-4 p-4 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 rounded-2xl border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="text-center flex-1">
              <h4 className="text-lg font-black text-emerald-400 mb-1">
                🌊 Kiyo Mode Debug Analysis
              </h4>
              <p className="text-xs text-slate-400">
                Wave pattern data + predictions for analysis
              </p>
            </div>
            {kiyoWaveData && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Download clicked!", kiyoWaveData); // DEBUG
                  handleDownloadKiyoDebug();
                }}
                className="px-4 py-2 text-xs rounded-lg font-semibold whitespace-nowrap transition bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg"
              >
                📥 Download
              </button>
            )}
          </div>

          {kiyoWaveData ? (
            <div className="space-y-4">
              {/* WAVE PATTERN ANALYSIS */}
              {kiyoWaveData.waveAnalysis && (
                <div className="bg-slate-950/60 rounded-xl border border-emerald-500/40 p-4">
                  <div className="text-sm font-bold text-emerald-300 mb-3">
                    📊 Wave Pattern Analysis
                  </div>

                  {/* Column Analysis Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {Object.entries(
                      kiyoWaveData.waveAnalysis.columnAnalysis
                    ).map(([key, col]) => (
                      <div
                        key={key}
                        className={`rounded-lg p-3 border ${
                          col.status === "expect_flip"
                            ? "bg-orange-950/60 border-orange-500/50"
                            : col.status.includes("favor")
                            ? "bg-slate-900/60 border-slate-700/50"
                            : "bg-slate-900/40 border-slate-700/30"
                        }`}
                      >
                        <div className="text-[10px] font-bold text-slate-300 mb-2">
                          {col.scheme.name}
                        </div>

                        <div className="space-y-1.5 text-[9px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">A Count:</span>
                            <span className="text-emerald-300 font-bold">
                              {col.aCountRecent}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">B Count:</span>
                            <span className="text-amber-300 font-bold">
                              {col.bCountRecent}
                            </span>
                          </div>

                          <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
                              style={{
                                width: `${
                                  (col.aCountRecent /
                                    (col.aCountRecent + col.bCountRecent ||
                                      1)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>

                          <div className="pt-1 border-t border-slate-700/30">
                            <div className="text-[8px] text-slate-400 mb-1">
                              Status
                            </div>
                            <div
                              className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-bold ${
                                col.status === "expect_flip"
                                  ? "bg-orange-900/60 text-orange-300"
                                  : "bg-slate-800/60 text-slate-300"
                              }`}
                            >
                              {col.status === "expect_flip"
                                ? "⚠️ FLIP"
                                : col.status === "balanced"
                                ? "Balanced"
                                : "Favor"}
                            </div>
                          </div>

                          <div className="text-[8px] text-slate-400">
                            Conf:{" "}
                            <span className="text-emerald-300 font-bold">
                              {col.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Focus Column Detail */}
                  {kiyoWaveData.waveAnalysis.focusColumn && (
                    <div className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/40 rounded-lg p-3 border border-cyan-500/40">
                      <div className="text-[10px] font-bold text-cyan-300 mb-2">
                        🎯 Focus Column (Most Predictable)
                      </div>
                      <div className="space-y-1.5 text-[9px]">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Column:</span>
                          <span className="text-cyan-300 font-bold">
                            {
                              kiyoWaveData.waveAnalysis.focusColumn[1].scheme
                                .name
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Dominant:</span>
                          <span className="text-orange-300 font-bold">
                            {
                              kiyoWaveData.waveAnalysis.focusColumn[1]
                                .dominantLabel
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">
                            Expect Flip to:
                          </span>
                          <span className="text-emerald-300 font-bold">
                            {
                              kiyoWaveData.waveAnalysis.focusColumn[1]
                                .oppositeLabel
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Confidence:</span>
                          <span className="text-cyan-300 font-bold">
                            {
                              kiyoWaveData.waveAnalysis.focusColumn[1]
                                .confidence
                            }
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PREDICTION DATA */}
              {kiyoWaveData.prediction && (
                <div className="bg-slate-950/60 rounded-xl border border-violet-500/40 p-4">
                  <div className="text-sm font-bold text-violet-300 mb-3">
                    🎯 Current Prediction
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Main */}
                    <div className="bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30">
                      <div className="text-[9px] text-slate-300 mb-1">Main</div>
                      <div className="text-3xl font-mono font-black text-emerald-300 mb-1">
                        {kiyoWaveData.prediction.prediction}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-300">
                        {Math.round(kiyoWaveData.prediction.confidence * 100)}%
                      </div>
                    </div>

                    {/* Alt */}
                    {kiyoWaveData.prediction.alt && (
                      <div className="bg-amber-900/40 rounded-lg p-3 border border-amber-500/30">
                        <div className="text-[9px] text-slate-300 mb-1">
                          Alternative
                        </div>
                        <div className="text-3xl font-mono font-black text-amber-300 mb-1">
                          {kiyoWaveData.prediction.alt}
                        </div>
                        <div className="text-[10px] text-amber-300">
                          Alt Option
                        </div>
                      </div>
                    )}

                    {/* Mode */}
                    <div className="bg-violet-900/40 rounded-lg p-3 border border-violet-500/30">
                      <div className="text-[9px] text-slate-300 mb-1">Mode</div>
                      <div className="text-sm font-bold text-violet-300 break-words">
                        {kiyoWaveData.prediction.mode}
                      </div>
                      <div className="text-[8px] text-violet-300 mt-1">
                        {kiyoWaveData.prediction.isDisagreement
                          ? "⚠️ Disagreement"
                          : "✓ Aligned"}
                      </div>
                    </div>
                  </div>

                  {kiyoWaveData.prediction.isDisagreement && (
                    <div className="mt-3 bg-red-950/60 rounded-lg p-2 border border-red-500/40 text-[9px]">
                      <div className="font-bold text-red-300 mb-1">
                        ⚠️ Wave Disagreement
                      </div>
                      <div className="text-red-200">
                        Tracer predicts:{" "}
                        <span className="font-mono font-bold">
                          {kiyoWaveData.prediction.prediction}
                        </span>
                        <br />
                        Wave expects:{" "}
                        <span className="font-mono font-bold text-emerald-300">
                          4{kiyoWaveData.prediction.waveTarget?.join(", 4")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAIRING VIZ TABLE */}
              {kiyoWaveData.pairingViz &&
                kiyoWaveData.pairingViz.length > 0 && (
                  <div className="bg-slate-950/60 rounded-xl border border-slate-700/50 p-4">
                    <div className="text-sm font-bold text-slate-300 mb-3">
                      🎨 Wave Pairing History (Last{" "}
                      {kiyoWaveData.pairingViz.length})
                    </div>

                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-[10px] border-collapse bg-slate-950/50">
                        <thead className="bg-slate-900/80 sticky top-0">
                          <tr>
                            <th className="p-2 text-left text-slate-300 font-semibold border border-slate-700/30">
                              Roll
                            </th>
                            <th className="p-2 text-center text-slate-300 font-semibold border border-slate-700/30">
                              Col 1
                            </th>
                            <th className="p-2 text-center text-slate-300 font-semibold border border-slate-700/30">
                              Col 2
                            </th>
                            <th className="p-2 text-center text-slate-300 font-semibold border border-slate-700/30">
                              Col 3
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {kiyoWaveData.pairingViz.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-800/40 border-t border-slate-700/30 even:bg-slate-950/20"
                            >
                              <td className="p-2 font-mono font-bold text-slate-200 border border-slate-700/30">
                                {row.roll}
                              </td>
                              <td
                                className={`p-2 text-center font-bold text-[9px] border border-slate-700/30 ${
                                  row.col1.isA
                                    ? "bg-emerald-900/40 text-emerald-300"
                                    : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {row.col1.label.split(" ")[0]}
                              </td>
                              <td
                                className={`p-2 text-center font-bold text-[9px] border border-slate-700/30 ${
                                  row.col2.isA
                                    ? "bg-emerald-900/40 text-emerald-300"
                                    : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {row.col2.label.split(" ")[0]}
                              </td>
                              <td
                                className={`p-2 text-center font-bold text-[9px] border border-slate-700/30 ${
                                  row.col3.isA
                                    ? "bg-emerald-900/40 text-emerald-300"
                                    : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {row.col3.label.split(" ")[0]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-[9px] text-slate-400 bg-slate-900/40 rounded p-2 border border-slate-700/30">
                      <span className="text-emerald-300 font-semibold">
                        Green
                      </span>{" "}
                      = Pattern A dominant |{" "}
                      <span className="text-amber-300 font-semibold">
                        Orange
                      </span>{" "}
                      = Pattern B dominant
                    </div>
                  </div>
                )}

              {/* COMBINED ROLLS */}
              {kiyoWaveData.combinedRolls && (
                <div className="bg-slate-950/60 rounded-xl border border-slate-700/50 p-4">
                  <div className="text-sm font-bold text-slate-300 mb-2">
                    📈 Combined Rolls Context
                  </div>
                  <div className="text-[10px] text-slate-200 font-mono break-all bg-slate-900/40 rounded p-2 border border-slate-700/30">
                    {kiyoWaveData.combinedRolls.join(" → ")}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-2">
                    Total: {kiyoWaveData.combinedRolls.length} rolls analyzed
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              No Kiyo mode data available. Enter Kiyo Mode and make a prediction
              first.
            </div>
          )}
        </div>
      )}

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

          {backtestResults ? (
            <>
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

              {latestSessionStats && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Session #{latestSessionStats.session.session} – detailed
                      view
                    </span>
                    <span>
                      {latestSessionStats.session.valid} valid /
                      {latestSessionStats.session.tests} total
                    </span>
                  </div>

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
                      <div className="text-[11px] text-slate-300 mb-1">
                        Misses
                      </div>
                      <div className="text-2xl font-black text-rose-300">
                        {latestSessionStats.misses}
                      </div>
                    </div>
                  </div>

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
                          <th className="p-2 text-left text-slate-300">
                            Actual
                          </th>
                          <th className="p-2 text-left text-slate-300">
                            Result
                          </th>
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
                              <td className="p-2 text-slate-200">
                                {row.actual}
                              </td>
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
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              No backtest data. Import or record some rolls first.
            </div>
          )}
        </div>
      )}

      {/* ═══ LONG STRING TAB ═══ */}
      {activeTab === "long" && (
        <div className="space-y-4">
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
        <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 px-3 py-2 max-h-52 sm:max-h-64 overflow-y-auto text-[10px] sm:text-[11px] font-mono leading-relaxed space-y-1">
          {filtered.length === 0 ? (
            <div className="text-slate-500">No debug entries yet.</div>
          ) : (
            filtered.map((log, idx) => {
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
                  key={`${log.ts}-${log.kind}-${log.actual}-${idx}`}
                  className={color}
                >
                  {formatLine(log)}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Mode Accuracy Stats */}
      {modeStats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="text-xs text-slate-300 font-semibold mb-2">
            📊 Current Session Mode Accuracy
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-[10px]">
            {modeStats.map((stat) => (
              <div
                key={stat.mode}
                className="bg-slate-950/60 rounded-lg border border-slate-700/50 p-2"
              >
                <div className="text-slate-400 mb-1 truncate font-semibold">
                  {stat.mode}
                </div>
                <div className="text-lg font-black text-violet-400 mb-1">
                  {stat.pct}%
                </div>
                <div className="text-[9px] text-slate-500">
                  {stat.hits}/{stat.total}
                </div>
                <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-violet-500"
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
