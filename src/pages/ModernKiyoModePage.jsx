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
    <div className="modern-kiyo-page">
      {/* The KiyoModeCard will be reorganized via CSS */}
      <div className="modern-kiyo-container">
        <KiyoModeCard
          key={`kiyo-${entries.length}`}
          entries={entries}
          onSendToDebug={handleKiyoToDebug}
          debugLogs={debugLogs}
          onSendKiyoDebugData={handleKiyoDebugData}
          pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
        />
      </div>

      {/* Debug Panel */}
      <div className="mt-6 px-4">
        <ModernDebugPanel
          debugLogs={debugLogs}
          onClearLogs={onClearLogs}
          onImportLogs={onImportLogs}
          isDebugMode={isDebugMode}
        />
      </div>
    </div>
  );
}
