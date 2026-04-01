import { getChallengeHintPack } from './challengeHintPacks.js';
import { CHALLENGE_RELIC_TEMPLATES, getChallengeRelicTemplate } from './challengeRelicTemplates.js';
import { getChallengeSeedPool } from './challengeSeedPools.js';
import relicSets from './relics.json' with { type: 'json' };
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
    return `Turn the board into a real dual-crit finish, not a one-sided crit dump. ${style.goal}`;
  }
  return `Hit both crit lines, not just one, and avoid drifting into junk. ${style.goal}`;
}

function buildWinText(success) {
  if (success.type === 'dualCrit') {
    return `Finish with at least ${success.minEach} hit on CRIT RATE and ${success.minEach} hit on CRIT DMG.`;
  }
  if (success.type === 'dualCritCombined') {
    return `Finish with at least ${success.minCombined} combined hits on CRIT RATE and CRIT DMG while keeping junk low.`;
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

function randomizeRelicSet(spec, preferredProfiles, generator) {
  const profiles = Array.isArray(preferredProfiles) ? preferredProfiles : [];
  const candidates = (Array.isArray(relicSets) ? relicSets : []).filter((entry) => profiles.includes(getSetScoreProfile(entry?.name || '')));
  const pool = candidates.length > 0 ? candidates : (Array.isArray(relicSets) ? relicSets : []);
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

export function createChallengeScenario({
  tier = 'beginner',
  seedId = null,
  templateId = null,
  generated = true,
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
  const success = { ...(SUCCESS_PRESETS[template.archetype] || SUCCESS_PRESETS.dualCrit) };
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
    targetRelic: { ...randomizedTemplate.targetRelic },
    builderRelic: { ...randomizedTemplate.builderRelic },
    forceRelic: { ...randomizedTemplate.forceRelic },
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
