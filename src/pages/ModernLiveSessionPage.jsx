// Modern Live Session Page - Complete Modern UI
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModernPredictionCard from '../components/modern/ModernPredictionCard';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernAccuracyCard from '../components/modern/ModernAccuracyCard';
import ModernFrequencyCard from '../components/modern/ModernFrequencyCard';
import ModernStickyHeader from '../components/modern/ModernStickyHeader';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import ModernLiveTrackingTable from '../components/modern/ModernLiveTrackingTable';
import PatternAnalysisTable from '../components/modern/PatternAnalysisTable';
import TestPredictorCard from '../components/modern/TestPredictorCard';
import ModernCaesarCard from '../components/modern/ModernCaesarCard';
import ModernDefaultOrderCard from '../components/modern/ModernDefaultOrderCard';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import ModernNotesCard from '../components/modern/ModernNotesCard';
import ModernRelicPositionCard from '../components/modern/ModernRelicPositionCard';
import ModernDebugPanel from '../components/modern/ModernDebugPanel';
import LiveTrackingTable3str from '../components/LiveTrackingTable3str';
import { withBaseUrl } from '../utils/assetPaths';
import { useAuth } from '../hooks/useAuth';
import { resolvePlaygroundClaraAsset } from '../utils/claraCosmetics';
import { useLiveModeCurrency } from '../hooks/useLiveModeCurrency';

const LIVE_CLARA_ASSIST_KEY = 'live_clara_assist_v1';
const LIVE_CLARA_POSITION_KEY = 'live_clara_assist_position_v1';

function resolveLiveClaraLanguage() {
  if (typeof window === 'undefined') return 'en';
  const candidates = [
    window.localStorage.getItem('voice_language'),
    window.localStorage.getItem('voiceLanguage'),
    window.localStorage.getItem('app_language'),
    window.localStorage.getItem('language'),
    window.localStorage.getItem('locale'),
    navigator.language,
  ].filter(Boolean);
  const joined = candidates.join(' ').toLowerCase();
  return joined.includes('jp') || joined.includes('ja') ? 'jp' : 'en';
}

export default function ModernLiveSessionPage({
  // State
  entries,
  prevSessions,
  rollInput,
  setRollInput,
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  debugLogs,
  secondsLeft,
  freqTab,
  setFreqTab,
  sessionTab,
  setSessionTab,
  suggestTab,
  setSuggestTab,
  caesarInput,
  setCaesarInput,
  notes,
  setNotes,

  // Computed
  freq2,
  freq3,
  freq4,
  freq5,
  livePrediction,
  livePrediction3,
  livePrediction4,

  // Handlers
  handleAddRoll,
  handleStartSession,
  handleStopSession,
  handleRestartSession,
  handleDeleteEntry,
  handleDeleteSession,
  handleClearDebugLogs,
  handleImportDebugLogs,
  handleImportRolls, // NEW: Import rolls from file

  // Refs
  pendingKiyoSnapshotsRef,

  // Other
  isDebugMode,
  kiyoDebugData,
  isAutoImporting, // NEW
}) {
  const { user } = useAuth();
  const [trustGuideText, setTrustGuideText] = useState(null);
  const [claraAssistEnabled, setClaraAssistEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(LIVE_CLARA_ASSIST_KEY);
    return saved == null ? true : saved === '1';
  });
  const [claraSpeaking, setClaraSpeaking] = useState(false);
  const [claraPosition, setClaraPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const raw = window.localStorage.getItem(LIVE_CLARA_POSITION_KEY);
      return raw ? JSON.parse(raw) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });
  const dragStateRef = useRef(null);
  const claraLanguage = useMemo(() => resolveLiveClaraLanguage(), []);
  useLiveModeCurrency(entries);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LIVE_CLARA_ASSIST_KEY, claraAssistEnabled ? '1' : '0');
    }
  }, [claraAssistEnabled]);

  useEffect(() => {
    if (!claraAssistEnabled || !trustGuideText) {
      setClaraSpeaking(false);
      return;
    }
    setClaraSpeaking(true);
    const timer = window.setTimeout(() => setClaraSpeaking(false), 1800);
    return () => window.clearTimeout(timer);
  }, [claraAssistEnabled, trustGuideText]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LIVE_CLARA_POSITION_KEY, JSON.stringify(claraPosition));
    }
  }, [claraPosition]);

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragStateRef.current) return;
      const point = 'touches' in event ? event.touches[0] : event;
      if (!point) return;
      setClaraPosition({
        x: point.clientX - dragStateRef.current.startX,
        y: point.clientY - dragStateRef.current.startY,
      });
    };

    const handleEnd = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const beginClaraDrag = (event) => {
    const point = 'touches' in event ? event.touches[0] : event;
    if (!point) return;
    event.preventDefault?.();
    dragStateRef.current = {
      startX: point.clientX - claraPosition.x,
      startY: point.clientY - claraPosition.y,
    };
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* STICKY HEADER - Timer + Progress + Roll Input */}
      <ModernStickyHeader
        secondsLeft={secondsLeft}
        onStart={handleStartSession}
        onStop={handleStopSession}
        onRestart={handleRestartSession}
        timerRunning={secondsLeft < 300}
        rollInput={rollInput}
        setRollInput={setRollInput}
        onAddRoll={handleAddRoll}
        entriesCount={entries.length}
      />

      <div className="max-w-[1920px] mx-auto p-2 sm:p-3 lg:p-4 mt-2 sm:mt-4 lg:mt-6">
        {/* Mobile: single flow with explicit order. Desktop: independent stacked columns. */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 lg:items-start">
          <div className="contents lg:block lg:col-span-3 lg:space-y-4">
            <div className="order-1 lg:order-none">
              <div>
                <div className="mb-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setClaraAssistEnabled((current) => !current)}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      claraAssistEnabled
                        ? 'border-cyan-400/30 bg-cyan-500/12 text-cyan-100'
                        : 'border-white/8 bg-white/[0.04] text-slate-400'
                    }`}
                  >
                    Clara Assist
                    <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                      {claraAssistEnabled ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                <ModernPairPredictorCard entries={entries} region={region} onTrustGuideChange={setTrustGuideText} />
              </div>
            </div>

            <div className="theme-glass-card order-3 lg:order-none">
              <ModernCaesarCard
                caesarInput={caesarInput}
                setCaesarInput={setCaesarInput}
              />
            </div>

            <div className="theme-glass-card order-4 lg:order-none">
              <ModernDefaultOrderCard />
            </div>
          </div>

          <div className="contents lg:block lg:col-span-6 lg:space-y-4">
            <div className="theme-glass-card order-2 lg:order-none">
              <ModernSessionTable
                sessionTab={sessionTab}
                setSessionTab={setSessionTab}
                entries={entries}
                prevSessions={prevSessions}
                onDeleteEntry={handleDeleteEntry}
                onDeleteSession={handleDeleteSession}
                onImportRolls={handleImportRolls}
                isAutoImporting={isAutoImporting}
              />
            </div>

            {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
              <div className="theme-glass-card order-8 lg:order-none">
                <LiveTrackingTable3str entries={entries} />
              </div>
            )}

            <div className="theme-glass-card order-9 lg:order-none">
              <ModernNotesCard
                notes={notes}
                setNotes={setNotes}
              />
            </div>

            <div className="theme-glass-card order-10 lg:order-none">
              <ModernDebugPanel
                debugLogs={debugLogs}
                entries={entries}
                onClearLogs={handleClearDebugLogs}
                onImportLogs={handleImportDebugLogs}
                isDebugMode={isDebugMode}
              />
            </div>
          </div>

          <div className="contents lg:block lg:col-span-3 lg:space-y-4">
            <div className="theme-glass-card order-5 lg:order-none">
              <ModernAccuracyCard debugLogs={debugLogs} />
            </div>

            <div className="theme-glass-card order-6 lg:order-none">
              <ModernFrequencyCard
                freq2={freq2}
                freq3={freq3}
                freq4={freq4}
                freq5={freq5}
                freqTab={freqTab}
                setFreqTab={setFreqTab}
              />
            </div>

            <div className="theme-glass-card order-7 lg:order-none">
              <ModernStatsPanel
                entries={entries}
                prediction2={livePrediction}
                prediction3={livePrediction3}
                prediction4={livePrediction4}
                currentRegion={region}
                currentPatch={patch}
              />
            </div>

            <div className="theme-glass-card order-11 lg:order-none">
              <ModernRelicPositionCard />
            </div>
          </div>
        </div>
      </div>

      {claraAssistEnabled ? (
        <div
          className="pointer-events-none fixed bottom-4 left-4 z-40 hidden xl:block"
          style={{ transform: `translate(${claraPosition.x}px, ${claraPosition.y}px)` }}
        >
          <div className="relative w-[320px]">
            {trustGuideText ? (
              <div className="pointer-events-none absolute bottom-[250px] left-[136px] z-20 max-w-[320px]">
                <div
                  className="relative rounded-[28px] border-[3px] px-5 py-4 text-center shadow-[0_14px_38px_rgba(0,0,0,0.28)]"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#1a1a1a',
                    opacity: 1,
                    filter: 'none',
                    mixBlendMode: 'normal',
                  }}
                >
                  <div
                    className="text-[14px] font-black leading-snug tracking-tight"
                    style={{
                      color: '#111111',
                      opacity: 1,
                      textShadow: 'none',
                      filter: 'none',
                      mixBlendMode: 'normal',
                    }}
                  >
                    {trustGuideText}
                  </div>
                  <div className="absolute -bottom-4 left-14 h-0 w-0 border-l-[16px] border-r-[10px] border-t-[22px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#1a1a1a' }}>
                    <div className="absolute left-[-13px] top-[-24px] h-0 w-0 border-l-[13px] border-r-[8px] border-t-[18px] border-l-transparent border-r-transparent border-t-white" />
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className="pointer-events-auto relative cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={beginClaraDrag}
              onMouseDown={beginClaraDrag}
              onTouchStart={beginClaraDrag}
            >
              <img
                src={resolvePlaygroundClaraAsset(user?.user_metadata || {}, { speaking: claraSpeaking })}
                alt="Clara Assist"
                className="h-auto w-[265px] object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.28)]"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.45) 92%, rgba(0,0,0,0) 100%)',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.45) 92%, rgba(0,0,0,0) 100%)',
                }}
                draggable="false"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
