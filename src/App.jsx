// src/App.jsx - REPLACE YOUR EXISTING FILE
import React, { useEffect, useState, useRef } from "react";

import LeftColumn from "./components/LeftColumn";
import RollInputCard from "./components/RollInputCard";
import SessionTable from "./components/SessionTable";
import FrequencyPanel from "./components/FrequencyPanel";
import NotesCard from "./components/NotesCard";
import Footer from "./components/Footer";
import StatsPanel from "./components/StatsPanel";
import TopBar from "./components/TopBar";
import DebugPanel from "./components/DebugPanel";
import AccuracyPanel from "./components/AccuracyPanel"; // 🔥 NEW

import {
  translateTo4,
  splitString,
  buildPrefixFreq,
  sanitizeRollInput,
} from "./utils/stringHelpers";
import {
  predictNext,
  predictNext3,
  predictNext4,
  resetSessionStats,
} from "./utils/predictNext";
import RelicPositionCard from "./components/RelicPositionCard";

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
  const timerRef = useRef(null);
  const longStringCtxRef = useRef([]);
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
  }, [entries, prevSessions, region, patch, notes, caesarInput, debugLogs]);

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
    if (!clean) {
      setRollInput("");
      return;
    }

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

    newLogsToAdd.push({
      ts: nowTs,
      kind: "2",
      prediction: p2.prediction || "—",
      confidence: p2.confidence || 0,
      alt: p2.alt || safeCandidates(p2)[1]?.value || null,
      mode: p2.mode || "—",
      actual: actual2,
      ctx: rolls2.slice(-8),
      candidates: safeCandidates(p2),
    });

    if (actual3.length === 3 && rolls3.length) {
      newLogsToAdd.push({
        ts: nowTs,
        kind: "3",
        prediction: p3.prediction || "—",
        confidence: p3.confidence || 0,
        alt: p3.alt || safeCandidates(p3)[1]?.value || null,
        mode: p3.mode || "—",
        actual: actual3,
        ctx: rolls3.slice(-8),
        candidates: safeCandidates(p3),
      });
    }

    if (actual4.length === 4 && rolls4.length) {
      newLogsToAdd.push({
        ts: nowTs,
        kind: "4",
        prediction: p4.prediction || "—",
        confidence: p4.confidence || 0,
        alt: p4.alt || safeCandidates(p4)[1]?.value || null,
        mode: p4.mode || "—",
        actual: actual4,
        ctx: rolls4.slice(-8),
        candidates: safeCandidates(p4),
      });
    }

    setEntries((prev) => {
      const newEntry = {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        raw: clean,
        translated,
        time: nowIso,
        s2,
        s3,
        s4,
        s5,
        region,
        patch,
      };
      return [newEntry, ...prev];
    });

    setDebugLogs((old) => [...newLogsToAdd, ...old].slice(0, 200));
    setRollInput("");
  }
  // 🔬 Long String sandbox → 2-str debug only (does NOT touch Current Session)
  // 🔬 Long String sandbox → stream to 2-str debug (does NOT touch Current Session)
  function handleLongStringToDebug(newRolls = []) {
    if (!newRolls.length) return;

    // Use the same newest-first context style as live logs
    let ctx2 = [...longStringCtxRef.current];

    // If this is the first time we stream a long string, start from a clean session
    if (ctx2.length === 0) {
      resetSessionStats();
    }

    const baseTs = Date.now();

    const safeCandidates = (p) =>
      Array.isArray(p?.candidates) ? p.candidates : [];

    const logsToAdd = [];

    newRolls.forEach((raw, idx) => {
      const actual2 = String(raw).slice(0, 2);
      if (actual2.length !== 2) return;

      // Context the predictor “sees” BEFORE this roll
      const predictorCtx = [...ctx2];

      const p = predictNext(predictorCtx);
      const candidates = safeCandidates(p);
      const alt = p.alt || (candidates[1]?.value ?? null);

      // Only log real predictions (skip “insufficient data” / empty)
      if (
        p.prediction &&
        p.prediction !== "—" &&
        !String(p.prediction).toLowerCase().startsWith("insufficient")
      ) {
        logsToAdd.push({
          ts: baseTs + idx,
          kind: "2",
          prediction: p.prediction,
          confidence: p.confidence || 0,
          alt,
          mode: p.mode || "—",
          actual: actual2,
          // newest-first context snippet (like live)
          ctx: predictorCtx.slice(0, 8),
          candidates,
          source: "longString",
        });
      }

      // After we “observe” this roll, add it to context
      ctx2.unshift(actual2);
    });

    // Save updated context for the next keystrokes in the lab
    longStringCtxRef.current = ctx2;

    // Prepend new long-string logs; keep everything else (live + imports)
    if (logsToAdd.length) {
      setDebugLogs((prev) => [...logsToAdd, ...prev].slice(0, 300));
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

  const livePrediction = predictNext(rolls2);
  const livePrediction3 = predictNext3(rolls3);
  const livePrediction4 = predictNext4(rolls4);

  return (
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
        />

        {/* middle */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          <RollInputCard
            rollInput={rollInput}
            setRollInput={setRollInput}
            onAdd={handleAddRoll}
            entriesCount={entries.length}
            onSendLongStringToDebug={handleLongStringToDebug}
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
          />
        </div>

        {/* right */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* 🔥 NEW: Accuracy Panel */}
          <AccuracyPanel debugLogs={debugLogs} />

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
          <RelicPositionCard />
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-6">
        <Footer />
      </div>
    </div>
  );
}
