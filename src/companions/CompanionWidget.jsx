import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useCompanion, COMPANION_TYPES } from './CompanionProvider';
import SparkleRenderer from './SparkleRenderer';
import SpeechBubble from './SpeechBubble';

// ── Idle lines that auto-cycle ─────────────────────────────────────
const IDLE_LINES = [
  { text: "Take your time. I'll be right here whenever you're ready." },
  { text: "Tip: Focus on the last 2–3 symbols before making your call." },
  { text: "Strong patterns repeat. Trust the data, Trailblazer." },
];

// How long each line stays visible before cycling to the next (ms)
const LINE_DISPLAY_MS = 7000;
// Gap between lines (bubble hidden briefly)
const LINE_GAP_MS = 2000;

/**
 * CompanionWidget — floating companion with drag-and-drop support.
 * Position via the `position` prop: 'bottom-right' | 'bottom-left' | 'inline'
 */
export default function CompanionWidget({ position = 'bottom-right' }) {
  const { activeCompanion, isTalking, isVisible, speak, dismiss } = useCompanion();

  /* ── Drag state ─────────────────────────────────────────────── */
  const widgetRef    = useRef(null);
  const dragState    = useRef({ dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  /* ── Auto-cycling idle lines ────────────────────────────────── */
  const lineIdxRef   = useRef(0);
  const cycleTimerRef = useRef(null);

  const showNextLine = useCallback(() => {
    const line = IDLE_LINES[lineIdxRef.current % IDLE_LINES.length];
    speak(line);
    lineIdxRef.current++;

    // Schedule next line: display time + gap
    cycleTimerRef.current = setTimeout(() => {
      dismiss();
      cycleTimerRef.current = setTimeout(showNextLine, LINE_GAP_MS);
    }, LINE_DISPLAY_MS);
  }, [speak, dismiss]);

  useEffect(() => {
    if (!isVisible) return;
    // Start first line after a short intro delay
    cycleTimerRef.current = setTimeout(showNextLine, 2500);
    return () => clearTimeout(cycleTimerRef.current);
  }, [isVisible, showNextLine]);

  /* ── Drag handlers ──────────────────────────────────────────── */
  const onPointerDown = useCallback((e) => {
    // Only drag on left-click on the stage / handle area
    if (e.button !== 0) return;
    e.preventDefault();

    const el = widgetRef.current;
    if (!el) return;

    dragState.current = {
      dragging: true,
      startX:   e.clientX,
      startY:   e.clientY,
      origX:    dragOffset.x,
      origY:    dragOffset.y,
    };
    setIsDragging(true);

    const onMove = (me) => {
      if (!dragState.current.dragging) return;
      const dx = me.clientX - dragState.current.startX;
      const dy = me.clientY - dragState.current.startY;
      setDragOffset({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
    };

    const onUp = () => {
      dragState.current.dragging = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [dragOffset]);

  if (!isVisible) return null;

  /* ── Position class ─────────────────────────────────────────── */
  const positionClass = {
    'bottom-right': 'companion-widget--br',
    'bottom-left':  'companion-widget--bl',
    'inline':       'companion-widget--inline',
  }[position] || 'companion-widget--br';

  const dragStyle = {
    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    cursor:    isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'transform 0.1s ease',
  };

  return (
    <div
      ref={widgetRef}
      className={`companion-widget ${positionClass}`}
      style={dragStyle}
    >
      {/* Speech bubble above character */}
      <SpeechBubble className="companion-widget__bubble" />

      {/* Drag handle — covers the stage area */}
      <div
        className="companion-widget__stage"
        onPointerDown={onPointerDown}
      >
        {activeCompanion === COMPANION_TYPES.SPARKLE && (
          <SparkleRenderer isTalking={isTalking} debug={true} />
        )}
        {activeCompanion === COMPANION_TYPES.CLARA && (
          <div className="companion-widget__clara-placeholder">
            <img
              src={isTalking ? '/clara-prof-OandMouth.gif' : '/clara-prof-assistant.png'}
              alt="Clara"
              className="companion-widget__clara-img"
            />
          </div>
        )}
      </div>
    </div>
  );
}
