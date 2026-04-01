import { getChallengeHintPack } from './challengeHintPacks.js';
import { CHALLENGE_RELIC_TEMPLATES, getChallengeRelicTemplate } from './challengeRelicTemplates.js';
import { getChallengeSeedPool } from './challengeSeedPools.js';
import relicSets from './relics.json' with { type: 'json' };
import { getSetBisGuide } from './setBisGuides.js';
import { getSetScoreProfile } from '../utils/relicScoring.js';

const TIER_RULES = {
  new_player: {
    difficulty: 'New Player',
    templateIds: ['dualCritEasy'],
    hintPack: 'dualCrit',
    maxTries: null,
    expectedMistakes: 3,
  },
  beginner: {
    difficulty: 'Beginner',
    templateIds: ['dualCritEasy'],
    hintPack: 'dualCrit',
    maxTries: null,
    expectedMistakes: 4,
  },
  intermediate: {
    difficulty: 'Intermediate',
    templateIds: ['dualCritFourLine', 'monoSpd'],
    hintPack: null,
    maxTries: null,
    expectedMistakes: 5,
  },
  veteran: {
    difficulty: 'Veteran',
    templateIds: ['dualCritFourLine', 'monoSpd'],
    hintPack: null,
    maxTries: 6,
    expectedMistakes: 5,
  },
  expert: {
    difficulty: 'Expert',
    templateIds: ['dualCritFourLine', 'monoSpd'],
    hintPack: 'lateNoise',
    maxTries: 5,
    expectedMistakes: 4,
  },
};

const SUCCESS_PRESETS = {
  dualCrit: {
    type: 'dualCrit',
    required: ['CRIT RATE', 'CRIT DMG'],
    minEach: 1,
    junk: ['EFF RES', 'BREAK EFFECT'],
    maxJunk: 1,
  },
  dualCritCombined: {
    type: 'dualCritCombined',
    required: ['CRIT RATE', 'CRIT DMG'],
    minCombined: 2,
    junk: ['EFF RES', 'BREAK EFFECT'],
    maxJunk: 1,
  },
  monoLine: {
    type: 'monoLine',
    target: 'SPD',
    minHits: 3,
    junk: ['EFFECT HIT RATE', 'EFF RES', 'BREAK EFFECT'],
    maxJunk: 1,
  },
};

const STYLE_COPY = {
  clean_detour: {
    title: 'Clean Detour',
    goal: 'Turn a readable pair into the correct finish by detouring before the real upgrade.',
    progressText: 'The board looks readable. Make sure the readable pair actually lands on the lines this relic wants.',
  },
  basic_commons: {
    title: 'Read The Commons',
    goal: 'Use the commons correctly and avoid trusting the wrong side of the readable lane.',
    progressText: 'This contract is about simple board reading. Check what the live pair actually does to the relic.',
  },
  split_safe_pair: {
    title: 'Half-Safe Pair',
    goal: 'One side of the lane helps, the other side traps. Find the cleaner return path.',
    progressText: 'The pair is only half-safe here. Read beyond the fact that it looks stable.',
  },
  split_signals: {
    title: 'Split Signals',
    goal: 'The board is no longer purely obvious. Compare the readable pair against the relic and solve the split.',
    progressText: 'This contract needs a deeper read. Do not autopilot the first commons pair you see.',
  },
  repeat_force: {
    title: 'Re-force Discipline',
    goal: 'The first hit is not enough. Re-force the right line so the path stays clean all the way through.',
    progressText: 'This is a discipline contract. One success does not guarantee the next one stays on line.',
  },
  late_noise: {
    title: 'Noise Wins Late',
    goal: 'The late session gets louder. Finish by respecting live pressure instead of stale commons.',
    progressText: 'The early lane is not automatically the late answer. Re-read the board before the final commit.',
  },
  chaotic_return: {
    title: 'Chaotic Return',
    goal: 'A noisy session still has a solve. Find the safe return without wasting the clean windows.',
    progressText: 'The board is messy, but not random. Your job is to spot the return path before it closes.',
  },
  chaotic_split: {
    title: 'Chaotic Split',
    goal: 'A hard mixed-chaos board with multiple plausible reads. Commit to the line that actually clears the relic.',
    progressText: 'This contract punishes lazy reads. The board gives you options, but not all of them are actually good.',
  },
};

function hashString(value = '') {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createGenerator(seed = 1) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(list, generator = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(generator() * list.length)] || list[0];
}

function inferHintPack(expectedStyle, template) {
  if (expectedStyle === 'late_noise' || expectedStyle === 'chaotic_return' || expectedStyle === 'chaotic_split') {
    return 'lateNoise';
  }
  if (template.archetype === 'monoLine') return 'monoLine';
  if (template.archetype === 'dualCritCombined') return 'dualCritCombined';
  return 'dualCrit';
}

function buildGoalText(styleId, template, success) {
  const style = STYLE_COPY[styleId] || STYLE_COPY.clean_detour;
  if (success.type === 'monoLine') {
    return `Route the board back into ${success.target} and keep it there across repeated upgrades. ${style.goal}`;
  }
  if (success.type === 'dualCritCombined') {
    const pairLabel = Array.isArray(success.required) ? success.required.join(' + ') : 'the real target pair';
    return `Turn the board into a real ${pairLabel} finish, not a one-sided dump into the wrong line. ${style.goal}`;
  }
  if (success.type === 'dualCrit') {
    const pairLabel = Array.isArray(success.required) ? success.required.join(' + ') : 'the real target pair';
    return `Hit both ${pairLabel} lines, not just one, and avoid drifting into junk. ${style.goal}`;
  }
  return `Finish the relic around the room's actual target stats and avoid drifting into junk. ${style.goal}`;
}

function buildWinText(success) {
  if (success.type === 'dualCrit') {
    const requiredStats = Array.isArray(success.required) ? success.required.slice(0, 2) : ['the first target stat', 'the second target stat'];
    return `Finish with at least ${success.minEach} hit on ${requiredStats[0]} and ${success.minEach} hit on ${requiredStats[1]}.`;
  }
  if (success.type === 'dualCritCombined') {
    const requiredStats = Array.isArray(success.required) ? success.required.slice(0, 2) : ['the target pair'];
    return `Finish with at least ${success.minCombined} combined hits on ${requiredStats.join(' and ')} while keeping junk low.`;
  }
  if (success.type === 'monoLine') {
    return `Land at least ${success.minHits} hits on ${success.target}.`;
  }
  return 'Clear the contract objective.';
}

function buildScenarioId(tier, seed, template) {
  return `${tier}-${seed.id}-${template.id}`;
}

function pickPvpRollTier(generator) {
  const roll = generator();
  if (roll < 0.33) return 'low';
  if (roll < 0.66) return 'mid';
  return 'high';
}

function isPlanarPieceLabel(pieceLabel = '') {
  const normalized = String(pieceLabel || '').trim().toLowerCase();
  return normalized.includes('sphere') || normalized.includes('rope') || normalized.includes('planar');
}

function getSetPoolForPiece(pieceLabel = '') {
  const source = Array.isArray(relicSets) ? relicSets : [];
  if (isPlanarPieceLabel(pieceLabel)) {
    return source.filter((entry) => {
      const numId = Number(entry?.numId || 0);
      return numId >= 301 && numId < 400;
    });
  }
  return source.filter((entry) => {
    const numId = Number(entry?.numId || 0);
    return numId >= 101 && numId < 200;
  });
}

function randomizeRelicSet(spec, preferredProfiles, generator) {
  const profiles = Array.isArray(preferredProfiles) ? preferredProfiles : [];
  const allowedPool = getSetPoolForPiece(spec?.pieceLabel);
  const candidates = allowedPool.filter((entry) => profiles.includes(getSetScoreProfile(entry?.name || '')));
  const pool = candidates.length > 0 ? candidates : allowedPool;
  const chosen = pickRandom(pool, generator);
  if (!chosen) return { ...spec };
  return {
    ...spec,
    setNameHint: chosen.name,
    setImage: chosen.image || '',
  };
}

function randomizeTemplateSets(template, generator) {
  const targetProfiles = template.archetype === 'monoLine'
    ? ['crit', 'fua', 'debuff_crit']
    : ['crit', 'fua', 'debuff_crit', 'hp_crit', 'low_spd_crit'];
  const builderProfiles = ['support', 'support_cd', 'break_support', 'break_dps', 'dot'];
  const forceProfiles = ['support', 'support_cd', 'break_support', 'break_dps', 'crit'];
  return {
    ...template,
    targetRelic: randomizeRelicSet(template.targetRelic, targetProfiles, generator),
    builderRelic: randomizeRelicSet(template.builderRelic, builderProfiles, generator),
    forceRelic: randomizeRelicSet(template.forceRelic, forceProfiles, generator),
  };
}

function shuffleList(list, generator) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(generator() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function normalizeGuideStat(stat = '') {
  const normalized = String(stat || '').trim().toUpperCase();
  if (normalized === 'CRIT RATE') return 'CRIT RATE';
  if (normalized === 'CRIT DMG') return 'CRIT DMG';
  if (normalized === 'BREAK EFFECT') return 'BREAK EFFECT';
  if (normalized === 'EFFECT HIT RATE') return 'EFFECT HIT RATE';
  if (normalized === 'EFFECT RES') return 'EFFECT RES';
  return normalized;
}

function buildPvpSuccessFromGuide(guide, targetRelic, generator) {
  const s = (guide?.s || []).map(normalizeGuideStat).filter(Boolean);
  const a = (guide?.a || []).map(normalizeGuideStat).filter(Boolean);
  const zero = (guide?.zero || []).map(normalizeGuideStat).filter(Boolean);
  const selectedLines = [...(Array.isArray(targetRelic?.lines) ? targetRelic.lines : []), targetRelic?.fourthLine]
    .map(normalizeGuideStat)
    .filter(Boolean);
  const selectedS = selectedLines.filter((stat) => s.includes(stat));
  const selectedA = selectedLines.filter((stat) => a.includes(stat));
  const selectedZero = selectedLines.filter((stat) => zero.includes(stat));
  const required = (
    selectedS.length >= 2
      ? selectedS.slice(0, 2)
      : selectedS.length === 1
        ? [...selectedS, ...selectedA.slice(0, 1)]
        : selectedA.slice(0, 2)
  ).slice(0, 2);

  if (required.length >= 2) {
    return {
      type: 'dualCritCombined',
      required,
      minCombined: generator() < 0.5 ? 2 : 3,
      junk: selectedZero.slice(0, 3),
      maxJunk: 1,
    };
  }
  return {
    type: 'monoLine',
    target: selectedS[0] || selectedA[0] || s[0] || a[0] || 'SPD',
    minHits: 3,
    junk: selectedZero.slice(0, 3),
    maxJunk: 1,
  };
}

function buildTargetStatGuide(guide, targetRelic) {
  const s = (guide?.s || []).map(normalizeGuideStat).filter(Boolean);
  const a = (guide?.a || []).map(normalizeGuideStat).filter(Boolean);
  const zero = (guide?.zero || []).map(normalizeGuideStat).filter(Boolean);
  const selectedLines = [...(Array.isArray(targetRelic?.lines) ? targetRelic.lines : []), targetRelic?.fourthLine]
    .map(normalizeGuideStat)
    .filter(Boolean);
  const tierByStat = selectedLines.reduce((acc, stat) => {
    if (s.includes(stat)) acc[stat] = 'S';
    else if (a.includes(stat)) acc[stat] = 'A';
    else if (zero.includes(stat)) acc[stat] = 'TRASH';
    else acc[stat] = 'NEUTRAL';
    return acc;
  }, {});
  return {
    s: selectedLines.filter((stat) => tierByStat[stat] === 'S'),
    a: selectedLines.filter((stat) => tierByStat[stat] === 'A'),
    trash: selectedLines.filter((stat) => tierByStat[stat] === 'TRASH'),
    neutral: selectedLines.filter((stat) => tierByStat[stat] === 'NEUTRAL'),
    tierByStat,
  };
}

function buildTargetRelicFromGuide(spec, setInfo, guide, generator) {
  const s = shuffleList((guide?.s || []).map(normalizeGuideStat).filter(Boolean), generator);
  const a = shuffleList((guide?.a || []).map(normalizeGuideStat).filter(Boolean), generator);
  const zero = shuffleList((guide?.zero || []).map(normalizeGuideStat).filter(Boolean), generator);
  const selected = [];

  if (s.length >= 2 && (generator() < 0.65 || a.length === 0)) {
    selected.push(s[0], s[1]);
  } else {
    if (s[0]) selected.push(s[0]);
    if (a[0]) selected.push(a[0]);
  }

  const pool = [...s.slice(2), ...a.slice(1), ...zero];
  while (selected.length < 3 && pool.length > 0) {
    const next = pool.shift();
    if (next && !selected.includes(next)) selected.push(next);
  }

  if (selected.length >= 3 && s.length > 0 && !selected.some((stat) => s.includes(stat))) {
    const replaceIndex = selected.findIndex((stat) => !a.includes(stat));
    selected[Math.max(0, replaceIndex)] = s[0];
  }

  const fourthCandidates = [...a, ...zero, ...s].filter((stat) => stat && !selected.includes(stat));
  const fourthLine = fourthCandidates[0] || selected[2] || 'ATK%';
  const ordered = shuffleList(selected.slice(0, 3), generator);

  return {
    ...spec,
    setNameHint: setInfo.name,
    setImage: setInfo.image || '',
    lines: ordered,
    fourthLine,
    hasFourthLine: false,
  };
}

function applySelectedTargetSet(randomizedTemplate, selectedSetName, generator) {
  const normalizedSelected = String(selectedSetName || '').trim();
  if (!normalizedSelected) return { template: randomizedTemplate, successOverride: null };
  const allowedPool = getSetPoolForPiece(randomizedTemplate?.targetRelic?.pieceLabel);
  const setInfo = allowedPool.find((entry) => entry?.name === normalizedSelected);
  if (!setInfo) return { template: randomizedTemplate, successOverride: null };
  const guide = getSetBisGuide(setInfo.name);
  if (!guide) {
    return {
      template: {
        ...randomizedTemplate,
        targetRelic: {
          ...randomizedTemplate.targetRelic,
          setNameHint: setInfo.name,
          setImage: setInfo.image || '',
        },
      },
      successOverride: null,
    };
  }
  return {
    template: {
      ...randomizedTemplate,
      targetRelic: buildTargetRelicFromGuide(randomizedTemplate.targetRelic, setInfo, guide, generator),
    },
    successOverride: null,
  };
}

export function createChallengeScenario({
  tier = 'beginner',
  seedId = null,
  templateId = null,
  generated = true,
  mode = 'challenge',
  selectedSetName = null,
  targetRelicOverride = null,
} = {}) {
  const tierRules = TIER_RULES[tier] || TIER_RULES.beginner;
  const seedPool = getChallengeSeedPool(tier);
  const randomSalt =
    seedId || templateId
      ? 'locked'
      : `${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  const seedRandom = createGenerator(hashString(`${tier}:${seedId || 'random'}:${templateId || 'random'}:${randomSalt}`));
  const seed = seedId
    ? seedPool.find((entry) => entry.id === seedId) || seedPool[0]
    : pickRandom(seedPool, seedRandom);
  const resolvedTemplateIds = Array.isArray(seed?.templateIds) && seed.templateIds.length > 0
    ? seed.templateIds
    : tierRules.templateIds;
  const availableTemplates = resolvedTemplateIds.map((id) => getChallengeRelicTemplate(id));
  const template = templateId
    ? getChallengeRelicTemplate(templateId)
    : pickRandom(availableTemplates, seedRandom);
  const randomizedTemplate = randomizeTemplateSets(template, seedRandom);
  const selectedSetResult = mode === 'pvp'
    ? applySelectedTargetSet(randomizedTemplate, selectedSetName, seedRandom)
    : { template: randomizedTemplate, successOverride: null };
  const overriddenTargetRelic = targetRelicOverride && typeof targetRelicOverride === 'object'
    ? {
        ...selectedSetResult.template.targetRelic,
        lines: Array.isArray(targetRelicOverride.lines) && targetRelicOverride.lines.length >= 3
          ? targetRelicOverride.lines.slice(0, 3)
          : selectedSetResult.template.targetRelic.lines,
        fourthLine: String(targetRelicOverride.fourthLine || '').trim() || selectedSetResult.template.targetRelic.fourthLine,
        hasFourthLine: typeof targetRelicOverride.hasFourthLine === 'boolean'
          ? targetRelicOverride.hasFourthLine
          : selectedSetResult.template.targetRelic.hasFourthLine,
      }
    : null;
  const finalTemplate = {
    ...selectedSetResult.template,
    targetRelic: overriddenTargetRelic || selectedSetResult.template.targetRelic,
  };
  const selectedGuide = mode === 'pvp' && selectedSetName ? getSetBisGuide(selectedSetName) : null;
  const success = selectedSetResult.successOverride
    ? { ...selectedSetResult.successOverride }
    : mode === 'pvp' && selectedGuide
      ? { ...(buildPvpSuccessFromGuide(selectedGuide, finalTemplate.targetRelic, seedRandom)) }
      : { ...(SUCCESS_PRESETS[template.archetype] || SUCCESS_PRESETS.dualCrit) };
  const hintPackId = seed.hintPackId || tierRules.hintPack || inferHintPack(seed.expectedStyle, template);
  const hints = getChallengeHintPack(hintPackId);
  const style = STYLE_COPY[seed.expectedStyle] || STYLE_COPY.clean_detour;
  const scenarioId = buildScenarioId(tier, seed, template);

  return {
    id: scenarioId,
    slug: scenarioId,
    generated,
    source: 'scenarioFactory',
    tier,
    difficulty: tierRules.difficulty,
    title: `${tierRules.difficulty} Challenge: ${style.title}`,
    mood: seed.mood,
    region: seed.region,
    patch: seed.patch,
    seedLabel: seed.seedLabel,
    pvpRollTier: pickPvpRollTier(seedRandom),
    starterRolls: [...seed.starterRolls],
    tags: [...(seed.tags || [])],
    expectedStyle: seed.expectedStyle,
    goal: buildGoalText(seed.expectedStyle, template, success),
    win: buildWinText(success),
    progressText: style.progressText,
    hints: [...hints],
    success,
    targetStatGuide: selectedGuide ? buildTargetStatGuide(selectedGuide, finalTemplate.targetRelic) : null,
    targetRelic: { ...finalTemplate.targetRelic },
    builderRelic: { ...finalTemplate.builderRelic },
    forceRelic: { ...finalTemplate.forceRelic },
    attempts: {
      maxTries: tierRules.maxTries,
      expectedMistakes: tierRules.expectedMistakes,
    },
    ui: {
      showSeed: true,
      showTries: true,
      showHints: true,
      showStaticContractPill: true,
    },
    seedMeta: { ...seed },
    templateMeta: {
      id: template.id,
      archetype: template.archetype,
    },
    hintPackId,
  };
}

export function getTierRules(tier = 'beginner') {
  return TIER_RULES[tier] || TIER_RULES.beginner;
}
