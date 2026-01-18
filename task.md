# Task: Centralized & Synchronized Banner Data System

## Overview
Establish the Vercel Backend (`/api/banners`, `/api/wuwa/stats`) as the single source of truth for all games (HSR, Genshin, WuWa). Ensure 1:1 synchronization between the Website and Discord Bot.

## 1. Vercel Backend (HSR & Genshin)
- [ ] **Verify Live Fetching**: Ensure backend fetches real-time data from Paimon.moe and StarRailStation.
- [ ] **Fresh Data Logic**: Implement logic to handle data updates (e.g., pull count increases) promptly, potentially reducing cache times or adding re-validate headers.
- [ ] **Sync Verification**: Confirm both bot and site receive the exact same data payload.

## 2. Vercel Backend (WuWa)
## 2. Vercel Backend (WuWa)
- [x] **Investigate Stats Parsing Failure**:
    - [x] Fixed IDs in Backend & Docs.
- [x] **Advanced Scraping / API Discovery**:
    - [x] **SOLVED**: Correct ID fixed parsing!
    - [x] **POLISHED**: Fixed weapon name & Image URLs.
- [x] **Heuristic Auto-Discovery (New Request)**:
    - [x] **IMPLEMENTED**: Probes `ID+1`.
    - [x] **AUTOMATION**: Auto-switches if new banner found.
    - [x] **SAFE**: Fallback to manual if probe fails.
    - [ ] Investigate "Smart Fetch" libraries compatible with Vercel.
- [ ] Hardening Phase 1: AI Warp Analyzer
    [x] Implement basic Gemini integration (admin key)
    [x] Add debug logging to API and Frontend
    [x] Fix JSON truncation/libuv crash in `gemini-2.5-flash`
    [x] Implement robust JSON extraction with regex
    [ ] Add fallback/retry logic for API responses
[/] Hardening Phase 2: Predictor AI (BYOK Mode)
    [ ] UI for User API Key management
    [ ] Client-side Gemini calls for privacy
    [ ] Key validation and testing tool
- [ ] **Implementation**:
    - [ ] Pivot to direct API if found.
    - [ ] OR refine scraping with better bypass.
- [x] **Fallback**: Graceful error handling (Active).

## 3. Client Synchronization
- [x] **Website**: Verify it consumes Vercel API directly (no local overrides).
- [x] **Discord Bot**: Verify it consumes Vercel API directly.
- [x] **Admin Restriction**: Restrict dev/admin commands to User ID `110890964364627968`.
- [x] **Consistency Check**: Verify "Test All" shows identical results.

## 4. Documentation & Handover
- [ ] Update `BANNER_UPDATE_GUIDE.md` with final architecture.
- [ ] Create simple "How to maintain" summary for the user.
