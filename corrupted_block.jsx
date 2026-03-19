
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
                          {variantLoadingZoneKey === buildZoneVariantKey(zone) ? 'Generating...' : 'Generate Variants'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportZoneToCaverns(zone)}
                          className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200 hover:bg-emerald-500/20"
                        >
                          Export to Caverns
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReportZoneCard(zone)}
                          className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200 hover:bg-amber-500/20"
                        >
                          Report Card
                        </button>

                        {adminEligible && adminModeEnabled ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminEditZone(zone)}
                              disabled={cardActionBusy}
                              className="py-2 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 hover:border-slate-500 disabled:opacity-60"
                            >
                              {adminActionLoadingKey === 'edit:' + zoneKey ? 'Editing...' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdminDeleteZone(zone)}
                              disabled={cardActionBusy}
                              className="py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] font-black uppercase tracking-[0.14em] text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                            >
                              {adminActionLoadingKey === 'delete:' + zoneKey ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {variantState ? (
                      <div className="mt-4 p-3 rounded-xl border border-cyan-500/20 bg-slate-950/60">
                        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300 mb-2">Variant Team Matches ({variants.length})</p>
                        {variants.length === 0 ? (
                          <p className="text-[10px] text-slate-500 font-bold">No matching variants for selected filter.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {variants.map((variant) => (
                              <div key={variant.slot_order.join('-')} className="p-2 rounded-lg border border-slate-800 bg-slate-900/70">
                                <p className="text-[10px] font-black text-slate-200 leading-tight">{(variant.char_names || []).join(' / ')}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Owned {variant.owned_count}/4 | Seen {variant.observed_runs} | Crit {formatRate(variant.observed_crit_rate)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
