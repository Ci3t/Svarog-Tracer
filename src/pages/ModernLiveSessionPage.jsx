// Modern Live Session Page - Complete Modern UI
import React from 'react';
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
              <ModernPairPredictorCard entries={entries} region={region} />
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
    </div>
  );
}
