import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildDiscordOAuthUrl,
  clearStoredSession,
  fetchSupabaseUser,
  getSessionStorageKey,
  hasSupabaseClientConfig,
  isSessionExpired,
  parseAuthTokensFromUrl,
  readStoredSession,
  refreshSupabaseSession,
  revokeSupabaseSession,
  storeSession,
} from '../lib/supabaseClient';
import { AuthContext } from './auth-context';
import { buildVercelApiUrl } from '../utils/apiBase';

const ROLE_MODE_STORAGE_KEY = 'hsr_role_mode';
const ADMIN_UNLOCK_STORAGE_KEY = 'hsr_admin_unlock';
const LEGACY_ADMIN_PASS_STORAGE_KEY = 'hsr_admin_pass';
const SESSION_REFRESH_BUFFER_MS = 60 * 1000;
const TRUSTED_ADMIN_DISCORD_IDS = new Set([
  '110890964364627968',
  '97579134456168448',
]);

function extractBanInfo(user) {
  if (!user || typeof user !== 'object') return null;
  const rawBan =
    (user?.app_metadata && typeof user.app_metadata.svarog_ban === 'object' && user.app_metadata.svarog_ban) ||
    (user?.user_metadata && typeof user.user_metadata.svarog_ban === 'object' && user.user_metadata.svarog_ban) ||
    null;

  if (!rawBan) return null;

  const reason = String(rawBan.reason || rawBan.message || rawBan.note || '').trim();
  const bannedAt = String(rawBan.banned_at || rawBan.at || '').trim();
  const bannedByName = String(rawBan.banned_by_name || rawBan.by_name || rawBan.admin_name || '').trim();

  if (!reason && !bannedAt && !bannedByName) return null;

  return {
    reason: reason || 'No reason provided.',
    bannedAt: bannedAt || null,
    bannedByName: bannedByName || null,
  };
}

function readRoleMode() {
  try {
    const raw = String(window.localStorage.getItem(ROLE_MODE_STORAGE_KEY) || 'user').toLowerCase();
    return raw === 'admin' ? 'admin' : 'user';
  } catch {
    return 'user';
  }
}

function readAdminUnlock(userId) {
  try {
    const raw = window.localStorage.getItem(ADMIN_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const expiresAt = Number(parsed?.expiresAt || 0);
    if (!parsed || parsed.userId !== userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_ADMIN_PASS_STORAGE_KEY);
      return null;
    }
    return { expiresAt };
  } catch {
    return null;
  }
}

function writeAdminUnlock(userId, expiresAt) {
  try {
    window.localStorage.setItem(ADMIN_UNLOCK_STORAGE_KEY, JSON.stringify({ userId, expiresAt }));
    window.localStorage.removeItem(LEGACY_ADMIN_PASS_STORAGE_KEY);
  } catch {
    // Ignore localStorage write failures.
  }
}

function clearAdminUnlock() {
  try {
    window.localStorage.removeItem(ADMIN_UNLOCK_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_ADMIN_PASS_STORAGE_KEY);
  } catch {
    // Ignore localStorage write failures.
  }
}

function getDiscordUserIds(user) {
  if (!user || typeof user !== 'object') return [];

  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const ids = [
    metadata.provider_id,
    metadata.discord_id,
  ];

  for (const identity of identities) {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    if (provider !== 'discord') continue;

    const identityData = identity?.identity_data && typeof identity.identity_data === 'object'
      ? identity.identity_data
      : {};

    ids.push(
      identity?.provider_id,
      identity?.id,
      identityData.user_id,
      identityData.id,
      identityData.sub,
    );
  }

  return Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
}

function isTrustedAdminDiscordClient(user) {
  return getDiscordUserIds(user).some((id) => TRUSTED_ADMIN_DISCORD_IDS.has(id));
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [roleMode, setRoleModeState] = useState(() => (typeof window === 'undefined' ? 'user' : readRoleMode()));
  const [adminEligible, setAdminEligible] = useState(false);
  const [adminStatusLoading, setAdminStatusLoading] = useState(false);
  const [adminPasswordRequired, setAdminPasswordRequired] = useState(false);
  const [adminUnlockExpiresAt, setAdminUnlockExpiresAt] = useState(0);
  const adminClientTrusted = useMemo(() => isTrustedAdminDiscordClient(user), [user]);
  const adminVisible = adminEligible || adminClientTrusted;

  const applyRoleMode = useCallback((nextMode) => {
    const normalized = String(nextMode || '').toLowerCase() === 'admin' ? 'admin' : 'user';
    setRoleModeState(normalized);

    try {
      window.localStorage.setItem(ROLE_MODE_STORAGE_KEY, normalized);
    } catch {
      // Ignore localStorage write failures.
    }
  }, []);

  const applySession = useCallback((nextSession, nextUser) => {
    if (!nextSession?.access_token || !nextSession?.expires_at) {
      setSession(null);
      setUser(null);
      clearStoredSession();
      return;
    }

    storeSession(nextSession);
    setSession(nextSession);
    setUser(nextUser || nextSession.user || null);
    const nextBan = extractBanInfo(nextUser || nextSession.user || null);
    setAuthError(nextBan ? `This account is banned. ${nextBan.reason}` : '');
  }, []);

  const resetAuth = useCallback(() => {
    setSession(null);
    setUser(null);
    setAdminEligible(false);
    setAdminStatusLoading(false);
    setAdminPasswordRequired(false);
    setAdminUnlockExpiresAt(0);
    applyRoleMode('user');
    clearAdminUnlock();
    clearStoredSession();
  }, [applyRoleMode]);

  const refreshSession = useCallback(
    async (currentSession, { force = false } = {}) => {
      if (!currentSession?.refresh_token) {
        if (force && isSessionExpired(currentSession)) {
          resetAuth();
        }
        return currentSession;
      }

      if (!force && !isSessionExpired(currentSession, SESSION_REFRESH_BUFFER_MS)) {
        return currentSession;
      }

      const refreshed = await refreshSupabaseSession(currentSession.refresh_token);
      const nextUser = refreshed.user || (await fetchSupabaseUser(refreshed.access_token));
      const nextSession = {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || currentSession.refresh_token,
        token_type: refreshed.token_type || currentSession.token_type || 'bearer',
        expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
        user: {
          id: nextUser.id,
          email: nextUser.email || null,
          user_metadata: nextUser.user_metadata || {},
        },
      };

      applySession(nextSession, nextUser);
      return nextSession;
    },
    [applySession, resetAuth]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!hasSupabaseClientConfig()) {
        setAuthError('Auth config missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
        setLoading(false);
        return;
      }

      const stored = readStoredSession();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const hydratedSession = await refreshSession(stored);
        if (!hydratedSession?.access_token) {
          if (!cancelled) {
            resetAuth();
          }
          return;
        }
        const nextUser = hydratedSession.user || (await fetchSupabaseUser(hydratedSession.access_token));
        if (!cancelled) {
          applySession(hydratedSession, nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          resetAuth();
          setAuthError(error?.message || '');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applySession, refreshSession, resetAuth]);

  const signInWithDiscord = useCallback(() => {
    const url = buildDiscordOAuthUrl();
    window.location.assign(url);
  }, []);

  const completeOAuthFromUrl = useCallback(async (urlLike) => {
    const tokenPayload = parseAuthTokensFromUrl(urlLike || window.location.href);
    if (!tokenPayload?.access_token) {
      throw new Error('No access token found in callback URL.');
    }

    const nextUser = await fetchSupabaseUser(tokenPayload.access_token);
    const expiresAt = Date.now() + Number(tokenPayload.expires_in || 3600) * 1000;

    const nextSession = {
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token || null,
      token_type: tokenPayload.token_type || 'bearer',
      expires_at: expiresAt,
      user: {
        id: nextUser.id,
        email: nextUser.email || null,
        user_metadata: nextUser.user_metadata || {},
      },
    };

    applySession(nextSession, nextUser);

    return nextSession;
  }, [applySession]);

  const signOut = useCallback(async () => {
    const accessToken = session?.access_token;
    resetAuth();
    await revokeSupabaseSession(accessToken);
  }, [resetAuth, session?.access_token]);

  const replaceUser = useCallback((nextUser) => {
    if (!nextUser || typeof nextUser !== 'object') return;
    setUser(nextUser);
    setAuthError(extractBanInfo(nextUser) ? `This account is banned. ${extractBanInfo(nextUser).reason}` : '');
    if (session?.access_token) {
      const nextSession = {
        ...session,
        user: {
          id: nextUser.id || session?.user?.id || null,
          email: nextUser.email || session?.user?.email || null,
          user_metadata: nextUser.user_metadata || session?.user?.user_metadata || {},
        },
      };
      storeSession(nextSession);
      setSession(nextSession);
    }
  }, [session]);

  const refreshUser = useCallback(async () => {
    if (!session?.access_token) return null;
    const nextUser = await fetchSupabaseUser(session.access_token);
    replaceUser(nextUser);
    return nextUser;
  }, [replaceUser, session?.access_token]);

  const getAuthHeader = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session?.access_token]);

  const unlockAdminMode = useCallback(async () => {
    if (!session?.access_token || !user?.id || !adminVisible) return false;

    if (adminClientTrusted) {
      return true;
    }

    if (!adminPasswordRequired) {
      return true;
    }

    const storedUnlock = readAdminUnlock(user.id);
    if (storedUnlock) {
      setAdminUnlockExpiresAt(storedUnlock.expiresAt);
      return true;
    }

    const password = window.prompt('Enter admin password to enable Admin Mode.');
    if (!password) return false;

    const response = await fetch(buildVercelApiUrl('/api/admin?action=unlock-admin-mode'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.unlocked) {
      window.alert(payload?.error || 'Invalid admin password.');
      return false;
    }

    const expiresAt = Date.parse(payload?.expires_at || '') || (Date.now() + Number(payload?.ttl_ms || 0));
    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      writeAdminUnlock(user.id, expiresAt);
      setAdminUnlockExpiresAt(expiresAt);
    }

    return true;
  }, [adminClientTrusted, adminPasswordRequired, adminVisible, session?.access_token, user?.id]);

  const setRoleMode = useCallback(async (nextMode) => {
    const normalized = String(nextMode || '').toLowerCase() === 'admin' ? 'admin' : 'user';
    if (normalized !== 'admin') {
      applyRoleMode('user');
      return true;
    }

    if (!adminVisible) {
      applyRoleMode('user');
      return false;
    }

    const unlocked = await unlockAdminMode();
    applyRoleMode(unlocked ? 'admin' : 'user');
    return unlocked;
  }, [adminVisible, applyRoleMode, unlockAdminMode]);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminEligibility() {
      if (!session?.access_token || !user?.id) {
        setAdminEligible(false);
        setAdminStatusLoading(false);
        setAdminPasswordRequired(false);
        setAdminUnlockExpiresAt(0);
        applyRoleMode('user');
        clearAdminUnlock();
        return;
      }

      setAdminStatusLoading(true);
      try {
        const response = await fetch(buildVercelApiUrl('/api/admin?action=me'), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => ({}));
        const allowed = Boolean(response.ok && payload?.is_admin);
        const requiresPassword = Boolean(payload?.requires_admin_password);
        const storedUnlock = requiresPassword ? readAdminUnlock(user.id) : null;

        if (!cancelled) {
          setAdminEligible(allowed);
          setAdminPasswordRequired(allowed ? requiresPassword : false);
          setAdminUnlockExpiresAt(storedUnlock?.expiresAt || 0);
          if ((!allowed && !adminClientTrusted) || (requiresPassword && !storedUnlock && !adminClientTrusted)) {
            applyRoleMode('user');
          }
        }
      } catch {
        if (!cancelled) {
          setAdminEligible(false);
          setAdminPasswordRequired(false);
          setAdminUnlockExpiresAt(0);
          applyRoleMode('user');
          clearAdminUnlock();
        }
      } finally {
        if (!cancelled) {
          setAdminStatusLoading(false);
        }
      }
    }

    checkAdminEligibility();
    return () => {
      cancelled = true;
    };
  }, [adminClientTrusted, applyRoleMode, session?.access_token, user?.id]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === ROLE_MODE_STORAGE_KEY) {
        const nextMode = readRoleMode();
        setRoleModeState(nextMode === 'admin' && !adminVisible ? 'user' : nextMode);
        return;
      }

      if (event.key !== getSessionStorageKey()) return;

      const nextStored = readStoredSession();
      if (!nextStored?.access_token) {
        setSession(null);
        setUser(null);
        return;
      }

      setSession(nextStored);
      setUser(nextStored.user || null);
      setAuthError('');
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [adminVisible]);

  useEffect(() => {
    if (!adminPasswordRequired || roleMode !== 'admin') return undefined;

    const expiresIn = Number(adminUnlockExpiresAt || 0) - Date.now();
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      clearAdminUnlock();
      setAdminUnlockExpiresAt(0);
      applyRoleMode('user');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearAdminUnlock();
      setAdminUnlockExpiresAt(0);
      applyRoleMode('user');
    }, expiresIn);

    return () => window.clearTimeout(timer);
  }, [adminPasswordRequired, adminUnlockExpiresAt, applyRoleMode, roleMode]);

  useEffect(() => {
    if (!session?.access_token || !session?.expires_at || !session?.refresh_token) {
      return undefined;
    }

    const delay = Math.max(5 * 1000, Number(session.expires_at) - Date.now() - SESSION_REFRESH_BUFFER_MS);
    const refreshTimer = window.setTimeout(async () => {
      try {
        await refreshSession(session, { force: true });
      } catch {
        resetAuth();
      }
    }, delay);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshSession, resetAuth, session]);

  const value = useMemo(
    () => {
      const banInfo = extractBanInfo(user);
      return ({
      session,
      user,
      loading,
      authError,
      isAuthenticated: Boolean(session?.access_token && user?.id),
      isBanned: Boolean(banInfo),
      banInfo,
      signInWithDiscord,
      completeOAuthFromUrl,
      signOut,
      replaceUser,
      refreshUser,
      getAuthHeader,
      roleMode,
      setRoleMode,
      adminEligible,
      adminVisible,
      adminClientTrusted,
      adminStatusLoading,
      adminPasswordRequired,
      adminUnlockExpiresAt,
    });
    },
    [session, user, loading, authError, signInWithDiscord, completeOAuthFromUrl, signOut, replaceUser, refreshUser, getAuthHeader, roleMode, setRoleMode, adminEligible, adminVisible, adminClientTrusted, adminStatusLoading, adminPasswordRequired, adminUnlockExpiresAt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
