// Modern Kiyo Mode Page - 2-Column Layout
import React from 'react';
import KiyoModeCard from '../components/KiyoModeCard';
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
    </div>
  );
}
