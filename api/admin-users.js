import {
  extractDiscordDisplayName,
  HttpError,
  isZoneAdminUser,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAuthAdminRequest,
  handleApiError,
} from '../server/_services/zone/shared.js';

function normalizeUserId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new HttpError(400, 'userId is required.');
  }
  return normalized;
}

function normalizeReason(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new HttpError(400, 'reason is required.');
  }
  return normalized.slice(0, 240);
}

async function requireAdmin(req) {
  const auth = await requireAuthenticatedUser(req);
  if (!isZoneAdminUser(auth.user)) {
    throw new HttpError(403, 'Admin access required.');
  }
  return auth.user;
}

async function fetchAdminUserById(userId) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'GET',
  });

  return payload?.user || payload || null;
}

async function updateAdminUserById(userId, body) {
  const payload = await supabaseAuthAdminRequest(`users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body,
  });

  return payload?.user || payload || null;
}

function toAdminListUser(user) {
  if (!user || typeof user !== 'object') return null;
  const appMetadata = user.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
  const userMetadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const rawBan =
    (appMetadata && typeof appMetadata.svarog_ban === 'object' && appMetadata.svarog_ban) ||
    (userMetadata && typeof userMetadata.svarog_ban === 'object' && userMetadata.svarog_ban) ||
    null;

  return {
    id: user.id,
    display_name: extractDiscordDisplayName(user) || user.email || user.id,
    email: user.email || '',
    banned: Boolean(rawBan),
    ban_reason: rawBan?.reason || '',
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const adminUser = await requireAdmin(req);

    if (req.method === 'GET') {
      const page = Math.max(1, Number(req.query?.page || 1) || 1);
      const perPage = Math.max(1, Math.min(200, Number(req.query?.per_page || 100) || 100));
      const payload = await supabaseAuthAdminRequest(`users?page=${page}&per_page=${perPage}`, {
        method: 'GET',
      });
      const users = Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload)
          ? payload
          : [];

      return res.status(200).json({
        success: true,
        users: users.map(toAdminListUser).filter(Boolean),
        page,
        per_page: perPage,
      });
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method Not Allowed.');
    }

    const body = req.body && typeof req.body === 'object'
      ? req.body
      : typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : {};

    const action = String(body?.action || '').trim().toLowerCase();
    const userId = normalizeUserId(body?.userId);
    const targetUser = await fetchAdminUserById(userId);

    if (!targetUser?.id) {
      throw new HttpError(404, 'User not found.');
    }

    const nextAppMetadata =
      targetUser.app_metadata && typeof targetUser.app_metadata === 'object'
        ? { ...targetUser.app_metadata }
        : {};
    const nextUserMetadata =
      targetUser.user_metadata && typeof targetUser.user_metadata === 'object'
        ? { ...targetUser.user_metadata }
        : {};

    if (action === 'ban') {
      const reason = normalizeReason(body?.reason);
      const banPayload = {
        reason,
        banned_at: new Date().toISOString(),
        banned_by: adminUser.id,
        banned_by_name: extractDiscordDisplayName(adminUser) || adminUser.email || adminUser.id,
      };

      nextAppMetadata.svarog_ban = banPayload;

      const updated = await updateAdminUserById(userId, {
        app_metadata: nextAppMetadata,
        user_metadata: nextUserMetadata,
      });

      return res.status(200).json({
        success: true,
        action: 'ban',
        user: {
          id: updated?.id || targetUser.id,
          display_name: extractDiscordDisplayName(updated || targetUser) || updated?.email || targetUser.email || userId,
        },
        ban: banPayload,
      });
    }

    if (action === 'unban') {
      delete nextAppMetadata.svarog_ban;
      delete nextUserMetadata.svarog_ban;

      const updated = await updateAdminUserById(userId, {
        app_metadata: nextAppMetadata,
        user_metadata: nextUserMetadata,
      });

      return res.status(200).json({
        success: true,
        action: 'unban',
        user: {
          id: updated?.id || targetUser.id,
          display_name: extractDiscordDisplayName(updated || targetUser) || updated?.email || targetUser.email || userId,
        },
      });
    }

    throw new HttpError(400, 'Invalid action. Use "ban" or "unban".');
  } catch (error) {
    return handleApiError(res, error);
  }
}
