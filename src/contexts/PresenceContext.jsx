import React, { createContext, useContext, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const presence = usePresence();
  
  // Global expose for App.jsx (hacky but effective for current structure)
  useEffect(() => {
    window.__trackPrediction = presence.trackPrediction;
  }, [presence.trackPrediction]);

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (!context) {
    return {
      stats: { active: 0, online: 0, today: 0, total: 0, users: [], self: null, loading: false, error: null },
      trackPrediction: () => {},
      trackActivity: () => {},
      refreshPresence: () => {},
    };
  }
  return context;
}
