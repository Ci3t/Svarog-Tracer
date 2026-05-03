# Feature: Long String Lab

> Route: `/long-string`  
> Page: `src/pages/ModernLongStringPage.jsx`

---

## What It Does

Long String Lab is a bulk-import workspace for players who paste a compressed string of many rolls at once instead of entering them one by one. It decodes the string, runs the full predictor pipeline, and shows the same pair/wave analysis as Live Mode.

It also includes a **5-minute timer** so the player can track one session window at a time. When the timer expires, the current string is saved to history and the input clears for the next window.

---

## Core Flow

1. Player copies a long string from their tracking source (e.g. Discord bot export or sheet).
2. `decodeLongString()` from `stringHelpers.js` parses the compressed format into individual roll codes.
3. `predictWithPairs()` from `pairTransitionPredictor.js` runs the full predictor on the decoded rolls.
4. Output displayed via `ModernPairPredictorCard` and `ModernDebugPanel`.

---

## Timer Mechanic

- **5-minute countdown** (300 seconds) per session window.
- On expiry: current string is pushed to `stringHistory`, input is cleared, timer resets and restarts automatically.
- Player can manually pause, restart, or load a previous session from history.
- Region tag (Global/EU/NA/Asia) is stored with each history entry.

---

## String Encoding

Long strings use a compact encoding where each character maps to a roll value. `decodeLongString()` returns:
```js
{ rolls: ['42', '43', '44', ...], rollCount: N }
```
The `buildPrefixFreq()`, `decodeLongString()`, `padTo5()`, and `translateTo4()` helpers in `stringHelpers.js` handle all encoding/decoding.

---

## Predictor Modes

- `simple` — uses `predictWithPairs()` with standard settings
- `advanced` — exposes additional debug panels via `ModernDebugPanel`

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/ModernLongStringPage.jsx` | Main page and timer logic |
| `src/utils/stringHelpers.js` | Long string decode, Caesar, prefix helpers |
| `src/utils/pairTransitionPredictor.js` | Full predictor pipeline |
| `src/components/modern/ModernPairPredictorCard.jsx` | Pair prediction display |
| `src/components/modern/ModernDebugPanel.jsx` | Advanced debug output |
| `src/components/modern/ModernTimerCard.jsx` | Timer UI |
| `discord-bot/commands/longstring.js` | Discord `/longstring` command handler |
| `discord-bot/utils/messageHandlers.js` | `handleLongstringInput()` |
