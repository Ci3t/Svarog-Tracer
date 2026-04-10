import { handler as challengeResultsHandler } from '../server/_services/challenge/results.js';
import { handler as challengeLeaderboardHandler } from '../server/_services/challenge/leaderboard.js';
import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAdminRequest,
} from '../server/_services/zone/shared.js';
import { getSeasonStatsSnapshot } from '../server/_services/pvp/stats.js';
import { applyTokenGrant, autoClaimProgressionRewards } from '../server/_services/profile/progression.js';
import { grantFirstModeCompletionBonus, grantMarketplaceItemOnce } from '../server/_services/profile/account.js';

const env = globalThis.process?.env || {};
const PRACTICE_RESULTS_TABLE = env.SUPABASE_PRACTICE_RESULTS_TABLE || 'practice_results';

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

function isMissingTableError(error) {
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('42p01') || (raw.includes('relation') && raw.includes('does not exist'));
}

function isUniqueViolationError(error) {
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return Number(error?.status) === 409 || raw.includes('23505') || raw.includes('duplicate') || raw.includes('unique');
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resolveSeasonWindow() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    startAt: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString(),
    endAt: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString(),
  };
}

function buildPracticeHistoryPath(userId, mode, season) {
  const params = [
    ['select', 'id,mode,created_at'],
    ['user_id', `eq.${userId}`],
    ['mode', `eq.${mode}`],
    ['created_at', `gte.${season.startAt}`],
    ['created_at', `lt.${season.endAt}`],
    ['limit', '200'],
  ];
  return `${PRACTICE_RESULTS_TABLE}?${params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
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

async function handlePracticeResult(req, res) {
  const auth = await requireAuthenticatedUser(req);
  const user = auth.user;
  const body = readBody(req);

  const mode = String(body?.mode || '').trim().toLowerCase();
  const sessionKey = String(body?.sessionKey || '').trim();
  if (!mode || !sessionKey) {
    throw new HttpError(400, 'Mode and session key are required.');
  }

  const payload = {
    user_id: user.id,
    mode: mode.slice(0, 48),
    session_key: sessionKey.slice(0, 160),
    score: Number.isFinite(Number(body?.score)) ? Number(body.score) : 0,
    success: Boolean(body?.success),
    source_mode: String(body?.sourceMode || '').trim().slice(0, 48) || null,
    rows_count: Math.max(0, Number(body?.rowsCount || 0) || 0),
    detail: body?.detail && typeof body.detail === 'object' ? body.detail : {},
  };

  try {
    const season = resolveSeasonWindow();
    const previousModeRows = await supabaseAdminRequest(buildPracticeHistoryPath(user.id, payload.mode, season), {
      method: 'GET',
    }).catch(() => []);
    const repeatModeRun = Array.isArray(previousModeRows) && previousModeRows.length > 0;
    const previousSnapshot = await getSeasonStatsSnapshot({
      viewer: user,
      limit: 12,
    }).catch(() => null);
    const inserted = await supabaseAdminRequest(PRACTICE_RESULTS_TABLE, {
      method: 'POST',
      body: payload,
    });
    const row = Array.isArray(inserted) ? inserted[0] || null : inserted || null;
    const nextSnapshot = await getSeasonStatsSnapshot({
      viewer: user,
      limit: 12,
    }).catch(() => null);

    const delta = buildProgressionDelta(
      previousSnapshot?.profile?.progression,
      nextSnapshot?.profile?.progression,
    );

    if (Array.isArray(delta.unlockedRewards) && delta.unlockedRewards.length > 0) {
      await autoClaimProgressionRewards({
        userId: user.id,
        rewardKeys: delta.unlockedRewards.map((r) => r.key),
        seasonLabel: nextSnapshot?.season?.label || previousSnapshot?.season?.label || '',
      }).catch(() => null);
    }

    const tokensGained = (() => {
      if (mode === 'drills') {
        if (repeatModeRun) return payload.detail?.perfect ? 4 : 2;
        if (payload.detail?.perfect) return 8;
        return payload.success ? 5 : 2;
      }
      if (mode === 'free_training') {
        return payload.success ? 6 : 3;
      }
      if (mode === 'pattern_lab') {
        return Math.max(2, Math.min(6, Math.floor(normalizeNumber(payload.rows_count, 0) / 5) || 2));
      }
      return 0;
    })();

    let bonusTokensGained = 0;
    if (tokensGained > 0) {
      await applyTokenGrant(user.id, tokensGained).catch(() => null);
    }
    if (payload.success) {
      const firstModeBonus = await grantFirstModeCompletionBonus(user, mode).catch(() => ({ granted: false, tokensGained: 0 }));
      bonusTokensGained = normalizeNumber(firstModeBonus?.tokensGained, 0);
    }

    if (mode === 'drills' && payload.detail?.perfect) {
      const scienceGrant = await grantMarketplaceItemOnce(user.id, 'clara-science-playground').catch(() => ({ granted: false }));
      if (scienceGrant?.granted) {
        delta.unlockedRewards = [
          ...(Array.isArray(delta.unlockedRewards) ? delta.unlockedRewards : []),
          {
            key: 'clara-science-playground',
            name: 'Clara Science',
            rarity: 'epic',
            rewardType: 'companion',
            grantTokens: 0,
          },
        ];
      }
    }

    return res.status(200).json({
      success: true,
      row,
      duplicate: false,
      tokensGained: tokensGained + bonusTokensGained,
      progressionDelta: {
        ...delta,
        tokensGained: tokensGained + bonusTokensGained,
        firstModeBonus: bonusTokensGained,
      },
    });
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return res.status(200).json({ success: true, duplicate: true });
    }
    if (isMissingTableError(error)) {
      throw new HttpError(503, 'Practice results table is not ready yet.');
    }
    throw error;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const view = String(req.query?.view || '').trim().toLowerCase();
      if (view === 'challenge-leaderboard') {
        return challengeLeaderboardHandler(req, res);
      }
      if (view === 'challenge-results') {
        return challengeResultsHandler(req, res);
      }
      throw new HttpError(404, 'Unknown playground view.');
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const body = readBody(req);
    if (body?.contractId) {
      return challengeResultsHandler(req, res);
    }

    if (body?.mode && body?.sessionKey) {
      return handlePracticeResult(req, res);
    }

    throw new HttpError(400, 'Unknown playground action.');
  } catch (error) {
    return handleApiError(res, error);
  }
}
