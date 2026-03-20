import React from 'react';
import { 
  PlusCircle, 
  X, 
  Search, 
  Info,
  Upload,
  Save,
  RefreshCw
} from 'lucide-react';
import { 
  RELIC_FIXED_MAIN_STATS, 
  getMainStatOptionsForPiece, 
  RELIC_SUBSTAT_OPTIONS,
  OUTCOME_OPTIONS,
  SERVER_REGION_SUBMIT_OPTIONS
} from '../../hooks/useZoneTracker';
import { HSR_CAVERNS } from '../../constants/caverns';

function CharacterAvatar({ char, imageClassName = '', fallbackClassName = '' }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const name = String(char?.name || '?');
  const initial = name.slice(0, 1).toUpperCase();

  if (!char || imageFailed || !char.image) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-800 text-slate-200 font-black uppercase ${fallbackClassName}`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={char.image}
      alt={name}
      className={imageClassName}
      onError={() => setImageFailed(true)}
    />
  );
}

export default function ZoneLogger({
  user,
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
  ownedOptions,
  ownedSet,
  ownedSearchTerm,
  setOwnedSearchTerm,
  ownedLoading,
  ownedSaving,
  ownedImporting,
  rosterMode,
  setRosterMode,
  saveOwnedRoster,
  loadOwnedRoster,
  toggleOwnedCharacter,
  importOwnedRosterFile,
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
  sanitizeClearTimeMmSsInput,
  normalizeClearTimeMmSsInput,
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
  handleAdminWipeAll,
  adminWipeLoading,
  workspaceView
}) {
  const fileInputRef = React.useRef(null);
  const visibleCharacters = rosterMode === 'owned' ? ownedOptions : characterOptions;
  const visibleSearchTerm = rosterMode === 'owned' ? ownedSearchTerm : charSearchTerm;

  const handleRosterSearchChange = (value) => {
    if (rosterMode === 'owned') {
      setOwnedSearchTerm(value);
      return;
    }
    setCharSearchTerm(value);
  };

  const handleRosterGridClick = async (charId, event) => {
    if (rosterMode === 'owned') {
      toggleOwnedCharacter(charId);
      return;
    }
    handleRosterCharacterClick(charId, event);
  };

  const handleOwnedImportChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await importOwnedRosterFile(file);
  };

  return (
    <div className={workspaceView === 'logger' ? 'space-y-8' : 'hidden'}>
      <section ref={formRef} className="theme-glass-card p-8 border-indigo-500/10 shadow-2xl overflow-visible">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Zone Transmitter</h2>
        </div>

        <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[1fr_400px] gap-12 items-start space-y-12 lg:space-y-0">
          {/* Left Column: Team & Relics */}
          <div className="space-y-12">
            {/* Squad Assembly UI */}
            <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">01</span>
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Squad Assembly <span className="text-slate-600 ml-2">({slots.filter(Boolean).length}/4)</span></h3>
                </div>
              </div>
              
              {/* 4 Cards Grid */}
              <div className="grid grid-cols-4 gap-3 md:gap-4 w-full">
                {[0, 1, 2, 3].map(i => {
                  const charId = slots[i];
                  const char = charId ? charactersByNumId.get(Number(charId)) : null;
                  const rarityBg = char ? (char.rarity === 5 ? 'bg-gradient-to-t from-orange-500/80 via-orange-500/20 to-transparent' : 'bg-gradient-to-t from-purple-500/80 via-purple-500/20 to-transparent') : '';
                  const isTarget = activeSlotIndex === i && slots.filter(Boolean).length < 4;
                  
                  return (
                    <div
                      key={`slot-${i}`}
                      draggable={Boolean(charId)}
                      onDragStart={(e) => handleTeamSlotDragStart(i, e)}
                      onDragEnd={handleTeamSlotDragEnd}
                      onDragOver={(e) => handleSlotDragOver(i, e)}
                      onDragLeave={() => handleSlotDragLeave(i)}
                      onDrop={(e) => handleSlotDrop(i, e)}
                      onClick={() => charId ? clearSlot(i) : setActiveSlotIndex(i)}
                      className={`aspect-[3/4] rounded-2xl border-2 transition-all relative group flex items-center justify-center overflow-hidden
                        ${isTarget ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-800'}
                        ${charId ? 'cursor-grab' : 'border-dashed bg-slate-900/40 hover:border-slate-600 cursor-pointer'}`}
                    >
                      {charId && char ? (
                        <>
                          <div className={`absolute inset-0 ${rarityBg}`}></div>
                          <CharacterAvatar char={char} imageClassName="w-full h-full object-cover relative z-10" fallbackClassName="relative z-10 text-3xl" />
                          <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center z-20">
                            <X className="w-6 h-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <PlusCircle className={`w-8 h-8 ${isTarget ? 'text-indigo-400' : 'text-slate-600'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleOwnedImportChange}
                  className="hidden"
                />

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
                    <button
                      type="button"
                      onClick={() => setRosterMode('team')}
                      className={rosterMode === 'team' ? 'rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'rounded-lg border border-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200'}
                    >
                      Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterMode('owned')}
                      className={rosterMode === 'owned' ? 'rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-100' : 'rounded-lg border border-transparent px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200'}
                    >
                      Owned
                    </button>
                  </div>

                  {rosterMode === 'owned' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {ownedSet.size} Owned
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!user?.id || ownedImporting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:bg-indigo-500/20 disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {ownedImporting ? 'Importing...' : 'Import JSON'}
                      </button>
                      <button
                        type="button"
                        onClick={saveOwnedRoster}
                        disabled={!user?.id || ownedSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {ownedSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={loadOwnedRoster}
                        disabled={!user?.id || ownedLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${ownedLoading ? 'animate-spin' : ''}`} />
                        Reload
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={rosterMode === 'owned' ? 'Search owned characters...' : 'Search for a character to add...'}
                    value={visibleSearchTerm}
                    onChange={(e) => handleRosterSearchChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                  {visibleCharacters.map((c) => {
                    const numId = Number(c.numId);
                    const inTeam = slots.includes(numId);
                    const isOwned = ownedSet.has(numId);
                    return (
                      <div
                        key={c.id}
                        onClick={(e) => handleRosterGridClick(numId, e)}
                        title={c.name}
                        className={`relative aspect-square rounded-full border-2 cursor-pointer transition-all ${
                          rosterMode === 'owned'
                            ? isOwned
                              ? 'border-cyan-400/70 ring-2 ring-cyan-400/20'
                              : 'border-slate-800 grayscale opacity-45 hover:opacity-70'
                            : inTeam
                              ? 'border-indigo-500 scale-90 opacity-50'
                              : 'border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <CharacterAvatar char={c} imageClassName="w-full h-full object-cover rounded-full" fallbackClassName="rounded-full text-sm" />
                        {rosterMode === 'owned' && isOwned ? (
                          <div className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border border-white/40 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                        ) : null}
                        {rosterMode === 'owned' && !isOwned ? (
                          <div className="pointer-events-none absolute inset-0 rounded-full bg-slate-950/20" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Relic Logger Section */}
            <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black">02</span>
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Relic Drops</h3>
                </div>
                <div className="flex items-center gap-2">
                   <button type="button" onClick={() => setRelicGridCompact(false)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${!relicGridCompact ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>Large</button>
                   <button type="button" onClick={() => setRelicGridCompact(true)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${relicGridCompact ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>Compact</button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Relics Dropped</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={relicDropCount}
                      onChange={(e) => setRelicDropCount(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-300 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="h-10 w-px bg-slate-800/60 mx-2" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Suggested Outcome</p>
                    <p className="text-xs font-black text-white mt-1 uppercase">{(OUTCOME_OPTIONS.find(o => o.value === suggestedOutcome)?.label || suggestedOutcome)}</p>
                  </div>
                </div>

                <div className={relicGridCompact ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"}>
                  {relicCards.map((card, cardIndex) => (
                    <div key={`relic-${cardIndex}`} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-600 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                         <span className="text-[10px] font-mono text-slate-500">{String(cardIndex + 1).padStart(2, '0')}</span>
                         <button type="button" onClick={() => cycleRelicPiece(cardIndex)} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:underline">{card.piece}</button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Main Stat</p>
                          {RELIC_FIXED_MAIN_STATS[card.piece] ? (
                            <div className="text-[10px] text-slate-300 font-medium">{RELIC_FIXED_MAIN_STATS[card.piece]}</div>
                          ) : (
                            <select
                              value={card.mainStat || ''}
                              onChange={(e) => setRelicCardMainStat(cardIndex, e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[10px] text-slate-300 outline-none focus:border-indigo-500/40"
                            >
                              <option value="">Select Main</option>
                              {getMainStatOptionsForPiece(card.piece).map(ms => <option key={ms} value={ms}>{ms}</option>)}
                            </select>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {RELIC_SUBSTAT_OPTIONS.map(substat => {
                            const active = card.substats.includes(substat);
                            return (
                              <button
                                key={substat}
                                type="button"
                                onClick={() => toggleRelicCardSubstat(cardIndex, substat)}
                                className={`px-1.5 py-1 rounded text-[8px] font-bold uppercase transition-all border ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' : 'bg-slate-950/40 border-slate-800 text-slate-600 hover:border-slate-700'}`}
                              >
                                {substat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:sticky lg:top-8 space-y-10">
            <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20 space-y-8">
              {/* Step 03: Run Context */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-black">03</span>
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">Configuration</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Cavern Location</label>
                    <select
                      value={cavern || ''}
                      onChange={(e) => setCavern(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                    >
                      <option value="">Select Cavern</option>
                      {HSR_CAVERNS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Region</label>
                      <select
                        value={serverRegion}
                        onChange={(e) => setServerRegion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                      >
                        {SERVER_REGION_SUBMIT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Clear Time</label>
                      <input
                        type="text"
                        value={clearTimeInput}
                        onChange={(e) => setClearTimeInput(sanitizeClearTimeMmSsInput(e.target.value))}
                        onBlur={(e) => setClearTimeInput(normalizeClearTimeMmSsInput(e.target.value))}
                        placeholder="MM:SS"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 04: Submission */}
              <div className="space-y-6 pt-6 border-t border-slate-800/40">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none h-20 resize-none focus:border-indigo-500/50"
                    placeholder="Any notable drops or anomalies..."
                  />
                </div>

                <div className="space-y-4">
                   <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-xl bg-indigo-600 font-black text-xs uppercase tracking-widest text-white shadow-lg hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                   >
                    {submitting ? 'Transmitting Data...' : 'Submit Zone Report'}
                   </button>

                   {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">{error}</div>}
                   {success && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">{success}</div>}
                </div>
              </div>

              {/* Substat Stats Mini View */}
              <div className="pt-6 border-t border-slate-800/40">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Batch Average</h4>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Top 4 Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {RELIC_SUBSTAT_OPTIONS
                     .map(substat => ({ name: substat, count: relicSubstatFrequency[substat] || 0 }))
                     .sort((a, b) => b.count - a.count)
                     .slice(0, 4)
                     .filter(stat => stat.count > 0)
                     .map(stat => (
                       <div key={stat.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{stat.name}</span>
                          <span className="text-[10px] font-black text-cyan-400">{stat.count}</span>
                       </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>

      {/* Guidelines Mini Panel */}
      <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20">
        <div className="flex items-center gap-3 mb-3">
          <Info className="w-4 h-4 text-slate-500" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reporting Guidelines</h3>
        </div>
        <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed font-bold">
          <li className="flex gap-2">
            <span className="text-indigo-500/60">*</span>
            Only submit runs where characters remained in the specified slot order throughout.
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-500/60">*</span>
            Aggregated statistics rely on volume. Multiple user reports confirm "Active Zones".
          </li>
          <li className="flex gap-2 text-indigo-400/60">
            <span className="text-indigo-500/60">*</span>
            Confidentiality: Your user ID is used purely for anti-spam; reports are listed anonymously.
          </li>
        </ul>
      </div>

      <div className="theme-glass-card p-6 border-slate-700/40 bg-slate-950/20 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <Info className="w-4 h-4 text-cyan-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Debug Export</h3>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
          Download zone logs as TXT for analysis. Admin mode can export all users.
        </p>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Access</p>
            <span className={adminEligible ? 'px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-[9px] font-black uppercase tracking-widest text-emerald-300' : 'px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-500'}>
              {adminStatusLoading ? 'Checking...' : adminEligible ? 'Granted' : 'User'}
            </span>
          </div>

          {adminEligible ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAdminModeEnabled((prev) => !prev)}
                disabled={adminStatusLoading}
                className={adminModeEnabled ? 'w-full px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-500/20 disabled:opacity-60' : 'w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-slate-500 disabled:opacity-60'}
              >
                {adminModeEnabled ? 'Admin View: ON (Export All)' : 'Admin View: OFF (Export Self)'}
              </button>
              {adminModeEnabled ? (
                <button
                  type="button"
                  onClick={handleAdminWipeAll}
                  disabled={adminWipeLoading}
                  className="w-full px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                >
                  {adminWipeLoading ? 'Wiping...' : 'Wipe All Zone Reports'}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">Standard user mode: export includes your own logs only.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleExportDebugLogs}
          disabled={exportingDebug || adminStatusLoading}
          className="w-full px-4 py-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
        >
          {exportingDebug
            ? 'Preparing Export...'
            : adminModeEnabled && adminEligible
              ? 'Export All Logs (.txt)'
              : 'Export My Logs (.txt)'}
        </button>

        <p className="text-[10px] text-slate-500 mt-3">
          Export includes slot order, hash values, region, outcome, notes, and full relic payload.
        </p>
      </div>
    </div>
  );
}
