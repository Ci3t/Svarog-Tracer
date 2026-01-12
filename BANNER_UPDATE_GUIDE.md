# How to Add New Banners to the Tracker

## Quick Guide (3 Steps)

### Step 1: Edit the CSV File
Open `debugstxt/banner.csv` and add your new banner entries:

```csv
# of Banners    Versions    Characters
1              3.9         New Character Name
2              3.9         Existing Character  
```

**Format:**
- **Column 1**: Total appearances for this character (1 for new, increment for reruns)
- **Column 2**: Version number (e.g., 3.9, 4.0)
- **Column 3**: Character name (must match StarRailRes metadata)

**Special Cases:**
- **v3.8** has 3 phases - add 6 characters (first 2 = P1, middle 2 = P2, last 2 = P3)
- **Dan Heng PT**: Use exactly "Dan Heng PT" or "Imbibitor Lunae"
- **Topaz**: Use "Topaz" (not "Topaz & Numby")

### Step 2: Run the Converter
```bash
node struct_converter.cjs
```

This will automatically:
- Parse the CSV
- Split versions into phases (2 phases normally, 3 for v3.8)
- Generate `src/data/bannerHistory.json`
- Calculate drought counters

### Step 3: Refresh Browser
That's it! The page will automatically show:
- ✅ New characters in the grid
- ✅ Updated drought counters
- ✅ Refreshed rerun predictions

---

## Character Name Reference

**Important:** Character names must match the StarRailRes GitHub repo format.

### Common Names (Already Mapped):
- Dan Heng PT → Imbibitor Lunae (auto-mapped)
- Topaz & Numby → Topaz (auto-mapped)

### Find Character Names:
1. Go to: https://starrailstation.com/en/characters
2. Click on the character
3. Use the displayed name (e.g., "The Herta", "Ruan Mei", "Fu Xuan")

---

## Examples

### Adding a New Character (v3.9)
```csv
1    3.9    Castorice
1    3.9    Tribbie
```

### Adding a Rerun
```csv
4    3.9    Kafka        # 4th appearance
2    3.9    Feixiao      # 2nd appearance (first rerun)
```

### Multi-Phase Version (Like v3.8)
```csv
1    3.8    The Dahlia   # Phase 1
4    3.8    Firefly      # Phase 1
3    3.8    Fugue        # Phase 2
3    3.8    Lingsha      # Phase 2
3    3.8    Sunday       # Phase 3
3    3.8    Aglaea       # Phase 3
```

---

## Troubleshooting

### Character Image Not Showing?
1. Check if the name matches StarRailStation exactly
2. Add a manual override in `src/utils/warpDataService.js`:
```javascript
// In fetchCharacterMetadataMap() function, around line 850
nameToImage["CSV Name"] = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/XXXX.png";
```

### Wrong Phase Split?
- The converter automatically splits characters evenly (half per phase)
- For special versions like 3.8, add them to `struct_converter.cjs` (lines 51-70)

---

## Automatic Updates (Future)

Currently, banner data is managed manually via CSV. **Automatic fetching from StarRailStation** could be implemented:

### Potential API:
- **Characters**: `https://starrailstation.com/api/v1/characters`
- **Banner History**: Not publicly available yet

### Implementation Steps (Future):
1. Create a script to fetch current banners from StarRailRes or StarRailStation
2. Compare with existing data
3. Auto-append new entries to CSV
4. Run converter automatically

**Note:** This would require stable API endpoints for banner history, which don't exist yet. For now, manual CSV updates are the most reliable method.

---

## Files Reference

- **CSV Source**: `debugstxt/banner.csv`
- **Converter**: `struct_converter.cjs`
- **Generated JSON**: `src/data/bannerHistory.json`
- **Metadata Service**: `src/utils/warpDataService.js` (line 816+)
- **Main Component**: `src/pages/BannerTracker.jsx`

---

## Quick Commands

```bash
# Update banners
node struct_converter.cjs

# Clear localStorage (forces metadata refresh)
# Run in browser console:
localStorage.clear()
```
