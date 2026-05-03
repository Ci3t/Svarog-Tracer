# Feature: Live Session (Svarog Live Mode)

> Route: `/live`  
> Page: `src/pages/ModernLiveSessionPage.jsx`  
> Core utility: `src/utils/pairTransitionPredictor.js`

---

## What It Does

Live Session is the real-time relic manipulation decision board. The player enters roll codes as they happen in-game and the predictor tells them what is most likely to come next, how safe the current pair lane is, and whether to click now or wait.

The goal is not to name the next number with certainty. It is to answer:
> "What route is most likely, how safe is that route, and will it land on the stat I want?"

---

## Core Concepts

### Rolls and Lines
- A **roll** is a 2-digit code the player observes after a relic upgrade (e.g. `42`, `43`).
- The **line** is which of 4 possible positions the session is on. The first digit of a raw roll = the previous line; the second digit = the line you landed on.
- All rolls are **Caesar-shifted** so the first digit is always `4`. This makes sessions from different active lines comparable.

### Caesar Shift (4x Translation)
```
shift = (4 - firstDigit + 4) % 4
zero  = digit - 1
shifted = (zero + shift) % 4
result  = shifted + 1
```
- Example: raw roll `23`, first digit `2`, shift `2` → translated `41`
- The same visible translated value can come from multiple raw paths, which is why **line control matters** when deciding which stat to pursue.

### Commons and Noise
- **Commons**: the 2 values that appear most frequently in the session. The dominant pair.
- **Noise**: the other 2 values. They appear ~45% of the time and represent pressure on the pair.
- Noise can be: **active** (building), **cold** (dormant, may spike), or **never-seen** (has not appeared yet — highest spike risk when it finally does).

### Pair Safety
`safe` / `caution` / `danger` — how much the predictor trusts the pair lane right now.

### Svarog Analyzer
A secondary scoring layer that:
- Ranks all 4 values against each other using frequency, transition history, run length, and break risk.
- Outputs the top-2 most likely next rolls.
- Baseline accuracy: ~30% exact (top-1), ~70% top-2.

---

## The Predictor Pipeline

1. **Input normalization** — raw roll → Caesar shift → 4x value added to session rolls array.
2. **Commons detection** (`identifyCommonsNoise`) — find dominant pair, label noise.
3. **Wave signals** (`calculateWaveSignals`) — run-length, flip tendency, momentum.
4. **Trend calculation** (`calculateTrends`) — recent direction, freshness.
5. **Transition scoring** (`scoreSvarogAnalyzerPicks`) — pick top-2 using a weighted blend.
6. **Transition override** — on historically weak transitions (`44→43`, `43→43`), `lastRoll` is evicted from top-2 and the next-best (often noise) moves up. This recovered +6 top-2 points.
7. **Noise predictor** (`svarogNoisePredictor.js`) — standalone module that estimates:
   - *When* noise will hit (`noiseLikelihoodNextRoll`)
   - *Which* noise value is most likely
   - Confidence level (high/medium/low)
   - Exposed in `data.noisePredictor` for the UI. Not directly merged into scoring to avoid false positives on commons.
8. **Break risk** — `getBreakRiskPercent()` estimates how likely the current pair is to break next roll.

---

## Line Forcing

To land on a specific stat:
```
stepsNeeded = (targetLine - currentLine + 4) % 4
```
Each RNG-consuming game action (menu navigate, loading screen, banner roll) advances by 1 step.

**Force only when:**
- Wave is not chaotic
- Pair safety is `safe` or at most `caution`
- You have 6+ rolls of clean data
- The force puts you on a clearly better line

---

## UI Components

| Component | Role |
|-----------|------|
| `ModernStickyHeader.jsx` | Top bar with pair summary and alert |
| `ModernPredictionCard.jsx` | Main top-2 prediction display |
| `ModernPairPredictorCard.jsx` | Pair lane read with STAY/SWITCH |
| `ModernAccuracyCard.jsx` | Accuracy tracking vs actual rolls |
| `ModernFrequencyCard.jsx` | Roll frequency breakdown |
| `WaveAnalysisDisplay.jsx` | Column-by-column wave analysis |
| `ModernLiveTrackingTable.jsx` | Scrollable roll history table |
| `FiveMinWindowTracker.jsx` | 5-minute window performance tracker |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/utils/pairTransitionPredictor.js` | Main predictor — `predictWithPairs()` |
| `src/utils/cascadingPredictor.js` | Cascading priority fallback predictor |
| `src/utils/svarogNoisePredictor.js` | Standalone noise timing predictor |
| `src/utils/svarogNoiseOracle.js` | Noise oracle heuristics |
| `src/utils/patternRecognition.js` | Run detection and flip pattern analysis |
| `src/utils/predictNext.js` | 2-string wave column analysis |
| `src/utils/stringHelpers.js` | `translateTo4()`, Caesar shift helpers |
| `src/utils/windowPerformanceTracker.js` | Per-window accuracy tracking |
| `src/utils/smartDecisionSystem.js` | When to use wave-flip vs smart-prefix |
| `src/utils/permissionLayer.js` | Bet-tier permission (STAY/SWITCH/WAIT decisions) |

---

## Performance Baseline (from replay testing)

| Metric | Value |
|--------|-------|
| Exact (top-1) | ~30% |
| Top-2 | ~70% |
| Noise rate in sessions | ~45% |
| Average noise gap | 3–4 commons rolls |
| Transition override impact | +6 top-2 points |
