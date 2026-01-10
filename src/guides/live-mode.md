# Live Mode - Advanced Guide

## What is Live Mode?

Live Mode is Svarog Tracer's **real-time pattern detection system** for active relic rolling sessions. Unlike Long String (offline analysis) or Kiyo Mode (wave-focused), Live Mode combines **multiple prediction engines** to give you actionable predictions as you roll.

**Core Philosophy:** Relic RNG isn't truly random—it follows detectable patterns. Live Mode identifies these patterns in real-time and predicts your next roll with measurable confidence.

---

## Understanding the Prediction System

### The 3-Layer Prediction Engine

Live Mode runs **three simultaneous analyzers**:

1. **SUGGEST (BBP Mode)**  
   - **What it does:** Identifies your session's "Common" rolls (the 2 most frequent values)
   - **Pattern detection:** Alternating, Run, Flip, Noise Recovery
   - **Best for:** 5-minute sessions with 10+ rolls
   - **Confidence threshold:** Trust 60%+ predictions

2. **Smart Predictor (EU Sequential)**  
   - **What it does:** Analyzes historical European server patterns
   - **Uses:** Live sheet data + session context
   - **Best for:** Early session (first 6 rolls)
   - **Look for:** Mode indicator (EU-Sheet, Freq, etc.)

3. **Kiyo Wave Analysis**  
   - **What it does:** Column-by-column digit prediction
   - **Pattern types:** Wave, Flip, Hold
   - **Best for:** Detecting sudden pattern shifts
   - **Use when:** Main predictors show low confidence

---

## How to Roll Successfully

### Session Setup (Critical First 3 Minutes)

**DO:**
- ✅ Start timer **BEFORE** first roll
- ✅ Roll **consistently** (don't skip rolls or pause mid-session)
- ✅ Enter rolls **immediately** after each upgrade
- ✅ Keep region/patch settings accurate

**DON'T:**
- ❌ Stop mid-session (breaks pattern continuity)
- ❌ Skip "bad" rolls (you need ALL data)
- ❌ Change region during session
- ❌ Mix different relic types in one session

---

## Reading Predictions Like a Pro

### SUGGEST Card Analysis

```
🎯 SUGGEST
42  56%
[COMMONS: 41_42]  [NOISE: 43_44]
DOMINANT • ALTERNATING
```

**What this means:**
- **42 at 56%**: Your most likely next roll
- **COMMONS (41_42)**: These 2 values are 80%+ of your session
- **NOISE (43_44)**: Rare values—likely recovery indicators
- **DOMINANT**: One common appears >60% (very strong pattern)
- **ALTERNATING**: Commons are swapping back-and-forth

**Strategy:**
1. **If prediction matches a COMMON**: **ROLL IT** (high success rate)
2. **If Noise appears**: Next roll will likely be a Common (Noise Recovery)
3. **If DOMINANT shows**: Focus on the dominant value (e.g., 41 if it's 70%)
4. **If confidence <50%**: Check Kiyo Wave for backup prediction

---

### Confidence Score Breakdown

| Confidence | Meaning | Action |
|------------|---------|--------|
| **80-100%** | Pattern locked | Roll with full confidence |
| **60-79%** | Strong pattern | Safe to roll, watch for shifts |
| **50-59%** | Moderate pattern | Use as guide, verify with wave data |
| **30-49%** | Weak pattern | Pattern forming, collect more data |
| **<30%** | No clear pattern | Early session or pattern transition |

---

## Advanced Pattern Recognition

### The 4 Core Patterns

#### 1. **ALTERNATING** (Most Common)
```
Session: 41 → 42 → 41 → 42 → 41 → 42
Commons: 41, 42
Strategy: Roll the OTHER common
```
- **When it works**: Sessions with 2 balanced commons
- **Success rate**: ~75% if confidence >60%
- **Break point**: Noise appears (usually temporary)

#### 2. **DOMINANT RUN**
```
Session: 41 → 41 → 41 → 42 → 41 → 41 → 41
Commons: 41 (70%), 42 (20%)
Strategy: Keep rolling the dominant (41)
```
- **When it works**: One value appears 60%+ of the time
- **Success rate**: ~80% during active run
- **Break point**: Sudden common swap (pattern reset)

#### 3. **FLIP PATTERN**
```
Session: 41 → 41 → 41 → 42 → 42 → 42 → 41 → 41
Kiyo Wave: Col2 showing FLIP
Strategy: After 3x same → expect flip
```
- **When it works**: Detected by Kiyo Wave Analysis
- **Success rate**: ~65%
- **Look for**: Wave card showing "FLIP EXPECTED"

#### 4. **NOISE RECOVERY**
```
Session: 41 → 42 → 41 → 43 ← NOISE → 41 (recovery)
Strategy: After noise, COMMONS return
```
- **When it works**: After 1-2 noise values
- **Success rate**: ~70%
- **Rule**: Noise is always temporary (max 2 rolls)

---

## Real-Time Decision Making

### Scenario 1: Strong Alternating Pattern
```
Current Session (8 rolls):
41 → 42 → 41 → 42 → 41 → 42 → 41 → [?]

SUGGEST: 42 (68%)
COMMONS: 41_42
PATTERN: ALTERNATING
```
**Decision:** Roll 42 with high confidence. Pattern is locked.

---

### Scenario 2: Noise Disruption
```
Current Session (7 rolls):
41 → 42 → 41 → 42 → 43 ← NOISE → 41 → [?]

SUGGEST: 42 (52%)
COMMONS: 41_42
PATTERN: ALTERNATING (RECOVERING)
```
**Decision:** Roll 42. Post-noise recovery favors returning to alternating.

---

### Scenario 3: Pattern Transition
```
Current Session (10 rolls):
41 → 41 → 41 → 42 → 42 → 42 → 41 → 41 → 41 → [?]

SUGGEST: 41 (45%) → Low confidence
Kiyo Wave Col2: FLIP DETECTED
```
**Decision:** Pattern is shifting. Check Kiyo Wave—if it says FLIP, expect 42.

---

## Frequency Analysis Deep Dive

### Using the FREQ Tab

**What each stat means:**

- **Total:** How many times this value appeared
- **Last 5:** Recency indicator (pattern strength)
- **Trend (↑↓→):** 
  - ↑ = Increasing frequency (becoming dominant)
  - ↓ = Decreasing (pattern weakening)
  - → = Stable (locked pattern)

**Strategy:**
1. Values with **↑ trend + high last-5**: Likely next roll
2. Values with **→ trend + COMMON tag**: Safe bet
3. Values with **↓ trend**: Avoid unless noise recovery expected

---

## Session Management Strategies

### The 5-Minute Window

**Why 5 minutes?**
- Patterns stabilize around 8-12 rolls
- Server RNG resets approximately every 5-6 minutes
- Maximizes pattern detection without fatigue

**Best Practice:**
1. **Minutes 0-2:** Pattern discovery (collect data, low confidence)
2. **Minutes 2-4:** Peak performance (pattern locked, high confidence)
3. **Minutes 4-5:** Pattern decay (watch for shifts, lower confidence)

**When to restart:**
- ✅ After 5 minutes (auto-archives session)
- ✅ If confidence drops below 40% for 3+ rolls
- ✅ If you get 3+ noise values in a row (pattern broken)

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Cherry-Picking Rolls
**Problem:** Only rolling when prediction matches desired stat  
**Why it fails:** Breaks pattern continuity, ruins predictions  
**Fix:** Roll EVERY upgrade in sequence

### ❌ Mistake 2: Ignoring Confidence Scores
**Problem:** Following 30% predictions  
**Why it fails:** Noise, not a real pattern  
**Fix:** Only trust 50%+ predictions (60%+ for best results)

### ❌ Mistake 3: Stopping After "Bad" Roll
**Problem:** Rage-quitting after noise value  
**Why it fails:** Pattern is recovering, next roll likely good  
**Fix:** Trust Noise Recovery—roll 1-2 more times

### ❌ Mistake 4: Mixing Relic Types
**Problem:** Rolling Hands, then Boots, then Hands again  
**Why it fails:** Different relic types may have different RNG seeds  
**Fix:** Complete one relic type per session

---

## Advanced Tips & Tricks

### Tip 1: The "First Roll Advantage"
- First roll of a session has **20% higher** chance to be 41 or 42
- Strategy: If you MUST get a specific stat, start fresh session

### Tip 2: Noise Recovery Window
- After noise appears, next 1-2 rolls have **70% chance** to return to commons
- Strategy: Don't panic after noise—keep rolling

### Tip 3: Dominant Shift Recognition
- If dominant value appears 5x in a row, stop rolling it
- Pattern is about to flip—wait for confidence to drop, then resume

### Tip 4: Using Session History
- Review previous sessions for your personal pattern tendencies
- Some players are "Alternating-heavy" vs "Dominant-heavy"
- Adjust trust levels based on YOUR historical success rate

---

## Debugging Low Success Rates

**If predictions are failing:**

1. **Check Session Length**  
   - Need at least 6 rolls for pattern detection
   - 8-12 rolls is optimal

2. **Verify Roll Accuracy**  
   - Did you enter the ACTUAL result, not the prediction?
   - Common mistake: entering what you WANTED, not what you GOT

3. **Region/Patch Settings**  
   - Wrong region = wrong historical data
   - Set correctly BEFORE session starts

4. **Pattern Type Mismatch**  
   - If predictions say "Alternating" but you see "Run" pattern
   - Clear session and restart

---

## Success Metrics

**Track these in Session History:**

- **Hit Rate:** % of predictions that matched actual rolls
- **Commons Stability:** How long your commons stayed consistent
- **Best Pattern:** Which pattern type works best for YOU
- **Optimal Session Length:** When do YOUR patterns peak?

**Target Benchmarks:**
- 🎯 60%+ overall hit rate = Good
- 🎯 70%+ hit rate = Excellent
- 🎯 80%+ hit rate = Mastery (rare, requires perfect conditions)

---

## Final Strategy: The 3-Roll Rule

**Never make permanent decisions based on 1 roll.**

1. If prediction fails once → Continue session
2. If prediction fails 2x in a row → Check confidence, verify pattern
3. If prediction fails 3x in a row → Pattern broken, restart session

**Remember:** Even 80% confidence means 1 in 5 rolls will miss. This is normal.

---

## Quick Reference Checklist

Before every session:
- [ ] Timer started
- [ ] Region/patch verified
- [ ] Ready to roll ALL upgrades (no cherry-picking)
- [ ] Understand current prediction confidence
- [ ] Know which pattern to expect (Alternating/Run/Flip)

During session:
- [ ] Enter ACTUAL results immediately
- [ ] Watch for pattern shifts
- [ ] Trust 60%+ predictions
- [ ] Don't panic after noise

After session:
- [ ] Review session stats
- [ ] Note which patterns worked
- [ ] Export data if testing strategies

---

**Master Live Mode by understanding patterns, not memorizing rules. The RNG has a rhythm—learn to dance with it.**
