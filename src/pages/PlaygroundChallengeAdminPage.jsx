import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Dice5, ShieldCheck } from 'lucide-react';
import relicSets from '../data/relics.json';
import { useAuth } from '../hooks/useAuth';
import { getTierRules } from '../data/challengeScenarioFactory';
import { getChallengeSeedPool } from '../data/challengeSeedPools';
import { saveCustomChallengeScenario } from '../data/customChallengeStorage';
import { predictWithPairs } from '../utils/pairTransitionPredictor';
import { translateTo4 } from '../utils/stringHelpers';

const TIERS = ['new_player', 'beginner', 'intermediate', 'veteran', 'expert'];
const PIECES = ['Head', 'Hands', 'Body', 'Feet'];
const MAIN_STATS = ['FLAT HP', 'FLAT ATK', 'HP%', 'ATK%'];
const SUBSTATS = ['CRIT RATE', 'CRIT DMG', 'SPD', 'EFFECT HIT RATE', 'EFFECT RES', 'BREAK EFFECT', 'ATK%', 'HP%', 'FLAT HP', 'FLAT ATK'];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickRandomDifferent(pool, excluded = []) {
  const blocked = new Set(excluded);
  const candidates = pool.filter((entry) => !blocked.has(entry));
  return pickRandom(candidates.length > 0 ? candidates : pool);
}

function randomStatSet(count = 3, preferred = []) {
  const selected = [];
  preferred.forEach((value) => {
    if (SUBSTATS.includes(value) && !selected.includes(value)) selected.push(value);
  });
  while (selected.length < count) {
    const next = pickRandom(SUBSTATS);
    if (!selected.includes(next)) selected.push(next);
  }
  return selected.slice(0, count);
}

function createMission(kind = 'pairEach') {
  if (kind === 'monoLine') {
    return {
      type: 'monoLine',
      target: 'SPD',
      minHits: 3,
      junk: ['EFFECT HIT RATE', 'EFFECT RES', 'BREAK EFFECT'],
      maxJunk: 1,
    };
  }
  return {
    type: kind === 'pairCombined' ? 'dualCritCombined' : 'dualCrit',
    required: ['CRIT RATE', 'CRIT DMG'],
    minEach: 1,
    minCombined: 2,
    junk: ['EFFECT RES', 'BREAK EFFECT'],
    maxJunk: 1,
  };
}

function makeRelicDraft({ setNameHint, pieceLabel, mainStat, stats, orderLocked = true } = {}) {
  const setInfo = relicSets.find((entry) => entry.name === setNameHint) || relicSets[0];
  return {
    setNameHint: setInfo?.name || 'Musketeer of Wild Wheat',
    setImage: setInfo?.image || '',
    pieceLabel: pieceLabel || 'Body',
    mainStat: mainStat || 'FLAT HP',
    selectedStats: randomStatSet(3, stats || []),
    orderLocked,
  };
}

function makeForceDraft(baseLines = 2) {
  const setInfo = pickRandom(relicSets) || relicSets[0];
  const lines = randomStatSet(3, ['HP%', 'SPD', 'BREAK EFFECT']);
  const full = [lines[0], lines[1], lines[2], 'BREAK EFFECT'];
  full[Math.min(baseLines, 3)] = 'OPEN LINE';
  return {
    setNameHint: setInfo?.name || 'Musketeer of Wild Wheat',
    setImage: setInfo?.image || '',
    pieceLabel: pickRandom(PIECES),
    mainStat: pickRandom(MAIN_STATS),
    baseLines,
    lines: full,
  };
}

function makeDraft(tier = 'beginner') {
  const firstSeed = getChallengeSeedPool(tier)[0];
  const tierRules = getTierRules(tier);
  return {
    tier,
    difficulty: tierRules.difficulty,
    seedId: firstSeed?.id || '',
    starterRollsText: (firstSeed?.starterRolls || []).join(' '),
    region: firstSeed?.region || 'America',
    patch: firstSeed?.patch || '4.1',
    mood: firstSeed?.mood || 'mixed',
    mission: createMission('pairEach'),
    targetRelic: makeRelicDraft({
      setNameHint: relicSets[1]?.name || relicSets[0]?.name,
      pieceLabel: 'Body',
      mainStat: 'FLAT HP',
      stats: ['CRIT RATE', 'CRIT DMG', 'EFFECT RES'],
      orderLocked: true,
    }),
    builderRelic: makeRelicDraft({
      setNameHint: relicSets[1]?.name || relicSets[0]?.name,
      pieceLabel: 'Head',
      mainStat: 'HP%',
      stats: ['ATK%', 'SPD', 'EFFECT HIT RATE'],
      orderLocked: true,
    }),
    forceRelic: makeForceDraft(2),
    maxTries: tierRules.maxTries ?? '',
  };
}

function toScenarioRelic(draftRelic) {
  const chosen = draftRelic.selectedStats.slice(0, 4);
  return {
    setNameHint: draftRelic.setNameHint,
    setImage: draftRelic.setImage,
    pieceLabel: draftRelic.pieceLabel,
    mainStat: draftRelic.mainStat,
    lines: chosen.slice(0, 3),
    fourthLine: chosen[3] || pickRandomDifferent(SUBSTATS, chosen),
    hasFourthLine: chosen.length >= 4,
    orderLocked: draftRelic.orderLocked,
  };
}

function buildScenarioFromDraft(draft) {
  const mission = { ...draft.mission };
  const starterRolls = String(draft.starterRollsText || '')
    .split(/[\s,\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.slice(0, 2));
  const pair = mission.required || [];
  const first = pair[0] || 'CRIT RATE';
  const second = pair[1] || 'CRIT DMG';
  const goal = mission.type === 'monoLine'
    ? `Mono ${mission.target} by keeping the board routed into the same good line.`
    : mission.type === 'dualCritCombined'
      ? `Finish on ${first} and ${second} with enough total value while avoiding the junk side.`
      : `Hit both ${first} and ${second} instead of over-committing to only one side.`;
  const win = mission.type === 'monoLine'
    ? `Finish with at least ${mission.minHits || 3} hits on ${mission.target}.`
    : mission.type === 'dualCritCombined'
      ? `Finish with at least ${mission.minCombined || 2} combined hits on ${first} and ${second}.`
      : `Finish with at least ${mission.minEach || 1} hit on ${first} and ${mission.minEach || 1} hit on ${second}.`;
  return {
    id: `admin-${draft.seedId}-${Date.now()}`,
    slug: `admin-${draft.seedId}`,
    generated: false,
    source: 'adminBuilder',
    tier: draft.tier,
    difficulty: draft.difficulty,
    title: `${draft.difficulty} Admin Contract`,
    goal,
    win,
    progressText: mission.type === 'monoLine'
      ? `One good hit is not enough. Keep the board returning into ${mission.target}.`
      : `The board may look readable, but the real contract is whether it lands on ${first} and ${second}.`,
    mood: draft.mood,
    region: draft.region,
    patch: draft.patch,
    seedLabel: draft.seedId,
    starterRolls,
    tags: ['admin-authored', draft.tier, mission.type],
    expectedStyle: 'admin_custom',
    hints: mission.type === 'monoLine'
      ? [
          `This contract is about discipline. One ${mission.target} hit does not clear it.`,
          'If the path drifts after the first good hit, re-force before you commit again.',
          `Keep reading the board for the same ${mission.target} lane instead of assuming the opener stays valid.`,
        ]
      : [
          `This is not about one lucky ${first} or ${second} hit. Both sides of the mission matter.`,
          'If the readable pair only helps one of the two target stats, the contract is not actually solved yet.',
          'Detour before the real upgrade when the visible lane only half-solves the relic.',
        ],
    success: mission,
    targetRelic: toScenarioRelic(draft.targetRelic),
    builderRelic: toScenarioRelic(draft.builderRelic),
    forceRelic: { ...draft.forceRelic, lines: [...draft.forceRelic.lines] },
    attempts: {
      maxTries: draft.maxTries === '' ? null : Number(draft.maxTries),
      expectedMistakes: 3,
    },
    ui: { showSeed: true, showTries: true, showHints: true, showStaticContractPill: true },
    seedMeta: { id: draft.seedId, seedLabel: draft.seedId, tier: draft.tier, mood: draft.mood, region: draft.region, patch: draft.patch },
    templateMeta: { id: 'adminCustom', archetype: mission.type },
    hintPackId: 'admin',
  };
}

function toVisibleRolls(starterRolls = []) {
  return starterRolls
    .map((roll) => String(roll || '').trim())
    .filter(Boolean)
    .map((roll) => (/^4[1-4]$/.test(roll) ? roll : translateTo4(roll)))
    .filter((roll) => /^4[1-4]$/.test(roll));
}

export default function PlaygroundChallengeAdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, roleMode } = useAuth();
  const [draft, setDraft] = useState(() => makeDraft('beginner'));

  const seeds = useMemo(() => getChallengeSeedPool(draft.tier), [draft.tier]);
  const preview = useMemo(() => buildScenarioFromDraft(draft), [draft]);
  const previewVisibleRolls = useMemo(() => toVisibleRolls(preview.starterRolls), [preview.starterRolls]);
  const previewPrediction = useMemo(
    () => predictWithPairs(previewVisibleRolls, { region: draft.region }),
    [previewVisibleRolls, draft.region]
  );

  useEffect(() => {
    if (seeds.some((seed) => seed.id === draft.seedId)) return;
    const firstSeed = seeds[0];
    if (!firstSeed) return;
    setDraft((current) => ({
      ...current,
      seedId: firstSeed.id,
      starterRollsText: (firstSeed.starterRolls || []).join(' '),
      region: firstSeed.region,
      patch: firstSeed.patch,
      mood: firstSeed.mood,
    }));
  }, [draft.seedId, seeds]);

  const toggleStat = (key, stat) => {
    setDraft((current) => {
      const nextRelic = { ...current[key] };
      const selected = [...nextRelic.selectedStats];
      const idx = selected.indexOf(stat);
      if (idx >= 0) {
        if (selected.length <= 3) return current;
        selected.splice(idx, 1);
      } else {
        if (selected.length >= 4) return current;
        selected.push(stat);
      }
      nextRelic.selectedStats = selected;
      return { ...current, [key]: nextRelic };
    });
  };

  const setRelicSet = (key, setInfo) => {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], setNameHint: setInfo.name, setImage: setInfo.image },
    }));
  };

  const saveAndOpen = () => {
    saveCustomChallengeScenario(preview);
    navigate('/playground/challenge?custom=latest', { state: { customScenario: preview } });
  };

  if (!isAuthenticated) {
    return <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-slate-950/70 p-8 text-slate-200">Sign in first, then switch to Admin mode to use the challenge builder.</div>;
  }

  if (roleMode !== 'admin') {
    return (
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-amber-400/20 bg-slate-950/70 p-8 text-slate-200">
        <div className="flex items-center gap-3 text-amber-200">
          <ShieldCheck className="h-5 w-5" />
          <div className="text-lg font-black uppercase">Admin Mode Required</div>
        </div>
        <p className="mt-3 text-sm text-slate-300">Use the top navigation role toggle and switch from `User` to `Admin` to author custom challenges.</p>
      </div>
    );
  }

  return (
    <div className="playground-theme-shell min-h-screen bg-transparent px-4 py-10 text-slate-200 md:px-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/playground/challenge')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back To Challenge
            </button>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Admin Only</div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-white">Challenge Builder</h1>
            </div>
          </div>
          <button type="button" onClick={saveAndOpen} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 hover:bg-emerald-500/20">
            Open In Challenge Mode
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="rounded-[1.15rem] border border-white/5 bg-slate-950/35 p-4">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Seed Source</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Tier</div><select value={draft.tier} onChange={(event) => { const nextTier = event.target.value; const firstSeed = getChallengeSeedPool(nextTier)[0]; const rules = getTierRules(nextTier); setDraft((current) => ({ ...current, tier: nextTier, difficulty: rules.difficulty, seedId: firstSeed?.id || '', starterRollsText: (firstSeed?.starterRolls || []).join(' '), region: firstSeed?.region || current.region, patch: firstSeed?.patch || current.patch, mood: firstSeed?.mood || current.mood, maxTries: rules.maxTries ?? '' })); }} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{TIERS.map((entry) => <option key={entry} value={entry}>{entry.replace('_', ' ')}</option>)}</select></label>
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Seed</div><select value={draft.seedId} onChange={(event) => { const seed = seeds.find((entry) => entry.id === event.target.value); if (!seed) return; setDraft((current) => ({ ...current, seedId: seed.id, starterRollsText: (seed.starterRolls || []).join(' '), region: seed.region, patch: seed.patch, mood: seed.mood })); }} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{seeds.map((seed) => <option key={seed.id} value={seed.id}>{seed.seedLabel}</option>)}</select></label>
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Patch</div><input value={draft.patch} onChange={(event) => setDraft((current) => ({ ...current, patch: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none" /></label>
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Region</div><select value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none"><option value="America">America</option><option value="Europe">Europe</option><option value="Asia">Asia</option></select></label>
              </div>
              <label className="mt-4 block text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Session Data Rolls</div><textarea rows={3} value={draft.starterRollsText} onChange={(event) => setDraft((current) => ({ ...current, starterRollsText: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none" placeholder="41 41 44 43 42 43" /></label>
            </div>

            <div className="rounded-[1.15rem] border border-white/5 bg-slate-950/35 p-4">
              <div className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Mission Goal</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Goal Type</div><select value={draft.mission.type === 'monoLine' ? 'monoLine' : draft.mission.type === 'dualCritCombined' ? 'pairCombined' : 'pairEach'} onChange={(event) => setDraft((current) => ({ ...current, mission: createMission(event.target.value) }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none"><option value="pairEach">Pair Hits</option><option value="pairCombined">Pair Combined</option><option value="monoLine">Mono Line</option></select></label>
                {draft.mission.type === 'monoLine' ? (
                  <>
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Mono Stat</div><select value={draft.mission.target} onChange={(event) => setDraft((current) => ({ ...current, mission: { ...current.mission, target: event.target.value } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{SUBSTATS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Min Hits</div><input type="number" min={1} max={5} value={draft.mission.minHits || 3} onChange={(event) => setDraft((current) => ({ ...current, mission: { ...current.mission, minHits: Number(event.target.value) || 1 } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none" /></label>
                  </>
                ) : (
                  <>
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Stat A</div><select value={draft.mission.required?.[0] || 'CRIT RATE'} onChange={(event) => setDraft((current) => ({ ...current, mission: { ...current.mission, required: [event.target.value, current.mission.required?.[1] || 'CRIT DMG'] } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{SUBSTATS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Stat B</div><select value={draft.mission.required?.[1] || 'CRIT DMG'} onChange={(event) => setDraft((current) => ({ ...current, mission: { ...current.mission, required: [current.mission.required?.[0] || 'CRIT RATE', event.target.value] } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{SUBSTATS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
                  </>
                )}
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Max Tries</div><input type="number" value={draft.maxTries} onChange={(event) => setDraft((current) => ({ ...current, maxTries: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none" placeholder={String(getTierRules(draft.tier).maxTries ?? '')} /></label>
              </div>
            </div>

            {[
              ['targetRelic', 'Target Relic'],
              ['builderRelic', 'Setup / Builder Relic'],
            ].map(([key, title]) => {
              const relic = draft[key];
              return (
                <div key={key} className="rounded-[1.15rem] border border-white/5 bg-black/25 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{title}</div>
                    {key === 'builderRelic' ? <button type="button" onClick={() => setDraft((current) => ({ ...current, builderRelic: makeRelicDraft({ setNameHint: pickRandom(relicSets)?.name, pieceLabel: pickRandom(PIECES), mainStat: pickRandom(MAIN_STATS), orderLocked: current.builderRelic.orderLocked }) }))} className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100 hover:bg-violet-500/18"><Dice5 className="h-3.5 w-3.5" />Random Picks</button> : null}
                  </div>
                  <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/45 p-2">
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                      {relicSets.map((setInfo) => {
                        const selected = relic.setNameHint === setInfo.name;
                        return (
                          <button key={setInfo.id} type="button" onClick={() => setRelicSet(key, setInfo)} className={`rounded-xl border p-2 text-center ${selected ? 'border-cyan-400/35 bg-cyan-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}>
                            <img src={setInfo.image} alt={setInfo.name} className="mx-auto h-12 w-12 object-contain" />
                            <div className="mt-1 line-clamp-2 text-[9px] font-black uppercase tracking-[0.08em] text-slate-300">{setInfo.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Piece</div><select value={relic.pieceLabel} onChange={(event) => setDraft((current) => ({ ...current, [key]: { ...current[key], pieceLabel: event.target.value } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{PIECES.map((piece) => <option key={piece} value={piece}>{piece}</option>)}</select></label>
                    <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Main Stat</div><select value={relic.mainStat} onChange={(event) => setDraft((current) => ({ ...current, [key]: { ...current[key], mainStat: event.target.value } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{MAIN_STATS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
                    <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300"><input type="checkbox" checked={Boolean(relic.orderLocked)} onChange={(event) => setDraft((current) => ({ ...current, [key]: { ...current[key], orderLocked: event.target.checked } }))} />Lock Order</label>
                  </div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Substats</div>
                  <div className="mb-3 flex min-h-[44px] flex-wrap gap-2 rounded-xl border border-white/5 bg-slate-950/40 p-2">
                    {relic.selectedStats.map((stat, index) => <button key={`${key}-${stat}`} type="button" onClick={() => toggleStat(key, stat)} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">L{index + 1} {stat}</button>)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUBSTATS.map((stat) => {
                      const selected = relic.selectedStats.includes(stat);
                      return <button key={`${key}-pool-${stat}`} type="button" onClick={() => toggleStat(key, stat)} className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${selected ? 'border-cyan-400/35 bg-cyan-500/12 text-cyan-100' : 'border-white/5 bg-black/20 text-slate-300 hover:border-white/10'}`}>{stat}</button>;
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Pick 3 to 4 substats. If you leave it at 3, the builder auto-generates the 4th add-sub stat from one not already selected.</p>
                </div>
              );
            })}

            <div className="rounded-[1.15rem] border border-white/5 bg-black/25 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Force Relic</div>
                <button type="button" onClick={() => setDraft((current) => ({ ...current, forceRelic: makeForceDraft(current.forceRelic.baseLines) }))} className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100 hover:bg-violet-500/18"><Dice5 className="h-3.5 w-3.5" />Random Picks</button>
              </div>
              <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/45 p-2">
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                  {relicSets.map((setInfo) => {
                    const selected = draft.forceRelic.setNameHint === setInfo.name;
                    return <button key={setInfo.id} type="button" onClick={() => setDraft((current) => ({ ...current, forceRelic: { ...current.forceRelic, setNameHint: setInfo.name, setImage: setInfo.image } }))} className={`rounded-xl border p-2 text-center ${selected ? 'border-cyan-400/35 bg-cyan-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}><img src={setInfo.image} alt={setInfo.name} className="mx-auto h-12 w-12 object-contain" /><div className="mt-1 line-clamp-2 text-[9px] font-black uppercase tracking-[0.08em] text-slate-300">{setInfo.name}</div></button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Base Lines</div><select value={draft.forceRelic.baseLines} onChange={(event) => setDraft((current) => ({ ...current, forceRelic: makeForceDraft(Number(event.target.value)) }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none"><option value={1}>1 Liner</option><option value={2}>2 Liner</option><option value={3}>3 Liner</option></select></label>
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Piece</div><select value={draft.forceRelic.pieceLabel} onChange={(event) => setDraft((current) => ({ ...current, forceRelic: { ...current.forceRelic, pieceLabel: event.target.value } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{PIECES.map((piece) => <option key={piece} value={piece}>{piece}</option>)}</select></label>
                <label className="text-[10px] text-slate-300"><div className="mb-1 font-black uppercase tracking-[0.18em] text-slate-500">Main Stat</div><select value={draft.forceRelic.mainStat} onChange={(event) => setDraft((current) => ({ ...current, forceRelic: { ...current.forceRelic, mainStat: event.target.value } }))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none">{MAIN_STATS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <div className="rounded-[1.15rem] border border-white/5 bg-slate-950/45 p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Preview</div>
              <div className="space-y-3 text-sm text-slate-300">
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Title</div><div className="mt-1 text-white">{preview.title}</div></div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Goal</div><div className="mt-1 leading-relaxed">{preview.goal}</div></div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Win</div><div className="mt-1 leading-relaxed">{preview.win}</div></div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Starter Rolls</div><div className="mt-1 text-white">{preview.starterRolls.join(' ') || 'No rolls'}</div></div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Translated Rolls</div><div className="mt-1 text-white">{previewVisibleRolls.join(' ') || 'Not enough data'}</div></div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Seed Read</div>
                  <div className="mt-1 leading-relaxed text-slate-200">
                    Commons {(previewPrediction?.commons || []).join(' / ') || '-'}
                    {' '}| Noise {(previewPrediction?.noise || []).join(' / ') || '-'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Pair {(previewPrediction?.trustedPair || []).join(' / ') || '-'}
                    {' '}| Noise Risk {previewPrediction?.noiseRisk ?? 0}%
                  </div>
                </div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Target Lines</div><div className="mt-1 text-white">{[...preview.targetRelic.lines, preview.targetRelic.fourthLine].join(' | ')}</div></div>
                <div><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Success Config</div><pre className="mt-1 overflow-x-auto rounded-xl border border-white/5 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-300">{JSON.stringify(preview.success, null, 2)}</pre></div>
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-white/5 bg-slate-950/45 p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Mode Meaning</div>
              <div className="space-y-4 text-sm leading-relaxed text-slate-300">
                <div><div className="font-black uppercase tracking-[0.16em] text-white">Beginner Drills</div>Short reps for one skill only: simple commons reading, helper use, basic detours, and “is this pair actually good for this relic?”</div>
                <div><div className="font-black uppercase tracking-[0.16em] text-white">Pattern Lab</div>A study sandbox where you inspect seed families, drift, and noise behavior without a pass/fail contract sitting on top of you.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
