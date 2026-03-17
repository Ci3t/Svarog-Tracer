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
  isDebugMode,
  sessionTheme,
}) {
  return (
    <div className="modern-kiyo-page w-full p-2 sm:p-3 lg:p-4 mt-2 sm:mt-4 lg:mt-6">
      {/* MAIN ENGINE: Kiyo Mode (Full Width) */}
      <div className="modern-kiyo-shell overflow-visible mb-6">
        <KiyoModeCard
          key={`kiyo-${entries.length}`}
          entries={entries}
          onSendToDebug={handleKiyoToDebug}
          debugLogs={debugLogs}
          onSendKiyoDebugData={handleKiyoDebugData}
          pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
        />
      </div>

      {/* BOTTOM SECTION: Debug (Full Width) */}
      <div className="modern-kiyo-shell">
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
