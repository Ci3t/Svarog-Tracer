// src/utils/backtester.js — Parses debugLogs → runs predictNext → accuracy table
import { predictNext } from "./predictNext.js";

export function runBacktest(debugLogs) {
  // Filter valid 2-str predictions (exclude insufficient-data)
  const validLogs = debugLogs.filter(
    (log) =>
      log.kind === "2" &&
      log.prediction &&
      log.prediction !== "—" &&
      log.prediction !== null &&
      !log.mode.startsWith("insufficient")
  );

  // 🔥 Simple: treat this import as a single session
  const sessions = [validLogs];

  // Test each session
  const sessionResults = sessions.map((sessionLogs, idx) => {
    const testCases = sessionLogs.map((log) => ({
      rolls: log.ctx || [], // Historical context
      actual: log.actual,
      originalPred: log.prediction,
      originalAlt: log.alt,
      originalMode: log.mode,
    }));

    let mainHits = 0,
      top2Hits = 0,
      total = 0;
    const details = testCases.map((tc) => {
      if (tc.rolls.length < 5) return { skip: true }; // Too short

      const pred = predictNext(tc.rolls);
      const hitMain = pred.prediction === tc.actual;
      const hitAlt = !hitMain && pred.alt === tc.actual;
      const hitTop2 = hitMain || hitAlt;

      if (pred.prediction) {
        total++;
        if (hitMain) mainHits++;
        if (hitTop2) top2Hits++;
      }

      return {
        rolls: tc.rolls.slice(-8), // Last 8 for display
        pred: pred.prediction,
        alt: pred.alt,
        actual: tc.actual,
        hitMain,
        hitAlt,
        hitTop2,
        conf: Math.round(pred.confidence * 100),
        mode: pred.mode,
      };
    });

    return {
      session: idx + 1,
      tests: testCases.length,
      valid: total,
      top1Pct: total ? Math.round((mainHits / total) * 100) : 0,
      top2Pct: total ? Math.round((top2Hits / total) * 100) : 0,
      details,
    };
  });

  // Overall
  const allValid = sessionResults.reduce((sum, s) => sum + s.valid, 0);
  const overallTop1 = Math.round(
    (sessionResults.reduce((sum, s) => sum + (s.top1Pct * s.valid) / 100, 0) /
      (allValid || 1)) *
      100
  );
  const overallTop2 = Math.round(
    (sessionResults.reduce((sum, s) => sum + (s.top2Pct * s.valid) / 100, 0) /
      (allValid || 1)) *
      100
  );

  return {
    sessions: sessionResults,
    overall: {
      top1Pct: overallTop1,
      top2Pct: overallTop2,
      totalValid: allValid,
    },
  };
}
