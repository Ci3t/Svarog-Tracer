import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildDiscordOAuthUrl,
  clearStoredSession,
  fetchSupabaseUser,
  hasSupabaseClientConfig,
  parseAuthTokensFromUrl,
  readStoredSession,
  revokeSupabaseSession,
  storeSession,
} from '../lib/supabaseClient';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const resetAuth = useCallback(() => {
    setSession(null);
    setUser(null);
    clearStoredSession();
  }, []);

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
        const nextUser = await fetchSupabaseUser(stored.access_token);
        if (!cancelled) {
          setSession(stored);
          setUser(nextUser);
          setAuthError('');
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
  }, [resetAuth]);

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

    storeSession(nextSession);
    setSession(nextSession);
    setUser(nextUser);
    setAuthError('');

    return nextSession;
  }, []);

  const signOut = useCallback(async () => {
    const accessToken = session?.access_token;
    resetAuth();
    await revokeSupabaseSession(accessToken);
  }, [resetAuth, session?.access_token]);

  const getAuthHeader = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session?.access_token]);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      authError,
      isAuthenticated: Boolean(session?.access_token && user?.id),
      signInWithDiscord,
      completeOAuthFromUrl,
      signOut,
      getAuthHeader,
    }),
    [session, user, loading, authError, signInWithDiscord, completeOAuthFromUrl, signOut, getAuthHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
