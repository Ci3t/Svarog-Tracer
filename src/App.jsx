import React, { useEffect, useState, useRef } from "react";
import Header from "./components/Header";
import LeftColumn from "./components/LeftColumn";
import RollInputCard from "./components/RollInputCard";
import SessionTable from "./components/SessionTable";
import FrequencyPanel from "./components/FrequencyPanel";
import NotesCard from "./components/NotesCard";
import Footer from "./components/Footer";

import { predictNext } from "./utils/predictNext";
import {
  translateTo4,
  splitString,
  buildPrefixFreq,
  sanitizeRollInput,
} from "./utils/stringHelpers";
import StatsPanel from "./components/StatsPanel";
import TopBar from "./components/TopBar";
import NextPrediction from "./components/NextPrediction";

const STORAGE_KEY = "hsr-rng-session-v5";
const SESSION_SECONDS = 5 * 60;

export default function App() {
  const [entries, setEntries] = useState([]);
  const [prevSessions, setPrevSessions] = useState([]);
  const [rollInput, setRollInput] = useState("");
  const [region, setRegion] = useState("America");
  const [patch, setPatch] = useState("3.7");

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);

  const [freqTab, setFreqTab] = useState("2");
  const [sessionTab, setSessionTab] = useState("current");
  const [suggestTab, setSuggestTab] = useState("2");
  const [caesarInput, setCaesarInput] = useState("");
  const [notes, setNotes] = useState("");

  const [isCustomPatch, setIsCustomPatch] = useState(false);
  const timerRef = useRef(null);

  // load
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setEntries(parsed.entries || []);
        setPrevSessions(parsed.prevSessions || []);
        setRegion(parsed.region || "America");
        setPatch(parsed.patch || "3.7");
      } catch (err) {
        console.warn("storage error", err);
      }
    }
  }, []);

  // save
  useEffect(() => {
    const data = {
      entries,
      prevSessions,
      region,
      patch,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [entries, prevSessions, region, patch]);

  // timer
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

  // on 0 archive
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

  function handleAddRoll() {
    const value = rollInput.trim();
    if (!value) return;

    const clean = sanitizeRollInput(value);
    if (!clean) {
      setRollInput("");
      return;
    }

    const { s2, s3, s4, s5 } = splitString(clean);
    const now = new Date().toISOString();

    const newEntry = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      raw: clean,
      translated: translateTo4(clean),
      time: now,
      s2,
      s3,
      s4,
      s5,
      region,
      patch,
    };

    setEntries((prev) => [newEntry, ...prev]);
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

  // frequencies
  const freq2 = buildPrefixFreq(entries, 2, { translateAll: true });
  const freq3 = buildPrefixFreq(entries, 3, { translateAll: true });
  const freq4 = buildPrefixFreq(entries, 4, { translateAll: true });
  const freq5 = buildPrefixFreq(entries, 5, { translateAll: true });

  // rolls for predictor (sorted ascending by time)
  const rollsForPrediction = [...entries]
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .map((e) => (e.translated || "").slice(0, 2))
    .filter(Boolean);

  const recentRolls =
    rollsForPrediction.length > 8
      ? rollsForPrediction.slice(-8)
      : rollsForPrediction;

  const prediction = predictNext(recentRolls);

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
        <LeftColumn
          secondsLeft={secondsLeft}
          onStart={handleStartSession}
          prediction={prediction}
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

          {/* notes under session */}
          <NotesCard
            notes={notes}
            setNotes={setNotes}
            prediction={prediction}
            region={region}
            patch={patch}
            entries={entries}
          />
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

          <div className="col-span-12 lg:col-span-3 space-y-6">
            <StatsPanel
              entries={entries}
              prediction={prediction}
              currentRegion={region}
              currentPatch={patch}
            />
            {/* you can keep the info card after that if you still want it */}
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6">
        <Footer />
      </div>
    </div>
  );
}
