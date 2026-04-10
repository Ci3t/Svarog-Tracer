import { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/apiBase';

const CHALLENGE_LEADERBOARD_API = buildApiUrl('/api/playground?view=challenge-leaderboard');

export function useChallengeLeaderboard(limit = 20) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async ({ signal } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${CHALLENGE_LEADERBOARD_API}&limit=${encodeURIComponent(limit)}`, {
        method: 'GET',
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load challenge leaderboard.');
      }
      setData(payload || null);
      return payload || null;
    } catch (requestError) {
      if (requestError?.name === 'AbortError') return null;
      setError(requestError?.message || 'Failed to load challenge leaderboard.');
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [limit]);

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

export default useChallengeLeaderboard;
