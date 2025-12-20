// KiyoModeCard.jsx - BEAST MODE v2 (Confidence-Aware, No BS)
import React, { useState, useMemo, useEffect, useRef } from "react";
import { predictNext3EU, predictWithPrefix } from "../utils/predictNext";
import AccuracyHeaderBar from "./kiyo/AccuracyHeaderBar";

import {
  EU_SEQUENTIAL_3STR_RECENT,
  EU_PATCH_INFO,
} from "../utils/euLiveSheetData";
import {
  NA_SEQUENTIAL_3STR_RECENT,
  NA_PATCH_INFO,
} from "../utils/naLiveSheetData";
import {
  ASIA_SEQUENTIAL_3STR_RECENT,
  ASIA_PATCH_INFO,
} from "../utils/asiaLiveSheetData";
import {
  ALL_SEQUENTIAL_3STR_RECENT,
  ALL_PATCH_INFO,
} from "../utils/allLiveSheetData";

import { translateTo4 } from "../utils/stringHelpers";

import TestRollsInput from "./kiyo/TestRollsInput";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import FiveMinWindowTracker from "./FiveMinWindowTracker";
import GuideModal from "./kiyo/GuideModal";
import AdvancedToolsSection from "./AdvancedToolsSection";
import { useFiveMinuteWindowRolls } from "../utils/useFiveMinuteWindowRolls";

const WAVE_SCHEMES = {
  col1: {
    name: "Column 1",
    label: "Odds/Evens",
    pairA: ["1", "3"],
    pairB: ["2", "4"],
    pairALabel: "Odd",
    pairBLabel: "Even",
  },
  col2: {
    name: "Column 2",
    label: "Outer/Inner",
    pairA: ["1", "4"],
    pairB: ["2", "3"],
    pairALabel: "Outer",
    pairBLabel: "Inner",
  },
  col3: {
    name: "Column 3",
    label: "Low/High",
    pairA: ["1", "2"],
    pairB: ["3", "4"],
    pairALabel: "Low",
    pairBLabel: "High",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 BEAST MODE v2: CONFIDENCE-AWARE WAVE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeColumnWave(rolls, scheme, digitPosition) {
  if (!rolls || rolls.length < 4) {
    return {
      valid: false,
      currentSide: null,
      currentLabel: "—",
      runLength: 0,
      dominance: 0,
      dominantSide: null,
      swapRate: 0,
      action: "SKIP",
      confidence: 0.3,
      reliability: "NONE",
      betAdvice: "SKIP",
      message: "Need 4+ rolls",
      flipTarget: [],
      flipLabel: "—",
    };
  }

  const states = rolls
    .map((r) => {
      const digit = String(r)[digitPosition];
      if (scheme.pairA.includes(digit)) return "A";
      if (scheme.pairB.includes(digit)) return "B";
      return null;
    })
    .filter(Boolean);

  if (states.length < 4) {
    return {
      valid: false,
      currentSide: null,
      currentLabel: "—",
      runLength: 0,
      dominance: 0,
      dominantSide: null,
      swapRate: 0,
      action: "SKIP",
      confidence: 0.3,
      reliability: "NONE",
      betAdvice: "SKIP",
      message: "Insufficient data",
      flipTarget: [],
      flipLabel: "—",
    };
  }

  // Current run
  const currentSide = states[states.length - 1];
  let runLength = 1;
  for (let i = states.length - 2; i >= 0; i--) {
    if (states[i] === currentSide) runLength++;
    else break;
  }

  // Dominance (last 12)
  const window = states.slice(-12);
  const aCount = window.filter((s) => s === "A").length;
  const bCount = window.length - aCount;
  const dominantSide = aCount >= bCount ? "A" : "B";
  const dominance = Math.max(aCount, bCount) / window.length;

  // Swap rate
  let swaps = 0;
  for (let i = 1; i < window.length; i++) {
    if (window[i] !== window[i - 1]) swaps++;
  }
  const swapRate = swaps / (window.length - 1);

  const currentLabel =
    currentSide === "A" ? scheme.pairALabel : scheme.pairBLabel;
  const oppositeLabel =
    currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;
  const dominantLabel =
    dominantSide === "A" ? scheme.pairALabel : scheme.pairBLabel;

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 DECISION TREE v2: HONEST CONFIDENCE + BET ADVICE
  // ═══════════════════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────────────────
  // TIER S: DOMINANCE LOCK (5+ run + low swap ≤35%)
  // ─────────────────────────────────────────────────────────────────────
  if (runLength >= 5 && swapRate <= 0.35) {
    if (runLength >= 8) {
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "FLIP",
        confidence: 0.75,
        reliability: "HIGH",
        betAdvice: "BET GOOD RELICS",
        message: `🔥 Extreme ${runLength}x ${currentLabel} → FLIP`,
        flipTarget: currentSide === "A" ? scheme.pairB : scheme.pairA,
        flipLabel: oppositeLabel,
        urgency: "high",
        icon: "🟠",
      };
    }

    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "CONTINUE",
      confidence: 0.88,
      reliability: "VERY HIGH",
      betAdvice: "BET BEST RELICS",
      message: `🔒 Dominance lock: ${currentLabel} (${runLength}x, ${Math.round(
        swapRate * 100
      )}% swap)`,
      flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: `Continue ${currentLabel}`,
      urgency: "critical",
      icon: "🟢",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER A: NOISE DETECTION (1x opposite after 4+ dominant)
  // ─────────────────────────────────────────────────────────────────────
  if (
    runLength === 1 &&
    dominance >= 0.65 &&
    currentSide !== dominantSide &&
    swapRate <= 0.45
  ) {
    let prevRunLength = 0;
    for (let i = states.length - 2; i >= 0; i--) {
      if (states[i] === dominantSide) prevRunLength++;
      else break;
    }

    if (prevRunLength >= 4) {
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "FLIP",
        confidence: 0.8,
        reliability: "HIGH",
        betAdvice: "BET GOOD RELICS",
        message: `⚠️ Noise (1x ${currentLabel}) → return to ${dominantLabel}`,
        flipTarget: dominantSide === "A" ? scheme.pairA : scheme.pairB,
        flipLabel: dominantLabel,
        urgency: "high",
        icon: "🟠",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER A: STICKY-DOMINANT (75%+ dominance, low swap ≤40%)
  // ─────────────────────────────────────────────────────────────────────
  if (dominance >= 0.75 && swapRate <= 0.4) {
    const onDominant = currentSide === dominantSide;

    if (onDominant) {
      if (runLength >= 7) {
        return {
          valid: true,
          currentSide,
          currentLabel,
          runLength,
          dominance,
          dominantSide,
          swapRate,
          action: "FLIP",
          confidence: 0.72,
          reliability: "MEDIUM-HIGH",
          betAdvice: "BET OKAY RELICS",
          message: `🔥 Extreme sticky ${runLength}x → FLIP`,
          flipTarget: currentSide === "A" ? scheme.pairB : scheme.pairA,
          flipLabel: oppositeLabel,
          urgency: "medium",
          icon: "🟡",
        };
      }

      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "CONTINUE",
        confidence: 0.85,
        reliability: "HIGH",
        betAdvice: "BET GOOD RELICS",
        message: `🎯 Sticky dominant (${Math.round(
          dominance * 100
        )}%, ${runLength}x)`,
        flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
        flipLabel: `Continue ${currentLabel}`,
        urgency: "high",
        icon: "🟢",
      };
    } else {
      // On minority → expect return
      if (runLength === 1) {
        return {
          valid: true,
          currentSide,
          currentLabel,
          runLength,
          dominance,
          dominantSide,
          swapRate,
          action: "FLIP",
          confidence: 0.78,
          reliability: "MEDIUM-HIGH",
          betAdvice: "BET OKAY RELICS",
          message: `⚠️ Noise → return to ${dominantLabel}`,
          flipTarget: dominantSide === "A" ? scheme.pairA : scheme.pairB,
          flipLabel: dominantLabel,
          urgency: "medium",
          icon: "🟡",
        };
      }

      // 2+ opposite = possible reversal
      if (runLength >= 2) {
        return {
          valid: true,
          currentSide,
          currentLabel,
          runLength,
          dominance,
          dominantSide,
          swapRate,
          action: "CONTINUE",
          confidence: 0.65,
          reliability: "MEDIUM",
          betAdvice: "BET TRASH ONLY",
          message: `🔄 Reversal building (${runLength}x ${currentLabel})`,
          flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
          flipLabel: `Continue ${currentLabel}`,
          urgency: "low",
          icon: "🔵",
        };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER B: MODERATE STABLE (35-50% swap, 4+ run)
  // ─────────────────────────────────────────────────────────────────────
  if (swapRate >= 0.35 && swapRate <= 0.5 && runLength >= 4) {
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "FLIP",
      confidence: 0.68,
      reliability: "MEDIUM",
      betAdvice: "BET OKAY RELICS",
      message: `📊 Moderate stable: 4x ${currentLabel} → FLIP`,
      flipTarget: currentSide === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: oppositeLabel,
      urgency: "medium",
      icon: "🟡",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER C: HIGH VOLATILITY (50-70% swap)
  // ─────────────────────────────────────────────────────────────────────
  if (swapRate > 0.5 && swapRate < 0.7) {
    // Only trust 5+ runs in volatile conditions
    if (runLength >= 5) {
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "FLIP",
        confidence: 0.62,
        reliability: "MEDIUM-LOW",
        betAdvice: "BET TRASH ONLY",
        message: `⚡ High-freq volatile: 5x ${currentLabel} → flip possible`,
        flipTarget: currentSide === "A" ? scheme.pairB : scheme.pairA,
        flipLabel: oppositeLabel,
        urgency: "low",
        icon: "🔵",
      };
    }

    // 1-4 run = unreliable
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "CONTINUE",
      confidence: 0.48,
      reliability: "LOW",
      betAdvice: "SKIP",
      message: `⚠️ Volatile (${Math.round(swapRate * 100)}% swap) — unreliable`,
      flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: `Continue ${currentLabel}`,
      urgency: "none",
      icon: "⚪",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER D: EXTREME CHAOS (70%+ swap)
  // ─────────────────────────────────────────────────────────────────────
  if (swapRate >= 0.7) {
    if (runLength >= 6) {
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "FLIP",
        confidence: 0.55,
        reliability: "LOW",
        betAdvice: "SKIP OR TRASH",
        message: `🌪️ Chaos but 6x run → risky flip`,
        flipTarget: currentSide === "A" ? scheme.pairB : scheme.pairA,
        flipLabel: oppositeLabel,
        urgency: "none",
        icon: "⚪",
      };
    }

    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "SKIP",
      confidence: 0.4,
      reliability: "VERY LOW",
      betAdvice: "SKIP — SAVE RELICS",
      message: `❌ Chaotic (${Math.round(swapRate * 100)}% swap) — SKIP`,
      flipTarget: [],
      flipLabel: "—",
      urgency: "none",
      icon: "⚫",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // FALLBACK: LOW SWAP, SHORT RUN (continue but low confidence)
  // ─────────────────────────────────────────────────────────────────────
  return {
    valid: true,
    currentSide,
    currentLabel,
    runLength,
    dominance,
    dominantSide,
    swapRate,
    action: "CONTINUE",
    confidence: 0.55,
    reliability: "LOW-MEDIUM",
    betAdvice: "BET TRASH ONLY",
    message: `📊 Pattern building (${runLength}x ${currentLabel})`,
    flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
    flipLabel: `Continue ${currentLabel}`,
    urgency: "low",
    icon: "🔵",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function KiyoModeCard({
  entries,
  onSendToDebug,
  debugLogs = [],
  onSendKiyoDebugData,
  onKiyoSnapshot,
}) {
  const [testInput, setTestInput] = useState("");
  const [testRolls, setTestRolls] = useState([]);
  const [activePrefix, setActivePrefix] = useState(null);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const lastSentRef = useRef(null);
  const [, forceUpdate] = useState();
  const lastSentDataRef = useRef(null);
  const [datasetRegion, setDatasetRegion] = useState("EU");

  const [importedRolls, setImportedRolls] = useState([]);
  const [showImportStats, setShowImportStats] = useState(false);
  const fileInputRef = useRef(null);

  const [persistentWaveAccuracy, setPersistentWaveAccuracy] = useState({
    col2: { hits: 0, total: 0 },
    col3: { hits: 0, total: 0 },
    lastPredictions: { col2: null, col3: null },
  });
  const [liveRolls, setLiveRolls] = useState([]);

  const live3Rolls = useMemo(() => {
    return entries
      .map((e) => (e.s3 || "").replace(/0+$/, ""))
      .filter((r) => r.length === 3)
      .reverse();
  }, [entries]);

  const rollEvents = useMemo(() => {
    const list = Array.isArray(entries) ? [...entries] : [];
    const entryEvents = list
      .map((e) => {
        const ts = e?.time ? new Date(e.time).getTime() : 0;
        const roll = String(e?.s3 ?? "").trim();
        return { roll, ts };
      })
      .filter((x) => x.ts > 0 && x.roll.length >= 3)
      .reverse();

    const importedEvents = importedRolls.map((roll, i) => ({
      roll,
      ts: Date.now() + i * 10,
    }));
    const testEvents = testRolls.map((roll, i) => ({
      roll,
      ts: Date.now() + i * 10,
    }));
    const liveEvents = liveRolls;

    return [...entryEvents, ...importedEvents, ...testEvents, ...liveEvents];
  }, [entries, importedRolls, testRolls, liveRolls]);

  const { windowInfo } = useFiveMinuteWindowRolls(rollEvents, 3);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveRollEventsRef = useRef([]);
  const prevLiveRollsRef = useRef(0);

  useEffect(() => {
    const rolls = Array.isArray(live3Rolls) ? live3Rolls : [];
    const prev = prevLiveRollsRef.current || [];

    if (rolls.length < prev.length) {
      liveRollEventsRef.current = liveRollEventsRef.current.slice(
        0,
        rolls.length
      );
      prevLiveRollsRef.current = rolls.slice();
      return;
    }

    if (rolls.length === prev.length) {
      if (rolls.length > 0) {
        const lastNow = String(rolls[rolls.length - 1] ?? "");
        const lastPrev = String(prev[prev.length - 1] ?? "");
        if (lastNow !== lastPrev && liveRollEventsRef.current.length) {
          liveRollEventsRef.current[liveRollEventsRef.current.length - 1] = {
            ...liveRollEventsRef.current[liveRollEventsRef.current.length - 1],
            roll: lastNow,
          };
        }
      }
      prevLiveRollsRef.current = rolls.slice();
      return;
    }

    const added = rolls.slice(prev.length);
    let base = Date.now();
    added.forEach((r, i) => {
      liveRollEventsRef.current.push({ roll: String(r), ts: base + i * 5 });
    });
    setLiveRolls([...liveRollEventsRef.current]);
    prevLiveRollsRef.current = rolls.slice();
  }, [live3Rolls]);

  const translatedTestRolls = useMemo(() => {
    return testRolls.map((roll) => {
      const digits = roll.split("").map(Number);
      const shift = (4 - digits[0] + 4) % 4;
      const shifted = digits
        .map((d) => {
          const z = d - 1;
          const s = (z + shift) % 4;
          return (s + 1).toString();
        })
        .join("");
      return shifted;
    });
  }, [testRolls]);

  const translatedImportedRolls = useMemo(() => {
    return importedRolls.map((roll) => {
      const digits = roll.split("").map(Number);
      const shift = (4 - digits[0] + 4) % 4;
      const shifted = digits
        .map((d) => {
          const z = d - 1;
          const s = (z + shift) % 4;
          return (s + 1).toString();
        })
        .join("");
      return shifted;
    });
  }, [importedRolls]);

  const combinedRolls = useMemo(() => {
    return [...translatedImportedRolls, ...translatedTestRolls, ...live3Rolls];
  }, [translatedImportedRolls, translatedTestRolls, live3Rolls]);

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rolls = text.match(/[1-4]{3}/g) || [];
      const validRolls = rolls.filter((roll) => /^[1-4]{3}$/.test(roll));

      if (validRolls.length === 0) {
        alert("No valid 3-digit rolls found in file!");
        return;
      }

      setImportedRolls(validRolls);
      setShowImportStats(true);
      setTimeout(() => setShowImportStats(false), 3000);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearImported = () => {
    if (confirm(`Clear ${importedRolls.length} imported rolls?`))
      setImportedRolls([]);
  };

  const kiyoAccuracy = useMemo(() => {
    if (!debugLogs?.length) {
      return {
        total: 0,
        mainHits: 0,
        altHits: 0,
        misses: 0,
        mainPct: 0,
        altPct: 0,
        top2Pct: 0,
      };
    }

    let total = 0,
      mainHits = 0,
      altHits = 0,
      misses = 0;

    debugLogs
      .filter(
        (log) =>
          log.kind === "3" &&
          log.actual &&
          log.prediction &&
          log.source === "kiyo"
      )
      .forEach((log) => {
        total++;
        if (String(log.actual) === String(log.prediction)) mainHits++;
        else if (log.alt && String(log.actual) === String(log.alt)) altHits++;
        else misses++;
      });

    const mainPct = total ? Math.round((mainHits / total) * 100) : 0;
    const altPct = total ? Math.round((altHits / total) * 100) : 0;
    const top2Pct = total
      ? Math.round(((mainHits + altHits) / total) * 100)
      : 0;

    return { total, mainHits, altHits, misses, mainPct, altPct, top2Pct };
  }, [debugLogs]);

  const waveAccuracy = useMemo(() => {
    const col2Pct =
      persistentWaveAccuracy.col2.total > 0
        ? Math.round(
            (persistentWaveAccuracy.col2.hits /
              persistentWaveAccuracy.col2.total) *
              100
          )
        : 0;

    const col3Pct =
      persistentWaveAccuracy.col3.total > 0
        ? Math.round(
            (persistentWaveAccuracy.col3.hits /
              persistentWaveAccuracy.col3.total) *
              100
          )
        : 0;

    const totalHits =
      persistentWaveAccuracy.col2.hits + persistentWaveAccuracy.col3.hits;
    const totalPredictions =
      persistentWaveAccuracy.col2.total + persistentWaveAccuracy.col3.total;

    const combinedPct =
      totalPredictions > 0
        ? Math.round((totalHits / totalPredictions) * 100)
        : 0;

    return {
      col2: {
        hits: persistentWaveAccuracy.col2.hits,
        total: persistentWaveAccuracy.col2.total,
        pct: col2Pct,
      },
      col3: {
        hits: persistentWaveAccuracy.col3.hits,
        total: persistentWaveAccuracy.col3.total,
        pct: col3Pct,
      },
      combined: { pct: combinedPct, hits: totalHits, total: totalPredictions },
    };
  }, [persistentWaveAccuracy]);

  const analyzeWavePatterns = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 4) {
      return {
        columns: [],
        avgSwapRate: 0,
        flipColumns: 0,
        stickyColumns: 0,
        compoundConfidence: "NORMAL",
        window: windowInfo,
        windowQuality: windowInfo?.quality ?? null,
      };
    }

    const baseRolls = combinedRolls.slice(-18);

    const col2Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col2, 1);
    const col3Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col3, 2);

    const columns = [
      {
        column: "col2",
        name: "Column 2",
        label: "Outer/Inner",
        scheme: WAVE_SCHEMES.col2,
        ...col2Analysis,
        runAnalysis: {
          pair: col2Analysis.currentSide,
          length: col2Analysis.runLength,
          label: col2Analysis.currentLabel,
        },
        status:
          col2Analysis.action === "FLIP"
            ? "due_to_flip"
            : col2Analysis.action === "SKIP"
            ? "suppressed"
            : "likely_continue",
        message: col2Analysis.message,
        adaptiveNote: col2Analysis.message,
      },
      {
        column: "col3",
        name: "Column 3",
        label: "Low/High",
        scheme: WAVE_SCHEMES.col3,
        ...col3Analysis,
        runAnalysis: {
          pair: col3Analysis.currentSide,
          length: col3Analysis.runLength,
          label: col3Analysis.currentLabel,
        },
        status:
          col3Analysis.action === "FLIP"
            ? "due_to_flip"
            : col3Analysis.action === "SKIP"
            ? "suppressed"
            : "likely_continue",
        message: col3Analysis.message,
        adaptiveNote: col3Analysis.message,
      },
    ];

    const avgSwapRate = (col2Analysis.swapRate + col3Analysis.swapRate) / 2;

    const flipColumns = columns.filter(
      (c) => c.status === "due_to_flip"
    ).length;
    const stickyColumns = columns.filter((c) => c.swapRate < 0.4).length;

    const compoundConfidence =
      flipColumns >= 2
        ? "HIGH"
        : flipColumns === 1 && stickyColumns >= 1
        ? "MODERATE"
        : "NORMAL";

    return {
      columns,
      columnAnalysis: {
        col2: columns[0],
        col3: columns[1],
      },
      avgSwapRate: avgSwapRate.toFixed(2),
      flipColumns,
      flipCols: columns.filter((c) => c.status === "due_to_flip"),
      stickyColumns,
      compoundConfidence,
      focusColumn: null,
      lookbackUsed: baseRolls.length,
      window: windowInfo,
      windowQuality: windowInfo?.quality ?? null,
    };
  }, [combinedRolls, windowInfo]);

  const smartPrefixPrediction = useMemo(() => {
    if (combinedRolls.length < 3) return null;

    let sourcePrefix = null;
    let sourceType = null;

    if (testInput.length >= 2) {
      const paddedInput = testInput.length === 2 ? testInput + "1" : testInput;
      const translated = translateTo4(paddedInput);
      if (translated && translated.length >= 2) {
        sourcePrefix = translated.slice(0, 2);
        sourceType = "typing";
      }
    } else if (activePrefix && activePrefix.length === 2) {
      sourcePrefix = activePrefix;
      sourceType = "manual";
    } else if (combinedRolls.length > 0) {
      const lastRoll = combinedRolls[combinedRolls.length - 1];
      sourcePrefix = lastRoll.slice(0, 2);
      sourceType = "auto";
    }

    if (!sourcePrefix) return null;

    const recentRolls = combinedRolls.slice(-15);
    const liveTable = {};

    for (let i = 0; i < recentRolls.length - 1; i++) {
      const prefix = recentRolls[i].slice(0, 2);
      const nextDigit = recentRolls[i + 1][2];

      if (!liveTable[prefix]) liveTable[prefix] = {};
      liveTable[prefix][nextDigit] = (liveTable[prefix][nextDigit] || 0) + 1;
    }

    const liveMatches = liveTable[sourcePrefix];

    if (liveMatches) {
      const sorted = Object.entries(liveMatches).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
      const mainDigit = sorted[0][0];
      const mainCount = sorted[0][1];
      const confidence = mainCount / total;

      if (total >= 2 && confidence >= 0.5) {
        return {
          prediction: sourcePrefix + mainDigit,
          confidence: Math.min(confidence + 0.1, 0.85),
          alt: sorted[1] ? sourcePrefix + sorted[1][0] : null,
          matchCount: total,
          sourcePrefix,
          sourceType: `live-${sourceType}`,
          mode: "live-priority",
        };
      }
    }

    const trainingPrediction = predictWithPrefix(
      EU_SEQUENTIAL_3STR_RECENT,
      sourcePrefix
    );

    if (trainingPrediction.prediction) {
      return {
        ...trainingPrediction,
        confidence: Math.min(trainingPrediction.confidence * 0.7, 0.65),
        sourcePrefix,
        sourceType: `training-${sourceType}`,
        mode: "training-fallback",
        warning: "Live data weak - using historical",
      };
    }

    return null;
  }, [combinedRolls, activePrefix, testInput]);

  const prediction = useMemo(() => {
    if (combinedRolls.length < 4) return null;
    let basePrediction = predictNext3EU([...combinedRolls]);

    if (analyzeWavePatterns?.focusColumn && basePrediction?.prediction) {
      const [, focusCol] = analyzeWavePatterns.focusColumn;

      if (focusCol.status === "due_to_flip") {
        const tracerLastDigit = basePrediction.prediction[2];
        const tracerMatches = focusCol.flipTarget.includes(tracerLastDigit);

        if (tracerMatches) {
          basePrediction.confidence = Math.min(
            basePrediction.confidence * 1.15,
            0.85
          );
          basePrediction.mode = `${basePrediction.mode} + wave-aligned`;
        } else {
          basePrediction.confidence = Math.max(
            basePrediction.confidence * 0.75,
            0.35
          );
          basePrediction.isDisagreement = true;
          basePrediction.waveTarget = focusCol.flipTarget;
        }
      }
    }

    return basePrediction;
  }, [combinedRolls, analyzeWavePatterns]);

  const pairingViz = useMemo(() => {
    if (combinedRolls.length < 4) return null;

    const vizRolls = combinedRolls.slice(-12).reverse(); // newest first

    // Map: roll string -> most recent ts we saw for it
    const tsByRoll = new Map();
    for (let i = (rollEvents?.length ?? 0) - 1; i >= 0; i--) {
      const r = String(rollEvents[i]?.roll ?? "").trim();
      const ts = Number(rollEvents[i]?.ts ?? 0);
      if (r.length === 3 && ts > 0 && !tsByRoll.has(r)) tsByRoll.set(r, ts);
    }

    const bucket5m = (ts) => Math.floor(ts / 300000) * 300000;

    return vizRolls.map((roll) => {
      const r = String(roll).trim();
      const ts = tsByRoll.get(r) ?? Date.now(); // fallback so table still works

      const col1Digit = r[0];
      const col2Digit = r[1];
      const col3Digit = r[2];

      return {
        roll: r,
        ts,
        windowStartMs: bucket5m(ts),

        col1: {
          isA: WAVE_SCHEMES.col1.pairA.includes(col1Digit),
          label: WAVE_SCHEMES.col1.pairA.includes(col1Digit)
            ? WAVE_SCHEMES.col1.pairALabel
            : WAVE_SCHEMES.col1.pairBLabel,
        },
        col2: {
          isA: WAVE_SCHEMES.col2.pairA.includes(col2Digit),
          label: WAVE_SCHEMES.col2.pairA.includes(col2Digit)
            ? WAVE_SCHEMES.col2.pairALabel
            : WAVE_SCHEMES.col2.pairBLabel,
        },
        col3: {
          isA: WAVE_SCHEMES.col3.pairA.includes(col3Digit),
          label: WAVE_SCHEMES.col3.pairA.includes(col3Digit)
            ? WAVE_SCHEMES.col3.pairALabel
            : WAVE_SCHEMES.col3.pairBLabel,
        },
      };
    });
  }, [combinedRolls, rollEvents]);

  const ACTIVE_DATASET = useMemo(() => {
    if (datasetRegion === "NA") return NA_SEQUENTIAL_3STR_RECENT;
    if (datasetRegion === "ASIA") return ASIA_SEQUENTIAL_3STR_RECENT;
    if (datasetRegion === "ALL") return ALL_SEQUENTIAL_3STR_RECENT;
    return EU_SEQUENTIAL_3STR_RECENT;
  }, [datasetRegion]);

  const ACTIVE_PATCH_INFO = useMemo(() => {
    if (datasetRegion === "NA") return NA_PATCH_INFO;
    if (datasetRegion === "ASIA") return ASIA_PATCH_INFO;
    if (datasetRegion === "ALL") return ALL_PATCH_INFO;
    return EU_PATCH_INFO;
  }, [datasetRegion]);

  const combinedDataset = useMemo(() => {
    const combined = {};

    ACTIVE_DATASET.forEach((pattern) => {
      combined[pattern] = (combined[pattern] || 0) + 1;
    });

    const allRolls = combinedRolls.filter((r) => r.length === 3);
    allRolls.forEach((roll) => {
      combined[roll] = (combined[roll] || 0) + 1;
    });

    const total = Object.values(combined).reduce((a, b) => a + b, 0) || 1;

    const sorted = Object.entries(combined)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return { total, patterns: sorted, liveCount: allRolls.length };
  }, [combinedRolls, ACTIVE_DATASET]);

  useEffect(() => {
    forceUpdate({});
  }, [combinedRolls.length, testRolls.length]);

  useEffect(() => {
    if (!prediction || combinedRolls.length < 4) return;
    const fingerprint = combinedRolls.join(",");
    if (lastSentRef.current !== fingerprint) {
      lastSentRef.current = fingerprint;
      onSendToDebug?.(combinedRolls, "3-str", { source: "kiyo" });
    }
  }, [prediction, combinedRolls, onSendToDebug]);

  useEffect(() => {
    if (!prediction || !analyzeWavePatterns || !onSendKiyoDebugData) return;

    const dataSignature = JSON.stringify({
      pred: prediction.prediction,
      conf: prediction.confidence,
      alt: prediction.alt,
      mode: prediction.mode,
      rollCount: combinedRolls.length,
    });
    if (lastSentDataRef.current === dataSignature) return;
    lastSentDataRef.current = dataSignature;

    const debugData = {
      waveAnalysis: JSON.parse(JSON.stringify(analyzeWavePatterns)),
      prediction: { ...prediction },
      smartPrefix: smartPrefixPrediction ? { ...smartPrefixPrediction } : null,
      pairingViz: pairingViz ? [...pairingViz] : [],
      combinedRolls: [...combinedRolls],

      waveData: {
        col2Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[0];
          if (!col) return null;
          return col.flipTarget;
        })(),
        col3Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[1];
          if (!col) return null;
          return col.flipTarget;
        })(),
        col2Confidence: analyzeWavePatterns?.columns?.[0]?.confidence || 0,
        col3Confidence: analyzeWavePatterns?.columns?.[1]?.confidence || 0,
        col2Status: analyzeWavePatterns?.columns?.[0]?.status || "unknown",
        col3Status: analyzeWavePatterns?.columns?.[1]?.status || "unknown",
      },
    };

    onSendKiyoDebugData(debugData);
  }, [
    prediction,
    analyzeWavePatterns,
    smartPrefixPrediction,
    pairingViz,
    combinedRolls,
    onSendKiyoDebugData,
  ]);

  const handleTestRollSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = testInput.trim();

      if (value.length === 3 && /^[1-4]{3}$/.test(value)) {
        setTestRolls((prev) => [...prev, value]);
        setTestInput("");
      } else {
        setTestInput("");
      }
    }
  };

  const handleDeleteTestRoll = (idx) => {
    setTestRolls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleResetWaveAccuracy = () => {
    setPersistentWaveAccuracy({
      col2: { hits: 0, total: 0 },
      col3: { hits: 0, total: 0 },
      lastPredictions: { col2: null, col3: null },
    });
  };

  useEffect(() => {
    if (!analyzeWavePatterns || combinedRolls.length < 4) return;

    const latestRoll = combinedRolls[combinedRolls.length - 1];
    if (!latestRoll) return;

    const actualCol2 = latestRoll[1];
    const actualCol3 = latestRoll[2];

    const col2Analysis = analyzeWavePatterns.columns?.[0];
    const col3Analysis = analyzeWavePatterns.columns?.[1];

    const currentCol2Pred = col2Analysis?.flipTarget || null;
    const currentCol3Pred = col3Analysis?.flipTarget || null;

    const hadPreviousPredictions =
      persistentWaveAccuracy.lastPredictions.col2 !== null ||
      persistentWaveAccuracy.lastPredictions.col3 !== null;

    if (hadPreviousPredictions) {
      const newAccuracy = { ...persistentWaveAccuracy };

      if (persistentWaveAccuracy.lastPredictions.col2) {
        newAccuracy.col2.total++;
        if (persistentWaveAccuracy.lastPredictions.col2.includes(actualCol2))
          newAccuracy.col2.hits++;
      }

      if (persistentWaveAccuracy.lastPredictions.col3) {
        newAccuracy.col3.total++;
        if (persistentWaveAccuracy.lastPredictions.col3.includes(actualCol3))
          newAccuracy.col3.hits++;
      }

      newAccuracy.lastPredictions = {
        col2: currentCol2Pred,
        col3: currentCol3Pred,
      };
      setPersistentWaveAccuracy(newAccuracy);
    } else {
      setPersistentWaveAccuracy({
        ...persistentWaveAccuracy,
        lastPredictions: { col2: currentCol2Pred, col3: currentCol3Pred },
      });
    }
  }, [combinedRolls.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-emerald-400">🌊 Kiyo Mode</h3>
          <p className="text-xs text-slate-400">
            Wave Theory + Smart Prefix Prediction
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition cursor-pointer"
          >
            📁 Import
          </button>
          <button
            onClick={() => setShowDecisionGuide(!showDecisionGuide)}
            className="px-3 py-1.5 text-xs font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border cursor-pointer border-violet-500/40 rounded-lg transition"
          >
            📖 Guide
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <AccuracyHeaderBar
          kiyoAccuracy={kiyoAccuracy}
          waveAccuracy={waveAccuracy}
          combinedDataset={combinedDataset}
          patchInfo={ACTIVE_PATCH_INFO}
          onResetWaveAccuracy={handleResetWaveAccuracy}
          regionLabel={datasetRegion}
        />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Sheet Data:</span>
          <select
            value={datasetRegion}
            onChange={(e) => setDatasetRegion(e.target.value)}
            className="bg-slate-900 border cursor-pointer border-slate-700 rounded-lg px-3 py-2 text-sm min-w-[8px] focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="EU">EU</option>
            <option value="NA">NA</option>
            <option value="ASIA">ASIA</option>
            <option value="ALL">Global</option>
          </select>
        </div>
      </div>

      <ImportStatsDisplay
        importedRolls={importedRolls}
        showImportStats={showImportStats}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
        onClearImported={handleClearImported}
      />

      <TestRollsInput
        testInput={testInput}
        setTestInput={setTestInput}
        handleTestRollSubmit={handleTestRollSubmit}
        testRolls={testRolls}
        translatedTestRolls={translatedTestRolls}
        handleDeleteTestRoll={handleDeleteTestRoll}
        setActivePrefix={setActivePrefix}
      />

      {combinedRolls.length >= 4 && analyzeWavePatterns && (
        <>
          <FiveMinWindowTracker
            windowInfo={windowInfo}
            analyzeWavePatterns={analyzeWavePatterns}
          />
          <WaveAnalysisDisplay
            analyzeWavePatterns={analyzeWavePatterns}
            smartPrefixPrediction={smartPrefixPrediction}
          />
        </>
      )}

      <AdvancedToolsSection
        waveAccuracy={waveAccuracy}
        kiyoAccuracy={kiyoAccuracy}
        pairingViz={pairingViz}
      />

      {showDecisionGuide && (
        <GuideModal
          show={showDecisionGuide}
          onClose={() => setShowDecisionGuide(false)}
        />
      )}
    </div>
  );
}
