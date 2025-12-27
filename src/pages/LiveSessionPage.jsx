// Live Session Page - Main prediction and tracking
import React from 'react';
import LeftColumn from '../components/LeftColumn';
import SessionTable from '../components/SessionTable';
import NotesCard from '../components/NotesCard';
import DebugPanel from '../components/DebugPanel';
import AccuracyPanel from '../components/AccuracyPanel';
import FrequencyPanel from '../components/FrequencyPanel';
import StatsPanel from '../components/StatsPanel';
import RelicPositionCard from '../components/RelicPositionCard';
import LiveTrackingTable from '../components/LiveTrackingTable';
import LiveTrackingTable3str from '../components/LiveTrackingTable3str';
import Footer from '../components/Footer';
import { sanitizeRollInput } from '../utils/stringHelpers';

export default function LiveSessionPage({
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
  handleDeleteEntry,
  handleDeleteSession,
  handleClearDebugLogs,
  handleImportDebugLogs,
  
  // Refs
  pendingKiyoSnapshotsRef,
  
  // Other
  isDebugMode,
  kiyoDebugData,
}) {
  return (
    <div className="min-h-screen text-slate-100">

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 xl:grid xl:grid-cols-12 xl:gap-6">
        {/* Left Column */}
        <LeftColumn
          secondsLeft={secondsLeft}
          onStart={handleStartSession}
          suggestTab={suggestTab}
          setSuggestTab={setSuggestTab}
          caesarInput={caesarInput}
          setCaesarInput={setCaesarInput}
          entries={entries}
          disableNextPrediction={false}
        />

        {/* Middle Column */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {/* Live Input Card */}
          <div 
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl"
            style={{
              position: 'sticky',
              top: '0',
              zIndex: 1000,
              backdropFilter: 'blur(10px)',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)'
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Live roll input
              </h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 cursor-default whitespace-nowrap">
                {entries.length} rolls
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={rollInput}
                onChange={(e) => setRollInput(sanitizeRollInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleAddRoll()}
                placeholder="Enter roll: 42, 234, 3441..."
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <button
                onClick={handleAddRoll}
                className="w-full sm:w-auto px-6 cursor-pointer py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
              >
                Add
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Input only digits 1–4. We auto-split and pad to 5 digits for 2/3/4/5 string views.
            </p>
          </div>

          <SessionTable
            sessionTab={sessionTab}
            setSessionTab={setSessionTab}
            entries={entries}
            prevSessions={prevSessions}
            onDeleteEntry={handleDeleteEntry}
            onDeleteSession={handleDeleteSession}
          />

          {/* BBP Mode Live Tracking Table */}
          {sessionTab === 'current' && entries.length >= 6 && (() => {
            const sortedEntries = [...entries].sort((a, b) => new Date(a.time) - new Date(b.time));
            return (
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl">
                <LiveTrackingTable rolls={sortedEntries.map(e => e.translated)} />
              </div>
            );
          })()}

          {/* BBP Mode 3-str Live Tracking Table */}
          {entries.length > 0 && entries.some(e => (e.translated || '').length >= 3) && (
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl mt-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
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

          <NotesCard
            notes={notes}
            setNotes={setNotes}
            region={region}
            patch={patch}
            entries={entries}
          />

          <DebugPanel
            debugLogs={debugLogs}
            onClearLogs={handleClearDebugLogs}
            isDebugMode={isDebugMode}
            onImportLogs={handleImportDebugLogs}
            kiyoWaveData={kiyoDebugData}
            pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
          />
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <AccuracyPanel debugLogs={debugLogs} />
          <FrequencyPanel
            freqTab={freqTab}
            setFreqTab={setFreqTab}
            freq2={freq2}
            freq3={freq3}
            freq4={freq4}
            freq5={freq5}
          />
          <StatsPanel
            entries={entries}
            prediction2={livePrediction}
            prediction3={livePrediction3}
            prediction4={livePrediction4}
            currentRegion={region}
            currentPatch={patch}
          />
          <RelicPositionCard />
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-6">
        <Footer />
      </div>
    </div>
  );
}
