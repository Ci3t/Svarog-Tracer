/**
 * WuWa Stats API Endpoint
 * Fetches and parses WuWa Tracker statistics for a given banner ID
 */

import { parseWuWaHTML_Adaptive } from '../../utils/wuwaAdaptiveParser.js';

const WUWA_FETCH_TIMEOUT_MS = 8000;
const LOCAL_SAFE_MODE = globalThis.process?.env?.STATS_FORCE_FALLBACK === 'true';
const STATS_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';
const WUWA_STATS_SOURCE_ALIASES = Object.freeze({
  // Svarog display IDs can be controlled/manual while WuWa Tracker exposes one shared current chart.
  '100038': ['100034', 'stats'],
  '200038': ['100034', 'stats'],
  '1000001': ['100034', 'stats'],
  '1100001': ['100034', 'stats'],
  '100037': ['100034', 'stats'],
  '200037': ['100034', 'stats'],
});

function buildWuWaStatsFallback(id, message = 'Local safe-mode fallback: live WuWa stats fetch skipped.') {
  return {
    stats: {
      total_pulls_5: 0,
      by_rollnum_pulls_5: {},
      by_rollnum_chance_5: {},
      count_win_5: 0,
      count_lose_5: 0
    },
    image: null,
    list: [],
    fallback: true,
    bannerId: id,
    message
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = WUWA_FETCH_TIMEOUT_MS) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

function buildBannerIdCandidates(id) {
  const normalized = String(id || '').trim();
  const aliasCandidates = WUWA_STATS_SOURCE_ALIASES[normalized] || [];
  if (!/^\d{6,7}$/.test(normalized)) return Array.from(new Set([normalized, ...aliasCandidates].filter(Boolean)));
  const suffix = normalized.slice(3);
  const candidates = [normalized];
  if (normalized.startsWith('200')) candidates.push(`101${suffix}`);
  if (normalized.startsWith('101')) candidates.push(`200${suffix}`);
  if (normalized.startsWith('110')) candidates.push(`200${suffix}`, `101${suffix}`);
  candidates.push(...aliasCandidates);
  return Array.from(new Set(candidates));
}

function hasUsableStats(parsed) {
  const histogramSize = Object.keys(parsed?.stats?.by_rollnum_pulls_5 || {}).length;
  const totalPulls = Number(parsed?.stats?.total_pulls_5 || parsed?.stats?.count_win_5 || 0);
  return Boolean(parsed?.stats) && histogramSize > 0 && totalPulls > 0;
}

export async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Banner ID is required' });
  }

  if (LOCAL_SAFE_MODE) {
    res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
    return res.status(200).json(buildWuWaStatsFallback(id));
  }
  
  try {
    const bannerIdCandidates = buildBannerIdCandidates(id);
    let finalStats = null;

    for (const candidateId of bannerIdCandidates) {
      const statsUrl = candidateId === 'stats'
        ? 'https://wuwatracker.com/tracker/stats'
        : `https://wuwatracker.com/tracker/stats/${candidateId}`;
      console.log('[WuWa API] Fetching:', statsUrl);
      
      let html = null;

      try {
          const directRes = await fetchWithTimeout(statsUrl, {
              headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SvarogTrace/1.0; +https://ci3t.github.io/Svarog-Tracer)',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
          });
          if (directRes.ok) {
              html = await directRes.text();
              console.log('[WuWa API] ✓ Direct fetch successful');
          } else {
              console.warn(`[WuWa API] Direct fetch failed: ${directRes.status}`);
          }
      } catch (e) {
          console.warn(`[WuWa API] Direct fetch error:`, e.message);
      }
      
      if (!html) {
          console.log('[WuWa API] Trying proxy fallbacks...');
          const PROXIES = [
              (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
              (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
              (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
              (url) => `https://thingproxy.freeboard.io/fetch/${url}`
          ];
          
          for (const proxyFormat of PROXIES) {
              try {
                  const proxyUrl = proxyFormat(statsUrl);
                  const proxyRes = await fetchWithTimeout(proxyUrl, {
                      headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      }
                  });
                  
                  if (proxyRes.ok) {
                      html = await proxyRes.text();
                      if (html.includes('WuWa Tracker')) break;
                  }
              } catch { /* continue */ }
          }
      }

      if (!html) {
        continue;
      }

      console.log('[WuWa API] HTML length:', html.length);
      const parsed = parseWuWaHTML_Adaptive(html);
      if (hasUsableStats(parsed)) {
        finalStats = {
          ...parsed,
          bannerId: id,
          sourceBannerId: candidateId,
          message: candidateId !== id ? `Svarog WuWa stats parsed from source ${candidateId}` : 'Svarog WuWa stats parsed'
        };
        break;
      }
      console.warn(`[WuWa API] Candidate ${candidateId} returned empty stats, trying next candidate`);
    }

    if (!finalStats) {
      console.warn('[WuWa API] Parsing failed, returning fallback');
      res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
      return res.status(200).json(buildWuWaStatsFallback(id, 'Stats processing failed - Anti-bot protection active'));
    }
    
    res.setHeader('Cache-Control', STATS_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', STATS_CACHE_CONTROL);
    res.setHeader('Vercel-CDN-Cache-Control', STATS_CACHE_CONTROL);
    
    return res.status(200).json(finalStats);
  } catch (error) {
    console.error('[WuWa API] Error:', error);
    res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
    return res.status(200).json(buildWuWaStatsFallback(id, error.message));
  }
}
