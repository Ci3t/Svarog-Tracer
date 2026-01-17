# Banner Update Guide - All Games

## 🎯 Quick Answer

**Is everything automated?**
- **HSR**: ✅ 100% automated (no updates needed)
- **Genshin**: ⚠️ 95% automated (only update 5-star lists when new characters release)
- **WuWa**: ⚠️ Manual Config Only (Anti-bot blocks automation)

**Is manual updating easy?**
✅ Yes! All in one file: [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js)

---

## 🎮 Game-by-Game Guide

### **HSR (Honkai: Star Rail)**

#### Automation: ✅ 100%
- Source: StarRailStation API
- Status: Fully working.
- Stats: Fetching & Calculating ✅

---

### **Genshin Impact**

#### Automation: ⚠️ 95% (Whitelists)
- Source: Paimon.moe (Backend Fetch)
- Updates: Auto-detects banners, but you MUST add new 5-star names to whitelist.
- Stats: Fetching from Paimon.moe ✅

#### Update Process (Every ~3 Weeks)
Edit [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js):
1. Add new character name to `GENSHIN_5STAR_CHARS` array.
2. Add new weapon name to `GENSHIN_5STAR_WEAPONS` array.

---

### **WuWa (Wuthering Waves)**

#### Automation: ❌ Manual Only
- Source: Manual Config (WuWa Tracker blocks scraping)
- Updates: Must manually hardcode current banners.
- Stats: ❌ **Unavailable** (HTML parsing blocked by anti-bot)

#### Update Process (Every ~6 Weeks)
Edit [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js):
Find `fetchWuWaLiveBanners()` and update `CURRENT_BANNERS`:

```javascript
const CURRENT_BANNERS = [
  { 
    id: '100032',  // New Banner ID (from wuwatracker.com URL)
    name: 'Mornye',  // Character Name
    type: 'character',
    image: 'https://wuwatracker.com/_next/image?url=...&w=828&q=75',
    game: 'wuwa'
  },
  // Update weapon similarly...
];
```

---

## 🚀 Deployment

After any edit:
```bash
git add api/banners.js
git commit -m "Update banners"
git push
```
Vercel updates automatically locally and on production.

---

## 📊 Sync Status
- **Backend**: Serves all games via `/api/banners`.
- **Website**: Fetches from Backend ✅
- **Discord Bot**: Fetches from Backend ✅
- **Sync**: **1:1 Exact Match** (Single Source of Truth)
