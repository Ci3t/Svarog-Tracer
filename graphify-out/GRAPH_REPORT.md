# Graph Report - HSR_PatternRecord  (2026-05-01)

## Corpus Check
- 330 files · ~4,590,297 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2041 nodes · 3679 edges · 67 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 646 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 11|Community 11]]
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
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 193|Community 193]]

## God Nodes (most connected - your core abstractions)
1. `round()` - 84 edges
2. `supabaseAdminRequest()` - 65 edges
3. `log()` - 50 edges
4. `predictWithPairs()` - 30 edges
5. `simulateBotTargetRelic()` - 29 edges
6. `buildTablePath()` - 29 edges
7. `random()` - 29 edges
8. `useAuth()` - 29 edges
9. `requireAuthenticatedUser()` - 26 edges
10. `buildBotState()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `round()` --calls--> `formatMmSsFromSeconds()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\pages\CavernTimesPage.jsx
- `round()` --calls--> `rebalanceMarketplaceCost()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\utils\marketplaceCatalog.js
- `round()` --calls--> `calculateFlipProbability()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\utils\predictNext.js
- `round()` --calls--> `estimateWinsOnlyDistribution()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\utils\warpDataService.js
- `round()` --calls--> `PrefixWavePanel()`  [INFERRED]
  scripts\analyze-prng-bias.mjs → src\components\kiyo\PrefixWavePanel.jsx

## Hyperedges (group relationships)
- **Svarog Prediction Pipeline** — utils_pairtransitionpredictor, readme_bbp_mode, manipulation_logic_raw_pairs [INFERRED 0.90]
- **Multi-Game Data Synchronization** — api_backend, banners_config, utils_warpdataservice [EXTRACTED 0.85]
- **PvP Simulation Architecture** — pvp_bot_system, expert_v2_bot, manipulation_logic_raw_pairs [EXTRACTED 0.95]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (172): fetchAdminUserById(), handler(), normalizeReason(), normalizeUserId(), requireAdmin(), toAdminListUser(), updateAdminUserById(), getGuidesDocument() (+164 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (110): execute(), execute(), buildEmptyRelicCard(), buildZoneVariantKey(), collectZoneSubstatsForClient(), formatDropScore(), formatRate(), getDefaultMainStatForPiece() (+102 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (73): RequireAuth(), ClaraChat(), HomeStatsWidget(), KiyoModeCard(), LiveStatsBanner(), PresenceProvider(), usePresenceContext(), useAuth() (+65 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (92): handler(), handler(), resolvePathPart(), handler(), execute(), execute(), WarpAnalyzer(), loadCommands() (+84 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (74): ModernCaesarCard(), comparePvpAttempts(), createChallengeForceRelic(), createChallengePatternProfile(), createChallengeRelic(), createChallengeSessionEntries(), createForceRelic(), createRelic() (+66 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (87): ResultRelicCard(), applyBotUpgradeToSlot(), buildBotState(), buildCompactTrendSummary(), buildPvpScenarioPayload(), buildTablePath(), buildTimeoutAttemptFromState(), cloneRelic() (+79 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (70): buildPracticeHistoryPath(), buildProgressionDelta(), handlePracticeResult(), handler(), isMissingTableError(), isUniqueViolationError(), normalizeNumber(), readBody() (+62 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (52): archiveCurrentWeekBlobEntries(), archiveCurrentWeekSnapshot(), archiveCurrentWeekSupabaseEntries(), buildArchiveTablePath(), buildAuditTablePath(), buildTablePath(), buildVariantKeys(), deleteAllSupabaseEntries() (+44 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (44): fetchUserById(), handleLiveModeRewardAction(), handleMarketplaceAction(), handler(), handleRewardAction(), handleTitleAction(), handleTutorialCompleteAction(), readBody() (+36 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (40): buildContract(), buildGoalText(), buildProgressText(), buildWinText(), clone(), getChallengeHintPack(), getChallengeRelicTemplate(), applySelectedTargetSet() (+32 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (31): analyze2StrDataset(), analyzeWaveColumn(), build2StrFrequency(), buildCandidates(), calculateFlipProbability(), calculateSwapRate(), clampConf(), detectCyclic() (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (17): execute(), execute(), extractManualSequence(), runLongStringBacktest(), getSessionStatus(), handleLiveInput(), handleLongstringInput(), handleSessionInput() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (34): fetchUserIdentityMap(), aggregateRooms(), applyPracticeBotSummary(), applyResultToBucket(), archiveAndDeleteBotRooms(), buildBotResultsPath(), buildLeaderboard(), buildPracticeLeaderboard() (+26 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (33): buildWuWaCurrentBannerFallback(), buildWuWaImageUrl(), compareWuWaBannerIdsDesc(), extractGenshinBannerName(), extractGenshinFeaturedCharacterSlugs(), extractGenshinFeaturedWeaponSlugs(), extractGenshinWeaponNames(), extractWuWaCurrentTitle() (+25 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (29): ModernLiveTrackingTable(), adjustConfidenceForMARK(), analyzeFlipPattern(), analyzeTablePattern(), buildTransitionMatrix(), calculateCSI(), calculateNTL(), calculatePatternStrength() (+21 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (6): AnimatedTitleText(), useAnimatedTitleEffect(), UserIdentityBlock(), UserIdentityCard(), getSvgBannerByKey(), IdentityHero()

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (27): _assign_grade(), CharacterWeights, _effective_weight(), estimate_rolls(), _ideal_score_for_slot(), infer_roll_quality(), HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/, Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (23): createLabProfile(), getFamilyOptions(), countWindow(), createBucketPatternProfile(), createGenerator(), createPatternProfile(), createPatternProfileFromId(), createWeights() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (19): agentKiyoWave(), agentMain(), agentSvarogOnly(), parseLegacyCtxRows(), parseReplayRows(), parseTimeline(), parseTimeToSeconds(), pct() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (16): buildCommonsSummary(), getSessionCommons(), getYDigitCommons(), getYDigitForPrediction(), getYZCommons(), getZDigitCommons(), predict3strFromY(), predictIndependent3str() (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (11): analyzeColumnPattern(), analyzeKiyoExplicitPairs(), clamp(), labelForSide(), oppositeSide(), prefixesForSide(), runInfo(), scoreXyColumn() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.26
Nodes (13): ensureEnv(), main(), mergeRecords(), normalizeIso(), normalizeRecord(), readKnownUserRecords(), readRedisStats(), redisPipeline() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.23
Nodes (15): applyTargetFilter(), buildSelectFields(), buildTargetFilterConfig(), collectZoneSubstats(), extractSubstatValue(), handler(), hasMissingColumn(), isMissingLikesTable() (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (10): CavernTimesPage(), clampSeconds(), compareCavernEntriesByFreshness(), formatLiveTimeInput(), formatMmSsFromSeconds(), getClearLastReportedTimestamp(), getClearReportCount(), normalizeTimeForSubmit() (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.3
Nodes (12): buildWuWaStats(), extractItemHistogram(), parseHistogramContent(), parseStrategy_v1(), parseStrategy_v2(), parseStrategy_v3(), parseStrategy_v5(), parseWuWaHTML_Adaptive() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (7): buildPairMatrix(), calculateTrends(), calculateWaveSignals(), getDistribution(), getParity(), identifyCommonsNoise(), predictWithPairs()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (12): buildWuWaImageUrl(), compareWuWaBannerIdsDesc(), extractWuWaCurrentTitle(), fetchWithTimeout(), findBannerByExactName(), findBannerByFirstOccurrence(), findBannerByTitleMatch(), findWuWaBannerById() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (11): boxBase(), ExactPredictor(), PairTimeline(), pct(), PrefixSeedAssist(), PrefixWavePanel(), scoreTone(), TwoStringPatternRecognition() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (7): buildDiscordOAuthUrl(), fetchSupabaseAuth(), fetchSupabaseUser(), getAuthRedirectUrl(), hasSupabaseClientConfig(), refreshSupabaseSession(), revokeSupabaseSession()

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (12): buildContractLeaderboard(), buildPlayerLeaderboard(), buildResultsPath(), compareChallengeRows(), fetchSeasonChallengeRows(), formatName(), getChallengeLeaderboardSnapshot(), handler() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (12): buildDivider(), buildExportText(), buildFilename(), buildSelectFields(), formatCharNames(), formatClearTime(), formatSlotOrder(), handler() (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (11): buildPermissionView(), clamp(), computePairAge(), deriveActionConfidence(), deriveLeadingModel(), derivePermission(), derivePrimaryReason(), deriveRecoveryCue() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.27
Nodes (7): LiveTrackingTable3str(), analyzeFlipPattern(), buildTransitionMatrix(), cleanRolls(), detectPattern(), identifyCommons(), predictNext3BBPMode()

### Community 34 - "Community 34"
Cohesion: 0.35
Nodes (10): analyzePattern(), analyzePatternWithWindow(), calculateHistoricalFlipFrequency(), calculateNoise(), compareColumns(), detectPatternBreak(), detectRunPattern(), generatePatternDescription() (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.42
Nodes (8): buildWarpAnalyzerPrompt(), checkRateLimit(), formatClaraFaqAnswer(), getClaraFaqById(), handleClara(), handler(), matchClaraFAQ(), normalizeClaraText()

### Community 36 - "Community 36"
Cohesion: 0.22
Nodes (4): useCompanion(), CompanionSelector(), CompanionWidget(), SpeechBubble()

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (2): createGenerator(), HsrPrngSimulator

### Community 38 - "Community 38"
Cohesion: 0.32
Nodes (4): getYouTubeEmbedUrl(), getYouTubeThumbnail(), ModernGuidesPage(), VideoCard()

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (4): CompactCaesarShift(), ModernStatsPanel(), normalizeDisplayToken(), caesarShiftForLine()

### Community 40 - "Community 40"
Cohesion: 0.57
Nodes (6): FiveMinProgressBar(), FiveMinWindowTracker(), formatMMSS(), pad2(), useWindowDerived(), WindowStatsMini()

### Community 41 - "Community 41"
Cohesion: 0.48
Nodes (4): buildSliderBounds(), clampValue(), parseIntegerMaybe(), ZoneBuildTeam()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (2): matchKnowledgeBase(), scoreQuery()

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (5): get_archetype(), get_weights_for_set(), Set-Based Stat Weights for Svarog PvP Relic Scorer ============================, Return the stat weight dict for a given set name.     Falls back to a generic b, Return the archetype label for a set.

### Community 44 - "Community 44"
Cohesion: 0.47
Nodes (3): isDevHost(), isGithubPagesHost(), resolveApiBaseUrl()

### Community 45 - "Community 45"
Cohesion: 0.47
Nodes (3): describeMisses(), describeSwitches(), sessionSection()

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 49 - "Community 49"
Cohesion: 0.6
Nodes (3): useCountUp(), useFadeInUp(), WavePairingTable()

### Community 55 - "Community 55"
Cohesion: 0.7
Nodes (4): getConfidenceLevel(), getSmartRecommendation(), shouldUseSmartPrefix(), shouldUseWaveFlip()

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

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (2): execute(), fetchGuides()

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (2): getSizeClass(), PvpVsMark()

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (2): formatCalendarWeek(), ZoneHeader()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): findCavernById(), getCavernDisplayName()

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): parseKiyoDebugExport(), runKiyoBacktest()

### Community 87 - "Community 87"
Cohesion: 0.67
Nodes (3): Expert V2 Bot, Raw Pair Manipulation Logic, PvP Bot and Roll System

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (2): BBP Mode (Beast Binary Predictor), Long String Lab

### Community 193 - "Community 193"
Cohesion: 1.0
Nodes (1): Warp Analyzer

## Knowledge Gaps
- **22 isolated node(s):** `SubstatEntry`, `Relic`, `HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/`, `Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall`, `Return the effective weight, applying flat penalty for flat stats.` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 37`** (9 nodes): `relicPrngSimulator.js`, `createGenerator()`, `HsrPrngSimulator`, `.constructor()`, `.generateBatch()`, `.getRawDigit()`, `.inject()`, `.nextRoll()`, `.setRegime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (7 nodes): `callGemini()`, `checkRateLimit()`, `getClientIp()`, `matchKnowledgeBase()`, `scoreQuery()`, `trackFaqAnalytic()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (5 nodes): `getCommonsNoise()`, `analyze-session-performance.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (5 nodes): `getCommonsNoise()`, `analyze-session-profiles.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `analyze-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `debug-integration-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `debug-noise-misses.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `debug-ui-alert.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `simulate-adaptive-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `simulate-best-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (4 nodes): `simulate-individual-overrides.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `simulate-override-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `validate-lower-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (4 nodes): `validate-noise-integration.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `execute()`, `fetchGuides()`, `guides.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (3 nodes): `getSizeClass()`, `PvpVsMark()`, `PvpVsMark.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (3 nodes): `ZoneHeader.jsx`, `formatCalendarWeek()`, `ZoneHeader()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `findCavernById()`, `getCavernDisplayName()`, `caverns.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (3 nodes): `kiyoBacktester.js`, `parseKiyoDebugExport()`, `runKiyoBacktest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `BBP Mode (Beast Binary Predictor)`, `Long String Lab`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 193`** (1 nodes): `Warp Analyzer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round()` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 19`, `Community 20`, `Community 24`, `Community 26`, `Community 28`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 39`, `Community 40`, `Community 45`?**
  _High betweenness centrality (0.308) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 3` to `Community 35`, `Community 7`, `Community 12`, `Community 14`, `Community 22`, `Community 25`, `Community 27`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `PlaygroundDrillsPage()` connect `Community 2` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 81 inferred relationships involving `round()` (e.g. with `runReplay()` and `score_relic()`) actually correct?**
  _`round()` has 81 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `supabaseAdminRequest()` (e.g. with `getGuidesDocument()` and `upsertGuidesDocument()`) actually correct?**
  _`supabaseAdminRequest()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `log()` (e.g. with `listModels()` and `runReplay()`) actually correct?**
  _`log()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `predictWithPairs()` (e.g. with `execute()` and `handleLongstringInput()`) actually correct?**
  _`predictWithPairs()` has 17 INFERRED edges - model-reasoned connections that need verification._