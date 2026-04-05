import {
  handleApiError,
  HttpError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAuthAdminRequest,
} from './_services/zone/shared.js';
import { TITLE_DEFINITION_MAP } from '../src/utils/titleCatalog.js';
import { hasUnlockedTitle } from './_services/profile/progression.js';

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

    const action = String(body?.action || '').trim().toLowerCase();
    if (!['equip', 'clear'].includes(action)) {
      throw new HttpError(400, 'Invalid action.');
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
      if (!TITLE_DEFINITION_MAP.has(titleKey)) {
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
  } catch (error) {
    return handleApiError(res, error);
  }
}
