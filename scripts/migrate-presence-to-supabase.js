#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { buildTablePath, supabaseAdminRequest } from '../server/_services/zone/shared.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USER_PRESENCE_TABLE = process.env.SUPABASE_USER_PRESENCE_TABLE || 'user_presence_directory';
const USER_PRESENCE_COUNTER_TABLE = process.env.SUPABASE_USER_PRESENCE_COUNTER_TABLE || 'user_presence_counters';
const USER_PRESENCE_COUNTER_ID = 'global';
const BACKUP_DIR = path.join(__dirname, '..', 'debugfiles');

function ensureEnv() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.');
  }
}

async function redisCmd(...args) {
  const response = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`Redis error ${response.status} for ${args[0]}.`);
  }
  const payload = await response.json();
  return payload?.result;
}

async function redisPipeline(commands) {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!response.ok) {
    throw new Error(`Redis pipeline error ${response.status}.`);
  }
  return response.json();
}

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeIso(value, fallback = new Date().toISOString()) {
  const time = Date.parse(value || 0);
  return Number.isFinite(time) && time > 0 ? new Date(time).toISOString() : fallback;
}

function normalizeRecord(record) {
  if (!record?.userId) return null;
  return {
    user_id: String(record.userId || '').trim(),
    display_name: String(record.displayName || '').trim(),
    title_key: String(record.titleKey || '').trim(),
    title_label: String(record.titleLabel || '').trim(),
    title_rarity: String(record.titleRarity || '').trim(),
    badge_key: String(record.badgeKey || '').trim(),
    badge_label: String(record.badgeLabel || '').trim(),
    badge_rarity: String(record.badgeRarity || '').trim(),
    nameplate_key: String(record.nameplateKey || '').trim(),
    nameplate_label: String(record.nameplateLabel || '').trim(),
    nameplate_rarity: String(record.nameplateRarity || '').trim(),
    frame_key: String(record.frameKey || '').trim(),
    frame_label: String(record.frameLabel || '').trim(),
    frame_rarity: String(record.frameRarity || '').trim(),
    avatar_url: String(record.avatarUrl || '').trim(),
    role: String(record.role || 'user').trim() || 'user',
    page_path: String(record.pagePath || '').trim(),
    last_seen_at: normalizeIso(record.lastSeenAt),
  };
}

async function readKnownUserRecords() {
  const keys = await scanKeys('p:user:*');
  if (!keys.length) return [];

  const rows = await redisPipeline(keys.map((key) => ['GET', key]));
  return keys
    .map((key, index) => safeJsonParse(rows?.[index]?.result))
    .filter((record) => record?.userId);
}

async function scanActiveAuthRecords() {
  const keys = await scanKeys('p:auth:*');
  if (!keys.length) return [];
  const recordRows = await redisPipeline(keys.map((key) => ['GET', key]));
  return recordRows
    .map((row) => safeJsonParse(row?.result))
    .filter((parsed) => parsed?.userId);
}

async function scanKeys(pattern) {
  const keys = [];
  let cursor = '0';

  do {
    const scanRows = await redisPipeline([
      ['SCAN', cursor, 'MATCH', pattern, 'COUNT', '100'],
    ]);
    cursor = scanRows?.[0]?.result?.[0] || '0';
    const batch = Array.isArray(scanRows?.[0]?.result?.[1]) ? scanRows[0].result[1] : [];
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

function mergeRecords(knownRecords, activeRecords) {
  const merged = new Map();

  for (const source of [...knownRecords, ...activeRecords]) {
    const normalized = normalizeRecord(source);
    if (!normalized?.user_id) continue;
    const existing = merged.get(normalized.user_id);
    const nextTime = Date.parse(normalized.last_seen_at || 0) || 0;
    const existingTime = Date.parse(existing?.last_seen_at || 0) || 0;
    if (!existing || nextTime >= existingTime) {
      merged.set(normalized.user_id, normalized);
    }
  }

  return Array.from(merged.values());
}

async function readRedisStats() {
  const rows = await redisPipeline([
    ['GET', 'p:total'],
    ['GET', 'p:today'],
    ['GET', 'p:date'],
    ['ZCARD', 'p:online:sessions'],
    ['ZCARD', 'p:prediction:sessions'],
  ]);

  return {
    total: parseInt(rows?.[0]?.result ?? '0', 10) || 0,
    today: parseInt(rows?.[1]?.result ?? '0', 10) || 0,
    date: rows?.[2]?.result ?? null,
    onlineSessions: parseInt(rows?.[3]?.result ?? '0', 10) || 0,
    predictionSessions: parseInt(rows?.[4]?.result ?? '0', 10) || 0,
  };
}

function writeBackupFile(payload) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(BACKUP_DIR, `presence-redis-backup-${stamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

async function upsertPresenceRows(rows) {
  if (!rows.length) return [];
  const payload = await supabaseAdminRequest(
    buildTablePath(USER_PRESENCE_TABLE, {
      select: 'user_id,last_seen_at',
      filters: { on_conflict: 'user_id' },
    }),
    {
      method: 'POST',
      body: rows,
      prefer: 'resolution=merge-duplicates,return=representation',
    }
  );
  return Array.isArray(payload) ? payload : [];
}

async function upsertCounterRow(stats) {
  const todayDate = String(stats?.date || '').trim() || new Date().toISOString().split('T')[0];
  const payload = await supabaseAdminRequest(
    buildTablePath(USER_PRESENCE_COUNTER_TABLE, {
      select: 'counter_id,total_predictions,today_predictions,today_date',
      filters: { on_conflict: 'counter_id' },
    }),
    {
      method: 'POST',
      body: {
        counter_id: USER_PRESENCE_COUNTER_ID,
        total_predictions: Number(stats?.total || 0),
        today_predictions: Number(stats?.today || 0),
        today_date: todayDate,
        updated_at: new Date().toISOString(),
      },
      prefer: 'resolution=merge-duplicates,return=representation',
    }
  );
  return Array.isArray(payload) ? payload[0] || null : payload || null;
}

async function main() {
  ensureEnv();

  const [knownRecords, activeRecords, stats] = await Promise.all([
    readKnownUserRecords(),
    scanActiveAuthRecords(),
    readRedisStats(),
  ]);

  const mergedRows = mergeRecords(knownRecords, activeRecords);

  const backupFile = writeBackupFile({
    exportedAt: new Date().toISOString(),
    stats,
    knownRecords,
    activeRecords,
    mergedRows,
  });

  const [upserted, counterRow] = await Promise.all([
    upsertPresenceRows(mergedRows),
    upsertCounterRow(stats),
  ]);

  console.log(`Redis presence stats: total=${stats.total}, today=${stats.today}, onlineSessions=${stats.onlineSessions}, predictionSessions=${stats.predictionSessions}`);
  console.log(`Known user records: ${knownRecords.length}`);
  console.log(`Active auth session records: ${activeRecords.length}`);
  console.log(`Merged unique users: ${mergedRows.length}`);
  console.log(`Upserted rows into Supabase table "${USER_PRESENCE_TABLE}": ${upserted.length}`);
  console.log(`Seeded counter row "${USER_PRESENCE_COUNTER_TABLE}/${USER_PRESENCE_COUNTER_ID}": total=${Number(counterRow?.total_predictions || 0)}, today=${Number(counterRow?.today_predictions || 0)}, date=${String(counterRow?.today_date || '')}`);
  console.log(`Backup written to: ${backupFile}`);
}

main().catch((error) => {
  console.error('Presence migration failed:', error.message);
  process.exit(1);
});
