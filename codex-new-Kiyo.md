# Ci3t BIG NOTE - DONT DELETE ANY THING YOU ARE ALLOW TO ADD STUF AT THE BOTTOM
# Codex New Kiyo Notes

## Scope

Kiyo mode only. This is not the live 2-string Svarog predictor.

Top-2 is the real target. Top-3 is only a sanity metric, not a success metric, because the user is choosing 2 exact outcomes, not 3 or 4.

UI naming is now user-facing:

- `2 String` = first two digits / pair lane.
- `3 String` = full exact roll.
- The old separate `2-STRING` page toggle was removed. Kiyo is one 3 String workspace with 2 String tools embedded inside it.

## Latest Accuracy Adjustment

The sheet seed was still too influential because it was being merged into the scoring roll stream. That made imported/sheet rolls behave like live rolls. This is now corrected.

Current priority:

1. Live rolls dominate.
2. Typed prefix controls the active XYZ lane.
3. Seed/sheet data is only a small cold-start hint.
4. Seed is disabled once there are 5 live rolls.

Seed weights:

- 0 live / 1-2 live rolls: seed weight displayed as `16%`.
- 3-4 live rolls: seed weight displayed as `8%`.
- 5+ live rolls: seed weight `0%`.

The preview-lane Z weights are now replay-tuned for top-2 performance against the archived Kiyo files, not hand-tuned by feel.

## Predictor Behavior

Typing a prefix now scopes the exact predictor:

- Type `42` -> read `421/422/423/424` only.
- Type `43` -> read `431/432/433/434` only.

The global read is still available when no prefix is typed, but manual use should usually type the current 2-string prefix first.

## 2 String UI Improvement

`2 String Pair Tracker` now includes an internal predictor footer:

- Uses `COL 1`, `COL 2`, `COL 3` names with the pair labels beside them.
- Shows the current pair in plain English.
- Shows whether the engine says to stay or watch the opposite pair break in.
- Shows confidence without `N2`/`via` engine wording.
- Shows the backup pair from the second-best column.
- The main XY suggestion is larger so it can be read without parsing the table first.

The `2 String Lane Timeline` highlights the active followed column, so users can visually verify whether the column makes sense from recent rolls.

New block:

- `2 String Pattern Recognition` sits under the 2 String predictor.
- It watches each column's green/amber table rhythm.
- It detects return patterns, single-break snapbacks, short runs, alternating rows, and mixed tables.
- It is exposed as a manual assist first. The main 2 String scorer keeps the proven replay-tuned score unless the pattern system is tested strongly enough to replace it.
- The old `agree` / `watch` labels were replaced with clearer user wording:
  - `same as pick` = table rhythm supports the main 2 String pick.
  - `table warning` = table rhythm sees a different pair than the main pick.
- `2 String Lane Timeline` is newest-first now. Row `#1` is the most recent roll.
- A decision strip was added above the 2 String rows:
  - `Main read confirmed` means the predictor and pattern rhythm point to the same pair.
  - `Table warning` means keep the predictor pair first, but watch the named rhythm pair as the break.
- Pattern recognition was tested as a direct math override, but it lowered archived 2 String accuracy from about `60%` to `57%`. For now it is used as a breaker/confirmation layer, not a hard override.

Current archived-file replay for the first XY column suggestion:

```text
2 String first-pair hit: 60%
2 String top-2 column coverage: 79%
```

## 3 String Pair Tracker

`3 String Pair Tracker` remains scoped to the typed prefix and ranks the four possible Z outcomes inside that lane. It should be read after the 2 String predictor:

1. 2 String says which lane pair is live.
2. User types/uses current prefix.
3. 3 String Pair Tracker ranks the Z inside that prefix.

UI order is now:

1. 2 String Pair Tracker + 2 String Lane Timeline
2. 3 String Predictor + 3 String Pair Tracker
3. 3 String Breakdown table
4. Seed Assist

Added Rolls and Caesar Shift now sit side-by-side on wide screens to reduce vertical scrolling.

The 3 String cards now visually prioritize top-2. `WATCH` is still shown as context, but it is no longer styled like a third playable pick.

Latest scoring fix:

- Active typed prefix now penalizes zero-live-hit Z outcomes once that prefix has live evidence.
- This keeps a live-seen roll such as `411 x1` above a zero-hit roll such as `412 x0` inside the same `41x` table.
- The boost is deliberately conservative. A live hit breaks zero-hit ties, but it does not turn the engine into a blind repeat chaser.
- `3 String Breakdown` is trimmed to the latest 10 rows to reduce scroll while keeping the current table rhythm visible.

## Test Sequence

Input:

```text
441 -> 433 -> 422 -> 443 -> 431 -> 442 -> 432 -> 424 -> 421 -> 433 -> 421 -> 432 -> 433 -> 414 -> 432 -> 411 -> 444 -> 424 -> 412 -> 411
```

With enough live rolls, seed weight is `0`.

Prefix-scoped replay after warmup:

```text
Exact main  5/17  = 29%
Exact top-2 11/17 = 65%
Exact top-3 15/17 = 88%
```

Global read:

```text
MAIN  432
ALT   433
WATCH 431
2 String read: 43/44 is the break pair against current 41/42
```

Typed `42` read:

```text
MAIN  421
ALT   422
WATCH 424
```

Typed `43` read:

```text
MAIN  432
ALT   433
WATCH 431
```

## Cross-File Replay

Across 10 archived Kiyo debug files:

```text
Exact main  32%
Exact top-2 55%
Exact top-3 77%
2 String first-pair 60%
2 String top-2 column coverage 79%
```

Stronger files now sit around:

- `52%` to `65%` top-2 on several sessions
- `71%` top-2 on `Kiyo-Debug-v2-2025-12-18T11-01-46-384Z.txt`
- `71%` top-2 on the current 20-roll target session

Weak files still exist:

- `47%` top-2 on `Kiyo-Debug-v2-2025-12-18T09-46-30-928Z.txt`
- `45%` top-2 on `kiyo-debug-2026-04-24 (1).txt`
- `45%` top-2 on `kiyo-debug-2026-04-30 (2).txt`

## Remaining Concern

The biggest remaining issue is still exact ordering, not signal discovery. On the harder files the engine often identifies the correct lane family, but MAIN vs ALT can still invert when the local `3 String` lane is sparse or recently reset.

Tradeoff accepted in the latest pass:

- Previous target-session top-2 was higher, but it allowed zero-hit table entries to outrank live-hit entries.
- The new pass favors table legibility and live-session truth. Top-2 target replay is slightly lower, but user-facing tracker order now matches what the visible table says.

For each typed-prefix miss, compare:

- Was the correct prefix selected by the user/live context?
- Was the correct Z in the top 4 but ranked too low?
- Did exact frequency overbeat transition memory?
- Did transition memory overbeat fresh frequency?

## TXT Export

The Kiyo TXT export now rebuilds the full roll stream from:

1. The first log context (`ctx`) for warmup rolls.
2. Every later actual roll in chronological order.

This fixes the old export bug where the first 6 rolls were cut and the table was reversed.

## Files Changed

- `src/utils/kiyoExplicitPairEngine.js`
- `src/components/kiyo/PrefixWavePanel.jsx`
- `src/components/KiyoModeCard.jsx`
- `codex-new-Kiyo.md`

## Verification

Direct engine test passed for global, `42x`, and `43x` reads.

`npm run build` is still blocked locally by Vite/esbuild `spawn EPERM`.

`graphify update .` is still blocked by local permission on `.graphify_version`.

## [Codex suggest / opinion]

Yes, we should seriously consider saving Kiyo mode rolls from players into our own DB, but it should be designed as a prediction dataset, not just a raw log dump.

Proposed retention:

- Keep only the latest 2 patches.
- Example: while live patch is `4.3`, keep `4.2` and `4.3`.
- When `4.4` starts, delete/archive `4.2`, then keep `4.3` and `4.4`.
- This prevents old PRNG/meta behavior from poisoning the current Kiyo read.

Prediction stack if we do this:

1. Live session rolls typed by the user: highest priority.
2. DB patch rolls from recent players: middle layer.
3. EU sheet data: temporary fallback only.
4. After we collect enough DB data across 2 patches, remove or heavily reduce sheet usage.

Why this helps:

- Sheet data is static and may be stale.
- Live session data is accurate but starts sparse.
- DB patch data gives us a real current-patch prior before each user has enough rolls.
- This is exactly the missing layer between cold-start and live-only reading.

Supabase space concern:

- Supabase can probably handle this if we store compact rows, but we should not save noisy oversized debug blobs as the main dataset.
- A compact roll row can be tiny: user/session id, region, patch, roll, index, timestamp, optional source.
- The dangerous part is volume, not one row size. If many users spam sessions and we store every debug snapshot, space grows fast.
- We should store raw roll events compactly, then generate summaries server-side or in scheduled jobs.

Suggested table shape:

```text
kiyo_roll_events
- id
- anonymous_user_id or user_id
- session_id
- region
- patch
- roll_3str
- roll_index
- created_at
- source: live/import/manual
```

Optional summary table:

```text
kiyo_patch_stats
- patch
- region
- prefix
- exact_roll
- count
- transition_count
- last_updated
```

Retention job:

- On new patch detection, keep current patch and previous patch.
- Delete older `kiyo_roll_events`.
- Keep only aggregated historical summaries if we want long-term research, or delete everything older if storage becomes an issue.

Privacy / abuse note:

- Do not store anything personal unless needed.
- Prefer anonymous/session identifiers for prediction data.
- Add rate limits or dedupe repeated imports, because duplicate player logs can bias the model.

My recommendation:

- Build this, but start with compact raw roll rows plus patch summaries.
- Do not replace the sheet immediately.
- Run DB patch layer as a new middle weight first.
- Once we have enough 4.3/4.4 data, make DB the default cold-start layer and retire the sheet fallback.

Open question for other AIs:

- Should DB patch data be global, region-specific, or both?
- Should imported rolls count the same as manually typed live rolls?
- What minimum sample size should make DB data trusted enough to outrank sheet data?
- Should we store every roll event, or only per-session summarized tables to save space?
