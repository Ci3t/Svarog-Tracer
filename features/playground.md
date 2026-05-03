# Feature: Playground

> Routes: `/playground`, `/playground/free`, `/playground/challenge`, `/playground/drills`, `/playground/pattern-lab`, `/playground/races`  
> Pages: `PlaygroundPage.jsx`, `PlaygroundFreePage.jsx`, `PlaygroundChallengePage.jsx`, `PlaygroundDrillsPage.jsx`, `PlaygroundPatternLabPage.jsx`, `PlaygroundRacesPage.jsx`

---

## What It Does

Playground is the practice arena where players apply relic manipulation in simulated scenarios. Unlike Live Mode (real data input), Playground generates synthetic relic sessions so players can practice reading the board, forcing lines, and making decisions without touching real game resources.

Playground is also where progression rewards, badges, and streaks live.

---

## Sub-Modes

### Free Mode (`/playground/free`)
- **Sandbox** — no failure state, no score pressure.
- Generate a random relic with random substats and roll history.
- Step through upgrades, reroll, swap substat positions.
- Add setup relics next to the target relic to practice carry-line management.
- Reset at any point.
- **Audience**: beginners, returning users, players testing setups.

### Challenge Mode (`/playground/challenge`)
- **Fixed LeetCode-style contracts** — one static scenario, one fixed target relic, one fixed setup relic, one fixed starter history, one clear success condition.
- **Ladder structure**: starts with 5 handcrafted contracts of escalating difficulty.
- Each contract has hint escalation tied to where the player gets stuck (before +6, +9, +12, +15, repeated wrong resets).
- Success conditions are explicit: "dual crit" only if both `CRIT RATE` and `CRIT DMG` are substats.
- Admin page (`/playground/challenge/admin`) for creating and editing contracts.
- **Audience**: players who have completed the tutorial and want structured reps.

### Drills Mode (`/playground/drills`)
- Clara-guided Q&A style practice.
- Clara voice lines (MP3 files in `public/`) ask questions; player selects answers.
- Tied to a 24-question drill bank.
- Tracks correct answers and awards XP.

### Pattern Lab (`/playground/pattern-lab`)
- Advanced mode for testing custom pattern seeds.
- Player creates a **Lab Profile**: seed label, roll history, engine mood/family bias, region, patch.
- The engine generates rolls matching the specified pattern family.
- **Pattern families**: `countWindow`, `createBucketPatternProfile`, `createGenerator`, `createPatternProfile`.
- Useful for testing how the predictor behaves on specific session shapes.

### Races (`/playground/races`)
- Speed-based challenge mode (planned/partial).
- Appears in routing but content is gated.

---

## Bot System (PvP Simulation)

The Playground Challenge backend uses a **bot** (`buildBotState`, `applyBotUpgradeToSlot`) that simulates relic upgrade decisions:
- Bot reads the same predictor output the player sees.
- Bot has configurable skill tiers: `new_player`, `beginner`, `intermediate`, `veteran`, `expert`.
- In `expert_v2`, the bot reads the board, decides when to build via setup relics, when to commit, and when to reset.
- The **carry line** is shared — the bot's builder relic roll changes what line the target relic starts on.

---

## Session Seed System

Challenge seeds are not just a single number. A seed object includes:
```js
{
  id: "beginner-clean-01",
  tier: "beginner",
  mood: "stable",       // stable | volatile | split
  region: "America",
  patch: "4.1",
  starterRolls: ["42", "43", "42", "43", "44", "42"]
}
```
Moods define the pattern family bias (stable = sticky commons; volatile = frequent noise breaks).

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/PlaygroundFreePage.jsx` | Free Mode UI |
| `src/pages/PlaygroundChallengePage.jsx` | Challenge Mode UI |
| `src/pages/PlaygroundDrillsPage.jsx` | Drills Mode UI |
| `src/pages/PlaygroundPatternLabPage.jsx` | Pattern Lab UI |
| `src/pages/PlaygroundChallengeAdminPage.jsx` | Admin contract editor |
| `src/utils/playgroundPatternProfiles.js` | Pattern seed generation |
| `src/utils/relicScoring.js` | Relic line activation, upgrade rolls |
| `src/data/challengeContracts.js` | Contract definitions |
| `src/data/challengeScenarioFactory.js` | Contract assembly |
| `src/data/challengeRelicTemplates.js` | Relic templates for contracts |
| `src/data/challengeHintPacks.js` | Hint escalation packs |
| `src/data/challengeSeedPools.js` | Seed pool definitions per tier |
| `src/data/setBisGuides.js` | Set BiS guides used in contracts |
| `server/_services/pvp/rooms.js` | Room creation, bot simulation |
| `server/_services/challenge/results.js` | Result recording |
| `api/playground.js` | Playground API handler |
| `api/pvp.js` | PvP/room API handler |
