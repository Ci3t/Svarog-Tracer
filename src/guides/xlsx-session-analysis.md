# XLSX Session Analysis

This report summarizes the deeper XLSX pass from:

- [All Data HSR.xlsx](/d:/Coding/HSR_PatternRecord/debugpatternfiles/All%20Data%20HSR.xlsx)
- [Backend Data Input Sheet.xlsx](/d:/Coding/HSR_PatternRecord/debugpatternfiles/Backend%20Data%20Input%20Sheet.xlsx)

The analysis only looks at **2-str / first 2 digits** because that is the current strongest input for Svarog-like roll flow.

## Parsing Notes

- No `openpyxl` or `pandas` were available in the environment.
- Both files were parsed directly from XLSX XML.
- `All Data HSR.xlsx` uses:
  - `AllData` -> `worksheets/sheet1.xml`
- `Backend Data Input Sheet.xlsx` uses:
  - `New Alldata` -> `worksheets/sheet2.xml`

## Dataset Sizes

### All Data HSR
- usable rows: `45,290`
- fields used:
  - `Weekday`
  - `Formation`
  - `Region`
  - `Patch`

### Backend Data Input Sheet
- usable rows: `14,598`
- fields used:
  - `Day`
  - `String`
  - `Time`
  - `Server`
  - `Patch`
  - `2 line`

## Global 2-str Frequency

### All Data HSR
- `43`: `11,630`
- `44`: `11,438`
- `42`: `11,238`
- `41`: `10,984`

This is close to balanced, with a slight `43/44` lean.

### Backend Data Input Sheet
- `41`: `3,709`
- `43`: `3,634`
- `42`: `3,633`
- `44`: `3,622`

This is even flatter than the newer sheet.

## Important Conclusion

The XLSX files are **good for broad priors and motif mining**, but they are **not as strong as TXT debug sessions for long-form session dynamics**.

Reason:
- the newer broad dataset has many short contiguous blocks
- the backend sheet has better time order, but its global transitions are very flat

That means:
- TXT logs are still best for:
  - family feel
  - regime behavior
  - session drift
  - noise / recovery
- XLSX is best for:
  - patch priors
  - region priors
  - motif frequency
  - repeat/run likelihood

## All Data HSR: Contiguous Block Shape

When grouped by contiguous `(day, region, patch)`:

- blocks: `12,198`
- average block length: `3.71`

Top block lengths:
- `1`: `6,762`
- `2`: `2,484`
- `3`: `1,122`
- `4`: `624`

### Conclusion

This sheet is **not strong enough for deep session-chain inference** by itself.

It is still useful for:
- broad roll balance
- region weight
- patch-era weight

## Backend Sheet: Session-like Blocks

Grouped by:
- same `day`
- same `server`
- same `patch`
- split when time goes backward
- split when gap is more than `15 minutes`

Result:
- session-like blocks: `727`
- average block length: `20.08`

Top block sizes:
- `1`: `49`
- `3`: `38`
- `2`: `35`
- `9`: `31`
- `7`: `30`
- `5`: `29`

### Conclusion

This file is much better for session motif mining than the broad sheet.

## Backend Transition Probabilities

### After `41`
- `41`: `26.9%`
- `42`: `25.0%`
- `43`: `23.6%`
- `44`: `24.5%`

### After `42`
- `41`: `24.8%`
- `42`: `24.8%`
- `43`: `25.4%`
- `44`: `25.1%`

### After `43`
- `41`: `24.7%`
- `42`: `25.2%`
- `43`: `25.8%`
- `44`: `24.4%`

### After `44`
- `41`: `24.9%`
- `42`: `24.4%`
- `43`: `25.1%`
- `44`: `25.6%`

### Conclusion

The backend sheet is **surprisingly uniform at the one-step transition level**.

So:
- it should **not** dominate the engine as a hard transition matrix
- instead it should shape:
  - soft priors
  - motif frequency
  - repeat/run tolerance

## Run Lengths

Average run lengths from backend session-like blocks:

- `41`: `1.341`
- `42`: `1.310`
- `43`: `1.324`
- `44`: `1.322`

Runs longer than 1 occur about:
- `41`: `24.2%`
- `42`: `23.7%`
- `43`: `24.4%`
- `44`: `24.2%`

### Conclusion

The backend sheet suggests:
- short runs are normal
- long runs should stay uncommon
- all four values can repeat, but not too heavily

## Strong Pair / Motif Signals

### Top 2-roll motifs
- `41 41`
- `43 43`
- `44 44`
- `42 43`
- `41 42`
- `42 44`
- `43 42`
- `44 43`
- `44 41`
- `42 41`
- `41 44`
- `42 42`

### Top 3-roll motifs
- `41 41 41`
- `42 42 44`
- `42 44 42`
- `41 41 42`
- `44 43 44`
- `41 44 43`
- `44 42 41`
- `42 43 41`
- `44 44 44`
- `41 42 41`

### Top 4-roll motifs
- `41 41 41 41`
- `42 41 44 42`
- `41 42 41 41`
- `41 44 42 41`
- `42 42 44 44`
- `44 41 44 43`
- `42 43 41 42`

### Conclusion

There is meaningful motif repetition, but it is **not one single universal loop**.

That supports the current engine direction:
- starter motifs
- family bias
- soft transition weighting
- hidden state / regime drift

## Server Differences

### America
Top tri motifs:
- `41 41 41`
- `41 44 43`
- `43 44 44`
- `42 42 42`
- `44 41 44`

### Asia
Top tri motifs:
- `42 44 42`
- `41 43 43`
- `43 42 41`
- `43 43 43`
- `42 44 41`

### Europe
Top tri motifs:
- `41 41 41`
- `43 44 43`
- `44 44 43`
- `41 42 41`
- `44 43 44`

### Conclusion

Server flavor is real enough to justify:
- region priors
- region motif bias

But not strong enough to create entirely different engines per server.

## Patch Differences

Sample patch motif leaders:

### Patch `2.3`
- `44 42 41`
- `43 44 42`
- `41 41 41`

### Patch `2.5`
- `41 41 41`
- `42 42 42`
- `43 44 43`

### Patch `2.6`
- `41 41 41`
- `43 41 44`
- `41 44 43`

### Patch `3.0`
- `42 43 42`
- `44 44 44`
- `43 42 41`

### Patch `3.3`
- `43 43 41`
- `41 42 43`
- `41 43 43`

### Conclusion

Patch flavor is real enough to justify:
- patch-era weighting
- motif overlays by era

But again, not a total rewrite of the engine per patch.

## Final Take

### Best use of `All Data HSR.xlsx`
- broad region priors
- broad patch-era priors
- overall roll balance

### Best use of `Backend Data Input Sheet.xlsx`
- session-like blocks
- repeat/run behavior
- motif frequency
- server flavor

### Best use of TXT debug files
- hidden-state behavior
- family drift
- noise / recovery feel
- challenge seed style

## Practical Engine Recommendation

The engine should remain:

1. TXT-led for session family behavior
2. XLSX-assisted for:
- priors
- motif bias
- run-length bias
- region/patch overlays

That is stronger than trying to make the XLSX sheets the only source of truth.
