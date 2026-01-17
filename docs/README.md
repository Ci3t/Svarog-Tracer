# Quick Start: Updating Banners

## 🚨 Emergency Update (2 minutes)

### Discord Bot Only
1. Edit `discord-bot/config/banners.js`
2. Restart bot: `Ctrl+C` then `node index.js`
3. Test: `/wcheck <banner_id>`

### Website + Bot (Complete Fix)
1. **Backend API** (for `/ids` command):
   - HSR: Edit `api/hsr/banners.js` → `MANUAL_OVERRIDES`
   - Genshin: Edit `api/genshin/banners.js` → `OVERRIDE_MAP`
   - WuWa: Usually auto-discovers (rarely needs manual update)

2. **Discord Bot** (for `/wcheck` display):
   - Edit `discord-bot/config/banners.js`
   - Restart bot

---

## 📁 File Locations

```
Project Root/
├── api/                          ← Website backend (affects /ids)
│   ├── hsr/banners.js           ← HSR banner discovery
│   ├── genshin/banners.js       ← Genshin banner discovery
│   └── wuwa/banners.js          ← WuWa banner discovery
│
└── discord-bot/
    └── config/banners.js         ← Bot banner names/images (affects /wcheck)
```

---

## 🎯 What Each File Does

| File | Affects | Auto-Restart? |
|------|---------|---------------|
| `api/*/banners.js` | `/ids` command, website banner list | ✅ Yes (serverless) |
| `discord-bot/config/banners.js` | `/wcheck` banner names & images | ❌ No (manual restart) |

---

## 📚 Detailed Guides

- **[Discord Bot Banners](bot-banners.md)** - Update `/wcheck` display
- **[Website Banners](website-banners.md)** - Update `/ids` and website
- **[Finding Banner IDs](finding-banner-ids.md)** - How to find IDs

---

## ✅ Testing Checklist

After updating:

- [ ] `/ids` shows new banner (backend API working)
- [ ] `/wcheck <id>` shows correct name (bot config working)
- [ ] `/wcheck <id>` shows correct image (bot config working)
- [ ] Website shows new banner (backend API working)

---

## 🔧 Example: New HSR Patch (Sunday)

### 1. Update Backend API (`api/hsr/banners.js`)
```javascript
const MANUAL_OVERRIDES = {
    "2103": {
        name: "Sunday",
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1310.png",
        type: "character"
    }
};
```

### 2. Update Bot Config (`discord-bot/config/banners.js`)
```javascript
characters: [
    { 
        bannerId: "2103",
        name: "Sunday",
        characterId: "1310",
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1310.png"
    }
]
```

### 3. Restart Bot
```bash
Ctrl+C
node index.js
```

### 4. Test
```
/ids → Should show "Sunday: 2103"
/wcheck 2103 → Should show Sunday with image
```

Done! ✨
