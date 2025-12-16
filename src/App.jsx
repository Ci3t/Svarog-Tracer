// src/App.jsx - REPLACE YOUR EXISTING FILE
import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { predictNext2Smart } from "./utils/enhanced-2str-predictor";

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
import RegionHeatmap from "./components/RegionHeatmap";

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
  const [patch, setPatch] = useState("3.7");

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

    let ctx3 = kiyoCtxRef.current || [];
    const contextRolls = newRolls.slice(0, -1);
    const lastRoll = newRolls[newRolls.length - 1];

    if (contextRolls.length < 3) {
      return;
    }

    const actual3 = String(lastRoll).slice(0, 3);
    if (actual3.length !== 3) return;

    const p = predictNext3(contextRolls);
    const candidates = Array.isArray(p?.candidates) ? p.candidates : [];
    const alt = p.alt || (candidates[1]?.value ?? null);

    if (
      p.prediction &&
      p.prediction !== "—" &&
      !String(p.prediction).toLowerCase().startsWith("insufficient")
    ) {
      const newLog = {
        ts: Date.now(),
        kind: "3",
        prediction: p.prediction,
        confidence: p.confidence || 0,
        alt,
        mode: p.mode || "—",
        actual: actual3,
        ctx: contextRolls.slice(-8),
        candidates,
        source: "kiyo",
        waveData: null, // Will be filled by handleKiyoDebugData
        // 🔥 NEW: Capture the live prefix that was showing BEFORE this roll
        livePrefix: livePrefixPredictionRef.current
          ? { ...livePrefixPredictionRef.current }
          : null,
      };

      setDebugLogs((prev) => [newLog, ...prev].slice(0, 300));
    }

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
      setPrevSessions((prev) => [
        {
          id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          startedAt: new Date().toISOString(),
          region,
          patch,
          entries,
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

  /* ========= ADD ROLL ========= */
  function handleAddRoll() {
    const value = rollInput.trim();
    if (!value) return;

    const clean = sanitizeRollInput(value);
    if (!clean) return;

    const { s2, s3, s4, s5 } = splitString(clean);
    const nowIso = new Date().toISOString();
    const translated = translateTo4(clean);

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
      .filter((r) => r.length === 4)
      .reverse();

    const p2 = predictNext(rolls2);
    const p3 = predictNext3(rolls3);
    const p4 = predictNext4(rolls4);

    const actual2 = translated.slice(0, 2);
    const actual3 = translated.slice(0, 3);
    const actual4 = translated.slice(0, 4);

    const nowTs = Date.now();
    const safeCandidates = (p) =>
      Array.isArray(p?.candidates) ? p.candidates : [];

    const newLogsToAdd = [];

    // Capture live state of the smart predictor
    const liveSmartPrefix = {
      main: p3.prediction || "—",
      alt: p3.alt || safeCandidates(p3)[1]?.value || null,
    };

    newLogsToAdd.push({
      ts: nowTs,
      kind: "3",
      prediction: liveSmartPrefix.main,
      confidence: p3.confidence || 0,
      alt: liveSmartPrefix.alt,
      mode: p3.mode || "—",
      actual: actual3,
      ctx: rolls3.slice(-8),
      candidates: safeCandidates(p3),
      smartPrefix: liveSmartPrefix, // Store live state of the smart predictor
    });

    setEntries((prev) => [...prev, { s2, s3, s4, s5, translated, ts: nowIso }]);
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
    .filter((r) => r.length === 4)
    .reverse();

  const livePrediction = predictNext2Smart(rolls2, { region });

  const livePrediction3 = predictNext3(rolls3);
  const livePrediction4 = predictNext4(rolls4);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <TopBar
          region={region}
          setRegion={setRegion}
          patch={patch}
          setPatch={setPatch}
          isCustomPatch={isCustomPatch}
          setIsCustomPatch={setIsCustomPatch}
          entries={entries}
          prevSessions={prevSessions}
        />

        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 xl:grid xl:grid-cols-12 xl:gap-6">
          {/* left column */}
          <LeftColumn
            secondsLeft={secondsLeft}
            onStart={handleStartSession}
            suggestTab={suggestTab}
            setSuggestTab={setSuggestTab}
            caesarInput={caesarInput}
            setCaesarInput={setCaesarInput}
            entries={entries}
            disableNextPrediction={suggestTab === "kiyo"}
          />

          {/* middle */}
          <div className="col-span-12 lg:col-span-6 space-y-6">
            <RollInputCard
              rollInput={rollInput}
              setRollInput={setRollInput}
              onAdd={handleAddRoll}
              entriesCount={entries.length}
              onSendLongStringToDebug={handleLongStringToDebug}
              entries={entries}
              debugLogs={debugLogs}
              onSendKiyoDebugData={handleKiyoDebugData}
              onSendToDebug={handleKiyoToDebug}
            />
            {/* 🔮 New Long String Lab */}

            <SessionTable
              sessionTab={sessionTab}
              setSessionTab={setSessionTab}
              entries={entries}
              prevSessions={prevSessions}
              onDeleteEntry={handleDeleteEntry}
              onDeleteSession={handleDeleteSession}
            />

            <NotesCard
              notes={notes}
              setNotes={setNotes}
              region={region}
              patch={patch}
              entries={entries}
            />

            {/* 🔥 UPDATED: Pass onClearLogs */}
            <DebugPanel
              debugLogs={debugLogs}
              onClearLogs={handleClearDebugLogs}
              isDebugMode={isDebugMode}
              onImportLogs={handleImportDebugLogs}
              kiyoWaveData={kiyoDebugData}
              pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
            />
          </div>

          {/* right */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* 🔥 NEW: Accuracy Panel */}
            <AccuracyPanel debugLogs={debugLogs} />
            {livePrediction?.regionMatch && (
              <RegionHeatmap regionMatch={livePrediction.regionMatch} />
            )}
            <FrequencyPanel
              freqTab={freqTab}
              setFreqTab={setFreqTab}
              freq2={freq2}
              freq3={freq3}
              freq4={freq4}
              freq5={freq5}
            />
            <StatsPanel
              entries={entries}
              prediction2={livePrediction}
              prediction3={livePrediction3}
              prediction4={livePrediction4}
              currentRegion={region}
              currentPatch={patch}
            />
            {/* ✅ REGION MATCH HEATMAP (FROM 2-STR SMART) */}

            <RelicPositionCard />
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-6">
          <Footer />
        </div>
      </div>
    </Suspense>
  );
}
