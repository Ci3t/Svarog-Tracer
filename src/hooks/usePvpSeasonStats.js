import { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/apiBase';
import { useAuth } from './useAuth';

const PVP_STATS_API = buildApiUrl('/api/profile');

export function usePvpSeasonStats() {
  const { getAuthHeader, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(PVP_STATS_API, {
        method: 'GET',
        headers: {
          ...(isAuthenticated ? getAuthHeader() : {}),
        },
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load PvP season stats.');
      }
      setData(payload || null);
      return payload || null;
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        return null;
      }
      setError(requestError?.message || 'Failed to load PvP season stats.');
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

  return {
    data,
    loading,
    error,
    refresh,
  };
}

export default usePvpSeasonStats;
