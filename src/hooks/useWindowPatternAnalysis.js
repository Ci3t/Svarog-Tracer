import { useMemo, useRef } from 'react';

/**
 * Per-window pattern analysis hook
 * Stores and analyzes rolls per 5-minute window
 * For test rolls: Uses roll count (every 11 rolls = new window)
 * For live rolls: Uses actual timestamps
 */
export function useWindowPatternAnalysis(rollEvents, windowInfo) {
  const windowDataRef = useRef({});
  
  const windowAnalysis = useMemo(() => {
    if (!rollEvents || rollEvents.length === 0) {
      return {
        currentWindowKey: null,
        currentWindowRolls: [],
        windowData: {},
        isNewWindow: false
      };
    }

    // 🔥 SMART WINDOW DETECTION: Use roll count for test mode, timestamps for live
    let windowKey;
    let currentWindowRolls;
    
    if (windowInfo && windowInfo.startMs) {
      // Live mode: Use actual timestamps
      const { startMs, endMs } = windowInfo;
      windowKey = startMs;
      
      currentWindowRolls = rollEvents.filter(e => {
        const ts = Number(e?.ts ?? 0);
        const roll = String(e?.roll ?? '').trim();
        return roll.length >= 3 && ts >= startMs && ts < endMs;
      });
    } else {
      // Test mode: Use roll count (every 11 rolls = new window)
      const totalRolls = rollEvents.length;
      const windowIndex = Math.floor((totalRolls - 1) / 11);
      windowKey = `test-window-${windowIndex}`;
      
      const startIdx = windowIndex * 11;
      const endIdx = Math.min(startIdx + 11, totalRolls);
      
      currentWindowRolls = rollEvents.slice(startIdx, endIdx);
    }
    
    // Check if this is a new window
    const previousWindowKey = windowDataRef.current.lastWindowKey;
    const isNewWindow = previousWindowKey !== null && previousWindowKey !== windowKey;
    
    // Store window data
    if (!windowDataRef.current[windowKey]) {
      windowDataRef.current[windowKey] = {
        rolls: [],
        col2States: [],
        col3States: [],
        startTime: windowInfo?.startMs || Date.now(),
        endTime: windowInfo?.endMs || Date.now()
      };
    }
    
    // Update current window data
    const windowData = windowDataRef.current[windowKey];
    windowData.rolls = currentWindowRolls.map(e => e.roll);
    
    // Extract column states for pattern analysis
    windowData.col2States = windowData.rolls.map(roll => {
      const digit2 = roll[1];
      return ['1', '4'].includes(digit2) ? 'A' : 'B';
    });
    
    windowData.col3States = windowData.rolls.map(roll => {
      const digit3 = roll[2];
      return ['1', '2'].includes(digit3) ? 'A' : 'B';
    });
    
    // Update last window key
    windowDataRef.current.lastWindowKey = windowKey;
    
    // 🔥 NEW: Track pattern transitions
    const previousWindowKeys = Object.keys(windowDataRef.current)
      .filter(k => k !== 'lastWindowKey' && k !== windowKey)
      .sort()
      .reverse();
    
    let patternTransition = null;
    if (previousWindowKeys.length > 0 && isNewWindow) {
      const prevWindowKey = previousWindowKeys[0];
      const prevWindowData = windowDataRef.current[prevWindowKey];
      
      if (prevWindowData?.detectedPattern && windowData.detectedPattern) {
        const prevPattern = prevWindowData.detectedPattern;
        const currPattern = windowData.detectedPattern;
        
        if (prevPattern.col2?.type !== currPattern.col2?.type || 
            prevPattern.col3?.type !== currPattern.col3?.type) {
          patternTransition = {
            previous: prevPattern,
            current: currPattern,
            changed: {
              col2: prevPattern.col2?.type !== currPattern.col2?.type,
              col3: prevPattern.col3?.type !== currPattern.col3?.type
            }
          };
        }
      }
    }
    
    // 🔥 NEW: Store last 3 rolls from previous window for cross-window analysis
    if (isNewWindow && previousWindowKey) {
      const prevWindowData = windowDataRef.current[previousWindowKey];
      if (prevWindowData && prevWindowData.rolls.length > 0) {
        // Get last 3 rolls from previous window
        const last3Rolls = prevWindowData.rolls.slice(-3);
        const last3Col2 = prevWindowData.col2States.slice(-3);
        const last3Col3 = prevWindowData.col3States.slice(-3);
        
        windowData.previousContext = {
          rolls: last3Rolls,
          col2States: last3Col2,
          col3States: last3Col3
        };
      }
    }
    
    // Clean up old windows (keep last 5)
    const allWindowKeys = Object.keys(windowDataRef.current)
      .filter(k => k !== 'lastWindowKey')
      .sort()
      .reverse();
      
    if (allWindowKeys.length > 5) {
      allWindowKeys.slice(5).forEach(k => {
        delete windowDataRef.current[k];
      });
    }
    
    return {
      currentWindowKey: windowKey,
      currentWindowRolls: windowData.rolls,
      currentWindowStates: {
        col2: windowData.col2States,
        col3: windowData.col3States
      },
      previousContext: windowData.previousContext || null, // NEW: Previous window context
      windowData: windowDataRef.current,
      isNewWindow,
      rollCount: windowData.rolls.length,
      patternTransition // NEW: Pattern transition info
    };
  }, [rollEvents, windowInfo]);
  
  return windowAnalysis;
}
