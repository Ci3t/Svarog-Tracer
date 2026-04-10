import charactersData from '../../../src/data/characters.json' with { type: 'json' };

const env = globalThis.process?.env || {};

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  env.SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

export const ZONE_EPOCH_TABLE = env.SUPABASE_ZONE_EPOCH_TABLE || 'zone_epochs';
export const ZONE_RUNS_TABLE = env.SUPABASE_ZONE_RUNS_TABLE || 'zone_runs';
export const ZONE_FLAGS_TABLE = env.SUPABASE_ZONE_FLAGS_TABLE || 'zone_epoch_flags';
export const ZONE_ROSTERS_TABLE = env.SUPABASE_ZONE_ROSTERS_TABLE || 'zone_user_rosters';
export const ZONE_LIKES_TABLE = env.SUPABASE_ZONE_LIKES_TABLE || 'zone_likes';
const ZONE_EPOCH_TIMEZONE = env.ZONE_EPOCH_TIMEZONE || 'Asia/Jerusalem';
const ZONE_EPOCH_ROLLOVER_HOUR = Math.max(0, Math.min(23, Number(env.ZONE_EPOCH_ROLLOVER_HOUR || 5) || 5));

export const VALID_OUTCOMES = new Set([
  'spd-double-crit',
  'double-crit',
  'spd-one-crit',
  'one-crit',
  'effect-junk',
  'flat-junk',
  'mixed',
]);

export const CRIT_OUTCOMES = new Set([
  'spd-double-crit',
  'double-crit',
  'spd-one-crit',
  'one-crit',
]);

export const JUNK_OUTCOMES = new Set(['effect-junk', 'flat-junk']);

const CHARACTER_NAME_MAP = new Map(
  (Array.isArray(charactersData) ? charactersData : []).map((entry) => [Number(entry.numId), entry.name])
);
const CHARACTER_NUM_ID_SET = new Set(
  (Array.isArray(charactersData) ? charactersData : [])
    .map((entry) => Number(entry?.numId))
    .filter((value) => Number.isInteger(value) && value > 0)
);

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function setCorsHeaders(reqOrRes, maybeRes) {
  const req = maybeRes ? reqOrRes : null;
  const res = maybeRes || reqOrRes;
  const requestOrigin = String(req?.headers?.origin || '').trim();
  const requestHeaders = String(req?.headers?.['access-control-request-headers'] || '').trim();

  res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    requestHeaders || 'X-Requested-With, Content-Type, Cache-Control, Authorization, x-api-key, Pragma'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, 'Supabase is not configured for Zone Tracker.');
  }
}

function ensureSupabaseAuthConfig() {
  if (!SUPABASE_URL || !(SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY)) {
    throw new HttpError(500, 'Supabase auth config missing for Zone Tracker.');
  }
}

function parseJsonMaybe(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === 'object') return rawValue;
  if (typeof rawValue !== 'string') return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeDisplayNameValue(value, { maxLength = 80 } = {}) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeBanReasonValue(value, { maxLength = 240 } = {}) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function pickFirstNonEmpty(values) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeDisplayNameValue(value);
    if (normalized) return normalized;
  }
  return null;
}

function splitEnvCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

const ZONE_ADMIN_USER_IDS = new Set([
  ...splitEnvCsv(env.ZONE_ADMIN_USER_IDS),
  ...splitEnvCsv(env.SUPABASE_ZONE_ADMIN_USER_IDS),
  ...splitEnvCsv(env.SUPABASE_ZONE_ADMIN_IDS),
]);

const ZONE_ADMIN_DISCORD_IDS = new Set([
  ...splitEnvCsv(env.ZONE_ADMIN_DISCORD_IDS),
  ...splitEnvCsv(env.SUPABASE_ZONE_ADMIN_DISCORD_IDS),
  '110890964364627968',
  '97579134456168448',
]);

const ZONE_ADMIN_ROLE_LABELS = new Set(['admin', 'zone_admin', 'owner']);

export function getDiscordProviderIds(user) {
  if (!user || typeof user !== 'object') return [];

  const fromMetadata = [
    user?.user_metadata?.provider_id,
    user?.user_metadata?.discord_id,
    user?.app_metadata?.provider_id,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const identities = Array.isArray(user.identities) ? user.identities : [];
  const fromIdentities = [];

  for (const identity of identities) {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    if (provider !== 'discord') continue;

    const identityData = identity?.identity_data && typeof identity.identity_data === 'object'
      ? identity.identity_data
      : {};

    const candidates = [
      identity?.id,
      identity?.provider_id,
      identityData?.user_id,
      identityData?.id,
      identityData?.sub,
    ];

    for (const candidate of candidates) {
      const normalized = String(candidate || '').trim();
      if (normalized) {
        fromIdentities.push(normalized);
      }
    }
  }

  return Array.from(new Set([...fromMetadata, ...fromIdentities]));
}

function collectRoleLabels(user) {
  const labels = [];

  const pushLabel = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized) labels.push(normalized);
  };

  pushLabel(user?.role);
  pushLabel(user?.app_metadata?.role);
  pushLabel(user?.user_metadata?.role);

  for (const role of Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []) {
    pushLabel(role);
  }

  for (const role of Array.isArray(user?.user_metadata?.roles) ? user.user_metadata.roles : []) {
    pushLabel(role);
  }

  return Array.from(new Set(labels));
}

export function isZoneAdminUser(user) {
  if (!user || typeof user !== 'object') return false;

  const userId = String(user.id || '').trim();
  if (userId && ZONE_ADMIN_USER_IDS.has(userId)) {
    return true;
  }

  const discordProviderIds = getDiscordProviderIds(user);
  if (discordProviderIds.some((id) => ZONE_ADMIN_DISCORD_IDS.has(id))) {
    return true;
  }

  const roleLabels = collectRoleLabels(user);
  if (roleLabels.some((label) => ZONE_ADMIN_ROLE_LABELS.has(label))) {
    return true;
  }

  return false;
}

export function isTrailblazerCharacterRef(value) {
  if (value === null || value === undefined) return false;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('trailblazer-')) return true;

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 8001 && numeric <= 8008;
}

export function hasMultipleTrailblazers(values) {
  let count = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (!value) continue;
    if (isTrailblazerCharacterRef(value)) {
      count += 1;
      if (count >= 2) return true;
    }
  }
  return false;
}

export function extractDiscordDisplayName(user) {
  if (!user || typeof user !== 'object') return null;

  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const appMetadata = user.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];

  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });

  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};

  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [];
  const isDiscordUser = Boolean(discordIdentity) || providers.some((provider) => String(provider).toLowerCase() === 'discord');

  if (!isDiscordUser) {
    return pickFirstNonEmpty([
      metadata.full_name,
      metadata.name,
      metadata.user_name,
    ]);
  }

  return pickFirstNonEmpty([
    metadata.global_name,
    metadata.full_name,
    identityData.global_name,
    metadata.user_name,
    identityData.username,
    metadata.preferred_username,
    metadata.name,
  ]);
}

export function getUserBanInfo(user) {
  if (!user || typeof user !== 'object') return null;

  const rawBan =
    (user?.app_metadata && typeof user.app_metadata.svarog_ban === 'object' && user.app_metadata.svarog_ban) ||
    (user?.user_metadata && typeof user.user_metadata.svarog_ban === 'object' && user.user_metadata.svarog_ban) ||
    null;

  if (!rawBan) return null;

  const reason = normalizeBanReasonValue(rawBan.reason || rawBan.message || rawBan.note);
  const bannedAt = String(rawBan.banned_at || rawBan.at || '').trim() || null;
  const bannedBy = String(rawBan.banned_by || rawBan.by || '').trim() || null;
  const bannedByName = normalizeDisplayNameValue(rawBan.banned_by_name || rawBan.by_name || rawBan.admin_name);

  if (!reason && !bannedAt && !bannedBy && !bannedByName) {
    return null;
  }

  return {
    reason: reason || 'No reason provided.',
    banned_at: bannedAt,
    banned_by: bannedBy,
    banned_by_name: bannedByName,
  };
}

export function isUserBanned(user) {
  return Boolean(getUserBanInfo(user));
}

function buildBanErrorDetails(user) {
  const ban = getUserBanInfo(user);
  if (!ban) return null;

  return {
    reason: ban.reason || null,
    banned_at: ban.banned_at || null,
    banned_by: ban.banned_by || null,
    banned_by_name: ban.banned_by_name || null,
  };
}

export function normalizeIntegerQuery(value, { field = 'value', min = 0, max = Number.MAX_SAFE_INTEGER, fallback = null } = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(400, `${field} must be an integer.`);
  }

  if (parsed < min || parsed > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function normalizeClearTimeRawNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Number(parsed.toFixed(3));
}

export function normalizeClearTimeSeconds(value, { field = 'clear_time', required = false, maxSeconds = 14400 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return null;
  }

  if (typeof value === 'number') {
    const numeric = normalizeClearTimeRawNumber(value);
    if (numeric === null) {
      throw new HttpError(400, `${field} must be a positive number of seconds.`);
    }
    if (numeric > maxSeconds) {
      throw new HttpError(400, `${field} exceeds max allowed seconds (${maxSeconds}).`);
    }
    return numeric;
  }

  const raw = String(value || '').trim();
  if (!raw) {
    if (required) {
      throw new HttpError(400, `${field} is required.`);
    }
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = normalizeClearTimeRawNumber(Number(raw));
    if (numeric === null || numeric > maxSeconds) {
      throw new HttpError(400, `${field} must be within (0, ${maxSeconds}] seconds.`);
    }
    return numeric;
  }

  const parts = raw.split(':').map((entry) => entry.trim());
  if (parts.length === 2 || parts.length === 3) {
    const numbers = parts.map((entry) => Number(entry));
    if (numbers.some((num) => !Number.isFinite(num) || num < 0)) {
      throw new HttpError(400, `${field} format is invalid.`);
    }

    let seconds = 0;
    if (parts.length === 2) {
      const [minutes, secs] = numbers;
      if (secs >= 60) {
        throw new HttpError(400, `${field} seconds component must be < 60.`);
      }
      seconds = minutes * 60 + secs;
    } else {
      const [hours, minutes, secs] = numbers;
      if (minutes >= 60 || secs >= 60) {
        throw new HttpError(400, `${field} minute/second components must be < 60.`);
      }
      seconds = hours * 3600 + minutes * 60 + secs;
    }

    const normalized = normalizeClearTimeRawNumber(seconds);
    if (normalized === null || normalized > maxSeconds) {
      throw new HttpError(400, `${field} must be within (0, ${maxSeconds}] seconds.`);
    }

    return normalized;
  }

  throw new HttpError(400, `${field} must be seconds, mm:ss, or hh:mm:ss.`);
}

const ZONE_NOTE_REPORTER_PATTERN = /\[zt_rp:([^\]]{1,80})\]/i;
const ZONE_NOTE_CLEAR_PATTERN = /\[zt_ct:([0-9]+(?:\.[0-9]+)?)\]/i;

export function parseZoneNoteMeta(notesValue) {
  const notes = String(notesValue || '');
  if (!notes) {
    return { reporter_name: null, clear_time_seconds: null };
  }

  const reporterMatch = notes.match(ZONE_NOTE_REPORTER_PATTERN);
  const clearMatch = notes.match(ZONE_NOTE_CLEAR_PATTERN);

  const reporterName = normalizeDisplayNameValue(reporterMatch?.[1] || null);
  const clearTime = clearMatch ? normalizeClearTimeRawNumber(Number(clearMatch[1])) : null;

  return {
    reporter_name: reporterName,
    clear_time_seconds: clearTime,
  };
}

export function stripZoneNoteMeta(notesValue) {
  const notes = String(notesValue || '');
  if (!notes) return null;

  const stripped = notes
    .replace(ZONE_NOTE_REPORTER_PATTERN, '')
    .replace(ZONE_NOTE_CLEAR_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped || null;
}

export function embedZoneNoteMeta(notesValue, { reporterName = null, clearTimeSeconds = null, maxLength = 200 } = {}) {
  const baseNotes = String(notesValue || '').trim();
  const parts = [];

  const normalizedReporter = normalizeDisplayNameValue(reporterName, { maxLength: 60 });
  if (normalizedReporter) {
    const safeReporter = normalizedReporter.replace(/\]/g, ')');
    parts.push(`[zt_rp:${safeReporter}]`);
  }

  const normalizedClear = normalizeClearTimeRawNumber(clearTimeSeconds);
  if (normalizedClear !== null) {
    parts.push(`[zt_ct:${normalizedClear}]`);
  }

  const prefix = parts.join('');
  const combined = `${prefix}${baseNotes ? ` ${baseNotes}` : ''}`.trim();
  if (!combined) return null;
  return combined.slice(0, maxLength);
}

export function readRequestBody(req) {
  const parsed = parseJsonMaybe(req.body);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function parseBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function requireAuthenticatedUser(req) {
  const token = parseBearerToken(req);
  if (!token) {
    throw new HttpError(401, 'Missing bearer token.');
  }

  ensureSupabaseAuthConfig();

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const apiKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(401, 'Invalid or expired auth token.', errorText);
  }

  const user = await response.json();
  if (!user?.id) {
    throw new HttpError(401, 'Token did not resolve to a user.');
  }

  if (isUserBanned(user)) {
    throw new HttpError(403, 'This account is banned.', buildBanErrorDetails(user));
  }

  return { token, user };
}

export async function supabaseAuthAdminRequest(
  path,
  { method = 'GET', body } = {}
) {
  ensureSupabaseConfig();

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}/auth/v1/admin/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const rawError = await response.text();
    const details = parseJsonMaybe(rawError) || rawError || null;
    throw new HttpError(response.status, 'Supabase auth admin request failed.', details);
  }

  if (response.status === 204) return null;

  const raw = await response.text();
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function supabaseAdminRequest(
  path,
  { method = 'GET', body, prefer = 'return=representation' } = {}
) {
  ensureSupabaseConfig();

  const baseUrl = SUPABASE_URL.replace(/\/$/, '');
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: prefer,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const rawError = await response.text();
    const details = parseJsonMaybe(rawError) || rawError || null;
    throw new HttpError(response.status, 'Supabase request failed.', details);
  }

  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();
  if (!raw) return null;
  return JSON.parse(raw);
}

function isUniqueViolationError(error) {
  if (!error) return false;

  if (Number(error?.status) === 409) {
    return true;
  }

  const details = error?.details;
  if (details && typeof details === 'object') {
    if (String(details.code || '') === '23505') return true;
    const raw = `${details.message || ''} ${details.details || ''} ${details.hint || ''}`.toLowerCase();
    if (raw.includes('duplicate') || raw.includes('unique') || raw.includes('already exists')) {
      return true;
    }
  }

  const raw = String(details || error?.message || '').toLowerCase();
  return raw.includes('23505') || raw.includes('duplicate') || raw.includes('unique') || raw.includes('already exists');
}

export function buildTablePath(table, { select = '*', filters = {} } = {}) {
  const params = new URLSearchParams();
  if (select) {
    params.set('select', select);
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });

  return `${table}?${params.toString()}`;
}

export function normalizeSlotOrder(slotOrder) {
  if (!Array.isArray(slotOrder) || slotOrder.length !== 4) {
    throw new HttpError(400, 'slot_order must be an array of exactly 4 character IDs.');
  }

  const normalized = slotOrder.map((value) => Number(value));
  if (normalized.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new HttpError(400, 'slot_order contains invalid character IDs.');
  }

  return normalized;
}

export function normalizeOutcome(outcome) {
  const normalized = String(outcome || '').trim();
  if (!VALID_OUTCOMES.has(normalized)) {
    throw new HttpError(400, 'Invalid outcome.');
  }
  return normalized;
}

export function normalizeOptionalText(value, { field, maxLength = 200 } = {}) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `${field} exceeds max length (${maxLength}).`);
  }
  return normalized;
}

export function resolveCharacterNames(slotOrder) {
  return slotOrder.map((charId) => CHARACTER_NAME_MAP.get(Number(charId)) || `Character ${charId}`);
}

export function toPgIntArrayLiteral(arr) {
  return `{${arr.map((value) => Number(value)).join(',')}}`;
}

export function computeHash(slotOrder) {
  const [a, b, c, d] = slotOrder;
  const charSum = a + b + c + d;
  const charXor = a ^ b ^ c ^ d;
  const charSlot = (d * 3 + a + b + c) % 10000;
  const xorSlotKey = `${charXor}_${charSlot}`;

  return {
    charSum,
    charXor,
    charSlot,
    xorSlotKey,
  };
}

function formatIsoWeek(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getTimeZoneWallClockDate(date = new Date(), timeZone = ZONE_EPOCH_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  ));
}

function getScheduledEpochWeekKey(date = new Date()) {
  const wallClockDate = getTimeZoneWallClockDate(date);
  wallClockDate.setUTCHours(wallClockDate.getUTCHours() - ZONE_EPOCH_ROLLOVER_HOUR);
  return formatIsoWeek(wallClockDate);
}

export function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function fetchCurrentEpoch() {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        is_current: 'eq.true',
        order: 'created_at.desc',
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function fetchLatestEpoch() {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        order: 'created_at.desc',
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function createEpochRecord({ previousEpochId = null, createdByFlag = false } = {}) {
  const rows = await supabaseAdminRequest(ZONE_EPOCH_TABLE, {
    method: 'POST',
    body: {
      calendar_week: getScheduledEpochWeekKey(),
      created_by_flag: createdByFlag,
      previous_epoch_id: previousEpochId,
      is_current: true,
    },
  });

  const created = Array.isArray(rows) ? rows[0] : rows;
  if (!created?.id) {
    throw new HttpError(500, 'Failed to initialize current zone epoch.');
  }

  return created;
}

async function pruneEpochHistory(currentEpoch) {
  try {
    const keepIds = new Set([currentEpoch?.id, currentEpoch?.previous_epoch_id].filter(Boolean).map((value) => Number(value)));
    if (keepIds.size === 0) return;

    const epochRows = await supabaseAdminRequest(
      buildTablePath(ZONE_EPOCH_TABLE, {
        select: 'id',
        filters: {
          order: 'created_at.desc',
          limit: '100',
        },
      })
    );

    const staleEpochIds = (Array.isArray(epochRows) ? epochRows : [])
      .map((row) => Number(row?.id))
      .filter((id) => Number.isInteger(id) && id > 0 && !keepIds.has(id));

    if (staleEpochIds.length === 0) return;

    const inFilter = `in.(${staleEpochIds.join(',')})`;

    await supabaseAdminRequest(
      buildTablePath(ZONE_FLAGS_TABLE, {
        select: false,
        filters: {
          epoch_id: inFilter,
        },
      }),
      {
        method: 'DELETE',
        prefer: 'return=minimal',
      }
    );

    await supabaseAdminRequest(
      buildTablePath(ZONE_RUNS_TABLE, {
        select: false,
        filters: {
          epoch_id: inFilter,
        },
      }),
      {
        method: 'DELETE',
        prefer: 'return=minimal',
      }
    );

    await supabaseAdminRequest(
      buildTablePath(ZONE_EPOCH_TABLE, {
        select: false,
        filters: {
          id: inFilter,
        },
      }),
      {
        method: 'DELETE',
        prefer: 'return=minimal',
      }
    );
  } catch (error) {
    console.warn('[Zone API] Non-fatal epoch prune failure:', error?.status || error?.message || error);
  }
}

export async function fetchEpochById(epochId) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        id: `eq.${epochId}`,
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function ensureCurrentEpoch() {
  const targetWeekKey = getScheduledEpochWeekKey();
  const existing = await fetchCurrentEpoch();
  if (existing?.id && existing.calendar_week === targetWeekKey) {
    await pruneEpochHistory(existing);
    return existing;
  }

  try {
    const created = existing?.id
      ? await rotateEpochFromFlag(existing, { createdByFlag: false })
      : await createEpochRecord({ previousEpochId: null, createdByFlag: false });
    await pruneEpochHistory(created);
    return created;
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const fallbackCurrent = await fetchCurrentEpoch();
    if (fallbackCurrent) {
      await pruneEpochHistory(fallbackCurrent);
      return fallbackCurrent;
    }
    throw new HttpError(500, 'Failed to initialize current zone epoch after retry.');
  }
}

export async function fetchPreviousEpoch(currentEpoch) {
  if (!currentEpoch) return null;

  if (currentEpoch.previous_epoch_id) {
    const previous = await fetchEpochById(currentEpoch.previous_epoch_id);
    if (previous) return previous;
  }

  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      filters: {
        is_current: 'eq.false',
        order: 'created_at.desc',
        limit: '1',
      },
    })
  );

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function resolveReadableEpochContext(requestedEpoch = 'current') {
  const normalizedEpoch = String(requestedEpoch || 'current').toLowerCase() === 'previous' ? 'previous' : 'current';

  try {
    const currentEpoch = await ensureCurrentEpoch();
    const targetEpoch = normalizedEpoch === 'previous' ? await fetchPreviousEpoch(currentEpoch) : currentEpoch;

    return {
      currentEpoch,
      targetEpoch,
      resolvedEpochSource: normalizedEpoch,
      recoveredFromConflict: false,
    };
  } catch (error) {
    if (Number(error?.status) !== 409) {
      throw error;
    }

    console.warn('[Zone API] Falling back to latest readable epoch after current-epoch conflict.', error?.details || error);

    let fallbackCurrent = null;
    try {
      fallbackCurrent = await fetchCurrentEpoch();
    } catch {
      fallbackCurrent = null;
    }

    if (!fallbackCurrent) {
      try {
        fallbackCurrent = await fetchLatestEpoch();
      } catch {
        fallbackCurrent = null;
      }
    }

    let targetEpoch = fallbackCurrent;
    let resolvedEpochSource = `${normalizedEpoch}-fallback`;

    if (normalizedEpoch === 'previous') {
      try {
        targetEpoch = await fetchPreviousEpoch(fallbackCurrent);
      } catch {
        targetEpoch = null;
      }
      resolvedEpochSource = targetEpoch ? 'previous-fallback' : 'previous-unavailable';
    } else if (!targetEpoch) {
      resolvedEpochSource = 'current-unavailable';
    }

    return {
      currentEpoch: fallbackCurrent,
      targetEpoch,
      resolvedEpochSource,
      recoveredFromConflict: true,
    };
  }
}

export async function countDistinctRecentFlags(epochId, sinceIso) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_FLAGS_TABLE, {
      select: 'user_id',
      filters: {
        epoch_id: `eq.${epochId}`,
        created_at: `gte.${sinceIso}`,
      },
    })
  );

  const uniqueUsers = new Set((Array.isArray(rows) ? rows : []).map((row) => row.user_id).filter(Boolean));
  return uniqueUsers.size;
}

export async function rotateEpochFromFlag(currentEpoch, { createdByFlag = true } = {}) {
  if (!currentEpoch?.id) {
    throw new HttpError(500, 'Cannot rotate epoch without a valid current epoch.');
  }

  await supabaseAdminRequest(
    buildTablePath(ZONE_EPOCH_TABLE, {
      select: false,
      filters: {
        id: `eq.${currentEpoch.id}`,
      },
    }),
    {
      method: 'PATCH',
      body: { is_current: false },
      prefer: 'return=minimal',
    }
  );

  try {
    const created = await createEpochRecord({ previousEpochId: currentEpoch.id, createdByFlag });
    await pruneEpochHistory(created);
    return created;
  } catch (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const fallbackCurrent = await fetchCurrentEpoch();
    if (fallbackCurrent?.id) {
      await pruneEpochHistory(fallbackCurrent);
      return fallbackCurrent;
    }
    throw new HttpError(500, 'Failed to rotate zone epoch after retry.');
  }
}

export function computeConfidenceLabel(runs) {
  if (runs >= 6) return 'HIGH';
  if (runs >= 3) return 'MEDIUM';
  return 'LOW';
}

export function computeOutcomeDropScore(outcome) {
  if (CRIT_OUTCOMES.has(outcome)) return 1;
  if (JUNK_OUTCOMES.has(outcome)) return 0;
  if (VALID_OUTCOMES.has(outcome)) return 0.5;
  return null;
}

export function buildEpochSummaryFromRuns(runs) {
  const summary = {
    total_runs: 0,
    crit_count: 0,
    junk_count: 0,
    mixed_count: 0,
    crit_rate: null,
    avg_drop_score: null,
    avg_clear_time_seconds: null,
    clear_time_samples: 0,
  };

  let dropScoreTotal = 0;
  let dropScoreCount = 0;
  let clearTimeTotal = 0;
  let clearTimeCount = 0;

  for (const run of Array.isArray(runs) ? runs : []) {
    summary.total_runs += 1;

    if (CRIT_OUTCOMES.has(run.outcome)) {
      summary.crit_count += 1;
    } else if (JUNK_OUTCOMES.has(run.outcome)) {
      summary.junk_count += 1;
    } else {
      summary.mixed_count += 1;
    }

    const dropScore = computeOutcomeDropScore(run.outcome);
    if (dropScore !== null) {
      dropScoreTotal += dropScore;
      dropScoreCount += 1;
    }

    const noteMeta = parseZoneNoteMeta(run.notes);
    const clearTime = normalizeClearTimeRawNumber(run.clear_time_seconds ?? noteMeta.clear_time_seconds);
    if (clearTime !== null) {
      clearTimeTotal += clearTime;
      clearTimeCount += 1;
    }
  }

  const critDenominator = summary.crit_count + summary.junk_count;
  summary.crit_rate = critDenominator > 0 ? Number((summary.crit_count / critDenominator).toFixed(4)) : null;
  summary.avg_drop_score = dropScoreCount > 0 ? Number((dropScoreTotal / dropScoreCount).toFixed(4)) : null;
  summary.avg_clear_time_seconds = clearTimeCount > 0 ? Number((clearTimeTotal / clearTimeCount).toFixed(3)) : null;
  summary.clear_time_samples = clearTimeCount;

  return summary;
}

export function buildZoneMapFromRuns(runs) {
  const groups = new Map();

  for (const run of Array.isArray(runs) ? runs : []) {
    const key = run.xor_slot_key || `${run.char_xor}_${run.char_slot}`;
    const noteMeta = parseZoneNoteMeta(run.notes);
    const runReporterName = normalizeDisplayNameValue(run.reporter_name || noteMeta.reporter_name);
    const runClearTime = normalizeClearTimeRawNumber(run.clear_time_seconds ?? noteMeta.clear_time_seconds);

    if (!groups.has(key)) {
      groups.set(key, {
        xor_slot_key: key,
        char_xor: Number(run.char_xor),
        char_slot: Number(run.char_slot),
        char_sum: Number(run.char_sum),
        runs: 0,
        crit_count: 0,
        junk_count: 0,
        mixed_count: 0,
        sample_slot_order: run.slot_order || [],
        sample_char_names: run.char_names || [],
        last_submitted_at: run.submitted_at || null,
        latest_reporter_name: runReporterName,
        latest_clear_time_seconds: runClearTime,
        latest_note: stripZoneNoteMeta(run.notes),
        _seen_char_ids: new Set(),
        _seen_char_names: new Set(),
        _cavern_counts: new Map(),
        _region_counts: new Map(),
        _reporter_counts: new Map(),
        _clear_time_total: 0,
        _clear_time_count: 0,
        _drop_score_total: 0,
        _drop_score_count: 0,
        _relic_data_list: [],
        _relic_substats: [],
      });
    }

    const group = groups.get(key);
    group.runs += 1;

    if (run.submitted_at && (!group.last_submitted_at || run.submitted_at > group.last_submitted_at)) {
      group.last_submitted_at = run.submitted_at;
      if (runReporterName) {
        group.latest_reporter_name = runReporterName;
      }
      if (runClearTime !== null) {
        group.latest_clear_time_seconds = runClearTime;
      }
      group.latest_note = stripZoneNoteMeta(run.notes);
    }

    const slotOrder = Array.isArray(run.slot_order) ? run.slot_order : [];
    for (const charId of slotOrder) {
      const parsed = Number(charId);
      if (Number.isInteger(parsed) && parsed > 0) {
        group._seen_char_ids.add(parsed);
      }
    }

    const charNames = Array.isArray(run.char_names) ? run.char_names : [];
    for (const charName of charNames) {
      const normalized = String(charName || '').trim();
      if (normalized) {
        group._seen_char_names.add(normalized);
      }
    }

    if (runReporterName) {
      const currentReporterCount = group._reporter_counts.get(runReporterName) || 0;
      group._reporter_counts.set(runReporterName, currentReporterCount + 1);

      if (!group.latest_reporter_name && !run.submitted_at) {
        group.latest_reporter_name = runReporterName;
      }
    }

    if (runClearTime !== null) {
      group._clear_time_total += runClearTime;
      group._clear_time_count += 1;

      if (group.latest_clear_time_seconds === null && !run.submitted_at) {
        group.latest_clear_time_seconds = runClearTime;
      }
    }

    const cavernId = String(run.cavern || '').trim() || 'unknown';
    const currentCavernCount = group._cavern_counts.get(cavernId) || 0;
    group._cavern_counts.set(cavernId, currentCavernCount + 1);

    const regionId = String(run.server_region || '').trim().toLowerCase() || 'unknown';
    const currentRegionCount = group._region_counts.get(regionId) || 0;
    group._region_counts.set(regionId, currentRegionCount + 1);

    if (CRIT_OUTCOMES.has(run.outcome)) {
      group.crit_count += 1;
    } else if (JUNK_OUTCOMES.has(run.outcome)) {
      group.junk_count += 1;
    } else {
      group.mixed_count += 1;
    }

    const runDropScore = computeOutcomeDropScore(run.outcome);
    if (runDropScore !== null) {
      group._drop_score_total += runDropScore;
      group._drop_score_count += 1;
    }
    if (run.relic_data) {
      group._relic_data_list.push(run.relic_data);
    }

    if (Array.isArray(run.relic_substats)) {
      for (const substat of run.relic_substats) {
        const normalized = String(substat || '').trim();
        if (normalized) {
          group._relic_substats.push(normalized);
        }
      }
    }
  }

  const zones = Array.from(groups.values()).map((group) => {
    const denominator = group.crit_count + group.junk_count;
    const critRate = denominator > 0 ? group.crit_count / denominator : null;
    const confidence = computeConfidenceLabel(group.runs);
    const sampleWeight = Math.min(group.runs, 10) / 10;
    const rateWeight = critRate === null ? 0 : critRate;
    const weightedConfidence = Number((rateWeight * 0.7 + sampleWeight * 0.3).toFixed(4));

    const cavernEntries = Array.from(group._cavern_counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });
    const caverns = cavernEntries.map(([id]) => id);

    const regionEntries = Array.from(group._region_counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });
    const regions = regionEntries.map(([id]) => id);

    const reporterEntries = Array.from(group._reporter_counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });
    const reporterNames = reporterEntries.map(([name]) => name);

    const avgClearTime = group._clear_time_count > 0
      ? Number((group._clear_time_total / group._clear_time_count).toFixed(3))
      : null;

    const avgDropScore = group._drop_score_count > 0
      ? Number((group._drop_score_total / group._drop_score_count).toFixed(4))
      : null;

    return {
      xor_slot_key: group.xor_slot_key,
      char_xor: group.char_xor,
      char_slot: group.char_slot,
      char_sum: group.char_sum,
      runs: group.runs,
      crit_count: group.crit_count,
      junk_count: group.junk_count,
      mixed_count: group.mixed_count,
      sample_slot_order: group.sample_slot_order,
      sample_char_names: group.sample_char_names,
      last_submitted_at: group.last_submitted_at,
      seen_char_ids: Array.from(group._seen_char_ids).sort((a, b) => a - b),
      seen_char_names: Array.from(group._seen_char_names).sort((a, b) => String(a).localeCompare(String(b))),
      caverns,
      dominant_cavern: caverns[0] || null,
      cavern_counts: Object.fromEntries(cavernEntries),
      regions,
      dominant_region: regions[0] || null,
      region_counts: Object.fromEntries(regionEntries),
      latest_reporter_name: group.latest_reporter_name,
      latest_note: group.latest_note || null,
      top_reporter_name: reporterEntries[0]?.[0] || null,
      reporter_names: reporterNames,
      reporter_counts: Object.fromEntries(reporterEntries),
      latest_clear_time_seconds: group.latest_clear_time_seconds,
      avg_clear_time_seconds: avgClearTime,
      clear_time_samples: group._clear_time_count,
      avg_drop_score: avgDropScore,
      crit_rate: critRate === null ? null : Number(critRate.toFixed(4)),
      weighted_confidence: weightedConfidence,
      confidence,
      aggregated_substats: [...group._relic_substats],
      sample_relic_data: {
        relics: group._relic_data_list.reduce((acc, rd) => {
          if (Array.isArray(rd?.relics)) acc.push(...rd.relics);
          return acc;
        }, [])
      },
    };
  });

  zones.sort((a, b) => {
    const aRate = a.crit_rate;
    const bRate = b.crit_rate;
    if (aRate === null && bRate !== null) return 1;
    if (bRate === null && aRate !== null) return -1;
    if (aRate !== bRate) return (bRate || 0) - (aRate || 0);
    if (a.weighted_confidence !== b.weighted_confidence) {
      return b.weighted_confidence - a.weighted_confidence;
    }
    return b.runs - a.runs;
  });

  return zones;
}
function parsePgArrayMaybe(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [];
  }

  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }

  return body.split(',').map((token) => Number(String(token).trim()));
}

function normalizeOwnedCharacterIds(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && CHARACTER_NUM_ID_SET.has(value))
    )
  ).sort((a, b) => a - b);
}

export async function readOwnedCharacterIds(userId) {
  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_ROSTERS_TABLE, {
      select: 'owned_char_ids',
      filters: {
        user_id: `eq.${userId}`,
        limit: '1',
      },
    })
  );

  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row) return [];

  const rawOwned = Array.isArray(row.owned_char_ids) ? row.owned_char_ids : parsePgArrayMaybe(row.owned_char_ids);
  return normalizeOwnedCharacterIds(rawOwned);
}

export async function upsertOwnedCharacterIds(userId, ownedCharIds) {
  const normalizedOwned = normalizeOwnedCharacterIds(ownedCharIds);

  const rows = await supabaseAdminRequest(
    buildTablePath(ZONE_ROSTERS_TABLE, {
      select: 'user_id,owned_char_ids',
      filters: {
        on_conflict: 'user_id',
      },
    }),
    {
      method: 'POST',
      body: {
        user_id: userId,
        owned_char_ids: normalizedOwned,
      },
      prefer: 'resolution=merge-duplicates,return=representation',
    }
  );

  const row = Array.isArray(rows) ? rows[0] : rows;
  const responseOwned = row?.owned_char_ids;
  const storedOwned = Array.isArray(responseOwned)
    ? responseOwned
    : parsePgArrayMaybe(responseOwned);

  return {
    user_id: row?.user_id || userId,
    owned_char_ids: normalizeOwnedCharacterIds(storedOwned),
  };
}

export function handleApiError(res, error) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      details: error.details || undefined,
    });
  }

  console.error('[Zone API] Unexpected error:', error);
  return res.status(500).json({ error: 'Unexpected zone API error.' });
}


