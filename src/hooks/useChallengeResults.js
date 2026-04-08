import { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/apiBase';
import { useAuth } from './useAuth';

const CHALLENGE_RESULTS_API = buildApiUrl('/api/playground?view=challenge-results');

export function useChallengeResults() {
  const { getAuthHeader, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ signal } = {}) => {
    if (!isAuthenticated) {
      setData(null);
      setLoading(false);
      setError('');
      return null;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(CHALLENGE_RESULTS_API, {
        method: 'GET',
        headers: {
          ...getAuthHeader(),
        },
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load challenge results.');
      }
      setData(payload || null);
      return payload || null;
    } catch (requestError) {
      if (requestError?.name === 'AbortError') {
        return null;
      }
      setError(requestError?.message || 'Failed to load challenge results.');
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

export default useChallengeResults;
