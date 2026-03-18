# Zone Tracker - Svarog Integration Plan (Auth + Supabase)

> Full auth wall: the entire Zone Tracker feature is gated behind login.
> You must be authenticated to view the zone map, submit runs, or flag epochs.
> Storage: Supabase Postgres (no Vercel Blob).

---

## Product Decisions (Locked)

- Zone Tracker is visible and usable only by logged-in users.
- All Zone Tracker API endpoints require a valid auth session token.
- Zone Tracker data is stored in Supabase Postgres tables.
- Do not use `zone-runs.json` or `zone-epochs.json` blob files.

---

## V1 Scope

Build:
- Protected page: `/zone-tracker`
- Epoch status bar
- Submit run form (team, outcome, optional cavern, optional notes)
- Zone map ranked list
- Authenticated API endpoints:
  - `POST /api/zone/submit`
  - `GET /api/zone/map?epoch=current|previous`
  - `POST /api/zone/flag-epoch`

Defer to V2:
- Neighborhood explorer (already exists in HTML tool)
- Previous epoch comparison UI panel
- LC/session marker/run index UI
- Clear time input

---

## Existing Features to Reuse

- Team picker pattern from `CavernTimesPage.jsx` (4 slots, drag/drop behavior)
- Character catalog from `src/data/characters.json`
- Cavern list from shared cavern source (extract to constants module, do not duplicate inline)

---

## Auth Model

### Auth Provider (Locked)

- **Discord OAuth via Supabase Discord provider** is final for V1.
- No Email magic link or GitHub OAuth in V1.
- This provider decision is locked to unblock implementation.

### Frontend Auth Rules

- `/zone-tracker` is hidden from nav when unauthenticated
- Direct access to `/zone-tracker` redirects to login page
- All three panels (epoch bar, submit form, zone map) require active session

### Backend Auth Rules

- ALL `/api/zone/*` endpoints require `Authorization: Bearer <token>` → 401 if missing/invalid
- Includes `GET /api/zone/map` — no anonymous reads
- `user_id` always resolved from JWT `sub`, never accepted from request body

### Identity

- Replace anonymous `reporter_id` with authenticated `user_id` (UUID from Supabase auth).
- `user_id` comes from token only, never from request body.

---

## Frontend Page Structure

### Route

- `/zone-tracker` -> `src/pages/ZoneTrackerPage.jsx`

### Layout Sections

1. Epoch status bar
2. Submit run panel
3. Zone map panel

### Submit Run Fields (UI)

Required:
- Team (4 character slots)
- Outcome (7-button group)

Optional:
- Cavern (dropdown)
- Notes (max 200 chars, single line)

V1 note:
- Keep `clear_time_s` nullable in schema, but do **not** expose clear-time input in UI.

Not shown in UI (server-computed):
- `char_sum`, `char_xor`, `char_slot`, `xor_slot_key`, `epoch_id`, `submitted_at`, `user_id`

---

## Outcome Enum (V1)

Use exactly **7** values — these match the HTML simulator's outcome buttons exactly:

| Value | Category | UI Label |
|---|---|---|
| `spd-double-crit` | crit | SPD + CR + CD |
| `double-crit` | crit | CR + CD only |
| `spd-one-crit` | crit | SPD + one crit |
| `one-crit` | crit | one crit only |
| `effect-junk` | junk | Effect junk |
| `flat-junk` | junk | Flat junk |
| `mixed` | neutral | Mixed |

`crit_rate` denominator = crit + junk count only. `mixed` is excluded.

---

## Hash Rules (Server)

For `slot_order = [a, b, c, d]`:

- `char_sum = a + b + c + d`
- `char_xor = a ^ b ^ c ^ d`
- `char_slot = (d * 3 + a + b + c) % 10000`
- `xor_slot_key = "${char_xor}_${char_slot}"`

---

## API Contract

### `POST /api/zone/submit`

Body:
- `slot_order: number[4]`
- `outcome: outcome_enum`
- `cavern?: string | null`
- `notes?: string | null`

Behavior:
- Auth required
- Resolve current epoch
- Compute hash fields server-side
- Anti-spam checks:
  - reject duplicate `(user_id, epoch_id, slot_order, outcome)` within 1 hour
  - reject if user has 20+ submissions today (UTC)
- Insert run
- Return inserted run and lightweight zone summary refresh token/version

### `GET /api/zone/map?epoch=current|previous`

Behavior:
- Auth required
- Return:
  - epoch metadata
  - ranked zone groups by `xor_slot_key`
  - confidence label
  - sample team for "load into builder"

Ranking rules:
- `crit_rate = crit_count / (crit_count + junk_count)`
- `mixed` is excluded from denominator
- if denominator is `0`, set `crit_rate = null` and sort last
- primary sort: `crit_rate desc nulls last`
- tie-break: `weighted_confidence desc`, then `runs desc`

### `POST /api/zone/flag-epoch`

Body:
- `notes?: string | null`

Behavior:
- Auth required
- One flag per user per epoch
- If 2+ distinct users flagged same epoch within 48h:
  - auto-create next epoch
  - mark previous epoch as confirmed
- Return current epoch status and pending flag count

---

## Supabase Storage Design

Use Postgres tables (not blob files).

### `zone_epochs`

Columns:
- `id bigint generated always as identity primary key`
- `created_at timestamptz not null default now()`
- `calendar_week text not null`
- `created_by_flag boolean not null default false`
- `previous_epoch_id bigint null`
- `is_current boolean not null default false` ← **needed** — allows `WHERE is_current = true` lookup

Note: when a new epoch is auto-created, set `is_current = true` on new row and `is_current = false` on the old one in a single transaction.

Indexes:
- primary key on `id`
- index on `created_at desc`
- partial index on `is_current` where `is_current = true`

### `zone_runs`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `submitted_at timestamptz not null default now()`
- `epoch_id bigint not null references zone_epochs(id)`
- `user_id uuid not null`
- `slot_order int[] not null` (length must be 4)
- `char_names text[] not null` (length must be 4)
- `cavern text null`
- `outcome text not null`
- `char_sum int not null`
- `char_xor int not null`
- `char_slot int not null`
- `xor_slot_key text not null`
- `notes text null` (max 200)
- `clear_time_s int null` <- keep nullable in schema, do **not** expose in V1 UI

Checks:
- `array_length(slot_order, 1) = 4`
- `array_length(char_names, 1) = 4`
- `outcome in (...)` (enum set)
- `notes is null or char_length(notes) <= 200`

Indexes:
- `(epoch_id, xor_slot_key)`
- `(epoch_id, submitted_at desc)`
- `(user_id, submitted_at desc)`
- `(epoch_id, outcome)`

### `zone_epoch_flags`

Columns:
- `id uuid primary key default gen_random_uuid()`
- `epoch_id bigint not null references zone_epochs(id)`
- `user_id uuid not null`
- `notes text null`
- `created_at timestamptz not null default now()`

Constraints:
- unique `(epoch_id, user_id)`

Indexes:
- `(epoch_id, created_at desc)`

---

## RLS and Access

Enable RLS on all Zone Tracker tables.

Policy intent:
- Authenticated users receive aggregated zone map data via API only (no raw `zone_runs` endpoint).
- Inserts to `zone_runs` and `zone_epoch_flags` only with `user_id = auth.uid()`.
- No anonymous access.

If backend uses service role for writes, still keep endpoint auth checks mandatory.

---

## Confidence Labels

- `HIGH`: 6+ runs
- `MEDIUM`: 3-5 runs
- `LOW`: 1-2 runs

UI coloring:
- Green: `HIGH` and `crit_rate >= 0.60`
- Yellow: `MEDIUM` or `0.40 <= crit_rate < 0.60`
- Gray: otherwise

---

## Files to Create / Modify

Frontend:
- `src/pages/ZoneTrackerPage.jsx` (new)
- `src/components/Layout.jsx` (nav link, auth-aware)
- `src/App.jsx` (route + guarded route)
- `src/lib/supabaseClient.js` (new)
- `src/components/auth/*` or `src/pages/AuthPage.jsx` (if no existing auth UI)
- `src/constants/caverns.js` (shared cavern list source)

Backend:
- `api/zone/submit.js` (new)
- `api/zone/map.js` (new)
- `api/zone/flag-epoch.js` (new)
- `api/_services/zone/*` helpers (auth verify, db access, aggregation)

Docs/SQL:
- `docs/supabase-zone-tracker.sql` (new schema + RLS)
- update this plan doc as implementation progresses

---

## Do Not Do

- Do not expose XOR/SUM/SLOT in submit UI.
- Do not accept `user_id` from client body.
- Do not allow unauthenticated reads/writes for zone endpoints.
- Do not store zone tracker data in blob JSON files.
- Do not duplicate cavern lists across multiple files.

---

## Relationship to Cavern Times

- Cavern Times: personal record archive and team examples.
- Zone Tracker: authenticated community signal map by team fingerprint.
- They are parallel features and both remain.

---

## Rollout Checklist

1. Configure Supabase Discord OAuth provider (client ID/secret + redirect URLs).
2. Create Supabase schema + RLS (`supabase-zone-tracker.sql`).
3. Implement `/api/zone/*` with auth verification.
4. Build protected `ZoneTrackerPage` UI.
5. Add route + nav gating.
6. Test with two real accounts for epoch flag rollover.
7. Load test duplicate/rate-limit paths.

---

Last updated: 2026-03-18