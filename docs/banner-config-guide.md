# Banner Display Configuration Guide

## Quick Start

To change how many banners are displayed on the website, edit this file:
```
src/config/bannerConfig.js
```

## How to Use

### Show All Active Banners (Current Setting)
```javascript
export const BANNER_DISPLAY_CONFIG = {
  hsr: {
    maxCharacterBanners: null,  // Show all
    maxLightConeBanners: null,  // Show all
  }
};
```

### Show Only 2 Newest Banners Per Type
```javascript
export const BANNER_DISPLAY_CONFIG = {
  hsr: {
    maxCharacterBanners: 2,  // Show only 2 newest
    maxLightConeBanners: 2,  // Show only 2 newest
  }
};
```

### Show 3 Character Banners, 2 Light Cones
```javascript
export const BANNER_DISPLAY_CONFIG = {
  hsr: {
    maxCharacterBanners: 3,
    maxLightConeBanners: 2,
  }
};
```

## After Making Changes

1. Save the file
2. Rebuild the website:
   ```bash
   npm run build
   ```
3. The changes will take effect immediately in development mode (`npm run dev`)

## Examples

**Current Patch (4 character banners):**
- `maxCharacterBanners: null` → Shows all 4 (Yao Guang, Evernight, Hysilens, Black Swan)
- `maxCharacterBanners: 2` → Shows only 2 newest (Yao Guang, Evernight)
- `maxCharacterBanners: 3` → Shows 3 newest (Yao Guang, Evernight, Hysilens)

**Normal Patch (2 character banners):**
- `maxCharacterBanners: null` → Shows both
- `maxCharacterBanners: 1` → Shows only the newest

## Notes

- Setting a value to `null` means "show all active banners"
- Setting a number means "show only the N newest banners"
- Banners are always sorted by ID (newest first) before limiting
- The same configuration works for Genshin and WuWa banners too!
