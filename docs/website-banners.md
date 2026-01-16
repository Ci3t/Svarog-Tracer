# Website Banner Updates

## Overview

The website uses backend API endpoints to discover active banners. Each game has its own file.

**Files to edit:**
- HSR: `api/hsr/banners.js`
- Genshin: `api/genshin/banners.js`
- WuWa: `api/wuwa/banners.js`

**No restart needed** - Changes apply automatically (serverless deployment)

---

## HSR Banners (`api/hsr/banners.js`)

### Auto-Discovery
HSR banners are **automatically discovered** from `starrailstation.com` using timestamps.

### Manual Override (if needed)

Find the `MANUAL_OVERRIDES` object:

```javascript
const MANUAL_OVERRIDES = {
    "2103": {
        name: "Sunday",
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1310.png",
        type: "character"
    },
    "3103": {
        name: "Eternal Calculus",
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_portrait/24001.png",
        type: "light_cone"
    }
};
```

### Adjusting Discovery Window

If auto-discovery misses new banners, adjust the time window:

```javascript
// Line ~30
const now = Date.now() / 1000;
const ACTIVE_WINDOW = 60 * 60 * 24 * 30; // 30 days (increase if needed)
```

---

## Genshin Banners (`api/genshin/banners.js`)

### Auto-Discovery
Genshin banners are **automatically probed** from `api.paimon.moe` by checking recent banner IDs.

### Manual Override

Find the `OVERRIDE_MAP` object:

```javascript
const OVERRIDE_MAP = {
    "300095": { 
        name: "Mavuika / Citlali", 
        type: "character",
        image: "https://paimon.moe/images/characters/mavuika.png"
    },
    "400094": { 
        name: "Flute of Ezpitzal / Calamity Queller", 
        type: "weapon",
        image: "https://paimon.moe/images/weapons/flute_of_ezpitzal.png"
    }
};
```

### Adjusting Probe Range

If new banners aren't detected, adjust the probe range:

```javascript
// Line ~27
const LATEST_KNOWN_CHAR = 300094;  // Update to latest known ID
const LATEST_KNOWN_WEAPON = 400093; // Update to latest known ID

// Line ~32
const charProbeEnd = LATEST_KNOWN_CHAR + 2;  // Increase +2 to +5 if needed
```

---

## WuWa Banners (`api/wuwa/banners.js`)

### Auto-Discovery
WuWa banners are **automatically scraped** from `wuwatracker.com` HTML.

### Manual Override (rarely needed)

If scraping fails, add manual entries:

```javascript
// At the top of the handler function
const MANUAL_BANNERS = [
    {
        id: "100031",
        name: "Mornye",
        type: "character",
        image: "https://example.com/mornye.png"
    }
];

// Then return early:
if (MANUAL_BANNERS.length > 0) {
    return res.status(200).json(MANUAL_BANNERS);
}
```

---

## Cache Duration

All banner endpoints cache for **5 minutes** to reduce API load.

To change cache duration, find this line in each file:

```javascript
res.setHeader('Cache-Control', 'public, max-age=300'); // 300 = 5 minutes
```

Change `300` to desired seconds:
- 1 minute: `60`
- 10 minutes: `600`
- 1 hour: `3600`

---

## Testing

After updating:

1. **Test endpoint directly:**
   ```bash
   curl http://localhost:3000/api/hsr/banners
   curl http://localhost:3000/api/genshin/banners
   curl http://localhost:3000/api/wuwa/banners
   ```

2. **Check website:**
   - Open website
   - Go to banner selection
   - Verify new banners appear

3. **Check Discord bot:**
   - Use `/ids` command
   - Verify banners are listed

---

## Deployment

**Local Development:**
- Changes apply immediately (no restart needed)

**Vercel Production:**
- Push to GitHub
- Vercel auto-deploys
- Wait ~1 minute for deployment
- Cache clears after 5 minutes

---

## Common Issues

**Banner not appearing:**
- Check cache (wait 5 minutes or clear browser cache)
- Verify JSON syntax is correct
- Check console for errors: `node test-api.js`

**Wrong image:**
- Verify image URL is accessible
- Check image path format matches game type

**Duplicate banners:**
- Check for duplicate IDs in override map
- Verify auto-discovery isn't picking up old banners
