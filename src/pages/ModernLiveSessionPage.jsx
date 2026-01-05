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

            {/* Next Prediction */}
            <ModernPredictionCard prediction={livePrediction} />

            {/* Experimental Pair Predictor */}
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

            {/* 🔬 Test Predictor Card - Experimental Features */}
            {sessionTab === 'current' && entries.length >= 6 && (
              <TestPredictorCard entries={entries} />
            )}

            {/* 3-str tracking */}
            {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
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
              entries={entries} // 🔥 NEW
              onClearLogs={handleClearDebugLogs}
              onImportLogs={handleImportDebugLogs}
              isDebugMode={isDebugMode}
              livePrediction={livePrediction}
              livePrediction3={livePrediction3}
            />
          </div>

          {/* RIGHT COLUMN - Accuracy, Frequency (compact), Stats */}
          <div className="lg:col-span-3 space-y-4">
            {/* Accuracy Gauge - Now compact */}
            <div className="overflow-visible">
              <ModernAccuracyCard debugLogs={debugLogs} />
            </div>

            {/* Frequency Bars - More compact */}
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
