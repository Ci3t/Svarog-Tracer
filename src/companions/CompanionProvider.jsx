import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const CompanionContext = createContext(null);

export const COMPANION_TYPES = {
  CLARA: 'clara',
  SPARKLE: 'sparkle',
};

export function CompanionProvider({ children }) {
  // Force Sparkle for testing — remove the localStorage override once confirmed working
  const [activeCompanion, setActiveCompanion] = useState(COMPANION_TYPES.SPARKLE);
  const [isTalking, setIsTalking] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const talkTimerRef = useRef(null);
  const audioRef = useRef(null);

  const speak = useCallback((line) => {
    if (!line) return;

    // Clear any running timer
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);

    setCurrentLine(line);
    setIsTalking(true);

    // If there's an audio key, play it
    if (line.audioKey) {
      const src = `/companions/${activeCompanion}/audio/${line.audioKey}.mp3`;
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
      } else {
        audioRef.current.src = src;
      }
      audioRef.current.play().catch(() => {});
      audioRef.current.onended = () => setIsTalking(false);
    } else {
      // No audio: estimate talk duration from text length (~80ms per char, min 2s, max 6s)
      const duration = Math.min(Math.max(line.text.length * 65, 2000), 6000);
      talkTimerRef.current = setTimeout(() => setIsTalking(false), duration);
    }
  }, [activeCompanion]);

  const dismiss = useCallback(() => {
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
    setCurrentLine(null);
    setIsTalking(false);
  }, []);

  const selectCompanion = useCallback((type) => {
    setActiveCompanion(type);
    localStorage.setItem('companion_choice', type);
    dismiss();
  }, [dismiss]);

  return (
    <CompanionContext.Provider value={{
      activeCompanion,
      selectCompanion,
      isTalking,
      currentLine,
      isVisible,
      setIsVisible,
      speak,
      dismiss,
    }}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanion must be used inside <CompanionProvider>');
  return ctx;
}
