# Feature: Zone Tracker (Cavern of Corrosion)

> Route: `/zone-tracker`  
> Page: `src/pages/ZoneTrackerPage.jsx`  
> Route: `/caverns`  
> Page: `src/pages/CavernTimesPage.jsx`

---

## What It Does

Zone Tracker is the HSR Cavern of Corrosion leaderboard and run logger. Players log their clear times and team compositions for each cavern zone. The system tracks weekly epochs, archives previous weeks, and shows leaderboards and maps.

---

## Core Systems

### Run Logging
- `ZoneLogger.jsx` — form for entering team composition and clear time.
- Team slots support drag-and-drop reordering.
- Characters are selected from `charactersByNumId` lookup (pulled from `src/data/characters.json`).
- Owned roster management: player can import/save their owned character list.

### Zone Map
- `ZoneMap.jsx` — visual map of all Cavern zones with overlaid best-time badges.
- `ZoneHeader.jsx` — week/epoch display with calendar week formatting.

### Leaderboard
- `src/pages/LeaderboardPage.jsx` — separate leaderboard page showing top runs globally and by zone.
- `server/_services/zone/` — full zone backend (submit, map, leaderboard, log-runs, nearby, variants, flag-epoch, admin-runs, export).

### Weekly Archive System
Full archival pipeline in `server/_services/hsr/cavern-clears.js`:
- `archiveCurrentWeekBlobEntries()` — archive to Blob storage
- `archiveCurrentWeekSnapshot()` — snapshot to Supabase
- `archiveCurrentWeekSupabaseEntries()` — move entries to archive table
- Cron-triggered via `server/_services/hsr/cron-wipe.js`

### Trailblazer Deduplication
`src/utils/trailblazerTeam.js` handles the special case where Trailblazer can appear as multiple classes:
- `isTrailblazerCharacterRef()` — detect if a character ref is any Trailblazer variant
- `wouldCreateTrailblazerConflict()` — prevent duplicate Trailblazer slots in one team
- `hasMultipleTrailblazers()` — validation check

---

## Cavern Times Page

`src/pages/CavernTimesPage.jsx` — secondary view showing historical clear times per cavern across weeks. Uses `findCavernById()` and `getCavernDisplayName()` from `server/_services/hsr/caverns.js`.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/ZoneTrackerPage.jsx` | Orchestrator — delegates to ZoneLogger/Map/Header |
| `src/hooks/useZoneTracker.js` | All zone state, submission, roster management |
| `src/components/zone/ZoneLogger.jsx` | Run entry form |
| `src/components/zone/ZoneMap.jsx` | Visual cavern map |
| `src/components/zone/ZoneHeader.jsx` | Week display |
| `src/components/zone/ZoneBuildTeam.jsx` | Team slot builder |
| `src/pages/LeaderboardPage.jsx` | Leaderboard page |
| `src/pages/CavernTimesPage.jsx` | Historical times view |
| `src/utils/trailblazerTeam.js` | Trailblazer dedup logic |
| `server/_services/hsr/cavern-clears.js` | Archive pipeline |
| `server/_services/hsr/cron-wipe.js` | Cron archive trigger |
| `server/_services/zone/shared.js` | CORS, auth, Supabase helpers |
| `api/zone.js` | Zone API catch-all router |
| `api/hsr.js` | HSR API catch-all router |
