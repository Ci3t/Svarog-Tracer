/**
 * Presence API - anonymous counters + authenticated member presence
 */

import fs from 'fs';
import path from 'path';
import {
  extractDiscordDisplayName,
  isZoneAdminUser,
  parseBearerToken,
  requireAuthenticatedUser,
} from '../server/_services/zone/shared.js';
import { ensureDailyLoginClaim } from '../server/_services/profile/account.js';
import { resolveEquippedTitleFromUser } from '../src/utils/titleCatalog.js';
import { getMarketplaceItem, resolveEquippedCosmeticsFromMetadata } from '../src/utils/marketplaceCatalog.js';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const IS_PRODUCTION = Boolean(REDIS_URL && REDIS_TOKEN);

const TTL_USER = 5 * 60;
const TTL_PREDICTOR = 5 * 60;
const FEATURE_ENABLED = process.env.PRESENCE_ENABLED !== 'false';
const RATE_LIMIT_FETCH = 5000;
const RATE_LIMIT_ACTIVE = 30000;
const RATE_LIMIT_PRED = 200;
const MEMBER_DIRECTORY_LIMIT = 60;
const LOCAL_DB_FILE = path.join(process.cwd(), 'presence_store.json');

const reqTimestamps = new Map();
let memoryCache = {
  total: 0,
  today: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  activePredictors: {},
  activeUsers: {},
  authSessions: {},
  knownUsers: {},
  ipTimestamps: {},
};

function isRateLimited(key, limitMs) {
  const last = reqTimestamps.get(key) || 0;
  if (Date.now() - last < limitMs) return true;
  reqTimestamps.set(key, Date.now());
  return false;
}

async function redisCmd(...args) {
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

async function redisPipeline(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis pipeline error: ${res.status}`);
  return res.json();
}

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function localLoad() {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      return {
        ...memoryCache,
        ...parsed,
        activePredictors: parsed?.activePredictors || {},
        activeUsers: parsed?.activeUsers || {},
        authSessions: parsed?.authSessions || {},
        knownUsers: parsed?.knownUsers || {},
        ipTimestamps: parsed?.ipTimestamps || {},
      };
    }
  } catch {
    // ignore local read failures
  }
  return { ...memoryCache };
}

function localSave(data) {
  memoryCache = data;
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2));
  } catch {
    // ignore local write failures
  }
}

function normalizePath(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.slice(0, 120);
}

function resolveAvatarUrl(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const candidates = [
    metadata.avatar_url,
    metadata.avatar,
    identityData.avatar_url,
    identityData.picture,
  ];
  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function buildAuthenticatedUserRecord(user, { pagePath = '' } = {}) {
  const nowIso = new Date().toISOString();
  const equippedTitle = resolveEquippedTitleFromUser(user);
  const cosmetics = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});
  const badge = getMarketplaceItem(cosmetics.badgeKey);
  const nameplate = getMarketplaceItem(cosmetics.nameplateKey);
  const frame = getMarketplaceItem(cosmetics.frameKey);
  return {
    userId: String(user?.id || '').trim(),
    displayName: extractDiscordDisplayName(user) || user?.email || String(user?.id || '').trim(),
    titleKey: equippedTitle?.key || '',
    titleLabel: equippedTitle?.name || '',
    titleRarity: equippedTitle?.rarity || '',
    badgeKey: badge?.key || '',
    badgeLabel: badge?.name || '',
    badgeRarity: badge?.rarity || '',
    nameplateKey: nameplate?.key || '',
    nameplateLabel: nameplate?.name || '',
    nameplateRarity: nameplate?.rarity || '',
    frameKey: frame?.key || '',
    frameLabel: frame?.name || '',
    frameRarity: frame?.rarity || '',
    avatarUrl: resolveAvatarUrl(user),
    role: isZoneAdminUser(user) ? 'admin' : 'user',
    pagePath: normalizePath(pagePath),
    lastSeenAt: nowIso,
  };
}

async function tryResolveAuthenticatedUser(req, { claimDaily = false } = {}) {
  const token = parseBearerToken(req);
  if (!token) return null;
  try {
    const auth = await requireAuthenticatedUser(req);
    if (!claimDaily) {
      return auth.user || null;
    }
    const claimed = await ensureDailyLoginClaim(auth.user).catch(() => null);
    return claimed?.user || auth.user || null;
  } catch {
    return null;
  }
}

async function redisGetStats() {
  const results = await redisPipeline([
    ['GET', 'p:total'],
    ['GET', 'p:today'],
    ['GET', 'p:date'],
  ]);
  return {
    total: parseInt(results?.[0]?.result ?? '0', 10) || 0,
    today: parseInt(results?.[1]?.result ?? '0', 10) || 0,
    date: results?.[2]?.result ?? null,
  };
}

async function redisDailyReset(todayStr) {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const secsUntilMidnight = Math.floor((midnight - now) / 1000) + 5;
  await redisPipeline([
    ['SET', 'p:today', '0', 'EX', secsUntilMidnight],
    ['SET', 'p:date', todayStr],
  ]);
}

async function redisIncrPrediction(sessionId) {
  await redisPipeline([
    ['INCR', 'p:total'],
    ['INCR', 'p:today'],
    ['SET', `p:pred:${sessionId}`, '1', 'EX', TTL_PREDICTOR],
    ['SET', `p:u:${sessionId}`, '1', 'EX', TTL_USER],
  ]);
}

async function redisMarkActive(sessionId) {
  await redisCmd('SET', `p:u:${sessionId}`, '1', 'EX', `${TTL_USER}`);
}

async function redisCountOnline() {
  let userCount = 0;
  let predCount = 0;
  let cursor = '0';
  do {
    const results = await redisPipeline([
      ['SCAN', cursor, 'MATCH', 'p:u:*', 'COUNT', '100'],
      ['SCAN', cursor, 'MATCH', 'p:pred:*', 'COUNT', '100'],
    ]);
    cursor = results?.[0]?.result?.[0] || '0';
    userCount += Array.isArray(results?.[0]?.result?.[1]) ? results[0].result[1].length : 0;
    predCount += Array.isArray(results?.[1]?.result?.[1]) ? results[1].result[1].length : 0;
  } while (cursor !== '0');
  return { online: userCount, predicting: predCount };
}

async function redisUpsertAuthenticatedPresence(sessionId, record) {
  if (!record?.userId) return;
  await redisPipeline([
    ['SET', `p:auth:${sessionId}`, JSON.stringify(record), 'EX', TTL_USER],
    ['SET', `p:user:${record.userId}`, JSON.stringify(record)],
    ['SADD', 'p:users', record.userId],
  ]);
}

async function redisMarkAuthenticatedOffline(sessionId) {
  if (!sessionId) return;
  const raw = await redisCmd('GET', `p:auth:${sessionId}`);
  const record = safeJsonParse(raw);
  const commands = [
    ['DEL', `p:auth:${sessionId}`],
    ['DEL', `p:u:${sessionId}`],
    ['DEL', `p:pred:${sessionId}`],
  ];
  if (record?.userId) {
    commands.push([
      'SET',
      `p:user:${record.userId}`,
      JSON.stringify({
        ...record,
        lastSeenAt: new Date().toISOString(),
      }),
    ]);
    commands.push(['SADD', 'p:users', record.userId]);
  }
  await redisPipeline(commands);
}

async function redisReadActiveAuthenticatedUsers() {
  let cursor = '0';
  const sessionRecords = [];
  do {
    const scanResults = await redisPipeline([
      ['SCAN', cursor, 'MATCH', 'p:auth:*', 'COUNT', '100'],
    ]);
    cursor = scanResults?.[0]?.result?.[0] || '0';
    const keys = Array.isArray(scanResults?.[0]?.result?.[1]) ? scanResults[0].result[1] : [];
    if (!keys.length) continue;
    const getResults = await redisPipeline(keys.map((key) => ['GET', key]));
    for (const result of getResults) {
      const record = safeJsonParse(result?.result);
      if (record?.userId) sessionRecords.push(record);
    }
  } while (cursor !== '0');
  return sessionRecords;
}

function sortPresenceUsers(users) {
  return users.sort((left, right) => {
    const leftRank = left.status === 'online' ? 1 : 0;
    const rightRank = right.status === 'online' ? 1 : 0;
    if (leftRank !== rightRank) return rightRank - leftRank;
    const leftTime = Date.parse(left.lastSeenAt || 0) || 0;
    const rightTime = Date.parse(right.lastSeenAt || 0) || 0;
    return rightTime - leftTime;
  });
}

async function redisListPresenceUsers(limit = MEMBER_DIRECTORY_LIMIT) {
  const activeSessions = await redisReadActiveAuthenticatedUsers();
  const activeByUserId = new Map();
  for (const record of activeSessions) {
    const existing = activeByUserId.get(record.userId);
    const recordTime = Date.parse(record.lastSeenAt || 0) || 0;
    const existingTime = Date.parse(existing?.lastSeenAt || 0) || 0;
    if (!existing || recordTime >= existingTime) {
      activeByUserId.set(record.userId, record);
    }
  }

  const knownIds = await redisCmd('SMEMBERS', 'p:users');
  const userIds = Array.isArray(knownIds) ? knownIds.slice(0, limit * 2) : [];
  const storedResults = userIds.length
    ? await redisPipeline(userIds.map((userId) => ['GET', `p:user:${userId}`]))
    : [];

  const merged = [];
  const seen = new Set();
  userIds.forEach((userId, index) => {
    const storedRecord = safeJsonParse(storedResults?.[index]?.result);
    const activeRecord = activeByUserId.get(userId);
    const baseRecord = activeRecord || storedRecord;
    if (!baseRecord?.userId || seen.has(baseRecord.userId)) return;
    seen.add(baseRecord.userId);
    merged.push({
      ...baseRecord,
      status: activeRecord ? 'online' : 'offline',
      lastSeenAt: activeRecord?.lastSeenAt || storedRecord?.lastSeenAt || baseRecord.lastSeenAt || null,
      pagePath: activeRecord?.pagePath || '',
    });
  });

  for (const activeRecord of activeByUserId.values()) {
    if (!activeRecord?.userId || seen.has(activeRecord.userId)) continue;
    seen.add(activeRecord.userId);
    merged.push({ ...activeRecord, status: 'online' });
  }

  return sortPresenceUsers(merged).slice(0, limit);
}

function cleanupLocalPresence(data) {
  const now = Date.now();
  Object.keys(data.activePredictors || {}).forEach((sid) => {
    if (now - Number(data.activePredictors[sid] || 0) > TTL_PREDICTOR * 1000) delete data.activePredictors[sid];
  });
  Object.keys(data.activeUsers || {}).forEach((sid) => {
    if (now - Number(data.activeUsers[sid] || 0) > TTL_USER * 1000) delete data.activeUsers[sid];
  });
  Object.entries(data.authSessions || {}).forEach(([sid, record]) => {
    if (now - Number(record?.touchedAt || 0) <= TTL_USER * 1000) return;
    if (record?.userId) {
      data.knownUsers[record.userId] = {
        ...(data.knownUsers[record.userId] || {}),
        ...record,
        lastSeenAt: new Date(record.touchedAt || now).toISOString(),
      };
    }
    delete data.authSessions[sid];
  });
}

function localUpsertAuthenticatedPresence(data, sessionId, record) {
  if (!record?.userId) return;
  const now = Date.now();
  data.authSessions[sessionId] = {
    ...record,
    touchedAt: now,
  };
  data.knownUsers[record.userId] = {
    ...record,
    lastSeenAt: record.lastSeenAt,
  };
}

function localMarkAuthenticatedOffline(data, sessionId) {
  const existing = data.authSessions?.[sessionId];
  if (existing?.userId) {
    data.knownUsers[existing.userId] = {
      ...(data.knownUsers[existing.userId] || {}),
      ...existing,
      lastSeenAt: new Date().toISOString(),
    };
  }
  delete data.authSessions?.[sessionId];
  delete data.activeUsers?.[sessionId];
  delete data.activePredictors?.[sessionId];
}

function localListPresenceUsers(data, limit = MEMBER_DIRECTORY_LIMIT) {
  const onlineByUserId = new Map();
  Object.values(data.authSessions || {}).forEach((record) => {
    if (!record?.userId) return;
    const existing = onlineByUserId.get(record.userId);
    const recordTime = Date.parse(record.lastSeenAt || 0) || 0;
    const existingTime = Date.parse(existing?.lastSeenAt || 0) || 0;
    if (!existing || recordTime >= existingTime) {
      onlineByUserId.set(record.userId, record);
    }
  });

  const merged = [];
  const seen = new Set();
  Object.entries(data.knownUsers || {}).forEach(([userId, record]) => {
    const activeRecord = onlineByUserId.get(userId);
    const baseRecord = activeRecord || record;
    if (!baseRecord?.userId || seen.has(baseRecord.userId)) return;
    seen.add(baseRecord.userId);
    merged.push({
      ...baseRecord,
      status: activeRecord ? 'online' : 'offline',
      lastSeenAt: activeRecord?.lastSeenAt || record?.lastSeenAt || null,
      pagePath: activeRecord?.pagePath || '',
    });
  });

  return sortPresenceUsers(merged).slice(0, limit);
}

function buildPresencePayload({ stats, users, authUser }) {
  const list = Array.isArray(users) ? users : [];
  const self = authUser?.id
    ? list.find((entry) => entry.userId === authUser.id) || null
    : null;

  return {
    success: true,
    count: stats.predicting,
    online: stats.online,
    total: stats.total,
    today: stats.today,
    users: list,
    self,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Cache-Control,Authorization,x-api-key,Pragma');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!FEATURE_ENABLED) {
    return res.status(200).json({ success: false, message: 'Feature disabled', count: 0, online: 0, total: 0, today: 0, users: [], self: null });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const requestedType = String(body.type || 'fetch').trim().toLowerCase();
  const type = requestedType === 'prediction' || requestedType === 'active' || requestedType === 'offline' ? requestedType : 'fetch';
  const pagePath = normalizePath(body.pagePath);
  const includeUsers = body.includeUsers !== false;

  let sessionId = String(body.sessionId || '').trim();
  if (!sessionId) {
    if (type === 'fetch') {
      sessionId = 'anonymous-fetch';
    } else {
      return res.status(400).json({ error: 'Invalid sessionId' });
    }
  }

  const authUser = await tryResolveAuthenticatedUser(req, { claimDaily: type === 'fetch' });
  const authedRecord = authUser ? buildAuthenticatedUserRecord(authUser, { pagePath }) : null;

  try {
    if (IS_PRODUCTION) {
      const limitKey = `${ip}:${type}`;
      const limitMs = type === 'fetch' ? RATE_LIMIT_FETCH : type === 'active' ? RATE_LIMIT_ACTIVE : RATE_LIMIT_PRED;

      const stats = await redisGetStats();
      const todayStr = new Date().toISOString().split('T')[0];
      if (stats.date !== todayStr) {
        await redisDailyReset(todayStr);
        stats.today = 0;
      }

      const countsBefore = await redisCountOnline();
      const usersBefore = includeUsers ? await redisListPresenceUsers() : [];

      if (type !== 'offline' && isRateLimited(limitKey, limitMs)) {
        return res.status(200).json(buildPresencePayload({
          stats: { ...stats, online: countsBefore.online, predicting: countsBefore.predicting },
          users: usersBefore,
          authUser,
        }));
      }

      if (type === 'prediction') {
        await redisIncrPrediction(sessionId);
        stats.total += 1;
        stats.today += 1;
      } else if (type === 'active') {
        await redisMarkActive(sessionId);
      } else if (type === 'offline') {
        await redisMarkAuthenticatedOffline(sessionId);
      }

      if (authedRecord && type !== 'offline' && (type === 'active' || type === 'prediction')) {
        await redisUpsertAuthenticatedPresence(sessionId, authedRecord);
      }

      const countsAfter = type === 'offline' ? await redisCountOnline() : await redisCountOnline();
      const usersAfter = includeUsers ? await redisListPresenceUsers() : [];
      return res.status(200).json(buildPresencePayload({
        stats: { ...stats, online: countsAfter.online, predicting: countsAfter.predicting },
        users: usersAfter,
        authUser,
      }));
    }

    const data = localLoad();
    cleanupLocalPresence(data);

    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr !== data.lastResetDate) {
      data.today = 0;
      data.lastResetDate = todayStr;
    }

    if (!data.ipTimestamps[ip]) data.ipTimestamps[ip] = {};
    const ts = data.ipTimestamps[ip];
    const limitMs = type === 'fetch' ? RATE_LIMIT_FETCH : type === 'active' ? RATE_LIMIT_ACTIVE : RATE_LIMIT_PRED;
    const onlineBefore = Object.keys(data.activeUsers || {}).length;
    const predictingBefore = Object.keys(data.activePredictors || {}).length;
    const usersBefore = includeUsers ? localListPresenceUsers(data) : [];

    if (type !== 'offline' && now - Number(ts[type] || 0) < limitMs) {
      return res.status(200).json(buildPresencePayload({
        stats: { total: data.total || 0, today: data.today || 0, online: onlineBefore, predicting: predictingBefore },
        users: usersBefore,
        authUser,
      }));
    }
    ts[type] = now;

    if (type === 'prediction') {
      data.activePredictors[sessionId] = now;
      data.activeUsers[sessionId] = now;
      data.total = (data.total || 0) + 1;
      data.today = (data.today || 0) + 1;
    } else if (type === 'active') {
      data.activeUsers[sessionId] = now;
    } else if (type === 'offline') {
      localMarkAuthenticatedOffline(data, sessionId);
    }

    if (authedRecord && type !== 'offline' && (type === 'active' || type === 'prediction')) {
      localUpsertAuthenticatedPresence(data, sessionId, authedRecord);
    }

    cleanupLocalPresence(data);
    localSave(data);

    return res.status(200).json(buildPresencePayload({
      stats: {
        total: data.total || 0,
        today: data.today || 0,
        online: Object.keys(data.activeUsers || {}).length,
        predicting: Object.keys(data.activePredictors || {}).length,
      },
      users: includeUsers ? localListPresenceUsers(data) : [],
      authUser,
    }));
  } catch (error) {
    console.error('Presence API error:', error);
    return res.status(500).json({ error: 'Internal server error', success: false, users: [], self: null });
  }
}
