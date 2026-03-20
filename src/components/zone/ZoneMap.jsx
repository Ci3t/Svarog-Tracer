import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  History,
  ChevronLeft,
  ChevronRight,
  X
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

function CharacterAvatar({ character, fallbackLabel, sizeClass = 'w-11 h-11', labelClass = 'text-[10px]' }) {
  const initials = String(character?.name || fallbackLabel || '?').trim().slice(0, 1).toUpperCase() || '?';
  const rarityClass = character?.rarity === 5
    ? 'border-orange-500/40 shadow-orange-500/10'
    : 'border-purple-500/40 shadow-purple-500/10';

  return (
    <div
      className={`${sizeClass} rounded-full border-2 ${rarityClass} bg-slate-900 overflow-hidden ring-2 ring-slate-950 shadow-lg`}
      title={character?.name || fallbackLabel}
    >
      {character?.image ? (
        <img src={character.image} alt={character.name || fallbackLabel} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 font-black text-slate-200 ${labelClass}`}>
          {initials}
        </div>
      )}
    </div>
  );
}

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
  variantMinOwned,
  setVariantMinOwned,
  variantEnforceSum,
  setVariantEnforceSum,
  adminEligible,
  adminStatusLoading,
  adminModeEnabled,
  setAdminModeEnabled,
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
  manualVariantPayload,
  zones,
  signalMetricLabel,
  requestedEpoch,
  handleReportZoneCard,
  handleAdminDeleteZone,
  handleAdminEditZone,
  adminActionLoadingKey,
  adminEditModalZone,
  adminEditDraft,
  handleAdminEditDraftChange,
  handleAdminEditSlotOrderChange,
  handleAdminEditCancel,
  handleAdminEditSubmit,
  variantsByZone,
  setVariantsByZone,
  handleExportZoneToCaverns,
  charactersByNumId,
  setSlots,
  setSuccess,
}) {
  const [variantPages, setVariantPages] = useState({});
  const characterList = useMemo(() => {
    return Array.from(charactersByNumId?.values?.() || []).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [charactersByNumId]);

  const groupedZones = useMemo(() => {
    const groups = {};
    zones.forEach(z => {
      const key = `${z.char_xor}-${z.char_slot}-${z.char_sum}`;
      if (!groups[key]) {
        const initialRelics = z.sample_relic_data?.relics || z.relic_data?.relics || [];
        groups[key] = { 
          ...z, 
          aggregated_relics: [...initialRelics] 
        };
      } else {
        groups[key].runs = (groups[key].runs || 0) + (z.runs || 1);
        const newRelics = z.sample_relic_data?.relics || z.relic_data?.relics;
        if (Array.isArray(newRelics)) {
          groups[key].aggregated_relics.push(...newRelics);
        }
        if (z.latest_reporter_name && groups[key].latest_reporter_name !== z.latest_reporter_name) {
          if (!Array.isArray(groups[key].reporter_names)) groups[key].reporter_names = [groups[key].latest_reporter_name];
          if (!groups[key].reporter_names.includes(z.latest_reporter_name)) {
            groups[key].reporter_names.push(z.latest_reporter_name);
          }
        }
      }
    });
    return Object.values(groups);
  }, [zones]);

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

      <div className={showMapFilters ? 'relative z-20 isolate mx-2 mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 space-y-3 shadow-xl' : 'hidden'}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Filter</p>
        <div className="relative z-20 flex flex-wrap items-center gap-2">
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
          <div className="relative z-20 flex flex-wrap items-center gap-2">
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
            <div className="relative z-20 rounded-lg border border-slate-800 bg-slate-900/50 p-2 space-y-2">
              <div className="relative z-20 flex items-center gap-2">
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
              <div className="relative z-20 flex flex-wrap gap-1.5">
                {RELIC_SUBSTAT_OPTIONS.map((stat) => {
                  const active = mapTargetCustomStats.includes(stat);
                  return (
                    <button
                      key={`custom-target-${stat}`}
                      type="button"
                      onClick={() => toggleMapTargetCustomStat(stat)}
                      className={active ? 'relative z-20 px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200 cursor-pointer' : 'relative z-20 px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 cursor-pointer'}
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
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Owned Team Filter</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVariantOwnershipFilter('all')}
              className={variantOwnershipFilter === 'all' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              Ignore Owned
            </button>
            <button
              type="button"
              onClick={() => setVariantOwnershipFilter('owned')}
              className={variantOwnershipFilter === 'owned' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
            >
              Use Owned Roster
            </button>
          </div>
          {variantOwnershipFilter === 'owned' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Owned Count</span>
              <button
                type="button"
                onClick={() => setVariantMinOwned(3)}
                className={variantMinOwned === 3 ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
              >
                Min 3
              </button>
              <button
                type="button"
                onClick={() => setVariantMinOwned(4)}
                className={variantMinOwned === 4 ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
              >
                Min 4
              </button>
              <span className="text-[9px] text-slate-500">Use `3` if one slot can be a friend support.</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setVariantEnforceSum((current) => !current)}
            className={variantEnforceSum ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
          >
            {variantEnforceSum ? 'Sum Lock On' : 'Sum Lock Off'}
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Edit your saved owned roster from Relic Log inside the Team Assembly picker, then use it here with `Use Owned Roster`.
        </p>

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
                    onClick={() => {
                      setAdminWipeAllConfirmText('');
                      setShowAdminWipeAllModal(true);
                    }}
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
            <p className="text-[10px] text-slate-500">Identify target Zone and Slot.</p>

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
            {groupedZones.map((zone) => {
                const zoneKey = buildZoneVariantKey(zone);
                const isEditingZone = buildZoneVariantKey(adminEditModalZone) === zoneKey;
                const isLoadingVar = variantLoadingZoneKey === zoneKey;
                const hasVariants = Boolean(variantsByZone[zoneKey]);
                
                // Process card details
                const sampleTeam = Array.isArray(zone.sample_slot_order) ? zone.sample_slot_order : [];
                const sampleCharacters = sampleTeam.map((id) => charactersByNumId?.get(Number(id)) || null);
                const sampleNames = sampleCharacters
                  .map((char, index) => char?.name || zone.char_names?.[index] || `#${sampleTeam[index]}`)
                  .filter(Boolean);
                const sampleRelics = Array.isArray(zone.aggregated_relics) ? zone.aggregated_relics : [];
                const cardSubstatFreq = {};
                sampleRelics.forEach(r => {
                  if (Array.isArray(r.substats)) {
                    r.substats.forEach(s => {
                      cardSubstatFreq[s] = (cardSubstatFreq[s] || 0) + 1;
                    });
                  }
                });
                const top4Stats = Object.entries(cardSubstatFreq)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4);

                return (
                  <div key={zoneKey} className="zone-card theme-glass-card border-slate-800/60 overflow-hidden group transition-all duration-500 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col">
                    {/* Top: Stats Header */}
                    <div className={`p-4 bg-slate-900/60 border-b border-slate-800/40 ${zoneCardView === 'list' ? 'pb-3' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-indigo-400 tracking-tighter uppercase">Zone {zone.char_xor} / Slot {zone.char_slot}</span>
                              <span className="text-[8px] font-mono text-slate-600 bg-slate-950/40 px-1 rounded border border-slate-800/40" title="Report UID">UID: {zone.id?.toString().slice(-8) || zone.xor_slot_key?.slice(0, 8) || 'N/A'}</span>
                            </div>
                            {zone.latest_reporter_name && (
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[7px] font-black text-indigo-300 uppercase tracking-widest">{zone.latest_reporter_name}</span>
                              </div>
                            )}
                         </div>
                         <span className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/60 text-[8px] font-mono text-slate-400 uppercase shadow-inner">SUM {zone.char_sum || 'NA'}</span>
                      </div>
                    <div className="flex items-end justify-between">
                       <div>
                         <p className="text-[9px] font-black text-slate-500 uppercase leading-none tracking-widest">{signalMetricLabel}</p>
                         <p className="text-2xl font-black text-white leading-none mt-1 shadow-glow">{formatRate(zone.crit_rate ?? zone.observed_crit_rate ?? zone.target_rate)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black text-slate-500 uppercase leading-none tracking-widest">Reports</p>
                         <p className="text-lg font-black text-slate-300 leading-none mt-1">{zone.runs}</p>
                       </div>
                    </div>
                  </div>

                  {/* Team & Substats Section */}
                  {zoneCardView === 'grid' ? (
                    <div className="px-4 py-4 border-b border-slate-800/20 bg-slate-950/20 grid grid-cols-[1fr_auto] items-center gap-6">
                      {/* Team Mini View */}
                      <div className="space-y-3">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sample Squad</p>
                        <div className="flex -space-x-2">
                          {sampleTeam.map((id, i) => {
                            const char = sampleCharacters[i];
                            return (
                              <div key={i} className="group-hover:scale-105 transition-transform duration-300">
                                <CharacterAvatar character={char} fallbackLabel={zone.char_names?.[i] || id} />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Substats Mini View */}
                      <div className="space-y-3 text-right">
                         <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Reported Subs</p>
                         <div className="flex flex-col gap-1.5 items-end">
                            {top4Stats.map(([stat, count]) => (
                              <div key={stat} className="flex items-center gap-2 group/stat">
                                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black text-cyan-300 uppercase tracking-tighter shadow-sm group-hover/stat:bg-cyan-500/20 transition-all">
                                  {stat}
                                </span>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-4 border-b border-slate-800/20 bg-slate-950/20">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_220px] xl:items-center">
                        <div className="min-w-0 space-y-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex -space-x-3 shrink-0">
                              {sampleTeam.map((id, i) => (
                                <CharacterAvatar
                                  key={`list-team-${zoneKey}-${i}`}
                                  character={sampleCharacters[i]}
                                  fallbackLabel={zone.char_names?.[i] || id}
                                  sizeClass="w-14 h-14"
                                  labelClass="text-sm"
                                />
                              ))}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Sample Squad</p>
                              <p className="text-sm font-black text-slate-100 truncate">{sampleNames.join(' / ') || 'Unknown Squad'}</p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {Array.isArray(zone.reporter_names) && zone.reporter_names.length > 0
                                  ? `${zone.reporter_names.length} reporters tracked`
                                  : 'Single report sample'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {top4Stats.length > 0 ? top4Stats.map(([stat, count]) => (
                              <span key={`list-stat-${zoneKey}-${stat}`} className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800/60 text-[10px] font-black text-cyan-200">
                                {stat} <span className="text-cyan-400">{count}</span>
                              </span>
                            )) : (
                              <span className="text-[10px] text-slate-600 italic">No substat data available for this squad.</span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Batch Average</p>
                            <p className="mt-2 text-sm font-black text-white">{formatRate(zone.crit_rate ?? zone.observed_crit_rate ?? zone.target_rate)}</p>
                            <p className="mt-1 text-[10px] text-slate-500">{signalMetricLabel}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 px-4 py-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Report Activity</p>
                            <p className="mt-2 text-sm font-black text-slate-200">{zone.runs} reports</p>
                            <p className="mt-1 text-[10px] text-slate-500">{zone.latest_reporter_name ? `Latest by ${zone.latest_reporter_name}` : 'Community sample set'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
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
                    </div>
                  )}

                  {/* Body: Actions & Info */}
                  <div className={`p-5 flex-1 ${zoneCardView === 'list' ? 'py-4' : ''}`}>
                    {zoneCardView === 'grid' ? (
                      <>
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch Average</p>
                              <span className="text-[8px] font-bold text-slate-700 bg-slate-900 border border-slate-800/40 px-1.5 py-0.5 rounded uppercase">Top 4 Stats</span>
                            </div>
                            <div className="flex -space-x-2">
                              {Array.isArray(zone.reporter_names) && zone.reporter_names.slice(0, 5).map((name, i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[7px] font-black text-indigo-300 uppercase overflow-hidden ring-1 ring-indigo-500/10" title={name}>
                                  {name.slice(0, 1)}
                                </div>
                              ))}
                              {Array.isArray(zone.reporter_names) && zone.reporter_names.length > 5 && (
                                <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-[6px] font-black text-slate-600">
                                  +{zone.reporter_names.length - 5}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {top4Stats.map(([stat, count]) => (
                              <div key={stat} className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/40 shadow-inner group/stat relative overflow-hidden transition-all hover:border-cyan-500/30">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate pr-2 z-10">{stat}</span>
                                <span className="text-xs font-bold text-cyan-400 z-10">{count}</span>
                                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                              </div>
                            ))}
                            {top4Stats.length === 0 && (
                              <p className="col-span-2 text-[9px] text-slate-600 italic py-2 text-center">No substat data available for this squad</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
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
                      </>
                    ) : null}

                    {adminEligible && adminModeEnabled && isEditingZone ? (
                      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-slate-950/70 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Edit This Card</p>
                            <p className="text-[10px] text-slate-500 mt-1">Edit the squad itself. Zone, Slot, and Team Sum will be recalculated for you.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAdminEditCancel}
                            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {(Array.isArray(adminEditDraft?.slotOrder) ? adminEditDraft.slotOrder : ['', '', '', '']).map((slotValue, slotIndex) => (
                            <label key={`edit-slot-${zoneKey}-${slotIndex}`} className="space-y-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Slot {slotIndex + 1}</span>
                              <select
                                value={slotValue || ''}
                                onChange={(event) => handleAdminEditSlotOrderChange(slotIndex, event.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-amber-500/50"
                              >
                                <option value="">Select character</option>
                                {characterList.map((char) => (
                                  <option key={`edit-char-${zoneKey}-${slotIndex}-${char.numId}`} value={char.numId}>
                                    {char.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-black text-cyan-200">
                            Zone {adminEditDraft?.xor || '--'}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[10px] font-black text-indigo-200">
                            Slot {adminEditDraft?.slot || '--'}
                          </span>
                          <span className="px-3 py-1.5 rounded-xl bg-violet-950/20 border border-violet-500/20 text-[10px] font-black text-violet-200">
                            Team Sum {adminEditDraft?.sum || '--'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleAdminEditCancel}
                            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAdminEditSubmit}
                            disabled={adminActionLoadingKey === 'edit:' + zoneKey}
                            className="px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-500/20 disabled:opacity-60 cursor-pointer"
                          >
                            {adminActionLoadingKey === 'edit:' + zoneKey ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Expandable Variants View */}
                  {hasVariants && (() => {
                    const varList = variantsByZone[zoneKey].variants || [];
                    const VPAGE_SIZE = 5;
                    const vTotalPages = Math.max(1, Math.ceil(varList.length / VPAGE_SIZE));
                    const vPage = variantPages[zoneKey] || 0;
                    const vPageSafe = Math.min(vPage, vTotalPages - 1);
                    const pagedVars = varList.slice(vPageSafe * VPAGE_SIZE, (vPageSafe + 1) * VPAGE_SIZE);
                    return (
                    <div className="p-4 bg-indigo-950/20 border-t border-indigo-500/20 animate-in slide-in-from-top-2 duration-300">
                       <div className="flex items-center justify-between mb-3 px-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Potential Variants ({varList.length})</p>
                          <div className="flex items-center gap-2">
                            {vTotalPages > 1 && (
                              <>
                                <button onClick={() => setVariantPages(p => ({ ...p, [zoneKey]: Math.max(0, vPageSafe - 1) }))} disabled={vPageSafe === 0} className="text-slate-500 hover:text-indigo-300 disabled:opacity-30 transition-colors cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                <span className="text-[8px] font-black text-slate-400">{vPageSafe + 1}/{vTotalPages}</span>
                                <button onClick={() => setVariantPages(p => ({ ...p, [zoneKey]: Math.min(vTotalPages - 1, vPageSafe + 1) }))} disabled={vPageSafe >= vTotalPages - 1} className="text-slate-500 hover:text-indigo-300 disabled:opacity-30 transition-colors cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                            <button onClick={() => {
                               const next = { ...variantsByZone };
                               delete next[zoneKey];
                               setVariantsByZone(next);
                               setVariantPages(p => { const n = { ...p }; delete n[zoneKey]; return n; });
                            }} className="text-indigo-500 hover:text-indigo-300 transition-colors cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                       </div>
                       <div className="space-y-1.5 px-1">
                          {pagedVars.map((v, vii) => (
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
                    );
                  })()}
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

      {showAdminWipeAllModal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/25 bg-slate-950 shadow-2xl shadow-rose-500/10">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-200">Wipe All Zone Reports</p>
                <p className="mt-2 text-xs text-slate-400">
                  This permanently removes every zone report across all epochs. Type <span className="font-black text-slate-200">WIPE_ALL_ZONE_RUNS</span> to confirm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (adminWipeLoading) return;
                  setShowAdminWipeAllModal(false);
                  setAdminWipeAllConfirmText('');
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-300 hover:border-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Confirmation Text
                </label>
                <input
                  type="text"
                  value={adminWipeAllConfirmText}
                  onChange={(e) => setAdminWipeAllConfirmText(e.target.value)}
                  placeholder="WIPE_ALL_ZONE_RUNS"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-mono text-slate-100 outline-none transition-all focus:border-rose-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-5">
              <button
                type="button"
                onClick={() => {
                  if (adminWipeLoading) return;
                  setShowAdminWipeAllModal(false);
                  setAdminWipeAllConfirmText('');
                }}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminWipeAll}
                disabled={adminWipeLoading}
                className="rounded-xl border border-rose-500/35 bg-rose-500/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-100 hover:bg-rose-500/25 disabled:opacity-60"
              >
                {adminWipeLoading ? 'Wiping...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
