# Feature: Warp Analyzer

> Route: `/warp-analyzer`  
> Page: `src/pages/WarpAnalyzerPage.jsx`  
> Component: `src/components/WarpAnalyzer.jsx`

---

## What It Does

Warp Analyzer tracks the player's banner pull history and provides:
- Pull count toward pity (soft and hard pity)
- Historical banner distribution analysis (which characters appeared on which banners)
- Upcoming banner predictions based on known rotation patterns
- AI-powered analysis of the player's warp data via Clara

---

## Data Sources

### Banner Data
- Backend fetches live banner info from external sources (StarRailStation for HSR, game APIs for Genshin/WuWa).
- Fallback responses are served if the external fetch fails (`buildHsrFallbackBanners`, `buildGenshinFallbackBanners`, `buildWuWaFallbackBanners`).
- `AbortSignal.timeout()` is used for fetch timeouts (no AbortController to avoid Node UV_HANDLE_CLOSING crashes).

### Warp History
- `warpDataService.js` handles local storage of the player's pull history.
- `getBannerHistory()` retrieves stored history.
- `fetchCharacterMetadataMap()` loads character metadata (portrait, element, path) for display.

### AI Analysis
- `api/ai-analyze-warp.js` — Clara-powered endpoint that takes the player's warp data and returns:
  - Summary of luck vs pity mechanics
  - Pattern observations
  - Rate-limited (1 request per cooldown period per user)

---

## Banner Grid (BannerTracker Component)

`src/pages/BannerTracker.jsx` renders the full banner history grid:
- Flat phase list (version + phase for each banner)
- Character appearance tracking with first appearance detection
- Version filter (1.0+, 2.0+, 3.0+)
- Search by character name
- Modal with detailed banner info on card click

---

## Discord Commands

| Command | File | What It Does |
|---------|------|-------------|
| `/ids` | `discord-bot/commands/ids.js` | Lookup character/weapon IDs |
| `/wcheck` | `discord-bot/commands/wcheck.js` | Check warp banner status |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/WarpAnalyzerPage.jsx` | Route page wrapper |
| `src/components/WarpAnalyzer.jsx` | Main analyzer UI |
| `src/pages/BannerTracker.jsx` | Banner history grid |
| `src/utils/warpDataService.js` | Pull history storage and banner fetch |
| `src/components/warp/WarpBannerCard.jsx` | Individual banner card |
| `src/components/warp/BannerRail.jsx` | Horizontal banner rail |
| `src/components/warp/GameTheme.js` | Game-specific theme colors |
| `server/_services/hsr/banners.js` | HSR banner fetch + fallback |
| `server/_services/genshin/banners.js` | Genshin banner fetch |
| `server/_services/wuwa/banners.js` | WuWa banner fetch |
| `api/banners.js` | Unified banner API handler |
| `api/ai-analyze-warp.js` | Clara AI warp analysis endpoint |
