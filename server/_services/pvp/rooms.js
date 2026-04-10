import crypto from 'node:crypto';
import { createChallengeScenario } from '../../../src/data/challengeScenarioFactory.js';
import {
  advancePatternProfile,
  createBucketPatternProfile,
  getVisibleRollForUpgrade,
} from '../../../src/utils/playgroundPatternProfiles.js';
import { translateTo4 } from '../../../src/utils/stringHelpers.js';
import {
  activateRelicLine,
  applyUpgradeRoll,
  createRelicLine,
  detectRelicScoreProfile,
  scoreRelicWithProfile,
} from '../../../src/utils/relicScoring.js';
import { predictWithPairs } from '../../../src/utils/pairTransitionPredictor.js';
import { resolveEquippedTitleFromUser } from '../../../src/utils/titleCatalog.js';
import { getMarketplaceItem, resolveEquippedCosmeticsFromMetadata } from '../../../src/utils/marketplaceCatalog.js';
import {
  extractDiscordDisplayName,
  HttpError,
  isZoneAdminUser,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAdminRequest,
} from '../zone/shared.js';

const env = globalThis.process?.env || {};
const PVP_ROOMS_TABLE = env.SUPABASE_PVP_ROOMS_TABLE || 'pvp_rooms';
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_RACE_TRIES = 3;
const BOT_RETRY_DELAY_SECONDS = 2;
const MISTAKE_SCORE_PENALTY = 4;
const PREMATCH_COUNTDOWN_SECONDS = 5;
const PVP_DUEL_SECONDS = 300;
const TIMEOUT_SCORE_MULTIPLIER = 0.7;
const BOT_TIER_CONFIG = {
  new_player: { baseStep: 6, jitter: 2, minScore: 0, minHelpful: 0, scoreBias: false, trendAware: false, historyAware: false, pairAware: false, searchDepth: 0, forceBonus: 1, helpfulBonus: 5, junkPenalty: 4, neutralPenalty: 0, noisePenalty: 0.25, commonsBonus: 0.25, dominantBonus: 0.15, scoreWeight: 1, strictGoal: false },
  beginner: { baseStep: 5, jitter: 2, minScore: 18, minHelpful: 1, scoreBias: false, trendAware: false, historyAware: false, pairAware: true, searchDepth: 0, forceBonus: 2, helpfulBonus: 7, junkPenalty: 5, neutralPenalty: 0.5, noisePenalty: 0.5, commonsBonus: 0.5, dominantBonus: 0.4, scoreWeight: 0.9, strictGoal: false },
  intermediate: { baseStep: 4, jitter: 2, minScore: 24, minHelpful: 1, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 2, forceBonus: 3, helpfulBonus: 10, junkPenalty: 8, neutralPenalty: 1.5, noisePenalty: 1, commonsBonus: 1.25, dominantBonus: 0.75, scoreWeight: 0.8, strictGoal: true },
  veteran: { baseStep: 4, jitter: 1, minScore: 30, minHelpful: 2, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 4, forceBonus: 4, helpfulBonus: 13, junkPenalty: 10, neutralPenalty: 2.5, noisePenalty: 1.75, commonsBonus: 1.75, dominantBonus: 1.15, scoreWeight: 0.66, strictGoal: true, submitMargin: 3, maxMistakesToSubmit: 1, analysisDelaySteps: 1, forceGap: 6, ceilingMargin: 6 },
  expert: { baseStep: 3, jitter: 1, minScore: 35, minHelpful: 2, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 5, forceBonus: 5, helpfulBonus: 18, junkPenalty: 13, neutralPenalty: 4.25, noisePenalty: 2.35, commonsBonus: 2.25, dominantBonus: 1.5, scoreWeight: 0.48, strictGoal: true, submitMargin: 5, maxMistakesToSubmit: 1, analysisDelaySteps: 1, forceGap: 9, ceilingMargin: 5 },
  expert_v2: { baseStep: 3, jitter: 1, minScore: 36, minHelpful: 2, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 6, forceBonus: 5, helpfulBonus: 19, junkPenalty: 13, neutralPenalty: 4.5, noisePenalty: 2.5, commonsBonus: 2.4, dominantBonus: 1.6, scoreWeight: 0.45, strictGoal: true, submitMargin: 6, maxMistakesToSubmit: 0, analysisDelaySteps: 2, forceGap: 11, ceilingMargin: 4 },
};

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function buildTablePath(filters = {}, includeSelect = true) {
  const params = new URLSearchParams();
  if (includeSelect) params.set('select', '*');
  Object.entries(filters).forEach(([key, value]) => {
    params.set(key, value);
  });
  return `${PVP_ROOMS_TABLE}?${params.toString()}`;
}

function normalizeName(user) {
  return (
    extractDiscordDisplayName(user) ||
    String(user?.email || '').split('@')[0] ||
    `User-${String(user?.id || '').slice(0, 6)}`
  );
}

function isLocalDevRequest(req) {
  const host = String(
    req.headers.host ||
    req.headers['x-forwarded-host'] ||
    ''
  ).toLowerCase();
  return host.includes('localhost') || host.includes('127.0.0.1');
}

function generateRoomCode(length = 6) {
  let output = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = crypto.randomInt(0, ROOM_CODE_ALPHABET.length);
    output += ROOM_CODE_ALPHABET[randomIndex];
  }
  return output;
}

function createPlayerState(name = '', options = {}) {
  const nowIso = new Date().toISOString();
  return {
    status: 'ready',
    phase: 'idle',
    currentLevel: 0,
    helpfulHits: 0,
    hp: 100,
    tries: 1,
    mistakes: 0,
    score: 0,
    grade: 'F',
    rollCount: 0,
    hintStep: 0,
    statBreakdown: {},
    goalSatisfied: false,
    attemptsUsed: 0,
    submittedAttempts: 0,
    finalScore: 0,
    finalGrade: 'F',
    finalRollCount: 0,
    finalHelpfulHits: 0,
    finalMistakes: 0,
    finalGoalSatisfied: false,
    finalStatBreakdown: {},
    finalRelicSnapshot: null,
    finalRelicSummary: '',
    currentRelicSnapshot: null,
    currentRelicSummary: '',
    sessionEntriesBuilt: 0,
    sessionEntries: [],
    sessionArchive: [],
    botTick: 0,
    bestScore: 0,
    bestGrade: 'F',
    bestRollCount: 0,
    bestHelpfulHits: 0,
    bestMistakes: 0,
    bestStatBreakdown: {},
    bestRelicSnapshot: null,
    bestRelicSummary: '',
    relicSummary: '',
    debugLog: [],
    displayName: String(name || ''),
    displayAvatarUrl: String(options?.avatarUrl || '').slice(0, 512),
    displayTitleKey: String(options?.titleKey || '').slice(0, 80),
    displayTitle: String(options?.titleLabel || '').slice(0, 120),
    displayTitleRarity: String(options?.titleRarity || '').slice(0, 24),
    displayBadgeKey: String(options?.badgeKey || '').slice(0, 80),
    displayBadge: String(options?.badgeLabel || '').slice(0, 80),
    displayBadgeRarity: String(options?.badgeRarity || '').slice(0, 24),
    displayNameplateKey: String(options?.nameplateKey || '').slice(0, 80),
    displayNameplate: String(options?.nameplateLabel || '').slice(0, 80),
    displayNameplateRarity: String(options?.nameplateRarity || '').slice(0, 24),
    displayFrameKey: String(options?.frameKey || '').slice(0, 80),
    displayFrame: String(options?.frameLabel || '').slice(0, 80),
    displayFrameRarity: String(options?.frameRarity || '').slice(0, 24),
    updatedAt: nowIso,
  };
}

function resolveUserIdentity(user) {
  const displayName = normalizeName(user);
  const equippedTitle = resolveEquippedTitleFromUser(user);
  const cosmetics = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});
  const equippedBadge = getMarketplaceItem(cosmetics.badgeKey);
  const equippedNameplate = getMarketplaceItem(cosmetics.nameplateKey);
  const equippedFrame = getMarketplaceItem(cosmetics.frameKey);
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const discordIdentity = identities.find((i) => String(i?.provider || '').toLowerCase() === 'discord');
  const identityData = discordIdentity?.identity_data && typeof discordIdentity.identity_data === 'object' ? discordIdentity.identity_data : {};
  const avatarUrl = [metadata.avatar_url, identityData.avatar_url, metadata.avatar, metadata.picture].find((v) => v && typeof v === 'string') || '';
  return {
    displayName,
    avatarUrl,
    titleKey: equippedTitle?.key || '',
    titleLabel: equippedTitle?.name || '',
    titleRarity: equippedTitle?.rarity || '',
    badgeKey: equippedBadge?.key || '',
    badgeLabel: equippedBadge?.name || '',
    badgeRarity: equippedBadge?.rarity || '',
    nameplateKey: equippedNameplate?.key || '',
    nameplateLabel: equippedNameplate?.name || '',
    nameplateRarity: equippedNameplate?.rarity || '',
    frameKey: equippedFrame?.key || '',
    frameLabel: equippedFrame?.name || '',
    frameRarity: equippedFrame?.rarity || '',
  };
}

function extractStateIdentity(state = {}, fallbackName = '') {
  return {
    displayName: String(state?.displayName || fallbackName || '').trim(),
    avatarUrl: String(state?.displayAvatarUrl || '').trim(),
    titleKey: String(state?.displayTitleKey || '').trim(),
    titleLabel: String(state?.displayTitle || '').trim(),
    titleRarity: String(state?.displayTitleRarity || '').trim(),
    badgeKey: String(state?.displayBadgeKey || '').trim(),
    badgeLabel: String(state?.displayBadge || '').trim(),
    badgeRarity: String(state?.displayBadgeRarity || '').trim(),
    nameplateKey: String(state?.displayNameplateKey || '').trim(),
    nameplateLabel: String(state?.displayNameplate || '').trim(),
    nameplateRarity: String(state?.displayNameplateRarity || '').trim(),
    frameKey: String(state?.displayFrameKey || '').trim(),
    frameLabel: String(state?.displayFrame || '').trim(),
    frameRarity: String(state?.displayFrameRarity || '').trim(),
  };
}

function createBotSessionEntry(rawPair, translated, extra = {}) {
  return {
    id: `bot-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    raw: String(rawPair || ''),
    translated: String(translated || ''),
    s2: String(translated || ''),
    s3: '',
    s4: '',
    s5: '',
    time: new Date().toISOString(),
    attempt: Math.max(1, Number(extra?.attempt || 1) || 1),
    step: Math.max(1, Number(extra?.step || 1) || 1),
    carryLine: Number.isInteger(extra?.carryLine) ? extra.carryLine : null,
    commons: Array.isArray(extra?.commons) ? extra.commons.join('/') : '',
    noise: Array.isArray(extra?.noise) ? extra.noise.join('/') : '',
    dominantRoll: String(extra?.dominantRoll || ''),
    noisePressure: Number.isFinite(Number(extra?.noisePressure)) ? Number(extra.noisePressure) : 0,
    pairSafety: String(extra?.pairSafety || ''),
    noiseRisk: Number.isFinite(Number(extra?.noiseRisk)) ? Number(extra.noiseRisk) : 0,
    trustedPair: Array.isArray(extra?.trustedPair) ? extra.trustedPair.join('/') : '',
    trendSummary: String(extra?.trendSummary || ''),
  };
}

function isDevBotUserId(value) {
  const normalized = String(value || '');
  return normalized.startsWith('dev-bot:') || normalized.startsWith('dev-bot-fair:');
}

function isFairBotUserId(value) {
  return String(value || '').startsWith('dev-bot-fair:');
}

function hashString(value = '') {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getScenarioLineStats(scenario) {
  const targetRelic = scenario?.targetRelic && typeof scenario.targetRelic === 'object'
    ? scenario.targetRelic
    : {};
  const lines = Array.isArray(targetRelic.lines) ? targetRelic.lines.slice(0, 3) : [];
  if (targetRelic.fourthLine) lines.push(targetRelic.fourthLine);
  return lines.filter(Boolean);
}

function createZeroBreakdown(stats = []) {
  return stats.reduce((acc, stat) => {
    acc[stat] = 0;
    return acc;
  }, {});
}

function resolveNextSlotFromVisibleRoll(previousLine, visibleRoll) {
  for (let candidate = 1; candidate <= 4; candidate += 1) {
    const rawPair = `${previousLine}${candidate}`;
    if (translateTo4(rawPair) === visibleRoll) {
      return { rawPair, targetSlot: candidate };
    }
  }
  return {
    rawPair: `${previousLine}${previousLine}`,
    targetSlot: previousLine,
  };
}

function isHelpfulStatForScenario(stat, success) {
  if (!stat) return false;
  if (success?.type === 'monoLine') {
    return String(success.target || '') === String(stat);
  }
  if (Array.isArray(success?.required)) {
    return success.required.includes(stat);
  }
  return false;
}

function getRequiredStatsForScenario(success = {}) {
  if (success?.type === 'monoLine') {
    return [String(success.target || '')].filter(Boolean);
  }
  if (Array.isArray(success?.required)) {
    return success.required.filter(Boolean);
  }
  return [];
}

function getScenarioGoalProgress(scenario, breakdown = {}) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const requiredStats = getRequiredStatsForScenario(success);
  const junkStats = Array.isArray(success?.junk) ? success.junk : [];
  const junkHitCount = junkStats.reduce((sum, stat) => sum + Math.max(0, Number(breakdown?.[stat] || 0)), 0);
  const requiredHitTotal = requiredStats.reduce((sum, stat) => sum + Math.max(0, Number(breakdown?.[stat] || 0)), 0);
  const requiredCoverage = requiredStats.reduce((sum, stat) => sum + (Math.max(0, Number(breakdown?.[stat] || 0)) > 0 ? 1 : 0), 0);
  const targetHits = success?.type === 'monoLine' ? Math.max(0, Number(breakdown?.[success.target] || 0)) : 0;
  const minCombined = Math.max(0, Number(success?.minCombined || 0) || 0);
  const minEach = Math.max(1, Number(success?.minEach || 1) || 1);
  const minHits = Math.max(1, Number(success?.minHits || 1) || 1);
  const missingRequiredCount = Math.max(0, requiredStats.length - requiredCoverage);

  let missingGoalHits = 0;
  if (success.type === 'monoLine') {
    missingGoalHits = Math.max(0, minHits - targetHits);
  } else if (success.type === 'dualCrit') {
    missingGoalHits = requiredStats.reduce((sum, stat) => (
      sum + Math.max(0, minEach - Math.max(0, Number(breakdown?.[stat] || 0)))
    ), 0);
  } else if (success.type === 'dualCritCombined') {
    missingGoalHits = Math.max(0, minCombined - requiredHitTotal);
  }

  return {
    requiredStats,
    junkStats,
    junkHitCount,
    requiredHitTotal,
    requiredCoverage,
    targetHits,
    missingRequiredCount,
    missingGoalHits,
    goalSatisfied: evaluateScenarioSuccess(scenario, breakdown),
  };
}

function getScenarioStatPriority(stat, scenario) {
  const normalizedStat = String(stat || '');
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const requiredStats = getRequiredStatsForScenario(success);
  if (requiredStats.includes(normalizedStat)) return 'REQUIRED';
  return getScenarioStatTier(normalizedStat, scenario);
}

function getScenarioStatTier(stat, scenario) {
  const tierByStat = scenario?.targetStatGuide?.tierByStat && typeof scenario.targetStatGuide.tierByStat === 'object'
    ? scenario.targetStatGuide.tierByStat
    : {};
  return String(tierByStat[String(stat || '')] || 'NEUTRAL');
}

function formatScenarioTierLabel(stat, scenario) {
  const priority = getScenarioStatPriority(stat, scenario);
  if (priority === 'REQUIRED') return 'goal';
  const tier = getScenarioStatTier(stat, scenario);
  if (tier === 'S') return 'S-tier';
  if (tier === 'A') return 'A-tier';
  if (tier === 'TRASH') return 'trash';
  return 'neutral';
}

function isNeutralStatForScenario(stat, success) {
  if (!stat) return false;
  if (isHelpfulStatForScenario(stat, success)) return false;
  const junkStats = Array.isArray(success?.junk) ? success.junk : [];
  return !junkStats.includes(stat);
}

function createBotTargetRelic(scenario) {
  const targetRelic = scenario?.targetRelic && typeof scenario.targetRelic === 'object' ? scenario.targetRelic : {};
  const lineStats = Array.isArray(targetRelic.lines) ? targetRelic.lines.slice(0, 3) : [];
  const rollTierMode = scenario?.pvpRollTier || null;
  return {
    id: `bot-target-${String(scenario?.seedLabel || 'seed').slice(0, 24)}`,
    setName: targetRelic.setNameHint || 'Challenge Set',
    setImage: targetRelic.setImage || '',
    pieceLabel: targetRelic.pieceLabel || 'Relic',
    mainStat: targetRelic.mainStat || 'FLAT HP',
    orderMode: 'fixed',
    level: 0,
    hasFourthLine: Boolean(targetRelic.hasFourthLine),
    lastLine: null,
    lastRawPair: '',
    lastVisibleRoll: '',
    lines: [
      createRelicLine(1, lineStats[0] || 'LINE 1', { active: true, rollTierMode }),
      createRelicLine(2, lineStats[1] || 'LINE 2', { active: true, rollTierMode }),
      createRelicLine(3, lineStats[2] || 'LINE 3', { active: true, rollTierMode }),
    ],
    fourthLine: createRelicLine(4, targetRelic.fourthLine || 'LINE 4', { active: Boolean(targetRelic.hasFourthLine), rollTierMode }),
  };
}

function createBotBuilderRelic(scenario) {
  const builderRelic = scenario?.builderRelic && typeof scenario.builderRelic === 'object' ? scenario.builderRelic : {};
  const lineStats = Array.isArray(builderRelic.lines) ? builderRelic.lines.slice(0, 3) : [];
  const rollTierMode = scenario?.pvpRollTier || null;
  return {
    id: `bot-builder-${String(scenario?.seedLabel || 'seed').slice(0, 24)}`,
    setName: builderRelic.setNameHint || 'Builder Set',
    setImage: builderRelic.setImage || '',
    pieceLabel: builderRelic.pieceLabel || 'Relic',
    mainStat: builderRelic.mainStat || 'FLAT HP',
    orderMode: 'fixed',
    level: 0,
    hasFourthLine: Boolean(builderRelic.hasFourthLine),
    lastLine: null,
    lastRawPair: '',
    lastVisibleRoll: '',
    lines: [
      createRelicLine(1, lineStats[0] || 'LINE 1', { active: true, rollTierMode }),
      createRelicLine(2, lineStats[1] || 'LINE 2', { active: true, rollTierMode }),
      createRelicLine(3, lineStats[2] || 'LINE 3', { active: true, rollTierMode }),
    ],
    fourthLine: createRelicLine(4, builderRelic.fourthLine || 'LINE 4', { active: Boolean(builderRelic.hasFourthLine), rollTierMode }),
  };
}

function createScenarioPatternProfile(scenario) {
  const starterRolls = Array.isArray(scenario?.starterRolls) ? scenario.starterRolls : [];
  return starterRolls.reduce(
    (currentProfile, roll) => advancePatternProfile(currentProfile, String(roll || '')),
    createBucketPatternProfile(
      scenario?.mood || 'mixed',
      scenario?.seedLabel || '',
      scenario?.region || 'America',
      scenario?.patch || '4.1'
    )
  );
}

function simulateBotSessionBuilder(scenario, options = {}) {
  const config = options?.config || BOT_TIER_CONFIG.beginner;
  let relic = options?.startRelic ? cloneRelic(options.startRelic) : createBotBuilderRelic(scenario);
  let profile = options?.startProfile ? cloneRelic(options.startProfile) : createScenarioPatternProfile(scenario);
  let carryLine = Number.isInteger(options?.startCarryLine) ? options.startCarryLine : null;
  let sessionEntries = Array.isArray(options?.sessionEntries) ? options.sessionEntries.map((entry) => ({ ...entry })) : [];
  const initialEntryCount = sessionEntries.length;
  const debugLog = Array.isArray(options?.debugLog) ? options.debugLog : null;
  const attemptNumber = Number(options?.attemptNumber || 1);
  const stepOffset = Math.max(0, Number(options?.stepOffset || 0) || 0);
  const actions = Math.max(0, Number(options?.actions || 0) || 0);
  const rawTargetEntries = options?.targetEntries ?? scenario?.minSessionEntries ?? 5;
  const targetEntries = Math.max(1, Number(rawTargetEntries) || 5);
  let usedActions = 0;

  while (usedActions < actions && sessionEntries.length < targetEntries) {
    if (!relic.hasFourthLine) {
      const predictor = config.pairAware
        ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
        : null;
      relic = {
        ...relic,
        level: 3,
        hasFourthLine: true,
        lastLine: 4,
        lastRawPair: '44',
        lastVisibleRoll: '44',
        lines: relic.lines.map((line) => ({ ...line, justHit: false })),
        fourthLine: activateRelicLine(relic.fourthLine),
      };
      profile = advancePatternProfile(profile, '44');
      carryLine = 4;
      usedActions += 1;
      const globalStep = stepOffset + usedActions;
      sessionEntries.push(createBotSessionEntry('44', '44', {
        attempt: attemptNumber,
        step: globalStep,
        carryLine,
        commons: Array.isArray(profile?.commons) ? profile.commons : [],
        noise: Array.isArray(profile?.noise) ? profile.noise : [],
        dominantRoll: profile?.dominantRoll || '',
        noisePressure: profile?.noisePressure ?? 0,
        pairSafety: predictor?.pairSafety || '',
        noiseRisk: predictor?.noiseRisk ?? 0,
        trustedPair: Array.isArray(predictor?.trustedPair) ? predictor.trustedPair : [],
        trendSummary: buildCompactTrendSummary(predictor),
      }));
      pushBotDebug(debugLog, `Try ${attemptNumber}, builder step ${globalStep}: I opened line 4, recorded raw 44, and used it as the first session entry.`);
      continue;
    }

    if (relic.level >= 15) {
      relic = {
        ...createBotBuilderRelic(scenario),
        hasFourthLine: true,
        level: 3,
        lastLine: carryLine || relic.lastLine || 4,
        lastRawPair: '',
        lastVisibleRoll: '',
        fourthLine: activateRelicLine(createBotBuilderRelic(scenario).fourthLine),
      };
    }

    const nextSequenceIndex = Array.isArray(profile?.history) ? profile.history.length : 0;
    const visibleRoll = getVisibleRollForUpgrade(profile, nextSequenceIndex);
    const previousLine = carryLine || relic.lastLine || 4;
    const predictor = config.pairAware
      ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
      : null;
    const resolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
    relic = applyBotUpgradeToSlot(relic, resolution.targetSlot, resolution.rawPair, visibleRoll);
    profile = advancePatternProfile(profile, visibleRoll);
    carryLine = relic.lastLine || carryLine;
    usedActions += 1;
    const globalStep = stepOffset + usedActions;
    sessionEntries.push(createBotSessionEntry(resolution.rawPair, visibleRoll, {
      attempt: attemptNumber,
      step: globalStep,
      carryLine,
      commons: Array.isArray(profile?.commons) ? profile.commons : [],
      noise: Array.isArray(profile?.noise) ? profile.noise : [],
      dominantRoll: profile?.dominantRoll || '',
      noisePressure: profile?.noisePressure ?? 0,
      pairSafety: predictor?.pairSafety || '',
      noiseRisk: predictor?.noiseRisk ?? 0,
      trustedPair: Array.isArray(predictor?.trustedPair) ? predictor.trustedPair : [],
      trendSummary: buildCompactTrendSummary(predictor),
    }));
    pushBotDebug(debugLog, `Try ${attemptNumber}, builder step ${globalStep}: I used the session builder, recorded raw ${resolution.rawPair}, translated it to ${visibleRoll}, and moved my sitting line to L${carryLine || '-'}.`);
  }

  return {
    relic,
    profile,
    carryLine,
    sessionEntries: sessionEntries.slice(-32),
    newEntries: sessionEntries.slice(initialEntryCount).slice(-32),
    usedActions,
  };
}

function simulateBotTargetRelic(scenario, totalActions, options = {}) {
  const config = options?.config || BOT_TIER_CONFIG.beginner;
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  let relic = options?.startRelic ? cloneRelic(options.startRelic) : createBotTargetRelic(scenario);
  let profile = options?.startProfile ? cloneRelic(options.startProfile) : createScenarioPatternProfile(scenario);
  let carryLine = Number.isInteger(options?.startCarryLine) ? options.startCarryLine : null;
  let builderRelic = options?.startBuilderRelic ? cloneRelic(options.startBuilderRelic) : createBotBuilderRelic(scenario);
  let sessionEntries = Array.isArray(options?.sessionEntries) ? options.sessionEntries.map((entry) => ({ ...entry })) : [];
  const initialSessionEntryCount = sessionEntries.length;
  const debugLog = Array.isArray(options?.debugLog) ? options.debugLog : null;
  const attemptNumber = Number(options?.attemptNumber || 1);
  const actions = Math.max(0, Number(totalActions) || 0);

  for (let index = 0; index < actions; index += 1) {
    if (!relic.hasFourthLine) {
      pushBotDebug(debugLog, `Try ${attemptNumber}: activated 4th line ${relic.fourthLine?.stat || 'LINE 4'} at +3.`);
      relic = {
        ...relic,
        hasFourthLine: true,
        level: 3,
        lastLine: 4,
        fourthLine: activateRelicLine(relic.fourthLine),
      };
      continue;
    }

    if (relic.level >= 15) {
      break;
    }

    const nextSequenceIndex = Array.isArray(profile?.history) ? profile.history.length : 0;
    const actualVisibleRoll = getVisibleRollForUpgrade(profile, nextSequenceIndex);
    const previousLine = carryLine || relic.lastLine || 4;
    const predictor = config.pairAware
      ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
      : null;
    const inferredRoll = config.fairMode
      ? inferLikelyVisibleRoll(profile, predictor, relic, scenario, previousLine)
      : null;
    const visibleRoll = String(inferredRoll?.visibleRoll || actualVisibleRoll);
    const fairConfidenceGap = Number(inferredRoll?.confidenceGap || 0);
    const fairConfidenceLabel = !config.fairMode
      ? ''
      : fairConfidenceGap >= 10
        ? 'high'
        : fairConfidenceGap >= 5
          ? 'medium'
          : 'low';
    const monoReachability = success.type === 'monoLine'
      ? getMonoReachabilityForVisibleRoll(relic, scenario, visibleRoll, previousLine)
      : null;
    if (
      scenario?.requiresSessionBuilder
      && success.type === 'monoLine'
      && monoReachability
      && !monoReachability.reachable
    ) {
      pushBotDebug(
        debugLog,
        `Try ${attemptNumber}, step ${index + 1}: ${config.fairMode ? `I inferred` : `visible`} roll ${visibleRoll} cannot reach the mono target on slot ${monoReachability.targetSlot} from line ${previousLine}, so I am burning this roll on the builder relic to advance the seed and carry line.`
      );
      const builderSimulation = simulateBotSessionBuilder(scenario, {
        startRelic: builderRelic,
        startProfile: profile,
        startCarryLine: carryLine,
        sessionEntries,
        stepOffset: sessionEntries.length,
        targetEntries: sessionEntries.length + 1,
        config,
        debugLog,
        attemptNumber,
        actions: 1,
      });
      if (builderSimulation.usedActions > 0) {
        builderRelic = builderSimulation.relic;
        profile = builderSimulation.profile;
        carryLine = builderSimulation.carryLine;
        sessionEntries = builderSimulation.sessionEntries;
      }
      continue;
    }
    const defaultResolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
    const defaultStat = getRelicStatBySlot(relic, defaultResolution.targetSlot);
    const defaultCandidate = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
    const nextProfile = advancePatternProfile(profile, visibleRoll);
    const currentAssessment = evaluateBotRelicState(relic, scenario, profile, config);
    const defaultImmediate = getActionCandidateScore(defaultCandidate, defaultStat, scenario, profile, config, false, predictor);
    const defaultFuture = config.searchDepth > 0
      ? searchBestBotFuture(defaultCandidate, nextProfile, defaultCandidate.lastLine || null, scenario, config, config.searchDepth)
      : defaultImmediate.totalScore;
    const defaultMonoNextBonus = success.type === 'monoLine'
      ? getMonoNextStepPositionScore(defaultCandidate, nextProfile, scenario)
      : 0;
    const defaultChoiceScore = defaultImmediate.totalScore * 0.4 + defaultFuture * 0.6 + defaultMonoNextBonus;
    const forceLineCandidates = getBotForceLineCandidates(relic, scenario, visibleRoll);
    const allForcedOptions = [];
    let preferredForcedOption = null;
    let chosenForcedOption = null;

    forceLineCandidates.forEach((forceLine) => {
      const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
      if (
        forcedResolution?.rawPair === defaultResolution?.rawPair
        && Number(forcedResolution?.targetSlot || 0) === Number(defaultResolution?.targetSlot || 0)
      ) {
        return;
      }
      const forcedStat = getRelicStatBySlot(relic, forcedResolution.targetSlot);
      const forcedCandidate = applyBotUpgradeToSlot(relic, forcedResolution.targetSlot, forcedResolution.rawPair, visibleRoll);
      const forcedImmediate = getActionCandidateScore(forcedCandidate, forcedStat, scenario, profile, config, true, predictor);
      const forcedFuture = config.searchDepth > 0
        ? searchBestBotFuture(forcedCandidate, nextProfile, forcedCandidate.lastLine || null, scenario, config, config.searchDepth)
        : forcedImmediate.totalScore;
      const forcedMonoNextBonus = success.type === 'monoLine'
        ? getMonoNextStepPositionScore(forcedCandidate, nextProfile, scenario)
        : 0;
      const forcedChoiceScore = forcedImmediate.totalScore * 0.4 + forcedFuture * 0.6 + forcedMonoNextBonus;
      const decisionConfig = config.fairMode
        ? {
          ...config,
          forceGap: Number(config?.forceGap || 0)
            + (fairConfidenceGap < 3 ? 10 : fairConfidenceGap < 6 ? 5 : fairConfidenceGap < 9 ? 2 : 0),
        }
        : config;
      const forceDecision = decideForceRoute({
        defaultEval: { ...defaultImmediate, totalScore: defaultChoiceScore },
        forcedEval: { ...forcedImmediate, totalScore: forcedChoiceScore },
        defaultStat,
        forcedStat,
        predictor,
        scenario,
        config: decisionConfig,
        currentGoalSatisfied: currentAssessment.goalProgress?.goalSatisfied,
      });
      const option = {
        forceLine,
        forcedResolution,
        forcedStat,
        forcedCandidate,
        forcedImmediate,
        forcedChoiceScore,
        forceDecision,
      };
      allForcedOptions.push(option);
      if (!preferredForcedOption || forcedChoiceScore > preferredForcedOption.forcedChoiceScore) {
        preferredForcedOption = option;
      }
      if (forceDecision.shouldForce && (!chosenForcedOption || forcedChoiceScore > chosenForcedOption.forcedChoiceScore)) {
        chosenForcedOption = option;
      }
    });

    const comparedForcedOption = chosenForcedOption || preferredForcedOption;
    const shouldForce = Boolean(chosenForcedOption);
    const comparedForcedStat = comparedForcedOption?.forcedStat || '';
    const comparedForcedScore = comparedForcedOption?.forcedChoiceScore ?? defaultChoiceScore;
    const comparedForceLine = comparedForcedOption?.forceLine ?? getBotForceLineCandidates(relic, scenario, visibleRoll)[0] ?? 2;
    const decisionReason = comparedForcedOption?.forceDecision?.reason || 'no useful force route beat the default line.';

    if (config.fairMode) {
      pushBotDebug(debugLog, `Try ${attemptNumber}, step ${index + 1}: I inferred the next roll as ${visibleRoll} from predictor/history while sitting on line ${previousLine}. The actual hidden roll was ${actualVisibleRoll}.`);
      if (Array.isArray(inferredRoll?.ranked) && inferredRoll.ranked.length > 0) {
        const topChoices = inferredRoll.ranked
          .slice(0, 3)
          .map((entry) => `${entry.roll}=${Number(entry.score || 0).toFixed(2)}`)
          .join(' | ');
        pushBotDebug(debugLog, `Fair-read confidence was ${fairConfidenceLabel} (gap ${fairConfidenceGap.toFixed(2)}). My top inferred roll options were ${topChoices}.`);
      }
    } else {
      pushBotDebug(debugLog, `Try ${attemptNumber}, step ${index + 1}: the visible roll was ${visibleRoll} and I was sitting on line ${previousLine}.`);
    }
    pushBotDebug(debugLog, summarizeVisibleRollLineHelper(visibleRoll));
    pushBotDebug(debugLog, summarizeRecentHistory(profile));
    pushBotDebug(debugLog, `My own board read said commons ${Array.isArray(profile?.commons) ? profile.commons.join('/') : '-'}, noise ${Array.isArray(profile?.noise) ? profile.noise.join('/') : '-'}, dominant roll ${String(profile?.dominantRoll || 'none')}, and noise pressure ${Number(profile?.noisePressure || 0).toFixed(2)}.`);
    pushBotDebug(debugLog, summarizePredictor(predictor));
    if (config.fairMode && predictor) {
      pushBotDebug(
        debugLog,
        `Svarog analyzer leaned ${String(predictor?.analyzerPrediction || '-')}${predictor?.analyzerAlt ? ` with alt ${predictor.analyzerAlt}` : ''}. Pair gap ${Math.max(0, Number(predictor?.pairScoreGap || 0))} | regime ${String(predictor?.regime || 'unknown')}${predictor?.freshOutsider?.value ? ` | outsider ${predictor.freshOutsider.value}` : ''}.`
      );
    }
    pushBotDebug(debugLog, summarizeTrendRead(predictor));
    pushBotDebug(debugLog, summarizeForceCandidateOptions(allForcedOptions, scenario));
    pushBotDebug(debugLog, summarizeChoice(defaultStat, defaultChoiceScore, comparedForcedStat, comparedForcedScore, shouldForce, comparedForceLine, config, scenario));
    if (shouldForce && chosenForcedOption?.forcedResolution?.rawPair) {
      pushBotDebug(debugLog, summarizeChosenForceRoute(chosenForcedOption, visibleRoll, scenario));
    }
    pushBotDebug(debugLog, `Decision note: ${decisionReason}`);

    const chosenLine = shouldForce ? Number(chosenForcedOption?.forceLine || previousLine) : previousLine;
    const appliedResolution = resolveNextSlotFromVisibleRoll(chosenLine, actualVisibleRoll);
    relic = applyBotUpgradeToSlot(relic, appliedResolution.targetSlot, appliedResolution.rawPair, actualVisibleRoll);
    profile = advancePatternProfile(profile, actualVisibleRoll);
    carryLine = relic.lastLine || carryLine || null;
    if (config.fairMode) {
      pushBotDebug(debugLog, `Actual resolution: with hidden roll ${actualVisibleRoll}, line ${chosenLine} produced raw pair ${appliedResolution.rawPair} and landed on slot ${appliedResolution.targetSlot} for ${getRelicStatBySlot(relic, appliedResolution.targetSlot) || 'unknown'}.`);
    }
  }

  const statBreakdown = [...relic.lines, relic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = Number(line.hits || 0);
    return acc;
  }, {});

  return {
    relic,
    statBreakdown,
    profile,
    carryLine,
    builderRelic,
    sessionEntries,
    newSessionEntries: sessionEntries.slice(initialSessionEntryCount).slice(-32),
    usedActions: actions,
  };
}

function evaluateScenarioSuccess(scenario, breakdown = {}) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const junkHitCount = Array.isArray(success.junk)
    ? success.junk.reduce((sum, stat) => sum + Math.max(0, Number(breakdown?.[stat] || 0)), 0)
    : 0;
  const passedJunkGate = typeof success.maxJunk === 'number' ? junkHitCount <= success.maxJunk : true;

  if (success.type === 'monoLine') {
    return Math.max(0, Number(breakdown?.[success.target] || 0)) >= (success.minHits || 1) && passedJunkGate;
  }

  if (success.type === 'dualCrit') {
    const requiredStats = Array.isArray(success.required) && success.required.length >= 2
      ? success.required.slice(0, 2)
      : [];
    if (requiredStats.length < 2) return false;
    return requiredStats.every((stat) => Math.max(0, Number(breakdown?.[stat] || 0)) >= (success.minEach || 1)) && passedJunkGate;
  }

  if (success.type === 'dualCritCombined') {
    const requiredStats = Array.isArray(success.required) && success.required.length >= 2
      ? success.required.slice(0, 2)
      : [];
    const combinedHits = requiredStats.reduce((sum, stat) => sum + Math.max(0, Number(breakdown?.[stat] || 0)), 0);
    return combinedHits >= (success.minCombined || 2) && passedJunkGate;
  }

  return false;
}

function getBotConfig(tier, seedHash, options = {}) {
  const base = BOT_TIER_CONFIG[String(tier || '').toLowerCase()] || BOT_TIER_CONFIG.beginner;
  const fairMode = Boolean(options?.fairMode);
  return {
    ...base,
    fairMode,
    searchDepth: fairMode ? 0 : base.searchDepth,
    stepSeconds: base.baseStep + (seedHash % Math.max(1, base.jitter + 1)),
    retryDelay: BOT_RETRY_DELAY_SECONDS,
  };
}

function cloneRelic(relic) {
  return JSON.parse(JSON.stringify(relic));
}

function pushBotDebug(debugLog, line) {
  if (!Array.isArray(debugLog)) return;
  debugLog.push(line);
  if (debugLog.length > 120) {
    debugLog.splice(0, debugLog.length - 120);
  }
}

function emitBotDebugToConsole(roomCode, debugLog) {
  if (!Array.isArray(debugLog) || debugLog.length === 0) return;
  console.info(`[PvP Bot ${roomCode}] decision trace start`);
  debugLog.slice(-20).forEach((entry) => console.info(`[PvP Bot ${roomCode}] ${entry}`));
  console.info(`[PvP Bot ${roomCode}] decision trace end`);
}

function summarizeRecentHistory(profile) {
  const history = Array.isArray(profile?.history) ? profile.history.slice(-8) : [];
  if (history.length === 0) return 'I had no meaningful history yet.';
  const uniqueCount = new Set(history).size;
  const counts = history.reduce((acc, roll) => {
    acc[roll] = (acc[roll] || 0) + 1;
    return acc;
  }, {});
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || history[history.length - 1];
  return `I checked the recent history ${history.join(' ')}. It used ${uniqueCount} unique values, and ${dominant} was the most repeated roll.`;
}

function summarizePredictor(predictor) {
  if (!predictor) return 'I did not use Svarog eye on this tier.';
  const trustedPair = Array.isArray(predictor?.trustedPair) ? predictor.trustedPair.join('/') : 'unknown';
  const noisePair = Array.isArray(predictor?.noise) ? predictor.noise.join('/') : 'unknown';
  const pairSafety = String(predictor?.pairSafety || 'unknown');
  const noiseRisk = Number(predictor?.noiseRisk || 0);
  return `Svarog eye trusted ${trustedPair}, marked ${noisePair} as noise, pair safety was ${pairSafety}, and noise risk was ${noiseRisk}%.`;
}

function summarizeTrendRead(predictor) {
  const trends = predictor?.trends && typeof predictor.trends === 'object' ? predictor.trends : null;
  if (!trends) return 'I did not use trend analysis here.';
  const summary = ['41', '42', '43', '44']
    .map((value) => {
      const trend = trends[value];
      if (!trend) return null;
      const direction = String(trend.direction || 'stable');
      const trust = Math.round(Number(trend.trustScore || 0) * 100);
      return `${value}=${direction}/${trust}`;
    })
    .filter(Boolean)
    .join(', ');
  return `Trend check: ${summary}.`;
}

function buildCompactTrendSummary(predictor) {
  const trends = predictor?.trends && typeof predictor.trends === 'object' ? predictor.trends : null;
  if (!trends) return '';
  return ['41', '42', '43', '44']
    .map((value) => {
      const trend = trends[value];
      if (!trend) return null;
      const direction = String(trend.direction || 'stable');
      const trust = Math.round(Number(trend.trustScore || 0) * 100);
      return `${value}:${direction}/${trust}`;
    })
    .filter(Boolean)
    .join(', ');
}

function inferLikelyVisibleRoll(profile, predictor, relic, scenario, previousLine) {
  const history = Array.isArray(profile?.history)
    ? profile.history.filter((value) => /^4[1-4]$/.test(String(value || '')))
    : [];
  const localHistory = history.slice(-10);
  const trustedPair = Array.isArray(predictor?.trustedPair) ? predictor.trustedPair.filter(Boolean) : [];
  const commons = Array.isArray(profile?.commons) ? profile.commons.filter(Boolean) : [];
  const noise = new Set(Array.isArray(profile?.noise) ? profile.noise.filter(Boolean) : []);
  const dominantRoll = String(profile?.dominantRoll || '');
  const trends = predictor?.trends && typeof predictor.trends === 'object' ? predictor.trends : {};
  const analyzerPrediction = String(predictor?.analyzerPrediction || '');
  const analyzerAlt = String(predictor?.analyzerAlt || '');
  const pairScoreGap = Math.max(0, Number(predictor?.pairScoreGap || 0));
  const pairSafety = String(predictor?.pairSafety || '');
  const regime = String(predictor?.regime || '');
  const freshOutsider = predictor?.freshOutsider && typeof predictor.freshOutsider === 'object'
    ? predictor.freshOutsider
    : null;
  const pairMatrix = predictor?.pairMatrix && typeof predictor.pairMatrix === 'object'
    ? predictor.pairMatrix
    : {};
  const pairMatrix2gram = predictor?.pairMatrix2gram && typeof predictor.pairMatrix2gram === 'object'
    ? predictor.pairMatrix2gram
    : {};
  const predictorLastRoll = String(predictor?.lastRoll || '');
  const predictorLast2Rolls = String(predictor?.last2Rolls || '');
  const recent4 = history.slice(-4);
  const recent8 = history.slice(-8);
  const recentBoundary = recent8.filter((value) => value === '42' || value === '44');
  const lastObserved = history[history.length - 1] || '';
  const previousObserved = history[history.length - 2] || '';
  const pairTransitionCounts = {};
  const tripleTransitionCounts = {};
  for (let index = 0; index < localHistory.length - 1; index += 1) {
    const from = localHistory[index];
    const to = localHistory[index + 1];
    if (!pairTransitionCounts[from]) pairTransitionCounts[from] = {};
    pairTransitionCounts[from][to] = (pairTransitionCounts[from][to] || 0) + 1;
  }
  for (let index = 0; index < localHistory.length - 2; index += 1) {
    const key = `${localHistory[index]}|${localHistory[index + 1]}`;
    const to = localHistory[index + 2];
    if (!tripleTransitionCounts[key]) tripleTransitionCounts[key] = {};
    tripleTransitionCounts[key][to] = (tripleTransitionCounts[key][to] || 0) + 1;
  }
  let tailStreak = 0;
  if (lastObserved) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (history[index] !== lastObserved) break;
      tailStreak += 1;
    }
  }
  let boundaryAlternations = 0;
  let boundaryRepeats = 0;
  for (let index = 1; index < recentBoundary.length; index += 1) {
    if (recentBoundary[index] === recentBoundary[index - 1]) boundaryRepeats += 1;
    else boundaryAlternations += 1;
  }
  const boundaryAmbiguous = recentBoundary.length >= 4 && boundaryAlternations >= boundaryRepeats && boundaryAlternations >= 2;
  const boundaryPairTrusted = trustedPair.includes('42') && trustedPair.includes('44');
  const boundaryWindowActive = boundaryPairTrusted || commons.includes('42') || commons.includes('44');
  const candidatePool = [...new Set([
    ...trustedPair,
    ...commons,
    '41',
    '42',
    '43',
    '44',
  ].filter((value) => /^4[1-4]$/.test(String(value || ''))))];

  let bestRoll = candidatePool[0] || '44';
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;
  const candidateScored = [];
  candidatePool.forEach((candidateRoll) => {
    let score = 0;
    if (trustedPair.includes(candidateRoll)) score += 8;
    if (commons.includes(candidateRoll)) score += 5;
    if (candidateRoll === dominantRoll) score += 2;
    if (noise.has(candidateRoll)) score -= 6;
    if (lastObserved && candidateRoll === lastObserved) score += 2 + Math.min(10, tailStreak * 3.2);
    const recent4Hits = recent4.filter((value) => value === candidateRoll).length;
    const recent8Hits = recent8.filter((value) => value === candidateRoll).length;
    score += recent4Hits * 2.75;
    score += Math.max(0, recent8Hits - recent4Hits) * 0.9;
    if (lastObserved && pairTransitionCounts[lastObserved]?.[candidateRoll]) {
      score += pairTransitionCounts[lastObserved][candidateRoll] * 5.5;
    }
    if (previousObserved && lastObserved) {
      const key = `${previousObserved}|${lastObserved}`;
      if (tripleTransitionCounts[key]?.[candidateRoll]) {
        score += tripleTransitionCounts[key][candidateRoll] * 8.5;
      }
    }
    const matrix1 = Number(pairMatrix?.[predictorLastRoll || lastObserved]?.[candidateRoll]?.pct || 0);
    const matrix2 = Number(pairMatrix2gram?.[predictorLast2Rolls || `${previousObserved}${lastObserved}`]?.[candidateRoll]?.pct || 0);
    const matrix1Reliable = Boolean(pairMatrix?.[predictorLastRoll || lastObserved]?.[candidateRoll]?.reliable);
    const matrix2Reliable = Boolean(pairMatrix2gram?.[predictorLast2Rolls || `${previousObserved}${lastObserved}`]?.[candidateRoll]?.reliable);
    score += matrix1 * 0.22;
    score += matrix2 * 0.36;
    if (matrix1Reliable) score += 2.5;
    if (matrix2Reliable) score += 4.5;
    if (candidateRoll === analyzerPrediction) {
      score += 8 + Math.min(10, pairScoreGap * 0.22);
    }
    if (candidateRoll === analyzerAlt) {
      score += 2.5;
    }
    if (freshOutsider?.value === candidateRoll) {
      score += (
        (freshOutsider.recent2Hits >= 1 ? 6 : 0)
        + (freshOutsider.recent4Hits >= 2 ? 5 : freshOutsider.recent4Hits >= 1 ? 2.5 : 0)
        + (String(freshOutsider.direction || '') === 'rising' ? 4 : 0)
      );
    }
    if (pairSafety === 'safe' && trustedPair.includes(candidateRoll)) score += 4;
    if (pairSafety === 'danger' && !trustedPair.includes(candidateRoll) && candidateRoll !== analyzerPrediction) score -= 3.5;
    if (predictor?.mixedWindow && candidateRoll === analyzerAlt) score += 2;
    if ((regime === 'transition' || regime === 'noise-burst') && candidateRoll === analyzerPrediction) score += 3;
    if (boundaryWindowActive && (candidateRoll === '42' || candidateRoll === '44')) {
      if (boundaryAmbiguous) {
        if (candidateRoll === analyzerAlt) score += 1.75;
        if (candidateRoll === analyzerPrediction && pairScoreGap <= 12) score -= 2.5;
        if (candidateRoll === lastObserved && pairSafety === 'danger') score -= 1.5;
      } else if (tailStreak >= 4 && candidateRoll === lastObserved && pairSafety !== 'danger') {
        score += 3;
      }
      if (candidateRoll === lastObserved && tailStreak <= 2 && pairSafety === 'danger') score -= 1.5;
    }
    const trend = trends[candidateRoll];
    if (trend) {
      const trust = Math.round(Number(trend.trustScore || 0) * 100) / 100;
      if (String(trend.direction || '') === 'rising') score += 1.5 + (trust * 0.75);
      else if (String(trend.direction || '') === 'falling') score -= 1.25 + (trust * 0.35);
      else score += trust * 0.45;
    }
    if (scenario?.success?.type === 'monoLine') {
      const monoReachability = getMonoReachabilityForVisibleRoll(relic, scenario, candidateRoll, previousLine);
      if (monoReachability?.defaultHitsTarget) score += 0.9;
      if (Array.isArray(monoReachability?.forceHitsTarget) && monoReachability.forceHitsTarget.length > 0) score += 0.45;
      if (!monoReachability?.reachable) score -= 0.8;
    }
    candidateScored.push({ roll: candidateRoll, score });
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestRoll = candidateRoll;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  });
  return {
    visibleRoll: bestRoll,
    score: bestScore,
    candidates: candidatePool,
    confidenceGap: (() => {
      const rawGap = Number.isFinite(secondBestScore) ? Math.max(0, bestScore - secondBestScore) : bestScore;
      const topTwo = candidateScored.sort((left, right) => right.score - left.score).slice(0, 2).map((entry) => entry.roll);
      if (boundaryAmbiguous && topTwo.includes('42') && topTwo.includes('44')) {
        return rawGap * 0.3;
      }
      if (pairSafety === 'danger') return rawGap * 0.65;
      return rawGap;
    })(),
    ranked: candidateScored.sort((left, right) => right.score - left.score),
  };
}

function summarizeChoice(defaultStat, defaultScore, forcedStat, forcedScore, shouldForce, forceLine, config, scenario) {
  const searchNote = config.searchDepth > 0
    ? `I also searched ${config.searchDepth} move${config.searchDepth > 1 ? 's' : ''} ahead before picking.`
    : 'I judged the move from the immediate board state only.';
  return `I compared staying on the current line into ${defaultStat || 'unknown'} [${formatScenarioTierLabel(defaultStat, scenario)}] (${defaultScore.toFixed(2)}) against forcing line ${forceLine} into ${forcedStat || 'unknown'} [${formatScenarioTierLabel(forcedStat, scenario)}] (${forcedScore.toFixed(2)}). ${searchNote} I chose ${shouldForce ? `the forced route because it projected the stronger outcome` : `the default route because it projected the stronger outcome`}.`;
}

function getDesiredCarryLinesForScenario(scenario) {
  const targetRelic = scenario?.targetRelic && typeof scenario.targetRelic === 'object' ? scenario.targetRelic : {};
  const slots = [
    { slot: 1, stat: targetRelic?.lines?.[0] || '' },
    { slot: 2, stat: targetRelic?.lines?.[1] || '' },
    { slot: 3, stat: targetRelic?.lines?.[2] || '' },
    { slot: 4, stat: targetRelic?.fourthLine || '' },
  ];
  const requiredStats = getRequiredStatsForScenario(scenario?.success || {});
  const requiredSlots = slots.filter((entry) => requiredStats.includes(String(entry.stat || ''))).map((entry) => entry.slot);
  if (requiredSlots.length > 0) return requiredSlots;
  const sSlots = slots.filter((entry) => getScenarioStatTier(entry.stat, scenario) === 'S').map((entry) => entry.slot);
  if (sSlots.length > 0) return sSlots;
  return [1, 2, 3, 4];
}

function getMonoTargetSlotForRelic(relic, scenario) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  if (success.type !== 'monoLine') return null;
  const targetStat = String(success.target || '');
  if (!targetStat) return null;
  const lines = [...(Array.isArray(relic?.lines) ? relic.lines : []), relic?.fourthLine].filter(Boolean);
  return lines.find((line) => String(line?.stat || '') === targetStat)?.slot || null;
}

function getRelicStatBySlot(relic, slot) {
  const lines = [...(Array.isArray(relic?.lines) ? relic.lines : []), relic?.fourthLine].filter(Boolean);
  return lines.find((line) => Number(line?.slot || 0) === Number(slot || 0))?.stat || '';
}

function getVisibleRollLineHelper(visibleRoll) {
  const normalizedRoll = String(visibleRoll || '');
  if (!/^4[1-4]$/.test(normalizedRoll)) return [];
  const entries = [];
  for (let previousLine = 1; previousLine <= 4; previousLine += 1) {
    const resolution = resolveNextSlotFromVisibleRoll(previousLine, normalizedRoll);
    if (resolution?.targetSlot) {
      entries.push({
        previousLine,
        targetSlot: resolution.targetSlot,
        rawPair: resolution.rawPair,
      });
    }
  }
  return entries;
}

function summarizeVisibleRollLineHelper(visibleRoll) {
  const entries = getVisibleRollLineHelper(visibleRoll);
  if (!entries.length) return `Line helper had no valid mapping for visible roll ${String(visibleRoll || 'unknown')}.`;
  const summary = entries
    .map((entry) => `L${entry.targetSlot}<=${entry.rawPair}`)
    .join(', ');
  return `Line helper for ${visibleRoll}: ${summary}.`;
}

function summarizeForceCandidateOptions(options = [], scenario) {
  if (!Array.isArray(options) || !options.length) {
    return 'I had no usable force-line options on this move.';
  }
  const summary = options
    .map((option) => (
      `F${option.forceLine}->${option.forcedStat || 'unknown'} `
      + `[${formatScenarioTierLabel(option.forcedStat, scenario)}] `
      + `via ${option.forcedResolution?.rawPair || '--'} `
      + `(${Number(option.forcedChoiceScore || 0).toFixed(2)})`
    ))
    .join(' | ');
  return `I compared these force-line routes: ${summary}.`;
}

function summarizeChosenForceRoute(option, visibleRoll, scenario) {
  if (!option?.forcedResolution?.rawPair) return '';
  const tierLabel = formatScenarioTierLabel(option.forcedStat, scenario);
  return `For visible roll ${visibleRoll}, I forced line ${option.forceLine}. That creates raw pair ${option.forcedResolution.rawPair}, which lands on slot ${option.forcedResolution.targetSlot} for ${option.forcedStat || 'unknown'} [${tierLabel}].`;
}

function getCarryLinesThatResolveToTargetSlot(visibleRoll, targetSlot) {
  const normalizedTargetSlot = Math.max(1, Math.min(4, Number(targetSlot || 0) || 0));
  if (normalizedTargetSlot <= 0) return [];
  return getVisibleRollLineHelper(visibleRoll)
    .filter((entry) => entry.targetSlot === normalizedTargetSlot)
    .map((entry) => entry.previousLine);
}

function getBotForceLineCandidates(relic, scenario, visibleRoll = '') {
  if (!relic?.hasFourthLine) return [];
  const configuredForceLine = Math.min(
    Math.max(2, (Math.max(1, Math.min(3, Number(scenario?.forceRelic?.baseLines || 0) || 0)) + 1)),
    4
  );
  const monoTargetSlot = getMonoTargetSlotForRelic(relic, scenario);
  const candidates = [];
  if (Number.isInteger(monoTargetSlot)) {
    const helperCarryLines = getCarryLinesThatResolveToTargetSlot(visibleRoll, monoTargetSlot);
    candidates.push(...helperCarryLines);
  }
  candidates.push(configuredForceLine);
  if (scenario?.success?.type === 'monoLine') {
    candidates.push(2, 3, 4);
  }
  return [...new Set(candidates.filter((line) => Number.isInteger(line) && line >= 2 && line <= 4))];
}

function getMonoNextStepPositionScore(candidateRelic, nextProfile, scenario) {
  const targetSlot = getMonoTargetSlotForRelic(candidateRelic, scenario);
  if (!targetSlot || !nextProfile) return 0;
  const nextSequenceIndex = Array.isArray(nextProfile?.history) ? nextProfile.history.length : 0;
  const nextVisibleRoll = getVisibleRollForUpgrade(nextProfile, nextSequenceIndex);
  const carryLine = Number(candidateRelic?.lastLine || 0);
  const defaultNextResolution = carryLine > 0 ? resolveNextSlotFromVisibleRoll(carryLine, nextVisibleRoll) : null;
  if (defaultNextResolution?.targetSlot === targetSlot) return 16;

  const monoForceCandidates = getBotForceLineCandidates(candidateRelic, scenario, nextVisibleRoll);
  const canForceIntoTarget = monoForceCandidates.some((forceLine) => {
    const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, nextVisibleRoll);
    return forcedResolution?.targetSlot === targetSlot;
  });
  if (canForceIntoTarget) return 8;

  const targetCarryLines = getCarryLinesThatResolveToTargetSlot(nextVisibleRoll, targetSlot);
  if (targetCarryLines.length > 0 && targetCarryLines.includes(carryLine)) return 5;

  return -10;
}

function getMonoReachabilityForVisibleRoll(relic, scenario, visibleRoll, previousLine) {
  const targetSlot = getMonoTargetSlotForRelic(relic, scenario);
  if (!targetSlot) {
    return {
      targetSlot: null,
      defaultHitsTarget: false,
      forceHitsTarget: [],
      reachable: false,
    };
  }
  const defaultResolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
  const defaultHitsTarget = Number(defaultResolution?.targetSlot || 0) === Number(targetSlot);
  const forceHitsTarget = getBotForceLineCandidates(relic, scenario, visibleRoll)
    .map((forceLine) => ({
      forceLine,
      resolution: resolveNextSlotFromVisibleRoll(forceLine, visibleRoll),
    }))
    .filter((entry) => Number(entry?.resolution?.targetSlot || 0) === Number(targetSlot));
  return {
    targetSlot,
    defaultHitsTarget,
    forceHitsTarget,
    reachable: defaultHitsTarget || forceHitsTarget.length > 0,
  };
}

function evaluateBuilderReadVerdict(scenario, profile, carryLine, config, sessionEntriesCount = 0) {
  const predictor = config?.pairAware
    ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
    : null;
  const trustedResolved = Array.isArray(predictor?.trustedPair) && predictor.trustedPair.length >= 2;
  const pairSafety = String(predictor?.pairSafety || 'unknown');
  const noisePressure = Number(profile?.noisePressure || 0);
  const commonsCount = Array.isArray(profile?.commons) ? profile.commons.length : 0;
  const noiseCount = Array.isArray(profile?.noise) ? profile.noise.length : 0;
  const noiseDominates = noisePressure >= 4 || noiseCount > commonsCount;
  const desiredCarryLines = (() => {
    const monoTargetSlot = getMonoTargetSlotForRelic(scenario?.targetRelic ? {
      lines: Array.isArray(scenario.targetRelic.lines)
        ? scenario.targetRelic.lines.map((stat, index) => ({ slot: index + 1, stat }))
        : [],
      fourthLine: scenario.targetRelic?.fourthLine ? { slot: 4, stat: scenario.targetRelic.fourthLine } : null,
    } : null, scenario);
    if (monoTargetSlot) {
      if (!config?.fairMode) {
        const nextSequenceIndex = Array.isArray(profile?.history) ? profile.history.length : 0;
        const nextVisibleRoll = getVisibleRollForUpgrade(profile, nextSequenceIndex);
        const nextCarryTargets = getCarryLinesThatResolveToTargetSlot(nextVisibleRoll, monoTargetSlot);
        if (nextCarryTargets.length > 0) return nextCarryTargets;
      } else {
        return [monoTargetSlot];
      }
    }
    return getDesiredCarryLinesForScenario(scenario);
  })();
  const carryLineGood = desiredCarryLines.includes(Number(carryLine || 0));
  const minEntries = Math.max(1, Number(scenario?.minSessionEntries || 5) || 5);
  const confidenceScore = [trustedResolved, pairSafety !== 'danger', !noiseDominates].filter(Boolean).length;
  const shouldCommit = sessionEntriesCount >= minEntries && trustedResolved && pairSafety !== 'danger' && !noiseDominates;
  const shouldAbort = sessionEntriesCount >= minEntries && !trustedResolved && noiseDominates;
  const shouldKeepBuilding = !shouldCommit && !shouldAbort;
  return {
    predictor,
    trustedResolved,
    pairSafety,
    noiseDominates,
    carryLineGood,
    desiredCarryLines,
    confidenceScore,
    shouldCommit,
    shouldAbort,
    shouldKeepBuilding,
    summary: `Builder verdict: trusted=${trustedResolved ? 'yes' : 'no'}, safety=${pairSafety}, noiseDominates=${noiseDominates ? 'yes' : 'no'}, carryLine=${carryLine || '-'}${carryLineGood ? ' (good)' : ` (want ${desiredCarryLines.join('/')})`}.`,
  };
}

function getGoalViabilityAssessment(candidateBreakdown, stat, scenario) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const goalProgress = getScenarioGoalProgress(scenario, candidateBreakdown);
  const statPriority = getScenarioStatPriority(stat, scenario);
  const statTier = getScenarioStatTier(stat, scenario);
  let goalViabilityScore = 0;
  let goalBlocking = false;

  if (statPriority === 'REQUIRED') goalViabilityScore += 26;
  if (goalProgress.requiredCoverage > 0) goalViabilityScore += goalProgress.requiredCoverage * 12;
  if (goalProgress.requiredHitTotal > 0) goalViabilityScore += goalProgress.requiredHitTotal * 10;
  goalViabilityScore -= goalProgress.missingRequiredCount * 18;
  goalViabilityScore -= goalProgress.missingGoalHits * 16;
  goalViabilityScore -= goalProgress.junkHitCount * 10;
  if (goalProgress.goalSatisfied) goalViabilityScore += 28;

  if (success.type === 'monoLine') {
    const target = String(success.target || '');
    const minHits = Math.max(1, Number(success?.minHits || 1) || 1);
    const targetHits = Math.max(0, Number(candidateBreakdown?.[target] || 0));
    if (String(stat || '') === target) {
      goalViabilityScore += 18 + (targetHits * 6);
    } else if (targetHits < minHits) {
      goalViabilityScore -= 22 + ((minHits - targetHits) * 8);
      goalBlocking = true;
    }
  }

  if (!goalProgress.goalSatisfied && (statTier === 'TRASH' || statTier === 'NEUTRAL') && statPriority !== 'REQUIRED') {
    goalViabilityScore -= statTier === 'TRASH' ? 22 : 12;
    goalBlocking = true;
  }

  if (!goalProgress.goalSatisfied && goalProgress.missingGoalHits > 0 && statPriority !== 'REQUIRED' && goalProgress.junkHitCount > 0) {
    goalBlocking = true;
  }

  return {
    goalViabilityScore,
    goalBlocking,
    goalProgress,
  };
}

function applyBotUpgradeToSlot(relic, targetSlot, rawPair, visibleRoll) {
  const updatedLines = [...relic.lines, relic.fourthLine].map((line) => (
    line.slot === targetSlot ? applyUpgradeRoll(line) : { ...line, justHit: false }
  ));
  return {
    ...relic,
    level: Math.min(15, relic.level + 3),
    lastLine: targetSlot,
    lastRawPair: rawPair,
    lastVisibleRoll: visibleRoll,
    lines: updatedLines.slice(0, 3),
    fourthLine: updatedLines[3],
  };
}

function getActionCandidateScore(candidateRelic, stat, scenario, profile, config, usedForce, predictor) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const relicScore = scoreRelicWithProfile(candidateRelic, detectRelicScoreProfile(candidateRelic));
  const candidateBreakdown = [...candidateRelic.lines, candidateRelic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = Math.max(0, Number(line.hits || 0));
    return acc;
  }, {});
  const goalAssessment = getGoalViabilityAssessment(candidateBreakdown, stat, scenario);
  const goalProgress = goalAssessment.goalProgress;
  const isHelpful = isHelpfulStatForScenario(stat, success);
  const junkStats = Array.isArray(success?.junk) ? success.junk : [];
  const isJunk = junkStats.includes(stat);
  const isNeutral = isNeutralStatForScenario(stat, success);
  const statTier = getScenarioStatTier(stat, scenario);
  const statPriority = getScenarioStatPriority(stat, scenario);
  let qualityScore = relicScore.score * Number(config.scoreWeight || 1);

  if (isHelpful) qualityScore += config.helpfulBonus || 8;
  if (isJunk) qualityScore -= config.junkPenalty || 6;
  if (isNeutral) qualityScore -= config.neutralPenalty || 0;
  if (statPriority === 'REQUIRED') qualityScore += (config.helpfulBonus || 8) * 1.2;
  if (statTier === 'S') qualityScore += (config.helpfulBonus || 8) * 1.0;
  if (statTier === 'A') qualityScore += (config.helpfulBonus || 8) * 0.35;
  if (statTier === 'TRASH') qualityScore -= (config.junkPenalty || 6) * 1.35;
  if (statTier === 'NEUTRAL') qualityScore -= (config.neutralPenalty || 0) * 0.75;

  if (config.strictGoal) {
    const monoLineTarget = success.type === 'monoLine' ? String(success.target || '') : '';
    const monoLineMinHits = Math.max(1, Number(success?.minHits || 1) || 1);
    if (statPriority === 'REQUIRED') qualityScore += 12;
    if (statTier === 'S' && statPriority !== 'REQUIRED') qualityScore += 4;
    if (statTier === 'A') qualityScore += 2;
    if (statTier === 'NEUTRAL') qualityScore -= 7;
    if (statTier === 'TRASH') qualityScore -= 18;
    if (statPriority !== 'REQUIRED' && goalProgress.missingGoalHits > 0) {
      qualityScore -= goalProgress.missingGoalHits * ((config.junkPenalty || 6) * 0.9);
    }
    if (success.type === 'monoLine' && monoLineTarget) {
      const targetHits = Math.max(0, Number(candidateBreakdown?.[monoLineTarget] || 0));
      if (String(stat || '') === monoLineTarget) {
        qualityScore += 16 + (targetHits * 6);
      } else if (targetHits < monoLineMinHits) {
        qualityScore -= 14 + ((monoLineMinHits - targetHits) * 5);
      }
    }
  }

  if (config.scoreBias) {
    if (usedForce && isHelpful) qualityScore += config.forceBonus || 3;
    if (usedForce && isJunk) qualityScore -= Math.max(1, (config.forceBonus || 3) - 1);
    if (usedForce && isNeutral) qualityScore -= 0.5;
    if (usedForce && statPriority === 'REQUIRED') qualityScore += 4;
    if (usedForce && statTier === 'S') qualityScore += 1.5;
    if (usedForce && statTier === 'TRASH') qualityScore -= 1.5;
  }

  if (config.trendAware) {
    const commons = Array.isArray(profile?.commons) ? profile.commons : [];
    const noise = Array.isArray(profile?.noise) ? profile.noise : [];
    const dominantRoll = String(profile?.dominantRoll || '');
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    if (commons.includes(visibleRoll)) qualityScore += config.commonsBonus || 1.5;
    if (noise.includes(visibleRoll)) qualityScore -= config.noisePenalty || 1.25;
    if (dominantRoll === visibleRoll) qualityScore += config.dominantBonus || 1;
    if (Number(profile?.noisePressure || 0) > 3 && !usedForce) qualityScore -= (config.noisePenalty || 1.25) * 0.75;
  }

  if (config.historyAware) {
    const history = Array.isArray(profile?.history) ? profile.history.slice(-6) : [];
    const recentMatches = history.filter((roll) => String(roll) === String(candidateRelic.lastVisibleRoll || '')).length;
    const uniqueCount = new Set(history).size;
    qualityScore += recentMatches * 0.45;
    if (uniqueCount <= 2 && isHelpful) qualityScore += 1.25;
    if (uniqueCount >= 4 && isJunk) qualityScore -= 1.1;
  }

  if (config.pairAware) {
    const commons = Array.isArray(profile?.commons) ? profile.commons : [];
    const noise = Array.isArray(profile?.noise) ? profile.noise : [];
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    const currentLine = Number(candidateRelic.lastLine || 0);
    if (commons.includes(visibleRoll) && currentLine > 0) qualityScore += 0.5;
    if (noise.includes(visibleRoll) && currentLine > 0 && isJunk) qualityScore -= 1.5;
  }

  if (predictor && config.pairAware) {
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    const trustedPair = Array.isArray(predictor?.trustedPair) ? predictor.trustedPair : [];
    const noiseValues = Array.isArray(predictor?.noise) ? predictor.noise : [];
    const noiseRisk = Number(predictor?.noiseRisk || 0);
    const pairSafety = String(predictor?.pairSafety || '');
    if (trustedPair.includes(visibleRoll)) qualityScore += 2.5;
    if (noiseValues.includes(visibleRoll)) qualityScore -= 2;
    if (noiseRisk >= 60 && !usedForce) qualityScore -= 1.5;
    if (pairSafety === 'safe' && trustedPair.includes(visibleRoll)) qualityScore += 1;
    if (pairSafety === 'danger' && noiseValues.includes(visibleRoll)) qualityScore -= 1.25;
    if (config.strictGoal && noiseRisk >= 60 && (statTier === 'NEUTRAL' || statTier === 'TRASH')) qualityScore -= 7;
    if (config.strictGoal && noiseRisk >= 60 && statPriority !== 'REQUIRED') qualityScore -= 4;
    if (config.strictGoal && pairSafety === 'danger' && statTier !== 'S') qualityScore -= 5;
    if (config.strictGoal && pairSafety === 'danger' && statPriority !== 'REQUIRED') qualityScore -= 5;
    if (config.strictGoal && pairSafety === 'caution' && statPriority !== 'REQUIRED' && statTier === 'NEUTRAL') qualityScore -= 2.5;
    if (config.strictGoal && pairSafety === 'danger' && noiseRisk >= 60 && statPriority !== 'REQUIRED') qualityScore -= 9;
    if (config.strictGoal && pairSafety === 'safe' && statPriority === 'REQUIRED' && trustedPair.includes(visibleRoll)) qualityScore += 5;
    if (config.strictGoal && pairSafety === 'caution' && statPriority === 'REQUIRED' && trustedPair.includes(visibleRoll)) qualityScore += 2.5;
  }

  let totalScore = goalAssessment.goalViabilityScore + qualityScore;
  if (config.strictGoal && goalAssessment.goalBlocking) {
    totalScore = Math.min(totalScore, goalAssessment.goalViabilityScore + Math.min(qualityScore, 8));
  }

  return {
    totalScore,
    goalViabilityScore: goalAssessment.goalViabilityScore,
    qualityScore,
    goalBlocking: goalAssessment.goalBlocking,
    goalProgress,
    statPriority,
    statTier,
  };
}

function evaluateBotRelicState(relic, scenario, profile, config) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const requiredStats = getRequiredStatsForScenario(success);
  const statBreakdown = [...relic.lines, relic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = Number(line.hits || 0);
    return acc;
  }, {});
  const goalProgress = getScenarioGoalProgress(scenario, statBreakdown);
  const helpfulHits = goalProgress.requiredHitTotal;
  const junkHits = goalProgress.junkHitCount;
  const requiredCoverage = goalProgress.requiredCoverage;
  const neutralHits = Object.entries(statBreakdown).reduce((sum, [stat, count]) => (
    isNeutralStatForScenario(stat, success) ? sum + Math.max(0, Number(count || 0)) : sum
  ), 0);
  const sHits = Object.entries(statBreakdown).reduce((sum, [stat, count]) => (
    getScenarioStatTier(stat, scenario) === 'S' ? sum + Math.max(0, Number(count || 0)) : sum
  ), 0);
  const requiredSHits = requiredStats.reduce((sum, stat) => (
    getScenarioStatTier(stat, scenario) === 'S' ? sum + Math.max(0, Number(statBreakdown?.[stat] || 0)) : sum
  ), 0);
  const nonRequiredSHits = Math.max(0, sHits - requiredSHits);
  const aHits = Object.entries(statBreakdown).reduce((sum, [stat, count]) => (
    getScenarioStatTier(stat, scenario) === 'A' ? sum + Math.max(0, Number(count || 0)) : sum
  ), 0);
  const trashHits = Object.entries(statBreakdown).reduce((sum, [stat, count]) => (
    getScenarioStatTier(stat, scenario) === 'TRASH' ? sum + Math.max(0, Number(count || 0)) : sum
  ), 0);
  const relicScore = scoreRelicWithProfile(relic, detectRelicScoreProfile(relic));
  const effectiveScore = relicScore.score - (junkHits * MISTAKE_SCORE_PENALTY);
  let total = relicScore.score * Number(config.scoreWeight || 1)
    + helpfulHits * (config.helpfulBonus || 8)
    - junkHits * (config.junkPenalty || 6)
    - neutralHits * (config.neutralPenalty || 0);
  total += requiredSHits * ((config.helpfulBonus || 8) * 1.35);
  total += nonRequiredSHits * ((config.helpfulBonus || 8) * 0.35);
  total += aHits * ((config.helpfulBonus || 8) * 0.35);
  total -= trashHits * ((config.junkPenalty || 6) * 0.9);
  if (requiredCoverage > 0) total += requiredCoverage * ((config.helpfulBonus || 8) * 1.35);
  if (requiredCoverage === requiredStats.length && requiredStats.length > 1) total += config.forceBonus || 3;
  total -= goalProgress.missingRequiredCount * ((config.junkPenalty || 6) * 2.1);
  total -= goalProgress.missingGoalHits * ((config.junkPenalty || 6) * 1.65);
  if (goalProgress.goalSatisfied) total += 24;
  if (config.strictGoal && requiredStats.length > 0 && requiredCoverage === 0) total -= 16;
  if (config.strictGoal && !goalProgress.goalSatisfied) total -= 10;
  if (config.strictGoal && success.type === 'monoLine') {
    const minHits = Math.max(1, Number(success?.minHits || 1) || 1);
    if (helpfulHits < minHits) total -= (minHits - helpfulHits) * 12;
  }
  if (config.trendAware) {
    const commons = Array.isArray(profile?.commons) ? profile.commons : [];
    const dominantRoll = String(profile?.dominantRoll || '');
    if (commons.includes(String(relic.lastVisibleRoll || ''))) total += config.commonsBonus || 1.5;
    if (dominantRoll === String(relic.lastVisibleRoll || '')) total += config.dominantBonus || 1;
  }
  return {
    total,
    statBreakdown,
    helpfulHits,
    junkHits,
    goalProgress,
    effectiveScore,
    relicScore,
  };
}

function decideForceRoute({
  defaultEval,
  forcedEval,
  defaultStat,
  forcedStat,
  predictor,
  scenario,
  config,
  currentGoalSatisfied,
}) {
  const defaultPriority = defaultEval?.statPriority || getScenarioStatPriority(defaultStat, scenario);
  const forcedPriority = forcedEval?.statPriority || getScenarioStatPriority(forcedStat, scenario);
  const defaultTier = defaultEval?.statTier || getScenarioStatTier(defaultStat, scenario);
  const forcedTier = forcedEval?.statTier || getScenarioStatTier(forcedStat, scenario);
  const pairSafety = String(predictor?.pairSafety || '');
  const noiseRisk = Number(predictor?.noiseRisk || 0);
  const gapRequired = Math.max(0, Number(config?.forceGap || 0) || 0)
    + (pairSafety === 'danger' ? 4 : pairSafety === 'caution' ? 2 : 0)
    + (noiseRisk >= 60 ? 2 : 0);
  const scoreGap = Number(forcedEval?.totalScore || 0) - Number(defaultEval?.totalScore || 0);
  const goalStillOpen = !currentGoalSatisfied;

  if (goalStillOpen && defaultPriority === 'REQUIRED' && forcedPriority !== 'REQUIRED') {
    return { shouldForce: false, reason: 'default lands on a required goal stat, so forcing is blocked.' };
  }

  if (goalStillOpen && forcedPriority === 'REQUIRED' && defaultPriority !== 'REQUIRED' && !forcedEval?.goalBlocking) {
    return { shouldForce: true, reason: 'forced path lands on the required goal stat while default does not.' };
  }

  if (goalStillOpen && (forcedTier === 'TRASH' || forcedTier === 'NEUTRAL') && defaultPriority !== 'TRASH') {
    return { shouldForce: false, reason: 'forced path lands on a non-goal stat while the contract is still unmet.' };
  }

  if (goalStillOpen && forcedEval?.goalBlocking && !defaultEval?.goalBlocking) {
    return { shouldForce: false, reason: 'forced path is goal-blocking while default still preserves the contract path.' };
  }

  if (goalStillOpen && !forcedEval?.goalBlocking && defaultEval?.goalBlocking) {
    return { shouldForce: true, reason: 'default path is goal-blocking while forced keeps the contract alive.' };
  }

  if (scoreGap > gapRequired) {
    return { shouldForce: true, reason: `forced path projected a meaningful edge (+${scoreGap.toFixed(2)}) over default.` };
  }

  return { shouldForce: false, reason: `forced path did not clear the required decision gap (+${scoreGap.toFixed(2)} vs ${gapRequired.toFixed(2)}).` };
}

function searchBestBotFuture(relic, profile, carryLine, scenario, config, depth) {
  const snapshot = evaluateBotRelicState(relic, scenario, profile, config);
  if (depth <= 0 || relic.level >= 15) {
    return snapshot.total;
  }

  if (!relic.hasFourthLine) {
    const activatedRelic = {
      ...relic,
      hasFourthLine: true,
      level: 3,
      lastLine: 4,
      fourthLine: activateRelicLine(relic.fourthLine),
    };
    return searchBestBotFuture(activatedRelic, profile, 4, scenario, config, depth - 1);
  }

  const nextSequenceIndex = Array.isArray(profile?.history) ? profile.history.length : 0;
  const visibleRoll = getVisibleRollForUpgrade(profile, nextSequenceIndex);
  const previousLine = carryLine || relic.lastLine || 4;
  const predictor = config.pairAware
    ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
    : null;
  const nextProfile = advancePatternProfile(profile, visibleRoll);

  const defaultResolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
  const defaultStat = getRelicStatBySlot(relic, defaultResolution.targetSlot);
  const defaultRelic = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
  const defaultImmediate = getActionCandidateScore(defaultRelic, defaultStat, scenario, profile, config, false, predictor);
  const defaultFuture = searchBestBotFuture(defaultRelic, nextProfile, defaultRelic.lastLine || null, scenario, config, depth - 1);
  const defaultMonoNextBonus = scenario?.success?.type === 'monoLine'
    ? getMonoNextStepPositionScore(defaultRelic, nextProfile, scenario)
    : 0;
  let bestScore = defaultImmediate.totalScore * 0.45 + defaultFuture * 0.55 + defaultMonoNextBonus;

  const forceLineCandidates = getBotForceLineCandidates(relic, scenario, visibleRoll);
  for (const forceLine of forceLineCandidates) {
    const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
    if (
      forcedResolution?.rawPair === defaultResolution?.rawPair
      && Number(forcedResolution?.targetSlot || 0) === Number(defaultResolution?.targetSlot || 0)
    ) {
      continue;
    }
    const forcedStat = getRelicStatBySlot(relic, forcedResolution.targetSlot);
    const forcedRelic = applyBotUpgradeToSlot(relic, forcedResolution.targetSlot, forcedResolution.rawPair, visibleRoll);
    const forcedImmediate = getActionCandidateScore(forcedRelic, forcedStat, scenario, profile, config, true, predictor);
    const forceDecision = decideForceRoute({
      defaultEval: defaultImmediate,
      forcedEval: forcedImmediate,
      defaultStat,
      forcedStat,
      predictor,
      scenario,
      config,
      currentGoalSatisfied: snapshot.goalProgress?.goalSatisfied,
    });
    if (forceDecision.shouldForce) {
      const forcedFuture = searchBestBotFuture(forcedRelic, nextProfile, forcedRelic.lastLine || null, scenario, config, depth - 1);
      const forcedMonoNextBonus = scenario?.success?.type === 'monoLine'
        ? getMonoNextStepPositionScore(forcedRelic, nextProfile, scenario)
        : 0;
      const forcedScore = forcedImmediate.totalScore * 0.45 + forcedFuture * 0.55 + forcedMonoNextBonus;
      if (forcedScore > bestScore) bestScore = forcedScore;
    }
  }

  return bestScore;
}

function shouldBotSubmitAttempt(attempt, attemptsUsed, config, retryCeiling = null, scenario = null) {
  if (!attempt) return false;
  if (config.strictGoal && !attempt.goalSatisfied) return false;
  const mistakesCount = Math.max(0, Number(attempt?.mistakes || 0));
  const effectiveScore = Math.max(0, Number(attempt?.score || 0)) - (mistakesCount * MISTAKE_SCORE_PENALTY);
  const submitMargin = Math.max(0, Number(config?.submitMargin || 0) || 0);
  const ceilingMargin = Math.max(0, Number(config?.ceilingMargin || 0) || 0);
  const maxMistakesToSubmit = Math.max(0, Number(config?.maxMistakesToSubmit ?? 1) || 0);
  const scenarioMaxJunk = typeof scenario?.success?.maxJunk === 'number'
    ? Math.max(0, Number(scenario.success.maxJunk) || 0)
    : null;
  const allowedMistakes = config?.fairMode
    ? maxMistakesToSubmit
    : scenarioMaxJunk === null
    ? maxMistakesToSubmit
    : Math.max(maxMistakesToSubmit, scenarioMaxJunk);
  const goalProgress = attempt?.goalProgress && typeof attempt.goalProgress === 'object' ? attempt.goalProgress : null;
  const perfectGoalCoverage = goalProgress ? goalProgress.missingGoalHits === 0 && goalProgress.missingRequiredCount === 0 : attempt.goalSatisfied;
  const decisionTotal = Number(attempt?.decisionTotal || 0);
  const closeToCeiling = Number.isFinite(Number(retryCeiling)) ? decisionTotal >= (Number(retryCeiling) - ceilingMargin) : false;
  if (config?.fairMode && attemptsUsed < MAX_RACE_TRIES) {
    const strongCleanGrade = new Set(['A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+']);
    if (
      attempt.goalSatisfied
      && mistakesCount <= allowedMistakes
      && (
        closeToCeiling
        || (perfectGoalCoverage && effectiveScore >= (config.minScore + Math.max(0, submitMargin - 2)))
        || (attempt.helpfulHits >= (config.minHelpful + 1) && strongCleanGrade.has(String(attempt.grade || '')))
      )
    ) return true;
    return false;
  }
  if (
    attempt.goalSatisfied
    && attempt.helpfulHits >= config.minHelpful
    && effectiveScore >= (config.minScore + submitMargin)
    && mistakesCount <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && closeToCeiling
    && mistakesCount <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && perfectGoalCoverage
    && attempt.helpfulHits >= (config.minHelpful + 1)
    && mistakesCount <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && attemptsUsed < MAX_RACE_TRIES
    && (attempt.grade === 'A' || attempt.grade === 'A+' || attempt.grade === 'S' || attempt.grade === 'S+' || attempt.grade === 'SS' || attempt.grade === 'SS+' || attempt.grade === 'SSS' || attempt.grade === 'SSS+')
    && mistakesCount <= allowedMistakes
  ) return true;
  if (attempt.goalSatisfied && (attempt.grade === 'SSS' || attempt.grade === 'SS' || attempt.grade === 'SSS+')) return true;
  if (String(config.historyAware || false) === 'true' || config.historyAware) {
    if (attempt.goalSatisfied && (attempt.grade === 'S' || attempt.grade === 'S+')) return true;
  }
  return false;
}

function compareAttemptPayload(left = {}, right = {}) {
  const leftGoal = Boolean(left?.goalSatisfied);
  const rightGoal = Boolean(right?.goalSatisfied);
  if (leftGoal !== rightGoal) return leftGoal ? 1 : -1;

  const leftMultiplier = String(left?.completionType || 'submitted') === 'timeout' ? TIMEOUT_SCORE_MULTIPLIER : 1;
  const rightMultiplier = String(right?.completionType || 'submitted') === 'timeout' ? TIMEOUT_SCORE_MULTIPLIER : 1;
  const leftScore = (Math.max(0, Number(left?.score || 0)) * leftMultiplier) - (Math.max(0, Number(left?.mistakes || 0)) * MISTAKE_SCORE_PENALTY);
  const rightScore = (Math.max(0, Number(right?.score || 0)) * rightMultiplier) - (Math.max(0, Number(right?.mistakes || 0)) * MISTAKE_SCORE_PENALTY);
  if (leftScore !== rightScore) return leftScore - rightScore;

  const leftHelpful = Math.max(0, Number(left?.helpfulHits || 0));
  const rightHelpful = Math.max(0, Number(right?.helpfulHits || 0));
  if (leftHelpful !== rightHelpful) return leftHelpful - rightHelpful;

  const leftMistakes = Math.max(0, Number(left?.mistakes || 0));
  const rightMistakes = Math.max(0, Number(right?.mistakes || 0));
  if (leftMistakes !== rightMistakes) return rightMistakes - leftMistakes;

  const leftRolls = Math.max(0, Number(left?.rollCount || 0));
  const rightRolls = Math.max(0, Number(right?.rollCount || 0));
  return leftRolls - rightRolls;
}

function buildTimeoutAttemptFromState(state = {}) {
  return {
    score: Math.max(0, Number(state?.score || 0)),
    helpfulHits: Math.max(0, Number(state?.helpfulHits || 0)),
    mistakes: Math.max(0, Number(state?.mistakes || 0)),
    rollCount: Math.max(0, Number(state?.rollCount || 0)),
    goalSatisfied: Boolean(state?.goalSatisfied),
    relicSnapshot: state?.currentRelicSnapshot || state?.bestRelicSnapshot || null,
    relicSummary: state?.currentRelicSummary || state?.relicSummary || '',
    completionType: 'timeout',
  };
}

function estimateRetryCeiling(scenario, profile, carryLine, config) {
  const freshRelic = createBotTargetRelic(scenario);
  const startLine = Number.isInteger(carryLine) ? carryLine : 4;
  return searchBestBotFuture(
    freshRelic,
    profile,
    startLine,
    scenario,
    config,
    Math.max(2, Math.min(4, Number(config?.searchDepth || 2) || 2))
  );
}

function compareStatesForWinner(hostState, guestState) {
  const hostSubmitted = String(hostState?.status || '') === 'submitted';
  const guestSubmitted = String(guestState?.status || '') === 'submitted';
  const hostBusted = String(hostState?.status || '') === 'busted';
  const guestBusted = String(guestState?.status || '') === 'busted';
  const hostTimedOut = String(hostState?.status || '') === 'timeout';
  const guestTimedOut = String(guestState?.status || '') === 'timeout';
  const hostGoal = Boolean(hostState?.finalGoalSatisfied ?? hostState?.goalSatisfied);
  const guestGoal = Boolean(guestState?.finalGoalSatisfied ?? guestState?.goalSatisfied);

  if (hostSubmitted && !guestSubmitted) return 'host';
  if (guestSubmitted && !hostSubmitted) return 'guest';
  if (hostGoal && !guestGoal) return 'host';
  if (guestGoal && !hostGoal) return 'guest';
  if (!hostGoal && !guestGoal && ((hostSubmitted || hostBusted || hostTimedOut) && (guestSubmitted || guestBusted || guestTimedOut))) {
    const timeoutComparison = compareAttemptPayload(
      hostSubmitted
        ? {
            score: hostState?.finalScore,
            helpfulHits: hostState?.finalHelpfulHits,
            mistakes: hostState?.finalMistakes,
            rollCount: hostState?.finalRollCount,
            goalSatisfied: hostState?.finalGoalSatisfied ?? hostState?.goalSatisfied,
            completionType: 'submitted',
          }
        : buildTimeoutAttemptFromState(hostState),
      guestSubmitted
        ? {
            score: guestState?.finalScore,
            helpfulHits: guestState?.finalHelpfulHits,
            mistakes: guestState?.finalMistakes,
            rollCount: guestState?.finalRollCount,
            goalSatisfied: guestState?.finalGoalSatisfied ?? guestState?.goalSatisfied,
            completionType: 'submitted',
          }
        : buildTimeoutAttemptFromState(guestState),
    );
    if (timeoutComparison > 0) return 'host';
    if (timeoutComparison < 0) return 'guest';
    return null;
  }

  if (hostSubmitted && guestSubmitted) {
    const comparison = compareAttemptPayload({
      score: hostState?.finalScore,
      helpfulHits: hostState?.finalHelpfulHits,
      mistakes: hostState?.finalMistakes,
      rollCount: hostState?.finalRollCount,
      goalSatisfied: hostState?.finalGoalSatisfied ?? hostState?.goalSatisfied,
    }, {
      score: guestState?.finalScore,
      helpfulHits: guestState?.finalHelpfulHits,
      mistakes: guestState?.finalMistakes,
      rollCount: guestState?.finalRollCount,
      goalSatisfied: guestState?.finalGoalSatisfied ?? guestState?.goalSatisfied,
    });
    if (comparison > 0) return 'host';
    if (comparison < 0) return 'guest';
    return null;
  }

  const comparison = compareAttemptPayload({
    score: hostState?.bestScore,
    helpfulHits: hostState?.bestHelpfulHits,
    mistakes: hostState?.bestMistakes,
    rollCount: hostState?.bestRollCount,
  }, {
    score: guestState?.bestScore,
    helpfulHits: guestState?.bestHelpfulHits,
    mistakes: guestState?.bestMistakes,
    rollCount: guestState?.bestRollCount,
  });
  if (comparison > 0) return 'host';
  if (comparison < 0) return 'guest';
  return null;
}

function resolveRoomOutcome(room, hostState, guestState) {
  const startedAtMs = new Date(room?.started_at || 0).getTime();
  const duelTimedOut = String(room?.status || '') === 'active'
    && Number.isFinite(startedAtMs)
    && startedAtMs > 0
    && Date.now() >= (startedAtMs + (PVP_DUEL_SECONDS * 1000));
  const hostStatus = String(hostState?.status || '');
  const guestStatus = String(guestState?.status || '');
  const hostTerminal = hostStatus === 'submitted' || hostStatus === 'busted' || hostStatus === 'timeout';
  const guestTerminal = guestStatus === 'submitted' || guestStatus === 'busted' || guestStatus === 'timeout';
  if (duelTimedOut) {
    const better = compareStatesForWinner(hostState, guestState);
    return {
      status: 'finished',
      winnerUserId: better === 'host' ? room.host_user_id : better === 'guest' ? room.guest_user_id : null,
      finishedAt: new Date().toISOString(),
      hostState: hostStatus === 'submitted' || hostStatus === 'busted'
        ? hostState
        : normalizePlayerState({
            ...hostState,
            status: 'timeout',
            finalScore: Math.max(0, Number(hostState?.score || 0)),
            finalGrade: String(hostState?.grade || 'F'),
            finalRollCount: Math.max(0, Number(hostState?.rollCount || 0)),
            finalHelpfulHits: Math.max(0, Number(hostState?.helpfulHits || 0)),
            finalMistakes: Math.max(0, Number(hostState?.mistakes || 0)),
            finalGoalSatisfied: Boolean(hostState?.goalSatisfied),
            finalStatBreakdown: hostState?.statBreakdown || {},
            finalRelicSnapshot: hostState?.currentRelicSnapshot || hostState?.bestRelicSnapshot || null,
            finalRelicSummary: hostState?.currentRelicSummary || hostState?.relicSummary || 'Timed out with a partial relic.',
          }, hostState),
      guestState: guestStatus === 'submitted' || guestStatus === 'busted'
        ? guestState
        : normalizePlayerState({
            ...guestState,
            status: 'timeout',
            finalScore: Math.max(0, Number(guestState?.score || 0)),
            finalGrade: String(guestState?.grade || 'F'),
            finalRollCount: Math.max(0, Number(guestState?.rollCount || 0)),
            finalHelpfulHits: Math.max(0, Number(guestState?.helpfulHits || 0)),
            finalMistakes: Math.max(0, Number(guestState?.mistakes || 0)),
            finalGoalSatisfied: Boolean(guestState?.goalSatisfied),
            finalStatBreakdown: guestState?.statBreakdown || {},
            finalRelicSnapshot: guestState?.currentRelicSnapshot || guestState?.bestRelicSnapshot || null,
            finalRelicSummary: guestState?.currentRelicSummary || guestState?.relicSummary || 'Timed out with a partial relic.',
          }, guestState),
    };
  }
  if (hostTerminal && guestTerminal) {
    const better = compareStatesForWinner(hostState, guestState);
    return {
      status: 'finished',
      winnerUserId: better === 'host' ? room.host_user_id : better === 'guest' ? room.guest_user_id : null,
      finishedAt: new Date().toISOString(),
    };
  }

  return null;
}

function buildBotState(room) {
  const guestUserId = String(room?.guest_user_id || '');
  if (!isDevBotUserId(guestUserId)) return null;
  if (String(room?.status || '').toLowerCase() !== 'active') return null;

  const startedAtMs = new Date(room?.started_at || 0).getTime();
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return null;

  const nowMs = Date.now();
  const realElapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const scenario = resolveRoomScenarioForRole(room, 'guest');
  const seedLabel = String(scenario.seedLabel || room.seed_label || room.code || '');
  const seedHash = hashString(seedLabel);
  const fairMode = isFairBotUserId(guestUserId);
  const config = getBotConfig(room?.tier, seedHash, { fairMode });
  const currentBotTick = Math.max(0, Number(room?.guest_state?.botTick || 0) || 0);
  const nextBotTick = currentBotTick + 1;
  const elapsedSeconds = isDevBotUserId(guestUserId)
    ? nextBotTick * config.stepSeconds
    : Math.max(realElapsedSeconds, nextBotTick * config.stepSeconds);
  const debugLog = [];
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  let remainingSeconds = elapsedSeconds;
  let attemptsUsed = 1;
  let bestAttempt = null;
  let currentProfile = createScenarioPatternProfile(scenario);
  let currentCarryLine = null;
  let currentRelic = createBotTargetRelic(scenario);
  let currentBuilderRelic = createBotBuilderRelic(scenario);
  let currentSessionEntries = [];
  let sessionArchive = [];
  let hasTakenAnyAction = false;
  let currentPhase = 'idle';

  const buildSubmittedStateFromAttempt = (chosenAttempt, summaryText) => {
    const finalAttempt = chosenAttempt || bestAttempt || null;
    const finalRelic = finalAttempt?.relicSnapshot ? cloneRelic(finalAttempt.relicSnapshot) : null;
    const finalScore = Math.max(0, Number(finalAttempt?.score || 0));
    const finalHelpfulHits = Math.max(0, Number(finalAttempt?.helpfulHits || 0));
    const finalMistakes = Math.max(0, Number(finalAttempt?.mistakes || 0));
    const finalRollCount = Math.max(0, Number(finalAttempt?.rollCount || 0));
    const finalGoalSatisfied = Boolean(finalAttempt?.goalSatisfied);
    return {
      ...createPlayerState(room.guest_name || 'Svarog Bot'),
      status: 'submitted',
      phase: 'submitted_final',
      currentLevel: Math.max(0, Number(finalRelic?.level || 15)),
      helpfulHits: finalHelpfulHits,
      hp: Math.max(0, 100 - finalHelpfulHits * 25),
      tries: attemptsUsed,
      mistakes: finalMistakes,
      score: finalScore,
      grade: String(finalAttempt?.grade || 'F'),
      rollCount: finalRollCount,
      statBreakdown: finalAttempt?.statBreakdown || {},
      goalSatisfied: finalGoalSatisfied,
      attemptsUsed,
      submittedAttempts: 1,
      sessionEntriesBuilt: currentSessionEntries.length,
      sessionEntries: currentSessionEntries,
      sessionArchive,
      botTick: nextBotTick,
      finalScore,
      finalGrade: String(finalAttempt?.grade || 'F'),
      finalRollCount,
      finalHelpfulHits,
      finalMistakes,
      finalGoalSatisfied,
      finalStatBreakdown: finalAttempt?.statBreakdown || {},
      finalRelicSnapshot: finalRelic,
      finalRelicSummary: finalAttempt?.relicSummary || summaryText,
      currentRelicSnapshot: finalRelic,
      currentRelicSummary: finalAttempt?.relicSummary || summaryText,
      bestScore: Math.max(0, Number(bestAttempt?.score || finalScore)),
      bestGrade: String(bestAttempt?.grade || finalAttempt?.grade || 'F'),
      bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || finalRollCount)),
      bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || finalHelpfulHits)),
      bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || finalMistakes)),
      bestStatBreakdown: bestAttempt?.statBreakdown || finalAttempt?.statBreakdown || {},
      bestRelicSnapshot: bestAttempt?.relicSnapshot || finalRelic,
      bestRelicSummary: bestAttempt?.relicSummary || finalAttempt?.relicSummary || summaryText,
      relicSummary: summaryText,
      debugLog,
      displayName: room.guest_name || 'Svarog Bot',
      updatedAt: new Date().toISOString(),
    };
  };

  const buildBustedState = (attempt, summaryText) => ({
    ...createPlayerState(room.guest_name || 'Svarog Bot'),
    status: 'busted',
    phase: 'busted',
    currentLevel: Math.max(0, Number(attempt?.relicSnapshot?.level || currentRelic.level || 0)),
    helpfulHits: Math.max(0, Number(attempt?.helpfulHits || 0)),
    hp: Math.max(0, 100 - (Math.max(0, Number(attempt?.helpfulHits || 0)) * 25)),
    tries: MAX_RACE_TRIES + 1,
    mistakes: Math.max(0, Number(attempt?.mistakes || 0)),
    score: Math.max(0, Number(attempt?.score || 0)),
    grade: String(attempt?.grade || 'F'),
    rollCount: Math.max(0, Number(attempt?.rollCount || 0)),
    statBreakdown: attempt?.statBreakdown || {},
    goalSatisfied: Boolean(attempt?.goalSatisfied),
    attemptsUsed: MAX_RACE_TRIES + 1,
    submittedAttempts: 0,
    sessionEntriesBuilt: currentSessionEntries.length,
    sessionEntries: currentSessionEntries,
    sessionArchive,
    botTick: nextBotTick,
    bestScore: Math.max(0, Number(bestAttempt?.score || attempt?.score || 0)),
    bestGrade: String(bestAttempt?.grade || attempt?.grade || 'F'),
    bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || attempt?.rollCount || 0)),
    bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || attempt?.helpfulHits || 0)),
    bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || attempt?.mistakes || 0)),
    bestStatBreakdown: bestAttempt?.statBreakdown || attempt?.statBreakdown || {},
    bestRelicSnapshot: bestAttempt?.relicSnapshot || attempt?.relicSnapshot || null,
    bestRelicSummary: bestAttempt?.relicSummary || attempt?.relicSummary || '',
    currentRelicSnapshot: attempt?.relicSnapshot || null,
    currentRelicSummary: attempt?.relicSummary || summaryText,
    relicSummary: summaryText,
    debugLog,
    displayName: room.guest_name || 'Svarog Bot',
    updatedAt: new Date().toISOString(),
  });

  while (attemptsUsed <= MAX_RACE_TRIES) {
    pushBotDebug(debugLog, `Try ${attemptsUsed}: evaluating room ${room.code} on ${room.tier || 'beginner'} with seed ${seedLabel}.`);
    if (fairMode) {
      pushBotDebug(debugLog, `This is Clara Bot. I only decide from observed session data, predictor, trends, commons/noise, and carry line. I do not use exact hidden future rolls for my choices.`);
    }
    if (scenario?.targetStatGuide) {
      const sTier = Array.isArray(scenario.targetStatGuide.s) && scenario.targetStatGuide.s.length > 0 ? scenario.targetStatGuide.s.join(', ') : 'none';
      const aTier = Array.isArray(scenario.targetStatGuide.a) && scenario.targetStatGuide.a.length > 0 ? scenario.targetStatGuide.a.join(', ') : 'none';
      const trashTier = Array.isArray(scenario.targetStatGuide.trash) && scenario.targetStatGuide.trash.length > 0 ? scenario.targetStatGuide.trash.join(', ') : 'none';
      pushBotDebug(debugLog, `For this relic, I rate S-tier stats as ${sTier}; A-tier stats as ${aTier}; and trash stats as ${trashTier}.`);
    }
    let totalActionsAvailable = Math.max(0, Math.floor(remainingSeconds / config.stepSeconds));

    if (totalActionsAvailable <= 0) {
      totalActionsAvailable = 1;
      pushBotDebug(debugLog, `Try ${attemptsUsed}: no action budget was left from timing math, so I am taking one synthetic test tick to keep the bot moving locally.`);
    }

    let actionsThisAttempt = Math.max(0, totalActionsAvailable);

    if (scenario?.requiresSessionBuilder) {
      const minSessionEntries = Math.max(1, Number(scenario?.minSessionEntries || 5) || 5);
      const maxBuilderEntries = Math.max(minSessionEntries + 3, 8);
      let builderVerdict = null;

      while (actionsThisAttempt > 0) {
        const targetEntries = currentSessionEntries.length < minSessionEntries
          ? minSessionEntries
          : Math.min(maxBuilderEntries, currentSessionEntries.length + 1);
        const builderSimulation = simulateBotSessionBuilder(scenario, {
          startRelic: currentBuilderRelic,
          startProfile: currentProfile,
          startCarryLine: currentCarryLine,
          sessionEntries: currentSessionEntries,
          stepOffset: currentSessionEntries.length,
          targetEntries,
          config,
          debugLog,
          attemptNumber: attemptsUsed,
          actions: actionsThisAttempt,
        });
        if (builderSimulation.usedActions <= 0) break;
        currentBuilderRelic = builderSimulation.relic;
        currentProfile = builderSimulation.profile;
        currentCarryLine = builderSimulation.carryLine;
        currentSessionEntries = builderSimulation.sessionEntries;
        sessionArchive = [...sessionArchive, ...(Array.isArray(builderSimulation.newEntries) ? builderSimulation.newEntries : [])].slice(-96);
        hasTakenAnyAction = true;
        currentPhase = 'building_read';
        remainingSeconds = Math.max(0, remainingSeconds - (builderSimulation.usedActions * config.stepSeconds));
        if (builderSimulation.usedActions > 0 && Number(config?.analysisDelaySteps || 0) > 0) {
          remainingSeconds = Math.max(0, remainingSeconds - (Number(config.analysisDelaySteps) * config.stepSeconds));
          pushBotDebug(debugLog, `Try ${attemptsUsed}: after building session data, I paused to read commons, noise, trends, and Svarog eye before touching the target relic.`);
          currentPhase = 'analyzing_read';
        }
        builderVerdict = evaluateBuilderReadVerdict(scenario, currentProfile, currentCarryLine, config, currentSessionEntries.length);
        pushBotDebug(debugLog, `Try ${attemptsUsed}: ${builderVerdict.summary}`);
        actionsThisAttempt = Math.max(0, Math.floor(remainingSeconds / config.stepSeconds));

        if (builderVerdict.shouldCommit || builderVerdict.shouldAbort) break;
        if (!builderVerdict.shouldKeepBuilding) break;
        if (currentSessionEntries.length >= maxBuilderEntries) {
          pushBotDebug(debugLog, `Try ${attemptsUsed}: I reached the builder evidence cap with a weak read, so I will not waste target actions on this session.`);
          break;
        }
        if (actionsThisAttempt > 0) {
          pushBotDebug(debugLog, `Try ${attemptsUsed}: the read is still not trustworthy enough, so I am spending the remaining budget on more builder evidence instead of touching the target relic.`);
        }
      }

      builderVerdict = builderVerdict || evaluateBuilderReadVerdict(scenario, currentProfile, currentCarryLine, config, currentSessionEntries.length);
      const softCommitAllowed = (
        currentSessionEntries.length >= maxBuilderEntries
        && builderVerdict.trustedResolved
        && (builderVerdict.pairSafety === 'caution' || (attemptsUsed >= MAX_RACE_TRIES && builderVerdict.pairSafety === 'danger'))
        && !builderVerdict.noiseDominates
        && (builderVerdict.carryLineGood || attemptsUsed >= MAX_RACE_TRIES)
      );
      const riskyLastTryCommitAllowed = (
        attemptsUsed >= MAX_RACE_TRIES
        && currentSessionEntries.length >= maxBuilderEntries
        && builderVerdict.trustedResolved
        && builderVerdict.carryLineGood
        && !builderVerdict.noiseDominates
      );
      if (!builderVerdict.shouldCommit && softCommitAllowed) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: the builder read never became perfect, but it is trusted enough to commit with a caution-grade read instead of burning the entire try.`);
        builderVerdict = {
          ...builderVerdict,
          shouldCommit: true,
          shouldAbort: false,
          shouldKeepBuilding: false,
        };
      } else if (!builderVerdict.shouldCommit && riskyLastTryCommitAllowed) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: this is the last try and the builder read is still risky, but trusted with the correct carry line, so I am committing instead of auto-busting the room.`);
        builderVerdict = {
          ...builderVerdict,
          shouldCommit: true,
          shouldAbort: false,
          shouldKeepBuilding: false,
        };
      }

      if (builderVerdict.shouldAbort) {
        if (attemptsUsed < MAX_RACE_TRIES) {
          pushBotDebug(debugLog, `Try ${attemptsUsed}: builder verdict says abort. The read is not trustworthy enough, so I am resetting before touching the target relic.`);
          remainingSeconds = fairMode
            ? elapsedSeconds
            : Math.max(0, remainingSeconds - config.retryDelay);
          attemptsUsed += 1;
          currentRelic = createBotTargetRelic(scenario);
          currentBuilderRelic = createBotBuilderRelic(scenario);
          currentSessionEntries = [];
          currentCarryLine = null;
          currentPhase = 'building_read';
          continue;
        }
        if (bestAttempt) {
          pushBotDebug(debugLog, `Try ${attemptsUsed}: final builder verdict says abort, so I am locking the best earlier attempt instead of waiting forever on a dead read.`);
          return buildSubmittedStateFromAttempt(
            bestAttempt,
            `Bot locked its best earlier attempt from try ${bestAttempt?.attemptNumber || '?'}.`
          );
        }
        pushBotDebug(debugLog, `Try ${attemptsUsed}: final builder verdict says abort and there is no earlier attempt worth locking, so the bot busts now.`);
        return buildBustedState(null, `Bot busted because the final builder verdict never became safe enough to allow target play.`);
      }

      if (!builderVerdict.shouldCommit) {
        if (currentSessionEntries.length >= maxBuilderEntries) {
          if (attemptsUsed < MAX_RACE_TRIES) {
            pushBotDebug(debugLog, `Try ${attemptsUsed}: the builder read never became safe enough, so I am burning this try before target play and moving on.`);
            remainingSeconds = fairMode
              ? elapsedSeconds
              : Math.max(0, remainingSeconds - config.retryDelay);
            attemptsUsed += 1;
            currentRelic = createBotTargetRelic(scenario);
            currentBuilderRelic = createBotBuilderRelic(scenario);
            currentSessionEntries = [];
            currentCarryLine = null;
            currentPhase = 'building_read';
            continue;
          }
          if (bestAttempt) {
            pushBotDebug(debugLog, `Try ${attemptsUsed}: final builder read stayed bad, so I am locking the best attempt I found earlier instead of entering the target on a bad read.`);
            return buildSubmittedStateFromAttempt(
              bestAttempt,
              `Bot locked its best earlier attempt from try ${bestAttempt?.attemptNumber || '?'}.`
            );
          }
          pushBotDebug(debugLog, `Try ${attemptsUsed}: final builder read never became trustworthy and there is no prior attempt worth submitting.`);
          return buildBustedState(null, `Bot busted because the final builder read never became trustworthy enough to enter target play.`);
        }
        if (attemptsUsed >= MAX_RACE_TRIES && actionsThisAttempt <= 0) {
          if (bestAttempt) {
            pushBotDebug(debugLog, `Try ${attemptsUsed}: final try ran out of builder budget without a commit-worthy read, so I am locking the best earlier attempt instead of staying idle.`);
            return buildSubmittedStateFromAttempt(
              bestAttempt,
              `Bot locked its best earlier attempt from try ${bestAttempt?.attemptNumber || '?'}.`
            );
          }
          pushBotDebug(debugLog, `Try ${attemptsUsed}: final try ran out of builder budget without a commit-worthy read, so the bot busts instead of idling.`);
          return buildBustedState(null, `Bot busted because the final try never produced a commit-worthy builder read.`);
        }
        const builtEntries = Math.max(currentSessionEntries.length, sessionArchive.length);
        pushBotDebug(debugLog, `Try ${attemptsUsed}: I am still investigating the session and will not touch the target relic yet.`);
        return {
          ...createPlayerState(room.guest_name || 'Svarog Bot'),
          status: 'attempting',
          phase: currentPhase,
          currentLevel: currentRelic.level,
          helpfulHits: 0,
          hp: 100,
          tries: attemptsUsed,
          mistakes: 0,
          score: 0,
          grade: 'F',
          rollCount: 0,
          statBreakdown: {},
          goalSatisfied: false,
          attemptsUsed,
          submittedAttempts: 0,
          sessionEntriesBuilt: currentSessionEntries.length,
          sessionEntries: currentSessionEntries,
          sessionArchive,
          botTick: nextBotTick,
          bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
          bestGrade: String(bestAttempt?.grade || 'F'),
          bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
          bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
          bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
            bestStatBreakdown: bestAttempt?.statBreakdown || {},
            bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
            bestRelicSummary: bestAttempt?.relicSummary || '',
            currentRelicSnapshot: cloneRelic(currentRelic),
            currentRelicSummary: `Bot is still building and validating the session read for try ${attemptsUsed} (${builtEntries} entries captured).`,
            relicSummary: `Bot is still building and validating the session read for try ${attemptsUsed} (${builtEntries} entries captured).`,
            debugLog,
            displayName: room.guest_name || 'Svarog Bot',
            updatedAt: new Date().toISOString(),
          };
      }
    }

    const simulation = simulateBotTargetRelic(scenario, actionsThisAttempt, {
      startRelic: currentRelic,
      startProfile: currentProfile,
      startCarryLine: currentCarryLine,
      startBuilderRelic: currentBuilderRelic,
      sessionEntries: currentSessionEntries,
      config,
      debugLog,
      attemptNumber: attemptsUsed,
    });

    currentRelic = simulation.relic;
    currentProfile = simulation.profile;
    currentCarryLine = simulation.carryLine;
    currentBuilderRelic = simulation.builderRelic || currentBuilderRelic;
    currentSessionEntries = simulation.sessionEntries || currentSessionEntries;
    sessionArchive = [...sessionArchive, ...(Array.isArray(simulation.newSessionEntries) ? simulation.newSessionEntries : [])].slice(-96);
    hasTakenAnyAction = hasTakenAnyAction || simulation.usedActions > 0;
    currentPhase = 'upgrading_target';
    remainingSeconds = Math.max(0, remainingSeconds - (simulation.usedActions * config.stepSeconds));

    const statBreakdown = simulation.statBreakdown;
    const helpfulHits = success.type === 'monoLine'
      ? Math.max(0, Number(statBreakdown?.[success.target] || 0))
      : Array.isArray(success.required)
        ? success.required.reduce((sum, stat) => sum + Math.max(0, Number(statBreakdown?.[stat] || 0)), 0)
        : 0;
    const junkStats = Array.isArray(success.junk) ? success.junk : [];
    const mistakes = junkStats.reduce((sum, stat) => sum + Math.max(0, Number(statBreakdown?.[stat] || 0)), 0);
    const goalSatisfied = evaluateScenarioSuccess(scenario, statBreakdown);
    const goalProgress = getScenarioGoalProgress(scenario, statBreakdown);
    const relicScore = scoreRelicWithProfile(currentRelic, detectRelicScoreProfile(currentRelic));
    const evaluatedAttempt = evaluateBotRelicState(currentRelic, scenario, currentProfile, config);
    const attempt = {
      attemptNumber: attemptsUsed,
      score: relicScore.score,
      grade: relicScore.grade,
      helpfulHits,
      mistakes,
      rollCount: relicScore.rollCount,
      statBreakdown,
      goalSatisfied,
      goalProgress,
      decisionTotal: evaluatedAttempt.total,
      relicSnapshot: cloneRelic(currentRelic),
      relicSummary: currentRelic.level >= 15
        ? `Bot finished try ${attemptsUsed} at +15.`
        : `Bot is on try ${attemptsUsed} at +${currentRelic.level}.`,
    };

    if (!bestAttempt || compareAttemptPayload(attempt, bestAttempt) > 0) {
      bestAttempt = attempt;
      pushBotDebug(debugLog, `Try ${attemptsUsed}: new best attempt => ${attempt.grade} ${attempt.score} with helpful ${attempt.helpfulHits}, junk ${attempt.mistakes}.`);
    }

    if (currentRelic.level < 15) {
      const moreActionsAvailable = remainingSeconds >= config.stepSeconds;
      if (moreActionsAvailable) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: reached +${currentRelic.level} but still has action budget, so I am continuing this attempt instead of waiting.`);
        continue;
      }
      pushBotDebug(debugLog, `Try ${attemptsUsed}: still building at +${currentRelic.level}. Waiting for more time before next decision.`);
      return {
        ...createPlayerState(room.guest_name || 'Svarog Bot'),
        status: 'attempting',
        phase: currentPhase,
        currentLevel: currentRelic.level || (scenario?.requiresSessionBuilder ? currentBuilderRelic.level : 0),
        helpfulHits,
        hp: Math.max(0, 100 - helpfulHits * 25),
        tries: attemptsUsed,
        mistakes,
        score: relicScore.score,
        grade: relicScore.grade,
        rollCount: relicScore.rollCount,
        statBreakdown,
        goalSatisfied,
        attemptsUsed,
        submittedAttempts: 0,
        sessionEntriesBuilt: currentSessionEntries.length,
        sessionEntries: currentSessionEntries,
        sessionArchive,
        botTick: nextBotTick,
        bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
        bestGrade: String(bestAttempt?.grade || 'F'),
        bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
        bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
        bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
        bestStatBreakdown: bestAttempt?.statBreakdown || {},
        bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
        bestRelicSummary: bestAttempt?.relicSummary || '',
        currentRelicSnapshot: cloneRelic(currentRelic),
        currentRelicSummary: scenario?.requiresSessionBuilder && currentRelic.level === 0
          ? `Bot finished building session data and is lining up try ${attemptsUsed}.`
          : `Bot is building try ${attemptsUsed} at +${currentRelic.level}.`,
        relicSummary: scenario?.requiresSessionBuilder && currentRelic.level === 0
          ? `Bot finished building session data and is lining up try ${attemptsUsed}.`
          : `Bot is building try ${attemptsUsed} at +${currentRelic.level}.`,
        debugLog,
        displayName: room.guest_name || 'Svarog Bot',
        updatedAt: new Date().toISOString(),
      };
    }

    const retryCeiling = attemptsUsed < MAX_RACE_TRIES ? estimateRetryCeiling(scenario, currentProfile, currentCarryLine, config) : null;
    if (attemptsUsed >= MAX_RACE_TRIES) {
      if (attempt.goalSatisfied) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: last try satisfied the contract, so I am submitting this final relic.`);
        return buildSubmittedStateFromAttempt(attempt, `Bot submitted its final relic on try ${attemptsUsed}.`);
      }
      const finalAttempt = bestAttempt && compareAttemptPayload(bestAttempt, attempt) >= 0 ? bestAttempt : attempt;
      if (finalAttempt) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: last try missed the contract, so I am submitting the best attempt I found overall (try ${finalAttempt?.attemptNumber || attemptsUsed}, goal=${finalAttempt?.goalSatisfied ? 'yes' : 'no'}).`);
        return buildSubmittedStateFromAttempt(
          finalAttempt,
          finalAttempt === attempt
            ? `Bot had to lock its final try ${attemptsUsed} even though the contract was not cleared.`
            : `Bot locked its best earlier attempt from try ${finalAttempt?.attemptNumber || '?'}.`
        );
      }
      pushBotDebug(debugLog, `Try ${attemptsUsed}: no valid attempt exists to lock on the final try, so the bot busts.`);
      return buildBustedState(attempt, `Bot busted after failing to find any submission-worthy relic across ${MAX_RACE_TRIES} tries.`);
    }

    if (shouldBotSubmitAttempt(attempt, attemptsUsed, config, retryCeiling, scenario)) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: submitted. Reason => score ${attempt.score}, grade ${attempt.grade}, helpful ${attempt.helpfulHits}, goal=${attempt.goalSatisfied ? 'yes' : 'no'}.`);
      return buildSubmittedStateFromAttempt(attempt, `Bot submitted its final relic on try ${attemptsUsed}.`);
    }

    if (!fairMode && remainingSeconds < config.retryDelay) {
      const hostAlreadyLocked = String(room?.host_state?.status || '') === 'submitted';
      if (hostAlreadyLocked) {
        pushBotDebug(debugLog, `Try ${attemptsUsed}: host already submitted, so I am locking the best available bot attempt now instead of stalling in maxed state.`);
        return buildSubmittedStateFromAttempt(
          bestAttempt && compareAttemptPayload(bestAttempt, attempt) >= 0 ? bestAttempt : attempt,
          `Bot locked its best available relic after the host submitted first.`
        );
      }
      pushBotDebug(debugLog, `Try ${attemptsUsed}: reached +15 but is holding. Waiting for retry window before deciding reset.`);
      return {
        ...createPlayerState(room.guest_name || 'Svarog Bot'),
        status: 'maxed',
        phase: 'analyzing_read',
        currentLevel: currentRelic.level,
        helpfulHits,
        hp: Math.max(0, 100 - helpfulHits * 25),
        tries: attemptsUsed,
        mistakes,
        score: relicScore.score,
        grade: relicScore.grade,
        rollCount: relicScore.rollCount,
        statBreakdown,
        goalSatisfied,
        attemptsUsed,
        submittedAttempts: 0,
        sessionEntriesBuilt: currentSessionEntries.length,
        sessionEntries: currentSessionEntries,
        sessionArchive,
        botTick: nextBotTick,
        bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
        bestGrade: String(bestAttempt?.grade || 'F'),
        bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
        bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
        bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
        bestStatBreakdown: bestAttempt?.statBreakdown || {},
        bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
        bestRelicSummary: bestAttempt?.relicSummary || '',
        relicSummary: `Bot is deciding whether to reset try ${attemptsUsed}.`,
        debugLog,
        displayName: room.guest_name || 'Svarog Bot',
        updatedAt: new Date().toISOString(),
      };
    }

    pushBotDebug(debugLog, `Try ${attemptsUsed}: rejected final relic (${attempt.grade} ${attempt.score}). Resetting into try ${attemptsUsed + 1}.`);
    remainingSeconds = fairMode
      ? elapsedSeconds
      : Math.max(0, remainingSeconds - config.retryDelay);
    attemptsUsed += 1;
    currentRelic = createBotTargetRelic(scenario);
    currentBuilderRelic = createBotBuilderRelic(scenario);
    currentSessionEntries = [];
    currentCarryLine = null;
    currentPhase = scenario?.requiresSessionBuilder ? 'building_read' : 'upgrading_target';
  }

  return {
    ...createPlayerState(room.guest_name || 'Svarog Bot'),
    status: hasTakenAnyAction ? 'attempting' : 'ready',
    phase: currentPhase,
    currentLevel: hasTakenAnyAction ? currentRelic.level : 0,
    attemptsUsed: hasTakenAnyAction ? attemptsUsed : 0,
    tries: hasTakenAnyAction ? attemptsUsed : 1,
    sessionEntriesBuilt: currentSessionEntries.length,
    sessionEntries: currentSessionEntries,
    sessionArchive,
    botTick: nextBotTick,
    bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
    bestGrade: String(bestAttempt?.grade || 'F'),
    bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
    bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
    bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
    bestStatBreakdown: bestAttempt?.statBreakdown || {},
    bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
    bestRelicSummary: bestAttempt?.relicSummary || '',
    debugLog,
    displayName: room.guest_name || 'Svarog Bot',
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeScenario(scenario) {
  if (!scenario || typeof scenario !== 'object') {
    throw new HttpError(400, 'Scenario payload is invalid.');
  }
  return scenario;
}

function normalizePvpSeedMode(value, fallback = 'shared') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'random') return 'random';
  if (normalized === 'shared') return 'shared';
  return fallback;
}

function buildPvpScenarioPayload(baseScenario, seedMode = 'shared', variantScenario = null) {
  const normalizedSeedMode = normalizePvpSeedMode(seedMode);
  const base = sanitizeScenario({
    ...baseScenario,
    pvpSeedMode: normalizedSeedMode,
  });

  if (normalizedSeedMode !== 'random' || !variantScenario) {
    return base;
  }

  return sanitizeScenario({
    ...base,
    pvpSeedMode: 'random',
    playerScenarios: {
      host: {
        seedLabel: base.seedLabel,
        starterRolls: base.starterRolls,
        seedMeta: base.seedMeta,
        expectedStyle: base.expectedStyle,
        mood: base.mood,
        region: base.region,
        patch: base.patch,
      },
      guest: {
        seedLabel: variantScenario.seedLabel,
        starterRolls: variantScenario.starterRolls,
        seedMeta: variantScenario.seedMeta,
        expectedStyle: variantScenario.expectedStyle,
        mood: variantScenario.mood,
        region: variantScenario.region,
        patch: variantScenario.patch,
      },
    },
  });
}

function resolveRoomScenarioForRole(roomOrScenario, role = null) {
  const rootScenario = roomOrScenario?.scenario && typeof roomOrScenario.scenario === 'object'
    ? roomOrScenario.scenario
    : (roomOrScenario && typeof roomOrScenario === 'object' ? roomOrScenario : {});
  const seedMode = normalizePvpSeedMode(rootScenario?.pvpSeedMode, 'shared');
  if (seedMode !== 'random') return rootScenario;
  if (role !== 'host' && role !== 'guest') return rootScenario;
  const variant = rootScenario?.playerScenarios?.[role];
  if (!variant || typeof variant !== 'object') return rootScenario;
  return {
    ...rootScenario,
    ...variant,
    pvpSeedMode: seedMode,
  };
}

function normalizePlayerState(input, currentState = {}) {
  const next = { ...(currentState || {}) };
  const nowIso = new Date().toISOString();
  const status = String(input?.status || next.status || 'attempting').trim().toLowerCase();
  const allowedStatuses = new Set(['ready', 'attempting', 'maxed', 'submitted', 'busted', 'timeout', 'disconnected']);
  next.status = allowedStatuses.has(status) ? status : 'attempting';
  next.phase = String(input?.phase || next.phase || 'idle').slice(0, 32);
  next.currentLevel = Math.max(0, Math.min(15, Number(input?.currentLevel ?? next.currentLevel ?? 0) || 0));
  next.helpfulHits = Math.max(0, Math.min(10, Number(input?.helpfulHits ?? next.helpfulHits ?? 0) || 0));
  next.hp = Math.max(0, Math.min(100, Number(input?.hp ?? next.hp ?? 100) || 0));
  next.tries = Math.max(1, Number(input?.tries ?? next.tries ?? 1) || 1);
  next.mistakes = Math.max(0, Number(input?.mistakes ?? next.mistakes ?? 0) || 0);
  next.score = Math.max(0, Number(input?.score ?? next.score ?? 0) || 0);
  next.grade = String(input?.grade || next.grade || 'F').slice(0, 12);
  next.rollCount = Math.max(0, Number(input?.rollCount ?? next.rollCount ?? 0) || 0);
  next.hintStep = Math.max(0, Number(input?.hintStep ?? next.hintStep ?? 0) || 0);
  next.statBreakdown = input?.statBreakdown && typeof input.statBreakdown === 'object'
    ? Object.entries(input.statBreakdown).reduce((acc, [stat, count]) => {
        acc[String(stat)] = Math.max(0, Number(count) || 0);
        return acc;
      }, {})
    : (next.statBreakdown && typeof next.statBreakdown === 'object' ? next.statBreakdown : {});
  next.goalSatisfied = Boolean(input?.goalSatisfied ?? next.goalSatisfied ?? false);
  next.attemptsUsed = Math.max(0, Number(input?.attemptsUsed ?? next.attemptsUsed ?? 0) || 0);
  next.submittedAttempts = Math.max(0, Number(input?.submittedAttempts ?? next.submittedAttempts ?? 0) || 0);
  next.finalScore = Math.max(0, Number(input?.finalScore ?? next.finalScore ?? 0) || 0);
  next.finalGrade = String(input?.finalGrade || next.finalGrade || 'F').slice(0, 12);
  next.finalRollCount = Math.max(0, Number(input?.finalRollCount ?? next.finalRollCount ?? 0) || 0);
  next.finalHelpfulHits = Math.max(0, Number(input?.finalHelpfulHits ?? next.finalHelpfulHits ?? 0) || 0);
  next.finalMistakes = Math.max(0, Number(input?.finalMistakes ?? next.finalMistakes ?? 0) || 0);
  next.finalGoalSatisfied = Boolean(input?.finalGoalSatisfied ?? next.finalGoalSatisfied ?? false);
  next.finalStatBreakdown = input?.finalStatBreakdown && typeof input.finalStatBreakdown === 'object'
    ? Object.entries(input.finalStatBreakdown).reduce((acc, [stat, count]) => {
        acc[String(stat)] = Math.max(0, Number(count) || 0);
        return acc;
      }, {})
    : (next.finalStatBreakdown && typeof next.finalStatBreakdown === 'object' ? next.finalStatBreakdown : {});
  next.finalRelicSnapshot = input?.finalRelicSnapshot && typeof input.finalRelicSnapshot === 'object'
    ? input.finalRelicSnapshot
    : (next.finalRelicSnapshot && typeof next.finalRelicSnapshot === 'object' ? next.finalRelicSnapshot : null);
  next.finalRelicSummary = String(input?.finalRelicSummary || next.finalRelicSummary || '').slice(0, 240);
  next.currentRelicSnapshot = input?.currentRelicSnapshot && typeof input.currentRelicSnapshot === 'object'
    ? input.currentRelicSnapshot
    : (next.currentRelicSnapshot && typeof next.currentRelicSnapshot === 'object' ? next.currentRelicSnapshot : null);
  next.currentRelicSummary = String(input?.currentRelicSummary || next.currentRelicSummary || '').slice(0, 240);
  next.sessionEntriesBuilt = Math.max(0, Number(input?.sessionEntriesBuilt ?? next.sessionEntriesBuilt ?? 0) || 0);
  next.sessionEntries = Array.isArray(input?.sessionEntries)
    ? input.sessionEntries.map((entry, index) => ({
        id: String(entry?.id || `session-${index}`).slice(0, 80),
        raw: String(entry?.raw || '').slice(0, 8),
        translated: String(entry?.translated || '').slice(0, 8),
        s2: String(entry?.s2 || entry?.translated || '').slice(0, 8),
        s3: '',
        s4: '',
        s5: '',
        time: String(entry?.time || '').slice(0, 40),
        attempt: Math.max(1, Number(entry?.attempt || 1) || 1),
        step: Math.max(1, Number(entry?.step || 1) || 1),
        carryLine: Number.isInteger(entry?.carryLine) ? entry.carryLine : null,
        commons: String(entry?.commons || '').slice(0, 20),
        noise: String(entry?.noise || '').slice(0, 20),
        dominantRoll: String(entry?.dominantRoll || '').slice(0, 8),
        noisePressure: Number.isFinite(Number(entry?.noisePressure)) ? Number(entry.noisePressure) : 0,
        pairSafety: String(entry?.pairSafety || '').slice(0, 16),
        noiseRisk: Number.isFinite(Number(entry?.noiseRisk)) ? Number(entry.noiseRisk) : 0,
        trustedPair: String(entry?.trustedPair || '').slice(0, 20),
        trendSummary: String(entry?.trendSummary || '').slice(0, 120),
      })).slice(-32)
    : (Array.isArray(next.sessionEntries) ? next.sessionEntries.slice(-32) : []);
  next.sessionArchive = Array.isArray(input?.sessionArchive)
    ? input.sessionArchive.map((entry, index) => ({
        id: String(entry?.id || `session-archive-${index}`).slice(0, 80),
        raw: String(entry?.raw || '').slice(0, 8),
        translated: String(entry?.translated || '').slice(0, 8),
        s2: String(entry?.s2 || entry?.translated || '').slice(0, 8),
        s3: '',
        s4: '',
        s5: '',
        time: String(entry?.time || '').slice(0, 40),
        attempt: Math.max(1, Number(entry?.attempt || 1) || 1),
        step: Math.max(1, Number(entry?.step || 1) || 1),
        carryLine: Number.isInteger(entry?.carryLine) ? entry.carryLine : null,
        commons: String(entry?.commons || '').slice(0, 20),
        noise: String(entry?.noise || '').slice(0, 20),
        dominantRoll: String(entry?.dominantRoll || '').slice(0, 8),
        noisePressure: Number.isFinite(Number(entry?.noisePressure)) ? Number(entry.noisePressure) : 0,
        pairSafety: String(entry?.pairSafety || '').slice(0, 16),
        noiseRisk: Number.isFinite(Number(entry?.noiseRisk)) ? Number(entry.noiseRisk) : 0,
        trustedPair: String(entry?.trustedPair || '').slice(0, 20),
        trendSummary: String(entry?.trendSummary || '').slice(0, 120),
      })).slice(-96)
    : (Array.isArray(next.sessionArchive) ? next.sessionArchive.slice(-96) : []);
  next.botTick = Math.max(0, Number(input?.botTick ?? next.botTick ?? 0) || 0);
  next.bestScore = Math.max(0, Number(input?.bestScore ?? next.bestScore ?? 0) || 0);
  next.bestGrade = String(input?.bestGrade || next.bestGrade || 'F').slice(0, 12);
  next.bestRollCount = Math.max(0, Number(input?.bestRollCount ?? next.bestRollCount ?? 0) || 0);
  next.bestHelpfulHits = Math.max(0, Number(input?.bestHelpfulHits ?? next.bestHelpfulHits ?? 0) || 0);
  next.bestMistakes = Math.max(0, Number(input?.bestMistakes ?? next.bestMistakes ?? 0) || 0);
  next.bestStatBreakdown = input?.bestStatBreakdown && typeof input.bestStatBreakdown === 'object'
    ? Object.entries(input.bestStatBreakdown).reduce((acc, [stat, count]) => {
        acc[String(stat)] = Math.max(0, Number(count) || 0);
        return acc;
      }, {})
    : (next.bestStatBreakdown && typeof next.bestStatBreakdown === 'object' ? next.bestStatBreakdown : {});
  next.bestRelicSnapshot = input?.bestRelicSnapshot && typeof input.bestRelicSnapshot === 'object'
    ? input.bestRelicSnapshot
    : (next.bestRelicSnapshot && typeof next.bestRelicSnapshot === 'object' ? next.bestRelicSnapshot : null);
  next.bestRelicSummary = String(input?.bestRelicSummary || next.bestRelicSummary || '').slice(0, 240);
  next.relicSummary = String(input?.relicSummary || next.relicSummary || '').slice(0, 240);
  next.debugLog = Array.isArray(input?.debugLog)
    ? input.debugLog.map((entry) => String(entry).slice(0, 500)).slice(-120)
    : (Array.isArray(next.debugLog) ? next.debugLog.slice(-120) : []);
  next.displayName = String(input?.displayName || next.displayName || '').slice(0, 80);
  next.displayAvatarUrl = String(input?.displayAvatarUrl || next.displayAvatarUrl || '').slice(0, 512);
  next.displayTitleKey = String(input?.displayTitleKey || next.displayTitleKey || '').slice(0, 80);
  next.displayTitle = String(input?.displayTitle || next.displayTitle || '').slice(0, 120);
  next.displayTitleRarity = String(input?.displayTitleRarity || next.displayTitleRarity || '').slice(0, 24);
  next.displayBadgeKey = String(input?.displayBadgeKey || next.displayBadgeKey || '').slice(0, 80);
  next.displayBadge = String(input?.displayBadge || next.displayBadge || '').slice(0, 80);
  next.displayBadgeRarity = String(input?.displayBadgeRarity || next.displayBadgeRarity || '').slice(0, 24);
  next.displayNameplateKey = String(input?.displayNameplateKey || next.displayNameplateKey || '').slice(0, 80);
  next.displayNameplate = String(input?.displayNameplate || next.displayNameplate || '').slice(0, 80);
  next.displayNameplateRarity = String(input?.displayNameplateRarity || next.displayNameplateRarity || '').slice(0, 24);
  next.displayFrameKey = String(input?.displayFrameKey || next.displayFrameKey || '').slice(0, 80);
  next.displayFrame = String(input?.displayFrame || next.displayFrame || '').slice(0, 80);
  next.displayFrameRarity = String(input?.displayFrameRarity || next.displayFrameRarity || '').slice(0, 24);
  next.updatedAt = nowIso;
  return next;
}

async function loadRoomByCode(code) {
  const rows = await supabaseAdminRequest(buildTablePath({ code: `eq.${code}` }));
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function patchRoom(code, patch) {
  const rows = await supabaseAdminRequest(buildTablePath({ code: `eq.${code}` }), {
    method: 'PATCH',
    body: patch,
  });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function syncCountdownRoomIfNeeded(room) {
  if (!room || String(room.status || '').toLowerCase() !== 'countdown') return room;
  const startedAtMs = new Date(room.started_at || 0).getTime();
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return room;
  const activeAtMs = startedAtMs + (PREMATCH_COUNTDOWN_SECONDS * 1000);
  if (Date.now() < activeAtMs) return room;

  const activeStartedAt = new Date(activeAtMs).toISOString();
  const updated = await patchRoom(room.code, {
    status: 'active',
    started_at: activeStartedAt,
    updated_at: new Date().toISOString(),
  });
  return updated || room;
}

async function syncBotRoomIfNeeded(room) {
  if (!room || !isDevBotUserId(room.guest_user_id)) return room;

  let nextGuestState = null;
  try {
    nextGuestState = buildBotState(room);
  } catch (error) {
    console.error(`[PvP Bot ${room.code || 'unknown'}] sync failed`, error);
    return room;
  }
  if (!nextGuestState) return room;

  const currentGuestState = room.guest_state && typeof room.guest_state === 'object' ? room.guest_state : {};
  const currentSignature = JSON.stringify({
    status: currentGuestState.status || '',
    currentLevel: Number(currentGuestState.currentLevel || 0),
    botTick: Number(currentGuestState.botTick || 0),
    attemptsUsed: Number(currentGuestState.attemptsUsed || 0),
    submittedAttempts: Number(currentGuestState.submittedAttempts || 0),
    helpfulHits: Number(currentGuestState.helpfulHits || 0),
    mistakes: Number(currentGuestState.mistakes || 0),
    goalSatisfied: Boolean(currentGuestState.goalSatisfied),
    score: Number(currentGuestState.score || 0),
    grade: String(currentGuestState.grade || ''),
  });
  const nextSignature = JSON.stringify({
    status: nextGuestState.status,
    currentLevel: nextGuestState.currentLevel,
    botTick: nextGuestState.botTick || 0,
    attemptsUsed: nextGuestState.attemptsUsed,
    submittedAttempts: nextGuestState.submittedAttempts,
    helpfulHits: nextGuestState.helpfulHits,
    mistakes: nextGuestState.mistakes,
    goalSatisfied: nextGuestState.goalSatisfied,
    score: nextGuestState.score,
    grade: nextGuestState.grade,
  });

  if (currentSignature === nextSignature) {
    const outcome = resolveRoomOutcome(room, room.host_state || createPlayerState(room.host_name), currentGuestState);
    if (!outcome || room.winner_user_id === outcome.winnerUserId) {
      return room;
    }
    const updated = await patchRoom(room.code, {
      status: outcome.status,
      winner_user_id: outcome.winnerUserId,
      finished_at: outcome.finishedAt,
      ...(outcome.hostState ? { host_state: outcome.hostState } : {}),
      ...(outcome.guestState ? { guest_state: outcome.guestState } : {}),
      updated_at: new Date().toISOString(),
    });
    return updated || room;
  }

  const patch = {
    guest_state: nextGuestState,
    updated_at: new Date().toISOString(),
  };

  emitBotDebugToConsole(room.code, nextGuestState.debugLog);

  const outcome = resolveRoomOutcome(room, room.host_state || createPlayerState(room.host_name), nextGuestState);
  if (outcome) {
    patch.status = outcome.status;
    patch.winner_user_id = outcome.winnerUserId;
    patch.finished_at = outcome.finishedAt;
    if (outcome.hostState) patch.host_state = outcome.hostState;
    if (outcome.guestState) patch.guest_state = outcome.guestState;
  }

  const updated = await patchRoom(room.code, patch);
  return updated || room;
}

async function syncTimedOutActiveRoomIfNeeded(room) {
  if (!room || String(room.status || '').toLowerCase() !== 'active') return room;
  const outcome = resolveRoomOutcome(
    room,
    room.host_state || createPlayerState(room.host_name),
    room.guest_state || createPlayerState(room.guest_name),
  );
  if (!outcome) return room;
  const updated = await patchRoom(room.code, {
    status: outcome.status,
    winner_user_id: outcome.winnerUserId,
    finished_at: outcome.finishedAt,
    ...(outcome.hostState ? { host_state: outcome.hostState } : {}),
    ...(outcome.guestState ? { guest_state: outcome.guestState } : {}),
    updated_at: new Date().toISOString(),
  });
  return updated || room;
}

function toClientRoom(row, viewerId = '') {
  if (!row) return null;
  const hostState = row.host_state && typeof row.host_state === 'object' ? row.host_state : createPlayerState(row.host_name);
  const guestState = row.guest_state && typeof row.guest_state === 'object' ? row.guest_state : createPlayerState(row.guest_name);
  const hostUserId = String(row.host_user_id || '');
  const guestUserId = String(row.guest_user_id || '');
  const normalizedViewerId = String(viewerId || '');
  const viewerRole = normalizedViewerId === hostUserId ? 'host' : normalizedViewerId === guestUserId ? 'guest' : null;
  const resolvedScenario = resolveRoomScenarioForRole(row, viewerRole);

  return {
    code: row.code,
    status: row.status,
    tier: row.tier,
    difficulty: row.difficulty,
    seedLabel: resolvedScenario?.seedLabel || row.seed_label,
    scenario: resolvedScenario,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    winnerUserId: row.winner_user_id || null,
    viewerRole,
    host: {
      userId: hostUserId,
      name: row.host_name,
      state: hostState,
    },
    guest: {
      userId: guestUserId || null,
      name: row.guest_name || null,
      state: guestState,
    },
  };
}

function ensureRoomParticipant(room, userId) {
  const normalizedUserId = String(userId || '');
  if (normalizedUserId === String(room?.host_user_id || '')) return 'host';
  if (normalizedUserId === String(room?.guest_user_id || '')) return 'guest';
  throw new HttpError(403, 'You are not part of this room.');
}

async function createRoomForUser(user, body) {
  const tier = String(body?.tier || 'beginner').trim().toLowerCase();
  const seedMode = normalizePvpSeedMode(body?.seedMode, tier === 'expert_v2' ? 'random' : 'shared');
  const selectedSetName = String(body?.selectedSetName || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const baseScenario = body?.scenario && typeof body.scenario === 'object'
    ? body.scenario
    : createChallengeScenario({ tier, generated: true, mode: 'pvp', selectedSetName, targetRelicOverride });
  const variantScenario = seedMode === 'random'
    ? createChallengeScenario({
        tier,
        generated: true,
        mode: 'pvp',
        selectedSetName,
        targetRelicOverride: baseScenario?.targetRelic || targetRelicOverride,
        preferredStyle: baseScenario?.expectedStyle || null,
        templateId: baseScenario?.templateMeta?.id || null,
        excludeSeedId: baseScenario?.seedMeta?.id || null,
      })
    : null;
  const scenario = buildPvpScenarioPayload(baseScenario, seedMode, variantScenario);
  const identity = resolveUserIdentity(user);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const row = {
      code,
      status: 'lobby',
      tier,
      difficulty: scenario.difficulty || tier,
      seed_label: scenario.seedLabel || '',
      scenario,
      host_user_id: user.id,
      host_name: identity.displayName,
      guest_user_id: null,
      guest_name: null,
      host_state: createPlayerState(identity.displayName, identity),
      guest_state: createPlayerState('Opponent'),
      winner_user_id: null,
      started_at: null,
      finished_at: null,
    };

    try {
      const created = await supabaseAdminRequest(PVP_ROOMS_TABLE, {
        method: 'POST',
        body: row,
      });
      const inserted = Array.isArray(created) ? created[0] || row : row;
      return toClientRoom(inserted, user.id);
    } catch (error) {
      const message = String(error?.details?.message || error?.message || '');
      if (!message.toLowerCase().includes('duplicate') && !message.includes('23505')) {
        throw error;
      }
    }
  }

  throw new HttpError(500, 'Failed to allocate a PvP room code.');
}

async function joinRoomForUser(user, code) {
  const room = await syncBotRoomIfNeeded(await loadRoomByCode(code));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }

  if (String(room.host_user_id || '') === String(user.id || '')) {
    return toClientRoom(room, user.id);
  }

  if (room.guest_user_id && String(room.guest_user_id || '') !== String(user.id || '')) {
    throw new HttpError(409, 'Room is already full.');
  }

  if (room.status !== 'lobby') {
    throw new HttpError(409, 'Room is no longer joinable.');
  }

  const identity = resolveUserIdentity(user);
  const nextGuestState = createPlayerState(identity.displayName, identity);
  const updated = await patchRoom(code, {
    guest_user_id: user.id,
    guest_name: identity.displayName,
    guest_state: nextGuestState,
    updated_at: new Date().toISOString(),
  });
  return toClientRoom(updated || room, user.id);
}

async function startRoomForUser(user, code) {
  const room = await syncBotRoomIfNeeded(await syncCountdownRoomIfNeeded(await loadRoomByCode(code)));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  const role = ensureRoomParticipant(room, user.id);
  if (role !== 'host') {
    throw new HttpError(403, 'Only the host can start the room.');
  }
  if (!room.guest_user_id) {
    throw new HttpError(409, 'Room needs an opponent before it can start.');
  }

  const startedAt = new Date().toISOString();
  const hostIdentity = extractStateIdentity(room.host_state, room.host_name);
  const guestIdentity = extractStateIdentity(room.guest_state, room.guest_name || 'Opponent');
  const updated = await patchRoom(code, {
    status: 'countdown',
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: createPlayerState(room.host_name, hostIdentity),
    guest_state: createPlayerState(room.guest_name || 'Opponent', guestIdentity),
    updated_at: startedAt,
  });
  return toClientRoom(updated || room, user.id);
}

async function restartRoomForUser(user, code) {
  const room = await loadRoomByCode(code);
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  const role = ensureRoomParticipant(room, user.id);
  if (role !== 'host') {
    throw new HttpError(403, 'Only the host can restart the room.');
  }
  if (!room.guest_user_id) {
    throw new HttpError(409, 'Room needs an opponent before it can restart.');
  }

  const currentScenario = room?.scenario && typeof room.scenario === 'object' ? room.scenario : {};
  const seedMode = normalizePvpSeedMode(currentScenario?.pvpSeedMode, room?.tier === 'expert_v2' ? 'random' : 'shared');
  const selectedSetName = String(currentScenario?.targetRelic?.setNameHint || currentScenario?.targetRelic?.setName || '').trim() || null;
  const reseededScenario = createChallengeScenario({
    tier: room.tier || 'beginner',
    generated: true,
    mode: 'pvp',
    selectedSetName,
    targetRelicOverride: currentScenario?.targetRelic || null,
    preferredStyle: currentScenario?.expectedStyle || null,
    excludeSeedId: currentScenario?.seedMeta?.id || null,
    templateId: currentScenario?.templateMeta?.id || null,
  });
  const guestScenario = seedMode === 'random'
    ? createChallengeScenario({
        tier: room.tier || 'beginner',
        generated: true,
        mode: 'pvp',
        selectedSetName,
        targetRelicOverride: reseededScenario?.targetRelic || currentScenario?.targetRelic || null,
        preferredStyle: reseededScenario?.expectedStyle || currentScenario?.expectedStyle || null,
        templateId: reseededScenario?.templateMeta?.id || currentScenario?.templateMeta?.id || null,
        excludeSeedId: reseededScenario?.seedMeta?.id || currentScenario?.seedMeta?.id || null,
      })
    : null;
  const scenario = buildPvpScenarioPayload(reseededScenario, seedMode, guestScenario);
  const startedAt = new Date().toISOString();
  const hostIdentity = extractStateIdentity(room.host_state, room.host_name);
  const guestIdentity = extractStateIdentity(room.guest_state, room.guest_name || 'Opponent');
  const updated = await patchRoom(code, {
    status: 'countdown',
    difficulty: scenario.difficulty || room.tier,
    seed_label: scenario.seedLabel || '',
    scenario,
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: createPlayerState(room.host_name, hostIdentity),
    guest_state: createPlayerState(room.guest_name || 'Opponent', guestIdentity),
    updated_at: startedAt,
  });
  return toClientRoom(updated || room, user.id);
}

async function rerollRoomForUser(user, code, body = {}) {
  const room = await loadRoomByCode(code);
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  const role = ensureRoomParticipant(room, user.id);
  if (role !== 'host') {
    throw new HttpError(403, 'Only the host can reroll the room.');
  }
  if (room.status !== 'lobby') {
    throw new HttpError(409, 'You can only reroll relics before the duel starts.');
  }

  const selectedSetName = String(body?.selectedSetName || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const currentScenario = room?.scenario && typeof room.scenario === 'object' ? room.scenario : {};
  const seedMode = normalizePvpSeedMode(currentScenario?.pvpSeedMode, room?.tier === 'expert_v2' ? 'random' : 'shared');
  const baseScenario = createChallengeScenario({
    tier: room.tier || 'beginner',
    generated: true,
    mode: 'pvp',
    selectedSetName,
    targetRelicOverride,
    excludeSeedId: currentScenario?.seedMeta?.id || null,
    excludeTemplateId: currentScenario?.templateMeta?.id || null,
  });
  const guestScenario = seedMode === 'random'
    ? createChallengeScenario({
        tier: room.tier || 'beginner',
        generated: true,
        mode: 'pvp',
        selectedSetName: selectedSetName || (baseScenario?.targetRelic?.setNameHint || baseScenario?.targetRelic?.setName || null),
        targetRelicOverride: baseScenario?.targetRelic || targetRelicOverride,
        preferredStyle: baseScenario?.expectedStyle || null,
        templateId: baseScenario?.templateMeta?.id || null,
        excludeSeedId: baseScenario?.seedMeta?.id || null,
      })
    : null;
  const scenario = buildPvpScenarioPayload(baseScenario, seedMode, guestScenario);
  const hostIdentity = extractStateIdentity(room.host_state, room.host_name);
  const guestIdentity = extractStateIdentity(room.guest_state, room.guest_name || 'Opponent');
  const updated = await patchRoom(code, {
    difficulty: scenario.difficulty || room.tier,
    seed_label: scenario.seedLabel || '',
    scenario,
    winner_user_id: null,
    started_at: null,
    finished_at: null,
    host_state: createPlayerState(room.host_name, hostIdentity),
    guest_state: createPlayerState(room.guest_name || 'Opponent', guestIdentity),
    updated_at: new Date().toISOString(),
  });
  return toClientRoom(updated || room, user.id);
}

async function rerollAndRestartRoomForUser(user, code, body = {}) {
  const room = await loadRoomByCode(code);
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  const role = ensureRoomParticipant(room, user.id);
  if (role !== 'host') {
    throw new HttpError(403, 'Only the host can reroll the match.');
  }
  if (!room.guest_user_id) {
    throw new HttpError(409, 'Room needs an opponent before it can reroll and restart.');
  }

  const selectedSetName = String(body?.selectedSetName || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const currentScenario = room?.scenario && typeof room.scenario === 'object' ? room.scenario : {};
  const seedMode = normalizePvpSeedMode(currentScenario?.pvpSeedMode, room?.tier === 'expert_v2' ? 'random' : 'shared');
  const baseScenario = createChallengeScenario({
    tier: room.tier || 'beginner',
    generated: true,
    mode: 'pvp',
    selectedSetName,
    targetRelicOverride,
    excludeSeedId: currentScenario?.seedMeta?.id || null,
    excludeTemplateId: currentScenario?.templateMeta?.id || null,
  });
  const guestScenario = seedMode === 'random'
    ? createChallengeScenario({
        tier: room.tier || 'beginner',
        generated: true,
        mode: 'pvp',
        selectedSetName: selectedSetName || (baseScenario?.targetRelic?.setNameHint || baseScenario?.targetRelic?.setName || null),
        targetRelicOverride: baseScenario?.targetRelic || targetRelicOverride,
        preferredStyle: baseScenario?.expectedStyle || null,
        templateId: baseScenario?.templateMeta?.id || null,
        excludeSeedId: baseScenario?.seedMeta?.id || null,
      })
    : null;
  const scenario = buildPvpScenarioPayload(baseScenario, seedMode, guestScenario);
  const startedAt = new Date().toISOString();
  const hostIdentity = extractStateIdentity(room.host_state, room.host_name);
  const guestIdentity = extractStateIdentity(room.guest_state, room.guest_name || 'Opponent');
  const updated = await patchRoom(code, {
    status: 'countdown',
    difficulty: scenario.difficulty || room.tier,
    seed_label: scenario.seedLabel || '',
    scenario,
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: createPlayerState(room.host_name, hostIdentity),
    guest_state: createPlayerState(room.guest_name || 'Opponent', guestIdentity),
    updated_at: startedAt,
  });
  return toClientRoom(updated || room, user.id);
}

async function devFillRoomForUser(req, user, code, body = {}) {
  if (!isLocalDevRequest(req) && !isZoneAdminUser(user)) {
    throw new HttpError(403, 'Dev fill is only available on local development or admin accounts.');
  }

  const room = await loadRoomByCode(code);
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  const role = ensureRoomParticipant(room, user.id);
  if (role !== 'host') {
    throw new HttpError(403, 'Only the host can dev-fill the room.');
  }
  if (room.guest_user_id) {
    return toClientRoom(room, user.id);
  }

  const botKind = String(body?.botKind || 'oracle').trim().toLowerCase();
  const isFairBot = botKind === 'fair';
  const botName = isFairBot ? 'Clara Bot' : 'Svarog Bot';
  const updated = await patchRoom(code, {
    guest_user_id: isFairBot ? `dev-bot-fair:${room.code}` : `dev-bot:${room.code}`,
    guest_name: botName,
    guest_state: createPlayerState(botName),
    updated_at: new Date().toISOString(),
  });
  return toClientRoom(updated || room, user.id);
}

async function updateRoomStateForUser(user, code, body) {
  const room = await syncTimedOutActiveRoomIfNeeded(await syncBotRoomIfNeeded(await syncCountdownRoomIfNeeded(await loadRoomByCode(code))));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }

  const role = ensureRoomParticipant(room, user.id);
  const identity = resolveUserIdentity(user);
  const key = role === 'host' ? 'host_state' : 'guest_state';
  const currentState = room[key] && typeof room[key] === 'object' ? room[key] : createPlayerState();
  const nextState = normalizePlayerState({
    ...(body?.state && typeof body.state === 'object' ? body.state : {}),
    displayName: role === 'host' ? room.host_name : room.guest_name,
    displayTitleKey: identity.titleKey || currentState.displayTitleKey,
    displayTitle: identity.titleLabel || currentState.displayTitle,
    displayTitleRarity: identity.titleRarity || currentState.displayTitleRarity,
    displayBadgeKey: identity.badgeKey || currentState.displayBadgeKey,
    displayBadge: identity.badgeLabel || currentState.displayBadge,
    displayBadgeRarity: identity.badgeRarity || currentState.displayBadgeRarity,
    displayNameplateKey: identity.nameplateKey || currentState.displayNameplateKey,
    displayNameplate: identity.nameplateLabel || currentState.displayNameplate,
    displayNameplateRarity: identity.nameplateRarity || currentState.displayNameplateRarity,
    displayFrameKey: identity.frameKey || currentState.displayFrameKey,
    displayFrame: identity.frameLabel || currentState.displayFrame,
    displayFrameRarity: identity.frameRarity || currentState.displayFrameRarity,
  }, currentState);

  const patch = {
    [key]: nextState,
    updated_at: new Date().toISOString(),
  };

  const hostState = role === 'host' ? nextState : (room.host_state || createPlayerState(room.host_name));
  const guestState = role === 'guest' ? nextState : (room.guest_state || createPlayerState(room.guest_name));
  const outcome = resolveRoomOutcome(room, hostState, guestState);
  if (outcome) {
    patch.status = outcome.status;
    patch.winner_user_id = outcome.winnerUserId;
    patch.finished_at = outcome.finishedAt;
    if (outcome.hostState) patch.host_state = outcome.hostState;
    if (outcome.guestState) patch.guest_state = outcome.guestState;
  }

  const updated = await patchRoom(code, patch);
  return toClientRoom(updated || room, user.id);
}

async function getRoomForUser(user, code) {
  const room = await syncTimedOutActiveRoomIfNeeded(await syncBotRoomIfNeeded(await syncCountdownRoomIfNeeded(await loadRoomByCode(code))));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  ensureRoomParticipant(room, user.id);
  return toClientRoom(room, user.id);
}

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { user } = await requireAuthenticatedUser(req);
    const body = readBody(req);
    const action = String(req.query.action || body.action || (req.method === 'GET' ? 'get' : '')).trim().toLowerCase();
    const code = String(req.query.code || body.code || '').trim().toUpperCase();

    if (req.method === 'GET') {
      if (!code) {
        throw new HttpError(400, 'Room code is required.');
      }
      const room = await getRoomForUser(user, code);
      return res.status(200).json({ room });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (action === 'create') {
      const room = await createRoomForUser(user, body);
      return res.status(200).json({ room });
    }

    if (action === 'join') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await joinRoomForUser(user, code);
      return res.status(200).json({ room });
    }

    if (action === 'start') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await startRoomForUser(user, code);
      return res.status(200).json({ room });
    }

    if (action === 'restart') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await restartRoomForUser(user, code);
      return res.status(200).json({ room });
    }

    if (action === 'reroll') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await rerollRoomForUser(user, code, body);
      return res.status(200).json({ room });
    }

    if (action === 'reroll-restart') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await rerollAndRestartRoomForUser(user, code, body);
      return res.status(200).json({ room });
    }

    if (action === 'dev-fill') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await devFillRoomForUser(req, user, code, body);
      return res.status(200).json({ room });
    }

    if (action === 'update') {
      if (!code) throw new HttpError(400, 'Room code is required.');
      const room = await updateRoomStateForUser(user, code, body);
      return res.status(200).json({ room });
    }

    throw new HttpError(400, 'Unknown PvP action.');
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      error: error?.message || 'PvP request failed.',
      details: error?.details || null,
    });
  }
}
