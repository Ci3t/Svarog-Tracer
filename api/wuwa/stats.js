/**
 * WuWa Stats API Endpoint
 * Fetches and parses WuWa Tracker statistics for a given banner ID
 */

import { parseWuWaHTML_Adaptive } from '../utils/wuwaAdaptiveParser.js';

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
    const statsUrl = `https://wuwatracker.com/tracker/stats/${id}`;
    console.log('[WuWa API] Fetching:', statsUrl);
    
    // Use CORS proxy to bypass anti-bot protection
    // (Same approach as frontend - works reliably!)
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(statsUrl)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log('[WuWa API] HTML length:', html.length);
    
    const stats = parseWuWaHTML_Adaptive(html);
    
    if (!stats) {
      throw new Error('Failed to parse WuWa statistics');
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
