# Graph Report - .  (2026-05-03)

## Corpus Check
- 183 files · ~500,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2377 nodes · 4179 edges · 73 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 750 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_ClaraChat UI Components|ClaraChat UI Components]]
- [[_COMMUNITY_Admin API and Authorization|Admin API and Authorization]]
- [[_COMMUNITY_Patch Timers and Game Calendar|Patch Timers and Game Calendar]]
- [[_COMMUNITY_Banner Service Layer|Banner Service Layer]]
- [[_COMMUNITY_Playground Challenge and PvP Rooms|Playground Challenge and PvP Rooms]]
- [[_COMMUNITY_Warp Analyzer and Discord Commands|Warp Analyzer and Discord Commands]]
- [[_COMMUNITY_Cloudinary Asset Management|Cloudinary Asset Management]]
- [[_COMMUNITY_Pattern Analysis and Discord Bot|Pattern Analysis and Discord Bot]]
- [[_COMMUNITY_Kiyo Caesar and Modern UI|Kiyo Caesar and Modern UI]]
- [[_COMMUNITY_Playground Practice API|Playground Practice API]]
- [[_COMMUNITY_Discord Session and String Commands|Discord Session and String Commands]]
- [[_COMMUNITY_HSR and Zone API Routing|HSR and Zone API Routing]]
- [[_COMMUNITY_Cavern Clears Archival System|Cavern Clears Archival System]]
- [[_COMMUNITY_Kiyo Wave Theory Concepts|Kiyo Wave Theory Concepts]]
- [[_COMMUNITY_Challenge Contracts Data Layer|Challenge Contracts Data Layer]]
- [[_COMMUNITY_Presence and Online Status API|Presence and Online Status API]]
- [[_COMMUNITY_User Profile and Marketplace API|User Profile and Marketplace API]]
- [[_COMMUNITY_Relic Scoring Algorithms|Relic Scoring Algorithms]]
- [[_COMMUNITY_HSR Assets and Kiyo Patch Service|HSR Assets and Kiyo Patch Service]]
- [[_COMMUNITY_Playground Pattern Lab Profiles|Playground Pattern Lab Profiles]]
- [[_COMMUNITY_Tutorial Page Flow|Tutorial Page Flow]]
- [[_COMMUNITY_Kiyo Commons and Session Predictor|Kiyo Commons and Session Predictor]]
- [[_COMMUNITY_Hoyo Asset Upload Scripts|Hoyo Asset Upload Scripts]]
- [[_COMMUNITY_Kiyo Explicit Pair Engine|Kiyo Explicit Pair Engine]]
- [[_COMMUNITY_Presence Migration to Supabase|Presence Migration to Supabase]]
- [[_COMMUNITY_WuWa Stats Adaptive Parser|WuWa Stats Adaptive Parser]]
- [[_COMMUNITY_Kiyo Mode Card and Navigation|Kiyo Mode Card and Navigation]]
- [[_COMMUNITY_Supabase Auth Client|Supabase Auth Client]]
- [[_COMMUNITY_Window Performance Tracker|Window Performance Tracker]]
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
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 211|Community 211]]
- [[_COMMUNITY_Community 214|Community 214]]
- [[_COMMUNITY_Community 215|Community 215]]
- [[_COMMUNITY_Community 216|Community 216]]

## God Nodes (most connected - your core abstractions)
1. `round()` - 89 edges
2. `supabaseAdminRequest()` - 65 edges
3. `log()` - 50 edges
4. `predictWithPairs()` - 30 edges
5. `simulateBotTargetRelic()` - 29 edges
6. `buildTablePath()` - 29 edges
7. `random()` - 29 edges
8. `useAuth()` - 29 edges
9. `requireAuthenticatedUser()` - 27 edges
10. `buildBotState()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `formatRate()` --calls--> `round()`  [INFERRED]
  src\hooks\useZoneTracker.js → scripts\analyze-prng-bias.mjs
- `formatMmSsFromSeconds()` --calls--> `round()`  [INFERRED]
  src\pages\CavernTimesPage.jsx → scripts\analyze-prng-bias.mjs
- `round()` --calls--> `rebalanceMarketplaceCost()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\utils\marketplaceCatalog.js
- `scoreRunBreakCandidate()` --calls--> `round()`  [INFERRED]
  src\utils\pairTransitionPredictor.js → scripts\analyze-prng-bias.mjs
- `round()` --calls--> `calculateFlipProbability()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\utils\predictNext.js

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

### Community 0 - "ClaraChat UI Components"
Cohesion: 0.01
Nodes (109): RequireAuth(), ClaraChat(), HomeStatsWidget(), Layout(), resolveAuthDisplayName(), LiveStatsBanner(), AnimatedTitleText(), useAnimatedTitleEffect() (+101 more)

### Community 1 - "Admin API and Authorization"
Cohesion: 0.03
Nodes (172): fetchAdminUserById(), handler(), isAuthorized(), normalizeReason(), normalizeUserId(), requireAdmin(), toAdminListUser(), updateAdminUserById() (+164 more)

### Community 2 - "Patch Timers and Game Calendar"
Cohesion: 0.02
Nodes (108): buildFallbackResponse(), calculatePatchInfo(), getDb(), handler(), incrementPatch(), parsePatchVersion(), execute(), formatDropScore() (+100 more)

### Community 3 - "Banner Service Layer"
Cohesion: 0.03
Nodes (83): buildWuWaCurrentBannerFallback(), buildWuWaImageUrl(), callServiceHandler(), compareWuWaBannerIdsDesc(), extractGenshinBannerName(), extractGenshinFeaturedCharacterSlugs(), extractGenshinFeaturedWeaponSlugs(), extractGenshinWeaponNames() (+75 more)

### Community 4 - "Playground Challenge and PvP Rooms"
Cohesion: 0.06
Nodes (103): ModernRelicCard(), ResultRelicCard(), ModernRelicCard(), applyBotUpgradeToSlot(), buildBotState(), buildCompactTrendSummary(), buildPvpScenarioPayload(), buildTablePath() (+95 more)

### Community 5 - "Warp Analyzer and Discord Commands"
Cohesion: 0.04
Nodes (79): execute(), execute(), WarpAnalyzer(), applyManualOverride(), buildCharacterBannerPayload(), buildControlledFallbackBanners(), buildWeaponBannerPayload(), discoverBannerAuto() (+71 more)

### Community 6 - "Cloudinary Asset Management"
Cohesion: 0.03
Nodes (89): assetPaths.js, cloudinary-map.js (Generated), getGameImageUrl() Helper, Mar-7th/StarRailRes (GitHub), Cloudinary Migration Plan, svarog-tracer/ Cloudinary Folder, scripts/upload-to-cloudinary.js, Vercel API Function (api/existing-route.js) (+81 more)

### Community 7 - "Pattern Analysis and Discord Bot"
Cohesion: 0.04
Nodes (68): execute(), agentKiyoWave(), agentMain(), agentSvarogOnly(), classifyBoardState(), parseLegacyCtxRows(), parseReplayRows(), parseTimeline() (+60 more)

### Community 8 - "Kiyo Caesar and Modern UI"
Cohesion: 0.04
Nodes (49): CompactCaesarShift(), ModernCaesarCard(), ModernStatsPanel(), normalizeDisplayToken(), comparePvpAttempts(), createChallengeForceRelic(), createChallengePatternProfile(), createChallengeRelic() (+41 more)

### Community 9 - "Playground Practice API"
Cohesion: 0.06
Nodes (69): buildPracticeHistoryPath(), buildProgressionDelta(), handlePracticeResult(), handler(), isMissingTableError(), isUniqueViolationError(), normalizeNumber(), readBody() (+61 more)

### Community 10 - "Discord Session and String Commands"
Cohesion: 0.05
Nodes (46): execute(), execute(), extractManualSequence(), getSessionStatus(), handleLiveInput(), handleLongstringInput(), handleSessionInput(), analyze2StrDataset() (+38 more)

### Community 11 - "HSR and Zone API Routing"
Cohesion: 0.07
Nodes (50): handler(), resolvePathPart(), handler(), buildContractLeaderboard(), buildPlayerLeaderboard(), buildResultsPath(), compareChallengeRows(), fetchSeasonChallengeRows() (+42 more)

### Community 12 - "Cavern Clears Archival System"
Cohesion: 0.1
Nodes (52): archiveCurrentWeekBlobEntries(), archiveCurrentWeekSnapshot(), archiveCurrentWeekSupabaseEntries(), buildArchiveTablePath(), buildAuditTablePath(), buildTablePath(), buildVariantKeys(), deleteAllSupabaseEntries() (+44 more)

### Community 13 - "Kiyo Wave Theory Concepts"
Cohesion: 0.05
Nodes (55): 2-String Wave Analysis (Outer/Inner dominant pairing verdict), 4XX String Pattern (3-digit relic enhancement outcome notation), Column 3: Low/High Grouping (digits 1,2 vs 3,4), Column 1: Odds/Evens Grouping (digits 1,3 vs 2,4), Column 2: Outer/Inner Grouping (digits 1,4 vs 2,3), Kiyo Mode (HSR Relic Enhancement Pattern Prediction System), Pattern Type: Alternating (regular flip between two states), Pattern Type: Dominance (one side appears significantly more) (+47 more)

### Community 14 - "Challenge Contracts Data Layer"
Cohesion: 0.07
Nodes (40): buildContract(), buildGoalText(), buildProgressText(), buildWinText(), clone(), getChallengeHintPack(), getChallengeRelicTemplate(), applySelectedTargetSet() (+32 more)

### Community 16 - "Presence and Online Status API"
Cohesion: 0.09
Nodes (38): buildAuthenticatedUserRecord(), buildPresencePayload(), buildSupabasePresencePayload(), cleanupLocalPresence(), cleanupSupabasePresenceSessions(), clearCachedSupabasePresencePayloads(), countSupabasePresenceSessions(), deletePresenceSessions() (+30 more)

### Community 17 - "User Profile and Marketplace API"
Cohesion: 0.13
Nodes (33): fetchUserById(), handleLiveModeRewardAction(), handleMarketplaceAction(), handler(), handleRewardAction(), handleTitleAction(), handleTutorialCompleteAction(), readBody() (+25 more)

### Community 18 - "Relic Scoring Algorithms"
Cohesion: 0.1
Nodes (27): _assign_grade(), CharacterWeights, _effective_weight(), estimate_rolls(), _ideal_score_for_slot(), infer_roll_quality(), HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/, Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall (+19 more)

### Community 19 - "HSR Assets and Kiyo Patch Service"
Cohesion: 0.15
Nodes (24): buildCloudinaryUrl(), handler(), buildKiyoPatchPayload(), buildLayer(), checkRateLimit(), handleAdminAction(), handleGetPatch(), handleGetPatchFallback() (+16 more)

### Community 20 - "Playground Pattern Lab Profiles"
Cohesion: 0.16
Nodes (23): createLabProfile(), getFamilyOptions(), countWindow(), createBucketPatternProfile(), createGenerator(), createPatternProfile(), createPatternProfileFromId(), createWeights() (+15 more)

### Community 21 - "Tutorial Page Flow"
Cohesion: 0.13
Nodes (11): appendHit(), applyProgressionStep(), buildForceRelic(), buildTargetRelic(), createStageState(), findRelicSet(), getCompletedTutorialGuideStageCount(), markTutorialGuideStageComplete() (+3 more)

### Community 22 - "Kiyo Commons and Session Predictor"
Cohesion: 0.2
Nodes (16): buildCommonsSummary(), getSessionCommons(), getYDigitCommons(), getYDigitForPrediction(), getYZCommons(), getZDigitCommons(), predict3strFromY(), predictIndependent3str() (+8 more)

### Community 23 - "Hoyo Asset Upload Scripts"
Cohesion: 0.21
Nodes (16): addToMap(), main(), uploadGameAssets(), uploadLocalFile(), writeAssetMap(), addToMap(), main(), normalizeKey() (+8 more)

### Community 24 - "Kiyo Explicit Pair Engine"
Cohesion: 0.21
Nodes (11): analyzeColumnPattern(), analyzeKiyoExplicitPairs(), clamp(), labelForSide(), oppositeSide(), prefixesForSide(), runInfo(), scoreXyColumn() (+3 more)

### Community 25 - "Presence Migration to Supabase"
Cohesion: 0.26
Nodes (13): ensureEnv(), main(), mergeRecords(), normalizeIso(), normalizeRecord(), readKnownUserRecords(), readRedisStats(), redisPipeline() (+5 more)

### Community 26 - "WuWa Stats Adaptive Parser"
Cohesion: 0.28
Nodes (13): buildWuWaStats(), extractItemHistogram(), parseHistogramContent(), parseStrategy_v1(), parseStrategy_v2(), parseStrategy_v3(), parseStrategy_v5(), parseWuWaHTML_Adaptive() (+5 more)

### Community 27 - "Kiyo Mode Card and Navigation"
Cohesion: 0.15
Nodes (7): KiyoModeCard(), useNavigationBlocker(), generateUUID(), getOrCreateAnonymousId(), useKiyoSession(), useWindowPatternAnalysis(), useFiveMinuteWindowRolls()

### Community 28 - "Supabase Auth Client"
Cohesion: 0.23
Nodes (7): buildDiscordOAuthUrl(), fetchSupabaseAuth(), fetchSupabaseUser(), getAuthRedirectUrl(), hasSupabaseClientConfig(), refreshSupabaseSession(), revokeSupabaseSession()

### Community 29 - "Window Performance Tracker"
Cohesion: 0.23
Nodes (1): WindowPerformanceTracker

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (11): buildPermissionView(), clamp(), computePairAge(), deriveActionConfidence(), deriveLeadingModel(), derivePermission(), derivePrimaryReason(), deriveRecoveryCue() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (7): LiveTrackingTable3str(), analyzeFlipPattern(), buildTransitionMatrix(), cleanRolls(), detectPattern(), identifyCommons(), predictNext3BBPMode()

### Community 32 - "Community 32"
Cohesion: 0.35
Nodes (10): analyzePattern(), analyzePatternWithWindow(), calculateHistoricalFlipFrequency(), calculateNoise(), compareColumns(), detectPatternBreak(), detectRunPattern(), generatePatternDescription() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.31
Nodes (8): buildProbFromCandidates(), clamp(), cleanRolls(), computeTransitionStats(), cosineSimilarity(), predictNext2Smart(), predictNext2SmartLegacy(), get2StrHistoricalRolls()

### Community 34 - "Community 34"
Cohesion: 0.42
Nodes (8): buildWarpAnalyzerPrompt(), checkRateLimit(), formatClaraFaqAnswer(), getClaraFaqById(), handleClara(), handler(), matchClaraFAQ(), normalizeClaraText()

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (4): useCompanion(), CompanionSelector(), CompanionWidget(), SpeechBubble()

### Community 36 - "Community 36"
Cohesion: 0.57
Nodes (6): FiveMinProgressBar(), FiveMinWindowTracker(), formatMMSS(), pad2(), useWindowDerived(), WindowStatsMini()

### Community 37 - "Community 37"
Cohesion: 0.48
Nodes (4): buildSliderBounds(), clampValue(), parseIntegerMaybe(), ZoneBuildTeam()

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (2): matchKnowledgeBase(), scoreQuery()

### Community 39 - "Community 39"
Cohesion: 0.52
Nodes (6): getLocalFiles(), listCloudinaryResources(), main(), processGame(), uploadFile(), writeAssetMap()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): get_archetype(), get_weights_for_set(), Set-Based Stat Weights for Svarog PvP Relic Scorer ============================, Return the stat weight dict for a given set name.     Falls back to a generic b, Return the archetype label for a set.

### Community 41 - "Community 41"
Cohesion: 0.47
Nodes (3): isDevHost(), isGithubPagesHost(), resolveApiBaseUrl()

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 46 - "Community 46"
Cohesion: 0.6
Nodes (3): useCountUp(), useFadeInUp(), WavePairingTable()

### Community 52 - "Community 52"
Cohesion: 0.7
Nodes (4): getConfidenceLevel(), getSmartRecommendation(), shouldUseSmartPrefix(), shouldUseWaveFlip()

### Community 53 - "Community 53"
Cohesion: 0.7
Nodes (4): main(), uploadFile(), uploadWeapons(), writeMap()

### Community 54 - "Community 54"
Cohesion: 0.6
Nodes (3): getElementMeta(), getHsrElementUrl(), WarpBannerCard()

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

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 72 - "Community 72"
Cohesion: 0.83
Nodes (3): handler(), resolveGameFromUrl(), resolvePathPart()

### Community 73 - "Community 73"
Cohesion: 0.83
Nodes (3): extractPublicId(), getTargetFolder(), reorganize()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): execute(), fetchGuides()

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (2): getSizeClass(), PvpVsMark()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): formatCalendarWeek(), ZoneHeader()

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): findCavernById(), getCavernDisplayName()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): parseKiyoDebugExport(), runKiyoBacktest()

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (3): Expert V2 Bot, Raw Pair Manipulation Logic, PvP Bot and Roll System

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): listResources(), main()

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): CountUp(), useCountUp()

### Community 92 - "Community 92"
Cohesion: 0.67
Nodes (3): GRAPH_REPORT.md, Graphify Knowledge Graph, graphify-out/ Directory

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (2): BBP Mode (Beast Binary Predictor), Long String Lab

### Community 211 - "Community 211"
Cohesion: 1.0
Nodes (1): Warp Analyzer

### Community 214 - "Community 214"
Cohesion: 1.0
Nodes (1): src/utils/kiyoCommons.js

### Community 215 - "Community 215"
Cohesion: 1.0
Nodes (1): src/utils/bbp-mode-3str.js

### Community 216 - "Community 216"
Cohesion: 1.0
Nodes (1): Kiyo Debug Export [2026-03-02]

## Knowledge Gaps
- **75 isolated node(s):** `SubstatEntry`, `Relic`, `HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/`, `Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall`, `Return the effective weight, applying flat penalty for flat stats.` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Window Performance Tracker`** (14 nodes): `windowPerformanceTracker.js`, `getWindowTracker()`, `resetWindowTracker()`, `WindowPerformanceTracker`, `.addRoll()`, `.calculateOverallAccuracy()`, `.constructor()`, `.getBestPredictor()`, `.getCurrentWindowStats()`, `.getPerformanceSummary()`, `.getWeights()`, `.recordPrediction()`, `.startNewWindow()`, `.updateBestPredictor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (7 nodes): `callGemini()`, `checkRateLimit()`, `getClientIp()`, `matchKnowledgeBase()`, `scoreQuery()`, `trackFaqAnalytic()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (5 nodes): `getCommonsNoise()`, `analyze-session-performance.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (5 nodes): `getCommonsNoise()`, `analyze-session-profiles.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `analyze-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `debug-integration-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `debug-noise-misses.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `debug-ui-alert.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `simulate-adaptive-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `simulate-best-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `simulate-individual-overrides.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `simulate-override-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `validate-lower-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `validate-noise-integration.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `execute()`, `fetchGuides()`, `guides.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `getSizeClass()`, `PvpVsMark()`, `PvpVsMark.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `ZoneHeader.jsx`, `formatCalendarWeek()`, `ZoneHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `findCavernById()`, `getCavernDisplayName()`, `caverns.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `kiyoBacktester.js`, `parseKiyoDebugExport()`, `runKiyoBacktest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (3 nodes): `generate-genshin-map.js`, `listResources()`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `CountUp.jsx`, `CountUp()`, `useCountUp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (2 nodes): `BBP Mode (Beast Binary Predictor)`, `Long String Lab`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (1 nodes): `Warp Analyzer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (1 nodes): `src/utils/kiyoCommons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (1 nodes): `src/utils/bbp-mode-3str.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (1 nodes): `Kiyo Debug Export [2026-03-02]`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round()` connect `Patch Timers and Game Calendar` to `ClaraChat UI Components`, `Admin API and Authorization`, `Community 32`, `Banner Service Layer`, `Community 36`, `Playground Challenge and PvP Rooms`, `Warp Analyzer and Discord Commands`, `Pattern Analysis and Discord Bot`, `Kiyo Caesar and Modern UI`, `Playground Practice API`, `Discord Session and String Commands`, `HSR and Zone API Routing`, `Relic Scoring Algorithms`, `HSR Assets and Kiyo Patch Service`, `Kiyo Commons and Session Predictor`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `log()` connect `Banner Service Layer` to `Community 34`, `Warp Analyzer and Discord Commands`, `Discord Session and String Commands`, `HSR and Zone API Routing`, `Cavern Clears Archival System`, `Presence Migration to Supabase`, `WuWa Stats Adaptive Parser`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Why does `supabaseAdminRequest()` connect `Admin API and Authorization` to `Playground Challenge and PvP Rooms`, `Playground Practice API`, `HSR and Zone API Routing`, `Presence and Online Status API`, `User Profile and Marketplace API`, `Presence Migration to Supabase`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 86 inferred relationships involving `round()` (e.g. with `runReplay()` and `score_relic()`) actually correct?**
  _`round()` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `supabaseAdminRequest()` (e.g. with `getGuidesDocument()` and `upsertGuidesDocument()`) actually correct?**
  _`supabaseAdminRequest()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `log()` (e.g. with `listModels()` and `runReplay()`) actually correct?**
  _`log()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `predictWithPairs()` (e.g. with `execute()` and `handleLongstringInput()`) actually correct?**
  _`predictWithPairs()` has 17 INFERRED edges - model-reasoned connections that need verification._