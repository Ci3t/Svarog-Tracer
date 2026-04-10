import {
  extractDiscordDisplayName,
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAdminRequest,
} from '../zone/shared.js';
import { getSeasonStatsSnapshot } from '../pvp/stats.js';
import { applyTokenGrant, autoClaimProgressionRewards } from '../profile/progression.js';
import { grantFirstModeCompletionBonus } from '../profile/account.js';

const env = globalThis.process?.env || {};
const CHALLENGE_RESULTS_TABLE = env.SUPABASE_CHALLENGE_RESULTS_TABLE || 'challenge_results';

function safeIso(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveSeasonWindow() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    label: `${year}.${String(month + 1).padStart(2, '0')}`,
    startAt: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString(),
    endAt: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString(),
  };
}

function normalizeText(value, fallback = '', max = 120) {
  const normalized = String(value || '').trim();
  return (normalized || fallback).slice(0, max);
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildListPath(userId, season) {
  const params = [
    ['select', 'id,contract_id,contract_title,difficulty,seed_label,region,score,grade,helpful_hits,mistakes,clear_time_seconds,tries_used,generated,created_at'],
    ['user_id', `eq.${userId}`],
    ['created_at', `gte.${season.startAt}`],
    ['created_at', `lt.${season.endAt}`],
    ['order', 'created_at.desc'],
    ['limit', '50'],
  ];
  return `${CHALLENGE_RESULTS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function buildContractLookupPath(userId, contractId, season) {
  const params = [
    ['select', 'id,contract_id,contract_title,difficulty,seed_label,region,score,grade,helpful_hits,mistakes,clear_time_seconds,tries_used,generated,created_at'],
    ['user_id', `eq.${userId}`],
    ['contract_id', `eq.${contractId}`],
    ['generated', 'eq.false'],
    ['created_at', `gte.${season.startAt}`],
    ['created_at', `lt.${season.endAt}`],
    ['order', 'created_at.desc'],
    ['limit', '20'],
  ];
  return `${CHALLENGE_RESULTS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function compareChallengeRows(left, right) {
  const scoreDiff = normalizeNumber(left?.score, 0) - normalizeNumber(right?.score, 0);
  if (scoreDiff !== 0) return scoreDiff;

  const leftTime = normalizeNumber(left?.clear_time_seconds, 0);
  const rightTime = normalizeNumber(right?.clear_time_seconds, 0);
  const leftHasTime = leftTime > 0;
  const rightHasTime = rightTime > 0;
  if (leftHasTime !== rightHasTime) return leftHasTime ? 1 : -1;
  if (leftHasTime && rightHasTime && leftTime !== rightTime) return rightTime - leftTime;

  const helpfulHitsDiff = normalizeNumber(left?.helpful_hits, 0) - normalizeNumber(right?.helpful_hits, 0);
  if (helpfulHitsDiff !== 0) return helpfulHitsDiff;

  const mistakesDiff = normalizeNumber(right?.mistakes, 0) - normalizeNumber(left?.mistakes, 0);
  if (mistakesDiff !== 0) return mistakesDiff;

  return new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime();
}

function summarizeRows(rows) {
  const summary = {
    clears: 0,
    bestScore: 0,
    fastestClearSeconds: null,
    generatedClears: 0,
  };

  for (const row of Array.isArray(rows) ? rows : []) {
    summary.clears += 1;
    summary.bestScore = Math.max(summary.bestScore, normalizeNumber(row?.score, 0));
    const clearSeconds = normalizeNumber(row?.clear_time_seconds, 0);
    if (clearSeconds > 0) {
      summary.fastestClearSeconds = summary.fastestClearSeconds === null
        ? clearSeconds
        : Math.min(summary.fastestClearSeconds, clearSeconds);
    }
    if (row?.generated) summary.generatedClears += 1;
  }

  return summary;
}

function buildProgressionDelta(previousProgression, nextProgression) {
  const previousLevel = previousProgression?.levelProgress || {};
  const nextLevel = nextProgression?.levelProgress || {};

  const previouslyUnlockedRewards = new Set(
    (Array.isArray(previousProgression?.rewards) ? previousProgression.rewards : [])
      .filter((entry) => entry?.unlocked)
      .map((entry) => String(entry?.key || '').trim())
      .filter(Boolean),
  );

  const newlyUnlockedRewards = (Array.isArray(nextProgression?.rewards) ? nextProgression.rewards : [])
    .filter((entry) => entry?.unlocked && !previouslyUnlockedRewards.has(String(entry?.key || '').trim()))
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      rarity: entry.rarity,
      rewardType: entry.rewardType,
      grantTokens: normalizeNumber(entry.grantTokens, 0),
    }));

  return {
    xpGained: Math.max(0, normalizeNumber(nextLevel.totalXp, 0) - normalizeNumber(previousLevel.totalXp, 0)),
    levelBefore: normalizeNumber(previousLevel.level, 1),
    levelAfter: normalizeNumber(nextLevel.level, 1),
    totalXp: normalizeNumber(nextLevel.totalXp, 0),
    currentLevelXp: normalizeNumber(nextLevel.currentLevelXp, 0),
    nextLevelXp: normalizeNumber(nextLevel.nextLevelXp, 0),
    xpToNextLevel: normalizeNumber(nextLevel.xpToNextLevel, 0),
    progressPercent: normalizeNumber(nextLevel.progressPercent, 0),
    leveledUp: normalizeNumber(nextLevel.level, 1) > normalizeNumber(previousLevel.level, 1),
    unlockedRewards: newlyUnlockedRewards,
    nextReward: nextProgression?.nextReward
      ? {
        key: nextProgression.nextReward.key,
        name: nextProgression.nextReward.name,
        rarity: nextProgression.nextReward.rarity,
        rewardType: nextProgression.nextReward.rewardType,
        targetLevel: normalizeNumber(nextProgression.nextReward.targetLevel, 1),
        xpRemaining: normalizeNumber(nextProgression.nextReward.xpRemaining, 0),
      }
      : null,
  };
}

async function createChallengeResult(user, body) {
  const season = resolveSeasonWindow();
  const contractId = normalizeText(body?.contractId, '', 120);
  if (!contractId) {
    throw new HttpError(400, 'contractId is required.');
  }

  const row = {
    user_id: user.id,
    display_name: normalizeText(extractDiscordDisplayName(user) || user?.email || user.id, user.id, 80),
    contract_id: contractId,
    contract_title: normalizeText(body?.contractTitle, contractId, 160),
    difficulty: normalizeText(body?.difficulty, 'unknown', 40),
    seed_label: normalizeText(body?.seedLabel, '', 80),
    region: normalizeText(body?.region, '', 24),
    score: normalizeNumber(body?.score, 0),
    grade: normalizeText(body?.grade, 'F', 8),
    helpful_hits: normalizeNumber(body?.helpfulHits, 0),
    mistakes: normalizeNumber(body?.mistakes, 0),
    clear_time_seconds: normalizeNumber(body?.clearTimeSeconds, 0),
    tries_used: normalizeNumber(body?.triesUsed, 1),
    generated: Boolean(body?.generated),
  };

  const created = await supabaseAdminRequest(CHALLENGE_RESULTS_TABLE, {
    method: 'POST',
    body: row,
  });

  return Array.isArray(created) ? created[0] || row : created || row;
}

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await requireAuthenticatedUser(req);
    const user = auth.user;

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object'
        ? req.body
        : typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : {};

      const previousSnapshot = await getSeasonStatsSnapshot({
        viewer: user,
        limit: 12,
      }).catch(() => null);
      const season = resolveSeasonWindow();
      const existingRows = body?.generated
        ? []
        : await supabaseAdminRequest(buildContractLookupPath(user.id, normalizeText(body?.contractId, '', 120), season), {
          method: 'GET',
        }).catch(() => []);
      const repeatedHandcraftedClear = !body?.generated && Array.isArray(existingRows) && existingRows.length > 0;
      const result = await createChallengeResult(user, body);
      const nextSnapshot = await getSeasonStatsSnapshot({
        viewer: user,
        limit: 12,
      }).catch(() => null);

      const delta = buildProgressionDelta(
        previousSnapshot?.profile?.progression,
        nextSnapshot?.profile?.progression,
      );

      // Auto-claim newly unlocked rewards (grants tokens + cosmetics without
      // requiring a separate manual claim action from the user).
      if (Array.isArray(delta.unlockedRewards) && delta.unlockedRewards.length > 0) {
        await autoClaimProgressionRewards({
          userId: user.id,
          rewardKeys: delta.unlockedRewards.map((r) => r.key),
          seasonLabel: nextSnapshot?.season?.label || previousSnapshot?.season?.label || '',
        }).catch(() => null);
      }

      const tokensGained = body?.generated
        ? 6
        : repeatedHandcraftedClear
          ? 5
          : 14;
      let bonusTokensGained = 0;

      if (tokensGained > 0) {
        await applyTokenGrant(user.id, tokensGained).catch(() => null);
      }
      if (!body?.generated) {
        const firstModeBonus = await grantFirstModeCompletionBonus(user, 'challenge').catch(() => ({ granted: false, tokensGained: 0 }));
        bonusTokensGained = normalizeNumber(firstModeBonus?.tokensGained, 0);
      }

      return res.status(200).json({
        success: true,
        result,
        tokensGained: tokensGained + bonusTokensGained,
        progressionDelta: {
          ...delta,
          tokensGained: tokensGained + bonusTokensGained,
          firstModeBonus: bonusTokensGained,
        },
      });
    }

    if (req.method === 'GET') {
      const season = resolveSeasonWindow();
      const rows = await supabaseAdminRequest(buildListPath(user.id, season), {
        method: 'GET',
      });
      return res.status(200).json({
        success: true,
        season,
        summary: summarizeRows(rows),
        rows: Array.isArray(rows) ? rows : [],
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    return handleApiError(res, error);
  }
}
