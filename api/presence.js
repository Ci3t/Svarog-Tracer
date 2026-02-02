// Persistent counters using simple file storage for local dev reliability
import fs from 'fs';
import path from 'path';

// Vercel dev usually runs from project root
const LOCAL_DB_FILE = path.join(process.cwd(), 'presence_store.json');
const TMP_DB_FILE = path.join('/tmp', 'presence_db.json');

// In-memory fallback
let memoryCache = {
  total: 0,
  today: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  activePredictors: {}, // plain object for JSON serialization
  activeUsers: {},
  ipTimestamps: {}
};

let lastWriteError = null; // Debugging
let persistencePath = 'memory';

function loadData() {
  try {
    // Try local file first (for persistent local dev)
    if (fs.existsSync(LOCAL_DB_FILE)) {
      persistencePath = LOCAL_DB_FILE;
      return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
    }
    // Try tmp file (for Vercel execution context)
    if (fs.existsSync(TMP_DB_FILE)) {
      persistencePath = TMP_DB_FILE;
      return JSON.parse(fs.readFileSync(TMP_DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Failed to load persistence file, utilizing memory cache');
  }
  return memoryCache;
}

function saveData(data) {
  memoryCache = data; // Always update memory
  try {
    // Write to local file if possible (for local dev persistence)
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2));
      lastWriteError = null;
    } catch (e) {
      lastWriteError = `Local write failed: ${e.message}`;
      // Fallback to /tmp which is writable in Lambda
      if (process.env.NODE_ENV === 'production') {
        fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data));
      }
    }
  } catch (e) {
    lastWriteError = `All writes failed: ${e.message}`;
  }
}

// Configuration
const FEATURE_ENABLED = process.env.PRESENCE_ENABLED !== 'false';
const PREDICTOR_TIMEOUT = 60 * 1000;  // 1 minute
const USER_TIMEOUT = 5 * 60 * 1000;   // 5 minutes
const RATE_LIMIT_PRED = 200;          // 200ms (fast prediction tracking)
const RATE_LIMIT_ACTIVE = 30 * 1000;  // 30 seconds for active pings
const RATE_LIMIT_FETCH = 5 * 1000;    // 5 seconds for fetches

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (!FEATURE_ENABLED) {
    return res.status(200).json({
      success: false,
      message: 'Feature disabled',
      count: 0,
      online: 0,
      total: 0,
      today: 0
    });
  }
  
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress;
    
    const { sessionId, type = 'fetch' } = req.body;
    
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Invalid sessionId' });
    }

    const now = Date.now();
    let data = loadData();
    
    // Ensure structure exists if file was partial
    if (!data.activePredictors) data.activePredictors = {};
    if (!data.activeUsers) data.activeUsers = {};
    if (!data.ipTimestamps) data.ipTimestamps = {};
    
    // 1. Cleanup stale sessions
    Object.keys(data.activePredictors).forEach(sid => {
      if (now - data.activePredictors[sid] > PREDICTOR_TIMEOUT) {
        delete data.activePredictors[sid];
      }
    });
    Object.keys(data.activeUsers).forEach(sid => {
      if (now - data.activeUsers[sid] > USER_TIMEOUT) {
        delete data.activeUsers[sid];
      }
    });
    
    // Cleanup old IP timestamps (last hour)
    Object.keys(data.ipTimestamps).forEach(checkIp => {
      const timestamps = data.ipTimestamps[checkIp];
      // If object is empty or all timestamps are old, delete
      if (!timestamps || (
          (now - (timestamps.fetch || 0) > 60000) && 
          (now - (timestamps.active || 0) > 60000) && 
          (now - (timestamps.prediction || 0) > 60000)
      )) {
        delete data.ipTimestamps[checkIp];
      }
    });

    // 2. Daily Reset
    const currentDate = new Date().toISOString().split('T')[0];
    if (currentDate !== data.lastResetDate) {
      data.today = 0;
      data.lastResetDate = currentDate;
    }
    
    // 3. Rate limiting check (Decoupled)
    if (!data.ipTimestamps[ip]) data.ipTimestamps[ip] = {};
    const userTimestamps = data.ipTimestamps[ip];
    
    let isRateLimited = false;
    
    if (type === 'fetch') {
      if (now - (userTimestamps.fetch || 0) < RATE_LIMIT_FETCH) isRateLimited = true;
      else userTimestamps.fetch = now;
    } else if (type === 'active') {
      if (now - (userTimestamps.active || 0) < RATE_LIMIT_ACTIVE) isRateLimited = true;
      else userTimestamps.active = now;
    } else if (type === 'prediction') {
      // Very fast debounce for predictions (200ms) to prevent double-clicks but allow rapid entry
      if (now - (userTimestamps.prediction || 0) < 200) isRateLimited = true;
      else userTimestamps.prediction = now;
    }
    
    // Allow cached return if rate limited
    if (isRateLimited) {
      return res.status(200).json({
        success: true,
        count: Object.keys(data.activePredictors).length,
        online: Object.keys(data.activeUsers).length,
        total: data.total,
        today: data.today,
        rateLimited: true
      });
    }
    
    // 4. Update session data
    if (type === 'prediction') {
      data.activePredictors[sessionId] = now;
      data.activeUsers[sessionId] = now;
      data.total = (data.total || 0) + 1;
      data.today = (data.today || 0) + 1;
    } else if (type === 'active') {
      data.activeUsers[sessionId] = now;
    }
    
    saveData(data); // Persist logic
    
    return res.status(200).json({
      success: true,
      count: Object.keys(data.activePredictors).length,
      online: Object.keys(data.activeUsers).length,
      total: data.total,
      today: data.today
    });
    
  } catch (error) {
    console.error('Presence API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
}
