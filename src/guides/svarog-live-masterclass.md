# Svarog Live Mode Masterclass

## What This Video Is About

This is the updated way to read **Live Mode** in Svarog Tracer.

The important mindset is:

- the **Main Predictor** is the **lane guide**
- the **Svarog Analyzer** is the **exact next-roll guide**

They are related, but they are **not the same job**.

---

## The Core Idea

In HSR live upgrading, we are usually not trying to hard-force one exact line every single time.

Most of the time, what the user really needs is:

1. Which **2-line lane** is safest to trust right now?
2. When is that lane about to break?
3. If I want the sharper guess, what exact next line is most likely?

That is why Live Mode now has **two layers**:

- **Main Predictor / Lane**
- **Svarog Analyzer**

---

## What "Lane" Means

The **lane** is the **trusted 2-line path** the session seems to be living on.

Example:

- Main Predictor shows `42 / 43`

That means:

- line 2 and line 3 are the safest two lines to trust right now

It does **not** mean:

- "42 is guaranteed next"

It means:

- "the session is most likely operating inside the 42/43 lane"

So when you hear me say **lane**, I mean:

- the current **commons pair**
- the safer 2-line path

---

## What Svarog Analyzer Means

The **Svarog Analyzer** is the exact-pick assistant.

Its job is:

- predict the **next exact line**
- still stay adaptive to the recent session
- use trends, frequency, momentum, recency, and pair history together

This is the more aggressive prediction.

So:

- **Main Predictor** = safe lane
- **Svarog Analyzer** = sharper exact next-roll lean

---

## Why We Split Them

Before this change, one card was trying to do two jobs at once:

- tell you the safe pair
- and also tell you the exact next line

That made the UI confusing.

Now it is cleaner:

- the top section tells you the **safe lane**
- the Svarog row tells you the **exact-line lean**

This makes the system more honest and easier to follow.

---

## How To Read The Main Predictor

The Main Predictor now focuses on:

- **Trusted Pair**
- **Pair Safety**
- **Noise Risk**
- **Break Pressure**

### 1. Trusted Pair

Example:

- `42 / 43`

This means:

- those are the 2 lines the system trusts most right now

### 2. Pair Safety

This tells you how safe the lane is.

- **Safe** = lane looks stable
- **Caution** = lane is still playable, but can break
- **Danger** = pair is fragile, break/noise is very possible

### 3. Noise Risk

This is the danger meter.

- **low %** = safer pair
- **high %** = more dangerous, pair can fail

Simple reading:

- `0-25%` = fairly safe
- `26-45%` = caution
- `46%+` = real break danger

### 4. Break Pressure

This shows the most likely value trying to break the pair.

Example:

- `Break pressure: 44`

That means:

- 44 is the main outsider trying to break the current lane

---

## How To Read Svarog Analyzer

Example:

- `Svarog Analyzer: [43] [44]`

This means:

- if I want the sharp exact guess, I look at 43 first
- and 44 is the second exact candidate

This is **not** the safe lane.

This is:

- the exact-line lean
- the riskier but sharper prediction

---

## The New Follow Guide

Live Mode now gives a simple guidance block under Svarog.

You will see one of these:

### Both Agree

This is the strongest signal.

It means:

- the lane
- and the analyzer

are pointing to the same side.

That is the best kind of confirmation.

### Follow Main Predictor

This appears when the lane is safe enough that you should trust the pair first.

Meaning:

- follow the trusted pair
- use Svarog only as a lean, not as the main decision

### Check Svarog Analyzer

This appears when the pair is fragile.

Meaning:

- the lane is no longer fully safe
- so the exact-pick assistant matters more

### Split Read

This means:

- Main Predictor = safer lane
- Svarog Analyzer = riskier exact guess

So if they disagree:

- trust the lane for safety
- trust Svarog for the sharper, riskier call

---

## What We Changed Under The Hood

We added several major improvements to Live Mode.

### 1. Pair-first design

The main predictor was pushed harder into its real role:

- predict the safer **2-line lane**
- not pretend to be a perfect exact-roll predictor

### 2. Separate Svarog Analyzer

Svarog was split into its own exact-pick path.

So now it is allowed to think differently from the lane.

That was a big change.

### 3. Better use of trends

Trend arrows are not just decoration anymore.

They now help with:

- trust
- freshness
- rising / falling pressure
- break danger

### 4. Better pair safety and noise risk

The system now tries to answer:

- "Is this lane safe?"
- "Is noise pressure building?"

instead of only showing a raw guess.

### 5. Rebalanced Svarog scoring

This was the big exact-pick redesign.

Before:

- one signal like pair history could dominate too much

Now:

- Svarog uses a more balanced blend of:
  - pair follow chance
  - 2-gram sequence support
  - frequency
  - momentum
  - recent window activity
  - absence / overdue pressure

So no single signal should bully the whole score by itself.

### 6. Better run-break handling

We also improved the run-break slice.

That matters when you get things like:

- `41 x3`
- `42 x4`
- `44 x3`

and the next roll is the awkward break.

Svarog now gives more attention to the best non-run challenger after those streaks.

---

## How To Think About Trends

Trends are one of the most important live signals.

Example:

- `41 = 20%`
- `42 = 60%`
- `43 = 0%`
- `44 = 40%`

This tells you the current pressure in the session.

Important rule:

- **pair history is not king by itself**

If history says:

- `41 -> 41 = 100%`

but the live trends and frequency say:

- `42` and `44` are much stronger

then Svarog should **not blindly pick 41** just because pair says so.

That is the exact philosophy of the redesign:

- use pair
- use trends
- use history
- use frequency
- use recent flow

and blend them

---

## The Best Way To Explain It In One Sentence

You can say this in the video:

> The Main Predictor tells me the safest 2-line lane, and Svarog Analyzer tells me the sharper exact next-line lean.

That sentence explains almost everything.

---

## Example Walkthrough

Let's say the card shows:

- Trusted Pair: `42 / 43`
- Pair Safety: `Danger`
- Noise Risk: `76%`
- Svarog Analyzer: `[43] [44]`

How do we read that?

### The lane says:

- the session mostly lives on `42 / 43`

### But danger says:

- this lane is fragile
- break risk is high

### Svarog says:

- if I want the sharper exact pick, I look at `43`
- and `44` is the dangerous follow-up

So the reading is:

- safer lane = `42 / 43`
- sharper exact lean = `43 / 44`
- because the lane is fragile, Svarog matters more here

---

## What To Follow As A User

If you want a simple rule:

### Follow Main Predictor when:

- Pair Safety is **Safe**
- or the lane still looks stable

### Lean harder on Svarog when:

- Pair Safety is **Danger**
- or the pair is visibly breaking
- or Svarog is catching the sharper exact move

### Strongest case:

When both agree.

That is the cleanest confirmation you can get.

---

## What Is Still Experimental

Svarog is improved, but it is still the experimental exact layer.

The biggest remaining weakness is usually:

- the **first break after a long run**
- or the **first awkward shift**

So when the session suddenly snaps:

- from a stable run
- into a break
- into a new common

that first exact call is still the hardest one.

The lane is usually more stable there.

Svarog is usually more aggressive there.

That is why both layers still matter.

---

## Best Video Closing

If you want a clean ending for the video, say:

> Use the Main Predictor for the safe 2-line lane. Use Svarog Analyzer for the sharper exact next-roll guess. If both agree, that is your strongest signal.

---

## Short Version

- **Lane** = safest 2-line path
- **Svarog** = sharper exact next-line guess
- **Noise Risk high** = pair is dangerous
- **Break Pressure** = which outsider is trying to break the lane
- **Both agree** = strongest signal
- **Main Predictor** = safer
- **Svarog Analyzer** = sharper but more volatile
