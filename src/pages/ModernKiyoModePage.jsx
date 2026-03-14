// Modern Kiyo Mode Page - 2-Column Layout
import React from 'react';
import KiyoModeCard from '../components/KiyoModeCard';
import ModernDebugPanel from '../components/modern/ModernDebugPanel';
import './ModernKiyoModePage.css';

export default function ModernKiyoModePage({
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
  handleKiyoToDebug,
  handleKiyoDebugData,
  pendingKiyoSnapshotsRef,
  onClearLogs,
  onImportLogs,
  isDebugMode = false,
}) {
  return (
    <div className="max-w-[1920px] mx-auto p-2 sm:p-3 lg:p-4 mt-2 sm:mt-4 lg:mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        
        {/* LEFT COLUMN: Main Engine / Kiyo Mode */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glacial-card overflow-visible">
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

        {/* RIGHT COLUMN: Debugging / Supplemental Info */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glacial-card">
            <ModernDebugPanel
              debugLogs={debugLogs}
              onClear={onClearLogs}
              onImport={onImportLogs}
              isDebugMode={isDebugMode}
            />
          </div>
          
          <div className="glacial-card p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">LAB NOTES</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Use Kiyo Mode to analyze longer sequences and monitor organic wave patterns. The engine is tuned for high-precision observation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
