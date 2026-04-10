import { useEffect, useMemo, useRef } from 'react';
import { buildApiUrl } from '../utils/apiBase';
import { useAuth } from './useAuth';

export function useLiveModeCurrency(entries) {
  const { user, getAuthHeader } = useAuth();
  const rewardedMilestoneRef = useRef({ sessionKey: '', milestone: 0 });

  const sessionKey = useMemo(() => {
    const firstEntry = Array.isArray(entries) ? entries[0] : null;
    if (!firstEntry) return '';
    const stamp = String(firstEntry.time || firstEntry.createdAt || '').trim()
      || String(firstEntry.raw || firstEntry.translated || '').trim()
      || 'session';
    return `live-${stamp}`;
  }, [entries]);

  useEffect(() => {
    if (!user?.id || !sessionKey) return;
    const milestone = Math.floor((Array.isArray(entries) ? entries.length : 0) / 10);

    if (rewardedMilestoneRef.current.sessionKey !== sessionKey) {
      rewardedMilestoneRef.current = { sessionKey, milestone: 0 };
    }

    if (milestone <= 0 || milestone <= rewardedMilestoneRef.current.milestone) return;

    fetch(buildApiUrl('/api/profile'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        action: 'grant_live_mode_currency',
        sessionKey,
        milestone,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'Failed to grant live mode currency.');
        }
        rewardedMilestoneRef.current = { sessionKey, milestone };
      })
      .catch(() => {});
  }, [entries, getAuthHeader, sessionKey, user?.id]);
}

export default useLiveModeCurrency;
