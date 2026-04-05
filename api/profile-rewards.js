import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
} from './_services/zone/shared.js';
import { claimProfileReward } from './_services/profile/progression.js';
import { getSeasonStatsSnapshot } from './_services/pvp/stats.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const auth = await requireAuthenticatedUser(req);
    const user = auth.user;

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const body = req.body && typeof req.body === 'object'
      ? req.body
      : typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : {};

    const rewardKey = String(body?.rewardKey || '').trim();
    if (!rewardKey) {
      throw new HttpError(400, 'rewardKey is required.');
    }

    const snapshot = await getSeasonStatsSnapshot({
      viewer: user,
      limit: 12,
    });

    const claimedReward = await claimProfileReward({
      userId: user.id,
      rewardKey,
      profile: snapshot.profile,
      leaderboardRank: snapshot.profile?.leaderboardRank || null,
      season: snapshot.season,
    });

    return res.status(200).json({
      success: true,
      reward: claimedReward,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
