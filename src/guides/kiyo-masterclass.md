# 🌊 Kiyo Mode — Masterclass Guide

> Last updated: 2026-03-05 | For current Kiyo Mode (2-str wave pairing system)

---

## What Is Kiyo Mode?

The game groups 2-digit rolls into **pairs** each session. One pairing dominates:
- Some sessions: **41 & 44** come together, **42 & 43** together (Outer/Inner)
- Some sessions: **42 & 44** together, **41 & 43** together (Odd/Even)
- Some sessions: **43 & 44** together, **41 & 42** together (Low/High)

Kiyo Mode detects which pairing is active and tells you **what side comes next**.

---

## The 3 Pairings

| Column | Name | Green Side | Amber Side |
|--------|------|-----------|-----------|
| 41/44 | **Outer / Inner** | 41 & 44 (Outer) | 42 & 43 (Inner) |
| 42/44 | **Odd / Even** | 42 & 44 (Even) | 41 & 43 (Odd) |
| 43/44 | **Low / High** | 43 & 44 (High) | 41 & 42 (Low) |

> **Key insight about 44**: 44 appears in the green side of ALL three columns. 
> When 44 dominates (>50%), it's hard to tell which pairing is active — **you need 41/42/43 to appear to differentiate**.

---

## The Two Signals

### 1. TABLE % (Short-term)
- Counts how many of the **last 10-15 rolls** fell on each side of the starred column
- **75% dom%** = 3 of 4 recent rolls on that side (small = weak)
- **×4 streak** = 4 consecutive same-color rows = strong visual signal
- **×5+ streak** = override everything else, this is real

### 2. 2-String Wave (Whole session)
- Analyzes the **entire session** to detect run patterns
- Knows if rolls follow N=3 (groups of 3) or N=2 (alternating) pattern
- Needs ~8+ rolls to stabilize
- Shows one of these verdicts every roll:

---

## Wave Verdicts — What Each One Means

| Verdict | Color | What it means | What to do |
|---------|-------|---------------|------------|
| 🏆 **DOM** | Green | One side appears ≥60% of ALL session rolls. Pattern locked. Most reliable signal. | **Bet full** on the FOLLOW side |
| 📊 **HOLD** | Teal | Current side's run is still going (e.g. run 2/3). Stay on current side. | **Stay** — same side as last roll |
| 🎯 **FLIP** | Amber | Run reached N rolls (e.g. 3/3). Game will switch to other side next. | **Switch** to the opposite side |
| ⚡ **LIKELY** | Yellow | Pairing isn't locked yet — two columns are too similar in score. Early session. | **Bet smaller** — half normal bet |
| ⏳ **WAIT** | Gray | Not enough rolls yet (usually < 4). Can't detect the pairing. | **Skip** this roll |
| ⚠️ **SKIP** | Gray | Session is chaotic — no consistent pattern detected at all. | **Skip** — don't bet |

### Examples in plain language:

**DOM Even (67%)** → "42 & 44 appear 67% of all rolls this session. Bet 42 or 44."

**HOLD High (run 2/3)** → "43 & 44 have come 2 times in a row. Expect 1 more. Stay on 43/44."

**FLIP → Low (run 3/3)** → "43 & 44 hit 3 in a row (N=3 reached). Now expect 41 or 42 next."

**LIKELY Even** → "Probably Even pairing but not sure yet — bet smaller on 42/44."

**WAIT** → "Only 3 rolls in — skip this one, come back next roll."

---

## When to Trust Each Signal

### ✅ Trust TABLE when:
- Streak is **×4 or more** consecutive same-color rows
- You can visually see the long streak in the colored table
- Even if Wave % is low — a long streak is visual proof

### 🌊 Trust Wave when:
- Table % has a **small count** (e.g. 75% from only 4 rolls = 3/4)
- Wave shows **🏆 DOMINANT** with 8+ session rolls
- Wave is in HOLD with a clear N value (e.g. HOLD run 2/3)

### Both agree → Maximum confidence. Bet with confidence.
### They disagree → Follow the TABLE streak if ×5+, otherwise follow Wave.

---

## The Noise Rule

Rolls don't stay on one side forever. After **~3 green rows**, expect **1-2 amber noise rolls**, then green resumes.

```
Pattern example (N=3):
🟢🟢🟢🟡🟡🟢🟢🟢🟡🟢🟢🟢🟡🟡🟢🟢
```

This is NORMAL. When noise appears:
- Don't switch columns
- Don't panic
- Expect green to come back in 1-2 rolls

---

## The 44 Ambiguity Problem

At session start, if you only see 44s:
- Can't determine active pairing yet (44 is in ALL pairings)
- Wave shows ⚡ LIKELY = warning, not ready
- Wait until 41, 42, or 43 appears to differentiate
- Usually clear by roll 5-6

---

## Quick Decision (3 Steps)

```
Step 1: Is there a ×4+ streak in any column?
  YES → Follow that color. Bet that side.
  NO  → Go to step 2.

Step 2: Does the Wave show 🏆 DOM or HOLD?
  YES → Follow the FOLLOW → signal shown below the wave card.
  NO  → Is it ⚡ LIKELY? Bet smaller. Is it WAIT/SKIP? Skip.

Step 3: Do TABLE and Wave suggest the same side?
  YES → Bet with high confidence.
  NO  → Bet smaller or skip.
```

---

## Confidence Levels for Betting

| Signal Combination | What to Do |
|-------------------|------------|
| Streak ×5+ + Wave DOM agree | **Full bet — high confidence** |
| Streak ×4 OR Wave 🏆 DOM | **Normal bet** |
| Wave HOLD, no streak | **Bet smaller** |
| Wave ⚡ LIKELY | **Small bet only** |
| Wave WAIT/SKIP, no streak | **Skip this roll** |

---

## Reading the Debug Export

- **Wave-Verdict column:** Shows what the wave said for each roll
- **W-Hit?** column: ✓ = wave prediction was correct, ✗ = wrong
- **Confidence tiers:** HIGH (≥70%), MED (60-69%), LOW (<60%)
- **Export tip:** Compare HIGH vs MED vs LOW accuracy to find your threshold

---

## Common Mistakes

| Mistake | Why it's wrong | What to do instead |
|---------|---------------|-------------------|
| Switching columns when noise appears | Noise is part of the pattern | Stay on the ★ column |
| Trusting 75% from 4 rolls | 3/4 = statistically meaningless | Wait for ×4+ streak |
| Betting when Wave says ⚡ LIKELY | Pairing not locked yet | Wait 2-3 more rolls |
| Ignoring ×5+ streak because Wave disagrees | Streak = visual proof | Follow the streak |
| Betting when both say SKIP/WAIT | No pattern = 50/50 | Skip this roll |
