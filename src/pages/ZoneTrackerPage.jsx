import React, { useCallback, useEffect, useMemo, useState } from 'react';
import charactersData from '../data/characters.json';
import { HSR_CAVERNS } from '../constants/caverns';
import { useAuth } from '../hooks/useAuth';

const OUTCOME_OPTIONS = [
  { value: 'spd-double-crit', label: 'SPD + CR + CD' },
  { value: 'double-crit', label: 'CR + CD only' },
  { value: 'spd-one-crit', label: 'SPD + one crit' },
  { value: 'one-crit', label: 'One crit only' },
  { value: 'effect-junk', label: 'Effect junk' },
  { value: 'flat-junk', label: 'Flat junk' },
  { value: 'mixed', label: 'Mixed' },
];

const CONFIDENCE_STYLES = {
  HIGH: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  MEDIUM: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  LOW: 'border-slate-500/40 bg-slate-800/50 text-slate-200',
};

function formatRate(rate) {
  if (rate === null || rate === undefined) return '--';
  return `${Math.round(Number(rate) * 100)}%`;
}

function mapAuthError(error) {
  if (!error) return 'Unknown error';
  if (error.message?.includes('401')) return 'Authentication required. Please sign in again.';
  return error.message || 'Request failed';
}

export default function ZoneTrackerPage() {
  const { user, getAuthHeader } = useAuth();

  const [slots, setSlots] = useState([null, null, null, null]);
  const [dragIndex, setDragIndex] = useState(null);
  const [outcome, setOutcome] = useState('mixed');
  const [cavern, setCavern] = useState('');
  const [notes, setNotes] = useState('');
  const [flagNotes, setFlagNotes] = useState('');

  const [requestedEpoch, setRequestedEpoch] = useState('current');
  const [mapData, setMapData] = useState(null);

  const [loadingMap, setLoadingMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const charactersByNumId = useMemo(() => {
    return new Map((Array.isArray(charactersData) ? charactersData : []).map((entry) => [Number(entry.numId), entry]));
  }, []);

  const characterOptions = useMemo(() => {
    return [...(Array.isArray(charactersData) ? charactersData : [])].sort((a, b) => {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, []);

  const fetchMap = useCallback(
    async (epoch = 'current') => {
      setLoadingMap(true);
      setError('');

      try {
        const response = await fetch(`/api/zone/map?epoch=${encodeURIComponent(epoch)}`, {
          method: 'GET',
          headers: {
            ...getAuthHeader(),
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `HTTP ${response.status}`);
        }

        setMapData(payload);
        setRequestedEpoch(epoch);
      } catch (mapError) {
        setError(mapAuthError(mapError));
      } finally {
        setLoadingMap(false);
      }
    },
    [getAuthHeader]
  );

  const slotSummary = useMemo(() => {
    return slots
      .map((charId) => (charId ? charactersByNumId.get(Number(charId))?.name || `#${charId}` : 'Empty'))
      .join(' / ');
  }, [charactersByNumId, slots]);

  const setSlotAt = (slotIndex, nextValue) => {
    const parsed = Number(nextValue);
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      return next;
    });
  };

  const swapSlots = (fromIndex, toIndex) => {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    setSlots((prev) => {
      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[toIndex];
      next[toIndex] = temp;
      return next;
    });
  };

  const handleLoadZoneTeam = (zone) => {
    if (!Array.isArray(zone.sample_slot_order) || zone.sample_slot_order.length !== 4) return;
    setSlots(zone.sample_slot_order.map((value) => Number(value) || null));
    setSuccess(`Loaded team from zone ${zone.xor_slot_key}`);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (slots.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0)) {
      setError('Pick all 4 characters before submitting.');
      return;
    }

    const uniqueCount = new Set(slots.map((value) => Number(value))).size;
    if (uniqueCount !== 4) {
      setError('Team must contain 4 unique characters.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/zone/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          slot_order: slots.map((value) => Number(value)),
          outcome,
          cavern: cavern || null,
          notes: notes || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setSuccess('Run submitted. Zone map refreshed.');
      await fetchMap('current');
    } catch (submitError) {
      setError(mapAuthError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagEpoch = async () => {
    setError('');
    setSuccess('');
    setFlagging(true);

    try {
      const response = await fetch('/api/zone/flag-epoch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ notes: flagNotes || null }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      if (payload.did_rotate_epoch) {
        setSuccess('Epoch rotation confirmed. New epoch started.');
      } else if (payload.already_flagged) {
        setSuccess('You already flagged this epoch. Waiting for more confirmations.');
      } else {
        setSuccess('Epoch flag submitted.');
      }

      await fetchMap('current');
    } catch (flagError) {
      setError(mapAuthError(flagError));
    } finally {
      setFlagging(false);
    }
  };

  useEffect(() => {
    fetchMap('current');
  }, [fetchMap]);

  const currentEpoch = mapData?.current_epoch;
  const epoch = mapData?.epoch;
  const zones = Array.isArray(mapData?.zones) ? mapData.zones : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-500/25 bg-slate-900/45 p-5 text-slate-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide">Zone Tracker</h1>
            <p className="text-xs text-slate-400">
              Authenticated as <span className="text-indigo-200">{user?.user_metadata?.full_name || user?.email || user?.id}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchMap('current')}
              disabled={loadingMap}
              className="rounded-lg border border-slate-600/70 bg-slate-800/60 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-100"
            >
              {loadingMap && requestedEpoch === 'current' ? 'Loading...' : 'Load Current'}
            </button>
            <button
              type="button"
              onClick={() => fetchMap('previous')}
              disabled={loadingMap}
              className="rounded-lg border border-slate-600/70 bg-slate-800/60 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-100"
            >
              {loadingMap && requestedEpoch === 'previous' ? 'Loading...' : 'Load Previous'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/55 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Current Epoch</p>
            <p className="mt-1 text-sm font-bold text-slate-100">#{currentEpoch?.id || '--'}</p>
            <p className="text-[11px] text-slate-400">{currentEpoch?.calendar_week || 'Not initialized'}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/55 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Viewing</p>
            <p className="mt-1 text-sm font-bold text-slate-100">
              {requestedEpoch === 'previous' ? `Previous (#${epoch?.id || '--'})` : `Current (#${epoch?.id || '--'})`}
            </p>
            <p className="text-[11px] text-slate-400">{epoch?.calendar_week || 'No data'}</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/55 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pending Flags (48h)</p>
            <p className="mt-1 text-sm font-bold text-slate-100">{mapData?.pending_flag_count ?? '--'}</p>
            <p className="text-[11px] text-slate-400">Need 2 distinct users to rotate</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-5 text-slate-100 shadow-xl"
        >
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-indigo-200">Submit Run</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {slots.map((charId, slotIndex) => {
              const char = charId ? charactersByNumId.get(Number(charId)) : null;
              return (
                <div
                  key={`slot-${slotIndex}`}
                  className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    swapSlots(dragIndex, slotIndex);
                    setDragIndex(null);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Slot {slotIndex + 1}</span>
                    {char ? (
                      <button
                        type="button"
                        className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300"
                        onClick={() => setSlotAt(slotIndex, null)}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <div
                    draggable={Boolean(char)}
                    onDragStart={() => setDragIndex(slotIndex)}
                    onDragEnd={() => setDragIndex(null)}
                    className="mb-2 flex min-h-14 items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2 py-1.5"
                  >
                    {char?.image ? (
                      <img src={char.image} alt={char.name} className="h-10 w-10 rounded-md border border-slate-600/60 object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md border border-slate-600/60 bg-slate-800" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-100">{char?.name || 'No character selected'}</p>
                      <p className="text-[10px] text-slate-400">ID: {char?.numId || '-'}</p>
                    </div>
                  </div>

                  <select
                    value={charId || ''}
                    onChange={(event) => setSlotAt(slotIndex, event.target.value)}
                    className="w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="">Select character</option>
                    {characterOptions.map((entry) => (
                      <option key={entry.numId} value={entry.numId}>
                        {entry.name} ({entry.numId})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs text-slate-300">
            Team: {slotSummary}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Outcome</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {OUTCOME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOutcome(option.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-bold uppercase tracking-wide transition ${
                    outcome === option.value
                      ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                      : 'border-slate-600/70 bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Cavern (optional)
              <select
                value={cavern}
                onChange={(event) => setCavern(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
              >
                <option value="">None</option>
                {HSR_CAVERNS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Notes (optional, max 200)
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value.slice(0, 200))}
                className="mt-1 w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
                placeholder="Short note"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100"
          >
            {submitting ? 'Submitting...' : 'Submit Run'}
          </button>
        </form>

        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-5 text-slate-100 shadow-xl">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-indigo-200">Epoch Shift Flag</h2>
          <p className="mt-2 text-xs text-slate-300">
            Use only when you believe the zone changed. Distinct users required to rotate epoch.
          </p>

          <input
            type="text"
            value={flagNotes}
            onChange={(event) => setFlagNotes(event.target.value.slice(0, 200))}
            placeholder="Reason (optional)"
            className="mt-3 w-full rounded-lg border border-slate-600/70 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none"
          />

          <button
            type="button"
            onClick={handleFlagEpoch}
            disabled={flagging}
            className="mt-3 w-full rounded-lg border border-amber-400/45 bg-amber-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100"
          >
            {flagging ? 'Submitting Flag...' : 'Flag Epoch Shift'}
          </button>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">{error}</div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200">{success}</div>
          ) : null}
        </section>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-5 text-slate-100 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-indigo-200">Zone Map</h2>
          <p className="text-xs text-slate-400">Total runs: {mapData?.total_runs ?? '--'}</p>
        </div>

        {!mapData ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/45 p-4 text-sm text-slate-300">
            Load current or previous epoch map to begin.
          </div>
        ) : zones.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/45 p-4 text-sm text-slate-300">
            No submissions for this epoch yet.
          </div>
        ) : (
          <div className="space-y-3">
            {zones.map((zone, index) => (
              <div
                key={zone.xor_slot_key}
                className="rounded-xl border border-slate-700/60 bg-slate-800/45 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Rank #{index + 1}</p>
                    <h3 className="text-sm font-bold text-slate-100">Zone {zone.xor_slot_key}</h3>
                    <p className="text-[11px] text-slate-400">
                      XOR {zone.char_xor} | SLOT {zone.char_slot} | SUM {zone.char_sum}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${CONFIDENCE_STYLES[zone.confidence] || CONFIDENCE_STYLES.LOW}`}>
                      {zone.confidence}
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                      Crit {formatRate(zone.crit_rate)}
                    </span>
                    <span className="rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                      Runs {zone.runs}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Sample Team</p>
                  <p>{(zone.sample_char_names || []).join(' / ') || '-'}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadZoneTeam(zone)}
                  className="mt-3 rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-100"
                >
                  Load Team To Form
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
