import React, { useState, useMemo, useEffect, useRef } from "react";
import { predictNext3EU, predictWithPrefix } from "../utils/predictNext";
import AccuracyHeaderBar from "./kiyo/AccuracyHeaderBar";
// NEW:
import {
  EU_SEQUENTIAL_3STR_RECENT,
  EU_SEQUENTIAL_3STR_ALL,
  EU_PATCH_INFO,
} from "../utils/euLiveSheetData";
import { translateTo4 } from "../utils/stringHelpers";

// 🔥 Import kiyo components
import PredictionCards from "./kiyo/PredictionCards";
import TestRollsInput from "./kiyo/TestRollsInput";
import WavePairingTable from "./kiyo/WavePairingTable";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import KiyoAccuracyStats from "./kiyo/KiyoAccuracyStats";
import CombinedDatasetStats from "./kiyo/CombinedDatasetStats";
import RawInputHelper from "./kiyo/RawInputHelper";
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import KiyoDebugPanel from "./kiyo/KiyoDebugPanel";
import WaveAccuracyDisplay from "./kiyo/WaveAccuracyDisplay";

// 🔥 Import new layout components
import CompactStatsHeader from "./CompactStatsHeader";
import AdvancedToolsSection from "./AdvancedToolsSection";
import ModesInfo from "./ModesInfo";
import GuideModal from "./kiyo/GuideModal";

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
// 🔥 ENHANCED: Adaptive flip status with column-specific behavior
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
      if (runLength >= 2) {
        flips.push({ length: runLength, pair: currentPair });
      }
      currentPair = pair;
      runLength = 1;
    }
  }

  // Calculate metrics
  const avgFlipLength =
    flips.length > 0
      ? flips.reduce((sum, f) => sum + f.length, 0) / flips.length
      : 3;

  const flipAt2Count = flips.filter((f) => f.length === 2).length;
  const flipAt3Count = flips.filter((f) => f.length === 3).length;
  const flipAt2Rate = flips.length > 0 ? flipAt2Count / flips.length : 0;
  const flipAt3Rate = flips.length > 0 ? flipAt3Count / flips.length : 0;

  // Determine behavior type
  let behavior = "moderate";
  if (flipAt2Rate > 0.5) {
    behavior = "volatile"; // Flips frequently after just 2
  } else if (avgFlipLength >= 4) {
    behavior = "sticky"; // Needs longer runs to flip
  }

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

// 🔥 NEW: Multi-column prediction combiner
// 🔥 NEW: Multi-column prediction combiner
function predictFromMultipleColumns(columnAnalysis) {
  // 🔥 CHANGE: Only Column 2 & 3
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

  // Add this to KiyoModeCard.jsx - Replace the waveAccuracy useMemo

  // 🔥 REPLACE THE waveAccuracy useMemo WITH THIS
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
      combined: {
        pct: combinedPct,
        hits: totalHits,
        total: totalPredictions,
      },
    };
  }, [persistentWaveAccuracy]);
  // 🔥 EXPLANATION:
  // - Wave accuracy ONLY counts when wave made a flip prediction (col2Prediction/col3Prediction exist)
  // - It checks if actual digit matches the predicted digits array
  // - Stays persistent because it's based on debugLogs history
  // - Won't reset unless debugLogs are cleared

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

    // 🔥 CHANGE: Only use Column 2 & 3 (skip Column 1)
    const schemes = [WAVE_SCHEMES.col2, WAVE_SCHEMES.col3];

    let totalSwapRate = 0;
    let validColumnsCount = 0;

    const columnAnalysis = schemes.map((scheme, idx) => {
      const runAnalysis = calculateConsecutiveRun(recentRolls, scheme);

      // 🔥 NEW: Calculate adaptive behavior
      const columnBehavior = calculateColumnFlipBehavior(
        recentRolls,
        scheme,
        LOOKBACK
      );

      const flipStatus = calculateFlipStatus(
        runAnalysis.length,
        runAnalysis.pair,
        scheme,
        columnBehavior // 🔥 PASS BEHAVIOR DATA
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
        column: idx + 2, // 🔥 This is correct (Column 2 & 3)
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

        // 🔥 NEW: Add adaptive behavior data
        behavior: columnBehavior.behavior,
        flipAt2Rate: columnBehavior.flipAt2Rate,
        avgFlipLength: columnBehavior.avgFlipLength,
        adaptiveNote: adjustedFlipStatus.adaptiveNote,
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

  // 🔥 NEW: Multi-column wave prediction
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

    // 🔥 PRIORITY 1: Live typing input
    if (testInput.length >= 2) {
      const paddedInput = testInput.length === 2 ? testInput + "1" : testInput;
      const translated = translateTo4(paddedInput);
      if (translated && translated.length >= 2) {
        sourcePrefix = translated.slice(0, 2);
        sourceType = "typing";
      }
    }
    // 🔥 PRIORITY 2: Manual prefix selection
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

    // ═══════════════════════════════════════════════════════
    // 🔥 TIER S: CRITICAL WAVE OVERRIDE (5+ run + sticky <30%)
    // ═══════════════════════════════════════════════════════
    if (analyzeWavePatterns?.focusColumn) {
      const focusCol = analyzeWavePatterns.focusColumn[1];

      if (
        focusCol.urgency === "critical" &&
        focusCol.swapRate < 0.3 &&
        focusCol.runLength >= 5 &&
        focusCol.status === "due_to_flip"
      ) {
        // 🔥 WAVE IS CRITICAL - OVERRIDE EVERYTHING

        // Get the other column (not focus)
        const otherCol = analyzeWavePatterns.columns.find(
          (c) => c.column !== focusCol.column
        );

        // Narrow down predictions using frequency
        const col2Digit = getMostFrequentDigit(
          analyzeWavePatterns.columns[0].flipTarget.length > 0
            ? analyzeWavePatterns.columns[0].flipTarget
            : analyzeWavePatterns.columns[0].scheme.pairA,
          combinedRolls,
          1
        );

        const col3Digit = getMostFrequentDigit(
          focusCol.flipTarget,
          combinedRolls,
          2
        );

        return {
          prediction: `4${col2Digit}${col3Digit}`,
          alt: `4${col2Digit}${
            focusCol.flipTarget.find((d) => d !== col3Digit) || col3Digit
          }`,
          confidence: Math.min(focusCol.confidence, 0.85),
          matchCount: 0,
          agreement: "wave-critical-override",
          sourcePrefix,
          sourceType,
          method: "wave-critical",
          tier: "S",
          icon: "🔥",
          overrideReason: `${focusCol.runLength}-run ${
            focusCol.currentLabel
          } + ${Math.round(focusCol.swapRate * 100)}% sticky`,
          blendInfo: {
            method: "wave-critical-override",
            liveWeight: 0,
            reason: "Critical wave pattern detected - ignoring prefix",
          },
        };
      }
    }

    // ═══════════════════════════════════════════════════════
    // 🔥 NORMAL FLOW: Smart Prefix with Wave Validation
    // ═══════════════════════════════════════════════════════

    const trainingPrediction = predictWithPrefix(
      EU_SEQUENTIAL_3STR_RECENT,
      sourcePrefix
    );

    const livePrediction =
      combinedRolls.length >= 6
        ? predictWithPrefix(combinedRolls, sourcePrefix)
        : null;

    let finalPrediction;
    let blendInfo = { method: "training-only", liveWeight: 0 };

    if (livePrediction && livePrediction.matchCount >= 3) {
      // ✅ STRONG LIVE: Session has clear pattern
      const liveWeight = 0.75;
      blendInfo = { method: "strong-live", liveWeight };

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
      const liveWeight = 0.7;
      blendInfo = { method: "moderate-live", liveWeight };

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
      blendInfo = {
        method: "training-primary",
        liveWeight: livePrediction ? 0.3 : 0,
        reason: livePrediction
          ? `Live has only ${livePrediction.matchCount} match(es)`
          : "Insufficient live data",
      };

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

    // ═══════════════════════════════════════════════════════
    // 🔥 WAVE VALIDATION: Check alignment and adjust confidence
    // ═══════════════════════════════════════════════════════

    if (waveMultiColumnPrediction && finalPrediction.prediction) {
      const wavePredLastDigit = waveMultiColumnPrediction.prediction[2];
      const prefixPredLastDigit = finalPrediction.prediction[2];
      const alignsWithWave = wavePredLastDigit === prefixPredLastDigit;

      if (alignsWithWave && waveMultiColumnPrediction.multiColumnAgreement) {
        finalPrediction.confidence = Math.min(
          finalPrediction.confidence * 1.25,
          0.9
        );
        finalPrediction.waveBoost = "multi-column-aligned";
        finalPrediction.icon = "✅";
      } else if (
        analyzeWavePatterns?.focusColumn &&
        analyzeWavePatterns.focusColumn[1].urgency === "high"
      ) {
        const [_, focusCol] = analyzeWavePatterns.focusColumn;
        const alignsWithFocus =
          focusCol.flipTarget.includes(prefixPredLastDigit);

        if (alignsWithFocus) {
          finalPrediction.confidence = Math.min(
            finalPrediction.confidence * 1.15,
            0.85
          );
          finalPrediction.waveBoost = "high-aligned";
          finalPrediction.icon = "✅";
        } else {
          finalPrediction.confidence *= 0.75;
          finalPrediction.waveConflict = true;
          finalPrediction.icon = "⚠️";
        }
      }
    }

    return {
      ...finalPrediction,
      sourcePrefix,
      sourceType,
      blendInfo,
      liveMatchCount: livePrediction?.matchCount || 0,
      trainingMatchCount: trainingPrediction?.matchCount || 0,
    };
  }, [
    combinedRolls,
    activePrefix,
    testInput,
    analyzeWavePatterns,
    waveMultiColumnPrediction,
  ]);
  // 🔥 LEGACY TRAC
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
  // Fix lines 1217-1231 (trainingStats):
  const trainingStats = useMemo(() => {
    const freq = {};
    EU_SEQUENTIAL_3STR_RECENT.forEach((pattern) => {
      freq[pattern] = (freq[pattern] || 0) + 1;
    });
    const total = EU_SEQUENTIAL_3STR_RECENT.length;
    const sorted = Object.entries(freq)
      .map(([pattern, count]) => ({
        pattern,
        count,
        pct: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
    return { total, patterns: sorted };
  }, []);
  // Fix lines 1233-1257 (combinedDataset):
  const combinedDataset = useMemo(() => {
    const combined = {};

    // Count EU training data (recent patches only)
    EU_SEQUENTIAL_3STR_RECENT.forEach((pattern) => {
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

  // This is the fix for the useEffect that sends debug data
  // Replace the existing useEffect in KiyoModeCard.jsx (around line 1380)

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

    // 🔥 FIX: ALWAYS include wave predictions, even if no focusColumn
    // This ensures wave accuracy tracking works correctly
    const col2Analysis = analyzeWavePatterns?.columns?.[0];
    const col3Analysis = analyzeWavePatterns?.columns?.[1];

    // 🔥 Get predicted digits for each column based on current status
    const getColumnPrediction = (colAnalysis) => {
      if (!colAnalysis) return null;

      // If column is due to flip, predict flipTarget
      if (
        colAnalysis.status === "due_to_flip" &&
        colAnalysis.flipTarget?.length > 0
      ) {
        return colAnalysis.flipTarget;
      }

      // If column is stable/continuing, predict current pattern
      if (colAnalysis.currentPair === "A") {
        return colAnalysis.scheme.pairA;
      } else if (colAnalysis.currentPair === "B") {
        return colAnalysis.scheme.pairB;
      }

      return null;
    };

    const debugData = {
      waveAnalysis: JSON.parse(JSON.stringify(analyzeWavePatterns)),
      prediction: { ...prediction },
      smartPrefix: smartPrefixPrediction ? { ...smartPrefixPrediction } : null,
      pairingViz: pairingViz ? [...pairingViz] : [],
      combinedRolls: [...combinedRolls],

      // 🔥 FIX: ALWAYS include wave predictions for tracking
      waveData: {
        col2Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[0];
          if (!col) return null;

          // 🔥 Only predict if column has clear signal
          if (col.status === "due_to_flip" && col.flipTarget?.length > 0) {
            return col.flipTarget; // Predict flip
          }

          // 🔥 For stable patterns, predict continuation
          if (col.status === "likely_continue" || col.runLength === 1) {
            return col.currentPair === "A"
              ? col.scheme.pairA
              : col.scheme.pairB;
          }

          // 🔥 Don't make prediction for uncertain states
          return null;
        })(),

        col3Prediction: (() => {
          const col = analyzeWavePatterns?.columns?.[1];
          if (!col) return null;

          // 🔥 Only predict if column has clear signal
          if (col.status === "due_to_flip" && col.flipTarget?.length > 0) {
            return col.flipTarget; // Predict flip
          }

          // 🔥 For stable patterns, predict continuation
          if (col.status === "likely_continue" || col.runLength === 1) {
            return col.currentPair === "A"
              ? col.scheme.pairA
              : col.scheme.pairB;
          }

          // 🔥 Don't make prediction for uncertain states
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

  // 🔥 EXPLANATION:
  // - Now ALWAYS sends wave predictions for both columns
  // - Uses getColumnPrediction helper to determine what wave predicts
  // - Includes column status so we know if it was a flip prediction
  // - This ensures wave accuracy is tracked consistently
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

  // 🔥 OPTIONAL: Add reset button handler
  const handleResetWaveAccuracy = () => {
    setPersistentWaveAccuracy({
      col2: { hits: 0, total: 0 },
      col3: { hits: 0, total: 0 },
      lastPredictions: { col2: null, col3: null },
    });
  };
  // 🔥 ADD THIS EFFECT TO TRACK WAVE ACCURACY PERSISTENTLY
  useEffect(() => {
    // Only track if we have valid data
    if (!analyzeWavePatterns || combinedRolls.length < 4) return;

    const latestRoll = combinedRolls[combinedRolls.length - 1];
    if (!latestRoll) return;

    const actualCol2 = latestRoll[1];
    const actualCol3 = latestRoll[2];

    const col2Analysis = analyzeWavePatterns.columns?.[0];
    const col3Analysis = analyzeWavePatterns.columns?.[1];

    // Get current predictions
    const getCurrentPrediction = (colAnalysis) => {
      if (!colAnalysis) return null;

      // Only predict if column is "due_to_flip" with flip target
      if (
        colAnalysis.status === "due_to_flip" &&
        colAnalysis.flipTarget?.length > 0
      ) {
        return colAnalysis.flipTarget;
      }

      return null;
    };

    const currentCol2Pred = getCurrentPrediction(col2Analysis);
    const currentCol3Pred = getCurrentPrediction(col3Analysis);

    // Check if we have new predictions to verify
    const hadPreviousPredictions =
      persistentWaveAccuracy.lastPredictions.col2 !== null ||
      persistentWaveAccuracy.lastPredictions.col3 !== null;

    if (hadPreviousPredictions) {
      const newAccuracy = { ...persistentWaveAccuracy };

      // Verify Column 2 prediction
      if (persistentWaveAccuracy.lastPredictions.col2) {
        newAccuracy.col2.total++;
        if (persistentWaveAccuracy.lastPredictions.col2.includes(actualCol2)) {
          newAccuracy.col2.hits++;
        }
      }

      // Verify Column 3 prediction
      if (persistentWaveAccuracy.lastPredictions.col3) {
        newAccuracy.col3.total++;
        if (persistentWaveAccuracy.lastPredictions.col3.includes(actualCol3)) {
          newAccuracy.col3.hits++;
        }
      }

      // Update last predictions for next roll
      newAccuracy.lastPredictions = {
        col2: currentCol2Pred,
        col3: currentCol3Pred,
      };

      setPersistentWaveAccuracy(newAccuracy);
    } else {
      // First time - just store predictions
      setPersistentWaveAccuracy({
        ...persistentWaveAccuracy,
        lastPredictions: {
          col2: currentCol2Pred,
          col3: currentCol3Pred,
        },
      });
    }
  }, [combinedRolls.length]); // Only trigger when roll count changes
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
            className="px-3 py-1.5 text-xs font-semibold bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition"
          >
            📁 Import
          </button>
          <button
            onClick={() => setShowDecisionGuide(!showDecisionGuide)}
            className="px-3 py-1.5 text-xs font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40 rounded-lg transition"
          >
            📖 Guide
          </button>
        </div>
      </div>
      {/* 🔥 NEW: Accuracy Header Bar */}
      <AccuracyHeaderBar
        kiyoAccuracy={kiyoAccuracy}
        waveAccuracy={waveAccuracy}
        combinedDataset={combinedDataset}
        patchInfo={EU_PATCH_INFO}
        onResetWaveAccuracy={handleResetWaveAccuracy}
      />
      {/* Import Stats Toast */}
      <ImportStatsDisplay
        importedRolls={importedRolls}
        showImportStats={showImportStats}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
        onClearImported={handleClearImported}
      />

      {/* 🔥 1. TEST ROLLS - MOVED TO TOP */}
      <TestRollsInput
        testInput={testInput}
        setTestInput={setTestInput}
        handleTestRollSubmit={handleTestRollSubmit}
        testRolls={testRolls}
        translatedTestRolls={translatedTestRolls}
        handleDeleteTestRoll={handleDeleteTestRoll}
        setActivePrefix={setActivePrefix}
      />

      {/* 🔥 2. Compact Stats Header */}
      {/* <CompactStatsHeader
        kiyoAccuracy={kiyoAccuracy}
        waveAccuracy={waveAccuracy}
        combinedDataset={combinedDataset}
        importedRolls={importedRolls}
        testRolls={testRolls}
        live3Rolls={live3Rolls}
        patchInfo={EU_PATCH_INFO}
      /> */}

      {/* 🔥 3. Wave Analysis with predictions combined */}
      {combinedRolls.length >= 4 && analyzeWavePatterns && (
        <WaveAnalysisDisplay
          analyzeWavePatterns={analyzeWavePatterns}
          smartPrefixPrediction={smartPrefixPrediction}
        />
      )}

      {/* 🔥 4. Prediction Cards - side by side */}
      <PredictionCards
        analyzeWavePatterns={analyzeWavePatterns}
        smartPrefixPrediction={smartPrefixPrediction}
        manualLine={manualLine}
        setManualLine={setManualLine}
      />

      {/* 🔥 5. Advanced Tools */}
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
    if (freq.hasOwnProperty(digit)) {
      freq[digit]++;
    }
  });

  // Return most frequent, or first if tie
  return digits.sort((a, b) => (freq[b] || 0) - (freq[a] || 0))[0];
}
