import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  predictNext3EU,
  predictWithPrefix,
  calculatePrefixConfidenceBoost,
} from "../utils/predictNext";
import { EU_SEQUENTIAL_3STR } from "../utils/euLiveSheetData";
import { translateTo4 } from "../utils/stringHelpers";

// 🔥 Import new components
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import PredictionCards from "./kiyo/PredictionCards";
import TestRollsInput from "./kiyo/TestRollsInput";
import WavePairingTable from "./kiyo/WavePairingTable";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import KiyoAccuracyStats from "./kiyo/KiyoAccuracyStats";
import CombinedDatasetStats from "./kiyo/CombinedDatasetStats";
import RawInputHelper from "./kiyo/RawInputHelper";
import KiyoDebugPanel from "./kiyo/KiyoDebugPanel";

// 🔥 WAVE THEORY SCHEMES - Optimized structure
const WAVE_SCHEMES = {
  col1: {
    name: "Column 1",
    label: "Odds/Evens",
    pairA: ["1", "3"],
    pairB: ["2", "4"],
    pairALabel: "Odds",
    pairBLabel: "Evens",
    pairAFull: "Odds (1/3)",
    pairBFull: "Evens (2/4)",
  },
  col2: {
    name: "Column 2",
    label: "Outer/Inner",
    pairA: ["1", "4"],
    pairB: ["2", "3"],
    pairALabel: "Outer",
    pairBLabel: "Inner",
    pairAFull: "Outer (1/4)",
    pairBFull: "Inner (2/3)",
  },
  col3: {
    name: "Column 3",
    label: "Low/High",
    pairA: ["1", "2"],
    pairB: ["3", "4"],
    pairALabel: "Low",
    pairBLabel: "High",
    pairAFull: "Low (1/2)",
    pairBFull: "High (3/4)",
  },
};

// 🔥 NEW: Calculate consecutive run length (REAL EU WAVE THEORY)
function calculateConsecutiveRun(rolls, scheme) {
  if (!rolls || rolls.length === 0)
    return { pair: null, length: 0, pattern: [] };

  const pattern = [];
  let currentPair = null;
  let runLength = 0;

  // Build pattern array from most recent backwards
  for (let i = rolls.length - 1; i >= 0; i--) {
    const lastDigit = rolls[i][2];
    const isA = scheme.pairA.includes(lastDigit);
    const pair = isA ? "A" : "B";

    pattern.unshift(pair); // Add to beginning for visual display

    if (currentPair === null) {
      currentPair = pair;
      runLength = 1;
    } else if (pair === currentPair) {
      runLength++;
    } else {
      break; // Stop counting when pattern changes
    }
  }

  return { pair: currentPair, length: runLength, pattern };
}

// 🔥 NEW: Calculate swap rate for a column
function calculateSwapRate(rolls, scheme) {
  if (!rolls || rolls.length < 2) return 0;

  let swaps = 0;
  let lastPair = null;

  for (let i = rolls.length - 1; i >= 0; i--) {
    const lastDigit = rolls[i][2];
    const isA = scheme.pairA.includes(lastDigit);
    const pair = isA ? "A" : "B";

    if (lastPair !== null && pair !== lastPair) {
      swaps++;
    }
    lastPair = pair;
  }

  return swaps / (rolls.length - 1);
}

// 🔥 ENHANCED: Determine flip likelihood based on run length with urgency levels
function calculateFlipStatus(runLength, pair, scheme) {
  if (runLength >= 5) {
    return {
      status: "due_to_flip",
      confidence: Math.min(0.75 + (runLength - 5) * 0.05, 0.9),
      message: `${runLength} consecutive ${
        pair === "A" ? scheme.pairALabel : scheme.pairBLabel
      } - FLIP VERY LIKELY`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "critical",
      icon: "🔴",
    };
  } else if (runLength === 4) {
    return {
      status: "due_to_flip",
      confidence: 0.7,
      message: `${runLength} consecutive ${
        pair === "A" ? scheme.pairALabel : scheme.pairBLabel
      } - FLIP LIKELY`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "high",
      icon: "🟠",
    };
  } else if (runLength === 3) {
    return {
      status: "due_to_flip",
      confidence: 0.65,
      message: `${runLength} consecutive ${
        pair === "A" ? scheme.pairALabel : scheme.pairBLabel
      } - FLIP POSSIBLE`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "medium",
      icon: "🟡",
    };
  } else if (runLength === 2) {
    return {
      status: "could_go_either_way",
      confidence: 0.55,
      message: `${runLength} consecutive - Could go either way`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "low",
      icon: "⚪",
    };
  } else if (runLength === 1) {
    return {
      status: "likely_continue",
      confidence: 0.5,
      message: `Just started - May continue`,
      flipTarget: pair === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: pair === "A" ? scheme.pairALabel : scheme.pairBLabel,
      urgency: "none",
      icon: "🔵",
    };
  }

  return {
    status: "balanced",
    confidence: 0.5,
    message: "Balanced",
    flipTarget: [],
    flipLabel: "Unknown",
    urgency: "none",
    icon: "⚫",
  };
}

// 🔥 NEW: Detect "missed flip" - when a long run just ended (post-flip scenario)
function detectMissedFlip(recentRolls, scheme) {
  if (recentRolls.length < 8) return null;

  // Check if a long run existed 3-8 rolls ago
  const previousWindow = recentRolls.slice(-8, -2);
  const currentWindow = recentRolls.slice(-2);

  // Analyze previous window
  let prevRunPair = null;
  let prevRunLength = 0;

  for (let i = previousWindow.length - 1; i >= 0; i--) {
    const lastDigit = previousWindow[i][2];
    const isA = scheme.pairA.includes(lastDigit);
    const pair = isA ? "A" : "B";

    if (prevRunPair === null) {
      prevRunPair = pair;
      prevRunLength = 1;
    } else if (pair === prevRunPair) {
      prevRunLength++;
    } else {
      break;
    }
  }

  // Check if current window shows opposite pattern
  const currentPairs = currentWindow.map((roll) => {
    const lastDigit = roll[2];
    return scheme.pairA.includes(lastDigit) ? "A" : "B";
  });

  const flippedToDifferent = currentPairs.every((p) => p !== prevRunPair);

  // If previous run was 4+ and now we're on opposite, flip already happened
  if (prevRunLength >= 4 && flippedToDifferent) {
    return {
      justFlipped: true,
      previousRun: prevRunLength,
      previousPair: prevRunPair,
      message: `⚠️ JUST FLIPPED from ${prevRunLength}-run ${
        prevRunPair === "A" ? scheme.pairALabel : scheme.pairBLabel
      }`,
      recommendation: "SKIP - Post-flip cooldown",
    };
  }

  return null;
}

// 🔥 Caesar shift function
function caesarShiftForLine(prediction, line) {
  if (!prediction || !line) return null;
  const cleanPred = String(prediction).replace(/[^1-4]/g, "");
  if (!cleanPred) return null;
  const lineDigit = Number(line);
  if (lineDigit < 1 || lineDigit > 4) return null;
  const digits = cleanPred.split("").map(Number);
  const shift = (lineDigit - digits[0] + 4) % 4;
  const shifted = digits
    .map((d) => {
      const z = d - 1;
      const s = (z + shift) % 4;
      return (s + 1).toString();
    })
    .join("");
  return shifted;
}

// 🔥 IMPROVED STRATEGIC TIER CALCULATOR - Fixed false confidence issues
function calculateStrategicTier(
  waveAnalysis,
  prefixPrediction,
  legacyPrediction
) {
  const factors = {
    stickyColumns: waveAnalysis.stickyColumns,
    flipColumns: waveAnalysis.flipColumns,
    avgSwapRate: parseFloat(waveAnalysis.avgSwapRate),
    focusColumn: waveAnalysis.focusColumn?.[1],
    compoundConfidence: waveAnalysis.compoundConfidence,
    prefixConfidence: prefixPrediction?.confidence || 0,
    waveConfidence: legacyPrediction?.confidence || 0,
  };

  let tier = "B";
  let reasoning = [];
  let action = "SKIP or BET TRASH";
  let effectiveReliability = 0;
  let alignment = "UNKNOWN";
  let conflictResolution = null;

  // Calculate effective reliability with swap rate penalty
  if (factors.focusColumn) {
    const swapPenalty = factors.focusColumn.swapRate;
    const runBonus = Math.min(factors.focusColumn.run.length / 5, 1);
    effectiveReliability = Math.round(
      factors.focusColumn.confidence * (1 - swapPenalty * 0.5) * runBonus * 100
    );
  } else {
    effectiveReliability = Math.round(factors.prefixConfidence * 100);
  }

  // Check wave vs prefix alignment
  if (prefixPrediction?.prediction && factors.focusColumn) {
    const prefixLastDigit = prefixPrediction.prediction[2];
    const isAligned = factors.focusColumn.flipTarget.includes(prefixLastDigit);
    alignment = isAligned ? "ALIGNED" : "CONFLICT";
  } else if (!factors.focusColumn) {
    alignment = "PREFIX_ONLY";
  } else if (!prefixPrediction?.prediction) {
    alignment = "WAVE_ONLY";
  }

  // 🔥 TIER S: Bet Good Relics (75%+ effective reliability)
  if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.3 &&
    factors.focusColumn.run.length >= 5
  ) {
    tier = "S";
    reasoning.push("🔥 Sticky (<30%) + 5+ Run = 80-85% confidence");
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 80);
    conflictResolution = "TRUST WAVE - Highest reliability pattern";
  } else if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.4 &&
    factors.focusColumn.run.length >= 4
  ) {
    tier = "S";
    reasoning.push("🔥 Sticky (<40%) + 4+ Run = 75-80% confidence");
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 75);
    conflictResolution = "TRUST WAVE - Strong reliability";
  } else if (alignment === "ALIGNED" && factors.flipColumns >= 1) {
    tier = "S";
    reasoning.push(
      `⚡ Wave + Prefix ALIGNED (${factors.flipColumns} flip cols)`
    );
    action = "BET GOOD RELICS";
    effectiveReliability = Math.max(effectiveReliability, 80);
    conflictResolution = "PERFECT ALIGNMENT - Both agree";
  }

  // 🔥 TIER A: Bet Okay Relics (60-70% effective reliability)
  else if (
    factors.focusColumn &&
    factors.focusColumn.swapRate < 0.5 &&
    factors.focusColumn.run.length >= 3
  ) {
    tier = "A";
    reasoning.push("⚡ Moderate sticky (<50%) + 3+ Run = 65-70%");
    action = "BET OKAY RELICS";
    effectiveReliability = Math.max(effectiveReliability, 65);
    conflictResolution =
      alignment === "CONFLICT" ? "CAUTIOUS - Wave acceptable" : "TRUST WAVE";
  } else if (
    factors.compoundConfidence === "MODERATE" &&
    factors.stickyColumns >= 1
  ) {
    tier = "A";
    reasoning.push(
      `⚡ MODERATE (1 flip) + ${factors.stickyColumns} sticky cols`
    );
    action = "BET OKAY RELICS";
    effectiveReliability = Math.max(effectiveReliability, 60);
    conflictResolution = "TRUST WAVE with caution";
  }
  // 🔥 FIX: Add volatility gating for prefix-only scenarios
  else if (
    prefixPrediction?.confidence >= 0.65 &&
    !factors.focusColumn &&
    factors.avgSwapRate < 0.6
  ) {
    tier = "A";
    reasoning.push(
      `📊 Prefix high conf (${Math.round(
        prefixPrediction.confidence * 100
      )}%) + Low volatility`
    );
    action = "BET OKAY RELICS";
    effectiveReliability = Math.round(prefixPrediction.confidence * 100);
    conflictResolution = "PREFIX ONLY - No strong wave";
  }

  // 🔥 TIER B: Trash Relics Only (45-60% effective reliability)
  // 🔥 FIX: Add volatility downgrade case BEFORE balanced case
  else if (
    alignment === "PREFIX_ONLY" &&
    factors.avgSwapRate >= 0.6 &&
    factors.flipColumns === 0
  ) {
    tier = "B";
    reasoning.push(
      `🌊 High avg volatility (${Math.round(
        factors.avgSwapRate * 100
      )}%) - Unstable patterns`
    );
    action = "SKIP or BET TRASH";
    // 🔥 FIX: Apply confidence penalty for high volatility
    const volatilityPenalty = factors.avgSwapRate >= 0.65 ? 0.6 : 0.8;
    effectiveReliability = Math.round(
      (prefixPrediction?.confidence * 100 || 50) * volatilityPenalty
    );
    conflictResolution = "TRUST PREFIX - Wave too volatile";
  } else if (factors.flipColumns === 0) {
    tier = "B";
    reasoning.push("🤷 BALANCED (0 flips) - No strong patterns");
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Wave unreliable";
  } else if (factors.avgSwapRate >= 0.7) {
    tier = "B";
    reasoning.push(
      `🌊 High volatility (${Math.round(factors.avgSwapRate * 100)}% avg swap)`
    );
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Too volatile";
  } else if (alignment === "CONFLICT" && factors.focusColumn?.swapRate >= 0.5) {
    tier = "B";
    reasoning.push(
      `⚠️ CONFLICT + moderate swap (${Math.round(
        factors.focusColumn.swapRate * 100
      )}%)`
    );
    action = "SKIP or BET TRASH";
    effectiveReliability = 50;
    conflictResolution = "UNCERTAIN - Consider both or skip";
  } else {
    tier = "B";
    reasoning.push("📊 Normal prefix - No strong signals");
    action = "SKIP or BET TRASH";
    effectiveReliability = Math.round(prefixPrediction?.confidence * 100 || 50);
    conflictResolution = "TRUST PREFIX - Default fallback";
  }

  return {
    tier,
    reasoning,
    action,
    effectiveReliability,
    factors,
    alignment,
    conflictResolution,
  };
}

export default function KiyoModeCard({
  entries,
  onSendToDebug,
  debugLogs = [],
  onSendKiyoDebugData,
}) {
  const [testInput, setTestInput] = useState("");
  const [testRolls, setTestRolls] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [manualLine, setManualLine] = useState("");
  const [activePrefix, setActivePrefix] = useState(null);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const lastSentRef = useRef(null);
  const [, forceUpdate] = useState();
  const lastSentDataRef = useRef(null);

  // 🔥 NEW: Imported rolls from text file
  const [importedRolls, setImportedRolls] = useState([]);
  const [showImportStats, setShowImportStats] = useState(false);
  const fileInputRef = useRef(null);

  // Extract live rolls from entries
  const live3Rolls = useMemo(() => {
    return entries
      .map((e) => (e.s3 || "").replace(/0+$/, ""))
      .filter((r) => r.length === 3)
      .reverse();
  }, [entries]);

  // Translate test rolls using Caesar shift (rotate to start with 4)
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

  // 🔥 NEW: Translate imported rolls to 4xx format
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

      return shifted; // "112" → "441" ✅
    });
  }, [importedRolls]);

  // Combined dataset: imported rolls + test rolls + live rolls
  const combinedRolls = useMemo(() => {
    return [...translatedImportedRolls, ...translatedTestRolls, ...live3Rolls];
  }, [translatedImportedRolls, translatedTestRolls, live3Rolls]);

  // 🔥 NEW: Handle file import
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 🔥 NEW: Clear imported rolls
  const handleClearImported = () => {
    if (confirm(`Clear ${importedRolls.length} imported rolls?`)) {
      setImportedRolls([]);
    }
  };

  // 🔥 KIYO MODE ACCURACY TRACKING
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

        if (String(log.actual) === String(log.prediction)) {
          mainHits++;
        } else if (log.alt && String(log.actual) === String(log.alt)) {
          altHits++;
        } else {
          misses++;
        }
      });

    const mainPct = total ? Math.round((mainHits / total) * 100) : 0;
    const altPct = total ? Math.round((altHits / total) * 100) : 0;
    const top2Pct = total
      ? Math.round(((mainHits + altHits) / total) * 100)
      : 0;

    return { total, mainHits, altHits, misses, mainPct, altPct, top2Pct };
  }, [debugLogs]);

  // 🔥 REFACTORED: RUN-LENGTH BASED WAVE ANALYSIS WITH SWAP RATE + HIGH-ACTIVITY FILTERING + MISSED FLIP DETECTION
  const analyzeWavePatterns = useMemo(() => {
    if (combinedRolls.length < 4)
      return {
        columns: [],
        avgSwapRate: 0,
        flipColumns: 0,
        stickyColumns: 0,
        compoundConfidence: "NORMAL",
      };

    // 🔥 DYNAMIC LOOKBACK - Longer for stable patterns
    const avgSwapEstimate =
      combinedRolls.length >= 6
        ? combinedRolls.slice(-6).reduce((acc, roll, idx, arr) => {
            if (idx === 0) return 0;
            return acc + (roll[2] !== arr[idx - 1][2] ? 1 : 0);
          }, 0) / 5
        : 0.5;

    const LOOKBACK =
      avgSwapEstimate < 0.4
        ? Math.min(20, combinedRolls.length) // Sticky = longer window
        : avgSwapEstimate < 0.6
        ? Math.min(15, combinedRolls.length) // Moderate
        : Math.min(12, combinedRolls.length); // Volatile = shorter

    const recentRolls = combinedRolls.slice(-LOOKBACK);
    const schemes = [WAVE_SCHEMES.col1, WAVE_SCHEMES.col2, WAVE_SCHEMES.col3];

    let totalSwapRate = 0;
    let validColumnsCount = 0;

    const columnAnalysis = schemes.map((scheme, idx) => {
      const runAnalysis = calculateConsecutiveRun(recentRolls, scheme);
      const flipStatus = calculateFlipStatus(
        runAnalysis.length,
        runAnalysis.pair,
        scheme
      );
      const swapRate = calculateSwapRate(recentRolls, scheme);

      // 🔥 NEW: Check for missed flip (post-flip scenario)
      const missedFlip = detectMissedFlip(recentRolls, scheme);

      // 🔥 NEW: Mark high-activity columns as ignored
      const isIgnored = swapRate >= 0.7;

      // 🔥 NEW: Downgrade flip status if post-flip detected
      let adjustedFlipStatus = flipStatus;
      if (missedFlip?.justFlipped) {
        adjustedFlipStatus = {
          ...flipStatus,
          status: "post_flip_cooldown",
          confidence: 0.4,
          message: missedFlip.message,
          urgency: "skip",
          icon: "🟣",
        };
      }

      if (!isIgnored) {
        totalSwapRate += swapRate;
        validColumnsCount++;
      }

      // Build rhythm display
      const rhythmDisplay = runAnalysis.pattern
        .map((p) => (p === "A" ? scheme.pairALabel[0] : scheme.pairBLabel[0]))
        .join("-");

      // Get current and flip labels
      const currentLabel =
        runAnalysis.pair === "A" ? scheme.pairALabel : scheme.pairBLabel;
      const flipLabel = adjustedFlipStatus.flipLabel;

      return {
        column: idx + 1,
        name: scheme.name,
        label: scheme.label,
        scheme: scheme,
        runLength: runAnalysis.length,
        currentPair: runAnalysis.pair,
        flipStatus: isIgnored
          ? {
              status: "ignored",
              message: "IGNORE - Too volatile",
              urgency: "none",
              icon: "🚫",
            }
          : adjustedFlipStatus,
        pattern: runAnalysis.pattern,
        swapRate,
        swapRateLabel: isIgnored
          ? "IGNORE"
          : swapRate >= 0.7
          ? "High Activity"
          : swapRate >= 0.4
          ? "Moderate"
          : "Sticky",
        rhythmDisplay,
        run: runAnalysis,
        currentLabel,
        flipLabel,
        flipTarget: isIgnored ? [] : adjustedFlipStatus.flipTarget,
        confidence: isIgnored ? 0 : adjustedFlipStatus.confidence,
        status: isIgnored ? "ignored" : adjustedFlipStatus.status,
        message: isIgnored
          ? "IGNORE - Too volatile"
          : adjustedFlipStatus.message,
        isIgnored,
        missedFlip,
        urgency: adjustedFlipStatus.urgency,
        icon: adjustedFlipStatus.icon,
      };
    });

    // 🔥 FIX: Calculate avgSwapRate only from valid (non-ignored) columns
    const avgSwapRate =
      validColumnsCount > 0 ? totalSwapRate / validColumnsCount : 0;

    // 🔥 FIX: Detect flip columns EXCLUDING ignored and post-flip cooldown ones
    const flipColumns = columnAnalysis.filter(
      (col) =>
        !col.isIgnored &&
        col.flipStatus.status === "due_to_flip" &&
        col.flipStatus.urgency !== "skip"
    );

    // 🔥 Detect sticky columns (low swap = reliable constraint)
    const stickyColumns = columnAnalysis.filter(
      (col) => !col.isIgnored && col.swapRate < 0.4
    );

    // 🔥 Determine compound confidence level
    let compoundConfidence = "NORMAL";
    if (flipColumns.length >= 2) {
      compoundConfidence = "HIGH";
    } else if (flipColumns.length === 1 && stickyColumns.length >= 1) {
      compoundConfidence = "MODERATE";
    }

    // 🔥 IMPROVED: Select focus column (highest urgency + confidence)
    let focusColumn = null;
    if (flipColumns.length > 0) {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
      const sortedFlips = [...flipColumns].sort((a, b) => {
        const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.confidence - a.confidence;
      });
      focusColumn = ["focus", sortedFlips[0]];
    }

    return {
      columns: columnAnalysis,
      columnAnalysis: Object.fromEntries(
        columnAnalysis.map((c) => [`col${c.column}`, c])
      ),
      avgSwapRate: avgSwapRate.toFixed(2),
      flipColumns: flipColumns.length,
      flipCols: flipColumns,
      stickyColumns: stickyColumns.length,
      compoundConfidence,
      flipColumnDetails: flipColumns.map((c) => c.column),
      stickyColumnDetails: stickyColumns.map((c) => c.column),
      focusColumn,
      lookbackUsed: LOOKBACK,
      ignoredColumns: columnAnalysis
        .filter((c) => c.isIgnored)
        .map((c) => c.column),
      postFlipColumns: columnAnalysis
        .filter((c) => c.missedFlip?.justFlipped)
        .map((c) => c.column),
    };
  }, [combinedRolls]);

  const smartPrefixPrediction = useMemo(() => {
    if (combinedRolls.length < 4) return null;

    let sourcePrefix = null;
    let sourceType = null;

    // 🔥 PRIORITY 1: Live typing input (watch testInput for 2 or 3 digits)
    if (testInput.length >= 2) {
      // Pad to 3 digits if needed, then translate to 4xx format
      const paddedInput = testInput.length === 2 ? testInput + "1" : testInput;
      const translated = translateTo4(paddedInput);
      if (translated && translated.length >= 2) {
        sourcePrefix = translated.slice(0, 2);
        sourceType = "typing";
      }
    }
    // 🔥 PRIORITY 2: Manual prefix selection (activePrefix)
    else if (activePrefix && activePrefix.length === 2) {
      sourcePrefix = activePrefix;
      sourceType = "manual";
    }
    // 🔥 FALLBACK: Use last roll's prefix
    else if (combinedRolls.length > 0) {
      const lastRoll = combinedRolls[combinedRolls.length - 1];
      sourcePrefix = lastRoll.slice(0, 2);
      sourceType = "auto";
    }

    if (!sourcePrefix) return null;

    // Combine EU training data + imported + test + live rolls
    const fullDataset = [...EU_SEQUENTIAL_3STR, ...combinedRolls];
    const prediction = predictWithPrefix(fullDataset, sourcePrefix);

    if (!prediction || !prediction.prediction) return null;

    // Calculate dynamic confidence boost from live data
    const confidenceBoost = calculatePrefixConfidenceBoost(
      EU_SEQUENTIAL_3STR,
      combinedRolls,
      sourcePrefix
    );

    if (prediction.prediction) {
      prediction.confidence = Math.max(
        0.35,
        Math.min(prediction.confidence + confidenceBoost, 0.85)
      );
      prediction.confidenceBoost = confidenceBoost;
      prediction.liveMatchQuality = confidenceBoost > 0 ? "good" : "poor";
    }

    return { ...prediction, sourcePrefix, sourceType };
  }, [combinedRolls, activePrefix, testInput]);
  // 🔥 LEGACY TRACER PREDICTION (for backward compatibility)
  // 🔥 LEGACY TRACER PREDICTION (for backward compatibility)
  const prediction = useMemo(() => {
    if (combinedRolls.length < 4) return null;
    let basePrediction = predictNext3EU([...combinedRolls]);

    // Apply wave alignment boost
    if (analyzeWavePatterns?.focusColumn && basePrediction?.prediction) {
      // ✅ ADD null check
      const [_, focusCol] = analyzeWavePatterns.focusColumn;

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

  // 🔥 PAIRING VISUALIZATION
  const pairingViz = useMemo(() => {
    if (combinedRolls.length < 4) return null;
    const vizRolls = combinedRolls.slice(-12);

    return vizRolls.reverse().map((roll) => {
      const lastDigit = roll[2];
      return {
        roll,
        col1: {
          isA: WAVE_SCHEMES.col1.pairA.includes(lastDigit),
          label: WAVE_SCHEMES.col1.pairA.includes(lastDigit)
            ? WAVE_SCHEMES.col1.pairALabel
            : WAVE_SCHEMES.col1.pairBLabel,
        },
        col2: {
          isA: WAVE_SCHEMES.col2.pairA.includes(lastDigit),
          label: WAVE_SCHEMES.col2.pairA.includes(lastDigit)
            ? WAVE_SCHEMES.col2.pairALabel
            : WAVE_SCHEMES.col2.pairBLabel,
        },
        col3: {
          isA: WAVE_SCHEMES.col3.pairA.includes(lastDigit),
          label: WAVE_SCHEMES.col3.pairA.includes(lastDigit)
            ? WAVE_SCHEMES.col3.pairALabel
            : WAVE_SCHEMES.col3.pairBLabel,
        },
      };
    });
  }, [combinedRolls]);

  // 🔥 TRAINING STATS
  const trainingStats = useMemo(() => {
    const freq = {};
    EU_SEQUENTIAL_3STR.forEach((pattern) => {
      freq[pattern] = (freq[pattern] || 0) + 1;
    });
    const total = EU_SEQUENTIAL_3STR.length;
    const sorted = Object.entries(freq)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
    return { total, patterns: sorted };
  }, []);
  // 🔥 COMBINED DATASET STATS
  const combinedDataset = useMemo(() => {
    const combined = {};

    // Count EU training data
    EU_SEQUENTIAL_3STR.forEach((pattern) => {
      combined[pattern] = (combined[pattern] || 0) + 1;
    });

    // Add live rolls
    const allRolls = combinedRolls.filter((r) => r.length === 3);
    allRolls.forEach((roll) => {
      combined[roll] = (combined[roll] || 0) + 1;
    });

    const total = Object.values(combined).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(combined)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return { total, patterns: sorted, liveCount: allRolls.length };
  }, [combinedRolls]);

  // Force update on roll changes
  useEffect(() => {
    forceUpdate({});
  }, [combinedRolls.length, testRolls.length]);

  // Send predictions to debug
  useEffect(() => {
    if (!prediction || combinedRolls.length < 4) return;
    const fingerprint = combinedRolls.join(",");
    if (lastSentRef.current !== fingerprint) {
      lastSentRef.current = fingerprint;
      onSendToDebug?.(combinedRolls, "3-str", { source: "kiyo" });
    }
  }, [prediction, combinedRolls, onSendToDebug]);

  // Send debug data with enhanced strategic analytics
  useEffect(() => {
    if (!prediction || !analyzeWavePatterns || !onSendKiyoDebugData) return;

    const dataSignature = JSON.stringify({
      pred: prediction.prediction,
      conf: prediction.confidence,
      alt: prediction.alt,
      mode: prediction.mode,
      focusCol: analyzeWavePatterns.focusColumn?.[1]?.column,
      rollCount: combinedRolls.length,
    });
    if (lastSentDataRef.current === dataSignature) return;
    lastSentDataRef.current = dataSignature;

    // 🔥 ENHANCED: Calculate strategic tier and reliability metrics
    const strategicAnalysis = calculateStrategicTier(
      analyzeWavePatterns,
      smartPrefixPrediction,
      prediction
    );

    const debugData = {
      waveAnalysis: JSON.parse(JSON.stringify(analyzeWavePatterns)),
      prediction: { ...prediction },
      smartPrefix: smartPrefixPrediction ? { ...smartPrefixPrediction } : null,
      pairingViz: pairingViz ? [...pairingViz] : [],
      combinedRolls: [...combinedRolls],

      // 🔥 NEW: Strategic tier assessment
      strategicTier: strategicAnalysis.tier,
      tierReasoning: strategicAnalysis.reasoning,
      recommendedAction: strategicAnalysis.action,
      effectiveReliability: strategicAnalysis.effectiveReliability,

      // 🔥 NEW: Reliability breakdown
      reliabilityFactors: strategicAnalysis.factors,

      // 🔥 NEW: Wave vs Prefix alignment
      alignment: strategicAnalysis.alignment,
      conflictResolution: strategicAnalysis.conflictResolution,
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

  // Handle test roll input
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-emerald-400">
            🌊 Kiyo Mode (EU Wave Theory)
          </h3>
          <p className="text-[11px] text-slate-400">
            Run-length rhythm analysis with smart prefix prediction
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
            className="px-3 py-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition flex items-center gap-1.5"
            title="Import rolls from .txt file"
          >
            📁 Import Rolls
          </button>

          <button
            onClick={() => setShowDecisionGuide(!showDecisionGuide)}
            className="px-3 py-1.5 text-xs font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40 rounded-lg transition"
          >
            📖 Decision Guide
          </button>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            {showDebug ? "Hide" : "Show"} Debug
          </button>
        </div>
      </div>

      {/* 🔥 EXTRACTED: Import Stats Display */}
      <ImportStatsDisplay
        importedRolls={importedRolls}
        showImportStats={showImportStats}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
        onClearImported={handleClearImported}
      />

      {/* 🔥 EXTRACTED: Kiyo Mode Accuracy */}
      <KiyoAccuracyStats kiyoAccuracy={kiyoAccuracy} />

      {/* 🔥 EXTRACTED: Combined Dataset */}
      <CombinedDatasetStats
        combinedDataset={combinedDataset}
        trainingStats={trainingStats}
        importedRolls={importedRolls}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
      />

      {/* TOP ROW: Test Rolls + Wave Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
          <WaveAnalysisDisplay analyzeWavePatterns={analyzeWavePatterns} />
        )}
      </div>

      {/* PREDICTION CARDS ROW */}
      <PredictionCards
        analyzeWavePatterns={analyzeWavePatterns}
        smartPrefixPrediction={smartPrefixPrediction}
        manualLine={manualLine}
        setManualLine={setManualLine}
      />

      {/* 🔥 EXTRACTED: RAW INPUT HELPER */}
      <RawInputHelper
        analyzeWavePatterns={analyzeWavePatterns}
        testRolls={testRolls}
      />

      {/* WAVE PAIRING TABLE */}
      {combinedRolls.length >= 4 && (
        <WavePairingTable pairingViz={pairingViz} />
      )}

      {/* 🔥 EXTRACTED: DEBUG PANEL */}
      {showDebug && (
        <KiyoDebugPanel
          analyzeWavePatterns={analyzeWavePatterns}
          smartPrefixPrediction={smartPrefixPrediction}
          prediction={prediction}
        />
      )}

      {/* Compound Analysis */}
      {analyzeWavePatterns && analyzeWavePatterns.avgSwapRate && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <div className="text-sm font-semibold mb-2">📊 Compound Analysis</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Avg Swap Rate:</span>
              <span className="ml-2 text-white">
                {(parseFloat(analyzeWavePatterns.avgSwapRate) * 100).toFixed(0)}
                %
              </span>
            </div>
            <div>
              <span className="text-gray-400">Flip Columns:</span>
              <span className="ml-2 text-white">
                {analyzeWavePatterns.flipColumns}/3
              </span>
            </div>
            <div>
              <span className="text-gray-400">Sticky Columns:</span>
              <span className="ml-2 text-white">
                {analyzeWavePatterns.stickyColumns}/3
              </span>
            </div>
            <div>
              <span className="text-gray-400">Compound Conf:</span>
              <span
                className={`ml-2 font-bold ${
                  analyzeWavePatterns.compoundConfidence === "HIGH"
                    ? "text-green-400"
                    : analyzeWavePatterns.compoundConfidence === "MODERATE"
                    ? "text-yellow-400"
                    : "text-gray-400"
                }`}
              >
                {analyzeWavePatterns.compoundConfidence}
              </span>
            </div>
          </div>
          {analyzeWavePatterns.flipColumns >= 2 && (
            <div className="mt-2 text-xs text-green-400">
              ⚡ Multi-column flip agreement detected! Confidence boosted.
            </div>
          )}
        </div>
      )}

      {/* DECISION GUIDE MODAL */}
      {showDecisionGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDecisionGuide(false)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border-2 border-violet-500/60 shadow-2xl max-w-4xl max-h-[90vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-violet-900/90 to-purple-900/90 backdrop-blur-sm p-4 border-b border-violet-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <h2 className="text-lg font-bold text-violet-200">
                    Wave Theory Decision Guide
                  </h2>
                  <p className="text-xs text-violet-300">
                    Quick reference for making predictions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDecisionGuide(false)}
                className="text-violet-300 hover:text-white text-2xl font-bold px-3 py-1 hover:bg-violet-500/20 rounded transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Priority System */}
              <div className="bg-gradient-to-br from-orange-900/40 to-red-900/30 rounded-lg p-4 border border-orange-500/50">
                <h3 className="text-base font-bold text-orange-300 mb-3 flex items-center gap-2">
                  <span>🎯</span> PRIORITY SYSTEM
                </h3>
                <div className="space-y-3">
                  <div className="bg-orange-950/60 rounded-lg p-3 border border-orange-500/30">
                    <div className="text-sm font-bold text-orange-200 mb-2">
                      🔥 HIGHEST PRIORITY: Sticky Wave + Long Run
                    </div>
                    <div className="text-xs text-orange-100 space-y-1">
                      <div>
                        • Swap Rate:{" "}
                        <span className="text-green-300 font-bold">
                          &lt;30% (Sticky)
                        </span>
                      </div>
                      <div>
                        • Run Length:{" "}
                        <span className="text-orange-300 font-bold">
                          4+ consecutive
                        </span>
                      </div>
                      <div>
                        • Confidence:{" "}
                        <span className="text-emerald-300 font-bold">
                          75-85%
                        </span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-orange-500/30 text-yellow-200 font-semibold">
                        ⚠️ When this occurs, TRUST THE WAVE over Smart Prefix!
                      </div>
                    </div>
                  </div>

                  <div className="bg-violet-950/60 rounded-lg p-3 border border-violet-500/30">
                    <div className="text-sm font-bold text-violet-200 mb-2">
                      ⚡ HIGH PRIORITY: Wave + Prefix Aligned
                    </div>
                    <div className="text-xs text-violet-100">
                      When both wave and prefix agree on the same digit,
                      confidence is highest (80-90%).
                    </div>
                  </div>

                  <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/30">
                    <div className="text-sm font-bold text-cyan-200 mb-2">
                      📊 NORMAL: Prefix Only
                    </div>
                    <div className="text-xs text-cyan-100">
                      When no strong wave pattern exists, use Smart Prefix
                      prediction (45-65%).
                    </div>
                  </div>
                </div>
              </div>

              {/* Swap Rate Guide */}
              <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/30 rounded-lg p-4 border border-emerald-500/50">
                <h3 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2">
                  <span>🌊</span> SWAP RATE MEANINGS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-emerald-950/60 rounded-lg p-3 border border-emerald-500/30">
                    <div className="text-sm font-bold text-green-300 mb-2">
                      🔒 Sticky (&lt;40%)
                    </div>
                    <div className="text-xs text-emerald-100 space-y-1">
                      <div>
                        <span className="font-bold">Most Reliable!</span>
                      </div>
                      <div>Pattern is stable and predictable.</div>
                      <div className="pt-2 text-green-200">
                        Flip predictions are strongest here.
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-950/60 rounded-lg p-3 border border-amber-500/30">
                    <div className="text-sm font-bold text-yellow-300 mb-2">
                      ⚡ Moderate (40-70%)
                    </div>
                    <div className="text-xs text-amber-100 space-y-1">
                      <div>
                        <span className="font-bold">Average reliability</span>
                      </div>
                      <div>Pattern changes regularly but not chaotically.</div>
                      <div className="pt-2 text-yellow-200">
                        Use with caution.
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-950/60 rounded-lg p-3 border border-red-500/30">
                    <div className="text-sm font-bold text-red-300 mb-2">
                      🌊 High Activity (≥70%)
                    </div>
                    <div className="text-xs text-red-100 space-y-1">
                      <div>
                        <span className="font-bold">Volatile!</span>
                      </div>
                      <div>Pattern flips constantly.</div>
                      <div className="pt-2 text-red-200">
                        Trust prefix more than wave.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Run Length Guide */}
              <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/30 rounded-lg p-4 border border-blue-500/50">
                <h3 className="text-base font-bold text-blue-300 mb-3 flex items-center gap-2">
                  <span>📏</span> RUN LENGTH THRESHOLDS
                </h3>
                <div className="space-y-2">
                  <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-blue-200">
                        5+ Consecutive
                      </div>
                      <div className="text-xs text-blue-100">
                        Flip is very likely
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-300">
                      80-85%
                    </div>
                  </div>

                  <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-blue-200">
                        3-4 Consecutive
                      </div>
                      <div className="text-xs text-blue-100">
                        Flip is likely
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-300">
                      70-75%
                    </div>
                  </div>

                  <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-blue-200">
                        2 Consecutive
                      </div>
                      <div className="text-xs text-blue-100">
                        Could go either way
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-300">
                      55%
                    </div>
                  </div>

                  <div className="bg-blue-950/60 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-blue-200">
                        1 or Less
                      </div>
                      <div className="text-xs text-blue-100">May continue</div>
                    </div>
                    <div className="text-2xl font-bold text-slate-400">
                      50-60%
                    </div>
                  </div>
                </div>
              </div>

              {/* Conflict Resolution */}
              <div className="bg-gradient-to-br from-red-900/40 to-pink-900/30 rounded-lg p-4 border border-red-500/50">
                <h3 className="text-base font-bold text-red-300 mb-3 flex items-center gap-2">
                  <span>⚠️</span> WHEN WAVE vs PREFIX CONFLICT
                </h3>
                <div className="space-y-3 text-sm text-red-100">
                  <div className="bg-red-950/60 rounded-lg p-3 border border-red-500/30">
                    <div className="font-bold text-red-200 mb-2">
                      IF Swap Rate &lt; 30% AND Run ≥ 4:
                    </div>
                    <div className="text-green-300 font-bold text-base">
                      → TRUST THE WAVE (ignore prefix)
                    </div>
                  </div>

                  <div className="bg-red-950/60 rounded-lg p-3 border border-red-500/30">
                    <div className="font-bold text-red-200 mb-2">
                      IF Swap Rate 30-70% OR Run = 2-3:
                    </div>
                    <div className="text-yellow-300 font-bold text-base">
                      → CONSIDER BOTH (cautious approach)
                    </div>
                  </div>

                  <div className="bg-red-950/60 rounded-lg p-3 border border-red-500/30">
                    <div className="font-bold text-red-200 mb-2">
                      IF Swap Rate &gt; 70% OR Run &lt; 2:
                    </div>
                    <div className="text-cyan-300 font-bold text-base">
                      → TRUST PREFIX (wave unreliable)
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Example */}
              <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/30 rounded-lg p-4 border border-purple-500/50">
                <h3 className="text-base font-bold text-purple-300 mb-3 flex items-center gap-2">
                  <span>💡</span> REAL EXAMPLE
                </h3>
                <div className="bg-purple-950/60 rounded-lg p-3 border border-purple-500/30 space-y-2 text-xs text-purple-100">
                  <div className="font-bold text-purple-200 text-sm mb-2">
                    Scenario:
                  </div>
                  <div>
                    • Column 2:{" "}
                    <span className="text-orange-300 font-bold">
                      5 consecutive Outer
                    </span>
                  </div>
                  <div>
                    • Swap Rate:{" "}
                    <span className="text-green-300 font-bold">
                      20% (Sticky)
                    </span>
                  </div>
                  <div>
                    • Wave predicts:{" "}
                    <span className="text-cyan-300 font-bold">
                      Inner (42/43)
                    </span>
                  </div>
                  <div>
                    • Prefix predicts:{" "}
                    <span className="text-yellow-300 font-bold">
                      421 (Outer)
                    </span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-purple-500/30">
                    <div className="text-sm font-bold text-emerald-300 mb-1">
                      ✅ DECISION: Trust Wave (Inner)
                    </div>
                    <div className="text-purple-200">
                      Because: Sticky (&lt;30%) + Long Run (5) = Highest
                      reliability
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="text-sm font-bold text-green-300">
                      Result: 413 (Inner = 3) ✅ Wave was correct!
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-base font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <span>💎</span> QUICK TIPS
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      Always check{" "}
                      <span className="text-emerald-300 font-bold">
                        Swap Rate first
                      </span>{" "}
                      - it tells you reliability
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      <span className="text-orange-300 font-bold">
                        Sticky + Long Run
                      </span>{" "}
                      beats everything else
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      When wave and prefix{" "}
                      <span className="text-violet-300 font-bold">align</span>,
                      confidence is highest
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      High swap rate (≥70%) ={" "}
                      <span className="text-red-300 font-bold">
                        trust prefix
                      </span>{" "}
                      instead
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>
                      Need at least{" "}
                      <span className="text-cyan-300 font-bold">4 rolls</span>{" "}
                      for reliable predictions
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
