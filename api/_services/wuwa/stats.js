/**
 * WuWa Stats API Endpoint
 * Fetches and parses WuWa Tracker statistics for a given banner ID
 */

import { parseWuWaHTML_Adaptive } from '../../utils/wuwaAdaptiveParser.js';

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
    const statsUrl = `https://wuwatracker.com/tracker/stats/${id}`;
    console.log('[WuWa API] Fetching:', statsUrl);
    
    let html = null;

    // 1. Try Direct Fetch (Server-to-Server) - The Ideal Way
    try {
        const directRes = await fetch(statsUrl, {
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
    
    // 2. Proxy Fallbacks (If Direct Failed)
    if (!html) {
        console.log('[WuWa API] Trying proxy fallbacks...');
        const PROXIES = [
            // 1. CodeTabs (cors-anywhere-alt in frontend) - Confirmed working
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            // 2. CorsProxy.io - Often blocked but worth a shot as fallback
            (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            // 3. AllOrigins - Reliable fallback
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            // 4. ThingProxy - Last resort
            (url) => `https://thingproxy.freeboard.io/fetch/${url}`
        ];
        
        for (const proxyFormat of PROXIES) {
            try {
                const proxyUrl = proxyFormat(statsUrl);
                const res = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (res.ok) {
                    html = await res.text();
                    if (html.includes('WuWa Tracker')) break;
                }
            } catch (e) { /* continue */ }
        }
    }
    
    if (!html) {
      throw new Error(`All fetch methods failed for ${id}`);
    }
    console.log('[WuWa API] HTML length:', html.length);
    
    const stats = parseWuWaHTML_Adaptive(html);
    
    if (!stats) {
      console.warn('[WuWa API] Parsing failed, returning fallback');
      // Return a safe fallback object so frontend/bot doesn't crash
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
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error('[WuWa API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch WuWa stats',
      message: error.message 
    });
  }
}
