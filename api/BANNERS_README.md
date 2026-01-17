# Banner API Documentation

## 🎯 Purpose
This API is the **single source of truth** for all banner data across HSR, Genshin Impact, and Wuthering Waves.

## 📡 Endpoint
```
GET https://svarog-tracer.vercel.app/api/banners
```

## ⚙️ How to Modify Settings

All configuration is at the **top of the file** in the `CONFIG` object:

```javascript
const CONFIG = {
  // Cache duration (how long before fetching fresh data)
  CACHE_HOURS: 1,  // Change this to 2, 6, 12, etc.
  
  // Timeouts (how long to wait for each API)
  TIMEOUT_MS: 8000,       // General timeout
  TIMEOUT_GENSHIN: 3000,  // Genshin API timeout
  TIMEOUT_WUWA: 5000,     // WuWa scraping timeout
  
  // Genshin banner discovery
  GENSHIN_CHAR_BASE: 93,     // Update when new patch releases
  GENSHIN_WEAPON_BASE: 92,   // Update when new patch releases
  GENSHIN_SEARCH_RANGE: 6,   // How many banner IDs to check
  
  // API URLs (change if APIs move)
  STARRAIL_API: '...',
  PAIMON_API: '...',
  WUWA_TRACKER: '...',
  STARRAIL_RES: '...'
};
```

## 📤 Response Format

```json
{
  "hsr": [
    {
      "id": "2101",
      "name": "Fugue",
      "type": "character",
      "characterId": "1225",
      "image": "https://..../1225.png",
      "game": "hsr"
    }
  ],
  "genshin": [...],
  "wuwa": [...],
  "lastUpdate": "2026-01-17T04:00:00Z",
  "cacheExpiry": "2026-01-17T05:00:00Z"
}
```

## 🔄 How It Works

1. **Check Cache**: If data was fetched less than 1 hour ago, return cached version
2. **Fetch Fresh Data**: If cache expired, fetch from all 3 sources in parallel
   - **HSR**: StarRailStation API → StarRailRes metadata
   - **Genshin**: Paimon.moe API (checks multiple banner IDs)
   - **WuWa**: WuWa Tracker HTML scraping
3. **Save Cache**: Store result for next request
4. **Return JSON**: Send unified format to caller

## 🛠️ Updating When New Banners Release

### Genshin (every 3 weeks)
When a new patch releases, update these two values:
```javascript
GENSHIN_CHAR_BASE: 94,  // Increment by 1
GENSHIN_WEAPON_BASE: 93, // Increment by 1
```

### HSR & WuWa
**No changes needed!** They auto-detect new banners.

## 📝 Adding Manual Overrides (Future Enhancement)

Currently, all data is fetched live. If you want to add manual overrides:

1. Create a `banner-overrides.json` in Vercel Blob
2. Add logic to merge overrides with live data
3. Create admin Discord command to update overrides

(Similar to the guides system)

## 🐛 Troubleshooting

**Issue**: API returns empty arrays
- **Check**: Vercel logs for error messages
- **Fix**: One of the external APIs might be down

**Issue**: Old data keeps showing
- **Fix**: The cache duration is 1 hour. Wait or clear cache by redeploying

**Issue**: Genshin banners missing
- **Fix**: Update `GENSHIN_CHAR_BASE` and `GENSHIN_WEAPON_BASE` for new patch
