# Feature: Banner Tracker

> Route: `/banner-tracker`  
> Page: `src/pages/BannerTracker.jsx`

---

## What It Does

Banner Tracker is a visual history grid showing every HSR banner from 1.0 onward. Players can:
- Browse all past and current banners
- Search for a specific character
- Filter by game version (1.0+, 2.0+, 3.0+)
- See when a character last appeared and predict upcoming reruns
- Click any banner card to see detailed banner info

It is a read-only reference tool — no user data input required.

---

## Data

- Banner history is loaded from `warpDataService.js` via `getBannerHistory()`.
- Character metadata (portrait images, element, path, rarity) loaded via `fetchCharacterMetadataMap()`.
- Data is static/cached — the banner history list is bundled locally, not fetched live (unlike the Warp Analyzer which fetches current active banners).

---

## Grid Logic

1. **Flat phase list** — all banner versions and phases are flattened into a single array.
2. **Character tracking** — `charAppearance` map tracks the first banner each character appeared on (for "new character" detection).
3. **Version filter** — hides older version banners based on user selection.
4. **Search** — filters characters by name, case-insensitive.

---

## Banner Cards

Each card (`WarpBannerCard.jsx`) shows:
- Character portrait (Cloudinary-hosted)
- Element and path icons
- Banner version and phase label
- Rate-up character(s) listed

Clicking a card opens a modal with full banner details.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/BannerTracker.jsx` | Main banner grid page |
| `src/components/warp/WarpBannerCard.jsx` | Individual banner card |
| `src/utils/warpDataService.js` | Banner history data and character metadata |
| `src/utils/cloudinaryAssets.js` | Cloudinary portrait URL builder |
| `src/utils/gameAssetResolver.js` | Resolve game image paths |
