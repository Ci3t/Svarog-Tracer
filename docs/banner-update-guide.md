# Banner Update Guide

This project tries to fetch live banner data automatically, but banner images sometimes need a manual override when the source site publishes names before assets are available.

## Data Flow

- Website calls `src/utils/warpDataService.js`.
- Vercel API calls `api/banners.js`, which fans out to `server/_services/*/banners.js`.
- Cloudflare Worker has a parallel fallback in `cloudflare-worker/src/index.js`.
- Image manifest logic lives in:
  - `src/utils/bannerAssetManifest.js`
  - `server/utils/bannerAssetManifest.js`
- Game asset resolvers live in:
  - `src/utils/gameAssetResolver.js`
  - `server/utils/gameAssetResolver.js`

## Before Updating

1. Confirm the live banner IDs from the source:
   - HSR: Star Rail Station.
   - Genshin: Paimon.moe.
   - WuWa: WuWa Tracker.
2. Upload new images to `Ci3t/svarog-assets`.
3. Verify the URL opens directly in a browser.
4. Prefer raw GitHub URLs with a version query for emergency overrides:

```text
https://raw.githubusercontent.com/Ci3t/svarog-assets/main/<game>/<file>?v=<banner-id>-<short-name>-<date>
```

This avoids stale `cdn.jsdelivr.net@main` image cache issues.

## Genshin

Genshin current banners are controlled manually because Paimon.moe can publish generic banner labels.

Update these files:

- `cloudflare-worker/src/index.js`
- `server/_services/genshin/bannerControl.js`
- `src/utils/warpDataService.js`

Change:

- Character banner ID/name/image.
- Weapon banner ID/name/image.
- `GENSHIN_PRESET_BANNERS`.
- `GENSHIN_BANNER_OVERRIDES`.
- `GENSHIN_IMAGE_OVERRIDES`.

Then run:

```bash
npm run build
node --check cloudflare-worker/src/index.js
node --check server/_services/genshin/bannerControl.js
node --check src/utils/warpDataService.js
```

## WuWa

WuWa banner IDs and names are normally scraped automatically from WuWa Tracker. Manual work is usually only needed for images.

For current banner image overrides, update these files:

- `server/_services/wuwa/banners.js`
- `src/utils/warpDataService.js`
- `cloudflare-worker/src/index.js`

Add or update the current banner ID entries in `WUWA_CURRENT_BANNER_ASSETS`.

Example:

```js
"100037": {
  id: "100037_character",
  bannerId: "100037",
  name: "Denia / Chisa / Phrolova",
  type: "character",
  image: "https://raw.githubusercontent.com/Ci3t/svarog-assets/main/wuwa/Denia_Character_Sheet.webp?v=100037-denia-20260521",
  characterId: "denia",
}
```

Use the same approach for the weapon banner. Set `assetLocked: true` and `imageLocked: true` through the helper so the manifest cannot replace the image.

If only the fallback preset is stale, update `WUWA_PRESET_BANNERS` in `src/utils/warpDataService.js` and `buildWuWaFallbackBanners()` in both server and Worker.

Then run:

```bash
npm run build
node --check server/_services/wuwa/banners.js
node --check src/utils/warpDataService.js
node --check cloudflare-worker/src/index.js
```

## HSR

HSR mostly uses Star Rail Station data plus temporary metadata fixes.

Common places to check:

- `src/utils/warpDataService.js`
- `server/_services/hsr/kiyo.js`
- `server/utils/bannerAssetManifest.js`
- `src/utils/bannerAssetManifest.js`

For temporary wrong names/images, add a narrowly scoped ID-based override instead of changing generic resolver behavior.

Then run:

```bash
npm run build
node --check src/utils/warpDataService.js
```

## Asset Upload Notes

Use these admin helper commands when new images are placed in the expected local asset folders:

```bash
node scripts/auto-upload-assets.js genshin
node scripts/auto-upload-assets.js wuwa
node scripts/upload-hoyo-assets.js hsr
```

If you upload directly to `svarog-assets`, confirm the exact path and casing. GitHub URLs are case-sensitive.

## Cache Notes

- Website banner API cache is short, but browser bundles only update after deploy.
- Cloudflare Worker `/api/banners` uses edge cache.
- jsDelivr `@main` can serve old image bytes after a file is replaced.
- For urgent banner swaps, use raw GitHub URL plus a `?v=` query.
- After deploy, hard refresh or test in a private window.

## Push Checklist

```bash
git status --short
npm run build
git add <changed files>
git commit -m "Update current banner assets"
git push origin HEAD:main
```
