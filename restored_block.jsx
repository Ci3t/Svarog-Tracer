          <div className={showMapFilters ? 'mx-2 mt-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70 space-y-3' : 'hidden'}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Filter</p>
            <div className="flex flex-wrap items-center gap-2">
              {SERVER_REGION_OPTIONS.map((region) => (
                <button
                  key={`region-${region.value}`}
                  type="button"
                  onClick={() => setMapRegion(region.value)}
                  className={mapRegion === region.value ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
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
                    className={mapTargetPreset === option.value ? 'px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest text-emerald-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
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
                      className={mapTargetMode === 'any' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
                    >
                      Any
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapTargetMode('all')}
                      className={mapTargetMode === 'all' ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
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
                          className={active ? 'px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-wide text-emerald-200' : 'px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500'}
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
                  className={variantOwnershipFilter === 'all' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setVariantOwnershipFilter('owned')}
                  className={variantOwnershipFilter === 'owned' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                >
                  Owned
                </button>
              </div>
              <button
                type="button"
                onClick={() => setVariantEnforceSum((current) => !current)}
                className={variantEnforceSum ? 'px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
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
                    className={adminModeEnabled ? 'w-full px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200' : 'w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500'}
                  >
                    {adminModeEnabled ? 'Admin View: ON' : 'Admin View: OFF'}
                  </button>

                  {adminModeEnabled ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAdminWipeEpoch}
                        disabled={adminWipeLoading}
                        className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        Wipe Epoch
                      </button>
                      <button
                        type="button"
                        onClick={handleAdminWipeAll}
                        disabled={adminWipeLoading}
                        className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        Wipe All
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">Enable admin mode to edit/delete or wipe reported zones.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setShowTuner((prev) => !prev)}
                className={showTuner ? 'px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest text-indigo-100' : 'px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
              >
                {showTuner ? 'Hide Zone Tuner' : 'Show Zone Tuner'}
              </button>
            </div>

            {showTuner ? (
              <div ref={tunerRef} className="pt-2 border-t border-slate-800/60 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zone Tuner</p>
              <p className="text-[10px] text-slate-500">Enter Zone and Slot Key from a good report, then add Team Signature only if you want stricter matching.</p>

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
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Team Signature (optional)</span>
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
                        if (currentTeamSignature !== null) {
                          setTuneSumInput(String(currentTeamSignature));
                        }
                      }}
                      disabled={currentTeamSignature === null}
                      className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500 disabled:opacity-50"
                    >
                      Use Current Team
                    </button>
                    <span className="text-[9px] text-slate-500">
                      {currentTeamSignature === null ? 'Pick 4 characters' : 'Current: ' + currentTeamSignature}
                    </span>
                  </div>
                </label>
              </div>


              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleFindTunedZones}
                  className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-500/25"
                >
                  Find Zone Suggestions
                </button>
                <button
                  type="button"
                  onClick={handleGenerateManualVariants}
                  disabled={manualVariantLoading}
                  className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:bg-indigo-500/25 disabled:opacity-60"
                >
                  {manualVariantLoading ? 'Generating...' : 'Generate Variant Teams'}
                </button>
              </div>

              {tunedZones.length > 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {tunedZones.map((zone) => (
                    <div key={`tuned-${zone.xor_slot_key}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5">
                      <div>
                        <p className="text-[10px] font-black text-slate-200">Zone {zone.char_xor} / Slot {zone.char_slot}</p>
                        <p className="text-[9px] text-slate-500">Crit {formatRate(zone.crit_rate)} | Runs {zone.runs}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleTuneFromZone(zone)} className="px-2 py-1 rounded border border-slate-700 text-[9px] font-black uppercase tracking-wide text-slate-300 hover:border-slate-500">Use</button>
                        <button type="button" onClick={() => handleLoadZoneTeam(zone)} className="px-2 py-1 rounded border border-indigo-500/40 text-[9px] font-black uppercase tracking-wide text-indigo-200 hover:bg-indigo-500/15">Load</button>
                        <button type="button" onClick={() => fetchVariantsForZone(zone)} disabled={variantLoadingZoneKey === buildZoneVariantKey(zone)} className="px-2 py-1 rounded border border-cyan-500/40 text-[9px] font-black uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60">Var</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {manualVariantPayload ? (
                <div className="rounded-xl border border-indigo-500/20 bg-slate-950/70 p-2">
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
                    <p className="text-[10px] text-slate-500">No variants found for this exact target.</p>
                  )}
                </div>
              ) : null}
              </div>
            ) : null}
            </div>

          {!mapData ? (
            <div className="h-64 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-4">
              <RefreshCw className="w-10 h-10 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">Initialize map to view signals</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="h-64 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 gap-4">
              <RefreshCw className="w-10 h-10 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.16em]">No data signals detected in this epoch</p>
            </div>
          ) : (
            <div className={zoneCardView === 'grid' ? 'grid gap-4 md:grid-cols-2 2xl:grid-cols-3' : 'grid gap-4'}>
              {zones.map((zone, index) => {
                const signalRateRaw = isRelicTargetMode ? zone.target_rate : zone.crit_rate;
                const signalRate = signalRateRaw === null || signalRateRaw === undefined ? 0 : Number(signalRateRaw);
                const isGreat = signalRate >= 0.7 && zone.confidence !== 'LOW';
                const zoneKey = buildZoneVariantKey(zone);
                const variantState = variantsByZone[zoneKey];
                const variants = Array.isArray(variantState?.variants) ? variantState.variants : [];
                const regionTags = Array.isArray(zone?.regions) ? zone.regions : [];
                const cavernTags = Array.isArray(zone?.caverns) ? zone.caverns : [];
                const reporterLabel = zone?.latest_reporter_name || (Array.isArray(zone?.reporter_names) ? zone.reporter_names[0] : null) || 'Unknown';
                const clearTimeLabel = formatClearTimeSeconds(zone?.latest_clear_time_seconds ?? zone?.avg_clear_time_seconds);
                const cardActionBusy = adminActionLoadingKey === 'delete:' + zoneKey || adminActionLoadingKey === 'edit:' + zoneKey;
                
                return (
                  <div
                    key={zoneKey}
                    className={`zone-card group relative p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.99] cursor-default ${
                      isGreat 
                      ? 'bg-indigo-900/20 border-indigo-500/30 hover:border-indigo-400/50 shadow-[0_4px_20px_rgba(79,70,229,0.1)]' 
                      : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className={zoneCardView === 'grid' ? 'flex flex-col justify-between gap-4 relative z-10 h-full' : 'flex flex-col sm:flex-row justify-between gap-6 relative z-10'}>
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-950 text-[10px] font-black text-indigo-400 border border-slate-800 shadow-inner">
                              {index + 1}
                            </span>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Zone {zone.char_xor} / Slot {zone.char_slot}</h3>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${CONFIDENCE_STYLES[zone.confidence] || CONFIDENCE_STYLES.LOW}`}>
                            {zone.confidence}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {regionTags.map((region) => (
                            <span key={`region-tag-${zoneKey}-${region}`} className="px-2 py-0.5 rounded border border-cyan-500/35 bg-cyan-500/10 text-[9px] font-black uppercase tracking-widest text-cyan-200">
                              {String(region).toUpperCase()}
                            </span>
                          ))}
                          {cavernTags.slice(0, 2).map((cavernId) => (
                            <span key={`cavern-tag-${zoneKey}-${getCavernDisplayName(cavernId)}`} className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest text-indigo-200">
                              {cavernId}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-300">
                            By {reporterLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                            Clear {clearTimeLabel}
                          </span>
                        </div>

                        <div className="space-y-2 pb-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{signalMetricLabel}</span>
                            <span className={`text-sm font-black font-mono ${signalRate >= 0.5 ? 'text-indigo-300' : 'text-slate-400'}`}>
                              {formatRate(signalRateRaw)}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                signalRate >= 0.7 ? 'bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]' : 
                                signalRate >= 0.4 ? 'bg-indigo-500/60' : 'bg-slate-700'
                              }`} 
                              style={{ width: `${signalRate * 100}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Zone</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_xor}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Slot Key</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_slot}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Team Sig</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.char_sum}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Reports</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{zone.runs}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Clear Time</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{clearTimeLabel}</span>
                           </div>
                           <div className="flex flex-col p-2 rounded-xl bg-slate-950/50 border border-slate-800/50">
                             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{isRelicTargetMode ? 'Target Match' : 'Drop Score'}</span>
                             <span className="text-xs font-mono font-bold text-slate-300">{isRelicTargetMode ? formatRate(zone.target_rate) : formatDropScore(zone.avg_drop_score)}</span>
                           </div>
                        </div>
                      </div>

                      <div className={zoneCardView === 'grid' ? 'flex flex-col gap-2 justify-end' : 'sm:w-64 flex flex-col gap-3 justify-end shrink-0'}>
                        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 h-full flex flex-col justify-center">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <Users className="w-3 h-3 text-slate-400" />
                             Top Performing Team
                          </p>
                          <div className="flex justify-between items-center bg-slate-900 border border-slate-800/80 p-1.5 rounded-[1.2rem]">
                            {(zone.sample_slot_order || []).map((charId, cidx) => {
                              const char = charactersByNumId.get(Number(charId));
                              return (
                                <div key={`sample-${cidx}`} title={char?.name} className="relative w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                                  {char?.image ? (
                                    <img src={char.image} alt={char.name} className="w-full h-full object-cover scale-110" />
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleLoadZoneTeam(zone)}
                          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all hover:border-indigo-500/50 shadow-lg shadow-indigo-500/5 active:scale-95"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Load Setup
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTuneFromZone(zone)}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                        >
                          Tune Zone/Slot
                        </button>

                        <button
                          type="button"
                          onClick={() => fetchVariantsForZone(zone)}
                          disabled={variantLoadingZoneKey === buildZoneVariantKey(zone)}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-all hover:border-cyan-500/50 shadow-lg shadow-cyan-500/5 active:scale-95 disabled:opacity-60"
                        >
                          <Dna className="w-3.5 h-3.5" />
