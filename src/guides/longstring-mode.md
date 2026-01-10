# Long String Lab - Advanced Guide

## What is Long String Lab?

Long String Lab is Svarog Tracer's **offline pattern analysis engine**. Unlike Live Mode (real-time rolling), Long String lets you:
- **Test strategies** without consuming resin
- **Backtest historical data** to identify personal patterns
- **Analyze imported session strings** from other players
- **Discover optimal rolling sequences** for your account/region

**Core Purpose:** Pattern discovery and strategy validation before you commit resin.

---

## When to Use Long String vs Live Mode

### Use Long String When:
- ✅ Testing new pattern theories
- ✅ Analyzing a friend's session data
- ✅ Learning pattern recognition (no risk)
- ✅ Validating if a pattern is real or coincidence
- ✅ Building confidence before live rolling

### Use Live Mode When:
- ✅ Actively rolling relics
- ✅ Need real-time predictions
- ✅ Building session history
- ✅ 5-minute competitive sessions

**Pro Tip:** Use Long String to practice, then apply learnings in Live Mode.

---

## Understanding the Input System

### What is a "Long String"?

A long string is a sequence of raw relic upgrade results in their **original format** (1-8 digits, untranslated).

**Example:**
```
Raw string: 213421234123
Decoded:    21 34 21 23 41 23
Translated: 41 43 41 42 41 42
```

### The Translation Process

**Why translation matters:**
- Game shows digits 1-8
- Internal RNG works on 4-digit cycle (1-4)
- Translation normalizes data for pattern detection

**Translation formula:**
```
Digit 1-4 → 1-4 (no change)
Digit 5-8 → Mapped to 1-4 (5→1, 6→2, 7→3, 8→4)
```

**Then Caesar shifted** so first digit = 4.

---

## How to Build Effective Test Strings

### Method 1: Export from Live Sessions

1. Complete a Live Mode session (8+ rolls)
2. Click "EXPORT CSV"
3. Copy the "String" column values
4. Paste into Long String Lab

**Why this works:**
- Real session data
- Already has established patterns
- Validates if patterns persist across sessions

---

### Method 2: Manual Entry (Testing Theories)

**Example: Testing "41-42 Alternating" theory**

```
Enter: 41424141424141
```

Watch prediction evolve:
- Roll 6: Confidence ~45% (pattern forming)
- Roll 8: Confidence ~60% (pattern confirmed)
- Roll 12: Confidence ~75% (pattern locked)

**What this tells you:**
- How many rolls needed for pattern lock
- At what point predictions become trustable
- If alternating is detectable in your data

---

### Method 3: Community String Analysis

**Scenario:** Friend claims they have "unstoppable 41 runs"

1. Ask for their session export
2. Paste into Long String Lab
3. Check:
   - Are their "commons" actually 41-dominant?
   - What's the pattern? (Run vs Alternating)
   - Does noise recovery work for them?

**Use case:** Learn from others' patterns

---

## Reading the Analysis

### SUGGEST Prediction Card

```
🎯 SUGGEST
42  56%
[COMMONS: 41_42]  [NOISE: 43_44]
```

**What to analyze:**

1. **Commons Composition**  
   - 2 values = Healthy alternating potential
   - 1 value dominant (60%+) = Run pattern
   - 3+ values = Weak pattern (need more data)

2. **Noise Behavior**  
   - Noise appears → Check if next roll recovers to common
   - Persistent noise (3+ in a row) = Pattern broken

3. **Confidence Evolution**  
   - Should increase as you add rolls
   - If stuck at <50% after 12 rolls = No clear pattern

---

### TRENDS Section

**What each stat means:**

```
COMMONS: 41, 42
41: DOMINANT • ↑
42: ↓
```

**Interpretation:**
- **41: DOMINANT + ↑** = 41 is increasing in frequency (becoming more common)
- **42: ↓** = 42 is decreasing (pattern shifting toward 41 dominance)

**Strategy implication:**
- If testing this as a live strategy → Focus rolls on the ↑ trending common
- Downtrend means that value is weakening

---

### AFTER X → ? (Pair Matrix)

```
AFTER 41 → ?
42: 75%  (6 samples)
43: 0%   (N/A)
```

**Critical analysis:**

1. **Sample count:**  
   - 6+ samples = Reliable
   - 2-5 samples = Weak (needs more data)
   - 0-1 samples = Ignore (N/A)

2. **Percentage:**  
   - 75%+ = Strong transition rule
   - 50-74% = Moderate (use with other signals)
   - <50% = Weak/unreliable

**Application:**
- If "After 41 → 42" is 75% with 8 samples
- **Live strategy:** When you roll 41, immediately expect 42 next

---

## Advanced Backtesting Strategies

### Strategy 1: Personal Pattern Discovery

**Goal:** Find YOUR account's unique tendencies

1. **Export 5-10 past sessions** from Live Mode
2. **One by one**, paste each into Long String Lab
3. **Track:**
   - Which commons appear most across sessions
   - Average confidence scores
   - Most frequent pattern type

**Example findings:**
```
Session 1: Commons 41_42, Alternating, 68% conf
Session 2: Commons 41_43, Alternating, 65% conf
Session 3: Commons 41_42, Alternating, 72% conf

INSIGHT: My account LOVES 41_42 alternating. 
Strategy: Focus live rolling sessions around 41_42 pattern.
```

---

### Strategy 2: Pattern Stability Testing

**Goal:** How long do patterns last?

1. Enter a long string (20+ rolls)
2. Watch when prediction confidence peaks
3. Note when it drops

**Example:**
```
Rolls 1-6:   40% confidence (forming)
Rolls 7-12:  70% confidence (peak)
Rolls 13-16: 55% confidence (declining)
Rolls 17+:   45% confidence (pattern shift)

INSIGHT: Patterns are strongest between rolls 7-12.
Strategy: In live mode, trust predictions most during this window.
```

---

### Strategy 3: Noise Tolerance Measurement

**Goal:** How much noise before pattern breaks?

1. Take a session with strong pattern (15+ rolls)
2. Note where noise appears
3. Check if pattern recovers

**Example:**
```
41 42 41 42 41 42 [43 ← noise] 42 41 42 ← recovery!

VS

41 42 41 [43 44 ← 2x noise] 41 43 ← broken pattern
```

**Finding:**
- 1 noise roll = 80% recovery rate
- 2 noise rolls = 50% recovery rate
- 3+ noise rolls = Pattern reset

**Live strategy:** Accept 1 noise roll, restart session after 2+.

---

## Quick Stats Section Mastery

### Reading the Grid

```
[7]       [6]        [3]        [42]        [41]         [50%]
Total     Decoded    Unique     Most Freq   Least Freq   Dominant
Digits    Rolls      Values
```

**Analysis:**

1. **Total Digits / Decoded Rolls ratio:**  
   - 12 digits → 6 rolls = Healthy (all 2-digit pairs)
   - 15 digits → 5 rolls = Mixed

 (some 3-digit, some 2-digit) → Less ideal

2. **Unique Values:**  
   - 2-3 values = Strong pattern potential
   - 4 values = Moderate (need longer string)
   - 5+ values = Weak/random data

3. **Most vs Least Frequency Delta:**  
   - Most at 50%+, Least at <20% = Healthy dominance
   - Most at 35%, Least at 30% = Weak pattern (all values balanced)

---

## Import/Export Workflow

### Export Use Cases

**1. Sharing with Community:**
```
You: "I have insane 41 dominance, is this normal?"
Export → Share string
Others: Import your string → Validate your claim
```

**2. Cross-Region Testing:**
```
Test hypothesis: "EU servers have more Alternating than America"
- Export 10 strings from EU account
- Export 10 strings from America account
- Compare common patterns
```

**3. Personal Archive:**
```
Keep a folder of "best sessions" (70%+ confidence)
Review monthly → Identify seasonal RNG shifts
```

---

### Import Best Practices

**When importing strings from others:**

1. **Verify length:** Min 12 digits for meaningful analysis
2. **Check for patterns:** If it looks random, it probably is
3. **Region context:** Patterns may differ by server
4. **Sample size:** 1 string = anecdote, 10 strings = trend

---

## Timer & History Features

### 5-Minute Session Timer

**Why use timer in Long String?**
- **Simulate live conditions** (time pressure)
- **Auto-archive** completed tests
- **Track multiple theory tests** separately

**Workflow:**
1. Start timer
2. Enter test string (or build it roll-by-roll)
3. When timer expires → Session saved to History
4. Load from History to review later

**Use case:** Testing if "41-42 double-run" works under time pressure.

---

### History System

**What gets saved:**
- Original string
- Timestamp
- Region setting
- Decoded roll count
- Prediction results

**Analysis strategy:**
```
History Entry 1: 15 rolls, Commons 41_42, 68% conf
History Entry 2: 18 rolls, Commons 41_43, 45% conf
History Entry 3: 12 rolls, Commons 41_42, 72% conf

INSIGHT: 41_42 consistently outperforms 41_43 in my tests.
Live strategy: Prioritize sessions where I see 41_42 forming early.
```

---

## Advanced Pattern Testing Scenarios

### Test 1: "Run Pattern Viability"

**Hypothesis:** Can I sustain a 41 run for 10+ rolls?

**Method:**
1. Enter string: `41414141414141414141`
2. Check SUGGEST prediction at each step
3. Note when confidence peaks and falls

**Expected result:**
- If confidence stays 60%+ after 8 rolls → Run pattern viable
- If confidence drops below 50% → Alternating is stronger

---

### Test 2: "Noise Recovery Reliability"

**Hypothesis:** After noise, commons return within 2 rolls

**Method:**
1. Enter base pattern: `41 42 41 42 41 42`
2. Add noise: `41 42 41 42 41 42 43`
3. Continue: `41 42 41 42 41 42 43 [?]`
4. Check if prediction returns to 41 or 42

**Expected result:**
- If prediction says 41 or 42 with 55%+ → Noise recovery confirmed
- If prediction stays low (<50%) → Noise broke the pattern

---

### Test 3: "Optimal Session Length"

**Hypothesis:** What's the perfect session length for maximum confidence?

**Method:**
1. Build a 20-roll string with strong pattern
2. Check confidence at rolls 6, 8, 10, 12, 15, 20
3. Graph the confidence curve

**Expected findings:**
```
Roll 6:  45%
Roll 8:  60%
Roll 10: 70%  ← Peak
Roll 12: 68%
Roll 15: 55%  ← Declining
Roll 20: 45%  ← Pattern fatigue
```

**Live strategy:** Stop sessions at 10-12 rolls for maximum efficiency.

---

## Common Testing Mistakes

### ❌ Mistake 1: Testing with Random Data
**Problem:** Entering `12345678` to "see what happens"  
**Why it fails:** No real pattern to detect  
**Fix:** Use exported session data or structured test patterns

### ❌ Mistake 2: Over-Interpreting Small Samples
**Problem:** "My 6-roll string shows 100% alternating!"  
**Why it fails:** 6 rolls isn't enough to confirm a pattern  
**Fix:** Min 12 rolls for reliable conclusions

### ❌ Mistake 3: Ignoring Sample Counts
**Problem:** Trusting "After 41 → 42 (100%)" with only 1 sample  
**Why it fails:** N/A values mean insufficient data  
**Fix:** Require 5+ samples for any pair transition rule

---

## Pro Tips for Long String Analysis

### Tip 1: Build a Pattern Library
Keep a folder of proven patterns:
```
/patterns/
  ├── alternating_41_42.txt  (Commons: 41_42, Type: Alternating)
  ├── run_41_dominant.txt    (Commons: 41, Type: Run)
  ├── flip_wave.txt          (Commons: 41_42, Type: Flip)
```

Reference these when you encounter similar patterns in Live Mode.

---

### Tip 2: A/B Test Strategies
```
Test A: 41 42 41 42 41 42 41 (pure alternating)
Test B: 41 41 42 42 41 41 42 (double-run variant)

Compare:
- Which has higher confidence?
- Which recovers better from noise?
- Which one matches YOUR live sessions?
```

---

### Tip 3: Seasonal RNG Analysis
Export sessions every month, compare:
- Do patterns shift with game patches?
- Are certain commons more frequent in specific patches?
- Does server region affect pattern distribution?

**Example finding:**
```
Patch 3.6: 41_42 alternating = 70% of sessions
Patch 3.7: 41_43 alternating = 65% of sessions

INSIGHT: Patch updates MAY shift RNG behavior.
```

---

## Integration with Live Mode

### Workflow: Lab → Live

1. **Research phase** (Long String Lab):
   - Test 5-10 historical sessions
   - Identify strongest pattern type for YOUR account
   - Note optimal session length

2. **Preparation phase**:
   - Set expectations (e.g., "I should see 41_42 within 6 rolls")
   - Know when to abort (e.g., "If I get 3 noise values, restart")

3. **Execution phase** (Live Mode):
   - Apply learned strategies
   - Track success rate
   - Export results back to Lab for refinement

**Continuous improvement loop:**
```
Lab Testing → Live Rolling → Export Data → Lab Analysis → Refined Strategy
```

---

## Success Metrics for Testing

**Track these when testing in Long String:**

- **Pattern Detection Speed:** How many rolls until 60% confidence?
- **Commons Stability:** Do commons stay consistent across 15+ rolls?
- **Noise Tolerance:** How many noise values before pattern breaks?
- **Transition Accuracy:** Does "After X → Y" match what actually happened?

**Benchmarks:**
- ✅ 60%+ confidence by roll 8 = Good pattern
- ✅ Commons stable for 12+ rolls = Strong pattern
- ✅ 75%+ pair transition accuracy = Excellent

---

## Final Strategy: The Scientific Method

1. **Hypothesis:** "My account favors 41-42 alternating"
2. **Test:** Enter 10 past session strings into Lab
3. **Measure:** How often does 41-42 alternating appear with 60%+ confidence?
4. **Conclude:** 
   - 7/10 sessions confirm → Hypothesis supported
   - 3/10 sessions confirm → Hypothesis rejected
5. **Apply:** Use findings to guide Live Mode strategy

---

## Quick Reference Checklist

Before testing:
- [ ] Clear hypothesis or question
- [ ] Relevant data (exported sessions or structured pattern)
- [ ] Min 12 rolls for reliable analysis

During testing:
- [ ] Track confidence evolution
- [ ] Note sample counts for pair transitions
- [ ] Watch for pattern breaks (noise)

After testing:
- [ ] Export/save promising patterns
- [ ] Document findings
- [ ] Plan Live Mode application

---

**Long String Lab is your RNG laboratory. Test boldly, fail safely, learn constantly.**
