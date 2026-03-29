# Svarog Tutorial + Playground Plan

## Goal

Build a proper onboarding flow for new players who do not understand:

- how to use Svarog Live Mode
- how to read the Main Predictor
- how to read Svarog Analyzer
- how to read commons / noise / risk
- how Caesar Shift works
- how to force lines using a 2-line or 3-line relic before going to the real target relic

This is **not** a basic HSR relic tutorial.

Players already know:

- what a relic is
- what main stat is
- what substats are

The tutorial should teach:

- how to use the site
- how to manip
- how to force a line in a real practical way

---

## Product Structure

Use **2 pages**:

1. `/tutorial`
2. `/playground`

Do **not** heavily change the real Live page.

Optional lightweight onboarding on main page:

- a small first-time banner or link
- text like: `New to Svarog? Start the Tutorial`
- dismissible with localStorage

No full Joyride on the real Live page.

Reason:

- keeps the real page clean for experienced users
- avoids overloading the main predictor UI
- keeps onboarding in one dedicated place

---

## Page 1: `/tutorial`

## Purpose

A **fully scripted, guided training flow** that teaches the player how to use Svarog and how to manip with line forcing.

This page should feel like:

- a training version of Live Mode
- a controlled scenario
- a step-by-step manip lesson

The tutorial should be **scripted**, not random.

Reason:

- the explanation must always match the result
- Caesar Shift examples must be predictable
- new players need guided learning, not sandbox confusion

---

## Tutorial Core Concept

The player learns this practical flow:

1. read the live predictor
2. identify the current commons pair
3. inspect the target relic line positions
4. realize direct upgrading is bad
5. use a side relic to force a line
6. apply Caesar Shift understanding
7. return to the target relic
8. upgrade with a better mapped pair

This is the heart of the tutorial.

---

## Tutorial Layout

The tutorial page should have **3 core panels**.

### 1. Live Predictor Panel

A simplified training version of the real live page.

Include only the important parts:

- session timer
- roll input
- history / record list
- Main Predictor card
- Svarog Analyzer card
- helper line / stats line
- Caesar Shift helper area

This panel teaches:

- how to read the page
- what the predictions mean
- how to follow the live state

### 2. Target Relic Panel

This is the relic the player actually wants to manip.

Show:

- main stat
- sub lines
- line numbers
- highlighted target lines

This panel teaches:

- whether the current commons pair is good or bad for the target relic
- why line mapping matters

### 3. Setup Relic Panel

This is the force-line relic.

Use:

- 2-line relic
- 3-line relic

Allow:

- add sub
- simulate line creation
- show how line mapping shifts

This panel teaches:

- how to force line 3
- how Caesar Shift changes what the commons pair lands on

---

## Tutorial Chapters

Use 3 scripted chapters.

### Chapter 1: Read the Live State

Goal:

- teach the player how to read the important live page parts in one clear lesson

Focus:

- timer
- roll input
- history
- Main Predictor
- Svarog Analyzer
- commons
- noise
- noise risk
- break pressure
- helper line

Use a fixed scenario where:

- commons are something like `42 / 43`
- noise pair is `41 / 44`
- predictor shows a mixed but teachable state

What the player should learn:

- Main Predictor = safer pair guidance
- Svarog Analyzer = sharper exact next-line lean
- commons = active safe pair
- noise = pair breakers / danger side
- history and current live state matter

### Chapter 2: Why Direct Upgrade Is Wrong

Goal:

- teach the player why a normal direct upgrade can land on the wrong lines

Use the target relic to show:

- current line order
- current commons pair
- which lines the commons pair would hit right now
- why that is bad for the player’s goal

This chapter should answer:

- why not just click upgrade on the target relic?
- why do line positions matter more than stat names?

### Chapter 3: Caesar Shift and Force-Line Logic

Goal:

- teach the practical manip logic

Use a specific scripted example:

- commons = `42 / 43`
- target relic lines:
  - `1 = CRIT RATE`
  - `2 = CRIT DMG`
  - `3 = EFF RES`
  - `4 = BREAK EFFECT`

Explain:

- if player upgrades directly, current pair can land on the wrong lines
- so instead, use a purple relic / low-line relic first
- add a sub to force a specific line structure
- this changes the mapping
- now the effective pair maps differently

Practical teaching example:

- direct path gives bad targets
- setup relic creates shift
- shifted mapping gives crit lines instead

This is the main learning objective of the whole tutorial.

This chapter should also include the full manip payoff:

1. read the live pair
2. inspect target relic
3. detect bad direct mapping
4. use setup relic
5. force line
6. observe shift
7. return to target relic
8. take the better upgrade path

End state:

- player should understand how to use Svarog in a real session
- player should understand how Caesar Shift changes the practical line result

---

## Tutorial Interaction Model

The tutorial should be:

- Joyride-guided
- scenario-based
- partially interactive

That means:

- some steps are informational overlays
- some steps require clicks
- results are still controlled/scripted

Examples of required clicks:

- add roll
- open/use predictor area
- add sub on setup relic
- upgrade target relic

The tutorial should never become fully random.

---

## Joyride Strategy

Joyride belongs on the `/tutorial` page.

Do not make it a generic tooltip tour only.

Instead:

- group steps by chapter
- highlight both UI and relic panels
- pause and wait for required player actions

Suggested flow style:

- highlight panel
- explain short concept
- ask player to click
- simulate result
- explain why result matters

Keep explanations short and practical.

Avoid long text walls.

---

## Tutorial UX Rules

### Keep it practical

Do not explain:

- what a relic is
- what a main stat is
- what a substat is

Do explain:

- how to use Svarog
- how to read predictions
- how to force lines
- how Caesar Shift helps

### Keep it visual

Every important lesson should show:

- predictor state
- relic state
- line result

### Keep it controlled

Do not let tutorial randomness break the lesson.

Use scripted outcomes.

---

## Tutorial Completion

The tutorial needs a proper exit point back into the real product.

After the final chapter, show a summary card with:

- what the player learned
- commons reading
- line forcing
- Caesar Shift
- when to trust the pair vs exact lean

Include clear actions:

- `Open Live Mode`
- `Try Playground`

This closes the loop and pushes the player into actual usage instead of leaving them at the end of a lesson.

---

## Page 2: `/playground`

## Purpose

Free practice after the player finishes the tutorial.

This is where they build intuition by repeating the mechanics.

Unlike the tutorial:

- this page can be flexible
- this page can be random
- this page should not heavily narrate

---

## Playground Modes

Use 2 modes.

### 1. Build Your Own

Player manually picks:

- main stat
- substats
- starting line count

Then practices:

- adding sub
- upgrading
- line forcing

Good for:

- testing specific setups
- learning exact line mapping

### 2. Random Relic

System generates:

- realistic relic
- random line count
- random sub order

Good for:

- learning the feel of real game scenarios
- fast repetition
- building intuition through repetition

Random mode should include:

- score / accuracy tracker
- streak or session score
- optional hints
- reveal explanation button

This gives the player a reason to keep practicing instead of just clicking randomly.

---

## Playground Shared Features

All modes should support:

- relic card UI
- level progression
- add-sub behavior
- line highlight on upgrade
- reset / reroll
- hint button
- reveal / explanation button

Optional:

- difficulty levels
- easy / normal / chaotic

---

## Relationship Between Tutorial and Playground

### Tutorial

- fixed
- guided
- teaches concepts

### Playground

- flexible
- repeatable
- builds intuition

This distinction should stay clear.

Do not turn Playground into another tutorial.

---

## Main Page Onboarding

Do not inject full tutorial behavior into the real live page.

Use only:

- a small first-time banner
- or a permanent visible tutorial link

Recommended banner text:

- `New to Svarog? Start the Tutorial`

Behavior:

- show on first visit
- dismissible
- remember dismissal with localStorage

---

## Key Messaging for New Players

The tutorial must leave the player understanding these points:

1. Main Predictor is the safer pair guide
2. Svarog Analyzer is the sharper exact guess
3. Commons tell you the active safe pair
4. Noise tells you what can break the pair
5. Line positions matter more than raw stat names
6. Direct upgrade is not always correct
7. A setup relic can change mapping
8. Caesar Shift is used to redirect the commons pair onto better lines

---

## Suggested UI/Content Tone

Tone should be:

- practical
- manip-focused
- not too academic
- not beginner-HSR-basic

Use phrases like:

- `Current commons`
- `Unsafe direct path`
- `Use setup relic first`
- `Force line 3`
- `Shift the mapping`
- `Now return to target relic`

Avoid generic tutorial language like:

- `This is a relic`
- `This is a substat`

---

## Proposed First Scripted Scenario

Use this as the first serious tutorial scenario:

### Live state

- commons: `42 / 43`
- noise: `41 / 44`

### Target relic

- `1 = CRIT RATE`
- `2 = CRIT DMG`
- `3 = EFF RES`
- `4 = BREAK EFFECT`

### Lesson

- direct path is bad because current pair hits the wrong lines
- player uses a 2-line or 3-line setup relic
- player adds sub / forces line
- tutorial shows shifted mapping
- now commons effectively map into the desired crit lines

This should be the signature example.

---

## Implementation Notes

Not coding yet, but the likely component split later is:

- `TutorialPage`
- `PlaygroundPage`
- `TutorialLivePanel`
- `TutorialTargetRelicPanel`
- `TutorialSetupRelicPanel`
- `TutorialChapterControls`
- `PlaygroundControls`
- `RelicSimulatorCard`
- `TutorialJoyrideConfig`

Potential state model:

- `tutorialChapter`
- `tutorialStep`
- `scriptedScenario`
- `liveSessionState`
- `targetRelicState`
- `setupRelicState`
- `playgroundMode`

---

## Final Recommendation

Build:

- `/tutorial` as a **scripted Svarog manip training page**
- `/playground` as a **free practice page**

Keep main page onboarding simple:

- just a first-time tutorial link/banner

The tutorial should focus on:

- how to use Svarog
- how to read live mode
- how to use Caesar Shift
- how to force lines with setup relics

The tutorial should **not** waste time teaching basic HSR relic concepts players already know.
