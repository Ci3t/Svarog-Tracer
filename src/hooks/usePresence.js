import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { buildApiUrl } from '../utils/apiBase';

const PRESENCE_API = buildApiUrl('/api/presence');
const STORAGE_KEY = 'hsr_presence_stats';
const SESSION_KEY = 'hsr_presence_session_id';
const ACTIVE_INTERVAL_MS = 180000;
const ACTIVE_GRACE_MS = 120000;
const DIRECTORY_REFRESH_MS = 120000;
const PREDICTION_GRACE_MS = 5000;

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

function readCachedStats() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendPresenceBeacon(sessionId, type = 'offline') {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon || !sessionId) return false;
  const payload = JSON.stringify({ sessionId, type, includeUsers: false });
  return navigator.sendBeacon(PRESENCE_API, new Blob([payload], { type: 'application/json' }));
}

export function usePresence() {
  const location = useLocation();
  const { isAuthenticated, getAuthHeader, loading } = useAuth();
  const [stats, setStats] = useState(() => {
    const cached = readCachedStats();
    return {
      active: cached?.active || 0,
      online: cached?.online || 0,
      today: cached?.today || 0,
      total: cached?.total || 0,
      users: Array.isArray(cached?.users) ? cached.users : [],
      self: cached?.self || null,
      loading: true,
      error: null,
    };
  });

  const sessionIdRef = useRef(null);
  const lastActiveRef = useRef(0);
  const lastPredictionRef = useRef(0);
  const lastDirectoryRef = useRef(0);
  const previousAuthRef = useRef(false);
  const previousPathRef = useRef(null);

  useEffect(() => {
    if (sessionIdRef.current || typeof window === 'undefined') return;
    const savedId = localStorage.getItem(SESSION_KEY);
    if (savedId) {
      sessionIdRef.current = savedId;
      return;
    }
    const nextId = generateSessionId();
    sessionIdRef.current = nextId;
    localStorage.setItem(SESSION_KEY, nextId);
  }, []);

  const pingPresence = useCallback(async (type = 'fetch', options = {}) => {
    if (loading && type !== 'offline') return null;

    const sessionId = sessionIdRef.current;
    if (!sessionId) return null;

    const now = Date.now();
    const { force = false, includeUsers = false, keepalive = false } = options;
    if (!force) {
      if (type === 'active' && now - lastActiveRef.current < ACTIVE_GRACE_MS) return null;
      if (type === 'prediction' && now - lastPredictionRef.current < PREDICTION_GRACE_MS) return null;
      if (includeUsers && now - lastDirectoryRef.current < DIRECTORY_REFRESH_MS) return null;
    }

    if (type === 'active') lastActiveRef.current = now;
    if (type === 'prediction') lastPredictionRef.current = now;
    if (includeUsers) lastDirectoryRef.current = now;

    const headers = {
      'Content-Type': 'application/json',
      ...(isAuthenticated ? getAuthHeader() : {}),
    };

    try {
      const response = await fetch(PRESENCE_API, {
        method: 'POST',
        headers,
        keepalive,
        body: JSON.stringify({
          sessionId,
          type,
          includeUsers,
          pagePath: location.pathname,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || 'Presence request failed.');
      }

      let resolvedStats = null;
      setStats((prev) => {
        const nextStats = {
          active: data.count || 0,
          online: data.online || 0,
          today: data.today || 0,
          total: data.total || 0,
          users: includeUsers ? (Array.isArray(data.users) ? data.users : []) : prev.users,
          self: includeUsers ? (data.self || null) : prev.self,
          loading: false,
          error: null,
        };
        resolvedStats = nextStats;
        return nextStats;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resolvedStats));
      }
      return resolvedStats;
    } catch (error) {
      setStats((prev) => ({ ...prev, loading: false, error: error?.message || true }));
      return null;
    }
  }, [getAuthHeader, isAuthenticated, loading, location.pathname]);

  const markOffline = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    if (sendPresenceBeacon(sessionId, 'offline')) {
      return;
    }

    fetch(PRESENCE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ sessionId, type: 'offline', includeUsers: false }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    const fetchTimer = window.setTimeout(() => {
      pingPresence('fetch', { force: true, includeUsers: false });
    }, 800);

    return () => window.clearTimeout(fetchTimer);
  }, [loading, pingPresence]);

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;
    pingPresence('active', { force: true, includeUsers: false });
    const timer = window.setInterval(() => {
      pingPresence('active', { force: true, includeUsers: false });
    }, ACTIVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, loading, pingPresence]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;

    if (previousPathRef.current === null) {
      previousPathRef.current = location.pathname;
      return;
    }

    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      pingPresence('active', { force: true, includeUsers: false });
      return;
    }

    previousPathRef.current = location.pathname;
  }, [isAuthenticated, loading, location.pathname, pingPresence]);

  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingPresence('active', { includeUsers: false });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, loading, pingPresence]);

  useEffect(() => {
    const wasAuthenticated = previousAuthRef.current;
    if (wasAuthenticated && !isAuthenticated) {
      markOffline();
      setStats((prev) => ({ ...prev, self: null }));
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated, markOffline]);

  useEffect(() => {
    const handleUnload = () => {
      if (previousAuthRef.current) {
        markOffline();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [markOffline]);

  const trackPrediction = useCallback(() => {
    pingPresence('prediction', { includeUsers: false });
  }, [pingPresence]);

  const trackActivity = useCallback(() => {
    pingPresence('active', { includeUsers: false });
  }, [pingPresence]);

  const refreshPresence = useCallback((options = {}) => {
    return pingPresence('fetch', {
      force: true,
      includeUsers: Boolean(options.includeUsers ?? isAuthenticated),
    });
  }, [isAuthenticated, pingPresence]);

  return {
    stats,
    trackPrediction,
    trackActivity,
    refreshPresence,
  };
}
