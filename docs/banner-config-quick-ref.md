# 🏥 Banner Update Quick Reference

To update banners displayed on the site, the main file is **[banners.js](file:///d:/Coding/HSR_PatternRecord/api/banners.js)**.

## 🏮 Genshin Impact (Manual Update Required)
Genshin doesn't have a clean "Active Banner" API, so we manually point the bot to the current banner IDs.

### Method 1: The "Force" Method (Easiest)
Find the `GENSHIN_CONFIG` at the top of the file and update these 5 lines:

```javascript
active: {
  charBannerId: "300095",            // The ID from Paimon.moe
  weaponBannerId: "400094",          // The ID from Paimon.moe
  forceName: "Zibai / Neuvillette",   // Display name (Char1 / Char2)
  forceWeaponName: "...",            // Weapon display names
  forceImage: "...",                 // URL for the portrait image
},
```

### Method 2: The "Auto-Discovery" Method
If you leave `forceName` as `null`, the bot will try to find the newest banner itself. 
Scroll down to line **275** and increment these IDs when a new patch drops:

```javascript
const [chars, weapons] = await Promise.all([
  findBanners(110, '300', 'character'), // Increase 110 to 111, 112, etc.
  findBanners(110, '400', 'weapon')
]);
```

---

## 🚂 Honkai: Star Rail (Automatic)
**No action needed!** The code automatically fetches the newest active banners from *StarRailStation*.

## 🌊 Wuthering Waves (Automatic)
**No action needed!** The code scrapes *WuWa Tracker* automatically to find the latest character and weapon banners.

---

## 🧹 Clearing the Cache
The website caches banner data for about **1 minute**. 
If you don't see your changes immediately:
1. Wait 60 seconds.
2. OR: Increment `CACHE_VERSION` on line **47** to force an instant refresh for everyone.

```javascript
CACHE_VERSION: 2, // Change to 3, 4, etc.
```
