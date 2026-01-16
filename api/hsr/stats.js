/**
 * HSR Stats API Endpoint
 * Fetches Honkai: Star Rail statistics from stardb.gg
 */

export default async function handler(req, res) {
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
    const apiUrl = `https://starrailstation.com/api/v1/warp_fetch/${id}/?_t=${Date.now()}`;
    console.log('[HSR API] Fetching:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[HSR API] Data received, total 5★ pulls:', data.stats?.total_pulls_5);
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('[HSR API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch HSR stats',
      message: error.message 
    });
  }
}
