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
const BOT_TIER_CONFIG = {
  new_player: { baseStep: 6, jitter: 2, minScore: 0, minHelpful: 0, scoreBias: false, trendAware: false, historyAware: false, pairAware: false, searchDepth: 0, forceBonus: 1, helpfulBonus: 5, junkPenalty: 4, neutralPenalty: 0, noisePenalty: 0.25, commonsBonus: 0.25, dominantBonus: 0.15, scoreWeight: 1, strictGoal: false },
  beginner: { baseStep: 5, jitter: 2, minScore: 18, minHelpful: 1, scoreBias: false, trendAware: false, historyAware: false, pairAware: true, searchDepth: 0, forceBonus: 2, helpfulBonus: 7, junkPenalty: 5, neutralPenalty: 0.5, noisePenalty: 0.5, commonsBonus: 0.5, dominantBonus: 0.4, scoreWeight: 0.9, strictGoal: false },
  intermediate: { baseStep: 4, jitter: 2, minScore: 24, minHelpful: 1, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 1, forceBonus: 3, helpfulBonus: 10, junkPenalty: 8, neutralPenalty: 1.5, noisePenalty: 1, commonsBonus: 1.25, dominantBonus: 0.75, scoreWeight: 0.8, strictGoal: true },
  veteran: { baseStep: 4, jitter: 1, minScore: 28, minHelpful: 2, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 2, forceBonus: 4, helpfulBonus: 13, junkPenalty: 10, neutralPenalty: 2.25, noisePenalty: 1.5, commonsBonus: 1.75, dominantBonus: 1.15, scoreWeight: 0.68, strictGoal: true },
  expert: { baseStep: 3, jitter: 1, minScore: 32, minHelpful: 2, scoreBias: true, trendAware: true, historyAware: true, pairAware: true, searchDepth: 3, forceBonus: 5, helpfulBonus: 16, junkPenalty: 12, neutralPenalty: 3, noisePenalty: 2, commonsBonus: 2.25, dominantBonus: 1.5, scoreWeight: 0.58, strictGoal: true },
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
    finalStatBreakdown: {},
    finalRelicSnapshot: null,
    finalRelicSummary: '',
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

function simulateBotTargetRelic(scenario, totalActions, options = {}) {
  const config = options?.config || BOT_TIER_CONFIG.beginner;
  let relic = options?.startRelic ? cloneRelic(options.startRelic) : createBotTargetRelic(scenario);
  let profile = options?.startProfile ? cloneRelic(options.startProfile) : createScenarioPatternProfile(scenario);
  let carryLine = Number.isInteger(options?.startCarryLine) ? options.startCarryLine : null;
  const debugLog = Array.isArray(options?.debugLog) ? options.debugLog : null;
  const attemptNumber = Number(options?.attemptNumber || 1);
  const actions = Math.max(0, Math.min(5, Number(totalActions) || 0));
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const forceBaseLines = Math.max(1, Math.min(3, Number(scenario?.forceRelic?.baseLines || 0) || 0));
  const forceLine = Math.min(forceBaseLines + 1, 4);

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
    const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
    const defaultStat = relic.lines.find((line) => line.slot === defaultResolution.targetSlot)?.stat || '';
    const forcedStat = relic.lines.find((line) => line.slot === forcedResolution.targetSlot)?.stat || '';
    const defaultCandidate = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
    const forcedCandidate = applyBotUpgradeToSlot(relic, forcedResolution.targetSlot, forcedResolution.rawPair, visibleRoll);
    const nextProfile = advancePatternProfile(profile, visibleRoll);
    const defaultImmediate = getActionCandidateScore(defaultCandidate, defaultStat, success, profile, config, false, predictor);
    const forcedImmediate = getActionCandidateScore(forcedCandidate, forcedStat, success, profile, config, true, predictor);
    const defaultFuture = config.searchDepth > 0
      ? searchBestBotFuture(defaultCandidate, nextProfile, defaultCandidate.lastLine || null, scenario, config, config.searchDepth)
      : defaultImmediate;
    const forcedFuture = config.searchDepth > 0
      ? searchBestBotFuture(forcedCandidate, nextProfile, forcedCandidate.lastLine || null, scenario, config, config.searchDepth)
      : forcedImmediate;
    const defaultChoiceScore = defaultImmediate * 0.4 + defaultFuture * 0.6;
    const forcedChoiceScore = forcedImmediate * 0.4 + forcedFuture * 0.6;
    const shouldForce = relic.hasFourthLine && forcedChoiceScore > defaultChoiceScore;

    pushBotDebug(debugLog, `Try ${attemptNumber}, step ${index + 1}: the visible roll was ${visibleRoll} and I was sitting on line ${previousLine}.`);
    pushBotDebug(debugLog, summarizeRecentHistory(profile));
    pushBotDebug(debugLog, `My own board read said commons ${Array.isArray(profile?.commons) ? profile.commons.join('/') : '-'}, noise ${Array.isArray(profile?.noise) ? profile.noise.join('/') : '-'}, dominant roll ${String(profile?.dominantRoll || 'none')}, and noise pressure ${Number(profile?.noisePressure || 0).toFixed(2)}.`);
    pushBotDebug(debugLog, summarizePredictor(predictor));
    pushBotDebug(debugLog, summarizeTrendRead(predictor));
    pushBotDebug(debugLog, summarizeChoice(defaultStat, defaultChoiceScore, forcedStat, forcedChoiceScore, shouldForce, forceLine, config));

    relic = shouldForce ? forcedCandidate : defaultCandidate;
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

function summarizeChoice(defaultStat, defaultScore, forcedStat, forcedScore, shouldForce, forceLine, config) {
  const searchNote = config.searchDepth > 0
    ? `I also searched ${config.searchDepth} move${config.searchDepth > 1 ? 's' : ''} ahead before picking.`
    : 'I judged the move from the immediate board state only.';
  return `I compared staying on the current line into ${defaultStat || 'unknown'} (${defaultScore.toFixed(2)}) against forcing line ${forceLine} into ${forcedStat || 'unknown'} (${forcedScore.toFixed(2)}). ${searchNote} I chose ${shouldForce ? `the forced route because it projected the stronger outcome` : `the default route because it projected the stronger outcome`}.`;
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

function getActionCandidateScore(candidateRelic, stat, success, profile, config, usedForce, predictor) {
  const relicScore = scoreRelicWithProfile(candidateRelic, detectRelicScoreProfile(candidateRelic));
  const isHelpful = isHelpfulStatForScenario(stat, success);
  const junkStats = Array.isArray(success?.junk) ? success.junk : [];
  const isJunk = junkStats.includes(stat);
  const isNeutral = isNeutralStatForScenario(stat, success);
  let score = relicScore.score * Number(config.scoreWeight || 1);

  if (isHelpful) score += config.helpfulBonus || 8;
  if (isJunk) score -= config.junkPenalty || 6;
  if (isNeutral) score -= config.neutralPenalty || 0;

  if (config.scoreBias) {
    if (usedForce && isHelpful) score += config.forceBonus || 3;
    if (usedForce && isJunk) score -= Math.max(1, (config.forceBonus || 3) - 1);
    if (usedForce && isNeutral) score -= 0.5;
  }

  if (config.trendAware) {
    const commons = Array.isArray(profile?.commons) ? profile.commons : [];
    const noise = Array.isArray(profile?.noise) ? profile.noise : [];
    const dominantRoll = String(profile?.dominantRoll || '');
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    if (commons.includes(visibleRoll)) score += config.commonsBonus || 1.5;
    if (noise.includes(visibleRoll)) score -= config.noisePenalty || 1.25;
    if (dominantRoll === visibleRoll) score += config.dominantBonus || 1;
    if (Number(profile?.noisePressure || 0) > 3 && !usedForce) score -= (config.noisePenalty || 1.25) * 0.75;
  }

  if (config.historyAware) {
    const history = Array.isArray(profile?.history) ? profile.history.slice(-6) : [];
    const recentMatches = history.filter((roll) => String(roll) === String(candidateRelic.lastVisibleRoll || '')).length;
    const uniqueCount = new Set(history).size;
    score += recentMatches * 0.45;
    if (uniqueCount <= 2 && isHelpful) score += 1.25;
    if (uniqueCount >= 4 && isJunk) score -= 1.1;
  }

  if (config.pairAware) {
    const commons = Array.isArray(profile?.commons) ? profile.commons : [];
    const noise = Array.isArray(profile?.noise) ? profile.noise : [];
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    const currentLine = Number(candidateRelic.lastLine || 0);
    if (commons.includes(visibleRoll) && currentLine > 0) score += 0.5;
    if (noise.includes(visibleRoll) && currentLine > 0 && isJunk) score -= 1.5;
  }

  if (predictor && config.pairAware) {
    const visibleRoll = String(candidateRelic.lastVisibleRoll || '');
    const trustedPair = Array.isArray(predictor?.trustedPair) ? predictor.trustedPair : [];
    const noiseValues = Array.isArray(predictor?.noise) ? predictor.noise : [];
    const noiseRisk = Number(predictor?.noiseRisk || 0);
    const pairSafety = String(predictor?.pairSafety || '');
    if (trustedPair.includes(visibleRoll)) score += 2.5;
    if (noiseValues.includes(visibleRoll)) score -= 2;
    if (noiseRisk >= 60 && !usedForce) score -= 1.5;
    if (pairSafety === 'safe' && trustedPair.includes(visibleRoll)) score += 1;
    if (pairSafety === 'danger' && noiseValues.includes(visibleRoll)) score -= 1.25;
  }

  return score;
}

function evaluateBotRelicState(relic, scenario, profile, config) {
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  const requiredStats = getRequiredStatsForScenario(success);
  const statBreakdown = [...relic.lines, relic.fourthLine].reduce((acc, line) => {
    acc[line.stat] = Number(line.hits || 0);
    return acc;
  }, {});
  const helpfulHits = success.type === 'monoLine'
    ? Math.max(0, Number(statBreakdown?.[success.target] || 0))
    : Array.isArray(success.required)
      ? success.required.reduce((sum, stat) => sum + Math.max(0, Number(statBreakdown?.[stat] || 0)), 0)
      : 0;
  const junkStats = Array.isArray(success.junk) ? success.junk : [];
  const junkHits = junkStats.reduce((sum, stat) => sum + Math.max(0, Number(statBreakdown?.[stat] || 0)), 0);
  const requiredCoverage = requiredStats.reduce((sum, stat) => sum + (Number(statBreakdown?.[stat] || 0) > 0 ? 1 : 0), 0);
  const neutralHits = Object.entries(statBreakdown).reduce((sum, [stat, count]) => (
    isNeutralStatForScenario(stat, success) ? sum + Math.max(0, Number(count || 0)) : sum
  ), 0);
  const relicScore = scoreRelicWithProfile(relic, detectRelicScoreProfile(relic));
  let total = relicScore.score * Number(config.scoreWeight || 1)
    + helpfulHits * (config.helpfulBonus || 8)
    - junkHits * (config.junkPenalty || 6)
    - neutralHits * (config.neutralPenalty || 0);
  if (requiredCoverage > 0) total += requiredCoverage * ((config.helpfulBonus || 8) * 0.7);
  if (requiredCoverage === requiredStats.length && requiredStats.length > 1) total += config.forceBonus || 3;
  if (evaluateScenarioSuccess(scenario, statBreakdown)) total += 16;
  if (config.strictGoal && requiredStats.length > 0 && requiredCoverage === 0) total -= 10;
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
    relicScore,
  };
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
  const forceBaseLines = Math.max(1, Math.min(3, Number(scenario?.forceRelic?.baseLines || 0) || 0));
  const forceLine = Math.min(forceBaseLines + 1, 4);
  const predictor = config.pairAware
    ? predictWithPairs(Array.isArray(profile?.history) ? profile.history : [], { region: scenario?.region || 'America' })
    : null;
  const nextProfile = advancePatternProfile(profile, visibleRoll);

  const defaultResolution = resolveNextSlotFromVisibleRoll(previousLine, visibleRoll);
  const defaultStat = relic.lines.find((line) => line.slot === defaultResolution.targetSlot)?.stat || '';
  const defaultRelic = applyBotUpgradeToSlot(relic, defaultResolution.targetSlot, defaultResolution.rawPair, visibleRoll);
  const defaultImmediate = getActionCandidateScore(defaultRelic, defaultStat, scenario?.success || {}, profile, config, false, predictor);
  const defaultFuture = searchBestBotFuture(defaultRelic, nextProfile, defaultRelic.lastLine || null, scenario, config, depth - 1);
  let bestScore = defaultImmediate * 0.45 + defaultFuture * 0.55;

  if (relic.hasFourthLine) {
    const forcedResolution = resolveNextSlotFromVisibleRoll(forceLine, visibleRoll);
    const forcedStat = relic.lines.find((line) => line.slot === forcedResolution.targetSlot)?.stat || '';
    const forcedRelic = applyBotUpgradeToSlot(relic, forcedResolution.targetSlot, forcedResolution.rawPair, visibleRoll);
    const forcedImmediate = getActionCandidateScore(forcedRelic, forcedStat, scenario?.success || {}, profile, config, true, predictor);
    const forcedFuture = searchBestBotFuture(forcedRelic, nextProfile, forcedRelic.lastLine || null, scenario, config, depth - 1);
    const forcedScore = forcedImmediate * 0.45 + forcedFuture * 0.55;
    if (forcedScore > bestScore) bestScore = forcedScore;
  }

  return bestScore;
}

function shouldBotSubmitAttempt(attempt, attemptsUsed, config) {
  if (!attempt) return false;
  if (attemptsUsed >= MAX_RACE_TRIES) return true;
  if (config.strictGoal && !attempt.goalSatisfied) return false;
  if (attempt.goalSatisfied && attempt.helpfulHits >= config.minHelpful && attempt.score >= config.minScore) return true;
  if (attempt.grade === 'SSS' || attempt.grade === 'SS') return true;
  if (String(config.historyAware || false) === 'true' || config.historyAware) {
    if (attempt.goalSatisfied && attempt.grade === 'S') return true;
  }
  return false;
}

function compareAttemptPayload(left = {}, right = {}) {
  const leftScore = Math.max(0, Number(left?.score || 0));
  const rightScore = Math.max(0, Number(right?.score || 0));
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

function compareStatesForWinner(hostState, guestState) {
  const hostSubmitted = String(hostState?.status || '') === 'submitted';
  const guestSubmitted = String(guestState?.status || '') === 'submitted';
  const hostBusted = String(hostState?.status || '') === 'busted';
  const guestBusted = String(guestState?.status || '') === 'busted';

  if (hostSubmitted && guestBusted) return 'host';
  if (guestSubmitted && hostBusted) return 'guest';

  if (hostSubmitted && guestSubmitted) {
    const comparison = compareAttemptPayload({
      score: hostState?.finalScore,
      helpfulHits: hostState?.finalHelpfulHits,
      mistakes: hostState?.finalMistakes,
      rollCount: hostState?.finalRollCount,
    }, {
      score: guestState?.finalScore,
      helpfulHits: guestState?.finalHelpfulHits,
      mistakes: guestState?.finalMistakes,
      rollCount: guestState?.finalRollCount,
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
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const scenario = room?.scenario && typeof room.scenario === 'object' ? room.scenario : {};
  const seedLabel = String(scenario.seedLabel || room.seed_label || room.code || '');
  const seedHash = hashString(seedLabel);
  const config = getBotConfig(room?.tier, seedHash);
  const debugLog = [];
  const success = scenario?.success && typeof scenario.success === 'object' ? scenario.success : {};
  let remainingSeconds = elapsedSeconds;
  let attemptsUsed = 1;
  let bestAttempt = null;
  let currentProfile = createScenarioPatternProfile(scenario);
  let currentCarryLine = null;
  let currentRelic = createBotTargetRelic(scenario);

  while (attemptsUsed <= MAX_RACE_TRIES) {
    pushBotDebug(debugLog, `Try ${attemptsUsed}: evaluating room ${room.code} on ${room.tier || 'beginner'} with seed ${seedLabel}.`);
    const actionsThisAttempt = Math.max(0, Math.min(5, Math.floor(remainingSeconds / config.stepSeconds)));

    if (actionsThisAttempt <= 0) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: not enough elapsed time to act yet.`);
      break;
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
    const relicScore = scoreRelicWithProfile(currentRelic, detectRelicScoreProfile(currentRelic));
    const attempt = {
      score: relicScore.score,
      grade: relicScore.grade,
      helpfulHits,
      mistakes,
      rollCount: relicScore.rollCount,
      statBreakdown,
      goalSatisfied,
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
        bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
        bestGrade: String(bestAttempt?.grade || 'F'),
        bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
        bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
        bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
        bestStatBreakdown: bestAttempt?.statBreakdown || {},
        bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
        bestRelicSummary: bestAttempt?.relicSummary || '',
        relicSummary: `Bot is building try ${attemptsUsed} at +${currentRelic.level}.`,
        debugLog,
        displayName: room.guest_name || 'Svarog Bot',
        updatedAt: new Date().toISOString(),
      };
    }

    if (shouldBotSubmitAttempt(attempt, attemptsUsed, config)) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: submitted. Reason => score ${attempt.score}, grade ${attempt.grade}, helpful ${attempt.helpfulHits}, goal=${attempt.goalSatisfied ? 'yes' : 'no'}.`);
      return {
        ...createPlayerState(room.guest_name || 'Svarog Bot'),
        status: 'submitted',
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
        submittedAttempts: 1,
        finalScore: relicScore.score,
        finalGrade: relicScore.grade,
        finalRollCount: relicScore.rollCount,
        finalHelpfulHits: helpfulHits,
        finalMistakes: mistakes,
        finalStatBreakdown: statBreakdown,
        finalRelicSnapshot: cloneRelic(currentRelic),
        finalRelicSummary: `Bot submitted try ${attemptsUsed} at +15.`,
        bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
        bestGrade: String(bestAttempt?.grade || 'F'),
        bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
        bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
        bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
        bestStatBreakdown: bestAttempt?.statBreakdown || {},
        bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
        bestRelicSummary: bestAttempt?.relicSummary || '',
        relicSummary: `Bot submitted its final relic on try ${attemptsUsed}.`,
        debugLog,
        displayName: room.guest_name || 'Svarog Bot',
        updatedAt: new Date().toISOString(),
      };
    }

    if (attemptsUsed >= MAX_RACE_TRIES) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: busted. Failed to find a submit-worthy relic before exhausting retries.`);
      return {
        ...createPlayerState(room.guest_name || 'Svarog Bot'),
        status: 'busted',
        currentLevel: currentRelic.level,
        helpfulHits,
        hp: Math.max(0, 100 - helpfulHits * 25),
        tries: MAX_RACE_TRIES + 1,
        mistakes,
        score: relicScore.score,
        grade: relicScore.grade,
        rollCount: relicScore.rollCount,
        statBreakdown,
        goalSatisfied,
        attemptsUsed: MAX_RACE_TRIES + 1,
        submittedAttempts: 0,
        bestScore: Math.max(0, Number(bestAttempt?.score || 0)),
        bestGrade: String(bestAttempt?.grade || 'F'),
        bestRollCount: Math.max(0, Number(bestAttempt?.rollCount || 0)),
        bestHelpfulHits: Math.max(0, Number(bestAttempt?.helpfulHits || 0)),
        bestMistakes: Math.max(0, Number(bestAttempt?.mistakes || 0)),
        bestStatBreakdown: bestAttempt?.statBreakdown || {},
        bestRelicSnapshot: bestAttempt?.relicSnapshot || null,
        bestRelicSummary: bestAttempt?.relicSummary || '',
        relicSummary: `Bot busted after failing to improve through ${MAX_RACE_TRIES} tries.`,
        debugLog,
        displayName: room.guest_name || 'Svarog Bot',
        updatedAt: new Date().toISOString(),
      };
    }

    if (remainingSeconds < config.retryDelay) {
      pushBotDebug(debugLog, `Try ${attemptsUsed}: reached +15 but is holding. Waiting for retry window before deciding reset.`);
      return {
        ...createPlayerState(room.guest_name || 'Svarog Bot'),
        status: 'maxed',
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
  }

  return {
    ...createPlayerState(room.guest_name || 'Svarog Bot'),
    status: 'attempting',
    currentLevel: currentRelic.level,
    attemptsUsed,
    tries: attemptsUsed,
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

  const nextGuestState = buildBotState(room);
  if (!nextGuestState) return room;

  const currentGuestState = room.guest_state && typeof room.guest_state === 'object' ? room.guest_state : {};
  const currentSignature = JSON.stringify({
    status: currentGuestState.status || '',
    currentLevel: Number(currentGuestState.currentLevel || 0),
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
  const scenario = sanitizeScenario(
    body?.scenario && typeof body.scenario === 'object'
      ? body.scenario
      : createChallengeScenario({ tier, generated: true, mode: 'pvp', selectedSetName })
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
  const scenario = createChallengeScenario({ tier: room.tier || 'beginner', generated: true, mode: 'pvp', selectedSetName });
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
  const scenario = createChallengeScenario({ tier: room.tier || 'beginner', generated: true, mode: 'pvp', selectedSetName });
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
