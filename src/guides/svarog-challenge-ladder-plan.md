# Svarog Challenge Ladder Plan

This file defines the first real Challenge Mode ladder.

The point of Challenge Mode is not to feel random like Free Mode.
It should feel like a fixed LeetCode-style contract:

- one static scenario
- one fixed target relic
- one fixed setup relic path
- one fixed starter history
- one clear success condition
- one hint ladder that reacts to where the player got stuck

## Core Rules

Every challenge in the first ladder should follow these rules:

1. Static seed
- no 5-minute live seed rollover
- no mood switching
- no rerolling the target relic into a new shape

2. Fixed relics
- target relic substats are predefined
- target relic order is locked
- setup relic shape is predefined
- force relic type is predefined when needed

### Main stat rule
- main stat does not matter to Svarog line manipulation the way substats do
- main stat cannot be one of the substats
- main stat should never duplicate a substat on the same contract relic
- for challenge clarity, prefer neutral main stats like:
  - `FLAT HP`
  - `FLAT ATK`
  - or another non-conflicting main stat

Do not build contract wording around the main stat unless the challenge is explicitly about relic value, not line manipulation.

3. Fixed starter history
- preload at least 6 translated rolls so the predictor has a real read
- beginner/intermediate contracts should never open on an empty predictor

4. Clear success wording
- success text must match the actual target relic shape
- do not say "dual crit" if the relic only has one crit side worth chasing
- define exactly what counts as success:
  - mono-line
  - dual-crit
- avoid junk
- correct detour usage

### Success wording rule
- if the mission says `dual crit`, the relic must actually contain:
  - `CRIT RATE`
  - `CRIT DMG`
as substats
- if only one crit sub exists, the contract should say:
  - `favor the crit side`
  - `land repeated hits on CRIT DMG`
  - `avoid junk-heavy finish`
and not `dual crit`

5. Hint escalation
- no full tutorial overlay like Stage 1
- hints should be tied to where the player is stuck:
  - before +6
  - before +9
  - before +12
  - before +15
  - repeated wrong resets
  - repeated direct-path brute force

## Ladder Structure

The first ladder should have 5 contracts:

1. Easy 01: Clean Detour
2. Easy 02: Do Not Trust Direct Pair
3. Medium 01: Split Signals
4. Medium 02: Re-force Discipline
5. Hard 01: Noise Wins Late

Difficulty should rise by:

- cleaner lanes -> mixed lanes -> split reads -> repeated re-force -> high-noise finish

## Contract 01

### Name
Easy 01: Clean Detour

### Purpose
Teach the player that a readable pair is not automatically good for the target relic, while still making the first contract rewarding and readable.

### Seed Style
- static
- easy
- dominance / recovery flavor
- starter history already shows a readable pair

### Starter History
- 6 translated rolls minimum
- should be enough to show a stable or readable commons pair immediately

### Target Relic
- Main stat: `FLAT HP`
- Lines:
  - `CRIT RATE`
  - `CRIT DMG`
  - `EFF RES`
  - `BREAK EFFECT` on +3

### Intended Lesson
- direct upgrades look tempting
- clean path comes from using the setup relic first

### Success Condition
This one can be a real dual-crit mission.

Correct success wording:
- `Finish with at least 2 combined hits into CRIT RATE and CRIT DMG.`

Preferred stronger wording:
- `Solve the contract by turning the readable pair into a dual-crit finish instead of drifting into EFF RES / BREAK EFFECT.`

### Failure Feel
- brute forcing should still produce a relic
- but not the contract relic

### Hint Ladder
- Hint 1:
  - `The live pair is readable, but ask whether your target relic actually likes where that pair lands.`
- Hint 2:
  - `One setup detour changes the practical line before you return here.`
- Hint 3:
  - `Use the setup relic before taking the next target upgrade.`

## Contract 02

### Name
Easy 02: Do Not Trust Direct Pair

### Purpose
Show a contract where the commons pair is readable but one side is still junk.

### Seed Style
- static
- easy to medium
- readable commons pair with one dangerous break side

### Starter History
- 6 to 8 translated rolls
- enough to show:
  - commons pair
  - one warning/noise side

### Target Relic
- Main stat: `FLAT ATK`
- Lines:
  - `CRIT RATE`
  - `CRIT DMG`
  - `EFF RES`
  - fourth line on +3

### Success Condition
- `Land at least 2 combined hits on CRIT RATE and CRIT DMG while avoiding a junk-heavy finish.`

### Hint Ladder
- Hint 1:
  - `Check the warning line before you trust the pair.`
- Hint 2:
  - `One side of the pair is fine. The other side is the trap.`
- Hint 3:
  - `Detour first, then come back.`

## Contract 03

### Name
Medium 01: Split Signals

### Purpose
Teach the player to handle when Main Predictor and Svarog do not point the same way.

### Seed Style
- static
- medium
- mixed session with split reads

### Starter History
- 7 to 9 translated rolls
- enough to make:
  - Main Predictor favor one read
  - Svarog lean toward another

### Target Relic
- Main stat: `FLAT HP`
- Lines:
  - `CRIT RATE`
  - `CRIT DMG`
  - `SPD`
  - `EFF RES`

### Success Condition
- `Make the correct read at the split and finish with a crit-favored relic.`

### Start State
- start this contract as a 4-liner
- no +3 add-sub step needed

### Hint Ladder
- Hint 1:
  - `This contract is not solved by pair reading alone.`
- Hint 2:
  - `Open Advanced Mode and compare trends against the warning line.`
- Hint 3:
  - `When Main and Svarog split, use the deeper read instead of autopiloting commons.`

## Contract 04

### Name
Medium 02: Re-force Discipline

### Purpose
Teach repeated setup discipline instead of one-and-done forcing.

### Seed Style
- static
- medium to hard
- path looks solved after first success, then drifts

### Starter History
- 6 to 8 translated rolls
- enough to suggest a safe opening, but not a safe finish

### Target Relic
- Main stat: `FLAT ATK`
- Lines:
  - `FLAT ATK`
  - `FLAT HP`
  - `SPD`
  - `EFFECT HIT RATE` on +3

### Success Condition
- `Mono-line SPD by re-forcing the correct line before each required follow-up upgrade.`

### Note
- mono-line contracts are harder than dual-crit contracts
- do not place these before the player has already cleared easier dual-crit and split-read scenarios

### Hint Ladder
- Hint 1:
  - `The first good hit does not mean the rest of the path stays good.`
- Hint 2:
  - `If you do nothing after the first success, the path drifts.`
- Hint 3:
  - `Use the force relic again before the next upgrade.`

## Contract 05

### Name
Hard 01: Noise Wins Late

### Purpose
Stress the stronger engine on a late noisy finish where trusting commons blindly fails.

### Seed Style
- static
- hard
- late noise pressure
- challenge should feel fair, not random

### Starter History
- 8 to 10 translated rolls
- enough to create:
  - believable commons
  - believable late-session break pressure

### Target Relic
- Main stat: `FLAT HP`
- Lines:
  - `CRIT RATE`
  - `CRIT DMG`
  - `Effect Hit Rate`
  - `BREAK EFFECT`

### Success Condition
- `Read the late-session noise correctly and finish with a crit-favored result instead of trusting stale commons.`

### Start State
- start this contract as a 4-liner
- no +3 add-sub step needed

### Hint Ladder
- Hint 1:
  - `The lane that was safe earlier may not be safe now.`
- Hint 2:
  - `Check break pressure and noise risk before your final commit.`
- Hint 3:
  - `This finish is solved by reading the noise side, not by reusing the earlier safe lane.`

## Hint System Rules

Hints should be tied to progression state, not random button presses.

### Track these checkpoints
- before +6
- before +9
- before +12
- before +15
- after wrong setup action
- after wrong direct upgrade
- after repeated resets

### Escalation
- first hint:
  - small nudge
- second hint:
  - points at predictor area or setup logic
- third hint:
  - almost gives the move

### Important
Hints should say:
- what to look at
- why it matters
- what kind of mistake the player is making

Do not jump straight to:
- `click this button`

unless the final hint tier is reached.

## UI Direction

Challenge page should stay visually close to Free Mode because the workspace is already good.

But Challenge Mode should clearly add:

- contract title
- difficulty tag
- mission goal
- win condition
- mistake counter
- hint button
- seed label
- result banner:
  - clear
  - failed
  - still in progress

## Build Order

1. Freeze Contract 01 properly
- fixed relics
- fixed starter history
- fixed success wording
- fixed hint ladder

2. Add contract config system
- each challenge defined by one scenario object

3. Add contract selector
- Easy 01
- Easy 02
- Medium 01
- Medium 02
- Hard 01

4. Add success/failure evaluation
- based on actual target relic result

5. Add level-based hints
- tied to the player’s current stuck point

## Important Warning

Do not randomize challenge contracts yet.

First make 5 strong handcrafted contracts.

Only after those feel good should we consider:
- generate contract button
- rotating challenge seeds
- custom challenge maker
