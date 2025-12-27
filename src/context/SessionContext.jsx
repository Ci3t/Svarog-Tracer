// Session Context - Manages session state, timer, and roll handling
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { predictNext2BBPMode } from '../utils/bbp-mode-2str';
import { predictNext3BBPMode } from '../utils/bbp-mode-3str';
import { predictNext4 } from '../utils/enhanced-4str-predictor';
import { analyzeTablePattern } from '../utils/bbp-mode-2str';

const STORAGE_KEY = "hsr-rng-session-v6";
const SESSION_SECONDS = 5 * 60;
const INACTIVITY_MS = 6 * 60 * 60 * 1000; // 6 hours

const SessionContext = createContext();

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

export function SessionProvider({ children, onDebugLog }) {
  // Session State
  const [entries, setEntries] = useState([]);
  const [prevSessions, setPrevSessions] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [notes, setNotes] = useState("");
  
  // Refs
  const timerRef = useRef(null);
  const pendingKiyoSnapshotsRef = useRef([]);
  const lastSnapshotKeyRef = useRef(null);
  const livePrefixPredictionRef = useRef(null);
  
  // Archive current session
  const archiveCurrentSession = useCallback(() => {
    if (entries.length > 0) {
      // 🔥 Calculate BBP Mode frequency distribution for this session
      const rollValues = entries
        .map(e => (e.translated || e.s2 || '').slice(0, 2))
        .filter(Boolean);
      
      let beastAnalysis = null;
      if (rollValues.length >= 6) {
        try {
          const tableResult = analyzeTablePattern(rollValues);
          beastAnalysis = {
            commons: tableResult.commons || [],
            noise: tableResult.noise || [],
            distribution: tableResult.distribution || {},
          };
        } catch (err) {
          console.warn('Beast analysis failed:', err);
        }
      }

      const newSession = {
        id: Date.now(),
        rolls: [...entries],
        endedAt: new Date().toISOString(),
        notes,
        beastAnalysis, // 🔥 NEW: Include BBP analysis
      };

      setPrevSessions((prev) => [newSession, ...prev].slice(0, 50));
      setEntries([]);
      setNotes("");
      setTimerRunning(false);

      // 🔥 NEW: Process any pending Kiyo snapshots
      if (pendingKiyoSnapshotsRef.current.length > 0 && onDebugLog) {
        pendingKiyoSnapshotsRef.current.forEach((snap) => {
          onDebugLog({
            ts: snap.t,
            kind: "kiyo-snapshot",
            waveC2: snap.waveC2,
            waveC3: snap.waveC3,
            prefixMain: snap.prefixMain,
            prefixAlt: snap.prefixAlt,
            tracerMain: snap.tracerMain,
            tracerAlt: snap.tracerAlt,
            source: "kiyo",
          });
        });
        pendingKiyoSnapshotsRef.current = [];
        lastSnapshotKeyRef.current = null;
      }
    }
  }, [entries, notes, onDebugLog]);

  // Start new session
  const handleStartSession = useCallback(() => {
    archiveCurrentSession();
    setSecondsLeft(SESSION_SECONDS);
    setTimerRunning(true);
  }, [archiveCurrentSession]);

  // Add roll to current session
  const handleAddRoll = useCallback((rollInput, region, patch, onDebugLog) => {
    if (!rollInput.trim()) return;

    const parts = rollInput
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    const newEntries = parts.map((raw) => {
      const translated = translateRoll(raw, region, patch);
      return {
        id: Date.now() + Math.random(),
        time: new Date().toISOString(),
        raw,
        translated,
        s2: translated?.slice(0, 2) || "",
        s3: translated?.slice(0, 3) || "",
        s4: translated || "",
      };
    });

    setEntries((prev) => {
      const updated = [...prev, ...newEntries];

      // 🔥 CRITICAL FIX: Capture the CURRENT live prediction BEFORE adding the roll
      const rolls2Before = prev
        .map((e) => (e.translated || "").slice(0, 2))
        .filter(Boolean)
        .reverse();

      // 🔥 CAPTURE: The predictions that were SHOWING before this roll
      const p2Before = rolls2Before.length >= 6 ? predictNext2BBPMode(rolls2Before) : null;

      // Now process each new entry for accuracy tracking
      newEntries.forEach((entry, idx) => {
        const actual2 = entry.s2;
        const actual3 = entry.s3;
        const actual4 = entry.s4;

        // Get rolls AFTER adding this entry (for next prediction)
        const rolls2 = updated
          .slice(0, prev.length + idx + 1)
          .map((e) => (e.translated || "").slice(0, 2))
          .filter(Boolean)
          .reverse();

        const rolls3 = updated
          .slice(0, prev.length + idx + 1)
          .map((e) => (e.translated || "").slice(0, 3))
          .filter(Boolean)
          .reverse();

        const rolls4 = updated
          .slice(0, prev.length + idx + 1)
          .map((e) => e.translated)
          .filter(Boolean)
          .reverse();

        // 🔥 Log the BEFORE prediction for 2-str
        if (p2Before && onDebugLog) {
          const safeCandidates = (p) =>
            Array.isArray(p.candidates)
              ? p.candidates.map((c) => ({ value: c.value, pct: c.pct }))
              : [];

          if (
            p2Before.prediction &&
            !String(p2Before.prediction).toLowerCase().startsWith("insufficient")
          ) {
            const newLog2 = {
              ts: Date.now() + idx + 0.5,
              kind: "2",
              prediction: p2Before.prediction,
              confidence: p2Before.confidence || 0,
              baseConfidence: p2Before.baseConfidence || p2Before.confidence || 0,
              alt: p2Before.alt || null,
              mode: p2Before.mode || "—",
              actual: actual2,
              ctx: rolls2Before.slice(-8),
              candidates: safeCandidates(p2Before),
              source: "live",
              pattern: p2Before.pattern,
              patternStrength: p2Before.patternStrength,
              patternSequence: p2Before.patternSequence,
              commons: p2Before.commons,
              noise: p2Before.noise,
              distribution: p2Before.distribution,
              waveFlipData: p2Before.waveFlipData,
              commonsStability: p2Before.commonsStability,
            };

            onDebugLog(newLog2);
          }
        }

        // Log 3-str and 4-str predictions (existing logic)
        if (rolls3.length >= 6 && onDebugLog) {
          const p3 = predictNext3BBPMode(rolls3);
          if (p3.prediction) {
            onDebugLog({
              ts: Date.now() + idx + 0.6,
              kind: "3",
              prediction: p3.prediction,
              confidence: p3.confidence || 0,
              alt: p3.alt || null,
              mode: p3.mode || "—",
              actual: actual3,
              ctx: rolls3.slice(-8),
              source: "live",
            });
          }
        }

        if (rolls4.length >= 6 && onDebugLog) {
          const p4 = predictNext4(rolls4);
          if (p4.pred) {
            onDebugLog({
              ts: Date.now() + idx + 0.7,
              kind: "4",
              prediction: p4.pred,
              confidence: p4.confidence || 0,
              alt: p4.alt || null,
              mode: "4-str",
              actual: actual4,
              ctx: rolls4.slice(-8),
              source: "live",
            });
          }
        }
      });

      return updated;
    });

    if (!timerRunning) {
      setTimerRunning(true);
    }
  }, [timerRunning, onDebugLog]);

  // Delete entry
  const handleDeleteEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Delete session
  const handleDeleteSession = useCallback((id) => {
    setPrevSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Timer effect
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

  // Auto-archive when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) {
      archiveCurrentSession();
      setSecondsLeft(SESSION_SECONDS);
    }
  }, [secondsLeft, timerRunning, archiveCurrentSession]);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const now = Date.now();
      const lastActive = parsed.savedAt || 0;

      if (lastActive && now - lastActive > INACTIVITY_MS) {
        console.log("[storage] session expired after 6h inactivity, clearing");
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      if (parsed.entries) setEntries(parsed.entries);
      if (parsed.prevSessions) setPrevSessions(parsed.prevSessions);
      if (parsed.notes) setNotes(parsed.notes);
    } catch (err) {
      console.warn("storage load error", err);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      const data = {
        entries,
        prevSessions,
        notes,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("storage save error", err);
    }
  }, [entries, prevSessions, notes]);

  const value = {
    // State
    entries,
    setEntries,
    prevSessions,
    setPrevSessions,
    secondsLeft,
    setSecondsLeft,
    timerRunning,
    setTimerRunning,
    notes,
    setNotes,
    
    // Refs
    pendingKiyoSnapshotsRef,
    lastSnapshotKeyRef,
    livePrefixPredictionRef,
    
    // Functions
    handleAddRoll,
    handleStartSession,
    handleDeleteEntry,
    handleDeleteSession,
    archiveCurrentSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// Helper function (copied from App.jsx)
function translateRoll(raw, region, patch) {
  // This will need to import the actual translation logic
  // For now, returning raw as placeholder
  return raw;
}
