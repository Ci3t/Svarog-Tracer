# 🎮 Genshin Banner Update Guide

This guide explains how to update the Genshin Impact banners on the website.

## 📍 File to Edit
Open: `api/banners.js`

Everything you need to change is in the **`GENSHIN_CONFIG`** block at the very top of the file.

---

## 🛠️ Step 1: Update Active Banners
When a new banner releases, update the `active` section:

```javascript
active: {
  charBannerId: "300095",    // Get ID from paimon.moe/wish/tally
  weaponBannerId: "400094",  // Get ID from paimon.moe/wish/tally
  
  // Forces these names to show even if "Auto-Discovery" is still warming up
  forceName: "Zibai / Neuvillette", 
  forceWeaponName: "Lightbearing Moonshard / Tome of the Eternal Flow",
  
  // URL to the character portrait
  forceImage: "https://paimon.moe/images/characters/zibai.png",
},
```

## 🛠️ Step 2: Update Whitelists
Ensure the new character/weapon internal names are in the lists so the analyzer recognizes the data:

*   **`characters`**: Add the internal name (e.g., `'zibai'`). **Must be lowercase.**
*   **`weapons`**: Add the weapon internal name (e.g., `'lightbearing_moonshard'`). **Must be lowercase.**

---

## 💡 Troubleshooting
*   **"Still showing old banner"**: Refresh your browser with `Ctrl + F5`. The server-side cache resets every **1 minute**.
*   **"Standard character showing as name"**: If a standard character (like Tighnari) is appearing instead of the featured one, add them to the `standard` array in `api/banners.js`.
*   **"Images aren't loading"**: Ensure the `forceImage` URL is correct and points to a `.png` or `.webp` file.

---

## 🚀 Environment
The API URL is now **Relative** (`/api/banners`). 
- **Local Dev**: Automatically talks to your local `vercel dev` server.
- **Production**: Automatically talks to the Vercel cloud server.
**No code changes needed between Push/Pull.**
