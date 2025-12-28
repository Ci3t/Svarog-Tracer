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
// 🎯 BBP Mode v2: CONFIDENCE-AWARE WAVE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeColumnWave(rolls, scheme, digitPosition, windowContext = null) {
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
  // 🔥 PER-WINDOW PATTERN DETECTION WITH CROSS-WINDOW CONTEXT
  // ═══════════════════════════════════════════════════════════════════════
  
  // 🔥 NEW: Combine last 3 rolls from previous window with current window
  let patternWindow;
  let previousRollCount = 0;
  
  if (windowContext?.windowStates) {
    const currentStates = windowContext.windowStates;
    const previousStates = windowContext.previousStates || [];
    
    // Combine: last 3 from prev + all from current
    patternWindow = [...previousStates, ...currentStates];
    previousRollCount = previousStates.length;
  } else {
    // Fallback: use last 6-8 rolls
    patternWindow = states.slice(-Math.min(8, states.length));
  }
  
  const isNewWindow = windowContext?.isNewWindow || false;
  const windowRollCount = windowContext?.rollCount || 0;
  const totalAnalysisRolls = patternWindow.length;
  
  // 🔥 NEW WINDOW HANDLING - Now with cross-window context
  // We need at least 4 rolls total (can be from prev + curr)
  if (isNewWindow && totalAnalysisRolls < 4) {
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "WAIT",
      confidence: 0.35,
      reliability: "BUILDING",
      betAdvice: "WAIT FOR PATTERN",
      message: `🔄 New 5-min window - building pattern (${windowRollCount}/4 rolls, recommended 5 if no clear pattern)`,
      flipTarget: null,
      flipLabel: "Wait",
      urgency: "low",
      icon: "⏳",
      patternStatus: {
        type: 'building',
        confidence: 0,
        runLength: null
      }
    };
  }
  
  // Detect run-based pattern
  let detectedPattern = null;
  let patternConfidence = 0;
  
  if (patternWindow.length >= 6) {
    // 🔥 STEP 1: Check for DOMINANCE pattern (sticky sessions)
    const aCount = patternWindow.filter(s => s === 'A').length;
    const bCount = patternWindow.length - aCount;
    const dominanceRate = Math.max(aCount, bCount) / patternWindow.length;
    const dominantSide = aCount > bCount ? 'A' : 'B';
    
    // If one side appears 70%+ of the time, it's a dominance pattern
    if (dominanceRate >= 0.70) {
      detectedPattern = {
        type: 'dominance',
        dominantSide: dominantSide,
        dominanceRate: dominanceRate,
        runLength: null, // Not applicable for dominance
        confidence: dominanceRate
      };
      patternConfidence = dominanceRate;
    } else {
      // 🔥 STEP 2: Check for RUN-BASED patterns (alternating, double-run, etc.)
      // Count runs
      const runs = [];
      let currentRunVal = patternWindow[0];
      let currentRunLen = 1;
      
      for (let i = 1; i < patternWindow.length; i++) {
        if (patternWindow[i] === currentRunVal) {
          currentRunLen++;
        } else {
          runs.push(currentRunLen);
          currentRunVal = patternWindow[i];
          currentRunLen = 1;
        }
      }
      runs.push(currentRunLen);
      
      // Determine most common run length
      const runCounts = {};
      runs.forEach(len => runCounts[len] = (runCounts[len] || 0) + 1);
      const sortedRuns = Object.entries(runCounts)
        .sort((a, b) => b[1] - a[1]);
      
      if (sortedRuns.length > 0) {
        const mostCommonRun = sortedRuns[0];
        const runLen = parseInt(mostCommonRun[0]);
        const frequency = mostCommonRun[1] / runs.length;
        
        // 🔥 IMPROVED: Lower threshold for run-based patterns (50% instead of 60%)
        // Also check if there's a clear dominant run length
        if (frequency >= 0.5) {
          detectedPattern = {
            type: runLen === 1 ? 'alternating' : `${runLen}x-run`,
            runLength: runLen,
            confidence: frequency
          };
          patternConfidence = frequency;
        }
        // 🔥 NEW: If no single dominant run, check for mixed run pattern
        else if (sortedRuns.length >= 2) {
          const secondRun = sortedRuns[1];
          const combinedFreq = (mostCommonRun[1] + secondRun[1]) / runs.length;
          
          if (combinedFreq >= 0.7) {
            // Mixed run pattern (e.g., alternating between 1x and 2x)
            detectedPattern = {
              type: 'mixed-run',
              runLength: parseInt(mostCommonRun[0]),
              secondaryRunLength: parseInt(secondRun[0]),
              confidence: combinedFreq * 0.8 // Slightly lower confidence
            };
            patternConfidence = combinedFreq * 0.8;
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🔥 CHAOS DETECTION - Skip betting but keep analyzing
  // ═══════════════════════════════════════════════════════════════════════
  
  const isChaotic = !detectedPattern || patternConfidence < 0.5;
  
  if (isChaotic) {
    // Still return analysis but mark as SKIP
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "SKIP",
      confidence: patternConfidence || 0.35,
      reliability: "CHAOTIC",
      betAdvice: "DO NOT BET - MONITORING",
      message: `⚠️ Chaotic pattern - SKIP (monitoring for emergence)`,
      flipTarget: null,
      flipLabel: "Skip",
      urgency: "none",
      icon: "⚠️",
      isChaotic: true,
      patternStatus: {
        type: 'chaotic',
        confidence: patternConfidence || 0,
        runLength: null
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 DECISION TREE v4: PATTERN-BASED PREDICTION
  // ═══════════════════════════════════════════════════════════════════════
  
  // If we detected a clear pattern, use it
  if (detectedPattern && patternConfidence >= 0.6) {
    
    // 🔥 DOMINANCE PATTERN: Predict continuation of dominant side
    if (detectedPattern.type === 'dominance') {
      const isDominantSide = currentSide === detectedPattern.dominantSide;
      
      if (isDominantSide) {
        // Continue betting on dominant side
        return {
          valid: true,
          currentSide,
          currentLabel,
          runLength,
          dominance,
          dominantSide,
          swapRate,
          action: "CONTINUE",
          confidence: Math.min(0.70 + (patternConfidence - 0.70) * 0.5, 0.85),
          reliability: "HIGH",
          betAdvice: "BET GOOD RELICS",
          message: `🔥 ${currentLabel} dominance (${(patternConfidence * 100).toFixed(0)}%) → Continue ${currentLabel}`,
          flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
          flipLabel: currentLabel,
          urgency: "sticky",
          icon: "🔥",
          patternDetected: detectedPattern
        };
      } else {
        // We're on the weak side, suggest flipping to dominant
        const flipTarget = detectedPattern.dominantSide === "A" ? scheme.pairA : scheme.pairB;
        const flipLabel = detectedPattern.dominantSide === "A" ? scheme.pairALabel : scheme.pairBLabel;
        
        return {
          valid: true,
          currentSide,
          currentLabel,
          runLength,
          dominance,
          dominantSide,
          swapRate,
          action: "FLIP",
          confidence: 0.70,
          reliability: "MODERATE",
          betAdvice: "BET OKAY RELICS",
          message: `🔥 ${flipLabel} dominance detected → Flip to ${flipLabel}`,
          flipTarget,
          flipLabel,
          urgency: "due",
          icon: "🔥",
          patternDetected: detectedPattern
        };
      }
    }
    
    // 🔥 RUN-BASED PATTERN: Predict based on run length
    const expectedRunLength = detectedPattern.runLength;
    
    // Check if we should flip based on pattern
    // 🔥 SPECIAL CASE: For dominance patterns, NEVER flip - always continue
    if (detectedPattern && detectedPattern.type === 'dominance') {
      // Dominance pattern = sticky session, keep betting same side
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "CONTINUE",
        confidence: Math.min(0.80 + (patternConfidence - 0.7) * 0.5, 0.95),
        reliability: "VERY HIGH",
        betAdvice: "BET BEST RELICS",
        message: `🔒 ${detectedPattern.type} pattern (${Math.round(dominance * 100)}%) → Continue ${currentLabel}`,
        flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
        flipLabel: currentLabel,
        urgency: "critical",
        icon: "🔒",
        patternDetected: detectedPattern
      };
    }
    
    // For other patterns (alternating, run-based), check if we should flip
    if (runLength >= expectedRunLength) {
      // Time to flip!
      const flipTarget = currentSide === "A" ? scheme.pairB : scheme.pairA;
      const flipLabel = currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;
      
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "FLIP",
        confidence: Math.min(0.75 + (patternConfidence - 0.6) * 0.5, 0.90),
        reliability: "HIGH",
        betAdvice: "BET GOOD RELICS",
        message: `🎯 ${detectedPattern.type} pattern detected → Flip to ${flipLabel}`,
        flipTarget,
        flipLabel,
        urgency: runLength > expectedRunLength ? "overdue" : "due",
        icon: "🎯",
        patternDetected: detectedPattern
      };
    } else {
      // Continue current side
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
        reliability: "MODERATE",
        betAdvice: "BET OKAY RELICS",
        message: `📊 ${detectedPattern.type} pattern → Continue ${currentLabel} (${runLength}/${expectedRunLength})`,
        flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
        flipLabel: currentLabel,
        urgency: "building",
        icon: "📊",
        patternDetected: detectedPattern
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 FALLBACK: OLD ALTERNATING DETECTION
  // ═══════════════════════════════════════════════════════════════════════

  // 🔥 STEP 1: DETECT ALTERNATING PATTERNS (L-H-L-H-L-H)
  // Use column-specific lookback: C2 (Outer/Inner) is more volatile, needs shorter lookback
  const isCol2 = digitPosition === 1; // Column 2 = Outer/Inner (digit position 1)
  const lookbackForAlternating = Math.min(isCol2 ? 4 : 6, states.length);
  const recentForAlternating = states.slice(-lookbackForAlternating);
  
  let alternationCount = 0;
  for (let i = 1; i < recentForAlternating.length; i++) {
    if (recentForAlternating[i] !== recentForAlternating[i - 1]) {
      alternationCount++;
    }
  }
  
  const alternationRate = recentForAlternating.length > 1 
    ? alternationCount / (recentForAlternating.length - 1) 
    : 0;
  
  // Column-specific alternating thresholds:
  // C2: 50% threshold (more sensitive, faster detection)
  // C3: 60% threshold (more conservative)
  const alternatingThreshold = isCol2 ? 0.5 : 0.6;
  const minRollsForAlternating = isCol2 ? 3 : 4;
  const isAlternating = alternationRate >= alternatingThreshold && recentForAlternating.length >= minRollsForAlternating;
  
  if (isAlternating) {
    // ALTERNATING STRATEGY: Predict opposite of current side
    const flipTarget = currentSide === "A" ? scheme.pairB : scheme.pairA;
    const flipLabel = currentSide === "A" ? scheme.pairBLabel : scheme.pairALabel;
    
    return {
      valid: true,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "ALTERNATING_FLIP",
      confidence: 0.68,
      reliability: "MODERATE",
      betAdvice: "BET OKAY RELICS",
      message: `🔄 Alternating (${Math.round(alternationRate * 100)}% flip) → ${flipLabel}`,
      flipTarget,
      flipLabel,
      urgency: "moderate",
      icon: "🔄",
      isAlternating: true,
      alternationRate,
      patternDetected: { type: 'alternating', confidence: alternationRate, runLength: 1 } // NEW
    };
  }

  // 🔥 STEP 2: TUNED ADAPTIVE FLIP THRESHOLD with minimum sample size check
  const windowAccuracy = windowContext?.accuracy || 0.5;
  const sampleSize = windowContext?.rollCount || 0;
  
  // 🔥 5-MINUTE WINDOW OPTIMIZATION
  const is5MinWindow = rolls.length <= 15;
  const adaptiveFlipThreshold = is5MinWindow
    ? (sampleSize >= 8 && windowAccuracy > 0.7 ? 3 :
       sampleSize >= 6 && windowAccuracy > 0.6 ? 4 :
       5)
    : (sampleSize >= 10 && windowAccuracy > 0.75 ? 4 :
       sampleSize >= 8 && windowAccuracy > 0.65 ? 5 :
       6);

  // 🔥 CONFIDENCE MULTIPLIER based on run length
  let confidenceMultiplier = 1.0;
  if (runLength >= 8) {
    confidenceMultiplier = 0.95;
  } else if (runLength >= 6) {
    confidenceMultiplier = 1.05;
  }
  
  // 🔥 PATTERN STABILITY CHECK
  const recentStates = states.slice(-6);
  let flips = 0;
  for (let i = 1; i < recentStates.length; i++) {
    if (recentStates[i] !== recentStates[i - 1]) flips++;
  }
  const isStable = flips <= 2;
  if (!isStable) {
    confidenceMultiplier *= 0.9;
  }
  
  // 🔥 SKIP if too chaotic (>80% swap)
  if (swapRate > 0.8) {
    return {
      valid: false,
      currentSide,
      currentLabel,
      runLength,
      dominance,
      dominantSide,
      swapRate,
      action: "SKIP",
      confidence: 0.3,
      reliability: "NONE",
      betAdvice: "SKIP - TOO CHAOTIC",
      message: `⚠️ Chaos (${Math.round(swapRate * 100)}% swap) → skip`,
      flipTarget: [],
      flipLabel: "—",
      isStable: false,
      patternDetected: { type: 'chaotic', confidence: 0, runLength: null } // NEW
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // TIER S: DOMINANCE LOCK (adaptive threshold + low swap ≤35%)
  // ─────────────────────────────────────────────────────────────────────
  if (runLength >= adaptiveFlipThreshold && swapRate <= 0.35) {
    if (runLength >= 8) {
      return {
        valid: true,
        currentSide,
        currentLabel,
        runLength,
        dominance,
        dominantSide,
        swapRate,
        action: "CONTINUE",
        confidence: 0.90 * confidenceMultiplier,
        reliability: "VERY HIGH",
        betAdvice: "BET BEST RELICS",
        message: `🔥 Extreme ${runLength}x ${currentLabel} dominance → Continue ${currentLabel}`,
        flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
        flipLabel: currentLabel,
        urgency: "high",
        icon: "🟠",
        adaptiveThreshold: adaptiveFlipThreshold,
        isStable,
        patternDetected: { type: 'dominance', confidence: 0.88, runLength: runLength } // NEW
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
      confidence: 0.88 * confidenceMultiplier,
      reliability: "VERY HIGH",
      betAdvice: "BET BEST RELICS",
      message: `🔒 Dominance lock: ${currentLabel} (${runLength}x, ${Math.round(
        swapRate * 100
      )}% swap)`,
      flipTarget: currentSide === "A" ? scheme.pairA : scheme.pairB,
      flipLabel: `Continue ${currentLabel}`,
      urgency: "critical",
      icon: "🟢",
      adaptiveThreshold: adaptiveFlipThreshold,
      isStable,
      patternDetected: { type: 'dominance', confidence: 0.88, runLength: runLength } // NEW
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

  const { windowInfo } = useFiveMinuteWindowRolls(rollEvents, 4);
  
  // 🔥 NEW: Per-window pattern analysis
  const windowAnalysis = useWindowPatternAnalysis(rollEvents, windowInfo);

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
    return testRolls.map((item) => {
      const roll = typeof item === 'string' ? item : item.roll;
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
        
        // 🔥 NEW: Pattern analysis fields
        col2PatternStatus: analyzeWavePatterns?.columns?.[0]?.patternStatus || null,
        col3PatternStatus: analyzeWavePatterns?.columns?.[1]?.patternStatus || null,
        col2WindowBoundary: analyzeWavePatterns?.columns?.[0]?.windowBoundary || false,
        col3WindowBoundary: analyzeWavePatterns?.columns?.[1]?.windowBoundary || false,
        col2PatternBroke: analyzeWavePatterns?.columns?.[0]?.patternBroke || false,
        col3PatternBroke: analyzeWavePatterns?.columns?.[1]?.patternBroke || false,
        col2Expected: analyzeWavePatterns?.columns?.[0]?.expected || null,
        col3Expected: analyzeWavePatterns?.columns?.[1]?.expected || null,
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
