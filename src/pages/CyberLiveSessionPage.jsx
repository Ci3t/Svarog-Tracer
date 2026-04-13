// Cyberpunk Live Session Page - Built on Modern UI logic
import React, { useEffect, useRef } from 'react';
import ModernPairPredictorCard from '../components/modern/ModernPairPredictorCard';
import ModernAccuracyCard from '../components/modern/ModernAccuracyCard';
import ModernFrequencyCard from '../components/modern/ModernFrequencyCard';
import ModernStickyHeader from '../components/modern/ModernStickyHeader';
import ModernSessionTable from '../components/modern/ModernSessionTable';
import ModernCaesarCard from '../components/modern/ModernCaesarCard';
import ModernDefaultOrderCard from '../components/modern/ModernDefaultOrderCard';
import ModernStatsPanel from '../components/modern/ModernStatsPanel';
import ModernNotesCard from '../components/modern/ModernNotesCard';
import ModernRelicPositionCard from '../components/modern/ModernRelicPositionCard';
import ModernDebugPanel from '../components/modern/ModernDebugPanel';
import LiveTrackingTable3str from '../components/LiveTrackingTable3str';
import { useLiveModeCurrency } from '../hooks/useLiveModeCurrency';

// 🔥 Import Global Cyberpunk Theme CSS
import '../styles/cyberpunk-theme.css';

export default function CyberLiveSessionPage({
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
  timerRunning,
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
  handleImportRolls,
  
  // Refs
  pendingKiyoSnapshotsRef,
  
  // Other
  isDebugMode,
  kiyoDebugData,
  isAutoImporting,
}) {
  const autoStartRef = useRef(false);
  useLiveModeCurrency(entries);

  useEffect(() => {
    if (autoStartRef.current) return;
    autoStartRef.current = true;
    if (!timerRunning) {
      handleStartSession();
    }
  }, [handleStartSession, timerRunning]);
  
  // Optional: Could add subtle GSAP glitches here later if needed

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* 📺 SCANLINE OVERLAY handled in CSS via body::before or theme class::before */}

      {/* STICKY HEADER - Timer + Progress + Roll Input */}
      {/* We apply cyberpunk overrides explicitly within the CSS file so we can reuse the component logic */}
      <ModernStickyHeader
        secondsLeft={secondsLeft}
        onStart={handleStartSession}
        onStop={handleStopSession}
        onRestart={handleRestartSession}
        timerRunning={timerRunning}
        canResume={secondsLeft < 300 || entries.length > 0}
        rollInput={rollInput}
        setRollInput={setRollInput}
        onAddRoll={handleAddRoll}
        entriesCount={entries.length}
      />

      <div className="max-w-[1920px] mx-auto p-2 sm:p-3 lg:p-4 mt-2 sm:mt-4 lg:mt-6">
        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* LEFT COLUMN - Prediction, Caesar, Modes */}
          <div className="lg:col-span-3 space-y-4">
            {/* Pair Predictor */}
            <ModernPairPredictorCard entries={entries} />

            {/* Caesar Shift */}
            <ModernCaesarCard
              caesarInput={caesarInput}
              setCaesarInput={setCaesarInput}
            />

            {/* Default Order / Modes Info */}
            <ModernDefaultOrderCard />
          </div>

          {/* CENTER COLUMN - Session Table, BBP/MARK Mode, Notes */}
          <div className="lg:col-span-6 space-y-4">
            {/* Session Table */}
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

            {/* 3-str tracking */}
            {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
              <div className="tech-card p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">
                  🦁 BBP Mode Live Tracking (3-str)
                </h3>
                <LiveTrackingTable3str 
                  rolls={entries
                    .filter(e => (e.translated || '').length >= 3)
                    .map((entry, index) => ({
                      value: (entry.translated || '').slice(0, 3),
                      timestamp: entry.time ? new Date(entry.time).getTime() : Date.now() - (entries.length - index) * 1000,
                    })).reverse()}
                />
              </div>
            )}

            {/* Notes Card */}
            <ModernNotesCard
              notes={notes}
              setNotes={setNotes}
              region={region}
              patch={patch}
              entries={entries}
            />

            {/* Debug Panel */}
            <ModernDebugPanel
              debugLogs={debugLogs}
              entries={entries} 
              onClearLogs={handleClearDebugLogs}
              onImportLogs={handleImportDebugLogs}
              isDebugMode={isDebugMode}
              livePrediction={livePrediction}
              livePrediction3={livePrediction3}
            />
          </div>

          {/* RIGHT COLUMN - Accuracy, Frequency, Stats */}
          <div className="lg:col-span-3 space-y-4">
            {/* Accuracy Gauge */}
            <div className="overflow-visible">
              <ModernAccuracyCard debugLogs={debugLogs} />
            </div>

            {/* Frequency Bars */}
            <ModernFrequencyCard 
              freq2={freq2}
              freq3={freq3}
              freq4={freq4}
              freq5={freq5}
              freqTab={freqTab}
              setFreqTab={setFreqTab}
            />

            {/* Stats + Line Helper */}
            <ModernStatsPanel
              entries={entries}
              prediction2={livePrediction}
              prediction3={livePrediction3}
              prediction4={livePrediction4}
              currentRegion={region}
              currentPatch={patch}
            />

            {/* Relic Position Card */}
            <ModernRelicPositionCard />
          </div>

        </div>
      </div>
    </div>
  );
}
