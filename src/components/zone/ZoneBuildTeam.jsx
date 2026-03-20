import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Users, Plus, X, ChevronLeft, ChevronRight, Shuffle, Target } from 'lucide-react';
import { formatRate } from '../../hooks/useZoneTracker';

const VARIANTS_PER_PAGE = 8;
const NEARBY_PER_PAGE = 8;
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

function CharacterBubble({ char, charId, tooltip, selected = false, disabled = false, onClick, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      {...rest}
      className={`group relative h-16 w-16 cursor-pointer transition-all ${disabled ? 'cursor-default opacity-40' : 'hover:scale-105'} ${selected ? 'opacity-55' : ''}`}
    >
      <div className={`w-full h-full rounded-full overflow-hidden bg-slate-800 ${selected ? 'ring-2 ring-violet-400/70 ring-offset-2 ring-offset-slate-950' : 'ring-1 ring-slate-700/70 hover:ring-violet-400/50'}`}>
        <CharacterAvatar char={char} charId={charId} className="w-full h-full object-cover object-top rounded-full" fallbackClassName="rounded-full text-sm" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-1 text-[10px] font-bold text-slate-100 opacity-0 shadow-xl transition-all duration-150 group-hover:opacity-100 whitespace-nowrap">
        {tooltip}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
      </div>
      {selected ? (
        <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-white/50 bg-violet-500" />
      ) : null}
    </button>
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
  variantOwnershipFilter,
  setVariantOwnershipFilter,
  variantMinOwned,
  setVariantMinOwned,
  setSlots,
  setSuccess,
  getAuthHeader,
}) {
  const shellRef = useRef(null);
  const slotsGridRef = useRef(null);
  const rosterGridRef = useRef(null);
  const generateButtonRef = useRef(null);
  const resultsPanelRef = useRef(null);
  const previousBuildSlotsRef = useRef('');
  const [charSearch, setCharSearch] = useState('');
  const [buildMode, setBuildMode] = useState('exact');
  const [variantPage, setVariantPage] = useState(0);
  const [nearbyPage, setNearbyPage] = useState(0);
  const [resultsView, setResultsView] = useState('list');
  const [enforceTeamSum, setEnforceTeamSum] = useState(false);
  const [enforceNearbySum, setEnforceNearbySum] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(100);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState(null);
  const lastSyncedSignatureRef = useRef('');

  const [manualXor, setManualXor] = useState('');
  const [manualSlot, setManualSlot] = useState('');
  const [manualSum, setManualSum] = useState('');
  const [nearbyPayload, setNearbyPayload] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);

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

  useEffect(() => {
    if (!shellRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        '[data-build-animate="hero"]',
        { opacity: 0, y: 36, scale: 0.96, filter: 'blur(10px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out' }
      ).fromTo(
        '[data-build-animate="panel"]',
        { opacity: 0, y: 44, rotateX: -10, transformOrigin: 'top center', filter: 'blur(8px)' },
        { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: 0.72, ease: 'power3.out', stagger: 0.1 },
        '-=0.45'
      );

      gsap.to('[data-build-float="hero-icon"]', {
        y: -5,
        duration: 2.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }, shellRef);

    return () => ctx.revert();
  }, []);

  const filledCount = buildSlots.filter(Boolean).length;
  const isReady = filledCount === 4;

  const filteredChars = useMemo(() => {
    const q = charSearch.toLowerCase().trim();
    return (characterOptions || []).filter((c) =>
      !q || c.name?.toLowerCase().includes(q) || String(c.numId || '').includes(q)
    );
  }, [characterOptions, charSearch]);

  useEffect(() => {
    if (!rosterGridRef.current) return;
    const nodes = rosterGridRef.current.querySelectorAll('[data-build-char]');
    gsap.fromTo(
      nodes,
      { scale: 0.65, opacity: 0, y: 14, rotate: -10, filter: 'blur(8px)' },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: 0,
        filter: 'blur(0px)',
        duration: 0.5,
        ease: 'back.out(1.6)',
        stagger: {
          each: 0.012,
          from: 'random',
        },
        clearProps: 'opacity,transform,filter',
      }
    );
  }, [charSearch, filteredChars.length]);

  useEffect(() => {
    if (!generateButtonRef.current) return;
    if (!isReady && !(manualXor && manualSlot)) {
      gsap.killTweensOf(generateButtonRef.current);
      gsap.set(generateButtonRef.current, { clearProps: 'boxShadow,scale' });
      return;
    }

    gsap.to(generateButtonRef.current, {
      boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.0), 0 0 28px rgba(139, 92, 246, 0.28)',
      scale: 1.01,
      duration: 1.15,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
  }, [isReady, manualSlot, manualXor]);

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

  const handleSlotDragStart = (index) => {
    if (!buildSlots[index]) return;
    setDraggedSlotIndex(index);
  };

  const handleSlotDragEnd = () => {
    setDraggedSlotIndex(null);
    setDragOverSlotIndex(null);
  };

  const handleSlotDrop = (targetIndex) => {
    if (draggedSlotIndex === null || draggedSlotIndex === targetIndex) {
      setDragOverSlotIndex(null);
      return;
    }

    setBuildSlots((prev) => {
      const next = [...prev];
      const draggedValue = next[draggedSlotIndex];
      const targetValue = next[targetIndex];
      next[targetIndex] = draggedValue;
      next[draggedSlotIndex] = targetValue;
      return next;
    });

    setDraggedSlotIndex(null);
    setDragOverSlotIndex(null);
    setBuildVariantPayload(null);
    setVariantPage(0);
  };

  const clearAll = () => {
    setBuildSlots([null, null, null, null]);
    setBuildVariantPayload(null);
    setNearbyPayload(null);
    setVariantPage(0);
    setNearbyPage(0);
  };

  const runExactMatchSearch = async (overrides = {}) => {
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

      const targetXor = Number.isInteger(overrides.xor) ? overrides.xor : (Number.isInteger(xor) ? xor : fallbackXor);
      const targetSlot = Number.isInteger(overrides.slot) ? overrides.slot : (Number.isInteger(slot) ? slot : fallbackSlot);
      const targetSum = Number.isInteger(overrides.sum) ? overrides.sum : (Number.isInteger(sum) ? sum : fallbackSum);

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

      const useOwned = variantOwnershipFilter === 'owned';
      params.append('use_owned', useOwned ? 'true' : 'false');
      params.append('min_owned', useOwned ? String(variantMinOwned) : '0');
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

  const handleGenerateVariants = async () => {
    await runExactMatchSearch();
  };

  const handleScanNearbyZones = async () => {
    if (nearbyLoading) return;

    try {
      const authHeaders = getAuthHeader?.() || {};
      const xor = parseIntegerMaybe(manualXor) ?? buildTeamSignature?.xor ?? null;
      if (!Number.isInteger(xor)) {
        throw new Error('Zone is required to scan nearby zones.');
      }

      setNearbyLoading(true);
      setNearbyPayload(null);
      setNearbyPage(0);

      const params = new URLSearchParams({
        xor: String(xor),
        radius: String(nearbyRadius),
        limit: '24',
      });
      const sum = parseIntegerMaybe(manualSum) ?? buildTeamSignature?.sum ?? null;
      if (enforceNearbySum && Number.isInteger(sum)) {
        params.append('sum', String(sum));
        params.append('enforce_sum', 'true');
      }

      const res = await fetch(`/api/zone/nearby?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Nearby zones request failed');
      }
      setNearbyPayload(data);
    } catch (err) {
      console.error('Nearby zones error:', err);
      setNearbyPayload({
        zones: [],
        error: true,
        errorMessage: err?.message || 'Nearby zones scan failed.',
      });
    } finally {
      setNearbyLoading(false);
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
  const nearbyZones = nearbyPayload?.zones || [];
  const nearbyTotalPages = Math.max(1, Math.ceil(nearbyZones.length / NEARBY_PER_PAGE));
  const pagedNearbyZones = nearbyZones.slice(nearbyPage * NEARBY_PER_PAGE, (nearbyPage + 1) * NEARBY_PER_PAGE);

  useEffect(() => {
    if (!slotsGridRef.current) return;
    const slotNodes = slotsGridRef.current.querySelectorAll('[data-build-slot]');
    const nextSignature = buildSlots.map((value) => (value ? String(value) : '0')).join(',');
    const changed = previousBuildSlotsRef.current !== nextSignature;
    previousBuildSlotsRef.current = nextSignature;

    if (!changed) return;

    gsap.fromTo(
      slotNodes,
      { scale: 0.84, opacity: 0.45, y: 18, rotateY: 18, filter: 'brightness(1.25)' },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        rotateY: 0,
        filter: 'brightness(1)',
        duration: 0.55,
        ease: 'back.out(1.45)',
        stagger: 0.05,
        clearProps: 'opacity,transform,filter',
      }
    );
  }, [buildSlots]);

  useEffect(() => {
    if (!resultsPanelRef.current || (!buildVariantPayload && !nearbyPayload)) return;
    const cards = resultsPanelRef.current.querySelectorAll('[data-build-result-card]');
    if (!cards.length) return;

    const tl = gsap.timeline();
    tl.fromTo(
      resultsPanelRef.current,
      { opacity: 0, y: 30, scale: 0.985, filter: 'blur(10px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' }
    ).fromTo(
      cards,
      { opacity: 0, y: 36, rotateX: -12, scale: 0.94, transformOrigin: 'top center' },
      { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.6, ease: 'back.out(1.3)', stagger: 0.06 },
      '-=0.2'
    );
  }, [buildVariantPayload, nearbyPayload, resultsView, variantPage, nearbyPage, buildMode]);

  if (workspaceView !== 'build') return null;

  return (
    <div ref={shellRef} className="space-y-6 animate-in fade-in duration-500">
      <div data-build-animate="hero" className="theme-glass-card p-5 border-violet-500/20">
        <div className="flex items-center gap-3 mb-1">
          <div data-build-float="hero-icon" className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-white">Build Team</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Pick 4 chars {'->'} see Zone/Slot/Sum {'->'} generate teams</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => setBuildMode('exact')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${buildMode === 'exact' ? 'bg-violet-500/20 border border-violet-500/30 text-violet-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Exact Match
          </button>
          <button
            type="button"
            onClick={() => setBuildMode('nearby')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${buildMode === 'nearby' ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Nearby Zones
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div data-build-animate="panel" className="theme-glass-card p-4 border-violet-500/15">
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

            <div ref={slotsGridRef} className="grid grid-cols-4 gap-2 mb-4">
              {buildSlots.map((charId, idx) => {
                const char = charId ? charactersByNumId?.get(Number(charId)) : null;
                return (
                  <div
                    key={idx}
                    data-build-slot
                    draggable={Boolean(charId)}
                    onDragStart={() => handleSlotDragStart(idx)}
                    onDragEnd={handleSlotDragEnd}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedSlotIndex !== null) setDragOverSlotIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverSlotIndex === idx) setDragOverSlotIndex(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleSlotDrop(idx);
                    }}
                    className={`relative aspect-square rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all ${char ? 'border-violet-500/40 bg-violet-950/20 cursor-grab active:cursor-grabbing' : 'border-dashed border-slate-700 bg-slate-900/40'
                      } ${dragOverSlotIndex === idx ? 'scale-[1.03] border-cyan-300/70 shadow-[0_0_22px_rgba(34,211,238,0.18)]' : ''} ${draggedSlotIndex === idx ? 'opacity-70 scale-[0.98]' : ''}`}
                  >
                    {char ? (
                      <>
                        <CharacterAvatar char={char} charId={charId} className="w-full h-full object-cover object-top" fallbackClassName="text-3xl" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <p className="absolute bottom-1 left-0 right-0 text-center text-[7px] font-black text-white leading-none px-1 truncate">{char.name}</p>
                        <button
                          type="button"
                          onClick={() => removeSlot(idx)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full border border-white/10 bg-black/70 flex items-center justify-center hover:bg-red-500/70 transition-colors cursor-pointer z-10 shadow-lg"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
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

            {buildMode === 'exact' ? (
              <label className="mt-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enforceTeamSum}
                  onChange={(e) => setEnforceTeamSum(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500/40"
                />
                Lock Team Sum
              </label>
            ) : (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Zone Radius</span>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-black text-cyan-200">
                    ±{nearbyRadius}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={nearbyRadius}
                  onChange={(event) => setNearbyRadius(Number(event.target.value))}
                  className="mt-3 w-full accent-cyan-400 cursor-pointer"
                  aria-label="Nearby zone radius"
                />
                <div className="mt-1 flex items-center justify-between text-[7px] font-mono text-slate-500">
                  <span>10</span>
                  <span>500</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnforceNearbySum((current) => !current)}
                    className={enforceNearbySum
                      ? 'px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-[10px] font-black uppercase tracking-widest text-violet-100'
                      : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500'}
                  >
                    {enforceNearbySum ? 'Lock Team Sum' : 'Team Sum Unlocked'}
                  </button>
                  <span className="text-[9px] text-slate-500">
                    {enforceNearbySum ? `Only nearby zones with team ${activeTargetSum ?? '--'}` : 'Nearby scan ignores team sum'}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Owned Filter</span>
              <button
                type="button"
                onClick={() => setVariantOwnershipFilter?.('all')}
                className={variantOwnershipFilter === 'all' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
              >
                Ignore Owned
              </button>
              <button
                type="button"
                onClick={() => setVariantOwnershipFilter?.('owned')}
                className={variantOwnershipFilter === 'owned' ? 'px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-black uppercase tracking-widest text-cyan-100 cursor-pointer' : 'px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-slate-500 cursor-pointer'}
              >
                Use Owned Roster
              </button>
              {variantOwnershipFilter === 'owned' ? (
                <>
                  <input
                    type="range"
                    min={3}
                    max={4}
                    step={1}
                    value={variantMinOwned}
                    onChange={(event) => setVariantMinOwned?.(Number(event.target.value) === 4 ? 4 : 3)}
                    className="w-28 accent-cyan-400 cursor-pointer"
                    aria-label="Minimum owned characters"
                  />
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-300">
                    Min {variantMinOwned} Owned
                  </span>
                  <span className="text-[9px] text-slate-500">3 = friend support allowed</span>
                </>
              ) : null}
            </div>
          </div>

          <button
            ref={generateButtonRef}
            onClick={buildMode === 'exact' ? handleGenerateVariants : handleScanNearbyZones}
            disabled={(!isReady && !manualXor && !manualSlot) || buildVariantLoading}
            className="w-full px-4 py-3 rounded-xl bg-violet-500/15 border border-violet-500/30 text-[11px] font-black uppercase tracking-widest text-violet-100 hover:bg-violet-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            {buildMode === 'exact'
              ? (buildVariantLoading ? 'Generating Teams...' : (isReady || (manualXor && manualSlot)) ? 'Generate Teams' : `Pick ${4 - filledCount} more char${4 - filledCount !== 1 ? 's' : ''}`)
              : (nearbyLoading ? 'Scanning Nearby Zones...' : Number.isInteger(activeTargetXor) ? 'Scan Nearby Zones' : 'Zone Required')}
          </button>
        </div>

        <div data-build-animate="panel" className="theme-glass-card p-4 border-slate-800/60">
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
          <div ref={rosterGridRef} className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-2 justify-items-center">
            {filteredChars.map((char) => {
              const isSelected = buildSlots.includes(char.numId);
              return (
                <CharacterBubble
                  key={char.numId}
                  data-build-char
                  char={char}
                  charId={char.numId}
                  tooltip={char.name}
                  selected={isSelected}
                  disabled={isSelected || filledCount === 4}
                  onClick={() => (isSelected ? null : addToSlot(char.numId))}
                />
              );
            })}
          </div>
        </div>
      </div>

      {((buildMode === 'exact' && buildVariantPayload) || (buildMode === 'nearby' && nearbyPayload)) && (
        <div ref={resultsPanelRef} className="theme-glass-card p-5 border-indigo-500/20 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{buildMode === 'exact' ? 'Matching Teams' : 'Nearby Zones'}</p>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[9px] font-black text-indigo-300">
                {buildMode === 'exact' ? sortedVariants.length : nearbyZones.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {buildMode === 'exact' ? (
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                  <button
                    type="button"
                    onClick={() => setResultsView('list')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${resultsView === 'list'
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsView('grid')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${resultsView === 'grid'
                      ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    Grid
                  </button>
                </div>
              ) : null}
              {(buildMode === 'exact' ? totalPages > 1 : nearbyTotalPages > 1) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => buildMode === 'exact' ? setVariantPage((p) => Math.max(0, p - 1)) : setNearbyPage((p) => Math.max(0, p - 1))}
                    disabled={buildMode === 'exact' ? variantPage === 0 : nearbyPage === 0}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-black text-slate-400 min-w-[60px] text-center">
                    {(buildMode === 'exact' ? variantPage : nearbyPage) + 1} / {buildMode === 'exact' ? totalPages : nearbyTotalPages}
                  </span>
                  <button
                    onClick={() => buildMode === 'exact' ? setVariantPage((p) => Math.min(totalPages - 1, p + 1)) : setNearbyPage((p) => Math.min(nearbyTotalPages - 1, p + 1))}
                    disabled={buildMode === 'exact' ? variantPage >= totalPages - 1 : nearbyPage >= nearbyTotalPages - 1}
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
            {buildMode === 'exact' ? (
              <>
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
              </>
            ) : (
              <>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-300">
                  Zone radius ±{nearbyRadius}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-400">
                  {enforceNearbySum ? `Team ${activeTargetSum ?? '--'} locked` : 'Team sum unlocked'}
                  </span>
                  {nearbyPayload?.resolved_epoch_source === 'previous_fallback' ? (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[10px] font-black text-amber-200">
                      Using previous week data
                    </span>
                  ) : null}
                </>
              )}
            </div>

          {buildMode === 'exact' && sortedVariants.length === 0 ? (
            <div className="py-5 text-center space-y-2">
              <p className="text-[11px] text-slate-400 font-bold">No exact teams found for this Zone + Slot target.</p>
              <p className="text-[10px] text-slate-500">A small slot move can drop to zero because this search is exact.</p>
              <p className="text-[10px] text-slate-500">
                {buildVariantPayload?.errorMessage || 'Try moving slot back a bit, changing zone, or leaving team sum unlocked.'}
              </p>
            </div>
          ) : buildMode === 'exact' ? (
            <div className={resultsView === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
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
                    data-build-result-card
                    className={`rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-all ${resultsView === 'grid' ? 'flex flex-col gap-3' : 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center'
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

                    <div className={`flex flex-col gap-2 ${resultsView === 'grid' ? '' : 'lg:items-end lg:text-right'}`}>
                      <div className={`flex flex-wrap gap-2 ${resultsView === 'grid' ? '' : 'lg:justify-end'}`}>
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-200">
                          Team match {comparison.rosterPct}%
                        </span>
                        {zoneKey && (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-300 font-mono">
                            {zoneKey}
                          </span>
                        )}
                      </div>

                      <div className={`text-[11px] text-slate-300 ${resultsView === 'grid' ? '' : 'lg:text-right'}`}>
                        Zone <span className="font-black text-cyan-200">{Number(v?.char_xor ?? 0)}</span>
                        {' '}• Slot <span className="font-black text-indigo-200">{Number(v?.char_slot ?? 0)}</span>
                        {' '}• Team <span className="font-black text-violet-200">{Number(v?.char_sum ?? 0)}</span>
                      </div>

                      <p className={`text-[10px] text-slate-400 ${resultsView === 'grid' ? '' : 'lg:text-right'}`}>
                        {guidanceText}
                      </p>

                      <p className={`text-[10px] text-slate-500 ${resultsView === 'grid' ? '' : 'lg:text-right'}`}>
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
                        className={`px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-[10px] font-black uppercase tracking-wide text-violet-200 hover:bg-violet-500/40 transition-all cursor-pointer ${resultsView === 'grid' ? 'self-start' : ''
                          }`}
                      >
                        Load Team
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            ) : nearbyZones.length === 0 ? (
              <div className="py-5 text-center space-y-2">
              <p className="text-[11px] text-slate-400 font-bold">No nearby zones found in this zone radius.</p>
              <p className="text-[10px] text-slate-500">
                {nearbyPayload?.errorMessage || 'Try a larger radius, unlock team sum, or wait for more current-week reports.'}
              </p>
              </div>
            ) : (
            <div className="space-y-2">
              {pagedNearbyZones.map((zone, i) => {
                const charIds = Array.isArray(zone?.sample_slot_order) ? zone.sample_slot_order : [];
                const names = Array.isArray(zone?.sample_char_names) && zone.sample_char_names.length > 0
                  ? zone.sample_char_names
                  : charIds.map((id) => charactersByNumId?.get(Number(id))?.name || `#${id}`);
                const diffLabel = zone?.xor_diff === 0 ? 'Exact zone' : `Zone ±${zone?.xor_diff ?? '--'}`;
                const zoneKey = zone?.xor_slot_key || `${zone?.char_xor}_${zone?.char_slot}`;

                return (
                  <div
                    key={`nearby-zone-${zoneKey}-${i}`}
                    data-build-result-card
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-cyan-500/30 hover:bg-cyan-950/10 transition-all flex items-center justify-between gap-3"
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
                          <span className="text-[10px] text-cyan-300 font-bold">{diffLabel}</span>
                          <span className="text-[10px] text-slate-500">• {zone?.runs ?? 0} runs</span>
                          <span className="text-[10px] text-slate-500">• Crit {formatRate(zone?.crit_rate)}</span>
                          <span className="text-[10px] text-slate-500">• {zone?.seen_char_ids?.length ?? 0} chars seen</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 min-w-[330px]">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <span className="px-3 py-1.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-black text-cyan-200">
                          Zone {zone?.char_xor ?? '--'}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[10px] font-black text-indigo-200">
                          Slot {zone?.char_slot ?? '--'}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-violet-950/20 border border-violet-500/20 text-[10px] font-black text-violet-200">
                          Team {zone?.char_sum ?? '--'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 text-right max-w-[360px]">
                        Nearby zone discovery uses real logged zones, then sorts by closeness and report volume.
                      </p>
                      <button
                        onClick={async () => {
                          setBuildMode('exact');
                          setManualXor(String(zone?.char_xor ?? ''));
                          setManualSlot(String(zone?.char_slot ?? ''));
                          setManualSum(String(zone?.char_sum ?? ''));
                          await runExactMatchSearch({
                            xor: Number(zone?.char_xor ?? 0),
                            slot: Number(zone?.char_slot ?? 0),
                            sum: Number(zone?.char_sum ?? 0),
                          });
                        }}
                        className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/35 transition-all cursor-pointer"
                      >
                        View Exact Matches
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
