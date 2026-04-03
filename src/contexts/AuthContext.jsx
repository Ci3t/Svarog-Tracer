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

const ROLE_MODE_STORAGE_KEY = 'hsr_role_mode';
const SESSION_REFRESH_BUFFER_MS = 60 * 1000;

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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [roleMode, setRoleModeState] = useState(() => (typeof window === 'undefined' ? 'user' : readRoleMode()));

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
    clearStoredSession();
  }, []);

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
        const nextUser = await fetchSupabaseUser(hydratedSession.access_token);
        if (!cancelled) {
          applySession(hydratedSession, nextUser);
        }
      } catch {
        if (!cancelled) {
          resetAuth();
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

  const getAuthHeader = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session?.access_token]);

  const setRoleMode = useCallback((nextMode) => {
    const normalized = String(nextMode || '').toLowerCase() === 'admin' ? 'admin' : 'user';
    setRoleModeState(normalized);

    try {
      window.localStorage.setItem(ROLE_MODE_STORAGE_KEY, normalized);
    } catch {
      // Ignore localStorage write failures.
    }
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === ROLE_MODE_STORAGE_KEY) {
        setRoleModeState(readRoleMode());
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
  }, []);

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
      getAuthHeader,
      roleMode,
      setRoleMode,
    });
    },
    [session, user, loading, authError, signInWithDiscord, completeOAuthFromUrl, signOut, getAuthHeader, roleMode, setRoleMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
