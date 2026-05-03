# Feature: User Profile & Marketplace

> Route: `/profile`  
> Page: `src/pages/UserProfilePage.jsx`  
> Route: `/marketplace`  
> Page: `src/pages/MarketplacePage.jsx`

---

## What It Does

### Profile
The user profile page shows:
- Discord identity (avatar, username, display name)
- Owned cosmetics (badges, banners, frames, titles)
- Progression stats (XP, rank tier, achievements)
- Active cosmetics equipped
- Patch timer information (current patch, days remaining)
- Admin controls for Overseer-tier users

### Marketplace
Where players spend earned currency (Stellarions) on cosmetic items:
- Badges (profile frame overlays)
- Banners (animated background banners)
- Frames (card border styles)
- Titles (displayed next to username)

Items are browsed by category. Purchasing updates the player's owned items in Supabase and deducts from their currency balance.

---

## Progression System

### XP and Ranks
- Actions earn XP: tutorial completion, playground challenges, daily logins, challenge wins.
- XP accumulates to rank tiers defined in `src/utils/progressionCatalog.js`.
- Each tier has a reward (currency, cosmetic unlock, etc.).

### Achievements
- Defined in `progressionCatalog.js` with `getAchievementDefinition()`.
- Tracked in Supabase via `server/_services/profile/progression.js`.
- `autoClaimProgressionRewards()` runs on profile load to award any unclaimed milestone rewards.

### Daily Login
- `ensureDailyLoginClaim()` in `account.js` runs on auth and awards daily login XP.

---

## Cosmetics System

### Catalog
`src/utils/marketplaceCatalog.js` defines all available items:
- `getMarketplaceItem(id)` — fetch item definition
- `resolveEquippedCosmeticsFromMetadata(metadata)` — resolve what the player has equipped from their stored metadata

### Premium Assets
`src/components/cosmetics/PremiumAssets.jsx` renders all premium cosmetic types:
- `AstralForgeBadge()`, `AetherBladeBadge()`, etc.
- `AstralForgeBanner()`, `AetherBladeBanner()`, etc.
- Cosmetics are served from Cloudinary.

### Title System
`src/utils/titleCatalog.js`:
- `getTitleDefinition(id)` — title name, rarity, unlock condition
- `getTitleBadgeStyle(id)` — CSS style for the title badge
- `getTitleTextStyle(id)` — CSS style for the title text

---

## Patch Timer

`api/patch-timers.js` serves current patch timing data:
- Current patch version and phase
- Days/hours remaining in current phase
- Fallback response if Turso DB is unavailable

Displayed in the profile under the Patch Info section.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/UserProfilePage.jsx` | Profile UI including patch timer, admin controls |
| `src/pages/MarketplacePage.jsx` | Marketplace browse and purchase |
| `src/utils/marketplaceCatalog.js` | Item definitions, equipped cosmetics resolver |
| `src/utils/titleCatalog.js` | Title definitions and styles |
| `src/utils/progressionCatalog.js` | XP tiers, achievements, rewards |
| `src/components/cosmetics/PremiumAssets.jsx` | All premium cosmetic renderers |
| `server/_services/profile/account.js` | Login claim, identity, tutorial tracking |
| `server/_services/profile/progression.js` | XP, achievements, auto-claim |
| `server/_services/profile/marketplace.js` | Purchase, owned items, unlocked titles |
| `api/profile.js` | Profile API handler |
| `api/patch-timers.js` | Patch timer API with Turso fallback |
