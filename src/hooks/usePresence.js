import { useState, useEffect, useCallback, useRef } from 'react';

// Generate a unique session ID
const generateSessionId = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & (0x3 | 0x8));
    return v.toString(16);
  });
};

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// Use relative path to leverage Vite proxy or Vercel routing
const PRESENCE_API = isDev 
  ? '/api/presence' 
  : 'https://svarog-tracer.vercel.app/api/presence';

const STORAGE_KEY = 'hsr_presence_stats';
const SESSION_KEY = 'hsr_presence_session_id';

export function usePresence() {
  const [stats, setStats] = useState(() => {
    // Try to load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...parsed, loading: false, error: null };
        } catch (e) { /* ignore */ }
      }
    }
    return {
      active: 0,
      online: 0,
      today: 0,
      total: 0,
      loading: true,
      error: null
    };
  });
  
  const sessionIdRef = useRef(null);
  const lastActiveRef = useRef(0);
  const lastPredictionRef = useRef(0);
  const MIN_PING_INTERVAL = 30000; // 30 seconds
  
  // Initialize session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      const savedId = localStorage.getItem(SESSION_KEY);
      if (savedId) {
        sessionIdRef.current = savedId;
      } else {
        const newId = generateSessionId();
        sessionIdRef.current = newId;
        localStorage.setItem(SESSION_KEY, newId);
      }
    }
  }, []);
  
  const pingPresence = useCallback(async (type = 'fetch') => {
    if (!sessionIdRef.current) return;
    
    const now = Date.now();
    
    // Throttling for non-fetch types
    if (type === 'active' && now - lastActiveRef.current < MIN_PING_INTERVAL) return;
    if (type === 'prediction' && now - lastPredictionRef.current < 100) return; // Allow rapid input
    
    if (type === 'active') lastActiveRef.current = now;
    if (type === 'prediction') lastPredictionRef.current = now;
    
    try {
      const response = await fetch(PRESENCE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          type
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const newStats = {
            active: data.count || 0,
            online: data.online || 0,
            today: data.today || 0,
            total: data.total || 0,
            loading: false,
            error: null
          };
          setStats(newStats);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        }
      }
    } catch (error) {
      console.error('Presence API Error:', error);
      setStats(prev => ({ ...prev, loading: false, error: true }));
    }
  }, []);
  
  // Initial ping and periodic refresh
  useEffect(() => {
    // 1. Initial "active" ping on mount
    const timer = setTimeout(() => pingPresence('active'), 500);
    
    // 2. Periodic background refresh (every 30s)
    const interval = setInterval(() => pingPresence('fetch'), 30000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [pingPresence]);
  
  const trackPrediction = useCallback(() => {
    pingPresence('prediction');
  }, [pingPresence]);

  const trackActivity = useCallback(() => {
    pingPresence('active');
  }, [pingPresence]);
  
  return {
    stats,
    trackPrediction,
    trackActivity
  };
}
