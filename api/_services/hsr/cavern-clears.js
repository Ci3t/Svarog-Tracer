import { del as blobDel, list as blobList, put as blobPut } from '@vercel/blob';
import crypto from 'node:crypto';
import { isZoneAdminUser, requireAuthenticatedUser } from '../zone/shared.js';

const BLOB_PREFIX = 'hsr-cavern-clears-';
const INITIAL_DATA = [];
const CACHE_TTL_MS = 15_000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_CAVERN_TABLE = process.env.SUPABASE_CAVERN_TABLE || 'cavern_clears';

let lambdaDataCache = null;
let lambdaCacheTime = 0;

const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const ensureArray = (value) => (Array.isArray(value) ? value : []);

const setCache = (data) => {
  lambdaDataCache = Array.isArray(data) ? data : INITIAL_DATA;
  lambdaCacheTime = Date.now();
};

const invalidateCache = () => {
  lambdaDataCache = null;
  lambdaCacheTime = 0;
};

const getCachedData = () => {
  if (!lambdaDataCache) return null;
  if (Date.now() - lambdaCacheTime > CACHE_TTL_MS) return null;
  return lambdaDataCache;
};

function getCurrentWeeklyResetBoundary(now = new Date()) {
  const boundary = new Date(now);
  boundary.setUTCHours(6, 0, 0, 0);
  const day = boundary.getUTCDay();
  let diff = (day + 6) % 7; // days since Monday
  if (day === 1 && now.getUTCHours() < 6) {
    diff = 7;
  }
  boundary.setUTCDate(boundary.getUTCDate() - diff);
  return boundary;
}

function normalizeIsoDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function sanitizeEntryForBoundary(entry, boundaryMs) {
  const reports = ensureArray(entry?.reports).filter((report) => {
    const ts = new Date(report?.timestamp || 0).getTime();
    return Number.isFinite(ts) && ts >= boundaryMs;
  });

  if (reports.length > 0) {
    const reporters = [...new Set(reports.map((report) => String(report?.reporter || '').trim()).filter(Boolean))];
    const reportTimes = reports
      .map((report) => new Date(report.timestamp).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    return {
      ...entry,
      reports,
      reporters,
      verifiedCount: reports.length,
      firstReported: reportTimes.length > 0 ? new Date(reportTimes[0]).toISOString() : normalizeIsoDate(entry?.firstReported),
      lastReported: reportTimes.length > 0 ? new Date(reportTimes[reportTimes.length - 1]).toISOString() : normalizeIsoDate(entry?.lastReported),
    };
  }

  const fallbackTime = new Date(entry?.lastReported || entry?.firstReported || 0).getTime();
  if (!Number.isFinite(fallbackTime) || fallbackTime < boundaryMs) {
    return null;
  }

  return {
    ...entry,
    reports: [],
    reporters: ensureArray(entry?.reporters),
    verifiedCount: Number(entry?.verifiedCount || 0),
    firstReported: normalizeIsoDate(entry?.firstReported),
    lastReported: normalizeIsoDate(entry?.lastReported),
  };
}

function trimDataToCurrentWeek(data, boundaryDate = getCurrentWeeklyResetBoundary()) {
  const boundaryMs = boundaryDate.getTime();
  let changed = false;

  const nextData = ensureArray(data)
    .map((entry) => {
      const sanitized = sanitizeEntryForBoundary(entry, boundaryMs);
      if (!sanitized) {
        changed = true;
        return null;
      }

      const originalReports = ensureArray(entry?.reports);
      if (originalReports.length !== ensureArray(sanitized.reports).length) {
        changed = true;
      }
      if (String(entry?.lastReported || '') !== String(sanitized.lastReported || '')) {
        changed = true;
      }
      if (Number(entry?.verifiedCount || 0) !== Number(sanitized.verifiedCount || 0)) {
        changed = true;
      }
      return sanitized;
    })
    .filter(Boolean);

  if (nextData.length !== ensureArray(data).length) {
    changed = true;
  }

  return {
    data: nextData,
    changed,
    boundaryIso: boundaryDate.toISOString(),
  };
}

const normalizeChars = (arr) => {
  if (!arr) return '';
  const toArr = Array.isArray(arr) ? arr : String(arr).split(',');
  return toArr.map((val) => String(val).trim().toLowerCase()).sort().join(',');
};

const normalizeTime = (t) => (t ? String(t).trim().replace(/^0/, '') : '');
export const normalizeKey = (val) => (val || '').toString().trim().replace(/['"]/g, '');
const normalizeRelicId = (val) => normalizeKey(val).toLowerCase();

const buildVariantKeys = ({ relicId, clearTime, characters, substats }) => ({
  relicKey: normalizeRelicId(relicId),
  clearTimeKey: normalizeTime(clearTime),
  charactersKey: normalizeChars(characters),
  substatsKey: substats && substats.length > 0 ? normalizeChars(substats) : 'none',
});

const toEntry = (row) => ({
  id: row.id,
  relicId: row.relic_id,
  clearTime: row.clear_time,
  characters: ensureArray(row.characters),
  substats: ensureArray(row.substats),
  mainStat: row.main_stat || undefined,
  reporters: ensureArray(row.reporters),
  reports: ensureArray(row.reports),
  verifiedCount: Number(row.verified_count || ensureArray(row.reports).length || 0),
  likes: ensureArray(row.likes),
  firstReported: row.first_reported,
  lastReported: row.last_reported,
});

const toRow = (entry) => {
  const reports = ensureArray(entry.reports);
  const substats = entry.substats || (reports[0] && reports[0].substats) || [];
  const reporters = entry.reporters || [...new Set(reports.map((report) => report.reporter).filter(Boolean))];
  const keys = buildVariantKeys({
    relicId: entry.relicId,
    clearTime: entry.clearTime,
    characters: entry.characters,
    substats,
  });

  return {
    relic_id: entry.relicId,
    relic_key: keys.relicKey,
    clear_time: entry.clearTime,
    clear_time_key: keys.clearTimeKey,
    characters: ensureArray(entry.characters),
    characters_key: keys.charactersKey,
    substats,
    substats_key: keys.substatsKey,
    main_stat: entry.mainStat || (reports[0] && reports[0].mainStat) || null,
    reporters,
    reports,
    verified_count: Number(entry.verifiedCount || reports.length || 0),
    likes: ensureArray(entry.likes),
    first_reported: entry.firstReported || (reports[0] && reports[0].timestamp) || new Date().toISOString(),
    last_reported: entry.lastReported || new Date().toISOString(),
  };
};

async function supabaseRequest(path, { method = 'GET', body, prefer = 'return=representation' } = {}) {
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
    const errorText = await response.text();
    throw new Error(`Supabase error (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}

function buildTablePath(filters = {}, includeSelect = true) {
  const params = new URLSearchParams();

  if (includeSelect) {
    params.set('select', '*');
  }

  Object.entries(filters).forEach(([key, value]) => {
    params.set(key, value);
  });

  return `${SUPABASE_CAVERN_TABLE}?${params.toString()}`;
}

async function getAllSupabaseEntries() {
  const rows = await supabaseRequest(buildTablePath());
  const data = ensureArray(rows).map(toEntry);
  setCache(data);
  return { data, allBlobs: [] };
}

async function findSupabaseVariantEntry(keys) {
  const rows = await supabaseRequest(
    buildTablePath({
      relic_key: `eq.${keys.relicKey}`,
      clear_time_key: `eq.${keys.clearTimeKey}`,
      characters_key: `eq.${keys.charactersKey}`,
      substats_key: `eq.${keys.substatsKey}`,
      limit: '1',
    })
  );

  const row = ensureArray(rows)[0];
  return row ? toEntry(row) : null;
}

async function findSupabaseBaseEntries({ relicId, clearTime, characters }) {
  const keys = buildVariantKeys({ relicId, clearTime, characters, substats: [] });
  const rows = await supabaseRequest(
    buildTablePath({
      relic_key: `eq.${keys.relicKey}`,
      clear_time_key: `eq.${keys.clearTimeKey}`,
      characters_key: `eq.${keys.charactersKey}`,
    })
  );

  return ensureArray(rows).map(toEntry);
}

async function insertSupabaseEntry(entry) {
  const rows = await supabaseRequest(SUPABASE_CAVERN_TABLE, {
    method: 'POST',
    body: toRow(entry),
  });

  invalidateCache();
  const created = Array.isArray(rows) ? rows[0] : rows;
  return created ? toEntry(created) : null;
}

async function updateSupabaseEntry(entry) {
  const rows = await supabaseRequest(
    buildTablePath({ id: `eq.${entry.id}` }),
    {
      method: 'PATCH',
      body: toRow(entry),
    }
  );

  invalidateCache();
  const updated = Array.isArray(rows) ? rows[0] : rows;
  return updated ? toEntry(updated) : null;
}

async function deleteSupabaseEntryById(id) {
  await supabaseRequest(
    buildTablePath({ id: `eq.${id}` }, false),
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  invalidateCache();
}

async function deleteAllSupabaseEntries() {
  await supabaseRequest(
    buildTablePath({ id: 'not.is.null' }, false),
    { method: 'DELETE', prefer: 'return=minimal' }
  );
  invalidateCache();
}

async function replaceAllSupabaseEntries(newData) {
  await deleteAllSupabaseEntries();

  if (!Array.isArray(newData) || newData.length === 0) {
    setCache([]);
    return;
  }

  const rows = newData.map(toRow);
  await supabaseRequest(SUPABASE_CAVERN_TABLE, {
    method: 'POST',
    body: rows,
    prefer: 'return=minimal',
  });

  setCache(newData);
}

async function getBlobCavernData() {
  try {
    const { blobs } = await blobList({ prefix: BLOB_PREFIX });
    let legacyBlobs = [];

    if (blobs.length === 0) {
      const legacyObj = await blobList({ prefix: 'hsr-cavern-clears.json' });
      legacyBlobs = legacyObj.blobs;
    }

    const allBlobs = [...blobs, ...legacyBlobs];

    if (allBlobs.length > 0) {
      allBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const latestUrl = allBlobs[0].url;
      const response = await fetch(`${latestUrl}?t=${Date.now()}`, { cache: 'no-store' });

      if (response.ok) {
        const data = await response.json();
        setCache(data);
        return { data, allBlobs };
      }
    }

    return { data: INITIAL_DATA, allBlobs: [] };
  } catch (error) {
    console.error('[Cavern API] Blob error:', error);
    return { data: INITIAL_DATA, allBlobs: [] };
  }
}

async function saveBlobCavernData(newData, allBlobs) {
  setCache(newData);

  const newName = `hsr-cavern-clears-${Date.now()}.json`;
  await blobPut(newName, JSON.stringify(newData, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  });

  const oldUrls = ensureArray(allBlobs).map((blob) => blob.url);
  if (oldUrls.length > 0) {
    await blobDel(oldUrls);
  }
}

export async function getCavernData() {
  const cached = getCachedData();
  if (cached) {
    const trimmed = trimDataToCurrentWeek(cached);
    if (!trimmed.changed) {
      return { data: trimmed.data, allBlobs: [] };
    }
  }

  if (hasSupabaseConfig()) {
    try {
      const { data, allBlobs } = await getAllSupabaseEntries();
      const trimmed = trimDataToCurrentWeek(data);
      if (trimmed.changed) {
        await replaceAllSupabaseEntries(trimmed.data);
        return { data: trimmed.data, allBlobs };
      }
      return { data: trimmed.data, allBlobs };
    } catch (error) {
      console.error('[Cavern API] Supabase read error:', error);
      return { data: INITIAL_DATA, allBlobs: [] };
    }
  }

  const blobPayload = await getBlobCavernData();
  const trimmed = trimDataToCurrentWeek(blobPayload.data);
  if (trimmed.changed) {
    await saveBlobCavernData(trimmed.data, blobPayload.allBlobs);
    return { data: trimmed.data, allBlobs: [] };
  }
  return { data: trimmed.data, allBlobs: blobPayload.allBlobs };
}

export async function saveCavernData(newData, allBlobs) {
  if (hasSupabaseConfig()) {
    return replaceAllSupabaseEntries(newData);
  }

  return saveBlobCavernData(newData, allBlobs);
}

async function resolveAdminAccess(req, { key, apiKey }) {
  try {
    const auth = await requireAuthenticatedUser(req);
    const isAdmin = isZoneAdminUser(auth.user);
    return {
      isAdmin,
      isSuperAdmin: isAdmin,
    };
  } catch {
    return {
      isAdmin: false,
      isSuperAdmin: false,
    };
  }
}

export async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE', 'OPTIONS'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { data } = await getCavernData();
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=15, stale-while-revalidate=60');
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch cavern data' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, userId, relicId, clearTime, characters, discordUser, note, substats, mainStat } =
        req.body;

      if (action === 'like') {
        if (!userId || !relicId || !clearTime || !characters) {
          return res.status(400).json({ error: 'Missing identity for like action.' });
        }

        const keys = buildVariantKeys({ relicId, clearTime, characters, substats });

        if (hasSupabaseConfig()) {
          const entry = await findSupabaseVariantEntry(keys);

          if (!entry) {
            return res.status(404).json({ error: 'Record not found to like.' });
          }

          const likes = ensureArray(entry.likes);
          const likeAction = req.body.likeAction;
          const userIdx = likes.indexOf(userId);

          if (likeAction === 'remove') {
            if (userIdx !== -1) likes.splice(userIdx, 1);
          } else if (userIdx === -1) {
            likes.push(userId);
          }

          entry.likes = likes;
          await updateSupabaseEntry(entry);

          return res.status(200).json({ success: true, likes });
        }

        const { data, allBlobs } = await getCavernData();
        const entry = data.find((row) => {
          const rowSubstats = row.substats || (row.reports && row.reports[0] && row.reports[0].substats) || [];
          const rowKeys = buildVariantKeys({
            relicId: row.relicId,
            clearTime: row.clearTime,
            characters: row.characters,
            substats: rowSubstats,
          });

          return (
            rowKeys.relicKey === keys.relicKey &&
            rowKeys.clearTimeKey === keys.clearTimeKey &&
            rowKeys.charactersKey === keys.charactersKey &&
            rowKeys.substatsKey === keys.substatsKey
          );
        });

        if (!entry) {
          return res.status(404).json({ error: 'Record not found to like.' });
        }

        if (!entry.likes) entry.likes = [];
        const userIdx = entry.likes.indexOf(userId);
        if (req.body.likeAction === 'remove') {
          if (userIdx !== -1) entry.likes.splice(userIdx, 1);
        } else if (userIdx === -1) {
          entry.likes.push(userId);
        }

        await saveCavernData(data, allBlobs);
        return res.status(200).json({ success: true, likes: entry.likes });
      }

      if (!relicId || !clearTime || !characters || characters.length !== 4) {
        return res.status(400).json({ error: 'Incomplete payload.' });
      }
      if (!discordUser || discordUser.trim().length < 2) {
        return res.status(400).json({ error: 'Discord ID required.' });
      }
      if (!/^\d{1,2}:\d{2}$/.test(clearTime)) {
        return res.status(400).json({ error: 'Format must be MM:SS.' });
      }
      if (note && note.length > 40) {
        return res.status(400).json({ error: 'Note exceeds 40 characters.' });
      }
      if (!substats || !Array.isArray(substats) || substats.length === 0 || substats.length > 4) {
        return res.status(400).json({ error: 'At least 1 substat is required (max 4).' });
      }
      if (mainStat && typeof mainStat !== 'string') {
        return res.status(400).json({ error: 'Invalid main stat format.' });
      }

      const reportId = crypto.randomUUID();
      const secretKey = crypto.randomUUID();
      const reportObj = {
        id: reportId,
        key: secretKey,
        reporter: discordUser.trim(),
        timestamp: new Date().toISOString(),
        note: note ? note.trim() : undefined,
        substats,
        mainStat: mainStat || undefined,
      };

      const keys = buildVariantKeys({ relicId, clearTime, characters, substats });

      if (hasSupabaseConfig()) {
        const existingEntry = await findSupabaseVariantEntry(keys);

        if (existingEntry) {
          existingEntry.verifiedCount = (existingEntry.verifiedCount || 1) + 1;
          existingEntry.lastReported = new Date().toISOString();
          existingEntry.reports = ensureArray(existingEntry.reports);
          existingEntry.reports.push(reportObj);
          existingEntry.reporters = ensureArray(existingEntry.reporters);

          if (!existingEntry.reporters.includes(discordUser.trim())) {
            existingEntry.reporters.push(discordUser.trim());
          }

          if (!existingEntry.mainStat && mainStat) {
            existingEntry.mainStat = mainStat;
          }

          await updateSupabaseEntry(existingEntry);
        } else {
          await insertSupabaseEntry({
            relicId,
            clearTime,
            characters,
            substats,
            mainStat: mainStat || undefined,
            reporters: [discordUser.trim()],
            reports: [reportObj],
            verifiedCount: 1,
            likes: [],
            firstReported: new Date().toISOString(),
            lastReported: new Date().toISOString(),
          });
        }

        return res.status(200).json({
          success: true,
          reportId,
          secretKey,
          message: 'Report archived successfully.',
        });
      }

      const { data, allBlobs } = await getCavernData();
      const existingEntry = data.find((entry) => {
        const rowSubstats = entry.substats || (entry.reports && entry.reports[0] && entry.reports[0].substats) || [];
        const rowKeys = buildVariantKeys({
          relicId: entry.relicId,
          clearTime: entry.clearTime,
          characters: entry.characters,
          substats: rowSubstats,
        });

        return (
          rowKeys.relicKey === keys.relicKey &&
          rowKeys.clearTimeKey === keys.clearTimeKey &&
          rowKeys.charactersKey === keys.charactersKey &&
          rowKeys.substatsKey === keys.substatsKey
        );
      });

      if (existingEntry) {
        existingEntry.verifiedCount = (existingEntry.verifiedCount || 1) + 1;
        existingEntry.lastReported = new Date().toISOString();
        if (!existingEntry.reports) existingEntry.reports = [];
        existingEntry.reports.push(reportObj);
        if (!existingEntry.reporters) existingEntry.reporters = [];
        if (!existingEntry.reporters.includes(discordUser.trim())) {
          existingEntry.reporters.push(discordUser.trim());
        }
        if (!existingEntry.mainStat && mainStat) {
          existingEntry.mainStat = mainStat;
        }
      } else {
        data.push({
          relicId,
          clearTime,
          characters,
          substats,
          mainStat: mainStat || undefined,
          reporters: [discordUser.trim()],
          reports: [reportObj],
          verifiedCount: 1,
          likes: [],
          firstReported: new Date().toISOString(),
          lastReported: new Date().toISOString(),
        });
      }

      await saveCavernData(data, allBlobs);

      return res.status(200).json({
        success: true,
        reportId,
        secretKey,
        message: 'Report archived successfully.',
      });
    } catch (error) {
      console.error('[Cavern API] POST error:', error);
      return res.status(500).json({ error: 'Failed to record session.' });
    }
  }

  if (req.method === 'DELETE') {
    const { reportId, relicId, clearTime, characters, key } = req.query;
    const apiKey = req.headers['x-api-key'];

    try {
      const { isAdmin, isSuperAdmin } = await resolveAdminAccess(req, { key, apiKey });

      if (!reportId && !relicId) {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(401).json({ error: 'Unauthorized: Admin access required for full purge.' });
        }

        if (hasSupabaseConfig()) {
          await deleteAllSupabaseEntries();
        } else {
          const { allBlobs } = await getCavernData();
          await saveCavernData([], allBlobs);
        }

        return res.status(200).json({ success: true, message: 'Archive completely purged.' });
      }

      if (hasSupabaseConfig()) {
        if (reportId) {
          const { data } = await getAllSupabaseEntries();
          const entry = data.find((row) => ensureArray(row.reports).some((report) => report.id === reportId));

          if (!entry) {
            return res.status(404).json({ error: 'Record not found.' });
          }

          const report = entry.reports.find((row) => row.id === reportId);
          if (report.key !== key && !isAdmin && !isSuperAdmin) {
            return res.status(401).json({ error: 'Invalid key for this report.' });
          }

          entry.reports = entry.reports.filter((row) => row.id !== reportId);
          entry.verifiedCount = entry.reports.length;
          entry.reporters = [...new Set(entry.reports.map((row) => row.reporter).filter(Boolean))];
          entry.lastReported = new Date().toISOString();

          if (entry.reports.length === 0) {
            await deleteSupabaseEntryById(entry.id);
          } else {
            await updateSupabaseEntry(entry);
          }

          return res.status(200).json({ success: true, message: 'Archive record expunged.' });
        }

        if (relicId && clearTime && characters) {
          if (!isAdmin) {
            return res.status(401).json({ error: 'Admin access required to expunge a full variant.' });
          }

          const requestedSubstats =
            req.query.substats && req.query.substats !== 'undefined'
              ? String(req.query.substats).split(',')
              : [];
          let entry = await findSupabaseVariantEntry(
            buildVariantKeys({
              relicId,
              clearTime,
              characters: String(characters).split(','),
              substats: requestedSubstats,
            })
          );

          if (!entry) {
            const baseMatches = await findSupabaseBaseEntries({
              relicId,
              clearTime,
              characters: String(characters).split(','),
            });

            if (baseMatches.length === 1) {
              entry = baseMatches[0];
            }
          }

          if (!entry) {
            return res.status(404).json({ error: 'Record not found.' });
          }

          await deleteSupabaseEntryById(entry.id);
          return res.status(200).json({ success: true, message: 'Archive record expunged.' });
        }

        return res.status(404).json({ error: 'Record not found.' });
      }

      const { data, allBlobs } = await getCavernData();
      let found = false;

      if (reportId) {
        for (let i = 0; i < data.length; i += 1) {
          const entry = data[i];
          if (!entry.reports) continue;

          const reportIndex = entry.reports.findIndex((report) => report.id === reportId);
          if (reportIndex === -1) continue;

          const report = entry.reports[reportIndex];
          if (report.key !== key && !isAdmin && !isSuperAdmin) {
            return res.status(401).json({ error: 'Invalid key for this report.' });
          }

          entry.reports.splice(reportIndex, 1);
          entry.verifiedCount = entry.reports.length;
          entry.reporters = [...new Set(entry.reports.map((reportRow) => reportRow.reporter))];

          if (entry.reports.length === 0) {
            data.splice(i, 1);
          }

          found = true;
          break;
        }
      } else if (relicId && clearTime && characters) {
        if (!isAdmin) {
          return res.status(401).json({ error: 'Admin access required to expunge a full variant.' });
        }

        const targetTime = normalizeTime(clearTime);
        const charsSorted = normalizeChars(characters);
        const substatsSorted =
          req.query.substats && req.query.substats !== 'undefined'
            ? normalizeChars(req.query.substats)
            : 'none';

        let entryIndex = data.findIndex((entry) => {
          const rowSubstats =
            entry.substats || (entry.reports && entry.reports[0] && entry.reports[0].substats) || [];
          const rowKeys = buildVariantKeys({
            relicId: entry.relicId,
            clearTime: entry.clearTime,
            characters: entry.characters,
            substats: rowSubstats,
          });

          return (
            rowKeys.relicKey === normalizeRelicId(relicId) &&
            rowKeys.clearTimeKey === targetTime &&
            rowKeys.charactersKey === charsSorted &&
            (substatsSorted === 'none' || rowKeys.substatsKey === substatsSorted)
          );
        });

        if (entryIndex === -1 && isAdmin) {
          const baseMatches = data.filter((entry) => {
            const rowKeys = buildVariantKeys({
              relicId: entry.relicId,
              clearTime: entry.clearTime,
              characters: entry.characters,
              substats: entry.substats || [],
            });

            return (
              rowKeys.relicKey === normalizeRelicId(relicId) &&
              rowKeys.clearTimeKey === targetTime &&
              rowKeys.charactersKey === charsSorted
            );
          });

          if (baseMatches.length === 1) {
            entryIndex = data.indexOf(baseMatches[0]);
          }
        }

        if (entryIndex !== -1) {
          data.splice(entryIndex, 1);
          found = true;
        }
      }

      if (!found) {
        return res.status(404).json({ error: 'Record not found.' });
      }

      await saveCavernData(data, allBlobs);
      return res.status(200).json({ success: true, message: 'Archive record expunged.' });
    } catch (error) {
      console.error('[Cavern API] DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete record.' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
