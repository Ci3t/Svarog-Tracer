# Finding Banner IDs

## Quick Reference

| Game | Where to Find | Format | Example |
|------|---------------|--------|---------|
| **HSR Characters** | `/ids` command or starrailstation.com | `2XXX` | `2101` |
| **HSR Light Cones** | `/ids` command or starrailstation.com | `3XXX` | `3101` |
| **Genshin Characters** | paimon.moe or `/ids` command | `300XXX` | `300094` |
| **Genshin Weapons** | paimon.moe or `/ids` command | `400XXX` | `400093` |
| **WuWa** | wuwatracker.com or `/ids` command | `1XXXXX` (char) / `2XXXXX` (weapon) | `100031` |

---

## Method 1: Discord Bot `/ids` Command

**Easiest method** - Works for all games

1. Open Discord
2. Type `/ids`
3. Select game from dropdown
4. Bot shows all current banner IDs

**Example output:**
```
🎮 Honkai: Star Rail
⭐ 5-Star Banners
Fugue: 2101
Lingsha: 2102

🔦 Light Cone Banners
Long Road Leads Home: 3101
Scent Alone Stays True: 3102
```

---

## Method 2: HSR - StarRailStation.com

1. Go to https://starrailstation.com/en/warp
2. Click on a banner
3. Look at the URL: `https://starrailstation.com/en/warp/2101`
4. The number at the end is the banner ID

**Finding Character/LC IDs for images:**

1. Go to https://github.com/Mar-7th/StarRailRes
2. Browse to:
   - Characters: `icon/character/`
   - Light Cones: `image/light_cone_portrait/`
3. Find the character/LC image file
4. The filename number is the ID (e.g., `1225.png` = ID 1225)

**Quick lookup:**
```bash
# Search for character by name
curl -s "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json" | grep -i "fugue" -A 2 -B 2

# Search for light cone by name
curl -s "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json" | grep -i "long road" -A 2 -B 2
```

---

## Method 3: Genshin - Paimon.moe

1. Go to https://paimon.moe/wish
2. Select the banner you want
3. Look at the URL parameter: `?banner=300094`
4. The number is the banner ID

**Character/Weapon image names:**

Images use lowercase names with underscores:
- Character: `columbina.png`
- Weapon: `nocturnes_curtain_call.png`

Full URL format:
- Characters: `https://paimon.moe/images/characters/{name}.png`
- Weapons: `https://paimon.moe/images/weapons/{name}.png`

---

## Method 4: WuWa - WuWaTracker.com

1. Go to https://wuwatracker.com/convene
2. Click on a banner
3. Look at the URL: `https://wuwatracker.com/convene/100031`
4. The number is the banner ID

**ID Format:**
- Character banners: Start with `1` (e.g., `100031`)
- Weapon banners: Start with `2` (e.g., `200031`)

---

## Method 5: API Direct Check

### HSR
```bash
curl "https://starrailstation.com/api/v1/warp_config/" | jq '.data.warp_list'
```

### Genshin
```bash
# Try sequential IDs
curl "https://api.paimon.moe/wish/300094"
curl "https://api.paimon.moe/wish/300095"
curl "https://api.paimon.moe/wish/400093"
curl "https://api.paimon.moe/wish/400094"
```

### WuWa
```bash
# Check HTML source
curl "https://wuwatracker.com/convene" | grep -o 'convene/[0-9]*'
```

---

## Banner ID Patterns

### HSR
- **2001-2099**: Character event banners
- **3001-3099**: Light cone event banners
- **5001-5099**: Collaboration character banners (Fate)
- **6001-6099**: Collaboration light cone banners (Fate)
- **2099**: Global stats (all-time)

### Genshin
- **300001-399999**: Character event banners
- **400001-499999**: Weapon event banners
- IDs increment sequentially with each new banner

### WuWa
- **100001-199999**: Character convene banners
- **200001-299999**: Weapon convene banners

---

## Common Issues

**ID not found:**
- Banner might not be active yet
- Wait for patch to go live
- Check if using correct game's ID format

**Multiple IDs for same banner:**
- Genshin dual character banners sometimes have separate IDs
- Use the one that appears in `/ids` command
- Both IDs usually work

**Image not loading:**
- Verify character/LC ID is correct
- Check if image exists in repository
- Try browsing the GitHub repo manually
