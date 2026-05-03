/**
 * Admin API Endpoint
 * Provides admin utilities for managing banners, caches, assets, and users.
 */

import { handler as hsrBannersHandler } from '../server/_services/hsr/banners.js';
import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';
import {
  extractDiscordDisplayName,
  HttpError,
  isZoneAdminUser,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAuthAdminRequest,
  handleApiError,
} from '../server/_services/zone/shared.js';

// Super admin Discord IDs (same as UserProfilePage)
const SUPER_ADMINS = new Set([
  '110890964364627968', // Ciet
  '97579134456168448',  // Bigboypinoy
]);

function isAuthorized(req) {
  // Check Discord ID from header or query
  let discordId = req.headers['x-discord-id'] || req.query.discordId;
  // Handle null/undefined sent as strings from frontend
  if (discordId === 'null' || discordId === 'undefined' || discordId === '') discordId = null;
  
  if (discordId && SUPER_ADMINS.has(String(discordId))) return true;
  
  // Allow local dev if no ID provided and no ADMIN_API_KEY set
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey && !discordId) return true;
  
  // Fallback to API key
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'];
  return authHeader === `Bearer ${adminKey}` || authHeader === adminKey;
}

// -- Admin Users helpers (merged from admin-users.js) --

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

// -- Main handler --

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key, X-Discord-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // Public actions: anyone can fetch banners or status
  const isPublicAction = action === 'banners' || action === 'status';

  if (!isPublicAction && !isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (action) {
      case 'banners': {
        const { game } = req.query;
        const results = {};

        if (!game || game === 'all' || game === 'hsr') {
          const mockReq = { method: 'GET', query: {}, url: '/api/hsr/banners' };
          const mockRes = { json: (d) => { results.hsr = d; }, status: () => mockRes, setHeader: () => {} };
          await hsrBannersHandler(mockReq, mockRes);
        }
        if (!game || game === 'all' || game === 'genshin') {
          const mockReq = { method: 'GET', query: {}, url: '/api/genshin/banners' };
          const mockRes = { json: (d) => { results.genshin = d; }, status: () => mockRes, setHeader: () => {} };
          await genshinBannersHandler(mockReq, mockRes);
        }
        if (!game || game === 'all' || game === 'wuwa') {
          const mockReq = { method: 'GET', query: {}, url: '/api/wuwa/banners' };
          const mockRes = { json: (d) => { results.wuwa = d; }, status: () => mockRes, setHeader: () => {} };
          await wuwaBannersHandler(mockReq, mockRes);
        }

        return res.status(200).json({ success: true, data: results });
      }

      case 'clear-cache': {
        return res.status(200).json({
          success: true,
          message: 'Cache clear signal sent. Client caches should be cleared on next reload.',
          clearedAt: new Date().toISOString()
        });
      }

      case 'status': {
        return res.status(200).json({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.VERCEL_ENV || 'development',
          features: {
            hsr: true,
            genshin: true,
            wuwa: true,
            cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
            turso: Boolean(process.env.TURSO_DB_URL)
          }
        });
      }

      // -- Merged from admin-users.js --
      case 'users': {
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

        const userAction = String(body?.action || '').trim().toLowerCase();
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

        if (userAction === 'ban') {
          const reason = normalizeReason(body?.reason);
          const banPayload = {
            reason,
            banned_at: new Date().toISOString(),
            banned_by: (await requireAdmin(req)).id,
            banned_by_name: extractDiscordDisplayName(await requireAdmin(req)) || (await requireAdmin(req)).email || (await requireAdmin(req)).id,
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

        if (userAction === 'unban') {
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
      }

      default:
        return res.status(400).json({ error: 'Unknown action', availableActions: ['banners', 'clear-cache', 'status', 'users'] });
    }
  } catch (error) {
    console.error('[Admin API] Error:', error);
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
