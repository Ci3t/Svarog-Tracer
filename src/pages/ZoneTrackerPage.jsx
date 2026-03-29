import React from 'react';
import ZoneHeader from '../components/zone/ZoneHeader';
import ZoneLogger from '../components/zone/ZoneLogger';
import ZoneMap from '../components/zone/ZoneMap';
import ZoneBuildTeam from '../components/zone/ZoneBuildTeam';
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
    zoneFontScale,
    setZoneFontScale,
    setRequestedEpoch,
    workspaceView,
    setWorkspaceView,
    
    // Logger Props
    formRef,
    handleSubmit,
    slots,
    setSlots,
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
    ownedOptions,
    ownedSet,
    ownedSearchTerm,
    setOwnedSearchTerm,
    ownedLoading,
    ownedSaving,
    ownedImporting,
    rosterMode,
    setRosterMode,
    loadOwnedRoster,
    saveOwnedRoster,
    importOwnedRosterFile,
    toggleOwnedCharacter,
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
    setError,
    success,
    setSuccess,
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
    variantMinOwned,
    setVariantMinOwned,
    variantEnforceSum,
    setVariantEnforceSum,
    handleAdminWipeEpoch,
    adminWipeLoading,
    handleAdminWipeAll,
    showAdminWipeAllModal,
    setShowAdminWipeAllModal,
    adminWipeAllConfirmText,
    setAdminWipeAllConfirmText,
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
    zoneLikeLoadingKey,
    manualVariantPayload,
    zones,
    signalMetricLabel,
    handleReportZoneCard,
    handleAdminDeleteZone,
    handleAdminEditZone,
    adminActionLoadingKey,
    adminEditModalZone,
    adminEditDraft,
    variantsByZone,
    handleExportZoneToCaverns,
    handleZoneLikeToggle,
    handleAdminEditDraftChange,
    handleAdminEditSlotOrderChange,
    handleAdminEditCancel,
    handleAdminEditSubmit,

    // Build Team
    buildSlots,
    setBuildSlots,
    buildTeamSignature,
    buildVariantPayload,
    setBuildVariantPayload,
    buildVariantLoading,
    setBuildVariantLoading,
    setVariantsByZone,
    getAuthHeader,
    
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
            user, formRef, handleSubmit, slots, activeSlotIndex, setActiveSlotIndex,
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
            setAdminModeEnabled, handleExportDebugLogs, exportingDebug, handleAdminWipeAll, adminWipeLoading,
            showAdminWipeAllModal, setShowAdminWipeAllModal, adminWipeAllConfirmText, setAdminWipeAllConfirmText,
            ownedOptions, ownedSet, ownedSearchTerm, setOwnedSearchTerm,
            toggleOwnedCharacter, saveOwnedRoster, loadOwnedRoster, importOwnedRosterFile,
            ownedLoading, ownedSaving, ownedImporting, rosterMode, setRosterMode,
            workspaceView
          }}
        />

        <ZoneMap
          {...{
            mapRef, workspaceView, loadingMap, zoneCardView, setZoneCardView, showMapFilters,
            setShowMapFilters, mapData, zoneFontScale, setZoneFontScale, isRelicTargetMode, mapTargetFilter,
            mapRegion, setMapRegion, mapTargetPreset, setMapTargetPreset,
            mapTargetMode, setMapTargetMode, toggleMapTargetCustomStat,
            mapTargetCustomStats, variantOwnershipFilter, setVariantOwnershipFilter,
            variantMinOwned, setVariantMinOwned,
            variantEnforceSum, setVariantEnforceSum, adminEligible,
            adminStatusLoading, adminModeEnabled, setAdminModeEnabled,
            handleAdminWipeEpoch, adminWipeLoading, handleAdminWipeAll,
            showAdminWipeAllModal, setShowAdminWipeAllModal, adminWipeAllConfirmText, setAdminWipeAllConfirmText,
            showTuner, setShowTuner, tunerRef, tuneXorInput, setTuneXorInput,
            tuneSlotInput, setTuneSlotInput, tuneSumInput, setTuneSumInput,
            currentTeamSignature, handleFindTunedZones, handleGenerateManualVariants,
            manualVariantLoading, tunedZones, handleTuneFromZone, handleLoadZoneTeam,
            fetchVariantsForZone, variantLoadingZoneKey, manualVariantPayload,
            zoneLikeLoadingKey,
            zones, signalMetricLabel, requestedEpoch, handleReportZoneCard,
            handleZoneLikeToggle,
            handleAdminDeleteZone, handleAdminEditZone, adminActionLoadingKey,
            adminEditModalZone, adminEditDraft, handleAdminEditDraftChange,
            handleAdminEditSlotOrderChange, handleAdminEditCancel, handleAdminEditSubmit, variantsByZone, setVariantsByZone, handleExportZoneToCaverns, charactersByNumId,
            setSlots, setSuccess
          }}
        />

        <ZoneBuildTeam
          workspaceView={workspaceView}
          setWorkspaceView={setWorkspaceView}
          formRef={formRef}
          buildSlots={buildSlots}
          setBuildSlots={setBuildSlots}
          buildTeamSignature={buildTeamSignature}
          buildVariantPayload={buildVariantPayload}
          setBuildVariantPayload={setBuildVariantPayload}
          buildVariantLoading={buildVariantLoading}
          setBuildVariantLoading={setBuildVariantLoading}
          charactersByNumId={charactersByNumId}
          characterOptions={characterOptions}
          ownedSet={ownedSet}
          variantOwnershipFilter={variantOwnershipFilter}
          setVariantOwnershipFilter={setVariantOwnershipFilter}
          variantMinOwned={variantMinOwned}
          setVariantMinOwned={setVariantMinOwned}
          setSlots={setSlots}
          setError={setError}
          setSuccess={setSuccess}
          getAuthHeader={getAuthHeader}
        />
      </div>
    </div>
  );
}
