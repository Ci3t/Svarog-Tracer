import {
  extractDiscordDisplayName,
  HttpError,
  supabaseAdminRequest,
  supabaseAuthAdminRequest,
} from '../zone/shared.js';
import {
  getMarketplaceItem,
  MARKETPLACE_ITEMS,
  resolveEquippedCosmeticsFromMetadata,
} from '../../../src/utils/marketplaceCatalog.js';

const env = globalThis.process?.env || {};

const USER_WALLETS_TABLE = env.SUPABASE_USER_WALLETS_TABLE || 'user_wallets';
const USER_MARKET_ITEMS_TABLE = env.SUPABASE_USER_MARKET_ITEMS_TABLE || 'user_market_items';
const USER_TITLES_TABLE = env.SUPABASE_USER_TITLES_TABLE || 'user_titles';
const USER_REWARDS_TABLE = env.SUPABASE_USER_REWARDS_TABLE || 'user_rewards';
const TESTING_CIET_TOKEN_BALANCE = 9999999;

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isMissingTableError(error) {
  const details = error?.details;
  if (details && typeof details === 'object' && String(details.code || '').trim() === '42P01') return true;
  const raw = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return raw.includes('42p01') || (raw.includes('relation') && raw.includes('does not exist'));
}

function normalizeDisplayName(user) {
  return String(extractDiscordDisplayName(user) || user?.email || user?.id || '').trim();
}

function isCietUser(user) {
  const displayName = normalizeDisplayName(user).toLowerCase();
  return displayName === 'ciet' || displayName.startsWith('ciet#') || String(user?.email || '').toLowerCase().startsWith('ciet');
}

function buildWalletPath(userId) {
  return `${USER_WALLETS_TABLE}?user_id=${encodeURIComponent(`eq.${userId}`)}&select=user_id,token_balance,updated_at`;
}

function buildOwnedItemsPath(userId) {
  return `${USER_MARKET_ITEMS_TABLE}?user_id=${encodeURIComponent(`eq.${userId}`)}&select=id,key,purchased_at,equipped_at,created_at&order=created_at.asc&limit=400`;
}

function buildUnlockedTitlesPath(userId) {
  return `${USER_TITLES_TABLE}?user_id=${encodeURIComponent(`eq.${userId}`)}&select=key&limit=400`;
}

function buildClaimedRewardsPath(userId) {
  return `${USER_REWARDS_TABLE}?user_id=${encodeURIComponent(`eq.${userId}`)}&select=key&limit=400`;
}

async function fetchAuthUser(userId) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });
  return payload?.user || payload || null;
}

async function updateAuthUser(userId, body) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body,
  });
  return payload?.user || payload || null;
}

async function fetchWalletRow(userId) {
  try {
    const rows = await supabaseAdminRequest(buildWalletPath(userId), { method: 'GET' });
    return Array.isArray(rows) ? rows[0] || null : rows || null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function fetchOwnedItems(userId) {
  try {
    const rows = await supabaseAdminRequest(buildOwnedItemsPath(userId), { method: 'GET' });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function fetchUnlockedTitleKeys(userId) {
  try {
    const rows = await supabaseAdminRequest(buildUnlockedTitlesPath(userId), { method: 'GET' });
    return new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.key || '').trim()).filter(Boolean));
  } catch (error) {
    if (isMissingTableError(error)) return new Set();
    throw error;
  }
}

async function fetchClaimedRewardKeys(userId) {
  try {
    const rows = await supabaseAdminRequest(buildClaimedRewardsPath(userId), { method: 'GET' });
    return new Set((Array.isArray(rows) ? rows : []).map((row) => String(row?.key || '').trim()).filter(Boolean));
  } catch (error) {
    if (isMissingTableError(error)) return new Set();
    throw error;
  }
}

async function upsertWallet(userId, tokenBalance) {
  const inserted = await supabaseAdminRequest(USER_WALLETS_TABLE, {
    method: 'POST',
    body: {
      user_id: userId,
      token_balance: tokenBalance,
    },
  });
  return Array.isArray(inserted) ? inserted[0] || null : inserted || null;
}

async function patchWallet(userId, tokenBalance) {
  const updated = await supabaseAdminRequest(`${USER_WALLETS_TABLE}?user_id=${encodeURIComponent(`eq.${userId}`)}`, {
    method: 'PATCH',
    body: {
      token_balance: tokenBalance,
      updated_at: new Date().toISOString(),
    },
  });
  return Array.isArray(updated) ? updated[0] || null : updated || null;
}

async function ensureWallet(user) {
  const row = await fetchWalletRow(user.id);
  const seedBalance = isCietUser(user) ? TESTING_CIET_TOKEN_BALANCE : 0;

  if (!row) {
    const inserted = await upsertWallet(user.id, seedBalance);
    if (!inserted) {
      throw new HttpError(500, 'Failed to initialize wallet.');
    }
    return inserted;
  }

  return row;
}

async function recordOwnedMarketItem(userId, itemKey) {
  const inserted = await supabaseAdminRequest(USER_MARKET_ITEMS_TABLE, {
    method: 'POST',
    body: {
      user_id: userId,
      key: itemKey,
    },
  });
  return Array.isArray(inserted) ? inserted[0] || null : inserted || null;
}

async function unlockPurchasedTitle(userId, titleKey) {
  const inserted = await supabaseAdminRequest(USER_TITLES_TABLE, {
    method: 'POST',
    body: {
      user_id: userId,
      key: titleKey,
      source_season: 'marketplace',
      source_snapshot: {
        source: 'marketplace',
        title_key: titleKey,
      },
    },
  });
  return Array.isArray(inserted) ? inserted[0] || null : inserted || null;
}

function buildCatalogState({ ownedItems, unlockedTitleKeys, claimedRewardKeys }) {
  const ownedItemKeys = new Set((Array.isArray(ownedItems) ? ownedItems : []).map((entry) => String(entry?.key || '').trim()).filter(Boolean));

  return MARKETPLACE_ITEMS.map((item) => {
    const owned = item.type === 'title'
      ? unlockedTitleKeys.has(String(item.titleKey || item.key || '').trim())
      : Boolean(item.defaultOwned) || ownedItemKeys.has(item.key) || claimedRewardKeys.has(item.key);
    return {
      ...item,
      owned,
    };
  });
}

function resolveSlotKey(slot) {
  const normalized = String(slot || '').trim().toLowerCase();
  if (normalized === 'badge') return 'svarog_equipped_badge';
  if (normalized === 'nameplate') return 'svarog_equipped_nameplate';
  if (normalized === 'frame') return 'svarog_equipped_frame';
  if (normalized === 'title') return 'svarog_equipped_title';
  if (normalized === 'clara_playground') return 'svarog_equipped_clara_playground';
  if (normalized === 'clara_guide') return 'svarog_equipped_clara_guide';
  throw new HttpError(400, 'Invalid equip slot.');
}

export async function getMarketplaceSnapshot(user) {
  const walletRow = await ensureWallet(user);
  const ownedItems = await fetchOwnedItems(user.id);
  if (ownedItems === null) {
    throw new HttpError(503, 'Marketplace tables are not ready yet.');
  }
  const unlockedTitleKeys = await fetchUnlockedTitleKeys(user.id);
  const claimedRewardKeys = await fetchClaimedRewardKeys(user.id);
  const catalog = buildCatalogState({ ownedItems, unlockedTitleKeys, claimedRewardKeys });
  const cosmetics = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});

  return {
    wallet: {
      tokenBalance: normalizeNumber(walletRow?.token_balance, 0),
      testingGrant: isCietUser(user) ? TESTING_CIET_TOKEN_BALANCE : 0,
    },
    ownedItems: Array.isArray(ownedItems) ? ownedItems : [],
    catalog,
    equipped: cosmetics,
    // All title keys this user has unlocked (both marketplace-purchased and progression-earned)
    unlockedTitleKeys: Array.from(unlockedTitleKeys),
  };
}

export async function purchaseMarketplaceItem(user, itemKey) {
  const item = getMarketplaceItem(itemKey);
  if (!item) {
    throw new HttpError(404, 'Marketplace item not found.');
  }

  const walletRow = await ensureWallet(user);
  const ownedItems = await fetchOwnedItems(user.id);
  if (ownedItems === null) {
    throw new HttpError(503, 'Marketplace tables are not ready yet.');
  }
  const unlockedTitleKeys = await fetchUnlockedTitleKeys(user.id);
  const claimedRewardKeys = await fetchClaimedRewardKeys(user.id);

  // For titles, check the user_titles table (covers both progression-earned and marketplace-purchased)
  const alreadyOwned = item.type === 'title'
    ? unlockedTitleKeys.has(String(item.key || '').trim())
    : ownedItems.some((entry) => String(entry?.key || '').trim() === item.key) || claimedRewardKeys.has(item.key);
  if (alreadyOwned) {
    throw new HttpError(409, 'Item already owned.');
  }

  const balance = normalizeNumber(walletRow?.token_balance, 0);
  if (balance < normalizeNumber(item.cost, 0)) {
    throw new HttpError(400, 'Not enough tokens.');
  }

  await patchWallet(user.id, balance - normalizeNumber(item.cost, 0));
  await recordOwnedMarketItem(user.id, item.key);

  // Always write to user_titles table for title purchases so hasUnlockedTitle works
  if (item.type === 'title') {
    try {
      await unlockPurchasedTitle(user.id, item.key);
    } catch {
      // If title row already exists due to race or manual seed, treat purchase as successful.
    }
  }

  return getMarketplaceSnapshot(user);
}

export async function updateMarketplaceEquip(user, { action, itemKey, slot }) {
  const authUser = await fetchAuthUser(user.id);
  if (!authUser?.id) {
    throw new HttpError(404, 'User not found.');
  }

  const metadata = authUser.user_metadata && typeof authUser.user_metadata === 'object'
    ? { ...authUser.user_metadata }
    : {};

  if (String(action || '').trim().toLowerCase() === 'clear') {
    const metaKey = resolveSlotKey(slot);
    metadata[metaKey] = null;
  } else {
    const item = getMarketplaceItem(itemKey);
    if (!item) {
      throw new HttpError(404, 'Marketplace item not found.');
    }

    const snapshot = await getMarketplaceSnapshot(user);
    const owned = snapshot.catalog.find((entry) => entry.key === item.key)?.owned;
    if (!owned) {
      throw new HttpError(403, 'Item not owned.');
    }

    const metaKey = resolveSlotKey(item.slot);
    metadata[metaKey] = item.key;
  }

  const updated = await updateAuthUser(user.id, {
    app_metadata: authUser.app_metadata && typeof authUser.app_metadata === 'object' ? authUser.app_metadata : {},
    user_metadata: metadata,
  });

  return updated || authUser;
}
