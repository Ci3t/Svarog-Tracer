import { useState, useEffect, useRef, useCallback } from 'react';
import { saveSession, getStats } from '../utils/kiyoApi';

const LS_KEY_PENDING = 'kiyo_pending';
const LS_KEY_UID = 'svarog_uid';
const MIN_ROLLS_FOR_WARNING = 7;
const AUTO_SYNC_DEBOUNCE_MS = 5000;
const AUTO_SYNC_MIN_INTERVAL_MS = 30000;
const AUTO_SYNC_ROLL_THRESHOLD = 10;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 10000, 20000];
const STALE_HOURS = 24;

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getOrCreateAnonymousId() {
  try {
    let id = localStorage.getItem(LS_KEY_UID);
    if (!id) {
      id = `anon_${generateUUID().replace(/-/g, '').slice(0, 16)}`;
      localStorage.setItem(LS_KEY_UID, id);
    }
    return id;
  } catch {
    return `anon_fallback_${Date.now()}`;
  }
}

function loadPendingFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY_PENDING);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Stale check
    if (data.created_at) {
      const ageHours = (Date.now() - data.created_at) / (1000 * 60 * 60);
      if (ageHours > STALE_HOURS) {
        localStorage.removeItem(LS_KEY_PENDING);
        return null;
      }
    }
    return data;
  } catch {
    return null;
  }
}

function savePendingToStorage(data) {
  try {
    localStorage.setItem(LS_KEY_PENDING, JSON.stringify(data));
  } catch {
    // localStorage might be full — silently fail
  }
}

function clearPendingStorage() {
  try {
    localStorage.removeItem(LS_KEY_PENDING);
  } catch {
    // ignore
  }
}

/**
 * Hook to manage Kiyo session buffering, localStorage persistence,
 * auto-sync, and manual save to the Turso backend.
 *
 * @param {Object} options
 * @param {string} options.region - e.g. 'EU'
 * @param {string} options.patch - e.g. '4.3'
 * @param {string} [options.source='live_manual'] - roll source tag
 * @param {Object|null} options.user - Auth user object (from useAuth). If null, anonymous.
 */
export function useKiyoSession({ region, patch, source = 'live_manual', user }) {
  const userId = user?.id || getOrCreateAnonymousId();
  const sessionIdRef = useRef(generateUUID());
  const [pendingRolls, setPendingRolls] = useState(() => {
    const stored = loadPendingFromStorage();
    // Only restore if region/patch match current context
    if (stored && stored.region === region && stored.patch === patch) {
      return stored.rolls || [];
    }
    return [];
  });
  const [lastSyncAt, setLastSyncAt] = useState(() => {
    const stored = loadPendingFromStorage();
    return stored?.last_sync_at || null;
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | error | saved
  const [retryCount, setRetryCount] = useState(0);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const debounceTimerRef = useRef(null);
  const lastSyncAttemptRef = useRef(0);
  const rollsSinceSyncRef = useRef(0);

  // Persist pending rolls to localStorage whenever they change
  useEffect(() => {
    if (pendingRolls.length === 0) {
      clearPendingStorage();
      return;
    }
    savePendingToStorage({
      session_id: sessionIdRef.current,
      region,
      patch,
      source,
      rolls: pendingRolls,
      last_sync_at: lastSyncAt,
      sync_attempts: retryCount,
      created_at: Date.now(),
    });
  }, [pendingRolls, lastSyncAt, retryCount, region, patch, source]);

  // Auto-sync: debounce + cadence
  const triggerAutoSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncAttemptRef.current;
      const shouldSyncByTime = timeSinceLastSync >= AUTO_SYNC_MIN_INTERVAL_MS;
      const shouldSyncByCount = rollsSinceSyncRef.current >= AUTO_SYNC_ROLL_THRESHOLD;

      if (shouldSyncByTime || shouldSyncByCount) {
        performSync();
      }
    }, AUTO_SYNC_DEBOUNCE_MS);
  }, []);

  // Perform the actual sync
  const performSync = useCallback(async () => {
    if (pendingRolls.length === 0) return;
    if (syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    lastSyncAttemptRef.current = Date.now();
    rollsSinceSyncRef.current = 0;

    try {
      await saveSession({
        session_id: sessionIdRef.current,
        user_id: userId,
        region,
        patch,
        source,
        rolls: pendingRolls,
      });

      setSyncStatus('saved');
      setLastSyncAt(Date.now());
      setRetryCount(0);
      setPendingRolls([]);
      clearPendingStorage();
    } catch (err) {
      console.error('[Kiyo] Auto-sync failed:', err.message);
      setSyncStatus('error');

      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        setRetryCount((c) => c + 1);
        setTimeout(() => {
          setSyncStatus('idle');
          performSync();
        }, delay);
      }
    }
  }, [pendingRolls, userId, region, patch, source, syncStatus, retryCount]);

  // Add a roll to the pending buffer
  const addRoll = useCallback((roll3str, rollIndex, ts = Date.now()) => {
    setPendingRolls((prev) => {
      const next = [...prev, { roll_3str: roll3str, roll_index: rollIndex, ts }];
      rollsSinceSyncRef.current += 1;
      return next;
    });
    triggerAutoSync();
  }, [triggerAutoSync]);

  // Manual save trigger
  const saveNow = useCallback(async () => {
    await performSync();
  }, [performSync]);

  // Discard pending rolls
  const discardPending = useCallback(() => {
    setPendingRolls([]);
    setRetryCount(0);
    setSyncStatus('idle');
    clearPendingStorage();
  }, []);

  // beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const needsSave = pendingRolls.length >= MIN_ROLLS_FOR_WARNING &&
        (!lastSyncAt || Date.now() - lastSyncAt > 60000);
      if (needsSave) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingRolls, lastSyncAt]);

  // visibilitychange handler (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const needsSave = pendingRolls.length >= MIN_ROLLS_FOR_WARNING &&
        (!lastSyncAt || Date.now() - lastSyncAt > 60000);
      setShowUnsavedWarning(needsSave);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingRolls, lastSyncAt]);

  // Derived state
  const canSave = pendingRolls.length > 0;
  const shouldWarn = pendingRolls.length >= MIN_ROLLS_FOR_WARNING &&
    (!lastSyncAt || Date.now() - lastSyncAt > 60000);

  return {
    pendingRolls,
    pendingCount: pendingRolls.length,
    addRoll,
    saveNow,
    discardPending,
    syncStatus,
    lastSyncAt,
    retryCount,
    canSave,
    shouldWarn,
    showUnsavedWarning,
    setShowUnsavedWarning,
    userId,
    sessionId: sessionIdRef.current,
  };
}

export default useKiyoSession;
