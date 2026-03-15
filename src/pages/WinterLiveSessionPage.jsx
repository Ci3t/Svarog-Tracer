// Winter Live Session Page - Clara Edition ❄️
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
import SnowEffect from '../components/SnowEffect';
import '../styles/winter-theme.css';

export default function WinterLiveSessionPage({
  // State from App.jsx
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
  handleImportRolls,
  
  // Refs
  pendingKiyoSnapshotsRef,
  
  // Other
  isDebugMode,
  kiyoDebugData,
  isAutoImporting,
}) {
  return (
    <div className="winter-theme relative overflow-x-hidden">
      <SnowEffect density={40} speed={0.6} />
      
      <div className="relative z-10">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-3 space-y-4">
              <ModernPairPredictorCard entries={entries} />
              <ModernCaesarCard
                caesarInput={caesarInput}
                setCaesarInput={setCaesarInput}
              />
              <ModernDefaultOrderCard />
            </div>

            {/* CENTER COLUMN */}
            <div className="lg:col-span-6 space-y-4">
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

              {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
                <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
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

              <ModernNotesCard
                notes={notes}
                setNotes={setNotes}
                region={region}
                patch={patch}
                entries={entries}
              />

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

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-3 space-y-4">
              <div className="overflow-visible">
                <ModernAccuracyCard debugLogs={debugLogs} />
              </div>

              <ModernFrequencyCard 
                freq2={freq2}
                freq3={freq3}
                freq4={freq4}
                freq5={freq5}
                freqTab={freqTab}
                setFreqTab={setFreqTab}
              />

              <ModernStatsPanel
                entries={entries}
                prediction2={livePrediction}
                prediction3={livePrediction3}
                prediction4={livePrediction4}
                currentRegion={region}
                currentPatch={patch}
              />

              <ModernRelicPositionCard />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
