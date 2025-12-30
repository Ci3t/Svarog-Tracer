// src/utils/backtester.js — Updated to use current BBP mode predictor
import { predictNext2BBPMode } from "./bbp-mode-2str.js";

export function runBacktest(debugLogs) {
  // 🔥 FIXED: Include ALL 2-str with prediction !== '—' / null / insufficient
  const validLogs = debugLogs.filter(
    (log) =>
      log.kind === "2" &&
      log.prediction &&
      log.prediction !== "—" &&
      log.prediction !== null &&
      !String(log.prediction).startsWith("insufficient")
  );

  console.log(`🔍 Found ${validLogs.length} valid 2-str logs`); // DEBUG

  // Group sessions (5+ min gap = new session)
  const sessions = [];
  let currentSession = [];
  validLogs.forEach((log, i) => {
    if (i === 0) {
      currentSession.push(log);
      return;
    }
    const prevTime = new Date(validLogs[i - 1].ts);
    const thisTime = new Date(log.ts);
    const gapMin = (thisTime - prevTime) / (1000 * 60);
    if (gapMin > 5) {
      sessions.push([...currentSession]);
      currentSession = [log];
    } else {
      currentSession.push(log);
    }
  });
  if (currentSession.length) sessions.push(currentSession);

  // Test each
  const sessionResults = sessions.map((sessionLogs, idx) => {
    let mainHits = 0,
      top2Hits = 0,
      totalValidPreds = 0;
    const details = [];

    sessionLogs.forEach((log) => {
      const rolls = log.ctx || []; // Already 2-str ["41","42",...] in chronological order (oldest→newest)
      const actualStr = String(log.actual);

      if (rolls.length < 6) {
        // Skip if not enough context for BBP mode
        details.push({ rolls: rolls.slice(-8), skip: true, actual: actualStr });
        return;
      }

      // 🔥 CRITICAL FIX: Reverse context to match live session order (newest→oldest)
      // Live session passes rolls2.reverse() to BBP predictor
      // Debug logs store ctx in chronological order, so we must reverse it here
      const reversedRolls = [...rolls].reverse();
      
      // 🔥 USE CURRENT BBP MODE PREDICTOR (same as live session)
      const pred = predictNext2BBPMode(reversedRolls);
      const predStr = String(pred.prediction);
      const altStr = pred.alt ? String(pred.alt) : null;

      const hitMain = predStr === actualStr;
      const hitAlt = !hitMain && altStr === actualStr;
      const hitTop2 = hitMain || hitAlt;

      details.push({
        rolls: rolls.slice(-8),
        pred: predStr,
        alt: altStr,
        actual: actualStr,
        hitMain,
        hitAlt,
        hitTop2,
        conf: Math.round(pred.confidence * 100),
        mode: pred.mode,
        log: log, // Include original log for advanced analysis
      });

      // 🔥 FIXED: Count ONLY if predictor gave prediction (not insufficient)
      if (pred.prediction) {
        totalValidPreds++;
        if (hitMain) mainHits++;
        if (hitTop2) top2Hits++;
      }
    });

    const top1Pct = totalValidPreds
      ? Math.round((mainHits / totalValidPreds) * 100)
      : 0;
    const top2Pct = totalValidPreds
      ? Math.round((top2Hits / totalValidPreds) * 100)
      : 0;

    return {
      session: idx + 1,
      tests: sessionLogs.length, // All logs attempted
      valid: totalValidPreds, // Predictor fired
      mainHits, // 🔥 NEW: Raw count (your "6 mains")
      top1Pct,
      top2Pct,
      details,
    };
  });

  // Overall
  const allValid = sessionResults.reduce((sum, s) => sum + s.valid, 0);
  const overallMainHits = sessionResults.reduce(
    (sum, s) => sum + s.mainHits,
    0
  );
  const overallTop1 = allValid
    ? Math.round((overallMainHits / allValid) * 100)
    : 0;
  const overallTop2 = Math.round(
    (sessionResults.reduce((sum, s) => sum + (s.top2Pct * s.valid) / 100, 0) /
      Math.max(allValid, 1)) *
      100
  );

  return {
    sessions: sessionResults,
    overall: {
      top1Pct: overallTop1,
      top2Pct: overallTop2,
      totalValid: allValid,
      totalMainHits: overallMainHits, // 🔥 For your "6 mains" check
    },
  };
}
