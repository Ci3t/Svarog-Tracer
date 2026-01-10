# Kiyo Mode - Advanced Guide

## What is Kiyo Mode?

Kiyo Mode is Svarog Tracer's **wave-based pattern analysis system**. Unlike Live Mode (which focuses on 2-digit pairs), Kiyo Mode analyzes relics digit-by-digit across **three columns**:

- **Column 1 (First digit):** Raw roll pattern (1-8 range)
- **Column 2 (Second digit):** Translated pattern (1-4 range)
- **Column 3 (Third digit):** Translated pattern (1-4 range)

**Core Philosophy:** Relic RNG uses layered randomization. By analyzing each column independently, Kiyo Mode detects patterns that pair-based predictors miss.

---

## When to Use Kiyo Mode

### Use Kiyo Mode When:
- ✅ Live Mode predictions are <50% confidence
- ✅ You want column-specific pattern detection
- ✅ Testing wave/flip theories
- ✅ Learning advanced pattern mechanics
- ✅ You prefer digit-by-digit analysis over pair-based

### Use Live Mode When:
- ✅ You need simple, actionable 2-digit predictions
- ✅ Session is short (<10 rolls)
- ✅ You want BBP Mode (Commons/Noise)

**Key Difference:**
- **Live Mode:** "What 2-digit value comes next?" (e.g., 42)
- **Kiyo Mode:** "What digit comes next in Column 2?" (e.g., "2" in position 2)

---

## Understanding the 3-Column System

### Column Breakdown

```
Roll: 413  
Column 1 (raw):    4  (range 1-8, untranslated)
Column 2 (trans):  1  (range 1-4, translated)
Column 3 (trans):  3  (range 1-4, translated)
```

**Why separate columns?**
- Each column has **independent wave patterns**
- **Column 1** often shows "flip" behavior (4↔8, 1↔5)
- **Columns 2 & 3** follow different flip rules

---

### Wave Analysis Explained

**What is a "wave"?**

A wave is a predictable oscillation between specific digit groups.

**Example waves:**

**Column 1 Wave (1-8 range):**
```
LOW group:  1, 2, 3, 4
HIGH group: 5, 6, 7, 8

Session: 4 → 7 → 3 → 6 → 2 → 8 → 1
Pattern: LOW → HIGH → LOW → HIGH → LOW → HIGH → LOW

Expected next: HIGH (5, 6, 7, or 8)
```

**Column 2 Wave (1-4 range):**
```
LOW group:  1, 2
HIGH group: 3, 4

Session: 1 → 3 → 2 → 4 → 1 → 3
Pattern: LOW → HIGH → LOW → HIGH → LOW → HIGH

Expected next: LOW (1 or 2)
```

**Success rate:** 65-75% when wave is consistent for 4+ flips

---

## Reading the Wave Card

### Wave Display Format

```
🌊 WAVE ANALYSIS
Col 1: [4, 8] → FLIP EXPECTED (68%)
Col 2: [3, 4] → HOLD (45%)
Col 3: [1, 2] → WAVE (62%)
```

**Interpretation:**

1. **Col 1: [4, 8] → FLIP EXPECTED (68%)**  
   - **Targets:** Either 4 or 8 will appear next
   - **Pattern:** Flip (alternating between these two)
   - **Confidence:** 68% (trust this prediction)

2. **Col 2: [3, 4] → HOLD (45%)**  
   - **Targets:** 3 or 4
   - **Pattern:** HOLD (recent value will repeat)
   - **Confidence:** 45% (weak, don't rely on this)

3. **Col 3: [1, 2] → WAVE (62%)**  
   - **Targets:** 1 or 2 (LOW group)
   - **Pattern:** WAVE (oscillating LOW → HIGH → LOW)
   - **Confidence:** 62% (moderate trust)

---

## Pattern Types Deep Dive

### 1. FLIP Pattern

**What it means:** Column alternates between two specific values

**Example (Column 1):**
```
Session: 4 → 8 → 4 → 8 → 4 → 8
Expected: 4 (next flip)
```

**When it works:**
- Minimum 3 flips observed (6 rolls)
- Values are consistent (always 4 ↔ 8, not random)
- Confidence >60%

**How to use:**
1. See "FLIP EXPECTED" with 60%+ confidence
2. Next roll's Column 1 will likely be one of the two flip values
3. If it breaks (different value appears), pattern resets

---

### 2. WAVE Pattern

**What it means:** Column oscillates between LOW and HIGH groups

**Example (Column 2):**
```
Session: 1 → 3 → 2 → 4 → 1 → 3 → 2
Groups:  L → H → L → H → L → H → L

Expected: HIGH (3 or 4)
```

**When it works:**
- Minimum 4 flips observed (8 rolls)
- Clear LOW → HIGH → LOW pattern
- Confidence >55%

**How to use:**
1. Note current position (LOW or HIGH)
2. Expect opposite group next
3. If wave breaks (same group repeats), pattern weakening

---

### 3. HOLD Pattern

**What it means:** Recent value will repeat

**Example (Column 3):**
```
Session: 3 → 3 → 3 → 2 → 2 → 1 → 1
Pattern: Values repeat 2-3 times before changing

Expected: 1 (hold current value)
```

**When it works:**
- Recent rolls show repeating values
- Confidence >50%
- Short-term prediction (next 1-2 rolls)

**How to use:**
- Less reliable than FLIP or WAVE
- Use as tiebreaker when other patterns unclear
- Expect current value to repeat once more

---

## Column-Specific Strategies

### Column 1 (Raw Digit) Strategy

**Key insight:** Column 1 is often the MOST predictable

**Why:**
- Untranslated (1-8 range) has more distinct patterns
- Flip patterns (4↔8, 1↔5) are very common
- Less affected by Caesar shift

**Best practice:**
1. Focus on Column 1 predictions first
2. Look for FLIP patterns (highest success rate)
3. If Column 1 shows 70%+ confidence, trust it over Live Mode

**Example:**
```
Col 1: [4, 8] → FLIP (75%)
Col 2: [1, 2] → WAVE (55%)
Col 3: [2, 3] → HOLD (40%)

Strategy: Trust Column 1. Expect 4 or 8 next roll.
```

---

### Column 2 & 3 (Translated) Strategy

**Key insight:** These follow Caesar-shifted patterns

**Behavior:**
- More "random" than Column 1
- Wave patterns common (LOW ↔ HIGH)
- Flip patterns rarer

**Best practice:**
1. Use Columns 2 & 3 when you need full 3-digit prediction
2. Combine with Column 1 for complete picture
3. Lower confidence threshold (50%+ acceptable)

**Example:**
```
Col 1: [4] (75% confident)
Col 2: [3, 4] (60% confident)
Col 3: [1, 2] (55% confident)

Possible outcomes:
- 431 (Col1=4, Col2=3, Col3=1)
- 432 (Col1=4, Col2=3, Col3=2)
- 441 (Col1=4, Col2=4, Col3=1)
- 442 (Col1=4, Col2=4, Col3=2)

Strategy: Roll and expect one of these 4 combos.
```

---

## Advanced Wave Detection

### The 3-Flip Minimum Rule

**Pattern isn't real until you see 3 flips.**

**Example:**
```
Roll 1-2: 4 → 8           (1 flip, too early)
Roll 3-4: 4 → 8           (2 flips, possible pattern)
Roll 5-6: 4 → 8           (3 flips, pattern confirmed!)

Confidence:
- After 2 flips: ~40%
- After 3 flips: ~65%
- After 4 flips: ~75%
- After 5+ flips: ~80% (peak)
```

**Strategy:** Don't trust wave predictions until 3+ flips observed.

---

### Wave Break Detection

**When does a wave break?**

**Scenario 1: Unexpected value**
```
Session: 4 → 8 → 4 → 8 → 4 → 3

Expected: 8
Actual: 3 (BREAK!)

Action: Pattern reset. Start looking for new wave.
```

**Scenario 2: Same-group repetition**
```
Session (Col 2): L → H → L → H → L → L

Expected: H (opposite group)
Actual: L (same group, BREAK!)

Action: Wave weakening. Reduce confidence.
```

**Recovery strategy:**
- 1 break = Temporary (pattern may resume)
- 2 breaks in a row = Pattern dead (restart)

---

## Combining Kiyo + Live Mode

### The Hybrid Strategy

**Best results come from using BOTH modes together.**

**Workflow:**

1. **Live Mode gives you the target** (e.g., "42")
2. **Kiyo Mode confirms it digit-by-digit:**
   - Column 1: Expects 4? ✓
   - Column 2: Expects 2? ✓
   - **Confidence boost:** If both agree, success rate jumps to 80%+

**Example:**

```
Live Mode SUGGEST: 42 (65% confidence)
Kiyo Wave Analysis:
  Col 1: [4, 8] → Expecting 4 (70%)
  Col 2: [1, 2] → Expecting 2 (60%)

Analysis: Both modes predict 42!
Result: Combined confidence ~85% (roll it!)
```

---

### Conflict Resolution

**What if Live Mode and Kiyo disagree?**

**Example:**
```
Live Mode SUGGEST: 42 (60%)
Kiyo Column 1: Expecting 8 (75%)

Conflict: First digit should be 8, not 4
```

**Resolution strategy:**

1. **Trust the higher confidence:**  
   - Kiyo at 75% > Live at 60%
   - Expected next roll: 8X (where X = Column 2 prediction)

2. **Check sample sizes:**  
   - If Kiyo prediction based on 3 flips → reliable
   - If Live based on 12 rolls → also reliable
   - Trust whichever has MORE data

3. **Use Kiyo for tiebreaker:**
   - If Live says "42 or 43 equally likely"
   - Kiyo Col 3 says "2 expected"
   - Choose: 42 (matches Kiyo)

---

## Smart Prefix Predictor

**What is it?**

The Smart Prefix is a **sub-predictor** that uses the first 1 or 2 digits of your next roll to predict the full 3-digit value.

**How it works:**

```
You rolled: 4__

Smart Prefix looks at past rolls that started with 4:
- 41 (appeared 3x)
- 42 (appeared 2x)
- 43 (appeared 1x)

Prediction: 41 (most frequent after "4" prefix)
```

**When to use:**
- After you roll and get the first digit
- Bridges Kiyo (column-based) and Live (pair-based)
- Useful for mid-roll adjustments

**Integration with Kiyo:**
```
Kiyo predicts Column 1: 4
You roll → Get 4
Smart Prefix activates: "41 is 70% likely after 4"
Final prediction: 41
```

---

## Common Mistakes in Kiyo Mode

### ❌ Mistake 1: Trusting Early Waves
**Problem:** Acting on 1-2 flip pattern  
**Why it fails:** Not enough data (chance, not pattern)  
**Fix:** Wait for 3+ flips before trusting wave

### ❌ Mistake 2: Ignoring Column 1
**Problem:** Only watching Columns 2 & 3  
**Why it fails:** Column 1 is often most accurate  
**Fix:** Prioritize Column 1 predictions

### ❌ Mistake 3: Not Recognizing Breaks
**Problem:** Continuing to trust a wave after it breaks  
**Why it fails:** Pattern is dead, predictions fail  
**Fix:** Reset expectations after 1-2 breaks

### ❌ Mistake 4: Over-Complicating
**Problem:** Trying to use all 3 columns simultaneously  
**Why it fails:** Information overload  
**Fix:** Start with Column 1 only, add others gradually

---

## Advanced Kiyo Techniques

### Technique 1: Cross-Column Correlation

**Hypothesis:** If Column 1 is in a strong flip, are Columns 2/3 also flipping?

**Test:**
```
Col 1: 4 → 8 → 4 → 8 (strong flip)
Col 2: 1 → 1 → 2 → 2 (weak pattern)
Col 3: 3 → 4 → 3 → 4 (strong flip)

Observation: Columns 1 & 3 flip together.
Strategy: If Col 1 predicts flip, also expect Col 3 to flip.
```

**Use case:** Narrowing down full 3-digit prediction.

---

### Technique 2: Wave Strength Grading

**Not all waves are equal. Grade them:**

| Strength | Flips | Confidence | Reliability |
|----------|-------|------------|-------------|
| Weak | 2 | 40-50% | Don't trust |
| Moderate | 3 | 55-65% | Use cautiously |
| Strong | 4 | 70-80% | High trust |
| Perfect | 5+ | 80%+ | Max confidence |

**Strategy:** Only act on "Strong" or "Perfect" waves.

---

### Technique 3: Pattern Transition Detection

**Recognize when a wave is ENDING vs BREAKING:**

**Ending (gradual):**
```
Session: 4 → 8 → 4 → 8 → 4 → 6 → 4 → 7

Confidence: 75% → 65% → 55% (declining)
Action: Pattern is weakening. Expect transition soon.
```

**Breaking (sudden):**
```
Session: 4 → 8 → 4 → 8 → 4 → 3

Confidence: 75% → 30% (sharp drop)
Action: Pattern broken. Reset immediately.
```

---

## Kiyo Mode for Different Goals

### Goal 1: Maximize Prediction Accuracy

**Strategy:**
1. Only trust Column 1 predictions >70%
2. Ignore Columns 2 & 3 (too variable)
3. Wait for 4+ flips before committing

**Expected result:** 75-80% success rate (lower volume, higher accuracy)

---

### Goal 2: Maximize Roll Coverage

**Strategy:**
1. Lower confidence threshold to 50%
2. Use all 3 columns for full 3-digit predictions
3. Act on 3-flip waves (earlier entry)

**Expected result:** 60-65% success rate (higher volume, lower accuracy)

---

### Goal 3: Hybrid with Live Mode

**Strategy:**
1. Use Live Mode for primary prediction
2. Use Kiyo Column 1 to confirm first digit
3. Only roll when both agree

**Expected result:** 70-75% success rate (best overall balance)

---

## Real-Time Decision Trees

### Decision Tree: Should I Trust This Wave?

```
Is confidence >60%? 
├─ YES → Are there 3+ flips? 
│         ├─ YES → TRUST IT (roll based on wave)
│         └─ NO → WAIT (need more data)
└─ NO → Is this Column 1?
          ├─ YES → Consider if >50% (Column 1 is special)
          └─ NO → IGNORE (too weak)
```

---

### Decision Tree: Wave Broke, Now What?

```
Did wave break (unexpected value)?
├─ Was this the FIRST break?
│  ├─ YES → CONTINUE (1 break is recoverable)
│  └─ NO (2nd break) → RESET SESSION (pattern dead)
└─ Was confidence already declining?
   ├─ YES → EXPECTED (pattern was ending anyway)
   └─ NO → SUDDEN BREAK (bad luck, restart)
```

---

## Integration with Debug Logs

**Kiyo Mode sends detailed logs to Debug Panel:**

```
Debug Log Entry:
- Prediction: 413
- Col 1 Wave: FLIP [4, 8] (75%)
- Col 2 Wave: HOLD [1] (50%)
- Col 3 Wave: WAVE [3, 4] (65%)
- Actual: 483
- Result: Col 1 HIT ✓, Col 2 MISS ✗, Col 3 MISS ✗
```

**Use for:**
- Tracking which columns are most reliable for YOU
- Identifying personal pattern tendencies
- Refining strategies based on historical data

---

## Success Metrics for Kiyo Mode

**Track these:**

- **Column 1 Accuracy:** % of correct Column 1 predictions
- **Wave Longevity:** Average # of flips before wave breaks
- **Flip Detection Speed:** How many rolls until 60% confidence
- **Break Recovery Rate:** % of waves that recover after 1 break

**Benchmarks:**
- 🎯 Column 1 accuracy >70% = Excellent
- 🎯 Waves lasting 5+ flips = Strong RNG behavior
- 🎯 3-flip detection = Optimal speed
- 🎯 Break recovery >60% = Robust patterns

---

## Final Strategy: The Column 1 Focus Method

**Simplest, Most Effective Kiyo Strategy:**

1. **Ignore Columns 2 & 3** (at first)
2. **Only watch Column 1 waves**
3. **Wait for 4-flip pattern** (75%+ confidence)
4. **Roll when Column 1 matches desired stat**
5. **Reset after 2 breaks**

**Why it works:**
- Column 1 is most predictable
- Less cognitive load
- Higher success rate than trying to predict all 3 columns

**Once mastered, add Columns 2 & 3 for full predictions.**

---

## Quick Reference Checklist

Before using Kiyo:
- [ ] Understand difference between columns
- [ ] Know what FLIP vs WAVE vs HOLD means
- [ ] Ready to track patterns across 8+ rolls

During session:
- [ ] Focus on Column 1 first
- [ ] Wait for 3+ flips before trusting
- [ ] Compare with Live Mode for confirmation
- [ ] Reset after 2 consecutive breaks

After session:
- [ ] Review which columns were most accurate
- [ ] Note wave patterns that worked
- [ ] Refine confidence thresholds

---

**Kiyo Mode is for pattern purists. Master the waves, decode the columns, dominate the RNG.**
