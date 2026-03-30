# Svarog Playground Plan

## Goal

The Playground should be where users stop being taught and start getting reps.

Tutorial teaches:
- how to read Svarog
- how to use setup relics
- how Caesar shift helps

Playground should train:
- speed
- recognition
- decision making
- confidence under uncertainty

It should feel like a practice arena, not a wiki page.

---

## Core Direction

The best split is:

- `Tutorial`
  - scripted
  - guided
  - fixed lessons

- `Playground`
  - repeatable
  - scoreable
  - semi-open
  - good for progression later

Playground is also the better place for:
- login
- badges
- streaks
- profile progress
- ranked or social features later

So yes: rewards should live here, not in tutorial.

---

## Recommended Main Modes

### 1. Free Mode

This is the sandbox.

Purpose:
- let players mess around
- practice without punishment
- test line forcing ideas
- learn by repetition

What it should allow:
- generate random relic
- reroll relic
- swap substat positions
- optionally tweak line order
- optionally swap roll seed to easier or harder flow
- add setup relics beside the target relic
- upgrade step by step
- reset at any point

What makes it good:
- no failure state
- no score pressure
- fast reps
- ideal for beginners and casual users

Best audience:
- beginners
- returning users
- players testing weird setups

---

### 2. Challenge Mode

This is the real practice ladder.

Purpose:
- give users targeted training
- force them to solve patterns
- scale from easy to hard

How it should work:
- relic + predictor state are generated from curated scenarios
- each challenge has:
  - goal
  - limited resets or no limit depending on difficulty
  - clear success condition
- user solves it alone

Example goals:
- hit dual crit
- mono SPD
- avoid junk drift
- choose the correct setup relic
- know when to trust main vs Svarog

Difficulty tiers:
- Easy
- Medium
- Hard
- Chaos

Best audience:
- intermediate
- advanced
- users who want “real” practice instead of sandboxing

---

## Recommended Additional Modes

### 3. Beginner Drills

This is a softer bridge between Tutorial and full Challenge Mode.

Purpose:
- train one skill at a time
- shorter reps
- lighter pressure

Examples:
- read commons vs noise
- identify whether direct path is bad
- choose between main predictor and Svarog
- pick the correct setup relic
- read Caesar shift result

Format:
- short micro-scenarios
- 1 decision or 1 upgrade at a time
- instant feedback

Why this mode helps:
- some users will finish Tutorial but still be too weak for full challenge scenarios
- this gives them bite-sized reps

Best audience:
- beginners
- users who “sort of get it” but are not stable yet

---

### 4. Pattern Lab

This is for focused study, not just solving.

Purpose:
- isolate one pattern type
- let user practice that one thing repeatedly

Pattern packs:
- Caesar shift practice
- line 3 forcing
- line 2 re-force loops
- noise-break reading
- run-break reading
- common-vs-noise judgment
- Svarog vs Main disagreement

Format:
- choose a pattern pack
- get repeated scenarios from that family

Why it matters:
- some users don’t want broad random practice
- they want to fix one weakness

Best audience:
- intermediate
- veterans fixing weak spots

---

### 5. Veteran Trials

High-pressure mode.

Purpose:
- test fast judgment
- punish bad reads
- reward consistency

Rules ideas:
- limited hints
- limited resets
- timed decisions
- streak system
- harder/noisier scenarios

This should feel like:
- ranked training
- difficult exam mode

Best audience:
- advanced
- veteran
- leaderboard-type users

---

## Best Final Structure

If keeping it simple at first, launch with:

1. `Free Mode`
2. `Challenge Mode`
3. `Beginner Drills`

Then later add:

4. `Pattern Lab`
5. `Veteran Trials`

That gives good coverage without overbuilding version one.

---

## Suggested Difficulty Ladder

### Beginner

Good modes:
- Tutorial
- Free Mode
- Beginner Drills

Focus:
- understand line control
- basic predictor reading
- setup relic usage

### Intermediate

Good modes:
- Challenge Mode
- Pattern Lab

Focus:
- decision quality
- reading uncertainty
- recognizing repeat patterns

### Advanced / Veteran

Good modes:
- Hard Challenge Mode
- Veteran Trials
- later ranked/social modes

Focus:
- consistency
- speed
- low-hint solving
- noisy sessions

---

## Free Mode Detailed Notes

Your current idea is good.

Recommended controls:
- `Generate Relic`
- `Reroll`
- `Swap Sub Positions`
- `Adjust Seed`
- `Reset Scenario`
- `Add Setup Relic`
- `Toggle Hints`

Optional later controls:
- choose target goal:
  - dual crit
  - mono SPD
  - avoid junk
- choose relic starting type:
  - 1-line
  - 2-line
  - 3-line
  - 4-line
- choose prediction pressure:
  - easy
  - normal
  - chaotic

Seed control idea:
- don’t expose raw technical seed text only
- use labels like:
  - `Stable`
  - `Mixed`
  - `Chaotic`
  - `Break-heavy`

This is easier for users to understand.

---

## Challenge Mode Detailed Notes

Recommended structure:

- challenge card at top:
  - goal
  - difficulty
  - attempts
  - success condition

- player sees:
  - live predictor
  - target relic
  - setup relics

- optional:
  - hint lamp
  - score/stars

Scoring could include:
- correct solve
- number of mistakes
- number of resets
- hints used
- speed

Example star system:
- 3 stars:
  - solved clean
  - no hint
  - few resets
- 2 stars:
  - solved with one hint or extra reset
- 1 star:
  - solved, but messy

That gives challenge mode replay value.

---

## Beginner Drills Detailed Notes

Possible drill categories:

### Read Drill
- show predictor
- ask:
  - which side is commons?
  - which value is noise?

### Decision Drill
- ask:
  - trust main or Svarog?

### Setup Drill
- ask:
  - which relic should be used to force the next line?

### Caesar Drill
- ask:
  - where does 42 / 43 land from this current line?

These could be very short and addictive.

---

## Pattern Lab Detailed Notes

Suggested packs:

- `Force Line 3`
- `Force Line 2`
- `Re-force Loop`
- `Noise Break`
- `Watch Message Practice`
- `Main vs Svarog Split`
- `Sequence Reading`

This mode is probably one of the strongest long-term ideas.

It makes the site feel serious and skill-based instead of random.

---

## Veteran Trials Detailed Notes

Ideas:

- 5 scenarios in a row
- no full guide
- maybe only one hint total
- timer pressure
- one fail can break streak

This mode should come later, but it is the cleanest advanced endpoint.

---

## Hints Philosophy

Playground hints should be lighter than Tutorial.

Tutorial says:
- do this
- now do this

Playground hints should say:
- check this area
- think about this pattern
- are you sure this path helps your target relic?

That keeps challenge modes from becoming hand-holding.

---

## Progression Ideas For Later

This is where login becomes valuable.

Good future additions:
- saved progress
- best scores
- challenge clears
- badges
- pattern mastery
- streak tracking
- profile stats

Examples:
- `Dual Crit Apprentice`
- `Noise Break Reader`
- `Caesar Shift Adept`
- `Mono SPD Veteran`

This is a better home for rewards than Tutorial.

---

## PVP Thoughts

PVP can work, but not as version one.

It should come later after solo practice feels good.

Best PVP ideas:

### 1. Solve Race
- 2 to 4 players
- same scenario
- first to solve correctly wins

### 2. Prediction Duel
- players see the same board
- choose next move
- score by correctness over several rounds

### 3. Draft Challenge
- each player gets limited setup options
- best solve wins

The easiest future PVP mode is:
- `same scenario, fastest correct solve`

That is much easier to explain and build than full live multiplayer manipulation logic.

So my recommendation:
- keep PVP as future phase
- focus now on making solo modes very strong

---

## Recommended V1 Playground Launch

### Launch with:
- `Free Mode`
- `Challenge Mode`
- `Beginner Drills`

### Add later:
- `Pattern Lab`
- `Veteran Trials`
- login rewards
- social / PVP

This is the most realistic and strongest path.

---

## My Overall Opinion

The best identity for Playground is:

`Svarog Training Grounds`

Not just random relic rolling.
Not just a toy simulator.

It should feel like:
- a practice arena
- a skill trainer
- a progression space

If Tutorial teaches the language, Playground should build mastery.
