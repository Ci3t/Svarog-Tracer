# Svarog Tracer — Changelog

Changes are listed newest first. Each entry is a TLDR for update announcements.

---

## [2026-03-04] Kiyo Mode — Flip Detection Rewrite (`kiyoLogic.js`)

### 🎯 Core Logic
- **N-run adaptive detection**: system now detects the dominant run-length N from the current window's completed runs (e.g. if the session runs H H H → flip, N=3 is auto-detected)
- **Correct FLIP timing**: FLIP is only predicted at `runLength >= N`, not 1 roll early as before
- **Previous window continuity**: if the last side of the previous window matches the current side, the run count is extended across the boundary — but previous window data is NOT used to bias direction (this was the bug causing 0/4 on Col2 in session 2)
- **Dominance shortcut**: if one side is ≥75% of the current window with 5+ rolls, immediately predict CONTINUE that side regardless of run count
- **Confidence scales with evidence**: base 0.55 + 0.05 per completed run observed, caps at 0.90

---


### 🤖 Discord Bot — Reliability
- **PM2 setup**: Added `ecosystem.config.cjs` — bot now auto-restarts on crash, restarts at 4 AM daily, and caps memory at 300 MB to prevent host force-kills
- **Background sync lock**: WuWa sync now uses a running-flag guard + 25s hard timeout — prevents CPU spikes from stacked/hung fetch calls
- **Better error on no data**: `/st-check` with a brand-new banner now shows a friendly ⏳ embed ("No data yet, try in a few hours") instead of a raw 400 error

### 🤖 Discord Bot — Pull Strategy Display
- **Range overlap fix**: Pull Strategy ranges now connect correctly (e.g. `x1 11→16` then `x10 16→26` instead of `17→26`)

### 📊 Warp Analyzer (Genshin) — Data Accuracy
- **Off-by-one fix**: Paimon.moe `pityCount.legendary` is 0-indexed, so Roll 3 = index 3, not index 2. All bar counts were shifted by 1 — now correct in website frontend, Vercel backend, and Discord bot
- **Chance % fix**: Switched from `count / totalPulls` to Paimon.moe's conditional probability formula `pityCount[N] / countEachPity[N-1]` — percentages now match paimon.moe exactly

---

## [2026-03-06] v4.0.1 Site Patch
- Version bumped to `4.0.1 FCS` across all platforms
- Refined Kiyo UI with better text sizes and GSAP animations
- Added "Suspect TABLE" warning for misleading 100% streaks
- Fixed Wave tiebreaker logic to align with TABLE's selection
- Removed Advanced Mode from Lab to simplify experience

---

## [2026-02-25] v4.0.0 FCS Release

### 🎯 Predictor
- Replaced SUGGEST card on Long String page with `ModernPairPredictorCard`
- Added Simple / Advanced mode toggle on Long String page
- Updated KiyoMode predictor to use `predictWithPairs` for consistency

### 🏠 App
- Version bumped to `4.0.0 FCS` on Home Page and App state
- Default patch updated from `3.8` → `4.0`

### 🤖 Discord Bot
- Added `/st-admin server-list` command (admin-only) — lists all servers the bot is in with owner info, paginated

### 📊 Genshin Banners
- Updated active banner IDs to Varka/Flins (`300096`)
- Fixed stats calculation to use array sum as denominator (consistent with Paimon.moe)
- Cache TTL set to 5 minutes for Genshin stats endpoint

---
