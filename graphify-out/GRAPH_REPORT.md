# Graph Report - .  (2026-04-28)

## Corpus Check
- Large corpus: 615 files · ~4,389,584 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 2012 nodes · 3613 edges · 64 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 644 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Services & Presence Tracking|API Services & Presence Tracking]]
- [[_COMMUNITY_Gacha Analytics & Data Services|Gacha Analytics & Data Services]]
- [[_COMMUNITY_App Core & State Management|App Core & State Management]]
- [[_COMMUNITY_Pattern Analysis & Metrics|Pattern Analysis & Metrics]]
- [[_COMMUNITY_Game Mechanics & Relic Scoring|Game Mechanics & Relic Scoring]]
- [[_COMMUNITY_PvP Bot & Simulation|PvP Bot & Simulation]]
- [[_COMMUNITY_Progression & Rewards System|Progression & Rewards System]]
- [[_COMMUNITY_Predictor Engine & AI|Predictor Engine & AI]]
- [[_COMMUNITY_Data Archival & Cron Jobs|Data Archival & Cron Jobs]]
- [[_COMMUNITY_Marketplace & Customization|Marketplace & Customization]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
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
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 156|Community 156]]
- [[_COMMUNITY_Community 157|Community 157]]

## God Nodes (most connected - your core abstractions)
1. `round()` - 83 edges
2. `supabaseAdminRequest()` - 65 edges
3. `log()` - 49 edges
4. `predictWithPairs()` - 30 edges
5. `simulateBotTargetRelic()` - 29 edges
6. `buildTablePath()` - 29 edges
7. `random()` - 29 edges
8. `useAuth()` - 29 edges
9. `requireAuthenticatedUser()` - 26 edges
10. `buildBotState()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `formatRate()` --calls--> `round()`  [INFERRED]
  src\hooks\useZoneTracker.js → scripts\analyze-prng-bias.mjs
- `formatMmSsFromSeconds()` --calls--> `round()`  [INFERRED]
  src\pages\CavernTimesPage.jsx → scripts\analyze-prng-bias.mjs
- `rebalanceMarketplaceCost()` --calls--> `round()`  [INFERRED]
  src\utils\marketplaceCatalog.js → scripts\analyze-prng-bias.mjs
- `scoreRunBreakCandidate()` --calls--> `round()`  [INFERRED]
  src\utils\pairTransitionPredictor.js → scripts\analyze-prng-bias.mjs
- `calculateFlipProbability()` --calls--> `round()`  [INFERRED]
  src\utils\predictNext.js → scripts\analyze-prng-bias.mjs

## Hyperedges (group relationships)
- **Svarog Prediction Pipeline** — utils_pairtransitionpredictor, readme_bbp_mode, manipulation_logic_raw_pairs [INFERRED 0.90]
- **Multi-Game Data Synchronization** — api_backend, banners_config, utils_warpdataservice [EXTRACTED 0.85]
- **PvP Simulation Architecture** — pvp_bot_system, expert_v2_bot, manipulation_logic_raw_pairs [EXTRACTED 0.95]

## Communities

### Community 0 - "API Services & Presence Tracking"
Cohesion: 0.03
Nodes (171): fetchAdminUserById(), handler(), normalizeReason(), normalizeUserId(), requireAdmin(), toAdminListUser(), updateAdminUserById(), getGuidesDocument() (+163 more)

### Community 1 - "Gacha Analytics & Data Services"
Cohesion: 0.02
Nodes (111): buildWuWaImageUrl(), compareWuWaBannerIdsDesc(), extractGenshinBannerName(), extractGenshinFeaturedCharacterSlugs(), extractGenshinFeaturedWeaponSlugs(), extractGenshinWeaponNames(), extractWuWaCurrentTitle(), extractWuWaImageFromHtml() (+103 more)

### Community 2 - "App Core & State Management"
Cohesion: 0.02
Nodes (77): RequireAuth(), ClaraChat(), HomeStatsWidget(), KiyoModeCard(), LiveStatsBanner(), PresenceProvider(), usePresenceContext(), useAuth() (+69 more)

### Community 3 - "Pattern Analysis & Metrics"
Cohesion: 0.02
Nodes (89): execute(), FiveMinProgressBar(), FiveMinWindowTracker(), formatMMSS(), pad2(), useWindowDerived(), WindowStatsMini(), formatDropScore() (+81 more)

### Community 4 - "Game Mechanics & Relic Scoring"
Cohesion: 0.03
Nodes (77): CompactCaesarShift(), ModernCaesarCard(), ModernStatsPanel(), normalizeDisplayToken(), comparePvpAttempts(), createChallengeForceRelic(), createChallengePatternProfile(), createChallengeRelic() (+69 more)

### Community 5 - "PvP Bot & Simulation"
Cohesion: 0.08
Nodes (82): applyBotUpgradeToSlot(), buildBotState(), buildCompactTrendSummary(), buildPvpScenarioPayload(), buildTablePath(), buildTimeoutAttemptFromState(), cloneRelic(), compareAttemptPayload() (+74 more)

### Community 6 - "Progression & Rewards System"
Cohesion: 0.07
Nodes (58): buildPracticeHistoryPath(), buildProgressionDelta(), handlePracticeResult(), handler(), isMissingTableError(), isUniqueViolationError(), normalizeNumber(), readBody() (+50 more)

### Community 7 - "Predictor Engine & AI"
Cohesion: 0.07
Nodes (49): execute(), classifyBoardState(), parseReplayBlocks(), parseTimeLabelToSeconds(), splitIntoFiveMinuteSessions(), testAlertConditions(), collectRows(), parseReplayBlocks() (+41 more)

### Community 8 - "Data Archival & Cron Jobs"
Cohesion: 0.1
Nodes (52): archiveCurrentWeekBlobEntries(), archiveCurrentWeekSnapshot(), archiveCurrentWeekSupabaseEntries(), buildArchiveTablePath(), buildAuditTablePath(), buildTablePath(), buildVariantKeys(), deleteAllSupabaseEntries() (+44 more)

### Community 9 - "Marketplace & Customization"
Cohesion: 0.08
Nodes (44): fetchUserById(), handleLiveModeRewardAction(), handleMarketplaceAction(), handler(), handleRewardAction(), handleTitleAction(), handleTutorialCompleteAction(), readBody() (+36 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (40): buildContract(), buildGoalText(), buildProgressText(), buildWinText(), clone(), getChallengeHintPack(), getChallengeRelicTemplate(), applySelectedTargetSet() (+32 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (31): analyze2StrDataset(), analyzeWaveColumn(), build2StrFrequency(), buildCandidates(), calculateFlipProbability(), calculateSwapRate(), clampConf(), detectCyclic() (+23 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (16): execute(), execute(), extractManualSequence(), getSessionStatus(), handleLiveInput(), handleLongstringInput(), handleSessionInput(), createSession() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (32): buildSvarogAssistance(), createLabProfile(), describeFreshness(), formatTrust(), getDisplayLane(), getFamilyOptions(), getTransitionSupport(), PlaygroundPatternLabPage() (+24 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (33): aggregateRooms(), applyPracticeBotSummary(), applyResultToBucket(), archiveAndDeleteBotRooms(), buildBotResultsPath(), buildLeaderboard(), buildPracticeLeaderboard(), buildProfilePayload() (+25 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (6): AnimatedTitleText(), useAnimatedTitleEffect(), UserIdentityBlock(), UserIdentityCard(), getSvgBannerByKey(), IdentityHero()

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (25): handler(), buildContractLeaderboard(), buildPlayerLeaderboard(), buildResultsPath(), compareChallengeRows(), fetchSeasonChallengeRows(), formatName(), getChallengeLeaderboardSnapshot() (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.1
Nodes (27): _assign_grade(), CharacterWeights, _effective_weight(), estimate_rolls(), _ideal_score_for_slot(), infer_roll_quality(), HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/, Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (19): agentKiyoWave(), agentMain(), agentSvarogOnly(), parseLegacyCtxRows(), parseReplayRows(), parseTimeline(), parseTimeToSeconds(), pct() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (16): buildCommonsSummary(), getSessionCommons(), getYDigitCommons(), getYDigitForPrediction(), getYZCommons(), getZDigitCommons(), predict3strFromY(), predictIndependent3str() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (9): buildEmptyRelicCard(), buildZoneVariantKey(), collectZoneSubstatsForClient(), formatRate(), getDefaultMainStatForPiece(), normalizeClearTimeMmSsInput(), normalizeClientSubstatLabel(), parseClearTimeToSeconds() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (13): ensureEnv(), main(), mergeRecords(), normalizeIso(), normalizeRecord(), readKnownUserRecords(), readRedisStats(), redisPipeline() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.23
Nodes (15): applyTargetFilter(), buildSelectFields(), buildTargetFilterConfig(), collectZoneSubstats(), extractSubstatValue(), handler(), hasMissingColumn(), isMissingLikesTable() (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (7): buildPairMatrix(), calculateTrends(), calculateWaveSignals(), getDistribution(), getParity(), identifyCommonsNoise(), predictWithPairs()

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (11): buildWuWaStats(), extractItemHistogram(), parseHistogramContent(), parseStrategy_v1(), parseStrategy_v2(), parseStrategy_v3(), parseStrategy_v5(), parseWuWaHTML_Adaptive() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.23
Nodes (7): buildDiscordOAuthUrl(), fetchSupabaseAuth(), fetchSupabaseUser(), getAuthRedirectUrl(), hasSupabaseClientConfig(), refreshSupabaseSession(), revokeSupabaseSession()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (12): buildDivider(), buildExportText(), buildFilename(), buildSelectFields(), formatCharNames(), formatClearTime(), formatSlotOrder(), handler() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.32
Nodes (10): buildWuWaImageUrl(), compareWuWaBannerIdsDesc(), extractWuWaCurrentTitle(), findBannerByExactName(), findBannerByFirstOccurrence(), findBannerByTitleMatch(), handler(), pickHighestWuWaBanner() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (11): buildPermissionView(), clamp(), computePairAge(), deriveActionConfidence(), deriveLeadingModel(), derivePermission(), derivePrimaryReason(), deriveRecoveryCue() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (9): applyManualOverride(), buildCharacterBannerPayload(), buildWeaponBannerPayload(), discoverBannerNear(), extractFeaturedCharacterSlugs(), extractFeaturedWeaponSlugs(), fetchBannerByExactId(), handler() (+1 more)

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
Cohesion: 0.31
Nodes (2): createGenerator(), HsrPrngSimulator

### Community 37 - "Community 37"
Cohesion: 0.32
Nodes (4): getYouTubeEmbedUrl(), getYouTubeThumbnail(), ModernGuidesPage(), VideoCard()

### Community 38 - "Community 38"
Cohesion: 0.48
Nodes (4): buildSliderBounds(), clampValue(), parseIntegerMaybe(), ZoneBuildTeam()

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (2): matchKnowledgeBase(), scoreQuery()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): get_archetype(), get_weights_for_set(), Set-Based Stat Weights for Svarog PvP Relic Scorer ============================, Return the stat weight dict for a given set name.     Falls back to a generic b, Return the archetype label for a set.

### Community 41 - "Community 41"
Cohesion: 0.47
Nodes (3): isDevHost(), isGithubPagesHost(), resolveApiBaseUrl()

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 45 - "Community 45"
Cohesion: 0.6
Nodes (3): useCountUp(), useFadeInUp(), WavePairingTable()

### Community 51 - "Community 51"
Cohesion: 0.7
Nodes (4): getConfidenceLevel(), getSmartRecommendation(), shouldUseSmartPrefix(), shouldUseWaveFlip()

### Community 52 - "Community 52"
Cohesion: 0.4
Nodes (5): Expert V2 Bot, Raw Pair Manipulation Logic, Svarog Tracer (HSR Pattern Record), PvP Bot and Roll System, Pair Transition Predictor Engine

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

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (2): execute(), fetchGuides()

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (2): getSizeClass(), PvpVsMark()

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (2): formatCalendarWeek(), ZoneHeader()

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (2): findCavernById(), getCavernDisplayName()

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): parseKiyoDebugExport(), runKiyoBacktest()

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (3): BBP Mode (Beast Binary Predictor), Long String Lab, BBP Mode Wrapper

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (2): Warp Analyzer, Warp Data Service

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (2): Vercel Serverless Backend API, Banners Configuration

## Knowledge Gaps
- **25 isolated node(s):** `SubstatEntry`, `Relic`, `HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/`, `Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall`, `Return the effective weight, applying flat penalty for flat stats.` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 36`** (9 nodes): `relicPrngSimulator.js`, `createGenerator()`, `HsrPrngSimulator`, `.constructor()`, `.generateBatch()`, `.getRawDigit()`, `.inject()`, `.nextRoll()`, `.setRegime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (7 nodes): `callGemini()`, `checkRateLimit()`, `getClientIp()`, `matchKnowledgeBase()`, `scoreQuery()`, `trackFaqAnalytic()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (5 nodes): `getCommonsNoise()`, `analyze-session-performance.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (5 nodes): `getCommonsNoise()`, `analyze-session-profiles.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (4 nodes): `analyze-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (4 nodes): `debug-integration-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `debug-noise-misses.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `debug-ui-alert.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `simulate-adaptive-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `simulate-best-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `simulate-individual-overrides.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `simulate-override-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `validate-lower-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `validate-noise-integration.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `execute()`, `fetchGuides()`, `guides.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (3 nodes): `getSizeClass()`, `PvpVsMark()`, `PvpVsMark.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `ZoneHeader.jsx`, `formatCalendarWeek()`, `ZoneHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `findCavernById()`, `getCavernDisplayName()`, `caverns.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `kiyoBacktester.js`, `parseKiyoDebugExport()`, `runKiyoBacktest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (2 nodes): `Warp Analyzer`, `Warp Data Service`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (2 nodes): `Vercel Serverless Backend API`, `Banners Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round()` connect `Pattern Analysis & Metrics` to `Gacha Analytics & Data Services`, `App Core & State Management`, `Game Mechanics & Relic Scoring`, `Progression & Rewards System`, `Predictor Engine & AI`, `Marketplace & Customization`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 27`, `Community 29`, `Community 31`, `Community 32`?**
  _High betweenness centrality (0.328) - this node is a cross-community bridge._
- **Why does `log()` connect `Gacha Analytics & Data Services` to `Community 34`, `Data Archival & Cron Jobs`, `Community 13`, `Community 22`, `Community 25`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Why does `supabaseAdminRequest()` connect `API Services & Presence Tracking` to `PvP Bot & Simulation`, `Progression & Rewards System`, `Marketplace & Customization`, `Community 15`, `Community 17`, `Community 22`, `Community 23`, `Community 27`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 80 inferred relationships involving `round()` (e.g. with `runReplay()` and `score_relic()`) actually correct?**
  _`round()` has 80 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `supabaseAdminRequest()` (e.g. with `getGuidesDocument()` and `upsertGuidesDocument()`) actually correct?**
  _`supabaseAdminRequest()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 46 inferred relationships involving `log()` (e.g. with `listModels()` and `runReplay()`) actually correct?**
  _`log()` has 46 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `predictWithPairs()` (e.g. with `execute()` and `handleLongstringInput()`) actually correct?**
  _`predictWithPairs()` has 17 INFERRED edges - model-reasoned connections that need verification._