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
import { predictNext2BBPMode } from "./utils/bbp-mode-2str"; // 🔥 NEW

// Layout Component
import Layout from "./components/Layout";

// Page Components
import LiveSessionPage from "./pages/LiveSessionPage";
import ModernLiveSessionPage from "./pages/ModernLiveSessionPage"; // 🔥 NEW Modern UI
import LongStringPage from "./pages/LongStringPage";
import ModernLongStringPage from "./pages/ModernLongStringPage"; // 🔥 NEW Modern Long String
import KiyoModePage from "./pages/KiyoModePage";
import ModernKiyoModePage from "./pages/ModernKiyoModePage"; // 🔥 NEW Modern Kiyo Mode

const LeftColumn = lazy(() => import("./components/LeftColumn"));
const RollInputCard = lazy(() => import("./components/RollInputCard"));
const SessionTable = lazy(() => import("./components/SessionTable"));
const FrequencyPanel = lazy(() => import("./components/FrequencyPanel"));
const NotesCard = lazy(() => import("./components/NotesCard"));
const Footer = lazy(() => import("./components/Footer"));
const StatsPanel = lazy(() => import("./components/StatsPanel"));
const TopBar = lazy(() => import("./components/TopBar"));
const DebugPanel = lazy(() => import("./components/DebugPanel"));
const AccuracyPanel = lazy(() => import("./components/AccuracyPanel")); // 🔥 NEW

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
import RelicPositionCard from "./components/RelicPositionCard";
import KiyoModeCard from "./components/KiyoModeCard";
import LiveTrackingTable from "./components/LiveTrackingTable"; // 🔥 NEW
import LiveTrackingTable3str from "./components/LiveTrackingTable3str"; // 🔥 NEW 3-str
import { predictNext3BBPMode } from "./utils/bbp-mode-3str"; // 🔥 NEW 3-str

const STORAGE_KEY = "hsr-rng-session-v6";
const SESSION_SECONDS = 5 * 60;
const INACTIVITY_MS = 6 * 60 * 60 * 1000; // 6 hours

// 🔥 DEBUG MODE: ?debug=true in URL
const urlParams = new URLSearchParams(window.location.search);
const isDebugMode = urlParams.get("debug") === "true";

export default function App() {
  const [entries, setEntries] = useState([]);
  const [prevSessions, setPrevSessions] = useState([]);
  const [rollInput, setRollInput] = useState("");
  const [region, setRegion] = useState("America");
  const [patch, setPatch] = useState("3.8");

  const [debugLogs, setDebugLogs] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);

  const [freqTab, setFreqTab] = useState("2");
  const [sessionTab, setSessionTab] = useState("current");
  const [suggestTab, setSuggestTab] = useState("2");
  const [caesarInput, setCaesarInput] = useState("");
  const [notes, setNotes] = useState("");

  const [isCustomPatch, setIsCustomPatch] = useState(false);
  const [kiyoDebugData, setKiyoDebugData] = useState(null);
  const pendingKiyoSnapshotsRef = useRef([]); // 👈 ADD
  const lastSnapshotKeyRef = useRef(null); // 👈 ADD (dedupe)
  const timerRef = useRef(null);
  const longStringCtxRef = useRef([]);
  const livePrefixPredictionRef = useRef(null);
  const onSendKiyoDebugData = (debugData) => {
    // keep latest snapshot for UI
    setKiyoDebugData(debugData);

    // 👇 ADD: push a frozen snapshot to queue
    const snap = {
      t: Date.now(),
      waveC2: debugData?.waveData?.col2Prediction || null,
      waveC3: debugData?.waveData?.col3Prediction || null,
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

      // 🔥 NEW: Store the current prefix prediction for next roll
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
                !logs[i].waveData ||
                (!logs[i].waveData.col2Prediction &&
                  !logs[i].waveData.col3Prediction)
              ) {
                logs[i] = {
                  ...logs[i],
                  waveData: { ...data.waveData },
                  // 🔥 NEW: Attach the "live" prefix that was showing before this roll
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

  // 🔬 Kiyo Mode: Send predictions to debug
  function handleKiyoToDebug(newRolls = [], kind = "3-str") {
    if (!newRolls.length) return;

    // 🔥 FIX: Log each NEW roll individually, not just the last one
    const prevRolls = kiyoCtxRef.current || [];
    const rollsToLog = newRolls.slice(prevRolls.length); // Only new rolls
    
    if (rollsToLog.length === 0) return;

    rollsToLog.forEach((actual3, idx) => {
      // Build context for this prediction
      const contextRolls = newRolls.slice(0, prevRolls.length + idx);
      
      // Need at least 3 rolls for context
      if (contextRolls.length < 3) return;
      
      // const actual3 = String(roll).slice(0, 3); // actual3 is already the roll value
      if (String(actual3).slice(0, 3).length !== 3) return;

      const p = predictNext3(contextRolls);
      const candidates = Array.isArray(p?.candidates) ? p.candidates : [];
      const alt = p.alt || (candidates[1]?.value ?? null);

      if (
        p.prediction &&
        p.prediction !== "—" &&
        !String(p.prediction).toLowerCase().startsWith("insufficient")
      ) {
        const newLog = {
          ts: Date.now() + idx, // Slight offset to maintain order
          kind: "3",
          prediction: p.prediction,
          confidence: p.confidence || 0,
          alt,
          mode: p.mode || "—",
          actual: String(actual3).slice(0, 3),
          ctx: contextRolls.slice(-8),
          candidates,
          source: "kiyo",
          waveData: null, // Will be filled by handleKiyoDebugData
          livePrefix: livePrefixPredictionRef.current
            ? { ...livePrefixPredictionRef.current }
            : null,
        };

        setDebugLogs((prev) => [newLog, ...prev].slice(0, 300));
      }

      // 🔥 NEW: Also log 2-str BBP predictions for accuracy tracking
      const rolls2 = contextRolls.map(r => String(r).slice(0, 2)).filter(r => r.length === 2);
      if (rolls2.length >= 6) { // BBP needs at least 6 rolls
        const p2 = predictNext2BBPMode(rolls2); // 🔥 Use BBP mode for enhanced data
        const actual2 = String(actual3).slice(0, 2);
        
        if (
          p2.prediction &&
          p2.prediction !== "—" &&
          !String(p2.prediction).toLowerCase().startsWith("insufficient")
        ) {
          const newLog2 = {
            ts: Date.now() + idx + 0.5, // Slight offset
            kind: "2",
            prediction: p2.prediction,
            confidence: p2.confidence || 0,
            baseConfidence: p2.baseConfidence || p2.confidence || 0, // 🔥 NEW
            alt: p2.alt || null,
            mode: p2.mode || "—",
            actual: actual2,
            ctx: rolls2.slice(-8),
            candidates: p2.candidates || [],
            source: "live", // Mark as live for accuracy tracking
            // 🔥 NEW: Enhanced BBP data
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
  // 👇 ADD THIS NEW HANDLER FUNCTION

  const kiyoCtxRef = useRef([]);
  /* ========= LOAD ========= */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

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
    } catch (err) {
      console.warn("storage load error", err);
    }
  }, []);

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
  ]);

  /* ========= TIMER ========= */
  useEffect(() => {
    if (!timerRunning) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      archiveCurrentSession();
      setSecondsLeft(SESSION_SECONDS);
    }
  }, [secondsLeft, timerRunning]);

  function archiveCurrentSession() {
    if (entries.length > 0) {
      // 🔥 Calculate BBP Mode frequency distribution for this session
      const rollValues = entries
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
      
      // 🔥 NEW: Calculate BBP Mode 3-str frequency distribution
      const rollValues3str = entries
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
          entries,
          beastAnalysis, // 🔥 NEW: Save BBP Mode analysis
          beastAnalysis3str, // 🔥 NEW: Save BBP Mode 3-str analysis
        },
        ...prev,
      ]);
      setEntries([]);
    }
  }

  function handleStartSession() {
    archiveCurrentSession();
    setSecondsLeft(SESSION_SECONDS);
    setTimerRunning(true);
  }

  function handleStopSession() {
    setTimerRunning(false);
  }

  function handleRestartSession() {
    archiveCurrentSession(); // Archive current session to history
    setSecondsLeft(SESSION_SECONDS);
    setTimerRunning(true);
  }

  /* ========= ADD ROLL ========= */
  function handleAddRoll() {
    const value = rollInput.trim();
    if (!value) return;

    const clean = sanitizeRollInput(value);
    
    // 🔥 NEW: Enforce minimum 2 digits
    if (clean.length < 2) {
      console.warn('Roll must be at least 2 digits');
      return;
    }
    
    if (!clean) return;

    const { s2, s3, s4, s5 } = splitString(clean);
    const nowIso = new Date().toISOString();
    const translated = translateTo4(clean);

    // 🔥 CRITICAL FIX: Capture the CURRENT live prediction BEFORE adding the roll
    // This is what the user SAW on screen before typing
    const rolls2Before = entries
      .map((e) => (e.translated || "").slice(0, 2))
      .filter(Boolean)
      .reverse();

    const rolls3Before = entries
      .map((e) => (e.s3 || "").replace(/0+$/, ""))
      .filter((r) => r.length === 3)
      .reverse();

    const rolls4Before = entries
      .map((e) => (e.s4 || "").replace(/0+$/, ""))
      .filter((r) => r.length === 4)
      .reverse();

    // 🔥 CAPTURE: The predictions that were SHOWING before this roll
    const p2Before = rolls2Before.length >= 6 ? predictNext2BBPMode(rolls2Before) : null;
    const p3Before = predictNext3(rolls3Before);
    const p4Before = predictNext4(rolls4Before);

    const actual2 = translated.slice(0, 2);
    const actual3 = translated.slice(0, 3);
    const actual4 = translated.slice(0, 4);

    const nowTs = Date.now();
    const safeCandidates = (p) =>
      Array.isArray(p?.candidates) ? p.candidates : [];

    const newLogsToAdd = [];

    // Capture live state of the smart predictor
    const liveSmartPrefix = {
      main: p3Before.prediction || "—",
      alt: p3Before.alt || safeCandidates(p3Before)[1]?.value || null,
    };

    newLogsToAdd.push({
      ts: nowTs,
      kind: "3",
      prediction: liveSmartPrefix.main,
      confidence: p3Before.confidence || 0,
      alt: liveSmartPrefix.alt,
      mode: p3Before.mode || "—",
      actual: actual3,
      ctx: rolls3Before.slice(-8),
      candidates: safeCandidates(p3Before),
      smartPrefix: liveSmartPrefix, // Store live state of the smart predictor
    });

    // 🔥 FIXED: Use the prediction that was SHOWING (p2Before), not a new one
    if (p2Before && p2Before.prediction && p2Before.prediction !== "—" &&
        !String(p2Before.prediction).toLowerCase().startsWith("insufficient")) {
      newLogsToAdd.push({
        ts: nowTs + 0.1, // Slight offset
        kind: "2",
        prediction: p2Before.prediction,
        confidence: p2Before.confidence || 0,
        baseConfidence: p2Before.baseConfidence || p2Before.confidence || 0,
        alt: p2Before.alt || null,
        mode: p2Before.mode || "—",
        actual: actual2,
        ctx: [...rolls2Before].reverse(), // 🔥 CHANGED: Reverse back to chronological order (oldest→newest)
        candidates: safeCandidates(p2Before),
        source: "live", // Mark as live for accuracy tracking
        // 🔥 Enhanced BBP data
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
    setRollInput("");
  }
  // 🔬 Long String sandbox → stream to debug (supports both 2-str and 3-str)
  function handleLongStringToDebug(newRolls = [], targetStream = "2-str") {
    if (!newRolls.length) return;

    const is3Str = targetStream === "3-str";

    // 🔥 FIX: Don't send ALL rolls, only send the LAST roll as a single prediction
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
      p.prediction !== "—" &&
      !String(p.prediction).toLowerCase().startsWith("insufficient")
    ) {
      const newLog = {
        ts: baseTs,
        kind: is3Str ? "3" : "2",
        prediction: p.prediction,
        confidence: p.confidence || 0,
        alt,
        mode: p.mode || "—",
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

  // 🔥 CSV Export Handler
  function handleExportCSV() {
    const allEntries = [];

    // Helper functions
    function translateTo4(str = "") {
      if (!str) return "";
      const digits = str.split("").map((d) => Number(d));
      if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) return "";
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

  // 🔥 NEW: Clear debug logs handler
  function handleClearDebugLogs() {
    setDebugLogs([]);
  }

  // Import debug logs from a file (Backtest tab)
  function handleImportDebugLogs(newLogs) {
    // Put imported logs on top, keep at most 200
    setDebugLogs((old) => [...newLogs, ...old].slice(0, 200));
  }

  const freq2 = buildPrefixFreq(entries, 2, { translateAll: true });
  const freq3 = buildPrefixFreq(entries, 3, { translateAll: true });
  const freq4 = buildPrefixFreq(entries, 4, { translateAll: true });
  const freq5 = buildPrefixFreq(entries, 5, { translateAll: true });

  const rolls2 = entries
    .map((e) => (e.translated || "").slice(0, 2))
    .filter(Boolean)
    .reverse();

  const rolls3 = entries
    .map((e) => (e.s3 || "").replace(/0+$/, ""))
    .filter((r) => r.length === 3)
    .reverse();

  const rolls4 = entries
    .map((e) => (e.s4 || "").replace(/0+$/, ""))
    .filter((r) => r.length >= 4)
    .reverse();

  // 🔥 UPDATED: Use BBP mode for live prediction display
  const livePrediction = rolls2.length >= 6 ? predictNext2BBPMode(rolls2) : { prediction: "—", confidence: 0 };

  const livePrediction3 = predictNext3(rolls3);
  const livePrediction4 = predictNext4(rolls4);

  // Calculate session accuracy for header
  const sessionAccuracy = debugLogs.length > 0
    ? Math.round(
        (debugLogs.filter((log) => {
          const pred = String(log.prediction);
          const actual = String(log.actual);
          return pred === actual || pred === actual.slice(0, pred.length);
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
      <Routes>
        {/* Wrap all routes with Layout for navigation */}
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
          />
        }>
          <Route
            path="/"
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
            element={<ModernLongStringPage />}
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
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
