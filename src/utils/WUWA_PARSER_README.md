# WuWa Adaptive Parser - Self-Healing System

## Overview
The WuWa Adaptive Parser is a **self-healing HTML scraper** that automatically adapts when WuWa Tracker changes their HTML structure. It's designed to work on **GitHub Pages** (static frontend only, no backend).

## How It Works

### 1. Multiple Parsing Strategies
The parser tries 3 different strategies in order:

- **Strategy 1 (v1_current)**: Current regex patterns for v4.0 WuWa Tracker
  - Tries multiple variations of field names (`histogram`, `itemNameHistogram`, etc.)
  - Handles escaped quotes and different quote styles
  
- **Strategy 2 (v2_nextdata)**: Next.js `__NEXT_DATA__` structure
  - Parses the Next.js data blob directly
  - Works if WuWa Tracker migrates to a different rendering method
  
- **Strategy 3 (v3_heuristic)**: Heuristic pattern matching
  - Looks for ANY JSON structure that looks like a pity histogram
  - Most aggressive fallback - finds patterns like `{"1":1234,"2":1235,...}`

### 2. Data Validation
Before returning results, the parser validates:
- Total pulls is in realistic range (5k - 500k)
- Histogram has at least 50 pity values
- Percentages sum to ~1.0 (0.95 - 1.05)

If validation fails, it tries the next strategy.

### 3. Strategy Caching
Once a strategy succeeds:
- It's stored in `localStorage` under key `wuwa_parser_working_strategy`
- Next time, that strategy is tried FIRST (faster performance)
- If the cached strategy fails, it's automatically cleared and all strategies are retried

## Usage

```javascript
// In warpDataService.js (already integrated)
import { parseWuWaHTML_Adaptive } from './wuwaAdaptiveParser.js';

// Just call it - it handles everything automatically
const stats = parseWuWaHTML_Adaptive(htmlString);

if (stats) {
  // Success! Use stats.stats.by_rollnum_pulls_5, etc.
} else {
  // All strategies failed - WuWa Tracker changed significantly
  // Check console for detailed logs
}
```

## What Happens When HTML Changes?

### Scenario 1: Minor Change (e.g., field rename)
```
WuWa Tracker changes "histogram" → "pityDistribution"
```
1. Cached strategy v1 tries old patterns → fails
2. Cache cleared automatically
3. Strategy v1 tries ALL pattern variations → one matches
4. Success! New pattern cached

### Scenario 2: Major Change (e.g., Next.js v5 update)
```
WuWa Tracker completely changes rendering
```
1. Strategy v1 tries all regex patterns → all fail
2. Strategy v2 tries __NEXT_DATA__ parsing → succeeds!
3. Success! v2 cached for next time

### Scenario 3: Complete Restructure
```
WuWa Tracker moves to a new platform entirely
```
1. Strategies v1 and v2 fail
2. Strategy v3 heuristic search finds histogram in HTML → succeeds!
3. Success! v3 cached

### Scenario 4: Truly Broken
```
WuWa Tracker removes public stats entirely
```
1. All 3 strategies fail
2. Console logs: "❌ ALL STRATEGIES FAILED"
3. Returns `null`
4. UI shows error to user

## Console Logging
The parser logs everything for debugging:

```
[WuWa Adaptive] Starting parse, HTML length: 245678
[WuWa Adaptive] Trying cached: v1_current
[WuWa Strategy 1] Trying current patterns...
[WuWa Strategy 1] Histogram extracted with 80 pity values
[WuWa Builder] Character banner: Lynae × 2 = 114175
[WuWa Validator] ✓ Data validated successfully
[WuWa Adaptive] ✓ Cached strategy worked!
```

## Maintenance

### When You Need to Update
If all strategies fail AND you need to add a new pattern:

1. Open `wuwaAdaptiveParser.js`
2. Add a new pattern to the appropriate strategy (usually `parseStrategy_v1`)
3. Deploy to GitHub Pages
4. Done! No need to manually clear caches - the system will auto-discover the new pattern

### Adding a New Strategy
If WuWa Tracker changes DRASTICALLY (e.g., moves to a new site):

```javascript
// In wuwaAdaptiveParser.js

function parseStrategy_v4(html) {
  console.log('[WuWa Strategy 4] Trying new method...');
  
  // Your new parsing logic here
  // Example: API endpoint scraping, GraphQL parsing, etc.
  
  return buildWuWaStats(histogramData, characterData);
}

// Add to strategies array in parseWuWaHTML_Adaptive
const strategies = [
  { name: 'v1_current', fn: parseStrategy_v1 },
  { name: 'v2_nextdata', fn: parseStrategy_v2 },
  { name: 'v3_heuristic', fn: parseStrategy_v3 },
  { name: 'v4_newmethod', fn: parseStrategy_v4 }  //  NEW
];
```

## Benefits for GitHub Pages Deployment

✅ **No Backend Needed** - Pure JavaScript, works on static hosting  
✅ **Auto-Healing** - Adapts to HTML changes without manual intervention  
✅ **Performance** - Caches working strategy for fast subsequent loads  
✅ **Detailed Logging** - Easy to debug when something breaks  
✅ **Graceful Degradation** - Falls back through multiple strategies  
✅ **User-Friendly** - Clear error messages when truly broken  

## Files

- `wuwaAdaptiveParser.js` - The adaptive parser module
- `warpDataService.js` - Imports and uses the adaptive parser
- `WarpAnalyzer.jsx` - UI that calls `fetchWuWaStats()`

## Future Improvements

- Add Strategy v4 for WuWa Tracker v5.0 (when it comes)
- Add telemetry to track which strategies succeed most often
- Add automatic GitHub issue reporting when all strategies fail
- Add pattern learning from successful parses
