# Graph Report - HSR_PatternRecord  (2026-06-25)

## Corpus Check
- 378 files · ~10,843,201 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2417 nodes · 4530 edges · 61 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 853 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `log()` - 90 edges
2. `round()` - 89 edges
3. `supabaseAdminRequest()` - 65 edges
4. `fetch()` - 59 edges
5. `useAuth()` - 31 edges
6. `predictWithPairs()` - 29 edges
7. `simulateBotTargetRelic()` - 29 edges
8. `buildTablePath()` - 29 edges
9. `random()` - 29 edges
10. `execute()` - 27 edges

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

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (191): authorizeAdminRequest(), fetchAdminUserById(), handler(), isAuthorized(), normalizeReason(), normalizeUserId(), readRequestBody(), requireAdmin() (+183 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (116): _assign_grade(), CharacterWeights, _effective_weight(), estimate_rolls(), _ideal_score_for_slot(), infer_roll_quality(), HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/, Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall (+108 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (67): RequireAuth(), ClaraChat(), useAuth(), useChallengeLeaderboard(), useChallengeResults(), useLiveModeCurrency(), useOwnedRoster(), useProfileMarketplace() (+59 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (90): applyCurrentHsrBannerFloor(), callServiceHandler(), handler(), normalizeGameQuery(), handler(), resolveGameFromUrl(), resolvePathPart(), loadCommands() (+82 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (78): CompactCaesarShift(), ModernCaesarCard(), ModernStatsPanel(), normalizeDisplayToken(), comparePvpAttempts(), createChallengeForceRelic(), createChallengePatternProfile(), createChallengeRelic() (+70 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (81): execute(), execute(), normalizeBannerId(), normalizeCurrentDisplayBanner(), normalizeCurrentDisplayList(), execute(), buildBannerEmbed(), buildErrorEmbed() (+73 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (75): buildWarpAnalyzerPrompt(), checkRateLimit(), formatClaraFaqAnswer(), getClaraFaqById(), handleClara(), handler(), matchClaraFAQ(), normalizeClaraText() (+67 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (68): execute(), agentKiyoWave(), agentMain(), agentSvarogOnly(), classifyBoardState(), parseLegacyCtxRows(), parseReplayRows(), parseTimeline() (+60 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (83): applyBotUpgradeToSlot(), buildBotState(), buildCompactTrendSummary(), buildPvpScenarioPayload(), buildTablePath(), buildTimeoutAttemptFromState(), cloneRelic(), compareAttemptPayload() (+75 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (72): buildPracticeHistoryPath(), buildProgressionDelta(), handlePracticeResult(), handler(), isMissingTableError(), isUniqueViolationError(), normalizeNumber(), readBody() (+64 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (62): getElementMeta(), getHsrElementUrl(), WarpBannerCard(), applyControlledOverride(), buildCharacterBannerPayload(), buildControlledFallbackBanners(), buildWeaponBannerPayload(), discoverBannerAuto() (+54 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (42): execute(), execute(), getSessionStatus(), handleLiveInput(), handleLongstringInput(), handleSessionInput(), analyze2StrDataset(), analyzeWaveColumn() (+34 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (45): buildFallbackResponse(), calculatePatchInfo(), getDb(), getPatchDurationDays(), handler(), incrementPatch(), isAuthorized(), parsePatchVersion() (+37 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (50): handler(), resolvePathPart(), handler(), buildContractLeaderboard(), buildPlayerLeaderboard(), buildResultsPath(), compareChallengeRows(), fetchSeasonChallengeRows() (+42 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (49): appendBotWuWaCollabBanners(), applyBotCurrentHsrBannerFloor(), buildWuWaBannerIdCandidates(), buildWuWaStatsFromHistogram(), buildWuWaTrackerImage(), calculateGenshinWinLoss(), consolidatePeaks(), detectLuckyPeaks() (+41 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (52): archiveCurrentWeekBlobEntries(), archiveCurrentWeekSnapshot(), archiveCurrentWeekSupabaseEntries(), buildArchiveTablePath(), buildAuditTablePath(), buildTablePath(), buildVariantKeys(), deleteAllSupabaseEntries() (+44 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (33): HomeStatsWidget(), KiyoModeCard(), LiveStatsBanner(), useNavigationBlocker(), PresenceProvider(), usePresenceContext(), generateUUID(), getOrCreateAnonymousId() (+25 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (40): buildContract(), buildGoalText(), buildProgressText(), buildWinText(), clone(), getChallengeHintPack(), getChallengeRelicTemplate(), applySelectedTargetSet() (+32 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (41): fetchUserById(), handleLiveModeRewardAction(), handleMarketplaceAction(), handler(), handleRewardAction(), handleTitleAction(), handleTutorialCompleteAction(), readBody() (+33 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (35): buildSvarogAssistance(), createLabProfile(), describeFreshness(), extractManualSequence(), formatTrust(), getDisplayLane(), getFamilyOptions(), getTransitionSupport() (+27 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (22): BaseModel, Enum, main(), Bonus, ExchangeGroup, Module, parse_gamesradar(), parse_gi_fandom() (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (11): buildEmptyRelicCard(), buildZoneVariantKey(), collectZoneSubstatsForClient(), formatRate(), getDefaultMainStatForPiece(), normalizeClearTimeMmSsInput(), normalizeClientSubstatLabel(), parseClearTimeToSeconds() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (16): buildCommonsSummary(), getSessionCommons(), getYDigitCommons(), getYDigitForPrediction(), getYZCommons(), getZDigitCommons(), predict3strFromY(), predictIndependent3str() (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (6): AnimatedTitleText(), useAnimatedTitleEffect(), UserIdentityBlock(), UserIdentityCard(), getSvgBannerByKey(), IdentityHero()

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
Nodes (9): appendWuWaCollabBanners(), fetchHotJson(), fetchJson(), fetchVercelJson(), normalizeBannerId(), normalizeCurrentBanner(), normalizeGenshinBanner(), normalizeWuWaBanner() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.21
Nodes (7): buildPairMatrix(), calculateTrends(), calculateWaveSignals(), getDistribution(), getParity(), identifyCommonsNoise(), predictWithPairs()

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (7): buildDiscordOAuthUrl(), fetchSupabaseAuth(), fetchSupabaseUser(), getAuthRedirectUrl(), hasSupabaseClientConfig(), refreshSupabaseSession(), revokeSupabaseSession()

### Community 31 - "Community 31"
Cohesion: 0.23
Nodes (1): WindowPerformanceTracker

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (12): buildDivider(), buildExportText(), buildFilename(), buildSelectFields(), formatCharNames(), formatClearTime(), formatSlotOrder(), handler() (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (11): buildPermissionView(), clamp(), computePairAge(), deriveActionConfidence(), deriveLeadingModel(), derivePermission(), derivePrimaryReason(), deriveRecoveryCue() (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.27
Nodes (7): LiveTrackingTable3str(), analyzeFlipPattern(), buildTransitionMatrix(), cleanRolls(), detectPattern(), identifyCommons(), predictNext3BBPMode()

### Community 35 - "Community 35"
Cohesion: 0.31
Nodes (8): buildProbFromCandidates(), clamp(), cleanRolls(), computeTransitionStats(), cosineSimilarity(), predictNext2Smart(), predictNext2SmartLegacy(), get2StrHistoricalRolls()

### Community 36 - "Community 36"
Cohesion: 0.35
Nodes (10): analyzePattern(), analyzePatternWithWindow(), calculateHistoricalFlipFrequency(), calculateNoise(), compareColumns(), detectPatternBreak(), detectRunPattern(), generatePatternDescription() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (4): useCompanion(), CompanionSelector(), CompanionWidget(), SpeechBubble()

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (2): getDiscordUserIds(), isTrustedAdminDiscordClient()

### Community 39 - "Community 39"
Cohesion: 0.31
Nodes (2): createGenerator(), HsrPrngSimulator

### Community 40 - "Community 40"
Cohesion: 0.57
Nodes (6): FiveMinProgressBar(), FiveMinWindowTracker(), formatMMSS(), pad2(), useWindowDerived(), WindowStatsMini()

### Community 41 - "Community 41"
Cohesion: 0.48
Nodes (4): buildSliderBounds(), clampValue(), parseIntegerMaybe(), ZoneBuildTeam()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (5): get_archetype(), get_weights_for_set(), Set-Based Stat Weights for Svarog PvP Relic Scorer ============================, Return the stat weight dict for a given set name.     Falls back to a generic b, Return the archetype label for a set.

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 45 - "Community 45"
Cohesion: 0.6
Nodes (3): useCountUp(), useFadeInUp(), WavePairingTable()

### Community 51 - "Community 51"
Cohesion: 0.7
Nodes (4): getConfidenceLevel(), getSmartRecommendation(), shouldUseSmartPrefix(), shouldUseWaveFlip()

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

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (2): parseReplayBlocks(), parseTimeLabelToSeconds()

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

## Knowledge Gaps
- **18 isolated node(s):** `SubstatEntry`, `Relic`, `HSR Relic Scorer — Svarog Implementation Based on: https://github.com/fribbels/`, `Substat weights 0.0–1.0 for a character.     Flat stat weights are automaticall`, `Return the effective weight, applying flat penalty for flat stats.` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 31`** (14 nodes): `windowPerformanceTracker.js`, `getWindowTracker()`, `resetWindowTracker()`, `WindowPerformanceTracker`, `.addRoll()`, `.calculateOverallAccuracy()`, `.constructor()`, `.getBestPredictor()`, `.getCurrentWindowStats()`, `.getPerformanceSummary()`, `.getWeights()`, `.recordPrediction()`, `.startNewWindow()`, `.updateBestPredictor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (9 nodes): `AuthProvider()`, `clearAdminUnlock()`, `extractBanInfo()`, `getDiscordUserIds()`, `isTrustedAdminDiscordClient()`, `readAdminUnlock()`, `readRoleMode()`, `writeAdminUnlock()`, `AuthContext.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (9 nodes): `relicPrngSimulator.js`, `createGenerator()`, `HsrPrngSimulator`, `.constructor()`, `.generateBatch()`, `.getRawDigit()`, `.inject()`, `.nextRoll()`, `.setRegime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (5 nodes): `getCommonsNoise()`, `analyze-session-performance.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (5 nodes): `getCommonsNoise()`, `analyze-session-profiles.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (4 nodes): `analyze-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (4 nodes): `debug-integration-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (4 nodes): `debug-noise-misses.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (4 nodes): `debug-ui-alert.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `simulate-adaptive-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (4 nodes): `simulate-best-override.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `simulate-individual-overrides.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `simulate-override-per-session.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `validate-lower-gates.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (4 nodes): `validate-noise-integration.mjs`, `parseReplayBlocks()`, `parseTimeLabelToSeconds()`, `splitIntoFiveMinuteSessions()`
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

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `round()` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 18`, `Community 20`, `Community 22`, `Community 23`, `Community 29`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 40`?**
  _High betweenness centrality (0.313) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 3` to `Community 5`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `fetch()` connect `Community 6` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 10`, `Community 14`, `Community 15`, `Community 16`, `Community 26`, `Community 27`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 87 inferred relationships involving `log()` (e.g. with `listModels()` and `runReplay()`) actually correct?**
  _`log()` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 86 inferred relationships involving `round()` (e.g. with `runReplay()` and `calculatePatchInfo()`) actually correct?**
  _`round()` has 86 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `supabaseAdminRequest()` (e.g. with `getGuidesDocument()` and `upsertGuidesDocument()`) actually correct?**
  _`supabaseAdminRequest()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `fetch()` (e.g. with `listModels()` and `handleClara()`) actually correct?**
  _`fetch()` has 40 INFERRED edges - model-reasoned connections that need verification._