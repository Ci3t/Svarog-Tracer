import { setCorsHeaders } from './zone/shared.js';

const SERIA_CODES_API = 'https://hoyo-codes.seria.moe/codes';
const HASHBLEN_CODES_API = 'https://db.hashblen.com/codes';
const CACHE_TTL_MS = 60 * 60 * 1000;

let memoryCache = {
  key: '',
  savedAt: 0,
  data: null,
};

function normalizeGame(game) {
  const normalized = String(game || 'all').toLowerCase().trim();
  if (['hsr', 'hkrpg', 'starrail', 'star-rail'].includes(normalized)) return 'hsr';
  if (['genshin', 'genshin-impact'].includes(normalized)) return 'genshin';
  return 'all';
}

function buildRedeemUrl(game, code) {
  const encodedCode = encodeURIComponent(code);
  if (game === 'genshin') return `https://genshin.hoyoverse.com/en/gift?code=${encodedCode}`;
  return `https://hsr.hoyoverse.com/gift?code=${encodedCode}`;
}

function normalizeRewardText(value) {
  return String(value || '')
    .replace(/;/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCodeEntry(entry, game, source) {
  const code = String(entry?.code || '').trim().toUpperCase();
  if (!code) return null;

  return {
    code,
    game,
    status: String(entry?.status || 'OK').toUpperCase(),
    rewards: normalizeRewardText(entry?.rewards || entry?.description || ''),
    addedAt: Number(entry?.added_at || entry?.addedAt || 0) || null,
    source,
    redeemUrl: buildRedeemUrl(game, code),
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SvarogTrace/1.0',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSeriaCodes(game) {
  const seriaGame = game === 'genshin' ? 'genshin' : 'hkrpg';
  const data = await fetchJsonWithTimeout(`${SERIA_CODES_API}?game=${seriaGame}`);
  const codes = Array.isArray(data?.codes) ? data.codes : [];
  return codes
    .map((entry) => normalizeCodeEntry(entry, game, 'seria'))
    .filter(Boolean)
    .filter((entry) => entry.status === 'OK');
}

function getHashblenList(data, game) {
  if (!data || typeof data !== 'object') return [];
  if (game === 'genshin') return Array.isArray(data.genshin) ? data.genshin : [];
  const candidates = [
    data.hsr,
    data.hkrpg,
    data.starrail,
    data.star_rail,
    data.honkai,
    data.honkai_starrail,
    data.honkai_star_rail,
  ];
  return candidates.find(Array.isArray) || [];
}

async function fetchHashblenCodes(game) {
  const data = await fetchJsonWithTimeout(HASHBLEN_CODES_API);
  return getHashblenList(data, game)
    .map((entry) => normalizeCodeEntry(entry, game, 'hashblen'))
    .filter(Boolean);
}

function mergeCodes(primaryCodes, fallbackCodes) {
  const merged = new Map();
  for (const entry of [...fallbackCodes, ...primaryCodes]) {
    const previous = merged.get(entry.code);
    merged.set(entry.code, {
      ...previous,
      ...entry,
      rewards: entry.rewards || previous?.rewards || '',
      addedAt: entry.addedAt || previous?.addedAt || null,
      source: previous?.source && previous.source !== entry.source ? `${entry.source}+${previous.source}` : entry.source,
    });
  }
  return Array.from(merged.values()).sort((a, b) => {
    const timeDelta = Number(b.addedAt || 0) - Number(a.addedAt || 0);
    if (timeDelta !== 0) return timeDelta;
    return a.code.localeCompare(b.code);
  });
}

async function buildCodesForGame(game) {
  const settled = await Promise.allSettled([
    fetchSeriaCodes(game),
    fetchHashblenCodes(game),
  ]);

  const primaryCodes = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const fallbackCodes = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const errors = settled
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason?.message || 'Unknown source error');

  return {
    codes: mergeCodes(primaryCodes, fallbackCodes),
    sources: {
      primary: primaryCodes.length > 0,
      fallback: fallbackCodes.length > 0,
      errors,
    },
  };
}

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const game = normalizeGame(req.query?.game);
  const cacheKey = `hoyo-codes:${game}`;
  if (memoryCache.key === cacheKey && memoryCache.data && Date.now() - memoryCache.savedAt < CACHE_TTL_MS) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=1209600');
    return res.status(200).json(memoryCache.data);
  }

  const games = game === 'all' ? ['hsr', 'genshin'] : [game];
  const entries = await Promise.all(games.map(async (gameKey) => [gameKey, await buildCodesForGame(gameKey)]));
  const payload = entries.reduce((acc, [gameKey, value]) => {
    acc[gameKey] = value.codes;
    acc.sources[gameKey] = value.sources;
    return acc;
  }, {
    hsr: [],
    genshin: [],
    sources: {},
    lastUpdate: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  });

  memoryCache = {
    key: cacheKey,
    savedAt: Date.now(),
    data: payload,
  };

  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=1209600');
  return res.status(200).json(payload);
}
