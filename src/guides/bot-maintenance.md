# Bot Data Maintenance Guide

The Discord bot bundles its own copies of `characters.json`, `relics.json`, and `materials.json` inside `discord-bot/` so it works standalone on hosting servers (wispbye, etc.).

---

## When to Sync Data Files

Whenever you update any of these source files in `src/data/`:

| Updated File | Run This |
|---|---|
| `src/data/characters.json` | `cp src/data/characters.json discord-bot/characters.json` |
| `src/data/relics.json` | `cp src/data/relics.json discord-bot/relics.json` |
| `src/data/materials.json` | `cp src/data/materials.json discord-bot/materials.json` |

---

## Full Workflow (Example: Adding a New Character)

```bash
# 1. Edit the source file
src/data/characters.json

# 2. Sync copy to discord-bot
cp src/data/characters.json discord-bot/characters.json

# 3. Commit and push both
git add src/data/characters.json discord-bot/characters.json
git commit -m "feat: add [character name]"
git push origin main

# 4. Redeploy bot on wispbye (re-upload files or git pull, then restart)
```

---

## Deploying Slash Commands

| Command | When to Use |
|---|---|
| `node deploy-global.js` | After changing any regular command |
| `node deploy-commands.js` | After changing `/admin` (guild-only) |

> ⏳ Global command changes take up to **1 hour** to propagate on Discord. A Discord client restart (`Ctrl+R`) often picks them up faster.

---

## Bot Environment Variables (wispbye `.env`)

```env
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...                        # Your test server ID (for /admin only)
BACKEND_API_URL=https://svarog-tracer.vercel.app/api  # ← Must be prod URL on server
ADMIN_API_KEY=...
HSR_ADMIN_PASS=...
```

> ⚠️ Locally, set `BACKEND_API_URL=http://localhost:3000/api` so the bot hits `vercel dev` instead of production.
