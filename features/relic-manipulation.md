# Feature: Relic Manipulation System

> Not a route — this is the underlying mechanics that Live Mode, Tutorial, and Playground are built on.  
> Primary guide: `debugfiles/RELIC_MANIP_FULL_GUIDE.md`

---

## What Is Relic Manipulation?

Relic Manipulation is the practice of steering which substat a relic upgrades to by controlling the game's internal RNG state at the moment you confirm the upgrade.

The game uses a **deterministic sequence** — a fixed repeating cycle of possible outcomes. Knowing where you are in that cycle lets you predict the next outcome or reposition yourself by consuming extra RNG ticks before confirming.

Every game action that consumes RNG (opening menus, navigating, loading screens, banner rolls) advances the internal seed by a known amount. The substat you get when you confirm is simply whichever position in the sequence you are on.

---

## Lines

The relic RNG cycle has exactly **4 positions** called **lines** (1, 2, 3, 4). You are always on one of them. The line you land on after an upgrade is the second digit of the raw roll.

- **Raw roll**: the direct line-to-line transition (e.g. `42` = you were on line 4, landed on line 2)
- **Visible roll**: after Caesar shift normalization (first digit always becomes `4`)

The same underlying pattern appears rotated under different active lines — Caesar shift collapses them into a comparable space.

---

## Caesar Shift

**Problem**: Raw rolls `11`, `22`, `33`, `44` are different numbers but represent the same structural pattern (self-loop). Without normalization, sessions starting on different lines look unrelated.

**Solution**: Shift all rolls so the first digit = 4.
```
shift = (4 - firstDigit + 4) % 4
zero  = digit - 1
shifted = (zero + shift) % 4
result  = shifted + 1
```

Example: raw `232`, first digit `2`, shift `2`:
- `2` → `4`
- `3` → `1`  
- `2` → `4`
- Result: `414`

The app calls `translateTo4()` automatically on every raw roll input. You never need to do this math yourself.

---

## Line Forcing

To end up on a specific line before clicking the target relic:
```
stepsNeeded = (targetLine - currentLine + 4) % 4
```
Each RNG-consuming action = 1 step:
- Navigate a menu
- Open/close an inventory screen
- Load a map
- Roll a banner

**When to force:**
- Wave is not chaotic
- Pair safety is `safe` or `caution`
- 6+ rolls of clean data available
- The forced line produces a clearly better stat landing

**When NOT to force:**
- Pair safety is `danger`
- Wave is chaotic (noise dominating)
- You don't have enough roll history to trust the read

---

## Setup Relics

A **setup relic** (or "force relic") is a cheap 3-line or 4-line relic used before the target relic. Its purpose:
1. **Data collection**: each upgrade adds a roll to the predictor's history
2. **Line positioning**: its final upgrade leaves you sitting on a line you choose

The **carry line** is shared across all relics in a session. Using a setup relic changes the starting line of the next upgrade (target relic or otherwise).

3-line relic `+3` action: adds the 4th substat — this is also an RNG event and is recorded as a roll (typically `44` in session data).

---

## 2-String vs 3-String

| Mode | Roll Format | What It Tracks |
|------|------------|----------------|
| 2-String | `41`, `42`, `43`, `44` (2-digit) | Line pair transitions |
| 3-String | `411`, `423`, `444` (3-digit) | Line pair + specific substat landing |

3-string (used in Kiyo Mode) is more specific and harder to predict, but gives finer control over exactly which substat is targeted.

---

## Svarog Relic Scorer (`debugfiles/relicscore.py`, `debugfiles/setWeight.py`)

Python-based offline relic evaluator:
- `CharacterWeights` — substat weight dict per character (0.0–1.0)
- `_effective_weight()` — applies flat penalty for flat stats (ATK flat, HP flat penalized vs %)
- `estimate_rolls()` — infers how many times each substat was rolled from its value
- `_assign_grade()` — outputs S/A/B/C/D grade based on weighted substat score
- `score_relic()` — main entry point
- `get_weights_for_set()` — set-based weight lookup (e.g. Pioneer Diver gives CRIT DMG priority)
- `get_archetype()` — returns archetype label (crit, sustain, break, etc.)

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/utils/stringHelpers.js` | `translateTo4()`, `buildPrefixFreq()`, line helpers |
| `src/utils/caesarUtils.js` | `caesarShiftForLine()`, raw decode examples |
| `src/utils/relicScoring.js` | `activateRelicLine()`, `applyUpgradeRoll()`, `createRelicLine()` |
| `src/utils/relicPrngSimulator.js` | Simulates the RNG sequence for testing |
| `debugfiles/RELIC_MANIP_FULL_GUIDE.md` | Full user-facing guide |
| `debugfiles/relicscore.py` | Python relic scorer |
| `debugfiles/setWeight.py` | Set-based stat weights for Svarog scoring |
| `src/guides/pvp-bot-and-roll-system-summary.md` | Deep-dive on carry line and bot simulation |
