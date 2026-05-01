import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NavigationBlockerContext = createContext(null);

export function NavigationBlockerProvider({ children }) {
  const [blocker, setBlocker] = useState(null);
  const saveCallbackRef = useRef(null);

  const registerBlocker = useCallback((blockFn) => {
    setBlocker(() => blockFn);
  }, []);

  const unregisterBlocker = useCallback(() => {
    setBlocker(null);
    saveCallbackRef.current = null;
  }, []);

  const registerSaveCallback = useCallback((saveFn) => {
    saveCallbackRef.current = saveFn;
  }, []);

  const checkBlocked = useCallback(() => {
    if (!blocker) return false;
    return blocker();
  }, [blocker]);

  const triggerSave = useCallback(async () => {
    if (saveCallbackRef.current) {
      await saveCallbackRef.current();
    }
  }, []);

  return (
    <NavigationBlockerContext.Provider value={{ registerBlocker, unregisterBlocker, checkBlocked, registerSaveCallback, triggerSave }}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker() {
  const ctx = useContext(NavigationBlockerContext);
  if (!ctx) {
    throw new Error('useNavigationBlocker must be used within NavigationBlockerProvider');
  }
  return ctx;
}

export default NavigationBlockerContext;
