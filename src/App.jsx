// src/App.jsx - REPLACE YOUR EXISTING FILE
import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Routes, Route } from "react-router-dom";
import { predictNext2Smart } from "./utils/enhanced-2str-predictor";
import { predictNext2BBPMode } from "./utils/bbp-mode-2str"; // ðŸ”¥ OLD Kiyo
import { predictWithPairs } from "./utils/pairTransitionPredictor"; // ðŸ”¥ NEW SUGGEST
import {
  WAVE_SCHEMES,
  analyzeColumnWave,
  getExpectedLabel
} from "./utils/kiyoLogic";

// Layout Component
import Layout from "./components/Layout";

import ModernLiveSessionPage from "./pages/ModernLiveSessionPage"; // ðŸ”¥ NEW Modern UI
import ModernLongStringPage from "./pages/ModernLongStringPage"; // ðŸ”¥ NEW Modern Long String
import ModernKiyoModePage from "./pages/ModernKiyoModePage"; // ðŸ”¥ NEW Modern Kiyo Mode
import WarpAnalyzerPage from "./pages/WarpAnalyzerPage"; // ðŸ”¥ NEW Warp Analyzer
import ModernGuidesPage from "./pages/ModernGuidesPage"; // ðŸ”¥ NEW Guides Page
import HomePage from "./pages/HomePage"; // ðŸ”¥ NEW Landing Page
import BannerTracker from "./pages/BannerTracker"; // ðŸ”¥ NEW Banner Tracker
import CavernTimesPage from "./pages/CavernTimesPage"; // ðŸ”¥ NEW Caverns Page
import TutorialPage from "./pages/TutorialPage";
import TutorialLevelTwoPage from "./pages/TutorialLevelTwoPage";
import TutorialLevelThreePage from "./pages/TutorialLevelThreePage";
import TutorialLevelFourPage from "./pages/TutorialLevelFourPage";
import TutorialLevelFivePage from "./pages/TutorialLevelFivePage";
import TutorialLevelSixPage from "./pages/TutorialLevelSixPage";
import TutorialLevelSevenPage from "./pages/TutorialLevelSevenPage";
import TutorialLevelEightPage from "./pages/TutorialLevelEightPage";
import TutorialLevelNinePage from "./pages/TutorialLevelNinePage";
import TutorialLevelTenPage from "./pages/TutorialLevelTenPage";
import TutorialLevelElevenPage from "./pages/TutorialLevelElevenPage";
import TutorialLevelTwelvePage from "./pages/TutorialLevelTwelvePage";
import TutorialLevelThirteenPage from "./pages/TutorialLevelThirteenPage";
import TutorialLevelFourteenPage from "./pages/TutorialLevelFourteenPage";
import TutorialLevelFifteenPage from "./pages/TutorialLevelFifteenPage";
import TutorialLevelSixteenPage from "./pages/TutorialLevelSixteenPage";
import TutorialCompletePage from "./pages/TutorialCompletePage";
import PlaygroundPage from "./pages/PlaygroundPage";
import PlaygroundFreePage from "./pages/PlaygroundFreePage";
import PlaygroundChallengePage from "./pages/PlaygroundChallengePage";
import PlaygroundChallengeAdminPage from "./pages/PlaygroundChallengeAdminPage";
import PlaygroundDrillsPage from "./pages/PlaygroundDrillsPage";
import PlaygroundPatternLabPage from "./pages/PlaygroundPatternLabPage";
import PlaygroundRacesPage from "./pages/PlaygroundRacesPage";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ZoneTrackerPage from "./pages/ZoneTrackerPage";
import UserProfilePage from "./pages/UserProfilePage";
import MarketplacePage from "./pages/MarketplacePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import RequireAuth from "./components/auth/RequireAuth";
import ArcticSnow from "./components/snow/ArcticSnow";
import { getRootThemeClassName, getSessionThemeConfig } from "./theme/sessionThemeConfig";
import AstralStars from "./components/snow/AstralStars"; // ðŸŒŒ NEW Astral Stars
import AstralExpress from "./components/snow/AstralExpress"; // ðŸš‚ NEW Astral Express
import VoidPetals from "./components/snow/VoidPetals"; // í¼¸ NEW Void Petals
import CrimsonBloom from "./components/snow/CrimsonBloom";
import SilverWolf999Backdrop from "./components/snow/SilverWolf999Backdrop";

import "./styles/arctic-theme.css"; // â„ï¸ NEW Arctic Theme
import "./styles/void-theme.css"; // í¼¸ NEW Void Theme
import "./styles/astral-theme.css"; // ðŸŒŒ NEW Astral Theme
import "./styles/neon-protocol.css"; // 👾 NEW Neon Protocol
import AetherEffect from "./components/snow/AetherEffect"; // 👾 NEW Aether Effect
import ClaraChat from "./components/ClaraChat";



import {
  translateTo4,
  splitString,
  buildPrefixFreq,
  sanitizeRollInput,
} from "./utils/stringHelpers";
import {
  predictNext,
  predictNext3,
  predictNext3EU,
  predictNext4,
  resetSessionStats,
} from "./utils/predictNext";
import KiyoModeCard from "./components/KiyoModeCard";
import { predictNext3BBPMode } from "./utils/bbp-mode-3str"; // ðŸ”¥ NEW 3-str
import { predictWithCascadingPriority } from "./utils/cascadingPredictor";
import { EU_SEQUENTIAL_2STR_RECENT, EU_SEQUENTIAL_3STR_RECENT } from "./utils/euLiveSheetData";
import { getWaveAndTableSignals } from "./utils/kiyo2strSignals";

const STORAGE_KEY = "hsr-rng-session-v6";
const THEME_STORAGE_KEY = "hsr-selected-theme-v1";
const SESSION_SECONDS = 5 * 60;
const INACTIVITY_MS = 6 * 60 * 60 * 1000; // 6 hours

const getFiveMinuteBucketStartMs = (nowMs = Date.now()) => {
  const start = new Date(nowMs);
  start.setSeconds(0, 0);
  start.setMinutes(Math.floor(start.getMinutes() / 5) * 5);
  return start.getTime();
};

const getFiveMinuteBucketSecondsLeft = (nowMs = Date.now()) => {
  const startMs = getFiveMinuteBucketStartMs(nowMs);
  const endMs = startMs + SESSION_SECONDS * 1000;
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
};

const normalizeSessionTheme = (theme) => {
  if (theme === "winter") return "arctic";
  if (theme === "void") return "crimson";
  return theme || "modern";
};

const readPersistedTheme = () => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return normalizeSessionTheme(storedTheme);
  } catch {
    return "modern";
  }
};

const persistTheme = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeSessionTheme(theme));
  } catch {
    // ignore storage errors for theme-only persistence
  }
};

// ðŸ”¥ DEBUG MODE: ?debug=true in URL
const urlParams = new URLSearchParams(window.location.search);
const isDebugMode = urlParams.get("debug") === "true";

export default function App() {
  const [entries, setEntries] = useState([]);
  const [prevSessions, setPrevSessions] = useState([]);
  const [rollInput, setRollInput] = useState("");
  const [region, setRegion] = useState("America");
  const [patch, setPatch] = useState("4.0");
  const [sessionTheme, setSessionTheme] = useState(() => readPersistedTheme()); // Theme state (bootstrapped from localStorage)
  const handleThemeChange = useCallback((nextTheme) => {
    setSessionTheme(normalizeSessionTheme(nextTheme));
  }, []);

  const entriesRef = useRef([]); // ðŸ‘ˆ ADD: Ref for calculations to avoid stale closures
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const [debugLogs, setDebugLogs] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeLiveWindowStartMs, setActiveLiveWindowStartMs] = useState(null);

  const [freqTab, setFreqTab] = useState("2");
  const [sessionTab, setSessionTab] = useState("current");
  const [suggestTab, setSuggestTab] = useState("2");
  const [caesarInput, setCaesarInput] = useState("");
  const [notes, setNotes] = useState("");

  const [isCustomPatch, setIsCustomPatch] = useState(false);
  const [kiyoDebugData, setKiyoDebugData] = useState(null);
  const pendingKiyoSnapshotsRef = useRef([]); // ðŸ‘ˆ ADD
  const lastSnapshotKeyRef = useRef(null); // ðŸ‘ˆ ADD (dedupe)
  const timerRef = useRef(null);
  const timerRunningRef = useRef(false);
  const timerPausedRef = useRef(false);
  const longStringCtxRef = useRef([]);
  const livePrefixPredictionRef = useRef(null);
  useEffect(() => {
    timerRunningRef.current = timerRunning;
  }, [timerRunning]);
  const onSendKiyoDebugData = (debugData) => {
    // keep latest snapshot for UI
    setKiyoDebugData(debugData);

    // ðŸ‘‡ ADD: push a frozen snapshot to queue
    const snap = {
      t: Date.now(),
      latestRawRoll: debugData?.waveData?.latestRawRoll || null, // ðŸ”¥ NEW: Raw roll for Col 1
      waveC1: debugData?.waveData?.col1RawPrediction || null,
      waveC2: debugData?.waveData?.col2Prediction || null,
      waveC3: debugData?.waveData?.col3Prediction || null,
      col1Expected: debugData?.waveData?.col1Expected || null,
      col2Expected: debugData?.waveData?.col2Expected || null,
      col3Expected: debugData?.waveData?.col3Expected || null,
      col1Confidence: debugData?.waveData?.col1RawConfidence || 0,
      col2Confidence: debugData?.waveData?.col2Confidence || 0,
      col3Confidence: debugData?.waveData?.col3Confidence || 0,
      col1Status: debugData?.waveData?.col1RawStatus || null,
      col2Status: debugData?.waveData?.col2Status || null,
      col3Status: debugData?.waveData?.col3Status || null,
      wave2Action: debugData?.waveData?.wave2Action || null,
      wave2SessionMode: debugData?.waveData?.wave2SessionMode || null,
      wave2PairingName: debugData?.waveData?.wave2PairingName || null,
      wave2Verdict: debugData?.waveData?.wave2Verdict || null,
      wave2BetRolls: Array.isArray(debugData?.waveData?.wave2BetRolls)
        ? [...debugData.waveData.wave2BetRolls]
        : null,
      tablePairingKey: debugData?.waveData?.tablePairingKey || null,
      tableBetRolls: Array.isArray(debugData?.waveData?.tableBetRolls)
        ? [...debugData.waveData.tableBetRolls]
        : null,
      prefixMain: debugData?.smartPrefix?.prediction || null,
      prefixAlt: debugData?.smartPrefix?.alt || null,
      tracerMain: debugData?.prediction?.prediction || null,
      tracerAlt: debugData?.prediction?.alt || null,
    };

    const key = JSON.stringify(snap);
    if (key !== lastSnapshotKeyRef.current) {
      lastSnapshotKeyRef.current = key;
      pendingKiyoSnapshotsRef.current.push(snap);
    }
  };
  const handleKiyoDebugData = useCallback(
    (data) => {
      setKiyoDebugData(data);

      // ðŸ”¥ NEW: Store the current prefix prediction for next roll
      if (data.smartPrefix?.prediction) {
        livePrefixPredictionRef.current = {
          main: data.smartPrefix.prediction,
          alt: data.smartPrefix.alt || null,
          confidence: data.smartPrefix.confidence || 0,
          timestamp: Date.now(),
        };
      }

      // Merge waveData into debug logs (existing code)
      if (data.waveData && debugLogs.length > 0) {
        setDebugLogs((prev) => {
          const logs = [...prev];

          for (let i = 0; i < logs.length; i++) {
            if (logs[i].source === "kiyo" && logs[i].kind === "3") {
              if (
                !logs[i].col2Expected &&
                !logs[i].col3Expected
              ) {
                logs[i] = {
                  ...logs[i],
                  waveData: { ...data.waveData },
                  // ðŸ”¥ NEW: Raw roll for Column 1 analysis
                  rawActual: data.waveData?.latestRawRoll || null,
                  // Fill root fields as well for display/export
                  waveC1: data.waveData?.col1RawPrediction || null,
                  waveC2: data.waveData?.col2Prediction || null,
                  waveC3: data.waveData?.col3Prediction || null,
                  col1Expected: data.waveData?.col1Expected || null,
                  col2Expected: data.waveData?.col2Expected || null,
                  col3Expected: data.waveData?.col3Expected || null,
                  col1Confidence: data.waveData?.col1RawConfidence || 0,
                  col2Confidence: data.waveData?.col2Confidence || 0,
                  col3Confidence: data.waveData?.col3Confidence || 0,
                  col1Status: data.waveData?.col1RawStatus || null,
                  col2Status: data.waveData?.col2Status || null,
                  col3Status: data.waveData?.col3Status || null,
                  // ðŸ”¥ NEW: Attach the "live" prefix that was showing before this roll
                  livePrefix: livePrefixPredictionRef.current
                    ? { ...livePrefixPredictionRef.current }
                    : null,
                };
                break;
              }
            }
          }

          return logs;
        });
      }
    },
    [debugLogs]
  );

  // ðŸ”¬ Kiyo Mode: Send predictions to debug
  function handleKiyoToDebug(newRolls = [], kind = "3-str") {
    if (!newRolls.length) return;

    // ðŸ”¥ FIX: Log each NEW roll individually, not just the last one
    const prevRolls = kiyoCtxRef.current || [];
    const rollsToLog = newRolls.slice(prevRolls.length); // Only new rolls

    if (rollsToLog.length === 0) return;

    rollsToLog.forEach((actual3, idx) => {
      // Build context for this prediction
      const contextRolls = newRolls.slice(0, prevRolls.length + idx);

      // Need at least 3 rolls for context
      if (contextRolls.length < 3) return;

      // const actual3 = String(roll).slice(0, 3); // actual3 is already the roll value
      // Allow 2-digit (2-str) rolls â€” actual may be 2 or 3 chars
      if (String(actual3).length < 2) return;

      const p = predictNext3(contextRolls);
      const candidates = Array.isArray(p?.candidates) ? p.candidates : [];

      // Always create a log entry â€” even for 2-str sessions where predictNext3 returns "â€”"
      if (
        p.prediction &&
        p.prediction !== "-" &&
        !String(p.prediction).toLowerCase().startsWith("insufficient")
      ) {
        const latestSnapshot = pendingKiyoSnapshotsRef.current[pendingKiyoSnapshotsRef.current.length - 1];
        const actualStr = String(actual3).slice(0, 3); // 2 or 3 chars depending on mode
        const fallbackTwoStrSignals = getWaveAndTableSignals(contextRolls);

        const newLog = {
          ts: Date.now() + idx,
          kind: "3",
          prediction: p.prediction,
          confidence: p.confidence || 0,
          alt: p.alt || null,
          mode: p.mode || "-",
          actual: actualStr,
          ctx: contextRolls.slice(-8),
          candidates: p.candidates || [],
          source: "kiyo",
          time: new Date().toLocaleTimeString(),
          rawActual: latestSnapshot?.latestRawRoll || null,

          pred2: predictWithCascadingPriority(contextRolls, [], EU_SEQUENTIAL_2STR_RECENT, String(actual3)[0], '2str').prediction,
          alt2: predictWithCascadingPriority(contextRolls, [], EU_SEQUENTIAL_2STR_RECENT, String(actual3)[0], '2str').alt,
          pred3: predictWithCascadingPriority(contextRolls, [], EU_SEQUENTIAL_3STR_RECENT, String(actual3).slice(0, 2), '3str').prediction,
          alt3: predictWithCascadingPriority(contextRolls, [], EU_SEQUENTIAL_3STR_RECENT, String(actual3).slice(0, 2), '3str').alt,

          waveC1: latestSnapshot?.waveC1 || analyzeColumnWave(contextRolls, WAVE_SCHEMES.col1, 0).flipTarget || [],
          col1Expected: latestSnapshot?.col1Expected || getExpectedLabel(analyzeColumnWave(contextRolls, WAVE_SCHEMES.col1, 0).flipTarget, WAVE_SCHEMES.col1),
          col1Confidence: latestSnapshot?.col1Confidence || analyzeColumnWave(contextRolls, WAVE_SCHEMES.col1, 0).confidence || 0,
          waveC2: analyzeColumnWave(contextRolls, WAVE_SCHEMES.col2, 1).flipTarget || [],
          waveC3: analyzeColumnWave(contextRolls, WAVE_SCHEMES.col3, 2).flipTarget || [],
          col2Expected: getExpectedLabel(analyzeColumnWave(contextRolls, WAVE_SCHEMES.col2, 1).flipTarget, WAVE_SCHEMES.col2),
          col3Expected: getExpectedLabel(analyzeColumnWave(contextRolls, WAVE_SCHEMES.col3, 2).flipTarget, WAVE_SCHEMES.col3),
          col2Confidence: analyzeColumnWave(contextRolls, WAVE_SCHEMES.col2, 1).confidence || 0,
          col3Confidence: analyzeColumnWave(contextRolls, WAVE_SCHEMES.col3, 2).confidence || 0,
          col2Status: "unknown",
          col3Status: "unknown",
          wave2Action: latestSnapshot?.wave2Action || fallbackTwoStrSignals?.waveSnapshot?.action || null,
          wave2SessionMode: latestSnapshot?.wave2SessionMode || fallbackTwoStrSignals?.waveSnapshot?.sessionMode || null,
          wave2PairingName: latestSnapshot?.wave2PairingName || fallbackTwoStrSignals?.waveSnapshot?.pairingName || null,
          wave2Verdict: latestSnapshot?.wave2Verdict || fallbackTwoStrSignals?.waveSnapshot?.message || null,
          wave2BetRolls: Array.isArray(latestSnapshot?.wave2BetRolls)
            ? [...latestSnapshot.wave2BetRolls]
            : Array.isArray(fallbackTwoStrSignals?.waveSnapshot?.betRolls)
              ? [...fallbackTwoStrSignals.waveSnapshot.betRolls]
              : null,
          tablePairingKey: latestSnapshot?.tablePairingKey || fallbackTwoStrSignals?.table?.activeKey || null,
          tableBetRolls: Array.isArray(latestSnapshot?.tableBetRolls)
            ? [...latestSnapshot.tableBetRolls]
            : Array.isArray(fallbackTwoStrSignals?.table?.betRolls)
              ? [...fallbackTwoStrSignals.table.betRolls]
              : null,
          livePrefix: livePrefixPredictionRef.current ? { ...livePrefixPredictionRef.current } : null,
        };

        setDebugLogs((prev) => {
          const next = [...prev];
          const lastKiyoLog = next.find(l => l.kind === "3");
          if (lastKiyoLog) {
            const digit2 = String(actual3)[1];
            const digit3 = String(actual3)[2];
            if (lastKiyoLog.waveC2?.length > 0) lastKiyoLog.col2Status = lastKiyoLog.waveC2.includes(digit2) ? "hit" : "miss";
            if (lastKiyoLog.waveC3?.length > 0) lastKiyoLog.col3Status = lastKiyoLog.waveC3.includes(digit3) ? "hit" : "miss";
          }
          return [newLog, ...next].slice(0, 300);
        });
      }

      // ðŸ”¥ NEW: Also log 2-str BBP predictions for accuracy tracking
      const rolls2 = contextRolls.map(r => String(r).slice(0, 2)).filter(r => r.length === 2);
      if (rolls2.length >= 6) { // SUGGEST needs at least 6 rolls
        const p2 = predictWithPairs(rolls2); // ðŸ”¥ Use SUGGEST logic instead of OLD Kiyo BBP
        const actual2 = String(actual3).slice(0, 2);

        if (
          p2.prediction &&
          p2.prediction !== "-" &&
          !String(p2.prediction).toLowerCase().startsWith("insufficient")
        ) {
          const newLog2 = {
            ts: Date.now() + idx + 0.5, // Slight offset
            kind: "2",
            prediction: p2.prediction,
            confidence: p2.confidence || 0,
            baseConfidence: p2.baseConfidence || p2.confidence || 0, // ðŸ”¥ NEW
            alt: p2.alt || null,
            mode: p2.mode || "-",
            actual: actual2,
            ctx: rolls2.slice(-8),
            candidates: p2.candidates || [],
            source: "live", // Mark as live for accuracy tracking
            // ðŸ”¥ NEW: Enhanced BBP data
            pattern: p2.pattern,
            patternStrength: p2.patternStrength,
            patternSequence: p2.patternSequence,
            commons: p2.commons,
            noise: p2.noise,
            distribution: p2.distribution,
            waveFlipData: p2.waveFlipData,
            commonsStability: p2.commonsStability,
          };

          setDebugLogs((prev) => [newLog2, ...prev].slice(0, 300));
        }
      }
    });

    kiyoCtxRef.current = newRolls;
  }
  // ðŸ‘‡ ADD THIS NEW HANDLER FUNCTION

  const kiyoCtxRef = useRef([]);
  /* ========= LOAD ========= */
  useEffect(() => {
    try {
      const persistedTheme = readPersistedTheme();
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSessionTheme(persistedTheme);
        return;
      }

      const parsed = JSON.parse(raw);

      const now = Date.now();
      const lastActive = parsed.savedAt || 0;

      if (lastActive && now - lastActive > INACTIVITY_MS) {
        console.log("[storage] session expired after 3h inactivity, clearing");
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setEntries(parsed.entries || []);
      setPrevSessions(parsed.prevSessions || []);
      setRegion(parsed.region || "America");
      setPatch(parsed.patch || "3.7");
      setIsCustomPatch(parsed.isCustomPatch || false);
      setNotes(parsed.notes || "");
      setCaesarInput(parsed.caesarInput || "");
      setDebugLogs(parsed.debugLogs || []);
      const loadedTheme = normalizeSessionTheme(parsed.sessionTheme || persistedTheme);
      setSessionTheme(loadedTheme); // â„ï¸ Load Theme
      persistTheme(loadedTheme);
    } catch (err) {
      console.warn("storage load error", err);
    }
  }, []);

  useEffect(() => {
    persistTheme(sessionTheme);
  }, [sessionTheme]);

  /* ========= SAVE ========= */
  useEffect(() => {
    const data = {
      entries,
      prevSessions,
      region,
      patch,
      isCustomPatch,
      notes,
      caesarInput,
      debugLogs,
      sessionTheme, // â„ï¸ Save Theme
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("storage save error", err);
    }
  }, [
    entries,
    prevSessions,
    region,
    patch,
    isCustomPatch,
    notes,
    caesarInput,
    debugLogs,
    sessionTheme,
  ]);

  useEffect(() => {
    const classNames = [
      "modern-theme",
      "arctic-theme",
      "astral-theme",
      "crimson-theme",
      "neon-theme",
      "void-theme",
      "winter-theme",
    ];
    document.body.classList.remove(...classNames);
    document.body.classList.add(getRootThemeClassName(sessionTheme));

    return () => {
      document.body.classList.remove(...classNames);
    };
  }, [sessionTheme]);

  /* ========= TIMER ========= */
  useEffect(() => {
    if (!timerRunning) return undefined;

    const syncTimerToLiveWindow = () => {
      if (!timerRunningRef.current || timerPausedRef.current) return;
      const nowMs = Date.now();
      const currentBucketStartMs = getFiveMinuteBucketStartMs(nowMs);

      if (activeLiveWindowStartMs !== null && currentBucketStartMs !== activeLiveWindowStartMs) {
        if (!timerRunningRef.current || timerPausedRef.current) return;
        archiveCurrentSession(entriesRef.current);
        setActiveLiveWindowStartMs(currentBucketStartMs);
      } else if (activeLiveWindowStartMs === null) {
        setActiveLiveWindowStartMs(currentBucketStartMs);
      }

      if (!timerRunningRef.current || timerPausedRef.current) return;
      setSecondsLeft(getFiveMinuteBucketSecondsLeft(nowMs));
    };

    syncTimerToLiveWindow();
    timerRef.current = setInterval(syncTimerToLiveWindow, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning, activeLiveWindowStartMs]);

  function archiveCurrentSession(sessionEntries = entriesRef.current) {
    if (sessionEntries.length > 0) {
      // Calculate BBP Mode frequency distribution for this session
      const rollValues = sessionEntries
        .map(e => (e.translated || e.s2 || '').slice(0, 2))
        .filter(Boolean);

      let beastAnalysis = null;
      if (rollValues.length >= 6) {
        try {
          const analysis = predictNext2BBPMode(rollValues);

          // Build frequency distribution
          const freq = {};
          rollValues.forEach(v => {
            freq[v] = (freq[v] || 0) + 1;
          });

          const total = rollValues.length;
          const distribution = Object.entries(freq).map(([value, count]) => ({
            value,
            count,
            pct: (count / total) * 100,
            status: analysis.commons && analysis.commons.includes(value) ? 'common' : 'noise'
          }));

          distribution.sort((a, b) => {
            // Commons first, then by count
            if (a.status === 'common' && b.status !== 'common') return -1;
            if (a.status !== 'common' && b.status === 'common') return 1;
            return b.count - a.count;
          });

          beastAnalysis = {
            commons: analysis.commons || [],
            noise: analysis.noise || [],
            pattern: analysis.pattern,
            confidence: analysis.commonsConfidence,
            distribution
          };
        } catch (err) {
          console.warn('BBP Mode analysis failed for session archive:', err);
        }
      }

      // NEW: Calculate BBP Mode 3-str frequency distribution
      const rollValues3str = sessionEntries
        .map(e => (e.translated || '').slice(0, 3))
        .filter(v => v && v.length === 3);

      let beastAnalysis3str = null;
      if (rollValues3str.length >= 6) {
        try {
          const analysis = predictNext3BBPMode(rollValues3str);

          // Build frequency distribution
          const freq = {};
          rollValues3str.forEach(v => {
            freq[v] = (freq[v] || 0) + 1;
          });

          const total = rollValues3str.length;
          const distribution = Object.entries(freq).map(([value, count]) => ({
            value,
            count,
            pct: (count / total) * 100,
            status: analysis.commons && analysis.commons.includes(value) ? 'common' : 'noise'
          }));

          distribution.sort((a, b) => {
            // Commons first, then by count
            if (a.status === 'common' && b.status !== 'common') return -1;
            if (a.status !== 'common' && b.status === 'common') return 1;
            return b.count - a.count;
          });

          beastAnalysis3str = {
            commons: analysis.commons || [],
            noise: analysis.noise || [],
            pattern: analysis.pattern,
            confidence: analysis.commonsConfidence,
            distribution
          };
        } catch (err) {
          console.warn('BBP Mode 3-str analysis failed for session archive:', err);
        }
      }

      setPrevSessions((prev) => [
        {
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          startedAt: new Date().toISOString(),
          region,
          patch,
          entries: sessionEntries,
          beastAnalysis,
          beastAnalysis3str,
        },
        ...prev,
      ]);
      setEntries([]);
    }
  }

  function handleStartSession() {
    const nowMs = Date.now();
    const currentBucketStartMs = getFiveMinuteBucketStartMs(nowMs);

    if (!timerPausedRef.current && activeLiveWindowStartMs !== null && activeLiveWindowStartMs !== currentBucketStartMs) {
      archiveCurrentSession();
    }

    timerPausedRef.current = false;
    timerRunningRef.current = true;
    setActiveLiveWindowStartMs(currentBucketStartMs);
    setSecondsLeft(getFiveMinuteBucketSecondsLeft(nowMs));
    setTimerRunning(true);
  }

  function handleStopSession() {
    timerPausedRef.current = true;
    timerRunningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
  }

  function handleRestartSession() {
    const nowMs = Date.now();
    archiveCurrentSession();
    timerPausedRef.current = false;
    timerRunningRef.current = true;
    setActiveLiveWindowStartMs(getFiveMinuteBucketStartMs(nowMs));
    setSecondsLeft(getFiveMinuteBucketSecondsLeft(nowMs));
    setTimerRunning(true);
  }

  /* ========= ADD ROLL ========= */
  function handleAddRoll(manualValue = null) {
    const value = manualValue !== null ? String(manualValue) : rollInput.trim();
    if (!value) return;

    const clean = sanitizeRollInput(value);

    // ðŸ”¥ NEW: Enforce minimum 2 digits
    if (clean.length < 2) {
      console.warn('Roll must be at least 2 digits');
      return;
    }

    if (!clean) return;

    const nowTs = Date.now();
    const nowIso = new Date(nowTs).toISOString();
    const currentBucketStartMs = getFiveMinuteBucketStartMs(nowTs);

    const { s2, s3, s4, s5 } = splitString(clean);
    const translated = translateTo4(clean);

    // Capture the current live prediction before adding the roll.
    const currentEntries = entriesRef.current;

    const rolls2Before = currentEntries
      .map((e) => (e.translated || "").slice(0, 2))
      .filter(Boolean); // Chronological (oldest â†’ newest)

    const rolls3Before = currentEntries
      .map((e) => (e.translated || "").slice(0, 3))
      .filter((r) => r.length === 3); // Chronological

    const rolls4Before = currentEntries
      .map((e) => (e.translated || "").slice(0, 4))
      .filter((r) => r.length === 4); // Chronological

    // ðŸ”¥ CAPTURE: The predictions that were SHOWING before this roll
    const p2Before = rolls2Before.length >= 6 ? predictWithPairs(rolls2Before, { region }) : null;
    const p3Before = predictNext3(rolls3Before);
    const p4Before = predictNext4(rolls4Before);

    const actual2 = translated.slice(0, 2);
    const actual3 = translated.slice(0, 3);
    const actual4 = translated.slice(0, 4);

    const safeCandidates = (p) =>
      Array.isArray(p?.candidates) ? p.candidates : [];

    const newLogsToAdd = [];

    // Capture live state of the smart predictor only when a real prediction exists.
    const hasReal3StrPrediction =
      p3Before?.prediction &&
      p3Before.prediction !== "-" &&
      !String(p3Before.prediction).toLowerCase().startsWith("insufficient");

    const liveSmartPrefix = {
      main: hasReal3StrPrediction ? p3Before.prediction : "-",
      alt: p3Before.alt || safeCandidates(p3Before)[1]?.value || null,
    };

    if (hasReal3StrPrediction) {
      newLogsToAdd.push({
        ts: nowTs,
        kind: "3",
        prediction: liveSmartPrefix.main,
        confidence: p3Before.confidence || 0,
        alt: liveSmartPrefix.alt,
        mode: p3Before.mode || "-",
        actual: actual3,
        ctx: rolls3Before.slice(-8),
        candidates: safeCandidates(p3Before),
        smartPrefix: liveSmartPrefix, // Store live state of the smart predictor
      });
    }

    // ðŸ”¥ FIXED: Use the prediction that was SHOWING (p2Before), not a new one
    if (p2Before && p2Before.prediction && p2Before.prediction !== "-" &&
      !String(p2Before.prediction).toLowerCase().startsWith("insufficient")) {
      newLogsToAdd.push({
        ts: nowTs + 0.1, // Slight offset
        kind: "2",
        prediction: p2Before.prediction,
        confidence: p2Before.confidence || 0,
        baseConfidence: p2Before.baseConfidence || p2Before.confidence || 0,
        alt: p2Before.alt || null,
        mode: p2Before.mode || "-",
        actual: actual2,
        ctx: [...rolls2Before], // Chronological (oldestâ†’newest)
        candidates: safeCandidates(p2Before),
        source: "live", // Mark as live for accuracy tracking
        // ðŸ”¥ Enhanced BBP data
        pattern: p2Before.pattern,
        patternStrength: p2Before.patternStrength,
        patternSequence: p2Before.patternSequence,
        commons: p2Before.commons,
        noise: p2Before.noise,
        distribution: p2Before.distribution,
        waveFlipData: p2Before.waveFlipData,
        commonsStability: p2Before.commonsStability,
      });
    }

    setEntries((prev) => [...prev, {
      id: `${nowTs}-${Math.random()}`,
      raw: value,
      s2,
      s3,
      s4,
      s5,
      translated,
      time: nowIso  // Fixed: was 'ts', should be 'time'
    }]);
    setDebugLogs((old) => [...newLogsToAdd, ...old].slice(0, 200));

    // ðŸ”¥ Track prediction in live stats
    if (window.__trackPrediction) {
      window.__trackPrediction();
    }

    if (manualValue === null) {
      setRollInput("");
    }

  }
  // ðŸ”¬ Long String sandbox â†’ stream to debug (supports both 2-str and 3-str)
  function handleLongStringToDebug(newRolls = [], targetStream = "2-str") {
    if (!newRolls.length) return;

    const is3Str = targetStream === "3-str";

    // ðŸ”¥ FIX: Don't send ALL rolls, only send the LAST roll as a single prediction
    // This prevents sending 19 duplicate entries for 19 rolls

    const lastRoll = newRolls[newRolls.length - 1];
    const contextRolls = newRolls.slice(0, -1); // All except last

    if (contextRolls.length < 6) {
      // Not enough context to make a prediction
      return;
    }

    const actualStr = String(lastRoll).slice(0, is3Str ? 3 : 2);
    if (actualStr.length !== (is3Str ? 3 : 2)) return;

    const baseTs = Date.now();
    const safeCandidates = (p) =>
      Array.isArray(p?.candidates) ? p.candidates : [];

    const p = is3Str ? predictNext3EU(contextRolls) : predictNext(contextRolls);
    const candidates = safeCandidates(p);
    const alt = p.alt || (candidates[1]?.value ?? null);

    // Only log if we have a real prediction
    if (
      p.prediction &&
      p.prediction !== "-" &&
      !String(p.prediction).toLowerCase().startsWith("insufficient")
    ) {
      const newLog = {
        ts: baseTs,
        kind: is3Str ? "3" : "2",
        prediction: p.prediction,
        confidence: p.confidence || 0,
        alt,
        mode: p.mode || "â€”",
        actual: actualStr,
        ctx: contextRolls.slice(-8).reverse(), // Last 8 in reverse (newest first)
        candidates,
        source: is3Str ? "kiyoMode" : "longString",
      };

      setDebugLogs((prev) => [newLog, ...prev].slice(0, 300));
    }
  }

  function handleDeleteEntry(id) {
    // Find the entry being deleted to get its timestamp
    const entryToDelete = entries.find((e) => e.id === id);

    if (entryToDelete) {
      const entryTime = new Date(entryToDelete.time).getTime();

      // Remove the entry
      setEntries((prev) => prev.filter((e) => e.id !== id));

      // Remove corresponding debug logs (match by timestamp within 1 second)
      setDebugLogs((prev) =>
        prev.filter((log) => {
          const logTime = log.ts;
          const timeDiff = Math.abs(logTime - entryTime);
          return timeDiff > 1000; // Keep logs that are NOT within 1 second
        })
      );
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function handleDeleteSession(id) {
    if (id === "ALL") {
      setPrevSessions([]);
    } else {
      setPrevSessions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  // ðŸ”¥ CSV Export Handler
  function handleExportCSV() {
    const allEntries = [];

    // Helper functions
    function translateTo4(str = "") {
      if (!str) return "";
      const digits = str.split("").map((d) => {
        const n = parseInt(d, 10);
        if (isNaN(n)) return null;
        // âœ… MAP 1â€“8 â†’ 1â€“4 USING MODULO (GAME-NATIVE)
        return ((n - 1) % 4) + 1;
      }).filter(Boolean);

      if (digits.length === 0) return "";

      const shift = (4 - digits[0] + 4) % 4;
      return digits
        .map((d) => {
          const z = d - 1;
          const s = (z + shift) % 4;
          return (s + 1).toString();
        })
        .join("");
    }

    function pad5(s = "") {
      return s.padEnd(5, "0").slice(0, 5);
    }

    function toWeekday(dateStr) {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleDateString(undefined, { weekday: "long" });
    }

    // Add current session entries
    entries.forEach((e) => {
      const base = (e.s2 || e.translated || e.raw || "").toString();
      const translated = translateTo4(base.replace(/0+$/, "")) || base;
      allEntries.push({
        day: toWeekday(e.time),
        string: pad5(translated),
        region: e.region || region,
        patch: e.patch || patch,
        time: e.time,
      });
    });

    // Add all previous sessions entries
    prevSessions.forEach((sess) => {
      (sess.entries || []).forEach((e) => {
        const base = (e.s2 || e.translated || e.raw || "").toString();
        const translated = translateTo4(base.replace(/0+$/, "")) || base;
        allEntries.push({
          day: toWeekday(e.time),
          string: pad5(translated),
          region: sess.region || region,
          patch: sess.patch || patch,
          time: e.time,
        });
      });
    });

    // Sort by time (newest first)
    allEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    const headers = ["Day", "String", "Region", "Patch", "MARK State", "CSI", "NTL", "PC", "Wave", "Commons", "Pattern"];

    const csv = [
      headers.join(","),
      ...allEntries.map((r, idx) => {
        // Calculate MARK Mode for this roll (using previous rolls as context)
        const contextRolls = allEntries.slice(Math.max(0, idx - 11), idx + 1).map(row => row.string.slice(0, 2));
        let markState = "N/A", csi = "", ntl = "", pc = "", wave = "", commons = "", pattern = "";

        if (contextRolls.length >= 6) {
          try {
            const analysis = predictNext2BBPMode(contextRolls);
            markState = analysis.markData?.state || "N/A";
            csi = analysis.markData?.csi || "";
            ntl = analysis.markData?.ntl || "";
            pc = analysis.markData?.pc || "";
            wave = analysis.markData?.waveIntensity || "";
            commons = analysis.commons?.join("+") || "";
            pattern = analysis.pattern || "";
          } catch (e) {
            // Skip if analysis fails
          }
        }

        return [r.day, r.string, r.region, r.patch, markState, csi, ntl, pc, wave, commons, pattern]
          .map((v) => `"${v ?? ""}"`)
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HSR_RNG_All_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ðŸ”¥ NEW: Clear debug logs handler
  function handleClearDebugLogs() {
    setDebugLogs([]);
  }

  // Import debug logs from a file (Backtest tab)
  function handleImportDebugLogs(newLogs) {
    // Put imported logs on top, keep at most 200
    setDebugLogs((old) => [...newLogs, ...old].slice(0, 200));
  }
  // NEW: Import rolls from Session Data Export file for sequential testing
  const importQueueRef = useRef([]);
  const isImportingRef = useRef(false);
  const [isAutoImporting, setIsAutoImporting] = useState(false);

  function handleImportRolls(rolls) {
    if (!Array.isArray(rolls) || rolls.length === 0) return;
    importQueueRef.current = rolls;

    if (!isImportingRef.current) {
      isImportingRef.current = true;
      setIsAutoImporting(true);
      processNextImport(0);
    }
  }

  function processNextImport(idx) {
    const rolls = importQueueRef.current;
    if (idx >= rolls.length) {
      isImportingRef.current = false;
      setIsAutoImporting(false);
      importQueueRef.current = [];
      setRollInput("");
      return;
    }

    const roll = rolls[idx];

    // 1. Show in input bar
    setRollInput(roll);

    // 2. Add to session (using manualValue we added earlier)
    handleAddRoll(roll);

    // 3. Schedule next with enough delay for UI to update
    setTimeout(() => {
      processNextImport(idx + 1);
    }, 800); // 800ms for rock-solid stability
  }


  const freq2 = buildPrefixFreq(entries, 2, { translateAll: true });
  const freq3 = buildPrefixFreq(entries, 3, { translateAll: true });
  const freq4 = buildPrefixFreq(entries, 4, { translateAll: true });
  const freq5 = buildPrefixFreq(entries, 5, { translateAll: true });

  const rolls2 = entries
    .map((e) => (e.translated || "").slice(0, 2))
    .filter((r) => r.length === 2);

  const rolls3 = entries
    .map((e) => (e.s3 || "").replace(/0+$/, ""))
    .filter((r) => r.length === 3);

  const rolls4 = entries
    .map((e) => (e.s4 || "").replace(/0+$/, ""))
    .filter((r) => r.length >= 4);

  // ðŸ”¥ UPDATED: Use BBP mode for live prediction display
  const livePrediction = rolls2.length >= 6 ? predictWithPairs(rolls2) : { prediction: "â€”", confidence: 0 };

  const livePrediction3 = predictNext3(rolls3);
  const livePrediction4 = predictNext4(rolls4);

  // Calculate session accuracy for header (Main + Alt hits)
  const sessionAccuracy = debugLogs.length > 0
    ? Math.round(
      (debugLogs.filter((log) => {
        const pred = String(log.prediction);
        const alt = log.alt ? String(log.alt) : null;
        const actual = String(log.actual);
        // Count as hit if main prediction matches OR alt prediction matches
        const mainHit = pred === actual || pred === actual.slice(0, pred.length);
        const altHit = alt && (alt === actual || alt === actual.slice(0, alt.length));
        return mainHit || altHit;
      }).length /
        debugLogs.length) *
      100
    )
    : 0;

  return (
    <Suspense
      fallback={
        <div role="status">
          <svg
            aria-hidden="true"
            className="inline w-8 h-8 text-neutral-tertiary animate-spin fill-purple"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </div>
      }
    >
      <div
        className={`theme-root ${getRootThemeClassName(sessionTheme)} transition-colors duration-1000`}
        style={getSessionThemeConfig(sessionTheme).cssVars}
      >
        {sessionTheme === 'arctic' && (
          <>
            <div className="aurora-layer aurora-blob-1" />
            <div className="aurora-layer aurora-blob-2" />
            <div className="aurora-layer aurora-blob-3" />
            <ArcticSnow particleCount={24} speedScale={0.50} />
          </>
        )}
        {sessionTheme === 'astral' && (
          <>
            <AstralStars />
            <AstralExpress />
          </>
        )}
        {normalizeSessionTheme(sessionTheme) === 'crimson' && (
          <>
            <CrimsonBloom />
            <VoidPetals />
          </>
        )}
        <div className="relative z-20">
          {sessionTheme === "neon" && (
            <div className="pointer-events-none fixed inset-0 z-0">
              <SilverWolf999Backdrop image="999SW.png" />
              <AetherEffect />
            </div>
          )}
          <div className="relative z-10">
            <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/"
            element={
                <HomePage
                  sessionTheme={sessionTheme}
                onThemeChange={handleThemeChange}
              />
            }
          />
          {/* Wrap all other routes with Layout for navigation */}
          <Route element={
            <Layout
              region={region}
              setRegion={setRegion}
              patch={patch}
              setPatch={setPatch}
              isCustomPatch={isCustomPatch}
              setIsCustomPatch={setIsCustomPatch}
              entries={entries}
              prevSessions={prevSessions}
              onExportCSV={handleExportCSV}
              sessionTheme={sessionTheme}
              onThemeChange={handleThemeChange}
            />
          }>
            <Route
              path="/live"
              element={
                <ModernLiveSessionPage
                  // State
                  entries={entries}
                  prevSessions={prevSessions}
                  rollInput={rollInput}
                  setRollInput={setRollInput}
                  region={region}
                  setRegion={setRegion}
                  patch={patch}
                  setPatch={setPatch}
                  isCustomPatch={isCustomPatch}
                  setIsCustomPatch={setIsCustomPatch}
                  debugLogs={debugLogs}
                  secondsLeft={secondsLeft}
                  timerRunning={timerRunning}
                  freqTab={freqTab}
                  setFreqTab={setFreqTab}
                  sessionTab={sessionTab}
                  setSessionTab={setSessionTab}
                  suggestTab={suggestTab}
                  setSuggestTab={setSuggestTab}
                  caesarInput={caesarInput}
                  setCaesarInput={setCaesarInput}
                  notes={notes}
                  setNotes={setNotes}
                  // Computed
                  freq2={freq2}
                  freq3={freq3}
                  freq4={freq4}
                  freq5={freq5}
                  livePrediction={livePrediction}
                  livePrediction3={livePrediction3}
                  livePrediction4={livePrediction4}
                  // Handlers
                  handleAddRoll={handleAddRoll}
                  handleStartSession={handleStartSession}
                  handleStopSession={handleStopSession}
                  handleRestartSession={handleRestartSession}
                  handleDeleteEntry={handleDeleteEntry}
                  handleDeleteSession={handleDeleteSession}
                  handleClearDebugLogs={handleClearDebugLogs}
                  handleImportDebugLogs={handleImportDebugLogs}
                  handleImportRolls={handleImportRolls}
                  isAutoImporting={isAutoImporting}
                  // Refs
                  pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
                  // Other
                  isDebugMode={isDebugMode}
                  kiyoDebugData={kiyoDebugData}
                />
              }
            />
            <Route
              path="/long-string"
              element={
                <ModernLongStringPage
                  debugLogs={debugLogs}
                  onClearLogs={handleClearDebugLogs}
                  onImportLogs={handleImportDebugLogs}
                  isDebugMode={isDebugMode}
                  sessionTheme={sessionTheme}
                />
              }
            />
            <Route
              path="/kiyo"
              element={
                <ModernKiyoModePage
                  region={region}
                  setRegion={setRegion}
                  patch={patch}
                  setPatch={setPatch}
                  isCustomPatch={isCustomPatch}
                  setIsCustomPatch={setIsCustomPatch}
                  entries={entries}
                  prevSessions={prevSessions}
                  debugLogs={debugLogs}
                  kiyoDebugData={kiyoDebugData}
                  handleKiyoToDebug={handleKiyoToDebug}
                  handleKiyoDebugData={handleKiyoDebugData}
                  pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
                  onClearLogs={handleClearDebugLogs}
                  onImportLogs={handleImportDebugLogs}
                  isDebugMode={isDebugMode}
                  sessionTheme={sessionTheme}
                />
              }
            />
            <Route path="/warp-analyzer" element={<WarpAnalyzerPage sessionTheme={sessionTheme} />} />
            <Route path="/banner-tracker" element={<BannerTracker sessionTheme={sessionTheme} />} />
            <Route path="/caverns" element={<CavernTimesPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial" element={<TutorialPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-2" element={<TutorialLevelTwoPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-3" element={<TutorialLevelThreePage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-4" element={<TutorialLevelFourPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-5" element={<TutorialLevelFivePage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-6" element={<TutorialLevelSixPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-7" element={<TutorialLevelSevenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-8" element={<TutorialLevelEightPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-9" element={<TutorialLevelNinePage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-10" element={<TutorialLevelTenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-11" element={<TutorialLevelElevenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-12" element={<TutorialLevelTwelvePage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-13" element={<TutorialLevelThirteenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-14" element={<TutorialLevelFourteenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-15" element={<TutorialLevelFifteenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/level-16" element={<TutorialLevelSixteenPage sessionTheme={sessionTheme} />} />
            <Route path="/tutorial/complete" element={<TutorialCompletePage sessionTheme={sessionTheme} />} />
            <Route path="/playground" element={<PlaygroundPage sessionTheme={sessionTheme} />} />
            <Route path="/playground/free" element={<PlaygroundFreePage sessionTheme={sessionTheme} />} />
            <Route path="/playground/challenge" element={<PlaygroundChallengePage sessionTheme={sessionTheme} />} />
            <Route path="/playground/drills" element={<PlaygroundDrillsPage sessionTheme={sessionTheme} />} />
            <Route path="/playground/pattern-lab" element={<PlaygroundPatternLabPage sessionTheme={sessionTheme} />} />
            <Route
              path="/playground/races"
              element={
                <RequireAuth>
                  <PlaygroundRacesPage sessionTheme={sessionTheme} />
                </RequireAuth>
              }
            />
            <Route
              path="/playground/challenge/admin"
              element={
                <RequireAuth>
                  <PlaygroundChallengeAdminPage />
                </RequireAuth>
              }
            />
            <Route
              path="/zone-tracker"
              element={
                <RequireAuth>
                  <ZoneTrackerPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <UserProfilePage sessionTheme={sessionTheme} />
                </RequireAuth>
              }
            />
            <Route
              path="/marketplace"
              element={
                <RequireAuth>
                  <MarketplacePage />
                </RequireAuth>
              }
            />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/guides" element={<ModernGuidesPage sessionTheme={sessionTheme} />} />
          </Route>
            </Routes>
          </div>
        </div>
        <ClaraChat />
      </div>
    </Suspense>
  );
}




