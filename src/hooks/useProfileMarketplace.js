import { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/apiBase';
import { useAuth } from './useAuth';

const PROFILE_MARKETPLACE_API = buildApiUrl('/api/profile?view=marketplace');

export function useProfileMarketplace() {
  const { getAuthHeader, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ signal } = {}) => {
    if (!isAuthenticated) {
      setData(null);
      setError('');
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(PROFILE_MARKETPLACE_API, {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load marketplace.');
      }
      setData(payload || null);
      return payload || null;
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        return null;
      }
      setError(requestError?.message || 'Failed to load marketplace.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [getAuthHeader, isAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();
    refresh({ signal: controller.signal });
    return () => controller.abort();
  }, [refresh]);

  const refreshSilent = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      const response = await fetch(PROFILE_MARKETPLACE_API, {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setData(payload || null);
      return payload || null;
    } catch {
      return null;
    }
  }, [getAuthHeader, isAuthenticated]);

  return {
    data,
    loading,
    error,
    refresh,
    refreshSilent,
  };
}

export default useProfileMarketplace;
