const SUBSTAT_ROLLS = {
  'CRIT RATE': { low: 2.5, mid: 2.9, high: 3.2, percent: true, key: 'crit_rate' },
  'CRIT DMG': { low: 5.1, mid: 5.8, high: 6.5, percent: true, key: 'crit_dmg' },
  SPD: { low: 2.0, mid: 2.3, high: 2.6, percent: false, key: 'spd' },
  'EFFECT HIT RATE': { low: 3.4, mid: 3.8, high: 4.3, percent: true, key: 'ehr' },
  'EFFECT RES': { low: 3.4, mid: 3.8, high: 4.3, percent: true, key: 'res' },
  'BREAK EFFECT': { low: 5.1, mid: 5.8, high: 6.5, percent: true, key: 'be' },
  'ATK%': { low: 3.4, mid: 3.8, high: 4.4, percent: true, key: 'atk_pct' },
  'HP%': { low: 3.4, mid: 3.8, high: 4.4, percent: true, key: 'hp_pct' },
  'DEF%': { low: 4.3, mid: 4.8, high: 5.4, percent: true, key: 'def_pct' },
  'FLAT HP': { low: 33, mid: 38, high: 42, percent: false, decimals: 0, key: 'hp' },
  'FLAT ATK': { low: 16, mid: 19, high: 21, percent: false, decimals: 0, key: 'atk' },
  'FLAT DEF': { low: 16, mid: 19, high: 21, percent: false, decimals: 0, key: 'def' },
};

const MAIN_STAT_MAX = {
  'FLAT HP': { max: 705, percent: false, decimals: 0 },
  'FLAT ATK': { max: 352, percent: false, decimals: 0 },
  'HP%': { max: 43.2, percent: true, decimals: 1 },
  'ATK%': { max: 43.2, percent: true, decimals: 1 },
  'DEF%': { max: 54.0, percent: true, decimals: 1 },
  'CRIT RATE': { max: 32.4, percent: true, decimals: 1 },
  'CRIT DMG': { max: 64.8, percent: true, decimals: 1 },
  EHR: { max: 43.2, percent: true, decimals: 1 },
  'EFFECT HIT RATE': { max: 43.2, percent: true, decimals: 1 },
  BE: { max: 64.8, percent: true, decimals: 1 },
  'BREAK EFFECT': { max: 64.8, percent: true, decimals: 1 },
  SPD: { max: 25.032, percent: false, decimals: 1 },
  'SPD BOOTS': { max: 25.032, percent: false, decimals: 1, label: 'SPD' },
};

const NORMALIZATION = {
  crit_dmg: 1.0,
  be: 1.0,
  def_pct: 1.2,
  hp_pct: 1.5,
  atk_pct: 1.5,
  ehr: 1.5,
  res: 1.5,
  crit_rate: 2.0,
  spd: 2.59,
  hp: 0.157,
  atk: 0.314,
  def: 0.377,
};

const FLAT_STATS = new Set(['hp', 'atk', 'def']);
const FLAT_WEIGHT_MULTIPLIER = 0.4;
const MIN_ROLL_SCORE = 5.1;

const PROFILE_WEIGHTS = {
  crit: {
    crit_rate: 1.0,
    crit_dmg: 1.0,
    atk_pct: 0.75,
    spd: 1.0,
    hp_pct: 0,
    def_pct: 0,
    ehr: 0,
    res: 0,
    be: 0,
    atk: 0.75,
    hp: 0,
    def: 0,
  },
  break_dps: {
    be: 1.0,
    spd: 1.0,
    atk_pct: 0.5,
    ehr: 0.5,
    crit_rate: 0,
    crit_dmg: 0,
    hp_pct: 0,
    def_pct: 0,
    res: 0,
    atk: 0.2,
    hp: 0,
    def: 0,
  },
  dot: {
    atk_pct: 1.0,
    atk: 0.4,
    spd: 1.0,
    ehr: 1.0,
    crit_rate: 0.25,
    crit_dmg: 0.25,
    hp_pct: 0,
    def_pct: 0,
    res: 0,
    be: 0,
    hp: 0,
    def: 0,
  },
  fua: {
    crit_rate: 1.0,
    crit_dmg: 1.0,
    atk_pct: 0.75,
    spd: 0.75,
    hp_pct: 0,
    def_pct: 0,
    ehr: 0,
    res: 0,
    be: 0,
    atk: 0.3,
    hp: 0,
    def: 0,
  },
  hp_crit: {
    crit_rate: 1.0,
    crit_dmg: 1.0,
    hp_pct: 0.75,
    hp: 0.3,
    spd: 0.75,
    atk_pct: 0,
    def_pct: 0,
    ehr: 0,
    res: 0,
    be: 0,
    atk: 0,
    def: 0,
  },
  break: {
    be: 1.0,
    spd: 1.0,
    atk_pct: 0.5,
    ehr: 0.5,
    crit_rate: 0,
    crit_dmg: 0,
    hp_pct: 0,
    def_pct: 0,
    res: 0,
    atk: 0.5,
    hp: 0,
    def: 0,
  },
  support: {
    spd: 1.0,
    hp_pct: 0.25,
    def_pct: 0.25,
    ehr: 0.5,
    res: 0.25,
    crit_rate: 0,
    crit_dmg: 0,
    atk_pct: 0,
    be: 0,
    atk: 0,
    hp: 0.25,
    def: 0.25,
  },
  break_support: {
    be: 1.0,
    spd: 1.0,
    ehr: 0.5,
    hp_pct: 0.25,
    def_pct: 0.25,
    res: 0.25,
    crit_rate: 0,
    crit_dmg: 0,
    atk_pct: 0,
    atk: 0,
    hp: 0.1,
    def: 0.1,
  },
  tank: {
    def_pct: 1.0,
    def: 0.4,
    hp_pct: 0.75,
    hp: 0.3,
    spd: 0.75,
    res: 0.5,
    crit_rate: 0,
    crit_dmg: 0,
    atk_pct: 0,
    atk: 0,
    ehr: 0,
    be: 0,
  },
  heal: {
    hp_pct: 1.0,
    hp: 0.4,
    spd: 1.0,
    def_pct: 0.25,
    def: 0.1,
    res: 0.25,
    crit_rate: 0,
    crit_dmg: 0,
    atk_pct: 0,
    atk: 0,
    ehr: 0,
    be: 0,
  },
  debuff_crit: {
    crit_rate: 1.0,
    crit_dmg: 1.0,
    atk_pct: 0.75,
    spd: 1.0,
    ehr: 0.5,
    hp_pct: 0,
    def_pct: 0,
    res: 0,
    be: 0,
    atk: 0.3,
    hp: 0,
    def: 0,
  },
  support_cd: {
    spd: 1.0,
    hp_pct: 0.5,
    def_pct: 0.5,
    res: 0.25,
    ehr: 0.25,
    crit_dmg: 0.25,
    crit_rate: 0,
    atk_pct: 0,
    atk: 0,
    be: 0,
    hp: 0.2,
    def: 0.2,
  },
  break_hybrid: {
    be: 1.0,
    crit_rate: 0.75,
    crit_dmg: 0.75,
    atk_pct: 0.75,
    spd: 1.0,
    ehr: 0.25,
    hp_pct: 0,
    def_pct: 0,
    res: 0,
    atk: 0.3,
    hp: 0,
    def: 0,
  },
  low_spd_crit: {
    crit_rate: 1.0,
    crit_dmg: 1.0,
    hp_pct: 0.75,
    hp: 0.3,
    spd: 0.25,
    atk_pct: 0,
    def_pct: 0,
    ehr: 0,
    res: 0,
    be: 0,
    atk: 0,
    def: 0,
  },
};

const SET_PROFILE_OVERRIDES = {
  'Passerby of Wandering Cloud': 'heal',
  'Musketeer of Wild Wheat': 'crit',
  'Knight of Purity Palace': 'tank',
  'Hunter of Glacial Forest': 'crit',
  'Champion of Streetwise Boxing': 'crit',
  'Guard of Wuthering Snow': 'tank',
  'Firesmith of Lava-Forging': 'crit',
  'Genius of Brilliant Stars': 'crit',
  'Band of Sizzling Thunder': 'debuff_crit',
  'Eagle of Twilight Line': 'crit',
  'Thief of Shooting Meteor': 'break_dps',
  'Wastelander of Banditry Desert': 'debuff_crit',
  'Longevous Disciple': 'hp_crit',
  'Messenger Traversing Hackerspace': 'support',
  'The Ashblazing Grand Duke': 'fua',
  'Prisoner in Deep Confinement': 'dot',
  'Pioneer Diver of Dead Waters': 'debuff_crit',
  'Watchmaker, Master of Dream Machinations': 'break_support',
  'Iron Cavalry Against the Scourge': 'break_dps',
  'The Wind-Soaring Valorous': 'fua',
  "Sacerdos' Relived Ordeal": 'support_cd',
  'Scholar Lost in Erudition': 'crit',
  'Hero of Triumphant Song': 'break_hybrid',
  'Poet of Mourning Collapse': 'low_spd_crit',
  'Warrior Goddess of Sun and Thunder': 'crit',
  'Wavestrider Captain': 'support',
  'World-Remaking Deliverer': 'break_hybrid',
  'Self-Enshrouded Recluse': 'debuff_crit',
  'Ever-Glorious Magical Girl': 'crit',
  'Diviner of Distant Reach': 'support',
  'Space Sealing Station': 'crit',
  'Fleet of the Ageless': 'support',
  'Pan-Cosmic Commercial Enterprise': 'dot',
  'Belobog of the Architects': 'tank',
  'Celestial Differentiator': 'crit',
  'Inert Salsotto': 'fua',
  'Talia: Kingdom of Banditry': 'break_dps',
  'Sprightly Vonwacq': 'support',
  'Rutilant Arena': 'crit',
  'Broken Keel': 'support',
  'Firmament Frontline: Glamoth': 'crit',
  'Penacony, Land of the Dreams': 'support',
  'Sigonia, the Unclaimed Desolation': 'crit',
  'Izumo Gensei and Takama Divine Realm': 'crit',
  'Duran, Dynasty of Running Wolves': 'fua',
  'Forge of the Kalpagni Lantern': 'break_dps',
  'Lushaka, the Sunken Seas': 'support',
  'The Wondrous BananAmusement Park': 'dot',
  "Bone Collection's Serene Demesne": 'hp_crit',
  'Giant Tree of Rapt Brooding': 'support',
  'Arcadia of Woven Dreams': 'support_cd',
  'Revelry by the Sea': 'crit',
  'Amphoreus, The Eternal Land': 'tank',
  'Tengoku@Livestream': 'support_cd',
  'Punklorde Stage Zero': 'debuff_crit',
  'City of Converging Stars': 'crit',
};

const SET_KEYWORD_PROFILES = [
  ['iron cavalry', 'break_dps'],
  ['shooting meteor', 'break_dps'],
  ['watchmaker', 'break_support'],
  ['talia', 'break_dps'],
  ['kalpagni', 'break_dps'],
  ['hero of triumphant song', 'break_hybrid'],
  ['prisoner', 'dot'],
  ['pan-cosmic', 'dot'],
  ['ashblazing', 'fua'],
  ['valorous', 'fua'],
  ['salsotto', 'fua'],
  ['longevous', 'hp_crit'],
  ['poet of mourning collapse', 'low_spd_crit'],
  ['passerby', 'heal'],
  ['knight of purity palace', 'tank'],
  ['belobog', 'tank'],
  ['messenger', 'support'],
  ['sacerdos', 'support_cd'],
  ['fleet of the ageless', 'support'],
  ['sprightly vonwacq', 'support'],
  ['broken keel', 'support'],
  ['izumo', 'crit'],
  ['duran', 'fua'],
  ['kalpagni', 'break_dps'],
  ['lushaka', 'support'],
  ['bananamusement', 'dot'],
  ['bone collection', 'hp_crit'],
  ['giant tree', 'support'],
  ['arcadia', 'support_cd'],
  ['revelry', 'crit'],
  ['amphoreus', 'tank'],
  ['tengoku', 'support_cd'],
  ['punklorde', 'debuff_crit'],
  ['city of converging stars', 'crit'],
  ['pioneer diver', 'debuff_crit'],
  ['wastelander', 'debuff_crit'],
  ['band of sizzling thunder', 'debuff_crit'],
];

const GRADE_THRESHOLDS = [
  ['WTF', 9],
  ['SSS', 8],
  ['SS', 7],
  ['S', 6],
  ['A', 5],
  ['B', 4],
  ['C', 3],
  ['D', 2],
  ['F', 1],
];

function randomTier(forcedTier = null) {
  if (forcedTier === 'low' || forcedTier === 'mid' || forcedTier === 'high') {
    return forcedTier;
  }
  const roll = Math.random();
  if (roll < 0.2) return 'low';
  if (roll < 0.75) return 'mid';
  return 'high';
}

function getLineConfig(stat) {
  return SUBSTAT_ROLLS[stat] || SUBSTAT_ROLLS['FLAT HP'];
}

function getEffectiveWeight(key, weights) {
  const rawWeight = weights[key] || 0;
  return FLAT_STATS.has(key) ? rawWeight * FLAT_WEIGHT_MULTIPLIER : rawWeight;
}

function computeLineValue(stat, rolls = []) {
  const config = getLineConfig(stat);
  const total = rolls.reduce((sum, tier) => sum + (config[tier] || config.mid || 0), 0);
  if (config.decimals === 0) return Math.round(total);
  return Math.round(total * 10) / 10;
}

function getSubstatScore(stat, value, weights) {
  const key = getLineConfig(stat).key;
  return getEffectiveWeight(key, weights) * (NORMALIZATION[key] || 0) * value;
}

function getIdealSubstatScore(relic, weights) {
  const allStats = Object.entries(SUBSTAT_ROLLS)
    .filter(([label]) => label !== relic.mainStat)
    .map(([label, config]) => ({
      label,
      score: getEffectiveWeight(config.key, weights) * (NORMALIZATION[config.key] || 0) * config.high,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (allStats.length === 0) return 1;

  const base = allStats.reduce((sum, entry) => sum + entry.score, 0);
  const best = allStats[0].score;
  const upgrades = 5 * best;
  return base + upgrades;
}

export function createRelicId(prefix = 'relic') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRelicLine(slot, stat, { active = true, rollTierMode = null } = {}) {
  const initialRolls = active ? [randomTier(rollTierMode)] : [];
  return {
    slot,
    stat,
    rollTierMode,
    hits: 0,
    justHit: false,
    rolls: initialRolls,
    value: computeLineValue(stat, initialRolls),
  };
}

export function activateRelicLine(line) {
  if (Array.isArray(line.rolls) && line.rolls.length > 0) {
    return {
      ...line,
      value: computeLineValue(line.stat, line.rolls),
    };
  }
  const rolls = [randomTier(line.rollTierMode)];
  return {
    ...line,
    rolls,
    value: computeLineValue(line.stat, rolls),
  };
}

export function applyUpgradeRoll(line) {
  const rolls = [...(Array.isArray(line.rolls) ? line.rolls : []), randomTier(line.rollTierMode)];
  return {
    ...line,
    hits: (line.hits || 0) + 1,
    justHit: true,
    rolls,
    value: computeLineValue(line.stat, rolls),
  };
}

export function replaceRelicLineStat(line, stat, { preserveActive = true } = {}) {
  const active = preserveActive ? (Array.isArray(line.rolls) && line.rolls.length > 0) : true;
  return createRelicLine(line.slot, stat, { active, rollTierMode: line.rollTierMode || null });
}

export function formatStatValue(stat, value) {
  const config = getLineConfig(stat);
  if (value == null || Number.isNaN(Number(value))) return '—';
  if (config.percent) {
    return `${Number(value).toFixed(1)}%`;
  }
  if (config.decimals === 0) {
    return `${Math.round(Number(value))}`;
  }
  return `${Number(value).toFixed(1)}`;
}

export function getMainStatDisplay(mainStat, level = 0) {
  const config = MAIN_STAT_MAX[mainStat] || MAIN_STAT_MAX['FLAT HP'];
  const progress = Math.max(0, Math.min(level, 15)) / 15;
  const value = config.max * progress;
  const label = config.label || mainStat;
  const display = config.percent ? `${value.toFixed(1)}%` : `${value.toFixed(config.decimals ?? 0)}`;
  return { label, value, display };
}

export function scoreRelicWithProfile(relic, profileId = 'crit') {
  const weights = PROFILE_WEIGHTS[profileId] || PROFILE_WEIGHTS.crit;
  const lines = [...(relic.lines || []), ...(relic.hasFourthLine && relic.fourthLine ? [relic.fourthLine] : [])];
  const substatScore = lines.reduce((sum, line) => sum + getSubstatScore(line.stat, Number(line.value || 0), weights), 0);
  const idealScore = getIdealSubstatScore(relic, weights);
  const score = idealScore > 0 ? (substatScore / idealScore) * 0.582 * 100 : 0;
  const rollCount = substatScore / MIN_ROLL_SCORE;
  let grade = 'F';
  for (const [label, threshold] of GRADE_THRESHOLDS) {
    if (rollCount >= threshold) {
      grade = rollCount >= threshold + 0.5 ? `${label}+` : label;
      break;
    }
  }
  return {
    score: Math.round(score * 100) / 100,
    grade,
    rollCount: Math.round(rollCount * 100) / 100,
    profileId,
  };
}

export function getSetScoreProfile(setName = '') {
  const exact = SET_PROFILE_OVERRIDES[String(setName || '').trim()];
  if (exact) return exact;
  const normalized = String(setName || '').toLowerCase();
  for (const [keyword, profileId] of SET_KEYWORD_PROFILES) {
    if (normalized.includes(keyword)) return profileId;
  }
  return null;
}

export function getScoreWeightsForProfile(profileId = 'crit') {
  return { ...(PROFILE_WEIGHTS[profileId] || PROFILE_WEIGHTS.crit) };
}

export function detectRelicScoreProfile(relic) {
  const setProfile = getSetScoreProfile(relic?.setName);
  if (setProfile) return setProfile;
  const stats = [...(relic.lines || []), ...(relic.hasFourthLine && relic.fourthLine ? [relic.fourthLine] : [])].map((line) => line.stat);
  if (stats.includes('BREAK EFFECT') && stats.includes('EFFECT HIT RATE')) return 'break_dps';
  if (stats.includes('HP%') || stats.includes('EFFECT RES')) return 'support';
  return 'crit';
}

export function describeRelicScoreGuide(relic) {
  const profileId = detectRelicScoreProfile(relic);
  const weights = getScoreWeightsForProfile(profileId);
  const lines = [...(Array.isArray(relic?.lines) ? relic.lines : []), relic?.fourthLine].filter(Boolean);
  const priorities = lines
    .map((line) => {
      const config = getLineConfig(line.stat);
      const weight = getEffectiveWeight(config.key, weights);
      return { stat: line.stat, weight };
    })
    .sort((left, right) => right.weight - left.weight);

  return {
    profileId,
    targetStats: priorities.filter((entry) => entry.weight > 0.05).slice(0, 3).map((entry) => entry.stat),
    avoidStats: priorities.filter((entry) => entry.weight <= 0.05).slice(0, 3).map((entry) => entry.stat),
  };
}
