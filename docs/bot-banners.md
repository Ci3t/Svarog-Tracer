# Discord Bot Banner Updates

## Quick Reference

**File to edit:** `discord-bot/config/banners.js`

**After editing:** Restart bot (`Ctrl+C` then `node index.js`)

---

## HSR Character Banner

```javascript
characters: [
    { 
        bannerId: "2XXX",           // From /ids command
        name: "Character Name",      
        characterId: "1XXX",         // For image URL
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1XXX.png"
    }
]
```

### Example: Adding Sunday
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

---

## HSR Light Cone Banner

```javascript
lightCones: [
    { 
        bannerId: "3XXX",           
        name: "Light Cone Name",     
        lightConeId: "23XXX",        // For image URL
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_portrait/23XXX.png"
    }
]
```

### Example: Adding Eternal Calculus
```javascript
lightCones: [
    { 
        bannerId: "3103",
        name: "Eternal Calculus",
        lightConeId: "24001",
        image: "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_portrait/24001.png"
    }
]
```

---

## Genshin Character Banner

```javascript
characters: [
    { 
        bannerId: "300XXX",          
        name: "Character Name",       // Use " / " for dual banners
        image: "https://paimon.moe/images/characters/name.png"
    }
]
```

### Example: Dual Character Banner
```javascript
characters: [
    { 
        bannerId: "300095",
        name: "Mavuika / Citlali",
        image: "https://paimon.moe/images/characters/mavuika.png"
    }
]
```

---

## Genshin Weapon Banner

```javascript
weapons: [
    { 
        bannerId: "400XXX",          
        name: "Weapon 1 / Weapon 2", 
        image: "https://paimon.moe/images/weapons/name.png"
    }
]
```

### Example: Dual Weapon Banner
```javascript
weapons: [
    { 
        bannerId: "400094",
        name: "Flute of Ezpitzal / Calamity Queller",
        image: "https://paimon.moe/images/weapons/flute_of_ezpitzal.png"
    }
]
```

---

## Finding IDs

See **[Finding Banner IDs](finding-banner-ids.md)** guide.

---

## Testing

After updating and restarting:

1. Use `/ids` to verify banner appears
2. Use `/wcheck <banner_id>` to test display
3. Check that image, name, and stats load correctly

---

## Common Issues

**Image not showing:**
- Check character/LC ID is correct
- Verify image URL is accessible
- Use `icon/character/` for characters
- Use `image/light_cone_portrait/` for light cones

**Banner not appearing in /ids:**
- Make sure backend API is also updated (see [Website Banner Updates](website-banners.md))
- Check banner ID format matches game type

**Wrong lucky string:**
- This is from the stats API, not the config
- Config only controls name and image
