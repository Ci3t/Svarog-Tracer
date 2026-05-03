# Feature: Tutorial

> Route: `/tutorial` and `/tutorial/level-2` through `/tutorial/level-16` + `/tutorial/complete`  
> Pages: `TutorialPage.jsx`, `TutorialLevelTwoPage.jsx` … `TutorialLevelSixteenPage.jsx`, `TutorialCompletePage.jsx`

---

## What It Does

Tutorial is the scripted onboarding flow that teaches new players how to use Svarog and how relic manipulation works. It is a **fully scripted, guided training experience** — not random — so that every explanation always matches the displayed result.

It is not a basic HSR relic tutorial. Players already know what relics, main stats, and substats are. The tutorial teaches:
- How to read the Live Mode predictor
- What Caesar Shift is and why it exists
- How to force a line using a setup relic before the target relic
- How to read commons, noise, and pair safety

---

## Structure

### 16 Levels + Complete Page
Each level is a standalone scripted stage:

| Levels | Topic |
|--------|-------|
| 1 | Introduction to the interface |
| 2–3 | Understanding rolls and lines |
| 4–5 | Caesar shift and 4x translation |
| 6–8 | Reading commons and noise |
| 9–11 | Pair safety and when to click |
| 12–14 | Setup relics and carry line forcing |
| 15–16 | Advanced scenarios and decision making |
| Complete | Completion badge and unlock progression rewards |

### Scripted Scenario Flow
Each stage uses `buildForceRelic`, `buildTargetRelic`, `createStageState` to set up a fixed starting state. The player steps through using `applyProgressionStep` — each step is deterministic so the tutorial always plays out the same way.

---

## Game Mechanics Taught

### The Carry Line
Every relic upgrade leaves you "sitting" on a line (1–4). The next roll from any relic depends on that carry line. This is shared between setup, target, and force relics.

### Setup Relic Strategy
Using a cheaper relic before the target relic lets the player:
1. Build context (collect rolls to populate the predictor)
2. Adjust carry line (force to a better starting line)

### Line Forcing
```
stepsNeeded = (targetLine - currentLine + 4) % 4
```
Consuming RNG-advancing game actions (menu navigation, loading screens, banner rolls) advances the line by 1 step each.

---

## Clara Integration
Clara (the AI companion) narrates the tutorial. Her dialogue is displayed via `ClaraChat.jsx` and plays voice lines from `public/` MP3 files tied to tutorial stages.

---

## Completion and Progression
- Completing the tutorial awards XP and unlocks Playground modes.
- `markTutorialGuideStageComplete()` and `getCompletedTutorialGuideStageCount()` track per-stage completion in the user's progression profile via Supabase.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/TutorialPage.jsx` | Level 1 + main tutorial logic |
| `src/pages/TutorialLevel*.jsx` | Levels 2–16 scripted stages |
| `src/pages/TutorialCompletePage.jsx` | Completion screen |
| `src/utils/relicScoring.js` | `activateRelicLine()`, `createRelicLine()` |
| `src/utils/stringHelpers.js` | `translateTo4()` for Caesar examples |
| `server/_services/profile/account.js` | `completeTutorial()`, stage tracking |
