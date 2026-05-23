# Graph Report - HSR_PatternRecord  (2026-05-23)

## Corpus Check
- 377 files · ~4,453,772 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2475 nodes · 4541 edges · 65 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 883 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 183|Community 183]]
- [[_COMMUNITY_Community 184|Community 184]]

## God Nodes (most connected - your core abstractions)
1. `round()` - 90 edges
2. `log()` - 90 edges
3. `supabaseAdminRequest()` - 65 edges
4. `fetch()` - 59 edges
5. `useAuth()` - 30 edges
6. `predictWithPairs()` - 29 edges
7. `simulateBotTargetRelic()` - 29 edges
8. `buildTablePath()` - 29 edges
9. `random()` - 29 edges
10. `requireAuthenticatedUser()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `fetch()` --calls--> `checkPrimaryHealth()`  [INFERRED]
  cloudflare-worker\src\index.js → discord-bot\index.js
- `fetch()` --calls--> `redisCmd()`  [INFERRED]
  cloudflare-worker\src\index.js → scripts\migrate-presence-to-supabase.js
- `fetch()` --calls--> `fetchWithTimeout()`  [INFERRED]
  cloudflare-worker\src\index.js → src\pages\PlaygroundChallengePage.jsx
- `fetch()` --calls--> `fetchWithTimeout()`  [INFERRED]
  cloudflare-worker\src\index.js → src\pages\PlaygroundRacesPage.jsx
- `round()` --calls--> `formatRate()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\hooks\useZoneTracker.js

## Hyperedges (group relationships)
- **Kiyo Prediction Stack (Live -> DB -> Sheet)** — codex_kiyo_kiyo_mode, codex_kiyo_db_layer_proposal, kiyo_turso_plan, codex_kiyo_turso_db, kiyo_turso_prediction_hierarchy [EXTRACTED 1.00]
- **Kiyo Pair Engine Two-Layer Architecture** — codex_kiyo_2_kiyo_3str_pair_engine, codex_kiyo_2_kiyo_prefix_wave, codex_kiyo_2_prefix_pair_systems, codex_kiyo_2_z_digit_pair_systems, kiyo_discussion_backbone_selector [EXTRACTED 1.00]
- **Svarog Noise Detection System** — kimi_svarog_predictor, kimi_svarog_noise_predictor, kimi_transition_override, kimi_noise_gap_analysis, kimi_pair_transition_predictor [EXTRACTED 1.00]
- **Cloudinary Asset Pipeline** — cloudinary_migration_plan, cloudinary_upload_script, cloudinary_cloudinary_map, cloudinary_with_base_url, cloudinary_get_game_image_url, cloudinary_mar7th_starrailres [EXTRACTED 1.00]
- **Kiyo Turso DB Schema** — codex_kiyo_kiyo_roll_events, codex_kiyo_kiyo_patch_stats, kiyo_turso_kiyo_user_stats, kiyo_turso_kiyo_sessions_table [EXTRACTED 1.00]
- **Kiyo Replay Test Corpus** — kiyo_testdata_dec20, kiyo_testdata_feb14, kiyo_testdata_feb16, kiyo_testdata_mar02, kiyo_testdata_apr29, kiyo_replay_summary [EXTRACTED 1.00]
- **Multi-AI DB Design Discussion (Codex, Kimi, GLM, Claude, GPT)** — codex_kiyo_db_layer_proposal, codex_kiyo_turso_db, codex_kiyo_source_tagging, kiyo_turso_prediction_hierarchy, kiyo_turso_batch_save [INFERRED 0.85]
- **Kiyo v2 Three-Column Wave System (Outer/Inner, Low/High, Odds/Evens)** — concept_column_outer_inner, concept_column_low_high, concept_column_odds_evens, concept_wave_theory, concept_swap_rate [EXTRACTED 1.00]
- **Kiyo Debug v2 Session Exports (Dec 2025)** — kiyo_debug_v2_20251218a_export, kiyo_debug_v2_20251218b_export, kiyo_debug_v2_20251220_export [INFERRED 0.90]
- **Kiyo Debug v3 Session Exports (Dec 2025)** — kiyo_debug_v3_20251223a_export, kiyo_debug_v3_20251223b_export [INFERRED 0.90]
- **HSR Relic Enhancement Screenshots (Level-up UI and stat panels)** — image29_relic_level_up_body_healing, image30_relic_stats_body_healing, image31_relic_level_up_head_hp, image32_relic_stats_head_hp, image34_relic_enhance_random_atk, image35_relic_level_up_hands_atk, image37_relic_stats_boots_spd, image38_relic_level_up_boots_spd [INFERRED 0.90]
- **4XX/43X String Pattern Reference Tables** — image26_4xx_string_pattern_table_a, image27_4xx_string_pattern_table_b, image28_44x_string_pattern_table, image33_4x_digit2_pattern_table, image36_43x_string_pattern_table, image39_4x_digit2_pattern_table_b [INFERRED 0.88]
- **Kiyo Pattern Type Taxonomy (Alternating, Dominance, Dominant, Chaotic, Building)** — concept_pattern_alternating, concept_pattern_dominance, kiyo_debug_20260430_session_modes, kiyo_debug_v3_20251223a_pattern_alternating, kiyo_debug_v3_20251223b_pattern_dominance [INFERRED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (200): fetchAdminUserById(), handler(), isAuthorized(), normalizeReason(), normalizeUserId(), requireAdmin(), toAdminListUser(), updateAdminUserById() (+192 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (79): RequireAuth(), ClaraChat(), HomeStatsWidget(), KiyoModeCard(), getDiscordUserId(), Layout(), resolveAuthDisplayName(), LiveStatsBanner() (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (104): execute(), FiveMinProgressBar(), FiveMinWindowTracker(), formatMMSS(), pad2(), useWindowDerived(), WindowStatsMini(), formatDropScore() (+96 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (78): CompactCaesarShift(), ModernCaesarCard(), ModernStatsPanel(), normalizeDisplayToken(), comparePvpAttempts(), createChallengeForceRelic(), createChallengePatternProfile(), createChallengeRelic() (+70 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (86): buildWarpAnalyzerPrompt(), checkRateLimit(), formatClaraFaqAnswer(), getClaraFaqById(), handleClara(), handler(), matchClaraFAQ(), normalizeClaraText() (+78 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (77): callServiceHandler(), handler(), normalizeGameQuery(), handler(), resolveGameFromUrl(), resolvePathPart(), loadCommands(), checkPrimaryHealth() (+69 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (84): execute(), buildBannerEmbed(), buildErrorEmbed(), execute(), flattenBanners(), formatPullStrategy(), getUsableBannerId(), inferGame() (+76 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (84): applyBotUpgradeToSlot(), buildBotState(), buildCompactTrendSummary(), buildPvpScenarioPayload(), buildTablePath(), buildTimeoutAttemptFromState(), cloneRelic(), compareAttemptPayload() (+76 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (68): execute(), agentKiyoWave(), agentMain(), agentSvarogOnly(), classifyBoardState(), parseLegacyCtxRows(), parseReplayRows(), parseTimeline() (+60 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (72): buildPracticeHistoryPath(), buildProgressionDelta(), handlePracticeResult(), handler(), isMissingTableError(), isUniqueViolationError(), normalizeNumber(), readBody() (+64 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (60): getElementMeta(), getHsrElementUrl(), WarpBannerCard(), applyControlledOverride(), buildCharacterBannerPayload(), buildControlledFallbackBanners(), buildWeaponBannerPayload(), discoverBannerAuto() (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (42): execute(), execute(), getSessionStatus(), handleLiveInput(), handleLongstringInput(), handleSessionInput(), analyze2StrDataset(), analyzeWaveColumn() (+34 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (50): handler(), resolvePathPart(), handler(), buildContractLeaderboard(), buildPlayerLeaderboard(), buildResultsPath(), compareChallengeRows(), fetchSeasonChallengeRows() (+42 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (42): buildFallbackResponse(), calculatePatchInfo(), getDb(), getPatchDurationDays(), handler(), incrementPatch(), parsePatchVersion(), execute() (+34 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (49): BaseModel, _assign_grade(), CharacterWeights, _effective_weight(), estimate_rolls(), _ideal_score_for_slot(), infer_roll_quality(), HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/ (+41 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (52): archiveCurrentWeekBlobEntries(), archiveCurrentWeekSnapshot(), archiveCurrentWeekSupabaseEntries(), buildArchiveTablePath(), buildAuditTablePath(), buildTablePath(), buildVariantKeys(), deleteAllSupabaseEntries() (+44 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (55): 2-String Wave Analysis (Outer/Inner dominant pairing verdict), 4XX String Pattern (3-digit relic enhancement outcome notation), Column 3: Low/High Grouping (digits 1,2 vs 3,4), Column 1: Odds/Evens Grouping (digits 1,3 vs 2,4), Column 2: Outer/Inner Grouping (digits 1,4 vs 2,3), Kiyo Mode (HSR Relic Enhancement Pattern Prediction System), Pattern Type: Alternating (regular flip between two states), Pattern Type: Dominance (one side appears significantly more) (+47 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (38): fetchUserById(), handleLiveModeRewardAction(), handleMarketplaceAction(), handler(), handleRewardAction(), handleTitleAction(), handleTutorialCompleteAction(), readBody() (+30 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (40): buildContract(), buildGoalText(), buildProgressText(), buildWinText(), clone(), getChallengeHintPack(), getChallengeRelicTemplate(), applySelectedTargetSet() (+32 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (48): Mar-7th/StarRailRes (GitHub), Cloudinary Migration Plan, svarog-tracer/ Cloudinary Folder, 2 String Lane Timeline, 2 String Pair Tracker, 3 String Pair Tracker, Kiyo DB Layer Proposal, Kiyo Mode (3-String Predictor) (+40 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (32): buildSvarogAssistance(), createLabProfile(), describeFreshness(), extractManualSequence(), formatTrust(), getDisplayLane(), getFamilyOptions(), getTransitionSupport() (+24 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (27): calculateGenshinWinLoss(), consolidatePeaks(), detectLuckyPeaks(), extractGenshinBannerName(), extractGenshinWeaponNames(), fetchHotApi(), fetchHSRActiveBanners(), fetchLiveBanners() (+19 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (11): buildEmptyRelicCard(), buildZoneVariantKey(), collectZoneSubstatsForClient(), formatRate(), getDefaultMainStatForPiece(), normalizeClearTimeMmSsInput(), normalizeClientSubstatLabel(), parseClearTimeToSeconds() (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (16): buildCommonsSummary(), getSessionCommons(), getYDigitCommons(), getYDigitForPrediction(), getYZCommons(), getZDigitCommons(), predict3strFromY(), predictIndependent3str() (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (11): analyzeColumnPattern(), analyzeKiyoExplicitPairs(), clamp(), labelForSide(), oppositeSide(), prefixesForSide(), runInfo(), scoreXyColumn() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.26
Nodes (14): buildWuWaStats(), extractItemHistogram(), parseHistogramContent(), parseStrategy_v1(), parseStrategy_v2(), parseStrategy_v3(), parseStrategy_v5(), parseWuWaHTML_Adaptive() (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.26
Nodes (14): ensureEnv(), main(), mergeRecords(), normalizeIso(), normalizeRecord(), readKnownUserRecords(), readRedisStats(), redisCmd() (+6 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (10): CavernTimesPage(), clampSeconds(), compareCavernEntriesByFreshness(), formatLiveTimeInput(), formatMmSsFromSeconds(), getClearLastReportedTimestamp(), getClearReportCount(), normalizeTimeForSubmit() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (7): buildDiscordOAuthUrl(), fetchSupabaseAuth(), fetchSupabaseUser(), getAuthRedirectUrl(), hasSupabaseClientConfig(), refreshSupabaseSession(), revokeSupabaseSession()

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (1): WindowPerformanceTracker

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (11): buildPermissionView(), clamp(), computePairAge(), deriveActionConfidence(), deriveLeadingModel(), derivePermission(), derivePrimaryReason(), deriveRecoveryCue() (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.27
Nodes (7): LiveTrackingTable3str(), analyzeFlipPattern(), buildTransitionMatrix(), cleanRolls(), detectPattern(), identifyCommons(), predictNext3BBPMode()

### Community 33 - "Community 33"
Cohesion: 0.35
Nodes (10): analyzePattern(), analyzePatternWithWindow(), calculateHistoricalFlipFrequency(), calculateNoise(), compareColumns(), detectPatternBreak(), detectRunPattern(), generatePatternDescription() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.31
Nodes (8): buildProbFromCandidates(), clamp(), cleanRolls(), computeTransitionStats(), cosineSimilarity(), predictNext2Smart(), predictNext2SmartLegacy(), get2StrHistoricalRolls()

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (4): useCompanion(), CompanionSelector(), CompanionWidget(), SpeechBubble()

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (2): createGenerator(), HsrPrngSimulator

### Community 37 - "Community 37"
Cohesion: 0.43
Nodes (3): generateUUID(), getOrCreateAnonymousId(), useKiyoSession()

### Community 38 - "Community 38"
Cohesion: 0.48
Nodes (4): buildSliderBounds(), clampValue(), parseIntegerMaybe(), ZoneBuildTeam()

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): get_archetype(), get_weights_for_set(), Set-Based Stat Weights for Svarog PvP Relic Scorer ============================, Return the stat weight dict for a given set name.     Falls back to a generic b, Return the archetype label for a set.

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (6): Prefix Pair Systems (Outer/Inner, Even/Odd, High/Low), Wave Theory (EU Pattern Method), Z Digit Pair Systems (Low/High, Outer/Inner, Odd/Even), Ciet [FATE] (Project Author), 火花 [QTea] (EU Wave Player), Wave Theory Discord Discussion

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 43 - "Community 43"
Cohesion: 0.6
Nodes (3): useCountUp(), useFadeInUp(), WavePairingTable()

### Community 49 - "Community 49"
Cohesion: 0.7
Nodes (4): getConfidenceLevel(), getSmartRecommendation(), shouldUseSmartPrefix(), shouldUseWaveFlip()

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 60 - "Community 60"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (1): execute()

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (2): getSizeClass(), PvpVsMark()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): CountUp(), useCountUp()

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (2): formatCalendarWeek(), ZoneHeader()

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (2): findCavernById(), getCavernDisplayName()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): parseKiyoDebugExport(), runKiyoBacktest()

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (3): Expert V2 Bot, Raw Pair Manipulation Logic, PvP Bot and Roll System

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (3): GRAPH_REPORT.md, Graphify Knowledge Graph, graphify-out/ Directory

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (2): BBP Mode (Beast Binary Predictor), Long String Lab

### Community 183 - "Community 183"
Cohesion: 1.0
Nodes (1): Warp Analyzer

### Community 184 - "Community 184"
Cohesion: 1.0
Nodes (1): Kiyo Debug Export [2026-03-02]

## Knowledge Gaps
- **65 isolated node(s):** `SubstatEntry`, `Relic`, `HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/`, `Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall`, `Return the effective weight, applying flat penalty for flat stats.` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 30`** (14 nodes): `windowPerformanceTracker.js`, `getWindowTracker()`, `resetWindowTracker()`, `WindowPerformanceTracker`, `.addRoll()`, `.calculateOverallAccuracy()`, `.constructor()`, `.getBestPredictor()`, `.getCurrentWindowStats()`, `.getPerformanceSummary()`, `.getWeights()`, `.recordPrediction()`, `.startNewWindow()`, `.updateBestPredictor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (9 nodes): `relicPrngSimulator.js`, `createGenerator()`, `HsrPrngSimulator`, `.constructor()`, `.generateBatch()`, `.getRawDigit()`, `.inject()`, `.nextRoll()`, `.setRegime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `getCommonsNoise()`, `analyze-session-performance.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (5 nodes): `getCommonsNoise()`, `analyze-session-profiles.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (4 nodes): `analyze-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (4 nodes): `debug-integration-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (4 nodes): `debug-noise-misses.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (4 nodes): `debug-ui-alert.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (4 nodes): `simulate-adaptive-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `simulate-best-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `simulate-individual-overrides.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `simulate-override-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `validate-lower-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `validate-noise-integration.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (3 nodes): `execute()`, `banners.js`, `banners.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `getSizeClass()`, `PvpVsMark()`, `PvpVsMark.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `CountUp.jsx`, `CountUp()`, `useCountUp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (3 nodes): `ZoneHeader.jsx`, `formatCalendarWeek()`, `ZoneHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (3 nodes): `findCavernById()`, `getCavernDisplayName()`, `caverns.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `kiyoBacktester.js`, `parseKiyoDebugExport()`, `runKiyoBacktest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (2 nodes): `BBP Mode (Beast Binary Predictor)`, `Long String Lab`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 183`** (1 nodes): `Warp Analyzer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 184`** (1 nodes): `Kiyo Debug Export [2026-03-02]`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 21`, `Community 23`, `Community 24`, `Community 28`, `Community 31`, `Community 32`, `Community 33`?**
  _High betweenness centrality (0.321) - this node is a cross-community bridge._
- **Why does `supabaseAdminRequest()` connect `Community 0` to `Community 7`, `Community 9`, `Community 12`, `Community 17`, `Community 27`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 5` to `Community 4`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 22`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 87 inferred relationships involving `round()` (e.g. with `runReplay()` and `calculatePatchInfo()`) actually correct?**
  _`round()` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `log()` (e.g. with `listModels()` and `runReplay()`) actually correct?**
  _`log()` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `supabaseAdminRequest()` (e.g. with `getGuidesDocument()` and `upsertGuidesDocument()`) actually correct?**
  _`supabaseAdminRequest()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `fetch()` (e.g. with `listModels()` and `handleClara()`) actually correct?**
  _`fetch()` has 40 INFERRED edges - model-reasoned connections that need verification._