import React, { useState, useEffect } from 'react';
import { useCompanion } from './CompanionProvider';

export default function SpeechBubble({ className }) {
  const { currentLine, dismiss, isTalking } = useCompanion();
  const [displayed, setDisplayed] = useState('');
  const [visible, setVisible] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!currentLine?.text) {
      setVisible(false);
      setDisplayed('');
      return;
    }

    setVisible(true);
    setDisplayed('');

    let i = 0;
    const text = currentLine.text;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 22); // typing speed ~22ms per char

    return () => clearInterval(interval);
  }, [currentLine]);

  if (!currentLine || !visible) return null;

  return (
    <div
      className={`companion-speech-bubble ${className || ''}`}
      role="status"
      aria-live="polite"
    >
      {/* Bubble body */}
      <div className="companion-bubble-body">
        <p className="companion-bubble-text">{displayed}</p>
        <button
          type="button"
          onClick={dismiss}
          className="companion-bubble-dismiss"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      {/* Arrow pointing down toward character */}
      <div className="companion-bubble-arrow" />
    </div>
  );
}
