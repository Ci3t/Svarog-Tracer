import React from 'react';
import ZoneHeader from '../components/zone/ZoneHeader';
import ZoneLogger from '../components/zone/ZoneLogger';
import ZoneMap from '../components/zone/ZoneMap';
import { useZoneTracker } from '../hooks/useZoneTracker';
import './ZoneTrackerPage.css';

/**
 * ZoneTrackerPage
 * Orchestrator component that manages the state via useZoneTracker hook
 * and delegates UI rendering to ZoneLogger and ZoneMap.
 */
export default function ZoneTrackerPage({ sessionTheme = 'modern' }) {
  const {
    user,
    rootThemeClass,
    authDisplayName,
    currentEpoch,
    epoch,
    requestedEpoch,
    loadingMap,
    mapData,
    setRequestedEpoch,
    workspaceView,
    setWorkspaceView,
    
    // Logger Props
    formRef,
    handleSubmit,
    slots,
    activeSlotIndex,
    setActiveSlotIndex,
    handleTeamSlotDragStart,
    handleTeamSlotDragEnd,
    handleSlotDragOver,
    handleSlotDragLeave,
    handleSlotDrop,
    clearSlot,
    charactersByNumId,
    charSearchTerm,
    setCharSearchTerm,
    characterOptions,
    handleRosterCharacterClick,
    relicGridCompact,
    setRelicGridCompact,
    relicDropCount,
    setRelicDropCount,
    suggestedOutcome,
    relicCards,
    cycleRelicPiece,
    setRelicCardMainStat,
    toggleRelicCardSubstat,
    relicSubstatFrequency,
    cavern,
    setCavern,
    serverRegion,
    setServerRegion,
    clearTimeInput,
    setClearTimeInput,
    notes,
    setNotes,
    submitting,
    error,
    success,
    adminEligible,
    adminStatusLoading,
    adminModeEnabled,
    setAdminModeEnabled,
    handleExportDebugLogs,
    exportingDebug,
    
    // Map Props
    mapRef,
    zoneCardView,
    setZoneCardView,
    showMapFilters,
    setShowMapFilters,
    isRelicTargetMode,
    mapTargetFilter,
    mapRegion,
    setMapRegion,
    mapTargetPreset,
    setMapTargetPreset,
    mapTargetMode,
    setMapTargetMode,
    toggleMapTargetCustomStat,
    mapTargetCustomStats,
    variantOwnershipFilter,
    setVariantOwnershipFilter,
    variantEnforceSum,
    setVariantEnforceSum,
    handleAdminWipeEpoch,
    adminWipeLoading,
    handleAdminWipeAll,
    showTuner,
    setShowTuner,
    tunerRef,
    tuneXorInput,
    setTuneXorInput,
    tuneSlotInput,
    setTuneSlotInput,
    tuneSumInput,
    setTuneSumInput,
    currentTeamSignature,
    handleFindTunedZones,
    handleGenerateManualVariants,
    manualVariantLoading,
    tunedZones,
    handleTuneFromZone,
    handleLoadZoneTeam,
    fetchVariantsForZone,
    variantLoadingZoneKey,
    manualVariantPayload,
    zones,
    signalMetricLabel,
    handleReportZoneCard,
    handleAdminDeleteZone,
    handleAdminEditZone,
    adminActionLoadingKey,
    variantsByZone,
    handleExportZoneToCaverns,
    
    // Helpers
    sanitizeClearTimeMmSsInput,
    normalizeClearTimeMmSsInput
  } = useZoneTracker(sessionTheme);


  return (
    <div className={`${rootThemeClass} zone-tracker-shell max-w-[1440px] mx-auto space-y-8 pb-20 animate-in fade-in duration-700`}>
      <ZoneHeader
        authDisplayName={authDisplayName}
        userId={user?.id}
        currentEpoch={currentEpoch}
        epoch={epoch}
        requestedEpoch={requestedEpoch}
        loadingMap={loadingMap}
        mapData={mapData}
        onSetRequestedEpoch={setRequestedEpoch}
        workspaceView={workspaceView}
        setWorkspaceView={setWorkspaceView}
      />

      <div className="grid gap-8 grid-cols-1">
        <ZoneLogger
          {...{
            formRef, handleSubmit, slots, activeSlotIndex, setActiveSlotIndex,
            handleTeamSlotDragStart, handleTeamSlotDragEnd, handleSlotDragOver,
            handleSlotDragLeave, handleSlotDrop, clearSlot, charactersByNumId,
            charSearchTerm, setCharSearchTerm, characterOptions, handleRosterCharacterClick,
            relicGridCompact, setRelicGridCompact, relicDropCount, setRelicDropCount,
            suggestedOutcome, relicCards, cycleRelicPiece, setRelicCardMainStat,
            toggleRelicCardSubstat, relicSubstatFrequency, cavern, setCavern,
            serverRegion, setServerRegion,
            clearTimeInput, setClearTimeInput, sanitizeClearTimeMmSsInput,
            normalizeClearTimeMmSsInput, notes, setNotes, submitting, error,
            success, adminEligible, adminStatusLoading, adminModeEnabled,
            setAdminModeEnabled, handleExportDebugLogs, exportingDebug,
            workspaceView
          }}
        />

        <ZoneMap
          {...{
            mapRef, workspaceView, loadingMap, zoneCardView, setZoneCardView, showMapFilters,
            setShowMapFilters, mapData, isRelicTargetMode, mapTargetFilter,
            mapRegion, setMapRegion, mapTargetPreset, setMapTargetPreset,
            mapTargetMode, setMapTargetMode, toggleMapTargetCustomStat,
            mapTargetCustomStats, variantOwnershipFilter, setVariantOwnershipFilter,
            variantEnforceSum, setVariantEnforceSum, adminEligible,
            adminStatusLoading, adminModeEnabled, setAdminModeEnabled,
            handleAdminWipeEpoch, adminWipeLoading, handleAdminWipeAll,
            showTuner, setShowTuner, tunerRef, tuneXorInput, setTuneXorInput,
            tuneSlotInput, setTuneSlotInput, tuneSumInput, setTuneSumInput,
            currentTeamSignature, handleFindTunedZones, handleGenerateManualVariants,
            manualVariantLoading, tunedZones, handleTuneFromZone, handleLoadZoneTeam,
            fetchVariantsForZone, variantLoadingZoneKey, manualVariantPayload,
            zones, signalMetricLabel, requestedEpoch, handleReportZoneCard,
            handleAdminDeleteZone, handleAdminEditZone, adminActionLoadingKey,
            variantsByZone, handleExportZoneToCaverns
          }}
        />
      </div>
    </div>
  );
}
