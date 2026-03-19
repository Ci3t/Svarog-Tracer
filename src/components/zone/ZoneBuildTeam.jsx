import React, { useState, useMemo } from 'react';
import { Users, Zap, Hash, Plus, X, ChevronLeft, ChevronRight, Shuffle, Target } from 'lucide-react';
import { formatRate } from '../../hooks/useZoneTracker';

const VARIANTS_PER_PAGE = 8;

export default function ZoneBuildTeam({
  workspaceView,
  buildSlots,
  setBuildSlots,
  buildTeamSignature,
  buildVariantPayload,
  setBuildVariantPayload,
  buildVariantLoading,
  setBuildVariantLoading,
  charactersByNumId,
  characterOptions,
  ownedSet,
  setSlots,
  setSuccess,
  getAuthHeader,
}) {
  const [charSearch, setCharSearch] = useState('');
  const [variantPage, setVariantPage] = useState(0);

  if (workspaceView !== 'build') return null;

  // ─── helpers ─────────────────────────────────────────────────────────────
  const filledCount = buildSlots.filter(Boolean).length;
  const isReady = filledCount === 4;

  const filteredChars = useMemo(() => {
    const q = charSearch.toLowerCase().trim();
    return (characterOptions || []).filter(c =>
      !q || c.name?.toLowerCase().includes(q) || String(c.numId || '').includes(q)
    );
  }, [characterOptions, charSearch]);

  const addToSlot = (numId) => {
    if (buildSlots.includes(numId)) return;
    setBuildSlots(prev => {
      const next = [...prev];
      const emptyIdx = next.findIndex(s => !s);
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = numId;
      return next;
    });
  };

  const removeSlot = (idx) => {
    setBuildSlots(prev => { const n = [...prev]; n[idx] = null; return n; });
    setBuildVariantPayload(null);
    setVariantPage(0);
  };

  const clearAll = () => {
    setBuildSlots([null, null, null, null]);
    setBuildVariantPayload(null);
    setVariantPage(0);
  };

  // ─── variant fetch ────────────────────────────────────────────────────────
  const handleGenerateVariants = async () => {
    if (!isReady || buildVariantLoading) return;
    const slotOrder = buildSlots.map(Number);
    setBuildVariantLoading(true);
    setBuildVariantPayload(null);
    setVariantPage(0);
    try {
      const authHeader = await getAuthHeader?.();
      const params = new URLSearchParams({ slot_order: slotOrder.join(',') });
      const res = await fetch(`/api/zone/variants?${params.toString()}`, {
        headers: authHeader ? { Authorization: authHeader } : undefined,
      });
      if (!res.ok) throw new Error('Variants request failed');
      const data = await res.json();
      setBuildVariantPayload(data);
    } catch {
      setBuildVariantPayload({ variants: [], error: true });
    } finally {
      setBuildVariantLoading(false);
    }
  };

  // ─── pagination ───────────────────────────────────────────────────────────
  const variants = buildVariantPayload?.variants || [];
  const totalPages = Math.max(1, Math.ceil(variants.length / VARIANTS_PER_PAGE));
  const pagedVariants = variants.slice(variantPage * VARIANTS_PER_PAGE, (variantPage + 1) * VARIANTS_PER_PAGE);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="theme-glass-card p-5 border-violet-500/20">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-white">Build Team</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Pick 4 chars → see Zone/Slot/Sum → generate variants</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── LEFT: Team builder ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Slot display */}
          <div className="theme-glass-card p-4 border-violet-500/15">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Team Slots</p>
              {filledCount > 0 && (
                <button onClick={clearAll} className="text-[9px] font-black uppercase tracking-wide text-slate-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {buildSlots.map((charId, idx) => {
                const char = charId ? charactersByNumId?.get(Number(charId)) : null;
                return (
                  <div key={idx} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${char ? 'border-violet-500/40 bg-violet-950/20' : 'border-dashed border-slate-700 bg-slate-900/40'}`}>
                    {char ? (
                      <>
                        <img
                          src={char.image || `/images/characters/${charId}.webp`}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <p className="absolute bottom-1 left-0 right-0 text-center text-[7px] font-black text-white leading-none px-1 truncate">{char.name}</p>
                        <button onClick={() => removeSlot(idx)} className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/60 transition-colors cursor-pointer">
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </>
                    ) : (
                      <Plus className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live XOR/SLOT/SUM pills */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Zone (XOR)', value: buildTeamSignature?.xor ?? '--', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20' },
                { label: 'Slot', value: buildTeamSignature?.slot ?? '--', color: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20' },
                { label: 'Team (SUM)', value: buildTeamSignature?.sum ?? '--', color: 'text-violet-400 border-violet-500/20 bg-violet-950/20' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-lg border p-2 text-center ${color}`}>
                  <p className="text-[8px] font-black uppercase tracking-wider opacity-70 leading-none">{label}</p>
                  <p className="text-lg font-black leading-tight mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {buildTeamSignature && (
              <p className="text-[9px] text-slate-500 text-center mt-2 font-mono">Key: {buildTeamSignature.xorSlotKey}</p>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateVariants}
            disabled={!isReady || buildVariantLoading}
            className="w-full px-4 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-[11px] font-black uppercase tracking-widest text-violet-100 hover:bg-violet-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            {buildVariantLoading ? 'Generating Variants…' : isReady ? 'Generate Variants' : `Pick ${4 - filledCount} more char${4 - filledCount !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* ── RIGHT: Character roster ────────────────────────────────────── */}
        <div className="theme-glass-card p-4 border-slate-800/60">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex-1">Characters</p>
            <span className="text-[9px] text-slate-500">{filledCount}/4 selected</span>
          </div>
          <input
            type="text"
            placeholder="Search character…"
            value={charSearch}
            onChange={e => setCharSearch(e.target.value)}
            className="w-full mb-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-violet-500/50 placeholder:text-slate-600"
          />
          <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {filteredChars.map(char => {
              const isSelected = buildSlots.includes(char.numId);
              const isOwned = ownedSet?.has?.(Number(char.numId));
              return (
                <button
                  key={char.numId}
                  onClick={() => isSelected ? null : addToSlot(char.numId)}
                  disabled={isSelected || filledCount === 4}
                  className={`relative flex flex-col items-center gap-1 p-1 rounded-lg border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'border-violet-500/50 bg-violet-950/30 opacity-60 cursor-default'
                      : filledCount === 4
                        ? 'border-slate-800 opacity-40 cursor-default'
                        : isOwned
                          ? 'border-slate-700 bg-slate-900/40 hover:border-violet-500/40 hover:bg-violet-950/20'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center">
                    <img
                      src={char.image || `/images/characters/${char.numId}.webp`}
                      alt={char.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-[7px] font-bold text-slate-300 leading-none truncate w-full px-0.5">{char.name}</p>
                  {isSelected && (
                    <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-violet-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Variants results ──────────────────────────────────────────────── */}
      {buildVariantPayload && (
        <div className="theme-glass-card p-5 border-indigo-500/20 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Variant Teams
              </p>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[9px] font-black text-indigo-300">
                {variants.length}
              </span>
            </div>
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVariantPage(p => Math.max(0, p - 1))}
                  disabled={variantPage === 0}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-black text-slate-400 min-w-[60px] text-center">
                  {variantPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setVariantPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={variantPage >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {variants.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-4">No variant teams found for this composition.</p>
          ) : (
            <div className="space-y-2">
              {pagedVariants.map((v, i) => {
                const charIds = Array.isArray(v.slot_order) ? v.slot_order : [];
                const names = Array.isArray(v.char_names) ? v.char_names : charIds.map(id => {
                  const c = charactersByNumId?.get(Number(id));
                  return c?.name || `#${id}`;
                });
                return (
                  <div
                    key={`bv-${i}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between gap-3 group hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Char images */}
                      <div className="flex -space-x-1.5 shrink-0">
                        {charIds.slice(0, 4).map((id, ci) => {
                          const ch = charactersByNumId?.get(Number(id));
                          return (
                            <div key={ci} className="w-8 h-8 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800 shrink-0">
                              <img
                                src={ch?.image || `/images/characters/${id}.webp`}
                                alt={ch?.name || ''}
                                className="w-full h-full object-cover object-top"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-200 leading-tight truncate">{names.join(' / ')}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-indigo-300 font-bold">{v.seen_char_ids?.length ?? charIds.length} chars known</span>
                          {v.observed_runs > 0 && (
                            <span className="text-[8px] text-slate-500">• {v.observed_runs} runs • Crit {formatRate(v.observed_crit_rate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Zone pills */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.xor_slot_key && (
                        <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[8px] font-black text-slate-300 font-mono">{v.xor_slot_key}</span>
                      )}
                      <button
                        onClick={() => {
                          setSlots?.(charIds.map(val => Number(val) || null));
                          setSuccess?.('Variant team loaded into Logger.');
                        }}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-[8px] font-black uppercase text-violet-300 hover:bg-violet-500/40 transition-all cursor-pointer"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
