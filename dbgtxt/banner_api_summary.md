# Banner API System - Final Summary

## ✅ What Was Built

Created a **centralized Vercel API** (`/api/banners`) that fetches live banner data from all 3 games and serves both Discord bot and website.

---

## 📁 Key Files

### Backend
- **`api/banners.js`** - Main API endpoint with easy CONFIG section
- **`api/BANNERS_README.md`** - How to modify settings

### Discord Bot  
- **`discord-bot/utils/botWarpService.js`** - Fetches from API instead of individual sources

### Website
- **`src/utils/warpDataService.js`** - `fetchCentralizedBanners()` function
- **`src/components/WarpAnalyzer.jsx`** - Uses centralized API for all games

---

## ⚙️ How to Update (When New Genshin Patch)

Edit `api/banners.js` CONFIG (top of file):

```javascript
GENSHIN_MANUAL: {
  characters: [
    { 
      bannerId: "300094",  // Change ID
      name: "Columbina / Ineffa",  // Change names
      image: "https://paimon.moe/images/characters/columbina.png"  // Change image
    }
  ],
  weapons: [
    { 
      bannerId: "400093",  // Change ID
      name: "Nocturne's Curtain Call / Fractured Halo",  // Change names
      image: "https://paimon.moe/images/weapons/nocturnes_curtain_call.png"  // Change image
    }
  ]
}
```

**HSR & WuWa**: Auto-detect, no changes needed!

---

## 🎯 Why Genshin is Manual

**Tried**: Auto-discovery by searching paimon.moe banner IDs  
**Failed**: Name extraction unreliable, image URLs broke

**Solution**: Use same manual config as bot (much simpler!)

Just update 2 banner objects when new patch releases.

---

## 📊 Architecture

```
External APIs
├─ StarRailStation (HSR config)
├─ StarRailRes (HSR names/images)
├─ Paimon.moe (Genshin - manual config used)
└─ WuWa Tracker (WuWa scraping)
        ↓
  Vercel /api/banners
  (1-hour cache)
        ↓
   ┌────────┴────────┐
   ↓                 ↓
Discord Bot       Website
```

---

## ✅ Status

- ✅ HSR: Auto-detect from SRS
- ✅ **Genshin**: Manual config (like bot)
- ✅ WuWa: Auto-scrape from tracker
- ✅ Bot & Website synced

---

## 🧪 Testing After Deploy (~2 min)

**API**: https://svarog-tracer.vercel.app/api/banners  
**Website**: Refresh → should show "Columbina / Ineffa" and weapon

---

## 📝 Commits

1. `61426f6` - Created `/api/banners.js`
2. `9165594` - Bot uses API
3. `920b4f8` - Fixed game property
4. `9030ca1` - Updated Genshin search
5. `c161dd0` - Widened search range
6. `d9511e1` - **Genshin manual config (FIX!)**

---

## 💡 Key Learnings

**Don't over-engineer!** Bot had simple manual config that worked perfectly. API tried complex auto-discovery and failed. Manual config = 20 lines vs 70+ lines of buggy code.

**When updating Genshin**: Just edit the CONFIG object, commit, push. Cache clears in 1 hour or redeploy clears immediately.
