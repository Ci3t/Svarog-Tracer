import React, { useEffect, useState, useRef } from "react";
import { predictNext } from "./utils/predictNext";

const STORAGE_KEY = "hsr-rng-session-v4";
const SESSION_SECONDS = 5 * 60;

// 2-digit special equivalence (from your image)
const TWO_EQUIV = {
  41: "41",
  34: "41",
  23: "41",
  12: "41",

  42: "42",
  31: "42",
  24: "42",
  13: "42",

  43: "43",
  32: "43",
  21: "43",
  14: "43",

  44: "44",
  33: "44",
  22: "44",
  11: "44",
};

// general “translate whole string so it starts with 4”
function translateTo4(str = "") {
  if (!str) return "";
  const digits = str.split("").map((d) => parseInt(d, 10));
  if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) {
    // unknown format, just return original
    return str;
  }
  const first = digits[0];
  // how much to add to make first digit = 4 (mod 4)
  // digits are 1..4 so convert to 0..3 first
  const shift = (4 - first + 4) % 4; // 0..3
  const translated = digits.map((d) => {
    const zero = d - 1;
    const shifted = (zero + shift) % 4;
    return (shifted + 1).toString();
  });
  return translated.join("");
}

// split "42341"
function splitString(str) {
  const clean = (str || "").trim();
  return {
    s2: clean.length >= 2 ? clean.slice(0, 2) : "",
    s3: clean.length >= 3 ? clean.slice(0, 3) : "",
    s4: clean.length >= 4 ? clean.slice(0, 4) : "",
    s5: clean.length >= 5 ? clean.slice(0, 5) : "",
  };
}

// generic freq
function buildPrefixFreq(
  entries,
  len = 2,
  { translateAll = false, twoDigitMap = false } = {}
) {
  const counts = {};
  entries.forEach((row) => {
    let key =
      len === 2 ? row.s2 : len === 3 ? row.s3 : len === 4 ? row.s4 : row.s5;
    if (!key) return;

    // translate
    if (translateAll) {
      key = translateTo4(key);
    } else if (twoDigitMap) {
      key = TWO_EQUIV[key] || key;
    }

    counts[key] = (counts[key] || 0) + 1;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return Object.entries(counts)
    .map(([pattern, count]) => ({
      pattern,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [prevSessions, setPrevSessions] = useState([]);
  const [rollInput, setRollInput] = useState("");
  const [region, setRegion] = useState("America");
  const [patch, setPatch] = useState("3.7");

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);

  const [freqTab, setFreqTab] = useState("2"); // "2" | "3" | "4"
  const [sessionTab, setSessionTab] = useState("current"); // "current" | "previous"
  const [suggestTab, setSuggestTab] = useState("2"); // suggestion tab (we still keep it for UI)
  const [caesarInput, setCaesarInput] = useState("");
  const [notes, setNotes] = useState("");

  const timerRef = useRef(null);

  // load LS
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

  // save LS
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

  // on 0 -> archive
  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
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
      }
      setEntries([]);
      setSecondsLeft(SESSION_SECONDS);
    }
  }, [secondsLeft, timerRunning, entries, region, patch]);

  const handleStartSession = () => {
    // archive existing
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
    setSecondsLeft(SESSION_SECONDS);
    setTimerRunning(true);
  };

  const handleAddRoll = () => {
    const value = rollInput.trim();
    if (!value) return;
    const { s2, s3, s4, s5 } = splitString(value);
    const now = new Date().toISOString();
    const newEntry = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      raw: value,
      translated: translateTo4(value), // now we store the translated version too
      time: now,
      s2,
      s3,
      s4,
      s5,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setRollInput("");
  };

  const handleDeleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // build frequencies for the panels
  const freq2 = buildPrefixFreq(entries, 2, { twoDigitMap: true });
  const freq3 = buildPrefixFreq(entries, 3, { translateAll: true });
  const freq4 = buildPrefixFreq(entries, 4, { translateAll: true });

  // build rolls for predictor (ordered by time, translated, 2-digit)
  // keep only rolls from the last 90 seconds for prediction
  const now = Date.now();
  const freshEntries = entries.filter((e) => {
    const t = new Date(e.time).getTime();
    return now - t < 90 * 1000; // 90s
  });

  // if user is slow and there are no fresh entries, fall back to all
  const sourceEntries = freshEntries.length > 0 ? freshEntries : entries;

  const rollsForPrediction = [...sourceEntries]
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .map((e) => (e.translated || "").slice(0, 2))
    .filter(Boolean);

  // let the predictor see up to 10 recent rolls
  const recentRolls =
    rollsForPrediction.length > 10
      ? rollsForPrediction.slice(-10)
      : rollsForPrediction;

  const prediction = predictNext(recentRolls);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const timerIsEnding = timerRunning && secondsLeft <= 30;

  const manualCaesarResult =
    caesarInput.trim().length >= 1 ? translateTo4(caesarInput.trim()) : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* sidebar */}
      <aside className="w-72 border-r border-slate-800 p-4 flex flex-col gap-4 bg-slate-900/40">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
          HSR RNG Live
        </h1>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          >
            <option>America</option>
            <option>EU</option>
            <option>ASIA</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Patch</label>
          <input
            value={patch}
            onChange={(e) => setPatch(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
            Session timer
          </p>
          <div
            className={`text-3xl font-mono ${
              timerIsEnding ? "text-red-400" : "text-slate-100"
            }`}
          >
            {mm}:{ss}
          </div>
          <p className="text-xs text-slate-500">
            pattern changes every 5m — record fresh rolls
          </p>
          <button
            onClick={handleStartSession}
            className="mt-2 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 transition"
          >
            Start 5m session
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800 text-xs text-slate-500">
          Data is stored locally in your browser.
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 p-6 flex flex-col gap-6">
        {/* input card */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            Live roll input
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              current session ({region})
            </span>
          </h2>
          <div className="flex gap-3">
            <input
              value={rollInput}
              onChange={(e) => setRollInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRoll()}
              placeholder="e.g. 42, 234, 3441"
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            />
            <button
              onClick={handleAddRoll}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-medium text-sm hover:bg-emerald-400 transition"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            We auto-split and auto-translate to 4xxx for pattern matching.
          </p>
        </div>

        {/* layout: left = sessions, right = analysis */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* left: sessions with tabs */}
          <div className="xl:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-slate-950/30 rounded-lg p-1">
                <button
                  onClick={() => setSessionTab("current")}
                  className={`px-3 py-1 rounded-md text-xs ${
                    sessionTab === "current"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Current session
                </button>
                <button
                  onClick={() => setSessionTab("previous")}
                  className={`px-3 py-1 rounded-md text-xs ${
                    sessionTab === "previous"
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300"
                  }`}
                >
                  Previous sessions
                </button>
              </div>
              {sessionTab === "current" && (
                <span className="text-xs text-slate-500">
                  {entries.length} rows
                </span>
              )}
            </div>

            {sessionTab === "current" ? (
              <div className="overflow-auto max-h-[360px]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/40 sticky top-0">
                    <tr className="text-left text-xs text-slate-400">
                      <th className="py-2 pr-3">Raw</th>
                      <th className="py-2 pr-3">Translated</th>
                      <th className="py-2 pr-3">2-str</th>
                      <th className="py-2 pr-3">3-str</th>
                      <th className="py-2 pr-3">4-str</th>
                      <th className="py-2 pr-3">Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-800/40">
                        <td className="py-1.5 pr-3 font-mono">{e.raw}</td>
                        <td className="py-1.5 pr-3 font-mono text-slate-200">
                          {e.translated}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-slate-300">
                          {e.s2}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-slate-400">
                          {e.s3}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-slate-500">
                          {e.s4}
                        </td>
                        <td className="py-1.5 pr-3 text-xs text-slate-500">
                          {new Date(e.time).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 pr-3 text-right">
                          <button
                            onClick={() => handleDeleteEntry(e.id)}
                            className="text-xs text-slate-400 hover:text-red-400"
                          >
                            delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {entries.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-4 text-center text-slate-500 text-sm"
                        >
                          No rolls yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {prevSessions.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No previous sessions recorded.
                  </p>
                )}
                {prevSessions.map((sess, idx) => (
                  <details
                    key={sess.id}
                    className="bg-slate-950/30 border border-slate-800 rounded-lg"
                  >
                    <summary className="px-3 py-2 text-sm cursor-pointer flex items-center justify-between">
                      <span>
                        5m Session #{prevSessions.length - idx} •{" "}
                        {new Date(sess.startedAt).toLocaleTimeString()} •{" "}
                        {sess.region}
                      </span>
                      <span className="text-xs text-slate-500">
                        {sess.entries.length} rows
                      </span>
                    </summary>
                    <div className="px-3 py-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-1 pr-2">Raw</th>
                            <th className="text-left py-1 pr-2">2-str</th>
                            <th className="text-left py-1 pr-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sess.entries.map((e) => (
                            <tr key={e.id}>
                              <td className="py-1 pr-2 font-mono">{e.raw}</td>
                              <td className="py-1 pr-2 font-mono">{e.s2}</td>
                              <td className="py-1 pr-2 text-slate-500">
                                {new Date(e.time).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          {/* right: suggestions + frequency + caesar */}
          <div className="space-y-6">
            {/* suggestion (now using predictor) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">
                  Next line suggestion
                </h2>
                {/* keep your little tabs if you want, but prediction uses smart util now */}
                <div className="flex gap-1 bg-slate-950/30 rounded-lg p-1">
                  <button
                    onClick={() => setSuggestTab("2")}
                    className={`px-3 py-1 rounded-md text-[10px] ${
                      suggestTab === "2"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    2-str
                  </button>
                  <button
                    onClick={() => setSuggestTab("3")}
                    className={`px-3 py-1 rounded-md text-[10px] ${
                      suggestTab === "3"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    3-str
                  </button>
                  <button
                    onClick={() => setSuggestTab("4")}
                    className={`px-3 py-1 rounded-md text-[10px] ${
                      suggestTab === "4"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    4-str
                  </button>
                </div>
              </div>
              {prediction && prediction.prediction ? (
                <>
                  <p className="text-sm text-slate-200">
                    Next:{" "}
                    <span className="font-mono text-emerald-400">
                      {prediction.prediction}
                    </span>{" "}
                    ({Math.round((prediction.confidence || 0) * 100)}%)
                  </p>

                  {prediction.candidates &&
                    prediction.candidates.length > 1 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Also possible:{" "}
                        {prediction.candidates
                          .slice(1)
                          .map((c) => `${c.value} (${c.pct}%)`)
                          .join(" | ")}
                      </p>
                    )}

                  <p className="text-[10px] text-slate-500 mt-2">
                    Mode: {prediction.mode}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Based on current 5m sequence order (Unity-style).
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Add a few rolls to see prediction.
                </p>
              )}
            </div>

            {/* Caesar helper */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-base font-semibold mb-3">Caesar shift</h2>
              <div className="flex gap-2">
                <input
                  value={caesarInput}
                  onChange={(e) => setCaesarInput(e.target.value)}
                  placeholder="e.g. 234"
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                />
                <div className="min-w-[4rem] flex items-center justify-center text-sm font-mono">
                  {manualCaesarResult}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                We shift the whole string so the first digit becomes 4 (mod 4).
              </p>
            </div>

            {/* Notes + Copy */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <h2 className="text-base font-semibold mb-3">Test Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write observations here (e.g. predicted 44 but hit 41)..."
                className="w-full h-24 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    const summary = `
🧠 HSR RNG Test Notes
Region: ${region}
Patch: ${patch}

Prediction: ${prediction?.prediction || "—"}
Alt: ${prediction?.alt || "—"}
Mode: ${prediction?.mode || "—"}

Recent Rolls: ${entries
                      .slice(0, 6)
                      .map((e) => e.translated)
                      .join(", ")}

Notes:
${notes || "(none)"}
`;
                    navigator.clipboard.writeText(summary);
                  }}
                  className="px-3 py-1 rounded-md bg-emerald-500 text-slate-950 text-xs hover:bg-emerald-400"
                >
                  Copy Notes
                </button>
                <button
                  onClick={() => setNotes("")}
                  className="px-3 py-1 rounded-md bg-slate-700 text-slate-200 text-xs hover:bg-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* frequency */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold">String frequency</h2>
                <div className="flex gap-1 bg-slate-950/30 rounded-lg p-1">
                  <button
                    onClick={() => setFreqTab("2")}
                    className={`px-3 py-1 rounded-md text-xs ${
                      freqTab === "2"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    2-str
                  </button>
                  <button
                    onClick={() => setFreqTab("3")}
                    className={`px-3 py-1 rounded-md text-xs ${
                      freqTab === "3"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    3-str
                  </button>
                  <button
                    onClick={() => setFreqTab("4")}
                    className={`px-3 py-1 rounded-md text-xs ${
                      freqTab === "4"
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300"
                    }`}
                  >
                    4-str
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                All strings are translated to 4xxx so you can spot the real
                pattern.
              </p>

              <div className="space-y-2 max-h-[200px] overflow-auto">
                {(freqTab === "2" ? freq2 : freqTab === "3" ? freq3 : freq4)
                  .length === 0 && (
                  <p className="text-sm text-slate-600">Record a few rolls.</p>
                )}

                {(freqTab === "2"
                  ? freq2
                  : freqTab === "3"
                  ? freq3
                  : freq4
                ).map((item) => (
                  <div key={item.pattern} className="flex items-center gap-3">
                    <div className="w-14 text-sm font-mono">{item.pattern}</div>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${item.pct}%` }}
                      ></div>
                    </div>
                    <div className="w-10 text-right text-xs text-slate-300">
                      {item.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
