# Feature: Presence & Auth System

> Routes: `/auth`, `/auth/callback`  
> Pages: `AuthPage.jsx`, `AuthCallbackPage.jsx`  
> Context: `src/contexts/PresenceContext.jsx`

---

## What It Does

The Auth system handles Discord OAuth login via Supabase. The Presence system tracks who is online in real time and broadcasts their status to other users (visible in the live player count and online indicators).

---

## Auth Flow

1. Player clicks "Login with Discord" → `buildDiscordOAuthUrl()` constructs the OAuth redirect URL.
2. Discord redirects to `/auth/callback` → `AuthCallbackPage` exchanges the code for a Supabase session.
3. `fetchSupabaseUser()` retrieves the Discord user profile from Supabase Auth.
4. Session stored in localStorage; `refreshSupabaseSession()` refreshes automatically.
5. `revokeSupabaseSession()` on logout clears the session.

**Key**: `hasSupabaseClientConfig()` checks if Supabase env vars are present — if not, auth is silently disabled (safe for local dev without secrets).

---

## Presence System

### What It Tracks
- Which users are currently online and on which page.
- Anonymous users have a presence entry with `anonymous: true`.
- Logged-in users have Discord username and avatar.

### Presence Flow
1. On page load/route change: `buildPresencePayload()` → POST to `api/presence.js`.
2. `api/presence.js` calls `buildSupabasePresencePayload()` → upsert to Supabase presence table.
3. `cleanupLocalPresence()` runs on page unload to remove stale entries.
4. `cleanupSupabasePresenceSessions()` periodically purges old sessions server-side.

### `PresenceContext.jsx`
React context that provides:
- `onlineCount` — total currently online
- `onlinePlayers` — array of online user records
- `currentArea` — which page the local user is on

### Supabase Migration
Old presence data was stored in Redis (Upstash). Migrated to Supabase via `scripts/migrate-presence-to-supabase.js`.

---

## Admin Authorization

`server/_services/zone/shared.js` provides:
- `requireAuthenticatedUser(req)` — validates the request's auth token against Supabase
- `requireAdmin(req)` — validates admin role
- `isZoneAdminUser(userId)` — checks if user has zone admin permission
- `supabaseAdminRequest(table, method, body)` — admin Supabase API client (bypasses RLS)

`api/admin.js` and `api/admin-users.js` handle admin-specific user management endpoints.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/AuthPage.jsx` | Login page with Discord OAuth button |
| `src/pages/AuthCallbackPage.jsx` | OAuth callback handler |
| `src/lib/supabaseClient.js` | Supabase client, OAuth URL builder, session management |
| `src/hooks/useAuth.js` | `useAuth()` hook — current user, login/logout |
| `src/contexts/PresenceContext.jsx` | Real-time presence context |
| `api/presence.js` | Presence upsert and cleanup API |
| `server/_services/zone/shared.js` | Auth validators, Supabase admin client |
| `api/admin.js` | Admin user management |
| `api/admin-users.js` | Admin user lookup and update |
| `scripts/migrate-presence-to-supabase.js` | One-time Redis → Supabase migration |
