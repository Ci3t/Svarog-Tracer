import { getChallengeHintPack } from './challengeHintPacks.js';
import { getChallengeRelicTemplate } from './challengeRelicTemplates.js';

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

const STYLE_META = {
  clean_detour: {
    label: 'Clean Detour',
    goal: 'Learn the basic detour before returning to the target relic.',
    progressText: 'This board is readable. The real lesson is whether the readable lane actually lands on useful stats.',
  },
  basic_commons: {
    label: 'Read The Commons',
    goal: 'Read the commons first and do not overreact to one outsider.',
    progressText: 'Start from the real commons pair and keep the solve simple.',
  },
  split_safe_pair: {
    label: 'Half-Safe Pair',
    goal: 'One side helps, one side traps. Use that difference instead of blindly trusting the pair.',
    progressText: 'This board wants you to separate the helpful side from the bait side.',
  },
  split_signals: {
    label: 'Split Signals',
    goal: 'Compare two plausible reads and pick the one that actually solves the relic.',
    progressText: 'The board gives more than one answer. Read the target relic before you commit.',
  },
  repeat_force: {
    label: 'Re-force Discipline',
    goal: 'Hold the right line across multiple upgrades instead of trusting one lucky hit.',
    progressText: 'This is about line discipline. The first good hit is not the whole solve.',
  },
  late_noise: {
    label: 'Late Noise',
    goal: 'Re-read the live board when the old commons stop being enough.',
    progressText: 'Late pressure matters more than stale confidence here.',
  },
  chaotic_return: {
    label: 'Chaotic Return',
    goal: 'Find the clean return path through a noisy board without wasting the good windows.',
    progressText: 'The board is messy but not random. Read the return, not just the chaos.',
  },
  chaotic_split: {
    label: 'Chaotic Split',
    goal: 'Commit only when the board and relic both agree.',
    progressText: 'This contract punishes lazy reads. Multiple lines look plausible, but only one really clears.',
  },
  true_dominance: {
    label: 'True Dominance',
    goal: 'Read a long dominant lane correctly even when noise briefly interrupts it.',
    progressText: 'One value can rule the session for a long stretch. The trick is noticing whether the break is real or just a noise cut.',
  },
  dominance_break_return: {
    label: 'Break And Return',
    goal: 'Recognize when the dominant lane breaks, then comes back without restarting your whole read.',
    progressText: 'The board can break for one or two beats and still return to dominance. Do not throw away the lane too early.',
  },
  fake_stable: {
    label: 'Fake Stable',
    goal: 'Punish the habit of trusting a lane that only looks stable on the surface.',
    progressText: 'This session looks clean until you check what the break side is doing underneath.',
  },
  pair_flip: {
    label: 'Pair Flip',
    goal: 'Catch when the board shifts from one trusted pair into a different one.',
    progressText: 'The safe lane can move. This level is about noticing the flip before the finish.',
  },
  greed_punish: {
    label: 'Greed Punish',
    goal: 'Do not over-chase shiny lines if they hurt the real contract.',
    progressText: 'A good-looking roll is not the same thing as a contract-clear roll.',
  },
};

const LEVEL_SPECS = [
  {
    id: 'level01',
    number: 1,
    tier: 'new_player',
    styleId: 'basic_commons',
    templateId: 'dualCritEasy',
    successKey: 'dualCrit',
    mood: 'stable',
    region: 'America',
    patch: '4.1',
    title: 'Level 01 - Read The Commons',
    subtitle: 'Start from the obvious lane.',
    starterRolls: ['41', '41', '41', '44', '41', '41'],
  },
  {
    id: 'level02',
    number: 2,
    tier: 'new_player',
    styleId: 'clean_detour',
    templateId: 'dualCritEasy',
    successKey: 'dualCritCombined',
    mood: 'stable',
    region: 'America',
    patch: '4.1',
    title: 'Level 02 - Basic Detour',
    subtitle: 'Use the readable lane correctly.',
    starterRolls: ['42', '42', '42', '43', '42', '42'],
  },
  {
    id: 'level03',
    number: 3,
    tier: 'new_player',
    styleId: 'split_safe_pair',
    templateId: 'dualCritEasy',
    successKey: 'dualCritCombined',
    mood: 'mixed',
    region: 'Europe',
    patch: '4.1',
    title: 'Level 03 - Respect The Trap Side',
    subtitle: 'One side of the pair is bait.',
    starterRolls: ['41', '42', '41', '42', '41', '44'],
  },
  {
    id: 'level04',
    number: 4,
    tier: 'beginner',
    styleId: 'split_safe_pair',
    templateId: 'dualCritEasy',
    successKey: 'dualCrit',
    mood: 'mixed',
    region: 'America',
    patch: '4.1',
    title: 'Level 04 - Basic Force Read',
    subtitle: 'Know when direct is wrong.',
    starterRolls: ['42', '43', '42', '43', '44', '42'],
  },
  {
    id: 'level05',
    number: 5,
    tier: 'beginner',
    styleId: 'repeat_force',
    templateId: 'monoSpd',
    successKey: 'monoLine',
    mood: 'mixed',
    region: 'America',
    patch: '4.1',
    title: 'Level 05 - Mono Discipline',
    subtitle: 'One good hit is not enough.',
    starterRolls: ['43', '41', '43', '41', '44', '41', '41', '42'],
  },
  {
    id: 'level06',
    number: 6,
    tier: 'beginner',
    styleId: 'split_signals',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'mixed',
    region: 'Europe',
    patch: '4.1',
    title: 'Level 06 - Split Signals',
    subtitle: 'Read the relic, not just the pair.',
    starterRolls: ['41', '43', '42', '43', '41', '42', '44', '43'],
  },
  {
    id: 'level07',
    number: 7,
    tier: 'intermediate',
    styleId: 'true_dominance',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'stable',
    region: 'America',
    patch: '4.1',
    title: 'Level 07 - True Dominance',
    subtitle: 'One value can own the board.',
    starterRolls: ['41', '41', '41', '41', '41', '41', '44', '41', '41', '41'],
  },
  {
    id: 'level08',
    number: 8,
    tier: 'intermediate',
    styleId: 'dominance_break_return',
    templateId: 'monoSpd',
    successKey: 'monoLine',
    mood: 'mixed',
    region: 'Asia',
    patch: '4.1',
    title: 'Level 08 - Break And Return',
    subtitle: 'Do not abandon the lane too early.',
    starterRolls: ['43', '43', '43', '43', '42', '44', '43', '43', '43', '41'],
  },
  {
    id: 'level09',
    number: 9,
    tier: 'expert',
    styleId: 'late_noise',
    templateId: 'dualCritFourLine',
    successKey: 'dualCrit',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 09 - Late Noise',
    subtitle: 'Stale commons lose here.',
    starterRolls: ['42', '43', '44', '42', '41', '43', '44', '41', '42', '43'],
    maxTries: 6,
  },
  {
    id: 'level10',
    number: 10,
    tier: 'expert',
    styleId: 'chaotic_split',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 10 - Expert Clear',
    subtitle: 'The first ladder capstone.',
    starterRolls: ['44', '42', '41', '43', '44', '41', '42', '44', '43', '41', '44', '42'],
    maxTries: 5,
  },
  {
    id: 'level11',
    number: 11,
    tier: 'expert',
    styleId: 'true_dominance',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'chaotic',
    region: 'Europe',
    patch: '4.1',
    title: 'Level 11 - Dominance Pressure',
    subtitle: 'The lane can run long and still snap back.',
    starterRolls: ['44', '44', '44', '44', '44', '41', '44', '44', '43', '44', '44', '42'],
    maxTries: 5,
  },
  {
    id: 'level12',
    number: 12,
    tier: 'expert',
    styleId: 'pair_flip',
    templateId: 'dualCritFourLine',
    successKey: 'dualCrit',
    mood: 'chaotic',
    region: 'Asia',
    patch: '4.1',
    title: 'Level 12 - Pair Flip',
    subtitle: 'The board changes lane mid-session.',
    starterRolls: ['42', '43', '42', '43', '42', '44', '41', '44', '41', '44', '42', '44'],
    maxTries: 5,
  },
  {
    id: 'level13',
    number: 13,
    tier: 'expert',
    styleId: 'fake_stable',
    templateId: 'monoSpd',
    successKey: 'monoLine',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 13 - Fake Stable',
    subtitle: 'Looks cleaner than it is.',
    starterRolls: ['41', '44', '41', '44', '41', '43', '41', '44', '42', '41', '44', '43'],
    maxTries: 5,
  },
  {
    id: 'level14',
    number: 14,
    tier: 'expert_v2',
    styleId: 'clean_detour',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'mixed',
    region: 'America',
    patch: '4.1',
    title: 'Level 14 - Builder Entry',
    subtitle: 'Start building your own read.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level15',
    number: 15,
    tier: 'expert_v2',
    styleId: 'dominance_break_return',
    templateId: 'monoSpd',
    successKey: 'monoLine',
    mood: 'mixed',
    region: 'Europe',
    patch: '4.1',
    title: 'Level 15 - Builder Return Read',
    subtitle: 'Read your own dominance break.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level16',
    number: 16,
    tier: 'expert_v2',
    styleId: 'pair_flip',
    templateId: 'dualCritFourLine',
    successKey: 'dualCrit',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 16 - Read The Flip Yourself',
    subtitle: 'No preset history to lean on.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level17',
    number: 17,
    tier: 'expert_v2',
    styleId: 'greed_punish',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'chaotic',
    region: 'Asia',
    patch: '4.1',
    title: 'Level 17 - Greed Punish',
    subtitle: 'The board gives fake value.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level18',
    number: 18,
    tier: 'expert_v2',
    styleId: 'chaotic_return',
    templateId: 'monoSpd',
    successKey: 'monoLine',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 18 - Carry Manipulation',
    subtitle: 'Builder and target must work together.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level19',
    number: 19,
    tier: 'expert_v2',
    styleId: 'chaotic_split',
    templateId: 'dualCritFourLine',
    successKey: 'dualCritCombined',
    mood: 'chaotic',
    region: 'Europe',
    patch: '4.1',
    title: 'Level 19 - Mixed Chaos',
    subtitle: 'Free-read hybrid board.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
  {
    id: 'level20',
    number: 20,
    tier: 'expert_v2',
    styleId: 'true_dominance',
    templateId: 'dualCritFourLine',
    successKey: 'dualCrit',
    mood: 'chaotic',
    region: 'America',
    patch: '4.1',
    title: 'Level 20 - Final Exam',
    subtitle: 'Read it yourself and clear under pressure.',
    starterRolls: [],
    requiresSessionBuilder: true,
    minSessionEntries: 5,
    maxTries: 5,
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildGoalText(spec, success) {
  const style = STYLE_META[spec.styleId] || STYLE_META.clean_detour;
  if (success.type === 'monoLine') {
    return `Route the board back into ${success.target} and keep the line alive. ${style.goal}`;
  }
  if (success.type === 'dualCrit') {
    return `Finish with both ${success.required.join(' + ')} lines hit, not just one. ${style.goal}`;
  }
  return `Turn the board into a real ${success.required.join(' + ')} finish instead of a one-sided dump. ${style.goal}`;
}

function buildWinText(success) {
  if (success.type === 'dualCrit') {
    return `Finish with at least ${success.minEach} hit on ${success.required[0]} and ${success.minEach} hit on ${success.required[1]}.`;
  }
  if (success.type === 'dualCritCombined') {
    return `Finish with at least ${success.minCombined} combined hits on ${success.required[0]} and ${success.required[1]} while keeping junk low.`;
  }
  return `Land at least ${success.minHits} hits on ${success.target}.`;
}

function buildProgressText(spec) {
  const style = STYLE_META[spec.styleId] || STYLE_META.clean_detour;
  if (spec.requiresSessionBuilder) {
    return `${style.progressText} Build your own read first, then commit only when the target relic really lines up.`;
  }
  return style.progressText;
}

function buildContract(spec) {
  const template = clone(getChallengeRelicTemplate(spec.templateId));
  const success = clone(SUCCESS_PRESETS[spec.successKey]);
  const hints = getChallengeHintPack(spec.hintPackId || (spec.successKey === 'monoLine' ? 'monoLine' : spec.successKey === 'dualCritCombined' ? 'dualCritCombined' : 'dualCrit'));

  return {
    id: spec.id,
    slug: spec.id,
    level: spec.number,
    tier: spec.tier,
    seedLabel: `${spec.id}-${spec.tier}`,
    difficulty: `${spec.tier.replace('_', ' ')} - level ${String(spec.number).padStart(2, '0')}`,
    title: spec.title,
    subtitle: spec.subtitle,
    mood: spec.mood,
    region: spec.region,
    patch: spec.patch,
    starterRolls: [...spec.starterRolls],
    requiresSessionBuilder: Boolean(spec.requiresSessionBuilder),
    minSessionEntries: spec.requiresSessionBuilder ? (spec.minSessionEntries || 5) : 0,
    goal: buildGoalText(spec, success),
    win: buildWinText(success),
    progressText: buildProgressText(spec),
    hints,
    success,
    attempts: spec.maxTries ? { maxTries: spec.maxTries } : undefined,
    expectedStyle: spec.styleId,
    targetRelic: template.targetRelic,
    builderRelic: template.builderRelic,
    forceRelic: template.forceRelic,
  };
}

export const CHALLENGE_CONTRACT_ORDER = LEVEL_SPECS.map((spec) => spec.id);

export const CHALLENGE_CONTRACTS = Object.fromEntries(
  LEVEL_SPECS.map((spec) => [spec.id, buildContract(spec)])
);

export function getChallengeContract(contractId = 'level01') {
  return CHALLENGE_CONTRACTS[contractId] || CHALLENGE_CONTRACTS.level01;
}

export function getNextChallengeContractId(contractId = 'level01') {
  const currentIndex = CHALLENGE_CONTRACT_ORDER.indexOf(contractId);
  if (currentIndex < 0 || currentIndex >= CHALLENGE_CONTRACT_ORDER.length - 1) return null;
  return CHALLENGE_CONTRACT_ORDER[currentIndex + 1];
}
