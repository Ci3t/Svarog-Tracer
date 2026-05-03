# Feature: Kiyo Mode

> Route: `/kiyo`  
> Page: `src/pages/ModernKiyoModePage.jsx`  
> Core utility: `src/utils/pairTransitionPredictor.js` (3str layer), `src/utils/kiyoExplicitPairEngine.js`

---

## What It Does

Kiyo Mode is the 3-string (3-digit roll) prediction workspace. Where Live Mode works in 2-digit pairs (`42`, `43`), Kiyo works in full 3-digit strings (`421`, `432`, `444`).

The system determines which **prefix pair** (first two digits, e.g. `41` vs `42`) is currently dominant, and within that prefix, which **Z-digit pair** (third digit) is active. The user gets a STAY/SWITCH recommendation and 2–3 exact roll candidates.

---

## Key Concepts

### 3-String Structure
A roll like `423` breaks into:
- **Prefix (XY)**: `42` — the pair-lane (which line combination is active)
- **Z digit**: `3` — the specific outcome within that prefix

### Prefix Pair Systems
For prefixes `41`, `42`, `43`, `44`, three pairing systems exist:
- **Outer/Inner**: `41`+`44` vs `42`+`43`
- **Even/Odd**: `42`+`44` vs `41`+`43`
- **High/Low**: `43`+`44` vs `41`+`42`

The engine scores all 3 and picks the dominant one.

### Caesar Shift (same as Live Mode)
All raw rolls are normalized so the first digit = `4`. A raw `234` becomes `412` after shift. Users enter raw rolls; the app translates internally.

### Seed Weight
Sheet/imported data acts as a cold-start hint:
- 0–2 live rolls: `16%` seed weight
- 3–4 live rolls: `8%` seed weight
- 5+ live rolls: `0%` (live data dominates completely)

---

## Architecture: 4-Layer Prediction Stack

| Layer | File | Role |
|-------|------|------|
| **Pair Read** (prefix side) | `kiyo3strPairEngine.js` | Which prefix pair is active → STAY/SWITCH |
| **Prefix Wave** (Z within prefix) | `kiyoPrefixWave.js` | Which Z digit pair is active inside each prefix |
| **Session Predictor** (YZ transitions) | `kiyoSessionPredictor.js` | Independent Y+Z frequency + Caesar correlation |
| **Column Wave** (legacy) | `kiyoLogic.js` | Generic A/B run-length flip on any column |

The pair read layers (1+2) are the primary signal. Layers 3+4 are fallback/context.

---

## Pair Engine Logic (`kiyo3strPairEngine.js`)

### Layer 1 — Prefix Pair Selection
Scores pairings using:
```
dominanceSignal * 0.42 + runReliability * 0.34 + continuitySignal * 0.14 + fullDominance * 0.10
```
Decides STAY vs SWITCH based on whether `currentRunLen >= dominantN` and confidence thresholds (`nConfidence >= 0.45`, at least 2 completed sequences).

### Layer 2 — Z Candidate Selection
- Delegates to `prefixWaveData` from `kiyoPrefixWave.js` for per-prefix Z analysis
- Falls back to frequency ranking if no wave data
- Blends: `candidate.score = prefixScore * 0.68 + zScore * 0.32`

### Output
- `prediction` — top exact roll (e.g. `421`)
- `alt` — second pick
- `confidence` — `clamp(best.score * 0.55 + top.score * 0.35 + gap * 0.10)`
- `action` — `STAY` or `SWITCH`
- `activePairing` — which pairing system won (Outer/Inner, Even/Odd, High/Low)

---

## Explicit Pair Engine (`kiyoExplicitPairEngine.js`)

Analyzes each XY column (Outer/Inner, Odds/Evens, High/Low) and:
- Detects the dominant pattern side
- Scores run reliability and consistency
- Outputs which XY pair to follow and a suggested Z-candidate ranking

---

## Turso DB (Kiyo Data Layer)

Kiyo sessions can be saved to a separate Turso SQLite DB (isolated from main Supabase to protect the 500MB free tier):

- **Anonymous users**: UUID generated on first visit, stored in `localStorage` as `svarog_uid`
- **Logged-in users**: Discord `user.id`
- **Batch save**: rolls accumulate locally → user clicks "Save Session" (or auto-sync every 30s/10 rolls) → one `POST /session`
- **Tables**: `kiyo_sessions`, `kiyo_roll_events`, `kiyo_patch_stats`, `kiyo_rate_limits`
- **History use**: user's own past sessions are the **first** prediction layer for cold-start

---

## UI Components

| Component | Role |
|-----------|------|
| `KiyoModeCard.jsx` | Main card orchestrating the Kiyo workspace |
| `ModernKiyoModeCard.jsx` | Modern UI wrapper |
| `PrefixWavePanel.jsx` | Per-prefix Z-digit wave display |
| `WavePairingTable.jsx` | Visual table of active pairings |
| `BettingRecommendationCard.jsx` | Tier-based bet recommendation |
| `CompactCaesarShift.jsx` | Caesar shift display for raw→translated |
| `ModernCaesarCard.jsx` | Modern Caesar shift card |
| `LiveTrackingTable3str.jsx` | 3-string roll history table |
| `KiyoBacktestResults.jsx` | Replay accuracy display |

---

## Performance (Replay Testing, 9 sessions, 143 decisions)

| Scope | Top-1 | Top-2 | Top-3 | Prefix | Side |
|-------|-------|-------|-------|--------|------|
| All sessions | 8.4% | 22.4% | 29.4% | 54.5% | 57.3% |
| Rolls 9–12 | 11.1% | 27.8% | 33.3% | 61.1% | 58.3% |
| Rolls 13+ | 7.5% | 25.0% | 33.8% | 58.8% | 63.7% |

> Note: Top-2 is the real target metric. Top-1 is hard because the user is choosing 2 exact outcomes from 4 possible.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/utils/pairTransitionPredictor.js` | `predictWithPairs()` — main entry |
| `src/utils/kiyoExplicitPairEngine.js` | Column-level pair scoring |
| `src/utils/kiyoPrefixWave.js` | Per-prefix Z digit wave analysis |
| `src/utils/kiyoSessionPredictor.js` | YZ transition + Caesar session predictor |
| `src/utils/kiyoLogic.js` | Generic column A/B flip detection |
| `src/utils/kiyoCommons.js` | Commons frequency detection for 3str |
| `src/utils/kiyo2strSignals.js` | 2-string wave signals bridging into Kiyo |
| `src/utils/kiyoBacktester.js` | Replay parser for backtesting |
| `src/hooks/useKiyoSession.js` | Session state, localStorage, UUID management |
| `server/_services/hsr/kiyo.js` | Backend patch payload + admin |
| `server/_services/hsr/kiyoClient.js` | Turso client, IP hash, anonymous ID |
