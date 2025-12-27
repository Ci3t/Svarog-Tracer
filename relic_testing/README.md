# 📊 Relic Testing Tracker

## 📁 Files Created
- **upgrade_tests.csv** - Main testing spreadsheet (open in Google Sheets/Excel)

## 📝 How to Use

1. **Open `upgrade_tests.csv` in Google Sheets**:
   - Right-click → Open with → Google Sheets
   - OR upload to Google Drive

2. **For each test, fill in**:
   - **Test #**: Sequential number
   - **Phase (+/-)**: Leave blank initially, fill in once you know
   - **Upgrade Level**: +0→+3, +3→+6, etc.
   - **Main Relic Type**: Head/Hand/Body/Boot/Orb/Rope
   - **Main Relic Position**: Inventory slot (1-999)
   - **Target Stat**: What you want to upgrade (CDMG, CRate, etc.)
   - **Main Relic Subs**: List all substats it has
   - **Fodder Type**: Head/Hand/Body/Boot/Orb/Rope
   - **Fodder Position**: Inventory slot
   - **Fodder Stat**: The stat you're using to "lead" (CDMG, BE, etc.)
   - **Fodder Upgraded?**: No / +3 / +6 / etc.
   - **Result**: Hit or Miss
   - **What Upgraded**: What actually got upgraded
   - **Notes**: Any observations

3. **After 5-10 tests**:
   - Look for patterns
   - Share the CSV with me
   - We'll analyze together!

## 🎯 Quick Reference

### Stat Groups
- **G1 (Flats)**: Flat HP, Flat ATK, Flat DEF
- **G2 (%)**: HP%, ATK%, DEF%
- **G3 (Offensive)**: SPD, CRate, CDMG
- **G4 (Utility)**: EHR, ERes, BE

### Relic Types
- **Main Pieces**: Head, Hand, Body, Boot
- **Planar**: Orb, Rope

### Phase Theory
- **(+) Phase**: Same stat leads
- **(-) Phase**: Same stat blocks

## 💡 Testing Tips

1. **Start simple**: Test same stat at +3 (5 tests)
2. **One variable**: Change only one thing per test
3. **Note everything**: Even "failed" tests give data
4. **Position matters**: Track inventory slots
5. **Fodder state**: Note if fodder is upgraded

## 📊 Example Entry

```
Test #: 1
Phase: ?
Upgrade Level: +0→+3
Main Relic Type: Helmet
Main Relic Position: Slot 15
Target Stat: CDMG
Main Relic Subs: CDMG, SPD, ATK%
Fodder Type: Helmet
Fodder Position: Slot 42
Fodder Stat: CDMG
Fodder Upgraded?: No
Result: Hit
What Upgraded: CDMG
Notes: Same stat test
```

Good luck with testing! 🎲
