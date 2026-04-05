import {
  HttpError,
  supabaseAdminRequest,
} from '../zone/shared.js';
import {
  ACHIEVEMENT_DEFINITIONS,
  RANK_TIER_DEFINITIONS,
  REWARD_DEFINITIONS,
  TITLE_DEFINITIONS,
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
      if (detail?.perfect || row?.success) summary.drillsPerfectClears += 1;
      continue;
    }

    if (mode === 'pattern_lab') {
      summary.patternLabAnalyses += 1;
      summary.patternLabBestRows = Math.max(summary.patternLabBestRows, rowsCount);
      if (String(row?.source_mode || '').trim().toLowerCase() === 'import') {
        summary.patternLabImports += 1;
      }
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

async function applyTokenGrant(userId, amount) {
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
  const rewardState = REWARD_DEFINITIONS.map((definition) => {
    let unlocked = false;
    if (definition.unlockType === 'competitiveWins') {
      unlocked = normalizeNumber(profile?.competitive?.wins, 0) >= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'freeTrainingSessions') {
      unlocked = normalizeNumber(practiceSummary?.freeTrainingSessions, 0) >= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'drillsClears') {
      unlocked = normalizeNumber(practiceSummary?.drillsClears, 0) >= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'patternLabAnalyses') {
      unlocked = normalizeNumber(practiceSummary?.patternLabAnalyses, 0) >= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'solvedChallengeCount') {
      unlocked = challengeSummary.solvedChallengeCount >= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'leaderboardTop') {
      unlocked = leaderboardRank > 0 && leaderboardRank <= normalizeNumber(definition.unlockValue, 0);
    } else if (definition.unlockType === 'rankTier') {
      unlocked = rankTierReached(rankTier, definition.unlockValue);
    }
    const rewardRow = Array.isArray(rewardRows)
      ? rewardRows.find((row) => String(row?.key || '').trim() === definition.key)
      : null;
    return {
      ...definition,
      unlocked,
      claimed: Boolean(rewardRow),
      claimedAt: rewardRow?.claimed_at || null,
      sourceSeason: rewardRow?.source_season || null,
    };
  });

  return {
    inventoryReady: Boolean(syncedTitles.inventoryReady && syncedAchievements.inventoryReady && rewardInventoryReady),
    rankTier,
    titles: syncedTitles.rows,
    achievements: syncedAchievements.rows,
    rewards: rewardState,
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

  if (definition.rewardType === 'frame' || definition.rewardType === 'badge' || definition.rewardType === 'nameplate') {
    await insertOwnedMarketItem(userId, normalizedKey);
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
