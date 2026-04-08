import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAuthAdminRequest,
} from './_services/zone/shared.js';
import { handler as seasonStatsHandler } from './_services/pvp/stats.js';
import {
  getMarketplaceSnapshot,
  purchaseMarketplaceItem,
  updateMarketplaceEquip,
} from './_services/profile/marketplace.js';
import { claimProfileReward, hasUnlockedTitle } from './_services/profile/progression.js';
import { getSeasonStatsSnapshot } from './_services/pvp/stats.js';
import { TITLE_DEFINITION_MAP } from '../src/utils/titleCatalog.js';
import { MARKETPLACE_ITEM_MAP } from '../src/utils/marketplaceCatalog.js';

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return {};
}

async function fetchUserById(userId) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
  return payload?.user || payload || null;
}

async function updateUserById(userId, body) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body,
  });
  return payload?.user || payload || null;
}

async function handleMarketplaceAction(user, body, res) {
  const action = String(body?.action || '').trim().toLowerCase();

  if (action === 'purchase') {
    const snapshot = await purchaseMarketplaceItem(user, body?.itemKey);
    return res.status(200).json({
      success: true,
      ...snapshot,
    });
  }

  if (action === 'equip' || action === 'clear') {
    const updatedUser = await updateMarketplaceEquip(user, {
      action,
      itemKey: body?.itemKey,
      slot: body?.slot,
    });
    const snapshot = await getMarketplaceSnapshot(updatedUser);
    return res.status(200).json({
      success: true,
      user: updatedUser,
      ...snapshot,
    });
  }

  throw new HttpError(400, 'Invalid marketplace action.');
}

async function handleTitleAction(user, body, res) {
  const action = String(body?.action || '').trim().toLowerCase();
  if (!['equip', 'clear'].includes(action)) {
    throw new HttpError(400, 'Invalid title action.');
  }

  const targetUser = await fetchUserById(user.id);
  if (!targetUser?.id) {
    throw new HttpError(404, 'User not found.');
  }

  const nextUserMetadata =
    targetUser.user_metadata && typeof targetUser.user_metadata === 'object'
      ? { ...targetUser.user_metadata }
      : {};

  if (action === 'clear') {
    nextUserMetadata.svarog_equipped_title = null;
  } else {
    const titleKey = String(body?.titleKey || '').trim();
    if (!TITLE_DEFINITION_MAP.has(titleKey) && !MARKETPLACE_ITEM_MAP.has(titleKey)) {
      throw new HttpError(400, 'Unknown title.');
    }
    const unlocked = await hasUnlockedTitle(user.id, titleKey);
    if (!unlocked) {
      throw new HttpError(403, 'Title not unlocked yet.');
    }
    nextUserMetadata.svarog_equipped_title = titleKey;
  }

  const updated = await updateUserById(user.id, {
    app_metadata: targetUser.app_metadata && typeof targetUser.app_metadata === 'object' ? targetUser.app_metadata : {},
    user_metadata: nextUserMetadata,
  });

  const safeUser = updated || targetUser;
  if (action === 'clear' && safeUser?.user_metadata && typeof safeUser.user_metadata === 'object') {
    safeUser.user_metadata = {
      ...safeUser.user_metadata,
      svarog_equipped_title: null,
    };
  }

  return res.status(200).json({
    success: true,
    user: safeUser,
  });
}

async function handleRewardAction(user, body, res) {
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
    profile: snapshot?.profile,
    leaderboardRank: snapshot?.profile?.leaderboardRank || null,
    season: snapshot?.season,
  });

  return res.status(200).json({
    success: true,
    reward: claimedReward,
  });
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const view = String(req.query?.view || '').trim().toLowerCase();
      if (view === 'marketplace') {
        const auth = await requireAuthenticatedUser(req);
        const snapshot = await getMarketplaceSnapshot(auth.user);
        return res.status(200).json({
          success: true,
          ...snapshot,
        });
      }

      return seasonStatsHandler(req, res);
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const auth = await requireAuthenticatedUser(req);
    const user = auth.user;
    const body = readBody(req);

    if (body?.rewardKey) {
      return handleRewardAction(user, body, res);
    }

    if (body?.titleKey || (body?.action === 'clear' && !body?.itemKey && !body?.slot)) {
      return handleTitleAction(user, body, res);
    }

    return handleMarketplaceAction(user, body, res);
  } catch (error) {
    return handleApiError(res, error);
  }
}
