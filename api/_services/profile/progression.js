import {
  HttpError,
  supabaseAdminRequest,
} from '../zone/shared.js';
import {
  ACHIEVEMENT_DEFINITIONS,
  RANK_TIER_DEFINITIONS,
  REWARD_DEFINITIONS,
  TITLE_DEFINITIONS,
  getTotalXpRequiredForLevel,
  resolveRankTier,
} from '../../../src/utils/progressionCatalog.js';

const env = globalThis.process?.env || {};

const USER_TITLES_TABLE = env.SUPABASE_USER_TITLES_TABLE || 'user_titles';
const USER_ACHIEVEMENTS_TABLE = env.SUPABASE_USER_ACHIEVEMENTS_TABLE || 'user_achievements';
const USER_REWARDS_TABLE = env.SUPABASE_USER_REWARDS_TABLE || 'user_rewards';
const USER_WALLETS_TABLE = env.SUPABASE_USER_WALLETS_TABLE || 'user_wallets';
const USER_MARKET_ITEMS_TABLE = env.SUPABASE_USER_MARKET_ITEMS_TABLE || 'user_market_items';
const CHALLENGE_RESULTS_TABLE = env.SUPABASE_CHALLENGE_RESULTS_TABLE || 'challenge_results';
const PRACTICE_RESULTS_TABLE = env.SUPABASE_PRACTICE_RESULTS_TABLE || 'practice_results';
const FETCH_PAGE_SIZE = 200;

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatProgressLabel(value, target, format = 'count') {
  if (format === 'score') {
    return `${normalizeNumber(value, 0).toFixed(1)} / ${target}`;
  }
  return `${Math.min(normalizeNumber(value, 0), target)} / ${target}`;
}

function isMissingTableError(error) {
  const details = error?.details;
  if (details && typeof details === 'object') {
    if (String(details.code || '').trim() === '42P01') return true;
    const raw = `${details.message || ''} ${details.details || ''} ${details.hint || ''}`.toLowerCase();
    if (raw.includes('relation') && raw.includes('does not exist')) return true;
  }
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('42p01') || (raw.includes('relation') && raw.includes('does not exist'));
}

function isUniqueViolationError(error) {
  if (Number(error?.status) === 409) return true;
  const details = error?.details;
  if (details && typeof details === 'object') {
    if (String(details.code || '').trim() === '23505') return true;
    const raw = `${details.message || ''} ${details.details || ''} ${details.hint || ''}`.toLowerCase();
    if (raw.includes('duplicate') || raw.includes('unique')) return true;
  }
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('23505') || raw.includes('duplicate') || raw.includes('unique');
}

function buildUnlockListPath(table, userId) {
  const params = [
    ['select', 'id,key,unlocked_at,source_season,source_snapshot'],
    ['user_id', `eq.${userId}`],
    ['order', 'unlocked_at.asc'],
    ['limit', String(FETCH_PAGE_SIZE)],
  ];
  return `${table}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function buildRewardListPath(userId) {
  const params = [
    ['select', 'id,key,claimed_at,source_season,source_snapshot'],
    ['user_id', `eq.${userId}`],
    ['order', 'claimed_at.asc'],
    ['limit', String(FETCH_PAGE_SIZE)],
  ];
  return `${USER_REWARDS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function buildWalletPath(userId) {
  return `${USER_WALLETS_TABLE}?${[
    ['select', 'user_id,token_balance,updated_at'],
    ['user_id', `eq.${userId}`],
    ['limit', '1'],
  ].map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function buildChallengeRowsPath(userId, season) {
  const params = [
    ['select', 'id,contract_id,score,helpful_hits,mistakes,clear_time_seconds,generated,created_at'],
    ['user_id', `eq.${userId}`],
    ['created_at', `gte.${season.startAt}`],
    ['created_at', `lt.${season.endAt}`],
    ['order', 'created_at.desc'],
    ['limit', '200'],
  ];
  return `${CHALLENGE_RESULTS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function buildPracticeRowsPath(userId, season) {
  const params = [
    ['select', 'id,mode,session_key,score,success,source_mode,rows_count,detail,created_at'],
    ['user_id', `eq.${userId}`],
    ['created_at', `gte.${season.startAt}`],
    ['created_at', `lt.${season.endAt}`],
    ['order', 'created_at.desc'],
    ['limit', '300'],
  ];
  return `${PRACTICE_RESULTS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function compareChallengeRows(left, right) {
  const scoreDiff = normalizeNumber(left?.score, 0) - normalizeNumber(right?.score, 0);
  if (scoreDiff !== 0) return scoreDiff;

  const leftTime = normalizeNumber(left?.clear_time_seconds, 0);
  const rightTime = normalizeNumber(right?.clear_time_seconds, 0);
  const leftHasTime = leftTime > 0;
  const rightHasTime = rightTime > 0;
  if (leftHasTime !== rightHasTime) return leftHasTime ? 1 : -1;
  if (leftHasTime && rightHasTime && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const helpfulDiff = normalizeNumber(left?.helpful_hits, 0) - normalizeNumber(right?.helpful_hits, 0);
  if (helpfulDiff !== 0) return helpfulDiff;

  const mistakesDiff = normalizeNumber(right?.mistakes, 0) - normalizeNumber(left?.mistakes, 0);
  if (mistakesDiff !== 0) return mistakesDiff;

  return new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime();
}

function summarizeChallengeRows(rows) {
  const handcraftedBestByContract = new Map();
  let generatedClears = 0;
  let bestScore = 0;
  let fastestClearSeconds = null;

  for (const row of Array.isArray(rows) ? rows : []) {
    const score = normalizeNumber(row?.score, 0);
    bestScore = Math.max(bestScore, score);

    const clearTimeSeconds = normalizeNumber(row?.clear_time_seconds, 0);
    if (clearTimeSeconds > 0) {
      fastestClearSeconds = fastestClearSeconds === null
        ? clearTimeSeconds
        : Math.min(fastestClearSeconds, clearTimeSeconds);
    }

    if (row?.generated) {
      generatedClears += 1;
      continue;
    }

    const contractId = String(row?.contract_id || '').trim();
    if (!contractId) continue;

    const currentBest = handcraftedBestByContract.get(contractId);
    if (!currentBest || compareChallengeRows(row, currentBest) > 0) {
      handcraftedBestByContract.set(contractId, row);
    }
  }

  return {
    solvedChallengeCount: handcraftedBestByContract.size,
    generatedClears,
    bestChallengeScore: bestScore,
    fastestClearSeconds,
    handcraftedBestRows: Array.from(handcraftedBestByContract.values()),
    rows: Array.isArray(rows) ? rows : [],
  };
}

function summarizePracticeRows(rows) {
  const summary = {
    freeTrainingSessions: 0,
    freeTrainingMaxed: 0,
    freeTrainingBestScore: 0,
    drillsClears: 0,
    drillsPerfectClears: 0,
    drillsBestScore: 0,
    patternLabAnalyses: 0,
    patternLabImports: 0,
    patternLabBestRows: 0,
  };

  for (const row of Array.isArray(rows) ? rows : []) {
    const mode = String(row?.mode || '').trim().toLowerCase();
    const score = normalizeNumber(row?.score, 0);
    const rowsCount = normalizeNumber(row?.rows_count, 0);
    const detail = row?.detail && typeof row.detail === 'object' ? row.detail : {};

    if (mode === 'free_training') {
      summary.freeTrainingSessions += 1;
      summary.freeTrainingBestScore = Math.max(summary.freeTrainingBestScore, score);
      if (row?.success) summary.freeTrainingMaxed += 1;
      continue;
    }

    if (mode === 'drills') {
      summary.drillsBestScore = Math.max(summary.drillsBestScore, score);
      if (row?.success) summary.drillsClears += 1;
      if (detail?.perfect) summary.drillsPerfectClears += 1;
      continue;
    }

    if (mode === 'pattern_lab') {
      summary.patternLabAnalyses += 1;
      summary.patternLabBestRows = Math.max(summary.patternLabBestRows, rowsCount);
      if (String(row?.source_mode || '').trim().toLowerCase() === 'import') {
        summary.patternLabImports += 1;
      }
      continue;
    }
  }

  return summary;
}

function resolveProgressMetrics({ profile, challengeSummary, practiceSummary }) {
  const practiceByBot = Array.isArray(profile?.practiceByBot) ? profile.practiceByBot : [];
  const claraSummary = practiceByBot.find((entry) => entry?.botName === 'Clara Bot');
  const svarogSummary = practiceByBot.find((entry) => entry?.botName === 'Svarog Bot');

  return {
    competitiveMatches: normalizeNumber(profile?.competitive?.matches, 0),
    competitiveWins: normalizeNumber(profile?.competitive?.wins, 0),
    seasonPoints: normalizeNumber(profile?.competitive?.seasonPoints, 0),
    bestWinStreak: normalizeNumber(profile?.bestWinStreak, 0),
    practiceWins: normalizeNumber(profile?.practice?.wins, 0),
    claraMatches: normalizeNumber(claraSummary?.matches, 0),
    svarogMatches: normalizeNumber(svarogSummary?.matches, 0),
    solvedChallengeCount: normalizeNumber(challengeSummary?.solvedChallengeCount, 0),
    generatedClears: normalizeNumber(challengeSummary?.generatedClears, 0),
    bestChallengeScore: normalizeNumber(challengeSummary?.bestChallengeScore, 0),
    freeTrainingSessions: normalizeNumber(practiceSummary?.freeTrainingSessions, 0),
    freeTrainingMaxed: normalizeNumber(practiceSummary?.freeTrainingMaxed, 0),
    drillsClears: normalizeNumber(practiceSummary?.drillsClears, 0),
    drillsPerfectClears: normalizeNumber(practiceSummary?.drillsPerfectClears, 0),
    patternLabAnalyses: normalizeNumber(practiceSummary?.patternLabAnalyses, 0),
    patternLabImports: normalizeNumber(practiceSummary?.patternLabImports, 0),
  };
}

const XP_WEIGHTS = {
  competitiveMatch: 120,
  competitiveWinBonus: 80,
  seasonPoint: 12,
  bestStreakPoint: 10,
  botRoom: 45,
  botWinBonus: 18,
  handcraftedChallenge: 90,
  generatedChallenge: 24,
  freeTrainingSession: 16,
  freeTrainingMaxed: 34,
  drillsClear: 55,
  drillsPerfect: 35,
  patternLabAnalysis: 20,
  patternLabImport: 12,
};

function getXpRequiredForLevel(level) {
  const safeLevel = Math.max(1, normalizeNumber(level, 1));
  return 180 + ((safeLevel - 1) * 70);
}

function buildLevelProgress(metrics) {
  const xpSources = [
    {
      key: 'competitive_matches',
      label: 'Ranked PvP rooms',
      amount: normalizeNumber(metrics?.competitiveMatches, 0),
      xp: normalizeNumber(metrics?.competitiveMatches, 0) * XP_WEIGHTS.competitiveMatch,
    },
    {
      key: 'competitive_wins',
      label: 'Ranked PvP wins',
      amount: normalizeNumber(metrics?.competitiveWins, 0),
      xp: normalizeNumber(metrics?.competitiveWins, 0) * XP_WEIGHTS.competitiveWinBonus,
    },
    {
      key: 'season_points',
      label: 'Season points',
      amount: normalizeNumber(metrics?.seasonPoints, 0),
      xp: normalizeNumber(metrics?.seasonPoints, 0) * XP_WEIGHTS.seasonPoint,
    },
    {
      key: 'best_streak',
      label: 'Best win streak',
      amount: normalizeNumber(metrics?.bestWinStreak, 0),
      xp: normalizeNumber(metrics?.bestWinStreak, 0) * XP_WEIGHTS.bestStreakPoint,
    },
    {
      key: 'bot_rooms',
      label: 'Bot rooms',
      amount: normalizeNumber(metrics?.claraMatches, 0) + normalizeNumber(metrics?.svarogMatches, 0),
      xp: (normalizeNumber(metrics?.claraMatches, 0) + normalizeNumber(metrics?.svarogMatches, 0)) * XP_WEIGHTS.botRoom,
    },
    {
      key: 'bot_wins',
      label: 'Bot wins',
      amount: normalizeNumber(metrics?.practiceWins, 0),
      xp: normalizeNumber(metrics?.practiceWins, 0) * XP_WEIGHTS.botWinBonus,
    },
    {
      key: 'handcrafted_challenges',
      label: 'Handcrafted challenge clears',
      amount: normalizeNumber(metrics?.solvedChallengeCount, 0),
      xp: normalizeNumber(metrics?.solvedChallengeCount, 0) * XP_WEIGHTS.handcraftedChallenge,
    },
    {
      key: 'generated_challenges',
      label: 'Generated challenge clears',
      amount: normalizeNumber(metrics?.generatedClears, 0),
      xp: normalizeNumber(metrics?.generatedClears, 0) * XP_WEIGHTS.generatedChallenge,
    },
    {
      key: 'free_training_sessions',
      label: 'Free training sessions',
      amount: normalizeNumber(metrics?.freeTrainingSessions, 0),
      xp: normalizeNumber(metrics?.freeTrainingSessions, 0) * XP_WEIGHTS.freeTrainingSession,
    },
    {
      key: 'free_training_maxed',
      label: 'Maxed free training relics',
      amount: normalizeNumber(metrics?.freeTrainingMaxed, 0),
      xp: normalizeNumber(metrics?.freeTrainingMaxed, 0) * XP_WEIGHTS.freeTrainingMaxed,
    },
    {
      key: 'drills_clears',
      label: 'Drills clears',
      amount: normalizeNumber(metrics?.drillsClears, 0),
      xp: normalizeNumber(metrics?.drillsClears, 0) * XP_WEIGHTS.drillsClear,
    },
    {
      key: 'drills_perfect',
      label: 'Perfect drills',
      amount: normalizeNumber(metrics?.drillsPerfectClears, 0),
      xp: normalizeNumber(metrics?.drillsPerfectClears, 0) * XP_WEIGHTS.drillsPerfect,
    },
    {
      key: 'pattern_lab',
      label: 'Pattern Lab analyses',
      amount: normalizeNumber(metrics?.patternLabAnalyses, 0),
      xp: normalizeNumber(metrics?.patternLabAnalyses, 0) * XP_WEIGHTS.patternLabAnalysis,
    },
    {
      key: 'pattern_lab_imports',
      label: 'Pattern Lab imports',
      amount: normalizeNumber(metrics?.patternLabImports, 0),
      xp: normalizeNumber(metrics?.patternLabImports, 0) * XP_WEIGHTS.patternLabImport,
    },
  ].filter((entry) => entry.amount > 0 && entry.xp > 0);

  const totalXp = xpSources.reduce((sum, entry) => sum + normalizeNumber(entry.xp, 0), 0);
  let level = 1;
  let xpSpent = 0;
  let currentRequirement = getXpRequiredForLevel(level);

  while (totalXp >= xpSpent + currentRequirement) {
    xpSpent += currentRequirement;
    level += 1;
    currentRequirement = getXpRequiredForLevel(level);
  }

  const xpIntoLevel = Math.max(0, totalXp - xpSpent);
  const xpToNextLevel = Math.max(0, currentRequirement - xpIntoLevel);
  const progressPercent = currentRequirement > 0
    ? Math.max(0, Math.min(100, Math.round((xpIntoLevel / currentRequirement) * 1000) / 10))
    : 0;

  return {
    level,
    totalXp,
    currentLevelXp: xpIntoLevel,
    nextLevelXp: currentRequirement,
    xpToNextLevel,
    progressPercent,
    sources: xpSources.sort((left, right) => normalizeNumber(right.xp, 0) - normalizeNumber(left.xp, 0)),
  };
}

function buildAchievementState(metrics) {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const value = normalizeNumber(metrics?.[definition.metric], 0);
    return {
      ...definition,
      currentValue: value,
      unlocked: value >= definition.target,
      progressLabel: formatProgressLabel(value, definition.target, definition.format || 'count'),
    };
  });
}

function buildTitleState({ profile, leaderboardRank, challengeSummary, practiceSummary }) {
  const competitiveWins = normalizeNumber(profile?.competitive?.wins, 0);
  const bestCompetitiveScore = normalizeNumber(profile?.competitive?.bestScore, 0);
  const practiceWins = normalizeNumber(profile?.practice?.wins, 0);
  const solvedChallengeCount = normalizeNumber(challengeSummary?.solvedChallengeCount, 0);
  const freeTrainingMaxed = normalizeNumber(practiceSummary?.freeTrainingMaxed, 0);
  const drillsClears = normalizeNumber(practiceSummary?.drillsClears, 0);
  const patternLabAnalyses = normalizeNumber(practiceSummary?.patternLabAnalyses, 0);

  const unlockedKeys = new Set();
  if (leaderboardRank === 1) unlockedKeys.add('astral-marshal');
  if (leaderboardRank > 0 && leaderboardRank <= 3) unlockedKeys.add('proxy-prime');
  if (leaderboardRank > 0 && leaderboardRank <= 10) unlockedKeys.add('leyline-tactician');
  if (competitiveWins >= 5) unlockedKeys.add('ranked-riftwalker');
  if (bestCompetitiveScore >= 90) unlockedKeys.add('resonium-savant');
  if (practiceWins >= 8) unlockedKeys.add('svarog-calibrated');
  if (solvedChallengeCount >= 1) unlockedKeys.add('signal-initiate');
  if (solvedChallengeCount >= 5) unlockedKeys.add('hollow-cartographer');
  if (solvedChallengeCount >= 10) unlockedKeys.add('tracer-sovereign');
  if (freeTrainingMaxed >= 3) unlockedKeys.add('forge-calibrator');
  if (drillsClears >= 1) unlockedKeys.add('drill-ace');
  if (patternLabAnalyses >= 5) unlockedKeys.add('lab-archivist');

  return TITLE_DEFINITIONS.map((definition) => ({
    ...definition,
    unlocked: unlockedKeys.has(definition.key),
  }));
}

function rankTierReached(currentTier, targetTierKey) {
  const currentPoints = normalizeNumber(currentTier?.minPoints, 0);
  const targetTier = RANK_TIER_DEFINITIONS.find((entry) => entry.key === String(targetTierKey || '').trim());
  if (!targetTier) return false;
  return currentPoints >= normalizeNumber(targetTier.minPoints, 0);
}

function isRewardUnlocked(definition, {
  profile,
  challengeSummary,
  practiceSummary,
  leaderboardRank,
  rankTier,
  levelProgress,
}) {
  if (definition.unlockType === 'competitiveWins') {
    return normalizeNumber(profile?.competitive?.wins, 0) >= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'freeTrainingSessions') {
    return normalizeNumber(practiceSummary?.freeTrainingSessions, 0) >= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'drillsClears') {
    return normalizeNumber(practiceSummary?.drillsClears, 0) >= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'patternLabAnalyses') {
    return normalizeNumber(practiceSummary?.patternLabAnalyses, 0) >= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'solvedChallengeCount') {
    return normalizeNumber(challengeSummary?.solvedChallengeCount, 0) >= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'leaderboardTop') {
    return leaderboardRank > 0 && leaderboardRank <= normalizeNumber(definition.unlockValue, 0);
  }
  if (definition.unlockType === 'rankTier') {
    return rankTierReached(rankTier, definition.unlockValue);
  }
  if (definition.unlockType === 'level') {
    return normalizeNumber(levelProgress?.level, 1) >= normalizeNumber(definition.unlockValue, 1);
  }
  return false;
}

function buildRewardState({
  profile,
  challengeSummary,
  practiceSummary,
  leaderboardRank,
  rankTier,
  levelProgress,
  rewardRows,
}) {
  return REWARD_DEFINITIONS.map((definition) => {
    const rewardRow = Array.isArray(rewardRows)
      ? rewardRows.find((row) => String(row?.key || '').trim() === definition.key)
      : null;
    return {
      ...definition,
      unlocked: isRewardUnlocked(definition, {
        profile,
        challengeSummary,
        practiceSummary,
        leaderboardRank,
        rankTier,
        levelProgress,
      }),
      claimed: Boolean(rewardRow),
      claimedAt: rewardRow?.claimed_at || null,
      sourceSeason: rewardRow?.source_season || null,
    };
  });
}

function buildNextRewardState(rewards, levelProgress) {
  const nextLevelReward = (Array.isArray(rewards) ? rewards : [])
    .filter((entry) => entry.unlockType === 'level' && !entry.unlocked)
    .sort((left, right) => normalizeNumber(left?.unlockValue, 0) - normalizeNumber(right?.unlockValue, 0))[0];

  if (!nextLevelReward) return null;

  const requiredTotalXp = getTotalXpRequiredForLevel(normalizeNumber(nextLevelReward.unlockValue, 1));
  const currentTotalXp = normalizeNumber(levelProgress?.totalXp, 0);
  const xpRemaining = Math.max(0, requiredTotalXp - currentTotalXp);

  return {
    ...nextLevelReward,
    targetLevel: normalizeNumber(nextLevelReward.unlockValue, 1),
    requiredTotalXp,
    xpRemaining,
  };
}

async function fetchUnlockRows(table, userId) {
  try {
    const rows = await supabaseAdminRequest(buildUnlockListPath(table, userId), {
      method: 'GET',
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function fetchRewardRows(userId) {
  try {
    const rows = await supabaseAdminRequest(buildRewardListPath(userId), {
      method: 'GET',
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function fetchWalletRow(userId) {
  try {
    const rows = await supabaseAdminRequest(buildWalletPath(userId), {
      method: 'GET',
    });
    return Array.isArray(rows) ? rows[0] || null : rows || null;
  } catch (error) {
    if (isMissingTableError(error)) return undefined;
    throw error;
  }
}

async function fetchChallengeRows(userId, season) {
  try {
    const rows = await supabaseAdminRequest(buildChallengeRowsPath(userId, season), {
      method: 'GET',
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function fetchPracticeRows(userId, season) {
  try {
    const rows = await supabaseAdminRequest(buildPracticeRowsPath(userId, season), {
      method: 'GET',
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

async function insertUnlockRows(table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  try {
    const inserted = await supabaseAdminRequest(table, {
      method: 'POST',
      body: rows,
    });
    return Array.isArray(inserted) ? inserted : inserted ? [inserted] : [];
  } catch (error) {
    if (isUniqueViolationError(error)) return [];
    throw error;
  }
}

async function insertOwnedMarketItem(userId, key) {
  try {
    const inserted = await supabaseAdminRequest(USER_MARKET_ITEMS_TABLE, {
      method: 'POST',
      body: {
        user_id: userId,
        key,
      },
    });
    return Array.isArray(inserted) ? inserted[0] || null : inserted || null;
  } catch (error) {
    if (isMissingTableError(error) || isUniqueViolationError(error)) return null;
    throw error;
  }
}

export async function applyTokenGrant(userId, amount) {
  const grant = normalizeNumber(amount, 0);
  if (grant <= 0) return null;

  const walletRow = await fetchWalletRow(userId);
  if (walletRow === undefined) {
    return null;
  }

  if (!walletRow) {
    const inserted = await supabaseAdminRequest(USER_WALLETS_TABLE, {
      method: 'POST',
      body: {
        user_id: userId,
        token_balance: grant,
      },
    });
    return Array.isArray(inserted) ? inserted[0] || null : inserted || null;
  }

  const nextBalance = normalizeNumber(walletRow.token_balance, 0) + grant;
  const updated = await supabaseAdminRequest(`${USER_WALLETS_TABLE}?${encodeURIComponent('user_id')}=${encodeURIComponent(`eq.${userId}`)}`, {
    method: 'PATCH',
    body: {
      token_balance: nextBalance,
      updated_at: new Date().toISOString(),
    },
  });
  return Array.isArray(updated) ? updated[0] || null : updated || null;
}

function mergeProgressionState(definitions, rows, extraFields = []) {
  const rowMap = new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row?.key || '').trim(), row]));
  return definitions.map((definition) => {
    const row = rowMap.get(definition.key);
    const merged = {
      ...definition,
      unlocked: Boolean(definition.unlocked || row),
      unlockedAt: row?.unlocked_at || null,
      sourceSeason: row?.source_season || null,
      persisted: Boolean(row),
    };
    for (const field of extraFields) {
      if (definition[field] !== undefined) merged[field] = definition[field];
    }
    return merged;
  });
}

async function syncUnlockTable(table, userId, season, definitions, buildSnapshot) {
  const existingRows = await fetchUnlockRows(table, userId);
  if (existingRows === null) {
    return {
      inventoryReady: false,
      rows: mergeProgressionState(definitions, []),
    };
  }

  const existingKeys = new Set(existingRows.map((row) => String(row?.key || '').trim()).filter(Boolean));
  const missingRows = definitions
    .filter((definition) => definition.unlocked && !existingKeys.has(definition.key))
    .map((definition) => ({
      user_id: userId,
      key: definition.key,
      source_season: season.label,
      source_snapshot: buildSnapshot(definition),
    }));

  const insertedRows = await insertUnlockRows(table, missingRows);
  const mergedRows = [...existingRows, ...insertedRows];

  return {
    inventoryReady: true,
    rows: mergeProgressionState(definitions, mergedRows, ['progressLabel', 'currentValue']),
  };
}

export async function syncProfileProgression({ userId, profile, leaderboardRank, season }) {
  if (!userId) {
    return {
      inventoryReady: false,
      titles: [],
      achievements: [],
      challengeSummary: {
        solvedChallengeCount: 0,
        generatedClears: 0,
        bestChallengeScore: 0,
        fastestClearSeconds: null,
      },
    };
  }

  const challengeRows = await fetchChallengeRows(userId, season);
  const challengeSummary = summarizeChallengeRows(challengeRows);
  const practiceRows = await fetchPracticeRows(userId, season);
  const practiceSummary = summarizePracticeRows(practiceRows);
  const metrics = resolveProgressMetrics({ profile, challengeSummary, practiceSummary });
  const levelProgress = buildLevelProgress(metrics);
  const rankTier = resolveRankTier(normalizeNumber(profile?.competitive?.seasonPoints, 0));
  const titleState = buildTitleState({ profile, leaderboardRank, challengeSummary, practiceSummary });
  const achievementState = buildAchievementState(metrics);

  const syncedTitles = await syncUnlockTable(
    USER_TITLES_TABLE,
    userId,
    season,
    titleState,
    (definition) => ({
      leaderboard_rank: leaderboardRank || null,
      competitive_wins: normalizeNumber(profile?.competitive?.wins, 0),
      practice_wins: normalizeNumber(profile?.practice?.wins, 0),
      solved_challenges: challengeSummary.solvedChallengeCount,
      title_name: definition.name,
    }),
  );

  const syncedAchievements = await syncUnlockTable(
    USER_ACHIEVEMENTS_TABLE,
    userId,
    season,
    achievementState,
    (definition) => ({
      current_value: normalizeNumber(definition.currentValue, 0),
      target: normalizeNumber(definition.target, 0),
      achievement_name: definition.name,
    }),
  );

  const rewardRows = await fetchRewardRows(userId);
  const rewardInventoryReady = rewardRows !== null;
  const rewardState = buildRewardState({
    profile,
    challengeSummary,
    practiceSummary,
    leaderboardRank,
    rankTier,
    levelProgress,
    rewardRows,
  });
  const nextReward = buildNextRewardState(rewardState, levelProgress);

  return {
    inventoryReady: Boolean(syncedTitles.inventoryReady && syncedAchievements.inventoryReady && rewardInventoryReady),
    rankTier,
    titles: syncedTitles.rows,
    achievements: syncedAchievements.rows,
    rewards: rewardState,
    nextReward,
    levelProgress,
    challengeSummary: {
      solvedChallengeCount: challengeSummary.solvedChallengeCount,
      generatedClears: challengeSummary.generatedClears,
      bestChallengeScore: challengeSummary.bestChallengeScore,
      fastestClearSeconds: challengeSummary.fastestClearSeconds,
    },
    practiceSummary,
  };
}

export async function hasUnlockedTitle(userId, titleKey) {
  const normalizedKey = String(titleKey || '').trim();
  if (!userId || !normalizedKey) return false;

  const rows = await fetchUnlockRows(USER_TITLES_TABLE, userId);
  if (rows === null) {
    throw new HttpError(503, 'Progression inventory is not ready yet.');
  }

  return rows.some((row) => String(row?.key || '').trim() === normalizedKey);
}

export async function claimProfileReward({ userId, rewardKey, profile, leaderboardRank, season }) {
  const normalizedKey = String(rewardKey || '').trim();
  const definition = REWARD_DEFINITIONS.find((entry) => entry.key === normalizedKey);
  if (!definition) {
    throw new HttpError(400, 'Unknown reward.');
  }

  const progression = await syncProfileProgression({ userId, profile, leaderboardRank, season });
  if (progression.inventoryReady === false) {
    throw new HttpError(503, 'Reward inventory is not ready yet.');
  }

  const reward = Array.isArray(progression.rewards)
    ? progression.rewards.find((entry) => entry.key === normalizedKey)
    : null;

  if (!reward?.unlocked) {
    throw new HttpError(403, 'Reward not unlocked yet.');
  }
  if (reward?.claimed) {
    return reward;
  }

  const claimed = await insertUnlockRows(USER_REWARDS_TABLE, [{
    user_id: userId,
    key: normalizedKey,
    source_season: season.label,
    source_snapshot: {
      reward_name: definition.name,
      leaderboard_rank: leaderboardRank || null,
      season_points: normalizeNumber(profile?.competitive?.seasonPoints, 0),
    },
  }]);

  const claimedRow = Array.isArray(claimed) ? claimed[0] || null : null;

  if (
    definition.rewardType === 'frame'
    || definition.rewardType === 'badge'
    || definition.rewardType === 'nameplate'
    || definition.rewardType === 'title'
  ) {
    await insertOwnedMarketItem(userId, normalizedKey);
  }

  if (definition.rewardType === 'title' && definition.titleKey) {
    await insertUnlockRows(USER_TITLES_TABLE, [{
      user_id: userId,
      key: definition.titleKey,
      source_season: season.label,
      source_snapshot: {
        source: 'reward',
        reward_key: definition.key,
        title_key: definition.titleKey,
      },
    }]);
  }

  if (normalizeNumber(definition.grantTokens, 0) > 0) {
    await applyTokenGrant(userId, definition.grantTokens);
  }

  return {
    ...reward,
    claimed: true,
    claimedAt: claimedRow?.claimed_at || new Date().toISOString(),
    sourceSeason: claimedRow?.source_season || season.label,
  };
}

/**
 * Automatically claims newly unlocked progression rewards for a user.
 * Safe to call after inserting any result that may trigger a level-up.
 * Deduplicates using the USER_REWARDS_TABLE unique constraint — tokens and
 * cosmetics are only granted once per reward key per user.
 *
 * @param {{ userId: string, rewardKeys: string[], seasonLabel: string }} opts
 * @returns {Promise<string[]>} Keys that were newly claimed in this call.
 */
export async function autoClaimProgressionRewards({ userId, rewardKeys, seasonLabel }) {
  const keys = Array.isArray(rewardKeys)
    ? rewardKeys.map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  if (!userId || keys.length === 0) return [];

  const claimed = [];
  for (const key of keys) {
    const definition = REWARD_DEFINITIONS.find((entry) => entry.key === key);
    if (!definition) continue;

    // Insert claim row — silently handles duplicate (already claimed).
    const claimRows = await insertUnlockRows(USER_REWARDS_TABLE, [{
      user_id: userId,
      key,
      source_season: seasonLabel || '',
      source_snapshot: { source: 'auto_claim', reward_name: definition.name },
    }]);

    // Only grant rewards when the claim row was genuinely new.
    if (!Array.isArray(claimRows) || claimRows.length === 0) continue;

    if (normalizeNumber(definition.grantTokens, 0) > 0) {
      await applyTokenGrant(userId, definition.grantTokens).catch(() => null);
    }

    if (['frame', 'badge', 'nameplate', 'title'].includes(definition.rewardType)) {
      await insertOwnedMarketItem(userId, key).catch(() => null);
    }

    if (definition.rewardType === 'title' && definition.titleKey) {
      await insertUnlockRows(USER_TITLES_TABLE, [{
        user_id: userId,
        key: definition.titleKey,
        source_season: seasonLabel || '',
        source_snapshot: { source: 'auto_claim', reward_key: key, title_key: definition.titleKey },
      }]).catch(() => null);
    }

    claimed.push(key);
  }

  return claimed;
}
