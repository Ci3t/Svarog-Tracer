import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Plus, X, ChevronLeft, ChevronRight, Shuffle, Target } from 'lucide-react';
import { formatRate } from '../../hooks/useZoneTracker';

const VARIANTS_PER_PAGE = 8;
const SLIDER_SPREAD = {
  xor: 128,
  slot: 400,
  sum: 320,
};

function parseIntegerMaybe(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildSliderBounds(anchorValue, currentValue, spread, max, min = 0) {
  const fallback = parseIntegerMaybe(anchorValue ?? currentValue);
  if (!Number.isInteger(fallback)) return null;

  const current = parseIntegerMaybe(currentValue) ?? fallback;
  const floor = clampValue(Math.min(fallback, current) - spread, min, max);
  const ceiling = clampValue(Math.max(fallback, current) + spread, min, max);

  return {
    anchor: fallback,
    current: clampValue(current, floor, ceiling),
    min: floor,
    max: Math.max(floor, ceiling),
  };
}

function CharacterAvatar({ char, charId, className = '', fallbackClassName = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = String(char?.name || charId || '?');
  const initial = name.slice(0, 1).toUpperCase();
  const imageSrc = char?.image || (charId ? `/images/characters/${charId}.webp` : '');

  if (!imageSrc || imageFailed) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-slate-800 text-slate-200 font-black uppercase ${fallbackClassName}`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={name}
      className={className}
      onError={() => setImageFailed(true)}
    />
  );
}

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
  const [resultsView, setResultsView] = useState('list');
  const [enforceTeamSum, setEnforceTeamSum] = useState(false);
  const lastSyncedSignatureRef = useRef('');

  const [manualXor, setManualXor] = useState('');
  const [manualSlot, setManualSlot] = useState('');
  const [manualSum, setManualSum] = useState('');

  useEffect(() => {
    const nextSignatureKey = buildTeamSignature
      ? `${buildTeamSignature.xor}_${buildTeamSignature.slot}_${buildTeamSignature.sum}`
      : '';

    if (nextSignatureKey === lastSyncedSignatureRef.current) return;
    lastSyncedSignatureRef.current = nextSignatureKey;

    if (buildTeamSignature) {
      setManualXor(String(buildTeamSignature.xor));
      setManualSlot(String(buildTeamSignature.slot));
      setManualSum(String(buildTeamSignature.sum));
    } else {
      setManualXor('');
      setManualSlot('');
      setManualSum('');
    }
  }, [buildTeamSignature]);

  const filledCount = buildSlots.filter(Boolean).length;
  const isReady = filledCount === 4;

  const filteredChars = useMemo(() => {
    const q = charSearch.toLowerCase().trim();
    return (characterOptions || []).filter((c) =>
      !q || c.name?.toLowerCase().includes(q) || String(c.numId || '').includes(q)
    );
  }, [characterOptions, charSearch]);

  const originalBuildSlots = useMemo(() => (
    buildSlots.map((value) => {
      const normalized = Number(value);
      return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
    })
  ), [buildSlots]);

  const originalRosterIds = useMemo(() => originalBuildSlots.filter(Boolean), [originalBuildSlots]);
  const originalRosterSet = useMemo(() => new Set(originalRosterIds), [originalRosterIds]);

  const activeTargetXor = parseIntegerMaybe(manualXor) ?? buildTeamSignature?.xor ?? null;
  const activeTargetSlot = parseIntegerMaybe(manualSlot) ?? buildTeamSignature?.slot ?? null;
  const activeTargetSum = parseIntegerMaybe(manualSum) ?? buildTeamSignature?.sum ?? null;

  const getComparisonStats = (charIds, variant) => {
    const candidateIds = (Array.isArray(charIds) ? charIds : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 4);

    const sharedChars = candidateIds.filter((charId) => originalRosterSet.has(charId)).length;
    const sameSlots = candidateIds.reduce((total, charId, index) => total + (originalBuildSlots[index] === charId ? 1 : 0), 0);
    const originalCount = originalRosterIds.length || 4;

    return {
      rosterPct: Math.round((sharedChars / originalCount) * 100),
      sharedChars,
      sameSlots,
      xorDiff: Number.isInteger(activeTargetXor) ? Math.abs(Number(variant?.char_xor ?? 0) - activeTargetXor) : null,
      slotDiff: Number.isInteger(activeTargetSlot) ? Math.abs(Number(variant?.char_slot ?? 0) - activeTargetSlot) : null,
      sumDiff: Number.isInteger(activeTargetSum) ? Math.abs(Number(variant?.char_sum ?? 0) - activeTargetSum) : null,
    };
  };

  const describeDistance = (label, diff, exactText, closeThreshold, mediumThreshold) => {
    if (!Number.isInteger(diff)) return `${label} distance unknown`;
    if (diff === 0) return exactText;
    if (diff <= closeThreshold) return `${label} is very close`;
    if (diff <= mediumThreshold) return `${label} is close`;
    return `${label} is far`;
  };

  const buildGuidanceText = (comparison) => {
    const parts = [
      describeDistance('Zone', comparison.xorDiff, 'Exact zone match', 3, 15),
      describeDistance('Slot', comparison.slotDiff, 'Exact slot match', 25, 120),
    ];

    if (enforceTeamSum) {
      parts.push(describeDistance('Team sum', comparison.sumDiff, 'Exact team sum match', 20, 120));
    } else if (Number.isInteger(comparison.sumDiff)) {
      if (comparison.sumDiff <= 40) parts.push('Team sum is very close');
      else if (comparison.sumDiff <= 180) parts.push('Team sum is close');
      else parts.push('Team sum is farther away');
    }

    return parts.join(' • ');
  };

  const statControls = [
    {
      key: 'zone',
      label: 'ZONE',
      value: manualXor,
      setter: setManualXor,
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
      slider: buildSliderBounds(buildTeamSignature?.xor, manualXor, SLIDER_SPREAD.xor, 99999),
    },
    {
      key: 'slot',
      label: 'SLOT',
      value: manualSlot,
      setter: setManualSlot,
      color: 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20',
      slider: buildSliderBounds(buildTeamSignature?.slot, manualSlot, SLIDER_SPREAD.slot, 9999),
    },
    {
      key: 'sum',
      label: 'TEAM',
      value: manualSum,
      setter: setManualSum,
      color: 'text-violet-400 border-violet-500/20 bg-violet-950/20',
      slider: buildSliderBounds(buildTeamSignature?.sum, manualSum, SLIDER_SPREAD.sum, 99999),
    },
  ];

  const addToSlot = (numId) => {
    if (buildSlots.includes(numId)) return;
    setBuildSlots((prev) => {
      const next = [...prev];
      const emptyIdx = next.findIndex((s) => !s);
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = numId;
      return next;
    });
  };

  const removeSlot = (idx) => {
    setBuildSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setBuildVariantPayload(null);
    setVariantPage(0);
  };

  const clearAll = () => {
    setBuildSlots([null, null, null, null]);
    setBuildVariantPayload(null);
    setVariantPage(0);
  };

  const handleGenerateVariants = async () => {
    if (buildVariantLoading) return;

    const slotOrder = buildSlots.map(Number);
    setBuildVariantLoading(true);
    setBuildVariantPayload(null);
    setVariantPage(0);

    try {
      const authHeaders = getAuthHeader?.() || {};

      const fallbackXor = buildTeamSignature?.xor;
      const fallbackSlot = buildTeamSignature?.slot;
      const fallbackSum = buildTeamSignature?.sum;

      const xor = parseIntegerMaybe(manualXor);
      const slot = parseIntegerMaybe(manualSlot);
      const sum = parseIntegerMaybe(manualSum);

      const targetXor = Number.isInteger(xor) ? xor : fallbackXor;
      const targetSlot = Number.isInteger(slot) ? slot : fallbackSlot;
      const targetSum = Number.isInteger(sum) ? sum : fallbackSum;

      if (!Number.isInteger(targetXor) || !Number.isInteger(targetSlot)) {
        throw new Error('Zone and slot are required to generate teams.');
      }

      const params = new URLSearchParams();
      if (slotOrder.filter((id) => id > 0).length === 4) {
        params.append('slot_order', slotOrder.join(','));
      }

      params.append('xor', String(targetXor));
      params.append('slot', String(targetSlot));

      if (enforceTeamSum && Number.isInteger(targetSum)) {
        params.append('sum', String(targetSum));
        params.append('enforce_sum', 'true');
      }

      params.append('use_owned', 'false');
      params.append('min_owned', '0');
      params.append('limit', '24');

      const res = await fetch(`/api/zone/variants?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Teams request failed');
      }
      setBuildVariantPayload(data);
    } catch (err) {
      console.error('Team generation error:', err);
      setBuildVariantPayload({
        variants: [],
        error: true,
        errorMessage: err?.message || 'Team generation failed.',
      });
    } finally {
      setBuildVariantLoading(false);
    }
  };

  const variants = buildVariantPayload?.variants || [];
  const sortedVariants = useMemo(() => {
    return [...variants].sort((a, b) => {
      const aComp = getComparisonStats(a?.slot_order, a);
      const bComp = getComparisonStats(b?.slot_order, b);

      if (aComp.sameSlots !== bComp.sameSlots) return bComp.sameSlots - aComp.sameSlots;
      if (aComp.sharedChars !== bComp.sharedChars) return bComp.sharedChars - aComp.sharedChars;
      if ((aComp.slotDiff ?? Number.MAX_SAFE_INTEGER) !== (bComp.slotDiff ?? Number.MAX_SAFE_INTEGER)) {
        return (aComp.slotDiff ?? Number.MAX_SAFE_INTEGER) - (bComp.slotDiff ?? Number.MAX_SAFE_INTEGER);
      }
      if ((aComp.xorDiff ?? Number.MAX_SAFE_INTEGER) !== (bComp.xorDiff ?? Number.MAX_SAFE_INTEGER)) {
        return (aComp.xorDiff ?? Number.MAX_SAFE_INTEGER) - (bComp.xorDiff ?? Number.MAX_SAFE_INTEGER);
      }
      if ((aComp.sumDiff ?? Number.MAX_SAFE_INTEGER) !== (bComp.sumDiff ?? Number.MAX_SAFE_INTEGER)) {
        return (aComp.sumDiff ?? Number.MAX_SAFE_INTEGER) - (bComp.sumDiff ?? Number.MAX_SAFE_INTEGER);
      }
      return (b?.observed_runs ?? 0) - (a?.observed_runs ?? 0);
    });
  }, [variants, activeTargetSlot, activeTargetSum, activeTargetXor, originalBuildSlots, originalRosterIds, originalRosterSet]);

  const totalPages = Math.max(1, Math.ceil(sortedVariants.length / VARIANTS_PER_PAGE));
  const pagedVariants = sortedVariants.slice(variantPage * VARIANTS_PER_PAGE, (variantPage + 1) * VARIANTS_PER_PAGE);

  if (workspaceView !== 'build') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="theme-glass-card p-5 border-violet-500/20">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-white">Build Team</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Pick 4 chars {'->'} see Zone/Slot/Sum {'->'} generate teams</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="theme-glass-card p-4 border-violet-500/15">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Team Slots</p>
              {filledCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[9px] font-black uppercase tracking-wide text-slate-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {buildSlots.map((charId, idx) => {
                const char = charId ? charactersByNumId?.get(Number(charId)) : null;
                return (
                  <div
                    key={idx}
                    className={`relative aspect-square rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${
                      char ? 'border-violet-500/40 bg-violet-950/20' : 'border-dashed border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    {char ? (
                      <>
                        <CharacterAvatar char={char} charId={charId} className="w-full h-full object-cover object-top" fallbackClassName="text-3xl" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <p className="absolute bottom-1 left-0 right-0 text-center text-[7px] font-black text-white leading-none px-1 truncate">{char.name}</p>
                        <button
                          onClick={() => removeSlot(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500/60 transition-colors cursor-pointer"
                        >
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

            <div className="grid grid-cols-3 gap-2">
              {statControls.map(({ key, label, value, setter, color, slider }) => (
                <div key={label} className={`rounded-lg border p-2 text-center transition-all focus-within:border-white/20 ${color}`}>
                  <p className="text-[8px] font-black uppercase tracking-wider opacity-70 leading-none mb-1">{label}</p>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full bg-transparent border-none text-center text-lg font-black leading-tight p-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="--"
                  />
                  {slider && (
                    <div className="mt-2">
                      <input
                        type="range"
                        min={slider.min}
                        max={slider.max}
                        step={1}
                        value={slider.current}
                        onChange={(e) => setter(e.target.value)}
                        className="w-full accent-violet-400 cursor-pointer"
                        aria-label={`${label} slider`}
                      />
                      <div className="mt-1 flex items-center justify-between text-[7px] font-mono opacity-60">
                        <span>{slider.min}</span>
                        <button
                          type="button"
                          onClick={() => setter(String(slider.anchor))}
                          className="uppercase tracking-wider hover:opacity-100 opacity-80"
                        >
                          Reset
                        </button>
                        <span>{slider.max}</span>
                      </div>
                    </div>
                  )}
                  {key === 'sum' && !enforceTeamSum && (
                    <p className="mt-1 text-[7px] uppercase tracking-wider opacity-60">Unlocked</p>
                  )}
                </div>
              ))}
            </div>

            {(manualXor && manualSlot) && (
              <p className="text-[9px] text-slate-500 text-center mt-2 font-mono">Key: {manualXor}_{manualSlot}</p>
            )}

            <label className="mt-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enforceTeamSum}
                onChange={(e) => setEnforceTeamSum(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500/40"
              />
              Lock Team Sum
            </label>
          </div>

          <button
            onClick={handleGenerateVariants}
            disabled={(!isReady && !manualXor && !manualSlot) || buildVariantLoading}
            className="w-full px-4 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-[11px] font-black uppercase tracking-widest text-violet-100 hover:bg-violet-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            {buildVariantLoading ? 'Generating Teams...' : (isReady || (manualXor && manualSlot)) ? 'Generate Teams' : `Pick ${4 - filledCount} more char${4 - filledCount !== 1 ? 's' : ''}`}
          </button>
        </div>

        <div className="theme-glass-card p-4 border-slate-800/60">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex-1">Characters</p>
            <span className="text-[9px] text-slate-500">{filledCount}/4 selected</span>
          </div>
          <input
            type="text"
            placeholder="Search character..."
            value={charSearch}
            onChange={(e) => setCharSearch(e.target.value)}
            className="w-full mb-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-violet-500/50 placeholder:text-slate-600"
          />
          <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {filteredChars.map((char) => {
              const isSelected = buildSlots.includes(char.numId);
              const isOwned = ownedSet?.has?.(Number(char.numId));
              return (
                <button
                  key={char.numId}
                  onClick={() => (isSelected ? null : addToSlot(char.numId))}
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
                    <CharacterAvatar char={char} charId={char.numId} className="w-full h-full object-cover object-top" fallbackClassName="text-sm rounded-lg" />
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

      {buildVariantPayload && (
        <div className="theme-glass-card p-5 border-indigo-500/20 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Matching Teams</p>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[9px] font-black text-indigo-300">
                {sortedVariants.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                <button
                  type="button"
                  onClick={() => setResultsView('list')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    resultsView === 'list'
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setResultsView('grid')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    resultsView === 'grid'
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Grid
                </button>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVariantPage((p) => Math.max(0, p - 1))}
                    disabled={variantPage === 0}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-black text-slate-400 min-w-[60px] text-center">
                    {variantPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setVariantPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={variantPage >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-black text-cyan-200">
              Zone {activeTargetXor ?? '--'}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[10px] font-black text-indigo-200">
              Slot {activeTargetSlot ?? '--'}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-violet-950/20 border border-violet-500/20 text-[10px] font-black text-violet-200">
              Team {activeTargetSum ?? '--'}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-300">
              Closest slot order first
            </span>
            {!enforceTeamSum && (
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400">
                Team sum unlocked
              </span>
            )}
          </div>

          {sortedVariants.length === 0 ? (
            <div className="py-5 text-center space-y-2">
              <p className="text-[11px] text-slate-400 font-bold">No exact teams found for this Zone + Slot target.</p>
              <p className="text-[10px] text-slate-500">A small slot move can drop to zero because this search is exact.</p>
              <p className="text-[10px] text-slate-500">
                {buildVariantPayload?.errorMessage || 'Try moving slot back a bit, changing zone, or leaving team sum unlocked.'}
              </p>
            </div>
          ) : (
            <div className={resultsView === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
              {pagedVariants.map((v, i) => {
                const charIds = Array.isArray(v.slot_order) ? v.slot_order : [];
                const names = Array.isArray(v.char_names) ? v.char_names : charIds.map((id) => {
                  const c = charactersByNumId?.get(Number(id));
                  return c?.name || `#${id}`;
                });
                const comparison = getComparisonStats(charIds, v);
                const zoneKey = v.xor_slot_key || (Number.isInteger(Number(v.char_xor)) && Number.isInteger(Number(v.char_slot)) ? `${v.char_xor}_${v.char_slot}` : '');
                const guidanceText = buildGuidanceText(comparison);

                return (
                  <div
                    key={`bv-${i}`}
                    className={`rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-all ${
                      resultsView === 'grid' ? 'flex flex-col gap-3' : 'flex items-center justify-between gap-3'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        {charIds.slice(0, 4).map((id, ci) => {
                          const ch = charactersByNumId?.get(Number(id));
                          return (
                            <div key={ci} className="w-11 h-11 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800 shrink-0">
                              <CharacterAvatar char={ch} charId={id} className="w-full h-full object-cover object-top" fallbackClassName="rounded-full text-sm" />
                            </div>
                          );
                        })}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-100 leading-tight truncate">{names.join(' / ')}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-indigo-300 font-bold">
                            {comparison.sameSlots}/4 same slots
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {comparison.sharedChars}/4 same characters
                          </span>
                          {v.observed_runs > 0 && (
                            <span className="text-[10px] text-slate-500">• {v.observed_runs} runs • Crit {formatRate(v.observed_crit_rate)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`flex flex-col gap-2 ${resultsView === 'grid' ? '' : 'items-end shrink-0 min-w-[320px]'}`}>
                      <div className={`flex flex-wrap gap-2 ${resultsView === 'grid' ? '' : 'justify-end max-w-[360px]'}`}>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-200">
                          Team match {comparison.rosterPct}%
                        </span>
                        {zoneKey && (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-300 font-mono">
                            {zoneKey}
                          </span>
                        )}
                      </div>

                      <div className={`text-[11px] text-slate-300 ${resultsView === 'grid' ? '' : 'text-right max-w-[360px]'}`}>
                        Zone <span className="font-black text-cyan-200">{Number(v?.char_xor ?? 0)}</span>
                        {' '}• Slot <span className="font-black text-indigo-200">{Number(v?.char_slot ?? 0)}</span>
                        {' '}• Team <span className="font-black text-violet-200">{Number(v?.char_sum ?? 0)}</span>
                      </div>

                      <p className={`text-[10px] text-slate-400 ${resultsView === 'grid' ? '' : 'text-right max-w-[360px]'}`}>
                        {guidanceText}
                      </p>

                      <p className={`text-[10px] text-slate-500 ${resultsView === 'grid' ? '' : 'text-right max-w-[360px]'}`}>
                        {comparison.slotDiff === 0 && comparison.xorDiff === 0 && comparison.sumDiff === 0
                          ? 'This is your exact target.'
                          : `Raw difference: zone ${comparison.xorDiff ?? '--'}, slot ${comparison.slotDiff ?? '--'}, team ${comparison.sumDiff ?? '--'}.`}
                      </p>

                      <button
                        onClick={() => {
                          const nextTeam = charIds.map((val) => Number(val) || null);
                          setBuildSlots?.(nextTeam);
                          setSuccess?.('Team loaded into Build Team.');
                        }}
                        className={`px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-[10px] font-black uppercase tracking-wide text-violet-200 hover:bg-violet-500/40 transition-all cursor-pointer ${
                          resultsView === 'grid' ? 'self-start' : ''
                        }`}
                      >
                        Load Team
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
