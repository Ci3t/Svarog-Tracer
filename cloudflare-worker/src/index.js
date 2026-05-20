// Svarog Cloudflare Worker - Public API Edge (v3: Turso-native hot reads)
// Turso HTTP client (fetch-based, no npm deps)

// =========================================================================
// CONFIG
// =========================================================================
const CONFIG = {
  CACHE_VERSION: 'v9',
  // Allowed origins for quota protection (your production + local dev)
  ALLOWED_ORIGINS: [
    'https://ci3t.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ],
  // External API endpoints
  HSR_STATS_API: 'https://starrailstation.com/api/v1/warp_fetch',
  HSR_CONFIG_API: 'https://starrailstation.com/api/v1/warp_config',
  STAR_RAIL_RES_BASE: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master',
  STAR_RAIL_RES_RAW: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master',
  STAR_RAIL_RES_CDN: 'https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master',
  PAIMON_API: 'https://api.paimon.moe/wish',
  PAIMON_IMG_BASE: 'https://paimon.moe/images',
  GENSHIN_CURRENT_CHARACTER_BANNER_ID: '300100',
  GENSHIN_CURRENT_WEAPON_BANNER_ID: '400099',
  GENSHIN_CURRENT_CHARACTER_NAME: 'Nicole / Durin',
  GENSHIN_CURRENT_WEAPON_NAME: "Angelos' Heptades / Athame Artis",
  GENSHIN_CURRENT_CHARACTER_IMAGE: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Nicole_Splash.webp',
  GENSHIN_CURRENT_WEAPON_IMAGE: 'https://cdn.jsdelivr.net/gh/Ci3t/svarog-assets@main/genshin/Nicole_weapon_Splash.webp',
  WUWA_TRACKER: 'https://wuwatracker.com/tracker/stats',
  WUWA_IMG_API: 'https://wuwatracker.com/_next/image',
  HOYO_CODES_API: 'https://hoyo-codes.seria.moe/codes',
  HASHBLEN_CODES_API: 'https://db.hashblen.com/codes',
  VERCEL_API_BASE: 'https://svarog-tracer.vercel.app',
  // Budget guard (approximate per-isolate; monitor via dashboard)
  DAILY_SOFT_LIMIT: 90000,
  DAILY_HARD_LIMIT: 95000,
  // Fallback data
  FALLBACK_PATCHES: {
    hsr: { current_patch: '3.7', patch_start_date: '2026-04-22', patch_duration_days: 42, auto_advance: false },
    genshin: { current_patch: '6.2', patch_start_date: '2026-04-29', patch_duration_days: 42, auto_advance: false },
    wuwa: { current_patch: '2.8', patch_start_date: '2026-04-29', patch_duration_days: 42, auto_advance: false },
    zzz: { current_patch: '2.4', patch_start_date: '2026-04-23', patch_duration_days: 42, auto_advance: false },
  },
  KIYO_PATCH_FALLBACK: {
    current_patch: '4.2',
    patch_start_date: '2026-04-21T20:00:00.000Z',
    phase_1_days: 21,
    phase_2_days: 21,
    timer_mode: 'fallback',
    auto_advance: false,
    manual_override_at: null,
    manual_override_by: null,
  },
  // Cache TTLs (seconds)
  TTL: {
    banners: 15 * 60,          // 15 minutes
    hsrStats: 15 * 60,         // 15 minutes
    genshinStats: 15 * 60,     // 15 minutes
    wuwaStats: 15 * 60,        // 15 minutes
    patchTimers: 60 * 60,      // 1 hour
    kiyoPatch: 60,             // 1 minute (short — patch data can change)
    hoyoCodes: 7 * 24 * 60 * 60, // 7 days (codes usually change around livestream/patch windows)
    health: 0,                 // no cache
  }
};

// =========================================================================
// BUDGET GUARD (approximate per-isolate)
// =========================================================================
let isolateRequestCount = 0;

function checkBudget(request) {
  isolateRequestCount++;
  const mode = isolateRequestCount >= CONFIG.DAILY_HARD_LIMIT ? 'exhausted'
    : isolateRequestCount >= CONFIG.DAILY_SOFT_LIMIT ? 'conserve'
    : 'normal';
  return { mode, count: isolateRequestCount };
}

function budgetHeaders(mode) {
  if (mode === 'normal') return {};
  return {
    'X-Worker-Budget-Mode': mode,
    'X-Worker-Budget-Count': String(isolateRequestCount),
  };
}

// =========================================================================
// CORS
// =========================================================================
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : '*';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function corsPreflight(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  }
  return null;
}

// =========================================================================
// QUOTA PROTECTION
// =========================================================================
function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin && new URL(request.url).pathname === '/health') return true;
  if (CONFIG.ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.includes('workers.dev')) return true;
  return false;
}

// =========================================================================
// CACHE
// =========================================================================
async function getCached(request, cacheKey) {
  const cache = caches.default;
  const fullKey = `${cacheKey}&cv=${CONFIG.CACHE_VERSION}`;
  const cached = await cache.match(new Request(fullKey));
  if (cached) {
    const headers = new Headers(cached.headers);
    headers.delete('Access-Control-Allow-Origin');
    headers.delete('Access-Control-Allow-Methods');
    headers.delete('Access-Control-Allow-Headers');
    headers.delete('Access-Control-Max-Age');
    headers.delete('Vary');
    headers.delete('Set-Cookie');
    headers.delete('Authorization');
    const cors = getCorsHeaders(request);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    headers.set('X-Cache-Status', 'HIT');
    headers.set('X-Cache-Version', CONFIG.CACHE_VERSION);

    const response = new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
    return response;
  }
  return null;
}

async function putCache(request, cacheKey, response, ttlSeconds) {
  if (ttlSeconds <= 0) return;
  const cache = caches.default;
  const fullKey = `${cacheKey}&cv=${CONFIG.CACHE_VERSION}`;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=300, s-maxage=${ttlSeconds}, stale-while-revalidate=86400`);
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Access-Control-Allow-Methods');
  headers.delete('Access-Control-Allow-Headers');
  headers.delete('Access-Control-Max-Age');
  headers.delete('Vary');
  headers.delete('Set-Cookie');
  headers.delete('Authorization');

  // Never pass response.body directly here. cache.put() consumes/locks the body,
  // and the caller still returns the original response to the browser. Using the
  // original body can crash Workers with a 1101 "body used/locked" runtime error.
  const cachedBody = await response.clone().arrayBuffer();
  const cachedResponse = new Response(cachedBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  await cache.put(new Request(fullKey), cachedResponse);
}

// =========================================================================
// JSON RESPONSE HELPER
// =========================================================================
function jsonResponse(data, status = 200, corsRequest, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(corsRequest),
    ...extraHeaders,
  };
  return new Response(JSON.stringify(data), { status, headers });
}

// =========================================================================
// FETCH WITH TIMEOUT
// =========================================================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// =========================================================================
// TURSO CLIENT HELPER (fetch-based, Cloudflare Worker compatible)
// =========================================================================
function getTursoClient(env) {
  if (!env?.TURSO_DB_URL || !env?.TURSO_AUTH_TOKEN) return null;
  // Convert libsql://<database>.<region>.turso.io
  // to https://<database>.turso.io (strip region)
  const baseUrl = env.TURSO_DB_URL
    .replace(/^libsql:\/\//, 'https://')
    .replace(/\.aws-[a-z0-9-]+\.turso\.io$/, '.turso.io');

  return {
    async execute({ sql, args = [] }) {
      // Format args for Turso HTTP API
      const formatArg = (v) => {
        if (v === null || v === undefined) return { type: 'null' };
        if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: String(v) };
        if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
        return { type: 'text', value: String(v) };
      };
      const stmt = args.length > 0 ? { sql, args: args.map(formatArg) } : { sql };
      const res = await fetch(`${baseUrl}/v2/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.TURSO_AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            { type: 'execute', stmt },
            { type: 'close' },
          ],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Turso HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      // Parse pipeline response
      const results = data.results || [];
      const errResult = results.find(r => r.type === 'error');
      if (errResult) {
        throw new Error(errResult.error?.message || 'Turso query error');
      }
      const execResult = results.find(r => r.type === 'ok' && r.response?.type === 'execute');
      if (!execResult) {
        throw new Error('Turso: no execute result');
      }
      const resultSet = execResult.response.result;
      return {
        rows: (resultSet.rows || []).map(row => {
          const obj = {};
          (resultSet.cols || []).forEach((col, i) => {
            const cell = row[i];
            if (cell && cell.type === 'null') {
              obj[col.name] = null;
            } else {
              obj[col.name] = cell?.value ?? cell;
            }
          });
          return obj;
        }),
      };
    },
  };
}

// =========================================================================
// VERCEL FALLBACK HELPER
// =========================================================================
async function vercelFallback(request, pathname, search, extraHeaders = {}) {
  const upstreamUrl = `${CONFIG.VERCEL_API_BASE}${pathname}${search}`;
  const upstream = await fetchWithTimeout(upstreamUrl, {
    method: request.method,
    headers: { Accept: 'application/json' },
  }, 10000);
  const body = await upstream.arrayBuffer();
  const headers = new Headers({
    ...getCorsHeaders(request),
    'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    'X-Data-Source': 'vercel-proxy',
    ...extraHeaders,
  });
  headers.delete('Set-Cookie');
  headers.delete('Authorization');
  return new Response(body, { status: upstream.status, headers });
}

// =========================================================================
// ROUTE: /health
// =========================================================================
function handleHealth(request, budget, env) {
  return jsonResponse({
    status: 'ok',
    worker: true,
    timestamp: new Date().toISOString(),
    budgetMode: budget.mode,
    budgetCount: budget.count,
  }, 200, request, budgetHeaders(budget.mode));
}

// =========================================================================
// ROUTE: /api/banners
// =========================================================================
function limitHsrBanners(banners) {
  const score = (b) => Number.parseInt(String(b?.bannerId || b?.id || '0'), 10) || 0;
  const byNewest = (a, b) => score(b) - score(a);
  const characters = banners.filter(b => b.type === 'character').sort(byNewest).slice(0, 4);
  const lightCones = banners.filter(b => b.type === 'light_cone').sort(byNewest).slice(0, 4);
  return [...characters, ...lightCones];
}

function buildHsrFallbackBanners() {
  const icon = (id) => `${CONFIG.STAR_RAIL_RES_CDN}/icon/character/${id}.png`;
  const portrait = (id) => `${CONFIG.STAR_RAIL_RES_RAW}/image/character_portrait/${id}.png`;
  const preview = (id) => `${CONFIG.STAR_RAIL_RES_CDN}/image/character_preview/${id}.png`;
  const lcPreview = (id) => `${CONFIG.STAR_RAIL_RES_CDN}/image/light_cone_preview/${id}.png`;

  return limitHsrBanners([
    { id: '2116_character', bannerId: '2116', name: 'Silver Wolf LV.999', image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp', portrait: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp', type: 'character', characterId: '1006', rarity: 5, element: 'quantum', game: 'hsr', source: 'worker-fallback' },
    { id: '2117_character', bannerId: '2117', name: 'The Dahlia', image: icon('1321'), portrait: portrait('1321'), altPortrait: portrait('1321'), preview: preview('1321'), type: 'character', characterId: '1321', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '2118_character', bannerId: '2118', name: 'Firefly', image: icon('1310'), portrait: portrait('1310'), altPortrait: portrait('1310'), preview: preview('1310'), type: 'character', characterId: '1310', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '2119_character', bannerId: '2119', name: 'Castorice', image: icon('1407'), portrait: portrait('1407'), altPortrait: portrait('1407'), preview: preview('1407'), type: 'character', characterId: '1407', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '3116_light_cone', bannerId: '3116', name: 'Silver Wolf LV.999 Light Cone', image: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp', portrait: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp', type: 'light_cone', characterId: '23006', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '3117_light_cone', bannerId: '3117', name: 'Never Forget Her Flame', image: lcPreview('23050'), portrait: lcPreview('23050'), lcPreview: lcPreview('23050'), type: 'light_cone', characterId: '23050', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '3118_light_cone', bannerId: '3118', name: 'Whereabouts Should Dreams Rest', image: lcPreview('23025'), portrait: lcPreview('23025'), lcPreview: lcPreview('23025'), type: 'light_cone', characterId: '23025', rarity: 5, game: 'hsr', source: 'worker-fallback' },
    { id: '3119_light_cone', bannerId: '3119', name: 'Make Farewells More Beautiful', image: lcPreview('23040'), portrait: lcPreview('23040'), lcPreview: lcPreview('23040'), type: 'light_cone', characterId: '23040', rarity: 5, game: 'hsr', source: 'worker-fallback' },
  ]);
}

async function fetchHsrBanners() {
  try {
    const nowTs = Date.now();
    const currentSeconds = nowTs / 1000;

    const [configRes, charRes, lcRes] = await Promise.all([
      fetchWithTimeout(`${CONFIG.HSR_CONFIG_API}?_t=${nowTs}`, { headers: { 'Accept': 'application/json' } }, 10000),
      fetchWithTimeout(`${CONFIG.STAR_RAIL_RES_BASE}/index_new/en/characters.json`, {}, 8000),
      fetchWithTimeout(`${CONFIG.STAR_RAIL_RES_BASE}/index_new/en/light_cones.json`, {}, 8000),
    ]);

    if (!configRes.ok) throw new Error(`Config fetch failed: HTTP ${configRes.status}`);

    const configData = await configRes.json();
    const charMap = charRes.ok ? await charRes.json() : {};
    const lcMap = lcRes.ok ? await lcRes.json() : {};
    const gachaList = configData.config?.banners || {};

    const FEATURED_KEY_RE = /(rate.?up|featured|up_?5|rateup_?5|rarity_?5|five.?star)/i;

    const parseFeaturedIds = (value, collected = []) => {
      if (value == null) return collected;
      if (Array.isArray(value)) { value.forEach(v => parseFeaturedIds(v, collected)); return collected; }
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          if (FEATURED_KEY_RE.test(k) || typeof v === 'object') parseFeaturedIds(v, collected);
        }
        return collected;
      }
      const s = String(value).trim();
      if (/^\d+$/.test(s)) collected.push(s);
      return collected;
    };

    const extractFeaturedIds = (bannerData) => {
      const candidates = [bannerData?.rateup, bannerData?.rateup_5, bannerData?.rate_up, bannerData?.up_5, bannerData?.featured, bannerData?.featured_5, bannerData?.rarity_5, bannerData?.five_star];
      const collected = [];
      candidates.forEach(v => parseFeaturedIds(v, collected));
      if (collected.length === 0) {
        for (const [k, v] of Object.entries(bannerData || {})) {
          if (FEATURED_KEY_RE.test(k)) parseFeaturedIds(v, collected);
        }
      }
      const unique = [...new Set(collected)];
      const mapped = unique.filter(id => {
        const entry = charMap[id] || lcMap[id];
        return Number(entry?.rarity) === 5;
      });
      return mapped.length > 0 ? mapped : unique;
    };

    const activeCandidates = [];
    for (const [bannerId, bannerData] of Object.entries(gachaList)) {
      if (!(bannerData.start_time <= currentSeconds && currentSeconds <= bannerData.end_time)) continue;
      const featuredIds = extractFeaturedIds(bannerData);
      for (const featuredId of featuredIds) {
        activeCandidates.push({ bannerId, characterId: String(featuredId), startTime: bannerData.start_time, endTime: bannerData.end_time });
      }
    }

    const deduped = activeCandidates.filter((c, i, a) =>
      a.findIndex(x => x.bannerId === c.bannerId && x.characterId === c.characterId) === i
    );

    if (deduped.length === 0) return buildHsrFallbackBanners();

    const banners = deduped.map(banner => {
      const charId = banner.characterId;
      if (charMap[charId]) {
        const char = charMap[charId];
        return {
          id: `${banner.bannerId}_character`, bannerId: banner.bannerId, name: char.name, type: 'character',
          image: `${CONFIG.STAR_RAIL_RES_CDN}/${char.icon}`,
          fallbackImage: `${CONFIG.STAR_RAIL_RES_CDN}/${char.icon}`,
          portrait: `${CONFIG.STAR_RAIL_RES_RAW}/image/character_portrait/${charId}.png`,
          altPortrait: `${CONFIG.STAR_RAIL_RES_CDN}/image/character_portrait/${charId}.png`,
          preview: `${CONFIG.STAR_RAIL_RES_CDN}/image/character_preview/${charId}.png`,
          characterId: charId, rarity: char.rarity || 5, element: char.element,
          game: 'hsr', startTime: banner.startTime, endTime: banner.endTime
        };
      }
      if (lcMap[charId]) {
        const lc = lcMap[charId];
        return {
          id: `${banner.bannerId}_light_cone`, bannerId: banner.bannerId, name: lc.name, type: 'light_cone',
          image: `${CONFIG.STAR_RAIL_RES_CDN}/${lc.icon}`,
          fallbackImage: `${CONFIG.STAR_RAIL_RES_CDN}/${lc.icon}`,
          portrait: `${CONFIG.STAR_RAIL_RES_CDN}/image/light_cone_preview/${charId}.png`,
          lcPreview: `${CONFIG.STAR_RAIL_RES_CDN}/image/light_cone_preview/${charId}.png`,
          characterId: charId, rarity: lc.rarity || 5, game: 'hsr',
          startTime: banner.startTime, endTime: banner.endTime
        };
      }
      return { id: `${banner.bannerId}_unknown`, bannerId: banner.bannerId, name: `Unknown (${charId})`, type: 'unknown', image: null, characterId: charId, game: 'hsr', startTime: banner.startTime, endTime: banner.endTime };
    });

    // Apply LV.999 overrides
    const lv999Idx = banners.findIndex(b => String(b.bannerId) === '2116');
    if (lv999Idx !== -1) {
      banners[lv999Idx] = { ...banners[lv999Idx], name: 'Silver Wolf LV.999', image: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp', portrait: 'https://cdn.starrailstation.com/assets/0642d24133b729ec1cfdfd9b889a677f5e446bfe417d4299a75b9c8ea0b98b42.webp', type: 'character' };
    }
    const lv999LcIdx = banners.findIndex(b => String(b.bannerId) === '3116');
    if (lv999LcIdx !== -1) {
      banners[lv999LcIdx] = { ...banners[lv999LcIdx], name: 'Silver Wolf LV.999 Light Cone', image: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp', portrait: 'https://cdn.starrailstation.com/assets/a05edc85435cfdcc5c8d8ee4d30002ce73990d7ed39896bdf62d81ee9165e441.webp', type: 'light_cone' };
    }

    return limitHsrBanners(banners);
  } catch (err) {
    console.error('[Worker] HSR banners error:', err.message);
    return buildHsrFallbackBanners();
  }
}

// Genshin Banner Helpers
function toTitleCaseFromSlug(slug) {
  const minor = new Set(['of', 'the', 'and', 'in', 'a', 'an']);
  return slug.split('_').map((w, i) => minor.has(w.toLowerCase()) && i > 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function toPaimonSlug(name) {
  return String(name || '').toLowerCase().split(' / ')[0].replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function buildGenshinFallbackBanners() {
  return [
    { id: `${CONFIG.GENSHIN_CURRENT_CHARACTER_BANNER_ID}_character`, bannerId: CONFIG.GENSHIN_CURRENT_CHARACTER_BANNER_ID, name: CONFIG.GENSHIN_CURRENT_CHARACTER_NAME, type: 'character', image: CONFIG.GENSHIN_CURRENT_CHARACTER_IMAGE, fallbackImage: CONFIG.GENSHIN_CURRENT_CHARACTER_IMAGE, characterId: 'nicole', game: 'genshin', source: 'worker-fallback', assetLocked: true },
    { id: `${CONFIG.GENSHIN_CURRENT_WEAPON_BANNER_ID}_weapon`, bannerId: CONFIG.GENSHIN_CURRENT_WEAPON_BANNER_ID, name: CONFIG.GENSHIN_CURRENT_WEAPON_NAME, type: 'weapon', image: CONFIG.GENSHIN_CURRENT_WEAPON_IMAGE, fallbackImage: CONFIG.GENSHIN_CURRENT_WEAPON_IMAGE, characterId: 'weapon_banner', game: 'genshin', source: 'worker-fallback', assetLocked: true },
  ];
}

async function fetchGenshinBanners() {
  try {
    const now = Date.now();
    const banners = [];

    for (const [prefix, type] of [['300', 'character'], ['400', 'weapon']]) {
      let found = null;
      // Limit subrequests: check only the 5 most recent banner IDs
      for (let i = 130; i >= 126; i--) {
        const bannerId = `${prefix}${String(i).padStart(3, '0')}`;
        try {
          const res = await fetchWithTimeout(`${CONFIG.PAIMON_API}?banner=${bannerId}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0)' } }, 1800);
          if (!res.ok) continue;
          const data = await res.json();
          const legendaryCount = data?.total?.legendary || 0;
          if (legendaryCount <= 1000) continue;

          if (type === 'character') {
            const list = data.list || [];
            const slugs = list.filter(item => item.type === 'character').sort((a, b) => b.count - a.count).slice(0, 2).map(item => toPaimonSlug(item.name));
            if (slugs.length > 0) {
              const slug = slugs[0];
              found = { id: `${bannerId}_character`, bannerId, name: slugs.map(toTitleCaseFromSlug).join(' / '), type: 'character', image: `${CONFIG.PAIMON_IMG_BASE}/characters/${slug}.png`, fallbackImage: `${CONFIG.PAIMON_IMG_BASE}/characters/${slug}.png`, characterId: slug, game: 'genshin', source: 'worker-auto', pullCount: legendaryCount };
              break;
            }
          } else {
            const list = data.list || [];
            const slugs = list.filter(item => item.type === 'weapon').sort((a, b) => b.count - a.count).slice(0, 2).map(item => toPaimonSlug(item.name));
            const name = slugs.length ? slugs.map(toTitleCaseFromSlug).join(' / ') : 'Epitome Invocation';
            const slug = slugs[0] || 'unknown';
            const fallbackImage = `${CONFIG.PAIMON_IMG_BASE}/weapons/${slug}.png`;
            found = { id: `${bannerId}_weapon`, bannerId, name, type: 'weapon', image: fallbackImage, fallbackImage, characterId: 'weapon_banner', game: 'genshin', source: 'worker-auto', pullCount: legendaryCount };
            break;
          }
        } catch { /* continue */ }
      }
      if (found) banners.push(found);
    }

    if (banners.length === 0) return buildGenshinFallbackBanners();
    banners.sort((a, b) => parseInt(b.bannerId, 10) - parseInt(a.bannerId, 10));
    return banners;
  } catch (err) {
    console.error('[Worker] Genshin banners error:', err.message);
    return buildGenshinFallbackBanners();
  }
}

// WuWa Banner Helpers
function buildWuWaImageUrl(folder, fileName) {
  return `${CONFIG.WUWA_IMG_API}?url=${encodeURIComponent(`/api/${folder}/file/${fileName}`)}&w=828&q=75`;
}

function buildWuWaFallbackBanners() {
  return [
    { id: '100036_character', bannerId: '100036', name: 'Hiyuki', type: 'character', image: buildWuWaImageUrl('character-portraits', 'hiyuki-portrait.png'), fallbackImage: buildWuWaImageUrl('character-portraits', 'hiyuki-portrait.png'), characterId: 'hiyuki', game: 'wuwa', source: 'worker-fallback' },
    { id: '200036_weapon', bannerId: '200036', name: 'Frostburn', type: 'weapon', image: buildWuWaImageUrl('weapon-portraits', 'frostburn-portrait.png'), fallbackImage: buildWuWaImageUrl('weapon-portraits', 'frostburn-portrait.png'), characterId: 'frostburn', game: 'wuwa', source: 'worker-fallback' },
  ];
}

async function fetchWuWaBanners() {
  try {
    const res = await fetchWithTimeout(`${CONFIG.WUWA_TRACKER}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const allBanners = [];
    const seenIds = new Set();

    const idPattern = /\\"bannerId\\":\s*(\d{6})/g;
    let match;
    while ((match = idPattern.exec(html)) !== null) {
      const bannerId = match[1];
      const isCharacter = bannerId.startsWith('100');
      const isWeapon = bannerId.startsWith('101') || bannerId.startsWith('200');
      if (!isCharacter && !isWeapon) continue;
      if (seenIds.has(bannerId)) continue;
      seenIds.add(bannerId);

      const pos = match.index;
      const forward = html.substring(pos, pos + 3000);
      const typeMatch = forward.match(/\\"cardPoolType\\":\s*\\"([^\\"]+)\\"/);
      const poolType = typeMatch ? typeMatch[1].toLowerCase() : '';
      const nameMatch = forward.match(/\\"name\\":\s*\\"([^\\"]+)\\"/);
      const rawName = nameMatch ? nameMatch[1] : 'Unknown Banner';

      if (rawName.toLowerCase().includes('standard')) continue;

      const type = poolType.includes('character') ? 'character' : (poolType.includes('weapon') ? 'weapon' : (isCharacter ? 'character' : 'weapon'));
      const slug = rawName.split('&')[0].trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const folder = type === 'character' ? 'character-portraits' : 'weapon-portraits';
      const ext = type === 'character' ? 'webp' : 'png';
      const fallbackImage = buildWuWaImageUrl(folder, `${slug}-portrait.${ext}`);

      allBanners.push({ id: `${bannerId}_${type}`, bannerId, name: rawName, type, image: fallbackImage, fallbackImage, game: 'wuwa' });
    }

    if (allBanners.length === 0) return buildWuWaFallbackBanners();

    const score = (b) => Number.parseInt(String(b?.bannerId || '0'), 10) || 0;
    const chars = allBanners.filter(b => b.type === 'character').sort((a, b) => score(b) - score(a)).slice(0, 5);
    const weapons = allBanners.filter(b => b.type === 'weapon').sort((a, b) => score(b) - score(a)).slice(0, 5);
    const recent = [...chars, ...weapons];

    const selectedChar = chars[0] || null;
    let selectedWeapon = weapons[0] || null;
    if (selectedChar && weapons.length > 1) {
      const suffix = String(selectedChar.bannerId).slice(-2);
      const matched = weapons.find(w => String(w.bannerId).slice(-2) === suffix);
      if (matched) selectedWeapon = matched;
    }

    return [selectedChar, selectedWeapon].filter(Boolean);
  } catch (err) {
    console.error('[Worker] WuWa banners error:', err.message);
    return buildWuWaFallbackBanners();
  }
}

async function handleBanners(request) {
  const url = new URL(request.url);
  const requestedGame = (url.searchParams.get('game') || 'all').toLowerCase().trim();
  const game = ['hsr', 'genshin', 'wuwa', 'all'].includes(requestedGame) ? requestedGame : 'all';

  const cacheKey = `${url.origin}/api/banners?game=${game}`;
  const cached = await getCached(request, cacheKey);
  if (cached) return cached;

  const tasks = [];
  if (game === 'all' || game === 'hsr') tasks.push(['hsr', fetchHsrBanners()]);
  if (game === 'all' || game === 'genshin') tasks.push(['genshin', fetchGenshinBanners()]);
  if (game === 'all' || game === 'wuwa') tasks.push(['wuwa', fetchWuWaBanners()]);

  const settled = await Promise.allSettled(tasks.map(([, p]) => p));
  const resultMap = { hsr: [], genshin: [], wuwa: [] };
  tasks.forEach(([g], i) => {
    if (settled[i].status === 'fulfilled') resultMap[g] = settled[i].value;
    else console.error(`[Worker] ${g} banners failed:`, settled[i].reason?.message);
  });

  const response = {
    ...(game === 'all' || game === 'hsr') && { hsr: resultMap.hsr },
    ...(game === 'all' || game === 'genshin') && { genshin: resultMap.genshin },
    ...(game === 'all' || game === 'wuwa') && { wuwa: resultMap.wuwa },
    lastUpdate: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + CONFIG.TTL.banners * 1000).toISOString(),
  };

  const res = jsonResponse(response, 200, request, {
    'Cache-Control': `public, max-age=300, s-maxage=${CONFIG.TTL.banners}, stale-while-revalidate=86400`,
    'X-Cache-Status': 'MISS',
  });

  await putCache(request, cacheKey, res, CONFIG.TTL.banners);
  return res;
}

function rewriteBannerRequest(request, game) {
  const url = new URL(request.url);
  url.pathname = '/api/banners';
  url.searchParams.set('game', game);
  return new Request(url.toString(), request);
}

// =========================================================================
// ROUTE: /api/hoyo-codes
// =========================================================================
function normalizeHoyoGame(game) {
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
    .replace(/;/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCodeEntry(entry, game, source) {
  const code = String(entry?.code || '').trim().toUpperCase();
  if (!code) return null;
  const rewards = normalizeRewardText(entry?.rewards || entry?.description || '');
  const status = String(entry?.status || 'OK').toUpperCase();

  return {
    code,
    game,
    status,
    rewards,
    addedAt: Number(entry?.added_at || entry?.addedAt || 0) || null,
    source,
    redeemUrl: buildRedeemUrl(game, code),
  };
}

async function fetchSeriaCodes(game) {
  const seriaGame = game === 'genshin' ? 'genshin' : 'hkrpg';
  const url = `${CONFIG.HOYO_CODES_API}?game=${seriaGame}`;
  const response = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'SvarogTrace/1.0' },
  }, 8000);
  if (!response.ok) throw new Error(`Seria HTTP ${response.status}`);

  const data = await response.json();
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
  const response = await fetchWithTimeout(CONFIG.HASHBLEN_CODES_API, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'SvarogTrace/1.0' },
  }, 8000);
  if (!response.ok) throw new Error(`Hashblen HTTP ${response.status}`);

  const data = await response.json();
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

async function buildHoyoCodesForGame(game) {
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

async function handleHoyoCodes(request) {
  const url = new URL(request.url);
  const game = normalizeHoyoGame(url.searchParams.get('game'));
  const cacheKey = `${url.origin}/api/hoyo-codes?game=${game}`;
  const cached = await getCached(request, cacheKey);
  if (cached) return cached;

  const games = game === 'all' ? ['hsr', 'genshin'] : [game];
  const entries = await Promise.all(games.map(async (gameKey) => [gameKey, await buildHoyoCodesForGame(gameKey)]));
  const payload = entries.reduce((acc, [gameKey, value]) => {
    acc[gameKey] = value.codes;
    acc.sources[gameKey] = value.sources;
    return acc;
  }, {
    hsr: [],
    genshin: [],
    sources: {},
    lastUpdate: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + CONFIG.TTL.hoyoCodes * 1000).toISOString(),
  });

  const res = jsonResponse(payload, 200, request, {
    'Cache-Control': `public, max-age=3600, s-maxage=${CONFIG.TTL.hoyoCodes}, stale-while-revalidate=${14 * 24 * 60 * 60}`,
    'X-Cache-Status': 'MISS',
  });
  await putCache(request, cacheKey, res, CONFIG.TTL.hoyoCodes);
  return res;
}

// =========================================================================
// ROUTE: /api/hsr/stats
// =========================================================================
function buildHsrFallbackStats(id) {
  return {
    stats: { total_pulls_5: 0, by_rollnum_pulls_5: {}, by_rollnum_chance_5: {}, count_win_5: 0, count_lose_5: 0 },
    image: null, list: [], fallback: true, bannerId: id,
    message: 'Worker fallback: live HSR stats fetch skipped.',
  };
}

async function handleHsrStats(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'Banner ID is required' }, 400, request);

  const cacheKey = `${url.origin}/api/hsr/stats?id=${id}`;
  const cached = await getCached(request, cacheKey);
  if (cached) return cached;

  try {
    const apiUrl = `${CONFIG.HSR_STATS_API}/${id}/?_t=${Date.now()}`;
    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    }, 8000);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const res = jsonResponse(data, 200, request, {
      'Cache-Control': `public, max-age=300, s-maxage=${CONFIG.TTL.hsrStats}, stale-while-revalidate=86400`,
      'X-Cache-Status': 'MISS',
    });
    await putCache(request, cacheKey, res, CONFIG.TTL.hsrStats);
    return res;
  } catch (err) {
    console.error('[Worker] HSR stats error:', err.message);
    return jsonResponse(buildHsrFallbackStats(id), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    });
  }
}

// =========================================================================
// ROUTE: /api/genshin/stats
// =========================================================================
function buildGenshinFallbackStats(id) {
  return {
    stats: { total_pulls_5: 0, by_rollnum_pulls_5: {}, by_rollnum_chance_5: {}, count_win_5: 0, count_lose_5: 0, users: 0 },
    raw: null, fallback: true, bannerId: id,
    message: 'Worker fallback: live Genshin stats fetch skipped.',
  };
}

async function handleGenshinStats(request) {
  const url = new URL(request.url);
  let id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'Banner ID is required' }, 400, request);

  if (id === '300093') id = '300094';

  const cacheKey = `${url.origin}/api/genshin/stats?id=${id}`;
  const cached = await getCached(request, cacheKey);
  if (cached) return cached;

  try {
    const apiUrl = `${CONFIG.PAIMON_API}?banner=${id}`;
    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    }, 8000);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const pityArray = data.pityCount?.legendary || [];
    const countEachPity = data.countEachPity || [];
    const by_rollnum_pulls_5 = {};
    const by_rollnum_chance_5 = {};
    let totalPulls = 0;

    pityArray.forEach((count, index) => {
      const roll = index;
      if (roll === 0) return;
      by_rollnum_pulls_5[roll] = count;
      totalPulls += count;
    });

    pityArray.forEach((count, index) => {
      const roll = index;
      if (roll === 0) return;
      const playersAtThisPity = countEachPity[index - 1];
      if (playersAtThisPity && playersAtThisPity > 0) {
        by_rollnum_chance_5[roll] = count / playersAtThisPity;
      } else if (totalPulls > 0) {
        by_rollnum_chance_5[roll] = count / totalPulls;
      }
    });

    const result = {
      stats: {
        total_pulls_5: totalPulls || data.total?.legendary || 0,
        by_rollnum_pulls_5,
        by_rollnum_chance_5,
        count_win_5: 0,
        count_lose_5: 0,
        users: data.total?.users || 0,
      },
      raw: data,
    };

    const res = jsonResponse(result, 200, request, {
      'Cache-Control': `public, max-age=300, s-maxage=${CONFIG.TTL.genshinStats}, stale-while-revalidate=86400`,
      'X-Cache-Status': 'MISS',
    });
    await putCache(request, cacheKey, res, CONFIG.TTL.genshinStats);
    return res;
  } catch (err) {
    console.error('[Worker] Genshin stats error:', err.message);
    return jsonResponse(buildGenshinFallbackStats(id), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    });
  }
}

// =========================================================================
// ROUTE: /api/wuwa/stats
// =========================================================================
function buildWuWaFallbackStats(id, message = 'Worker fallback: live WuWa stats fetch skipped.') {
  return {
    stats: { total_pulls_5: 0, by_rollnum_pulls_5: {}, by_rollnum_chance_5: {}, count_win_5: 0, count_lose_5: 0 },
    image: null, list: [], fallback: true, bannerId: id, message,
  };
}

function parseWuWaHTML(html) {
  const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
  if (scriptMatch) {
    try {
      const state = JSON.parse(scriptMatch[1]);
      if (state?.stats) return { stats: state.stats };
    } catch { /* continue */ }
  }

  const jsonMatch = html.match(/"stats":\s*(\{[^}]+\})/);
  if (jsonMatch) {
    try {
      const stats = JSON.parse(jsonMatch[1]);
      return { stats };
    } catch { /* continue */ }
  }

  const totalMatch = html.match(/total\s*pulls?[\s:]*([\d,]+)/i);
  if (totalMatch) {
    return {
      stats: {
        total_pulls_5: parseInt(totalMatch[1].replace(/,/g, ''), 10) || 0,
        by_rollnum_pulls_5: {},
        by_rollnum_chance_5: {},
        count_win_5: 0,
        count_lose_5: 0,
      }
    };
  }

  return null;
}

async function handleWuWaStats(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return jsonResponse({ error: 'Banner ID is required' }, 400, request);

  const cacheKey = `${url.origin}/api/wuwa/stats?id=${id}`;
  const cached = await getCached(request, cacheKey);
  if (cached) return cached;

  try {
    const normalized = String(id).trim();
    const candidates = /^\d{6}$/.test(normalized)
      ? (normalized.startsWith('200') ? [normalized, `101${normalized.slice(3)}`] : normalized.startsWith('101') ? [normalized, `200${normalized.slice(3)}`] : [normalized])
      : [normalized];

    let finalStats = null;

    for (const candidateId of candidates) {
      const statsUrl = `https://wuwatracker.com/tracker/stats/${candidateId}`;
      let html = null;

      try {
        const directRes = await fetchWithTimeout(statsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0; +https://ci3t.github.io/Svarog-Tracer)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        }, 8000);
        if (directRes.ok) html = await directRes.text();
      } catch (e) {
        console.warn(`[Worker] WuWa direct fetch error: ${e.message}`);
      }

      if (!html) {
        const PROXIES = [
          (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
          (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
          (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        ];
        for (const proxyFormat of PROXIES) {
          try {
            const proxyUrl = proxyFormat(statsUrl);
            const proxyRes = await fetchWithTimeout(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 8000);
            if (proxyRes.ok) {
              html = await proxyRes.text();
              if (html.includes('WuWa Tracker')) break;
            }
          } catch { /* continue */ }
        }
      }

      if (!html) continue;
      const parsed = parseWuWaHTML(html);
      if (parsed?.stats) {
        finalStats = parsed;
        break;
      }
    }

    if (!finalStats) {
      return jsonResponse(buildWuWaFallbackStats(id, 'Stats processing failed - Anti-bot protection active'), 200, request, {
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      });
    }

    const res = jsonResponse(finalStats, 200, request, {
      'Cache-Control': `public, max-age=300, s-maxage=${CONFIG.TTL.wuwaStats}, stale-while-revalidate=86400`,
      'X-Cache-Status': 'MISS',
    });
    await putCache(request, cacheKey, res, CONFIG.TTL.wuwaStats);
    return res;
  } catch (err) {
    console.error('[Worker] WuWa stats error:', err.message);
    return jsonResponse(buildWuWaFallbackStats(id, err.message), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    });
  }
}

// =========================================================================
// NATIVE ROUTE: GET /api/hsr/kiyo/patch
// =========================================================================
function buildKiyoPatchPayload(base = CONFIG.KIYO_PATCH_FALLBACK) {
  const startDate = new Date(base.patch_start_date);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const phase1Days = Number(base.phase_1_days || 21);
  const phase2Days = Number(base.phase_2_days || 21);
  const totalPatchDays = phase1Days + phase2Days;
  const phase1EndMs = startDate.getTime() + phase1Days * msPerDay;
  const patchEndMs = startDate.getTime() + totalPatchDays * msPerDay;
  const nowMs = now.getTime();
  const daysElapsed = Math.max(0, Math.floor((nowMs - startDate.getTime()) / msPerDay));

  let currentPhase = 1;
  let phaseMsRemaining = phase1EndMs - nowMs;
  if (nowMs >= phase1EndMs) {
    currentPhase = 2;
    phaseMsRemaining = Math.max(0, patchEndMs - nowMs);
  }

  const totalMsRemaining = Math.max(0, patchEndMs - nowMs);

  return {
    current_patch: base.current_patch,
    patch_start_date: base.patch_start_date,
    phase_1_days: phase1Days,
    phase_2_days: phase2Days,
    current_phase: currentPhase,
    phase_days_remaining: Math.max(0, Math.floor(phaseMsRemaining / msPerDay)),
    phase_hours_remaining: Math.max(0, Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60))),
    total_days_remaining: Math.max(0, Math.floor(totalMsRemaining / msPerDay)),
    days_elapsed: daysElapsed,
    timer_mode: base.timer_mode,
    auto_advance: Boolean(base.auto_advance),
    manual_override_at: base.manual_override_at,
    manual_override_by: base.manual_override_by,
  };
}

async function handleKiyoPatchNative(request, env, budget = checkBudget(request)) {
  const url = new URL(request.url);
  const cacheKey = `${url.origin}/api/hsr/kiyo/patch`;

  // Budget conserve: prefer cache or fallback, skip DB
  if (budget.mode === 'exhausted') {
    return jsonResponse(buildKiyoPatchPayload(), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Data-Source': 'worker-static-fallback',
      'X-Worker-Budget-Mode': 'exhausted',
    });
  }

  const cached = await getCached(request, cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    Object.entries(budgetHeaders(budget.mode)).forEach(([k, v]) => headers.set(k, v));
    return new Response(cached.body, { status: cached.status, headers });
  }

  if (budget.mode === 'conserve') {
    return jsonResponse(buildKiyoPatchPayload(), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Data-Source': 'worker-static-fallback',
      ...budgetHeaders(budget.mode),
    });
  }

  const db = getTursoClient(env);
  if (!db) {
    // Turso not configured — try Vercel fallback
    try {
      return await vercelFallback(request, '/api/hsr/kiyo/patch', url.search, budgetHeaders(budget.mode));
    } catch (err) {
      console.error('[Worker] Kiyo patch Vercel fallback error:', err.message);
      return jsonResponse(buildKiyoPatchPayload(), 200, request, {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Data-Source': 'worker-static-fallback',
        ...budgetHeaders(budget.mode),
      });
    }
  }

  try {
    let result;
    let hasPhaseColumns = true;

    try {
      result = await db.execute({
        sql: `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                     manual_override_at, manual_override_by, phase_1_days, phase_2_days
              FROM kiyo_patch_config WHERE id = 1`,
      });
    } catch (colErr) {
      if (colErr.message && colErr.message.includes('no such column')) {
        hasPhaseColumns = false;
        result = await db.execute({
          sql: `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                       manual_override_at, manual_override_by
                FROM kiyo_patch_config WHERE id = 1`,
        });
      } else {
        throw colErr;
      }
    }

    // Auto-create default config if missing
    if (result.rows.length === 0) {
      const PHASE_1_DAYS = 21;
      const PHASE_2_DAYS = 21;
      const ADVANCE_DAYS_42 = 32;
      const fallbackStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const insertSql = hasPhaseColumns
        ? `INSERT INTO kiyo_patch_config
             (id, current_patch, patch_start_date, advance_days, timer_mode, auto_advance, phase_1_days, phase_2_days)
           VALUES (1, ?, ?, ?, 'fresh', 1, ?, ?)`
        : `INSERT INTO kiyo_patch_config
             (id, current_patch, patch_start_date, advance_days, timer_mode, auto_advance)
           VALUES (1, ?, ?, ?, 'fresh', 1)`;
      const insertArgs = hasPhaseColumns
        ? ['4.2', fallbackStart.toISOString(), ADVANCE_DAYS_42, PHASE_1_DAYS, PHASE_2_DAYS]
        : ['4.2', fallbackStart.toISOString(), ADVANCE_DAYS_42];
      await db.execute({ sql: insertSql, args: insertArgs });

      result = await db.execute({
        sql: hasPhaseColumns
          ? `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by, phase_1_days, phase_2_days
             FROM kiyo_patch_config WHERE id = 1`
          : `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by
             FROM kiyo_patch_config WHERE id = 1`,
      });
    }

    let row = result.rows[0];
    let startDate = new Date(row.patch_start_date);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    let daysElapsed = Math.floor((now - startDate) / msPerDay);

    // Auto-correct stale patch 4.2 start dates
    if (row.current_patch === '4.2' && daysElapsed > 21) {
      const correctedStart = new Date('2026-04-21T20:00:00.000Z');
      await db.execute({
        sql: `UPDATE kiyo_patch_config SET patch_start_date = ? WHERE id = 1`,
        args: [correctedStart.toISOString()],
      });
      startDate = correctedStart;
      daysElapsed = Math.floor((now - startDate) / msPerDay);
      const refreshed = await db.execute({
        sql: hasPhaseColumns
          ? `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by, phase_1_days, phase_2_days
             FROM kiyo_patch_config WHERE id = 1`
          : `SELECT current_patch, patch_start_date, advance_days, timer_mode, auto_advance,
                    manual_override_at, manual_override_by
             FROM kiyo_patch_config WHERE id = 1`,
      });
      row = refreshed.rows[0];
    }

    const phase1Days = hasPhaseColumns ? Number(row.phase_1_days || 21) : 21;
    const phase2Days = hasPhaseColumns ? Number(row.phase_2_days || 21) : 21;
    const totalPatchDays = phase1Days + phase2Days;

    const phase1EndMs = startDate.getTime() + phase1Days * msPerDay;
    const patchEndMs = startDate.getTime() + totalPatchDays * msPerDay;

    let currentPhase = 1;
    let phaseDaysRemaining = 0;
    let totalDaysRemaining = 0;
    let phaseHoursRemaining = 0;

    if (now.getTime() < phase1EndMs) {
      currentPhase = 1;
      const phaseMsRemaining = phase1EndMs - now.getTime();
      phaseDaysRemaining = Math.floor(phaseMsRemaining / msPerDay);
      phaseHoursRemaining = Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60));
    } else if (now.getTime() < patchEndMs) {
      currentPhase = 2;
      const phaseMsRemaining = patchEndMs - now.getTime();
      phaseDaysRemaining = Math.floor(phaseMsRemaining / msPerDay);
      phaseHoursRemaining = Math.floor((phaseMsRemaining % msPerDay) / (1000 * 60 * 60));
    } else {
      currentPhase = 2;
      phaseDaysRemaining = 0;
      phaseHoursRemaining = 0;
    }

    const totalMsRemaining = Math.max(0, patchEndMs - now.getTime());
    totalDaysRemaining = Math.floor(totalMsRemaining / msPerDay);

    // Auto-advance (compute in memory; do NOT write back from read-only Worker)
    if (totalDaysRemaining <= 0 && row.auto_advance) {
      const patchParts = row.current_patch.split('.');
      const major = Number(patchParts[0]);
      const minor = Number(patchParts[1]);
      const nextPatch = `${major}.${minor + 1}`;
      const freshStart = now.toISOString();

      startDate = now;
      daysElapsed = 0;
      currentPhase = 1;
      phaseDaysRemaining = phase1Days;
      phaseHoursRemaining = 0;
      totalDaysRemaining = phase1Days + phase2Days;
      row.current_patch = nextPatch;
      row.patch_start_date = freshStart;
      row.timer_mode = 'fresh';
    }

    const payload = {
      current_patch: row.current_patch,
      patch_start_date: row.patch_start_date,
      phase_1_days: phase1Days,
      phase_2_days: phase2Days,
      current_phase: currentPhase,
      phase_days_remaining: phaseDaysRemaining,
      phase_hours_remaining: phaseHoursRemaining,
      total_days_remaining: totalDaysRemaining,
      days_elapsed: daysElapsed,
      timer_mode: row.timer_mode,
      auto_advance: Boolean(row.auto_advance),
      manual_override_at: row.manual_override_at,
      manual_override_by: row.manual_override_by,
    };

    const res = jsonResponse(payload, 200, request, {
      'Cache-Control': `public, max-age=60, s-maxage=${CONFIG.TTL.kiyoPatch}, stale-while-revalidate=1800`,
      'X-Cache-Status': 'MISS',
      'X-Data-Source': 'cloudflare-turso',
      ...budgetHeaders(budget.mode),
    });
    await putCache(request, cacheKey, res, CONFIG.TTL.kiyoPatch);
    return res;
  } catch (dbErr) {
    console.error('[Worker] Kiyo patch DB error:', dbErr.message);
    // Try stale cache first
    const stale = await getCached(request, cacheKey);
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set('X-Data-Source', 'worker-stale-cache');
      Object.entries(budgetHeaders(budget.mode)).forEach(([k, v]) => headers.set(k, v));
      return new Response(stale.body, { status: stale.status, headers });
    }
    // Vercel fallback
    try {
      return await vercelFallback(request, '/api/hsr/kiyo/patch', url.search, {
        'X-Data-Source': 'vercel-proxy',
        ...budgetHeaders(budget.mode),
      });
    } catch (err) {
      console.error('[Worker] Kiyo patch Vercel fallback error:', err.message);
      return jsonResponse(buildKiyoPatchPayload(), 200, request, {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Data-Source': 'worker-static-fallback',
        ...budgetHeaders(budget.mode),
      });
    }
  }
}

// =========================================================================
// NATIVE ROUTE: GET /api/patch-timers
// =========================================================================
function calculatePatchTimerInfo(row) {
  const startDate = new Date(row.patch_start_date + 'T00:00:00Z');
  const durationDays = row.patch_duration_days || 42;
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const totalMs = endDate.getTime() - startDate.getTime();
  const remainingMs = endDate.getTime() - now.getTime();
  const elapsedMs = now.getTime() - startDate.getTime();
  const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const hoursLeft = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)) % 24);
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const halfDuration = durationDays / 2;
  const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const phase = daysElapsed < halfDuration ? 1 : 2;
  const phaseDaysLeft = phase === 1 ? Math.max(0, halfDuration - daysElapsed) : Math.max(0, durationDays - daysElapsed);

  return {
    patch: row.current_patch,
    startDate: row.patch_start_date,
    endDate: endDate.toISOString().split('T')[0],
    daysLeft,
    hoursLeft,
    totalDays: durationDays,
    progressPercent: Math.round(progressPercent),
    phase,
    phaseDaysLeft: Math.round(phaseDaysLeft),
    autoAdvance: Boolean(row.auto_advance),
  };
}

function buildPatchTimersFallback(game) {
  if (game) {
    const row = CONFIG.FALLBACK_PATCHES[game] || CONFIG.FALLBACK_PATCHES.hsr;
    return calculatePatchTimerInfo(row);
  }
  return Object.fromEntries(
    Object.entries(CONFIG.FALLBACK_PATCHES).map(([key, row]) => [key, calculatePatchTimerInfo(row)])
  );
}

async function handlePatchTimersNative(request, env, budget = checkBudget(request)) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game');
  const cacheKey = `${url.origin}/api/patch-timers${game ? `?game=${game}` : ''}`;

  // Budget conserve: prefer cache or fallback, skip DB
  if (budget.mode === 'exhausted') {
    return jsonResponse(buildPatchTimersFallback(game), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Data-Source': 'worker-static-fallback',
      'X-Worker-Budget-Mode': 'exhausted',
    });
  }

  const cached = await getCached(request, cacheKey);
  if (cached) {
    const headers = new Headers(cached.headers);
    Object.entries(budgetHeaders(budget.mode)).forEach(([k, v]) => headers.set(k, v));
    return new Response(cached.body, { status: cached.status, headers });
  }

  if (budget.mode === 'conserve') {
    return jsonResponse(buildPatchTimersFallback(game), 200, request, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Data-Source': 'worker-static-fallback',
      ...budgetHeaders(budget.mode),
    });
  }

  const db = getTursoClient(env);
  if (!db) {
    try {
      return await vercelFallback(request, '/api/patch-timers', url.search, budgetHeaders(budget.mode));
    } catch (err) {
      console.error('[Worker] Patch timers Vercel fallback error:', err.message);
      return jsonResponse(buildPatchTimersFallback(game), 200, request, {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Data-Source': 'worker-static-fallback',
        ...budgetHeaders(budget.mode),
      });
    }
  }

  try {
    let rows;
    if (game) {
      const result = await db.execute({
        sql: `SELECT * FROM game_patch_timers WHERE game = ?`,
        args: [game],
      });
      rows = result.rows;
    } else {
      const result = await db.execute(`SELECT * FROM game_patch_timers ORDER BY game`);
      rows = result.rows;
    }

    const now = new Date();
    const response = {};

    for (const row of rows) {
      let patchVersion = row.current_patch;
      let startDate = row.patch_start_date;
      const durationDays = row.patch_duration_days || 42;
      let wasAdvanced = false;

      // Auto-advance logic (compute in memory; do NOT write back from read-only Worker)
      if (row.auto_advance) {
        const endDate = new Date(startDate + 'T00:00:00Z');
        endDate.setDate(endDate.getDate() + durationDays);

        while (now > endDate) {
          const parts = String(patchVersion).split('.');
          const major = parseInt(parts[0], 10) || 0;
          const minor = parseInt(parts[1], 10) || 0;
          patchVersion = `${major}.${minor + 1}`;
          startDate = endDate.toISOString().split('T')[0];
          endDate.setDate(endDate.getDate() + durationDays);
          wasAdvanced = true;
        }
      }

      const info = calculatePatchTimerInfo({
        current_patch: patchVersion,
        patch_start_date: startDate,
        patch_duration_days: durationDays,
        auto_advance: row.auto_advance,
      });

      response[row.game] = {
        ...info,
        wasAdvanced,
      };
    }

    const payload = game ? response[game] : response;

    const res = jsonResponse(payload, 200, request, {
      'Cache-Control': `public, max-age=300, s-maxage=${CONFIG.TTL.patchTimers}, stale-while-revalidate=86400`,
      'X-Cache-Status': 'MISS',
      'X-Data-Source': 'cloudflare-turso',
      ...budgetHeaders(budget.mode),
    });
    await putCache(request, cacheKey, res, CONFIG.TTL.patchTimers);
    return res;
  } catch (dbErr) {
    console.error('[Worker] Patch timers DB error:', dbErr.message);
    // Try stale cache
    const stale = await getCached(request, cacheKey);
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set('X-Data-Source', 'worker-stale-cache');
      Object.entries(budgetHeaders(budget.mode)).forEach(([k, v]) => headers.set(k, v));
      return new Response(stale.body, { status: stale.status, headers });
    }
    // Vercel fallback
    try {
      return await vercelFallback(request, '/api/patch-timers', url.search, {
        'X-Data-Source': 'vercel-proxy',
        ...budgetHeaders(budget.mode),
      });
    } catch (err) {
      console.error('[Worker] Patch timers Vercel fallback error:', err.message);
      return jsonResponse(buildPatchTimersFallback(game), 200, request, {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Data-Source': 'worker-static-fallback',
        ...budgetHeaders(budget.mode),
      });
    }
  }
}

// =========================================================================
// MAIN ROUTER
// =========================================================================
export default {
  async fetch(request, env, executionCtx) {
    const budget = checkBudget(request);

    // CORS preflight
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    // Quota protection
    if (!isAllowedOrigin(request)) {
      return new Response('Forbidden', { status: 403, headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      if (pathname === '/health') return handleHealth(request, budget, env);

      // Native route: GET /api/hsr/kiyo/patch
      if (pathname === '/api/hsr/kiyo/patch') {
        if (request.method !== 'GET') {
          return jsonResponse({ error: 'Method not allowed' }, 405, request, budgetHeaders(budget.mode));
        }
        return await handleKiyoPatchNative(request, env, budget);
      }

      // Native route: GET /api/patch-timers
      if (pathname === '/api/patch-timers') {
        if (request.method !== 'GET') {
          return jsonResponse({ error: 'Method not allowed' }, 405, request, budgetHeaders(budget.mode));
        }
        return await handlePatchTimersNative(request, env, budget);
      }

      // Only allow GET for public cached routes below
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405, request, budgetHeaders(budget.mode));
      }

      if (pathname === '/api/banners') return await handleBanners(request);
      if (pathname === '/api/hsr/banners') return await handleBanners(rewriteBannerRequest(request, 'hsr'));
      if (pathname === '/api/genshin/banners') return await handleBanners(rewriteBannerRequest(request, 'genshin'));
      if (pathname === '/api/wuwa/banners') return await handleBanners(rewriteBannerRequest(request, 'wuwa'));
      if (pathname === '/api/hoyo-codes') return await handleHoyoCodes(request);
      if (pathname === '/api/hsr/stats') return await handleHsrStats(request);
      if (pathname === '/api/genshin/stats') return await handleGenshinStats(request);
      if (pathname === '/api/wuwa/stats') return await handleWuWaStats(request);

      return jsonResponse({ error: 'Not Found', path: pathname }, 404, request, budgetHeaders(budget.mode));
    } catch (err) {
      console.error('[Worker] Unhandled error:', err.message);
      return jsonResponse({ error: 'Internal Server Error', message: err.message }, 500, request, budgetHeaders(budget.mode));
    }
  }
};
