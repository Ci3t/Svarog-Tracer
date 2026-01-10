# Warp Analyzer - Advanced Guide

## What is Warp Analyzer?

Warp Analyzer is Svarog Tracer's **gacha history analysis tool**. Unlike relic modes (Live/Kiyo/Long String), Warp Analyzer processes your **Warp/Banner pull history** to reveal:
- Pity tracking across all banners
- 50/50 win/loss patterns
- Early pull statistics
- Constellation/Eidolon progression
- Cross-banner luck analysis

**Core Purpose:** Understand your gacha luck, plan pulls strategically, and track long-term trends.

---

## Data Import Methods

### Method 1: SRGF Format (Recommended)

**What is SRGF?**
- **StandardReliableGenshinFormat** (works for HSR too)
- JSON format used by community tools
- Includes full pull history with timestamps

**How to get it:**
1. Use StarRailStation or HoYoLab export tools
2. Download your warp history as `.json`
3. Click "Import SRGF" in Warp Analyzer
4. Upload file

**Advantages:**
- ✅ Most complete data (all banner types)
- ✅ Preserves timestamps
- ✅ Works across patches
- ✅ Community standard format

---

### Method 2: Manual CSV Import

**When to use:**
- Custom tracking spreadsheet
- Partial history (specific banners only)
- Testing scenarios

**Required columns:**
```
Time, Name, Type, Rarity, Pity, Banner
```

**Example:**
```csv
Time,Name,Type,Rarity,Pity,Banner
2025-01-09 14:32,Jingliu,Character,5,73,Character Event
2025-01-09 14:31,Tingyun,Character,4,12,Character Event
```

---

## Understanding Pity Systems

### Hard Pity vs Soft Pity

**Hard Pity:**
- **Character Banner:** 90 pulls (guaranteed 5★)
- **Light Cone Banner:** 80 pulls (guaranteed 5★)
- **Standard Banner:** 90 pulls (guaranteed 5★)

**Soft Pity (Rate-Up Zone):**
- **Starts at:** Pull 73-75
- **Rate increase:** ~6% → 32.4% (gradual)
- **Peak:** Pull 80+ (~60% per pull)

**Strategy:**
- Plan pulls to hit soft pity (73+)
- Avoid pulling past 80 unless you WANT the character
- Use soft pity knowledge to stop early or commit

---

### The 50/50 System

**Character Event Banner:**
- **First 5★:** 50/50 chance (Limited vs Standard)
- **If you LOSE:** Next 5★ is guaranteed Limited
- **If you WIN:** Next 5★ is another 50/50

**Tracking:**
```
Pull 1-75:   Jingliu (WON 50/50)
Pull 76-80:  Pela (4★)
Pull 81-158: Blade (LOST 50/50, got Gepard)
Pull 159:    Next is GUARANTEED Limited
```

**Warp Analyzer shows:**
- Current guarantee status (50/50 vs Guaranteed)
- Historical win/loss rate
- Longest win/loss streaks

---

## Reading Your Stats

### Overview Section

```
📊 OVERALL STATS
Total Pulls: 843
5★ Pulls: 12
4★ Pulls: 87
Average Pity (5★): 68.3
```

**Analysis:**

1. **Total Pulls:** Your investment level
   - <500 pulls = Casual
   - 500-1500 = Regular
   - 1500+ = Dedicated

2. **5★ Count:**  
   - Compare to expected: Total ÷ 90 = Expected 5★
   - 843 ÷ 90 = 9.4 expected
   - You got 12 = **Lucky** (+2.6 above expected)

3. **Average Pity:**
   - 68.3 = Excellent (below soft pity)
   - <70 = Lucky
   - 70-80 = Average
   - 80+ = Unlucky

---

### 50/50 Analysis

```
📈 50/50 RECORD
Wins: 7 (58%)
Losses: 5 (42%)
Win Streak: 3
Loss Streak: 2
```

**What this means:**

- **58% win rate:** Above expected (50%)
- **Longest win streak (3):** You're capable of hot streaks
- **Longest loss streak (2):** You haven't hit brutal bad luck

**Strategic implications:**
- If currently on loss streak → Guarantee is coming
- If on win streak → Expect regression to mean (loss incoming)
- Use streaks to plan limited character pulls

---

### Early Pull Tracker

```
🎲 EARLY PULLS (under 60 pity)
5★ Early Pulls: 4 (33% of all 5★)
Earliest: 8 pity (Bronya!)
```

**Analysis:**

- **33% early rate:** High luck (expected ~20-25%)
- **Pull 8 Bronya:** Jackpot pull (0.6% chance)

**Strategy:**
- If you have high early pull rate → Consider "yolo pulls" (risky but rewarding)
- If low early rate (0-10%) → Hoard for guaranteed soft pity

---

## Advanced Banner Strategies

### Character Event Banner Planning

**Scenario 1: Saving for Must-Pull**

```
Current status:
- Pity: 12
- Guarantee: NO (50/50)
- Pulls saved: 84

Target: Firefly (3 patches away)

Analysis:
- Need 90 pulls worst case (if lose 50/50)
- Need 180 pulls absolute worst (lose + go to pity)
- Have 84 → Need 96 more for safety

Strategy: Skip next 2 banners, hoard to 180.
```

---

### Scenario 2: Should I Pull Now or Wait?

```
Current status:
- Pity: 67 (near soft pity!)
- Guarantee: YES
- Current banner: Ruan Mei (want)
- Next banner: Kafka (want more)

Analysis:
- 67 pity → Likely 5★ in next 10-20 pulls
- Guaranteed, so WILL get Ruan Mei
- If pull now, reset pity to 0 for Kafka → May need 90 pulls

Decision tree:
├─ Really want Ruan Mei? → Pull now (low cost: 10-20)
└─ Kafka is priority? → SKIP, save guarantee for her
```

**Pro tip:** High pity + Guarantee = Most valuable pull state. Use wisely.

---

### Light Cone Banner Optimization

**Key differences from Character Banner:**
- 80 hard pity (not 90)
- 75/25 system (not 50/50)
- Soft pity starts at ~65

**Strategy:**
```
Question: Should I pull on LC banner?

Consider:
├─ Is this LC BiS (Best in Slot) for a core DPS?
│  ├─ YES → Worth considering
│  └─ NO → Skip (4★ alternatives exist)
├─ Do I have the character?
│  ├─ NO → Skip (get character first)
│  └─ YES → Continue
└─ Do I have 240 pulls saved? (guaranteed x3 pity)
   ├─ NO → Too risky (might not get it)
   └─ YES → Safe to pull
```

**Warp Analyzer shows:**
- LC banner pull history
- 75/25 win/loss rate
- Average pity per LC

---

## Cross-Banner Luck Analysis

### Luck Distribution Insights

**Warp Analyzer reveals:**

```
📊 BANNER BREAKDOWN
Character Event: 12 pulls, 68.3 avg pity (Lucky)
Light Cone:      5 pulls,  74.8 avg pity (Average)
Standard:        3 pulls,  82.1 avg pity (Unlucky)
```

**Observation:** You're lucky on Character banners, unlucky on Standard.

**Strategy:**
- Focus pulls on Character Event (your luck pool)
- Minimize Standard pulls (only use free tickets)
- LC banner is average → Only pull for must-have

---

### Temporal Luck Patterns

**Question:** Does luck change over time?

**Test with Warp Analyzer:**
1. Export pull history CSV
2. Split by patch (3.6, 3.7, 3.8, etc.)
3. Calculate avg pity per patch
4. Look for patterns

**Example findings:**
```
Patch 3.6: 72 avg pity
Patch 3.7: 65 avg pity ← Lucky patch!
Patch 3.8: 78 avg pity
Patch 3.9: 69 avg pity
```

**Possible insight:** Patch .7 (mid-version) might have better rates for YOU (could be RNG, but worth noting).

---

## Constellation/Eidolon Tracking

**What Warp Analyzer tracks:**
- Which characters you have (and at what eidolon)
- Cost per eidolon (pulls invested)
- Efficiency (pulls per copy)

**Example:**
```
🌟 JINGLIU
E0 → E1: 73 pulls
E1 → E2: 158 pulls (lost 50/50)
E2 → E3: 15 pulls (early!)

Total: 246 pulls for E3
```

**Analysis:**
- E2 was expensive (lost 50/50)
- E3 was cheap (got lucky)
- **Decision:** Stop at E3? Or push for E6?

**Cost projection:**
- E3 → E6 = 3 more copies
- Expected: 90 × 3 = 270 pulls
- With 50/50 losses: ~400 pulls

**Strategy:** Only chase eidolons if:
- You love the character
- You have 400+ pulls saved
- You're okay with "wasted" pulls

---

## Tracking Standard Banner 5★ Selector

**Standard Banner has pity selector at 300 pulls:**

**Warp Analyzer helps:**
- Count total Standard pulls
- Calculate distance to 300
- Show which standard 5★ you're missing

**Example:**
```
Standard Banner Progress: 187 / 300
Missing: Bronya, Gepard, Himeko

Strategy: 
- Need 113 more pulls
- Plan to select Bronya (meta support)
- Only use free Standard tickets (no jade spending)
```

---

## Efficiency Metrics

### Pulls Per 5★ (PP5)

**Formula:** Total Pulls ÷ Total 5★ Obtained

**Benchmarks:**
- <70 PP5 = Extremely lucky (top 10%)
- 70-75 PP5 = Lucky (top 30%)
- 75-80 PP5 = Average
- 80-85 PP5 = Unlucky
- 85+ PP5 = Extremely unlucky (bottom 10%)

**Use case:** Comparing your luck to friends/community

---

### Jade Efficiency

**Calculation:**

```
Total 5★: 12
Total Pulls: 843
Pull cost: 160 jade each
Total jade spent: 843 × 160 = 134,880

Jade per 5★: 134,880 ÷ 12 = 11,240 jade
```

**Benchmarks:**
- <11,000 jade per 5★ = Efficient
- 11-13k jade per 5★ = Average
- 13k+ jade per 5★ = Inefficient

**Strategy:** If you're inefficient, consider:
- Saving for guarantees (less 50/50 risk)
- Skipping LC banners
- Only pulling meta characters

---

## Common Mistakes & Traps

### ❌ Mistake 1: Chasing 4★ Characters

**Problem:** "I want Yukong, I'll pull until I get her"

**Why it fails:**
- 4★ rate-up is NOT guaranteed
- Can go 100+ pulls without rate-up 4★
- May accidentally get 5★ you don't want

**Fix:** Wait for 4★ to appear in shop or events

---

### ❌ Mistake 2: Ignoring Pity Count

**Problem:** "I'll do 10 pulls for fun" at 75 pity

**Why it fails:**
- Soft pity starts at 73
- 10 pulls = ~60% chance of 5★
- May get unwanted character, ruining guarantee

**Fix:** Track pity religiously, never "casual pull" near soft pity

---

### ❌ Mistake 3: Pulling on Standard with Jade

**Problem:** "I want Bronya, she's on Standard"

**Why it fails:**
- No rate-up (spread across 7 characters + 5 LCs)
- Average cost: ~1500 pulls to target specific Standard 5★
- Massive jade waste

**Fix:** Only use free Standard tickets, wait for selector at 300

---

### ❌ Mistake 4: Not Planning for Reruns

**Problem:** Spending all pulls on new Limited, missing rerun

**Why it fails:**
- Reruns can happen 3-6 months later
- If you miss, next rerun could be 12+ months
- FOMO causes poor resource management

**Fix:** Save 180 pulls minimum after getting a Limited (insurance for next target)

---

## Advanced Strategies

### Strategy 1: The "Guarantee Hoarding" Method

**Philosophy:** Never pull without guarantee

**Rules:**
1. Only pull when you have 180 pulls saved
2. Skip all 50/50 situations
3. Wait for guarantee after every Limited

**Pros:**
- Zero risk of missing target Limited
- Always get what you want
- Reduces gacha anxiety

**Cons:**
- Pull less frequently
- Miss some "lucky" characters
- May skip strong supports

**Who it's for:** F2P, low spenders, risk-averse players

---

### Strategy 2: The "Soft Pity Sniper" Method

**Philosophy:** Maximize early pull chances

**Rules:**
1. Pull until 73 pity on every banner
2. Stop immediately at soft pity if no 5★
3. Restart on next banner

**Pros:**
- May get lucky early pulls
- Exposes you to more 5★ opportunities
- Fun (more pulling)

**Cons:**
- High 50/50 loss risk
- May not accumulate guarantees
- Can be jade-inefficient

**Who it's for:** Dolphins (moderate spenders), thrill-seekers

---

### Strategy 3: The "Meta-Chaser" Method

**Philosophy:** Only pull top-tier meta

**Rules:**
1. Research character rankings (Prydwen, community)
2. Only pull S+ tier characters
3. Skip A/B tier even if you like them

**Pros:**
- Strongest account (efficiency)
- Clear pulling decisions (less FOMO)
- Fewer pulls wasted

**Cons:**
- Miss fun/favorite characters
- Meta shifts (yesterday's S+ is tomorrow's A)
- Less enjoyment (waifu/husbando > meta)

**Who it's for:** Competitive players, endgame focused

---

## Warp Analyzer as a Planning Tool

### 6-Month Pull Forecast

**Use historical data to predict future capacity:**

```
Past 6 months income:
- Monthlies: 10 pulls/month × 6 = 60 pulls
- Events: ~15 pulls/month × 6 = 90 pulls
- Exploration: 20 pulls (one-time)
- Total: 170 pulls earned

Future 6 months forecast: ~170 pulls
Current saved: 84 pulls
Total available: 254 pulls

Upcoming Limited characters:
- Firefly (want: YES)
- Aventurine (want: MAYBE)
- Acheron rerun (want: NO)

Plan:
- Firefly: 180 pulls (guaranteed)
- Remaining: 74 pulls
- Decision: Skip Aventurine (not enough for guarantee)
```

---

### Whale Investment Analysis

**For spenders: Track cost-per-5★**

```
Total spent: $800
Total 5★: 23
Cost per 5★: $34.78

Compare to:
- Monthly Pass only: ~$50 per 5★
- Welkin + BP: ~$40 per 5★
- Random top-ups: ~$60 per 5★

Insight: You're spending efficiently (below random top-up rate)

Optimization: Switch to Monthly Pass for better value?
```

---

## Integration with Other Modes

**Warp Analyzer doesn't directly affect relic rolling, but:**

### Synergy 1: Character Roster Awareness

**Before rolling relics, check Warp Analyzer:**
- Which characters do you OWN?
- Which sets do they need?
- Prioritize relic farming based on owned characters

---

### Synergy 2: LC Ownership Tracking

**Use Warp Analyzer to remember:**
- Which signature LCs you have
- Which characters need LC upgrades
- Whether to farm relic or save for LC

---

## Debugging Import Issues

**If import fails:**

### Issue 1: "Invalid SRGF format"
**Fix:**
- Ensure JSON is valid (use JSONLint validator)
- Check required fields exist (gacha_id, time, name, item_type)
- Re-export from source tool

### Issue 2: "Partial data imported"
**Fix:**
- Game API limits history to 6 months
- Use multiple exports if you need older data
- Manually merge JSON files

### Issue 3: "Pity count wrong"
**Fix:**
- Import FULL history (all banners)
- Warp Analyzer auto-calculates pity from sequence
- Missing pulls cause pity desync

---

## Final Strategy: The Resource Management Framework

1. **Monthly budgeting:**
   - Free pulls: ~15/month
   - Monthly Pass: +10/month
   - Events: +10/month
   - **Total: ~35 pulls/month F2P**

2. **6-month targets:**
   - 35 × 6 = 210 pulls
   - Enough for 1 guaranteed Limited + buffer

3. **Pulling rules:**
   - Never pull without 180 saved
   - Track pity every 10 pulls
   - Stop at soft pity if not targeting

4. **Review cadence:**
   - Check Warp Analyzer monthly
   - Compare vs forecast
   - Adjust plans based on luck trends

---

## Quick Reference Checklist

Before every banner:
- [ ] Check current pity (Character + LC)
- [ ] Confirm guarantee status
- [ ] Calculate pulls to soft pity
- [ ] Review 6-month forecast
- [ ] Decide: Pull now or skip?

After every 10-pull:
- [ ] Update Warp Analyzer (import new data)
- [ ] Recalculate pity
- [ ] Check if you hit 5★
- [ ] Adjust forecast

Monthly review:
- [ ] Calculate this month's pull income
- [ ] Update 6-month forecast
- [ ] Reassess upcoming Limited priorities
- [ ] Review luck trends (getting better/worse?)

---

**Warp Analyzer turns gacha gambling into strategic resource management. Plan, track, optimize.**
