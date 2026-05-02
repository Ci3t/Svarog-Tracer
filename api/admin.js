/**
 * Admin API Endpoint
 * Provides admin utilities for managing banners, caches, and assets.
 */

import { handler as hsrBannersHandler } from '../server/_services/hsr/banners.js';
import { handler as genshinBannersHandler } from '../server/_services/genshin/banners.js';
import { handler as wuwaBannersHandler } from '../server/_services/wuwa/banners.js';

// Super admin Discord IDs (same as UserProfilePage)
const SUPER_ADMINS = new Set([
  '110890964364627968', // Ciet
  '97579134456168448',  // Bigboypinoy
]);

function isAuthorized(req) {
  // Check Discord ID from header or query
  const discordId = req.headers['x-discord-id'] || req.query.discordId;
  if (discordId && SUPER_ADMINS.has(String(discordId))) return true;
  // Allow local dev if no ID provided and no ADMIN_API_KEY set
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey && !discordId) return true;
  // Fallback to API key
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'];
  return authHeader === `Bearer ${adminKey}` || authHeader === adminKey;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action } = req.query;

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
        // In a real implementation, this would clear Redis/Vercel cache
        // For now, we just return success and let client clear localStorage
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

      default:
        return res.status(400).json({ error: 'Unknown action', availableActions: ['banners', 'clear-cache', 'status'] });
    }
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
