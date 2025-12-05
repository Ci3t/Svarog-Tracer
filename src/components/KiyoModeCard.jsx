import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  predictNext3EU,
  predictWithPrefix,
  calculatePrefixConfidenceBoost,
} from "../utils/predictNext";
import { EU_SEQUENTIAL_3STR } from "../utils/euLiveSheetData";
import { translateTo4 } from "../utils/stringHelpers";
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
          {/* 🔥 NEW: Import Button */}
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

      {/* 🔥 NEW: Import Stats Display */}
      {importedRolls.length > 0 && (
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-4 border border-blue-500/40">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-blue-300 font-semibold flex items-center gap-2">
              <span>📁 Imported Rolls Dataset</span>
              {showImportStats && (
                <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Just imported!
                </span>
              )}
            </div>
            <button
              onClick={handleClearImported}
              className="text-[10px] text-red-400 hover:text-red-300 font-semibold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/30 transition"
            >
              Clear Imported
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-blue-950/40 rounded-lg p-2.5 border border-blue-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Imported</div>
              <div className="text-2xl font-black text-blue-300">
                {importedRolls.length}
              </div>
              <div className="text-[9px] text-slate-500">patterns</div>
            </div>

            <div className="bg-indigo-950/40 rounded-lg p-2.5 border border-indigo-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Test Rolls</div>
              <div className="text-2xl font-black text-indigo-300">
                {testRolls.length}
              </div>
              <div className="text-[9px] text-slate-500">manual</div>
            </div>

            <div className="bg-cyan-950/40 rounded-lg p-2.5 border border-cyan-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Live Rolls</div>
              <div className="text-2xl font-black text-cyan-300">
                {live3Rolls.length}
              </div>
              <div className="text-[9px] text-slate-500">session</div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-blue-200 bg-blue-950/40 rounded p-2 border border-blue-500/20">
            <span className="font-semibold">💡 Tip:</span> Imported rolls are
            added to the training pool for better predictions. They appear first
            in chronological order.
          </div>
        </div>
      )}

      {/* Kiyo Mode Accuracy */}
      {kiyoAccuracy.total > 0 && (
        <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 rounded-xl p-4 border border-emerald-500/40">
          <div className="text-xs text-emerald-300 mb-3 font-semibold">
            📊 Kiyo Mode Accuracy (This Session)
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-emerald-950/40 rounded-lg p-2 border border-emerald-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Main</div>
              <div className="text-xl font-black text-emerald-300">
                {kiyoAccuracy.mainPct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {kiyoAccuracy.mainHits} hits
              </div>
            </div>
            <div className="bg-amber-950/40 rounded-lg p-2 border border-amber-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Alt</div>
              <div className="text-xl font-black text-amber-300">
                {kiyoAccuracy.altPct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {kiyoAccuracy.altHits} hits
              </div>
            </div>
            <div className="bg-rose-950/40 rounded-lg p-2 border border-rose-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Miss</div>
              <div className="text-xl font-black text-rose-300">
                {kiyoAccuracy.total
                  ? Math.round((kiyoAccuracy.misses / kiyoAccuracy.total) * 100)
                  : 0}
                %
              </div>
              <div className="text-[9px] text-slate-500">
                {kiyoAccuracy.misses} misses
              </div>
            </div>
            <div className="bg-violet-950/40 rounded-lg p-2 border border-violet-500/20 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Top-2</div>
              <div className="text-xl font-black text-violet-300">
                {kiyoAccuracy.top2Pct}%
              </div>
              <div className="text-[9px] text-slate-500">
                {kiyoAccuracy.mainHits + kiyoAccuracy.altHits} /{" "}
                {kiyoAccuracy.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combined Dataset */}
      <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-xl p-4 border border-emerald-500/40">
        <div className="text-xs text-emerald-300 mb-3 font-semibold flex items-center gap-2">
          <span>📚 Combined Dataset</span>
          <span className="text-[10px] text-slate-400 font-normal">
            (Training: {trainingStats.total} + Imported: {importedRolls.length}{" "}
            + Test: {testRolls.length} + Live: {live3Rolls.length})
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
            <div className="text-[10px] text-slate-400 mb-1">Total Samples</div>
            <div className="text-2xl font-black text-emerald-300">
              {combinedDataset.total.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500">
              {importedRolls.length > 0 && `+${importedRolls.length} imported`}
            </div>
          </div>
          <div className="bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-500/20">
            <div className="text-[10px] text-slate-400 mb-1">Your Rolls</div>
            <div className="text-2xl font-black text-sky-300">
              {importedRolls.length + testRolls.length + live3Rolls.length}
            </div>
            <div className="text-[9px] text-slate-500">combined user data</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]">
          <div>
            <span className="text-slate-400">Most common:</span>{" "}
            <span className="text-emerald-300 font-mono font-bold">
              {combinedDataset.patterns[0].pattern}
            </span>
            <span className="text-slate-500">
              {" "}
              ({combinedDataset.patterns[0].pct}%)
            </span>
          </div>
          <div>
            <span className="text-slate-400">Least common:</span>{" "}
            <span className="text-emerald-300 font-mono font-bold">
              {
                combinedDataset.patterns[combinedDataset.patterns.length - 1]
                  .pattern
              }
            </span>
            <span className="text-slate-500">
              {" "}
              (
              {
                combinedDataset.patterns[combinedDataset.patterns.length - 1]
                  .pct
              }
              %)
            </span>
          </div>
        </div>
      </div>

      {/* TOP ROW: Test Rolls + Wave Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Test Roll Input */}
        <div className="space-y-2 flex flex-col">
          <label className="text-xs text-slate-300 font-semibold flex items-center gap-2">
            🧪 Test Rolls
            <span className="text-[10px] text-slate-500 font-normal">
              (Enter 3-digit combo, auto-translated to 4xx)
            </span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            value={testInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^1-4]/g, "");
              setTestInput(val);

              // Clear activePrefix when typing to let smartPrefixPrediction use typing mode
              if (val.length >= 2) {
                setActivePrefix(null);
              }
            }}
            onKeyDown={handleTestRollSubmit}
            placeholder="e.g. 121 or 232"
            className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-violet-300 font-semibold">
              Test Rolls
            </span>
            <span className="text-xs text-slate-500">
              {testRolls.length} rolls
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-lg border border-slate-700/50 max-h-[500px] overflow-y-auto flex-1">
            {testRolls.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No test rolls yet
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-900/60 sticky top-0">
                  <tr className="text-left text-[11px] font-semibold text-slate-400">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Input</th>
                    <th className="py-2 px-3">→ Translated</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {[...testRolls]
                    .map((roll, idx) => ({
                      idx,
                      raw: roll,
                      translated: translatedTestRolls[idx],
                    }))
                    .reverse()
                    .map(({ idx, raw, translated }, displayIdx) => {
                      const displayIndex = testRolls.length - displayIdx;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="py-2 px-3 text-slate-500">
                            {displayIndex}
                          </td>
                          <td className="py-2 px-3 font-mono text-violet-300 font-bold">
                            {raw}
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                            {translated}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => handleDeleteTestRoll(idx)} // ✅ FIXED - use idx directly
                              className="text-[11px] text-slate-500 hover:text-red-400 transition"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 🔥 REFACTORED: RUN-LENGTH WAVE ANALYSIS CARD */}
        {combinedRolls.length >= 4 && analyzeWavePatterns && (
          <div className="flex flex-col">
            {analyzeWavePatterns.flipCols.length > 0 ? (
              <div className="bg-gradient-to-br from-orange-900/50 to-red-900/40 rounded-lg p-3 border border-orange-500/60 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="text-sm font-bold text-orange-300">
                      DUE TO FLIP
                    </div>
                    <div className="text-[9px] text-orange-200">
                      {analyzeWavePatterns.flipCols.length} column
                      {analyzeWavePatterns.flipCols.length > 1 ? "s" : ""}{" "}
                      showing long run
                    </div>
                  </div>
                </div>

                {/* Focus Column Detail */}
                {analyzeWavePatterns.focusColumn &&
                  (() => {
                    const [_, focusCol] = analyzeWavePatterns.focusColumn;
                    return (
                      <div className="bg-orange-950/60 rounded-lg p-3 border border-orange-500/40 mb-2 flex-1 flex flex-col">
                        <div className="text-xs text-orange-300 font-bold mb-3 flex items-center gap-2">
                          <span>🎯</span>
                          <span>Focus: {focusCol.scheme.name}</span>
                        </div>

                        <div className="space-y-3 flex-1">
                          {/* Rhythm Pattern Display */}
                          <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                            <div className="text-[10px] text-orange-200 mb-1.5">
                              Rhythm Pattern
                            </div>
                            <div className="text-base font-mono font-black text-orange-300 mb-1">
                              {focusCol.rhythmDisplay}
                            </div>
                            <div className="text-xs text-orange-400">
                              Run: {focusCol.run.length} consecutive{" "}
                              {focusCol.currentLabel}
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                              <div className="text-[10px] text-orange-200 mb-1">
                                Current Run
                              </div>
                              <div className="text-2xl font-black text-orange-300">
                                {focusCol.run.length}
                                <span className="text-base text-orange-400 ml-0.5">
                                  {focusCol.currentLabel[0]}
                                </span>
                              </div>
                            </div>

                            <div className="bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30">
                              <div className="text-[10px] text-emerald-200 mb-1">
                                Expected Flip
                              </div>
                              <div className="text-lg font-black text-emerald-300">
                                {focusCol.flipLabel}
                              </div>
                            </div>
                          </div>

                          {/* Confidence Bar */}
                          <div className="bg-orange-900/40 rounded-lg p-3 border border-orange-500/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-orange-200">
                                Flip Confidence
                              </span>
                              <span className="text-sm font-bold text-orange-300">
                                {Math.round(focusCol.confidence * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-orange-950/60 rounded-full overflow-hidden border border-orange-500/30">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-red-400 transition-all duration-300"
                                style={{
                                  width: `${focusCol.confidence * 100}%`,
                                }}
                              ></div>
                            </div>
                            <div className="text-[9px] text-orange-200 mt-1">
                              {focusCol.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* All Columns Grid */}
                <div className="grid grid-cols-3 gap-2 flex-1 content-start">
                  {Object.entries(analyzeWavePatterns.columnAnalysis).map(
                    ([key, col]) => {
                      const urgencyColors = {
                        critical:
                          "from-red-900/80 to-orange-900/80 border-red-500/70",
                        high: "from-orange-900/70 to-amber-900/70 border-orange-500/60",
                        medium:
                          "from-amber-900/60 to-yellow-900/60 border-amber-500/50",
                        low: "from-slate-800/60 to-slate-700/60 border-slate-600/50",
                        none: "from-slate-900/60 to-slate-800/60 border-slate-700/50",
                        skip: "from-purple-900/60 to-violet-900/60 border-purple-500/50",
                      };

                      const urgencyBadge = {
                        critical: "🔴 CRITICAL",
                        high: "🟠 HIGH",
                        medium: "🟡 MEDIUM",
                        low: "⚪ LOW",
                        none: "🔵 NONE",
                        skip: "🟣 SKIP",
                      };

                      return (
                        <div
                          key={key}
                          className={`rounded-lg p-2 border bg-gradient-to-br ${
                            urgencyColors[col.urgency] || urgencyColors.none
                          }`}
                        >
                          {/* Header with urgency badge */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[11px] font-bold text-slate-300">
                              {col.scheme.name}
                            </div>
                            <div
                              className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                                col.urgency === "critical"
                                  ? "bg-red-500/30 text-red-200"
                                  : col.urgency === "high"
                                  ? "bg-orange-500/30 text-orange-200"
                                  : col.urgency === "medium"
                                  ? "bg-amber-500/30 text-amber-200"
                                  : "bg-slate-700/30 text-slate-400"
                              }`}
                            >
                              {urgencyBadge[col.urgency] || "NONE"}
                            </div>
                          </div>

                          {/* Rhythm pattern */}
                          <div className="text-[10px] font-mono mb-1 text-slate-400">
                            {col.rhythmDisplay.slice(-11)}
                          </div>

                          {/* Run info with icon */}
                          <div className="text-[11px] mb-1 flex items-center gap-1">
                            <span className="text-slate-400">Run:</span>
                            <span className="text-lg">
                              {col.flipStatus.icon}
                            </span>
                            <span
                              className={
                                col.urgency === "critical" ||
                                col.urgency === "high"
                                  ? "text-orange-300 font-bold"
                                  : "text-slate-300"
                              }
                            >
                              {col.run.length} {col.currentLabel[0]}
                            </span>
                          </div>

                          {/* Confidence bar */}
                          <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden mb-1">
                            <div
                              className={`h-full ${
                                col.urgency === "critical"
                                  ? "bg-gradient-to-r from-red-400 to-orange-400"
                                  : col.urgency === "high"
                                  ? "bg-gradient-to-r from-orange-400 to-amber-400"
                                  : col.urgency === "medium"
                                  ? "bg-amber-500"
                                  : "bg-slate-600"
                              }`}
                              style={{ width: `${col.confidence * 100}%` }}
                            ></div>
                          </div>

                          {/* Status message */}
                          <div
                            className={`text-[9px] font-bold ${
                              col.urgency === "critical" ||
                              col.urgency === "high"
                                ? "text-orange-300"
                                : col.urgency === "medium"
                                ? "text-amber-300"
                                : "text-slate-500"
                            }`}
                          >
                            {col.status === "due_to_flip"
                              ? `⚠️ → ${col.flipLabel}`
                              : col.status === "post_flip_cooldown"
                              ? "⏸️ POST-FLIP"
                              : col.status === "could_go_either_way"
                              ? "🤔 Either Way"
                              : col.status === "likely_continue"
                              ? `→ ${col.flipLabel}`
                              : col.status === "ignored"
                              ? "🚫 IGNORE"
                              : "Balanced"}
                          </div>

                          {/* Swap Rate with color coding */}
                          <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                            <span className="text-[10px]">Swap:</span>
                            <span
                              className={`font-bold text-[10px] ${
                                col.swapRate >= 0.7
                                  ? "text-red-400"
                                  : col.swapRate >= 0.4
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }`}
                            >
                              {(col.swapRate * 100).toFixed(0)}% (
                              {col.swapRateLabel})
                            </span>
                          </div>

                          {/* Post-flip warning */}
                          {col.missedFlip?.justFlipped && (
                            <div className="mt-1 text-[8px] bg-purple-900/40 rounded px-1.5 py-1 border border-purple-500/40 text-purple-200">
                              ⏸️ Just flipped from {col.missedFlip.previousRun}
                              -run
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-lg p-3 border border-emerald-500/40 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✓</span>
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      BALANCED
                    </div>
                    <div className="text-[9px] text-emerald-200">
                      No strong run patterns detected
                    </div>
                  </div>
                </div>

                {/* Show all columns with short runs */}
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(analyzeWavePatterns.columnAnalysis).map(
                    ([key, col]) => (
                      <div
                        key={key}
                        className="bg-slate-900/60 rounded p-2 border border-slate-700/50"
                      >
                        <div className="text-[11px] font-bold text-slate-300 mb-1">
                          {col.scheme.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mb-1">
                          {col.rhythmDisplay.slice(-11)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Run: {col.run.length} {col.currentLabel[0]}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PREDICTION CARDS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* RECOMMENDED TARGET */}
        {analyzeWavePatterns?.focusColumn &&
          (() => {
            const [_, focusCol] = analyzeWavePatterns.focusColumn;
            const prefixLastDigit = smartPrefixPrediction?.prediction?.[2];
            const isAligned =
              prefixLastDigit && focusCol.flipTarget.includes(prefixLastDigit);

            return (
              <div className="bg-gradient-to-br from-cyan-900/50 to-emerald-900/50 rounded-lg p-3 border border-cyan-500/60">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-xs font-bold text-cyan-300">
                      RECOMMENDED TARGET
                    </div>
                    <div className="text-[10px] text-cyan-200">
                      Based on wave rhythm
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="bg-cyan-950/60 rounded p-2 border border-cyan-500/40">
                    <div className="text-[12px] text-cyan-300 font-semibold mb-1">
                      Target digits:
                    </div>
                    <div className="flex gap-1">
                      {focusCol.flipTarget.map((digit) => (
                        <div
                          key={digit}
                          className="flex-1 bg-cyan-900/60 rounded px-2 py-1.5 border border-cyan-500/50 text-center"
                        >
                          <div className="text-2xl font-mono font-black text-cyan-300">
                            4{digit}
                          </div>
                          <div className="text-[11px] text-yellow-200">
                            {focusCol.flipLabel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[12px] text-slate-400">
                    Confidence:{" "}
                    <span className="text-cyan-300 font-bold">
                      {Math.round(focusCol.confidence * 100)}%
                    </span>
                  </div>

                  {/* Alignment with Smart Prefix */}
                  {smartPrefixPrediction && (
                    <div
                      className={`rounded px-2 py-1.5 border text-center ${
                        isAligned
                          ? "bg-emerald-950/60 border-emerald-500/40"
                          : "bg-red-950/60 border-red-500/40"
                      }`}
                    >
                      <div
                        className={`text-[10px] font-bold ${
                          isAligned ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {isAligned
                          ? "✓ WAVE & PREFIX ALIGNED"
                          : "⚠️ WAVE vs PREFIX"}
                      </div>
                      <div
                        className={`text-[9px] mt-0.5 ${
                          isAligned ? "text-emerald-200" : "text-red-200"
                        }`}
                      >
                        {isAligned
                          ? `Both suggest ${prefixLastDigit}`
                          : `Wave: ${focusCol.flipTarget.join(
                              "/"
                            )} vs Prefix: ${prefixLastDigit}`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {/* SMART PREFIX PREDICTOR */}
        {smartPrefixPrediction && (
          <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-lg p-3 border border-cyan-500/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <div>
                <div className="text-xs font-bold text-cyan-300">
                  SMART PREFIX PREDICTOR
                </div>
                <div className="text-[8px] text-cyan-200">
                  {smartPrefixPrediction.sourceType === "typing"
                    ? "Live input suggestions"
                    : `Prefix: ${smartPrefixPrediction.sourcePrefix}x`}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-cyan-950/60 rounded-lg p-3 border border-cyan-500/40 text-center">
                <div className="text-[10px] text-cyan-400 mb-1">
                  Analyzing: {smartPrefixPrediction.sourcePrefix}x
                </div>
                {smartPrefixPrediction.prediction ? (
                  <>
                    <div className="text-3xl font-mono font-black text-cyan-300 mb-1">
                      {smartPrefixPrediction.prediction}
                    </div>
                    <div className="text-xs font-bold text-cyan-400">
                      {Math.round(smartPrefixPrediction.confidence * 100)}%
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      {smartPrefixPrediction.matchCount} matches
                      {smartPrefixPrediction.confidenceBoost && (
                        <span
                          className={`ml-1 font-semibold ${
                            smartPrefixPrediction.confidenceBoost > 0
                              ? "text-emerald-400"
                              : "text-orange-400"
                          }`}
                        >
                          (
                          {smartPrefixPrediction.confidenceBoost > 0 ? "+" : ""}
                          {Math.round(
                            smartPrefixPrediction.confidenceBoost * 100
                          )}
                          % live)
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-mono font-black text-orange-300 mb-1">
                      —
                    </div>
                    <div className="text-xs text-orange-400">
                      Insufficient data
                    </div>
                  </>
                )}
              </div>

              {smartPrefixPrediction.prediction &&
                smartPrefixPrediction.alt && (
                  <div className="bg-blue-950/60 rounded-lg p-2 border border-blue-500/40 text-center">
                    <div className="text-[10px] text-blue-400 mb-0.5">
                      Alternative
                    </div>
                    <div className="text-lg font-mono font-bold text-blue-300">
                      {smartPrefixPrediction.alt}
                    </div>
                    <div className="text-[10px] text-blue-400">
                      {Math.round(smartPrefixPrediction.confidence * 0.7 * 100)}
                      %
                    </div>
                  </div>
                )}

              {/* All Candidates */}
              {smartPrefixPrediction.prediction && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    All {smartPrefixPrediction.sourcePrefix}x options:
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {smartPrefixPrediction.candidates.map((cand, idx) => (
                      <div
                        key={cand.value}
                        className={`px-2 py-1.5 rounded text-xs font-mono font-bold text-center ${
                          idx === 0
                            ? "bg-cyan-500/20 border-2 border-cyan-400/60 text-cyan-300"
                            : idx === 1
                            ? "bg-blue-500/20 border border-blue-400/60 text-blue-300"
                            : "bg-slate-800/60 border border-slate-600/40 text-slate-300"
                        }`}
                      >
                        <div className="text-sm">{cand.value}</div>
                        <div className="text-[9px] opacity-75">{cand.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINE HELPER */}
        <div className="rounded-lg p-3 border border-slate-500/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📍</span>
            <div>
              <div className="text-xs font-bold text-amber-300">
                LINE HELPER
              </div>
              <div className="text-[10px] text-amber-200">
                Caesar shift for your line
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-amber-300 font-semibold">
              Your line:
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((line) => (
                <button
                  key={line}
                  onClick={() =>
                    setManualLine(
                      manualLine === String(line) ? "" : String(line)
                    )
                  }
                  className={`py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                    manualLine === String(line)
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/50"
                  }`}
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          {manualLine && smartPrefixPrediction && (
            <div className="space-y-1 pt-2 mt-2 border-t border-amber-500/30">
              {(() => {
                const mainShifted = caesarShiftForLine(
                  smartPrefixPrediction.prediction,
                  manualLine
                );
                const altShifted = caesarShiftForLine(
                  smartPrefixPrediction.alt,
                  manualLine
                );

                return (
                  <>
                    {mainShifted && (
                      <div className="bg-violet-900/30 rounded p-1.5 border border-violet-500/30">
                        <div className="text-[10px] text-violet-300 font-semibold mb-0.5">
                          Main @ Line {manualLine}
                        </div>
                        <div className="text-lg font-mono font-black text-violet-300 text-center">
                          {mainShifted}
                        </div>
                      </div>
                    )}
                    {altShifted && (
                      <div className="bg-sky-900/30 rounded p-1.5 border border-sky-500/30">
                        <div className="text-[10px] text-sky-300 font-semibold mb-0.5">
                          Alt @ Line {manualLine}
                        </div>
                        <div className="text-base font-mono font-bold text-sky-300 text-center">
                          {altShifted}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {!manualLine && (
            <div className="text-center py-2 mt-2 text-[8px] text-amber-400/60 bg-amber-950/20 rounded border border-amber-500/20">
              Select a line to see Caesar shift
            </div>
          )}
        </div>
      </div>

      {/* RAW INPUT HELPER */}
      {analyzeWavePatterns?.focusColumn &&
        testRolls.length > 0 &&
        (() => {
          const lastRaw = testRolls[testRolls.length - 1];
          const currentLine = parseInt(lastRaw[lastRaw.length - 1]);
          const [_, focusCol] = analyzeWavePatterns.focusColumn;

          return (
            <div className="bg-violet-900/30 rounded-lg p-3 border border-violet-500/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📍</span>
                <div>
                  <div className="text-sm font-bold text-violet-300">
                    Raw Input Helper
                  </div>
                  <div className="text-[10px] text-violet-400">
                    What to type based on your last string
                  </div>
                </div>
              </div>

              <div className="text-[13px] text-violet-200 bg-violet-950/40 rounded px-2 py-1 mb-2">
                Your last string:{" "}
                <span className="font-mono font-bold">{lastRaw}</span> (ends at
                Line {currentLine})
              </div>

              <div className="grid grid-cols-2 gap-2">
                {focusCol.flipTarget.map((digit) => {
                  const targetDigit = parseInt(digit);
                  let rawInput = (targetDigit - currentLine + 4) % 4;
                  if (rawInput === 0) rawInput = 4;

                  return (
                    <div
                      key={digit}
                      className="bg-violet-950/60 rounded p-2 border border-violet-500/30"
                    >
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-violet-200">
                          Target{" "}
                          <span className="font-mono font-bold text-yellow-300 text-[14px]">
                            4{digit}
                          </span>
                        </span>
                        <span className="text-violet-300 font-bold">
                          → Line {targetDigit}
                        </span>
                      </div>
                      <div className="bg-violet-500/20 rounded px-2 py-1.5 text-center">
                        <div className="text-[9px] text-violet-400 mb-0.5">
                          Type:
                        </div>
                        <div className="text-2xl font-mono font-black text-yellow-300">
                          {rawInput}
                        </div>
                      </div>
                      <div className="mt-1 pt-1 border-t border-violet-500/20 text-[12px] text-orange-300">
                        <div className="font-mono">
                          {currentLine}
                          {rawInput} = 4{targetDigit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* WAVE PAIRING TABLE */}
      {combinedRolls.length >= 4 && (
        <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-700/50">
          <div className="text-xs text-emerald-300 font-semibold mb-3">
            🎨 Wave Pairing Pattern (Last {pairingViz?.length || 0} rolls)
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 text-[12px]">
            {Object.entries(WAVE_SCHEMES).map(([key, scheme]) => (
              <div
                key={key}
                className="bg-slate-900/60 rounded px-3 py-2 border border-slate-700/50"
              >
                <div className="text-slate-400 font-semibold mb-1">
                  {scheme.name}: {scheme.label}
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                    <span className="text-emerald-300">{scheme.pairAFull}</span>
                  </div>
                  <div>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
                    <span className="text-amber-300">{scheme.pairBFull}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-700/50 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-900/60 sticky top-0">
                <tr>
                  <th className="py-2 px-3 text-left text-slate-400 font-semibold border border-slate-700/50">
                    Roll
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Odds/Evens
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Outer/Inner
                  </th>
                  <th className="py-2 px-3 text-center text-slate-400 font-semibold border border-slate-700/50">
                    Low/High
                  </th>
                </tr>
              </thead>
              <tbody>
                {pairingViz?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 text-slate-300 font-mono font-bold border border-slate-700/30">
                      {row.roll}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col1.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col1.label} ({row.roll}) {/* ✅ ADDED roll number */}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col2.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col2.label} ({row.roll}) {/* ✅ ADDED roll number */}
                    </td>
                    <td
                      className={`py-2 px-3 text-center font-semibold text-[9px] border border-slate-700/30 ${
                        row.col3.isA
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-amber-900/40 text-amber-300"
                      }`}
                    >
                      {row.col3.label} ({row.roll}) {/* ✅ ADDED roll number */}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-slate-500">
                      No data yet - add at least 4 rolls
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[12px] text-slate-400 bg-slate-900/40 rounded p-2 border border-slate-700/30">
            <span className="text-emerald-300 font-semibold">
              📖 How to Read:
            </span>{" "}
            Look for long runs of the same color (3+ consecutive) - that column
            is "due to flip" to the opposite. Rhythm patterns like E-E-E-E-O-E
            show strong even dominance with potential flip coming.
          </div>
        </div>
      )}

      {/* DEBUG PANEL */}
      {showDebug && (
        <div className="bg-slate-950/90 rounded-lg p-4 border border-slate-700/50 space-y-3 text-[11px] font-mono">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-emerald-300 font-bold">
              🔬 Enhanced Debug Info
            </div>
            <div className="text-[10px] text-slate-500">
              Lookback: {analyzeWavePatterns.lookbackUsed} rolls
            </div>
          </div>

          {/* 🔥 NEW: Strategic Tier Summary */}
          {(() => {
            const strategicTier = calculateStrategicTier(
              analyzeWavePatterns,
              smartPrefixPrediction,
              prediction
            );
            return (
              <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 rounded-lg p-3 border border-violet-500/50">
                <div className="text-violet-300 font-semibold mb-2 flex items-center gap-2">
                  🎯 Strategic Assessment
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      strategicTier.tier === "S"
                        ? "bg-emerald-500/30 text-emerald-200"
                        : strategicTier.tier === "A"
                        ? "bg-blue-500/30 text-blue-200"
                        : "bg-slate-500/30 text-slate-200"
                    }`}
                  >
                    TIER {strategicTier.tier}
                  </span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      Effective Reliability:
                    </span>
                    <span
                      className={`font-bold ${
                        strategicTier.effectiveReliability >= 75
                          ? "text-emerald-400"
                          : strategicTier.effectiveReliability >= 60
                          ? "text-blue-400"
                          : "text-slate-400"
                      }`}
                    >
                      {strategicTier.effectiveReliability}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Alignment:</span>
                    <span
                      className={`font-bold ${
                        strategicTier.alignment === "ALIGNED"
                          ? "text-green-400"
                          : strategicTier.alignment === "CONFLICT"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {strategicTier.alignment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Action:</span>
                    <span
                      className={`font-bold ${
                        strategicTier.action.includes("GOOD")
                          ? "text-emerald-400"
                          : strategicTier.action.includes("OKAY")
                          ? "text-blue-400"
                          : "text-slate-400"
                      }`}
                    >
                      {strategicTier.action}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-violet-500/30 text-violet-200">
                    {strategicTier.reasoning.join(" • ")}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 🔥 NEW: Wave Analysis Summary */}
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
            <div className="text-sky-300 font-semibold mb-2">
              🌊 Wave Analysis
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Flip Columns:</span>
                <span className="text-orange-300 font-bold">
                  {analyzeWavePatterns.flipColumns}/3
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sticky Columns:</span>
                <span className="text-green-300 font-bold">
                  {analyzeWavePatterns.stickyColumns}/3
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Swap Rate:</span>
                <span
                  className={`font-bold ${
                    parseFloat(analyzeWavePatterns.avgSwapRate) >= 0.7
                      ? "text-red-400"
                      : parseFloat(analyzeWavePatterns.avgSwapRate) >= 0.4
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {(parseFloat(analyzeWavePatterns.avgSwapRate) * 100).toFixed(
                    0
                  )}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Compound:</span>
                <span
                  className={`font-bold ${
                    analyzeWavePatterns.compoundConfidence === "HIGH"
                      ? "text-green-400"
                      : analyzeWavePatterns.compoundConfidence === "MODERATE"
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {analyzeWavePatterns.compoundConfidence}
                </span>
              </div>
            </div>

            {analyzeWavePatterns.ignoredColumns?.length > 0 && (
              <div className="mt-2 text-[9px] text-red-400 bg-red-950/30 rounded px-2 py-1">
                🚫 Ignored: Column{" "}
                {analyzeWavePatterns.ignoredColumns.join(", ")} (≥70% swap)
              </div>
            )}

            {analyzeWavePatterns.postFlipColumns?.length > 0 && (
              <div className="mt-2 text-[9px] text-purple-400 bg-purple-950/30 rounded px-2 py-1">
                ⏸️ Post-Flip: Column{" "}
                {analyzeWavePatterns.postFlipColumns.join(", ")}
              </div>
            )}
          </div>

          {/* Column Details */}
          {prediction.debug?.columnResults?.map((col) => (
            <div
              key={col.column}
              className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-violet-300 font-semibold">
                  {col.name} (Column {col.column})
                </div>
                <div className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
                  {col.swapRate
                    ? `${(col.swapRate * 100).toFixed(0)}% swap`
                    : ""}
                </div>
              </div>
              <div className="text-slate-400 text-[10px] space-y-0.5">
                <div>
                  Predicted Pair:{" "}
                  <span className="text-emerald-300">{col.predictedPair}</span>{" "}
                  → [{col.predictedDigits.join(", ")}]
                </div>
                <div>
                  Last Run:{" "}
                  <span className="text-amber-300">{col.lastRunPair}</span> ×{" "}
                  {col.lastRunLength} | Avg: {col.avgRunLength}
                </div>
                <div className="flex items-center gap-2">
                  <span>Confidence:</span>
                  <span className="text-sky-300">
                    {(col.confidence * 100).toFixed(0)}%
                  </span>
                  {col.consecutiveCount >= 3 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                      {col.consecutiveCount} consecutive
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Digit Votes */}
          {prediction.debug?.digitVotes && (
            <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
              <div className="text-sky-300 font-semibold mb-2">Digit Votes</div>
              <div className="grid grid-cols-4 gap-2">
                {prediction.debug.digitVotes.map((vote) => (
                  <div
                    key={vote.digit}
                    className="bg-slate-950/60 rounded px-2 py-1.5 text-center border border-slate-700/30"
                  >
                    <div className="text-slate-200 font-bold text-sm">
                      {vote.digit}
                    </div>
                    <div className="text-slate-500 text-[9px]">
                      {vote.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vote Strength */}
          <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-500">Vote Strength:</span>{" "}
            <span className="text-emerald-300 font-bold">
              {(parseFloat(prediction.debug?.voteStrength || 0) * 100).toFixed(
                1
              )}
              %
            </span>
          </div>

          {/* Recent Context */}
          {prediction.debug?.recentRolls && (
            <div className="text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-800">
              <div className="text-slate-500 mb-1">Recent Context:</div>
              <div className="text-slate-200 font-mono text-[10px]">
                {prediction.debug.recentRolls.join(" → ")}
              </div>
            </div>
          )}
        </div>
      )}

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
