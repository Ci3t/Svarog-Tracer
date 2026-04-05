import React, { createContext, useContext, useEffect } from 'react';
import { usePresence } from '../hooks/usePresence';

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const presence = usePresence();
  const { trackActivity } = presence;
  
  // Centralized activity tracking (non-idle users)
  useEffect(() => {
    const handleActivity = () => {
      trackActivity();
    };
    
    // Events that signal a user is active (non-idle)
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [trackActivity]);
  
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
