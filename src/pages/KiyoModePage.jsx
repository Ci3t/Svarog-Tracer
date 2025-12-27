// Kiyo Mode Page - For 3-digit wave analysis
import React from 'react';
import KiyoModeCard from '../components/KiyoModeCard';
import Footer from '../components/Footer';

export default function KiyoModePage({
  // State
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  entries,
  prevSessions,
  debugLogs,
  kiyoDebugData,
  
  // Handlers
  handleKiyoToDebug,
  handleKiyoDebugData,
  
  // Refs
  pendingKiyoSnapshotsRef,
}) {
  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            🌊 Kiyo Mode (EU)
          </h1>
          <p className="text-slate-400">
            Wave Theory + Smart Prefix Prediction for 3-digit analysis
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
          <KiyoModeCard
            key={`kiyo-${entries.length}`}
            entries={entries}
            onSendToDebug={handleKiyoToDebug}
            debugLogs={debugLogs}
            onSendKiyoDebugData={handleKiyoDebugData}
            pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
          />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6">
        <Footer />
      </div>
    </div>
  );
}
