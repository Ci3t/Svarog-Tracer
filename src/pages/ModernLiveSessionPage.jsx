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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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

      <div className="max-w-[1920px] mx-auto p-2 sm:p-3 lg:p-4">
        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* LEFT COLUMN - Prediction, Caesar, Modes */}
          <div className="lg:col-span-3 space-y-4">

            {/* OLD Main Prediction - COMMENTED OUT, replaced by experimental
            <ModernPredictionCard prediction={livePrediction} />
            */}

            {/* 🧪 Experimental Pair Predictor - NOW THE MAIN PREDICTOR */}
            <div className="glacial-card">
              <ModernPairPredictorCard entries={entries} />
            </div>

            {/* Caesar Shift */}
            <div className="glacial-card">
              <ModernCaesarCard
                caesarInput={caesarInput}
                setCaesarInput={setCaesarInput}
              />
            </div>

            {/* Default Order / Modes Info */}
            <div className="glacial-card">
              <ModernDefaultOrderCard />
            </div>
          </div>

          {/* CENTER COLUMN - Session Table, BBP/MARK Mode, Notes */}
          <div className="lg:col-span-6 space-y-4">
            {/* Session Table */}
            <div className="glacial-card">
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

            {/* Live Tracking Tables - COMMENTED OUT, replaced with PatternAnalysisTable */}
            {/* sessionTab === 'current' && entries.length >= 6 && (() => {
              const sortedEntries = [...entries].sort((a, b) => new Date(a.time) - new Date(b.time));
              return (
                <ModernLiveTrackingTable rolls={sortedEntries.map(e => e.translated)} />
              );
            })() */}

            {/* Pattern Analysis Table - COMMENTED OUT for now
            {sessionTab === 'current' && entries.length >= 6 && (() => {
              const sortedEntries = [...entries].sort((a, b) => new Date(a.time) - new Date(b.time));
              return (
                <PatternAnalysisTable entries={sortedEntries} />
              );
            })()} */}

            {/* 🔬 Test Predictor Card - COMMENTED OUT after testing
            {sessionTab === 'current' && entries.length >= 6 && (
              <TestPredictorCard entries={entries} />
            )} */}

            {/* 3-str tracking */}
            {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
              <div className="glacial-card">
                {/* Predicted Mode (3-str) */}
                <LiveTrackingTable3str entries={entries} />
              </div>
            )}

            {/* Notes Card */}
            <div className="glacial-card">
              <ModernNotesCard
                notes={notes}
                setNotes={setNotes}
              />
            </div>
            {/* Debug Panel */}
            <div className="glacial-card">
              <ModernDebugPanel
                debugLogs={debugLogs}
                onClear={handleClearDebugLogs}
                onImport={handleImportDebugLogs}
                isDebugMode={isDebugMode}
              />
            </div>
          </div>

          {/* RIGHT COLUMN - Accuracy, Frequency (compact), Stats */}
          <div className="lg:col-span-3 space-y-4">
            {/* Accuracy Gauge - Now wrapped for Glacial look */}
            <div className="glacial-card">
              <ModernAccuracyCard debugLogs={debugLogs} />
            </div>

            {/* Frequency Bars - More compact */}
            <div className="glacial-card">
              <ModernFrequencyCard 
                freq2={freq2} 
                freq3={freq3} 
                freq4={freq4} 
                freq5={freq5} 
                activeTab={freqTab} 
                onTabChange={setFreqTab} 
              />
            </div>

            {/* Stats + Line Helper */}
            <div className="glacial-card">
              <ModernStatsPanel
                entries={entries}
                handleAddRoll={handleAddRoll}
              />
            </div>

            {/* Relic Position Card */}
            <div className="glacial-card">
              <ModernRelicPositionCard />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
