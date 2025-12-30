// KiyoModeCard.jsx - BBP Mode v2 (Confidence-Aware, No BS)
import React, { useState, useMemo, useEffect, useRef } from "react";
import { predictNext3EU, predictWithPrefix } from "../utils/predictNext";
import AccuracyHeaderBar from "./kiyo/AccuracyHeaderBar";

import {
  EU_SEQUENTIAL_3STR_RECENT,
  EU_SEQUENTIAL_2STR_RECENT,
  EU_PATCH_INFO,
} from "../utils/euLiveSheetData";
import {
  NA_SEQUENTIAL_3STR_RECENT,
  NA_SEQUENTIAL_2STR_RECENT,
  NA_PATCH_INFO,
} from "../utils/naLiveSheetData";
import {
  ASIA_SEQUENTIAL_3STR_RECENT,
  ASIA_SEQUENTIAL_2STR_RECENT,
  ASIA_PATCH_INFO,
} from "../utils/asiaLiveSheetData";
import {
  ALL_SEQUENTIAL_3STR_RECENT,
  ALL_SEQUENTIAL_2STR_RECENT,
  ALL_PATCH_INFO,
} from "../utils/allLiveSheetData";

import { translateTo4 } from "../utils/stringHelpers";
import { getWindowTracker } from "../utils/windowPerformanceTracker";
import { predictWithCascadingPriority } from "../utils/cascadingPredictor";
import { getSmartRecommendation } from "../utils/smartDecisionSystem";
import { analyzePatternWithWindow } from "../utils/patternRecognition";
import { 
  WAVE_SCHEMES, 
  analyzeColumnWave, 
  getExpectedLabel 
} from "../utils/kiyoLogic";

import RollInput from "./kiyo/RollInput";
import AddedRollsPanel from "./kiyo/AddedRollsPanel";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import PrefixPredictors from "./kiyo/PrefixPredictors";
import BettingRecommendationCard from "./kiyo/BettingRecommendationCard";
import FiveMinWindowTracker from "./FiveMinWindowTracker";
import GuideModal from "./kiyo/GuideModal";
import AdvancedToolsSection from "./AdvancedToolsSection";
import { useFiveMinuteWindowRolls } from "../utils/useFiveMinuteWindowRolls";
import { useWindowPatternAnalysis } from "../hooks/useWindowPatternAnalysis";
import RecommendationPanel from "./kiyo/RecommendationPanel";
import CompactCaesarShift from "./kiyo/CompactCaesarShift";


// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function KiyoModeCard({
  entries = [],
  onSendToDebug,
  debugLogs = [],
  onSendKiyoDebugData,
}) {
  const [testInput, setTestInput] = useState("");
  const [testRolls, setTestRolls] = useState([]);
  const [activePrefix, setActivePrefix] = useState(null);
  const [showDecisionGuide, setShowDecisionGuide] = useState(false);
  const lastSentRef = useRef(null);
  const [, forceUpdate] = useState({});
  const lastSentDataRef = useRef(null);
  const [datasetRegion, setDatasetRegion] = useState("EU");

  const [importedRolls, setImportedRolls] = useState([]);
  const [showImportStats, setShowImportStats] = useState(false);
  const fileInputRef = useRef(null);
  const [caesarInput, setCaesarInput] = useState(""); // Caesar shift state

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
    
    // testRolls now stores {roll, ts} objects with actual window timestamps
    const testEvents = testRolls.map((item) => {
      if (typeof item === 'string') {
        // Fallback for old string format
        return { roll: item, ts: Date.now() };
      }
      return { roll: item.roll, ts: item.ts };
    });
    
    const liveEvents = liveRolls;

    return [...entryEvents, ...importedEvents, ...testEvents, ...liveEvents];
  }, [entries, importedRolls, testRolls, liveRolls]);

  // 🔥 Window analysis helpers
  const { windowInfo } = useFiveMinuteWindowRolls(rollEvents, 4);

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
    return testRolls.map((rollObj) => {
      const roll = typeof rollObj === 'string' ? rollObj : rollObj.roll;
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

  // 🔄 Window pattern analysis (uses translated rolls)
  const windowAnalysis = useWindowPatternAnalysis(combinedRolls, windowInfo);

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

    // 🔥 5-MINUTE WINDOW OPTIMIZATION: Use shorter lookback for small sessions
    const is5MinWindow = combinedRolls.length <= 15;
    const lookbackSize = is5MinWindow ? Math.min(10, combinedRolls.length) : 18;
    const baseRolls = combinedRolls.slice(-lookbackSize);

    // 🔥 Get window analysis for per-window pattern detection
    const baseWindowContext = {
      windowStates: null, // Will be set per column below
      previousStates: null, // NEW: Previous window context
      isNewWindow: windowAnalysis?.isNewWindow || false,
      rollCount: windowAnalysis?.rollCount || 0
    };

    // Create column-specific window context with cross-window data
    const col2WindowContext = {
      ...baseWindowContext,
      windowStates: windowAnalysis?.currentWindowStates?.col2 || null,
      previousStates: windowAnalysis?.previousContext?.col2States || null
    };
    
    const col3WindowContext = {
      ...baseWindowContext,
      windowStates: windowAnalysis?.currentWindowStates?.col3 || null,
      previousStates: windowAnalysis?.previousContext?.col3States || null
    };

    const col2Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col2, 1, col2WindowContext);
    const col3Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col3, 2, col3WindowContext);

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
        expected: col2Analysis.flipTarget && col2Analysis.flipTarget.length > 0
          ? (WAVE_SCHEMES.col2.pairA.some(d => col2Analysis.flipTarget.includes(d)) ? WAVE_SCHEMES.col2.pairALabel : WAVE_SCHEMES.col2.pairBLabel)
          : "—",
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
        expected: col3Analysis.flipTarget && col3Analysis.flipTarget.length > 0
          ? (WAVE_SCHEMES.col3.pairA.some(d => col3Analysis.flipTarget.includes(d)) ? WAVE_SCHEMES.col3.pairALabel : WAVE_SCHEMES.col3.pairBLabel)
          : "—",
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

    // 🔥 NEW: Column Comparison & Betting Recommendation
    const col2Clear = !col2Analysis.isChaotic && col2Analysis.confidence >= 0.6;
    const col3Clear = !col3Analysis.isChaotic && col3Analysis.confidence >= 0.6;
    
    let bettingRecommendation = {
      suggestion: "ANALYZE BOTH",
      focus: "both",
      message: "Monitor both columns",
      col2Status: "neutral",
      col3Status: "neutral"
    };
    
    if (col2Clear && col3Clear) {
      bettingRecommendation = {
        suggestion: "BET ON BOTH",
        focus: "both",
        message: "Both columns have clear patterns - bet on both!",
        col2Status: "good",
        col3Status: "good"
      };
    } else if (col3Clear && !col2Clear) {
      bettingRecommendation = {
        suggestion: "FOCUS ON COL3",
        focus: "col3",
        message: "Col3 has clear pattern, Col2 is chaotic - focus on Col3 only",
        col2Status: "bad",
        col3Status: "good"
      };
    } else if (col2Clear && !col3Clear) {
      bettingRecommendation = {
        suggestion: "FOCUS ON COL2",
        focus: "col2",
        message: "Col2 has clear pattern, Col3 is chaotic - focus on Col2 only",
        col2Status: "good",
        col3Status: "bad"
      };
    } else {
      bettingRecommendation = {
        suggestion: "SKIP SESSION",
        focus: "none",
        message: "Both columns chaotic - wait for patterns",
        col2Status: "bad",
        col3Status: "bad"
      };
    }

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
      bettingRecommendation, // NEW: Betting recommendation
    };
  }, [combinedRolls, windowInfo, windowAnalysis]);

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

    // 🔥 IMPROVEMENT: Increase live data lookback from 15 to 30
    const recentRolls = combinedRolls.slice(-30);
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

      // 🔥 IMPROVEMENT: Lower threshold from 0.5 to 0.4, boost confidence
      if (total >= 2 && confidence >= 0.4) {
        return {
          prediction: sourcePrefix + mainDigit,
          confidence: Math.min(confidence * 1.2, 0.85), // Boost live confidence
          alt: sorted[1] ? sourcePrefix + sorted[1][0] : null,
          matchCount: total,
          sourcePrefix,
          sourceType: `live-${sourceType}`,
          mode: "live-priority",
        };
      }
    }

    // Fallback to sheet data with REDUCED confidence
    const trainingPrediction = predictWithPrefix(
      EU_SEQUENTIAL_3STR_RECENT,
      sourcePrefix
    );

    if (trainingPrediction.prediction) {
      return {
        ...trainingPrediction,
        confidence: Math.min(trainingPrediction.confidence * 0.5, 0.55), // Reduced from 0.7
        sourcePrefix,
        sourceType: `training-${sourceType}`,
        mode: "training-fallback",
        warning: "Live data weak - using historical with low confidence",
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

  // 🎯 SMART RECOMMENDATION SYSTEM - 2-STR AND 3-STR
  const smartRecommendation = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 4) return null;

    // Get sheet data based on region
    const sheet2str = 
      datasetRegion === 'EU' ? EU_SEQUENTIAL_2STR_RECENT :
      datasetRegion === 'NA' ? NA_SEQUENTIAL_2STR_RECENT :
      datasetRegion === 'ASIA' ? ASIA_SEQUENTIAL_2STR_RECENT :
      ALL_SEQUENTIAL_2STR_RECENT;
      
    const sheet3str = 
      datasetRegion === 'EU' ? EU_SEQUENTIAL_3STR_RECENT :
      datasetRegion === 'NA' ? NA_SEQUENTIAL_3STR_RECENT :
      datasetRegion === 'ASIA' ? ASIA_SEQUENTIAL_3STR_RECENT :
      ALL_SEQUENTIAL_3STR_RECENT;

    // Determine active prefix from user input or last roll
    let currentPrefix = activePrefix;
    if (!currentPrefix && combinedRolls.length > 0) {
      const lastRoll = String(combinedRolls[combinedRolls.length - 1]);
      currentPrefix = lastRoll.slice(0, 2);
    }

    // 2-STR PREDICTION (for 2nd digit)
    const prediction2str = predictWithCascadingPriority(
      combinedRolls, // Use combinedRolls (already translated)
      [], // No separate import data (already in combinedRolls)
      sheet2str,
      currentPrefix ? currentPrefix[0] : null, // First digit only for 2-str
      '2str'
    );

    // 3-STR PREDICTION (for 3rd digit)
    const prediction3str = predictWithCascadingPriority(
      combinedRolls, // Use combinedRolls (already translated)
      [], // No separate import data (already in combinedRolls)
      sheet3str,
      currentPrefix, // Full 2-digit prefix for 3-str
      '3str'
    );

    // Get recommendation (Wave vs Prefix) based on 3-str
    const recommendation = getSmartRecommendation(analyzeWavePatterns, prediction3str);

    return {
      ...recommendation,
      prediction2str,
      prediction3str,
      prefixPrediction: prediction3str // Backward compatibility
    };
  }, [combinedRolls, analyzeWavePatterns, datasetRegion, activePrefix]);

  const pairingViz = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 4) return null;

    const vizRolls = combinedRolls.slice(-12).reverse(); // newest first

    // ✅ Wall-clock 5-min bucket (00/05/10/15/...) - matches useFiveMinuteWindowRolls
    const bucket5m = (ts) => {
      const d = new Date(ts);
      const start = new Date(d);
      start.setSeconds(0, 0);
      start.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
      return start.getTime();
    };
    
    return vizRolls.map((roll, vizIdx) => {
      const r = String(roll).trim();
      
      // Find the actual timestamp from rollEvents for this roll
      // Search backwards from the end to get the most recent occurrence
      const rollEventIdx = rollEvents.length - 1 - vizIdx;
      const ts = rollEvents[rollEventIdx]?.ts || Date.now();

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
      smartPrefix: smartRecommendation ? {
        ...smartRecommendation,
        // Ensure predictions are in the format debug panel expects
        prediction2str: smartRecommendation.prediction2str || null,
        prediction3str: smartRecommendation.prediction3str || null,
      } : null,
      pairingViz: pairingViz ? [...pairingViz] : [],
      combinedRolls: [...combinedRolls],
      windowTracker: getWindowTracker(), // 🔥 NEW: Add window tracker

      waveData: {
        col2Prediction: analyzeWavePatterns?.columns?.[0]?.flipTarget || [],
        col3Prediction: analyzeWavePatterns?.columns?.[1]?.flipTarget || [],
        col2Confidence: analyzeWavePatterns?.columns?.[0]?.confidence || 0,
        col3Confidence: analyzeWavePatterns?.columns?.[1]?.confidence || 0,
        col2Status: analyzeWavePatterns?.columns?.[0]?.status || "unknown",
        col3Status: analyzeWavePatterns?.columns?.[1]?.status || "unknown",
        
        // 🔥 NEW: Pattern analysis fields
        col2PatternStatus: analyzeWavePatterns?.columns?.[0]?.patternStatus || null,
        col3PatternStatus: analyzeWavePatterns?.columns?.[1]?.patternStatus || null,
        col2WindowBoundary: analyzeWavePatterns?.columns?.[0]?.windowBoundary || false,
        col3WindowBoundary: analyzeWavePatterns?.columns?.[1]?.windowBoundary || false,
        col2PatternBroke: analyzeWavePatterns?.columns?.[0]?.patternBroke || false,
        col3PatternBroke: analyzeWavePatterns?.columns?.[1]?.patternBroke || false,
        col2Expected: analyzeWavePatterns?.columns?.[0]?.expected || "—",
        col3Expected: analyzeWavePatterns?.columns?.[1]?.expected || "—",
      },
    };

    onSendKiyoDebugData(debugData);
  }, [
    prediction,
    analyzeWavePatterns,
    smartRecommendation,
    pairingViz,
    combinedRolls,
    onSendKiyoDebugData,
  ]);

  const handleTestRollSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = testInput.trim();

      if (value.length === 3 && /^[1-4]{3}$/.test(value)) {
        // Store roll with current 5-minute window start time
        const ts = windowInfo?.startMs || Date.now();
        setTestRolls((prev) => [...prev, { roll: value, ts }]);
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

      {/* Sticky Input + Timer Cards */}
      <div className="sticky top-[80px] sm:top-[70px] z-10 pb-4 mb-4 mt-2">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch">
          {/* Left: Roll Input */}
          <div className="flex-1 min-w-0">
            <RollInput
              testInput={testInput}
              setTestInput={setTestInput}
              handleTestRollSubmit={handleTestRollSubmit}
              setActivePrefix={setActivePrefix}
            />
          </div>
          
          {/* Middle: Compact Caesar Shift */}
          <div className="flex-1 min-w-0">
            <CompactCaesarShift
              caesarInput={caesarInput}
              setCaesarInput={setCaesarInput}
            />
          </div>
          
          {/* Right: 5-Minute Window Timer */}
          {combinedRolls.length >= 4 && analyzeWavePatterns && (
            <div className="flex-1 lg:flex-[1.25] min-w-0">
              <FiveMinWindowTracker
                windowInfo={windowInfo}
                analyzeWavePatterns={analyzeWavePatterns}
              />
            </div>
          )}
        </div>
      </div>

      {/* Added Rolls Panel - Separate component for sidebar */}
      <AddedRollsPanel
        testRolls={testRolls}
        setTestRolls={setTestRolls}
        translatedTestRolls={translatedTestRolls}
        handleDeleteTestRoll={handleDeleteTestRoll}
        setActivePrefix={setActivePrefix}
      >
        {/* Pass WaveAnalysisDisplay as child to render on the right side */}
        {combinedRolls.length >= 4 && analyzeWavePatterns && (
          <WaveAnalysisDisplay
            analyzeWavePatterns={analyzeWavePatterns}
            smartPrefixPrediction={smartRecommendation?.prefixPrediction}
            smartRecommendation={smartRecommendation}
          />
        )}
      </AddedRollsPanel>

      <RecommendationPanel
        waveAccuracy={waveAccuracy}
        kiyoAccuracy={kiyoAccuracy}
        pairingViz={pairingViz}
        smartRecommendation={smartRecommendation}
        combinedRolls={combinedRolls}
        analyzeWavePatterns={analyzeWavePatterns}
      />

      {/* Sticky Advanced Tools (Caesar Shift) */}
      <div style={{
        position: 'sticky',
        top: '120px', // Below the input card
        zIndex: 9,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        paddingBottom: '16px',
        marginBottom: '16px'
      }}>
        <AdvancedToolsSection
          waveAccuracy={waveAccuracy}
          kiyoAccuracy={kiyoAccuracy}
          pairingViz={pairingViz}
          combinedRolls={combinedRolls}
        />
      </div>

      {showDecisionGuide && (
        <GuideModal
          show={showDecisionGuide}
          onClose={() => setShowDecisionGuide(false)}
        />
      )}
    </div>
  );
}
