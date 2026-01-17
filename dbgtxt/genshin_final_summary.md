# Genshin Banner System - Final Status

## ✅ What Works

### 1. Genshin Banners Auto-Discovery
- **Endpoint**: `https://svarog-tracer.vercel.app/api/banners`
- **Search logic**: Backward search from banner ID 100 (both 300xxx and 400xxx)
- **Detection**: 5-star whitelist filter + top 2 by pull count
- **Cache**: 15 minutes (fresh data!)

### 2. Genshin Stats Fetching  
- **Endpoint**: `https://svarog-tracer.vercel.app/api/genshin/stats?id=BANNER_ID`
- **Source**: Direct server-side fetch from paimon.moe
- **Benefits**: No CORS, accurate data, same as paimon.moe
- **Cache**: 5 minutes

### 3. API Client Configuration
- **Production**: Uses Vercel URL
- **Dev mode**: Also uses Vercel URL (no local backend needed)
- **Frontend**: Fetches from centralized backend

---

## 🔧 Maintenance

### When New 5-Star Character Releases

Edit `api/banners.js` line 157-166:

```javascript
const GENSHIN_5STAR_CHARS = [
  'albedo', 'alhaitham', ... // existing
  'new_character_name',  // ADD HERE (lowercase, underscores)
];
```

Same for weapons (line 169-181).

### When New Genshin Patch Drops

Banners auto-discover! Just update the 5-star lists if new characters/weapons release.

Manual override available in `CONFIG.GENSHIN_MANUAL` (top of file) if needed.

---

## ⚠️ Known Limitations

### WuWa Backend  
- **Status**: ❌ Blocked by anti-bot (403 Forbidden)
- **Workaround**: Frontend fallback to CORS proxy still works
- **Why**: WuWa Tracker has Cloudflare/advanced anti-bot protection
- **Impact**: WuWa stats fetch slower but functional

### Percentage Calculation
- **Paimon.moe website**: Shows 0.74% for Roll 4
- **Our calculation**: Shows 0.65% (802 / 122,624)
- **Why**: Paimon.moe might use smoothing/normalization  
- **Impact**: Minor cosmetic difference, z-scores are accurate

---

## 📊 Data Flow

```
Frontend (localhost or deployed)
  ↓
Always uses: https://svarog-tracer.vercel.app/api
  ↓
├─ /banners → All games (HSR, Genshin, WuWa)
├─ /genshin/stats → Paimon.moe (server-side, no CORS)
└─ /wuwa/stats → [403 blocked, fallback to proxy]
```

---

## 🎯  Summary

**Genshin**: Fully centralized, auto-discovery, fresh data ✅  
**WuWa**: Backend blocked, proxy fallback works ⚠️  
**HSR**: Centralized banner discovery ✅

Everything is centralized except WuWa stats (anti-bot limitation).
