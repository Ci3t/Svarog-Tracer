# Feature: Discord Bot

> Folder: `discord-bot/`  
> Entry: `discord-bot/index.js`

---

## What It Does

The Discord Bot is the community-facing interface for Svarog. It runs in the Svarog Discord server and lets players:
- Submit roll sequences directly via Discord commands
- Get live predictor output without opening the website
- Run long-string analysis in Discord
- View current banner info and character IDs

The bot uses the same predictor core (`predictWithPairs`, `pairTransitionPredictor.js`) as the website.

---

## Commands

| Command | File | Function |
|---------|------|---------|
| `/analyze` | `commands/analyze.js` | Analyze a roll sequence |
| `/session` | `commands/session.js` | Start/end/view a live session |
| `/longstring` | `commands/longstring.js` | Decode and analyze a long string |
| `/ids` | `commands/ids.js` | Look up character/weapon IDs |
| `/wcheck` | `commands/wcheck.js` | Check current warp banner |
| `/ping` | `commands/ping.js` | Health check |
| `/guides` | (via `api/guides.js`) | Fetch a guide from the DB |

---

## Session Management

`discord-bot/utils/sessionManager.js`:
- `createSession(userId)` — start a new tracking session
- `addRoll(userId, roll)` — add a roll to the active session
- `endSession(userId)` — close and summarize the session
- `getSessionStatus(userId)` — check if a session is active

Sessions are per-Discord-user and stored in memory (not persisted across bot restarts).

---

## Input Handlers

`discord-bot/utils/messageHandlers.js`:
- `handleLiveInput(userId, roll)` — process a single live roll, run predictor, return output
- `handleLongstringInput(userId, longString)` — decode and run predictor on a full long string
- `handleSessionInput(userId, input)` — route input to the correct handler based on session state

---

## String Helpers

`discord-bot/utils/stringHelpers.js` — Discord-specific formatting helpers (separate from `src/utils/stringHelpers.js`).

---

## Predictor Core

`discord-bot/utils/pairTransitionPredictor.js` — a copy/fork of the main predictor adapted for Discord context (stateless, no React dependencies).

`discord-bot/utils/predictor.js` — simplified predictor wrapper used by some commands:
- `getParity()`, `buildPairMatrix()`, `calculateWaveSignals()`, `calculateTrends()`, `identifyCommonsNoise()`

---

## Bot Warp Service

`discord-bot/utils/botWarpService.js`:
- `calculateGenshinWinLoss()` — win/loss calc for Genshin banners
- `consolidatePeaks()` — merge pull peaks
- `detectLuckyPeaks()` — identify soft-pity lucky pulls
- `generateShortcutString()` — create compact summary string for Discord

---

## Agent Swarm (scripts/agent-swarm.mjs)

A separate analysis system (not deployed, used for testing):
- `agentMain()` — main predictor agent
- `agentKiyoWave()` — Kiyo wave analysis agent
- `agentSvarogOnly()` — Svarog-only analysis without Kiyo
- `classifyBoardState()` — classify current session state
- Used to run batch backtests across all replay files to evaluate predictor accuracy.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `discord-bot/index.js` | Bot entry, command loader, event handler |
| `discord-bot/commands/*.js` | All slash commands |
| `discord-bot/utils/messageHandlers.js` | Input routing |
| `discord-bot/utils/sessionManager.js` | Per-user session tracking |
| `discord-bot/utils/pairTransitionPredictor.js` | Predictor for Discord |
| `discord-bot/utils/predictor.js` | Simplified predictor wrapper |
| `discord-bot/utils/botWarpService.js` | Warp analysis helpers |
| `discord-bot/utils/stringHelpers.js` | Discord-specific string formatting |
| `scripts/agent-swarm.mjs` | Multi-agent batch analyzer |
