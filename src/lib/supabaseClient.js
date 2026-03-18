const SESSION_STORAGE_KEY = 'svarog_zone_auth_session_v1';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function hasSupabaseClientConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSessionStorageKey() {
  return SESSION_STORAGE_KEY;
}

export function getAuthRedirectUrl() {
  const basePath = import.meta.env.BASE_URL || '/';
  return new URL(`${basePath}auth/callback`, window.location.origin).toString();
}

export function buildDiscordOAuthUrl() {
  if (!hasSupabaseClientConfig()) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }

  const authUrl = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize`);
  authUrl.searchParams.set('provider', 'discord');
  authUrl.searchParams.set('redirect_to', getAuthRedirectUrl());
  authUrl.searchParams.set('scopes', 'identify email');
  return authUrl.toString();
}

export function parseAuthTokensFromUrl(urlLike) {
  const url = urlLike instanceof URL ? urlLike : new URL(String(urlLike));
  const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
  const searchParams = url.searchParams;

  const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
  const expiresIn = Number(hashParams.get('expires_in') || searchParams.get('expires_in') || 3600);
  const tokenType = hashParams.get('token_type') || searchParams.get('token_type') || 'bearer';

  if (!accessToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: tokenType,
    expires_in: Number.isFinite(expiresIn) ? expiresIn : 3600,
  };
}

export async function fetchSupabaseUser(accessToken) {
  if (!hasSupabaseClientConfig()) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  }

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Failed to fetch authenticated user.');
  }

  return response.json();
}

export async function revokeSupabaseSession(accessToken) {
  if (!hasSupabaseClientConfig() || !accessToken) {
    return;
  }

  try {
    await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Best effort logout.
  }
}

export function readStoredSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.expires_at) return null;
    if (Date.now() >= Number(parsed.expires_at)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
