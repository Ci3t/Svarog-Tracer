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
const VALID_SOURCES = new Set(['live_manual']);

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

export function hashIp(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function ipHashToAnonymousUserId(ipHash) {
  return `anon_${ipHash}`;
}