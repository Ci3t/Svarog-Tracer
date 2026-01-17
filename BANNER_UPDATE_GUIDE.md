# Banner Update Guide - All Games

## 🎯 Quick Answer

**Is everything automated?**
- **HSR**: ✅ 100% automated (no updates needed)
- **Genshin**: ⚠️ 95% automated (only update 5-star lists when new characters release)
- **WuWa**: ✅ 100% automated (no updates needed)

**Is manual updating easy?**
✅ Yes! All in one file: [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js)

---

## 📁 File Structure

```
api/
├── banners.js          ← MAIN FILE (all banner logic)
├── genshin/
│   └── stats.js        ← Stats endpoint (no updates needed)
└── wuwa/
    └── stats.js        ← Stats endpoint (no updates needed)
```

**You only ever need to edit:** `api/banners.js`

---

## 🎮 Game-by-Game Guide

### **HSR (Honkai: Star Rail)**

#### Automation Level: ✅ 100%

**How it works:**
- Fetches config from StarRailStation API
- Auto-discovers active banners
- No manual updates needed!

#### Manual Override (Optional)

If API fails, edit [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L95-L130):

```javascript
// Lines 95-130: HSR banner mapping
const hsrBannerMap = {
  2100: { charId: 8006, type: 'character' }, // Add new banner
  ...
};
```

**When to use:** Only if StarRailStation API is down.

---

### **Genshin Impact**

#### Automation Level: ⚠️ 95%

**What's automated:**
- ✅ Banner ID discovery (searches 300100→300090, 400100→400090)
- ✅ Banner image generation
- ✅ Stats fetching

**What needs manual update:**
- ⚠️ 5-star character/weapon lists (when new ones release)

#### Update Process (Every ~3 Weeks)

Edit [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L157-L181):

**1. Add New 5★ Character** (Line 157-166):
```javascript
const GENSHIN_5STAR_CHARS = [
  'albedo', 'alhaitham', 'aloy', ..., // existing
  'new_character_name',  // ← ADD HERE (lowercase, use underscores)
];
```

**2. Add New 5★ Weapon** (Line 169-181):
```javascript
const GENSHIN_5STAR_WEAPONS = [
  'aqua_simulacra', 'amos_bow', ..., // existing
  'new_weapon_name',  // ← ADD HERE (lowercase, use underscores)
];
```

**Examples:**
- Character: `'columbina'`, `'mavuika'`, `'zhongli'`
- Weapon: `'nocturnes_curtain_call'`, `'staff_of_homa'`

#### Manual Banner Override (Rarely Needed)

If auto-discovery fails, edit [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L21-L38):

```javascript
GENSHIN_MANUAL: {
  characters: [
    { 
      bannerId: "300094",  // ← Change ID
      name: "Columbina / Ineffa",  // ← Change names
      image: "https://paimon.moe/images/characters/columbina.png"
    }
  ],
  weapons: [
    { 
      bannerId: "400093", 
      name: "Nocturne's Curtain Call / Fractured Halo",
      image: "https://paimon.moe/images/weapons/nocturnes_curtain_call.png"
    }
  ]
}
```

**When to use:** Only if paimon.moe data is wrong/missing.

---

### **WuWa (Wuthering Waves)**

#### Automation Level: ✅ 100%

**How it works:**
- Scrapes wuwatracker.com website
- Auto-discovers active banners
- Adaptive HTML parser (self-healing)
- No manual updates needed!

#### Manual Override (Optional)

If scraping fails, you can hardcode banners in [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L278-L350):

Look for the `fetchWuWaLiveBanners()` function and add fallback data if needed.

**When to use:** Only if WuWa Tracker completely changes their HTML structure.

---

## 🚀 Deployment Process

After any manual edit:

```bash
git add api/banners.js
git commit -m "Update banners: [describe change]"
git push
```

**Vercel auto-deploys in ~2 minutes!**

---

## 🧪 Testing After Update

### Test Banner Discovery
```bash
curl https://svarog-tracer.vercel.app/api/banners
```

Should return JSON with all game banners.

### Test Individual Stats
```bash
# Genshin
curl https://svarog-tracer.vercel.app/api/genshin/stats?id=300094

# WuWa
curl https://svarog-tracer.vercel.app/api/wuwa/stats?id=100031
```

---

## 📊 Summary Table

| Game | Auto-Discovers Banners | Manual Updates Needed | Update Frequency |
|------|:---------------------:|:---------------------:|:----------------:|
| **HSR** | ✅ Yes | ❌ None | Never |
| **Genshin** | ✅ Yes | ⚠️ 5-star lists only | Every 3 weeks |
| **WuWa** | ✅ Yes | ❌ None | Never |

---

## 🎯 Quick Checklist

### When Genshin Patch Drops (Every 3 Weeks)

- [ ] Check if new 5-star character released
  - [ ] Add to `GENSHIN_5STAR_CHARS` array
- [ ] Check if new 5-star weapon released
  - [ ] Add to `GENSHIN_5STAR_WEAPONS` array
- [ ] Commit and push
- [ ] Wait 2 min for Vercel deploy
- [ ] Test on website

**That's it!** Everything else is automated.

---

## 🔧 Troubleshooting

### "Banner not showing on website"

1. **Check API response:**
   ```bash
   curl https://svarog-tracer.vercel.app/api/banners | python -m json.tool
   ```

2. **Check if name is in 5-star list** (Genshin only)
   - View [`api/banners.js`](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L157-L181)
   - Add missing character/weapon

3. **Clear cache:**
   - Wait 15 minutes (cache expiry)
   - OR redeploy on Vercel (instant cache clear)

### "Stats data missing"

Stats are separate from banners. Check:
- Genshin: `api/genshin/stats.js`
- WuWa: `api/wuwa/stats.js`

Usually no edits needed - these just fetch from source APIs.

---

## 💡 Pro Tips

1. **Genshin names**: Always lowercase with underscores
   - ✅ `'sangonomiya_kokomi'`
   - ❌ `'Sangonomiya Kokomi'`
   - ❌ `'sangonomiya-kokomi'`

2. **Cache**: Set to 15 minutes for fresh data
   - Change in [`api/banners.js` line 12](file:///d:/Coding/HSR_PatternRecord/api/banners.js#L12)

3. **Testing locally**: Run `vercel dev` to test before deploying

4. **Logs**: Check Vercel dashboard for API logs if something breaks

---

**Need help?** Check [`dbgtxt/banner_api_summary.md`](file:///d:/Coding/HSR_PatternRecord/dbgtxt/banner_api_summary.md) for detailed technical info.
