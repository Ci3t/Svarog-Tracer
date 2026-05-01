import { createClient } from '@libsql/client';
import crypto from 'node:crypto';

let client = null;

export function getTursoClient() {
  if (client) return client;

  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.warn('[Kiyo/Turso] TURSO_DB_URL or TURSO_AUTH_TOKEN not set. Kiyo DB features disabled.');
    return null;
  }

  client = createClient({ url, authToken });
  return client;
}

export function isTursoConfigured() {
  return Boolean(process.env.TURSO_DB_URL && process.env.TURSO_AUTH_TOKEN);
}

const ROLL_3STR_REGEX = /^[1-4]{3}$/;
const PATCH_REGEX = /^\d+\.\d+$/;
const REGION_REGEX = /^(EU|NA|ASIA|CN|GL)$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_SOURCES = new Set([
  'live_manual',
  'import_paste',
  'sheet_seed',
  'caesar_helper',
  'debug_replay',
]);

export function validateRoll3str(value) {
  if (typeof value !== 'string') return false;
  return ROLL_3STR_REGEX.test(value);
}

export function validatePatch(value) {
  if (typeof value !== 'string') return false;
  return PATCH_REGEX.test(value);
}

export function validateRegion(value) {
  if (typeof value !== 'string') return false;
  return REGION_REGEX.test(value);
}

export function validateSource(value) {
  if (typeof value !== 'string') return false;
  return VALID_SOURCES.has(value);
}

export function validateUserId(value) {
  if (typeof value !== 'string') return false;
  if (value.startsWith('anon_')) {
    // Anonymous IDs: anon_<16-char hex hash>
    return /^anon_[0-9a-f]{16}$/i.test(value);
  }
  // Supabase UUID or Discord ID (numeric string)
  return UUID_REGEX.test(value) || /^\d{10,20}$/.test(value);
}

export function validateSessionId(value) {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

export function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function ipHashToAnonymousUserId(ipHash) {
  return `anon_${ipHash}`;
}

export function getAnonymousUserId(req) {
  const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  return ipHashToAnonymousUserId(hashIp(ip));
}