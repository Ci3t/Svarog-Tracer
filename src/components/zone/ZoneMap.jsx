import React from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  History 
} from 'lucide-react';
import { 
  formatDropScore,
  SERVER_REGION_OPTIONS,
  MAP_TARGET_PRESET_OPTIONS,
  MAP_TARGET_CUSTOM_MAX_STATS,
  RELIC_SUBSTAT_OPTIONS,
  buildZoneVariantKey,
  formatRate
} from '../../hooks/useZoneTracker';

export default function ZoneMap({
  mapRef,
  workspaceView,
  loadingMap,
  zoneCardView,
  setZoneCardView,
  showMapFilters,
  setShowMapFilters,
  mapData,
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
  adminEligible,
  adminStatusLoading,
  adminModeEnabled,
  setAdminModeEnabled,
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
  requestedEpoch,
  handleReportZoneCard,
  handleAdminDeleteZone,
  handleAdminEditZone,
  adminActionLoadingKey,
  variantsByZone,
  handleExportZoneToCaverns
}) {
  return (
    <div ref={mapRef} className={workspaceView === 'zones' ? 'space-y-8' : 'hidden'}>
      <div className="flex flex-wrap items-end justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white text-shadow-glow">Community Map</h2>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => setZoneCardView('grid')}
              className={zoneCardView === 'grid' ? 'px-3 py-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setZoneCardView('list')}
              className={zoneCardView === 'list' ? 'px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMapFilters((prev) => !prev)}
            className={showMapFilters ? 'px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            {showMapFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          <div className="text-right">
            <p className="text-[10px] font-black tracking-widest text-slate-500 leading-none">Global Coverage</p>
            <p className="text-lg font-black text-indigo-300">{mapData?.total_runs ?? 0} <span className="text-[10px] text-slate-600">REPORTS</span></p>
            <p className="text-[9px] font-black tracking-widest text-slate-500">{isRelicTargetMode ? `TARGET ${String(mapTargetFilter?.label || 'Custom').toUpperCase()}` : `AVG DROP ${formatDropScore(mapData?.epoch_summary?.avg_drop_score)}`}</p>
          </div>
        </div>
      </div>

      <div className={showMapFilters ? 'mx-2 mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 space-y-3 shadow-xl' : 'hidden'}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Filter</p>
        <div className="flex flex-wrap items-center gap-2">
          {SERVER_REGION_OPTIONS.map((region) => (
            <button
              key={`region-${region.value}`}
              type="button"
              onClick={() => setMapRegion(region.value)}
              className={mapRegion === region.value ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              {region.label}
            </button>
          ))}
        </div>

        {mapData?.mixed_region_warning && mapRegion === 'all' ? (
          <p className="text-[10px] font-bold text-amber-300">{mapData.mixed_region_warning}</p>
        ) : null}

        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Drop Target</p>
          <div className="flex flex-wrap items-center gap-2">
            {MAP_TARGET_PRESET_OPTIONS.map((option) => (
              <button
                key={`target-${option.value}`}
                type="button"
                onClick={() => setMapTargetPreset(option.value)}
                className={mapTargetPreset === option.value ? 'px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest text-emerald-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
              >
                {option.label}
              </button>
            ))}
          </div>

          {mapTargetPreset === 'custom' ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMapTargetMode('any')}
                  className={mapTargetMode === 'any' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200 cursor-pointer' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 cursor-pointer'}
                >
                  Any
                </button>
                <button
                  type="button"
                  onClick={() => setMapTargetMode('all')}
                  className={mapTargetMode === 'all' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200 cursor-pointer' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 cursor-pointer'}
                >
                  All
                </button>
                <span className="text-[9px] text-slate-500">Pick up to {MAP_TARGET_CUSTOM_MAX_STATS}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RELIC_SUBSTAT_OPTIONS.map((stat) => {
                  const active = mapTargetCustomStats.includes(stat);
                  return (
                    <button
                      key={`custom-target-${stat}`}
                      type="button"
                      onClick={() => toggleMapTargetCustomStat(stat)}
                      className={active ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200 cursor-pointer' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 cursor-pointer'}
                    >
                      {stat}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <p className="text-[10px] text-slate-500">Target ranking uses submitted relic substats from real runs.</p>
        </div>

        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variant Filter</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVariantOwnershipFilter('all')}
              className={variantOwnershipFilter === 'all' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setVariantOwnershipFilter('owned')}
              className={variantOwnershipFilter === 'owned' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              Owned
            </button>
          </div>
          <button
            type="button"
            onClick={() => setVariantEnforceSum((current) => !current)}
            className={variantEnforceSum ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            {variantEnforceSum ? 'Sum Lock On' : 'Sum Lock Off'}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Controls</p>
            <span className={adminEligible ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500'}>
              {adminStatusLoading ? 'Checking...' : adminEligible ? 'Granted' : 'User'}
            </span>
          </div>

          {adminEligible ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAdminModeEnabled((prev) => !prev)}
                className={adminModeEnabled ? 'w-full px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200 cursor-pointer' : 'w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500 cursor-pointer'}
              >
                {adminModeEnabled ? 'Admin View: ON' : 'Admin View: OFF'}
              </button>

              {adminModeEnabled ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAdminWipeEpoch}
                    disabled={adminWipeLoading}
                    className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    Wipe Epoch
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminWipeAll}
                    disabled={adminWipeLoading}
                    className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60 cursor-pointer"
                  >
                    Wipe All
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">Standard user mode.</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowTuner((prev) => !prev)}
            className={showTuner ? 'px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            {showTuner ? 'Hide Zone Tuner' : 'Show Zone Tuner'}
          </button>
        </div>

        {showTuner ? (
          <div ref={tunerRef} className="pt-2 border-t border-slate-800/60 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zone Tuner</p>
            <p className="text-[10px] text-slate-500">Identify target XOR and Slot.</p>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Zone</span>
                <input
                  type="number"
                  min={0}
                  value={tuneXorInput}
                  onChange={(event) => setTuneXorInput(event.target.value)}
                  placeholder="e.g. 423"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Slot Key</span>
                <input
                  type="number"
                  min={0}
                  value={tuneSlotInput}
                  onChange={(event) => setTuneSlotInput(event.target.value)}
                  placeholder="e.g. 7747"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 text-shadow-glow">Team Sum</span>
                <input
                  type="number"
                  min={0}
                  value={tuneSumInput}
                  onChange={(event) => setTuneSumInput(event.target.value)}
                  placeholder="SUM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500/50"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTeamSignature !== null) setTuneSumInput(String(currentTeamSignature));
                    }}
                    disabled={currentTeamSignature === null}
                    className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 disabled:opacity-50 cursor-pointer"
                  >
                    Use Current Team
                  </button>
                </div>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFindTunedZones}
                className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-500/25 cursor-pointer"
              >
                Find Zone Suggestions
              </button>
              <button
                type="button"
                onClick={handleGenerateManualVariants}
                disabled={manualVariantLoading}
                className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:bg-indigo-500/25 disabled:opacity-60 cursor-pointer"
              >
                {manualVariantLoading ? 'Generating...' : 'Generate Variant Teams'}
              </button>
            </div>

            {tunedZones.length > 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                {tunedZones.map((zone) => (
                  <div key={`tuned-${zone.xor_slot_key}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 hover:border-slate-600 transition-colors">
                    <div>
                      <p className="text-[10px] font-black text-slate-200">Zone {zone.char_xor} / Slot {zone.char_slot}</p>
                      <p className="text-[9px] text-slate-500">Crit {formatRate(zone.crit_rate)} | Runs {zone.runs}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleTuneFromZone(zone)} className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 cursor-pointer">Use</button>
                      <button type="button" onClick={() => handleLoadZoneTeam(zone)} className="px-2 py-1 rounded border border-indigo-500/40 text-[9px] font-black uppercase tracking-wide text-indigo-200 hover:bg-indigo-500/15 cursor-pointer">Load</button>
                      <button type="button" onClick={() => fetchVariantsForZone(zone)} disabled={variantLoadingZoneKey === buildZoneVariantKey(zone)} className="px-2 py-1 rounded border border-cyan-500/40 text-[9px] font-black uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60 cursor-pointer">Var</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {manualVariantPayload ? (
              <div className="rounded-xl border border-indigo-500/20 bg-slate-950/70 p-2 shadow-inner">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-2">Manual Variant Results ({Array.isArray(manualVariantPayload.variants) ? manualVariantPayload.variants.length : 0})</p>
                {Array.isArray(manualVariantPayload.variants) && manualVariantPayload.variants.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                    {manualVariantPayload.variants.map((variant) => (
                      <div key={`manual-variant-${variant.slot_order.join('-')}`} className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">
                        <p className="text-[10px] font-black text-slate-200">{(variant.char_names || []).join(' / ')}</p>
                        <p className="text-[9px] text-slate-500">Owned {variant.owned_count}/4 | Seen {variant.observed_runs} | Crit {formatRate(variant.observed_crit_rate)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-500 italic">No variants found for these parameters.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {zones.length === 0 ? (
          <div className="theme-glass-card p-20 text-center border-dashed border-slate-800">
            <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No coverage data for this combination.</p>
            <p className="text-[10px] text-slate-600 mt-2 font-bold italic">Switch region or drop target to scan different datasets.</p>
          </div>
        ) : (
          <div className={zoneCardView === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 XL:grid-cols-4 gap-6" : "space-y-4"}>
            {zones.map((zone) => {
              const zoneKey = buildZoneVariantKey(zone);
              const isLoadingVar = variantLoadingZoneKey === zoneKey;
              const hasVariants = Boolean(variantsByZone[zoneKey]);
              
              return (
                <div key={zoneKey} className={`zone-card theme-glass-card border-slate-800/60 overflow-hidden group transition-all duration-500 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 ${zoneCardView === 'list' ? 'flex items-center gap-6 p-4' : 'flex flex-col'}`}>
                  {/* Top: Stats Header */}
                  <div className={`p-4 bg-slate-900/60 border-b border-slate-800/40 ${zoneCardView === 'list' ? 'w-48 border-b-0 border-r py-2' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-indigo-400 tracking-tighter">ZONE {zone.char_xor} / SLOT {zone.char_slot}</span>
                       <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[8px] font-mono text-slate-500">#{zone.char_sum || 'NA'}</span>
                    </div>
                    <div className="flex items-end justify-between">
                       <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase leading-none tracking-widest">{signalMetricLabel}</p>
                         <p className="text-2xl font-black text-white leading-none mt-1 shadow-glow">{formatRate(isRelicTargetMode ? zone.crit_rate : zone.crit_rate)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black text-slate-500 uppercase leading-none tracking-widest">Reports</p>
                         <p className="text-lg font-black text-slate-300 leading-none mt-1">{zone.runs}</p>
                       </div>
                    </div>
                  </div>

                  {/* Body: Actions & Info */}
                  <div className={`p-5 flex-1 ${zoneCardView === 'list' ? 'py-2 flex items-center justify-between' : ''}`}>
                    <div className={zoneCardView === 'grid' ? "flex items-center gap-2 mb-4" : "flex items-center gap-4"}>
                       <div className="flex -space-x-2">
                         {Array.isArray(zone.reporter_names) && zone.reporter_names.slice(0, 3).map((name, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-indigo-300 uppercase overflow-hidden" title={name}>
                             {name.slice(0, 1)}
                           </div>
                         ))}
                         {Array.isArray(zone.reporter_names) && zone.reporter_names.length > 3 && (
                           <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-[7px] font-black text-slate-500">
                             +{zone.reporter_names.length - 3}
                           </div>
                         )}
                       </div>
                       <p className="text-[9px] font-bold text-slate-500 italic truncate max-w-[120px]">
                         {zone.latest_reporter_name ? `Latest: ${zone.latest_reporter_name}` : 'Mixed contributors'}
                       </p>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 ${zoneCardView === 'list' ? 'w-80' : ''}`}>
                      <button onClick={() => handleReportZoneCard(zone)} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-600 hover:text-slate-200 transition-all cursor-pointer">Report</button>
                      <button onClick={() => handleLoadZoneTeam(zone)} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-500/40 hover:text-indigo-200 transition-all cursor-pointer">Load Team</button>
                      
                      {adminEligible && adminModeEnabled ? (
                        <>
                          <button
                            onClick={() => handleAdminDeleteZone(zone)}
                            disabled={adminActionLoadingKey === 'delete:' + zoneKey}
                            className="px-3 py-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            {adminActionLoadingKey === 'delete:' + zoneKey ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={() => handleAdminEditZone(zone)}
                            disabled={adminActionLoadingKey === 'edit:' + zoneKey}
                            className="px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                          >
                            {adminActionLoadingKey === 'edit:' + zoneKey ? '...' : 'Edit'}
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => fetchVariantsForZone(zone)} disabled={isLoadingVar} className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-50">
                            {isLoadingVar ? 'Scanning...' : 'Variants'}
                          </button>
                          <button onClick={() => handleExportZoneToCaverns(zone)} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer">Export</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable Variants View */}
                  {hasVariants && (
                    <div className="p-4 bg-indigo-950/20 border-t border-indigo-500/20 animate-in slide-in-from-top-2 duration-300">
                       <div className="flex items-center justify-between mb-3 px-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Potential Variants ({variantsByZone[zoneKey].variants?.length || 0})</p>
                          <button onClick={() => {
                             const next = { ...variantsByZone };
                             delete next[zoneKey];
                             setVariantsByZone(next);
                          }} className="text-indigo-500 hover:text-indigo-300 transition-colors cursor-pointer"><X className="w-3 h-3" /></button>
                       </div>
                       <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar px-1">
                          {(variantsByZone[zoneKey].variants || []).map((v, vii) => (
                             <div key={vii} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between group/v transition-all hover:bg-slate-900">
                                <div>
                                   <p className="text-[10px] font-black text-indigo-200/80 leading-tight">{(v.char_names || []).join(' / ')}</p>
                                   <p className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wide">Owned {v.owned_count}/4 | Seen {v.observed_runs} | Crit {formatRate(v.observed_crit_rate)}</p>
                                </div>
                                <button onClick={() => {
                                   setSlots(v.slot_order.map(val => Number(val) || null));
                                   setSuccess('Variant team loaded.');
                                }} className="opacity-0 group-hover/v:opacity-100 px-2 py-1 rounded bg-indigo-500/20 text-[8px] font-black uppercase text-indigo-300 hover:bg-indigo-500/40 transition-all cursor-pointer">Pick</button>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center pt-8">
        <div className="flex flex-col items-center gap-4 py-8 px-12 rounded-[2rem] bg-slate-950/30 border border-slate-800/40 backdrop-blur-sm">
           <RefreshCw className={`w-8 h-8 text-indigo-500/40 ${loadingMap ? 'animate-spin opacity-100' : 'opacity-30'}`} />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
             {loadingMap ? 'Updating Matrix...' : 'Matrix Synchronized'}
           </p>
        </div>
      </div>
    </div>
  );
}

function X({ className, ...props }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      {...props}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
