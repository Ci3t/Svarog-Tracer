/**
 * HSR Stats API Endpoint
 * Fetches Honkai: Star Rail statistics from stardb.gg
 */
const LOCAL_SAFE_MODE = globalThis.process?.env?.STATS_FORCE_FALLBACK === 'true';
const STATS_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';

function buildFallbackStats(id) {
  return {
    stats: {
      total_pulls_5: 0,
      by_rollnum_pulls_5: {},
      by_rollnum_chance_5: {},
      count_win_5: 0,
      count_lose_5: 0,
    },
    image: null,
    list: [],
    fallback: true,
    bannerId: id,
    message: 'Local safe-mode fallback: live HSR stats fetch skipped.',
  };
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
  const compareId = String(req.query.compare_id || '0');
  
  if (!id) {
    return res.status(400).json({ error: 'Banner ID is required' });
  }

  if (LOCAL_SAFE_MODE) {
    res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
    return res.status(200).json(buildFallbackStats(id));
  }
  
  try {
    const apiUrl = `https://starrailstation.com/api/v1/warp_fetch/${id}/?compare_id=${encodeURIComponent(compareId)}&_t=${Date.now()}`;
    console.log('[HSR API] Fetching:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[HSR API] Data received, total 5★ pulls:', data.stats?.total_pulls_5);
    
    res.setHeader('Cache-Control', STATS_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', STATS_CACHE_CONTROL);
    res.setHeader('Vercel-CDN-Cache-Control', STATS_CACHE_CONTROL);
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('[HSR API] Error:', error);
    res.setHeader('Cache-Control', FALLBACK_CACHE_CONTROL);
    return res.status(200).json(buildFallbackStats(id));
  }
}
