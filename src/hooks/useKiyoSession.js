import { useState, useEffect, useRef, useCallback } from 'react';
import { saveSession, getStats } from '../utils/kiyoApi';

const LS_KEY_PENDING = 'kiyo_pending';
const LS_KEY_UID = 'svarog_uid';
const AUTO_SYNC_DEBOUNCE_MS = 2000;
const AUTO_SYNC_MIN_INTERVAL_MS = 10000;
const AUTO_SYNC_ROLL_THRESHOLD = 3;
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
    // Sanitize old rolls that may lack roll_index (back-compat)
    if (Array.isArray(data.rolls)) {
      data.rolls = data.rolls.map((r, idx) => ({
        roll_3str: r.roll_3str || '',
        roll_index: typeof r.roll_index === 'number' ? r.roll_index : idx,
        ts: r.ts || Date.now(),
        source: r.source || null,
      }));
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
      const rolls = stored.rolls || [];
      // Auto-clear tiny sessions on refresh — not worth saving
      if (rolls.length < 4) {
        localStorage.removeItem(LS_KEY_PENDING);
        return [];
      }
      return rolls;
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
  const performSyncRef = useRef(() => {});

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
        performSyncRef.current();
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
      // Derive source: if any roll has a per-roll source override, use the first one's
      const sessionSource = pendingRolls.find(r => r.source)?.source || source;
      // Strip source from individual rolls before sending (backend expects clean roll objects)
      const cleanRolls = pendingRolls.map(r => ({ roll_3str: r.roll_3str, roll_index: r.roll_index, ts: r.ts }));

      await saveSession({
        session_id: sessionIdRef.current,
        user_id: userId,
        region,
        patch,
        source: sessionSource,
        rolls: cleanRolls,
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
  performSyncRef.current = performSync;

  // Add a roll to the pending buffer
  const addRoll = useCallback((roll3str, rollIndex, ts = Date.now(), rollSource = null) => {
    setPendingRolls((prev) => {
      const next = [...prev, { roll_3str: roll3str, roll_index: rollIndex, ts, source: rollSource }];
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



  // Derived state
  const canSave = pendingRolls.length > 0;
  const shouldWarn = pendingRolls.length > 0 &&
    (!lastSyncAt || Date.now() - lastSyncAt > 10000);

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
