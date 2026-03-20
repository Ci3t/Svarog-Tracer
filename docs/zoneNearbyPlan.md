# Nearby Zones Explorer

A companion feature to **Build Team**. While Build Team requires exact Zone + Slot, this explorer finds other teams whose Zone (XOR) is *close* to yours — useful for discovering alternative compositions that share the same relic drop pool.

## Background

The current [variants.js](file:///d:/Coding/HSR_PatternRecord/api/_services/zone/variants.js) API requires exact `xor` + `slot`. It uses a brute-force 4-char combination loop that filters by exact XOR math. For Nearby Zones, we instead want to:
1. Scan a **range** of XOR values (e.g. ±100 from the target)
2. Return teams grouped by Zone, with actual run data
3. Sort by relic overlap potential (how similar the zone's relic pool is)

---

## Proposed Changes

### API Layer

#### [NEW] `api/zone/nearby.js`
New endpoint: `GET /api/zone/nearby`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `xor` | int | Target Zone (XOR) value |
| `radius` | int (1–500, default 100) | How far to search from target XOR |
| `limit` | int (1–50, default 20) | Max unique zones to return |
| `epoch` | `current` / `previous` | Epoch filter |

**Logic:**
1. Read all zone runs from the DB for the epoch
2. Group runs by `char_xor` value
3. Filter to zones where `|char_xor - targetXor| <= radius`
4. For each nearby zone, aggregate: run count, crit rate, unique teams seen, sample team
5. Sort by closeness to target XOR (nearest first), break ties by most runs
6. Return top `limit` zones with their summary stats

> No brute-force character ID iteration needed — we query actual run data directly, making this fast.

---

### Frontend

#### [MODIFY] [ZoneBuildTeam.jsx](file:///d:/Coding/HSR_PatternRecord/src/components/zone/ZoneBuildTeam.jsx)
Add a **second tab/toggle** inside the Build Team page:

```
[ Exact Match ]  [ Nearby Zones ]
```

**Nearby Zones tab UI:**
- Shows a "XOR Radius" slider (default: `100`, range `10–500`)
- A "Scan" button that calls `/api/zone/nearby`
- Results displayed as zone cards:
  ```
  Zone 431  ← your zone (highlighted)
  Zone 418  ±13  →  24 runs, 67% crit, 3 unique teams
  Zone 445  ±14  →  8 runs, 55% crit, 1 unique team
  ```
- Each card has a **"View Variants"** button that calls the existing exact variants API for that zone
- Optionally, show the sample team (chars with images) for each nearby zone

---

### Summary of Files

#### [NEW] [nearby.js](file:///d:/Coding/HSR_PatternRecord/api/zone/nearby.js)
New Vercel API route that proxies to the service handler.

#### [NEW] [_services/zone/nearby.js](file:///d:/Coding/HSR_PatternRecord/api/_services/zone/nearby.js)
New service handler with the range-query logic.

#### [MODIFY] [ZoneBuildTeam.jsx](file:///d:/Coding/HSR_PatternRecord/src/components/zone/ZoneBuildTeam.jsx)
Add Nearby Zones tab, radius slider, zone cards, and "View Variants" button.

---

## Verification Plan

### Automated Tests
- Call `/api/zone/nearby?xor=431&radius=50` and verify:
  - Returns zones within ±50 of 431
  - Sorted by closeness
  - No zones outside radius included

### Manual Verification
- Pick a team in Build Team → switch to Nearby Zones tab → scan
- Confirm the results show zones near the team's XOR
- Click "View Variants" on a nearby zone — should run exact variant generation for that zone
- Verify styling and pagination look consistent with the rest of the Build Team page
