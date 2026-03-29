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
import { predictWithPairs } from "../utils/pairTransitionPredictor";
import { getSmartRecommendation } from "../utils/smartDecisionSystem";
import { analyzePatternWithWindow } from "../utils/patternRecognition";
import { 
  WAVE_SCHEMES, 
  analyzeColumnWave, 
  getExpectedLabel 
} from "../utils/kiyoLogic";
import { getSessionCommons, getYZCommons } from "../utils/kiyoCommons";
import { analyzeAllPrefixWaves, getPrefixWavePrediction, analyze2strWave } from "../utils/kiyoPrefixWave";

import RollInput from "./kiyo/RollInput";
import AddedRollsPanel from "./kiyo/AddedRollsPanel";
import WavePairingTable from "./kiyo/WavePairingTable";
import { getWaveAndTableSignals } from "../utils/kiyo2strSignals";
import ImportStatsDisplay from "./kiyo/ImportStatsDisplay";
import WaveAnalysisDisplay from "./kiyo/WaveAnalysisDisplay";
import PrefixPredictors from "./kiyo/PrefixPredictors";
import BettingRecommendationCard from "./kiyo/BettingRecommendationCard";
import FiveMinWindowTracker, { FiveMinProgressBar, WindowStatsMini } from "./FiveMinWindowTracker";
import GuideModal from "./kiyo/GuideModal";
import AdvancedToolsSection from "./AdvancedToolsSection";
import { useFiveMinuteWindowRolls } from "../utils/useFiveMinuteWindowRolls";
import { useWindowPatternAnalysis } from "../hooks/useWindowPatternAnalysis";
import RecommendationPanel from "./kiyo/RecommendationPanel";
import CompactCaesarShift from "./kiyo/CompactCaesarShift";
import { usePresenceContext } from "../contexts/PresenceContext";


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
  const [showGuide, setShowGuide] = useState(false);
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
  
  // Track predictions for live stats
  const { trackPrediction } = usePresenceContext();

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
        const raw = String(e?.raw ?? roll).trim(); // 🔥 Capture raw roll for Col 1
        return { roll, raw, ts };
      })
      .filter((x) => x.ts > 0 && x.roll.length >= 3)
      .reverse();

    const importedEvents = importedRolls.map((roll, i) => ({
      roll,
      raw: roll, // 🔥 Imported rolls are already in their raw form
      ts: Date.now() + i * 10,
    }));
    
    // testRolls now stores {roll, raw, ts} objects
    const testEvents = testRolls.map((item) => {
      if (typeof item === 'string') {
        const translated = translateTo4(item);
        return { roll: translated || item, raw: item, ts: Date.now() };
      }
      return { 
        roll: item.roll, 
        raw: item.raw || item.roll, 
        ts: item.ts 
      };
    });
    
    // 🔥 Ensure liveEvents have raw field
    const liveEvents = liveRolls.map(e => ({
      ...e,
      raw: e.raw || e.roll // Fallback to roll if raw is missing
    }));

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

  // 🔄 Window pattern analysis (uses raw rolls for time-tracking and state extraction)
  const windowAnalysis = useWindowPatternAnalysis(rollEvents, windowInfo);

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
    
    // Translated rolls for Col 2/3
    const baseRolls = combinedRolls.slice(-lookbackSize);

    // Raw rolls for Col 1 (Raw) - Extract from rollEvents which are raw
    const rawBaseRolls = rollEvents.map(e => e.raw || e.roll).slice(-lookbackSize);

    // 🔥 Get window analysis for per-window pattern detection
    const baseWindowContext = {
      windowStates: null, // Will be set per column below
      previousStates: null, // NEW: Previous window context
      isNewWindow: windowAnalysis?.isNewWindow || false,
      rollCount: windowAnalysis?.rollCount || 0
    };

    const col1RawWindowContext = {
      ...baseWindowContext,
      windowStates: windowAnalysis?.currentWindowStates?.col1Raw || null,
      previousStates: windowAnalysis?.previousContext?.col1RawStates || null
    };

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

    const col1RawAnalysis = analyzeColumnWave(rawBaseRolls, WAVE_SCHEMES.col1, 0, col1RawWindowContext);
    const col2Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col2, 1, col2WindowContext);
    const col3Analysis = analyzeColumnWave(baseRolls, WAVE_SCHEMES.col3, 2, col3WindowContext);

    const columns = [
      {
        column: "col1raw",
        name: "Column 1 (Raw)",
        label: "Odds/Evens",
        scheme: WAVE_SCHEMES.col1,
        ...col1RawAnalysis,
        runAnalysis: {
          pair: col1RawAnalysis.currentSide,
          length: col1RawAnalysis.runLength,
          label: col1RawAnalysis.currentLabel,
        },
        status: col1RawAnalysis.action === "FLIP" ? "due_to_flip" : col1RawAnalysis.action === "SKIP" ? "suppressed" : "likely_continue",
        expected: col1RawAnalysis.flipTarget && col1RawAnalysis.flipTarget.length > 0
          ? (WAVE_SCHEMES.col1.pairA.some(d => col1RawAnalysis.flipTarget.includes(d)) ? WAVE_SCHEMES.col1.pairALabel : WAVE_SCHEMES.col1.pairBLabel)
          : "—",
        message: col1RawAnalysis.message,
      },
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
        col1RawStatus: !col1RawAnalysis.isChaotic && col1RawAnalysis.confidence >= 0.6 ? "good" : "neutral",
        col2Status: "good",
        col3Status: "good"
      };
    } else if (col3Clear && !col2Clear) {
      bettingRecommendation = {
        suggestion: "FOCUS ON COL3",
        focus: "col3",
        message: "Col3 has clear pattern, Col2 is chaotic - focus on Col3 only",
        col1RawStatus: !col1RawAnalysis.isChaotic && col1RawAnalysis.confidence >= 0.6 ? "good" : "neutral",
        col2Status: "bad",
        col3Status: "good"
      };
    } else if (col2Clear && !col3Clear) {
      bettingRecommendation = {
        suggestion: "FOCUS ON COL2",
        focus: "col2",
        message: "Col2 has clear pattern, Col3 is chaotic - focus on Col2 only",
        col1RawStatus: !col1RawAnalysis.isChaotic && col1RawAnalysis.confidence >= 0.6 ? "good" : "neutral",
        col2Status: "good",
        col3Status: "bad"
      };
    } else {
      bettingRecommendation = {
        suggestion: "SKIP SESSION",
        focus: "none",
        message: "Both columns chaotic - wait for patterns",
        col1RawStatus: !col1RawAnalysis.isChaotic && col1RawAnalysis.confidence >= 0.6 ? "good" : "neutral",
        col2Status: "bad",
        col3Status: "bad"
      };
    }

    // --- Commons Overlay: which side of each column is the session "commons" ---
    const buildCommonsInfo = (analysis, scheme, rolls, digitPos) => {
      if (!analysis || !analysis.valid || !analysis.dominantSide) return null;
      const isCommonsA = analysis.dominantSide === 'A';
      const commonsLabel = isCommonsA ? scheme.pairALabel : scheme.pairBLabel;
      const commonsDigits = isCommonsA ? scheme.pairA : scheme.pairB;
      const noiseDigits = isCommonsA ? scheme.pairB : scheme.pairA;
      const noiseLabel = isCommonsA ? scheme.pairBLabel : scheme.pairALabel;
      const dominancePct = Math.round((analysis.dominance ?? 0.5) * 100);

      // Build per-digit frequency for 2str (col2 → y digit → "4y") or col3 (z digit)
      const freq = {};
      const total = rolls.length;
      for (const r of rolls) {
        const d = String(r)[digitPos];
        if (d) freq[d] = (freq[d] || 0) + 1;
      }
      // Map digits → "4y" or show as parts of 3str
      const mkPair = digitPos === 1
        ? (d) => `4${d}` // col2: show "41","42" etc.
        : (d) => `z=${d}`;   // col3: show z-digit

      const commonsPairs = commonsDigits
        .filter(d => freq[d])
        .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
        .map(d => ({ pair: mkPair(d), digit: d, count: freq[d] || 0, pct: Math.round(((freq[d] || 0) / total) * 100) }));
      const noisePairs = noiseDigits
        .filter(d => freq[d])
        .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
        .map(d => ({ pair: mkPair(d), digit: d, count: freq[d] || 0, pct: Math.round(((freq[d] || 0) / total) * 100) }));

      // Is the wave's predicted target in the commons or noise group?
      let flipAlignment = null;
      let flipToLabel = null;
      if (analysis.flipTarget && analysis.flipTarget.length > 0) {
        const flipIsCommons = commonsDigits.some(d => analysis.flipTarget.includes(d));
        flipAlignment = flipIsCommons ? 'toward_commons' : 'toward_noise';
        flipToLabel = flipIsCommons ? commonsLabel : noiseLabel;
      }

      return {
        commonsLabel, commonsDigits, noiseLabel, noiseDigits, dominancePct,
        flipAlignment, flipToLabel,
        action: analysis.action,
        flipTarget: analysis.flipTarget,
        commonsPairs, noisePairs,
      };
    };

    const col2CommonsInfo = buildCommonsInfo(col2Analysis, WAVE_SCHEMES.col2, baseRolls, 1);
    const col3CommonsInfo = buildCommonsInfo(col3Analysis, WAVE_SCHEMES.col3, baseRolls, 2);

    return {
      columns,
      columnAnalysis: {
        col1Raw: columns[0],
        col2: columns[1],
        col3: columns[2],
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
      bettingRecommendation,
      col2CommonsInfo,    // ← commons overlay
      col3CommonsInfo,    // ← commons overlay
    };
  }, [combinedRolls, windowInfo, windowAnalysis]);

  // 🔬 PER-PREFIX WAVE ANALYSIS (correct Kiyo approach)
  const prefixWaveData = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 3) return null;
    return analyzeAllPrefixWaves(combinedRolls);
  }, [combinedRolls]);

  const prefixWavePrediction = useMemo(() => {
    if (!prefixWaveData) return null;
    return getPrefixWavePrediction(prefixWaveData, testInput, combinedRolls);
  }, [prefixWaveData, testInput, combinedRolls]);

  // 📊 2-STRING WAVE — lighter entry point, Y-digit pairing across all rolls
  const twoStrWave = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 3) return null;
    return analyze2strWave(combinedRolls);
  }, [combinedRolls]);
  const twoStrSignals = useMemo(() => {
    if (!combinedRolls || combinedRolls.length < 3) return null;
    return getWaveAndTableSignals(combinedRolls);
  }, [combinedRolls]);

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

    // 2-STR PREDICTION — uses live BBP pair-matrix predictor (same as live session card)
    const bbp2str = predictWithPairs(
      combinedRolls.filter(r => r && r.length >= 2).map(r => r.slice(0, 2)),
      { region: datasetRegion }
    );
    const prediction2str = bbp2str.prediction
      ? {
          prediction: bbp2str.prediction,
          alt: bbp2str.alt,
          confidence: bbp2str.confidence,
          source: 'live',
          reasoning: bbp2str.reasonLine || bbp2str.method || '',
        }
      : predictWithCascadingPriority(
          combinedRolls,
          [],
          sheet2str,
          currentPrefix ? currentPrefix[0] : null,
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
      const rawRoll = rollEvents[rollEventIdx]?.raw || r;  // 🔥 Use .raw for Col 1

      // Col 1 uses FIRST digit of RAW roll (user request)
      const col1Digit = rawRoll[0];
      // Col 2 and 3 use translated roll
      const col2Digit = r[1];
      const col3Digit = r[2];

      return {
        roll: r,
        raw: rawRoll,
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
    if (combinedRolls.length < 4) return;
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
        // 🔥 NEW: Latest raw roll for Column 1 analysis
        latestRawRoll: pairingViz?.[0]?.raw || null,
        
        // Column 1 Raw (Odds/Evens based on raw first digit)
        col1RawPrediction: analyzeWavePatterns?.columns?.[0]?.flipTarget || [],
        col1RawConfidence: analyzeWavePatterns?.columns?.[0]?.confidence || 0,
        col1RawStatus: analyzeWavePatterns?.columns?.[0]?.status || "unknown",
        col1Expected: analyzeWavePatterns?.columns?.[0]?.flipLabel || "—",
        
        // Column 2 (Outer/Inner) - now at index 2
        col2Prediction: analyzeWavePatterns?.columns?.[2]?.flipTarget || [],
        col3Prediction: analyzeWavePatterns?.columns?.[3]?.flipTarget || [],
        col2Confidence: analyzeWavePatterns?.columns?.[2]?.confidence || 0,
        col3Confidence: analyzeWavePatterns?.columns?.[3]?.confidence || 0,
        col2Status: analyzeWavePatterns?.columns?.[2]?.status || "unknown",
        col3Status: analyzeWavePatterns?.columns?.[3]?.status || "unknown",
        
        // 🔥 NEW: Pattern analysis fields
        col2PatternStatus: analyzeWavePatterns?.columns?.[2]?.patternStatus || null,
        col3PatternStatus: analyzeWavePatterns?.columns?.[3]?.patternStatus || null,
        col2WindowBoundary: analyzeWavePatterns?.columns?.[2]?.windowBoundary || false,
        col3WindowBoundary: analyzeWavePatterns?.columns?.[3]?.windowBoundary || false,
        col2PatternBroke: analyzeWavePatterns?.columns?.[2]?.patternBroke || false,
        col3PatternBroke: analyzeWavePatterns?.columns?.[3]?.patternBroke || false,
        col2Expected: analyzeWavePatterns?.columns?.[2]?.flipLabel || "—",
        col3Expected: analyzeWavePatterns?.columns?.[3]?.flipLabel || "—",
        wave2Action: twoStrSignals?.waveSnapshot?.action || null,
        wave2SessionMode: twoStrSignals?.waveSnapshot?.sessionMode || null,
        wave2PairingName: twoStrSignals?.waveSnapshot?.pairingName || null,
        wave2Verdict: twoStrSignals?.waveSnapshot?.message || null,
        wave2BetRolls: Array.isArray(twoStrSignals?.waveSnapshot?.betRolls)
          ? [...twoStrSignals.waveSnapshot.betRolls]
          : null,
        tablePairingKey: twoStrSignals?.table?.activeKey || null,
        tableBetRolls: Array.isArray(twoStrSignals?.table?.betRolls)
          ? [...twoStrSignals.table.betRolls]
          : null,
      },
    };

    onSendKiyoDebugData(debugData);
  }, [
    prediction,
    analyzeWavePatterns,
    smartRecommendation,
    pairingViz,
    combinedRolls,
    twoStrSignals,
    onSendKiyoDebugData,
  ]);

  const submitRoll = () => {
    const value = testInput.trim();

    if (value.length === 2 && /^[1-8]{2}$/.test(value)) {
      // 2-str input — translate to 4x format (e.g. "32" → "43")
      const translated = translateTo4(value + "1").slice(0, 2); // translate Y digit, ignore Z
      const ts = windowInfo?.startMs || Date.now();
      setTestRolls((prev) => [...prev, { roll: translated, raw: value, ts, is2str: true }]);
      setTestInput("");
      trackPrediction();
    } else if (value.length === 3 && /^[1-8]{3}$/.test(value)) {
      // 3-str input — translate normally
      const translated = translateTo4(value);
      const ts = windowInfo?.startMs || Date.now();
      setTestRolls((prev) => [...prev, { roll: translated || value, raw: value, ts }]);
      setTestInput("");
      trackPrediction();
    } else {
      setTestInput("");
    }
  };

  const handleTestRollSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitRoll();
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-emerald-400">🌊 Kiyo Mode</h3>
          <p className="text-xs text-slate-400">
            Wave Theory + Smart Prefix Prediction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-1.5 text-xs font-semibold kiyo-accent-soft rounded-lg transition cursor-pointer"
          >
            📖 Guide
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold kiyo-accent-soft rounded-lg transition cursor-pointer"
          >
            📁 Import
          </button>
        </div>
        <GuideModal show={showGuide} onClose={() => setShowGuide(false)} />
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

      {/* Sticky Input: progress bar on top, then 2-col row */}
      <div className="sticky top-[80px] sm:top-[70px] z-20 pb-3 mb-4 mt-2">
        {/* Progress bar spanning full width — always rendered when windowInfo exists */}
        {windowInfo && analyzeWavePatterns && (
          <FiveMinProgressBar windowInfo={windowInfo} analyzeWavePatterns={analyzeWavePatterns} />
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          {/* Roll Input + window stats below it */}
          <div className="flex-1 min-w-0 theme-glass-card kiyo-snow-card p-3">
            <RollInput
              testInput={testInput}
              setTestInput={setTestInput}
              handleTestRollSubmit={handleTestRollSubmit}
              onAddRoll={submitRoll}
              setActivePrefix={setActivePrefix}
            />
            {windowInfo && analyzeWavePatterns && (
              <WindowStatsMini windowInfo={windowInfo} analyzeWavePatterns={analyzeWavePatterns} />
            )}
          </div>

          {/* Caesar Shift */}
          <div className="flex-1 min-w-0 theme-glass-card kiyo-snow-card p-3">
            <CompactCaesarShift
              caesarInput={caesarInput}
              setCaesarInput={setCaesarInput}
            />
          </div>
        </div>
      </div>

      {/* ── Added Rolls + Wave Pairing Table (side by side) ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3.5 items-start">
        {/* LEFT: Added Rolls (no old WaveAnalysisDisplay child) */}
        <div className="theme-glass-card kiyo-snow-card p-2">
          <AddedRollsPanel
            testRolls={testRolls}
            setTestRolls={setTestRolls}
            translatedTestRolls={translatedTestRolls}
            handleDeleteTestRoll={handleDeleteTestRoll}
            setActivePrefix={setActivePrefix}
          />
        </div>

        {/* RIGHT: Wave Pairing Table */}
        <div className="theme-glass-card kiyo-snow-card p-2">
          {pairingViz && pairingViz.length > 0 && (
            <WavePairingTable
              pairingViz={pairingViz}
              combinedRolls={combinedRolls}
            />
          )}
        </div>
      </div>

      {/* ── ARCHIVED: Old col-flip / col-commons / advanced tools ─── */}
      {/*
        <RecommendationPanel
          waveAccuracy={waveAccuracy}
          kiyoAccuracy={kiyoAccuracy}
          pairingViz={pairingViz}
          smartRecommendation={smartRecommendation}
          combinedRolls={combinedRolls}
          analyzeWavePatterns={analyzeWavePatterns}
        />

        📊 Commons Overlay Card
        {analyzeWavePatterns && (analyzeWavePatterns.col2CommonsInfo || analyzeWavePatterns.col3CommonsInfo) && combinedRolls.length >= 4 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '8px',
          }}>
            Header
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8' }}>📊 Session Commons
              </span>
              <span style={{ fontSize: '10px', color: '#475569' }}>which side owns this session, and does wave flip agree?</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[{
                label: 'Col 2 (Outer/Inner)',
                info: analyzeWavePatterns.col2CommonsInfo,
                accentColor: '#6ee7b7',
              }, {
                label: 'Col 3 (Low/High)',
                info: analyzeWavePatterns.col3CommonsInfo,
                accentColor: '#f59e0b',
              }].map(({ label, info, accentColor }) => {
                if (!info) return null;
                const isFlip = info.action === 'FLIP';
                const isWait = info.action === 'WAIT' || info.action === 'SKIP';
                const alignColor = info.flipAlignment === 'toward_commons' ? '#34d399'
                  : info.flipAlignment === 'toward_noise' ? '#f87171' : '#94a3b8';
                const alignIcon = info.flipAlignment === 'toward_commons' ? '✅'
                  : info.flipAlignment === 'toward_noise' ? '⚠️' : '⏳';
                const alignText = info.flipAlignment === 'toward_commons'
                  ? `→ Commons flip — confidence ↑`
                  : info.flipAlignment === 'toward_noise'
                  ? `→ Noise flip — may snap back`
                  : `→ Hold…`;

                return (
                  <div key={label} style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '9px',
                    borderLeft: `3px solid ${accentColor}`,
                  }}>
                    <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '5px', fontWeight: 600 }}>{label}</div>

                    Commons pairs
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>
                        COMMONS → {info.commonsLabel} [{info.commonsDigits.join(',')}] — {info.dominancePct}%
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {info.commonsPairs.length > 0 ? info.commonsPairs.map(p => (
                          <span key={p.pair} style={{
                            fontSize: '12px', fontWeight: 700, color: accentColor,
                            background: `${accentColor}15`, padding: '1px 7px', borderRadius: '4px'
                          }}>
                            {p.pair} <span style={{ opacity: 0.55, fontSize: '10px' }}>{p.pct}%</span>
                          </span>
                        )) : <span style={{ fontSize: '10px', color: '#475569' }}>none yet</span>}
                      </div>
                    </div>

                    Noise pairs
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '9px', color: '#475569', marginBottom: '3px', fontWeight: 600 }}>
                        NOISE → {info.noiseLabel}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {info.noisePairs.length > 0 ? info.noisePairs.map(p => (
                          <span key={p.pair} style={{ fontSize: '11px', color: '#475569' }}>
                            · {p.pair} <span style={{ opacity: 0.5, fontSize: '9px' }}>{p.pct}%</span>
                          </span>
                        )) : <span style={{ fontSize: '10px', color: '#334155' }}>not appearing</span>}
                      </div>
                    </div>

                    Wave prediction + alignment
                    {isWait ? (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>⏳ Building pattern…</div>
                    ) : (
                      <div style={{
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: info.flipAlignment === 'toward_noise'
                          ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
                        border: `1px solid ${alignColor}30`,
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isFlip ? '#f59e0b' : '#94a3b8' }}>
                          {isFlip ? '🎯 FLIP → ' : '📊 HOLD '}{info.flipToLabel || '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: alignColor, marginTop: '2px' }}>
                          {alignIcon} {alignText}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        Sticky Advanced Tools (Caesar Shift)
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
        These sections have been commented out to simplify the UI.
        They can be restored from the git history if needed.
      */}

      {/* 🔬 Prefix Wave — DISABLED, enable when testing 3str Z-digit */}
      {false && prefixWaveData && combinedRolls.length >= 3 && (() => {
        const PREFIXES = ['41', '42', '43', '44'];
        const pred = prefixWavePrediction;
        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))',
            border: '1px solid rgba(139,92,246,0.30)',
            borderRadius: '12px', padding: '14px 16px', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>🔬 Prefix Wave</span>
                <span style={{ fontSize: '10px', color: '#475569', marginLeft: '8px' }}>each prefix has its own independent Z pairing</span>
              </div>
              {pred && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '8px',
                  background: pred.action === 'FLIP' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                  border: pred.action === 'FLIP' ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(139,92,246,0.4)',
                }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{pred.activePrefix}x →</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', color: pred.action === 'FLIP' ? '#f59e0b' : '#c4b5fd' }}>{pred.prediction}</span>
                  {pred.alt && <span style={{ fontSize: '11px', color: '#64748b' }}>/ {pred.alt}</span>}
                  <span style={{ fontSize: '9px', color: '#64748b' }}>{pred.pairingName}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {PREFIXES.map(px => {
                const a = prefixWaveData.analyses[px];
                const isActive = pred?.activePrefix === px;
                const isCommons = a.isCommons && a.freq > 0;
                const actionColor = a.action === 'FLIP' ? '#f59e0b' : a.action === 'HOLD' ? '#6ee7b7' : '#475569';
                return (
                  <div key={px} style={{
                    padding: '10px 12px', borderRadius: '9px',
                    background: isActive ? 'rgba(139,92,246,0.08)' : isCommons ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isActive ? 'rgba(139,92,246,0.6)' : isCommons ? 'rgba(99,102,241,0.30)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: a.freq === 0 ? 0.38 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#a78bfa' : '#e2e8f0' }}>{px}x</span>
                      {isCommons && <span style={{ fontSize: '8px', fontWeight: 700, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: '3px' }}>COMMONS</span>}
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>{a.freq}× {a.freqPct > 0 ? `(${a.freqPct}%)` : ''}</span>
                    </div>
                    {a.pairing && a.hasData ? (
                      <>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>
                          Pairing: <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{a.pairingName}</span>
                          {a.pairingConfidence >= 0.6 && <span style={{ color: '#34d399', marginLeft: '4px' }}>★</span>}
                        </div>
                        <div style={{ fontSize: '9px', color: '#475569', marginBottom: '5px' }}>
                          A:{a.pairing.pairALabel}[{a.pairing.pairA.join(',')}] · B:{a.pairing.pairBLabel}[{a.pairing.pairB.join(',')}]
                        </div>
                        {a.action !== 'WAIT' && a.action !== 'SKIP' && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
                            Run: <span style={{ color: '#e2e8f0' }}>{a.currentLabel}</span>{' '}
                            {Array(Math.min(a.runLength, 6)).fill('●').join('')}{a.runLength > 6 ? `+${a.runLength-6}` : ''}
                            <span style={{ opacity: 0.45 }}> /N={a.dominantN}</span>
                          </div>
                        )}
                        <div style={{ fontSize: '11px', fontWeight: 600, color: actionColor }}>{a.message}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#475569' }}>{a.message}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ARCHIVED: Sticky Advanced Tools (col-flip tools) — commented out for UI cleanup
      <div style={{
        position: 'sticky',
        top: '120px',
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
      */}
    </div>
  );
}

