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
import {
  extractDiscordDisplayName,
  HttpError,
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

function createPlayerState(name = '') {
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
    updatedAt: nowIso,
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
  return String(value || '').startsWith('dev-bot:');
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
  let relic = options?.startRelic ? cloneRelic(options.startRelic) : createBotTargetRelic(scenario);
  let profile = options?.startProfile ? cloneRelic(options.startProfile) : createScenarioPatternProfile(scenario);
  let carryLine = Number.isInteger(options?.startCarryLine) ? options.startCarryLine : null;
  const debugLog = Array.isArray(options?.debugLog) ? options.debugLog : null;
  const attemptNumber = Number(options?.attemptNumber || 1);
  const actions = Math.max(0, Math.min(5, Number(totalActions) || 0));

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
    const visibleRoll = getVisibleRollForUpgrade(profile, nextSequenceIndex);
    const previousLine = carryLine || relic.lastLine || 4;
    const predictor = config.pairAware
      ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
      : null;
    const defaultResolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
    const defaultStat = relic.lines.find((line) => line.slot === defaultResolution.targetSlot)?.stat || '';
    const defaultCandidate = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
    const nextProfile = advancePatternProfile(profile, visibleRoll);
    const currentAssessment = evaluateBotRelicState(relic, scenario, profile, config);
    const defaultImmediate = getActionCandidateScore(defaultCandidate, defaultStat, scenario, profile, config, false, predictor);
    const defaultFuture = config.searchDepth > 0
      ? searchBestBotFuture(defaultCandidate, nextProfile, defaultCandidate.lastLine || null, scenario, config, config.searchDepth)
      : defaultImmediate.totalScore;
    const defaultChoiceScore = defaultImmediate.totalScore * 0.4 + defaultFuture * 0.6;
    const forceLineCandidates = getBotForceLineCandidates(relic, scenario);
    let preferredForcedOption = null;
    let chosenForcedOption = null;

    forceLineCandidates.forEach((forceLine) => {
      const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
      const forcedStat = relic.lines.find((line) => line.slot === forcedResolution.targetSlot)?.stat || '';
      const forcedCandidate = applyBotUpgradeToSlot(relic, forcedResolution.targetSlot, forcedResolution.rawPair, visibleRoll);
      const forcedImmediate = getActionCandidateScore(forcedCandidate, forcedStat, scenario, profile, config, true, predictor);
      const forcedFuture = config.searchDepth > 0
        ? searchBestBotFuture(forcedCandidate, nextProfile, forcedCandidate.lastLine || null, scenario, config, config.searchDepth)
        : forcedImmediate.totalScore;
      const forcedChoiceScore = forcedImmediate.totalScore * 0.4 + forcedFuture * 0.6;
      const forceDecision = decideForceRoute({
        defaultEval: { ...defaultImmediate, totalScore: defaultChoiceScore },
        forcedEval: { ...forcedImmediate, totalScore: forcedChoiceScore },
        defaultStat,
        forcedStat,
        predictor,
        scenario,
        config,
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
    const comparedForceLine = comparedForcedOption?.forceLine ?? getBotForceLineCandidates(relic, scenario)[0] ?? 2;
    const decisionReason = comparedForcedOption?.forceDecision?.reason || 'no useful force route beat the default line.';

    pushBotDebug(debugLog, `Try ${attemptNumber}, step ${index + 1}: the visible roll was ${visibleRoll} and I was sitting on line ${previousLine}.`);
    pushBotDebug(debugLog, summarizeRecentHistory(profile));
    pushBotDebug(debugLog, `My own board read said commons ${Array.isArray(profile?.commons) ? profile.commons.join('/') : '-'}, noise ${Array.isArray(profile?.noise) ? profile.noise.join('/') : '-'}, dominant roll ${String(profile?.dominantRoll || 'none')}, and noise pressure ${Number(profile?.noisePressure || 0).toFixed(2)}.`);
    pushBotDebug(debugLog, summarizePredictor(predictor));
    pushBotDebug(debugLog, summarizeTrendRead(predictor));
    pushBotDebug(debugLog, summarizeChoice(defaultStat, defaultChoiceScore, comparedForcedStat, comparedForcedScore, shouldForce, comparedForceLine, config, scenario));
    pushBotDebug(debugLog, `Decision note: ${decisionReason}`);

    relic = shouldForce ? chosenForcedOption.forcedCandidate : defaultCandidate;
    profile = nextProfile;
    carryLine = relic.lastLine || carryLine || null;
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

function getBotConfig(tier, seedHash) {
  const base = BOT_TIER_CONFIG[String(tier || '').toLowerCase()] || BOT_TIER_CONFIG.beginner;
  return {
    ...base,
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

function getBotForceLineCandidates(relic, scenario) {
  if (!relic?.hasFourthLine) return [];
  const configuredForceLine = Math.min(
    Math.max(2, (Math.max(1, Math.min(3, Number(scenario?.forceRelic?.baseLines || 0) || 0)) + 1)),
    4
  );
  const monoTargetSlot = getMonoTargetSlotForRelic(relic, scenario);
  const candidates = [];
  if (Number.isInteger(monoTargetSlot) && monoTargetSlot >= 2 && monoTargetSlot <= 4) {
    candidates.push(monoTargetSlot);
  }
  candidates.push(configuredForceLine);
  if (scenario?.success?.type === 'monoLine') {
    candidates.push(2, 3, 4);
  }
  return [...new Set(candidates.filter((line) => Number.isInteger(line) && line >= 2 && line <= 4))];
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
  const desiredCarryLines = getDesiredCarryLinesForScenario(scenario);
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
  const defaultStat = relic.lines.find((line) => line.slot === defaultResolution.targetSlot)?.stat || '';
  const defaultRelic = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
  const defaultImmediate = getActionCandidateScore(defaultRelic, defaultStat, scenario, profile, config, false, predictor);
  const defaultFuture = searchBestBotFuture(defaultRelic, nextProfile, defaultRelic.lastLine || null, scenario, config, depth - 1);
  let bestScore = defaultImmediate.totalScore * 0.45 + defaultFuture * 0.55;

  const forceLineCandidates = getBotForceLineCandidates(relic, scenario);
  for (const forceLine of forceLineCandidates) {
    const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
    const forcedStat = relic.lines.find((line) => line.slot === forcedResolution.targetSlot)?.stat || '';
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
      const forcedScore = forcedImmediate.totalScore * 0.45 + forcedFuture * 0.55;
      if (forcedScore > bestScore) bestScore = forcedScore;
    }
  }

  return bestScore;
}

function shouldBotSubmitAttempt(attempt, attemptsUsed, config, retryCeiling = null, scenario = null) {
  if (!attempt) return false;
  if (config.strictGoal && !attempt.goalSatisfied) return false;
  const effectiveScore = Math.max(0, Number(attempt?.score || 0)) - (Math.max(0, Number(attempt?.mistakes || 0)) * MISTAKE_SCORE_PENALTY);
  const submitMargin = Math.max(0, Number(config?.submitMargin || 0) || 0);
  const ceilingMargin = Math.max(0, Number(config?.ceilingMargin || 0) || 0);
  const maxMistakesToSubmit = Math.max(0, Number(config?.maxMistakesToSubmit ?? 1) || 0);
  const scenarioMaxJunk = typeof scenario?.success?.maxJunk === 'number'
    ? Math.max(0, Number(scenario.success.maxJunk) || 0)
    : null;
  const allowedMistakes = scenarioMaxJunk === null
    ? maxMistakesToSubmit
    : Math.max(maxMistakesToSubmit, scenarioMaxJunk);
  const goalProgress = attempt?.goalProgress && typeof attempt.goalProgress === 'object' ? attempt.goalProgress : null;
  const perfectGoalCoverage = goalProgress ? goalProgress.missingGoalHits === 0 && goalProgress.missingRequiredCount === 0 : attempt.goalSatisfied;
  const decisionTotal = Number(attempt?.decisionTotal || 0);
  const closeToCeiling = Number.isFinite(Number(retryCeiling)) ? decisionTotal >= (Number(retryCeiling) - ceilingMargin) : false;
  if (
    attempt.goalSatisfied
    && attempt.helpfulHits >= config.minHelpful
    && effectiveScore >= (config.minScore + submitMargin)
    && Math.max(0, Number(attempt?.mistakes || 0)) <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && closeToCeiling
    && Math.max(0, Number(attempt?.mistakes || 0)) <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && perfectGoalCoverage
    && attempt.helpfulHits >= (config.minHelpful + 1)
    && Math.max(0, Number(attempt?.mistakes || 0)) <= allowedMistakes
  ) return true;
  if (
    attempt.goalSatisfied
    && attemptsUsed < MAX_RACE_TRIES
    && (attempt.grade === 'A' || attempt.grade === 'A+' || attempt.grade === 'S' || attempt.grade === 'S+' || attempt.grade === 'SS' || attempt.grade === 'SS+' || attempt.grade === 'SSS' || attempt.grade === 'SSS+')
    && Math.max(0, Number(attempt?.mistakes || 0)) <= allowedMistakes
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

  const leftScore = Math.max(0, Number(left?.score || 0)) - (Math.max(0, Number(left?.mistakes || 0)) * MISTAKE_SCORE_PENALTY);
  const rightScore = Math.max(0, Number(right?.score || 0)) - (Math.max(0, Number(right?.mistakes || 0)) * MISTAKE_SCORE_PENALTY);
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
  const hostGoal = Boolean(hostState?.finalGoalSatisfied ?? hostState?.goalSatisfied);
  const guestGoal = Boolean(guestState?.finalGoalSatisfied ?? guestState?.goalSatisfied);

  if (hostGoal && !guestGoal) return 'host';
  if (guestGoal && !hostGoal) return 'guest';
  if (!hostGoal && !guestGoal && ((hostSubmitted || hostBusted) && (guestSubmitted || guestBusted))) return null;

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
  const hostStatus = String(hostState?.status || '');
  const guestStatus = String(guestState?.status || '');
  const hostTerminal = hostStatus === 'submitted' || hostStatus === 'busted';
  const guestTerminal = guestStatus === 'submitted' || guestStatus === 'busted';
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
  const scenario = room?.scenario && typeof room.scenario === 'object' ? room.scenario : {};
  const seedLabel = String(scenario.seedLabel || room.seed_label || room.code || '');
  const seedHash = hashString(seedLabel);
  const config = getBotConfig(room?.tier, seedHash);
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
      sessionEntriesBuilt: Math.max(currentSessionEntries.length, sessionArchive.length),
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
    sessionEntriesBuilt: Math.max(currentSessionEntries.length, sessionArchive.length),
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
    relicSummary: summaryText,
    debugLog,
    displayName: room.guest_name || 'Svarog Bot',
    updatedAt: new Date().toISOString(),
  });

  while (attemptsUsed <= MAX_RACE_TRIES) {
    pushBotDebug(debugLog, `Try ${attemptsUsed}: evaluating room ${room.code} on ${room.tier || 'beginner'} with seed ${seedLabel}.`);
    if (scenario?.targetStatGuide) {
      const sTier = Array.isArray(scenario.targetStatGuide.s) && scenario.targetStatGuide.s.length > 0 ? scenario.targetStatGuide.s.join(', ') : 'none';
      const aTier = Array.isArray(scenario.targetStatGuide.a) && scenario.targetStatGuide.a.length > 0 ? scenario.targetStatGuide.a.join(', ') : 'none';
      const trashTier = Array.isArray(scenario.targetStatGuide.trash) && scenario.targetStatGuide.trash.length > 0 ? scenario.targetStatGuide.trash.join(', ') : 'none';
      pushBotDebug(debugLog, `For this relic, I rate S-tier stats as ${sTier}; A-tier stats as ${aTier}; and trash stats as ${trashTier}.`);
    }
    const totalActionsAvailable = Math.max(0, Math.floor(remainingSeconds / config.stepSeconds));

    if (totalActionsAvailable <= 0) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: not enough elapsed time to act yet.`);
      break;
    }

    let actionsThisAttempt = Math.max(0, Math.min(5, totalActionsAvailable));

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
        actionsThisAttempt = Math.max(0, Math.min(5, Math.floor(remainingSeconds / config.stepSeconds)));

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
          remainingSeconds = Math.max(0, remainingSeconds - config.retryDelay);
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
            remainingSeconds = Math.max(0, remainingSeconds - config.retryDelay);
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
          sessionEntriesBuilt: builtEntries,
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
      config,
      debugLog,
      attemptNumber: attemptsUsed,
    });

    currentRelic = simulation.relic;
    currentProfile = simulation.profile;
    currentCarryLine = simulation.carryLine;
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
        sessionEntriesBuilt: Math.max(currentSessionEntries.length, sessionArchive.length),
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

    if (remainingSeconds < config.retryDelay) {
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
        sessionEntriesBuilt: Math.max(currentSessionEntries.length, sessionArchive.length),
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
    remainingSeconds = Math.max(0, remainingSeconds - config.retryDelay);
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
    sessionEntriesBuilt: Math.max(currentSessionEntries.length, sessionArchive.length),
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
  }

  const updated = await patchRoom(room.code, patch);
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

  return {
    code: row.code,
    status: row.status,
    tier: row.tier,
    difficulty: row.difficulty,
    seedLabel: row.seed_label,
    scenario: row.scenario,
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
  const selectedSetName = String(body?.selectedSetName || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const scenario = sanitizeScenario(
    body?.scenario && typeof body.scenario === 'object'
      ? body.scenario
      : createChallengeScenario({ tier, generated: true, mode: 'pvp', selectedSetName, targetRelicOverride })
  );
  const displayName = normalizeName(user);

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
      host_name: displayName,
      guest_user_id: null,
      guest_name: null,
      host_state: createPlayerState(displayName),
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

  const displayName = normalizeName(user);
  const nextGuestState = createPlayerState(displayName);
  const updated = await patchRoom(code, {
    guest_user_id: user.id,
    guest_name: displayName,
    guest_state: nextGuestState,
    updated_at: new Date().toISOString(),
  });
  return toClientRoom(updated || room, user.id);
}

async function startRoomForUser(user, code) {
  const room = await syncBotRoomIfNeeded(await loadRoomByCode(code));
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
  const updated = await patchRoom(code, {
    status: 'active',
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: normalizePlayerState({ status: 'attempting', tries: 1, attemptsUsed: 1, submittedAttempts: 0, mistakes: 0 }, room.host_state),
    guest_state: normalizePlayerState({ status: 'attempting', tries: 1, attemptsUsed: 1, submittedAttempts: 0, mistakes: 0 }, room.guest_state),
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

  const startedAt = new Date().toISOString();
  const updated = await patchRoom(code, {
    status: 'active',
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: createPlayerState(room.host_name),
    guest_state: createPlayerState(room.guest_name || 'Opponent'),
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

  const selectedSetName = String(body?.selectedSetName || room?.scenario?.targetRelic?.setNameHint || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const scenario = createChallengeScenario({ tier: room.tier || 'beginner', generated: true, mode: 'pvp', selectedSetName, targetRelicOverride });
  const updated = await patchRoom(code, {
    difficulty: scenario.difficulty || room.tier,
    seed_label: scenario.seedLabel || '',
    scenario,
    winner_user_id: null,
    started_at: null,
    finished_at: null,
    host_state: createPlayerState(room.host_name),
    guest_state: createPlayerState(room.guest_name || 'Opponent'),
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

  const selectedSetName = String(body?.selectedSetName || room?.scenario?.targetRelic?.setNameHint || '').trim() || null;
  const targetRelicOverride =
    body?.targetRelicOverride && typeof body.targetRelicOverride === 'object'
      ? body.targetRelicOverride
      : null;
  const scenario = createChallengeScenario({ tier: room.tier || 'beginner', generated: true, mode: 'pvp', selectedSetName, targetRelicOverride });
  const startedAt = new Date().toISOString();
  const updated = await patchRoom(code, {
    status: 'active',
    difficulty: scenario.difficulty || room.tier,
    seed_label: scenario.seedLabel || '',
    scenario,
    started_at: startedAt,
    finished_at: null,
    winner_user_id: null,
    host_state: normalizePlayerState({ status: 'attempting', tries: 1, attemptsUsed: 1, submittedAttempts: 0, mistakes: 0 }, createPlayerState(room.host_name)),
    guest_state: normalizePlayerState({ status: 'attempting', tries: 1, attemptsUsed: 1, submittedAttempts: 0, mistakes: 0 }, createPlayerState(room.guest_name || 'Opponent')),
    updated_at: startedAt,
  });
  return toClientRoom(updated || room, user.id);
}

async function devFillRoomForUser(req, user, code) {
  if (!isLocalDevRequest(req)) {
    throw new HttpError(403, 'Dev fill is only available on local development.');
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

  const botName = 'Svarog Bot';
  const updated = await patchRoom(code, {
    guest_user_id: `dev-bot:${room.code}`,
    guest_name: botName,
    guest_state: createPlayerState(botName),
    updated_at: new Date().toISOString(),
  });
  return toClientRoom(updated || room, user.id);
}

async function updateRoomStateForUser(user, code, body) {
  const room = await syncBotRoomIfNeeded(await loadRoomByCode(code));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }

  const role = ensureRoomParticipant(room, user.id);
  const key = role === 'host' ? 'host_state' : 'guest_state';
  const currentState = room[key] && typeof room[key] === 'object' ? room[key] : createPlayerState();
  const nextState = normalizePlayerState({
    ...(body?.state && typeof body.state === 'object' ? body.state : {}),
    displayName: role === 'host' ? room.host_name : room.guest_name,
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
  }

  const updated = await patchRoom(code, patch);
  return toClientRoom(updated || room, user.id);
}

async function getRoomForUser(user, code) {
  const room = await syncBotRoomIfNeeded(await loadRoomByCode(code));
  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }
  ensureRoomParticipant(room, user.id);
  return toClientRoom(room, user.id);
}

export async function handler(req, res) {
  setCorsHeaders(res);

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
      const room = await devFillRoomForUser(req, user, code);
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
