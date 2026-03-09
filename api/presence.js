/**
 * Presence API - Persistent Stats via Upstash Redis
 * 
 * Redis Data Model (ultra-minimal, ~40 bytes permanent storage):
 *   p:total          → integer  (total all-time predictions, never expires)
 *   p:today          → integer  (today's count, expires at midnight UTC via TTL)
 *   p:date           → string   (current date string, for daily reset check)
 *   p:u:{sessionId}  → "1"      (active user marker, TTL = 5 min, auto-deletes)
 *   p:pred:{sid}     → "1"      (active predictor marker, TTL = 1 min, auto-deletes)
 * 
 * Local Dev Fallback: presence_store.json (unchanged behavior)
 */

import fs from 'fs';
import path from 'path';

// =========================================================================
// REDIS CLIENT (Upstash REST API - works in serverless/edge with no issues)
// =========================================================================

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const IS_PRODUCTION = !!(REDIS_URL && REDIS_TOKEN);

// Minimal REST wrapper — avoids importing the full @upstash/redis SDK
// so the API stays lightweight and works on Vercel edge functions too
async function redisCmd(...args) {
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

// TTL helpers
const TTL_USER      = 5 * 60;   // 5 minutes (seconds for Redis)
const TTL_PREDICTOR = 5 * 60;   // 5 minutes — matches session length

// =========================================================================
// LOCAL DEV FALLBACK (file-based, unchanged from before)
// =========================================================================

const LOCAL_DB_FILE = path.join(process.cwd(), 'presence_store.json');

let memoryCache = {
  total: 0,
  today: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
};

function localLoad() {
  try {
    if (fs.existsSync(LOCAL_DB_FILE))
      return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  } catch (_) {}
  return { ...memoryCache };
}

function localSave(data) {
  memoryCache = data;
  try { fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2)); } catch (_) {}
}

// =========================================================================
// REDIS OPERATIONS
// =========================================================================

async function redisGetStats() {
  // Batch: GET p:total, GET p:today, GET p:date in one pipeline call
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['GET', 'p:total'],
      ['GET', 'p:today'],
      ['GET', 'p:date'],
    ]),
  });
  const results = await res.json();
  return {
    total: parseInt(results[0].result ?? '0') || 0,
    today: parseInt(results[1].result ?? '0') || 0,
    date:  results[2].result ?? null,
  };
}

async function redisDailyReset(todayStr) {
  // Reset today counter. Set TTL so it auto-zeroes after midnight
  // Calculate seconds until midnight UTC
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const secsUntilMidnight = Math.floor((midnight - now) / 1000) + 5; // +5s buffer

  await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['SET', 'p:today', '0', 'EX', secsUntilMidnight],
      ['SET', 'p:date', todayStr],
    ]),
  });
}

async function redisIncrPrediction(sessionId) {
  await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', 'p:total'],
      ['INCR', 'p:today'],
      // Refresh session markers (these auto-delete after TTL)
      ['SET', `p:pred:${sessionId}`, '1', 'EX', TTL_PREDICTOR],
      ['SET', `p:u:${sessionId}`,    '1', 'EX', TTL_USER],
    ]),
  });
}

async function redisMarkActive(sessionId) {
  // Just refresh the user TTL — no counter change
  await redisCmd('SET', `p:u:${sessionId}`, '1', 'EX', `${TTL_USER}`);
}

async function redisCountOnline() {
  // SCAN for active user/predictor keys (they auto-delete, so count is always live)
  let userCount = 0, predCount = 0;
  let cursor = '0';
  do {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SCAN', cursor, 'MATCH', 'p:u:*', 'COUNT', '100'],
        ['SCAN', cursor, 'MATCH', 'p:pred:*', 'COUNT', '100'],
      ]),
    });
    const results = await res.json();
    cursor       = results[0].result[0];
    userCount   += results[0].result[1].length;
    predCount   += results[1].result[1].length;
  } while (cursor !== '0');
  return { online: userCount, predicting: predCount };
}

// =========================================================================
// CONFIG
// =========================================================================

const FEATURE_ENABLED  = process.env.PRESENCE_ENABLED !== 'false';
const RATE_LIMIT_FETCH = 5000;   // 5s
const RATE_LIMIT_ACTIVE= 30000;  // 30s
const RATE_LIMIT_PRED  = 200;    // 200ms debounce

// Per-request in-memory rate limit (per serverless instance, fast check)
const reqTimestamps = new Map();

function isRateLimited(key, limitMs) {
  const last = reqTimestamps.get(key) || 0;
  if (Date.now() - last < limitMs) return true;
  reqTimestamps.set(key, Date.now());
  return false;
}

// =========================================================================
// MAIN HANDLER
// =========================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, x-api-key, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!FEATURE_ENABLED) {
    return res.status(200).json({ success: false, message: 'Feature disabled', count: 0, online: 0, total: 0, today: 0 });
  }

  const ip        = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const { sessionId, type = 'fetch' } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string') {
    // If passive fetch, generate temporary to bypass validation
    if (type === 'fetch') {
      req.body.sessionId = 'anonymous-fetch';
    } else {
      return res.status(400).json({ error: 'Invalid sessionId' });
    }
  }

  try {
    // ---------- PRODUCTION: Redis ----------
    if (IS_PRODUCTION) {
      const limitKey = `${ip}:${type}`;
      const limitMs  = type === 'fetch' ? RATE_LIMIT_FETCH
                     : type === 'active' ? RATE_LIMIT_ACTIVE
                     : RATE_LIMIT_PRED;

      // Get stats first (always needed for response)
      let stats = await redisGetStats();

      // Daily reset check
      const todayStr = new Date().toISOString().split('T')[0];
      if (stats.date !== todayStr) {
        await redisDailyReset(todayStr);
        stats.today = 0;
      }

      // Count online (fast — keys with TTL auto-expire)
      const { online, predicting } = await redisCountOnline();

      // Rate limit check
      if (isRateLimited(limitKey, limitMs)) {
        return res.status(200).json({
          success: true, rateLimited: true,
          count: predicting, online, total: stats.total, today: stats.today,
        });
      }

      // Write operations
      if (type === 'prediction') {
        await redisIncrPrediction(sessionId);
        stats.total++;
        stats.today++;
      } else if (type === 'active') {
        await redisMarkActive(sessionId);
      }

      return res.status(200).json({
        success: true,
        count:  type === 'prediction' ? predicting + 1 : predicting,
        online: type === 'active'     ? online + 1     : online,
        total:  stats.total,
        today:  stats.today,
      });
    }

    // ---------- LOCAL DEV: File fallback ----------
    let data = localLoad();
    if (!data.activePredictors) data.activePredictors = {};
    if (!data.activeUsers)      data.activeUsers = {};
    if (!data.ipTimestamps)     data.ipTimestamps = {};

    const now = Date.now();

    // Cleanup stale sessions
    Object.keys(data.activePredictors).forEach(sid => {
      // 5min TTL: remove individual idle predictors, not all at once
      if (now - data.activePredictors[sid] > TTL_PREDICTOR * 1000) delete data.activePredictors[sid];
    });
    Object.keys(data.activeUsers).forEach(sid => {
      if (now - data.activeUsers[sid] > TTL_USER * 1000) delete data.activeUsers[sid];
    });

    // Daily reset
    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr !== data.lastResetDate) { data.today = 0; data.lastResetDate = todayStr; }

    // Rate limit (file-based)
    if (!data.ipTimestamps[ip]) data.ipTimestamps[ip] = {};
    const ts = data.ipTimestamps[ip];
    const limitMs = type === 'fetch' ? RATE_LIMIT_FETCH : type === 'active' ? RATE_LIMIT_ACTIVE : RATE_LIMIT_PRED;
    if (now - (ts[type] || 0) < limitMs) {
      return res.status(200).json({
        success: true, rateLimited: true,
        count: Object.keys(data.activePredictors).length,
        online: Object.keys(data.activeUsers).length,
        total: data.total, today: data.today,
      });
    }
    ts[type] = now;

    if (type === 'prediction') {
      data.activePredictors[sessionId] = now;
      data.activeUsers[sessionId]      = now;
      data.total = (data.total || 0) + 1;
      data.today = (data.today || 0) + 1;
    } else if (type === 'active') {
      data.activeUsers[sessionId] = now;
    }

    localSave(data);

    return res.status(200).json({
      success: true,
      count:  Object.keys(data.activePredictors).length,
      online: Object.keys(data.activeUsers).length,
      total:  data.total,
      today:  data.today,
    });

  } catch (error) {
    console.error('Presence API error:', error);
    return res.status(500).json({ error: 'Internal server error', success: false });
  }
}
