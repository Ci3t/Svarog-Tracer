import {
  extractDiscordDisplayName,
  supabaseAdminRequest,
  supabaseAuthAdminRequest,
} from '../zone/shared.js';
import { applyTokenGrant } from './progression.js';
import { getMarketplaceItem, resolveEquippedCosmeticsFromMetadata } from '../../../src/utils/marketplaceCatalog.js';
import { resolveEquippedTitleFromUser } from '../../../src/utils/titleCatalog.js';

const env = globalThis.process?.env || {};

const USER_MARKET_ITEMS_TABLE = env.SUPABASE_USER_MARKET_ITEMS_TABLE || 'user_market_items';
const DAILY_LOGIN_TOKENS = Math.max(0, Number(env.SVAROG_DAILY_LOGIN_TOKENS || 60) || 60);
const TUTORIAL_PARTIAL_TOKENS = Math.max(0, Number(env.SVAROG_TUTORIAL_PARTIAL_TOKENS || 200) || 200);
const TUTORIAL_FULL_BONUS_TOKENS = Math.max(0, Number(env.SVAROG_TUTORIAL_FULL_BONUS_TOKENS || 200) || 200);
const LIVE_MODE_MILESTONE_TOKENS = Math.max(0, Number(env.SVAROG_LIVE_MODE_MILESTONE_TOKENS || 20) || 20);
const FIRST_MODE_COMPLETION_TOKENS = Math.max(0, Number(env.SVAROG_FIRST_MODE_COMPLETION_TOKENS || 400) || 400);
const DEFAULT_TIMEZONE = env.ZONE_EPOCH_TIMEZONE || 'Asia/Jerusalem';

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeMetadata(source) {
  return source && typeof source === 'object' ? { ...source } : {};
}

function buildOwnedItemPath(userId, itemKey) {
  return `${USER_MARKET_ITEMS_TABLE}?${[
    ['select', 'id,key,created_at'],
    ['user_id', `eq.${userId}`],
    ['key', `eq.${itemKey}`],
    ['limit', '1'],
  ].map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

function resolveDateKey(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export async function fetchAuthUserById(userId) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
  return payload?.user || payload || null;
}

export async function updateAuthUserMetadata(userId, nextMetadata, existingUser = null) {
  const targetUser = existingUser?.id ? existingUser : await fetchAuthUserById(userId);
  if (!targetUser?.id) return null;
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: {
      app_metadata: targetUser.app_metadata && typeof targetUser.app_metadata === 'object' ? targetUser.app_metadata : {},
      user_metadata: normalizeMetadata(nextMetadata),
    },
  });
  return payload?.user || payload || null;
}

export async function grantMarketplaceItemOnce(userId, itemKey) {
  const normalizedKey = String(itemKey || '').trim();
  if (!userId || !normalizedKey) {
    return { granted: false, row: null };
  }

  const existing = await supabaseAdminRequest(buildOwnedItemPath(userId, normalizedKey), {
    method: 'GET',
  }).catch(() => []);
  if (Array.isArray(existing) && existing[0]) {
    return { granted: false, row: existing[0] };
  }

  const inserted = await supabaseAdminRequest(USER_MARKET_ITEMS_TABLE, {
    method: 'POST',
    body: {
      user_id: userId,
      key: normalizedKey,
    },
  }).catch(() => null);

  const row = Array.isArray(inserted) ? inserted[0] || null : inserted || null;
  return { granted: Boolean(row), row };
}

export async function ensureDailyLoginClaim(user) {
  if (!user?.id || DAILY_LOGIN_TOKENS <= 0) {
    return { claimed: false, tokensGained: 0, user };
  }

  const authUser = await fetchAuthUserById(user.id).catch(() => null);
  if (!authUser?.id) {
    return { claimed: false, tokensGained: 0, user };
  }

  const metadata = normalizeMetadata(authUser.user_metadata);
  const todayKey = resolveDateKey();
  if (String(metadata.svarog_daily_login_claim_date || '').trim() === todayKey) {
    return { claimed: false, tokensGained: 0, user: authUser, claimDate: todayKey };
  }

  await applyTokenGrant(user.id, DAILY_LOGIN_TOKENS).catch(() => null);
  metadata.svarog_daily_login_claim_date = todayKey;
  metadata.svarog_daily_login_tokens = DAILY_LOGIN_TOKENS;
  metadata.svarog_daily_login_claimed_at = new Date().toISOString();
  const updatedUser = await updateAuthUserMetadata(user.id, metadata, authUser).catch(() => authUser);

  return {
    claimed: true,
    tokensGained: DAILY_LOGIN_TOKENS,
    claimDate: todayKey,
    user: updatedUser || authUser,
  };
}

export async function completeTutorial(user, { guideCompleted = false, completedGuideStages = 0 } = {}) {
  if (!user?.id) {
    return {
      success: false,
      partialGranted: false,
      fullGranted: false,
      tokensGained: 0,
      user,
    };
  }

  const authUser = await fetchAuthUserById(user.id).catch(() => null);
  if (!authUser?.id) {
    return {
      success: false,
      partialGranted: false,
      fullGranted: false,
      tokensGained: 0,
      user,
    };
  }

  const metadata = normalizeMetadata(authUser.user_metadata);
  const partialAlready = Boolean(metadata.svarog_tutorial_partial_reward_claimed_at);
  const fullAlready = Boolean(metadata.svarog_tutorial_full_reward_claimed_at);
  let tokensGained = 0;
  let partialGranted = false;
  let fullGranted = false;

  if (!partialAlready && TUTORIAL_PARTIAL_TOKENS > 0) {
    await applyTokenGrant(user.id, TUTORIAL_PARTIAL_TOKENS).catch(() => null);
    metadata.svarog_tutorial_partial_reward_claimed_at = new Date().toISOString();
    metadata.svarog_tutorial_partial_tokens = TUTORIAL_PARTIAL_TOKENS;
    tokensGained += TUTORIAL_PARTIAL_TOKENS;
    partialGranted = true;
  }

  if (guideCompleted && !fullAlready && TUTORIAL_FULL_BONUS_TOKENS > 0) {
    await applyTokenGrant(user.id, TUTORIAL_FULL_BONUS_TOKENS).catch(() => null);
    metadata.svarog_tutorial_full_reward_claimed_at = new Date().toISOString();
    metadata.svarog_tutorial_full_tokens = TUTORIAL_FULL_BONUS_TOKENS;
    tokensGained += TUTORIAL_FULL_BONUS_TOKENS;
    fullGranted = true;
  }

  metadata.svarog_tutorial_completed_at = metadata.svarog_tutorial_completed_at || new Date().toISOString();
  metadata.svarog_tutorial_guide_completed = Boolean(guideCompleted || metadata.svarog_tutorial_guide_completed);
  metadata.svarog_tutorial_guide_stage_count = Math.max(
    normalizeNumber(metadata.svarog_tutorial_guide_stage_count, 0),
    normalizeNumber(completedGuideStages, 0),
  );

  const updatedUser = await updateAuthUserMetadata(user.id, metadata, authUser).catch(() => authUser);

  return {
    success: true,
    partialGranted,
    fullGranted,
    tokensGained,
    guideCompleted: Boolean(metadata.svarog_tutorial_guide_completed),
    completedGuideStages: normalizeNumber(metadata.svarog_tutorial_guide_stage_count, 0),
    user: updatedUser || authUser,
  };
}

export async function grantFirstModeCompletionBonus(user, modeKey, existingUser = null) {
  const normalizedModeKey = String(modeKey || '').trim().toLowerCase();
  if (!user?.id || !normalizedModeKey || FIRST_MODE_COMPLETION_TOKENS <= 0) {
    return { granted: false, tokensGained: 0, user: existingUser || user };
  }

  const authUser = existingUser?.id ? existingUser : await fetchAuthUserById(user.id).catch(() => null);
  if (!authUser?.id) {
    return { granted: false, tokensGained: 0, user: existingUser || user };
  }

  const metadata = normalizeMetadata(authUser.user_metadata);
  const claimKey = `svarog_mode_bonus_${normalizedModeKey}_claimed_at`;
  const amountKey = `svarog_mode_bonus_${normalizedModeKey}_tokens`;
  if (metadata[claimKey]) {
    return { granted: false, tokensGained: 0, user: authUser };
  }

  await applyTokenGrant(user.id, FIRST_MODE_COMPLETION_TOKENS).catch(() => null);
  metadata[claimKey] = new Date().toISOString();
  metadata[amountKey] = FIRST_MODE_COMPLETION_TOKENS;
  const updatedUser = await updateAuthUserMetadata(user.id, metadata, authUser).catch(() => authUser);

  return {
    granted: true,
    tokensGained: FIRST_MODE_COMPLETION_TOKENS,
    user: updatedUser || authUser,
  };
}

export async function grantLiveModeMilestone(user, { sessionKey, milestone }) {
  const normalizedSessionKey = String(sessionKey || '').trim();
  const milestoneCount = Math.max(0, normalizeNumber(milestone, 0));
  if (!user?.id || !normalizedSessionKey || milestoneCount <= 0 || LIVE_MODE_MILESTONE_TOKENS <= 0) {
    return { granted: false, tokensGained: 0, user };
  }

  const authUser = await fetchAuthUserById(user.id).catch(() => null);
  if (!authUser?.id) {
    return { granted: false, tokensGained: 0, user };
  }

  const metadata = normalizeMetadata(authUser.user_metadata);
  const lastSessionKey = String(metadata.svarog_live_reward_session_key || '').trim();
  const lastMilestone = normalizeNumber(metadata.svarog_live_reward_last_milestone, 0);
  const previousMilestone = lastSessionKey === normalizedSessionKey ? lastMilestone : 0;
  if (milestoneCount <= previousMilestone) {
    return { granted: false, tokensGained: 0, user: authUser };
  }

  const milestoneDelta = milestoneCount - previousMilestone;
  const tokensGained = milestoneDelta * LIVE_MODE_MILESTONE_TOKENS;
  await applyTokenGrant(user.id, tokensGained).catch(() => null);
  metadata.svarog_live_reward_session_key = normalizedSessionKey;
  metadata.svarog_live_reward_last_milestone = milestoneCount;
  metadata.svarog_live_reward_claimed_at = new Date().toISOString();
  const updatedUser = await updateAuthUserMetadata(user.id, metadata, authUser).catch(() => authUser);

  return {
    granted: true,
    tokensGained,
    milestone: milestoneCount,
    user: updatedUser || authUser,
  };
}

function resolveAvatarUrl(user) {
  const metadata = normalizeMetadata(user?.user_metadata);
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => String(identity?.provider || identity?.identity_provider || '').toLowerCase() === 'discord');
  const identityData = discordIdentity?.identity_data && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const candidates = [
    metadata.avatar_url,
    metadata.avatar,
    identityData.avatar_url,
    identityData.picture,
  ];
  const found = candidates.find((value) => String(value || '').trim());
  return String(found || '').trim();
}

export function buildUserIdentitySnapshot(user, fallbackName = '') {
  if (!user || typeof user !== 'object') {
    return {
      displayName: fallbackName || 'User',
      displayAvatarUrl: '',
      displayTitle: '',
      displayTitleRarity: '',
      displayBadge: '',
      displayBadgeRarity: '',
      displayNameplate: '',
      displayNameplateKey: '',
      displayNameplateRarity: '',
      displayFrame: '',
      displayFrameKey: '',
      displayFrameRarity: '',
    };
  }

  const cosmetics = resolveEquippedCosmeticsFromMetadata(user.user_metadata || {});
  const equippedTitle = resolveEquippedTitleFromUser(user);
  const badge = getMarketplaceItem(cosmetics.badgeKey);
  const nameplate = getMarketplaceItem(cosmetics.nameplateKey);
  const frame = getMarketplaceItem(cosmetics.frameKey);

  return {
    displayName: extractDiscordDisplayName(user) || user?.email || fallbackName || String(user?.id || '').trim(),
    displayAvatarUrl: resolveAvatarUrl(user),
    displayTitle: equippedTitle?.name || '',
    displayTitleRarity: equippedTitle?.rarity || '',
    displayBadge: badge?.name || '',
    displayBadgeRarity: badge?.rarity || '',
    displayNameplate: nameplate?.name || '',
    displayNameplateKey: nameplate?.key || '',
    displayNameplateRarity: nameplate?.rarity || '',
    displayFrame: frame?.name || '',
    displayFrameKey: frame?.key || '',
    displayFrameRarity: frame?.rarity || '',
  };
}

export async function fetchUserIdentityMap(userIds = []) {
  const normalizedIds = Array.from(new Set(
    (Array.isArray(userIds) ? userIds : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  ));
  const pairs = await Promise.all(normalizedIds.map(async (userId) => {
    const user = await fetchAuthUserById(userId).catch(() => null);
    return [userId, buildUserIdentitySnapshot(user, `User-${userId.slice(0, 6)}`)];
  }));
  return new Map(pairs);
}
