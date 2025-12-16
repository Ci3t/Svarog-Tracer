// KiyoModeCard.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { predictNext3EU, predictWithPrefix } from "../utils/predictNext";
import AccuracyHeaderBar from "./kiyo/AccuracyHeaderBar";

// NEW:
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

// 🔥 Import kiyo components
import TestRollsInput from "./kiyo/TestRollsInput";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import GuideModal from "./kiyo/GuideModal";

// 🔥 Import new layout components
import AdvancedToolsSection from "./AdvancedToolsSection";

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

// 🔥 FIXED: calculateConsecutiveRun now accepts digitPosition parameter
function calculateConsecutiveRun(rolls, scheme, digitPosition = 2) {
  if (!rolls || rolls.length === 0)
    return { pair: null, length: 0, pattern: [] };

  const pattern = [];
  let currentPair = null;
  let runLength = 0;

  for (let i = rolls.length - 1; i >= 0; i--) {
    const checkDigit = rolls[i][digitPosition];
    const isA = scheme.pairA.includes(checkDigit);
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

// 🔥 FIXED: calculateSwapRate now accepts digitPosition parameter
function calculateSwapRate(rolls, scheme, digitPosition = 2) {
  if (!rolls || rolls.length < 2) return 0;

  let swaps = 0;
  let lastPair = null;

  for (let i = rolls.length - 1; i >= 0; i--) {
    const checkDigit = rolls[i][digitPosition];
    const isA = scheme.pairA.includes(checkDigit);
    const pair = isA ? "A" : "B";

    if (lastPair !== null && pair !== lastPair) {
      swaps++;
    }
    lastPair = pair;
  }

  return swaps / (rolls.length - 1);
}

// 🔥 FIXED: calculateFlipStatus with adaptive thresholds
function calculateFlipStatus(runLength, pair, scheme, columnBehavior = null) {
  // Use adaptive thresholds if behavior data available
  const isVolatile = columnBehavior?.behavior === "volatile";
  const isSticky = columnBehavior?.behavior === "sticky";
  const flipAt2Rate = columnBehavior?.flipAt2Rate || 0;

  // 🔥 CRITICAL: For volatile columns, 2-run is significant
  if (runLength === 2 && isVolatile && flipAt2Rate > 0.5) {
    return {
      status: "due_to_flip",
      confidence: 0.6 + flipAt2Rate * 0.15, // 60-75%
      message: `${runLength} consecutive ${
        pair === "A" ? scheme.pairALabel : scheme.pairBLabel
      } - FLIP LIKELY (volatile pattern)`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "medium",
      icon: "🟡",
      adaptiveNote: `🧠 ${Math.round(
        flipAt2Rate * 100
      )}% flip at 2 historically`,
    };
  }

  // 🔥 STICKY: Higher thresholds needed
  if (runLength >= 5) {
    const baseConf = 0.75 + (runLength - 5) * 0.05;
    const stickyBonus = isSticky ? 0.05 : 0;
    return {
      status: "due_to_flip",
      confidence: Math.min(baseConf + stickyBonus, 0.92),
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
      confidence: 0.72,
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
      confidence: 0.67,
      message: `${runLength} consecutive ${
        pair === "A" ? scheme.pairALabel : scheme.pairBLabel
      } - FLIP POSSIBLE`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency: "medium",
      icon: "🟡",
    };
  } else if (runLength === 2) {
    // Normal 2-run handling
    const confidence = flipAt2Rate > 0.4 ? 0.6 : 0.55;
    const status = flipAt2Rate > 0.4 ? "due_to_flip" : "could_go_either_way";
    const urgency = flipAt2Rate > 0.4 ? "medium" : "low";
    const icon = flipAt2Rate > 0.4 ? "🟡" : "⚪";

    return {
      status,
      confidence,
      message: `${runLength} consecutive - ${
        flipAt2Rate > 0.4 ? "Flip likely" : "Could go either way"
      }`,
      flipTarget: pair === "A" ? scheme.pairB : scheme.pairA,
      flipLabel: pair === "A" ? scheme.pairBLabel : scheme.pairALabel,
      urgency,
      icon,
      adaptiveNote:
        flipAt2Rate > 0
          ? `🧠 ${Math.round(flipAt2Rate * 100)}% flip at 2`
          : null,
    };
  } else if (runLength === 1) {
    return {
      status: "likely_continue",
      confidence: 0.52,
      message: `Just started - Likely to continue`,
      // ✅ NOT A FLIP — CONTINUATION
      flipTarget: pair === "A" ? scheme.pairA : scheme.pairB,
      flipLabel:
        pair === "A"
          ? `Continue ${scheme.pairALabel}`
          : `Continue ${scheme.pairBLabel}`,
      urgency: "none",
      icon: "🔵",
      isContinuation: true,
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
function detectMissedFlip(recentRolls, scheme, digitPosition = 2) {
  if (recentRolls.length < 8) return null;

  // Check if a long run existed 3-8 rolls ago
  const previousWindow = recentRolls.slice(-8, -2);
  const currentWindow = recentRolls.slice(-2);

  // Analyze previous window
  let prevRunPair = null;
  let prevRunLength = 0;

  for (let i = previousWindow.length - 1; i >= 0; i--) {
    const checkDigit = previousWindow[i][digitPosition];
    const isA = scheme.pairA.includes(checkDigit);
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
    const checkDigit = roll[digitPosition];
    return scheme.pairA.includes(checkDigit) ? "A" : "B";
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

// 🔥 NEW: Calculate historical flip behavior per column (ADAPTIVE LEARNING)
function calculateColumnFlipBehavior(rolls, scheme, lookback = 20) {
  if (!rolls || rolls.length < 6) {
    return {
      avgFlipLength: 3,
      flipAt2Rate: 0,
      totalFlips: 0,
      behavior: "unknown",
      flips: [],
    };
  }

  const recentRolls = rolls.slice(-Math.min(lookback, rolls.length));
  const flips = [];
  let currentPair = null;
  let runLength = 0;

  for (let i = recentRolls.length - 1; i >= 0; i--) {
    const lastDigit = recentRolls[i][2];
    const isA = scheme.pairA.includes(lastDigit);
    const pair = isA ? "A" : "B";

    if (currentPair === null) {
      currentPair = pair;
      runLength = 1;
    } else if (pair === currentPair) {
      runLength++;
    } else {
      if (runLength >= 2) flips.push({ length: runLength, pair: currentPair });
      currentPair = pair;
      runLength = 1;
    }
  }

  const avgFlipLength =
    flips.length > 0
      ? flips.reduce((sum, f) => sum + f.length, 0) / flips.length
      : 3;

  const flipAt2Count = flips.filter((f) => f.length === 2).length;
  const flipAt3Count = flips.filter((f) => f.length === 3).length;
  const flipAt2Rate = flips.length > 0 ? flipAt2Count / flips.length : 0;
  const flipAt3Rate = flips.length > 0 ? flipAt3Count / flips.length : 0;

  let behavior = "moderate";
  if (flipAt2Rate > 0.5) behavior = "volatile";
  else if (avgFlipLength >= 4) behavior = "sticky";

  return {
    avgFlipLength: Math.round(avgFlipLength * 10) / 10,
    flipAt2Rate,
    flipAt3Rate,
    totalFlips: flips.length,
    behavior,
    flips,
    recentPattern: flips.slice(-5).map((f) => f.length),
  };
}

// 🔥 NEW: Multi-column prediction combiner (Column 2 & 3 only)
function predictFromMultipleColumns(columnAnalysis) {
  const col2Digits =
    columnAnalysis[0].status === "due_to_flip"
      ? columnAnalysis[0].flipTarget
      : columnAnalysis[0].currentPair === "A"
      ? columnAnalysis[0].scheme.pairA
      : columnAnalysis[0].scheme.pairB;

  const col3Digits =
    columnAnalysis[1].status === "due_to_flip"
      ? columnAnalysis[1].flipTarget
      : columnAnalysis[1].currentPair === "A"
      ? columnAnalysis[1].scheme.pairA
      : columnAnalysis[1].scheme.pairB;

  const highConfCols = columnAnalysis.filter(
    (c) => c.confidence >= 0.65
  ).length;

  const predictions = [];
  for (const d2 of col2Digits) {
    for (const d3 of col3Digits) {
      const finalRoll = `4${d2}${d3}`;

      const avgConfidence =
        (columnAnalysis[0].confidence + columnAnalysis[1].confidence) / 2;
      const confidenceBoost = highConfCols >= 2 ? 1.15 : 1.0;

      predictions.push({
        roll: finalRoll,
        confidence: Math.min(avgConfidence * confidenceBoost, 0.9),
        breakdown: {
          col2: { digit: d2, conf: columnAnalysis[0].confidence },
          col3: { digit: d3, conf: columnAnalysis[1].confidence },
        },
      });
    }
  }

  predictions.sort((a, b) => b.confidence - a.confidence);

  return {
    prediction: predictions[0]?.roll || null,
    confidence: predictions[0]?.confidence || 0.5,
    alt: predictions[1]?.roll || null,
    allPredictions: predictions.slice(0, 3),
    multiColumnAgreement: highConfCols >= 2,
  };
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

// 🔥 IMPROVED STRATEGIC TIER CALCULATOR
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

  // 🔥 TIER S
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

  // 🔥 TIER A
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
  } else if (
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

  // 🔥 TIER B
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
  onKiyoSnapshot,
}) {
  const [testInput, setTestInput] = useState("");
  const [testRolls, setTestRolls] = useState([]);
  const [manualLine, setManualLine] = useState("");
  const [activePrefix, setActivePrefix] = useState(null);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const lastSentRef = useRef(null);
  const [, forceUpdate] = useState();
  const lastSentDataRef = useRef(null);
  const [datasetRegion, setDatasetRegion] = useState("EU"); // default EU

  // 🔥 NEW: Imported rolls from text file
  const [importedRolls, setImportedRolls] = useState([]);
  const [showImportStats, setShowImportStats] = useState(false);
  const fileInputRef = useRef(null);

  const [persistentWaveAccuracy, setPersistentWaveAccuracy] = useState({
    col2: { hits: 0, total: 0 },
    col3: { hits: 0, total: 0 },
    lastPredictions: { col2: null, col3: null },
  });

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

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🔥 NEW: Clear imported rolls
  const handleClearImported = () => {
    if (confirm(`Clear ${importedRolls.length} imported rolls?`))
      setImportedRolls([]);
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

  // 🔥 Wave accuracy (persistent)
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

  // 🔥 Wave analysis (Column 2 & 3 only)
  const analyzeWavePatterns = useMemo(() => {
    if (combinedRolls.length < 4)
      return {
        columns: [],
        avgSwapRate: 0,
        flipColumns: 0,
        stickyColumns: 0,
        compoundConfidence: "NORMAL",
      };

    const avgSwapEstimate =
      combinedRolls.length >= 6
        ? combinedRolls.slice(-6).reduce((acc, roll, idx, arr) => {
            if (idx === 0) return 0;
            return acc + (roll[2] !== arr[idx - 1][2] ? 1 : 0);
          }, 0) / 5
        : 0.5;

    const LOOKBACK =
      avgSwapEstimate < 0.4
        ? Math.min(20, combinedRolls.length)
        : avgSwapEstimate < 0.6
        ? Math.min(15, combinedRolls.length)
        : Math.min(12, combinedRolls.length);

    const recentRolls = combinedRolls.slice(-LOOKBACK);

    // Only col2 + col3
    const schemes = [WAVE_SCHEMES.col2, WAVE_SCHEMES.col3];

    let totalSwapRate = 0;
    let validColumnsCount = 0;

    const columnAnalysis = schemes.map((scheme, idx) => {
      const digitPosition = idx === 0 ? 1 : 2; // col2 = 2nd digit | col3 = 3rd digit

      const runAnalysis = calculateConsecutiveRun(
        recentRolls,
        scheme,
        digitPosition
      );
      const columnBehavior = calculateColumnFlipBehavior(
        recentRolls,
        scheme,
        LOOKBACK
      );
      const flipStatus = calculateFlipStatus(
        runAnalysis.length,
        runAnalysis.pair,
        scheme,
        columnBehavior
      );
      const swapRate = calculateSwapRate(recentRolls, scheme, digitPosition);
      const missedFlip = detectMissedFlip(recentRolls, scheme, digitPosition);

      const isIgnored = swapRate >= 0.7;

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

      const rhythmDisplay = runAnalysis.pattern
        .map((p) => (p === "A" ? scheme.pairALabel[0] : scheme.pairBLabel[0]))
        .join("-");

      const currentLabel =
        runAnalysis.pair === "A" ? scheme.pairALabel : scheme.pairBLabel;
      const flipLabel = adjustedFlipStatus.flipLabel;

      return {
        column: idx + 2, // Column 2 & 3
        name: scheme.name,
        label: scheme.label,
        scheme,
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

        behavior: columnBehavior.behavior,
        flipAt2Rate: columnBehavior.flipAt2Rate,
        avgFlipLength: columnBehavior.avgFlipLength,
        adaptiveNote: adjustedFlipStatus.adaptiveNote,
      };
    });

    const avgSwapRate =
      validColumnsCount > 0 ? totalSwapRate / validColumnsCount : 0;

    const flipColumns = columnAnalysis.filter(
      (col) =>
        !col.isIgnored &&
        col.flipStatus.status === "due_to_flip" &&
        col.flipStatus.urgency !== "skip"
    );

    const stickyColumns = columnAnalysis.filter(
      (col) => !col.isIgnored && col.swapRate < 0.4
    );

    let compoundConfidence = "NORMAL";
    if (flipColumns.length >= 2) compoundConfidence = "HIGH";
    else if (flipColumns.length === 1 && stickyColumns.length >= 1)
      compoundConfidence = "MODERATE";

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

  // 🔥 NEW: Multi-column wave prediction (not used in UI here, but kept)
  const waveMultiColumnPrediction = useMemo(() => {
    if (!analyzeWavePatterns || combinedRolls.length < 4) return null;
    const { columns } = analyzeWavePatterns;
    if (!columns || columns.length < 2) return null;
    return predictFromMultipleColumns(columns);
  }, [analyzeWavePatterns, combinedRolls]);

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

    const trainingPrediction = predictWithPrefix(
      EU_SEQUENTIAL_3STR_RECENT,
      sourcePrefix
    );
    const livePrediction =
      combinedRolls.length >= 6
        ? predictWithPrefix(combinedRolls, sourcePrefix)
        : null;

    let finalPrediction;

    if (livePrediction && livePrediction.matchCount >= 3) {
      if (trainingPrediction.prediction === livePrediction.prediction) {
        finalPrediction = {
          ...livePrediction,
          confidence: Math.min(
            trainingPrediction.confidence * 0.25 +
              livePrediction.confidence * 0.75 +
              0.12,
            0.9
          ),
          matchCount: livePrediction.matchCount + trainingPrediction.matchCount,
          agreement: "strong",
        };
      } else {
        finalPrediction = {
          ...livePrediction,
          confidence: livePrediction.confidence * 0.9,
          matchCount: livePrediction.matchCount,
          agreement: "conflict-live-primary",
          trainingAlt: trainingPrediction.prediction,
        };
      }
    } else if (livePrediction && livePrediction.matchCount >= 2) {
      if (trainingPrediction.prediction === livePrediction.prediction) {
        finalPrediction = {
          ...livePrediction,
          confidence: Math.min(
            trainingPrediction.confidence * 0.3 +
              livePrediction.confidence * 0.7 +
              0.08,
            0.85
          ),
          matchCount: livePrediction.matchCount + trainingPrediction.matchCount,
          agreement: "moderate",
        };
      } else {
        finalPrediction = {
          ...livePrediction,
          confidence: livePrediction.confidence * 0.85,
          matchCount: livePrediction.matchCount,
          agreement: "conflict-moderate",
          trainingAlt: trainingPrediction.prediction,
        };
      }
    } else {
      if (
        livePrediction &&
        trainingPrediction.prediction === livePrediction.prediction
      ) {
        finalPrediction = {
          ...trainingPrediction,
          confidence: Math.min(trainingPrediction.confidence * 1.05, 0.75),
          matchCount: trainingPrediction.matchCount + livePrediction.matchCount,
          agreement: "weak-live-agreement",
        };
      } else {
        finalPrediction = {
          ...trainingPrediction,
          confidence: trainingPrediction.confidence * 0.95,
          matchCount: trainingPrediction.matchCount,
          agreement: "training-only",
          liveAlt: livePrediction?.prediction || null,
        };
      }
    }

    return {
      ...finalPrediction,
      sourcePrefix,
      sourceType,
      liveMatchCount: livePrediction?.matchCount || 0,
      trainingMatchCount: trainingPrediction?.matchCount || 0,
    };
  }, [combinedRolls, activePrefix, testInput]);

  // 🔥 LEGACY TRACER PREDICTION
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

  // 🔥 PAIRING VISUALIZATION (for AdvancedToolsSection)
  const pairingViz = useMemo(() => {
    if (combinedRolls.length < 4) return null;
    const vizRolls = combinedRolls.slice(-12);

    return vizRolls.reverse().map((roll) => {
      const col1Digit = roll[0];
      const col2Digit = roll[1];
      const col3Digit = roll[2];

      return {
        roll,
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
  }, [combinedRolls]);

  // ✅ REGION SELECTOR — ONLY CHANGES TRAINING DATA (for stats display)
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

  // ✅ COMBINED DATASET (TRAINING + LIVE) for header stats
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

  // Send kiyo debug blob (wave+prefix+pairing) to DebugPanel
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

      // waveData for timeline
      waveData: {
        col2Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[0];
          if (!col) return null;
          if (col.status === "due_to_flip" && col.flipTarget?.length > 0)
            return col.flipTarget;
          if (col.status === "likely_continue" || col.runLength === 1) {
            return col.currentPair === "A"
              ? col.scheme.pairA
              : col.scheme.pairB;
          }
          return null;
        })(),
        col3Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[1];
          if (!col) return null;
          if (col.status === "due_to_flip" && col.flipTarget?.length > 0)
            return col.flipTarget;
          if (col.status === "likely_continue" || col.runLength === 1) {
            return col.currentPair === "A"
              ? col.scheme.pairA
              : col.scheme.pairB;
          }
          return null;
        })(),
        col2Confidence: analyzeWavePatterns?.columns?.[0]?.confidence || 0,
        col3Confidence: analyzeWavePatterns?.columns?.[1]?.confidence || 0,
        col2Status: analyzeWavePatterns?.columns?.[0]?.status || "unknown",
        col3Status: analyzeWavePatterns?.columns?.[1]?.status || "unknown",
      },

      strategicTier: strategicAnalysis.tier,
      tierReasoning: strategicAnalysis.reasoning,
      recommendedAction: strategicAnalysis.action,
      effectiveReliability: strategicAnalysis.effectiveReliability,
      reliabilityFactors: strategicAnalysis.factors,
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

  const handleResetWaveAccuracy = () => {
    setPersistentWaveAccuracy({
      col2: { hits: 0, total: 0 },
      col3: { hits: 0, total: 0 },
      lastPredictions: { col2: null, col3: null },
    });
  };

  // 🔥 Track wave accuracy (only when wave predicted flips)
  useEffect(() => {
    if (!analyzeWavePatterns || combinedRolls.length < 4) return;

    const latestRoll = combinedRolls[combinedRolls.length - 1];
    if (!latestRoll) return;

    const actualCol2 = latestRoll[1];
    const actualCol3 = latestRoll[2];

    const col2Analysis = analyzeWavePatterns.columns?.[0];
    const col3Analysis = analyzeWavePatterns.columns?.[1];

    const getCurrentPrediction = (colAnalysis) => {
      if (!colAnalysis) return null;
      if (
        colAnalysis.status === "due_to_flip" &&
        colAnalysis.flipTarget?.length > 0
      )
        return colAnalysis.flipTarget;
      return null;
    };

    const currentCol2Pred = getCurrentPrediction(col2Analysis);
    const currentCol3Pred = getCurrentPrediction(col3Analysis);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedRolls.length]);
  // 👇 ADD THIS NEW useEffect

  return (
    <div className="space-y-3">
      {/* Header */}
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

        {/* ✅ REGION SELECTOR */}
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

      {/* Import Stats Toast */}
      <ImportStatsDisplay
        importedRolls={importedRolls}
        showImportStats={showImportStats}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
        onClearImported={handleClearImported}
      />

      {/* TEST ROLLS */}
      <TestRollsInput
        testInput={testInput}
        setTestInput={setTestInput}
        handleTestRollSubmit={handleTestRollSubmit}
        testRolls={testRolls}
        translatedTestRolls={translatedTestRolls}
        handleDeleteTestRoll={handleDeleteTestRoll}
        setActivePrefix={setActivePrefix}
      />

      {/* Wave Analysis */}
      {combinedRolls.length >= 4 && analyzeWavePatterns && (
        <WaveAnalysisDisplay
          analyzeWavePatterns={analyzeWavePatterns}
          smartPrefixPrediction={smartPrefixPrediction}
        />
      )}

      {/* Advanced Tools */}
      <AdvancedToolsSection
        waveAccuracy={waveAccuracy}
        kiyoAccuracy={kiyoAccuracy}
        pairingViz={pairingViz}
      />

      {/* Decision Guide Modal */}
      {showDecisionGuide && (
        <GuideModal
          show={showDecisionGuide}
          onClose={() => setShowDecisionGuide(false)}
        />
      )}
    </div>
  );
}

// 🔥 NEW: Get most frequent digit from recent rolls
function getMostFrequentDigit(digits, recentRolls, position = 2) {
  if (!digits || digits.length === 0) return digits[0];
  if (recentRolls.length < 3) return digits[0];

  const freq = {};
  digits.forEach((d) => (freq[d] = 0));

  // Count occurrences in last 8 rolls
  recentRolls.slice(-8).forEach((roll) => {
    const digit = String(roll)[position];
    if (Object.prototype.hasOwnProperty.call(freq, digit)) {
      freq[digit]++;
    }
  });

  return digits.sort((a, b) => (freq[b] || 0) - (freq[a] || 0))[0];
}
