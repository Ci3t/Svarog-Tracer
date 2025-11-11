// src/App.jsx
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

import {
  translateTo4,
  splitString,
  buildPrefixFreq,
  sanitizeRollInput,
} from "./utils/stringHelpers";
import { predictNext, predictNext3, predictNext4 } from "./utils/predictNext";

const STORAGE_KEY = "hsr-rng-session-v6";
const SESSION_SECONDS = 5 * 60;

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

  /* ========= LOAD ========= */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
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

  /* ========= ADD ROLL (with 2/3/4 debug) ========= */
  function handleAddRoll() {
    const value = rollInput.trim();
    if (!value) return;

    const clean = sanitizeRollInput(value);
    if (!clean) {
      setRollInput("");
      return;
    }

    // split into s2..s5 first
    const { s2, s3, s4, s5 } = splitString(clean);
    const nowIso = new Date().toISOString();
    const translated = translateTo4(clean);

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

    // we need the *new* list to run predictors on
    setEntries((prev) => {
      const newEntries = [newEntry, ...prev];

      // build ordered (oldest → newest) for predictors
      const ordered = [...newEntries].sort(
        (a, b) => new Date(a.time) - new Date(b.time)
      );

      // 2-str stream
      const rolls2 = ordered
        .map((e) => (e.translated || "").slice(0, 2))
        .filter(Boolean);

      // 3-str stream (remove padding zeros)
      const rolls3 = ordered
        .map((e) => (e.s3 || "").replace(/0+$/, ""))
        .filter((r) => r.length === 3);

      // 4-str stream
      const rolls4 = ordered
        .map((e) => (e.s4 || "").replace(/0+$/, ""))
        .filter((r) => r.length === 4);

      // run predictors
      const p2 = predictNext(rolls2);
      const p3 = predictNext3(rolls3);
      const p4 = predictNext4(rolls4);

      // actuals for logging (translated and sliced)
      const actual2 = translated.slice(0, 2);
      const actual3 = translated.slice(0, 3);
      const actual4 = translated.slice(0, 4);

      const nowTs = Date.now();
      const newLogs = [];

      // 2-str is always loggable
      newLogs.push({
        ts: nowTs,
        kind: "2",
        prediction: p2.prediction || "—",
        confidence: p2.confidence || 0,
        alt:
          p2.alt ||
          (p2.candidates && p2.candidates[1] ? p2.candidates[1].value : null),
        mode: p2.mode || "—",
        actual: actual2,
        ctx: rolls2.slice(-8),
      });

      // 3-str only if user roll actually produced 3 digits
      if (actual3.length === 3 && rolls3.length) {
        newLogs.push({
          ts: nowTs,
          kind: "3",
          prediction: p3.prediction || "—",
          confidence: p3.confidence || 0,
          alt:
            p3.alt ||
            (p3.candidates && p3.candidates[1] ? p3.candidates[1].value : null),
          mode: p3.mode || "—",
          actual: actual3,
          ctx: rolls3.slice(-8),
        });
      }

      // 4-str only if user roll actually produced 4 digits
      if (actual4.length === 4 && rolls4.length) {
        newLogs.push({
          ts: nowTs,
          kind: "4",
          prediction: p4.prediction || "—",
          confidence: p4.confidence || 0,
          alt:
            p4.alt ||
            (p4.candidates && p4.candidates[1] ? p4.candidates[1].value : null),
          mode: p4.mode || "—",
          actual: actual4,
          ctx: rolls4.slice(-8),
        });
      }

      setDebugLogs((old) => [...newLogs, ...old].slice(0, 200));

      return newEntries;
    });

    setRollInput("");
  }

  function handleDeleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleDeleteSession(id) {
    if (id === "ALL") {
      setPrevSessions([]);
    } else {
      setPrevSessions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  // frequencies for right panel
  const freq2 = buildPrefixFreq(entries, 2, { translateAll: true });
  const freq3 = buildPrefixFreq(entries, 3, { translateAll: true });
  const freq4 = buildPrefixFreq(entries, 4, { translateAll: true });
  const freq5 = buildPrefixFreq(entries, 5, { translateAll: true });

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

      <div className="max-w-[1800px] mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* left column with timer + prediction + caesar + modes */}
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
          />

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

          <DebugPanel debugLogs={debugLogs} />
        </div>

        {/* right */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
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
            currentRegion={region}
            currentPatch={patch}
          />
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6">
        <Footer />
      </div>
    </div>
  );
}
