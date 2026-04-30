/**
 * WuWa Stats API Endpoint
 * Fetches and parses WuWa Tracker statistics for a given banner ID
 */

import { parseWuWaHTML_Adaptive } from '../../utils/wuwaAdaptiveParser.js';

const WUWA_FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = WUWA_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildBannerIdCandidates(id) {
  const normalized = String(id || '').trim();
  if (!/^\d{6}$/.test(normalized)) return [normalized];
  const suffix = normalized.slice(3);
  const candidates = [normalized];
  if (normalized.startsWith('200')) candidates.push(`101${suffix}`);
  if (normalized.startsWith('101')) candidates.push(`200${suffix}`);
  return Array.from(new Set(candidates));
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
  
  try {
    const bannerIdCandidates = buildBannerIdCandidates(id);
    let finalStats = null;

    for (const candidateId of bannerIdCandidates) {
      const statsUrl = `https://wuwatracker.com/tracker/stats/${candidateId}`;
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
              } catch (e) { /* continue */ }
          }
      }

      if (!html) {
        continue;
      }

      console.log('[WuWa API] HTML length:', html.length);
      const parsed = parseWuWaHTML_Adaptive(html);
      if (parsed?.stats) {
        finalStats = parsed;
        break;
      }
    }

    if (!finalStats) {
      console.warn('[WuWa API] Parsing failed, returning fallback');
      return res.status(200).json({
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
        message: "Stats processing failed - Anti-bot protection active"
      });
    }
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(finalStats);
  } catch (error) {
    console.error('[WuWa API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch WuWa stats',
      message: error.message 
    });
  }
}
